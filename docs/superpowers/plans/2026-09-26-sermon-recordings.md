# Sermon Recordings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a playable featured sermon player and a text-first browsable archive to `/sermons`, sourced from the church's YouTube channel via a committed feed snapshot, with Facebook-only sermons as link-outs.

**Architecture:** A curated, hand-maintained `src/content/sermons.ts` is the archive of record. A manual, network-touching `bun run sermons:sync` script unions the YouTube channel feed into a committed `src/content/sermons.generated.json`. `src/content/sermon-feed.ts` holds all pure logic — feed parsing, title/speaker derivation, part grouping, and the merge — so both the script and the test suite share it. The page renders a click-to-load `youtube-nocookie.com` facade, so no third-party JavaScript loads on page load and exactly one CSP directive is added.

**Tech Stack:** Bun 1.3.14, Hono 4.11 (`hono/jsx`), TypeScript 7 (via `bunx tsc --noEmit`), Tailwind CSS v4 (`@tailwindcss/cli`), vendored Datastar v1.0.0-RC.7 (`static/datastar.js`), `bun:test`.

**Spec:** `docs/superpowers/specs/2026-09-26-sermon-recordings-design.md` — read it before starting. This plan implements it; where the plan and the spec disagree, the spec wins and the plan must be corrected.

---

## Global Constraints

Every task below is bound by these. They are copied from the spec and `CLAUDE.md`; do not relax any of them.

- **Package manager is Bun only.** `bun.lock` is the only lockfile. Never add `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`.
- **Verification command is `bun run check`**, which runs `type-check → css:build → test → build` in that order. CSS must be regenerated before the stylesheet tests run, because they assert against the shipped `static/style.css`.
- **`static/style.css` is generated. Never hand-edit it.** Add rules to `src/input.css`, then run `bun run css:build`.
- **The build must stay hermetic.** No task may introduce a network fetch into `build`, `css:build`, `test`, or `type-check`. The feed is fetched only by `bun run sermons:sync`.
- **CSP change budget: exactly one directive.** Add `frameSrc: ["'self'", "https://www.youtube-nocookie.com"]` to `src/index.ts`. Do not touch `scriptSrc`, `scriptSrcAttr`, `styleSrc`, `fontSrc`, `imgSrc`, `connectSrc`, `formAction`, `frameAncestors`, `objectSrc`, or `defaultSrc`.
- **`imgSrc` stays `'self' data:`.** No remote images, ever. The archive is text-first for this reason.
- **No inline scripts and no inline event handlers.** `script-src-attr` stays `'none'`. All interactivity is Datastar attributes.
- **Datastar signals are namespaced** under an object, per the existing `$contact.*` convention. The player uses `$sermon.videoId`. It must not collide with `$menuOpen` or `$marqueePaused`.
- **Only `https://www.youtube-nocookie.com` may be embedded.** Never `www.youtube.com`.
- **The feed source is fixed:** `https://www.youtube.com/feeds/videos.xml?channel_id=UCRNGCZhVNV2Pj80fs20GNog`. YouTube `playlist_id` feeds return HTTP 404 and must never be used or added as a dependency.
- **The sync script must never delete a snapshot entry.** It is a union write. It must exit non-zero without writing when the fetch is bad.
- **`static/datastar.js` must not gain a `//# sourceMappingURL=` comment and no `datastar.js.map` may be added.**
- **No new npm dependencies.** The feed parser is hand-rolled; the project has only `hono` as a runtime dependency.
- **Test convention:** `tests/routes.test.ts` already exports a `parsePolicy(policy: string)` helper (line 20) for CSP assertions. Reuse it. Do not create a new `app.test.ts` for CSP work.
- **Images:** declared dimensions in `imageAssetMap` must match the real JPEG headers, enforced by `tests/assets.test.ts`. Do not add new images in this plan.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/content/types.ts` (modify) | `Sermon` gains ISO `date` and optional video/summary fields. New `YoutubeChannel` type. |
| `src/content/site.ts` (modify) | Adds `youtube: YoutubeChannel` — single source for the sync script and the page. |
| `src/content/sermons.ts` (modify) | Curated archive of record. Dates become ISO 8601. |
| `src/content/sermon-feed.ts` (create) | **All pure logic.** Atom parsing, XML entity decoding, title/speaker derivation, part grouping, `needsCuration`, `resolveSermons()`, `formatSermonDate()`, `buildSnapshot()`. No I/O. |
| `src/content/sermons.generated.json` (create) | Committed feed snapshot. Seeded for real in Task 3. |
| `scripts/sync-sermons.ts` (create) | Thin I/O shell: fetch → validate → call `buildSnapshot()` → union-write → report. Exports `syncSermons(deps)` for tests. |
| `scripts/sync-sermons.help.md` (create) | `--help` text, per spec §15: removing a sermon requires editing the snapshot too. |
| `src/components/ui/icon.tsx` (modify) | Adds a `play` icon. |
| `src/components/ui/sermon-player.tsx` (create) | Featured player: facade, iframe, `$sermon` signal, metadata. |
| `src/components/ui/sermon-archive.tsx` (create) | Text-first archive: year headings, rows, per-source actions. |
| `src/components/pages/sermons-page.tsx` (modify) | Composes player → highlights → archive. |
| `src/index.ts` (modify) | The single `frameSrc` line. |
| `src/input.css` (modify) | All new rules. |
| `static/style.css` (generated) | Never hand-edited. |
| `tests/fixtures/sermons-feed.xml` (create) | Realistic Atom fixture covering every derivation edge case. |
| `tests/content.test.ts` (modify) | Type invariants, derivation, merge, snapshot guard. |
| `tests/routes.test.ts` (modify) | CSP `frame-src` assertions. |
| `tests/pages.test.ts` (modify) | Player, facade, archive markup, no-JS fallbacks. |
| `tests/stylesheet.test.ts` (modify) | New CSS contracts in both CSS files. |
| `tests/browser.test.ts` (modify) | Real-Chrome facade click and player swap. |
| `CLAUDE.md`, `README.md` (modify) | Architecture and sync discipline. |

---

## Task 1: `Sermon` type, YouTube config, and ISO dates

**Files:**
- Modify: `src/content/types.ts:41-47`
- Modify: `src/content/site.ts`
- Modify: `src/content/sermons.ts`
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: nothing. This is the first task.
- Produces:
  - `Sermon` type with `title: string`, `date: string` (ISO), and optional `speaker`, `summary`, `image`, `duration`, `series`, `partIndex`, `youtubeId`, `facebookUrl`, `needsCuration`
  - `YoutubeChannel` type: `{ channelId: string; channelUrl: string; playlistId: string }`
  - `site.youtube: YoutubeChannel`

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe("site content", ...)` block in `tests/content.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test tests/content.test.ts`

Expected: FAIL. `site.youtube` is `undefined`, and `sermons[0].date` is `"September 21, 2026"`, which fails the ISO regex.

- [ ] **Step 3: Replace the `Sermon` type**

In `src/content/types.ts`, replace the existing `Sermon` type (lines 41–47) with:

```ts
export type Sermon = {
  title: string;
  /** ISO 8601 calendar date, e.g. "2026-09-21". Sortable; formatted at render. */
  date: string;
  speaker?: string;
  summary?: string;
  /** Local asset src from imageAssetMap. Curated highlights only. */
  image?: string;
  /** Human duration, e.g. "42:10". Curated only. */
  duration?: string;
  /** Reserved for future series grouping. Unused in v1. */
  series?: string;
  /** 1-based position within a multi-part sermon. Never rendered directly. */
  partIndex?: number;
  /** Mutually exclusive with facebookUrl. */
  youtubeId?: string;
  /** Mutually exclusive with youtubeId. */
  facebookUrl?: string;
  /**
   * True on feed-derived entries whose title or speaker was uncertain, so the
   * archive can flag them. Curated entries never set this.
   */
  needsCuration?: boolean;
};

export type YoutubeChannel = {
  channelId: string;
  channelUrl: string;
  /** Intentionally empty: YouTube playlist feeds return HTTP 404. See CLAUDE.md. */
  playlistId: string;
};
```

- [ ] **Step 4: Add the YouTube config to `site.ts`**

In `src/content/site.ts`, change line 1 to include the new type:

```ts
import type { ContactInfo, ImageAsset, NavItem, ServiceTime, SocialLink, YoutubeChannel } from "./types";
```

Add this constant immediately after the `contact` / `social` block (after line 15):

