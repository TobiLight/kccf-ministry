# CLAUDE.md

This file provides guidance for working in this repository.

## Project overview

KCCF is a lightweight public website built with Bun, Hono, TypeScript, and Tailwind CSS v4. The application is stateless and does not persist user data. It serves the health endpoint, static files, and the public pages for home, about, ministries, sermons, events, leadership, and contact.

## Common commands

- `bun run dev` - Start the development stack (Tailwind watcher plus hot-reloading server)
- `bun run build` - Bundle the application for production
- `bun run start` - Run the production bundle from `dist/`
- `bun test` - Run the Bun test suite
- `bun run type-check` - Run the local TypeScript compiler once
- `bun run css:build` - Build Tailwind CSS to `public/static/style.css`
- `bun run dev:server` - Start only the hot-reloading server
- `bun run css:watch` - Watch and rebuild CSS
- `bun run image:variants` - Regenerate an image width ladder and print the paste-ready `srcset`
- `bun run check` - Run type checking, CSS build, tests, and application build

`check` is ordered `type-check -> css:build -> test -> build` on purpose: the stylesheet tests assert against the shipped `public/static/style.css`, so CSS must be regenerated before they run.

The `type-check` script uses the local `typescript` dependency through `bunx tsc`.

## Package manager

Bun is the only supported package manager and `bun.lock` is the only lockfile. Do not add `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`; the Docker build installs with `bun install --frozen-lockfile`.

## Architecture

