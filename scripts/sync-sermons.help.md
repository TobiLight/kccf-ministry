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
- A feed entry with no usable `<published>` date is refused for the whole
  document, the same as a malformed video id. A dateless entry would be committed
  once and then break the sermons page on every later run.
- An unreadable committed snapshot also writes nothing and exits non-zero. A
  file that cannot be read at all, is not valid JSON, has no `entries` array, or
  holds an entry that is not a usable entry is never treated as "no snapshot yet"
  and never reseeded from the feed window, because that would silently drop every
  sermon older than the feed. Fix or delete the file and run again. Only a file
  that genuinely does not exist seeds a fresh snapshot.
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
the curated file lets the next sync restore it from the snapshot. Keep the JSON
valid: if you break it, the next sync refuses to run rather than reseeding from
the feed and losing the archive.

## Reading the report

`newly added 0` on its own is not a fault. `needs curation` and `not in feed`
are the lines worth acting on: the first tells you which generated rows still
need real titles, the second tells you a known video has gone missing.
