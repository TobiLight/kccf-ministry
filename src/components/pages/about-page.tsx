import { ButtonLink } from "../ui/button-link";
import { getImageSource } from "../../content/site";
import { Card } from "../ui/card";
import { PageHero } from "../ui/page-hero";
import { SectionHeading } from "../ui/section-heading";
import { leadership } from "../../content/leadership";
import { site } from "../../content/site";

const beliefs = [
  { title: "The Bible", text: "We believe Biblical truth is trustworthy and the foundation of faith and life." },
  { title: "Prayer", text: "We believe prayer shapes our hearts, our homes, and our world." },
  { title: "Community", text: "We believe people grow in faith when they belong to a welcoming family." },
  { title: "Compassion", text: "We believe love compels us to serve our neighbors with humility and generosity." },
];

export function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Our story"
        title="About KCCF"
        description="A Covenant Community Rooted in Christ, gathering in Lagos to worship, serve, and grow together."
        image={site.images.about}
        imageAlt="A cross against the sky"
      />

      <section class="calling-section section-cream" aria-labelledby="calling-title">
        <div class="container calling-grid">
          <SectionHeading
            id="calling-title"
            eyebrow="Our Calling"
            title="Our Mission"
            description="To make room for every person to encounter the love of God, discover their purpose, and become a faithful witness in the world."
          />
          <div class="calling-values">
            <div class="value-panel value-panel-primary">
              <p class="eyebrow">Our Mission</p>
              <h2>To love God and love people.</h2>
              <p>
                We gather around worship, truth, prayer, and service so that every person can flourish in the covenant
                life.
              </p>
            </div>
            <div class="value-panel">
              <p class="eyebrow">Our Vision</p>
              <h2>A community of hope, purpose, and belonging.</h2>
              <p>
                We envision a church that carries faith beyond its walls and becomes a lasting witness of grace in Lagos
                and beyond.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="beliefs-section section-secondary" aria-labelledby="beliefs-title">
        <div class="container">
          <SectionHeading
            id="beliefs-title"
            align="center"
            eyebrow="The foundation of our faith"
            title="What We Believe"
            description="Our shared convictions help us worship with intention and serve with joy."
          />
          <div class="beliefs-grid">
            {beliefs.map((belief, index) => (
              <article class="belief-card">
                <span class="belief-number">0{index + 1}</span>
                <h3>{belief.title}</h3>
                <p>{belief.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section class="story-section section-cream" aria-labelledby="story-title">
        <div class="container story-grid">
          <div class="story-image-wrap">
            <img
              class="editorial-image"
              {...getImageSource(site.images.worshipMoment, "(min-width: 48rem) 50vw, 92vw")}
              alt="Hands raised in worship"
              loading="lazy"
            />
            <div class="image-caption">Rooted in grace</div>
          </div>
          <div>
            <SectionHeading
              id="story-title"
              eyebrow="How we began"
              title="Our Story"
              description="KCCF Ministries was born from a simple conviction: no one should have to walk through life alone."
            />
            <p class="body-copy">
              What began as a small gathering has grown into a covenant community of worshippers, leaders, families, and
              friends who share a common purpose: to know God and make His love known.
            </p>
            <p class="body-copy">
              We continue to pursue a church where truth is spoken with grace, worship is shared with joy, and service is
              the natural expression of love.
            </p>
            <ButtonLink className="text-link" href="/contact" icon="arrow-right">
              Come and be part of it
            </ButtonLink>
          </div>
        </div>
      </section>

      <section class="about-leaders-section section-secondary" aria-labelledby="about-leaders-title">
        <div class="container">
          <div class="section-heading-row">
            <SectionHeading
              id="about-leaders-title"
              eyebrow="The people behind the ministry"
              title="Meet Our Leaders"
              description="Our leaders shepherd with prayer, wisdom, and a sincere love for people."
            />
            <ButtonLink className="text-link" href="/leadership" icon="arrow-right">
              View all leaders
            </ButtonLink>
          </div>
          <div class="card-grid card-grid-two">
            {leadership.pastors.map((leader) => (
              <Card className="pastor-card" image={leader.image} title={leader.name} description={leader.role} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
