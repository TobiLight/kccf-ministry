import { ButtonLink } from "../ui/button-link";
import { getImageAsset } from "../../content/site";
import { PageHero } from "../ui/page-hero";
import { SectionHeading } from "../ui/section-heading";
import { events, monthlyService } from "../../content/events";
import { site } from "../../content/site";

const regularServices = [...site.services.slice(0, 2), monthlyService];

export function EventsPage() {
  return (
    <>
      <PageHero
        eyebrow="Gather with us"
        title="Events"
        description="Come worship with us, grow in the Word, and make room for God to renew your heart."
        image={site.images.prayerFellowship}
        imageAlt="People holding hands in prayer"
      />

      <section class="regular-services-section section-cream" aria-labelledby="regular-services-title">
        <div class="container">
          <SectionHeading
            id="regular-services-title"
            align="center"
            eyebrow="A rhythm of faith"
            title="Regular Services"
            description="Our weekly services and monthly gathering make space for worship, prayer, and fellowship."
          />
          <div class="event-service-grid">
            {regularServices.map((service) => (
              <article class="event-service-card">
                <p class="eyebrow text-primary!">{service === monthlyService ? "Monthly gathering" : "Weekly service"}</p>
                <h3>{service.name}</h3>
                <p class="event-time">{service.time}</p>
                <p>Join the KCCF family for a meaningful time of worship and togetherness.</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section class="featured-events-section section-secondary" aria-labelledby="featured-events-title">
        <div class="container">
          <div class="section-heading-row">
            <SectionHeading
              id="featured-events-title"
              eyebrow="Special gatherings"
              title="Featured Events"
              description="We will share details for special worship, conferences, and community gatherings here."
            />
            <ButtonLink className="text-link" href="/contact" icon="arrow-right">
              Ask about an event
            </ButtonLink>
          </div>
          {events.length > 0 ? (
            <div class="card-grid card-grid-three">
              {events.map((event) => (
                <article class="event-card">
                  <img
                    class="card-image"
                    src={event.image}
                    alt=""
                    width={getImageAsset(event.image)?.width}
                    height={getImageAsset(event.image)?.height}
                    loading="lazy"
                  />
                  <div class="card-content">
                    <p class="eyebrow text-primary!">
                      {event.date} · {event.time}
                    </p>
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                    <p class="event-location">{event.location}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div class="empty-state empty-state-large">
              <p class="eyebrow text-primary!">The next chapter</p>
              <h3>No upcoming events</h3>
              <p>
                Our featured events calendar is being prepared. Join us for a regular service in the meantime, or contact
                us to learn more.
              </p>
              <ButtonLink className="button button-secondary" href="/contact" icon="arrow-right">
                Contact Us
              </ButtonLink>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
