import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { events, monthlyService } from "../src/content/events";
import { leadership } from "../src/content/leadership";
import { ministries } from "../src/content/ministries";
import {
  FeedError,
  buildSnapshot,
  deriveEntries,
  formatSermonDate,
  parseFeed,
  resolveSermons,
  watchUrlFor,
} from "../src/content/sermon-feed";
import { sermons } from "../src/content/sermons";
import { imageAssets, site } from "../src/content/site";
import { syncSermons } from "../scripts/sync-sermons";

type SermonSnapshotLike = {
  generatedAt: string;
  channelId: string;
  entries: {
    youtubeId: string;
    title: string;
    speaker: string | null;
    publishedAt: string;
    partIndex: number;
    partCount: number;
    needsCuration: boolean;
  }[];
};

const feedXml = await readFile(new URL("./fixtures/sermons-feed.xml", import.meta.url), "utf8");

function feedWithVideoIds(...videoIds: string[]) {
  const entries = videoIds.map(
    (videoId) => `  <entry>
    <yt:videoId>${videoId}</yt:videoId>
    <title>KCCF Ministries Live Stream</title>
    <published>2026-09-20T13:02:55+00:00</published>
    <media:description>18th Annual Anniversary</media:description>
  </entry>`,
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">',
    "  <title>KCCF Ministries</title>",
    ...entries,
    "</feed>",
  ].join("\n");
}

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

  test("exposes the YouTube channel identity used by the sermon sync", () => {
    expect(site.youtube).toEqual({
      channelId: "UCRNGCZhVNV2Pj80fs20GNog",
      channelUrl: "https://www.youtube.com/@kccfministries1579",
      playlistId: "",
    });
  });

  test("stores every curated sermon date as an ISO 8601 calendar date", () => {
    for (const sermon of sermons) {
      expect(sermon.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(sermon.date))).toBe(false);
    }
  });

  test("never gives a curated sermon both a YouTube id and a Facebook url", () => {
    for (const sermon of sermons) {
      expect(Boolean(sermon.youtubeId) && Boolean(sermon.facebookUrl)).toBe(false);
    }
  });
});