- `src/index.ts` exports `createApp()` and the singleton `app`. It installs Hono's `secureHeaders()` middleware, configures `serveStatic` for `/static/*`, and preserves Bun's `{ port, fetch }` default export.
- `src/routes/index.ts` exports `configureRoutes(app)`, the single seam for registering public routes.
- `src/components/ui/` holds the shared presentation components: `PageHero`, `Card`, `ButtonLink`, `Icon`, and `SectionHeading`.
- `src/input.css` contains the Tailwind source configuration, design tokens, and the `--animate-*` theme tokens. The custom bounce keyframe is `soft-bounce` (utility `animate-soft-bounce`) so it never shadows Tailwind's own `animate-bounce`.
- `scripts/dev.ts` is the development supervisor: it spawns the Tailwind watcher and `bun run --watch src/index.ts`, forwards `SIGINT`/`SIGTERM`/`SIGHUP`, and stops both children when either exits. Keep it dependency-free.
- `scripts/image-variants.ts` regenerates image width ladders with the system `ffmpeg` and prints a paste-ready `srcset` literal plus the real `width`/`height` read back off disk. It is the only sanctioned way to change an image ladder: `tests/assets.test.ts` compares declared dimensions against real JPEG header bytes, so a hand-written guess fails there. For each asset the bare `<name>.jpg` is the largest local file and leads the ladder, so request only widths narrower than `--src-width`; an existing bare file is a hard error unless you pass `--force`, whatever width it turns out to be, because the script refuses unconditionally to overwrite the one output it cannot re-derive. It also refuses to upscale.
- Both the supervisor and `css:watch` pass `--watch=always`. The Tailwind CLI exits when stdin closes unless `always` is set, so plain `--watch` dies after a single build in containers and non-interactive shells.
- `tests/support/browser.ts` is a minimal Chrome DevTools Protocol client used by the real-browser smoke suite; `tests/browser.test.ts` runs when a Chrome or Chromium binary is discoverable; otherwise `describe.skipIf` skips the suite and a single `console.warn` names the reason and the `KCCF_CHROME_PATH` override, so a missing Chrome is visible instead of falsely green.
- `public/static/` contains generated CSS, the vendored Datastar runtime, and site assets. It is committed, because Vercel runs no build step and the CDN serves `public/**` directly.
- `vercel.json` is the Vercel deployment config, and Vercel is a second supported target alongside Docker, not a replacement. Vercel has zero-configuration Hono support: it detects `src/index.ts` and serves that file's default export, so no `api/` directory and no catch-all rewrite exist.
- `vercel.json` is the Vercel deployment config, and Vercel is a second supported target alongside Docker, not a replacement. It deliberately sets **no `framework`, no `buildCommand`, and no `outputDirectory`**, and `tests/tooling.test.ts` fails if any returns. None of this is an oversight and none of it may be "fixed" by filling a key in. The Framework Preset lives in Project Settings and **must be `hono`**; it is not in the repository, so nothing here can enforce or repair it. This project was created as a Vite app, and that stale preset is what produced both symptoms: Vite's output directory is `dist`, so the build failed with `No Output Directory named "dist" found after the Build completed`, and once the build completed Vercel served the `dist/index.js` that the `build` script creates as the home page — a 200 with `Content-Type: application/javascript` showing the raw bundle, while `/static/*` and `/health` 404 because a Vite build produces no Hono function. The build reports success throughout. Because no Vercel build produces the assets, every one a visitor loads has to be committed under `public/`.
- The two obvious repo-level "fixes" for the `dist` error make the site worse and must never be added. `"outputDirectory": null` silences the error without moving the static output: an empty Output Directory tells Vercel to skip the build and serve the project as static files, which is the state where the home page is a `.js` file. `"framework": "hono"` papers over the dashboard setting, so the wrong preset persists unnoticed and reappears the moment the key is removed. The `package.json` `build` script *does* still run on Vercel, as part of the Hono build rather than as an override (`considerBuildCommand: true` in `@vercel/hono`); that is expected, and it is why a `dist/index.js` sits in the build workspace waiting to be served by mistake whenever the preset is wrong.
- `tsconfig.json` sets `"types": []` and **`src/` must type-check with no ambient type declarations at all**. `@vercel/hono` transpiles `src/` with a tsconfig it writes to a temp directory which `extends` this one, and type libraries named in `compilerOptions.types` resolve relative to the config that declares them — so from `/tmp` TypeScript searches `/tmp/node_modules`, never reaches this project's, and the build dies with `TS2688` before transpiling anything. The Hono build sets `EXPERIMENTAL_NODE_TYPESCRIPT_ERRORS=1`, making that fatal rather than a warning. `URL` therefore comes from the `DOM` lib, which is where a web standard belongs, and `src/index.ts` reads `PORT` through a cast instead of the bare `process` global (which is equally undeclared there, TS2591). Bun's types are isolated in `tsconfig.typecheck.json`, which only `bun run type-check` uses, because `tests/` import `bun:test` and call `Bun.serve`. That is why `type-check` passes `-p tsconfig.typecheck.json`; adding `"types": ["bun-types"]` back to `tsconfig.json` looks harmless and breaks the Vercel build.
- The `package.json` `build` script still runs on Vercel, as part of the Hono build rather than as an override, so a `dist/index.js` exists in the build workspace. It is harmless while the Output Directory is clear, and it is the reason the failure above is not obvious.
- `bunVersion` is `1.x`, not a full version: Vercel manages the minor and patch itself. `tests/tooling.test.ts` asserts the major matches the `oven/bun:1.3.14` base image the `Dockerfile` uses, so the container and the function cannot silently drift onto different Bun majors.
- Hono's `serveStatic({ root: "./public" })` resolves `/static/*` under `public/static`, which is the same tree Vercel's CDN serves from the project root. That is deliberate: one committed tree, no mirroring step, and no generated directory that could drift from the source. The `/static/` URL prefix is identical on both targets, so no path, component, or test moves between them. The consequence is that CDN-served assets never pass through `secureHeaders()`, so the header assertions in `tests/routes.test.ts` describe the Hono and Docker path only.
- The image ladder filenames are not content-addressed, so `Cache-Control` for `/static/images/` is a one-day TTL with `stale-while-revalidate` and must never be `immutable`: regenerating a ladder keeps the URL, so `immutable` would pin a replaced photograph to a visitor for a year. `style.css` and `datastar.js` are `must-revalidate`, because `style.css` is recompiled from `src/input.css` and committed, so a deploy can change it.
- `public/static/style.css` is compiled output that is also the source of truth for the deployment. Run `bun run css:build` (or `bun run check`, which builds CSS before the tests) after editing `src/input.css` and commit the result; a stale committed stylesheet is the one way this site can ship without the CSS its tests assert on.
- `public/static/images/` contains the local JPEG assets plus generated width-descriptor variants: `about-640/1024/1600/2400.jpg` and `hero-640/1024/1600.jpg`, `about`'s top rung is `about-2400.jpg`, so its bare `about.jpg` is the no-`srcset` fallback rather than a ladder entry, while `worship-moment` and `prayer-fellowship` have only `worship-moment-640/1024.jpg` and `prayer-fellowship-640/1024.jpg` — their bare files *are* the 1600 rung, so no `-1600.jpg` file exists for them. Declared dimensions in `imageAssetMap` must match the real JPEG headers; `tests/assets.test.ts` enforces that.
- `src/content/site.ts` owns image metadata. Add `srcset`/`sizes` to the asset and resolve them with `getImageSource(src, sizes?)` rather than hardcoding paths in a component. For each asset, `src` is the largest local file for that asset. It is listed in the asset's `srcset` only when no wider derivative exists, as with `hero`; otherwise the widest derivative leads the ladder and `src` is the no-`srcset` fallback, as with `about`. `tests/assets.test.ts` pins `hero`'s full ladder and `about`'s `src`. Never ship a full-resolution original as a `src` when a 1600w derivative is available — a 6000×4000 original is over 10 MB. Generate ladders with `bun run image:variants <source> <base-name>`, which defaults to writing into `public/static/images` and prints the paste-ready `srcset` literal and the real `width`/`height` read back from the generated files.
- `tests/stylesheet.test.ts` parses both `src/input.css` and the shipped `public/static/style.css` and asserts the responsive grid, marquee, motion, contact-strip, and past-event treatment contracts, including that `.past-event-card:hover` follows `.card:hover` so the muted treatment wins the cascade.
- `src/content/site.ts` owns image metadata. Add `srcset`/`sizes` to the asset and resolve them with `getImageSource(src, sizes?)` rather than hardcoding paths in a component.
- `src/content/sermon-feed.ts` is the pure seam for sermon video data: Atom parsing, title and speaker derivation, multi-part grouping, `resolveSermons()`, and `formatSermonDate()`. It performs no I/O, so the sync script and the test suite share it.
- `parseFeed()` validates every video id against `/^[A-Za-z0-9_-]{6,}$/` and throws on a malformed one, rejecting the whole feed. This is a security control, not a cosmetic filter: the id is interpolated into a Datastar expression that Datastar compiles with the `Function` constructor, so an unvalidated id is an injection vector. `SermonPlayer` and `SermonArchive` additionally escape it with `JSON.stringify`. Never relax the pattern, and never interpolate a video id into a Datastar expression without both defences.
- `parseFeed()` validates `<published>` the same document-wide way, and `usableCalendarDate()` is the single definition of a usable `YYYY-MM-DD` value for all three consumers: `parseFeed()`, `resolveSermons()`, and `formatSermonDate()`. This is an availability control, not cosmetics. A missing or unparseable `<published>` used to be committed once as `publishedAt: ""` and then threw `RangeError` inside `Intl.DateTimeFormat` on every later page render, so a single bad entry 500'd `/sermons` until the snapshot was deleted by hand. `formatSermonDate()` is total — it returns the raw string rather than throwing — and `resolveSermons()` leaves a dateless snapshot entry out of the page list while `buildSnapshot()` still preserves it, so the union stays add-only.
- `src/content/sermons.ts` is the curated archive of record and is unlimited. `src/content/sermons.generated.json` is the committed feed snapshot. `resolveSermons()` merges them curated-first and sorts newest-first, so for the same video id the hand-written title and summary always win and the feed only ever adds.
- `bun run sermons:sync` is the only thing that touches the network, and only when a human runs it. It union-writes the snapshot and contains no code path that removes an entry, so a failed fetch physically cannot empty the archive. It exits non-zero and writes nothing on a non-200 status, an unparseable document, a feed with no entries, entries yielding no usable video id, a feed entry with no usable published date, a feed for another channel, or a committed snapshot that exists but cannot be read or cannot be parsed — including one whose `entries` array holds something that is not a usable entry. That last group matters most: an unreadable snapshot must never be mistaken for an absent one, or the next run would reseed from just the feed window and silently destroy every sermon older than five days. Only `ENOENT` counts as absent. Treat `src/content/sermons.generated.json` as generated output and never hand-edit it; repairing it is the sync script's job, and a careless edit there is exactly how history gets destroyed.
- `needsCuration` is a maintainer prompt and never renders. `SermonArchive` emits `.sermon-row-flag` as a class-only hook on a flagged row, with no visible text: the spec's "small label" wording from §6.1 is superseded, because fourteen "needs curation" labels on a church website read as broken to a visitor. The maintainer signal lives in the `needsCuration` field and in the `bun run sermons:sync` report. Keep the class and its correlation with `needsCuration` — the stylesheet and page tests assert it — and keep `.sermon-row-flag:empty { display: none }` so the empty hook renders nothing.
- The YouTube feed exposes roughly the last fifteen uploads, which for this channel is about five days. It is a tripwire for "did we miss a service", not an archive, and it will not supply the back catalogue. Everything older must be curated into `src/content/sermons.ts` by hand, which is why the site currently shows no sermons from before that window.
- YouTube `playlist_id` feeds return HTTP 404, so `site.youtube.playlistId` is intentionally empty. A curated YouTube playlist is still worth creating for the congregation on YouTube itself, but it must never become a sync input.
- The sermon player is a click-to-load facade: no YouTube JavaScript loads until a visitor presses play. The featured sermon is the newest entry that has a `youtubeId`, never the newest sermon overall — the curated entries carry Facebook links rather than video ids, so featuring the newest overall would show a "coming soon" note where a video belongs. Every YouTube archive row also carries a plain "Watch on YouTube" link, because the play button does nothing without JavaScript.
- `tests/interactions.test.ts` covers rendered Datastar contracts, the motion utilities, and the accessibility audit.
- `tests/assets.test.ts` verifies local image routes and the responsive variants are valid JPEGs.