```ts
const youtube: YoutubeChannel = {
  channelId: "UCRNGCZhVNV2Pj80fs20GNog",
  channelUrl: "https://www.youtube.com/@kccfministries1579",
  playlistId: "",
};
```

Then add `youtube,` to the exported `site` object, directly after `social,` (line 135):

```ts
  social,
  youtube,
  services,
```

- [ ] **Step 5: Convert the curated sermon dates to ISO 8601**

In `src/content/sermons.ts`, replace the `date` value on each of the six entries. Do not change any other field, and do not add `youtubeId` or `facebookUrl` — these six entries intentionally remain highlight-only until real URLs are supplied (spec §16).

| Existing | Replacement |
|---|---|
| `"September 21, 2026"` | `"2026-09-21"` |
| `"September 14, 2026"` | `"2026-09-14"` |
| `"September 7, 2026"` | `"2026-09-07"` |
| `"August 31, 2026"` | `"2026-08-31"` |
| `"August 24, 2026"` | `"2026-08-24"` |
| `"August 17, 2026"` | `"2026-08-17"` |

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bun test tests/content.test.ts`

Expected: PASS. Note that `tests/content.test.ts:70` (`expect(sermons).toHaveLength(6)`) still passes because the entry count is unchanged.

- [ ] **Step 7: Run type-check**

Run: `bun run type-check`

Expected: clean. If `sermons-page.tsx` errors because it read the old `date` display string, that is expected to still compile — it only passes `sermon.date` into a template literal — and will be corrected in Task 7.

- [ ] **Step 8: Commit**

```bash
git add src/content/types.ts src/content/site.ts src/content/sermons.ts tests/content.test.ts
git commit -m "feat: add ISO sermon dates and YouTube channel config"
```

---

## Task 2: Pure feed module — parsing, derivation, and merge

**Files:**
- Create: `src/content/sermon-feed.ts`
- Create: `tests/fixtures/sermons-feed.xml`
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: `Sermon` and `YoutubeChannel` from `src/content/types.ts` (Task 1).
- Produces — every name below is imported by later tasks:
  - `type RawFeedEntry = { youtubeId: string; title: string; published: string; description: string }`
  - `type SnapshotEntry = { youtubeId: string; title: string; speaker: string | null; publishedAt: string; partIndex: number; partCount: number; needsCuration: boolean }`
  - `type SermonSnapshot = { generatedAt: string; channelId: string; entries: SnapshotEntry[] }`
  - `class FeedError extends Error`
  - `parseFeed(xml: string): RawFeedEntry[]` — throws `FeedError` if the document is not an Atom feed or contains no `<entry>`
  - `deriveEntries(raw: RawFeedEntry[]): SnapshotEntry[]`
  - `buildSnapshot(existing: SermonSnapshot | null, raw: RawFeedEntry[], channelId: string, generatedAt: string): SermonSnapshot`
  - `resolveSermons(curated: Sermon[], snapshot: SermonSnapshot | null): Sermon[]`
  - `formatSermonDate(iso: string): string`
  - `watchUrlFor(youtubeId: string): string` — returns `https://www.youtube.com/watch?v={id}`

This module performs **no I/O whatsoever**. It must be importable from a test with no network and no filesystem.

- [ ] **Step 1: Create the Atom fixture**

Create `tests/fixtures/sermons-feed.xml` with this content. It reproduces every derivation edge case verified from the live channel, so the fixture is realistic rather than convenient:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"
      xmlns:media="http://search.yahoo.com/mrss/"
      xmlns="http://www.w3.org/2005/Atom">
  <link rel="self" href="http://www.youtube.com/feeds/videos.xml?channel_id=UCRNGCZhVNV2Pj80fs20GNog"/>
  <id>yt:channel:UCRNGCZhVNV2Pj80fs20GNog</id>
  <yt:channelId>UCRNGCZhVNV2Pj80fs20GNog</yt:channelId>
  <title>KCCF Ministries</title>
  <entry>
    <id>yt:video:2zFODEV22G0</id>
    <yt:videoId>2zFODEV22G0</yt:videoId>
    <yt:channelId>UCRNGCZhVNV2Pj80fs20GNog</yt:channelId>
    <title>KCCF Ministries Live Stream</title>
    <published>2026-09-20T13:02:55+00:00</published>
    <media:description>18th Annual Anniversary
Theme: Harvest Of Abundance</media:description>
  </entry>
  <entry>
    <id>yt:video:P2GUPgTsIuA</id>
    <yt:videoId>P2GUPgTsIuA</yt:videoId>
    <yt:channelId>UCRNGCZhVNV2Pj80fs20GNog</yt:channelId>
    <title>KCCF Ministries Live Stream</title>
    <published>2026-09-20T12:52:38+00:00</published>
    <media:description>18th Annual Anniversary
Theme: Harvest Of Abundance</media:description>
  </entry>
  <entry>
    <id>yt:video:eboHWsOsGHY</id>
    <yt:videoId>eboHWsOsGHY</yt:videoId>
    <yt:channelId>UCRNGCZhVNV2Pj80fs20GNog</yt:channelId>
    <title>KCCF Ministries Live Stream</title>
    <published>2026-09-19T10:49:31+00:00</published>
    <media:description>Praise Night
I Shall Never Lack Again</media:description>
  </entry>
  <entry>
    <id>yt:video:GUup6e4Ccp0</id>
    <yt:videoId>GUup6e4Ccp0</yt:videoId>
    <yt:channelId>UCRNGCZhVNV2Pj80fs20GNog</yt:channelId>
    <title>KCCF Ministries Live Stream</title>
    <published>2026-09-17T09:00:00+00:00</published>
    <media:description>Wisdom To Receive And Retain Increase
Bishop Olayinka Adeyinka | Pastor</media:description>
  </entry>
  <entry>
    <id>yt:video:zWoO2YLWi_Q</id>
    <yt:videoId>zWoO2YLWi_Q</yt:videoId>
    <yt:channelId>UCRNGCZhVNV2Pj80fs20GNog</yt:channelId>
    <title>KCCF Ministries Live Stream</title>
    <published>2026-09-16T08:00:00+00:00</published>
    <media:description>The Potter&#39;s Hands/ Broken Vessels Shall Hold Water Again.
Bishop Olayinka Adeyinka</media:description>
  </entry>
  <entry>
    <id>yt:video:3Cd8mf-Vvmk</id>
    <yt:videoId>3Cd8mf-Vvmk</yt:videoId>
    <yt:channelId>UCRNGCZhVNV2Pj80fs20GNog</yt:channelId>
    <title>KCCF Ministries Live Stream</title>
    <published>2026-09-17T08:00:00+00:00</published>
    <media:description>The Potter&#39;s Hands/ Broken Vessels Shall Hold Water Again.
Bishop Olayinka Adeyinka</media:description>
  </entry>
  <entry>
    <id>yt:video:45e5ZCa-7Sg</id>
    <yt:videoId>45e5ZCa-7Sg</yt:videoId>
    <yt:channelId>UCRNGCZhVNV2Pj80fs20GNog</yt:channelId>
    <title>The Breathe Of Life By Pastor Abimbola</title>
    <published>2026-09-16T07:00:00+00:00</published>
    <media:description></media:description>
  </entry>
</feed>
```

Note what the fixture encodes: two entries sharing an occasion description (a part group), a speaker line that must be accepted (`Bishop Olayinka Adeyinka | Pastor` — three words plus a role fragment, handled below), a description line that must be rejected as a speaker (`Theme: Harvest Of Abundance`, rejected for containing a colon), a description that is not a speaker (`I Shall Never Lack Again`, five words and no title word), a stray `&#39;` entity, a stray `/` inside a title, and one entry with an empty description that must fall back to `<title>`.

- [ ] **Step 2: Write the failing tests**

Add a new top-level `describe` block at the end of `tests/content.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import {
  FeedError,
  buildSnapshot,
  deriveEntries,
  formatSermonDate,
  parseFeed,
  resolveSermons,
  watchUrlFor,
} from "../src/content/sermon-feed";
import type { RawFeedEntry } from "../src/content/sermon-feed";

const feedXml = await readFile(new URL("./fixtures/sermons-feed.xml", import.meta.url), "utf8");

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
        { title: "Later", date: "2026-09-18", youtubeId: "P2GUPgTsIuA" },
      ],
      snapshot,
    );
    const onSeventeenth = merged.filter((sermon) => sermon.date === "2026-09-17");

    expect(onSeventeenth.map((sermon) => sermon.partIndex ?? 0)).toEqual([0, 1, 2]);
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
```