describe("sermon feed derivation", () => {
  test("parses every entry out of an Atom feed", () => {
    const raw = parseFeed(feedXml);

    expect(raw).toHaveLength(7);
    expect(raw[0]).toEqual({
      youtubeId: "2zFODEV22G0",
      title: "KCCF Ministries Live Stream",
      published: "2026-09-20T13:02:55+00:00",
      description: "18th Annual Anniversary\nTheme: Harvest Of Abundance",
    });
  });

  test("decodes XML entities in the description", () => {
    const raw = parseFeed(feedXml);
    const potters = raw.find((entry) => entry.youtubeId === "zWoO2YLWi_Q");

    expect(potters?.description).toContain("The Potter's Hands");
  });

  test("rejects a document that is not an atom feed", () => {
    expect(() => parseFeed("<!DOCTYPE html><html lang=en></html>")).toThrow(FeedError);
  });

  test("rejects a feed with no entries so a broken fetch can never empty the archive", () => {
    expect(() => parseFeed('<feed xmlns="http://www.w3.org/2005/Atom"></feed>')).toThrow(FeedError);
  });

  test("rejects a feed whose entries carry no usable video id so a namespace change cannot silently return nothing", () => {
    const entriesWithoutVideoId = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<feed xmlns="http://www.w3.org/2005/Atom">',
      "  <title>KCCF Ministries</title>",
      "  <entry>",
      "    <id>yt:video:unknown0000</id>",
      "    <title>KCCF Ministries Live Stream</title>",
      "    <published>2026-09-20T13:02:55+00:00</published>",
      "  </entry>",
      "</feed>",
    ].join("\n");

    expect(() => parseFeed(entriesWithoutVideoId)).toThrow(FeedError);
  });

  test("distinguishes the two refusals by message so a broken ingest is diagnosable", () => {
    const entriesWithoutVideoId = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<feed xmlns="http://www.w3.org/2005/Atom">',
      "  <entry>",
      "    <id>yt:video:unknown0000</id>",
      "    <title>KCCF Ministries Live Stream</title>",
      "  </entry>",
      "</feed>",
    ].join("\n");

    expect(() => parseFeed(entriesWithoutVideoId)).toThrow(/no usable video id/i);
    expect(() => parseFeed('<feed xmlns="http://www.w3.org/2005/Atom"></feed>')).toThrow(/no entries/i);
  });

  test("refuses a feed whose video id is not a bare YouTube id rather than dropping the entry", () => {
    const malformedIds = [
      "abc'd;alert(1)//",
      "abc def",
      "a<b",
      "abc",
      "abcde",
      "abc$d",
    ];

    for (const malformedId of malformedIds) {
      expect(() => parseFeed(feedWithVideoIds(malformedId))).toThrow(FeedError);
      expect(() => parseFeed(feedWithVideoIds(malformedId))).toThrow(/malformed video id/i);
    }
  });

  test("names the malformed video id in the refusal so a hostile feed is diagnosable", () => {
    expect(() => parseFeed(feedWithVideoIds("abc'd;alert(1)//"))).toThrow(/abc'd;alert\(1\)\/\//);
    expect(() => parseFeed(feedWithVideoIds("abc def"))).toThrow(/abc def/);
  });

  test("refuses the whole document when one entry carries a malformed id beside valid ones", () => {
    expect(() => parseFeed(feedWithVideoIds("2zFODEV22G0", "abc def", "45e5ZCa-7Sg"))).toThrow(FeedError);
  });

  test("still accepts conforming video ids of every allowed shape", () => {
    const ids = ["2zFODEV22G0", "GUup6e4Ccp0", "a_b-C1234", "zWoO2YLWi_Q"];

    expect(parseFeed(feedWithVideoIds(...ids)).map((entry) => entry.youtubeId)).toEqual(ids);
    expect(parseFeed(feedXml)).toHaveLength(7);
  });

  test("takes the title from the first description line, not the useless feed title", () => {
    const derived = deriveEntries(parseFeed(feedXml));

    expect(derived.find((entry) => entry.youtubeId === "2zFODEV22G0")?.title).toBe("18th Annual Anniversary");
  });

  test("falls back to the feed title when the description is empty", () => {
    const derived = deriveEntries(parseFeed(feedXml));

    expect(derived.find((entry) => entry.youtubeId === "45e5ZCa-7Sg")?.title).toBe(
      "The Breathe Of Life By Pastor Abimbola",
    );
  });

  test("accepts a person-like speaker line", () => {
    const derived = deriveEntries(parseFeed(feedXml));

    expect(derived.find((entry) => entry.youtubeId === "GUup6e4Ccp0")?.speaker).toBe(
      "Bishop Olayinka Adeyinka | Pastor",
    );
  });

  test("rejects a colon-bearing description line as a speaker", () => {
    const derived = deriveEntries(parseFeed(feedXml));

    expect(derived.find((entry) => entry.youtubeId === "2zFODEV22G0")?.speaker).toBeNull();
  });

  test("rejects a multi-word line with no title word as a speaker", () => {
    const derived = deriveEntries(parseFeed(feedXml));

    expect(derived.find((entry) => entry.youtubeId === "eboHWsOsGHY")?.speaker).toBeNull();
  });

  test("groups entries that share a description into numbered parts ordered by date", () => {
    const derived = deriveEntries(parseFeed(feedXml));
    const parts = derived.filter((entry) => entry.title.startsWith("The Potter's Hands"));

    expect(parts).toHaveLength(2);
    expect(parts.map((entry) => [entry.partIndex, entry.partCount])).toEqual([
      [1, 2],
      [2, 2],
    ]);
    expect(parts[0].youtubeId).toBe("zWoO2YLWi_Q");
    expect(parts[1].youtubeId).toBe("3Cd8mf-Vvmk");
  });

  test("numbers a shared occasion description as parts too", () => {
    const derived = deriveEntries(parseFeed(feedXml));
    const occasion = derived.filter((entry) => entry.title === "18th Annual Anniversary");

    expect(occasion.map((entry) => entry.partCount)).toEqual([2, 2]);
  });

  test("flags an entry for curation when the title came from the fallback or contains a slash", () => {
    const derived = deriveEntries(parseFeed(feedXml));

    expect(derived.find((entry) => entry.youtubeId === "45e5ZCa-7Sg")?.needsCuration).toBe(true);
    expect(derived.find((entry) => entry.youtubeId === "zWoO2YLWi_Q")?.needsCuration).toBe(true);
  });

  test("never rewrites the stray slash inside a title", () => {
    const derived = deriveEntries(parseFeed(feedXml));

    expect(derived.find((entry) => entry.youtubeId === "zWoO2YLWi_Q")?.title).toBe(
      "The Potter's Hands/ Broken Vessels Shall Hold Water Again.",
    );
  });
});

