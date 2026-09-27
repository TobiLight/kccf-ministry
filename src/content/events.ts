import type { ChurchEvent, ServiceTime } from "./types";

export const monthlyService: ServiceTime = {
  name: "Every 1st Thursday Transformation Night",
  time: "10:00 PM",
};

/** Newest first for `pastEvents`; announcement order for `upcomingEvents`. Never sorted by date. */
export const events: ChurchEvent[] = [
  {
    status: "past",
    title: "Annual Church Thanksgiving Anniversary",
    date: "September 20, 2026",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description:
      "Our eighteenth annual thanksgiving gathering, marking another year of God's faithfulness over KCCF Mount Zion.",
    recap: "The service carried the theme Harvest of Abundance.",
  },
  {
    status: "past",
    title: "Thanksgiving Anniversary",
    date: "September 21, 2025",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "The church gave thanks together for another year of ministry, worship, and community.",
  },
  {
    status: "past",
    title: "Praise Night",
    date: "September 19, 2025",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "An evening of praise and worship, lifting our voices ahead of the anniversary service.",
  },
  {
    status: "past",
    title: "Youth Thanksgiving Service: Light of the World",
    date: "July 20, 2025",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "Our youth gathered for a thanksgiving service themed Light of the World.",
  },
  {
    status: "past",
    title: "Children's Anniversary",
    date: "June 1, 2025",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "Celebrating the children of KCCF Mount Zion and the community that surrounds them.",
  },
  {
    status: "upcoming",
    title: "I AM Revival",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "A season of renewal, expecting God to revive and strengthen his church again.",
  },
  {
    status: "upcoming",
    title: "Women's Anniversary",
    date: "November 2026",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "Celebrating the women of KCCF Mount Zion and their faithfulness over the year.",
  },
  {
    status: "upcoming",
    title: "Carol Service",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "A carol service to welcome the Christmas season. Date to be announced.",
  },
  {
    status: "upcoming",
    title: "Christmas Service",
    date: "December 2026",
    location: "KCCF Mount Zion, Ikotun, Lagos",
    description: "Celebrating the birth of Christ with worship and the Word. Date to be announced.",
  },
];

export const upcomingEvents = events.filter((event) => event.status === "upcoming");
export const pastEvents = events.filter((event) => event.status === "past");

export function formatEventSchedule(event: ChurchEvent): string {
  const parts = [event.date, event.time].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Date to be announced";
}
