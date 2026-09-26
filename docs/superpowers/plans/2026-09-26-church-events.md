# Church Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the empty events model with five real past and four real upcoming church events, render them in two labelled sections on `/events`, render event cards through the shared `Card` component, and replace the three remaining stock photographs with real church photography.

**Architecture:** One `events` array in `src/content/events.ts` with a hand-set `status: "upcoming" | "past"` discriminator and optional `date`/`time`, plus two derived selectors and one date-formatting helper. No date parsing, no new routes, no new components, no new dependencies. The events page renders two sections off the same filtered lists; the home teaser slices the upcoming list. The image phase is independent of the events phase and is sequenced first so the suite is green before content work begins.

**Tech Stack:** Bun 1.3.14, Hono 4, TypeScript 7, Tailwind CSS v4 (authored in `src/input.css`, shipped to `static/style.css`), Bun test, `ffmpeg` 6.1.1 for image variants.

**Spec:** `docs/superpowers/specs/2026-09-26-church-events-design.md` — the plan argues from the spec, so the spec travels with it; executors read both.

## Global Constraints

These are project-wide requirements. Every task's requirements implicitly include this section.

- **Bun is the only package manager.** `bun.lock` is the only lockfile. Do not add `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`.
- **No new dependencies.** `package.json` gains no entries. The variant script shells out to the already-installed `ffmpeg` via `Bun.spawn`, matching the dependency-free style of `scripts/dev.ts`.
- **`static/style.css` is generated, never hand-edited.** Author new rules in `src/input.css` and run `bun run css:build`. `tests/stylesheet.test.ts` asserts against **both** files, and `bun run check` runs `css:build` before `test` for exactly this reason.
- **The full gate is `bun run check`**, which runs `type-check -> css:build -> test -> build` in that order. A change is not done until `bun run check` passes.
- **Event `date` and `time` are human display strings, never parsed.** The codebase has no `Date` parsing and must not gain any. Do not add `new Date()`, `Date.parse`, `.sort()` on dates, or ISO dates to the event model.
- **`status` is hand-set and must never be computed.** No event is classified by comparing dates to the clock.
- **Every past/upcoming split goes through `upcomingEvents` / `pastEvents`.** Never call `.filter()` on `events` inside a component.
- **The image `src` convention:** for each asset, `src` is the largest local file for that asset and is itself the top `srcset` entry. Pinned by `assets.test.ts:109-114` (hero) and `assets.test.ts:135-139` (about, despite its test name).
- **Never introduce inline scripts, inline event handlers, or a nonce.** `script-src` is `'self' 'unsafe-eval'` as the single deliberate relaxation; `script-src-attr` stays `'none'`. No CSP directive changes in this plan.
- **Event cards carry no images.** There is no `image`, `photos`, or `slug` field on `ChurchEvent`. Do not add one.
- **Card thumbnails take `alt=""`** because the title carries the meaning. The events work adds no new alt text.
- **Do not stage unrelated working-tree changes.** The tree carries uncommitted image deletions from a prior, abandoned rename (see Task 1). Stage only the files each task names.
- **Every task ends with a commit** using the repo's Conventional Commits style (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`). The single exception is Task 5, a pure type change that deliberately leaves the tree non-compiling so the type is never half-migrated; Task 6's commit carries `types.ts` and is the first that compiles.

---

## File Structure

**Created**

| Path | Responsibility |
|---|---|
| `scripts/image-variants.ts` | Generate width variants from a source photograph with `ffmpeg`, then print the exact `srcset` literal and real `width`/`height` to paste into `src/content/site.ts`. Holds no state, is not run by `bun run check`. |

**Modified**

| Path | Responsibility |
|---|---|
| `src/content/types.ts` | Declares `EventStatus` and `ChurchEvent`, replacing `FeaturedEvent`. |
| `src/content/events.ts` | Owns the 9 events, the `upcomingEvents` / `pastEvents` selectors, and `formatEventSchedule`. |
| `src/components/pages/events-page.tsx` | Renders Regular Services, Upcoming Events, and Past Events. |
| `src/components/pages/home-page.tsx` | Slices `upcomingEvents` for the teaser instead of `events`. |
| `src/content/site.ts` | Corrected `bibleStudy` dimensions; right-sized `worshipMoment` and `prayerFellowship` ladders. |
| `src/input.css` | Two new classes: `.past-event-card`, `.event-recap`. |
| `tests/content.test.ts` | Replaces the "intentionally has no featured events yet" assertion. |
| `tests/pages.test.ts` | Updates the `/events` and home-page render contracts. |
| `tests/interactions.test.ts` | The two alt-text assertions at `:276` (`hero`) and `:282` (`prayerFellowship`). `:273`, `:279`, and `:166-168` are unchanged |
| `tests/tooling.test.ts` | Task 2 only: asserts the committed `image:variants` script and that the generator uses `ffmpeg` `signalstats`. |
| `tests/stylesheet.test.ts` | New contract for the two new classes in both stylesheets. |
| `package.json` | Task 2 only: one added `image:variants` entry. No dependency change. |
| `docs/photo-choices.md` | Task 3 only: the maintainer's chosen sources, measurements, and approved alt strings, which Task 4 substitutes. |
| `CLAUDE.md` | Documents the `status` discipline, the selectors, and the `src` convention. |
| `README.md` | Updates the `/events` route description. |

**Deleted** (Task 1 only — leftovers of an abandoned rename)

- `static/images/prayer-640.jpg`, `static/images/prayer-1024.jpg`, `static/images/prayer-1600.jpg` — untracked duplicates of the correctly-named rungs.
- `static/images/prayer-fellowship-1024jpg` — corrupt, missing the dot before the extension.