describe("snapshot union", () => {
  const existing: SermonSnapshotLike = {
    generatedAt: "2026-09-01T00:00:00.000Z",
    channelId: "UCRNGCZhVNV2Pj80fs20GNog",
    entries: [
      {
        youtubeId: "GUup6e4Ccp0",
        title: "Hand-curated title that must survive",
        speaker: "Bishop Olayinka Adeyinka",
        publishedAt: "2026-09-17",
        partIndex: 1,
        partCount: 1,
        needsCuration: false,
      },
    ],
  };

  test("keeps every existing entry and adds only unseen video ids", () => {
    const next = buildSnapshot(existing, parseFeed(feedXml), "UCRNGCZhVNV2Pj80fs20GNog", "2026-09-26T00:00:00.000Z");

    expect(next.entries).toHaveLength(7);
    expect(next.entries.find((entry) => entry.youtubeId === "GUup6e4Ccp0")?.title).toBe(
      "Hand-curated title that must survive",
    );
    expect(next.generatedAt).toBe("2026-09-26T00:00:00.000Z");
  });

  test("is idempotent, so re-running changes only generatedAt", () => {
    const first = buildSnapshot(existing, parseFeed(feedXml), "UCRNGCZhVNV2Pj80fs20GNog", "2026-09-26T00:00:00.000Z");
    const second = buildSnapshot(first, parseFeed(feedXml), "UCRNGCZhVNV2Pj80fs20GNog", "2026-09-27T00:00:00.000Z");

    expect(second.entries).toEqual(first.entries);
    expect(second.generatedAt).not.toBe(first.generatedAt);
  });

  test("builds from nothing when no snapshot exists yet", () => {
    const next = buildSnapshot(null, parseFeed(feedXml), "UCRNGCZhVNV2Pj80fs20GNog", "2026-09-26T00:00:00.000Z");

    expect(next.entries).toHaveLength(7);
  });

  test("keeps an entry the feed has rolled off, because the feed only exposes a finite window", () => {
    const rolledOff = {
      generatedAt: "2026-08-01T00:00:00.000Z",
      channelId: "UCRNGCZhVNV2Pj80fs20GNog",
      entries: [
        {
          youtubeId: "oldRolledOff1",
          title: "A sermon the feed no longer lists",
          speaker: "Bishop Olayinka Adeyinka",
          publishedAt: "2026-06-07",
          partIndex: 1,
          partCount: 1,
          needsCuration: false,
        },
      ],
    } satisfies SermonSnapshotLike;
    const raw = parseFeed(feedXml);

    expect(raw.some((entry) => entry.youtubeId === "oldRolledOff1")).toBe(false);

    const next = buildSnapshot(rolledOff, raw, "UCRNGCZhVNV2Pj80fs20GNog", "2026-09-26T00:00:00.000Z");

    expect(next.entries).toHaveLength(8);
    expect(next.entries.find((entry) => entry.youtubeId === "oldRolledOff1")).toEqual(rolledOff.entries[0]);
  });
});

