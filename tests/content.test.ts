import { describe, expect, test } from "bun:test";
import { events, monthlyService } from "../src/content/events";
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

  test("intentionally has no featured events yet", () => {
    expect(events).toEqual([]);
  });
});
