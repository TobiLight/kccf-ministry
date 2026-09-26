import { ButtonLink } from "../ui/button-link";
import { Icon } from "../ui/icon";
import { PageHero } from "../ui/page-hero";
import { SectionHeading } from "../ui/section-heading";
import { site } from "../../content/site";

const formSignals = JSON.stringify({
  contact: {
    loading: false,
    success: false,
    fullName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  },
});

const submitHandler =
  "$contact.loading = true; $contact.success = false; " +
  "setTimeout(() => { el.reset(); $contact.loading = false; $contact.success = true; $contact.fullName = ''; $contact.email = ''; " +
  "$contact.phone = ''; $contact.subject = ''; $contact.message = ''; }, 700)";

export function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="We would love to welcome you"
        title="Contact KCCF"
        description="Have a question, want to visit, or simply want to say hello? We would be glad to hear from you."
        image={site.images.about}
        imageAlt="A cross against the sky"
      />

      <section class="contact-details-section section-cream" aria-labelledby="contact-details-title">
        <div class="container contact-details-grid">
          <div>
            <SectionHeading
              id="contact-details-title"
              eyebrow="Find us"
              title="Come and worship with us"
              description="We are located in Ikotun, Lagos, and look forward to welcoming you."
            />
            <div class="contact-info-list">
              <div class="contact-info-item">
                <span class="contact-info-icon">
                  <Icon name="map-pin" size={20} />
                </span>
                <div>
                  <p class="eyebrow">Address</p>
                  <address>{site.contact.address}</address>
                  <ButtonLink className="text-link" href={site.contact.mapsUrl} external icon="external-link">
                    Open in Maps
                  </ButtonLink>
                </div>
              </div>
              <div class="contact-info-item">
                <span class="contact-info-icon">
                  <Icon name="phone" size={20} />
                </span>
                <div>
                  <p class="eyebrow">Phone</p>
                  <a href={`tel:${site.contact.phone}`}>{site.contact.phone}</a>
                </div>
              </div>
              <div class="contact-info-item">
                <span class="contact-info-icon">
                  <Icon name="mail" size={20} />
                </span>
                <div>
                  <p class="eyebrow">Email</p>
                  <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
                </div>
              </div>
              <div class="contact-info-item">
                <span class="contact-info-icon">
                  <Icon name="facebook" size={20} />
                </span>
                <div>
                  <p class="eyebrow">Facebook</p>
                  <ButtonLink className="text-link" href={site.contact.facebookUrl} external icon="facebook">
                    @kccfministries
                  </ButtonLink>
                </div>
              </div>
            </div>
          </div>
          <div class="service-summary">
            <p class="eyebrow">Service times</p>
            <h2>Make a Sunday of it.</h2>
            {site.services.map((service) => (
              <div class="service-summary-row">
                <span>{service.name}</span>
                <strong>{service.time}</strong>
              </div>
            ))}
            <p class="service-summary-note">Come as you are. We will help you find your place.</p>
          </div>
        </div>
      </section>

      <section class="contact-form-section section-secondary" aria-labelledby="contact-form-title">
        <div class="container contact-form-grid">
          <div class="contact-form-intro">
            <SectionHeading
              id="contact-form-title"
              eyebrow="Keep in touch"
              title="Try the message preview"
              description="Explore the form locally, then call or email us using the details above."
            />
            <div class="contact-form-aside">
              <p class="eyebrow">Prefer to connect?</p>
              <p>Call or email us directly using the details above. We would love to hear from you.</p>
            </div>
          </div>
          <form
            class="contact-form"
            action="/contact"
            method="post"
            aria-labelledby="contact-form-title"
            data-signals={formSignals}
            data-on:submit={submitHandler}
            aria-busy="false"
            data-attr:aria-busy="$contact.loading ? 'true' : 'false'"
          >
            <div class="form-field">
              <label for="full-name">Full Name</label>
              <input id="full-name" type="text" autocomplete="name" data-bind="$contact.fullName" required />
            </div>
            <div class="form-field">
              <label for="email">Email</label>
              <input id="email" type="email" autocomplete="email" data-bind="$contact.email" required />
            </div>
            <div class="form-field">
              <label for="phone">
                Phone <span>(optional)</span>
              </label>
              <input id="phone" type="tel" autocomplete="tel" data-bind="$contact.phone" />
            </div>
            <div class="form-field">
              <label for="subject">Subject</label>
              <input id="subject" type="text" data-bind="$contact.subject" required />
            </div>
            <div class="form-field form-field-full">
              <label for="message">Message</label>
              <textarea id="message" rows={6} data-bind="$contact.message" required></textarea>
            </div>
            <p class="form-preview-note">
              This preview does not send or store your message. Please call or email us using the details above.
            </p>
            <div class="form-submit">
              <button class="button button-primary" type="submit" data-attr:disabled="$contact.loading">
                Preview Message
              </button>
              <span class="form-submit-loading" data-show="$contact.loading">
                Preparing preview...
              </span>
            </div>
            <div class="form-status" role="status" aria-live="polite">
              <p data-show="$contact.success">
                <strong>Form preview complete</strong> Your message was cleared without being sent. Please call or email
                us using the details above.
              </p>
            </div>
          </form>
        </div>
      </section>

      <section class="visit-section" id="visit-us">
        <div class="container visit-cta">
          <div>
            <p class="eyebrow">Plan Your Visit</p>
            <h2>There is a seat for you.</h2>
            <p>Come and experience the warmth of our church family in person.</p>
          </div>
          <ButtonLink className="button button-primary" href="/events" icon="arrow-right">
            See Service Times
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
