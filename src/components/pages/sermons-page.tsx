import { ButtonLink } from "../ui/button-link";
import { Card } from "../ui/card";
import { Icon } from "../ui/icon";
import { PageHero } from "../ui/page-hero";
import { SectionHeading } from "../ui/section-heading";
import { sermons } from "../../content/sermons";
import { site } from "../../content/site";

export function SermonsPage() {
  return (
    <>
      <PageHero
        eyebrow="Messages"
        title="Sermons"
        description="Feed your faith with messages that speak to the ordinary and extraordinary places where you live."
        image={site.images.worshipMoment}
        imageAlt="Hands raised in worship"
      />

      <section class="live-banner-section">
        <div class="container live-banner">
          <div class="live-banner-mark" aria-hidden="true">
            <Icon name="facebook" size={30} />
          </div>
          <div>
            <p class="eyebrow">Live from KCCF</p>
            <h2>Join us live on Facebook</h2>
            <p>Watch the message, worship with us, and stay connected wherever you are.</p>
          </div>
          <ButtonLink
            className="button button-primary"
            href={site.contact.facebookUrl}
            external
            icon="facebook"
            iconPosition="start"
          >
            Watch Live
          </ButtonLink>
        </div>
      </section>

      <section class="sermon-list-section section-cream" aria-labelledby="sermon-list-title">
        <div class="container">
          <SectionHeading
            id="sermon-list-title"
            eyebrow="Recent messages"
            title="A Word for the Journey"
            description="Our latest messages are reflections on faith, grace, prayer, purpose, and service."
          />
          <div class="card-grid card-grid-three">
            {sermons.map((sermon) => (
              <Card
                className="sermon-card"
                image={sermon.image}
                title={sermon.title}
                description={`${sermon.speaker} · ${sermon.date}`}
              >
                <p>{sermon.summary}</p>
              </Card>
            ))}
          </div>
          <div class="center-action">
            <ButtonLink
              className="button button-secondary"
              href={site.contact.facebookUrl}
              external
              icon="facebook"
              iconPosition="start"
            >
              View More on Facebook
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
