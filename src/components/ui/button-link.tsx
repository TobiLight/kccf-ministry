import type { RenderableChild } from "../../content/types";
import { Icon, type IconName } from "./icon";

type BaseButtonLinkProps = {
  children: RenderableChild | RenderableChild[];
  className?: string;
  icon?: IconName;
  iconPosition?: "start" | "end";
};

type InternalButtonLinkProps = BaseButtonLinkProps & {
  external?: false;
  href: string;
};

type ExternalButtonLinkProps = BaseButtonLinkProps & {
  external: true;
  href: string;
};

export type ButtonLinkProps = InternalButtonLinkProps | ExternalButtonLinkProps;

export function ButtonLink({ children, className, href, external, icon, iconPosition = "end" }: ButtonLinkProps) {
  const content = (
    <>
      {icon && iconPosition === "start" ? <Icon name={icon} size={17} /> : null}
      <span>{children}</span>
      {icon && iconPosition === "end" ? <Icon name={icon} size={17} /> : null}
    </>
  );

  if (external) {
    return (
      <a class={className} href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return (
    <a class={className} href={href}>
      {content}
    </a>
  );
}
