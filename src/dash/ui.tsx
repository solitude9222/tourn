/* ---------------------------------------------------------------------------
   tourn.lol dashboard — primitives.

   One small, dependency-free component library used by every page. Every
   colour, radius and size comes from dash.css tokens; nothing here invents a
   second visual language.
   --------------------------------------------------------------------------- */

import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ icons */

export type IconName =
  | "home"
  | "user"
  | "users"
  | "palette"
  | "star"
  | "link"
  | "image"
  | "settings"
  | "search"
  | "chevron-down"
  | "chevron-right"
  | "eye"
  | "bell"
  | "plus"
  | "check"
  | "x"
  | "save"
  | "lock"
  | "help"
  | "chart"
  | "grid"
  | "layout"
  | "sparkles"
  | "music"
  | "pin"
  | "calendar"
  | "trash"
  | "edit"
  | "download"
  | "upload"
  | "copy"
  | "discord"
  | "external"
  | "drag"
  | "filter"
  | "sort"
  | "comment"
  | "like"
  | "dislike"
  | "arrow-right"
  | "logout"
  | "shield"
  | "crown"
  | "sliders"
  | "clock"
  | "bolt"
  | "layers"
  | "code"
  | "globe"
  | "gamepad"
  | "refresh"
  | "expand"
  | "minus"
  | "at"
  | "mail"
  | "key"
  | "trash-2"
  | "move"
  | "dots"
  | "share";

