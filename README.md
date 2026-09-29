# KCCF Ministry Public Site

A lightweight public website for KCCF Ministry, built with Bun, Hono, TypeScript, and Tailwind CSS. The site uses server-rendered components and static assets.

## Stack

- **Runtime**: Bun (the only supported package manager; `bun.lock` is the single lockfile)
- **Web framework**: Hono
- **Language**: TypeScript with JSX support
- **Styling**: Tailwind CSS v4
- **Frontend interaction**: Vendored Datastar v1.0.0-RC.7 in `public/static/datastar.js`
- **Persistence**: None

This is a stateless public site. It does not persist user data.

## Routes

The application exposes:

- `GET /health` - Health check used by container orchestration
- `/` - Home and worship invitation
- `/about` - Calling, beliefs, story, and leaders
- `/ministries` - Six ministry opportunities
- `/sermons` - Recent messages and Facebook viewing links
- `/events` - Weekly services, the monthly Transformation Night, upcoming events, and past events
- `/sermons` - Featured player, curated highlights, and a year-grouped archive of recorded messages
- `/events` - Weekly services, the monthly Transformation Night, and featured events
- `/leadership` - Pastoral and ministry leadership
- `/contact` - Contact details, visit information, and frontend-only form
- `/static/*` - Files served from the committed `public/static/` tree
- Unknown routes - Rendered 404 page with status 404

Route composition belongs in `src/routes/index.ts`, where `configureRoutes(app)` registers the Hono handlers.

The contact form is frontend-only; no server-side persistence is configured. Its `POST` action is an intrinsic progressive-enhancement guard, form controls have no `name` attributes, and the vendored Datastar runtime prevents the request so entered values cannot be transmitted. The page labels this as a preview and directs visitors to call or email instead.

## Contact details

The canonical address lives in `src/content/site.ts` and is used everywhere:

```
13-17 Taiwo Akinsulire Street, Off Taiwo Ajakaiye Street, Foursquare bus stop, Ikotun-Ikosi Road, Ikotun, Lagos, Nigeria
```

`site.contact.mapsUrl` is derived from that same string through a Google Maps search URL, so the address and the map link can never drift apart.

## Security headers

`createApp()` installs Hono's `secureHeaders()` middleware for every response. The content security policy is same-origin except for two YouTube hosts: styles load from `'self'` plus `https://fonts.googleapis.com` for the stylesheet and `https://fonts.gstatic.com` for the web fonts, images from `'self' data:` plus `https://i.ytimg.com` for sermon thumbnails, connections from `'self'`, and `frame-src 'self' https://www.youtube-nocookie.com` for the sermon player's embed. `frame-ancestors 'none'` and `X-Frame-Options: DENY` block framing, and `X-Content-Type-Options: nosniff` plus `Referrer-Policy: strict-origin-when-cross-origin` are set alongside it.

The `frame-src` and `img-src` exceptions are each scoped as tightly as the script relaxation below. Sermon thumbnails are the one place a third-party CDN supplies page content. The sermon player is a click-to-load facade, so the embed is a separate browsing context governed by YouTube's own policy and no YouTube JavaScript reaches the parent document — which is why `frame-src` was the only directive the feature needed, rather than the nonce plus `connect.facebook.net` allowance an embedded Facebook SDK would have demanded.

Scripts are the one deliberate relaxation. Datastar compiles every `data-on:*`, `data-bind`, `data-show`, and `data-attr:*` expression with the `Function` constructor at runtime, which is the framework's documented requirement (see [Datastar security](https://data-star.dev/reference/security)), so the policy is:

```
script-src 'self' 'unsafe-eval'; script-src-attr 'none'
```

The tradeoff and its boundaries:

- `'unsafe-eval'` is present **only** in `script-src`. It is absent from `script-src-attr`, `default-src`, and every other directive, and `tests/routes.test.ts` asserts that exact composition so the relaxation cannot spread.
- There is still no `'unsafe-inline'`, so the only executable script on every page is the same-origin `/static/datastar.js`, loaded as `<script type="module" src="/static/datastar.js">`. The vendored bundle is an ES module; loading it as a classic script fails to parse and silently kills every interaction.
- No nonce is used to fake away the evaluator. A nonce-based `data-nonce` CSP mode would still allow `Function` inside already-trusted Datastar code, so it would add no protection while implying a stricter policy than the site actually has.
- `tests/browser.test.ts` fails the build if the module ever stops loading cleanly, which is the only regression that would silently remove all page interactivity.

## Project structure

