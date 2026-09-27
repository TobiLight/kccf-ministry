import type { Sermon } from "./types";

export type RawFeedEntry = {
  youtubeId: string;
  title: string;
  published: string;
  description: string;
};

export type SnapshotEntry = {
  youtubeId: string;
  title: string;
  speaker: string | null;
  publishedAt: string;
  partIndex: number;
  partCount: number;
  needsCuration: boolean;
};

export type SermonSnapshot = {
  generatedAt: string;
  channelId: string;
  entries: SnapshotEntry[];
};

export class FeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedError";
  }
}

const PERSON_TITLES = ["bishop", "pastor", "bro", "minister", "dr", "apostle", "rev"];

const videoIdPattern = /^[A-Za-z0-9_-]{6,}$/;

function decodeXml(value: string): string {
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  const text = cdata ? cdata[1] : value;

  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function tagText(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));

  return match ? decodeXml(match[1]).trim() : "";
}

export function parseFeed(xml: string): RawFeedEntry[] {
  if (!/<feed[\s>]/.test(xml)) {
    throw new FeedError("response is not an atom feed");
  }

  const blocks = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

  if (blocks.length === 0) {
    throw new FeedError("feed contains no entries");
  }

  const entries = blocks.map((block) => ({
    youtubeId: tagText(block, "yt:videoId"),
    title: tagText(block, "title"),
    published: tagText(block, "published"),
    description: tagText(block, "media:description"),
  }));

  for (const entry of entries) {
    if (entry.youtubeId && !videoIdPattern.test(entry.youtubeId)) {
      throw new FeedError(
        `feed carries the malformed video id ${JSON.stringify(entry.youtubeId)}, so it is broken or hostile and nothing was ingested`,
      );
    }
  }

  const usable = entries.filter((entry) => entry.youtubeId.length > 0);

  if (usable.length === 0) {
    throw new FeedError(
      `feed has ${blocks.length} <entry> block(s) but no usable video id in any of them, so the feed shape or namespace changed`,
    );
  }

  return usable;
}

function looksLikeSpeaker(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed || trimmed.includes(":")) {
    return false;
  }

  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length < 2 || words.length > 5) {
    return false;
  }

  return PERSON_TITLES.some((title) => new RegExp(`\\b${title}\\.?\\b`, "i").test(trimmed));
}

function normaliseGroupKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function publishedDate(published: string): string {
  return published.slice(0, 10);
}

function titleFromDescription(description: string, fallbackTitle: string) {
  const lines = description.split("\n").map((line) => line.trim()).filter(Boolean);
  const [first = "", ...rest] = lines;

  if (!first) {
    return { title: fallbackTitle, fromFallback: true, speaker: null as string | null };
  }

  const speakerLine = rest.find((line) => looksLikeSpeaker(line));

  return { title: first, fromFallback: false, speaker: speakerLine ?? null };
}

export function deriveEntries(raw: RawFeedEntry[]): SnapshotEntry[] {
  const titled = raw.map((entry) => {
    const derived = titleFromDescription(entry.description, entry.title);

    return {
      youtubeId: entry.youtubeId,
      title: derived.title,
      speaker: derived.speaker,
      fromFallback: derived.fromFallback,
      publishedAt: publishedDate(entry.published),
    };
  });

  const groups = new Map<string, typeof titled>();

  for (const entry of titled) {
    const key = normaliseGroupKey(entry.title);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  return titled
    .map((entry) => {
      const group = groups.get(normaliseGroupKey(entry.title)) ?? [entry];
      const ordered = [...group].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
      const partCount = group.length;
      const partIndex = ordered.findIndex((candidate) => candidate.youtubeId === entry.youtubeId) + 1;
      const needsCuration =
        entry.fromFallback || /[/|]/.test(entry.title) || entry.speaker === null || partCount > 1;

      return {
        youtubeId: entry.youtubeId,
        title: entry.title,
        speaker: entry.speaker,
        publishedAt: entry.publishedAt,
        partIndex,
        partCount,
        needsCuration,
      };
    })
    .sort(
      (a, b) =>
        a.publishedAt.localeCompare(b.publishedAt) ||
        a.partIndex - b.partIndex ||
        a.youtubeId.localeCompare(b.youtubeId),
    );
}

export function buildSnapshot(
  existing: SermonSnapshot | null,
  raw: RawFeedEntry[],
  channelId: string,
  generatedAt: string,
): SermonSnapshot {
  const derived = deriveEntries(raw);
  const byId = new Map<string, SnapshotEntry>();

  for (const entry of existing?.entries ?? []) {
    byId.set(entry.youtubeId, entry);
  }

  for (const entry of derived) {
    if (!byId.has(entry.youtubeId)) {
      byId.set(entry.youtubeId, entry);
    }
  }

  return {
    generatedAt,
    channelId,
    entries: [...byId.values()].sort((a, b) => a.youtubeId.localeCompare(b.youtubeId)),
  };
}

export function resolveSermons(curated: Sermon[], snapshot: SermonSnapshot | null): Sermon[] {
  const merged: Sermon[] = curated.map((sermon) => ({ ...sermon }));
  const curatedIds = new Set(curated.map((sermon) => sermon.youtubeId).filter(Boolean));

  for (const entry of snapshot?.entries ?? []) {
    if (curatedIds.has(entry.youtubeId)) {
      continue;
    }

    const title = entry.partCount > 1 ? `${entry.title} — Part ${entry.partIndex} of ${entry.partCount}` : entry.title;

    merged.push({
      title,
      date: entry.publishedAt,
      speaker: entry.speaker ?? undefined,
      youtubeId: entry.youtubeId,
      partIndex: entry.partIndex,
      needsCuration: entry.needsCuration,
    });
  }

  return merged.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }

    const partDelta = (a.partIndex ?? 0) - (b.partIndex ?? 0);

    return partDelta !== 0 ? partDelta : a.title.localeCompare(b.title);
  });
}

const displayDate = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

export function formatSermonDate(iso: string): string {
  return displayDate.format(new Date(`${iso}T00:00:00Z`));
}

export function watchUrlFor(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}
