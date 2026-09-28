import { getImageAsset, getResponsiveSourceSet } from "../../content/site";

export type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  image?: string;
  className?: string;
};

export function PageHero({ eyebrow, title, description, image, className = "" }: PageHeroProps) {
  const imageAsset = image ? getImageAsset(image) : undefined;
  const resolvedImageAlt = imageAsset?.alt ?? "";
  const responsiveSource = image ? getResponsiveSourceSet(image) : {};

  return (
    <section class={`page-hero ${className}`.trim()}>
      <div class="page-hero-inner">
        <div class="page-hero-copy animate-fade-up">
          {eyebrow ? <p class="eyebrow text-primary!">{eyebrow}</p> : null}
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {image ? (
          <img
            class="page-hero-image animate-fade-in"
            src={image}
            srcset={responsiveSource.srcset}
            sizes={responsiveSource.sizes}
            alt={resolvedImageAlt}
            width={imageAsset?.width}
            height={imageAsset?.height}
            fetchpriority="high"
          />
        ) : null}
      </div>
    </section>
  );
}
