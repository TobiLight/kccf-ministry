import { Hono } from "hono";
import { createElement } from "hono/jsx";
import { AboutPage } from "../components/pages/about-page";
import { ContactPage } from "../components/pages/contact-page";
import { EventsPage } from "../components/pages/events-page";
import { HomePage } from "../components/pages/home-page";
import { LeadershipPage } from "../components/pages/leadership-page";
import { MinistriesPage } from "../components/pages/ministries-page";
import { NotFoundPage } from "../components/pages/not-found-page";
import { SermonsPage } from "../components/pages/sermons-page";
import { PageShell } from "../components/page-shell";

function renderNode(node: ReturnType<typeof createElement>) {
  return node.toString();
}

export function configureRoutes(app: Hono): Hono {
  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get("/", (c) =>
    c.html(
      renderNode(
        createElement(
          PageShell,
          {
            title: "Kingdom Covenant of Christ Fellowship | A Covenant Community Rooted in Christ",
            description: "Welcome to KCCF Ministries, a warm Christian community worshiping together in the heart of Lagos.",
            currentPath: "/",
          },
          createElement(HomePage, {}),
        ),
      ),
    ),
  );

  app.get("/about", (c) =>
    c.html(
      renderNode(
        createElement(
          PageShell,
          {
            title: "About KCCF | A Covenant Community Rooted in Christ",
            description: "Learn about the mission, beliefs, story, and leaders of KCCF Ministries.",
            currentPath: "/about",
          },
          createElement(AboutPage, {}),
        ),
      ),
    ),
  );

  app.get("/ministries", (c) =>
    c.html(
      renderNode(
        createElement(
          PageShell,
          {
            title: "Ministries | KCCF Ministries",
            description: "Find your place to worship, serve, learn, and belong at KCCF Ministries.",
            currentPath: "/ministries",
          },
          createElement(MinistriesPage, {}),
        ),
      ),
    ),
  );

  app.get("/sermons", (c) =>
    c.html(
      renderNode(
        createElement(
          PageShell,
          {
            title: "Sermons | KCCF Ministries",
            description: "Explore messages from KCCF Ministries and join us live on Facebook.",
            currentPath: "/sermons",
          },
          createElement(SermonsPage, {}),
        ),
      ),
    ),
  );

  app.get("/events", (c) =>
    c.html(
      renderNode(
        createElement(
          PageShell,
          {
            title: "Events | KCCF Ministries",
            description: "Discover regular services and upcoming events at KCCF Ministries.",
            currentPath: "/events",
          },
          createElement(EventsPage, {}),
        ),
      ),
    ),
  );

  app.get("/leadership", (c) =>
    c.html(
      renderNode(
        createElement(
          PageShell,
          {
            title: "Leadership | KCCF Ministries",
            description: "Meet the pastoral and ministry leaders who serve KCCF Ministries with love and wisdom.",
            currentPath: "/leadership",
          },
          createElement(LeadershipPage, {}),
        ),
      ),
    ),
  );

  app.get("/contact", (c) =>
    c.html(
      renderNode(
        createElement(
          PageShell,
          {
            title: "Contact KCCF | We Would Love to Welcome You",
            description: "Find KCCF Ministries, plan your visit, or send us a message.",
            currentPath: "/contact",
          },
          createElement(ContactPage, {}),
        ),
      ),
    ),
  );

  app.notFound((c) => c.html(renderNode(createElement(NotFoundPage, {})), 404));

  return app;
}
