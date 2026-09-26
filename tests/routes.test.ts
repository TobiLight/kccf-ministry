import { describe, expect, test } from "bun:test";
import { createApp } from "../src/index";

const publicRoutes = [
  { path: "/", title: "Kingdom Covenant of Christ Fellowship | A Covenant Community Rooted in Christ" },
  { path: "/about", title: "About KCCF | A Covenant Community Rooted in Christ" },
  { path: "/ministries", title: "Ministries | KCCF Ministries" },
  { path: "/sermons", title: "Sermons | KCCF Ministries" },
  { path: "/events", title: "Events | KCCF Ministries" },
  { path: "/leadership", title: "Leadership | KCCF Ministries" },
  { path: "/contact", title: "Contact KCCF | We Would Love to Welcome You" },
] as const;

const internalRoutes = publicRoutes.map(({ path }) => path);

function getInternalPath(href: string) {
  return new URL(href, "https://kccfweb.vercel.app").pathname;
}

function parsePolicy(policy: string) {
  return Object.fromEntries(
    policy
      .split(";")
      .map((directive) => directive.trim())
      .filter(Boolean)
      .map((directive) => {
        const [name, ...values] = directive.split(/\s+/);
        return [name, values];
      }),
  );
}

describe("public routes", () => {
  for (const route of publicRoutes) {
    test(`serves HTML for ${route.path}`, async () => {
      const response = await createApp().request(route.path);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(html).toContain(`<title>${route.title}</title>`);
      expect(html).toContain('<main id="main-content"');
      expect(html).toContain("<h1");
      expect(html).toContain("<header");
      expect(html).toContain("<footer");
    });
  }

  test("renders a custom 404 page for unknown routes", async () => {
    const response = await createApp().request("/not-a-public-page");
    const html = await response.text();

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("404");
    expect(html).toContain("Oops! Page not found");
    expect(html).toContain("Return to Home");
  });

  test("does not expose a login route", async () => {
    const response = await createApp().request("/login");

    expect(response.status).toBe(404);
  });

  test("keeps page titles and descriptions unique", async () => {
    const pages = await Promise.all(
      publicRoutes.map(async (route) => {
        const html = await (await createApp().request(route.path)).text();
        return {
          title: html.match(/<title>(.*?)<\/title>/)?.[1] ?? "",
          description: html.match(/name="description" content="(.*?)"/)?.[1] ?? "",
        };
      }),
    );

    expect(new Set(pages.map((page) => page.title)).size).toBe(publicRoutes.length);
    expect(new Set(pages.map((page) => page.description)).size).toBe(publicRoutes.length);
  });

  test("resolves every aria-labelledby reference and keeps page IDs unique", async () => {
    for (const path of [...publicRoutes.map((route) => route.path), "/missing"]) {
      const response = await createApp().request(path);
      const html = await response.text();
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
      const labelledBy = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].flatMap((match) => match[1].split(" "));

      expect(new Set(ids).size).toBe(ids.length);
      for (const id of labelledBy) {
        expect(ids).toContain(id);
      }
    }
  });

  test("points internal CTAs to known public routes", async () => {
    for (const route of publicRoutes) {
      const response = await createApp().request(route.path);
      const html = await response.text();
      const internalHrefs = [...html.matchAll(/href="(\/[^"]*)"/g)]
        .map((match) => match[1])
        .filter((href) => !href.startsWith("/static/"))
        .map((href) => getInternalPath(href));

      expect(internalHrefs.length).toBeGreaterThan(0);
      for (const href of internalHrefs) {
        expect(internalRoutes as readonly string[]).toContain(href);
      }
    }
  });
});

describe("security headers", () => {
  const paths = ["/", "/about", "/health", "/static/style.css", "/does-not-exist"];

  for (const path of paths) {
    test(`sends hardened response headers for ${path}`, async () => {
      const response = await createApp().request(path);

      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
      expect(response.headers.get("x-frame-options")).toBe("DENY");
      expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    });
  }

  test("ships a content security policy that keeps Datastar and the local stylesheet working", async () => {
    const response = await createApp().request("/");
    const policy = response.headers.get("content-security-policy") ?? "";
    const directives = parsePolicy(policy);

    expect(directives["default-src"]).toEqual(["'self'"]);
    expect(directives["script-src"]).toEqual(["'self'", "'unsafe-eval'"]);
    expect(directives["script-src-attr"]).toEqual(["'none'"]);
    expect(directives["style-src"]).toEqual(["'self'", "https://fonts.googleapis.com"]);
    expect(directives["font-src"]).toEqual(["'self'", "https://fonts.gstatic.com"]);
    expect(directives["img-src"]).toEqual(["'self'", "data:"]);
    expect(directives["object-src"]).toEqual(["'none'"]);
    expect(directives["base-uri"]).toEqual(["'self'"]);
    expect(directives["form-action"]).toEqual(["'self'"]);
    expect(directives["frame-ancestors"]).toEqual(["'none'"]);
    expect(policy).not.toContain("'unsafe-inline'");
  });

  test("confines the Datastar evaluator to script-src and nothing else", async () => {
    const response = await createApp().request("/");
    const directives = parsePolicy(response.headers.get("content-security-policy") ?? "");

    expect(directives["script-src"]).toContain("'unsafe-eval'");
    expect(directives["script-src"]).toContain("'self'");
    expect(directives["script-src"]).not.toContain("'unsafe-inline'");
    expect(directives["script-src"]).not.toContain("https:");
    expect(directives["script-src-attr"]).toEqual(["'none'"]);
    expect(directives["script-src-attr"]).not.toContain("'unsafe-eval'");
    expect(directives["default-src"]).not.toContain("'unsafe-eval'");
    expect(directives["style-src"]).not.toContain("'unsafe-eval'");
    expect(directives["connect-src"]).toEqual(["'self'"]);
  });

  test("only allows the same-origin Datastar module script and no inline script", async () => {
    const response = await createApp().request("/");
    const html = await response.text();
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((match) => match[0]);

    expect(scripts).toEqual(['<script type="module" src="/static/datastar.js">']);
    for (const script of scripts) {
      expect(script).toContain('type="module"');
      expect(script).toContain('src="/static/datastar.js"');
    }
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
    expect(html).not.toMatch(/\son[a-z]+="/);
    expect(html).not.toMatch(/javascript:/);
  });
});