**Not touched:** `tests/assets.test.ts` (its only hardcoded assertions are `imageAssets.hero` at `:110-114` and `imageAssets.about` at `:118-138`, neither of which this plan changes; the dimension and variant-width checks at `:167-185` are generic and pass once files match declarations, which is exactly what makes them Task 4's gate), `src/components/ui/card.tsx` (already supports an absent `image`, so the text-only event card needs no change), `src/routes/index.ts`, `src/index.ts`, `Dockerfile`, `docker-compose*.yml`, `tests/components.test.ts` (its `Card` assertion at `:283-294` renders a synthetic `/media` route, so it never reaches the events page), `tests/browser.test.ts`, `tests/routes.test.ts` (its `aria-labelledby` and id-uniqueness contract at `:81-93` already covers the new `past-events-title` id with no edit).

`package.json` and `tests/tooling.test.ts` are **modified by Task 2 only**, to register and assert the `image:variants` script. No dependency is added.

---

## Ordering

Tasks 1–4 are the image phase. Tasks 5–9 are the events phase. The image phase runs first because the suite is currently red, and a red suite makes every later task's test cycle ambiguous.

**Task 6 requires a maintainer decision that blocks Task 7.** The photo shortlist in Task 3 needs the maintainer to pick; the executor must stop and ask rather than choose photographs of a real congregation.

---

### Task 1: Clean up the abandoned image rename

`bun test tests/assets.test.ts` currently fails five assertions because a prior rename of `prayer-fellowship-*` to `prayer-*` was started and never propagated to any source file. This task restores the three good rungs and deletes the four strays. It deliberately does **not** make the suite green — the two missing originals are regenerated in Task 4, and the plan says so at that task.

**Files:**
- Delete: `static/images/prayer-640.jpg`, `static/images/prayer-1024.jpg`, `static/images/prayer-1600.jpg`, `static/images/prayer-fellowship-1024jpg`
- Restore: `static/images/prayer-fellowship-640.jpg`, `static/images/prayer-fellowship-1024.jpg`, `static/images/prayer-fellowship-1600.jpg`

**Interfaces:**
- Consumes: nothing.
- Produces: three correctly-named, correctly-dimensioned rungs at `/static/images/prayer-fellowship-{640,1024,1600}.jpg`, so `imageAssetMap.prayerFellowship.srcset` (`site.ts:56-61`) resolves to real files.

- [ ] **Step 1: Confirm the current broken state**

Run: `ls -1 static/images/ | rg 'prayer'`
Expected: exactly this list, which shows the stray malformed name and the absence of the real original:

```
prayer-1024.jpg
prayer-1600.jpg
prayer-640.jpg
prayer-fellowship-1024jpg
prayer-fellowship-640.jpg
```

- [ ] **Step 2: Record the failing baseline**

Run: `bun test tests/assets.test.ts 2>&1 | rg '^\(fail\)'`
Expected: five failures —

```
(fail) local ministry image assets > serves prayer-fellowship.jpg as a non-empty JPEG
(fail) responsive image variants > serves prayer-fellowship-1024.jpg as a non-empty JPEG
(fail) responsive image variants > serves prayer-fellowship-1600.jpg as a non-empty JPEG
(fail) image asset metadata > every asset's declared dimensions match its real JPEG dimensions
(fail) image asset metadata > every generated variant matches its declared width
```

If this output differs, stop and re-read the spec §4.3 before continuing.

- [ ] **Step 3: Confirm the stray is genuinely corrupt**

Run: `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 static/images/prayer-fellowship-1024jpg 2>&1 | head -2`
Expected: an `is invalid` warning and `0,0`. This proves the file is unrecoverable and must be deleted, not renamed.

- [ ] **Step 4: Confirm the untracked files are duplicates, not originals**

Run: `git cat-file -s $(git rev-parse HEAD:static/images/prayer-fellowship-640.jpg) && stat -c%s static/images/prayer-640.jpg`
Expected: both print `98556`. Identical sizes prove `prayer-640.jpg` is the renamed rung and is safe to delete in favour of the restored name.

- [ ] **Step 5: Restore the three rungs from HEAD**

```bash
git checkout -- static/images/prayer-fellowship-640.jpg static/images/prayer-fellowship-1024.jpg static/images/prayer-fellowship-1600.jpg
```

- [ ] **Step 6: Delete the four strays**

```bash
rm static/images/prayer-640.jpg static/images/prayer-1024.jpg static/images/prayer-1600.jpg static/images/prayer-fellowship-1024jpg
```

- [ ] **Step 7: Verify the restored rungs have their declared widths**

Run: `bun test tests/assets.test.ts 2>&1 | rg '^\(fail\)'`
Expected: **exactly three** failures remain, down from five. The two `prayer-fellowship-*` variant failures are gone, and the remaining three are `prayer-fellowship.jpg` missing, the declared-dimensions mismatch, and the variant-width mismatch now caused by `prayer-fellowship-640.jpg` being a 2048-wide file where 640 is declared:

```
(fail) local ministry image assets > serves prayer-fellowship.jpg as a non-empty JPEG
(fail) image asset metadata > every asset's declared dimensions match its real JPEG dimensions
(fail) image asset metadata > every generated variant matches its declared width
```

If more than three fail, something was restored incorrectly — stop and inspect.

- [ ] **Step 8: Confirm nothing in `src/` referenced the deleted names**

Run: `rg -n 'prayer-640|prayer-1024|prayer-1600|prayer-fellowship-1024jpg' src/ tests/ || echo "clean"`
Expected: `clean`. The abandoned rename never reached any source file, so no source edit is required.

- [ ] **Step 9: Commit**

```bash
git add static/images/prayer-fellowship-640.jpg static/images/prayer-fellowship-1024.jpg static/images/prayer-fellowship-1600.jpg
git commit -m "fix: restore misnamed prayer fellowship image variants"
```

The deletions of the four strays are untracked-file removals, so they need no staging.

---

### Task 2: Build the image variant script

Creates `scripts/image-variants.ts`. Its whole reason for existing is that `package.json` has no image toolchain and the existing variants were produced out of band, so there is no reproducible way to add a width. The script generates variants and then prints the paste-ready `srcset` literal, because a wrong declared dimension fails `assets.test.ts:167-175` and is tedious to debug by hand.

**Files:**
- Create: `scripts/image-variants.ts`
- Test: `tests/tooling.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a CLI at `scripts/image-variants.ts` and a `"image:variants"` script in `package.json`. Tasks 3 and 4 invoke it as `bun run scripts/image-variants.ts <source> <base-name> [--widths ...] [--out ...]`. Its stdout is a paste block for `src/content/site.ts`.

- [ ] **Step 1: Write the failing test**

Append to `tests/tooling.test.ts`:

```ts
describe("image variant script", () => {
  test("is committed and exposes a runnable image:variants script", async () => {
    const source = await readFile(new URL("../scripts/image-variants.ts", import.meta.url), "utf8");
    const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(manifest.scripts["image:variants"]).toBe("bun run scripts/image-variants.ts");
    expect(source).toContain("ffmpeg");
    expect(source).toContain("signalstats");
  });
});
```

If `tests/tooling.test.ts` does not already import `readFile` from `node:fs/promises`, add that import.

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/tooling.test.ts 2>&1 | tail -20`
Expected: FAIL, with `error:ENOENT` or an undefined `manifest.scripts["image:variants"]`.

- [ ] **Step 3: Create the script**

Create `scripts/image-variants.ts`:

```ts
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const DEFAULT_WIDTHS = [640, 1024, 1600];

type Options = {
  source: string;
  baseName: string;
  widths: number[];
  outDir: string;
};

function parseArgs(argv: string[]): Options {
  const positional: string[] = [];
  let widths = DEFAULT_WIDTHS;
  let outDir = "static/images";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--widths") {
      const value = argv[index + 1];
      if (!value) throw new Error("--widths requires a comma-separated list, e.g. --widths 640,1024");
      widths = value.split(",").map((part) => Number.parseInt(part.trim(), 10));
      index += 1;
      continue;
    }

    if (arg === "--out") {
      const value = argv[index + 1];
      if (!value) throw new Error("--out requires a directory, e.g. --out static/images");
      outDir = value;
      index += 1;
      continue;
    }

    positional.push(arg);
  }

  const [source, baseName] = positional;

  if (!source || !baseName) {
    throw new Error("usage: image-variants <source> <base-name> [--widths 640,1024,1600] [--out static/images]");
  }

  for (const width of widths) {
    if (!Number.isInteger(width) || width <= 0) throw new Error(`invalid width: ${width}`);
  }

  return { source, baseName, widths, outDir };
}

async function run(command: string[]): Promise<string> {
  const proc = Bun.spawn(command, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;

  if (code !== 0) throw new Error(`${command[0]} exited ${code}: ${stderr.trim()}`);

  return stdout;
}

async function readJpegSize(path: string): Promise<{ width: number; height: number }> {
  const out = await run([
    "ffprobe",
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "csv=p=0",
    path,
  ]);
  const [width, height] = out.trim().split(",").map((part) => Number.parseInt(part.trim(), 10));

  if (!width || !height) throw new Error(`could not read JPEG dimensions from ${path} (got "${out.trim()}")`);

  return { width, height };
}

async function readRotationTag(path: string): Promise<string> {
  const out = await run([
    "ffprobe",
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream_tags=rotate:stream_side_data=rotation",
    "-of",
    "default=nw=1:nk=1",
    path,
  ]);
  return out.trim();
}

function scaleExpression(width: number): string {
  // Round the height to an even number so the encoder gets well-formed chroma planes.
  return `scale=${width}:-2:flags=lanczos`;
}

const options = parseArgs(Bun.argv.slice(2));
const sourcePath = resolve(options.source);
const outDir = resolve(options.outDir);

await mkdir(outDir, { recursive: true });

const rotation = await readRotationTag(sourcePath);
if (rotation && rotation !== "0" && !/Rotate: 0/.test(rotation)) {
  console.warn(
    `warning: ${options.source} carries a rotation tag (${rotation}). Confirm the printed width/height match the upright image.`,
  );
}

const generated: Array<{ file: string; width: number }> = [];

for (const width of options.widths) {
  const file = `${options.baseName}-${width}.jpg`;
  const target = join(outDir, file);

  await run(["ffmpeg", "-y", "-i", sourcePath, "-vf", scaleExpression(width), "-q:v", "4", target]);

  const size = await readJpegSize(target);
  if (size.width !== width) {
    throw new Error(`${file} is ${size.width}px wide but ${width} was requested; check for EXIF rotation`);
  }

  generated.push({ file, width });
}

const srcWidth = Math.max(...options.widths);
const srcFile = `${options.baseName}.jpg`;
const srcTarget = join(outDir, srcFile);

await run(["ffmpeg", "-y", "-i", sourcePath, "-vf", scaleExpression(srcWidth), "-q:v", "4", srcTarget]);

const srcSize = await readJpegSize(srcTarget);

console.log("");
console.log(`// paste into imageAssetMap in src/content/site.ts`);
console.log(`const ${options.baseName}Srcset = [`);
for (const entry of generated) {
  console.log(`  "/static/images/${entry.file} ${entry.width}w",`);
}
console.log(`  "/static/images/${srcFile} ${srcSize.width}w",`);
console.log(`].join(", ");`);
console.log("");
console.log(`  src: "/static/images/${srcFile}",`);
console.log(`  width: ${srcSize.width},`);
console.log(`  height: ${srcSize.height},`);
console.log("");
```

- [ ] **Step 4: Add the package.json script**

In `package.json`, insert after `"css:watch"`:

```json
    "image:variants": "bun run scripts/image-variants.ts",
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test tests/tooling.test.ts`
Expected: PASS.

- [ ] **Step 6: Smoke-test the script end to end**

Run: `bun run scripts/image-variants.ts ~/Desktop/about.jpg about-probe --widths 320,640 --out /tmp/opencode/variant-probe`
Expected: three lines of generated-file confirmation, then a paste block naming `about-probe.jpg` at 640 with its real `width`/`height`.

- [ ] **Step 7: Verify the reported dimensions are the real file's dimensions**

Run: `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 /tmp/opencode/variant-probe/about-probe.jpg`
Expected: matches the `width:` and `height:` the script printed. If it does not, the script's paste block is lying and must be fixed before Task 4 relies on it.

- [ ] **Step 8: Verify the guard rejects a bad width list**

Run: `bun run scripts/image-variants.ts ~/Desktop/about.jpg probe --widths abc --out /tmp/opencode/variant-probe`
Expected: a thrown `invalid width: NaN` and a non-zero exit.

- [ ] **Step 9: Clean up the probe output**

```bash
rm -rf /tmp/opencode/variant-probe
```

- [ ] **Step 10: Commit**

```bash
git add scripts/image-variants.ts package.json tests/tooling.test.ts
git commit -m "feat: add image variant generation script"
```

---

### Task 3: Screen the photographs and propose alt text

Produces the maintainer decision that Task 4 depends on. The executor screens candidates on measurable exposure and contrast, then **stops and asks the maintainer to choose**. It must not select photographs of a real congregation on its own.

**Files:**
- Read only: `~/Desktop/kccf/**/*.jpg`
- Create: `docs/photo-choices.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a committed `docs/photo-choices.md` holding, per slot, the chosen source path, its measured `YAVG`/`YLOW`/`YHIGH`, and the approved alt string. Task 4 substitutes these into `src/content/site.ts` and its ffmpeg commands, so Task 4 contains no placeholders.

- [ ] **Step 1: Confirm the source corpus and the three target slots**

Run: `for d in ~/Desktop/kccf/*/; do echo -n "$(basename "$d"): "; find "$d" -type f -iname '*.jpg' | wc -l; done`
Expected: `Children Anniversary 2025: 59`, `logo: 1`, `praise night: 113`, `usher: 112`, `Youth: 129`, `Youth Thanksgiving Service. Light Of The World: 155`.

- [ ] **Step 2: Measure exposure and contrast across the candidate folders**

`praise night` is the source for `hero`, `worshipMoment`, and `prayerFellowship` — it is the only folder with large-group worship photography. Screen all 113:

```bash
cd ~/Desktop/kccf && find "praise night" -type f -iname '*.jpg' -print0 | while IFS= read -r -d '' f; do
  stats=$(ffmpeg -v error -i "$f" -vf "scale=320:-1,signalstats,metadata=print:file=-" -f null - 2>&1)
  yavg=$(echo "$stats" | rg -o 'YAVG=[0-9.]+' | head -1 | cut -d= -f2)
  ylow=$(echo "$stats" | rg -o 'YLOW=[0-9.]+' | head -1 | cut -d= -f2)
  yhigh=$(echo "$stats" | rg -o 'YHIGH=[0-9.]+' | head -1 | cut -d= -f2)
  echo "$yavg $ylow $yhigh $f"
done | sort -n
```

This is a read-only measurement. It selects nothing on its own.

- [ ] **Step 3: Apply the rejection thresholds**

Keep only candidates where all three hold:

- `YLOW >= 20` — shadows are not crushed to black
- `YHIGH <= 245` — highlights are not blown out
- `80 <= YAVG <= 175` — the frame is neither murky nor washed

Print the survivors with their `YAVG` values:

```bash
cd ~/Desktop/kccf && find "praise night" -type f -iname '*.jpg' -print0 | while IFS= read -r -d '' f; do
  stats=$(ffmpeg -v error -i "$f" -vf "scale=320:-1,signalstats,metadata=print:file=-" -f null - 2>&1)
  yavg=$(echo "$stats" | rg -o 'YAVG=[0-9.]+' | head -1 | cut -d= -f2)
  ylow=$(echo "$stats" | rg -o 'YLOW=[0-9.]+' | head -1 | cut -d= -f2)
  yhigh=$(echo "$stats" | rg -o 'YHIGH=[0-9.]+' | head -1 | cut -d= -f2)
  awk -v a="$yavg" -v lo="$ylow" -v hi="$yhigh" -v f="$f" 'BEGIN { if (lo>=20 && hi<=245 && a>=80 && a<=175) printf "%.1f %.1f %.1f %s\n", a, lo, hi, f }'
done | sort -n
```

- [ ] **Step 4: Reject the mislabelled file if it appears**

Run: `cd ~/Desktop/kccf && find "praise night" -type f -iname '*.jpg' -print0 | while IFS= read -r -d '' f; do ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$f" 2>/dev/null; done | sort | uniq -c | sort -rn`
Expected: overwhelmingly `6000,4000`. Any `0,0` or a wildly different size is a corrupt file; exclude it and note it for the maintainer.

- [ ] **Step 5: Take the top five by `YAVG` closest to 120 as the shortlist**

From the Step 3 output, pick five spanning the range, not five adjacent frames. A burst of near-identical `DSC_` numbers is usually the same moment, so spread the shortlist across the filename range.

- [ ] **Step 6: Propose alt text for each slot, and STOP for the maintainer's choice**

Message the maintainer with:

- The five shortlisted filenames for `hero`, `worshipMoment`, and `prayerFellowship`, each with its `YAVG`/`YLOW`/`YHIGH` so the trade-off is visible.
- One proposed alt string per slot, phrased as a description of what the photograph shows. The executor must describe only what it can observe, and must say plainly that it cannot judge composition or whether a face is identifiable, so the maintainer's approval is the real gate.
- An explicit statement that `about` needs no photograph: `~/Desktop/about.jpg` is already byte-identical to `static/images/about.jpg` (MD5 `f3a36dcf96193d186f1d834390f3d03f`).

**Do not proceed to Task 4 until the maintainer has chosen.**

- [ ] **Step 7: Record the decision in a committed file**

Create `docs/photo-choices.md`, substituting the maintainer's actual answers so no placeholder remains:

```markdown
# Chosen photographs

Selected 2026-09-26. Shortlisted by `ffmpeg` `signalstats` exposure screening
(`YLOW >= 20`, `YHIGH <= 245`, `80 <= YAVG <= 175`); final selection by the maintainer.

Regenerate any of these with:

    bun run scripts/image-variants.ts <absolute source path> <base name> --widths 640,1024,1600

## hero

- Source: `~/Desktop/kccf/praise night/DSC_0084.jpg`
- Measured: YAVG 112.4, YLOW 31, YHIGH 232
- Alt: `Congregation worshipping with hands raised during a Sunday service`

## worshipMoment

- Source: `~/Desktop/kccf/praise night/DSC_0244.jpg`
- Measured: YAVG 118.9, YLOW 27, YHIGH 227
- Alt: `Congregation with hands raised in worship`

## prayerFellowship

- Source: `~/Desktop/kccf/praise night/DSC_0391.jpg`
- Measured: YAVG 105.2, YLOW 33, YHIGH 229
- Alt: `Members of the congregation holding hands in prayer`

## about

No change. `~/Desktop/about.jpg` is already identical to `static/images/about.jpg`
(MD5 `f3a36dcf96193d186f1d834390f3d03f`) and `site.ts` already declares 4389x3292.
```

Replace every filename, measurement, and alt string with the real ones. The three alt strings are the exact values Task 4 writes into `site.ts` and `tests/interactions.test.ts`.

- [ ] **Step 8: Commit**

```bash
git add docs/photo-choices.md
git commit -m "docs: record chosen church photographs"
```

---

### Task 4: Regenerate the three stock photographs at right-sized widths

Replaces the contents of `hero`, `worshipMoment`, and `prayerFellowship` with real church photography, and right-sizes the two oversized originals. **This is the task that makes `assets.test.ts` green** — five failures at Task 1, three after it, zero after this.

`about` is deliberately untouched: it is already the maintainer's cross photograph, correctly dimensioned.

**Files:**
- Modify: `src/content/site.ts:42-54` (`heroSrcset`, `worshipMomentSrcset`, `prayerFellowshipSrcset`), `:89-96` (`worshipMoment` asset), `:72-79` (`prayerFellowship` asset), `:97` (`bibleStudy` dimensions)
- Modify: `static/images/hero.jpg`, `static/images/hero-640.jpg`, `static/images/hero-1024.jpg`, `static/images/hero-1600.jpg`
- Modify: `static/images/worship-moment.jpg`, `static/images/worship-moment-640.jpg`, `static/images/worship-moment-1024.jpg`, `static/images/worship-moment-1600.jpg`
- Modify: `static/images/prayer-fellowship.jpg`, `static/images/prayer-fellowship-640.jpg`, `static/images/prayer-fellowship-1024.jpg`, `static/images/prayer-fellowship-1600.jpg`
- Test: `tests/assets.test.ts` (**no edit** — see below), `tests/interactions.test.ts`

`assets.test.ts` needs no edit. Its only hardcoded assertions are `imageAssets.hero` at `:110-114` and `imageAssets.about` at `:118-138`; both are untouched by this task. Everything else it checks — declared dimensions against real JPEG headers at `:167-175`, and each `generatedVariants` row against its real width at `:177-185` — is generic, so it passes automatically once the files and the declarations agree. That generic coverage is what makes this task's `bun test tests/assets.test.ts` a real gate rather than a rubber stamp.

**Interfaces:**
- Consumes: `docs/photo-choices.md` (Task 3), `scripts/image-variants.ts` (Task 2), the Task 1 strays deletion.
- Produces: `imageAssets.hero`, `imageAssets.worshipMoment`, `imageAssets.prayerFellowship` with correct `src`, `srcset`, `width`, `height`, `alt`; green `assets.test.ts`.

- [ ] **Step 1: Record the green-suite target**

Run: `bun test tests/assets.test.ts 2>&1 | tail -4`
Expected: `3 fail` — the three remaining failures from Task 1 Step 7. This is the baseline this task must drive to zero.

- [ ] **Step 2: Read the chosen sources and alt strings**

Run: `cat docs/photo-choices.md`
Expected: one `## hero`, `## worshipMoment`, and `## prayerFellowship` section, each with a `Source:`, `Measured:`, and `Alt:` line, and no placeholder text. Every value this task uses comes from that file.

- [ ] **Step 3: Generate the `hero` ladder from the chosen source**

Substitute the `hero` source path from `docs/photo-choices.md`:

```bash
bun run scripts/image-variants.ts "$HOME/Desktop/kccf/praise night/DSC_0084.jpg" hero --widths 640,1024,1600 --out static/images
```

`hero` keeps its existing ladder shape — 640/1024/1600 plus a 2048w `src` — so no `srcset` string in `site.ts` or `interactions.test.ts` changes. The script's default top width is its largest requested width (1600), so produce the 2048 `src` separately:

```bash
ffmpeg -y -i "$HOME/Desktop/kccf/praise night/DSC_0084.jpg" -vf "scale=2048:-2:flags=lanczos" -q:v 4 static/images/hero.jpg
```

- [ ] **Step 4: Generate the `worshipMoment` ladder at 1600**

```bash
bun run scripts/image-variants.ts "$HOME/Desktop/kccf/praise night/DSC_0244.jpg" worship-moment --widths 640,1024,1600 --out static/images
```

- [ ] **Step 5: Generate the `prayerFellowship` ladder at 1600**

```bash
bun run scripts/image-variants.ts "$HOME/Desktop/kccf/praise night/DSC_0391.jpg" prayer-fellowship --widths 640,1024,1600 --out static/images
```

- [ ] **Step 6: Confirm every generated file has its declared width**

Run:

```bash
for f in static/images/hero-*.jpg static/images/hero.jpg static/images/worship-moment*.jpg static/images/prayer-fellowship*.jpg; do
  printf '%s -> ' "$f"
  ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$f"
done
```

Expected: each `-640` file reports 640 wide, each `-1024` reports 1024, each `-1600` reports 1600, `hero.jpg` reports 2048. Heights are 4/3 of the width, e.g. 1600 wide is 1067 tall. A swapped pair means EXIF rotation; re-run that file with `-vf "transpose=1,scale=..."` and re-check.

- [ ] **Step 7: Update the three srcset literals in `site.ts`**

Replace the `worshipMomentSrcset` block at `site.ts:49-54` with:

```ts
const worshipMomentSrcset = [
  "/static/images/worship-moment-640.jpg 640w",
  "/static/images/worship-moment-1024.jpg 1024w",
  "/static/images/worship-moment-1600.jpg 1600w",
  "/static/images/worship-moment.jpg 1600w",
].join(", ");
```

Replace the `prayerFellowshipSrcset` block at `site.ts:56-61` with:

```ts
const prayerFellowshipSrcset = [
  "/static/images/prayer-fellowship-640.jpg 640w",
  "/static/images/prayer-fellowship-1024.jpg 1024w",
  "/static/images/prayer-fellowship-1600.jpg 1600w",
  "/static/images/prayer-fellowship.jpg 1600w",
].join(", ");
```

Leave `heroSrcset` at `site.ts:42-47` exactly as it is.

- [ ] **Step 8: Update the two asset declarations in `site.ts`**

Replace the `prayerFellowship` asset at `site.ts:72-79`, copying the `prayerFellowship` alt string verbatim from `docs/photo-choices.md`:

```ts
  prayerFellowship: {
    src: "/static/images/prayer-fellowship.jpg",
    width: 1600,
    height: 1067,
    alt: "Members of the congregation holding hands in prayer",
    srcset: prayerFellowshipSrcset,
    sizes: "(min-width: 64rem) 38rem, (min-width: 48rem) 45vw, 92vw",
  },
```

Replace the `worshipMoment` asset at `site.ts:89-96`, copying the `worshipMoment` alt string verbatim from the same file:

```ts
  worshipMoment: {
    src: "/static/images/worship-moment.jpg",
    width: 1600,
    height: 1067,
    alt: "Congregation with hands raised in worship",
    srcset: worshipMomentSrcset,
    sizes: "(min-width: 64rem) 38rem, (min-width: 48rem) 45vw, 92vw",
  },
```

The two alt strings above are the literals from `docs/photo-choices.md`; if the maintainer approved different wording, use theirs. Confirm the real heights from Step 6 before writing them — 6000×4000 sources at 1600 wide give 1600×1067.

- [ ] **Step 9: Correct the `bibleStudy` dimensions in `site.ts:97`**

The file is 2048×1365 but declares 800×600. Replace that line with:

```ts
  bibleStudy: { src: "/static/images/bible-study.jpg", width: 2048, height: 1365, alt: "Hands resting on an open Bible" },
```

- [ ] **Step 10: Update the two alt-text assertions in `tests/interactions.test.ts`**

At `tests/interactions.test.ts:276`, replace:

```ts
      expect(html).toContain('alt="Congregation"');
```

with the approved `hero` alt string from `docs/photo-choices.md`:

```ts
      expect(html).toContain('alt="Congregation worshipping with hands raised during a Sunday service"');
```

At `tests/interactions.test.ts:282`, replace:

```ts
      expect(html).toContain('alt="People holding hands in prayer"');
```

with the approved `prayerFellowship` alt string:

```ts
      expect(html).toContain('alt="Members of the congregation holding hands in prayer"');
```

The assertion at `:279` for `bibleStudy` and the assertion at `:273` for `about` are **unchanged**. The hero `src`/`srcset` assertions at `:166-168` are **unchanged**.

- [ ] **Step 11: Run the assets suite to verify it is now green**

Run: `bun test tests/assets.test.ts`
Expected: PASS, zero failures. This is the gate the whole image phase was sequenced to reach.

- [ ] **Step 12: Run the alt-text assertions to verify they pass**

Run: `bun test tests/interactions.test.ts`
Expected: PASS.

- [ ] **Step 13: Run the full suite**

Run: `bun test`
Expected: every suite green. Any remaining failure names a hardcoded string this task missed; fix it here rather than deferring.

- [ ] **Step 14: Confirm the size reduction**

Run: `du -sh static/images`
Expected: roughly 6 MB, down from roughly 28 MB. The 10.4 MB and 11.8 MB originals are gone.

- [ ] **Step 15: Commit**

```bash
git add static/images src/content/site.ts tests/interactions.test.ts
git commit -m "feat: replace stock photography with church images"
```

---

### Task 5: Introduce the `ChurchEvent` type

Renames the type and makes `date`/`time` optional, because three of the four upcoming events have neither. `status` is hand-set and is the only past/upcoming discriminator the codebase will ever have.

**Files:**
- Modify: `src/content/types.ts:49-56`
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `EventStatus` (`"upcoming" | "past"`) and `ChurchEvent` (`status`, `title`, `date?`, `time?`, `location`, `description`, `recap?`), both exported from `src/content/types.ts`. Task 6 populates them; Tasks 7 and 8 import them.

This is a pure type change with no runtime behaviour, so it has no unit test of its own. `tsc` is the test: the change is correct when the two expected errors appear and nothing else does. Task 6 supplies the behavioural tests.

- [ ] **Step 1: Record the type-check baseline**

Run: `bun run type-check`
Expected: PASS. The tree type-checks before this task, so any failure now is pre-existing and must be investigated rather than absorbed.

- [ ] **Step 2: Replace `FeaturedEvent` in `src/content/types.ts`**

Replace the block at `types.ts:49-56`:

```ts
export type FeaturedEvent = {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image: string;
};
```

with:

```ts
export type EventStatus = "upcoming" | "past";

export type ChurchEvent = {
  /** Hand-set. Never derived from a date comparison; see CLAUDE.md. */
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

- [ ] **Step 3: Run type-check and confirm the failure is exactly two sites**

Run: `bun run type-check`
Expected: FAIL, naming only `src/content/events.ts:1` and `src/content/events.ts:8` as referring to a missing `FeaturedEvent`. If any other file is named, the rename is not contained — stop and find the stray reference before continuing.

- [ ] **Step 4: Confirm the rename scope by grep**

Run: `rg -n 'FeaturedEvent' src/ tests/`
Expected: exactly three hits — the new declaration in `types.ts`, the import at `events.ts:1`, and the array annotation at `events.ts:8`. No test imports the type by name, so the rename causes no test churn.

- [ ] **Step 5: Leave `events.ts` broken on purpose**

`events.ts` is deliberately left failing between this task and Task 6, so the type is never half-migrated and the array is never half-populated. **Do not commit this task.** Task 6's commit is the first that compiles, and it carries `types.ts` with it. Note the deliberate break in the executor's summary.

---

### Task 6: Populate the event content

Fills in all nine events and adds the two selectors and the formatting helper. This is the substantive content task and the one that makes the suite compile again.

**Files:**
- Modify: `src/content/events.ts`
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: `EventStatus` and `ChurchEvent` from `src/content/types.ts` (Task 5).
- Produces: `events: ChurchEvent[]`, `upcomingEvents: ChurchEvent[]`, `pastEvents: ChurchEvent[]`, and `formatEventSchedule(event: ChurchEvent): string` from `src/content/events.ts`. `monthlyService: ServiceTime` is unchanged and still exported. Tasks 7 and 8 import all four.

- [ ] **Step 1: Write the failing content tests**

In `tests/content.test.ts`, change the import at `:2` to:

```ts
import { events, formatEventSchedule, monthlyService, pastEvents, upcomingEvents } from "../src/content/events";
```

Replace the `intentionally has no featured events yet` test at `:87-89` with:

```ts
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
      "September 20, 2025",
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
```

- [ ] **Step 2: Run the content suite to verify it fails**

Run: `bun test tests/content.test.ts`
Expected: FAIL. The import of `formatEventSchedule`, `pastEvents`, and `upcomingEvents` fails, and `publishes five past and four upcoming church events` fails against an empty array.

- [ ] **Step 3: Write the event content**

Replace `src/content/events.ts` in full:

```ts
import type { ChurchEvent, ServiceTime } from "./types";

export const monthlyService: ServiceTime = {
  name: "Every 1st Thursday Transformation Night",
  time: "10:00 PM",
};

/** Newest first for `pastEvents`; announcement order for `upcomingEvents`. Never sorted by date. */
export const events: ChurchEvent[] = [
  {
    status: "past",
    title: "Annual Church Thanksgiving Anniversary",
    date: "September 20, 2026",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description:
      "Our eighteenth annual thanksgiving gathering, marking another year of God's faithfulness over KCCF Mount Zion.",
    recap: "The service carried the theme Harvest of Abundance.",
  },
  {
    status: "past",
    title: "Thanksgiving Anniversary",
    date: "September 20, 2025",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "The church gave thanks together for another year of ministry, worship, and community.",
  },
  {
    status: "past",
    title: "Praise Night",
    date: "September 19, 2025",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "An evening of praise and worship, lifting our voices ahead of the anniversary service.",
  },
  {
    status: "past",
    title: "Youth Thanksgiving Service: Light of the World",
    date: "July 20, 2025",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "Our youth gathered for a thanksgiving service themed Light of the World.",
  },
  {
    status: "past",
    title: "Children's Anniversary",
    date: "June 1, 2025",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "Celebrating the children of KCCF Mount Zion and the community that surrounds them.",
  },
  {
    status: "upcoming",
    title: "I AM Revival",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "A season of renewal, expecting God to revive and strengthen his church again.",
  },
  {
    status: "upcoming",
    title: "Women's Anniversary",
    date: "November 2026",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "Celebrating the women of KCCF Mount Zion and their faithfulness over the year.",
  },
  {
    status: "upcoming",
    title: "Carol Service",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "A carol service to welcome the Christmas season. Date to be announced.",
  },
  {
    status: "upcoming",
    title: "Christmas Service",
    date: "December 2026",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "Celebrating the birth of Christ with worship and the Word. Date to be announced.",
  },
];

export const upcomingEvents = events.filter((event) => event.status === "upcoming");
export const pastEvents = events.filter((event) => event.status === "past");

export function formatEventSchedule(event: ChurchEvent): string {
  const parts = [event.date, event.time].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Date to be announced";
}
```

- [ ] **Step 4: Run the content suite to verify it passes**

Run: `bun test tests/content.test.ts`
Expected: PASS.

- [ ] **Step 5: Run type-check**

Run: `bun run type-check`
Expected: PASS. The tree compiles again, closing the deliberate break from Task 5.

- [ ] **Step 6: Run the full suite to find what the new content broke**

Run: `bun test 2>&1 | rg '^\(fail\)'`
Expected: failures in `pages.test.ts` and `interactions.test.ts`, because `/events` and the home page now render event cards where they previously rendered empty states. Fix them in Tasks 7 and 8. `assets.test.ts` must be green.

- [ ] **Step 7: Commit**

```bash
git add src/content/types.ts src/content/events.ts tests/content.test.ts
git commit -m "feat: publish past and upcoming church events"
```

This commit carries `types.ts` from Task 5 as well, so the branch is left compiling.

---

### Task 7: Render both sections on `/events`

Adds the Past Events section and moves the existing card markup onto the shared `Card` component, which also fixes a latent CSS bug: the hand-rolled card emitted `class="event-card"` without the base `card` class, so `.card-grid .card img` and `.card-grid .card-content` at `input.css:1074-1084` never applied.

**Files:**
- Modify: `src/components/pages/events-page.tsx:43-93`
- Test: `tests/pages.test.ts:122-131`

**Interfaces:**
- Consumes: `upcomingEvents`, `pastEvents`, `formatEventSchedule` from `src/content/events.ts` (Task 6); `Card` from `src/components/ui/card.tsx`; `SectionHeading` from `src/components/ui/section-heading`.
- Produces: markup containing `past-events-title`, `past-events-section`, and `past-event-card`, rendered on `GET /events`. Task 8 changes the home page and the tests.

- [ ] **Step 1: Write the failing page test**

Replace the `events page` describe block at `tests/pages.test.ts:122-131` with:

```ts
describe("events page", () => {
  test("renders regular services, upcoming events, and past events in order", async () => {
    const { html, main } = await getPage("/events");

    expectInOrder(main, [
      "Events",
      "Sunday Worship",
      "Wednesday Throne of Grace",
      "Transformation Night",
      "Upcoming Events",
      "I AM Revival",
      "Women's Anniversary",
      "Christmas Service",
      "Past Events",
      "Annual Church Thanksgiving Anniversary",
      "Children's Anniversary",
    ]);
    expect(html).toContain("Every 1st Thursday Transformation Night");
    expect(html).toContain("10:00 PM");
    expect(html).not.toContain("Weekly gathering");
  });

  test("labels unannounced dates instead of rendering an empty schedule", async () => {
    const { html } = await getPage("/events");

    expect(html).toContain("Date to be announced");
    expect(html).not.toContain("undefined");
  });

  test("renders event cards through the shared Card component", async () => {
    const { html } = await getPage("/events");

    expect(html).toContain('class="card event-card"');
    expect(html).toContain('class="card past-event-card"');
    expect(html).not.toContain('class="event-card"');
  });

  test("gives the past events section a resolvable unique heading id", async () => {
    const { html } = await getPage("/events");

    expect(html).toContain('aria-labelledby="past-events-title"');
    expect(html).toContain('id="past-events-title"');
  });
});
```

- [ ] **Step 2: Run the pages suite to verify it fails**

Run: `bun test tests/pages.test.ts`
Expected: FAIL. "Upcoming Events" is absent (the page still says "Featured Events") and "Past Events" is absent.

- [ ] **Step 3: Update the imports in `events-page.tsx`**

Replace lines 1–6 with:

```tsx
import { ButtonLink } from "../ui/button-link";
import { PageHero } from "../ui/page-hero";
import { SectionHeading } from "../ui/section-heading";
import { Card } from "../ui/card";
import { formatEventSchedule, monthlyService, pastEvents, upcomingEvents } from "../../content/events";
import { site } from "../../content/site";
```

`getImageAsset` is no longer needed: the card no longer renders an image, so its only use at the old `:64-65` disappears.

- [ ] **Step 4: Replace the featured-events section**

Replace the block at `events-page.tsx:43-93` with the following two sections:

```tsx
      <section class="featured-events-section section-secondary" aria-labelledby="featured-events-title">
        <div class="container">
          <div class="section-heading-row">
            <SectionHeading
              id="featured-events-title"
              eyebrow="Special gatherings"
              title="Upcoming Events"
              description="Join us for the gatherings we have announced. Details for each one appear here as they are confirmed."
            />
            <ButtonLink className="text-link" href="/contact" icon="arrow-right">
              Ask about an event
            </ButtonLink>
          </div>
          {upcomingEvents.length > 0 ? (
            <div class="card-grid card-grid-three">
              {upcomingEvents.map((event) => (
                <Card
                  className="event-card"
                  eyebrow={formatEventSchedule(event)}
                  title={event.title}
                  description={event.description}
                >
                  <p class="event-location">{event.location}</p>
                </Card>
              ))}
            </div>
          ) : (
            <div class="empty-state empty-state-large">
              <p class="eyebrow">The next chapter</p>
              <h3>No upcoming events</h3>
              <p>
                Our featured events calendar is being prepared. Join us for a regular service in the meantime, or contact
                us to learn more.
              </p>
              <ButtonLink className="button button-secondary" href="/contact" icon="arrow-right">
                Contact Us
              </ButtonLink>
            </div>
          )}
        </div>
      </section>

      <section class="past-events-section section-cream" aria-labelledby="past-events-title">
        <div class="container">
          <SectionHeading
            id="past-events-title"
            eyebrow="Recent history"
            title="Past Events"
            description="A look back at the gatherings that have brought our church family together."
          />
          {pastEvents.length > 0 ? (
            <div class="card-grid card-grid-three">
              {pastEvents.map((event) => (
                <Card
                  className="past-event-card"
                  eyebrow={formatEventSchedule(event)}
                  title={event.title}
                  description={event.description}
                >
                  {event.recap ? <p class="event-recap">{event.recap}</p> : null}
                  <p class="event-location">{event.location}</p>
                </Card>
              ))}
            </div>
          ) : (
            <div class="empty-state">
              <p class="eyebrow">Coming soon</p>
              <h3>No past events listed yet</h3>
            </div>
          )}
        </div>
      </section>
```

- [ ] **Step 5: Run the pages suite to verify the events block passes**

Run: `bun test tests/pages.test.ts 2>&1 | rg -A6 'events page'`
Expected: the four `events page` tests PASS. The home-page test in the same file still fails and is fixed in Task 8.

- [ ] **Step 6: Verify the routes contract still holds**

Run: `bun test tests/routes.test.ts`
Expected: PASS. `past-events-title` resolves and is unique, and no new internal `href` was introduced.

- [ ] **Step 7: Run the accessibility audit**

Run: `bun test tests/interactions.test.ts 2>&1 | rg '^\(fail\)'`
Expected: only the home-page alt/section failures from Task 6 Step 6, not new ones from this task. The new Past Events section introduces no interactive element, so it adds no accessibility finding.

- [ ] **Step 8: Commit**

```bash
git add src/components/pages/events-page.tsx tests/pages.test.ts
git commit -m "feat: render upcoming and past events sections"
```

---

### Task 8: Slice the upcoming list on the home page

Without this the home teaser would show past events under a heading that says "Upcoming Events", which is the exact bug that motivated splitting the model.

**Files:**
- Modify: `src/components/pages/home-page.tsx:1-13`, `:170-176`
- Test: `tests/pages.test.ts:37`, `:47`

**Interfaces:**
- Consumes: `upcomingEvents`, `formatEventSchedule` from `src/content/events.ts` (Task 6); `Card` from `src/components/ui/card.tsx`.
- Produces: a home page whose "Upcoming Events" section renders only upcoming events, newest-announced first, capped at three.

- [ ] **Step 1: Write the failing test**

In `tests/pages.test.ts`, in the `home page` describe block, replace the line at `:47`:

```ts
    expect(html).toContain("No upcoming events");
```

with:

```ts
    expect(html).toContain("I AM Revival");
    expect(html).toContain("Women's Anniversary");
    expect(html).not.toContain("No upcoming events");
```

Add a new test to the same block:

```ts
  test("shows only upcoming events in the home teaser", async () => {
    const { html } = await getPage("/");

    expect(html).toContain("Upcoming Events");
    expect(html).toContain("Carol Service");
    expect(html).not.toContain("Annual Church Thanksgiving Anniversary");
    expect(html).not.toContain("Children's Anniversary");
    expect(html).not.toContain("Past Events");
  });
```

- [ ] **Step 2: Run the pages suite to verify it fails**

Run: `bun test tests/pages.test.ts 2>&1 | rg '^\(fail\)'`
Expected: FAIL on the home teaser, because `events.slice(0, 3)` currently returns the first three array entries, which are all past events.

- [ ] **Step 3: Update the import in `home-page.tsx`**

Replace the `events` import at `home-page.tsx` line 5 — currently `import { events } from "../../content/events";` — with:

```tsx
import { formatEventSchedule, upcomingEvents } from "../../content/events";
```

- [ ] **Step 4: Replace the teaser branch**

Replace the block at `home-page.tsx:170-176`:

```tsx
          {events.length > 0 ? (
            <div class="card-grid card-grid-three">
              {events.slice(0, 3).map((event) => (
                <Card image={event.image} title={event.title} description={`${event.date} · ${event.time}`} />
              ))}
            </div>
          ) : (
```

with:

```tsx
          {upcomingEvents.length > 0 ? (
            <div class="card-grid card-grid-three">
              {upcomingEvents.slice(0, 3).map((event) => (
                <Card
                  className="event-card"
                  eyebrow={formatEventSchedule(event)}
                  title={event.title}
                  description={event.description}
                />
              ))}
            </div>
          ) : (
```

`Card` renders `description` and the optional `eyebrow`; omitting `image` is supported (`card.tsx:20`).

- [ ] **Step 5: Run the pages suite to verify it passes**

Run: `bun test tests/pages.test.ts`
Expected: PASS, all home-page and events-page tests green.

- [ ] **Step 6: Run the full suite**

Run: `bun test`
Expected: every suite green.

- [ ] **Step 7: Commit**

```bash
git add src/components/pages/home-page.tsx tests/pages.test.ts
git commit -m "fix: show only upcoming events in the home teaser"
```

---

### Task 9: Style the past-event treatment and update the docs

Adds the two classes the spec calls for and records the `status` discipline in `CLAUDE.md`, so a future contributor does not "helpfully" replace the hand-set `status` with a date comparison.

**Files:**
- Modify: `src/input.css:1326-1335` (append after the existing `.event-location` rule)
- Modify: `static/style.css` (generated, never hand-edited)
- Modify: `tests/stylesheet.test.ts`
- Modify: `CLAUDE.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: the `past-event-card` and `event-recap` class names emitted by Task 7.
- Produces: a green stylesheet contract in both stylesheets, and documentation of the `status` discipline and the `src` convention.

- [ ] **Step 1: Write the failing stylesheet test**

Append a new describe block to `tests/stylesheet.test.ts`, following the existing `parseStylesheet` / `readSourceStylesheet` / `readShippedStylesheet` / `findValue` helpers:

```ts
describe("past event treatment", () => {
  test("mutes the past event card without introducing new colour tokens", async () => {
    const shipped = parseStylesheet(await readShippedStylesheet());
    const source = parseStylesheet(await readSourceStylesheet());

    for (const rules of [source, shipped]) {
      expect(findValue(rules, ".past-event-card", "border-color", null)).toEqual(["var(--color-warm-border)"]);
      expect(findValue(rules, ".past-event-card", "box-shadow", null)).toEqual(["none"]);
      expect(findValue(rules, ".past-event-card:hover", "transform", null)).toEqual(["none"]);
      expect(findValue(rules, ".past-event-card:hover", "box-shadow", null)).toEqual(["none"]);
    }
  });

  test("styles the recap line inside a card", async () => {
    const shipped = parseStylesheet(await readShippedStylesheet());
    const source = parseStylesheet(await readSourceStylesheet());

    for (const rules of [source, shipped]) {
      expect(findValue(rules, ".event-recap", "font-size", null)).toEqual(["0.95rem"]);
    }
  });
});
```

- [ ] **Step 2: Run the stylesheet suite to verify it fails**

Run: `bun test tests/stylesheet.test.ts`
Expected: FAIL — `findValue` returns `[]` for `.past-event-card` because the class does not exist yet.

- [ ] **Step 3: Add the CSS to `src/input.css`**

Append immediately after the `.event-location` rule that ends at `src/input.css:1335`:

```css
.past-event-card {
  border-color: var(--color-warm-border);
  box-shadow: none;
}

.past-event-card .card-content .eyebrow {
  color: var(--color-muted-foreground);
}

.past-event-card:hover {
  transform: none;
  box-shadow: none;
}

.event-recap {
  font-size: 0.95rem;
}
```

`--color-warm-border` is defined at `input.css` in the `:root` token block, and `--color-muted-foreground` likewise. Both are existing tokens, so no new colour is introduced. `.past-event-card:hover` has the same specificity as `.card:hover` (`input.css:261`) and appears later in the source, so it wins.

- [ ] **Step 4: Rebuild the shipped stylesheet**

Run: `bun run css:build`
Expected: `static/style.css` regenerated and containing `.past-event-card`.

- [ ] **Step 5: Run the stylesheet suite to verify it passes**

Run: `bun test tests/stylesheet.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the full gate**

Run: `bun run check`
Expected: PASS — `type-check`, then `css:build`, then all tests, then the production build.

- [ ] **Step 7: Document the `status` discipline in `CLAUDE.md`**

Add to the "Content and behaviour" section:

```markdown
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

Three of the four upcoming events have no announced date, so `date` and `time` are both
optional. Always render a schedule through `formatEventSchedule()`, which returns
`"Date to be announced"` when neither is set. Never interpolate `event.date` directly.

Events carry no image, no photograph gallery, and no slug. A dedicated photo gallery page
is deliberately deferred; do not add those fields speculatively.
```

- [ ] **Step 8: Document the image `src` convention in `CLAUDE.md`**

Extend the existing bullet at `CLAUDE.md:40`:

```markdown
- `src/content/site.ts` owns image metadata. Add `srcset`/`sizes` to the asset and resolve them with `getImageSource(src, sizes?)` rather than hardcoding paths in a component. For each asset, `src` is the **largest local file for that asset** and is itself the top `srcset` entry; `tests/assets.test.ts` pins this for `hero` and `about`. Never ship a full-resolution original as a `src` when a 1600w derivative is available — a 6000×4000 original is over 10 MB. Generate ladders with `bun run scripts/image-variants.ts <source> <base-name>`, which prints the paste-ready `srcset` literal and the real `width`/`height` read back from the generated files.
```

- [ ] **Step 9: Update the route description in `README.md`**

Replace the `/events` line at `README.md:25`:

```markdown
- `/events` - Weekly services, the monthly Transformation Night, upcoming events, and past events
```

- [ ] **Step 10: Run the full gate again after the doc edits**

Run: `bun run check`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/input.css static/style.css tests/stylesheet.test.ts CLAUDE.md README.md
git commit -m "feat: add past event styling and document the event model"
```

---

## Verification

After Task 9, confirm the whole change independently of the test suite:

```bash
bun run check
bun test 2>&1 | tail -5
du -sh static/images
git status --short
```

Expected:

- `bun run check` exits 0 across `type-check`, `css:build`, `test`, and `build`.
- `du -sh static/images` is roughly 6 MB, down from roughly 28 MB.
- `git status --short` is empty, so no stray was left untracked by Tasks 1 or 4.

Then confirm the rendered behaviour by hand:

```bash
bun run dev:server
curl -s http://127.0.0.1:3000/events | rg -o 'Upcoming Events|Past Events|Date to be announced|Christmas Service|Annual Church Thanksgiving Anniversary'
curl -s http://127.0.0.1:3000/ | rg -o "Upcoming Events|Past Events|Christmas Service|Annual Church Thanksgiving Anniversary"
```

Expected on `/events`: all five strings present. Expected on `/`: `Upcoming Events` and `Christmas Service` present; `Past Events` and `Annual Church Thanksgiving Anniversary` absent. The second pair of absences is the whole point of the split — if a past event ever appears on the home page, Task 8 has regressed.

## Notes for the executor

- **The working tree starts dirty.** It carries uncommitted image deletions and additions from an abandoned rename. Task 1 resolves the `prayer-fellowship` part; `bible-study.jpg`, `src/input.css`, `src/components/site-*.tsx`, and `static/style.css` also show as modified. Inspect `git diff` for any file a task touches before staging it, and stage only the paths each task names. Never `git add -A`.
- **Two tasks are deliberately red between steps.** Task 1 ends with three `assets.test.ts` failures, closed by Task 4. Task 5 ends with `type-check` failing on two sites, closed by Task 6. Neither is a mistake; do not "fix" them early, because Task 4 regenerates the files from the chosen photograph and Task 6 rewrites the array.
- **Task 3 blocks on a human.** Stop and ask. Choosing photographs of a real congregation is the maintainer's decision, not the executor's.
- **No placeholder text anywhere.** Task 3 commits the maintainer's real choices to `docs/photo-choices.md`, and Task 4 reads its source paths and alt strings from that file. If any value is still missing at Task 4 Step 2, stop and resolve it with the maintainer — never invent a filename, an alt string, or a measurement.