describe("resolveSermons", () => {
  const snapshot: SermonSnapshotLike = {
    generatedAt: "2026-09-26T00:00:00.000Z",
    channelId: "UCRNGCZhVNV2Pj80fs20GNog",
    entries: deriveEntries(parseFeed(feedXml)),
  };

  test("lets a curated entry win over feed data for the same video id", () => {
    const merged = resolveSermons(
      [
        {
          title: "Curated Wisdom",
          date: "2026-09-17",
          speaker: "Bishop Olayinka Adeyinka",
          summary: "Hand written.",
          youtubeId: "GUup6e4Ccp0",
        },
      ],
      snapshot,
    );

    const curated = merged.find((sermon) => sermon.youtubeId === "GUup6e4Ccp0");

    expect(curated?.title).toBe("Curated Wisdom");
    expect(curated?.summary).toBe("Hand written.");
    expect(merged.filter((sermon) => sermon.youtubeId === "GUup6e4Ccp0")).toHaveLength(1);
  });

  test("appends feed entries nobody has curated", () => {
    const merged = resolveSermons(
      [{ title: "Curated Wisdom", date: "2026-09-17", youtubeId: "GUup6e4Ccp0" }],
      snapshot,
    );

    expect(merged).toHaveLength(7);
  });

  test("suffixes a multi-part title and threads partIndex as a sort key", () => {
    const merged = resolveSermons([], snapshot);
    const first = merged.find((sermon) => sermon.youtubeId === "zWoO2YLWi_Q");

    expect(first?.title).toBe("The Potter's Hands/ Broken Vessels Shall Hold Water Again. — Part 1 of 2");
    expect(first?.partIndex).toBe(1);
  });

  test("sorts by date descending so the first entry is the newest message", () => {
    const merged = resolveSermons([], snapshot);

    expect(merged[0].date).toBe("2026-09-20");
    expect(merged.at(-1)?.date).toBe("2026-09-16");
  });

  test("orders parts of one sermon ascending within a shared date", () => {
    const merged = resolveSermons(
      [
        { title: "Curated Wisdom", date: "2026-09-17", youtubeId: "GUup6e4Ccp0" },
        { title: "Later", date: "2026-09-18" },
        { title: "Same day highlight", date: "2026-09-20" },
      ],
      snapshot,
    );
    const onTwentieth = merged.filter((sermon) => sermon.date === "2026-09-20");

    expect(onTwentieth.map((sermon) => sermon.partIndex ?? 0)).toEqual([0, 1, 2]);
  });

  test("returns the curated list untouched when the snapshot is null or empty", () => {
    const curated = [
      { title: "Highlight only", date: "2026-08-17", image: "/static/images/bible-study.jpg" },
    ];

    expect(resolveSermons(curated, null)).toEqual(curated);
    expect(resolveSermons(curated, { generatedAt: "x", channelId: "y", entries: [] })).toEqual(curated);
  });

  test("carries needsCuration through from the snapshot", () => {
    const merged = resolveSermons([], snapshot);

    expect(merged.find((sermon) => sermon.youtubeId === "eboHWsOsGHY")?.needsCuration).toBe(true);
  });
});

describe("sermon formatting", () => {
  test("formats an ISO date for display", () => {
    expect(formatSermonDate("2026-09-21")).toBe("September 21, 2026");
  });

  test("builds a canonical watch url", () => {
    expect(watchUrlFor("2zFODEV22G0")).toBe("https://www.youtube.com/watch?v=2zFODEV22G0");
  });
});

type Recorded = { writes: string[]; logs: string[] };

