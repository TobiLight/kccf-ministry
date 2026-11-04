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

const youtube: YoutubeChannel = {
  channelId: "UCRNGCZhVNV2Pj80fs20GNog",
  channelUrl: "https://www.youtube.com/@kccfministries1579",
  playlistId: "",
};

const social: SocialLink[] = [
  { label: "Facebook", href: contact.facebookUrl, icon: "facebook", handle: "@kccfministries" },
  { label: "YouTube", href: youtube.channelUrl, icon: "youtube", handle: "@kccfministries1579" },
  { label: "TikTok", href: "https://www.tiktok.com/@kccf.ministries", icon: "tiktok", handle: "@kccf.ministries" },
  { label: "Instagram", href: "https://www.instagram.com/kccf__ministries", icon: "instagram", handle: "@kccf__ministries" },
];

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
  { name: "Every 1st Thursday - Transformation Night", time: "10:00 PM" },
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

const pastorAbimbolaSrcset = [
  "/static/images/pastor_abimbola-640.jpg 640w",
  "/static/images/pastor_abimbola-1024.jpg 1024w",
  "/static/images/pastor_abimbola.jpg 1600w",
].join(", ");

const pastorIfeanyiSrcset = [
  "/static/images/pastor_ifeanyi-640.jpg 640w",
  "/static/images/pastor_ifeanyi-1024.jpg 1024w",
  "/static/images/pastor_ifeanyi.jpg 1600w",
].join(", ");

const pastorFemiSrcset = [
  "/static/images/brother_femi-640.jpg 640w",
  "/static/images/brother_femi-1024.jpg 1024w",
  "/static/images/brother_femi.jpg 1600w",
].join(", ");

const brotherFemiSrcset = [
  "/static/images/brother_femi-640.jpg 640w",
  "/static/images/brother_femi-1024.jpg 1024w",
  "/static/images/brother_femi.jpg 1600w",
].join(", ");

const leadershipSrcset = [
  "/static/images/leadership-640.jpg 640w",
  "/static/images/leadership-1024.jpg 1024w",
  "/static/images/leadership-1600.jpg 1600w",
  "/static/images/leadership.jpg 2048w",
].join(", ");

const sermonsSrcset = [
  "/static/images/sermon-640.jpg 640w",
  "/static/images/sermon-1024.jpg 1024w",
  "/static/images/sermon-1600.jpg 1600w",
  "/static/images/sermon-2048.jpg 2048w",
  "/static/images/sermon.jpg",
].join(", ");

const ourStorySrcset = [
  "/static/images/our_story-640.jpg 640w",
  "/static/images/our_story-1024.jpg 1024w",
  "/static/images/our_story-1600.jpg 1600w",
  "/static/images/our_story.jpg 2048w",
].join(", ");

const eventSrcset = [
  "/static/images/event-640.jpg 640w",
  "/static/images/event-1024.jpg 1024w",
  "/static/images/event-1600.jpg 1600w",
  "/static/images/event.jpg 2048w",
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
  pastorAbimbola: { src: "/static/images/pastor_abimbola.jpg", width: 600, height: 800, alt: "Pastor Mrs Abimbola Adeyinka", srcset: pastorAbimbolaSrcset, sizes: "(min-width: 64rem) 40rem, (min-width: 48rem) 38vw, 92vw" },
  pastorIfeanyi: { src: "/static/images/pastor_ifeanyi.jpg", width: 600, height: 800, alt: "Pastor Ifeanyi", srcset: pastorIfeanyiSrcset, sizes: "(min-width: 64rem) 40rem, (min-width: 48rem) 38vw, 92vw" },
  pastorFemi: { src: "/static/images/pastor_femi.jpg", width: 600, height: 800, alt: "Brother Femi", srcset: pastorFemiSrcset, sizes: "(min-width: 64rem) 40rem, (min-width: 48rem) 38vw, 92vw" },
  brotherFemi: { src: "/static/images/brother_femi.jpg", width: 600, height: 800, alt: "Brother Femi", srcset: brotherFemiSrcset, sizes: "(min-width: 64rem) 40rem, (min-width: 48rem) 38vw, 92vw" },
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
  leadership: {
    src: "/static/images/leadership.jpg",
    width: 2048,
    height: 1365,
    alt: "Bishop Adeyinka",
    srcset: leadershipSrcset,
    sizes: "(min-width: 64rem) 38rem, (min-width: 48rem) 45vw, 92vw",
  },
  sermon: {
    src: "/static/images/bishop1.jpg",
    width: 2048,
    height: 1365,
    alt: "Bishop Adeyinka preaching during a Sunday service",
    srcset: sermonsSrcset,
    sizes: "(min-width: 64rem) 38rem, (min-width: 48rem) 45vw, 92vw",
  },
  ourStory: {
    src: "/static/images/our_story.jpg",
    width: 2048,
    height: 1365,
    alt: "Members of the congregation worshipping during a Sunday service",
    srcset: ourStorySrcset,
    sizes: "(min-width: 64rem) 38rem, (min-width: 48rem) 45vw, 92vw",
  },
  event: {
    src: "/static/images/event.jpg",
    width: 2048,
    height: 1365,
    alt: "Members of the congregation worshipping during a Sunday service",
    srcset: eventSrcset,
    sizes: "(min-width: 64rem) 38rem, (min-width: 48rem) 45vw, 92vw",
  },
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
    pastorAbimbola: imageAssets.pastorAbimbola.src,
    pastorIfeanyi: imageAssets.pastorIfeanyi.src,
    pastorFemi: imageAssets.pastorFemi.src,
    brotherFemi: imageAssets.brotherFemi.src,
    leadership: imageAssets.leadership.src,
    sermon: imageAssets.sermon.src,
    ourStory: imageAssets.ourStory.src,
    event: imageAssetMap.event.src,
  },
  imageAssets,
};