- `src/index.ts` - Testable Hono application factory, security headers, static file middleware, and Bun server entry point
- `src/routes/index.ts` - Public route composition seam
- `src/components/pages/` - Server-rendered public page components
- `src/components/ui/` - Shared presentation components (hero, card, button, icon, section heading)
- `src/content/` - Typed site, ministry, sermon, event, and leadership content
- `src/input.css` - Tailwind source styles and design tokens
- `public/static/` - Generated CSS, the vendored Datastar runtime, and browser assets
- `public/static/images/` - Local JPEG assets plus the generated responsive variants
- `scripts/dev.ts` - Dependency-free development supervisor that runs the Tailwind watcher and the watched server together
- `tests/` - Bun application, asset, stylesheet, component, interaction, route, accessibility, tooling, and real-browser tests

## Responsive images

Four assets ship a width-descriptor ladder. `about` is the only one whose full-size file is
genuinely large; the other three are already under half a megabyte. The dimensions below were
read back off the JPEG headers with `ffprobe`:

| asset | full-size file | declared size | on-disk size | variants in the ladder |
| --- | --- | --- | --- | --- |
| `about` | `about.jpg` | 4389x3292 | 1.3 MB | 640, 1024, 1600, 2400 |
| `hero` | `hero.jpg` | 2048x1366 | 420 KB | 640, 1024, 1600, plus the full-size file (full-bleed home hero, `sizes="100vw"`) |
| `worshipMoment` | `worship-moment.jpg` | 1600x1066 | 166 KB | 640, 1024, plus the full-size file |
| `prayerFellowship` | `prayer-fellowship.jpg` | 1600x1066 | 311 KB | 640, 1024, plus the full-size file |

`worship-moment` and `prayer-fellowship` have no `-1600.jpg` file: their bare file *is* the
1600 rung. Ladders are listed ascending by descriptor, and a full-size file is listed in a
ladder only when no wider derivative exists, which is the `hero` case.

`srcset` and `sizes` are declared once per asset in the `imageAssetMap` in `src/content/site.ts`.
`getImageSource(src, sizes?)` resolves an asset into `{ src, srcset, sizes, width, height }`, and
`PageHero`, `Card`, and the editorial images use it, so a browser that understands `srcset` never
downloads a 4389px `about` original.

**Regenerate a ladder with `bun run image:variants`, not by hand.** It refuses to upscale, refuses
to overwrite a full-size file without `--force`, dedupes repeated `--widths`, and prints a
paste-ready `srcset` literal sorted ascending plus the real `width`/`height` read back from the
files it just wrote. The sizes it prints are already checked against the real JPEG headers by
`tests/assets.test.ts`, so a hand-written command that guesses a dimension fails the suite.

```bash
bun run image:variants public/static/images/hero.jpg hero --widths 640,1024,1600 --src-width 2048 --force
```

Do not hand-roll an `ffmpeg` invocation: the committed variants are written at `-q:v 4` and
reproducing them at `-q:v 2` while also stripping metadata yields a file about 56% larger than the
one in the repository.

## Interactions and accessibility

The mobile navigation uses Datastar signals for its menu, valid reactive ARIA state, link-close behavior, and Escape-key close with focus restoration. The service marquee starts in motion and its control is a real toggle: the visible label switches between "Pause" and "Play" while the accessible name stays static ("Pause or play service times"), so it satisfies WCAG 2.5.3 Label in Name in both states, and `aria-pressed` is mapped from the `$marqueePaused` signal. The marquee itself carries no `aria-label`; a visually hidden summary holds the service times, and the duplicated visual sequences stay `aria-hidden`. It pauses on hover or focus (WCAG 2.2.2), resumes while the toggle itself is hovered or focus-visible, and stops entirely under `prefers-reduced-motion`, where the control is also hidden. The marquee clearance padding lives on `.marquee-sequence` rather than the track, so the track is exactly two sequence widths and the `-50%` loop is seamless.

Contact form state is scoped to a `$contact` signal object so it can never collide with the header's `$menuOpen` and `$marqueePaused` signals. The submit handler clears the fields with a native `el.reset()` in the same tick that flips to the success state, so the "your message was cleared" copy stays true.

Page heroes and thumbnails emit intrinsic dimensions from the image metadata map; card thumbnails use empty alt text when their adjacent title carries the meaning. The header and footer both brand with the circular logo alone, so each brand link is named by its image's `alt` text, "KCCF Ministries", which `imageAssetMap` owns for both rather than either component hardcoding its own string, and with no visually hidden text span alongside the logo, which would name the link twice. The skip link names itself once through its own text. Section headings and heroes use the `animate-fade-up`, `animate-fade-in`, and `animate-soft-bounce` theme utilities, which use `backwards` fill so a disabled or reduced-motion animation can never leave content at `opacity: 0`. The custom keyframe is named `soft-bounce` so it cannot collide with Tailwind's own `animate-bounce` utility. Social routes do not emit relative Open Graph image metadata.