function syncHarness(feedResponse: Response | Error, snapshotOnDisk: string | null): {
  deps: Parameters<typeof syncSermons>[0];
  recorded: Recorded;
} {
  const recorded: Recorded = { writes: [], logs: [] };

  return {
    recorded,
    deps: {
      fetchImpl: (async () => {
        if (feedResponse instanceof Error) {
          throw feedResponse;
        }
        return feedResponse;
      }) as unknown as typeof fetch,
      now: () => new Date("2026-09-26T00:00:00.000Z"),
      readSnapshot: () => snapshotOnDisk,
      writeSnapshot: (contents) => {
        recorded.writes.push(contents);
      },
      log: (line) => {
        recorded.logs.push(line);
      },
    },
  };
}

const feedResponse = () => new Response(feedXml, { status: 200 });

describe("sermon sync safety", () => {
  test("writes a snapshot on a good fetch", async () => {
    const { deps, recorded } = syncHarness(feedResponse(), null);

    const result = await syncSermons(deps);

    expect(result.ok).toBe(true);
    expect(recorded.writes).toHaveLength(1);
    expect(JSON.parse(recorded.writes[0]).entries).toHaveLength(7);
  });

  test("refuses to write and returns ok:false on a non-200 response", async () => {
    const { deps, recorded } = syncHarness(new Response("<html>not found</html>", { status: 404 }), null);

    const result = await syncSermons(deps);

    expect(result.ok).toBe(false);
    expect(recorded.writes).toHaveLength(0);
  });

  test("refuses to write when the feed contains no entries", async () => {
    const { deps, recorded } = syncHarness(
      new Response('<feed xmlns="http://www.w3.org/2005/Atom"></feed>', { status: 200 }),
      null,
    );

    const result = await syncSermons(deps);

    expect(result.ok).toBe(false);
    expect(recorded.writes).toHaveLength(0);
  });

  test("refuses to write when the network throws", async () => {
    const { deps, recorded } = syncHarness(new Error("network down"), null);

    const result = await syncSermons(deps);

    expect(result.ok).toBe(false);
    expect(recorded.writes).toHaveLength(0);
  });

  test("refuses to write when the feed belongs to a different channel", async () => {
    const wrongChannel = feedXml.replace(/UCRNGCZhVNV2Pj80fs20GNog/g, "UCsomeOtherChannel00000");
    const { deps, recorded } = syncHarness(new Response(wrongChannel, { status: 200 }), null);

    const result = await syncSermons(deps);

    expect(result.ok).toBe(false);
    expect(recorded.writes).toHaveLength(0);
  });

  test("refuses to write when the response is not an atom document", async () => {
    const { deps, recorded } = syncHarness(
      new Response("<!DOCTYPE html><html lang=en><body>not a feed</body></html>", { status: 200 }),
      null,
    );

    const result = await syncSermons(deps);

    expect(result.ok).toBe(false);
    expect(recorded.writes).toHaveLength(0);
  });

  test("refuses to write when the feed entries carry no usable video id", async () => {
    const entriesWithoutVideoId = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<feed xmlns="http://www.w3.org/2005/Atom">',
      `  <title>${site.name}</title>`,
      "  <entry>",
      "    <id>yt:video:unknown0000</id>",
      "    <title>KCCF Ministries Live Stream</title>",
      "    <published>2026-09-20T13:02:55+00:00</published>",
      "  </entry>",
      "</feed>",
    ].join("\n");
    const { deps, recorded } = syncHarness(new Response(entriesWithoutVideoId, { status: 200 }), null);

    const result = await syncSermons(deps);

    expect(result.ok).toBe(false);
    expect(recorded.writes).toHaveLength(0);
  });

  test("refuses to write when the committed snapshot is unparseable, so a corrupt file cannot empty the archive", async () => {
    const { deps, recorded } = syncHarness(feedResponse(), '{ "entries": [ truncated');

    const result = await syncSermons(deps);

    expect(result.ok).toBe(false);
    expect(recorded.writes).toHaveLength(0);
  });

  test("refuses to write when the committed snapshot has no entries array", async () => {
    const notASnapshot = JSON.stringify({
      generatedAt: "2026-09-01T00:00:00.000Z",
      channelId: "UCRNGCZhVNV2Pj80fs20GNog",
    });
    const { deps, recorded } = syncHarness(feedResponse(), notASnapshot);

    const result = await syncSermons(deps);

    expect(result.ok).toBe(false);
    expect(recorded.writes).toHaveLength(0);
  });

  test("seeds a fresh snapshot only when no snapshot file exists at all", async () => {
    const { deps, recorded } = syncHarness(feedResponse(), null);

    const result = await syncSermons(deps);

    expect(result.ok).toBe(true);
    expect(recorded.writes).toHaveLength(1);
  });

  test("keeps existing entries when unioning, so the snapshot can only grow", async () => {
    const existing = JSON.stringify({
      generatedAt: "2026-09-01T00:00:00.000Z",
      channelId: "UCRNGCZhVNV2Pj80fs20GNog",
      entries: [
        {
          youtubeId: "OLDVIDEO00000",
          title: "A sermon older than the feed window",
          speaker: "Bishop Olayinka Adeyinka",
          publishedAt: "2025-01-05",
          partIndex: 1,
          partCount: 1,
          needsCuration: false,
        },
      ],
    });
    const { deps, recorded } = syncHarness(feedResponse(), existing);

    await syncSermons(deps);
    const written = JSON.parse(recorded.writes[0]);

    expect(written.entries).toHaveLength(8);
    expect(written.entries.some((entry: { youtubeId: string }) => entry.youtubeId === "OLDVIDEO00000")).toBe(true);
  });

  test("reports counts and names new entries so added 0 is distinguishable from broken", async () => {
    const { deps, recorded } = syncHarness(feedResponse(), null);

    await syncSermons(deps);
    const report = recorded.logs.join("\n");

    expect(report).toContain("fetched");
    expect(report).toContain("newly added");
    expect(report).toContain("2zFODEV22G0");
    expect(report).toContain("needs curation");
  });

  test("warns when a curated snapshot entry is absent from the feed", async () => {
    const existing = JSON.stringify({
      generatedAt: "2026-09-01T00:00:00.000Z",
      channelId: "UCRNGCZhVNV2Pj80fs20GNog",
      entries: [
        {
          youtubeId: "GONEVIDEO00000",
          title: "Unlisted recording",
          speaker: null,
          publishedAt: "2025-01-05",
          partIndex: 1,
          partCount: 1,
          needsCuration: false,
        },
      ],
    });
    const { deps, recorded } = syncHarness(feedResponse(), existing);

    await syncSermons(deps);

    expect(recorded.logs.join("\n")).toContain("GONEVIDEO00000");
  });
});

describe("committed sermon snapshot", () => {
  test("is non-empty and every entry carries a video id", async () => {
    const snapshot = JSON.parse(
      await readFile(new URL("../src/content/sermons.generated.json", import.meta.url), "utf8"),
    ) as SermonSnapshotLike;

    expect(snapshot.entries.length).toBeGreaterThan(0);
    expect(snapshot.channelId).toBe("UCRNGCZhVNV2Pj80fs20GNog");

    for (const entry of snapshot.entries) {
      expect(entry.youtubeId).toMatch(/^[A-Za-z0-9_-]{6,}$/);
      expect(entry.title.length).toBeGreaterThan(0);
    }
  });

  test("has no duplicate video ids", async () => {
    const snapshot = JSON.parse(
      await readFile(new URL("../src/content/sermons.generated.json", import.meta.url), "utf8"),
    ) as SermonSnapshotLike;
    const ids = snapshot.entries.map((entry) => entry.youtubeId);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
