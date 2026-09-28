import type { Sermon } from "./types";

/**
 * Curated archive of record. Unlimited, and hand-maintained.
 *
 * This file exists for sermons the YouTube feed cannot supply: everything older
 * than the roughly five-day feed window, and any sermon whose real title,
 * speaker, or summary a human has written. Entries here always win over feed
 * data for the same `youtubeId`.
 *
 * Currently empty because every recorded message so far lives in
 * `sermons.generated.json`. To add a sermon, give it a `youtubeId` and a
 * `date`, and a human-written `title` and `summary` to replace the derived one.
 */
export const sermons: Sermon[] = [];
