import { ButtonLink } from "../ui/button-link";
import { PageHero } from "../ui/page-hero";
import { SectionHeading } from "../ui/section-heading";
import { Card } from "../ui/card";
import { formatEventSchedule, monthlyService, pastEvents, upcomingEvents } from "../../content/events";
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
                <p class="eyebrow">{service === monthlyService ? "Monthly gathering" : "Weekly service"}</p>
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
              title="Upcoming Events"
              description="Join us for the gatherings we have announced. Details for each one appear here as they are confirmed."
            />
            <ButtonLink className="text-link" href="/contact" icon="arrow-right">
              Ask about an event
            </ButtonLink>
          </div>
          {upcomingEvents.length > 0 ? (
            <div class="card-grid card-grid-three">
              {upcomingEvents.map((event) => (
                <Card
                  className="event-card"
                  eyebrow={formatEventSchedule(event)}
                  title={event.title}
                  description={event.description}
                >
                  <p class="event-location">{event.location}</p>
                </Card>
              ))}
            </div>
          ) : (
            <div class="empty-state empty-state-large">
              <p class="eyebrow">The next chapter</p>
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

      <section class="past-events-section section-cream" aria-labelledby="past-events-title">
        <div class="container">
          <SectionHeading
            id="past-events-title"
            eyebrow="Recent history"
            title="Past Events"
            description="A look back at the gatherings that have brought our church family together."
          />
          {pastEvents.length > 0 ? (
            <div class="card-grid card-grid-three">
              {pastEvents.map((event) => (
                <Card
                  className="past-event-card"
                  eyebrow={formatEventSchedule(event)}
                  title={event.title}
                  description={event.description}
                >
                  {event.recap ? <p class="event-recap">{event.recap}</p> : null}
                  <p class="event-location">{event.location}</p>
                </Card>
              ))}
            </div>
          ) : (
            <div class="empty-state">
              <p class="eyebrow">Coming soon</p>
              <h3>No past events listed yet</h3>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