Also add this type alias near the top of `tests/content.test.ts`, after the existing imports:

```ts
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
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `bun test tests/content.test.ts`

Expected: FAIL with a module-not-found error for `../src/content/sermon-feed`.

- [ ] **Step 4: Create the feed module**

Create `src/content/sermon-feed.ts` with this complete content:

```ts
import type { Sermon } from "./types";

export type RawFeedEntry = {
  youtubeId: string;
  title: string;
  published: string;
  description: string;
};

export type SnapshotEntry = {
  youtubeId: string;
  title: string;
  speaker: string | null;
  publishedAt: string;
  partIndex: number;
  partCount: number;
  needsCuration: boolean;
};

export type SermonSnapshot = {
  generatedAt: string;
  channelId: string;
  entries: SnapshotEntry[];
};

export class FeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedError";
  }
}

const PERSON_TITLES = ["bishop", "pastor", "bro", "minister", "dr", "apostle", "rev"];

function decodeXml(value: string): string {
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  const text = cdata ? cdata[1] : value;

  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function tagText(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));

  return match ? decodeXml(match[1]).trim() : "";
}

export function parseFeed(xml: string): RawFeedEntry[] {
  if (!/<feed[\s>]/.test(xml)) {
    throw new FeedError("response is not an atom feed");
  }

  const blocks = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

  if (blocks.length === 0) {
    throw new FeedError("feed contains no entries");
  }

  return blocks
    .map((block) => ({
      youtubeId: tagText(block, "yt:videoId"),
      title: tagText(block, "title"),
      published: tagText(block, "published"),
      description: tagText(block, "media:description"),
    }))
    .filter((entry) => entry.youtubeId.length > 0);
}

function looksLikeSpeaker(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed || trimmed.includes(":")) {
    return false;
  }

  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length < 2 || words.length > 5) {
    return false;
  }

  return PERSON_TITLES.some((title) => new RegExp(`\\b${title}\\.?\\b`, "i").test(trimmed));
}

function normaliseGroupKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function publishedDate(published: string): string {
  return published.slice(0, 10);
}

function titleFromDescription(description: string, fallbackTitle: string) {
  const lines = description.split("\n").map((line) => line.trim()).filter(Boolean);
  const [first = "", ...rest] = lines;

  if (!first) {
    return { title: fallbackTitle, fromFallback: true, speaker: null as string | null };
  }

  const speakerLine = rest.find((line) => looksLikeSpeaker(line));

  return { title: first, fromFallback: false, speaker: speakerLine ?? null };
}

export function deriveEntries(raw: RawFeedEntry[]): SnapshotEntry[] {
  const titled = raw.map((entry) => {
    const derived = titleFromDescription(entry.description, entry.title);

    return {
      youtubeId: entry.youtubeId,
      title: derived.title,
      speaker: derived.speaker,
      fromFallback: derived.fromFallback,
      publishedAt: publishedDate(entry.published),
    };
  });

  const groups = new Map<string, typeof titled>();

  for (const entry of titled) {
    const key = normaliseGroupKey(entry.title);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  return titled
    .map((entry) => {
      const group = groups.get(normaliseGroupKey(entry.title)) ?? [entry];
      const ordered = [...group].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
      const partCount = group.length;
      const partIndex = ordered.findIndex((candidate) => candidate.youtubeId === entry.youtubeId) + 1;
      const needsCuration =
        entry.fromFallback || /[/|]/.test(entry.title) || entry.speaker === null || partCount > 1;

      return {
        youtubeId: entry.youtubeId,
        title: entry.title,
        speaker: entry.speaker,
        publishedAt: entry.publishedAt,
        partIndex,
        partCount,
        needsCuration,
      };
    })
    .sort((a, b) => a.youtubeId.localeCompare(b.youtubeId));
}

export function buildSnapshot(
  existing: SermonSnapshot | null,
  raw: RawFeedEntry[],
  channelId: string,
  generatedAt: string,
): SermonSnapshot {
  const derived = deriveEntries(raw);
  const byId = new Map<string, SnapshotEntry>();

  for (const entry of existing?.entries ?? []) {
    byId.set(entry.youtubeId, entry);
  }

  for (const entry of derived) {
    if (!byId.has(entry.youtubeId)) {
      byId.set(entry.youtubeId, entry);
    }
  }

  return {
    generatedAt,
    channelId,
    entries: [...byId.values()].sort((a, b) => a.youtubeId.localeCompare(b.youtubeId)),
  };
}

export function resolveSermons(curated: Sermon[], snapshot: SermonSnapshot | null): Sermon[] {
  const merged: Sermon[] = curated.map((sermon) => ({ ...sermon }));
  const curatedIds = new Set(curated.map((sermon) => sermon.youtubeId).filter(Boolean));

  for (const entry of snapshot?.entries ?? []) {
    if (curatedIds.has(entry.youtubeId)) {
      continue;
    }

    const title = entry.partCount > 1 ? `${entry.title} — Part ${entry.partIndex} of ${entry.partCount}` : entry.title;

    merged.push({
      title,
      date: entry.publishedAt,
      speaker: entry.speaker ?? undefined,
      youtubeId: entry.youtubeId,
      partIndex: entry.partIndex,
      needsCuration: entry.needsCuration,
    });
  }

  return merged.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }

    const partDelta = (a.partIndex ?? 0) - (b.partIndex ?? 0);

    return partDelta !== 0 ? partDelta : a.title.localeCompare(b.title);
  });
}

const displayDate = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

export function formatSermonDate(iso: string): string {
  return displayDate.format(new Date(`${iso}T00:00:00Z`));
}

export function watchUrlFor(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun test tests/content.test.ts`

Expected: PASS. If `rejects a multi-word line with no title word as a speaker` fails, `I Shall Never Lack Again` is five words and the guard is `< 2 || > 5`; confirm the word count. If `orders parts of one sermon ascending within a shared date` fails on the `GUup6e4Ccp0` curated entry having no `partIndex`, confirm the test expects `0` for entries without one.

- [ ] **Step 6: Run type-check**

Run: `bun run type-check`

Expected: clean. `RawFeedEntry` is imported but only used in the test's type position; if the import is flagged as unused, remove it from the test's import list.

- [ ] **Step 7: Commit**

```bash
git add src/content/sermon-feed.ts tests/fixtures/sermons-feed.xml tests/content.test.ts
git commit -m "feat: add pure sermon feed parsing, derivation, and merge"
```

---

## Task 3: Sync script and the real committed snapshot

**Files:**
- Create: `scripts/sync-sermons.ts`
- Create: `scripts/sync-sermons.help.md`
- Create: `src/content/sermons.generated.json` (produced by running the script)
- Modify: `package.json` (add the `sermons:sync` script)
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: `parseFeed`, `buildSnapshot`, `FeedError`, `SermonSnapshot` from `src/content/sermon-feed.ts` (Task 2); `site.youtube` from `src/content/site.ts` (Task 1).
- Produces:
  - `syncSermons(deps: SyncDeps): Promise<SyncResult>`
  - `type SyncDeps = { fetchImpl: typeof fetch; now: () => Date; readSnapshot: () => string | null; writeSnapshot: (contents: string) => void; log: (line: string) => void }`
  - `type SyncResult = { ok: true; added: number; total: number; report: string } | { ok: false; reason: string }`
  - Committed `src/content/sermons.generated.json`

- [ ] **Step 1: Write the failing tests**

Append to `tests/content.test.ts`:

```ts
import { syncSermons } from "../scripts/sync-sermons";

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
      }) as typeof fetch,
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test tests/content.test.ts`

Expected: FAIL with a module-not-found error for `../scripts/sync-sermons`.

- [ ] **Step 3: Create the sync script**

Create `scripts/sync-sermons.ts`:

```ts
import { readFile, writeFile } from "node:fs/promises";
import { buildSnapshot, parseFeed, type SermonSnapshot } from "../src/content/sermon-feed";
import { site } from "../src/content/site";

const snapshotPath = new URL("../src/content/sermons.generated.json", import.meta.url);
const helpPath = new URL("./sync-sermons.help.md", import.meta.url);

export type SyncDeps = {
  fetchImpl: typeof fetch;
  now: () => Date;
  readSnapshot: () => string | null;
  writeSnapshot: (contents: string) => void;
  log: (line: string) => void;
};

