# Church Events on `/events` — Design Spec

- **Date:** 2026-09-26
- **Status:** Approved in brainstorming, pending spec review
- **Scope:** Populate the empty events model with real past and upcoming church events, present them as two labelled sections on the existing `/events` page, refactor the hand-rolled event card onto the shared `Card` component, repair a broken image pipeline, and swap three stock photographs for real church photography.

---

## 1. Problem

`src/content/events.ts:8` declares `export const events: FeaturedEvent[] = []`. The array
is empty, and `tests/content.test.ts:87-89` asserts that it stays empty:

```ts
test("intentionally has no featured events yet", () => {
  expect(events).toEqual([]);
});
```

Both `/events` and the home page therefore render a "No upcoming events" empty state. The
church has five documented past events and four upcoming ones that belong on the site.

Three problems compound this.

**The home page would mislabel past events.** `home-page.tsx:164` titles its section
"Upcoming Events" and slices the array directly at `home-page.tsx:173`
(`events.slice(0, 3)`). Populating `events` with past entries would render them under a
heading that says "upcoming".

**There is no date logic anywhere in the codebase.** An exhaustive search for `Date`,
`Date.parse`, `Date.now`, `toLocaleDateString`, `Intl.DateTimeFormat`, `sort(`, and
`filter(` across `src/` returns exactly two hits: `new Date().getUTCFullYear()` in
`site-footer.tsx:5` (the copyright year) and a class-array `.filter(Boolean)` in
`section-heading.tsx:11`. Dates are human display strings such as `"September 21, 2026"`,
written to be printed and never parsed. The ECMAScript spec only guarantees `Date`
parsing of ISO 8601, so `"September 21, 2026"` cannot be parsed reliably. Any
past/upcoming split therefore requires either a new format convention, a hand-written
parser, or an explicit discriminator.

**The image pipeline is broken and the test suite is red.** Five assertions in
`tests/assets.test.ts` fail today (§4.3), and the working tree contains a half-finished
image rename that has broken the hero image of three pages.

## 2. Goals

1. Five past and four upcoming events render on `/events` in two clearly labelled sections.
2. Past events can never appear under an "upcoming" heading, on `/events` or the home page.
3. The past/upcoming distinction never reclassifies itself as the clock advances.
4. Event cards render through the shared `Card` component, gaining responsive images and
   base card styling.
5. The four stock photographs become real church photography.
6. `bun test` is green, and the 22 MB of oversized originals is gone.
7. Replacing a photograph in future is a two-minute, repeatable operation.

## 3. Non-goals

Explicitly out of scope, all reversible without data migration:

- **Event photographs and photo galleries.** The church has 680 real photographs in
  `~/Desktop/kccf` (§4.4) and a dedicated gallery page is wanted eventually. Deferred by
  explicit maintainer decision; this spec adds no `image`, `photos`, or `slug` field.
- A dedicated `/events/archive` route — both sections live on the existing page.
- Date-driven automatic past/upcoming classification.
- Event recurrence modelling, registration, RSVP, or ticketing.
- An iCalendar or `.ics` feed.
- Per-event detail pages.

## 4. Verified findings

Established by direct observation during design. Each constrains the design below.

### 4.1 Content Security Policy is unaffected

`createApp()` (`src/index.ts:14-28`) sets `scriptSrc: ["'self'", "'unsafe-eval'"]` and
`scriptSrcAttr: ["'none']"`. The events work introduces **no JavaScript, no new Datastar
signals, and no inline styles**, so no directive changes. The page loads Datastar as
`<script type="module">` for the header marquee and mobile menu regardless.

### 4.2 `Card` already supports image-less use

`src/components/ui/card.tsx:20` renders the image conditionally
(`{image ? <img …> : null}`), and `title` is the only required prop
(`card.tsx:6-15`). Text-only event cards need no new component and no change to `Card`.

### 4.3 The image pipeline is currently broken

`bun test tests/assets.test.ts` fails five assertions:

```
(fail) local ministry image assets > serves prayer-fellowship.jpg as a non-empty JPEG
(fail) responsive image variants > serves prayer-fellowship-1024.jpg as a non-empty JPEG
(fail) responsive image variants > serves prayer-fellowship-1600.jpg as a non-empty JPEG
(fail) image asset metadata > every asset's declared dimensions match its real JPEG dimensions
(fail) image asset metadata > every generated variant matches its declared width
```

`git status` shows the cause — uncommitted deletions and additions in `static/images/`:

