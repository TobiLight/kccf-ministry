import { site } from "../content/site";
import { ButtonLink } from "./ui/button-link";
import { Icon } from "./ui/icon";

export type SiteHeaderProps = {
  currentPath?: string;
};

const serviceSummary = `Service times: ${site.services.map((service) => `${service.name} at ${service.time}`).join(", ")}.`;

export function SiteHeader({ currentPath }: SiteHeaderProps) {
  const renderMarqueeSequence = () => (
    <div class="marquee-sequence" aria-hidden="true">
      {site.services.map((service) => (
        <span class="marquee-item">
          <Icon name="clock" size={15} />
          <strong>{service.name}</strong>
          <span>{service.time}</span>
        </span>
      ))}
    </div>
  );

  return (
    <header
      class="site-header"
      data-signals='{"menuOpen":false,"marqueePaused":false}'
      data-on:keydown__window="if (evt.key === 'Escape' && $menuOpen) { $menuOpen = false; document.getElementById('mobile-menu-trigger').focus(); }"
    >
      <div class="contact-strip">
        <div class="container contact-strip-inner">
          <div class="contact-strip-item">
            <Icon name="phone" size={15} />
            <a href={`tel:${site.contact.phone}`}>{site.contact.phone}</a>
          </div>
          <div class="contact-strip-item">
            <Icon name="mail" size={15} />
            <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
          </div>
          <p class="contact-strip-address">
            <Icon name="map-pin" size={15} />
            {site.contact.address}
          </p>
        </div>
      </div>
      <div class="site-header-main">
        <div class="container site-header-inner">
          <a class="brand-lockup" href="/">
            <img
              class="brand-logo-image"
              src={site.imageAssets.logo.src}
              alt=""
              width={site.imageAssets.logo.width}
              height={site.imageAssets.logo.height}
            />
            <span class="brand-copy">
              <strong>KCCF</strong>
              <span> Ministries</span>
            </span>
            <span class="visually-hidden"> home</span>
          </a>
          <nav class="desktop-navigation" aria-label="Primary navigation">
            {site.navItems.map((item) => (
              <a
                class={item.href === currentPath ? "nav-link is-active" : "nav-link"}
                href={item.href}
                aria-current={item.href === currentPath ? "page" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <ButtonLink
            className="button button-primary header-visit-button"
            href="/contact#visit-us"
            external={false}
          >
            Visit Us
          </ButtonLink>
          <button
            class="mobile-menu-trigger"
            type="button"
            id="mobile-menu-trigger"
            data-on:click="$menuOpen = !$menuOpen"
            aria-expanded="false"
            data-attr:aria-expanded="$menuOpen ? 'true' : 'false'"
            aria-controls="mobile-navigation"
            aria-label="Open navigation menu"
            data-attr:aria-label="$menuOpen ? 'Close navigation menu' : 'Open navigation menu'"
          >
            <Icon name="menu" size={24} />
          </button>
        </div>
      </div>
      <nav class="mobile-navigation" id="mobile-navigation" aria-label="Mobile navigation" data-show="$menuOpen">
        <div class="container mobile-navigation-inner">
          {site.mobileNavItems.map((item) => (
            <a
              class={item.href === currentPath ? "mobile-nav-link is-active" : "mobile-nav-link"}
              href={item.href}
              aria-current={item.href === currentPath ? "page" : undefined}
              data-on:click="$menuOpen = false"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>
      <div class="service-marquee" data-class:is-paused="$marqueePaused">
        <p class="visually-hidden">{serviceSummary}</p>
        <button
          class="marquee-toggle"
          type="button"
          data-on:click="$marqueePaused = !$marqueePaused"
          aria-label="Pause or play service times"
          aria-pressed="false"
          data-attr:aria-pressed="$marqueePaused ? 'true' : 'false'"
        >
          <span data-show="!$marqueePaused">Pause</span>
          <span data-show="$marqueePaused">Play</span>
        </button>
        <div class="service-marquee-track">
          {renderMarqueeSequence()}
          {renderMarqueeSequence()}
        </div>
      </div>
    </header>
  );
}
