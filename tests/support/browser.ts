import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Subprocess } from "bun";

const chromeCandidates = [
  process.env.KCCF_CHROME_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter((candidate): candidate is string => Boolean(candidate));

export function findChrome() {
  return chromeCandidates.find((candidate) => existsSync(candidate)) ?? null;
}

type CdpMessage = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message: string; data?: string };
  sessionId?: string;
};

class CdpClient {
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  private handlers = new Map<string, ((params: any, sessionId?: string) => void)[]>();
  private nextId = 1;

  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener("message", (event) => this.receive(String(event.data)));
  }

  static async connect(endpoint: string) {
    const socket = new WebSocket(endpoint);

    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error(`cannot reach the browser at ${endpoint}`)), {
        once: true,
      });
    });

    return new CdpClient(socket);
  }

  send(method: string, params: Record<string, unknown> = {}, sessionId?: string) {
    const id = this.nextId++;

    return new Promise<any>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  on(method: string, handler: (params: any, sessionId?: string) => void) {
    this.handlers.set(method, [...(this.handlers.get(method) ?? []), handler]);
  }

  waitFor(method: string, timeoutMs = 20_000) {
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${method}`)), timeoutMs);
      this.on(method, (params) => {
        clearTimeout(timer);
        resolve(params);
      });
    });
  }

  close() {
    this.socket.close();
  }

  private receive(raw: string) {
    const message = JSON.parse(raw) as CdpMessage;

    if (typeof message.id === "number") {
      const entry = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) {
        entry?.reject(new Error(`${message.error.message}${message.error.data ? `: ${message.error.data}` : ""}`));
        return;
      }
      entry?.resolve(message.result ?? {});
      return;
    }

    if (message.method) {
      for (const handler of this.handlers.get(message.method) ?? []) {
        handler(message.params ?? {}, message.sessionId);
      }
    }
  }
}

export type PageProblem = { source: string; text: string };

export type BrowserSession = {
  origin: string;
  open: (path: string) => Promise<void>;
  evaluate: <T>(expression: string) => Promise<T>;
  problems: PageProblem[];
  requests: { method: string; url: string; status?: number }[];
  setMobileViewport: (width: number, height: number) => Promise<void>;
  screenshot: () => Promise<Uint8Array>;
  close: () => Promise<void>;
};

const headlessFlags = [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-sync",
  "--metrics-recording-only",
  "--mute-audio",
  "--remote-debugging-port=0",
  "about:blank",
];

async function readDevToolsEndpoint(process_: Subprocess) {
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Chrome never reported a DevTools endpoint")), 20_000);
    const decoder = new TextDecoder();
    let buffered = "";

    const scan = (chunk: Uint8Array) => {
      buffered += decoder.decode(chunk, { stream: true });
      const match = buffered.match(/DevTools listening on (ws:\/\/\S+)/);
      if (!match) return;
      clearTimeout(timer);
      resolve(match[1]);
    };

    const stderr = process_.stderr;

    if (stderr === null || stderr === undefined) {
      reject(new Error("Chrome was spawned without a stderr pipe"));
      return;
    }

    if (stderr instanceof ReadableStream) {
      const reader = stderr.getReader();
      const pump = async () => {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) scan(value);
        }
      };
      void pump().catch(() => undefined);
    } else if (typeof (stderr as { on?: unknown }).on === "function") {
      (stderr as unknown as { on: (event: string, handler: (chunk: Uint8Array) => void) => void }).on("data", scan);
    }

    process_.exited.then((code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited early with code ${code}: ${buffered.slice(-500)}`));
    });
  });
}