| Problem | Evidence |
|---|---|
| Missing `src` | `prayer-fellowship.jpg` (10 444 889 bytes) is deleted, but `site.ts:73` still declares it as the asset `src` |
| Missing variants | `prayer-fellowship-1024.jpg` and `-1600.jpg` are deleted, but `site.ts:58-59` still lists them in `prayerFellowshipSrcset` |
| Misnamed file | `prayer-fellowship-640.jpg` is actually **2048×1365**; `assets.test.ts:28` declares 640. This is the `Expected: 640, Received: 2048` failure |
| Corrupt stray | `prayer-fellowship-1024jpg` (missing the dot) — `ffprobe` reports `Picture size 20971x13977 is invalid` and `0x0` |
| Stale dimensions | `bibleStudy` declares `800×600` at `site.ts:97`; the real file is **2048×1365** |

`prayer-fellowship` is referenced by `site.ts:73`, `sermons.ts:30`, `ministries.ts:12`,
`ministries.ts:32`, `leadership.ts:50`, four rows of `assets.test.ts`, and the alt text
asserted at `interactions.test.ts:282`. The half-finished rename to `prayer-*` was **not**
propagated to any source file, which is why the site currently points at files that do not
exist.

**Decision: revert the rename.** The untracked `prayer-640.jpg` is byte-identical (98 556
bytes) to the deleted `prayer-fellowship-640.jpg` in `HEAD`, so the correct 640/1024/1600
rungs are recoverable with one `git checkout`. Finishing the rename to `prayer` would touch
six files and eight-plus strings to save eleven characters.

### 4.4 Real photography exists, dated by EXIF

`~/Desktop/kccf` holds 680 photographs in six folders. Resolution survey: 640 at
6000×4000, 24 at 4928×3264, 8 portrait at 4000×6000, 7 at 6016×4016, 1 logo at 200×200.
EXIF `DateTimeOriginal` timestamps, read via
`ffprobe -show_entries frame_tags=DateTimeOriginal`:

| Folder | Captured | Count |
|---|---|---|
| Children Anniversary 2025 | 2025-06-01 | 59 |
| Youth Thanksgiving Service. Light Of The World | 2025-07-20 | 155 |
| Youth | 2025-07-18 / 2025-07-19 | 63 / 66 |
| usher | 2025-07-06 | 112 |
| praise night | 2025-09-19 / 2025-09-20 | 87 / 26 |
| root (loose) | 2025-09-21, 2024-09-14/15, 2026-08-29 | 80 / 18 / 6 / 7 |

**No photographs exist from 2026-09-20.** The only 2026 images are seven from 2026-08-29
(`JBD_*.jpg`, a second camera body). This is why event imagery was dropped (§3) rather
than stubbed.

### 4.5 The `about` photograph is already correct

The cross photograph at `~/Desktop/about.jpg` is **byte-identical** to the committed
`static/images/about.jpg` — both MD5 `f3a36dcf96193d186f1d834390f3d03f`, 4389×3292,
1 376 936 bytes. `site.ts:83-84` already declares 4389×3292, and the `about-*` rungs
(640/1024/1600/2400) all match their declared widths. **No work is required for the
`about` slot**, and its existing alt text "A cross against the sky" is accurate.

Three slots need photographs: `hero`, `worshipMoment`, `prayerFellowship`.

### 4.6 The 2026 anniversary theme is already documented

The sermon recordings spec (`docs/superpowers/specs/2026-09-26-sermon-recordings-design.md:80`)
records, from a verified YouTube feed read, a sermon titled **"18th Annual Anniversary"**
with theme **"Harvest Of Abundance"**, published **2026-09-20** — the same date as the
anniversary the church celebrated. This is observed third-party data, not invention, so it
may be used in event copy. It also implies the first anniversary was 2009.

### 4.7 Tooling

`ffmpeg` 6.1.1 and `bun` 1.3.14 are installed. `package.json` has **no** image toolchain —
no `sharp`, no `imagemin` — and the existing variants were produced out of band. Adding
`scripts/image-variants.ts` (§9) makes the process reproducible without adding a
dependency, consistent with the "keep it dependency-free" rule that governs
`scripts/dev.ts`.

## 5. Architecture

No new modules, no new routes, no new components, no new dependencies.

