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
    expect(supervisor).toContain("static/style.css");
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
    expect(compose).toContain("./static:/app/static");
    expect(compose).toContain("node_modules:/app/node_modules");
  });

  test("bind mounts every repository-root file the tooling suite reads", async () => {
    const compose = await readProjectFile("docker-compose.yml");
    const readOnlyMounts = [...compose.matchAll(/^\s*-\s*(\.\/[\w.-]+):\/app\/[\w./-]+:ro$/gm)].map((match) => match[1]);

    for (const hostPath of [
      "./package.json",
      "./tsconfig.json",
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
  buildCommand?: string;
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
  test("pins the function runtime to the same Bun version the container image uses", async () => {
    const config = await readVercelConfig();
    const dockerfile = await readProjectFile("Dockerfile");
    const imageVersion = dockerfile.match(/^FROM oven\/bun:([\d.]+)-alpine AS base$/m)?.[1];

    expect(imageVersion, "the Dockerfile must pin an oven/bun base image this test can read").toBeTruthy();
    expect(config.bunVersion).toBe(imageVersion);
    // The container and the function are separate deployments; a silent version skew is the
    // failure mode here, and nothing else in the build would catch it.
  });

  test("installs from the lockfile rather than letting the platform resolve versions", async () => {
    const config = await readVercelConfig();

    expect(config.installCommand).toBe("bun install --frozen-lockfile");
  });

  test("builds CSS and mirrors the static tree instead of bundling for the server", async () => {
    const config = await readVercelConfig();

    // Vercel bundles the function from src/index.ts itself, so the package.json build script
    // produces a dist/ that nothing on Vercel runs. The real build work is the stylesheet and
    // the public/ mirror, and dropping either one deploys a site with no CSS or no JavaScript.
    expect(config.buildCommand).toContain("css:build");
    expect(config.buildCommand).toContain("scripts/prepare-public.ts");
    expect(config.buildCommand).not.toContain("bun build");
  });

  test("caches the images at the edge but always revalidates the stylesheet and the runtime", async () => {
    const config = await readVercelConfig();
    const images = cacheControl(config, "/static/images/(.*)");
    const stylesheet = cacheControl(config, "/static/style.css");
    const runtime = cacheControl(config, "/static/datastar.js");

    expect(images).toBeTruthy();
    expect(stylesheet).toBe("public, max-age=0, must-revalidate");
    expect(runtime).toBe("public, max-age=0, must-revalidate");

    // style.css is regenerated on every deploy, and the image filenames are not
    // content-addressed, so neither may be pinned immutable.
    expect(stylesheet).not.toContain("immutable");
    expect(images).not.toContain("immutable");
  });

  test("keeps the generated mirror and the local Vercel state out of git and the build context", async () => {
    const gitignore = await readProjectFile(".gitignore");
    const dockerignore = await readProjectFile(".dockerignore");

    expect(gitignore).toMatch(/^public\/$/m);
    expect(gitignore).toMatch(/^\.vercel\/$/m);
    expect(dockerignore).toMatch(/^public$/m);
    expect(dockerignore).toMatch(/^\.vercel$/m);
  });

  test("keeps static/ the single source of truth for the /static/ URL prefix", async () => {
    const dockerfile = await readProjectFile("Dockerfile");

    // Vercel serves the mirror from public/ while Hono serves static/ everywhere else, so the
    // two must keep the same prefix. The mirror is what stops that from silently diverging.
    expect(dockerfile).toContain("COPY static ./static");
    expect(await readProjectFile(".gitignore")).not.toMatch(/^static\/$/m);
  });

  test("exposes the default export Vercel runs, with the fetch handler it reads", async () => {
    const entry = await import("../src/index");

    // Vercel detects Hono from src/index.ts and serves through this default export's fetch.
    // port is Bun's own server hint and is ignored off-platform.
    expect(typeof entry.default.fetch).toBe("function");
    expect(await entry.default.fetch(new Request("https://example.test/health"))).toBeInstanceOf(Response);
  });
});

describe("vercel static mirror", () => {
  const workDir = "/tmp/opencode/prepare-public-test";

  test("mirrors the source tree exactly, including nested directories", async () => {
    await run(`rm -rf ${workDir} && mkdir -p ${workDir}/src/images`);
    await run(`printf 'body{}' > ${workDir}/src/style.css && printf 'export default {};' > ${workDir}/src/datastar.js`);
    await run(`printf 'jpegbytes' > ${workDir}/src/images/hero-640.jpg`);

    const proc = Bun.spawn(["bun", "run", "scripts/prepare-public.ts", "--src", `${workDir}/src`, "--out", `${workDir}/out`], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    expect(await proc.exited, await new Response(proc.stderr).text()).toBe(0);

    expect(await Bun.file(`${workDir}/out/static/style.css`).text()).toBe("body{}");
    expect(await Bun.file(`${workDir}/out/static/datastar.js`).text()).toBe("export default {};");
    expect(await Bun.file(`${workDir}/out/static/images/hero-640.jpg`).text()).toBe("jpegbytes");
    expect(stdout).toContain("3 files");
  });

  test("wipes the destination first so a deleted asset cannot survive as a stale CDN file", async () => {
    await run(`rm -rf ${workDir} && mkdir -p ${workDir}/out/static/images`);
    await run(`printf 'stale' > ${workDir}/out/static/images/removed.jpg`);

    const proc = Bun.spawn(["bun", "run", "scripts/prepare-public.ts", "--src", "static", "--out", `${workDir}/out`], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await new Response(proc.stdout).text();
    expect(await proc.exited, await new Response(proc.stderr).text()).toBe(0);

    expect(await Bun.file(`${workDir}/out/static/images/removed.jpg`).exists()).toBe(false);
    expect(await Bun.file(`${workDir}/out/static/style.css`).exists()).toBe(true);
  });

  test("aborts rather than deploying a mirror of nothing", async () => {
    const proc = Bun.spawn(["bun", "run", "scripts/prepare-public.ts", "--src", "static/absent", "--out", `${workDir}/out`], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stderr = await new Response(proc.stderr).text();

    expect(await proc.exited).not.toBe(0);
    expect(stderr).toContain("not found");
    // A silent no-op would publish a site with no stylesheet and no Datastar runtime, which
    // still renders but loses every interaction - the failure mode nothing else would catch.
    expect(await Bun.file(`${workDir}/out/static`).exists()).toBe(false);
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
    await run(`ffmpeg -y -i static/images/hero.jpg -vf scale=2048:-2 ${workDir}/seed/probe.jpg`);

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
    await run(`cp static/images/hero.jpg ${workDir}/out/keep.jpg`);

    const before = await sha(`${workDir}/out/keep.jpg`);
    const refused = Bun.spawn(
      ["bun", "run", "scripts/image-variants.ts", "static/images/hero.jpg", "keep", "--widths", "640", "--out", `${workDir}/out`],
      { stdout: "pipe", stderr: "pipe" },
    );
    expect(await refused.exited).not.toBe(0);
    expect(await sha(`${workDir}/out/keep.jpg`)).toBe(before);

    const forced = Bun.spawn(
      ["bun", "run", "scripts/image-variants.ts", "static/images/hero.jpg", "keep", "--widths", "640", "--out", `${workDir}/out`, "--force"],
      { stdout: "pipe", stderr: "pipe" },
    );
    expect(await forced.exited).toBe(0);
    await new Response(forced.stdout).text();
  });

  test("rejects a width larger than the source instead of upscaling", async () => {
    const proc = Bun.spawn(
      ["bun", "run", "scripts/image-variants.ts", "static/images/hero.jpg", "big", "--widths", "9000", "--out", `${workDir}/up`],
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

describe("static mirror script registration", () => {
  test("registers the vercel:prepare script the Vercel build command runs", async () => {
    const manifest = JSON.parse(await readProjectFile("package.json")) as { scripts: Record<string, string> };
    const config = await readVercelConfig();

    expect(manifest.scripts["vercel:prepare"]).toBe("bun run scripts/prepare-public.ts");
    expect(config.buildCommand).toContain(manifest.scripts["vercel:prepare"]);
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
