import { describe, expect, test } from "bun:test";
import { createApp } from "../src/index";

const publicPages = ["/", "/about", "/ministries", "/sermons", "/events", "/leadership", "/contact", "/missing"];

async function readProjectFile(path: string) {
  return Bun.file(new URL(`../${path}`, import.meta.url)).text();
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
