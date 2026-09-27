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
  speaker: string;
  date: string;
  summary: string;
  image: string;
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