| Concern | Owner | Change |
|---|---|---|
| Event content | `src/content/events.ts` | Populated; gains `upcomingEvents` / `pastEvents` / `formatEventSchedule` |
| Event shape | `src/content/types.ts` | `FeaturedEvent` → `ChurchEvent` |
| Event list UI | `src/components/pages/events-page.tsx` | Second section; card markup → `Card` |
| Home teaser | `src/components/pages/home-page.tsx` | Slice the filtered list |
| Event card markup | `src/components/ui/card.tsx` | **Unchanged** — already optional-image |
| Image metadata | `src/content/site.ts` | Repaired dimensions and srcset ladders |
| Variant generation | `scripts/image-variants.ts` | **New** |
| Styling | `src/input.css` | Two new classes |

`serveStatic({ root: "./" })` (`src/index.ts:31`) already maps `/static/*` to the project
root, so `static/images/` is served without change.

## 6. Data model

### 6.1 `ChurchEvent` (`src/content/types.ts`)

Replaces `FeaturedEvent` (`types.ts:49-56`):

```ts
export type EventStatus = "upcoming" | "past";

export type ChurchEvent = {
  status: EventStatus;
  title: string;
  /**
   * Human display string, e.g. "September 20, 2026" or "November 2026".
   * Omitted when the church has not announced a date. Never parsed.
   */
  date?: string;
  /** Human display string, e.g. "10:00 PM". Omitted when not applicable. */
  time?: string;
  location: string;
  description: string;
  /** Past only. What the gathering was about. */
  recap?: string;
};
```

**Why `status` and not a date comparison.** The Anniversary fell on **2026-09-20**, six
days before this spec was written. A `Date.now()` comparison would silently reclassify it
on the 21st with no deploy and no diff. A hand-set `status` is stable, needs no parser, and
introduces no timezone question — the church is in Lagos (UTC+1) while the only existing
`Date` call in the codebase uses `getUTCFullYear()`, so "is this event past" is genuinely
ambiguous between the two. The cost is that promoting an event from `upcoming` to `past` is
a manual edit, which is correct: it is an editorial act.

**Why rename at all.** "Featured" described an empty placeholder array. With past and
upcoming events both listed, every event is equally featured and the name is misleading.
Plain `Event` collides with the DOM `Event` global in TypeScript, so `ChurchEvent` is the
shortest unambiguous name. The rename touches `types.ts`, `events.ts`, and two test imports.

### 6.2 Selectors (`src/content/events.ts`)

```ts
export const upcomingEvents = events.filter((event) => event.status === "upcoming");
export const pastEvents = events.filter((event) => event.status === "past");

export function formatEventSchedule(event: ChurchEvent): string {
  const parts = [event.date, event.time].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Date to be announced";
}
```

Both arrays are derived at module load. Content is static, so there is no reason to defer
filtering to render time.

`formatEventSchedule` exists because three of the four upcoming events have neither a date
nor a time. Without it the card eyebrow would render `"undefined · undefined"`. With it,
an announced month renders as `"November 2026"` and an unannounced event reads
`"Date to be announced"`. One definition of "how a date reads" serves the events page, the
home teaser, and any future detail view.

**Ordering is editorial, by array position.** `pastEvents` is written newest-first, matching
the existing convention in `sermons.ts`, which is also hand-ordered with no `.sort()`.

## 7. Content

### 7.1 Past events (5)

| # | Title | Date | Recap |
|---|---|---|---|
| 1 | Annual Church Thanksgiving Anniversary | September 20, 2026 | 18th anniversary; theme *Harvest of Abundance* |
| 2 | Thanksgiving Anniversary | September 20, 2025 | — |
| 3 | Praise Night | September 19, 2025 | — |
| 4 | Youth Thanksgiving Service: Light of the World | July 20, 2025 | — |
| 5 | Children's Anniversary | June 1, 2025 | — |

Dates are from the maintainer for the 2026 anniversary and from EXIF capture dates for the
2025 events (§4.4). `praise night` contains photographs from both 2025-09-19 and
2025-09-20; they are treated as two distinct gatherings — a Friday-night praise service
before a Sunday anniversary service. **This reading is unconfirmed** (§13, item 1).

**Recap copy is deliberately absent for events 2–5.** The only grounded detail available is
the 2026 theme (§4.6). Inventing attendance figures, speakers, or quotations for real
events at a real church would put unverifiable claims on the public site, so those four
carry a `description` only. Supplying recap copy is item 2 in §13.

### 7.2 Upcoming events (4)

| Title | Date | Time |
|---|---|---|
| I AM Revival | — | — |
| Women's Anniversary | November 2026 | — |
| Carol Service | — | — |
| Christmas Service | December 2026 | — |

