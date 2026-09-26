import type { RenderableChild } from "../content/types";

const googleFontsUrl =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Source+Sans+3:wght@400;500;600;700&display=swap";

function isAbsoluteHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export type BasePageProps = {
  title: string;
  description: string;
  imageAlt?: string;
  imageUrl?: string;
  children: RenderableChild | RenderableChild[];
};

export function BasePage({ title, description, imageAlt, imageUrl, children }: BasePageProps) {
  const hasImageMetadata = Boolean(imageUrl?.trim() && imageAlt?.trim() && isAbsoluteHttpUrl(imageUrl));

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Kingdom Covenant of Christ Fellowship" />
        {hasImageMetadata ? <meta property="og:image" content={imageUrl} /> : null}
        {hasImageMetadata ? <meta property="og:image:alt" content={imageAlt} /> : null}
        <meta name="theme-color" content="#f8f4ec" />
        <link rel="icon" href="/static/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link rel="stylesheet" href={googleFontsUrl} />
        <link rel="stylesheet" href="/static/style.css" />
      </head>
      <body>
        {children}
        <script type="module" src="/static/datastar.js" />
      </body>
    </html>
  );
}
