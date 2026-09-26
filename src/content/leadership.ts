import { imageAssets } from "./site";
import type { Leader, MinistryLeader } from "./types";

export const leadership: {
  pastors: Leader[];
  ministryLeaders: MinistryLeader[];
} = {
  pastors: [
    {
      name: "Bishop Olayinka Adeyinka",
      role: "General Overseer",
      bio: "Bishop Adeyinka leads KCCF Ministries with a heart for biblical truth, caring for people, and building a church where faith becomes everyday practice.",
      verse: "“And we are His workmanship, created in Christ Jesus for good works.” — Ephesians 2:10",
      image: imageAssets.pastorOne.src,
    },
    {
      name: "Pastor David Bodunrin",
      role: "Co-Pastor",
      bio: "Pastor David serves the church family through thoughtful teaching, pastoral care, and a commitment to helping people grow in prayer and love.",
      verse: "“He heals the brokenhearted and binds up their wounds.” — Psalm 147:3",
      image: imageAssets.pastorTwo.src,
    },
  ],
  ministryLeaders: [
    {
      name: "Michael Adebayo",
      role: "Worship Director",
      bio: "Michael helps the church worship with reverence, joy, and a sincere desire to encounter God.",
      image: imageAssets.worshipMoment.src,
      imageAlt: imageAssets.worshipMoment.alt,
    },
    {
      name: "Sarah Okafor",
      role: "Children's Ministry Lead",
      bio: "Sarah creates a joyful environment where children can discover the love of Jesus and the joy of belonging.",
      image: imageAssets.about.src,
      imageAlt: imageAssets.about.alt,
    },
    {
      name: "Daniel Okafor",
      role: "Youth Fellowship Lead",
      bio: "Daniel encourages young people to build a faith that is relevant, courageous, and alive in everyday life.",
      image: imageAssets.worshipMoment.src,
      imageAlt: imageAssets.worshipMoment.alt,
    },
    {
      name: "Ruth Adebayo",
      role: "Prayer Fellowship Lead",
      bio: "Ruth fosters a culture of prayer that carries the church, families, and our community through every season.",
      image: imageAssets.prayerFellowship.src,
      imageAlt: imageAssets.prayerFellowship.alt,
    },
    {
      name: "James Eze",
      role: "Outreach Coordinator",
      bio: "James coordinates opportunities for the church to serve its neighbors with practical compassion.",
      image: imageAssets.bibleStudy.src,
      imageAlt: imageAssets.bibleStudy.alt,
    },
  ],
};