Three of four have no announced date. `Women's Anniversary` and `Christmas Service` carry a
month because the church confirmed those months; **no specific day is assumed** — notably,
Christmas Day 2026-12-25 is a Friday, and a Sunday service the preceding day is a
reasonable guess but still a guess, so only the month is stated.

### 7.3 Location

Every event renders `KCCF Mount Zion, Ikotun, Lagos` (maintainer-supplied). The full
postal address remains on `/contact` and in the header contact strip; repeating all
thirty-odd words on nine cards would be unreadable.

### 7.4 Descriptions

Drafted strictly from each event's own title, asserting no attendance numbers, speakers,
or quotations. The maintainer should enrich them (§13, item 2).

## 8. Page composition

### 8.1 `/events` section order

1. `PageHero` — unchanged, still `site.images.prayerFellowship`
2. Regular Services — unchanged
3. **Upcoming Events** — `upcomingEvents`
4. **Past Events** — `pastEvents`, muted treatment

Section 3 is renamed from "Featured Events" to "Upcoming Events". Once a Past Events
section exists, "Featured" is actively confusing — all events are equally featured — and the
rename aligns the heading with `home-page.tsx:164`, which already says "Upcoming Events".
`tests/pages.test.ts:126` is updated to match.

**The empty state is retained, and keyed to the filtered list.** `events-page.tsx:79-91`
currently branches on `events.length > 0`. It becomes
`upcomingEvents.length > 0`, so the page still degrades correctly if every upcoming event
is removed, and the Past Events section renders its own empty state (or nothing) on the same
principle. Neither empty state is reachable with the shipped content; both exist so the
component is correct for the next content edit.

### 8.2 Past Events section

```tsx
<section class="past-events-section section-cream" aria-labelledby="past-events-title">
  <div class="container">
    <SectionHeading
      id="past-events-title"
      eyebrow="Recent history"
      title="Past Events"
      description="A look back at the gatherings that have brought our church family together."
    />
    <div class="card-grid card-grid-three">
      {pastEvents.map((event) => (/* Card, see §8.3 */))}
    </div>
  </div>
</section>
```

`section-cream` is used because section 3 is `section-secondary`; alternating them keeps
the two lists visually distinct. The new `past-events-title` id is globally unique, which
`tests/routes.test.ts:81-93` enforces along with `aria-labelledby` resolution.

### 8.3 Event card

The hand-rolled `<article class="event-card">` at `events-page.tsx:59-77` is replaced by
the shared `Card`:

```tsx
<Card
  className="event-card"
  eyebrow={formatEventSchedule(event)}
  title={event.title}
  description={event.description}
>
  {event.recap ? <p class="event-recap">{event.recap}</p> : null}
  <p class="event-location">{event.location}</p>
</Card>
```

Heading order is preserved: `SectionHeading` always emits `<h2>` and `Card` always emits
`<h3>`, so cards sit correctly under their section heading.

**Why this matters even with no images.** The hand-rolled card emitted
`class="event-card"` without the base `card` class, so the rules at `input.css:1074-1084`
(`.card-grid .card img`, `.card-grid .card-content`) never applied, and
`input.css:1326-1335` (`.event-card .card-content h3`, `.event-location`) was written
against a class the card only half-matched. Folding onto `Card` makes the existing CSS
apply as written and matches how `sermons-page.tsx:52-60` already renders cards.

### 8.4 Home page

`home-page.tsx:173` changes from `events.slice(0, 3).map(…)` to
`upcomingEvents.slice(0, 3).map(…)`. The section heading at `:164` is already
"Upcoming Events" and stays. With four upcoming events the teaser shows three; the fourth
is reachable on `/events`.

## 9. `scripts/image-variants.ts`

New, dependency-free, consistent with `scripts/dev.ts`. Shells out to the installed
`ffmpeg` via `Bun.spawn`.

```
bun run scripts/image-variants.ts <source> <base-name> [--widths 640,1024,1600] [--out static/images]
```

Responsibilities:

1. Generate each requested width with `-vf scale=<w>:-1`.
2. **Read the real dimensions back from each generated file** and print the exact
   `srcset` array literal and the `width`/`height` pair to paste into `src/content/site.ts`.
   Dimensions are never precomputed, because a wrong value fails
   `assets.test.ts:167-175` and is tedious to debug by hand.
