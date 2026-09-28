import { describe, expect, test } from "bun:test";
import { createApp } from "../src/index";
import { getImageAsset, imageAssets } from "../src/content/site";

async function getPage(path: string) {
  const response = await createApp().request(path);
  return { response, html: await response.text() };
}

function getContactForm(html: string) {
  return html.slice(html.indexOf("<form"), html.indexOf("</form>") + "</form>".length);
}

describe("Datastar interactions", () => {
  test("renders a signal-backed mobile navigation toggle and closable menu", async () => {
    const { html } = await getPage("/");

    expect(html).toContain('data-signals="{&quot;menuOpen&quot;:false');
    expect(html).toMatch(/<button[^>]*class="mobile-menu-trigger"[^>]*type="button"/);
    expect(html).toContain('id="mobile-menu-trigger"');
    expect(html).toContain('data-on:click="$menuOpen = !$menuOpen"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('data-attr:aria-expanded="$menuOpen ? &#39;true&#39; : &#39;false&#39;"');
    expect(html).toContain('data-attr:aria-label="$menuOpen ? &#39;Close navigation menu&#39; : &#39;Open navigation menu&#39;"');
    expect(html).toContain('aria-controls="mobile-navigation"');
    expect(html).toContain('data-show="$menuOpen"');
    expect(html).toContain('data-on:keydown__window="if (evt.key === &#39;Escape&#39; &amp;&amp; $menuOpen) { $menuOpen = false; document.getElementById(&#39;mobile-menu-trigger&#39;).focus(); }"');
    expect(html).toMatch(/class="mobile-nav-link"[^>]*data-on:click="\$menuOpen = false"/);
    const ariaValues = [...html.matchAll(/(?:^|\s)aria-(?:expanded|pressed|busy)="([^"]*)"/g)].map((match) => match[1]);
    expect(ariaValues.every((value) => value.length > 0 && !value.includes("$"))).toBe(true);
  });

  test("starts the service marquee in motion with a pressed-state toggle", async () => {
    const { html } = await getPage("/");

    expect(html).toContain('data-signals="{&quot;menuOpen&quot;:false,&quot;marqueePaused&quot;:false}"');
    expect(html).toContain('class="marquee-toggle"');
    expect(html).toContain('data-on:click="$marqueePaused = !$marqueePaused"');
    expect(html).toContain('aria-label="Pause or play service times"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('data-attr:aria-pressed="$marqueePaused ? &#39;true&#39; : &#39;false&#39;"');
    expect(html).toContain('data-class:is-paused="$marqueePaused"');
    expect(html).toContain("<span data-show=\"!$marqueePaused\">Pause</span>");
    expect(html).toContain("<span data-show=\"$marqueePaused\">Play</span>");
    expect(html).not.toMatch(/ aria-pressed="[^"]*\$/);
  });

  test("keeps the marquee toggle accessible name stable and inside the label-in-name rule", async () => {
    const { html } = await getPage("/");
    const toggle = html.slice(html.indexOf('<button class="marquee-toggle"'), html.indexOf("</button>", html.indexOf('<button class="marquee-toggle"')));

    expect(toggle).toContain('aria-label="Pause or play service times"');
    expect(toggle.match(/aria-label="/g)).toHaveLength(1);
    expect(toggle).not.toContain("data-attr:aria-label");
    for (const visible of ["Pause", "Play"]) {
      expect(toggle.toLowerCase()).toContain(visible.toLowerCase());
    }
  });

  test("leaves the service marquee semantics to the hidden summary instead of a duplicate label", async () => {
    const { html } = await getPage("/");
    const marquee = html.slice(html.indexOf('<div class="service-marquee"'), html.indexOf("</header>"));

    expect(marquee).toContain('<p class="visually-hidden">Service times:');
    expect(marquee).not.toMatch(/<div class="service-marquee"[^>]*aria-label=/);
    expect(marquee).toContain('<div class="marquee-sequence" aria-hidden="true">');
  });

  test("keeps marquee signal names unique and scoped away from the contact form", async () => {
    const { html } = await getPage("/contact");
    const header = html.slice(0, html.indexOf("<main"));
    const form = getContactForm(html);

    expect(header).toContain('&quot;marqueePaused&quot;:false');
    expect(header).toContain('&quot;menuOpen&quot;:false');
    expect(form).not.toContain("marqueePaused");
    expect(form).not.toContain("menuOpen");
  });

  test("renders a frontend-only contact submission flow with native validation and accessible state", async () => {
    const { html } = await getPage("/contact");
    const form = getContactForm(html);

    expect(form).toContain('method="post"');
    expect(form).toContain('action="/contact"');
    expect(form).toContain("data-on:submit=");
    expect(form).toContain("Preparing preview...");
    expect(form).toContain("Form preview complete");
    expect(form).toContain("Your message was cleared without being sent. Please call or email us using the details above.");
    expect(form).toContain("This preview does not send or store your message. Please call or email us using the details above.");
    expect(form).toContain('type="submit"');
    expect(form).toContain('aria-busy="false"');
    expect(form).toContain('aria-live="polite"');
    expect(form).toContain("el.reset()");
    expect(form).not.toContain("Sending...");
    expect(form).not.toContain("Message Sent");
    expect(form).not.toContain("name=");
    expect(form).not.toContain("fetch(");
    expect(form).not.toContain("@post");
    expect(form).not.toContain("@get");
    expect(form).not.toContain("onclick=");
  });

  test("scopes the contact form signals under a $contact namespace", async () => {
    const { html } = await getPage("/contact");
    const form = getContactForm(html);

    expect(form).toContain('&quot;contact&quot;:{');
    expect(form).toContain('&quot;loading&quot;:false');
    expect(form).toContain('&quot;success&quot;:false');
    for (const field of ["fullName", "email", "phone", "subject", "message"]) {
      expect(form).toContain(`&quot;${field}&quot;:&quot;&quot;`);
      expect(form).toContain(`data-bind="$contact.${field}"`);
    }

    expect(form).toContain("$contact.loading = true");
    expect(form).toContain("$contact.success = true");
    expect(form).toContain("$contact.fullName = &#39;&#39;");
    expect(form).toContain("$contact.email = &#39;&#39;");
    expect(form).toContain("$contact.phone = &#39;&#39;");
    expect(form).toContain("$contact.subject = &#39;&#39;");
    expect(form).toContain("$contact.message = &#39;&#39;");
    expect(form).toContain('data-attr:aria-busy="$contact.loading ? &#39;true&#39; : &#39;false&#39;"');
    expect(form).toContain('data-attr:disabled="$contact.loading"');
    expect(form).toContain('data-show="$contact.loading"');
    expect(form).toContain('data-show="$contact.success"');

    expect(form).not.toMatch(/(?:^|[^$\w.])(?:loading|success|fullName|email|phone|subject|message)\s*=/);
  });
});

describe("rendered motion contract", () => {
  const pageHeroPaths = ["/about", "/ministries", "/sermons", "/events", "/leadership", "/contact"];
  const paths = ["/", ...pageHeroPaths];

  test("applies the approved fade-up and fade-in utilities to every page hero", async () => {
    for (const path of pageHeroPaths) {
      const { html } = await getPage(path);

      expect(html).toContain('class="page-hero-copy animate-fade-up"');
      expect(html).toMatch(/class="page-hero-image animate-fade-in"/);
    }
  });

  test("the home hero keeps its bespoke full-bleed contract instead of a second page hero", async () => {
    const { html } = await getPage("/");

    expect(html).toContain('<section class="home-hero"');
    expect(html).not.toContain('class="page-hero-copy');
    expect(html).not.toContain('class="page-hero-image');
  });

  test("applies fade, fade-in, and the soft scroll bounce on the home hero", async () => {
    const { html } = await getPage("/");

    expect(html).toMatch(/class="home-hero-image animate-fade-in"/);
    expect(html).toContain('class="container home-hero-content animate-fade-up"');
    expect(html).toContain('class="scroll-indicator animate-soft-bounce"');
    expect(html).not.toContain("animate-bounce");
  });

  test("serves the full-bleed home hero from responsive variants", async () => {
    const { html } = await getPage("/");
    const hero = html.match(/<img[^>]*class="home-hero-image[^>]*>/)?.[0] ?? "";

    expect(hero).toContain('src="/static/images/hero.jpg"');
    expect(hero).toContain('srcset="/static/images/hero-640.jpg 640w, /static/images/hero-1024.jpg 1024w');
    expect(hero).toContain('/static/images/hero.jpg 2048w"');
    expect(hero).toContain('sizes="100vw"');
    expect(hero).toContain('fetchpriority="high"');
  });

  test("animates section headings and never leaves a fade element at opacity 0", async () => {
    for (const path of paths) {
      const { html } = await getPage(path);
      expect(html).toContain("animate-fade-up");
    }

    const { html } = await getPage("/");
    expect(html).not.toMatch(/style="[^"]*opacity:\s*0/);
  });
});

describe("rendered accessibility contract", () => {
  const paths = ["/", "/about", "/ministries", "/sermons", "/events", "/leadership", "/contact", "/missing"];

  for (const path of paths) {
    test(`${path} has one h1, valid references, unique IDs, named buttons, and valid images`, async () => {
      const { html } = await getPage(path);
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
      const references = [
        ...[...html.matchAll(/aria-labelledby="([^"]+)"/g)].flatMap((match) => match[1].split(" ")),
        ...[...html.matchAll(/aria-controls="([^"]+)"/g)].flatMap((match) => match[1].split(" ")),
        ...[...html.matchAll(/aria-describedby="([^"]+)"/g)].flatMap((match) => match[1].split(" ")),
      ];
      const images = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
      const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];

      expect(html).toMatch(/<main id="main-content"[^>]*tabindex="-1"/);
      expect((html.match(/<h1\b/g) ?? [])).toHaveLength(1);
      expect(new Set(ids).size).toBe(ids.length);
      for (const reference of references) {
        expect(ids).toContain(reference);
      }
      for (const image of images) {
        expect(image).toMatch(/\bsrc="[^"]+"/);
        const alt = image.match(/\balt="([^"]*)"/)?.[1];
        if (alt === "") {
          expect(image).toMatch(
            /class="(?:brand-logo-image|card-image|editorial-image|leadership-card-image)"/,
          );
        } else {
          expect(alt).toBeTruthy();
        }
      }
      for (const button of buttons) {
        const attributes = button[1];
        const text = button[2].replace(/<[^>]+>/g, "").trim();
        expect(Boolean(text || /aria-label(?:ledby)?="[^"]+"/.test(attributes))).toBe(true);
      }
    });
  }

  test("public pages expose no relative Open Graph image metadata", async () => {
    for (const path of ["/", "/about", "/ministries", "/sermons", "/events", "/leadership", "/contact"]) {
      const { html } = await getPage(path);
      expect(html).not.toContain('<meta property="og:image" content="/static/');
    }
  });

  test("public images use intrinsic dimensions, responsive sources, and correct about alt text", async () => {
    const dimensions = new Map(
      Object.values(imageAssets).map((asset) => [asset.src, [asset.width, asset.height]] as const),
    );
    const srcsets = new Map(
      Object.values(imageAssets)
        .filter((asset) => asset.srcset)
        .map((asset) => [asset.src, (asset.srcset ?? "").split(", ")] as const),
    );
    const paths = ["/", "/about", "/ministries", "/sermons", "/events", "/leadership", "/contact"];

    for (const path of paths) {
      const { html } = await getPage(path);
      const images = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
      for (const image of images) {
        const src = image.match(/src="([^"]+)"/)?.[1];
        const size = src ? dimensions.get(src) : undefined;
        expect(size).toBeDefined();
        expect(image).toContain(`width="${size?.[0]}"`);
        expect(image).toContain(`height="${size?.[1]}"`);
        if (image.includes('class="card-image"')) {
          expect(image).toContain('alt=""');
        }
        if (src && srcsets.has(src)) {
          const candidates = image.match(/srcset="([^"]+)"/)?.[1].split(", ") ?? [];

          expect(candidates).toEqual(srcsets.get(src) ?? []);
          expect(image).toContain('sizes="');
          for (const candidate of candidates) {
            const [url, descriptor] = candidate.split(" ");
            const width = Number(descriptor.replace("w", ""));

            expect(url.startsWith("/static/images/")).toBe(true);
            expect(url.endsWith(".jpg") || url.endsWith(".JPG")).toBe(true);
            expect(descriptor).toMatch(/^\d+w$/);
            expect(width).toBeLessThanOrEqual(size?.[0] ?? 0);
          }
        } else {
          expect(image).not.toContain("srcset=");
        }
      }
      if (path === "/about" || path === "/contact") {
        expect(html).toContain('alt="A cross against the sky"');
      }
      if (path === "/") {
        expect(html).toContain('alt="Congregation standing together during a Sunday service"');
      }
      if (path === "/ministries") {
        expect(html).toContain('alt="Hands resting on an open Bible"');
      }
      if (path === "/events") {
        expect(html).toContain('alt="A member of the congregation greeting children during a church service"');
      }
      if (path === "/" || path === "/about" || path === "/contact") {
        expect(html).toContain('fetchpriority="high"');
      }
    }
  });

  test("contact form keeps its required fields native and no POST route is registered", async () => {
    const response = await createApp().request("/contact", { method: "POST" });

    expect(response.status).toBe(404);
  });

  test("every rendered alt is the asset map's own alt for that image's src", async () => {
    for (const path of ["/", "/about", "/ministries", "/sermons", "/events", "/leadership", "/contact"]) {
      const { html } = await getPage(path);

      for (const image of [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0])) {
        const src = image.match(/\bsrc="([^"]*)"/)?.[1];
        const alt = image.match(/\balt="([^"]*)"/)?.[1] ?? "";
        const asset = src ? getImageAsset(src) : undefined;

        if (alt.length > 0 && asset) {
          expect(alt, `${path} pairs the wrong alt with ${src}`).toBe(asset.alt);
        } else if (alt.length > 0) {
          expect(asset, `${path} renders alt text on an unrecognised src ${src}`).toBeDefined();
        }
      }
    }
  });
});