## Security headers

`createApp()` applies `secureHeaders()` to every response with a same-origin content security policy: `style-src 'self' https://fonts.googleapis.com`, `font-src 'self' https://fonts.gstatic.com`, `img-src 'self' data: https://i.ytimg.com`, `connect-src 'self'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, and `script-src-attr 'none'`.

`script-src` is `'self' 'unsafe-eval'`, and that is the single deliberate relaxation. Datastar compiles its expressions with the `Function` constructor, which is the framework's documented requirement, so the evaluator is confined to `script-src` and asserted to be absent from `script-src-attr` and every other directive. Never introduce inline scripts, inline event handlers, or a nonce that only pretends the evaluator is gone. The page loads the vendored runtime as `<script type="module" src="/static/datastar.js">`; it is an ES module, and a classic script tag makes every interaction fail silently.

`frame-src 'self' https://www.youtube-nocookie.com` follows the same discipline, and `https://www.youtube-nocookie.com` and `https://i.ytimg.com` are the only third-party hosts any directive names, and each appears in exactly one directive: the embed host in `frame-src`, the thumbnail host in `img-src`. The thumbnail host serves sermon artwork for the highlights row only — it can never supply a script, a frame, or an XHR target, and `tests/routes.test.ts` asserts that confinement. The thumbnail host was accepted so the highlights row could be built from the live feed instead of a hand-written list; the cost is that the `/sermons` page now depends on a third-party CDN for card images, which is why the browser smoke suite waits for `DOMContentLoaded` rather than `load`.

