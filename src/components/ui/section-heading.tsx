export type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  id?: string;
};

export function SectionHeading({ eyebrow, title, description, align = "left", className = "", id }: SectionHeadingProps) {
  const classes = ["section-heading", `section-heading-${align}`, "animate-fade-up", className].filter(Boolean).join(" ");

  return (
    <div class={classes}>
      {eyebrow ? <p class="eyebrow !text-primary">{eyebrow}</p> : null}
      <h2 id={id}>{title}</h2>
      {description ? <p class="section-heading-description">{description}</p> : null}
    </div>
  );
}
