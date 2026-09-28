import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { createElement } from "hono/jsx";
import { BasePage } from "../src/components/layout";
import { PageShell } from "../src/components/page-shell";
import { Card } from "../src/components/ui/card";
import { PageHero } from "../src/components/ui/page-hero";
import { site } from "../src/content/site";
import { canonicalAddress } from "./content.test";

function createTestApp() {
  const testApp = new Hono();

  testApp.get("/base", (c) =>
    c.html(
      createElement(
        BasePage,
        { title: "KCCF Ministry", description: "A church for people who want to grow in faith." },
        createElement("main", {}, createElement("h1", {}, "Base page content")),
      ).toString(),
    ),
  );

  testApp.get("/shell", (c) =>
    c.html(
      createElement(
        PageShell,
        {
          title: "KCCF Ministry",
          description: "A church for people who want to grow in faith.",
          currentPath: "/about",
        },
        createElement("h1", {}, "Page content"),
      ).toString(),
    ),
  );

  testApp.get("/image-meta", (c) =>
    c.html(
      createElement(
        BasePage,
        {
          title: "KCCF Ministry",
          description: "A church for people who want to grow in faith.",
          imageUrl: "https://kccfweb.vercel.app/static/images/worship-moment.jpg",
          imageAlt: "Worship moment",
        },
        createElement("main", {}, "Image metadata"),
      ).toString(),
    ),
  );

  testApp.get("/image-relative", (c) =>
    c.html(
      createElement(
        BasePage,
        {
          title: "KCCF Ministry",
          description: "A church for people who want to grow in faith.",
          imageUrl: "/static/images/worship-moment.jpg",
          imageAlt: "Worship moment",
        },
        createElement("main", {}, "Relative image metadata"),
      ).toString(),
    ),
  );

  testApp.get("/image-url-only", (c) =>
    c.html(
      createElement(
        BasePage,
        {
          title: "KCCF Ministry",
          description: "A church for people who want to grow in faith.",
          imageUrl: "https://kccfweb.vercel.app/static/images/worship-moment.jpg",
        },
        createElement("main", {}, "Image URL without alt metadata"),
      ).toString(),
    ),
  );

  testApp.get("/alt-only", (c) =>
    c.html(
      createElement(
        BasePage,
        {
          title: "KCCF Ministry",
          description: "A church for people who want to grow in faith.",
          imageAlt: "Worship moment",
        },
        createElement("main", {}, "Partial metadata"),
      ).toString(),
    ),
  );

  testApp.get("/media", (c) =>
    c.html(
      createElement(
        PageShell,
        { title: "KCCF Ministry", description: "A church for people who want to grow in faith." },
        createElement(
          "div",
          {},
          createElement(
            PageHero,
            { title: "A page", description: "A page description", image: "/static/images/about.jpg" },
          ),
          createElement(
            Card,
            { title: "A card", description: "Card description", image: "/static/images/about.jpg" },
          ),
        ),
      ).toString(),
    ),
  );

  return testApp;
}

function getMarqueeSequenceBlocks(html: string) {
  return html
    .split('<div class="marquee-sequence" aria-hidden="true">')
    .slice(1)
    .map((sequence) => sequence.split("</div>")[0]);
}

function mapsHref(absoluteUrl: string) {
  return `href="${absoluteUrl.replace(/&/g, "&amp;")}"`;
}

