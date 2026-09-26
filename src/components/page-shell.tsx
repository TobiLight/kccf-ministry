import type { RenderableChild } from "../content/types";
import { BasePage } from "./layout";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export type PageShellProps = {
  title: string;
  description: string;
  imageAlt?: string;
  imageUrl?: string;
  currentPath?: string;
  children: RenderableChild | RenderableChild[];
};

export function PageShell({ title, description, imageAlt, imageUrl, currentPath, children }: PageShellProps) {
  return (
    <BasePage title={title} description={description} imageAlt={imageAlt} imageUrl={imageUrl}>
      <a class="skip-link" href="#main-content">
        Skip to main content
      </a>
      <SiteHeader currentPath={currentPath} />
      <main id="main-content" tabindex={-1} class="header-offset">{children}</main>
      <SiteFooter />
    </BasePage>
  );
}