## Development

Bun is the only supported package manager:

```bash
bun install
```

Start the development stack:

```bash
bun run dev
```

`dev` runs `scripts/dev.ts`, a dependency-free supervisor that starts the Tailwind watcher (`src/input.css` -> `public/static/style.css`) and the watched Bun server together, forwards `SIGINT`, `SIGTERM`, and `SIGHUP` to both, and stops the whole group as soon as either process exits. That is the same command the development container runs, so the container and the workstation always behave identically.

Both watchers must be started with `--watch=always` (and `css:watch` does the same). Plain `--watch` makes the Tailwind CLI exit as soon as stdin reaches end-of-file, which is immediate in a container or any non-interactive shell, so the watcher silently dies after one build.

The server listens on `PORT`, defaulting to `3000`. The individual pieces remain available:

```bash
bun run dev:server   # only the watched server
bun run css:watch    # only the Tailwind watcher
```

## Verification and production build

```bash
bun test
bun run type-check
bun run css:build
bun run build
bun run check
```

`tests/browser.test.ts` is a real-browser smoke suite: it serves the app on an ephemeral port, launches the headless Chrome already installed on the machine with a throwaway profile, and drives the page over the DevTools protocol. It asserts that the Datastar module loads without any page or console error (no `EvalError`, no `Unexpected token`, no CSP violation), that the mobile trigger toggles `aria-expanded` and the menu, that the marquee toggle flips `aria-pressed`/`is-paused` and its visible label, that the contact form never issues a `POST` while disabling the button and then reporting success, and that the header branding, favicon, and skip link are named once. No browser framework is involved; `tests/support/browser.ts` is a small dependency-free CDP client. The browser smoke runs when a Chrome or Chromium binary is discoverable; otherwise it skips and prints a warning naming the reason (no discoverable Chrome or Chromium binary) and the `KCCF_CHROME_PATH` override that makes it run, so a skipped run is never silently green. The suite also asserts that the page never requests a `.map` file, so the vendored runtime cannot start dangling source-map fetches.

`bun run check` runs the type check, **CSS build**, tests, and application build in that order. Building CSS before the tests means the stylesheet assertions always run against freshly generated CSS and can never ratify a stale `public/static/style.css`.

Build and run the production output locally:

```bash
bun run build
bun run start
```

## Docker

The Dockerfile is pinned to `oven/bun:1.3.14-alpine` and has four stages:

- `dependencies` - installs from `bun.lock` with `--frozen-lockfile`
- `build` - adds `tsconfig.json`, `src/`, and `public/`, then compiles CSS and bundles the app
- `development` - source, scripts, full dependencies, and static assets, running the `bun run dev` supervisor (Tailwind watcher plus watched server) on port 3000
- `production` - only `public/` and the self-contained `dist/index.js`, running as the non-root `bun` user

Both runtime stages declare a `HEALTHCHECK` against `/health`.

Run the development container (source, scripts, and public are bind-mounted, dependencies live in a named volume). The container supervises the Tailwind watcher and the server exactly like the local `bun run dev`, so editing `src/input.css` rebuilds `public/static/style.css` in place through the bind mount:

```bash
docker compose up --build
```

Run the production container:

```bash
docker compose -f docker-compose.prod.yml up --build
```

The two files are independent, standalone configurations, not overrides, and they are pinned to distinct Compose project names and host ports so they never collide:

| file | project name | host port | container port |
| --- | --- | --- | --- |
| `docker-compose.yml` | `kccf-ministry-dev` | 3000 | 3000 |
| `docker-compose.prod.yml` | `kccf-ministry-prod` | 3001 | 3000 |

Because the project names differ, the two stacks can run at the same time without either one recreating the other's containers:

```bash
docker compose up -d && docker compose -f docker-compose.prod.yml up -d
curl -i http://127.0.0.1:3000/health   # development
curl -i http://127.0.0.1:3001/health   # production
docker compose down -v && docker compose -f docker-compose.prod.yml down -v
```

`docker-compose.prod.yml` declares no volumes at all, so nothing from the development bind mounts can leak into the production runtime, and it needs no `!reset`, so it works on any Compose version that supports the long-merge syntax. Do not merge it with `docker-compose.yml`.