describe("shared page components", () => {
  test("BasePage renders document metadata without a canonical link", async () => {
    const response = await createTestApp().request("/base");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("<html");
    expect(html).toContain("<head");
    expect(html).toContain("<body");
    expect(html).toContain("<title>KCCF Ministry</title>");
    expect(html).toContain('name="description" content="A church for people who want to grow in faith."');
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('href="/static/style.css"');
    expect(html).toContain('src="/static/datastar.js"');
    expect(html).not.toContain('rel="canonical"');
  });

  test("BasePage links Google Fonts with preconnect instead of a CSS import", async () => {
    const response = await createTestApp().request("/base");
    const html = await response.text();

    expect(html).toContain('<link rel="preconnect" href="https://fonts.googleapis.com"/>');
    expect(html).toContain('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>');
    expect(html).toContain('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display');
    expect(html).toContain("family=Source+Sans+3");
    expect(html.indexOf('href="https://fonts.googleapis.com/css2')).toBeLessThan(
      html.indexOf('href="/static/style.css"'),
    );
  });

  test("BasePage only emits Open Graph image metadata with a real image", async () => {
    const testApp = createTestApp();
    const imageHtml = await (await testApp.request("/image-meta")).text();
    const imageUrlOnlyHtml = await (await testApp.request("/image-url-only")).text();
    const altOnlyHtml = await (await testApp.request("/alt-only")).text();
    const relativeImageHtml = await (await testApp.request("/image-relative")).text();

    expect(imageHtml).toContain('property="og:image" content="https://kccfweb.vercel.app/static/images/worship-moment.jpg"');
    expect(imageHtml).toContain('property="og:image:alt" content="Worship moment"');
    expect(imageUrlOnlyHtml).not.toContain('property="og:image"');
    expect(imageUrlOnlyHtml).not.toContain('property="og:image:alt"');
    expect(altOnlyHtml).not.toContain('property="og:image:alt"');
    expect(altOnlyHtml).not.toContain('property="og:image"');
    expect(relativeImageHtml).not.toContain('property="og:image"');
    expect(relativeImageHtml).not.toContain('property="og:image:alt"');
  });

  test("PageShell renders landmarks, navigation, service marquee, and footer contact", async () => {
    const response = await createTestApp().request("/shell");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("<header");
    expect(html).toContain("<nav");
    expect(html).toContain('<main id="main-content" tabindex="-1" class="header-offset">');
    expect(html).toContain("<footer");
    expect(html).toContain("KCCF Ministries");
    expect(html).toContain('<a class="skip-link" href="#main-content">Skip to main content</a>');
    expect(html).not.toContain('aria-label="Skip to main content"');
    expect(html).toContain('<a class="brand-lockup" href="/">');
    expect(html).toContain('<img class="brand-logo-image"');
    // The lockup is the logo alone, so the link's accessible name is the image's alt text.
    // A visually hidden text span here would name the link twice.
    expect(html).toContain('alt="KCCF Ministries"');
    expect(html).not.toContain('<span class="visually-hidden"> home</span>');
    expect(html).not.toContain('name="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('data-attr:aria-expanded="$menuOpen ? &#39;true&#39; : &#39;false&#39;"');
    expect(html).toContain('aria-controls="mobile-navigation"');
    expect(html).toContain('<a class="nav-link is-active" href="/about" aria-current="page">About</a>');
    expect((html.match(/>Visit Us<\/span>/g) ?? [])).toHaveLength(1);
    expect((html.match(/>Visit Us<\/a>/g) ?? [])).toHaveLength(1);
    expect(html).toContain('class="mobile-nav-link" href="/contact#visit-us"');
    expect(html).toContain("Sunday Worship");
    expect(html).toContain("Wednesday Throne of Grace");
    expect(html).toContain("Friday Prayer Meeting");

    const marqueeSequenceBlocks = getMarqueeSequenceBlocks(html);
    expect(marqueeSequenceBlocks).toHaveLength(2);
    expect(marqueeSequenceBlocks[0]).toBe(marqueeSequenceBlocks[1]);
    for (const sequence of marqueeSequenceBlocks) {
      expect(sequence).toContain("Sunday Worship");
      expect(sequence).toContain("9:00 AM");
      expect(sequence).toContain("Wednesday Throne of Grace");
      expect(sequence).toContain("Friday Prayer Meeting");
      expect(sequence).toContain("6:30 PM");
      expect(sequence).not.toContain("Transformation Night");
    }

    expect(html).toContain("+2349056347603");
    expect(html).toContain("info@kccfministries.org");
    expect(html).toContain(canonicalAddress);
    expect(html).not.toContain("Awolowo");
    expect(html).toContain(mapsHref(site.contact.mapsUrl));
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
    expect(html).toContain(`href="https://www.facebook.com/kccfministries" target="_blank" rel="noopener noreferrer"`);
    expect(html).toContain(`© ${new Date().getUTCFullYear()} KCCF Ministries`);
    expect(html).toContain("Made with love for the glory of God");

    for (const item of site.navItems) {
      expect(html).toContain(`href="${item.href}"`);
    }
  });

  test("PageShell derives the hidden service summary from site.services", async () => {
    const response = await createTestApp().request("/shell");
    const html = await response.text();
    const summary = html.match(/<p class="visually-hidden">(Service times:[^<]*)<\/p>/)?.[1];

    expect(summary).toBeDefined();
    for (const service of site.services) {
      expect(summary).toContain(`${service.name} at ${service.time}`);
    }
    expect(summary).not.toContain("Transformation Night");
  });

  test("PageShell renders a static-name marquee toggle bound to the paused state", async () => {
    const response = await createTestApp().request("/shell");
    const html = await response.text();
    const toggle = html.match(/<button[^>]*class="marquee-toggle"[\s\S]*?<\/button>/)?.[0] ?? "";

    expect(toggle).toBeDefined();
    expect(toggle).toContain('aria-label="Pause or play service times"');
    expect(toggle).toContain('aria-pressed="false"');
    expect(toggle).toContain('data-attr:aria-pressed="$marqueePaused ? &#39;true&#39; : &#39;false&#39;"');
    expect(toggle).toContain('data-on:click="$marqueePaused = !$marqueePaused"');
    expect(toggle).toContain('<span data-show="!$marqueePaused">Pause</span>');
    expect(toggle).toContain('<span data-show="$marqueePaused">Play</span>');
    expect(toggle.match(/aria-label="/g)).toHaveLength(1);
  });

  test("PageHero and Card reserve stable image aspect ratios", async () => {
    const response = await createTestApp().request("/media");
    const html = await response.text();

    expect(html).toContain('class="page-hero-image');
    expect(html).toContain('width="4389"');
    expect(html).toContain('height="3292"');
    expect(html).toContain('class="card-image"');
    expect(html).toContain('alt=""');
  });

  test("PageHero exposes responsive sources while keeping the full-size fallback", async () => {
    const response = await createTestApp().request("/media");
    const heroImage = (await response.text()).match(/<img[^>]*page-hero-image[^>]*>/)?.[0];

    expect(heroImage).toBeDefined();
    expect(heroImage).toContain('src="/static/images/about.jpg"');
    expect(heroImage).toContain('srcset="/static/images/about-640.jpg 640w');
    expect(heroImage).toContain('/static/images/about-2400.jpg 2400w"');
    expect(heroImage).toContain('sizes="(min-width: 64rem) 40rem');
    expect(heroImage).toContain('width="4389"');
    expect(heroImage).toContain('height="3292"');
  });

  test("Card images use the card sizes against the full-size local fallback", async () => {
    const response = await createTestApp().request("/media");
    const html = await response.text();
    const cardImage = html.match(/<img[^>]*class="card-image"[^>]*>/)?.[0];

    expect(cardImage).toBeDefined();
    expect(cardImage).toContain('src="/static/images/about.jpg"');
    expect(cardImage).toContain('srcset="/static/images/about-640.jpg 640w');
    expect(cardImage).toContain('sizes="(min-width: 64rem) 26rem, (min-width: 40rem) 22rem, 92vw"');
    expect(cardImage).toContain('width="4389"');
    expect(cardImage).toContain('height="3292"');
  });
});
