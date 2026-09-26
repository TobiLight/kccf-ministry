# Sermon Recordings on `/sermons` — Design Spec

- **Date:** 2026-09-26
- **Status:** Approved in brainstorming, pending spec review
- **Scope:** Add real, playable sermon recordings to the public sermons page, sourced from the church's YouTube channel, with Facebook as a link-out fallback.

---

## 1. Problem

`/sermons` currently renders six static, non-interactive `Card`s from a hand-authored
array (`src/content/sermons.ts`). Every entry has a title, speaker, date, summary, and a
local image — and no URL of any kind. The page's only calls to action are two links to
`https://www.facebook.com/kccfministries`.

The church's actual recordings live on that Facebook page. Facebook is the wrong host for
a website-embedded video experience, for reasons verified during design (§4.3):

- Logged-out visitors are frequently walled with "Log in to continue" — worst on mobile and
  inside in-app browsers (WhatsApp, Instagram), which is where a share link is tapped.
- Publishers can disable embedding per video, producing "This video can't be embedded."
- Ad blockers kill the iframe, leaving an empty box.
- The Graph `embed_html` property is officially deprecated and does not work on mobile.
- The Facebook SDK requires `script-src` relaxation plus a nonce for inline scripts —
  a materially worse security posture than the iframe-only form, which needs only
  `frame-src`.

The church confirmed that mirroring recordings to YouTube is realistic, and already has a
live channel at `https://www.youtube.com/@kccfministries1579`.

## 2. Goals

1. Visitors can watch a sermon **without leaving the site** when a YouTube recording exists.
2. Facebook-only recordings remain reachable, via link-out, without a broken embed.
3. A newly-recorded message reaches the archive without hand-editing code, while the
   historical back-catalogue is explicitly a curation task (§16).
4. No third-party JavaScript loads on page load.
5. Exactly **one** new Content Security Policy directive.
6. A bad or failed feed sync can never damage the archive.

## 3. Non-goals

Explicitly out of scope for v1, all reversible later without data migration:

- Search or filtering of the archive
- Grouping by sermon series
- Duration badges in the archive listing
- Facebook iframe embeds (link-out only)
- Transcripts, sermon notes, or discussion guides
- Pagination or virtualised rendering of the archive
- Self-hosted audio

## 4. Verified feasibility findings

These were established by direct observation during design and constrain the whole design.

### 4.1 The channel feed

Channel ID: `UCRNGCZhVNV2Pj80fs20GNog`

Endpoint: `https://www.youtube.com/feeds/videos.xml?channel_id=UCRNGCZhVNV2Pj80fs20GNog`
— HTTP 200, well-formed Atom, 15 entries, no authentication or API key.

**The feed's `<title>` is unusable.** 14 of 15 entries are the literal string
`"KCCF Ministries Live Stream"`. The real sermon title and speaker live in the
`media:description`, as a first line (title) followed by further lines (speaker, occasion).

**The feed window is five days wide.** All 15 entries fall between 2026-09-16 and
2026-09-20, at roughly three uploads per service. The feed is therefore a **tripwire**
that answers "did we miss a service?" — it is not an archive, and cannot become one.

**Services upload in multiple parts.** Six of the 15 entries are the same sermon
("The Potter's Hands / Broken Vessels Shall Hold Water Again.", Bishop Olayinka Adeyinka)
across 2026-09-16 and 2026-09-17.

Observed description shapes that derivation must survive:

| Description line 1 | Line 2 | Line 3 | Interpretation |
|---|---|---|---|
| `18th Annual Anniversary` | `Theme: Harvest Of Abundance` | — | Occasion, not a speaker |
| `Praise Night` | `I Shall Never Lack Again` | — | Neither line is a speaker |
| `Wisdom To Receive And Retain Increase` | `Bishop Olayinka Adeyinka` | — | Title + speaker |
| `The Potter's Hands/ Broken Vessels Shall Hold Water Again.` | `Bishop Olayinka Adeyinka` | — | Title with stray slash + speaker |
| `Equipped For Abundant Harvest` | `Bro. Omonayaja Olufemi Abiola` | `Minister...` | Title + speaker + role |
| *(empty)* — feed title `The Breathe Of Life By Pastor Abimbola` | — | — | Title only, from `<title>` |

### 4.2 The playlist feed is dead

