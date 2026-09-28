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
  href?: string;
};

export function Card({ children, className = "", eyebrow, title, description, image, imageAlt = "", href }: CardProps) {
  const content = (
    <>
      {image ? <img class="card-image" {...getImageSource(image, cardSizes)} alt={imageAlt} loading="lazy" /> : null}
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