export type SyncResult =
  | { ok: true; added: number; total: number; report: string }
  | { ok: false; reason: string };

function parseExisting(raw: string | null): SermonSnapshot | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SermonSnapshot;

    return Array.isArray(parsed.entries) ? parsed : null;
  } catch {
    return null;
  }
}

export async function syncSermons(deps: SyncDeps): Promise<SyncResult> {
  const { channelId, channelUrl } = site.youtube;
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const lines: string[] = [];
  const log = (line: string) => {
    lines.push(line);
    deps.log(line);
  };

  let xml: string;

  try {
    const response = await deps.fetchImpl(feedUrl, { headers: { accept: "application/atom+xml" } });

    if (!response.ok) {
      return { ok: false, reason: `feed responded ${response.status}` };
    }

    xml = await response.text();
  } catch (error) {
    return { ok: false, reason: `feed request failed: ${(error as Error).message}` };
  }

  let raw;

  try {
    raw = parseFeed(xml);
  } catch (error) {
    return { ok: false, reason: (error as Error).message };
  }

  if (!xml.includes(channelId)) {
    return { ok: false, reason: `feed does not mention channel ${channelId}` };
  }

  const existing = parseExisting(deps.readSnapshot());
  const existingIds = new Set((existing?.entries ?? []).map((entry) => entry.youtubeId));
  const incomingIds = new Set(raw.map((entry) => entry.youtubeId));
  const next = buildSnapshot(existing, raw, channelId, deps.now().toISOString());
  const added = next.entries.filter((entry) => !existingIds.has(entry.youtubeId));
  const flagged = next.entries.filter((entry) => entry.needsCuration);
  const missing = (existing?.entries ?? []).filter((entry) => !incomingIds.has(entry.youtubeId));

  deps.writeSnapshot(`${JSON.stringify(next, null, 2)}\n`);

  log(`sermons:sync  ${channelId} (${site.name})`);
  log(`  feed          ${feedUrl}`);
  log(`  channel       ${channelUrl}`);
  log(`  fetched       ${raw.length} entries`);
  log(`  already known ${existingIds.size} entries`);
  log(`  newly added   ${added.length}`);

  for (const entry of added) {
    const notes = [entry.partCount > 1 ? `part ${entry.partIndex} of ${entry.partCount}` : null]
      .concat(entry.needsCuration ? ["needs curation"] : [])
      .filter(Boolean)
      .join(", ");

    log(`    + ${entry.title.slice(0, 56).padEnd(56)} ${entry.youtubeId}  ${entry.publishedAt}${notes ? `  [${notes}]` : ""}`);
  }

  log(`  snapshot      ${next.entries.length} entries`);

  if (flagged.length > 0) {
    log(`  needs curation ${flagged.length} entries — add titles and speakers in src/content/sermons.ts`);
  }

  if (missing.length > 0) {
    log(`  not in feed   ${missing.length} known entries are absent (video unlisted or removed):`);

    for (const entry of missing) {
      log(`    ! ${entry.title} (${entry.youtubeId}, last seen ${entry.publishedAt})`);
    }
  }

  return { ok: true, added: added.length, total: next.entries.length, report: lines.join("\n") };
}

async function readSnapshotFromDisk(): Promise<string | null> {
  try {
    return await readFile(snapshotPath, "utf8");
  } catch {
    return null;
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(await readFile(helpPath, "utf8"));
    return;
  }

  let pending: string | null = null;
  const result = await syncSermons({
    fetchImpl: fetch,
    now: () => new Date(),
    readSnapshot: readSnapshotFromDisk,
    writeSnapshot: (contents) => {
      pending = contents;
    },
    log: (line) => console.log(line),
  });

  if (!result.ok) {
    console.error(`sermons:sync refused to write — ${result.reason}`);
    console.error("The committed snapshot is untouched.");
    process.exit(1);
  }

  if (pending !== null) {
    await writeFile(snapshotPath, pending, "utf8");
  }
}

if (import.meta.main) {
  await main();
}
```

`writeSnapshot` is synchronous by contract so tests can observe writes directly; `main` buffers into `pending` and awaits the real write before exiting. Do not call `process.exit` before that `await` completes.

- [ ] **Step 4: Create the help text**

Create `scripts/sync-sermons.help.md`:

```markdown
# sermons:sync

Fetches the KCCF Ministries YouTube channel feed and unions it into
`src/content/sermons.generated.json`.

Run it manually, then commit the changed snapshot:

    bun run sermons:sync

## What it guarantees

- The snapshot can only grow. The script unions the feed into whatever is already
  committed and contains no code path that removes an entry.
- A bad fetch writes nothing and exits non-zero. A wrong playlist id, a private
  playlist, an empty response, a non-200, or a feed for a different channel all
  leave the committed snapshot exactly as it was.
- The feed only exposes roughly the last fifteen uploads, which for this channel
  is about five days. It is a tripwire for "did we miss a service", not an
  archive.

## Curating a sermon

Titles, speakers, summaries, artwork, and durations come from
`src/content/sermons.ts`. A curated entry always wins over feed data for the
same YouTube video id, so adding a hand-written summary is enough to correct a
generated row permanently.

## Removing a sermon

Because the sync only ever adds, removing a sermon means editing **both**
`src/content/sermons.ts` and `src/content/sermons.generated.json`. Editing only
the curated file lets the next sync restore it from the snapshot.

## Reading the report

`newly added 0` on its own is not a fault. `needs curation` and `not in feed`
are the lines worth acting on: the first tells you which generated rows still
need real titles, the second tells you a known video has gone missing.
```

- [ ] **Step 5: Add the package script**

In `package.json`, add this entry to `scripts`, directly after `"css:watch"`:

```json
    "sermons:sync": "bun run scripts/sync-sermons.ts",
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bun test tests/content.test.ts`

Expected: PASS.

- [ ] **Step 7: Seed the real snapshot**

Run: `bun run sermons:sync`

Expected: a report listing roughly 15 fetched entries, 15 newly added (none of the six curated entries has a `youtubeId`, so none can match), and a `needs curation` count. Then verify the file was written:

Run: `bun -e 'const s=require("./src/content/sermons.generated.json"); console.log(s.entries.length, s.channelId)'`

Expected: `15 UCRNGCZhVNV2Pj80fs20GNog`.

If the network is unavailable, do not hand-write the snapshot. Stop, report the
blocker, and leave Task 3 uncommitted — a fabricated snapshot would make every
downstream test assertion a lie.

- [ ] **Step 8: Add the snapshot guard test**

Append to `tests/content.test.ts`:

```ts
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
```

- [ ] **Step 9: Run the full test suite and type-check**

Run: `bun run type-check && bun test`

Expected: all green.

- [ ] **Step 10: Commit**

```bash
git add scripts/sync-sermons.ts scripts/sync-sermons.help.md src/content/sermons.generated.json package.json tests/content.test.ts
git commit -m "feat: add union-only YouTube feed sync and seed the snapshot"
```

---

## Task 4: The single CSP `frame-src` directive

**Files:**
- Modify: `src/index.ts:12-24`
- Test: `tests/routes.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `frame-src 'self' https://www.youtube-nocookie.com` on every response.

The CSP assertions live in `tests/routes.test.ts`, which already owns them and
exports `parsePolicy` (line 20). The spec named a new `app.test.ts`; this plan
corrects that to follow the existing convention and avoid a duplicate helper.

- [ ] **Step 1: Write the failing test**

In `tests/routes.test.ts`, add `expect(directives["frame-src"]).toEqual(["'self'", "https://www.youtube-nocookie.com"]);` to the existing `"ships a content security policy that keeps Datastar and the local stylesheet working"` test, immediately after the `expect(directives["default-src"])` line.

Then add a new test after the existing `"confines the Datastar evaluator to script-src and nothing else"` test:

```ts
  test("permits the no-cookie YouTube embed in frame-src and nowhere else", async () => {
    const response = await createApp().request("/sermons");
    const policy = response.headers.get("content-security-policy") ?? "";
    const directives = parsePolicy(policy);
    const host = "https://www.youtube-nocookie.com";

    expect(directives["frame-src"]).toEqual(["'self'", host]);

    for (const [name, values] of Object.entries(directives)) {
      if (name === "frame-src") {
        continue;
      }

      expect(values).not.toContain(host);
    }

    expect(policy).not.toContain("https://www.youtube.com");
    expect(policy).not.toContain("https://connect.facebook.net");
    expect(directives["img-src"]).toEqual(["'self'", "data:"]);
    expect(directives["connect-src"]).toEqual(["'self'"]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/routes.test.ts`