`https://www.youtube.com/feeds/videos.xml?playlist_id=...` returns **HTTP 404** for both
a well-known public playlist and this channel's own uploads playlist, while the
corresponding playlist **page** returns HTTP 200. The `UU` / `UULF` / `UULV` / `UULS`
playlist-ID prefixes also 404. **Only `channel_id` feeds return data.**

Consequence: the site cannot read a curated "Sermons" playlist, so the two sources cannot
be joined. A playlist remains worth creating as a congregation-facing convenience *on
YouTube*, but it must not become a dependency of the sync. See also §6.4.

The channel has no playlists today.

### 4.3 Facebook embed support

Facebook's Embedded Video Player and Page Plugin are **not** deprecated; only the Like and
Comment plugins were retired (2026-02-10). Facebook embed capability therefore exists but is
not used in v1, per §3.

### 4.4 Meta oEmbed

Tokenless Meta oEmbed APIs exist (announced 2026-06-15), but are unnecessary here: the
iframe URL form is deterministic and the project is not consuming Facebook embeds.

## 5. Architecture

Three layers, each with a single responsibility:

```
scripts/sync-sermons.ts          one-off, manual, network-touching
        │  writes (union, never deletes)
        ▼
src/content/sermons.generated.json    committed snapshot; the only network-derived input
        │
        ▼
src/content/sermon-feed.ts       resolveSermons() — pure, no I/O
        │  merges with
        ▼
src/content/sermons.ts           curated archive of record — hand-maintained, unlimited
        │
        ▼
src/components/pages/sermons-page.tsx   featured player + highlights + archive
```

**The build reads only committed files.** `bun run check`
(`type-check → css:build → test → build`) stays hermetic and deterministic, and the Docker
`build` stage is untouched.

**Curated always wins.** A hand-written title, summary, speaker, duration, or image is
never overwritten by feed data. The feed only ever *adds* sermons nobody has curated.

## 6. Data model

### 6.1 `Sermon` (`src/content/types.ts`)

```ts
export type Sermon = {
  title: string;
  /** ISO 8601 calendar date, e.g. "2026-09-21". Sortable; formatted at render. */
  date: string;
  speaker?: string;
  summary?: string;
  /** Local asset key from imageAssetMap. Curated highlights only. */
  image?: string;
  /** Human duration, e.g. "42:10". Curated only. */
  duration?: string;
  /** Reserved for future grouping. Unused in v1. */
  series?: string;
  /**
   * Sort key for multi-part sermons. Not rendered directly; the display title
   * carries "— Part N of M". Curated entries omit it.
   */
  partIndex?: number;
  /** Mutually exclusive with facebookUrl. */
  youtubeId?: string;
  /** Mutually exclusive with youtubeId. */
  facebookUrl?: string;
  /**
   * True on feed-derived entries whose title or speaker was uncertain. Curated
   * entries never set this, so clearing it is achieved by curating the sermon.
   * The archive renders a marker; it is a maintainer prompt, not user-facing copy.
   */
  needsCuration?: boolean;
};
```

`date` changes from a display string to ISO 8601 because merging a curated list with a feed
requires a real sort key. A `formatSermonDate()` helper renders for display.

### 6.2 Source states

An entry has **at most one** video source. Three states:

| State | Condition | Rendering |
|---|---|---|
| Playable | `youtubeId` present | Facade + inline player, plus "Watch on YouTube" link |
| Link-out | `facebookUrl` present | "Watch on Facebook" |
| Highlight-only | neither | Curated-highlights card only; no archive row |

"At most one" rather than "exactly one" because the six existing entries have neither. The
highlight-only state keeps them working while real URLs are added.

**Invariant, enforced by test:** no entry sets both `youtubeId` and `facebookUrl`.

### 6.3 Snapshot shape (`src/content/sermons.generated.json`)

```json
{
  "generatedAt": "2026-09-26T00:00:00.000Z",
  "channelId": "UCRNGCZhVNV2Pj80fs20GNog",
  "entries": [
    {
      "youtubeId": "2zFODEV22G0",
      "title": "18th Annual Anniversary",
      "speaker": null,
      "publishedAt": "2026-09-20",
      "partIndex": 1,
      "partCount": 2,
      "needsCuration": true
    }
  ]
}
```

`needsCuration` marks entries where derivation was uncertain — see §7.2.

### 6.4 `site.ts` additions