3. **Warn on EXIF rotation.** `scale` does not always honour an orientation tag, so a
   rotated source silently yields swapped dimensions — the same class of bug as the current
   `bibleStudy` mismatch (§4.3).
4. Refuse to overwrite an existing file without an explicit flag.

The script is the deliverable that makes §10 repeatable. It is not run by `bun run check`
and holds no state.

## 10. Image work

### 10.1 Repair (gate: `bun test tests/assets.test.ts` green)

1. `git checkout -- static/images/prayer-fellowship-640.jpg
   static/images/prayer-fellowship-1024.jpg static/images/prayer-fellowship-1600.jpg`
2. Delete the untracked `prayer-640.jpg`, `prayer-1024.jpg`, `prayer-1600.jpg`, and the
   corrupt `prayer-fellowship-1024jpg`.
3. **Drop the 6000w originals.** Repoint `prayerFellowship.src` and `worshipMoment.src` at
   their 1600w files, set the declared `width`/`height` to 1600×1067, and trim both srcset
   ladders to end at 1600w. No page renders wider than `38rem`, and `hero` — the only
   `sizes: 100vw` asset — is handled separately in §10.2. This deletes 10.4 MB and 11.8 MB
   from the repository and every Docker image build.
4. Correct `bibleStudy` to `2048×1365` at `site.ts:97`.
5. `generatedVariants` (`assets.test.ts:17-31`) needs **no change** in this step: all three
   `prayer-fellowship-*` rungs survive step 3, and dropping the 6000w originals removes no
   variant row, because the originals were listed in `imageFiles` (`:7-15`) and not in
   `generatedVariants`. `imageFiles` loses `prayer-fellowship.jpg` and
   `worship-moment.jpg`.

The corrupt stray must be deleted rather than renamed: `ffprobe` cannot parse it, so it is
not recoverable by any means short of re-deriving it from the correct `-640` rung.

### 10.2 Replace the three stock photographs

| Slot | Used by | Rungs | Constraint |
|---|---|---|---|
| `hero` | `/` main hero (`home-page.tsx:20`) | 640/1024/1600/2400 | `sizes: 100vw` — the only full-bleed asset, so it needs a 2400w top rung |
| `worshipMoment` | `/sermons` hero, `/about` (`:82`) | 640/1024/1600 | — |
| `prayerFellowship` | `/`, `/events`, `/leadership` heroes | 640/1024/1600 | alt asserted at `interactions.test.ts:282` |

`hero` gets a 2400w top rung because it is the only asset sized `100vw`. Its current top
rung is `hero.jpg` at 2048w, and a 2400w rung supersedes it: the ladder becomes
640/1024/1600/2400, `hero.src` points at `hero-2400.jpg`, and the redundant `hero.jpg` is
deleted. That drops one row from `imageFiles` (`assets.test.ts:12`) and adds one to
`generatedVariants`, and it keeps the ladder monotonic rather than
640/1024/1600/2048/2400.

Selection procedure, because the agent will not choose photographs of the maintainer's
congregation blind:

1. Screen all 680 candidates on exposure and contrast with
   `ffmpeg -i <f> -vf "scale=320:-1,signalstats,metadata=print:file=-"`, reading
   `YAVG`, `YLOW`, `YHIGH`. Roughly 0.4 s each, about four minutes total. This is a
   read-only measurement and selects nothing on its own.
2. Shortlist three to five per slot, excluding blown highlights (`YHIGH` clipping),
   crushed shadows, and heavy motion blur.
3. **The maintainer picks** from the shortlist.
4. Generate rungs with §9, register in `imageAssetMap`, and propose alt text describing
   what is actually in the chosen photograph, for maintainer approval.

Alt text is rewritten because the current strings are assertions in
`tests/interactions.test.ts:273-282` — `"A cross against the sky"` (`:273`, unchanged per
§4.5), `"Congregation"` (`:276`), `"Hands resting on an open Bible"` (`:279`), and
`"People holding hands in prayer"` (`:282`).

Sources are read from `~/Desktop/kccf`. Only the selected photographs are copied into
`static/images/`; the 6.6 GB working set never enters the repository.

## 11. Styling

New rules in `src/input.css`, mirrored into `static/style.css` by `bun run css:build`. The
shipped file is never hand-edited.

- `.past-event-card` — muted treatment so past events do not compete visually with
  upcoming ones. Achieved with existing tokens only: reduced emphasis on the eyebrow and a
  softer border. **No new colour, spacing, or type scale is introduced.**
- `.event-recap` — the recap line inside a card.

