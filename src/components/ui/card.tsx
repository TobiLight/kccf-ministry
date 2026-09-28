import { getImageSource } from "../../content/site";
import type { RenderableChild } from "../../content/types";

const cardSizes = "(min-width: 64rem) 26rem, (min-width: 40rem) 22rem, 92vw";

export type CardProps = {
  children?: RenderableChild | RenderableChild[];
  className?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  /** Intrinsic size for images that are not in imageAssetMap, e.g. a YouTube thumbnail. */
  imageWidth?: number;
  imageHeight?: number;
  href?: string;
};

export function Card({
  children,
  className = "",
  eyebrow,
  title,
  description,
  image,
  imageAlt = "",
  imageWidth,
  imageHeight,
  href,
}: CardProps) {
  const resolved = image ? getImageSource(image, cardSizes) : null;

  const content = (
    <>
      {image && resolved ? (
        <img
          class="card-image"
          {...resolved}
          width={imageWidth ?? resolved.width}
          height={imageHeight ?? resolved.height}
          alt={imageAlt}
          loading="lazy"
        />
      ) : null}
      <div class="card-content">
        {eyebrow ? <p class="eyebrow text-primary!">{eyebrow}</p> : null}
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
        {children}
      </div>
    </>
  );

  return (
    <article class={`card ${className}`.trim()}>
      {href ? <a href={href}>{content}</a> : content}
    </article>
  );
}
