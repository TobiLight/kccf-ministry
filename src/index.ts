import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "hono/bun";
import { configureRoutes } from "./routes";

export function createApp(): Hono {
  const app = new Hono();

  app.use(
    "*",
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        frameSrc: ["'self'", "https://www.youtube-nocookie.com"],
        baseUri: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-eval'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://i.ytimg.com"],
        connectSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
      referrerPolicy: "strict-origin-when-cross-origin",
      xContentTypeOptions: "nosniff",
      xFrameOptions: "DENY",
    }),
  );

  // Hono joins this root with the request path, so "/static/*" resolves under
  // public/static. That is the same tree Vercel serves from its CDN, and it is the
  // only one there: Vercel ignores serveStatic entirely.
  app.use("/static/*", serveStatic({ root: "./public" }));

  return configureRoutes(app);
}

export const app = createApp();

// PORT is read through a cast instead of the bare `process` global on purpose.
// @vercel/hono transpiles this file with a tsconfig it writes to a temp directory, where
// no ambient type library can be resolved, so `src/` must type-check against `types: []`.
// `types: ["bun-types"]` lives in tsconfig.typecheck.json, which only `bun run type-check`
// uses. Referencing `process` directly here fails the Vercel build with TS2591.
const env = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env;
const port = Number(env?.PORT ?? 3000);

export default {
  port,
  fetch: app.fetch,
};