```ts
youtube: {
  channelId: "UCRNGCZhVNV2Pj80fs20GNog",
  channelUrl: "https://www.youtube.com/@kccfministries1579",
  playlistId: "",   // intentionally empty; playlist feeds 404 (§4.2)
}
```

Single source of truth for both the sync script and the page. `playlistId` is retained as a
documented placeholder so the intent is recorded if the endpoint ever returns — see §4.2.

## 7. `scripts/sync-sermons.ts`

Invoked manually: `bun run sermons:sync`. Network-touching, never runs during build or test.

### 7.1 Safety properties

1. **Union-write.** The script reads the existing committed snapshot and writes
   `existing ∪ newlyFetched`. The file can only grow. A broken fetch is structurally
   incapable of removing a sermon. Deleting a sermon from the archive becomes an explicit
   human edit.
2. **Refuse to write on a bad fetch.** Before writing, the response must be well-formed
   Atom with at least one `<entry>`. Zero entries, a parse error, a non-200 status, or a
   mismatched `channelId` causes the script to print the reason and **exit non-zero without
   touching the file**.
3. **Loud reporting.** Every run prints a per-run report (§7.4). "Added 0" must be
   distinguishable from "something is broken."
4. **No deletes, ever.** The script has no code path that removes an entry.

### 7.2 Derivation rules

Deterministic, not heuristic in the "clever" sense. No text is auto-corrected or
repunctuated; uncertain entries are flagged instead.

| Field | Rule |
|---|---|
| `youtubeId` | `<yt:videoId>` |
| `publishedAt` | `<published>` truncated to `YYYY-MM-DD` |
| `title` | First non-empty line of `media:description`, trimmed. Fall back to `<title>` when the description is absent or empty. |
| `speaker` | The next line after the title, **only if it looks like a person**: contains `Bishop`, `Pastor`, `Bro.`, `Minister`, or `Dr.` (case-insensitive, word-boundary), **or** is 2–4 words and contains no colon. Otherwise `null`. |
| `partIndex` / `partCount` | Group entries by normalised title (case-folded, punctuation and whitespace collapsed). Within a group of size > 1, number sequentially by `publishedAt` ascending. |
| `needsCuration` | `true` when: the title came from the fallback `<title>`; the title contains `/` or `\|`; `speaker` is `null`; or `partCount > 1`. |

The `speaker` rule correctly rejects `Theme: Harvest Of Abundance` (contains a colon) and
`I Shall Never Lack Again` (no title word, and not obviously a person). It correctly accepts
`Bishop Olayinka Adeyinka` and `Bro. Omonayaja Olufemi Abiola`.

`The Potter's Hands/ Broken Vessels Shall Hold Water Again.` keeps its stray slash and is
flagged `needsCuration`. Auto-inserting an em dash would be a guess about editorial intent;
flagging it is predictable.

### 7.3 Idempotency

Re-running with an unchanged feed produces an identical snapshot body. `generatedAt` is the
only field that changes; a test asserts snapshot entry content is order-stable and
deduplicated by `youtubeId`.

### 7.4 Report format

```
sermons:sync  channel UCRNGCZhVNV2Pj80fs20GNog (KCCF Ministries)
  fetched          15 entries
  already curated   4
  newly added      11
    + 18th Annual Anniversary                 2zFODEV22G0  2026-09-20  [needs curation]
    + The Potter's Hands/ Broken Vessels...   zWoO2YLWi_Q   2026-09-17  [part 1 of 6] [needs curation]
    ...
  snapshot         11 entries (was 0)
  needs curation  14 of 15 — curate titles and speakers in src/content/sermons.ts
  not in feed      2 curated sermons absent from the feed (video unlisted or removed)
```

Any line in the `not in feed` section names the sermon title, `youtubeId`, and last-seen
date, so a removed or unlisted video is discoverable rather than silently broken.

## 8. `resolveSermons()` (`src/content/sermon-feed.ts`)

Pure function, no I/O, trivially testable.

```
resolveSermons(curated, snapshot) -> Sermon[]
```

1. Start with every curated entry, unchanged.
2. For each snapshot entry whose `youtubeId` is not present among curated entries, append a
   derived `Sermon`:
   - `title` from §7.2, `youtubeId` set, `date` from `publishedAt`
   - `speaker` from §7.2; `summary`, `image`, `duration` absent
   - `needsCuration` carried through from the snapshot entry
   - title suffixed `— Part N of M` when `partCount > 1`
