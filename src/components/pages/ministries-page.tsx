import { ministries } from "../../content/ministries";
import { getImageSource, site } from "../../content/site";
import { ButtonLink } from "../ui/button-link";
import { PageHero } from "../ui/page-hero";
import { SectionHeading } from "../ui/section-heading";

export function MinistriesPage() {
  return (
    <>
      <PageHero
        eyebrow="Use your gifts"
        title="Our Ministries"
        description="There is a meaningful way for every person to worship, serve, learn, and belong."
        image={site.images.bibleStudy}
      />

      <section class="ministries-intro-section section-cream">
        <div class="container-narrow">
          <SectionHeading
            align="center"
            eyebrow="Find your place"
            title="Faith is for the whole person."
            description="Our ministries are spaces to grow in relationship with God and with one another, wherever you are in your journey."
          />
        </div>
      </section>

      <section class="ministry-list-section section-secondary" aria-labelledby="ministry-list-title">
        <div class="container ministry-list">
          <h2 class="visually-hidden" id="ministry-list-title">Explore our ministries</h2>
          {ministries.map((ministry, index) => (
            <article class={`ministry-entry ${index % 2 === 1 ? "ministry-entry-reverse" : ""}`}>
              <div class="ministry-entry-image">
                <img
                  class="editorial-image"
                  {...getImageSource(ministry.image, "(min-width: 48rem) 50vw, 92vw")}
                  alt=""
                  loading="lazy"
                />
              </div>
              <div class="ministry-entry-copy">
                <p class="eyebrow text-primary!">Ministry {String(index + 1).padStart(2, "0")}</p>
                <h2>{ministry.name}</h2>
                <p class="body-copy">{ministry.description}</p>
                <p class="ministry-entry-note">A place to participate, grow, and serve with purpose.</p>
                <ButtonLink className="text-link" href="/contact" icon="arrow-right">
                  Learn more
                </ButtonLink>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section class="simple-cta-section">
        <div class="container simple-cta">
          <div>
            <p class="eyebrow text-primary!">Have a question?</p>
            <h2>Let’s find the right place for you.</h2>
          </div>
          <ButtonLink className="button button-primary" href="/contact" icon="arrow-right">
            Contact Us
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
