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

export type FeaturedEvent = {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image: string;
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