3. Sort, in this order, so the result is fully deterministic:
   1. `date` descending
   2. `partIndex` ascending (entries without a part sort as `0`)
   3. `title` ascending
4. Return.

`partIndex` is threaded from the snapshot onto the derived `Sermon` as a non-public sort
key rather than being re-parsed out of the display title, so that a sermon with ten or more
parts still sorts correctly and a title containing an em dash cannot perturb ordering.

The first element is the **featured** sermon.

If the snapshot is missing, unparseable, or empty, `resolveSermons()` returns the curated
list unchanged. The sermons page must never fail to render because of the snapshot.

## 9. Player and interaction

### 9.1 Click-to-load facade

No YouTube JavaScript loads until a visitor asks for it.

- The facade renders the sermon's local poster (`sermon.image`) and a real `<button>` whose
  accessible name is `Play {title}`.
- The iframe is present in the DOM but hidden until a sermon is selected.
- Clicking play swaps facade for player and starts playback.

**Fallback when `sermon.image` is absent:** a brand-coloured panel with a centred play
button. A wrong-but-pretty image on the most prominent element on the page is worse than no
image. A missing image is not an error.

### 9.2 Datastar signal

`data-signals='{"sermon":{"videoId":""}}'` on the player section.

Namespaced under `$sermon` per the existing `$contact.*` convention in `CLAUDE.md`, so it
cannot collide with the header's `$menuOpen` and `$marqueePaused`. Datastar v1.0.0-RC.7 is
vendored and supports `data-signals`, `data-on:`, `data-attr:`, `data-show`.

- Player iframe: `data-show="$sermon.videoId !== ''"`,
  `data-attr:src="$sermon.videoId ? 'https://www.youtube-nocookie.com/embed/' + $sermon.videoId + '?rel=0&autoplay=1' : ''"`
- Facade: `data-show="$sermon.videoId === ''"`
- Archive YouTube rows: `data-on:click="$sermon.videoId = '{youtubeId}'"` followed by a
  focus move to the player, matching the focus-restoration pattern at
  `src/components/site-header.tsx:28`

`loading="lazy"`, `allow="autoplay; encrypted-media; picture-in-picture; fullscreen"`,
`allowfullscreen`.

`youtube-nocookie.com` is used so a visitor is not cookied by an embed they may not play.

### 9.3 No-JavaScript degradation

The play button does nothing without JavaScript. Every YouTube archive row therefore also
carries a plain, always-visible **"Watch on YouTube"** link. JavaScript visitors get the
inline player; everyone else gets a working link. This is a requirement, not a nicety.

### 9.4 Motion

The player swap is instant with no transition, so `prefers-reduced-motion` has nothing
additional to disable. Archive rows and the facade must not introduce animation; the
existing global reduced-motion rules in `src/input.css` continue to apply unchanged.

## 10. Page composition

1. `PageHero` — unchanged.
2. Facebook live banner — unchanged. Facebook remains where the church livestreams.
3. **Featured player** — new. "Latest message", the player facade, then title, speaker,
   date, optional duration, optional summary, and a "Watch on YouTube" link.
4. **Curated highlights** — the existing `card-grid-three` of `sermon-card`s, now rendering
   only entries with an `image`. Components and CSS unchanged.
5. **Archive** — new, text-first, reverse-chronological, with year headings. Each row: date,
   title, speaker when known, source badge, and the action appropriate to §6.2. Generated
   entries flagged `needsCuration` carry a small `.sermon-row-flag` label reusing the
   existing `.eyebrow` treatment, so no new colour is required and the marker reads as a
   maintainer prompt rather than user-facing copy.
6. "View More on Facebook" CTA — kept.

The archive is **the first and only** place generated sermons appear. Sections 3 and 4
consume only curated entries.

## 11. Content Security Policy

One directive added in `src/index.ts`:

```ts
frameSrc: ["'self'", "https://www.youtube-nocookie.com"],
```

**Nothing else changes.** The YouTube iframe is a separate browsing context governed by
YouTube's own policy, so the parent document's `script-src`, `connect-src`, `img-src`, and
`style-src` are unaffected. `script-src` keeps `'self' 'unsafe-eval'` solely for Datastar's
`Function`-constructor evaluator, and `script-src-attr` stays `'none'`.

This mirrors the existing discipline in `CLAUDE.md` for `'unsafe-eval'`: the host appears in
exactly one directive, asserted by test.