The development stack also read-only bind-mounts the repository-root files that `tests/tooling.test.ts` asserts against (`package.json`, `tsconfig.json`, `bun.lock`, `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml`, `.gitignore`, and `.dockerignore`), so `bun test` inside the container checks the same files the host does:

```bash
docker compose exec app bun test
```

The production image needs no `node_modules`: `bun build --target bun` produces a self-contained bundle, so the runtime stage starts `bun dist/index.js` directly. `bun run start` remains available for running the same bundle locally.

## Vercel

Vercel is a second supported deployment target alongside Docker, not a replacement. Everything Vercel-specific lives in `vercel.json`; no component, route, or test changes between the two targets.

Vercel has zero-configuration support for Hono: it detects `src/index.ts` and serves the application from that file's default export. The existing `export default { port, fetch: app.fetch }` already has the `fetch` property Vercel reads, so it needed no modification. `port` is Bun's own server hint and is ignored off-platform.

### There is no build step

`vercel.json` deliberately sets **no `buildCommand`**, and sets **`outputDirectory` to `null`**. Vercel runs its own Hono build, and the docs are explicit that the zero-config path takes no build command.

Overriding `buildCommand` replaces Vercel's Hono build with an arbitrary command. Vercel then falls back to a generic static build, looks for its own default output directory, and the deployment fails with:

```
Error: No Output Directory named "dist" found after the Build completed.
```

`outputDirectory` needs to be an explicit `null` rather than merely absent, and this is the subtler half of the same failure. Vercel's Project Settings persists an **Output Directory** per project, and a stale `dist` left there outlives any `vercel.json` that is silent about it. `@vercel/hono` globs for the Hono entrypoint *inside* that directory rather than the project root, so it finds nothing and the build dies with the error above — even with no `buildCommand` anywhere. Setting `null` overrides the dashboard with "no output directory" and lives in the repository, so the fix survives anyone deploying without dashboard access.

If you ever see this error on a fresh deploy, check Settings → Build & Development Settings and clear the Output Directory field; `vercel.json` already overrides it, so this is only a fallback for a project whose settings are read some other way.

`tests/tooling.test.ts` asserts `buildCommand` is absent and `outputDirectory` is `null`, so neither can quietly come back.

That constraint is what shapes the asset layout. Because nothing runs at build time, every asset a visitor loads has to be committed.

### Static assets

Vercel serves `public/**` from its CDN and **ignores Hono's `serveStatic()`**. So the assets live in `public/static/`, committed, and Hono's `serveStatic({ root: "./public" })` serves the same tree locally and in the container. One tree, one mechanism, no mirroring step and no generated directory that could drift from the source.

The `/static/` URL prefix is identical on both targets, so no path, component, or test changes.

`public/static/style.css` is compiled output and is committed so Vercel can serve it without building. Run `bun run css:build` (or `bun run check`, which does it before the tests) after editing `src/input.css`, and commit the result. This is the one file in the tree that is both build output and source of truth for the deployment.

### Caching and headers

`vercel.json` sets `Cache-Control` for the assets. The stylesheet and the Datastar runtime are `must-revalidate`, so a deploy that recompiles the stylesheet is picked up immediately. The images get a one-day TTL with `stale-while-revalidate` rather than `immutable`, because the ladder filenames (`hero-640.jpg`) are not content-addressed: regenerating a ladder keeps the URL, so `immutable` would pin a replaced photo to a visitor for a year.

One consequence worth knowing: assets served by the Vercel CDN do not pass through `secureHeaders()`, so they carry Vercel's default response headers rather than this site's CSP. That is correct — the CSP governs documents, and a stylesheet or a module needs none — but it does mean the header assertions in `tests/routes.test.ts` describe the Hono and Docker path specifically.

### One-time setup

Import the repository on Vercel and connect it to Git for preview deployments on pull requests, or link it from the command line:

```bash
vercel link
vercel deploy --prod
```

`bun.lock` makes Vercel install with Bun, and `vercel.json` pins `installCommand` to `bun install --frozen-lockfile` so the deployed dependency tree is the committed one. `bunVersion` is set to `1.x`, which is the most Vercel accepts — it manages the minor and patch versions itself — and `tests/tooling.test.ts` asserts that major matches the `oven/bun:1.3.14` base image the `Dockerfile` uses. `regions` is set to `fra1`, the nearest Vercel region to Lagos.

`vercel dev` runs the same routing, headers, and asset serving locally before you ship. Note that the Bun *function runtime itself* is only exercised in production, so the first deploy is where that assumption gets tested.