The embed host exists solely for the sermon player's iframe, which is a separate browsing context governed by YouTube's own policy, so the parent document's `script-src` and `connect-src` are untouched. That isolation is precisely why the player is a click-to-load facade rather than the Facebook SDK, whose inline `fbAsyncInit` script would have required a nonce *and* a `connect.facebook.net` allowance — two policy changes instead of one. Keep using `youtube-nocookie.com` and never `www.youtube.com`, so a visitor is not cookied by an embed they may not play.

## Content and behaviour

The contact form is frontend-only. It has a `POST` action as an intrinsic no-GET guard, but the vendored Datastar submit listener prevents the request, uses native required/type validation, and transitions through local loading and preview-complete signals without persistence or transmission. Form controls intentionally have no `name` attributes so an accidental fallback submission cannot transmit PII. Its signals are namespaced under `$contact.*` so they cannot collide with the header's `$menuOpen` and `$marqueePaused`.

The mobile menu uses `$menuOpen` with `data-show`, valid reactive ARIA attributes, link close behavior, and Escape-to-close with focus restoration. The service marquee starts in motion (`marqueePaused: false`); its control keeps one static accessible name, "Pause or play service times", that contains both visible labels ("Pause" and "Play") so WCAG 2.5.3 label-in-name holds in either state, and it maps `aria-pressed` from the signal. The `.service-marquee` wrapper carries no `aria-label`: the visually hidden summary holds the service times and the duplicated visual sequences stay `aria-hidden`. It pauses on hover or focus, keeps running while the toggle itself is hovered or focus-visible, and both the animation and the control are disabled under `prefers-reduced-motion`. The marquee clearance padding belongs on `.marquee-sequence`, not `.service-marquee-track`, so the track stays exactly two sequence widths and the `-50%` keyframe is seamless. Adding a third sequence requires changing the keyframe to `-33.33%`.

