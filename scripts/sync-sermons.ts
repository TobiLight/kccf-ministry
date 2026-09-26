import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { buildSnapshot, parseFeed, type RawFeedEntry, type SermonSnapshot } from "../src/content/sermon-feed";
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

type ExistingSnapshot =
  | { state: "absent" }
  | { state: "valid"; snapshot: SermonSnapshot }
  | { state: "corrupt"; reason: string };

function parseExisting(raw: string | null): ExistingSnapshot {
  if (raw === null) {
    return { state: "absent" };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { state: "corrupt", reason: `not valid JSON (${(error as Error).message})` };
  }

  if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as SermonSnapshot).entries)) {
    return { state: "corrupt", reason: "it has no entries array" };
  }

  return { state: "valid", snapshot: parsed as SermonSnapshot };
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

  let raw: RawFeedEntry[];

  try {
    raw = parseFeed(xml);
  } catch (error) {
    return { ok: false, reason: (error as Error).message };
  }

  if (!xml.includes(channelId)) {
    return { ok: false, reason: `feed does not mention channel ${channelId}` };
  }

  const rawExisting = deps.readSnapshot();
  const existing = parseExisting(rawExisting);

  if (existing.state === "corrupt") {
    return {
      ok: false,
      reason: `the committed snapshot is unreadable because ${existing.reason}, so refusing to overwrite it and risk dropping every sermon older than the feed window; repair or delete src/content/sermons.generated.json`,
    };
  }

  const preserved = existing.state === "valid" ? existing.snapshot : null;
  const existingIds = new Set((preserved?.entries ?? []).map((entry) => entry.youtubeId));
  const incomingIds = new Set(raw.map((entry) => entry.youtubeId));
  const next = buildSnapshot(preserved, raw, channelId, deps.now().toISOString());
  const added = next.entries.filter((entry) => !existingIds.has(entry.youtubeId));
  const flagged = next.entries.filter((entry) => entry.needsCuration);
  const missing = (preserved?.entries ?? []).filter((entry) => !incomingIds.has(entry.youtubeId));

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

function readSnapshotFromDisk(): string | null {
  try {
    return readFileSync(snapshotPath, "utf8");
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
