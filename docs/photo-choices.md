# Chosen photographs

Selected 2026-09-27 from `~/Desktop/kccf` (680 photographs, Nikon D5300, 6000x4000).

Shortlisted by `ffmpeg` `signalstats` exposure screening on the **interior percentiles** —
`YLOW >= 20` (shadows not crushed), `YHIGH <= 245` (highlights not clipped), `80 <= YAVG <= 175`.
Note `YLOW`/`YHIGH` are percentiles, not the `YMIN`/`YMAX` extremes. 113 `praise night` frames
measured, 93 passed; 14 of the 80 Sunday frames in the root folder also passed and were added
to the pool. Final selection by the maintainer.

Regenerate any of these with:

    bun run scripts/image-variants.ts <absolute source path> <base name> \
      --widths 640,1024 --src-width 1600 --out static/images --force

`hero` additionally passes `--widths 640,1024,1600 --src-width 2048` to keep its existing ladder.

## hero

- Source: `~/Desktop/kccf/DSC_0334.jpg`
- Measured: YAVG 101.5, YLOW 34, YHIGH 207
- Exif: 2025-09-21, the Sunday 2025 anniversary service
- Shows: a dense standing congregation in colourful attire, most facing forward and engaged
- Alt: `Congregation standing together during a Sunday service`
- Slot: the full-bleed home hero, `sizes: 100vw`. Ladder shape is unchanged from the committed
  asset, so `assets.test.ts:109-114` and `interactions.test.ts:166-168` need no edit.

## worshipMoment

- Source: `~/Desktop/kccf/DSC_0292.jpg`
- Measured: YAVG 92.4, YLOW 40, YHIGH 173
- Exif: 2025-09-21, the Sunday 2025 anniversary service
- Shows: two men with guitars under a legible "JESUS IS LORD" banner
- Alt: `Members of the worship band playing during a Sunday service`
- Slot: the `/sermons` page hero and the `/about` image.

## prayerFellowship

- Source: `~/Desktop/kccf/praise night/DSC_0145.jpg`
- Measured: YAVG 119.2, YLOW 31, YHIGH 236
- Exif: 2025-09-20 02:15, i.e. after midnight in the Friday-night praise session that began
  2025-09-19 at 22:40
- Shows: a woman in white reaching toward children, children in green uniform, congregation behind
- Alt: `A member of the congregation greeting children during a church service`
- Slot: the hero on `/`, `/events`, and `/leadership`.
- The former alt text was `"People holding hands in prayer"`, which was already false of the
  previous image — none of the 680 photographs shows anyone holding hands.

## Unchanged

- `about` — no photograph work. `~/Desktop/about.jpg` is byte-identical to
  `static/images/about.jpg` (MD5 `f3a36dcf96193d186f1d834390f3d03f`, 4389x3292) and `site.ts`
  already declares those dimensions. Alt text stays `"A cross against the sky"`.
- `bibleStudy` — no photograph work, and the file genuinely shows hands on an open Bible. Only its
  declared dimensions are corrected, from `800x600` to the real `2048x1365`. Alt text unchanged.

## Note

People are individually identifiable in all three photographs. That is ordinary and expected for a
church's own congregation, recorded here so it is a deliberate acceptance rather than an oversight.

## 2026 anniversary

No photographs exist for the 2026-09-20 anniversary. The only 2026 frames in the corpus are seven
from 2026-08-29, captured on a different camera body. This is why event imagery was dropped from
the spec rather than stubbed.