const ICONS: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M3.5 10.2 12 3.5l8.5 6.7" />
      <path d="M5.6 9v10.4h12.8V9" />
      <path d="M9.6 19.4v-5.8h4.8v5.8" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20.2c.9-3.5 3.7-5.4 7.2-5.4s6.3 1.9 7.2 5.4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.4" r="3.2" />
      <path d="M2.8 19.8c.8-3.1 3.2-4.8 6.2-4.8s5.4 1.7 6.2 4.8" />
      <path d="M15.6 5.7a3.2 3.2 0 0 1 0 6.2" />
      <path d="M17.6 15.4c2 .6 3.3 2.1 3.8 4.4" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.6a8.4 8.4 0 1 0 0 16.8h1.2a2 2 0 0 0 1.5-3.4 1.7 1.7 0 0 1 1.2-2.9h2.3A2.2 2.2 0 0 0 20.4 12 8.3 8.3 0 0 0 12 3.6Z" />
      <circle cx="8.1" cy="9.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="11.4" cy="7.3" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.1" cy="8.6" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  star: (
    <path d="m12 3.7 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.8l5.8-.8Z" />
  ),
  link: (
    <>
      <path d="M10.2 13.8a3.6 3.6 0 0 0 5.1 0l2.6-2.6a3.6 3.6 0 0 0-5.1-5.1L11.6 7.3" />
      <path d="M13.8 10.2a3.6 3.6 0 0 0-5.1 0l-2.6 2.6a3.6 3.6 0 0 0 5.1 5.1l1.2-1.2" />
    </>
  ),
  image: (
    <>
      <rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.4" />
      <circle cx="8.6" cy="9.6" r="1.4" />
      <path d="m4.4 17.4 4.8-4.8 3 3 3.1-3.1 4.3 4.3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19 13.5a7.6 7.6 0 0 0 0-3l1.7-1.3-1.9-3.3-2 .8a7.4 7.4 0 0 0-2.6-1.5L13.8 2h-3.6l-.4 2.2a7.4 7.4 0 0 0-2.6 1.5l-2-.8L3.3 8.2 5 9.5a7.6 7.6 0 0 0 0 3l-1.7 1.3 1.9 3.3 2-.8a7.4 7.4 0 0 0 2.6 1.5l.4 2.2h3.6l.4-2.2a7.4 7.4 0 0 0 2.6-1.5l2 .8 1.9-3.3Z" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.4" />
      <path d="m15.6 15.6 4.2 4.2" />
    </>
  ),
  "chevron-down": <path d="m6.5 9.4 5.5 5.4 5.5-5.4" />,
  "chevron-right": <path d="m9.4 6.5 5.4 5.5-5.4 5.5" />,
  eye: (
    <>
      <path d="M2.6 12S5.8 5.9 12 5.9 21.4 12 21.4 12 18.2 18.1 12 18.1 2.6 12 2.6 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  bell: (
    <>
      <path d="M18 15.4V10a6 6 0 1 0-12 0v5.4L4.4 17.4h15.2Z" />
      <path d="M9.8 20.2a2.4 2.4 0 0 0 4.4 0" />
    </>
  ),
  plus: <path d="M12 5.2v13.6M5.2 12h13.6" />,
  check: <path d="m5 12.6 4.4 4.4L19 6.6" />,
  x: <path d="M6.2 6.2l11.6 11.6M17.8 6.2 6.2 17.8" />,
  save: (
    <>
      <path d="M5 4.4h11.4L20 7.9v11.7H5Z" />
      <path d="M8 4.4v5.2h7V4.4" />
      <path d="M8.2 19.6v-5.4h7.6v5.4" />
    </>
  ),
  lock: (
    <>
      <rect x="4.8" y="10.2" width="14.4" height="9.8" rx="2.2" />
      <path d="M8.4 10.2V8a3.6 3.6 0 0 1 7.2 0v2.2" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M9.6 9.4a2.6 2.6 0 0 1 5 .9c0 1.8-2.6 2-2.6 3.7" />
      <circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v16h16" />
      <path d="m7.4 14.6 3.2-4 3 2.6 3.8-5.4" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.6" height="6.6" rx="1.4" />
      <rect x="13.4" y="4" width="6.6" height="6.6" rx="1.4" />
      <rect x="4" y="13.4" width="6.6" height="6.6" rx="1.4" />
      <rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.4" />
    </>
  ),
  layout: (
    <>
      <rect x="3.6" y="4.4" width="16.8" height="15.2" rx="2.2" />
      <path d="M3.6 9.4h16.8M9 9.4v10.2" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3.6 1.8 4.6 4.6 1.8-4.6 1.8L12 16.4l-1.8-4.6L5.6 10l4.6-1.8Z" />
      <path d="m18.4 15.4.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9Z" />
    </>
  ),
  music: (
    <>
      <path d="M9.4 18.2V6.4l9-2v11.4" />
      <circle cx="6.8" cy="18.4" r="2.6" />
      <circle cx="15.8" cy="15.8" r="2.6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6.4-5.6 6.4-10.4a6.4 6.4 0 1 0-12.8 0C5.6 15.4 12 21 12 21Z" />
      <circle cx="12" cy="10.4" r="2.3" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.8" y="5.4" width="16.4" height="14.4" rx="2.2" />
      <path d="M3.8 9.8h16.4M8.2 3.6v3.4M15.8 3.6v3.4" />
    </>
  ),
  trash: (
    <>
      <path d="M4.6 7.2h14.8M9.4 7.2V4.8h5.2v2.4" />
      <path d="M6.6 7.2 7.6 20h8.8l1-12.8" />
      <path d="M10.4 11v5.4M13.6 11v5.4" />
    </>
  ),
  "trash-2": (
    <>
      <path d="M4.6 7.2h14.8M9.4 7.2V4.8h5.2v2.4" />
      <path d="M6.6 7.2 7.6 20h8.8l1-12.8" />
    </>
  ),
  edit: (
    <>
      <path d="m4.4 19.6 4.2-1 10-10a2.3 2.3 0 0 0-3.2-3.2l-10 10Z" />
      <path d="m13.8 6.8 3.4 3.4" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10.4" />
      <path d="m7.6 10.6 4.4 4.4 4.4-4.4" />
      <path d="M4.6 19.4h14.8" />
    </>
  ),
  upload: (
    <>
      <path d="M12 20V9.6" />
      <path d="m7.6 13.4 4.4-4.4 4.4 4.4" />
      <path d="M4.6 4.6h14.8" />
    </>
  ),
  copy: (
    <>
      <rect x="8.4" y="8.4" width="11.2" height="11.2" rx="2" />
      <path d="M15.6 8.4V6.4a2 2 0 0 0-2-2H6.4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 2 2h2" />
    </>
  ),
  discord: (
    <path
      fill="currentColor"
      stroke="none"
      d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.37-.44.86-.6 1.25a18.3 18.3 0 0 0-5.49 0 12.6 12.6 0 0 0-.61-1.25.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.88 1.52.07.07 0 0 0-.04.03C.53 9.05-.32 13.58.1 18.06c0 .02.01.04.03.05a19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1 0-.13c.12-.1.25-.19.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01c.12.09.25.19.37.29a.08.08 0 0 1 0 .13c-.6.35-1.22.64-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 1.99a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42Z"
    />
  ),
  external: (
    <>
      <path d="M13.4 4.6h6v6" />
      <path d="M19.4 4.6 11 13" />
      <path d="M17.4 14v5.4H4.6V6.6H10" />
    </>
  ),
  drag: (
    <>
      <circle cx="9" cy="6.4" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6.4" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="17.6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="17.6" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  move: (
    <path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
  ),
  filter: <path d="M3.6 5.4h16.8l-6.4 7.4v6.2l-4-2v-4.2Z" />,
  sort: (
    <>
      <path d="M7 4.6v14.8M3.6 16l3.4 3.4 3.4-3.4" />
      <path d="M13.4 8h7M13.4 12h5M13.4 16h3" />
    </>
  ),
  comment: <path d="M4 5.4h16v11H9.4L4 20.6Z" />,
  like: (
    <>
      <path d="M7.4 20V10.4l4.2-6.2c1.4 0 2.2 1 2 2.4l-.8 3h4.9a2 2 0 0 1 1.9 2.5l-1.4 5.6A2.4 2.4 0 0 1 15.9 20Z" />
      <path d="M3.4 10.4h4v9.6h-4z" />
    </>
  ),
  dislike: (
    <>
      <path d="M7.4 4v9.6l4.2 6.2c1.4 0 2.2-1 2-2.4l-.8-3h4.9a2 2 0 0 0 1.9-2.5l-1.4-5.6A2.4 2.4 0 0 0 15.9 4Z" />
      <path d="M3.4 4h4v9.6h-4z" />
    </>
  ),
  "arrow-right": <path d="M4.6 12h14.2M13.4 6.4l5.4 5.6-5.4 5.6" />,
  logout: (
    <>
      <path d="M14 4.6H5.4v14.8H14" />
      <path d="M10.6 12h9.6M16.6 8.4l3.6 3.6-3.6 3.6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.4 5 6v5.6c0 4.2 2.8 7.4 7 9.2 4.2-1.8 7-5 7-9.2V6Z" />
      <path d="m9.2 12.2 2 2 3.6-4" />
    </>
  ),
  crown: (
    <>
      <path d="M4 8.6 7.4 11 12 5l4.6 6L20 8.6l-1.4 8.8H5.4Z" />
      <path d="M6.6 20h10.8" />
    </>
  ),
  sliders: (
    <>
      <path d="M4.4 7.2h15.2M4.4 16.8h15.2" />
      <circle cx="9.2" cy="7.2" r="2.1" />
      <circle cx="15.2" cy="16.8" r="2.1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.4V12l3 2" />
    </>
  ),
  bolt: <path d="M13.4 2.8 5 13.4h6l-.4 7.8 8.4-10.6h-6Z" />,
  layers: (
    <>
      <path d="m12 3.8 8.4 4.4-8.4 4.4L3.6 8.2Z" />
      <path d="m3.6 12.4 8.4 4.4 8.4-4.4M3.6 16.4l8.4 4.4 8.4-4.4" />
    </>
  ),
  code: <path d="m8.4 7.6-5 4.4 5 4.4M15.6 7.6l5 4.4-5 4.4M13.4 4.6l-2.8 14.8" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.6 12h16.8M12 3.4c2.4 2.3 3.6 5.2 3.6 8.6s-1.2 6.3-3.6 8.6c-2.4-2.3-3.6-5.2-3.6-8.6S9.6 5.7 12 3.4Z" />
    </>
  ),
  gamepad: (
    <>
      <path d="M8 7.6h8a5 5 0 0 1 4.9 6l-.8 3.6a2.4 2.4 0 0 1-4.2 1l-1.6-2.2h-4.6l-1.6 2.2a2.4 2.4 0 0 1-4.2-1l-.8-3.6a5 5 0 0 1 4.9-6Z" />
      <path d="M8.6 11v3M7.1 12.5h3M15.6 11.4h.1M17.6 13.4h.1" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.4 12a7.4 7.4 0 1 1-2.2-5.2" />
      <path d="M19.6 4.2v4.4h-4.4" />
    </>
  ),
  expand: <path d="M4.4 9V4.4H9M15 4.4h4.6V9M19.6 15v4.6H15M9 19.6H4.4V15" />,
  minus: <path d="M5.2 12h13.6" />,
  at: (
    <>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M15.4 8.6v4.6a2.8 2.8 0 0 0 5.6 0V12a9 9 0 1 0-3.6 7.2" />
    </>
  ),
  mail: (
    <>
      <rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2.2" />
      <path d="m4.4 7 7.6 5.6L19.6 7" />
    </>
  ),
  key: (
    <>
      <circle cx="8.2" cy="15.8" r="3.6" />
      <path d="m10.9 13.1 7.6-7.6M15.6 5.4l2.4 2.4M13.4 7.6l2.4 2.4" />
    </>
  ),
  dots: (
    <>
      <circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  share: (
    <>
      <circle cx="17.5" cy="5.8" r="2.7" />
      <circle cx="6.5" cy="12" r="2.7" />
      <circle cx="17.5" cy="18.2" r="2.7" />
      <path d="m8.9 10.6 6.3-3.4M8.9 13.4l6.3 3.4" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  className,
  strokeWidth = 1.7,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className ? `tw-icon ${className}` : "tw-icon"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      {ICONS[name]}
    </svg>
  );
}

