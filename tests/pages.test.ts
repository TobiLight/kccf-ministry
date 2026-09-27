import { describe, expect, test } from "bun:test";
import { createApp } from "../src/index";
import { resolveSermons } from "../src/content/sermon-feed";
import snapshot from "../src/content/sermons.generated.json";
import { sermons } from "../src/content/sermons";
import { site } from "../src/content/site";
import { canonicalAddress } from "./content.test";

async function getPage(path: string) {
  const response = await createApp().request(path);
  const html = await response.text();
  const mainStart = html.indexOf("<main");
  const mainEnd = html.indexOf("</main>");
  return { response, html, main: html.slice(mainStart, mainEnd) };
}

function expectInOrder(html: string, content: string[]) {
  let previousIndex = -1;

  for (const text of content) {
    const currentIndex = html.indexOf(text);
    expect(currentIndex).toBeGreaterThan(previousIndex);
    previousIndex = currentIndex;
  }
}

describe("home page", () => {
  test("renders the hero, worship invitation, services, ministry previews, leaders, events, and final CTA in order", async () => {
    const { html, main } = await getPage("/");

    expectInOrder(main, [
      "Welcome to",
      "Kingdom Covenant of Christ Fellowship",
      "Join Us for Worship",
      "Watch Sermons",
      "Welcome to KCCF Ministries",
      "Our Services",
      "Explore Our Ministries",
      "Meet Our Pastors",
      "Upcoming Events",
      "Experience the Covenant Life",
    ]);
    expect(html).toContain("Sunday Worship");
    expect(html).toContain("Wednesday Throne of Grace");
    expect(html).toContain("Friday Prayer Meeting");
    expect(html).toContain("Prayer Fellowship");
    expect(html).toContain("Bible Study");
    expect(html).toContain("Bishop Olayinka Adeyinka");
    expect(html).toContain("Pastor David Bodunrin");
    expect(html).toContain("No upcoming events");
    expect(html).toContain("href=\"/contact\"");
    expect(html).toContain("href=\"/sermons\"");
  });
});

describe("about page", () => {
  test("renders the calling, beliefs, story, and leaders in reference order", async () => {
    const { html, main } = await getPage("/about");

    expectInOrder(main, [
      "About KCCF",
      "Our Calling",
      "Our Mission",
      "Our Vision",
      "What We Believe",
      "Our Story",
      "Meet Our Leaders",
    ]);
    expect(html).toContain("A Covenant Community Rooted in Christ");
    expect(html).toContain("Biblical truth");
    expect(html).toContain("Prayer");
    expect(html).toContain("Compassion");
    expect(html).toContain("Bishop Olayinka Adeyinka");
    expect(html).toContain("Pastor David Bodunrin");
  });
});

