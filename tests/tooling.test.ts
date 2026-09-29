import { describe, expect, test } from "bun:test";
import { createApp } from "../src/index";

const publicPages = ["/", "/about", "/ministries", "/sermons", "/events", "/leadership", "/contact", "/missing"];

async function readProjectFile(path: string) {
  return Bun.file(new URL(`../${path}`, import.meta.url)).text();
}

async function run(command: string) {
  const proc = Bun.spawn(["bash", "-lc", command], { stdout: "pipe", stderr: "pipe" });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${command} exited ${code}: ${await new Response(proc.stderr).text()}`);
}

async function probeSize(path: string) {
  const proc = Bun.spawn(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path], {
    stdout: "pipe",
  });
  const [width, height] = (await new Response(proc.stdout).text()).trim().split(",").map(Number);
  return { width: width!, height: height! };
}

async function sha(path: string) {
  const proc = Bun.spawn(["sha256sum", path], { stdout: "pipe" });
  return (await new Response(proc.stdout).text()).split(" ")[0]!;
}

describe("development supervision", () => {
  test("runs the Tailwind watcher and the watched server from one dependency-free script", async () => {
    const supervisor = await readProjectFile("scripts/dev.ts");

    expect(supervisor).toContain("@tailwindcss/cli");
    expect(supervisor).toContain("--watch=always");
    expect(supervisor).toContain("src/input.css");
    expect(supervisor).toContain("public/static/style.css");
    expect(supervisor).toContain('"bun", "run", "--watch", "src/index.ts"');
    expect(supervisor).not.toMatch(/^import /m);
  });

  test("stops the whole process group when one watcher exits or a signal arrives", async () => {
    const supervisor = await readProjectFile("scripts/dev.ts");

    expect(supervisor).toContain("onExit");
    expect(supervisor).toContain("stopAll");
    for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
      expect(supervisor).toContain(signal);
    }
  });

  test("wires the supervisor into the dev script, the development stage, and compose", async () => {
    const manifest = JSON.parse(await readProjectFile("package.json"));
    const dockerfile = await readProjectFile("Dockerfile");
    const compose = await readProjectFile("docker-compose.yml");

    expect(manifest.scripts.dev).toBe("bun run scripts/dev.ts");
    expect(manifest.scripts["dev:server"]).toBe("bun run --watch src/index.ts");
    expect(manifest.scripts["css:watch"]).toContain("--watch=always");
    expect(manifest.scripts["css:build"]).not.toContain("--watch");
    expect(dockerfile).toContain('CMD ["bun", "run", "scripts/dev.ts"]');
    expect(dockerfile).toContain("COPY scripts ./scripts");
    expect(compose).toContain('command: ["bun", "run", "scripts/dev.ts"]');
    expect(compose).toContain("./src:/app/src");
    expect(compose).toContain("./public:/app/public");
    expect(compose).toContain("node_modules:/app/node_modules");
  });

  test("bind mounts every repository-root file the tooling suite reads", async () => {
    const compose = await readProjectFile("docker-compose.yml");
    const readOnlyMounts = [...compose.matchAll(/^\s*-\s*(\.\/[\w.-]+):\/app\/[\w./-]+:ro$/gm)].map((match) => match[1]);

    for (const hostPath of [
      "./package.json",
      "./tsconfig.json",
      "./tsconfig.typecheck.json",
      "./bun.lock",
      "./Dockerfile",
      "./docker-compose.yml",
      "./docker-compose.prod.yml",
      "./.gitignore",
      "./.dockerignore",
    ]) {
      expect(readOnlyMounts, `${hostPath} must be a read-only bind mount so the tooling suite reads the live file`).toContain(
        hostPath,
      );
    }
  });
});

describe("compose project isolation", () => {
  test("gives development and production distinct project names and host ports", async () => {
    const development = await readProjectFile("docker-compose.yml");
    const production = await readProjectFile("docker-compose.prod.yml");
    const projectName = (compose: string) => compose.match(/^name:\s*([\w-]+)$/m)?.[1];

    expect(projectName(development)).toBe("kccf-ministry-dev");
    expect(projectName(production)).toBe("kccf-ministry-prod");
    expect(projectName(development)).not.toBe(projectName(production));

    const hostPorts = (compose: string) =>
      [...compose.matchAll(/^\s*-\s*"(\d+):(\d+)"$/gm)].map((match) => match[1]);

    expect(hostPorts(development)).toEqual(["3000"]);
    expect(hostPorts(production)).toEqual(["3001"]);
  });
});

describe("production compose", () => {
  test("is standalone and free of version-specific reset tags", async () => {
    const compose = await readProjectFile("docker-compose.prod.yml");

    expect(compose).not.toContain("!reset");
    expect(compose).not.toContain("!override");
    expect(compose).toContain("target: production");
    expect(compose).toContain('command: ["bun", "dist/index.js"]');
    expect(compose).not.toContain("volumes:");
  });

  test("keeps the health check and no bind mounts in the production runtime", async () => {
    const compose = await readProjectFile("docker-compose.prod.yml");

    expect(compose).toContain("/health");
    expect(compose).not.toContain(":/app/");
  });
});

type VercelConfig = {
  bunVersion?: string;
  installCommand?: string;
  regions?: string[];
  framework?: string | null;
  buildCommand?: string;
  outputDirectory?: string | null;
  headers?: { source: string; headers: { key: string; value: string }[] }[];
};

async function readVercelConfig() {
  return JSON.parse(await readProjectFile("vercel.json")) as VercelConfig;
}

function cacheControl(config: VercelConfig, source: string) {
  const rule = config.headers?.find((entry) => entry.source === source);
  return rule?.headers.find((header) => header.key === "Cache-Control")?.value;
}

describe("vercel deployment", () => {
  test("overrides no build command and leaves the output directory to the framework", async () => {
    const config = await readVercelConfig();

    // Vercel detects Hono from src/index.ts and runs its own build. Overriding buildCommand
    // replaces that build with an arbitrary command, after which Vercel falls back to a
    // generic static build that looks for its own default output directory - and the deployment
    // fails with 'No Output Directory named "dist" found after the Build completed'.
    expect(config.buildCommand).toBeUndefined();

    // outputDirectory must be absent, and this is not negotiable. The Hono framework preset
    // declares no output directory of its own, so an absent key lets the preset govern.
    // Setting it to null silences the "dist" error but tells Vercel to skip the framework
    // build and serve the project as static files, so nothing invokes the fetch handler and
    // the visitor is shown the raw bundle. Do not add this key to silence that error.
    expect(config.outputDirectory).toBeUndefined();

    // The framework belongs in Project Settings, and the preset there must be "hono".
    // Setting it in vercel.json is not the fix: this project was created as a Vite app, and
    // a stale Vite preset is what produced both symptoms. Vite's build output directory is
    // dist, so Vercel served the dist/index.js that `bun run build` creates as the home page,
    // and Vite builds no Hono function, so /static/* and /health both 404. A null here would
    // select "Other" and reintroduce the same class of failure.
    expect(config.framework).toBeUndefined();
  });

  test("keeps ambient type libraries out of tsconfig.json, because Vercel cannot resolve them", async () => {
    const tsconfig = JSON.parse(await readProjectFile("tsconfig.json")) as {
      compilerOptions: { types?: string[]; lib?: string[] };
    };

    // @vercel/hono transpiles src/ with a tsconfig it writes to a temp directory, extending
    // this one. Type libraries named in compilerOptions.types resolve relative to the config
    // that declares them, so from /tmp TypeScript walks up /tmp and never reaches this
    // project's node_modules - and the build dies with TS2688 before it transpiles anything.
    // An empty list is the only value that is safe in both places: it asks for nothing.
    expect(tsconfig.compilerOptions.types, "an ambient type name here is unresolvable on Vercel").toEqual([]);

    // URL is a web standard present in every runtime this site targets, so the DOM lib is
    // where it belongs, rather than arriving as a side effect of a Bun type package.
    expect(tsconfig.compilerOptions.lib).toContain("DOM");
  });

  test("gives the local type check the Bun types the Vercel build cannot have", async () => {
    const manifest = JSON.parse(await readProjectFile("package.json")) as { scripts: Record<string, string> };
    const typecheck = JSON.parse(await readProjectFile("tsconfig.typecheck.json")) as {
      extends: string;
      compilerOptions: { types?: string[] };
    };

    // bun-types is still needed locally: tests/ import "bun:test" and call Bun.serve. It is
    // isolated in its own config so the Vercel transpile never inherits it.
    expect(typecheck.extends).toBe("./tsconfig.json");
    expect(typecheck.compilerOptions.types).toEqual(["bun-types"]);
    expect(manifest.scripts["type-check"]).toBe("bunx tsc --noEmit -p tsconfig.typecheck.json");
  });

  test("never reaches for the process global in src/, which no longer has a type declaration", async () => {
    const entry = await readProjectFile("src/index.ts");

    // src/ is transpiled with types: [], so `process` is an undeclared identifier there and
    // the Vercel build fails with TS2591. PORT is read through a cast instead.
    expect(entry).not.toMatch(/(?<![.\w])process\.env/);
  });

  test("serves the assets from a committed public/ tree, so no build step is needed", async () => {
    const manifest = JSON.parse(await readProjectFile("package.json")) as { scripts: Record<string, string> };

    // Every asset a visitor loads is committed under public/static, including the compiled
    // stylesheet, so there is genuinely nothing for a Vercel build to produce.
    expect(manifest.scripts["css:build"]).toBe("bunx @tailwindcss/cli -i src/input.css -o public/static/style.css");
    expect(manifest.scripts).not.toHaveProperty("vercel:prepare");

    for (const asset of ["public/static/style.css", "public/static/datastar.js", "public/static/favicon.svg"]) {
      expect(await Bun.file(new URL(`../${asset}`, import.meta.url)).exists(), `${asset} must be committed`).toBe(true);
    }
  });

  test("keeps the same public/ tree that Hono serves locally and in the container", async () => {
    const dockerfile = await readProjectFile("Dockerfile");
    const compose = await readProjectFile("docker-compose.yml");

    // One directory for both targets: Vercel's CDN serves public/static from the project root,
    // and Hono's serveStatic resolves /static/* against the same tree everywhere else.
    expect(dockerfile).toContain("COPY public ./public");
    expect(dockerfile).toContain("COPY --from=build /app/public ./public");
    expect(compose).toContain("./public:/app/public");
    expect(await readProjectFile(".gitignore")).not.toMatch(/^public\/$/m);
  });

  test("requests the same Bun major version the container image uses", async () => {
    const config = await readVercelConfig();
    const dockerfile = await readProjectFile("Dockerfile");
    const imageVersion = dockerfile.match(/^FROM oven\/bun:([\d.]+)-alpine AS base$/m)?.[1];

    expect(imageVersion, "the Dockerfile must pin an oven/bun base image this test can read").toBeTruthy();
    // Vercel manages the minor and patch versions, so only the major is expressible here.
    // The container and the function are separate deployments, and a silent major skew is the
    // failure mode - nothing else in the build would catch it.
    expect(config.bunVersion).toBe(`${imageVersion!.split(".")[0]}.x`);
  });

  test("installs from the lockfile rather than letting the platform resolve versions", async () => {
    const config = await readVercelConfig();

    expect(config.installCommand).toBe("bun install --frozen-lockfile");
  });

  test("caches the images at the edge but always revalidates the stylesheet and the runtime", async () => {
    const config = await readVercelConfig();
    const images = cacheControl(config, "/static/images/(.*)");
    const stylesheet = cacheControl(config, "/static/style.css");
    const runtime = cacheControl(config, "/static/datastar.js");

    expect(images).toBeTruthy();
    expect(stylesheet).toBe("public, max-age=0, must-revalidate");
    expect(runtime).toBe("public, max-age=0, must-revalidate");

    // style.css is recompiled from src/input.css and committed, and the image filenames are
    // not content-addressed, so neither may be pinned immutable.
    expect(stylesheet).not.toContain("immutable");
    expect(images).not.toContain("immutable");
  });

  test("keeps the local Vercel state out of git and the build context", async () => {
    const gitignore = await readProjectFile(".gitignore");
    const dockerignore = await readProjectFile(".dockerignore");

    expect(gitignore).toMatch(/^\.vercel\/$/m);
    expect(dockerignore).toMatch(/^\.vercel$/m);
  });

  test("exposes the default export Vercel runs, with the fetch handler it reads", async () => {
    const entry = await import("../src/index");

    // Vercel detects Hono from src/index.ts and serves through this default export's fetch.
    // port is Bun's own server hint and is ignored off-platform.
    expect(typeof entry.default.fetch).toBe("function");
    expect(await entry.default.fetch(new Request("https://example.test/health"))).toBeInstanceOf(Response);
  });
});

// Bun.spawn throws when the executable is missing rather than exiting non-zero, so the
// probe is wrapped. Without this the whole file fails to load on a machine with no ffmpeg,
// taking the ungated tests down with it instead of skipping.
async function hasBinary(name: string) {
  try {
    return (await Bun.spawn([name, "-version"], { stdout: "pipe", stderr: "pipe" }).exited) === 0;
  } catch {
    return false;
  }
}

const hasFfmpeg = await hasBinary("ffprobe");

if (!hasFfmpeg) {
  console.warn(
    "WARNING: image variant generator suite SKIPPED - ffprobe is not on PATH, so its 3 tests did not run. Install ffmpeg to run them.",
  );
}

describe.skipIf(!hasFfmpeg)("image variant generator", () => {
  const workDir = "/tmp/opencode/image-variants-test";

  test("prints the srcset and real dimensions, and never touches an existing full-size file", async () => {
    await run("rm -rf " + workDir + " && mkdir -p " + workDir + "/seed");
    await run(`ffmpeg -y -i public/static/images/hero.jpg -vf scale=2048:-2 ${workDir}/seed/probe.jpg`);

    const proc = Bun.spawn(
      ["bun", "run", "scripts/image-variants.ts", `${workDir}/seed/probe.jpg`, "probe", "--widths", "640,1024", "--out", workDir],
      { stdout: "pipe", stderr: "pipe" },
    );
    const stdout = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(0);

    // The printed width/height must match the file on disk, not a computation.
    const size = await probeSize(`${workDir}/probe.jpg`);
    expect(stdout).toContain(`width: ${size.width}`);
    expect(stdout).toContain(`height: ${size.height}`);

    // No two srcset entries may share a width descriptor.
    const descriptors = [...stdout.matchAll(/ (\d+)w"/g)].map((match) => match[1]);
    expect(descriptors.length).toBeGreaterThan(0);
    expect(new Set(descriptors).size).toBe(descriptors.length);

    // The const identifier must be valid TypeScript, not the raw hyphenated base name.
    expect(stdout).toContain("const probeSrcset = [");
    expect(stdout).not.toContain("const probe-probeSrcset");
  });

  test("refuses to overwrite an existing full-size file without --force", async () => {
    await run(`rm -rf ${workDir} && mkdir -p ${workDir}/out`);
    await run(`cp public/static/images/hero.jpg ${workDir}/out/keep.jpg`);

    const before = await sha(`${workDir}/out/keep.jpg`);
    const refused = Bun.spawn(
      ["bun", "run", "scripts/image-variants.ts", "public/static/images/hero.jpg", "keep", "--widths", "640", "--out", `${workDir}/out`],
      { stdout: "pipe", stderr: "pipe" },
    );
    expect(await refused.exited).not.toBe(0);
    expect(await sha(`${workDir}/out/keep.jpg`)).toBe(before);

    const forced = Bun.spawn(
      ["bun", "run", "scripts/image-variants.ts", "public/static/images/hero.jpg", "keep", "--widths", "640", "--out", `${workDir}/out`, "--force"],
      { stdout: "pipe", stderr: "pipe" },
    );
    expect(await forced.exited).toBe(0);
    await new Response(forced.stdout).text();
  });

  test("rejects a width larger than the source instead of upscaling", async () => {
    const proc = Bun.spawn(
      ["bun", "run", "scripts/image-variants.ts", "public/static/images/hero.jpg", "big", "--widths", "9000", "--out", `${workDir}/up`],
      { stdout: "pipe", stderr: "pipe" },
    );
    const stderr = await new Response(proc.stderr).text();

    expect(await proc.exited).not.toBe(0);
    expect(stderr).toContain("larger than the source");
  });
});

describe("image variant script registration", () => {
  test("registers the image:variants script", async () => {
    const manifest = JSON.parse(await readProjectFile("package.json")) as { scripts: Record<string, string> };
    expect(manifest.scripts["image:variants"]).toBe("bun run scripts/image-variants.ts");
  });
});

describe("image variant destination", () => {
  test("defaults to the committed public/static/images tree", async () => {
    // The generated variants must land where both targets serve them from, and the printed
    // srcset is paste-ready for that tree, so the default is part of the contract.
    const generator = await readProjectFile("scripts/image-variants.ts");

    expect(generator).toContain('let outDir = "public/static/images"');
  });
});

describe("site identity assets", () => {
  test("serves the favicon as an SVG", async () => {
    const response = await createApp().request("/static/favicon.svg");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(await response.text()).toContain("<svg");
  });

  test("links the favicon from every rendered page", async () => {
    for (const path of publicPages) {
      const html = await (await createApp().request(path)).text();
      expect(html).toContain('<link rel="icon" href="/static/favicon.svg" type="image/svg+xml"/>');
    }
  });
});