Page heroes and thumbnails emit intrinsic dimensions from the shared image metadata map and use `srcset`/`sizes` where the asset defines variants, keeping the full-size `src` as the fallback. Card thumbnails use empty alt text when their titles carry the meaning. Unknown routes render the custom 404 page without marking any navigation item as current.

The canonical address lives in `src/content/site.ts` and is reused by the header, footer, contact page, and the derived Google Maps search URL:

```
13-17 Taiwo Akinsulire Street, Off Taiwo Ajakaiye Street, Foursquare bus stop, Ikotun-Ikosi Road, Ikotun, Lagos, Nigeria
```

### Events

`src/content/events.ts` owns a single `events: ChurchEvent[]` array plus two derived
selectors, `upcomingEvents` and `pastEvents`. The `/events` page and the home teaser must
read those selectors and never filter `events` themselves.

`ChurchEvent.status` is `"upcoming" | "past"` and is **hand-set**. It is never derived by
comparing `date` to the clock. The codebase has no date parsing at all: `date` and `time`
are human display strings such as `"September 20, 2026"`, written to be printed and never
parsed, which the ECMAScript spec does not guarantee for `new Date()`. A `Date.now()`
comparison would also reclassify events silently at an arbitrary hour, in the wrong
timezone — Lagos is UTC+1 while the copyright year in `site-footer.tsx` uses
`getUTCFullYear()`. Promoting an event from `upcoming` to `past` is a deliberate editorial
edit to `events.ts`, and the shipped content is the record of that decision.

Two of the four upcoming events have no announced date, so `date` and `time` are both
optional. Always render a schedule through `formatEventSchedule()`, which returns
`"Date to be announced"` when neither is set. Never interpolate `event.date` directly.

Events carry no image, no photograph gallery, and no slug. A dedicated photo gallery page
is deliberately deferred; do not add those fields speculatively.

## Static assets and routes

Static files are served through `/static/*` from the committed `public/static/` tree, so `public/static/datastar.js` is available at `/static/datastar.js`; on Vercel the CDN serves that same tree. `public/static/datastar.js` must not end in a `//# sourceMappingURL=` comment and no `datastar.js.map` may be added: Chrome devtools would request a map that is not shipped, and `tests/assets.test.ts` plus the browser smoke both fail on it. The current application routes are `GET /health`, `/`, `/about`, `/ministries`, `/sermons`, `/events`, `/leadership`, and `/contact`.

## Docker

The Dockerfile is pinned to `oven/bun:1.3.14-alpine` and exposes `dependencies`, `build`, `development`, and `production` stages. The build stage copies `tsconfig.json` alongside `src/` and `public/` because Bun resolves the `~/*` path alias from it. The development stage carries source, `scripts/`, full dependencies, and the `public/` assets and runs `bun run scripts/dev.ts` directly, so the supervisor is PID 1's direct child and receives `SIGTERM` from the container runtime; the Compose service also sets `init: true` for reaping. The production stage carries only `public/` and the self-contained `dist/index.js` and runs as the non-root `bun` user. Both runtime stages declare a `HEALTHCHECK` against `/health`.

The development Compose configuration is pinned to the project name `kccf-ministry-dev` and host port 3000. It builds the `development` target and bind-mounts `src/`, `public/`, `scripts/`, and `tests/` while keeping dependencies in a named `node_modules` volume. It also read-only bind-mounts the repository-root files that `tests/tooling.test.ts` asserts against (`package.json`, `tsconfig.json`, `bun.lock`, `tsconfig.typecheck.json`, `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml`, `.gitignore`, `.dockerignore`), so `docker compose exec app bun test` exercises the same files the host does:

```bash
docker compose up --build
```

`docker-compose.prod.yml` is standalone, not an override: it builds the `production` target, starts `bun dist/index.js`, and declares no volumes, so it needs no `!reset` and works on any Compose version. It is pinned to the project name `kccf-ministry-prod` and host port 3001:

```bash
docker compose -f docker-compose.prod.yml up --build
```

The distinct top-level `name` values are what guarantee the two stacks can run side by side without Compose treating them as the same project and silently recreating each other's containers. Verify both with:

```bash
docker compose up -d && docker compose -f docker-compose.prod.yml up -d
curl -i http://127.0.0.1:3000/health
curl -i http://127.0.0.1:3001/health
docker compose down -v && docker compose -f docker-compose.prod.yml down -v
```

Never merge the production file with `docker-compose.yml`; the development bind mounts would then be applied to the production runtime.