describe("ministries page", () => {
  test("renders all six typed ministry entries and the contact CTA", async () => {
    const { html, main } = await getPage("/ministries");

    expectInOrder(main, [
      "Our Ministries",
      "Worship",
      "Prayer Fellowship",
      "Bible Study",
      "Children",
      "Youth Fellowship",
      "Community Outreach",
      "Contact Us",
    ]);
    expect((html.match(/<article class="ministry-entry/g) ?? [])).toHaveLength(6);
    expect(html).toContain("A room for heartfelt praise");
  });
});

describe("sermons page", () => {
  test("renders the live banner and six non-clickable message cards", async () => {
    const { html, main } = await getPage("/sermons");

    expectInOrder(main, ["Sermons", "Join us live on Facebook", "The God Who Meets Us", "The Freedom to Serve", "View More on Facebook"]);
    expect((html.match(/class="card sermon-card"/g) ?? [])).toHaveLength(6);
    expect(html).not.toContain("<video");
    expect(html).toContain("https://www.facebook.com/kccfministries");
  });

  test("uses the Facebook icon instead of a literal glyph and drops the filler archive note", async () => {
    const { html } = await getPage("/sermons");
    const bannerStart = html.indexOf('<section class="live-banner-section"');
    const listStart = html.indexOf('<section class="sermon-list-section section-cream"');

    expect(bannerStart).toBeGreaterThan(-1);
    expect(listStart).toBeGreaterThan(bannerStart);

    const liveBanner = html.slice(bannerStart, listStart);

    expect(liveBanner).toContain('<div class="live-banner-mark" aria-hidden="true">');
    expect(liveBanner).toContain("<svg");
    expect(liveBanner).not.toContain(">f</div>");
    expect(html).not.toContain("Sermon archive");
    expect(html).not.toContain("sermon-date-note");
  });

  test("renders a no-cookie YouTube facade that loads nothing until play is pressed", async () => {
    const { html } = await getPage("/sermons");

    expect(html).toContain('id="sermon-player"');
    expect(html).toContain('class="sermon-player"');
    expect(html).toMatch(/id="sermon-player"[^>]*tabindex="-1"/);
    expect(html).toContain('data-signals="{&quot;sermon&quot;:{&quot;videoId&quot;:&quot;&quot;}}"');
    expect(html).toContain('class="sermon-player-frame"');
    expect(html).toContain('class="sermon-facade" data-show="$sermon.videoId === &#39;&#39;"');
    expect(html).toContain("youtube-nocookie.com/embed/");
    expect(html).not.toContain("youtube.com/embed/");
    expect(html).not.toContain("connect.facebook.net");
  });

  test("ships no non-module script, whatever the attribute order", async () => {
    const { html } = await getPage("/sermons");
    const scriptTags = [...html.matchAll(/<script\b[^>]*>/g)].map((match) => match[0]);

    expect(scriptTags.length).toBeGreaterThan(0);
    expect(scriptTags.filter((tag) => !/type="module"/.test(tag))).toEqual([]);
  });

  test("gives the facade play control a real accessible name that contains its visible label", async () => {
    const { html } = await getPage("/sermons");
    const control = html.match(/<button[^>]*class="sermon-facade-play"[^>]*>[\s\S]*?<\/button>/)?.[0];

    expect(control).toBeDefined();
    const label = control?.match(/aria-label="([^"]+)"/)?.[1];
    expect(label?.startsWith("Play message")).toBe(true);
    expect(label).toContain("Play message");
    expect(control).toContain('type="button"');
    expect(control).toContain('<span class="sermon-facade-label">Play message</span>');
  });

  test("assigns a real video id to the facade click instead of an absent one", async () => {
    const { html } = await getPage("/sermons");
    const click = html.match(/class="sermon-facade-play"[^>]*data-on:click="([^"]+)"/)?.[1];

    expect(click).toBeDefined();
    expect(click).toMatch(/^\$sermon\.videoId = &quot;[A-Za-z0-9_-]{6,}&quot;$/);
    expect(html).not.toMatch(/data-on:click="[^"]*undefined/);
  });

  test("keeps the embed iframe titled, lazy, and sandboxed to a no-cookie host", async () => {
    const { html } = await getPage("/sermons");
    const iframe = html.match(/<iframe[^>]*class="sermon-player-embed"[^>]*>/)?.[0];

    expect(iframe).toBeDefined();
    expect(iframe).toContain('data-show="$sermon.videoId !== &#39;&#39;"');
    expect(iframe).toMatch(/data-attr:src="\$sermon\.videoId \? &#39;https:\/\/www\.youtube-nocookie\.com\/embed\/&#39;/);
    expect(iframe).toMatch(/title="[^"]+"/);
    expect(iframe).toContain('loading="lazy"');
    expect(iframe).toContain('allow="autoplay; encrypted-media; picture-in-picture; fullscreen"');
    expect(iframe).toContain("allowfullscreen");
  });

  test("keeps a no-javascript watch link beside the player", async () => {
    const { html } = await getPage("/sermons");

    expect(html).toContain("https://www.youtube.com/watch?v=");
    expect(html).toContain(">Watch on YouTube</span>");
  });

  test("groups the archive by year and labels every row's source", async () => {
    const { html } = await getPage("/sermons");

    expect(html).toContain('class="sermon-archive"');
    expect(html).toContain("sermon-archive-year");
    expect(html).toContain("sermon-row-badge");
    expect(html).toMatch(/<time\b[^>]*datetime="\d{4}-\d{2}-\d{2}"/);
  });

  test("gives every YouTube archive row a play control and a no-javascript link", async () => {
    const { html } = await getPage("/sermons");
    const rows = [...html.matchAll(/<article class="sermon-row[\s\S]*?<\/article>/g)].map((match) => match[0]);
    const youtubeRows = rows.filter((row) => row.includes("watch?v="));

    expect(youtubeRows.length).toBeGreaterThan(0);

    for (const row of youtubeRows) {
      expect(row).toMatch(/class="sermon-row-play"/);
      expect(row).toContain("https://www.youtube.com/watch?v=");
      expect(row).not.toContain("youtube.com/embed/");
    }
  });

  test("drives the featured player from a row and names that control for assistive technology", async () => {
    const { html } = await getPage("/sermons");
    const control = html.match(/<button[^>]*class="sermon-row-play"[^>]*>[\s\S]*?<\/button>/)?.[0];
    const click = control?.match(/data-on:click="([^"]+)"/)?.[1];
    const videoId = control?.match(/\$sermon\.videoId = &quot;([^&]+)&quot;/)?.[1];
    const label = control?.match(/aria-label="([^"]+)"/)?.[1];

    expect(control).toBeDefined();
    expect(click).toMatch(
      /^\$sermon\.videoId = &quot;[A-Za-z0-9_-]{6,}&quot;; document\.getElementById\(&#39;sermon-player&#39;\)\?\.focus\(\)$/,
    );
    expect(videoId).toBeDefined();
    expect(videoId).not.toBe("");
    expect(label?.startsWith("Play ")).toBe(true);
    expect(label).toContain("Play");
    expect(control).toContain('type="button"');
    expect(control).toContain(">Play</span>");
  });

  test("flags a curation row only for the archive entries that still need curating", async () => {
    const { html } = await getPage("/sermons");
    const rows = [...html.matchAll(/<article class="sermon-row[\s\S]*?<\/article>/g)].map((match) => match[0]);
    const archive = resolveSermons(sermons, snapshot).filter((sermon) => sermon.youtubeId || sermon.facebookUrl);
    const flagged = new Set(
      archive.filter((sermon) => sermon.needsCuration).map((sermon) => sermon.youtubeId),
    );
    const settled = archive.filter((sermon) => !sermon.needsCuration);

    expect(rows).toHaveLength(archive.length);
    expect(flagged.size).toBeGreaterThan(0);
    expect(settled.length).toBeGreaterThan(0);

    for (const row of rows) {
      const youtubeId = row.match(/watch\?v=([^"&]+)"/)?.[1];

      expect(youtubeId).toBeDefined();
      expect(row.includes("sermon-row-flag")).toBe(flagged.has(youtubeId ?? ""));
    }
  });
});

describe("events page", () => {
  test("renders regular services, the featured empty state, and contact CTA", async () => {
    const { html, main } = await getPage("/events");

    expectInOrder(main, ["Events", "Sunday Worship", "Wednesday Throne of Grace", "Transformation Night", "Featured Events", "No upcoming events", "Contact Us"]);
    expect(html).toContain("Every 1st Thursday Transformation Night");
    expect(html).toContain("10:00 PM");
    expect(html).not.toContain("Weekly gathering");
  });
});

describe("leadership page", () => {
  test("renders pastoral and ministry leader cards with images, roles, biographies, and a contact CTA", async () => {
    const { html, main } = await getPage("/leadership");

    expectInOrder(main, [
      "Our Leadership",
      "General Overseer",
      "Bishop Olayinka Adeyinka",
      "Co-Pastor",
      "Pastor David Bodunrin",
      "Ministry Leaders",
      "Worship Director",
      "Outreach Coordinator",
      "Get in Touch",
    ]);
    expect((html.match(/<article class="pastoral-card"/g) ?? [])).toHaveLength(2);
    expect((html.match(/<article class="leadership-card"/g) ?? [])).toHaveLength(5);
    expect(html).toContain("biblical truth");
    expect(html).toContain("pastoral care");
    expect(html).toContain("pastor-1.jpg");
    expect(html).toContain("pastor-2.jpg");
  });

  test("gives every ministry leader card its own image metadata", async () => {
    const { html } = await getPage("/leadership");
    const leaderImages = [...html.matchAll(/<img[^>]*class="leadership-card-image"[^>]*>/g)].map((match) => match[0]);

    expect(leaderImages).toHaveLength(5);
    for (const image of leaderImages) {
      const alt = image.match(/alt="([^"]*)"/)?.[1];
      expect(alt).toBeTruthy();
      expect(image).toMatch(/width="\d+"/);
      expect(image).toMatch(/height="\d+"/);
    }
  });
});

describe("contact page", () => {
  test("renders contact details and a semantic frontend-only form with the required field contract", async () => {
    const { html, main } = await getPage("/contact");
    const form = main.slice(main.indexOf("<form"), main.indexOf("</form>"));

    expectInOrder(main, [
      "Contact KCCF",
      canonicalAddress,
      "+2349056347603",
      "info@kccfministries.org",
      "Try the message preview",
      "Full Name",
      "Subject",
      "Message",
      "Preview Message",
      "Plan Your Visit",
    ]);
    expectInOrder(form, ["Full Name", "Email", "Phone", "Subject", "Message", "Preview Message"]);
    expect(form).toContain('id="full-name"');
    expect(form).toContain('id="email"');
    expect(form).toContain('id="phone"');
    expect(form).toContain('id="subject"');
    expect(form).toContain('id="message"');
    expect(form).not.toMatch(/\bname="[^"]+"/);
    expect(form).toMatch(/id="full-name"[^>]*required/);
    expect(form).toMatch(/id="email"[^>]*required/);
    expect(form).not.toMatch(/id="phone"[^>]*required/);
    expect(form).toMatch(/id="subject"[^>]*required/);
    expect(form).toMatch(/id="message"[^>]*required/);
    expect(form).toContain('data-on:submit=');
    expect(form).toContain('type="submit"');
    expect(form).toContain('role="status"');
    expect(form).toContain('aria-live="polite"');
    expect(form).toContain("This preview does not send or store your message. Please call or email us using the details above.");
    expect(form).toContain("Form preview complete");
    expect(form).toContain("Your message was cleared without being sent. Please call or email us using the details above.");
    expect(form).not.toContain("Message Sent");
    expect(form).not.toContain("we will get back");
    expect(form).not.toContain("Your message helps us know how to serve you better.");
    expect(form).not.toContain("fetch(");
    expect(form).not.toContain("@post");
    expect(form).not.toContain("@get");
    expect(html).toContain('id="visit-us"');
    expect(html).toContain("Sunday Worship");
    expect(html).toContain("https://www.facebook.com/kccfministries");
    expect(html).toContain(
      `href="${site.contact.mapsUrl.replace(/&/g, "&amp;")}" target="_blank" rel="noopener noreferrer"`,
    );
    expect(form).toContain('method="post"');
    expect(form).toContain('action="/contact"');
    expect(form).not.toContain('method="get"');
  });

  test("directs visitors to Ikotun rather than the superseded Ikoyi address", async () => {
    const { html } = await getPage("/contact");

    expect(html).toContain("We are located in Ikotun, Lagos, and look forward to welcoming you.");
    expect(html).not.toContain("Ikoyi");
    expect(html).not.toContain("Awolowo");
  });
});

describe("not found page", () => {
  test("renders the branded not-found content without marking Home as current", async () => {
    const { html } = await getPage("/missing");

    expect(html).toContain("404");
    expect(html).toContain("Oops! Page not found");
    expect(html).toContain("Return to Home");
    expect(html).toContain('href="/"');
    expect(html).not.toContain('class="nav-link is-active"');
    expect(html).not.toContain('class="mobile-nav-link is-active"');
    expect(html).not.toContain('aria-current="page"');
  });
});