Expected: FAIL. `directives["frame-src"]` is `undefined`.

- [ ] **Step 3: Add the directive**

In `src/index.ts`, add one line inside the `contentSecurityPolicy` object, directly after `defaultSrc`:

```ts
        defaultSrc: ["'self'"],
        frameSrc: ["'self'", "https://www.youtube-nocookie.com"],
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test tests/routes.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts tests/routes.test.ts
git commit -m "feat: allow the no-cookie YouTube embed in frame-src"
```

---

## Task 5: Featured sermon player

**Files:**
- Modify: `src/components/ui/icon.tsx`
- Create: `src/components/ui/sermon-player.tsx`
- Modify: `src/input.css`
- Test: `tests/pages.test.ts`

**Interfaces:**
- Consumes: `Sermon` (Task 1), `formatSermonDate` and `watchUrlFor` (Task 2), `getImageSource` (existing), `ButtonLink` and `Icon` (existing).
- Produces: `SermonPlayer({ sermon, className }: { sermon: Sermon; className?: string })` and the DOM contract below, which Task 7, Task 8, and Task 9 assert against:
  - root element `id="sermon-player"`, class `sermon-player`, `tabindex="-1"`
  - `data-signals='{"sermon":{"videoId":""}}'` on the root
  - `.sermon-player-frame` wrapping both states
  - `.sermon-facade` with `data-show="$sermon.videoId === ''"`
  - `.sermon-facade-play` button with `aria-label="Play {title}"` and `data-on:click="$sermon.videoId = '{youtubeId}'"`
  - `iframe.sermon-player-embed` with `data-show="$sermon.videoId !== ''"`, `data-attr:src` building the `youtube-nocookie.com` embed URL, `loading="lazy"`, `allowfullscreen`, and `title={sermon.title}`
  - `.sermon-player-meta` containing the title, speaker, formatted date, optional duration, and optional summary
  - a `.button` link to `watchUrlFor(youtubeId)` for the no-JavaScript path

- [ ] **Step 1: Write the failing tests**

Add to the `describe("sermons page", ...)` block in `tests/pages.test.ts`:

```ts
  test("renders a no-cookie YouTube facade that loads nothing until play is pressed", async () => {
    const { html } = await getPage("/sermons");

    expect(html).toContain('id="sermon-player"');
    expect(html).toContain('data-signals=\'{"sermon":{"videoId":""}}\'');
    expect(html).toContain("youtube-nocookie.com/embed/");
    expect(html).not.toContain("connect.facebook.net");
    expect(html).not.toContain("<script src=");
  });

  test("gives the facade play control a real accessible name", async () => {
    const { html } = await getPage("/sermons");
    const label = html.match(/class="sermon-facade-play"[^>]*aria-label="([^"]+)"/)?.[1];

    expect(label).toBeDefined();
    expect(label?.startsWith("Play ")).toBe(true);
  });

  test("keeps a no-javascript watch link beside the player", async () => {
    const { html } = await getPage("/sermons");

    expect(html).toContain("https://www.youtube.com/watch?v=");
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test tests/pages.test.ts`

Expected: FAIL. `id="sermon-player"` is absent.

- [ ] **Step 3: Add the play and youtube icons**

In `src/components/ui/icon.tsx`, extend the `IconName` union. Keep the list alphabetical — insert `"play"` after `"phone"` and `"youtube"` after it:

```ts
  | "phone"
  | "play"
  | "youtube";
```

Then add these two entries to the `paths` record, after the existing `"phone"` entry:

```tsx
    play: <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />,
    youtube: (
      <>
        <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
        <path d="m10.5 9.5 5 2.5-5 2.5v-5Z" fill="currentColor" stroke="none" />
      </>
    ),
```

Both names are required: `play` drives the facade and archive controls, and `youtube` labels the player's "Watch on YouTube" link. Neither exists yet, so `icon="youtube"` in Step 4 will not type-check until this step is done.

- [ ] **Step 4: Create the player component**

Create `src/components/ui/sermon-player.tsx`:

```tsx
import { formatSermonDate, watchUrlFor } from "../../content/sermon-feed";
import { getImageSource } from "../../content/site";
import type { Sermon } from "../../content/types";
import { ButtonLink } from "./button-link";
import { Icon } from "./icon";

export type SermonPlayerProps = {
  sermon: Sermon;
  className?: string;
};

const playerSizes = "(min-width: 64rem) 60rem, 92vw";

export function SermonPlayer({ sermon, className = "" }: SermonPlayerProps) {
  const poster = sermon.image ? (
    <img
      class="sermon-facade-image"
      {...getImageSource(sermon.image, playerSizes)}
      alt=""
      loading="lazy"
    />
  ) : null;

  return (
    <div class={`sermon-player ${className}`.trim()} id="sermon-player" tabindex={-1} data-signals='{"sermon":{"videoId":""}}'>
      <div class="sermon-player-frame">
        <div class="sermon-facade" data-show="$sermon.videoId === ''">
          {poster}
          <button
            type="button"
            class="sermon-facade-play"
            data-on:click={`$sermon.videoId = '${sermon.youtubeId}'`}
            aria-label={`Play ${sermon.title}`}
          >
            <Icon name="play" size={24} />
            <span class="sermon-facade-label">Play message</span>
          </button>
        </div>
        <iframe
          class="sermon-player-embed"
          data-show="$sermon.videoId !== ''"
          data-attr:src="$sermon.videoId ? 'https://www.youtube-nocookie.com/embed/' + $sermon.videoId + '?rel=0&autoplay=1' : ''"
          title={sermon.title}
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
        />
      </div>
      <div class="sermon-player-meta">
        <h3 class="sermon-player-title">{sermon.title}</h3>
        <p class="sermon-player-byline">
          {[sermon.speaker, formatSermonDate(sermon.date), sermon.duration].filter(Boolean).join(" · ")}
        </p>
        {sermon.summary ? <p class="sermon-player-summary">{sermon.summary}</p> : null}
        {sermon.youtubeId ? (
          <ButtonLink
            className="text-link"
            href={watchUrlFor(sermon.youtubeId)}
            external
            icon="youtube"
            iconPosition="end"
          >
            Watch on YouTube
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}
```

`sermon.youtubeId` is optional on the type, so guard every use of it. The `data-attr:src` expression reads the signal rather than the prop, which is what lets an archive row swap the video later.

- [ ] **Step 5: Add the CSS**

Append to `src/input.css`, directly after the existing `.sermon-card .card-content > p:last-child` rule:

```css
.sermon-player-frame {
  position: relative;
  overflow: hidden;
  border-radius: 1.25rem;
  background: var(--color-warm-black);
  aspect-ratio: 16 / 9;
}

.sermon-player-embed,
.sermon-facade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.sermon-facade {
  display: grid;
  place-items: center;
  background: var(--color-warm-black);
}

.sermon-facade-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.65;
}

.sermon-facade-play {
  position: absolute;
  display: grid;
  gap: 0.6rem;
  place-items: center;
  padding: 1.1rem 1.6rem;
  border-radius: 999px;
  background: var(--color-primary);
  color: var(--color-warm-black);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  transition: transform 200ms ease, box-shadow 200ms ease;
}

.sermon-facade-play:hover {
  transform: scale(1.05);
  box-shadow: 0 0.8rem 2rem rgb(0 0 0 / 35%);
}

.sermon-facade-play:focus-visible {
  outline: 0.2rem solid var(--color-primary-foreground);
  outline-offset: 0.2rem;
}

.sermon-player-meta {
  margin-top: 1.2rem;
}

.sermon-player-title {
  font-size: clamp(1.4rem, 2.6vw, 2rem);
}

.sermon-player-byline {
  margin-top: 0.35rem;
  color: var(--color-primary-strong);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sermon-player-summary {
  margin-top: 0.8rem;
  max-width: 46rem;
  color: var(--color-muted-foreground);
}
```

- [ ] **Step 6: Rebuild the stylesheet**

Run: `bun run css:build`

Expected: `static/style.css` gains the new rules. Never hand-edit that file.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `bun test tests/pages.test.ts tests/stylesheet.test.ts`

