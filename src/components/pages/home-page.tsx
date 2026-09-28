import { formatEventSchedule, upcomingEvents } from "../../content/events";
import { leadership } from "../../content/leadership";
import { ministries } from "../../content/ministries";
import { getImageAsset, getResponsiveSourceSet, site } from "../../content/site";
import { ButtonLink } from "../ui/button-link";
import { Card } from "../ui/card";
import { Icon } from "../ui/icon";
import { SectionHeading } from "../ui/section-heading";

export function HomePage() {
  const heroImage = getImageAsset(site.images.hero);
  const heroSource = getResponsiveSourceSet(site.images.hero);
  const welcomeImage = getImageAsset(site.images.prayerFellowship);

  return (
    <>
      <section class="home-hero" aria-labelledby="home-hero-title">
        <img
          class="home-hero-image animate-fade-in"
          src={site.images.hero}
          srcset={heroSource.srcset}
          sizes={heroSource.sizes}
          alt={heroImage?.alt}
          width={heroImage?.width}
          height={heroImage?.height}
          fetchpriority="high"
        />
        <div class="home-hero-overlay" />
        <div class="container home-hero-content animate-fade-up">
          <p class="eyebrow hero-eyebrow text-white!">Welcome to</p>
          <h1 id="home-hero-title" class="text-primary!">Kingdom Covenant of Christ Fellowship</h1>
          <p class="home-hero-description">
            Bringing men and women into the knowledge of the Lord and into divine relationship in fellowship with God
            through the Holy Spirit in Christ Jesus.
          </p>
          <div class="hero-actions">
            <ButtonLink className="button button-primary" href="/contact" icon="arrow-right">
              Join Us for Worship
            </ButtonLink>
            <ButtonLink className="button button-secondary" href="/sermons">
              Watch Sermons
            </ButtonLink>
          </div>
          <a class="scroll-indicator animate-soft-bounce" href="#welcome" aria-label="Scroll to welcome section">
            <span>Scroll to explore</span>
            <span class="scroll-indicator-line" />
          </a>
        </div>
      </section>

      <section class="welcome-section section-cream" id="welcome">
        <div class="container welcome-grid">
          <div class="welcome-copy">
            <SectionHeading
              eyebrow="A place to belong"
              title="Welcome to KCCF Ministries"
              description="We are a Christian family united by faith, friendship, and a shared desire to grow closer to God and to one another."
            />
            <p class="body-copy">
              Whether you are seeking a worship community, a place to grow spiritually, or simply a warm welcome, there is
              a seat for you here.
            </p>
            <ButtonLink className="text-link" href="/about" icon="arrow-right">
              Discover our story
            </ButtonLink>
          </div>
          <div class="welcome-image-wrap">
            <img
              class="editorial-image"
              src={site.images.prayerFellowship}
              srcset={getResponsiveSourceSet(site.images.prayerFellowship).srcset}
              sizes={getResponsiveSourceSet(site.images.prayerFellowship).sizes}
              alt={welcomeImage?.alt}
              width={welcomeImage?.width}
              height={welcomeImage?.height}
              loading="lazy"
            />
            <div class="image-caption">Growing together in faith</div>
          </div>
        </div>
      </section>

      <section class="services-section section-secondary" aria-labelledby="services-title">
        <div class="container">
          <SectionHeading
            id="services-title"
            align="center"
            eyebrow="Join us weekly"
            title="Our Services"
            description="There is a place for you in our rhythm of worship, prayer, and learning."
          />
          <div class="service-grid">
            {site.services.map((service, index) => (
              <article class="service-item">
                <span class="service-number">0{index + 1}</span>
                <div class="service-icon">
                  <Icon name="clock" size={22} />
                </div>
                <h3>{service.name}</h3>
                <p>{service.time}</p>
                <ButtonLink className="text-link" href="/contact#visit-us">
                  Plan your visit
                </ButtonLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section class="ministry-preview-section section-cream" aria-labelledby="ministry-preview-title">
        <div class="container">
          <div class="section-heading-row">
            <SectionHeading
              id="ministry-preview-title"
              eyebrow="Find your place"
              title="Explore Our Ministries"
              description="Use your gifts to worship, serve, learn, and reach the people around you."
            />
            <ButtonLink className="text-link" href="/ministries" icon="arrow-right">
              View all ministries
            </ButtonLink>
          </div>
          <div class="card-grid card-grid-three">
            {ministries.slice(0, 3).map((ministry) => (
              <Card
                href="/ministries"
                image={ministry.image}
                title={ministry.name}
                description={ministry.description}
              />
            ))}
          </div>
        </div>
      </section>

      <section class="pastor-preview-section section-secondary" aria-labelledby="pastor-preview-title">
        <div class="container">
          <SectionHeading
            id="pastor-preview-title"
            align="center"
            eyebrow="Shepherding with love"
            title="Meet Our Pastors"
            description="Our pastoral team serves the church with wisdom, compassion, and a heart for people."
          />
          <div class="pastor-grid">
            {leadership.pastors.map((leader) => (
              <Card className="pastor-card" image={leader.image} title={leader.name} description={leader.role} />
            ))}
          </div>
          <div class="center-action">
            <ButtonLink className="button button-secondary" href="/leadership" icon="arrow-right">
              Meet our leadership
            </ButtonLink>
          </div>
        </div>
      </section>

      <section class="events-preview-section section-cream" aria-labelledby="events-preview-title">
        <div class="container">
          <div class="section-heading-row">
            <SectionHeading
              id="events-preview-title"
              eyebrow="Gather with us"
              title="Upcoming Events"
              description="Stay connected to the life of our church through worship and fellowship."
            />
            <ButtonLink className="text-link" href="/events" icon="arrow-right">
              View all events
            </ButtonLink>
          </div>
          {upcomingEvents.length > 0 ? (
            <div class="card-grid card-grid-three">
              {upcomingEvents.slice(0, 3).map((event) => (
                <Card
                  className="event-card"
                  eyebrow={formatEventSchedule(event)}
                  title={event.title}
                  description={event.description}
                />
              ))}
            </div>
          ) : (
            <div class="empty-state">
              <p class="eyebrow text-primary!">More to come</p>
              <h3>No upcoming events</h3>
              <p>Join us for worship this Sunday and stay connected for what is next.</p>
              <ButtonLink className="text-link" href="/events" icon="arrow-right">
                Visit the events page
              </ButtonLink>
            </div>
          )}
        </div>
      </section>

      <section class="final-cta-section">
        <div class="container final-cta">
          <div>
            <p class="eyebrow !text-primary">Come as you are</p>
            <h2>Experience the Covenant Life</h2>
            <p>Find your place in a church family rooted in faith, purpose, and love.</p>
          </div>
          <ButtonLink className="button button-primary" href="/contact" icon="arrow-right">
            Join Our Community
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
