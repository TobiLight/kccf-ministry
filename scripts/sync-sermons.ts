import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import {
  buildSnapshot,
  FeedError,
  isVideoId,
  parseFeed,
  type RawFeedEntry,
  type SermonSnapshot,
  type SnapshotEntry,
} from "../src/content/sermon-feed";
import { site } from "../src/content/site";

const snapshotPath = new URL("../src/content/sermons.generated.json", import.meta.url);
const helpPath = new URL("./sync-sermons.help.md", import.meta.url);

export type SnapshotRead =
  | { state: "absent" }
  | { state: "ok"; contents: string }
  | { state: "error"; reason: string };

export type SyncDeps = {
  fetchImpl: typeof fetch;
  now: () => Date;
  readSnapshot: () => SnapshotRead;
  writeSnapshot: (contents: string) => void;
  log: (line: string) => void;
  apiKey?: string;
};

export type SyncResult =
  | { ok: true; added: number; total: number; report: string }
  | { ok: false; reason: string };

type ExistingSnapshot =
  | { state: "absent" }
  | { state: "valid"; snapshot: SermonSnapshot }
  | { state: "unreadable"; reason: string };

function isSnapshotEntry(value: unknown): value is SnapshotEntry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return (
    isVideoId(entry.youtubeId) &&
    typeof entry.title === "string" &&
    typeof entry.publishedAt === "string" &&
    (entry.speaker === null || typeof entry.speaker === "string") &&
    Number.isInteger(entry.partIndex) &&
    Number.isInteger(entry.partCount) &&
    typeof entry.needsCuration === "boolean"
  );
}

function parseExisting(read: SnapshotRead): ExistingSnapshot {
  if (read.state === "absent") {
    return { state: "absent" };
  }

  if (read.state === "error") {
    return { state: "unreadable", reason: read.reason };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(read.contents);
  } catch (error) {
    return { state: "unreadable", reason: `it is not valid JSON (${(error as Error).message})` };
  }

  if (typeof parsed !== "object" || parsed === null || !Array.isArray((parsed as SermonSnapshot).entries)) {
    return { state: "unreadable", reason: "it has no entries array" };
  }

  const entries = (parsed as SermonSnapshot).entries;
  const malformed = entries.filter((entry) => !isSnapshotEntry(entry));

  if (malformed.length > 0) {
    return {
      state: "unreadable",
      reason: `${malformed.length} of its ${entries.length} entries are not a usable entry, so one carries no video id, title, date, speaker, part counts or curation flag`,
    };
  }

  return { state: "valid", snapshot: parsed as SermonSnapshot };
}

type ApiPlaylistItem = {
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    resourceId: { videoId: string };
  };
};

type ApiPlaylistItemsResponse = {
  items?: ApiPlaylistItem[];
  nextPageToken?: string;
};

type ApiChannelsResponse = {
  items?: Array<{
    contentDetails: {
      relatedPlaylists: {
        uploads: string;
      };
    };
  }>;
};

async function fetchFromApi(
  channelId: string,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<RawFeedEntry[]> {
  const channelsUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  channelsUrl.searchParams.set("part", "contentDetails");
  channelsUrl.searchParams.set("id", channelId);
  channelsUrl.searchParams.set("key", apiKey);

  const channelsResponse = await fetchImpl(channelsUrl.toString());

  if (!channelsResponse.ok) {
    throw new FeedError(
      `channels.list responded ${channelsResponse.status}, so the uploads playlist cannot be resolved`,
    );
  }

  const channelsData = (await channelsResponse.json()) as ApiChannelsResponse;
  const uploadsId = channelsData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsId) {
    throw new FeedError(
      `channels.list returned no uploads playlist for channel ${channelId}, so the channel is wrong or empty`,
    );
  }

  const entries: RawFeedEntry[] = [];
  let pageToken: string | undefined;

  do {
    const playlistUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    playlistUrl.searchParams.set("part", "snippet");
    playlistUrl.searchParams.set("playlistId", uploadsId);
    playlistUrl.searchParams.set("maxResults", "50");
    playlistUrl.searchParams.set("key", apiKey);
    if (pageToken) {
      playlistUrl.searchParams.set("pageToken", pageToken);
    }

    const playlistResponse = await fetchImpl(playlistUrl.toString());

    if (!playlistResponse.ok) {
      throw new FeedError(
        `playlistItems.list responded ${playlistResponse.status} on page ${pageToken ?? "1"}`,
      );
    }

    const playlistData = (await playlistResponse.json()) as ApiPlaylistItemsResponse;

    for (const item of playlistData.items ?? []) {
      const videoId = item.snippet.resourceId.videoId;

      if (!videoId) {
        continue;
      }

      if (!isVideoId(videoId)) {
        throw new FeedError(
          `the API returned the malformed video id ${JSON.stringify(videoId)}, so it is broken or hostile and nothing was ingested`,
        );
      }

      entries.push({
        youtubeId: videoId,
        title: item.snippet.title,
        published: item.snippet.publishedAt,
        description: item.snippet.description,
      });
    }

    pageToken = playlistData.nextPageToken;
  } while (pageToken);

  if (entries.length === 0) {
    throw new FeedError(
      `the uploads playlist for channel ${channelId} has no videos, so the channel is wrong or empty`,
    );
  }

  return entries;
}

export async function syncSermons(deps: SyncDeps): Promise<SyncResult> {
  const { channelId, channelUrl } = site.youtube;
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const lines: string[] = [];
  const log = (line: string) => {
    lines.push(line);
    deps.log(line);
  };

  const useApi = Boolean(deps.apiKey);
  const source = useApi ? "YouTube Data API v3" : "Atom feed";

  let raw: RawFeedEntry[];

  if (useApi && deps.apiKey) {
    try {
      raw = await fetchFromApi(channelId, deps.apiKey, deps.fetchImpl);
    } catch (error) {
      return { ok: false, reason: (error as Error).message };
    }
  } else {
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

    try {
      raw = parseFeed(xml);
    } catch (error) {
      return { ok: false, reason: (error as Error).message };
    }

    if (!xml.includes(channelId)) {
      return { ok: false, reason: `feed does not mention channel ${channelId}` };
    }
  }

  const read = deps.readSnapshot();
  const existing = parseExisting(read);

  if (existing.state === "unreadable") {
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
  log(`  source        ${source}`);
  if (useApi) {
    log(`  channel       ${channelUrl}`);
  } else {
    log(`  feed          ${feedUrl}`);
    log(`  channel       ${channelUrl}`);
  }
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

export function readSnapshotFromDisk(path: URL = snapshotPath): SnapshotRead {
  try {
    return { state: "ok", contents: readFileSync(path, "utf8") };
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      return { state: "absent" };
    }

    return { state: "error", reason: `it could not be read (${(error as Error).message})` };
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(await readFile(helpPath, "utf8"));
    return;
  }

  let pending: string | null = null;
  const apiKey = process.env.YOUTUBE_API_KEY;
  const result = await syncSermons({
    fetchImpl: fetch,
    now: () => new Date(),
    readSnapshot: readSnapshotFromDisk,
    writeSnapshot: (contents) => {
      pending = contents;
    },
    log: (line) => console.log(line),
    ...(apiKey ? { apiKey } : {}),
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
