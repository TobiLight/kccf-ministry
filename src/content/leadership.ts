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
      role: "Resident Pastor",
      bio: "Pastor David serves the church family through thoughtful teaching, pastoral care, and a commitment to helping people grow in prayer and love.",
      verse: "“He heals the brokenhearted and binds up their wounds.” — Psalm 147:3",
      image: imageAssets.pastorTwo.src,
    },
  ],
  ministryLeaders: [
    {
      name: "Brother Femi",
      role: "Music/Choir Director",
      bio: "Brother Femi helps the church worship with reverence, joy, and a sincere desire to encounter God.",
      image: imageAssets.brotherFemi.src,
      imageAlt: imageAssets.brotherFemi.alt,
    },
    {
      name: "Pastor Mrs Abimbola Adeyinka",
      role: "Teens Church Lead",
      bio: "Pastor Mrs Abimbola Adeyinka creates a joyful environment where teens can discover the love of Jesus and the joy of belonging.",
      image: imageAssets.pastorAbimbola.src,
      imageAlt: imageAssets.pastorAbimbola.alt,
    },
    {
      name: "Pastor Ifeanyi",
      role: "Youths Lead",
      bio: "Pastor Ifeanyi encourages young people to build a faith that is relevant, courageous, and alive in everyday life.",
      image: imageAssets.pastorIfeanyi.src,
      imageAlt: imageAssets.pastorIfeanyi.alt,
    },
    // {
    //   name: "Minister Oreoluwa",
    //   role: "Prayer Fellowship Lead",
    //   bio: "Ruth fosters a culture of prayer that carries the church, families, and our community through every season.",
    //   image: imageAssets.prayerFellowship.src,
    //   imageAlt: imageAssets.prayerFellowship.alt,
    // },
    {
      name: "Jide Bodunrin",
      role: "Media Director",
      bio: "Jide leads the media team in capturing and broadcasting the gospel through livestream, video production, and digital content that reaches beyond our walls.",
      image: imageAssets.ministries.src,
      imageAlt: imageAssets.ministries.alt,
    },
  ],
};