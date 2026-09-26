import { site } from "../content/site";
import { Icon } from "./ui/icon";

export function SiteFooter() {
  const year = new Date().getUTCFullYear();

  return (
    <footer class="site-footer">
      <div class="container site-footer-grid">
        <div class="footer-brand-column">
          
          <a class="brand brand-footer" href="/">
            <img
              class="w-35 h-35 rounded-full border-primary border-2 object-contain bg-primary"
              src={site.imageAssets.logo.src}
              alt={site.imageAssets.logo.alt}
              width={site.imageAssets.logo.width * 2}
              height={site.imageAssets.logo.height}
            />
            <span class="visually-hidden"> home</span>
          </a>
          <p>{site.description}</p>
          <div class="social-links">
            {site.social.map((social) => (
              <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label}>
                <Icon name="facebook" size={18} />
              </a>
            ))}
          </div>
        </div>
        <div class="footer-column">
          <h2>Quick Links</h2>
          <ul>
            {site.navItems.slice(0, 6).map((item) => (
              <li>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div class="footer-column">
          <h2>Our Services</h2>
          <ul>
            {site.services.map((service) => (
              <li>
                <span>{service.name}</span>
                <small>{service.time}</small>
              </li>
            ))}
          </ul>
        </div>
        <div class="footer-column footer-contact-column">
          <h2>Contact</h2>
          <address>
            <a href={`tel:${site.contact.phone}`}>
              <Icon name="phone" size={17} />
              {site.contact.phone}
            </a>
            <a href={`mailto:${site.contact.email}`}>
              <Icon name="mail" size={17} />
              {site.contact.email}
            </a>
            <a href={site.contact.mapsUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="map-pin" size={17} />
              {site.contact.address}
            </a>
          </address>
        </div>
      </div>
      <div class="container site-footer-bottom">
        <p>© {year} KCCF Ministries. All rights reserved.</p>
        <p>Made with love for the glory of God</p>
      </div>
    </footer>
  );
}
