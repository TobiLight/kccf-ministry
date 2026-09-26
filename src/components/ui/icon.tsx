import { createElement } from "hono/jsx";

export type IconName =
  | "arrow-right"
  | "clock"
  | "close"
  | "external-link"
  | "facebook"
  | "mail"
  | "map-pin"
  | "menu"
  | "phone";

type IconProps = {
  name: IconName;
  className?: string;
  size?: number;
};

export function Icon({ name, className, size = 20 }: IconProps) {
  const common = {
    class: className,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": "true",
    focusable: "false",
  };

  if (name === "facebook") {
    return (
      <svg {...common} viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V4.9c-.2 0-1-.1-1.9-.1-2 0-3.4 1.2-3.4 3.5V11H8.7v3h2.4v7h2.4Z" />
      </svg>
    );
  }

  const paths: Record<Exclude<IconName, "facebook">, ReturnType<typeof createElement> | string | Promise<string>> = {
    "arrow-right": <path d="M5 12h14m-6-6 6 6-6 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l2.8 1.8" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    "external-link": (
      <>
        <path d="M14 5h5v5" />
        <path d="m19 5-8 8" />
        <path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    "map-pin": (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    phone: (
      <>
        <path d="M5 4.5 8.2 3l2.1 4.5-2 1.7a14 14 0 0 0 6.5 6.5l1.7-2 4.5 2.1-1.5 3.2a2 2 0 0 1-2.2 1.1C9.8 18.4 5.6 14.2 3.9 6.7A2 2 0 0 1 5 4.5Z" />
      </>
    ),
  };

  return (
    <svg {...common} stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      {paths[name]}
    </svg>
  );
}