`.event-location` already exists at `input.css:1330-1335` and is reused unchanged. No new
grid class: `.card-grid-three` already provides the three-column layout and its 40rem
breakpoint.

`tests/stylesheet.test.ts` parses both `src/input.css` and the shipped
`static/style.css`, so the new classes must be asserted in both. `bun run check` runs
`css:build` before `test` for exactly this reason.

## 12. Testing

| File | Change |
|---|---|
| `content.test.ts:87-89` | Replace `expect(events).toEqual([])` with: `events` has 9 entries; both `upcoming` and `past` are non-empty; no duplicate titles; `upcomingEvents` and `pastEvents` partition `events` exactly (`length`s sum, no overlap); `pastEvents` is newest-first as authored; `formatEventSchedule` returns `"November 2026"` for a date-only event and `"Date to be announced"` when both fields are absent; every past event that has a `date` carries one in `Month D, YYYY` form |
| `pages.test.ts:122-131` | Update `expectInOrder` chain: "Featured Events" → "Upcoming Events", drop the empty-state strings, add "Past Events". Assert at least one upcoming and one past title render, and that no past title appears in the home teaser |
| `pages.test.ts:37,47` | Home page: "Upcoming Events" heading retained; the `No upcoming events` assertion at `:47` is removed, since upcoming events now exist |
| `routes.test.ts:81-93` | `past-events-title` resolves and is unique — no edit needed, but the new section is what it now checks |
| `assets.test.ts` | §10.1 dimension corrections; §10.2 new rungs. `imageFiles` (`:7-15`) loses `prayer-fellowship.jpg`, `worship-moment.jpg`, and `hero.jpg`; `generatedVariants` (`:17-31`) gains `hero-2400` |
| `interactions.test.ts:273-282` | Alt texts for `hero`, `worshipMoment`, `bibleStudy`; `prayerFellowship` per §10.2 |
| `components.test.ts` | Event cards now emit `card event-card`; the `Card` srcset assertion at `:283-294` covers them |
| `stylesheet.test.ts` | `.past-event-card` and `.event-recap` in both `src/input.css` and `static/style.css` |
| `browser.test.ts` | No change. No new interaction, so the real-Chrome smoke is untouched |

## 13. Open items for the maintainer

None of these block implementation; the build is verifiable without them.

1. **Praise Night vs the 2025 Anniversary.** Treated as two gatherings one day apart
   (2025-09-19 and 2025-09-20) because the photographs split cleanly on that date. Merge
   them if they were one event.
2. **Event copy.** Recap lines and richer descriptions for all nine events. Only the 2026
   theme (*Harvest of Abundance*) is grounded in observed data (§4.6).
3. **Specific future dates.** Carol Service and I AM Revival have none; Women's Anniversary
   and Christmas Service have months only.
4. **Event photography and the gallery page.** Deliberately deferred (§3). The candidate
   shortlist from §10.2 step 1 is reusable when that work starts.
5. **Coordination with the sermon recordings spec.** That spec is written but **not
   implemented** — there is no `src/content/sermons.generated.json` and no `resolveSermons()`.
   It also edits `src/content/types.ts` and `src/content/sermons.ts`. Implementing both in
   sequence will need a merge decision on `types.ts`, since this spec replaces
   `FeaturedEvent` and that one rewrites `Sermon`.

## 14. Risks

| Risk | Mitigation |
|---|---|
| A past event is mislabelled `upcoming` | `content.test.ts` asserts the two arrays partition `events` exactly; the rendered order is asserted in `pages.test.ts` |
| An event is never promoted from `upcoming` to `past` | Inherent to the chosen design and accepted deliberately. It is an editorial act, and unlike a `Date.now()` comparison it can never happen silently or wrongly at 00:00 in the wrong timezone |
| Losing the 22 MB of originals is noticed | `git show 9371ebb` still contains them, so recovery is a single checkout. Nothing references them after §10.1 |
| `hero` looks soft at very wide viewports | `hero` keeps a 2400w top rung for exactly this reason; it is the only `sizes: 100vw` asset |
| An image with an EXIF rotation tag yields swapped dimensions | §9 step 3 warns; `assets.test.ts:167-175` fails loudly regardless |
| Chosen photographs are technically sound but compositionally poor | The maintainer makes the final selection from a shortlist; the agent never chooses unilaterally |
| Photo shortlist work is skipped under time pressure | The shortlist is a by-product of §10.2 step 1 and is reusable for the deferred gallery page (§13, item 4) |
