/* ---------------------------------------------------------------------------
   tourn.lol dashboard — primitives.

   One small, dependency-free component library used by every page. Every
   colour, radius and size comes from dash.css tokens; nothing here invents a
   second visual language.
   --------------------------------------------------------------------------- */

import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
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
  | "dots";

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
    <>
      <path d="M8.4 6.2A13 13 0 0 0 5.6 7C3.4 10.4 2.8 13.6 3.2 16.4a14 14 0 0 0 4 2l1-1.6" />
      <path d="M15.6 6.2A13 13 0 0 1 18.4 7c2.2 3.4 2.8 6.6 2.4 9.4a14 14 0 0 1-4 2l-1-1.6" />
      <path d="M8.4 6.2 9 4.6c1.8-.6 4.2-.6 6 0l.6 1.6" />
      <circle cx="9.2" cy="13" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="13" r="1.3" fill="currentColor" stroke="none" />
    </>
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
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section className={`tw-card ${className}`.trim()} style={style}>
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
  return (
    <span className={`tw-control tw-select${icon ? " tw-control--icon" : ""}`}>
      {icon ? <Icon name={icon} size={15} className="tw-control-icon" /> : null}
      <select
        value={value}
        aria-label={ariaLabel}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" size={14} className="tw-select-chevron" />
    </span>
  );
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
  const id = useId();
  return (
    <div className="tw-color-field">
      {label ? <span className="tw-label">{label}</span> : null}
      <span className={`tw-control tw-color${disabled ? " is-disabled" : ""}`}>
        <label className="tw-swatch" htmlFor={id} style={{ background: value }}>
          <input
            id={id}
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            aria-label={typeof label === "string" ? label : "Colour"}
          />
        </label>
        <input
          className="tw-color-hex"
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next);
          }}
          onBlur={(event) => {
            const raw = event.target.value.trim();
            if (!/^#[0-9a-f]{6}$/i.test(raw)) onChange("#000000");
          }}
          spellCheck={false}
          aria-label="Hex colour"
          disabled={disabled}
        />
      </span>
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
