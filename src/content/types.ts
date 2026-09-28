export type RenderableChild = string | number | boolean | null | undefined | { toString(): string | Promise<string> };

export type ImageAsset = {
  src: string;
  width: number;
  height: number;
  alt: string;
  srcset?: string;
  sizes?: string;
};

export type NavItem = {
  label: string;
  href: string;
};

export type ServiceTime = {
  name: string;
  time: string;
};

export type ContactInfo = {
  phone: string;
  email: string;
  address: string;
  mapsUrl: string;
  facebookUrl: string;
};

export type SocialLink = {
  label: string;
  href: string;
};

export type Ministry = {
  name: string;
  description: string;
  image: string;
};

export type Sermon = {
  title: string;
  /** ISO 8601 calendar date, e.g. "2026-09-21". Sortable; formatted at render. */
  date: string;
  speaker?: string;
  summary?: string;
  /** Local asset src from imageAssetMap. Curated highlights only. */
  image?: string;
  /** Human duration, e.g. "42:10". Curated only. */
  duration?: string;
  /** Reserved for future series grouping. Unused in v1. */
  series?: string;
  /** 1-based position within a multi-part sermon. Never rendered directly. */
  partIndex?: number;
  /** Mutually exclusive with facebookUrl. */
  youtubeId?: string;
  /** Mutually exclusive with youtubeId. */
  facebookUrl?: string;
  /**
   * True on feed-derived entries whose title or speaker was uncertain, so the
   * archive can flag them. Curated entries never set this.
   */
  needsCuration?: boolean;
};

export type YoutubeChannel = {
  channelId: string;
  channelUrl: string;
  /** Intentionally empty: YouTube playlist feeds return HTTP 404. See CLAUDE.md. */
  playlistId: string;
};

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

export type Leader = {
  name: string;
  role: string;
  bio: string;
  verse?: string;
  image?: string;
  imageAlt?: string;
};

export type MinistryLeader = Omit<Leader, "image" | "imageAlt"> & {
  image: string;
  imageAlt: string;
};
