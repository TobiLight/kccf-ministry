import { describe, expect, test } from "bun:test";
import { createApp } from "../src/index";
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
