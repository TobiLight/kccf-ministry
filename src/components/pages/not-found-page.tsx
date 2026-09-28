import { ButtonLink } from "../ui/button-link";
import { PageShell } from "../page-shell";

export function NotFoundPage() {
  return (
    <PageShell title="Page not found | KCCF Ministries" description="The page you are looking for could not be found.">
      <section class="not-found-section">
        <div class="container not-found-content">
          <p class="not-found-number">404</p>
          <p class="eyebrow text-primary!">A wrong turn</p>
          <h1>Oops! Page not found</h1>
          <p>The page you are looking for may have moved, or the address may be incorrect.</p>
          <ButtonLink className="button button-primary" href="/" icon="arrow-right">
            Return to Home
          </ButtonLink>
        </div>
      </section>
    </PageShell>
  );
}