/* ---------------------------------------------------------------- surfaces */

export function Card({
  children,
  className = "",
  style,
  id,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section id={id} className={`tw-card ${className}`.trim()} style={style}>
      {children}
    </section>
  );
}

export function CardHead({
  icon,
  title,
  subtitle,
  actions,
  plain = false,
}: {
  icon?: IconName;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Reference variant: 18px title with no icon tile. */
  plain?: boolean;
}) {
  return (
    <header className={`tw-card-head${plain ? " tw-card-head--plain" : ""}`}>
      {icon && !plain ? (
        <span className="tw-card-icon">
          <Icon name={icon} size={18} />
        </span>
      ) : null}
      <div className="tw-card-copy">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="tw-card-actions">{actions}</div> : null}
    </header>
  );
}

export function SectionLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="tw-section-label">
      <span>{children}</span>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ fields */

export function Field({
  label,
  help,
  children,
  className = "",
  hint,
}: {
  label?: ReactNode;
  help?: boolean;
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
}) {
  return (
    <label className={`tw-field ${className}`.trim()}>
      {label ? (
        <span className="tw-label">
          {label}
          {help ? (
            <span className="tw-help" aria-hidden="true">
              <Icon name="help" size={11} />
            </span>
          ) : null}
        </span>
      ) : null}
      {children}
      {hint ? <small className="tw-field-hint">{hint}</small> : null}
    </label>
  );
}

