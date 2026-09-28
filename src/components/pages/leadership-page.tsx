import { ButtonLink } from "../ui/button-link";
import { getImageSource, imageAssets } from "../../content/site";
import { PageHero } from "../ui/page-hero";
import { SectionHeading } from "../ui/section-heading";
import { leadership } from "../../content/leadership";
import { site } from "../../content/site";

export function LeadershipPage() {
  return (
    <>
      <PageHero
        eyebrow="Servant leaders"
        title="Our Leadership"
        description="Our leaders shepherd with wisdom, prayer, and a sincere love for people."
        image={site.images.prayerFellowship}
        imageAlt="People holding hands in prayer"
      />

      <section class="pastoral-section section-cream" aria-labelledby="pastoral-section-title">
        <div class="container">
          <SectionHeading
            id="pastoral-section-title"
            align="center"
            eyebrow="Pastoral care"
            title="Shepherds of the Covenant"
            description="Our pastoral team is committed to biblical truth, thoughtful care, and the spiritual growth of every person."
          />
          <div class="pastoral-grid">
            {leadership.pastors.map((leader) => {
              const image = leader.image ?? imageAssets.pastorOne.src;
              return (
                <article class="pastoral-card">
                  <div class="pastoral-card-image">
                    <img
                      class="editorial-image"
                      {...getImageSource(image, "(min-width: 48rem) 45vw, 92vw")}
                      alt=""
                      loading="lazy"
                    />
                  </div>
                  <div class="pastoral-card-content">
                    <p class="eyebrow text-primary!">{leader.role}</p>
                    <h3>{leader.name}</h3>
                    <blockquote>{leader.verse}</blockquote>
                    <p>{leader.bio}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section class="ministry-leaders-section section-secondary" aria-labelledby="ministry-leaders-title">
        <div class="container">
          <SectionHeading
            id="ministry-leaders-title"
            align="center"
            eyebrow="Every gift matters"
            title="Ministry Leaders"
            description="These faithful servants help our church worship, welcome, teach, pray, and serve."
          />
          <div class="leadership-grid">
            {leadership.ministryLeaders.map((leader) => (
              <article class="leadership-card">
                <img
                  class="leadership-card-image"
                  {...getImageSource(leader.image, "(min-width: 48rem) 45vw, 92vw")}
                  alt={leader.imageAlt}
                  loading="lazy"
                />
                <div class="leadership-card-content">
                  <p class="eyebrow text-primary!">{leader.role}</p>
                  <h3>{leader.name}</h3>
                  <p>{leader.bio}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section class="simple-cta-section">
        <div class="container simple-cta">
          <div>
            <p class="eyebrow text-primary!">Connect with us</p>
            <h2>We would love to hear from you.</h2>
          </div>
          <ButtonLink className="button button-primary" href="/contact" icon="arrow-right">
            Get in Touch
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