Expected: the player tests FAIL until Task 7 mounts the component on the page. Confirm the failure is only the missing markup, not a component error, then continue to Task 7. Commit this task's files together with Task 7's page work in Task 7's commit.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/icon.tsx src/components/ui/sermon-player.tsx src/input.css static/style.css tests/pages.test.ts
git commit -m "feat: add featured sermon player with click-to-load facade"
```

---

## Task 6: Text-first sermon archive

**Files:**
- Create: `src/components/ui/sermon-archive.tsx`
- Modify: `src/input.css`
- Test: `tests/pages.test.ts`

**Interfaces:**
- Consumes: `Sermon` (Task 1), `formatSermonDate` and `watchUrlFor` (Task 2), `ButtonLink` and `Icon` (existing).
- Produces: `SermonArchive({ sermons }: { sermons: Sermon[] })` and the DOM contract asserted in Tasks 7–9:
  - root `ol.sermon-archive`
  - one `li` per year containing an `h3.sermon-archive-year` with the year
  - one `article.sermon-row` per sermon, with a `time` element carrying `datetime={sermon.date}`
  - `.sermon-row-badge` badge reading either "YouTube" or "Facebook"
  - YouTube rows: a `.sermon-row-play` button with `data-on:click` that sets `$sermon.videoId` and then focuses `#sermon-player`, **and** a visible `a` to `watchUrlFor(youtubeId)`
  - Facebook rows: a `ButtonLink` with `external` to `sermon.facebookUrl`
  - `.sermon-row-flag` on rows where `sermon.needsCuration` is true

- [ ] **Step 1: Write the failing tests**

Add to `tests/pages.test.ts`:

```ts
  test("groups the archive by year and labels every row's source", async () => {
    const { html } = await getPage("/sermons");

    expect(html).toContain('class="sermon-archive"');
    expect(html).toContain("sermon-archive-year");
    expect(html).toContain("sermon-row-badge");
    expect(html).toMatch(/<time datetime="\d{4}-\d{2}-\d{2}"/);
  });

  test("gives every YouTube archive row a play control and a no-javascript link", async () => {
    const { html } = await getPage("/sermons");
    const rows = [...html.matchAll(/<article class="sermon-row[\s\S]*?<\/article>/g)].map((match) => match[0]);
    const youtubeRows = rows.filter((row) => row.includes("youtubeId") || row.includes("sermon-row-play"));

    expect(youtubeRows.length).toBeGreaterThan(0);

    for (const row of youtubeRows) {
      expect(row).toMatch(/class="sermon-row-play"/);
      expect(row).toContain("https://www.youtube.com/watch?v=");
    }
  });

  test("never renders a curation flag on a curated sermon", async () => {
    const { html } = await getPage("/sermons");
    const rows = [...html.matchAll(/<article class="sermon-row[\s\S]*?<\/article>/g)].map((match) => match[0]);
    const curatedRows = rows.filter((row) => !row.includes("needsCuration"));

    expect(curatedRows.every((row) => !row.includes("sermon-row-flag"))).toBe(true);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test tests/pages.test.ts`

Expected: FAIL. `sermon-archive` markup is absent.

- [ ] **Step 3: Create the archive component**

Create `src/components/ui/sermon-archive.tsx`:

```tsx
import { formatSermonDate, watchUrlFor } from "../../content/sermon-feed";
import type { Sermon } from "../../content/types";
import { ButtonLink } from "./button-link";
import { Icon } from "./icon";

export type SermonArchiveProps = {
  sermons: Sermon[];
};

function groupByYear(sermons: Sermon[]) {
  const groups = new Map<string, Sermon[]>();

  for (const sermon of sermons) {
    const year = sermon.date.slice(0, 4);

    groups.set(year, [...(groups.get(year) ?? []), sermon]);
  }

  return [...groups.entries()];
}

function playAction(sermon: Sermon) {
  if (!sermon.youtubeId) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        class="sermon-row-play"
        data-on:click={`$sermon.videoId = '${sermon.youtubeId}'; document.getElementById('sermon-player')?.focus()`}
        aria-label={`Play ${sermon.title} in the player above`}
      >
        <Icon name="play" size={18} />
        <span>Play</span>
      </button>
      <a class="sermon-row-link" href={watchUrlFor(sermon.youtubeId)} target="_blank" rel="noopener noreferrer">
        Watch on YouTube
      </a>
    </>
  );
}

function facebookAction(sermon: Sermon) {
  if (!sermon.facebookUrl) {
    return null;
  }

  return (
    <ButtonLink className="sermon-row-link" href={sermon.facebookUrl} external icon="facebook" iconPosition="start">
      Watch on Facebook
    </ButtonLink>
  );
}

export function SermonArchive({ sermons }: SermonArchiveProps) {
  if (sermons.length === 0) {
    return <p class="empty-state">No archived messages yet. Watch the latest on Facebook in the meantime.</p>;
  }

  return (
    <ol class="sermon-archive">
      {groupByYear(sermons).map(([year, entries]) => (
        <li key={year} class="sermon-archive-year-group">
          <h3 class="sermon-archive-year">{year}</h3>
          <ul class="sermon-archive-list">
            {entries.map((sermon) => (
              <li key={sermon.youtubeId ?? sermon.facebookUrl ?? `${sermon.date}-${sermon.title}`}>
                <article class={`sermon-row${sermon.needsCuration ? " needs-curation" : ""}`}>
                  <div class="sermon-row-main">
                    <time class="sermon-row-date" datetime={sermon.date}>
                      {formatSermonDate(sermon.date)}
                    </time>
                    <h4 class="sermon-row-title">{sermon.title}</h4>
                    {sermon.speaker ? <p class="sermon-row-speaker">{sermon.speaker}</p> : null}
                  </div>
                  <div class="sermon-row-aside">
                    <span class="sermon-row-badge">{sermon.facebookUrl ? "Facebook" : "YouTube"}</span>
                    {sermon.needsCuration ? <span class="sermon-row-flag">needs curation</span> : null}
                    {playAction(sermon)}
                    {facebookAction(sermon)}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
```

The page filters to sermons that have a source before passing them in, so this component can stay a pure renderer and never sees a highlight-only entry. The `sermon-row-badge` badge branch is therefore total: any row reaching this component has either `youtubeId` or `facebookUrl`.

- [ ] **Step 4: Add the CSS**

Append to `src/input.css`:

```css
.sermon-archive {
  display: grid;
  gap: 2.5rem;
}

.sermon-archive-year {
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 1.1rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.sermon-archive-list {
  margin-top: 1rem;
}

.sermon-row {
  display: grid;
  gap: 0.8rem;
  padding-block: 1.1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 55%, transparent);
}

.sermon-row-main {
  display: grid;
  gap: 0.25rem;
}

.sermon-row-date {
  color: var(--color-primary-strong);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.sermon-row-title {
  font-size: 1.15rem;
}

.sermon-row-speaker {
  color: var(--color-muted-foreground);
  font-size: 0.9rem;
}

.sermon-row-aside {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.sermon-row-badge,
.sermon-row-flag {
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sermon-row-badge {
  background: color-mix(in srgb, var(--color-primary) 22%, transparent);
  color: var(--color-primary-strong);
}

.sermon-row-flag {
  border: 1px dashed color-mix(in srgb, var(--color-muted-foreground) 45%, transparent);
  color: var(--color-muted-foreground);
}

.sermon-row-play {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  background: var(--color-primary);
  color: var(--color-warm-black);
  font-size: 0.85rem;
  font-weight: 700;
}

.sermon-row-play:focus-visible {
  outline: 0.2rem solid var(--color-primary-strong);
  outline-offset: 0.2rem;
}

.sermon-row-link {
  font-size: 0.85rem;
}

@media (min-width: 48rem) {
  .sermon-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 1.5rem;
  }
}
```

- [ ] **Step 5: Rebuild the stylesheet**

Run: `bun run css:build`

- [ ] **Step 6: Run the tests**

Run: `bun test tests/pages.test.ts`