export function TextInput({
  icon,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: IconName }) {
  return (
    <span className={`tw-control${icon ? " tw-control--icon" : ""} ${className}`.trim()}>
      {icon ? <Icon name={icon} size={15} className="tw-control-icon" /> : null}
      <input {...props} />
    </span>
  );
}

export function Textarea({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLTextAreaElement> & { rows?: number }) {
  return <textarea className={`tw-textarea ${className}`.trim()} {...props} />;
}

export type Option = { value: string; label: string };

export function Select({
  value,
  onChange,
  options,
  icon,
  ariaLabel,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  icon?: IconName;
  ariaLabel?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const current = options.find((option) => option.value === value);
  const label = current?.label ?? placeholder ?? "Select";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      ref={rootRef}
      className={`tw-control tw-select${icon ? " tw-control--icon" : ""}${open ? " is-open" : ""}`}
    >
      {icon ? <Icon name={icon} size={15} className="tw-control-icon" /> : null}
      <button
        type="button"
        className="tw-select-btn"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <span>{label}</span>
        <Icon name="chevron-down" size={14} className="tw-select-chevron" />
      </button>

      {open ? (
        <div className="tw-select-menu" role="listbox" aria-label={ariaLabel}>
          {placeholder && !current ? (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              className="tw-select-item"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <span>{placeholder}</span>
            </button>
          ) : null}
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`tw-select-item${option.value === value ? " is-active" : ""}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value ? <Icon name="check" size={14} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}

export function MultiSelect({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = "Select",
  disabled,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  options: Option[];
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const selected = options.filter((option) => value.includes(option.value));
  const label = selected.length ? selected.map((option) => option.label).join(", ") : placeholder;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={rootRef} className={`tw-control tw-select tw-multi-select${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="tw-select-btn"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <Icon name="chevron-down" size={14} className="tw-select-chevron" />
      </button>
      {open ? (
        <div className="tw-select-menu" role="listbox" aria-label={ariaLabel} aria-multiselectable="true">
          {options.map((option) => {
            const active = value.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className={`tw-select-item${active ? " is-active" : ""}`}
                onClick={() => onChange(active ? value.filter((item) => item !== option.value) : [...value, option.value])}
              >
                <span>{option.label}</span>
                {active ? <Icon name="check" size={14} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------ colour maths */

type Rgb = { r: number; g: number; b: number };
type Hsv = { h: number; s: number; v: number };

function hexToRgb(hex: string): Rgb | null {
  const clean = hex.trim().replace(/^#/, "");
  const full =
    clean.length === 3 ? clean.split("").map((part) => part + part).join("") : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const part = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { h: hue, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const chroma = v * s;
  const section = (h / 60) % 6;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  let rgb: [number, number, number] = [0, 0, 0];
  if (section < 1) rgb = [chroma, x, 0];
  else if (section < 2) rgb = [x, chroma, 0];
  else if (section < 3) rgb = [0, chroma, x];
  else if (section < 4) rgb = [0, x, chroma];
  else if (section < 5) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];
  const match = v - chroma;
  return {
    r: Math.round((rgb[0] + match) * 255),
    g: Math.round((rgb[1] + match) * 255),
    b: Math.round((rgb[2] + match) * 255),
  };
}

function hsvToHex(hsv: Hsv): string {
  return rgbToHex(hsvToRgb(hsv));
}

export function ColorField({
  value,
  onChange,
  label,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<Hsv>(() =>
    rgbToHsv(hexToRgb(value) ?? { r: 0, g: 0, b: 0 }),
  );
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rgb = hexToRgb(value);
    if (!rgb) return;
    const next = rgbToHsv(rgb);
    setHsv((current) => ({ ...next, h: next.s === 0 ? current.h : next.h }));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const commit = (next: Hsv) => {
    setHsv(next);
    onChange(hsvToHex(next));
  };

  // A hue-only wheel must still work from white/black: otherwise saturation or
  // brightness stays at zero and moving the hue produces no visible change.
  const commitHue = (hue: number) => {
    commit({
      ...hsv,
      h: (hue + 360) % 360,
      s: hsv.s < 0.04 ? 0.68 : hsv.s,
      v: hsv.v < 0.04 ? 0.92 : hsv.v,
    });
  };

  const hueFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    commitHue(angle);
  };

  const radians = (hsv.h * Math.PI) / 180;
  const wheelX = 50 + Math.sin(radians) * 41;
  const wheelY = 50 - Math.cos(radians) * 41;
  const valid = /^#[0-9a-f]{6}$/i.test(value);

  return (
    <div className="tw-color-field" ref={rootRef}>
      {label ? <span className="tw-label">{label}</span> : null}
      <span className={`tw-control tw-color${disabled ? " is-disabled" : ""}`}>
        <button
          type="button"
          className="tw-swatch"
          style={{ background: valid ? value : "#000000" }}
          onClick={() => setOpen((current) => !current)}
          disabled={disabled}
          aria-label={typeof label === "string" ? `${label} picker` : "Colour picker"}
          aria-expanded={open}
        />
        <input
          className="tw-color-hex"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => {
            const raw = event.target.value.trim();
            if (!/^#[0-9a-f]{6}$/i.test(raw)) onChange("#000000");
          }}
          spellCheck={false}
          aria-label="Hex colour"
          disabled={disabled}
        />
      </span>

      {open ? (
        <div className="tw-color-pop">
          <div
            className="tw-color-wheel"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              hueFromPointer(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) hueFromPointer(event);
            }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const step = event.key === "ArrowRight" ? 4 : -4;
              commitHue(hsv.h + step);
            }}
            role="slider"
            aria-label="Hue"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(hsv.h)}
            tabIndex={0}
          >
            <span
              className="tw-color-wheel-thumb"
              style={{
                left: `${wheelX}%`,
                top: `${wheelY}%`,
                background: `hsl(${hsv.h} 100% 50%)`,
              }}
            />
          </div>

        </div>
      ) : null}
    </div>
  );
}

export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  suffix = "",
  ticks,
  onChange,
  disabled,
  format,
}: {
  label?: ReactNode;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  ticks?: string[];
  onChange: (value: number) => void;
  disabled?: boolean;
  format?: (value: number) => string;
}) {
  const percent = ((value - min) / (max - min || 1)) * 100;
  return (
    <div className={`tw-slider${disabled ? " is-disabled" : ""}`}>
      {label ? (
        <div className="tw-slider-head">
          <span>{label}</span>
          <span className="tw-slider-value">{format ? format(value) : `${value}${suffix}`}</span>
        </div>
      ) : null}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ ["--tw-fill" as string]: `${percent}%` }}
        aria-label={typeof label === "string" ? label : "Slider"}
      />
      {ticks ? (
        <div className="tw-slider-ticks">
          {ticks.map((tick, index) => (
            <span
              key={tick + index}
              style={
                ticks.length > 1
                  ? {
                      left: `${(index / (ticks.length - 1)) * 100}%`,
                      transform:
                        index === 0
                          ? "none"
                          : index === ticks.length - 1
                            ? "translateX(-100%)"
                            : "translateX(-50%)",
                    }
                  : undefined
              }
            >
              {tick}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`tw-toggle${checked ? " is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function ToggleTile({
  icon,
  title,
  description,
  checked,
  onChange,
  locked,
  onLockedClick,
  accentBorder,
}: {
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  locked?: boolean;
  onLockedClick?: () => void;
  accentBorder?: boolean;
}) {
  return (
    <div className={`tw-toggle-tile${accentBorder && checked ? " is-accent" : ""}`}>
      {icon ? (
        <span className="tw-toggle-tile-icon">
          <Icon name={icon} size={19} />
        </span>
      ) : null}
      <span className="tw-toggle-tile-copy">
        <b>{title}</b>
        {description ? <small>{description}</small> : null}
      </span>
      {locked ? (
        <button type="button" className="tw-tile-lock" onClick={onLockedClick} aria-label="Premium feature">
          <Icon name="lock" size={14} />
        </button>
      ) : (
        <Toggle checked={checked} onChange={onChange ?? (() => undefined)} label={typeof title === "string" ? title : undefined} />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- buttons */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "soft";
  icon?: IconName;
  trailingIcon?: IconName;
  wide?: boolean;
};

export function Button({
  variant = "ghost",
  icon,
  trailingIcon,
  wide,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`tw-btn tw-btn--${variant}${wide ? " tw-btn--wide" : ""} ${className}`.trim()}
      {...props}
    >
      {icon ? <Icon name={icon} size={15} /> : null}
      {children}
      {trailingIcon ? <Icon name={trailingIcon} size={15} /> : null}
    </button>
  );
}

export function IconButton({
  label,
  icon,
  variant = "ghost",
  onClick,
  disabled,
  active,
}: {
  label: string;
  icon: IconName;
  variant?: "ghost" | "primary" | "danger" | "plain";
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`tw-icon-btn tw-icon-btn--${variant}${active ? " is-active" : ""}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

export function Chip({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "new" | "amber" | "success";
}) {
  return <span className={`tw-chip tw-chip--${tone}`}>{children}</span>;
}

/* ------------------------------------------------------------- composites */

export function Segmented({
  options,
  value,
  onChange,
  wide,
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <div className={`tw-segmented${wide ? " is-wide" : ""}`} role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={value === option.value ? "is-active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  icon = "layers",
  title,
  message,
  action,
  dashed,
}: {
  icon?: IconName;
  title: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
  dashed?: boolean;
}) {
  return (
    <div className={`tw-empty${dashed ? " tw-empty--dashed" : ""}`}>
      <span className="tw-empty-icon">
        <Icon name={icon} size={30} />
      </span>
      <b>{title}</b>
      {message ? <p>{message}</p> : null}
      {action ? <div className="tw-empty-action">{action}</div> : null}
    </div>
  );
}

export function LockedBlock({
  title = "Premium Feature",
  message = "Upgrade to unlock",
  onClick,
}: {
  title?: string;
  message?: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="tw-locked" onClick={onClick}>
      <Icon name="lock" size={14} />
      <span>
        <b>{title}</b>
        <small>{message}</small>
      </span>
    </button>
  );
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 640,
}: {
  open: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="tw-modal-layer" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="tw-modal" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : "Dialog"} ref={panel} style={{ width }}>
        <header className="tw-modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <IconButton label="Close" icon="x" onClick={onClose} />
        </header>
        <div className="tw-modal-body">{children}</div>
        {footer ? <footer className="tw-modal-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function Help() {
  return (
    <span className="tw-help">
      <Icon name="help" size={11} />
    </span>
  );
}

/** Styled file control with the native input retained for keyboard access. */
export function FileUpload({ onChange, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [fileName, setFileName] = useState("");
  return <label className="tw-file-upload"><span>{fileName || "Choose file"}</span><small>{fileName ? "Choose a different file" : "Browse your files"}</small><input {...props} type="file" onChange={(event) => { setFileName(event.target.files?.[0]?.name || ""); onChange?.(event); }} /></label>;
}
