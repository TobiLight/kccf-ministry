import { describe, expect, test } from "bun:test";
import { events, formatEventSchedule, monthlyService, pastEvents, upcomingEvents } from "../src/content/events";
import { leadership } from "../src/content/leadership";
import { ministries } from "../src/content/ministries";
import { sermons } from "../src/content/sermons";
import { imageAssets, site } from "../src/content/site";

const internalRoutes = ["/", "/about", "/ministries", "/sermons", "/events", "/leadership", "/contact"];

export const canonicalAddress =
  "13-17 Taiwo Akinsulire Street, Off Taiwo Ajakaiye Street, Foursquare bus stop, Ikotun-Ikosi Road, Ikotun, Lagos, Nigeria";

describe("site content", () => {
  test("maps every navigation item to a known internal route", () => {
    for (const item of site.navItems) {
      const pathname = new URL(item.href, "https://kccfweb.vercel.app").pathname;
      expect(internalRoutes).toContain(pathname);
    }
  });

  test("keeps Visit Us in the mobile navigation without duplicating it in the desktop nav list", () => {
    expect(site.navItems.map((item) => item.label)).not.toContain("Visit Us");
    expect(site.mobileNavItems).toContainEqual({ label: "Visit Us", href: "/contact#visit-us" });
  });

  test("uses one consistent contact phone, email, and canonical address", () => {
    expect(site.contact.phone).toBe("+2349056347603");
    expect(site.contact.email).toBe("info@kccfministries.org");
    expect(site.contact.address).toBe(canonicalAddress);
    expect(site.contact.facebookUrl).toBe("https://www.facebook.com/kccfministries");
  });

  test("derives the maps link from the same canonical address", () => {
    const mapsUrl = new URL(site.contact.mapsUrl);

    expect(mapsUrl.origin + mapsUrl.pathname).toBe("https://www.google.com/maps/search/");
    expect(mapsUrl.searchParams.get("api")).toBe("1");
    expect(mapsUrl.searchParams.get("query")).toBe(canonicalAddress);
  });

  test("keeps the address in Ikotun and drops the superseded Ikoyi address", () => {
    const rendered = JSON.stringify(site);

    expect(site.contact.address).toContain("Ikotun");
    expect(rendered).not.toContain("Awolowo");
    expect(rendered).not.toContain("Ikoyi");
  });

  test("contains the three canonical weekly services with their service times", () => {
    expect(site.services).toHaveLength(3);
    expect(site.services.map(({ name, time }) => [name, time])).toEqual([
      ["Sunday Worship", "9:00 AM"],
      ["Wednesday Throne of Grace", "9:00 AM"],
      ["Friday Prayer Meeting", "6:30 PM"],
    ]);
  });

  test("keeps the monthly first-Thursday service separate from the weekly services", () => {
    expect(site.services.map(({ name, time }) => [name, time])).toEqual([
      ["Sunday Worship", "9:00 AM"],
      ["Wednesday Throne of Grace", "9:00 AM"],
      ["Friday Prayer Meeting", "6:30 PM"],
    ]);
    expect(monthlyService).toEqual({ name: "Every 1st Thursday Transformation Night", time: "10:00 PM" });
    expect("marqueeServices" in site).toBe(false);
  });

  test("contains six ministries, six sermons, and the leadership roster", () => {
    expect(ministries).toHaveLength(6);
    expect(sermons).toHaveLength(6);
    expect(leadership.pastors).toHaveLength(2);
    expect(leadership.ministryLeaders).toHaveLength(5);
  });

  test("carries image metadata on every leader instead of positional lookups", () => {
    const knownSources = new Set(Object.values(imageAssets).map((asset) => asset.src));

    for (const leader of leadership.ministryLeaders) {
      expect(knownSources.has(leader.image)).toBe(true);
      expect(leader.imageAlt).toBeTruthy();
    }
    for (const leader of leadership.pastors) {
      expect(knownSources.has(leader.image ?? "")).toBe(true);
    }
  });

  test("publishes five past and four upcoming church events", () => {
    expect(events).toHaveLength(9);
    expect(pastEvents).toHaveLength(5);
    expect(upcomingEvents).toHaveLength(4);
  });

  test("splits events into upcoming and past with no overlap and no loss", () => {
    expect(upcomingEvents.length + pastEvents.length).toBe(events.length);
    expect(upcomingEvents.every((event) => event.status === "upcoming")).toBe(true);
    expect(pastEvents.every((event) => event.status === "past")).toBe(true);
    expect(events.filter((event) => event.status === "upcoming")).toEqual(upcomingEvents);
    expect(events.filter((event) => event.status === "past")).toEqual(pastEvents);
  });

  test("gives every event a title, location, and description", () => {
    for (const event of events) {
      expect(event.title).toBeTruthy();
      expect(event.location).toBe("KCCF Mount Zion, Ikotun, Lagos");
      expect(event.description).toBeTruthy();
    }
  });

  test("keeps event titles unique", () => {
    const titles = events.map((event) => event.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  test("orders past events newest first as authored", () => {
    const dates = pastEvents.map((event) => event.date);
    expect(dates).toEqual([
      "September 20, 2026",
      "September 21, 2025",
      "September 19, 2025",
      "July 20, 2025",
      "June 1, 2025",
    ]);
  });

  test("formats an announced schedule and falls back when nothing is announced", () => {
    expect(formatEventSchedule({ ...events[0], date: "September 20, 2026", time: "10:00 PM" })).toBe(
      "September 20, 2026 · 10:00 PM",
    );
    expect(formatEventSchedule({ ...events[0], date: "November 2026", time: undefined })).toBe("November 2026");
    expect(formatEventSchedule({ ...events[0], date: undefined, time: "10:00 PM" })).toBe("10:00 PM");
    expect(formatEventSchedule({ ...events[0], date: undefined, time: undefined })).toBe("Date to be announced");
  });

  test("renders every past event date in long form", () => {
    for (const event of pastEvents) {
      expect(event.date).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
    }
  });

  test("gives only the 2026 anniversary a recap", () => {
    expect(pastEvents.filter((event) => event.recap)).toHaveLength(1);
    expect(pastEvents[0].recap).toBeTruthy();
  });
});
