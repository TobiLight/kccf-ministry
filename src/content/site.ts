import type { ContactInfo, ImageAsset, NavItem, ServiceTime, SocialLink, YoutubeChannel } from "./types";

const address = "13 Taiwo Akinsuli street, Ikotun, Lagos 102213, Lagos";

const googleMapsSearchUrl = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

const contact: ContactInfo = {
  phone: "+2349056347603",
  email: "info@kccfministries.org",
  address,
  mapsUrl: googleMapsSearchUrl(address),
  facebookUrl: "https://www.facebook.com/kccfministries",
};

const social: SocialLink[] = [{ label: "Facebook", href: contact.facebookUrl }];

const youtube: YoutubeChannel = {
  channelId: "UCRNGCZhVNV2Pj80fs20GNog",
  channelUrl: "https://www.youtube.com/@kccfministries1579",
  playlistId: "",
};

const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Ministries", href: "/ministries" },
  { label: "Sermons", href: "/sermons" },
  { label: "Events", href: "/events" },
  { label: "Leadership", href: "/leadership" },
  { label: "Contact", href: "/contact" },
];

const mobileNavItems: NavItem[] = [...navItems, { label: "Visit Us", href: "/contact#visit-us" }];

const services: ServiceTime[] = [
  { name: "Sunday School", time: "8:00 AM" },
  { name: "Sunday Worship", time: "9:00 AM" },
  { name: "Wednesday Throne of Grace", time: "9:00 AM" },
  { name: "New Mooon - Transformation Night", time: "10:00 PM" },
];

const aboutSrcset = [
  "/static/images/about-640.jpg 640w",
  "/static/images/about-1024.jpg 1024w",
  "/static/images/about-1600.jpg 1600w",
  "/static/images/about-2400.jpg 2400w",
].join(", ");

const contactSrcset = [
  "/static/images/kccflogo-640.jpg 640w",
  "/static/images/kccflogo-1024.jpg 1024w",
  "/static/images/kccflogo-1600.jpg 1600w",
  "/static/images/kccflogo-2400.jpg 2400w",
].join(", ");

const heroSrcset = [
  "/static/images/hero-640.jpg 640w",
  "/static/images/hero-1024.jpg 1024w",
  "/static/images/hero-1600.jpg 1600w",
  "/static/images/hero.jpg 2048w",
].join(", ");

const worshipMomentSrcset = [
  "/static/images/worship-moment-640.jpg 640w",
  "/static/images/worship-moment-1024.jpg 1024w",
  "/static/images/worship-moment.jpg 1600w",
].join(", ");

const prayerFellowshipSrcset = [
  "/static/images/prayer-fellowship-640.jpg 640w",
  "/static/images/prayer-fellowship-1024.jpg 1024w",
  "/static/images/prayer-fellowship.jpg 1600w",
].join(", ");

const welcomeSectionSrcset = [
  "/static/images/welcome-section-640.jpg 640w",
  "/static/images/welcome-section-1024.jpg 1024w",
  "/static/images/welcome-section-1600.jpg 1600w",
  "/static/images/welcome-section.jpg 4000w",
].join(", ");

const ministriesSrcset = [
  "/static/images/ministries-640.jpg 640w",
  "/static/images/ministries-1024.jpg 1024w",
  "/static/images/ministries-1600.jpg 1600w",
  "/static/images/ministries.jpg 2335w",
].join(", ");

const imageAssetMap = {
  hero: {
    src: "/static/images/hero.jpg",
    width: 2048,
    height: 1366,
    alt: "Congregation worshipping with raised hands during a Sunday service",
    srcset: heroSrcset,
    sizes: "100vw",
  },
  prayerFellowship: {
    src: "/static/images/prayer-fellowship.jpg",
    width: 1600,
    height: 1066,
    alt: "A member of the congregation greeting children during a church service",
    srcset: prayerFellowshipSrcset,
    sizes: "(min-width: 64rem) 38rem, (min-width: 48rem) 45vw, 92vw",
  },
  welcomeSection: {
    src: "/static/images/welcome-section.jpg",
    width: 4000,
    height: 4000,
    alt: "Members of the congregation worshipping during a Sunday service",
    srcset: welcomeSectionSrcset,
    sizes: "(min-width: 64rem) 38rem, (min-width: 48rem) 45vw, 92vw",
  },
  logo: { src: "/static/images/logo.jpg", width: 200, height: 200, alt: "KCCF Ministries" },
  about: {
    src: "/static/images/about.jpg",
    width: 4389,
    height: 3292,
    alt: "A cross against the sky",
    srcset: aboutSrcset,
    sizes: "(min-width: 64rem) 40rem, (min-width: 48rem) 38vw, 92vw",
  },
  contact: {
    src: "/static/images/kccflogo.jpg",
    width: 4389,
    height: 3292,
    alt: "Kingdom Covenant of Christ Fellowship Logo",
    srcset: contactSrcset,
    sizes: "(min-width: 64rem) 40rem, (min-width: 48rem) 38vw, 92vw",
  },
  worshipMoment: {
    src: "/static/images/worship-moment.jpg",
    width: 1600,
    height: 1066,
    alt: "Members of the worship band playing during a Sunday service",
    srcset: worshipMomentSrcset,
    sizes: "(min-width: 64rem) 38rem, (min-width: 48rem) 45vw, 92vw",
  },
  bibleStudy: { src: "/static/images/bible-study.jpg", width: 2048, height: 1365, alt: "Hands resting on an open Bible" },
  ministries: {
    src: "/static/images/ministries.jpg",
    width: 2335,
    height: 3500,
    alt: "KCCF Ministries serving the community",
    srcset: ministriesSrcset,
    sizes: "(min-width: 64rem) 38rem, (min-width: 48rem) 45vw, 92vw",
  },
  pastorOne: { src: "/static/images/pastor-1.jpg", width: 2048, height: 1365, alt: "" },
  pastorTwo: { src: "/static/images/pastor-2.jpg", width: 600, height: 800, alt: "" },
} satisfies Record<string, ImageAsset>;

export const imageAssets: Record<keyof typeof imageAssetMap, ImageAsset> = imageAssetMap;

export function getImageAsset(src: string) {
  return Object.values(imageAssets).find((asset) => asset.src === src);
}

export function getResponsiveSourceSet(src: string) {
  const asset = getImageAsset(src);
  return asset?.srcset ? { srcset: asset.srcset, sizes: asset.sizes } : {};
}

export function getImageSource(src: string, sizes?: string) {
  const asset = getImageAsset(src);

  return {
    src,
    srcset: asset?.srcset,
    sizes: asset?.srcset ? (sizes ?? asset.sizes) : undefined,
    width: asset?.width,
    height: asset?.height,
  };
}

export const site = {
  name: "Kingdom Covenant Of Christ Fellowship",
  mark: "K",
  description: "A warm, welcoming Christian family worshiping together in the heart of Lagos.",
  navItems,
  mobileNavItems,
  contact,
  social,
  youtube,
  services,
  images: {
    hero: imageAssets.hero.src,
    prayerFellowship: imageAssets.prayerFellowship.src,
    welcomeSection: imageAssets.welcomeSection.src,
    about: imageAssets.about.src,
    worshipMoment: imageAssets.worshipMoment.src,
    bibleStudy: imageAssets.bibleStudy.src,
    ministries: imageAssets.ministries.src,
    pastorOne: imageAssets.pastorOne.src,
    pastorTwo: imageAssets.pastorTwo.src,
    logo: imageAssets.logo.src,
    contact: imageAssets.contact.src,
  },
  imageAssets,
};
