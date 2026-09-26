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
- `bun run css:build` - Build Tailwind CSS to `static/style.css`
- `bun run dev:server` - Start only the hot-reloading server
- `bun run css:watch` - Watch and rebuild CSS
- `bun run check` - Run type checking, CSS build, tests, and application build

`check` is ordered `type-check -> css:build -> test -> build` on purpose: the stylesheet tests assert against the shipped `static/style.css`, so CSS must be regenerated before they run.

The `type-check` script uses the local `typescript` dependency through `bunx tsc`.

## Package manager

Bun is the only supported package manager and `bun.lock` is the only lockfile. Do not add `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`; the Docker build installs with `bun install --frozen-lockfile`.

## Architecture

- `src/index.ts` exports `createApp()` and the singleton `app`. It installs Hono's `secureHeaders()` middleware, configures `serveStatic` for `/static/*`, and preserves Bun's `{ port, fetch }` default export.
- `src/routes/index.ts` exports `configureRoutes(app)`, the single seam for registering public routes.
- `src/components/ui/` holds the shared presentation components: `PageHero`, `Card`, `ButtonLink`, `Icon`, and `SectionHeading`.
- `src/input.css` contains the Tailwind source configuration, design tokens, and the `--animate-*` theme tokens. The custom bounce keyframe is `soft-bounce` (utility `animate-soft-bounce`) so it never shadows Tailwind's own `animate-bounce`.
- `scripts/dev.ts` is the development supervisor: it spawns the Tailwind watcher and `bun run --watch src/index.ts`, forwards `SIGINT`/`SIGTERM`/`SIGHUP`, and stops both children when either exits. Keep it dependency-free.
- Both the supervisor and `css:watch` pass `--watch=always`. The Tailwind CLI exits when stdin closes unless `always` is set, so plain `--watch` dies after a single build in containers and non-interactive shells.
- `tests/support/browser.ts` is a minimal Chrome DevTools Protocol client used by the real-browser smoke suite; `tests/browser.test.ts` runs when a Chrome or Chromium binary is discoverable; otherwise `describe.skipIf` skips the suite and a single `console.warn` names the reason and the `KCCF_CHROME_PATH` override, so a missing Chrome is visible instead of falsely green.
- `static/` contains generated CSS, the vendored Datastar runtime, and site assets.
- `static/images/` contains the local JPEG assets plus generated width-descriptor variants: `about-640/1024/1600/2400.jpg`, `hero-640/1024/1600.jpg`, `worship-moment-640/1024/1600.jpg`, and `prayer-fellowship-640/1024/1600.jpg`. Declared dimensions in `imageAssetMap` must match the real JPEG headers; `tests/assets.test.ts` enforces that.
- `src/content/site.ts` owns image metadata. Add `srcset`/`sizes` to the asset and resolve them with `getImageSource(src, sizes?)` rather than hardcoding paths in a component.
- `tests/stylesheet.test.ts` parses both `src/input.css` and the shipped `static/style.css` and asserts the responsive grid, marquee, motion, and contact-strip contracts.
- `tests/interactions.test.ts` covers rendered Datastar contracts, the motion utilities, and the accessibility audit.
- `tests/assets.test.ts` verifies local image routes and the responsive variants are valid JPEGs.

## Security headers

`createApp()` applies `secureHeaders()` to every response with a same-origin content security policy: `style-src 'self' https://fonts.googleapis.com`, `font-src 'self' https://fonts.gstatic.com`, `img-src 'self' data:`, `connect-src 'self'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, and `script-src-attr 'none'`.

`script-src` is `'self' 'unsafe-eval'`, and that is the single deliberate relaxation. Datastar compiles its expressions with the `Function` constructor, which is the framework's documented requirement, so the evaluator is confined to `script-src` and asserted to be absent from `script-src-attr` and every other directive. Never introduce inline scripts, inline event handlers, or a nonce that only pretends the evaluator is gone. The page loads the vendored runtime as `<script type="module" src="/static/datastar.js">`; it is an ES module, and a classic script tag makes every interaction fail silently.

## Content and behaviour

The contact form is frontend-only. It has a `POST` action as an intrinsic no-GET guard, but the vendored Datastar submit listener prevents the request, uses native required/type validation, and transitions through local loading and preview-complete signals without persistence or transmission. Form controls intentionally have no `name` attributes so an accidental fallback submission cannot transmit PII. Its signals are namespaced under `$contact.*` so they cannot collide with the header's `$menuOpen` and `$marqueePaused`.

The mobile menu uses `$menuOpen` with `data-show`, valid reactive ARIA attributes, link close behavior, and Escape-to-close with focus restoration. The service marquee starts in motion (`marqueePaused: false`); its control keeps one static accessible name, "Pause or play service times", that contains both visible labels ("Pause" and "Play") so WCAG 2.5.3 label-in-name holds in either state, and it maps `aria-pressed` from the signal. The `.service-marquee` wrapper carries no `aria-label`: the visually hidden summary holds the service times and the duplicated visual sequences stay `aria-hidden`. It pauses on hover or focus, keeps running while the toggle itself is hovered or focus-visible, and both the animation and the control are disabled under `prefers-reduced-motion`. The marquee clearance padding belongs on `.marquee-sequence`, not `.service-marquee-track`, so the track stays exactly two sequence widths and the `-50%` keyframe is seamless. Adding a third sequence requires changing the keyframe to `-33.33%`.

Page heroes and thumbnails emit intrinsic dimensions from the shared image metadata map and use `srcset`/`sizes` where the asset defines variants, keeping the full-size `src` as the fallback. Card thumbnails use empty alt text when their titles carry the meaning. Unknown routes render the custom 404 page without marking any navigation item as current.

The canonical address lives in `src/content/site.ts` and is reused by the header, footer, contact page, and the derived Google Maps search URL:

```
13-17 Taiwo Akinsulire Street, Off Taiwo Ajakaiye Street, Foursquare bus stop, Ikotun-Ikosi Road, Ikotun, Lagos, Nigeria
```

## Static assets and routes

Static files are served from the project root through `/static/*`, so `static/datastar.js` is available at `/static/datastar.js`. `static/datastar.js` must not end in a `//# sourceMappingURL=` comment and no `datastar.js.map` may be added: Chrome devtools would request a map that is not shipped, and `tests/assets.test.ts` plus the browser smoke both fail on it. The current application routes are `GET /health`, `/`, `/about`, `/ministries`, `/sermons`, `/events`, `/leadership`, and `/contact`.

## Docker

The Dockerfile is pinned to `oven/bun:1.3.14-alpine` and exposes `dependencies`, `build`, `development`, and `production` stages. The build stage copies `tsconfig.json` alongside `src/` and `static/` because Bun resolves the `~/*` path alias from it. The development stage carries source, `scripts/`, full dependencies, and static assets and runs `bun run scripts/dev.ts` directly, so the supervisor is PID 1's direct child and receives `SIGTERM` from the container runtime; the Compose service also sets `init: true` for reaping. The production stage carries only `static/` and the self-contained `dist/index.js` and runs as the non-root `bun` user. Both runtime stages declare a `HEALTHCHECK` against `/health`.

The development Compose configuration is pinned to the project name `kccf-ministry-dev` and host port 3000. It builds the `development` target and bind-mounts `src/`, `static/`, `scripts/`, and `tests/` while keeping dependencies in a named `node_modules` volume. It also read-only bind-mounts the repository-root files that `tests/tooling.test.ts` asserts against (`package.json`, `tsconfig.json`, `bun.lock`, `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml`), so `docker compose exec app bun test` exercises the same files the host does:

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