export async function startBrowser(fetchHandler: (request: Request) => Response | Promise<Response>) {
  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error("no headless Chrome binary was discovered");
  }

  const profile = await mkdtemp(join(tmpdir(), "kccf-chrome-"));
  const server = Bun.serve({ port: 0, fetch: fetchHandler as never });
  const chrome = Bun.spawn([chromePath, ...headlessFlags.slice(0, -1), `--user-data-dir=${profile}`, "about:blank"], {
    stdout: "ignore",
    stderr: "pipe",
  });

  const client = await CdpClient.connect(await readDevToolsEndpoint(chrome));
  const { targetId } = await client.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });
  const problems: PageProblem[] = [];
  const requests: { method: string; url: string; status?: number }[] = [];
  const urlsByRequestId = new Map<string, string>();
  const statuses = new Map<string, number>();
  const origin = `http://127.0.0.1:${server.port}`;

  client.on("Runtime.exceptionThrown", (_params, session) => {
    if (session !== sessionId) return;
    const details = (_params.exceptionDetails ?? {}) as any;
    problems.push({ source: "exception", text: details.exception?.description ?? details.text ?? "unknown exception" });
  });
  client.on("Runtime.consoleAPICalled", (params, session) => {
    if (session !== sessionId) return;
    const type = String((params as any).type ?? "");
    if (type !== "error" && type !== "assert") return;
    const text = ((params as any).args ?? []).map((arg: any) => arg.value ?? arg.description ?? "").join(" ");
    problems.push({ source: `console.${type}`, text });
  });
  client.on("Log.entryAdded", (params, session) => {
    if (session !== sessionId) return;
    const entry = (params as any).entry ?? {};
    if (entry.level !== "error") return;
    problems.push({ source: `log.${entry.source ?? "unknown"}`, text: String(entry.text ?? "") });
  });
  client.on("Network.requestWillBeSent", (params, session) => {
    if (session !== sessionId) return;
    const requestId = String((params as any).requestId ?? "");
    const url = String((params as any).request?.url ?? "");
    urlsByRequestId.set(requestId, url);
    requests.push({ method: String((params as any).request?.method ?? "GET"), url });
  });
  client.on("Network.responseReceived", (params, session) => {
    if (session !== sessionId) return;
    const url = urlsByRequestId.get(String((params as any).requestId ?? ""));
    if (url) statuses.set(url, Number((params as any).response?.status ?? 0));
  });

  await client.send("Page.enable", {}, sessionId);
  await client.send("Runtime.enable", {}, sessionId);
  await client.send("Log.enable", {}, sessionId);
  await client.send("Network.enable", {}, sessionId);

  const evaluate = async <T>(expression: string) => {
    const result = await client.send(
      "Runtime.evaluate",
      { expression, awaitPromise: true, returnByValue: true, userGesture: true },
      sessionId,
    );
    const details = (result as any).exceptionDetails;

    if (details) {
      throw new Error(`page evaluation failed: ${details.exception?.description ?? details.text}`);
    }

    return (result as any).result?.value as T;
  };

  const session: BrowserSession = {
    origin,
    problems,
    requests,
    setMobileViewport: (width, height) =>
      client.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: true }, sessionId).then(
        () => undefined,
      ),
    open: async (path: string) => {
      // Wait for the DOM, not for `load`. Every test in this suite asserts on DOM state,
      // and `load` also waits on third-party subresources — the YouTube thumbnail CDN on
      // /sermons, the Google Fonts stylesheet on every page. A slow CDN would otherwise
      // hang the suite on a timeout rather than fail an assertion. Module scripts run
      // before DOMContentLoaded, so Datastar is already active by then. Raced against
      // `load` so the harness still works if a Chrome build withholds the earlier event.
      const ready = Promise.race([
        client.waitFor("Page.domContentLoadedEventFired"),
        client.waitFor("Page.loadEventFired"),
      ]);
      problems.length = 0;
      requests.length = 0;
      statuses.clear();
      urlsByRequestId.clear();
      await client.send("Page.navigate", { url: `${origin}${path}` }, sessionId);
      await ready;
      await Bun.sleep(250);
    },
    evaluate,
    screenshot: async () => {
      const shot = await client.send("Page.captureScreenshot", { format: "png" }, sessionId);
      return Buffer.from(String((shot as any).data ?? ""), "base64");
    },
    close: async () => {
      try {
        await client.send("Browser.close");
      } catch {
        chrome.kill();
      }
      client.close();
      const exitedCleanly = await Promise.race([chrome.exited.then(() => true), Bun.sleep(5000).then(() => false)]);
      if (!exitedCleanly) {
        chrome.kill(9);
        await chrome.exited;
      }
      server.stop(true);
      await rm(profile, { recursive: true, force: true });
    },
  };

  return {
    session,
    statusFor: (path: string) => statuses.get(`${origin}${path}`),
  };
}