Expected: FAIL until Task 7 mounts the archive. Confirm the failure is only absent markup.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/sermon-archive.tsx src/input.css static/style.css tests/pages.test.ts
git commit -m "feat: add text-first sermon archive grouped by year"
```

---

## Task 7: Compose the sermons page

**Files:**
- Modify: `src/components/pages/sermons-page.tsx`
- Test: `tests/pages.test.ts`

**Interfaces:**
- Consumes: `SermonPlayer` (Task 5), `SermonArchive` (Task 6), `resolveSermons` (Task 2), the committed snapshot, `sermons` (Task 1).
- Produces: the `/sermons` page, and the resolved-sermon split used by the highlights grid.

The page must read the committed snapshot from disk. Add a small loader in `src/content/sermon-feed.ts`? No — that would put I/O in a pure module. Instead import the JSON directly, which Bun supports with a `with { type: "json" }` attribute or plain import depending on `tsconfig.json` `resolveJsonModule`. Use a plain static import:

```ts
import snapshot from "../../content/sermons.generated.json";
```

If `bunx tsc --noEmit` rejects it, add `"resolveJsonModule": true` to `tsconfig.json` `compilerOptions`. That is the only permitted `tsconfig.json` change in this plan.

- [ ] **Step 1: Write the failing test**

In `tests/pages.test.ts`, inside `describe("sermons page", ...)`, replace the existing assertion

```ts
    expect((html.match(/class="card sermon-card"/g) ?? [])).toHaveLength(6);
```

with

```ts
    expect((html.match(/class="card sermon-card"/g) ?? []).length).toBeGreaterThan(0);
