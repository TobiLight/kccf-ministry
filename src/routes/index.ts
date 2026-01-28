import { Hono, } from "hono";
import { sendKeepAlivePing } from "~/lib/datastar";
import { streamSSE } from "hono/streaming";
import { CookieStore, Session, sessionMiddleware } from "hono-sessions";
import { compression } from "~/lib/compression";
import { OrisunEventRetriever, OrisunEventSaver, } from "~/event-sourcing-utils/orisun-event-sourcing";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { createModuleLogger } from "~/utils/logger";
import { SessionDataTypes } from "~/lib/api_types";
import { Subscriber } from "~/event-sourcing-utils/types";
import { IndexPage, SplashPage, LoginPage } from "~/components";

const logger = createModuleLogger("routes");

const configureRoutes = (
    orisunEventRetriever: OrisunEventRetriever,
    orisunEventSaver: OrisunEventSaver,
    subscriber: Subscriber,
    db: NodePgDatabase
) => {
    const app = new Hono<{
        Variables: {
            session: Session<SessionDataTypes>;
            session_key_rotation: boolean;
        };
    }>({});

    app.use(compression);

    const session = sessionMiddleware({
        store: new CookieStore(),
        encryptionKey:
            process.env["SESSION_SECRET"] ?? "secret-key-that-should-be-very-secret",
        expireAfterSeconds: 60 * 60 * 24 * 90, // Expire session after 90 days of inactivity
        cookieOptions: {
            sameSite: "Lax", // Recommended for basic CSRF protection in modern browsers
            path: "/", // Required for this library to work properly
            httpOnly: true, // Recommended to avoid XSS attacks
        },
        sessionCookieName: "orisun-kanban-session",
    });
    app.use("*", async (c, next) => {
        // Don't give a session to the healthcheck
        if (c.req.path === "/health") {
            return next();
        }

        return await session(c, next);
    });

    // app.get("/static/*", async (c) => {
    //     const path = c.req.path.replace("/static/", "");
    //     const filePath = `./static/${path}`;
    //     const file = Bun.file(filePath);

    //     if (await file.exists()) {
    //         // Get the proper content type
    //         const ext = path.split(".").pop();
    //         const contentTypes: Record<string, string> = {
    //             css: "text/css",
    //             js: "application/javascript",
    //             png: "image/png",
    //             jpg: "image/jpeg",
    //             svg: "image/svg+xml",
    //             woff: "font/woff",
    //             woff2: "font/woff2",
    //         };

    //         return new Response(file, {
    //             headers: {
    //                 "Content-Type": contentTypes[ext || ""] || "application/octet-stream",
    //                 "Cache-Control": "public, max-age=31536000",
    //             },
    //         });
    //     }

    //     return c.notFound();
    // });

    // Hot reload endpoint for development
    let isHotReloaded = false;
    app.get("/hotreload", (c) => {
        c.header('Content-Type', 'text/event-stream');
        c.header('Cache-Control', 'no-cache');
        c.header('Connection', 'keep-alive');

        return streamSSE(
            c,
            async (stream) => {
                if (!isHotReloaded) {
                    await stream.writeSSE({
                        event: "datastar-patch-elements",
                        data: `selector body\nmode append\nelements <script>window.location.reload()</script>`,
                    });
                    isHotReloaded = true;
                    console.log("Hot reload triggered");
                }

                let isAborted = false;
                stream.onAbort(() => {
                    isAborted = true;
                    console.log("Stream aborted");
                })
                await sendKeepAlivePing(stream)

                while (!isAborted) {
                    await new Promise((resolve) => setTimeout(resolve, 7000));
                    // await stream.sleep(1000)
                    await sendKeepAlivePing(stream)
                }
                console.log("Stream closed");
            },
            async (err) => {
                console.error(err);
            });
    });

    app.get("/", (c) => {
        return c.html(SplashPage());
    });

    app.get("/login", (c) => {
        return c.html(LoginPage());
    });

    app.post("/login", async (c) => {
        // Mock login - in a real app this would verify credentials
        // For now, just simulate a delay or success
        return c.text("Login handler unimplemented", 501);
    });

    return app
}

export { configureRoutes };