`imgSrc` remains `'self' data:`. The archive is text-first precisely so that no third-party
image host is needed and the local-asset discipline in `tests/assets.test.ts` is preserved.

## 12. Styling

New rules in `src/input.css`, mirrored by regeneration into `static/style.css` via
`bun run css:build`. The shipped file is never hand-edited.

- `.sermon-player` — the featured player frame
- `.sermon-facade` — poster plus play control; `aspect-ratio: 16 / 9`
- `.sermon-facade-play` — the play button
- `.sermon-archive` — list container
- `.sermon-archive-year` — year heading
- `.sermon-row` — one row
- `.sermon-row-badge` — source badge
- `.sermon-row-flag` — needs-curation marker

All new classes are added inside the existing `@layer components` conventions and reuse the
current design tokens. No new colour, spacing, or type scale is introduced.

## 13. Testing

| File | Coverage |
|---|---|
| `content.test.ts` | `resolveSermons()` precedence, dedupe by `youtubeId`, sort order including `partIndex`, part suffixing; **at-most-one-source invariant**; derivation rules from §7.2 including the speaker accept/reject cases; **snapshot guard** (non-empty, every entry has `youtubeId`); snapshot entry content is stable and deduplicated across runs given an unchanged feed, with `generatedAt` the only varying field; update `toHaveLength(6)` at :70 |
| `pages.test.ts` | Featured player markup; facade button has accessible name; every YouTube row carries a no-JS fallback link; Facebook rows are `target="_blank" rel="noopener noreferrer"`; archive year headings; update the six-card assertion at :99 |
| `app.test.ts` | **New.** `frame-src` permits `https://www.youtube-nocookie.com`; that host appears in **no other directive**; `script-src` still contains `'unsafe-eval'`; `script-src-attr` still `'none'` |
| `stylesheet.test.ts` | New player/facade/archive-row contracts asserted in **both** `src/input.css` and `static/style.css` |
| `browser.test.ts` | Real-Chrome smoke: click the facade → iframe `src` becomes the expected `youtube-nocookie.com` embed URL; click a second archive row → player swaps to the new video |
| `assets.test.ts` | **Unchanged.** No new images are introduced; local-asset discipline intact |

Ordering note: `bun run check` runs `css:build` before `test`, so the stylesheet assertions
see a freshly generated `static/style.css`.

## 14. Documentation

- `CLAUDE.md` gains: the `sermon-feed.ts` merge seam, the `sermons:sync` union-write and
  refuse-to-write discipline, the single-`frame-src` rationale alongside the existing
  `'unsafe-eval'` note, and the fact that the feed is a five-day tripwire rather than an
  archive.
- `README.md`: the `/sermons` route description gains "featured player and browsable archive".

## 15. Risks

| Risk | Mitigation |
|---|---|
| Derived titles are frequently imprecise | `needsCuration` flags them; curated entries override; the archive renders `Part N of M` rather than silent duplicates |
| The feed is only a five-day tripwire | Explicitly accepted. The curated file is the archive of record; the feed only reports omissions |
| Featured sermon is stale until someone syncs | Accepted. The section copy must not claim otherwise. Documented in `CLAUDE.md` |
| Someone deletes a sermon from the curated file but not the snapshot | Union-write means the snapshot re-adds it. Removing a sermon requires editing the snapshot too — documented in the sync `--help` text |
| YouTube changes or removes the feed endpoint | The sync fails loudly and non-zero, leaving the snapshot and site untouched. The curated archive still renders |
| `youtube-nocookie.com` behaviour changes | Isolated to one CSP directive and one URL template |

## 16. Open items for the maintainer

These do not block implementation; the build and its tests are fully verifiable against the
six existing highlight-only entries.

1. **Real sermon URLs.** Supply `youtubeId` / `facebookUrl` for actual messages. Real
   speakers are Bishop Olayinka Adeyinka, Bro. Omonayaja Olufemi Abiola, and Pastor
   Abimbola — the placeholder "Pastor David Okafor" / "Pastor Grace Okafor" in
   `src/content/sermons.ts` do not correspond to anyone on the channel.
2. **Back-catalogue curation.** The five-day feed window means every sermon before
   2026-09-16 must be added to `src/content/sermons.ts` by hand.
3. **Optional: a "Sermons" playlist on YouTube** for congregation browsing. Explicitly
   *not* a sync input, per §4.2.
4. **Durations** are absent from the feed and must be curated if wanted in the featured
   player.