```

and add:

```ts
  test("mounts the player above the highlights and the archive", async () => {
    const { html } = await getPage("/sermons");

    expectInOrder(html, [
      "id=\"sermon-player\"",
      "sermon-card",
      "sermon-archive",
      "View More on Facebook",
    ]);
  });

  test("features the newest message and lists only recorded sermons in the archive", async () => {
    const { html } = await getPage("/sermons");
    const player = html.slice(html.indexOf("sermon-player-title"), html.indexOf("sermon-archive"));
    const featuredTitle = player.match(/sermon-player-title">([^<]+)</)?.[1];
    const firstRowTitle = html.match(/sermon-row-title">([^<]+)</)?.[1];

    expect(featuredTitle).toBeDefined();
    expect(firstRowTitle).toBeDefined();
    expect(featuredTitle).toBe(firstRowTitle);
  });

  test("keeps the existing highlight cards limited to curated artwork", async () => {
    const { html } = await getPage("/sermons");
    const cards = [...html.matchAll(/<article class="card sermon-card">([\s\S]*?)<\/article>/g)].map((m) => m[1]);

    for (const card of cards) {
      expect(card).toContain("card-image");
    }
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test tests/pages.test.ts`

Expected: FAIL on the new assertions.

- [ ] **Step 3: Rewrite the page**

Replace `src/components/pages/sermons-page.tsx` entirely:

```tsx
import { ButtonLink } from "../ui/button-link";
import { Card } from "../ui/card";
import { Icon } from "../ui/icon";
import { PageHero } from "../ui/page-hero";
import { SectionHeading } from "../ui/section-heading";
import { SermonArchive } from "../ui/sermon-archive";
import { SermonPlayer } from "../ui/sermon-player";
import { resolveSermons } from "../../content/sermon-feed";
import snapshot from "../../content/sermons.generated.json";
import { sermons } from "../../content/sermons";
import { site } from "../../content/site";

export function SermonsPage() {
  const all = resolveSermons(sermons, snapshot);
  const [featured, ...rest] = all;
  const highlights = sermons.filter((sermon) => sermon.image);
  const archive = [featured, ...rest].filter((sermon) => sermon.youtubeId || sermon.facebookUrl);

  return (
    <>
      <PageHero
        eyebrow="Messages"
        title="Sermons"
        description="Feed your faith with messages that speak to the ordinary and extraordinary places where you live."
        image={site.images.worshipMoment}
        imageAlt="Hands raised in worship"
      />

      <section class="live-banner-section">
        <div class="container live-banner">
          <div class="live-banner-mark" aria-hidden="true">
            <Icon name="facebook" size={30} />
          </div>
          <div>
            <p class="eyebrow">Live from KCCF</p>
            <h2>Join us live on Facebook</h2>
            <p>Watch the message, worship with us, and stay connected wherever you are.</p>
          </div>
          <ButtonLink
            className="button button-primary"
            href={site.contact.facebookUrl}
            external
            icon="facebook"
            iconPosition="start"
          >
            Watch Live
          </ButtonLink>
        </div>
      </section>

      {featured ? (
        <section class="section-cream" aria-labelledby="featured-message-title">
          <div class="container">
            <SectionHeading
              id="featured-message-title"
              eyebrow="Latest message"
              title="Watch the Latest"
              description="Press play to watch here, or open the recording on YouTube."
            />
            <SermonPlayer sermon={featured} />
          </div>
        </section>
      ) : null}

      {highlights.length > 0 ? (
        <section class="sermon-list-section" aria-labelledby="sermon-highlights-title">
          <div class="container">
            <SectionHeading
              id="sermon-highlights-title"
              eyebrow="Highlights"
              title="A Word for the Journey"
              description="Messages that have stayed with us, on grace, prayer, purpose, and service."
            />
            <div class="card-grid card-grid-three">
              {highlights.map((sermon) => (
                <Card
                  className="sermon-card"
                  image={sermon.image}
                  title={sermon.title}
                  description={`${sermon.speaker ?? site.name} · ${sermon.date}`}
                >
                  <p>{sermon.summary}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section class="section-cream" aria-labelledby="sermon-archive-title">
        <div class="container">
          <SectionHeading
            id="sermon-archive-title"
            eyebrow="Archive"
            title="Every Recorded Message"
            description="Browse the archive by year. New recordings appear here as soon as they are published."
          />
          <SermonArchive sermons={archive} />
          <div class="center-action">
            <ButtonLink
              className="button button-secondary"
              href={site.contact.facebookUrl}
              external
              icon="facebook"
              iconPosition="start"
            >
              View More on Facebook
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
```

`recorded` is declared but unused — remove it. The `archive` variable already filters. Keep only `featured`, `rest`, `highlights`, and `archive`.

Note the existing `pages.test.ts` assertion `expectInOrder(main, ["Sermons", "Join us live on Facebook", "The God Who Meets Us", "The Freedom to Serve", "View More on Facebook"])` must still hold. `"The God Who Meets Us"` is a curated highlight and `"The Freedom to Serve"` is the last highlight, so both still appear before the Facebook CTA. The newest *resolved* sermon now precedes them in the featured player, which does not break that ordering.

- [ ] **Step 4: Fix the date rendering in the highlight cards**

The highlight `description` must use the formatted date, not the raw ISO string. Add the import and use it:

```tsx
import { formatSermonDate, resolveSermons } from "../../content/sermon-feed";
```

and change the card `description` to:

```tsx
                  description={[sermon.speaker, formatSermonDate(sermon.date)].filter(Boolean).join(" · ")}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun test tests/pages.test.ts`

Expected: PASS. If `resolveJsonModule` blocks the build, add it to `tsconfig.json` as described in the Interfaces block.

- [ ] **Step 6: Run type-check and the full suite**

Run: `bun run type-check && bun run css:build && bun test`

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/components/pages/sermons-page.tsx tests/pages.test.ts tsconfig.json static/style.css
git commit -m "feat: compose featured player, highlights, and archive on /sermons"
```

Only include `tsconfig.json` in this commit if Step 5 required it.

---

## Task 8: Stylesheet contracts

**Files:**
- Modify: `tests/stylesheet.test.ts`

**Interfaces:**
- Consumes: the CSS added in Tasks 5 and 6.
- Produces: assertions that the shipped `static/style.css` carries the same contracts as `src/input.css`.

This test file already exports everything needed. Use these, do not write new helpers:
`parseStylesheet(css)`, `findRules(rules, selector, condition?)`, `findDeclarations(rules, selector, condition?)`, `findValue(rules, selector, property, condition?)`, `readShippedStylesheet()`, `readSourceStylesheet()`. Pass `null` as `condition` for an unconditional rule, or the at-rule string such as `"@media (min-width: 48rem)"` for a conditional one. `findValue` returns an array, so assert with `toEqual([...])`.

- [ ] **Step 1: Add the assertions**

Add this test inside the existing `describe("shipped stylesheet contract", ...)` block:

```ts
  test("keeps the sermon player and archive contracts in both stylesheets", async () => {
    const shipped = parseStylesheet(await readShippedStylesheet());
    const source = parseStylesheet(await readSourceStylesheet());

    for (const rules of [shipped, source]) {
      expect(findValue(rules, ".sermon-player-frame", "aspect-ratio")).toEqual(["16 / 9"]);
      expect(findValue(rules, ".sermon-player-embed, .sermon-facade", "position")).toEqual(["absolute"]);
      expect(findValue(rules, ".sermon-facade-play", "border-radius")).toEqual(["999px"]);
      expect(findValue(rules, ".sermon-archive", "display")).toEqual(["grid"]);
      expect(findValue(rules, ".sermon-row-badge", "text-transform")).toEqual(["uppercase"]);
      expect(findValue(rules, ".sermon-row-flag", "text-transform")).toEqual(["uppercase"]);
      expect(findValue(rules, ".sermon-row", "grid-template-columns", "@media (min-width: 48rem)")).toEqual([
        "minmax(0, 1fr) auto",
      ]);
    }
  });

  test("keeps the sermon player free of motion so reduced-motion needs no override", async () => {
    const shipped = parseStylesheet(await readShippedStylesheet());
    const source = parseStylesheet(await readSourceStylesheet());

    for (const rules of [shipped, source]) {
      const moving = findDeclarations(rules, ".sermon-player-frame").filter(
        (declaration) => declaration.property === "transition" || declaration.property === "animation",
      );

      expect(moving).toEqual([]);
    }
  });
```

If `findValue(rules, ".sermon-player-embed, .sermon-facade", "position")` returns an empty array, the parser stores the combined selector with its whitespace normalised. Confirm the exact key by running `findRules(source, ".sermon-player-embed, .sermon-facade")` and matching what it returns rather than guessing.

- [ ] **Step 2: Run the tests to verify they pass**

Run: `bun test tests/stylesheet.test.ts`

Expected: PASS. Run `bun run css:build` first if `static/style.css` predates Tasks 5 and 6.

- [ ] **Step 4: Commit**

```bash
git add tests/stylesheet.test.ts
git commit -m "test: assert sermon player and archive stylesheet contracts"
```

---

## Task 9: Real-browser facade and swap smoke

**Files:**
- Modify: `tests/browser.test.ts`

**Interfaces:**
- Consumes: the mounted `/sermons` page (Task 7) and the CDP session helper `page.evaluate` / `page.open` / `page.problems`.
- Produces: one new test in the existing `describe.skipIf(!chromePath)` block.

- [ ] **Step 1: Write the test**

Add inside the existing `describe.skipIf(!chromePath)("real browser smoke", ...)` block:

```ts
  test("loads a YouTube player only after pressing play, and swaps it from the archive", async () => {
    await page.open("/sermons");

    const result = await page.evaluate<{
      initialSrc: string;
      afterPlay: string;
      afterSwap: string;
      facadeVisibleBefore: boolean;
    }>(`
      (async () => {
        const embed = document.querySelector("iframe.sermon-player-embed");
        const facade = document.querySelector(".sermon-facade");
        const initialSrc = embed?.getAttribute("src") ?? "";
        const facadeVisibleBefore = !facade || facade.getClientRects().length > 0;

        document.querySelector(".sermon-facade-play").click();
        await new Promise((resolve) => setTimeout(resolve, 400));
        const afterPlay = embed?.getAttribute("src") ?? "";

        const facadeLabel = document.querySelector(".sermon-facade-play").getAttribute("aria-label");
        const rows = [...document.querySelectorAll(".sermon-row-play")];
        const target = rows.find((row) => row.getAttribute("aria-label") !== facadeLabel);

        if (target) {
          target.click();
          await new Promise((resolve) => setTimeout(resolve, 400));
        }

        return { initialSrc, afterPlay, afterSwap: embed?.getAttribute("src") ?? "", facadeVisibleBefore };
      })()
    `);

    expect(result.facadeVisibleBefore).toBe(true);
    expect(result.initialSrc).toBe("");
    expect(result.afterPlay).toContain("https://www.youtube-nocookie.com/embed/");
    expect(result.afterPlay).toContain("autoplay=1");
    expect(result.afterPlay).not.toContain("www.youtube.com/embed");
    if (result.afterSwap) {
      expect(result.afterSwap).toContain("https://www.youtube-nocookie.com/embed/");
      expect(result.afterSwap).not.toBe(result.afterPlay);
    }
    expect(page.problems).toEqual([]);
  });
```

- [ ] **Step 2: Update the skip warning count**

The suite's warning string at `tests/browser.test.ts:11` says `"so its 5 tests did not run"`. Change `5` to `6`.

- [ ] **Step 3: Run the browser suite**

Run: `bun test tests/browser.test.ts`

Expected: PASS if Chrome is discoverable. If the suite skips, confirm the warning names the skip and the `KCCF_CHROME_PATH` override, then report that the browser test could not be verified here rather than claiming it passed.

- [ ] **Step 4: Commit**

```bash
git add tests/browser.test.ts
git commit -m "test: cover the sermon facade load and player swap in a real browser"
```

---

## Task 10: Documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: everything built above.
- Produces: no code. The plan is not complete until this task runs, because a future contributor will otherwise edit `sermons.generated.json` by hand or assume the feed is an archive.

- [ ] **Step 1: Update the architecture section of `CLAUDE.md`**

Add these bullets to the `## Architecture` list, after the existing `src/content/site.ts` bullet:

```markdown
- `src/content/sermon-feed.ts` is the pure seam for sermon video data: Atom parsing, title and speaker derivation, multi-part grouping, `resolveSermons()`, and `formatSermonDate()`. It performs no I/O, so the sync script and the test suite share it.
- `src/content/sermons.ts` is the curated archive of record and is unlimited. `src/content/sermons.generated.json` is the committed feed snapshot. `resolveSermons()` merges them curated-first, so a hand-written title or summary always wins and the feed only ever adds.
- `bun run sermons:sync` is the only thing that touches the network, and only when a human runs it. It union-writes the snapshot and contains no code path that removes an entry, so a failed fetch physically cannot empty the archive. It exits non-zero without writing on a non-200, an unparseable feed, a feed with no entries, or a feed for another channel.
- The YouTube feed exposes roughly the last fifteen uploads, which for this channel is about five days. It is a tripwire for "did we miss a service", not an archive. Everything older must be curated into `src/content/sermons.ts` by hand.
- YouTube `playlist_id` feeds return HTTP 404, so `site.youtube.playlistId` is intentionally empty. A curated YouTube playlist is still worth creating for the congregation on YouTube itself, but it must never become a sync input.
- The sermon player is a click-to-load facade: no YouTube JavaScript loads until a visitor presses play. Every YouTube archive row also carries a plain "Watch on YouTube" link, because the play button does nothing without JavaScript.
```

- [ ] **Step 2: Update the security-headers section of `CLAUDE.md`**

Append to that section:

```markdown
`frame-src 'self' https://www.youtube-nocookie.com` exists solely for the sermon player's embed, and is the only directive any third-party host appears in. The YouTube iframe is a separate browsing context governed by YouTube's own policy, so the parent document's `script-src`, `connect-src`, and `img-src` are unaffected — which is why the facade pattern was chosen over the Facebook SDK, whose inline `fbAsyncInit` script would have required a nonce and a `connect.facebook.net` allowance. Use `youtube-nocookie.com` and never `www.youtube.com`, so a visitor is not cookied by an embed they may not play.
```

- [ ] **Step 3: Update the README route list**

In `README.md`, change the `/sermons` line to:

```markdown
- `/sermons` - Featured player, curated highlights, and a year-grouped archive of recorded messages
```

- [ ] **Step 4: Run the full check**

Run: `bun run check`

Expected: `type-check`, `css:build`, `test`, and `build` all pass, in that order.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: record the sermon sync discipline and frame-src rationale"
```

---

## Verification

Run once at the end, after Task 10:

```bash
bun run check
```

All four stages must pass. Then confirm by hand:

```bash
bun run dev
curl -s http://127.0.0.1:3000/sermons | grep -c "sermon-row"
curl -sI http://127.0.0.1:3000/sermons | grep -i content-security-policy
```

Expect: a non-zero `sermon-row` count, and a policy containing `frame-src 'self' https://www.youtube-nocookie.com` with no other directive naming that host.

If Chrome is available, also run `bun test tests/browser.test.ts` to exercise the facade and swap for real.

## Follow-up (not in this plan)

- Replace the placeholder speakers in `src/content/sermons.ts` ("Pastor David Okafor", "Pastor Grace Okafor"). Neither corresponds to anyone on the channel; the real names are Bishop Olayinka Adeyinka, Bro. Omonayaja Olufemi Abiola, and Pastor Abimbola.
- Add real `youtubeId` or `facebookUrl` values for the six curated entries, and hand-curate every sermon before 2026-09-16.
- Consider durations, which the feed does not carry, for the featured player.
