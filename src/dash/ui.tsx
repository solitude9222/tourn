import {ColorTools} from "./ColorTools";
import {EmojiPicker} from "./EmojiPicker";
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

import { createPortal } from "react-dom";

const activeGestures = new Set<symbol>();
/** Keep gesture feedback local; serializing the profile belongs at release. */
function useCommittedValue<T>(value: T, onChange: (value: T) => void) {
  const [draft, setDraft] = useState(value);
  const latest = useRef(value);
  const callback = useRef(onChange);
  const pending = useRef(false);
  const dragging = useRef(false);
  const timer = useRef(0);
  const token = useRef(Symbol());
  callback.current = onChange;

  const endGesture = () => {
    activeGestures.delete(token.current);
    if (!activeGestures.size) delete document.documentElement.dataset.editorGesture;
  };
  const finish = () => {
    window.clearTimeout(timer.current);
    dragging.current = false;
    endGesture();
    if (pending.current) {
      pending.current = false;
      callback.current(latest.current);
    }
  };
  useEffect(() => {
    if (!pending.current && !dragging.current) {
      latest.current = value;
      setDraft(value);
    }
  }, [value]);
  useEffect(() => () => {
    window.clearTimeout(timer.current);
    endGesture();
    if (pending.current) callback.current(latest.current);
  }, []);

  return {
    draft,
    begin: () => {
      dragging.current = true;
      activeGestures.add(token.current);
      document.documentElement.dataset.editorGesture = "true";
    },
    finish,
    change: (next: T) => {
      latest.current = next;
      pending.current = true;
      setDraft(next);
      window.clearTimeout(timer.current);
      if (!dragging.current) timer.current = window.setTimeout(finish, 140);
    },
  };
}

/* ------------------------------------------------------------------ icons */

export type IconName =
  | "hash" | "info"
  | "home"
  | "smile"
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
  | "mic"
  | "mic-off"
  | "headphones"
  | "headphones-off"
  | "expand"
  | "minus"
  | "at"
  | "mail"
  | "key"
  | "trash-2"
  | "move"
  | "gift"
  | "dots"
  | "share";

const ICONS: Record<IconName, ReactNode> = {
 hash:<><path d="M5 9h14M4 15h14M11 3 7 21M17 3l-4 18"/></>,
 smile:<><circle cx="12" cy="12" r="8.6"/><path d="M8.6 14.2a4.2 4.2 0 0 0 6.8 0"/><path d="M9.2 9.6h.01M14.8 9.6h.01"/></>,
 info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
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
  mic: (
    <>
      <rect x="9" y="3" width="6" height="10" rx="3" />
      <path d="M5.5 11.2a6.5 6.5 0 0 0 13 0M12 17.7v3.1M9 20.8h6" />
    </>
  ),
  "mic-off": (
    <>
      <path d="M9 9v1a3 3 0 0 0 5.1 2.1M9 5.2A3 3 0 0 1 15 6v3" />
      <path d="M5.5 11.2a6.5 6.5 0 0 0 9.6 5.7M18.5 11.2a6.4 6.4 0 0 1-.5 2.5M12 17.7v3.1M9 20.8h6" />
      <path d="m3 3 18 18" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 13v-1.2a8 8 0 0 1 16 0V13" />
      <rect x="3.2" y="12" width="4.2" height="7" rx="2" />
      <rect x="16.6" y="12" width="4.2" height="7" rx="2" />
    </>
  ),
  "headphones-off": (
    <>
      <path d="M4 13v-1.2a8 8 0 0 1 12.2-6.8M19.8 10.6V13" />
      <path d="M3.2 13.8A2 2 0 0 1 5.2 12h2.2v7H5.2a2 2 0 0 1-2-1.8Z" />
      <path d="M16.6 15.6v3.4h2.2a2 2 0 0 0 2-1.8v-1.4" />
      <path d="m3 3 18 18" />
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
  gift: (
    <>
      <path d="M4.5 11.2h15v8.3h-15z" />
      <path d="M3.4 7.6h17.2v3.6H3.4z" />
      <path d="M12 7.6v11.9" />
      <path d="M12 7.6C10.6 4.4 8.9 3.4 7.4 4.3c-1.4.9-.7 3.3 1.7 3.3Z" />
      <path d="M12 7.6c1.4-3.2 3.1-4.2 4.6-3.3 1.4.9.7 3.3-1.7 3.3Z" />
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

const SOLID_NAV: Partial<Record<IconName,string>> = {
 home:'M3 10 12 2l9 8v11h-6v-7H9v7H3z',
 user:'M3 3h18v18H3z M7 7v5h5V7z M6 15v3h12v-3z',
 palette:'M12 2a10 10 0 1 0 0 20h2a3 3 0 0 0 0-6h-1a1 1 0 0 1 0-2h3a6 6 0 0 0 0-12z M6 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 1 1-3 0 M11 5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 1 1-3 0 M16 8a1.5 1.5 0 1 1 3 0 1.5 1.5 0 1 1-3 0',
 layers:'m12 2 11 6-11 6L1 8z M1 12l11 6 11-6v4l-11 6L1 16z',
 grid:'M2 2h20v20H2z M5 5v5h5V5z M14 5v5h5V5z M5 14v5h5v-5z M14 14v5h5v-5z',
 image:'M3 2h18a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1 M5 18h14l-5-7-4 4-2-3z M5 7a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
 star:'m12 1 3.4 7 7.6 1.1-5.5 5.4 1.3 7.5-6.8-3.5L5.2 22l1.3-7.5L1 9.1 8.6 8z',
 shield:'m12 1 10 4v7c0 5-5 9-10 11C7 21 2 17 2 12V5z M12 5v14c4-2 6-5 6-8V8z',
 sparkles:'m10 1 3 7 7 3-7 3-3 8-3-8-7-3 7-3z M20 1l1 3 3 1-3 1-1 3-1-3-3-1 3-1z'
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
      {className?.includes("tw-nav-symbol") && SOLID_NAV[name] ? <path d={SOLID_NAV[name]} fill="currentColor" fillRule="evenodd" stroke="none"/> : ICONS[name]}
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
  /** true for a bare question mark, or the sentence it should explain. */
  help?: boolean | string;
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
}) {
  const helpText = typeof help === "string" ? help : undefined;
  return (
    <label className={`tw-field ${className}`.trim()}>
      {label ? (
        <span className="tw-label">
          {label}
          {help ? (
            <span
              className="tw-help"
              role="img"
              aria-label={helpText ?? "More information"}
              title={helpText}
            >
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

/** Inserts :name: at the caret through the native setter, so React's onChange
 *  still sees the change. */
function insertEmojiToken(el: HTMLInputElement | HTMLTextAreaElement | null, name: string) {
  if (!el) return;
  const token = `:${name}:`;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const next = `${el.value.slice(0, start)}${token}${el.value.slice(end)}`;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, next);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
  el.setSelectionRange(start + token.length, start + token.length);
}

export function TextInput({
  icon,
  emoji = false,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: IconName; emoji?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span
      className={`tw-control${icon ? " tw-control--icon" : ""}${emoji ? " tw-control--emoji" : ""} ${className}`.trim()}
    >
      {icon ? <Icon name={icon} size={15} className="tw-control-icon" /> : null}
      <input ref={ref} {...props} />
      {emoji ? <EmojiPicker onPick={(name) => insertEmojiToken(ref.current, name)} /> : null}
    </span>
  );
}

export function Textarea({
  emoji = false,
  className = "",
  rows,
  ...props
}: InputHTMLAttributes<HTMLTextAreaElement> & { rows?: number; emoji?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  if (!emoji) return <textarea className={`tw-textarea ${className}`.trim()} rows={rows} {...props} />;
  return (
    <span className={`tw-textarea-wrap ${className}`.trim()}>
      <textarea ref={ref} className="tw-textarea" rows={rows} {...props} />
      <EmojiPicker onPick={(name) => insertEmojiToken(ref.current, name)} />
    </span>
  );
}

export type Option = { value: string; label: string };

/* Dropdowns float above the page. The menu is portalled to <body> and placed
   from its trigger, so a card with overflow hidden — or the section that
   follows it — can never clip the menu. It drops below the trigger, or flips
   above it when there is more room there. */
function dropdownKeys(
  event: React.KeyboardEvent,
  menuRef: { current: HTMLDivElement | null },
  open: boolean,
  triggerRef: { current: HTMLButtonElement | null },
) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
  if (!open || !items.length) {
    triggerRef.current?.click();
    window.requestAnimationFrame(() => {
      const opened = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
      if (!opened.length) return;
      const pick = event.key === "ArrowUp" || event.key === "End" ? opened[opened.length - 1] : opened[0];
      pick.focus({ preventScroll: true });
    });
    return;
  }
  const current = items.indexOf(document.activeElement as HTMLButtonElement);
  const index =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : current < 0
          ? 0
          : (current + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
  items[index].focus({ preventScroll: true });
}

function useDropdownMenu(open: boolean) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<CSSProperties | null>(null);

  useEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    const place = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const gap = 6;
      const edge = 8;
      const below = window.innerHeight - rect.bottom - gap - edge;
      const above = rect.top - gap - edge;
      // Only flip up when the menu genuinely does not fit underneath.
      const up = below < 200 && above > below;
      const width = Math.min(Math.max(180, rect.width), window.innerWidth - edge * 2);
      setPlacement({
        left: Math.min(Math.max(edge, rect.left), Math.max(edge, window.innerWidth - width - edge)),
        width,
        maxHeight: Math.max(140, Math.min(288, up ? above : below)),
        ...(up ? { bottom: window.innerHeight - rect.top + gap } : { top: rect.bottom + gap }),
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  return { triggerRef, menuRef, placement };
}

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
  const menu = useDropdownMenu(open);
  const current = options.find((option) => option.value === value);
  const label = current?.label ?? placeholder ?? "Select";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menu.menuRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>(".tw-select-btn")?.focus({ preventScroll: true });
      }
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
      onKeyDown={(event) => dropdownKeys(event, menu.menuRef, open, menu.triggerRef)}
      className={`tw-control tw-select${icon ? " tw-control--icon" : ""}${open ? " is-open" : ""}`}
    >
      {icon ? <Icon name={icon} size={15} className="tw-control-icon" /> : null}
      <button
        type="button"
        ref={menu.triggerRef}
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

      {open ? createPortal(
        <div className="tw-dash tw-control-portal">
        <div
          ref={menu.menuRef}
          className="tw-select-menu is-portal"
          role="listbox"
          aria-label={ariaLabel}
          style={menu.placement ?? { visibility: "hidden" }}
          onKeyDown={(event) => dropdownKeys(event, menu.menuRef, open, menu.triggerRef)}
        >
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
        </div>, document.body
      ) : null}
    </span>
  );
}

/** The one sort dropdown every list uses, so they all look and read the same. */
export function SortSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <span className="tw-sort" role="group" aria-label="Sort">
      <span className="tw-sort-label">Sort</span>
      <Select value={value} onChange={onChange} options={options} ariaLabel="Sort by" />
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
  const menu = useDropdownMenu(open);
  const selected = options.filter((option) => value.includes(option.value));
  const label = selected.length ? selected.map((option) => option.label).join(", ") : placeholder;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menu.menuRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>(".tw-select-btn")?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={rootRef} onKeyDown={(event) => dropdownKeys(event, menu.menuRef, open, menu.triggerRef)}
      className={`tw-control tw-select tw-multi-select${open ? " is-open" : ""}`}>
      <button
        type="button"
        ref={menu.triggerRef}
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
      {open ? createPortal(
        <div className="tw-dash tw-control-portal">
        <div
          ref={menu.menuRef}
          className="tw-select-menu is-portal"
          role="listbox"
          aria-label={ariaLabel}
          aria-multiselectable="true"
          style={menu.placement ?? { visibility: "hidden" }}
          onKeyDown={(event) => dropdownKeys(event, menu.menuRef, open, menu.triggerRef)}
        >
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
        </div>, document.body
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
  const initialColor = useRef(value);
  const control = useCommittedValue(value,onChange);
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<Hsv>(() =>
    rgbToHsv(hexToRgb(value) ?? { r: 0, g: 0, b: 0 }),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  // Typing a hex value must not be fought by the value it is still becoming,
  // so the field keeps its own text while it has focus.
  const [draftHex, setDraftHex] = useState(value.toUpperCase());
  const editingHex = useRef(false);
  const hexDirty=useRef(false);
  const [placement, setPlacement] = useState({ top: 0, left: 0, up: false, ready: false });

  // Cards and panels scroll, so an absolutely positioned popup gets clipped at
  // their edges. Measure the field and pin the popup to the viewport instead,
  // flipping above the field when there is no room below.
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const place = () => {
      const anchor = rootRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = popRef.current?.offsetWidth || 184;
      const height = popRef.current?.offsetHeight || 208;
      const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
      const up = rect.bottom + height + 12 > window.innerHeight && rect.top - height - 12 > 8;
      setPlacement({ top: Math.max(8,Math.min(up ? rect.top-height-8 : rect.bottom+8,innerHeight-height-8)), left, up, ready: true });
    };
    place();
    const observer = new ResizeObserver(place); if(popRef.current)observer.observe(popRef.current);
    frame = window.requestAnimationFrame(()=>{place();popRef.current?.querySelector<HTMLInputElement>("input")?.focus({preventScroll:true});});
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    const rgb = hexToRgb(value);
    if (!rgb) return;
    const next = rgbToHsv(rgb);
    setHsv((current) => ({ ...next, h: next.s === 0 ? current.h : next.h }));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && !popRef.current?.contains(event.target as Node)) { control.finish(); setOpen(false); }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { control.finish(); setOpen(false); rootRef.current?.querySelector("button")?.focus({preventScroll:true}); }
      if(event.key==="Tab"&&popRef.current){const items=Array.from(popRef.current.querySelectorAll<HTMLElement>('input,button,summary,[tabindex="0"]')).filter(item=>item.getClientRects().length&&!item.hasAttribute('disabled'));const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const commit = (next: Hsv) => { setHsv(next); control.change(hsvToHex(next)); };

  // Saturation runs left → right, brightness bottom → top, and the band under
  // the square picks the hue — the arrangement every other colour picker uses,
  // so nobody has to learn this one.
  const squareFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    commit({ h: hsv.h, s: x, v: 1 - y });
  };

  const hueFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    commit({ ...hsv, h: x >= 1 ? 359.9 : x * 360 });
  };

  const shiftHue = (hue: number) => commit({ ...hsv, h: (hue + 360) % 360 });
  const hueColor = `hsl(${hsv.h} 100% 50%)`;
  const valid = /^#[0-9a-f]{6}$/i.test(control.draft);
  const readout = valid ? control.draft.toUpperCase() : "#000000";

  return (
    <div className="tw-color-field" ref={rootRef}>
      {label ? <span className="tw-label">{label}</span> : null}
      <span className={`tw-control tw-color${disabled ? " is-disabled" : ""}`}>
        <button
          type="button"
          className="tw-swatch"
          style={{ background: valid ? control.draft : "#000000" }}
          onClick={() => { control.finish(); setOpen(current => !current); }}
          disabled={disabled}
          aria-label={typeof label === "string" ? `${label} picker` : "Colour picker"}
          aria-expanded={open}
        />
        <button
          type="button"
          className="tw-color-value"
          onClick={() => { control.finish(); setOpen(current => !current); }}
          disabled={disabled}
          aria-expanded={open}
        >
          {readout}
        </button>
      </span>

      {open ? createPortal(
        <div className="tw-dash tw-control-portal"><div
          className={`tw-color-pop${placement.up ? " is-up" : ""}`}
          ref={popRef}
          role="dialog" aria-label="Color picker"
          style={{ top: placement.top, left: placement.left, visibility: placement.ready ? "visible" : "hidden" }}
        >
          <div className="tw-color-top">
            <span className="tw-color-dot" style={{ background: readout }} />
            <input
              className="tw-color-input"
              value={editingHex.current ? draftHex : readout}
              onFocus={() => {
                editingHex.current = true; hexDirty.current=false;
                setDraftHex(readout);
              }}
              onChange={(event) => {
                const next = event.target.value; hexDirty.current=true;
                setDraftHex(next);
                if (/^#[0-9a-f]{6}$/i.test(next)) { control.change(next); setHsv(rgbToHsv(hexToRgb(next)!)); }
              }}
              onBlur={() => {
                editingHex.current = false;
                const raw = draftHex.trim();
                if (hexDirty.current && /^#[0-9a-f]{6}$/i.test(raw)) { control.change(raw); control.finish(); }
                else setDraftHex(readout);
              }}
              spellCheck={false}
              aria-label="Hex colour"
            />
            <button
              type="button"
              className="tw-color-close"
              onClick={() => { control.finish(); setOpen(false); }}
              aria-label="Close colour picker"
            >
              ×
            </button>
          </div>

          <div
            className="tw-color-square"
            style={{
              backgroundImage: `linear-gradient(to top, #000, rgba(0, 0, 0, 0)), linear-gradient(to right, #fff, ${hueColor})`,
            }}
            onPointerDown={(event) => {
              popRef.current?.querySelector<HTMLInputElement>("input")?.blur();
              control.begin();
              event.currentTarget.setPointerCapture(event.pointerId);
              squareFromPointer(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) squareFromPointer(event);
            }}
            onKeyDown={(event)=>{if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))return;event.preventDefault();const step=event.shiftKey ? 0.1 : 0.01;commit({...hsv,s:Math.max(0,Math.min(1,hsv.s+(event.key==="ArrowRight"?step:event.key==="ArrowLeft"?-step:0))),v:Math.max(0,Math.min(1,hsv.v+(event.key==="ArrowUp"?step:event.key==="ArrowDown"?-step:0)))});}}
            onPointerUp={control.finish}
            onPointerCancel={control.finish}
            onLostPointerCapture={control.finish}
            onKeyUp={control.finish}
            onBlur={control.finish}
            role="slider"
            aria-label="Saturation and brightness"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(hsv.s * 100)}
            aria-valuetext={`${Math.round(hsv.s * 100)}% saturation, ${Math.round(hsv.v * 100)}% brightness`}
            tabIndex={0}
          >
            <span
              className="tw-color-square-thumb"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                background: hsvToHex(hsv),
              }}
            />
          </div>

          <div
            className="tw-hue"
            onPointerDown={(event) => {
              popRef.current?.querySelector<HTMLInputElement>("input")?.blur();
              control.begin();
              event.currentTarget.setPointerCapture(event.pointerId);
              hueFromPointer(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) hueFromPointer(event);
            }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              shiftHue(hsv.h + (event.key === "ArrowRight" ? 4 : -4));
            }}
            onPointerUp={control.finish}
            onPointerCancel={control.finish}
            onLostPointerCapture={control.finish}
            onKeyUp={control.finish}
            onBlur={control.finish}
            role="slider"
            aria-label="Hue"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(hsv.h)}
            tabIndex={0}
          >
            <span
              className="tw-hue-thumb"
              style={{ left: `${(hsv.h / 360) * 100}%`, background: hueColor }}
            />
          </div>
          <ColorTools value={readout} initial={initialColor.current} onChoose={next=>{control.change(next);control.finish();setHsv(rgbToHsv(hexToRgb(next)!));}}/>
        </div></div>, document.body
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
  const original=useRef(value);
  const control=useCommittedValue(value,onChange);
  const draft=control.draft;
  const numeric=useRef<HTMLInputElement>(null);
  const setNumber=(raw:string)=>{if(!raw.trim())return;const next=Number(raw);if(Number.isFinite(next)){control.change(Number(Math.max(min,Math.min(max,Math.round((next-min)/step)*step+min)).toFixed(6)));control.finish();}};
  const percent = ((draft - min) / (max - min || 1)) * 100;
  return (
    <div className={`tw-slider${disabled ? " is-disabled" : ""}`}>
      {label ? (
        <div className="tw-slider-head">
          <span>{label}</span>
          <span className="tw-slider-value"><input ref={numeric} className="tw-slider-number" type="number" aria-label={typeof label==='string'?label+' value':'Slider value'} min={min} max={max} step={step} disabled={disabled} key={draft} defaultValue={draft} onBlur={e=>setNumber(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){setNumber(e.currentTarget.value);e.currentTarget.blur();}if(e.key==='Escape'){e.currentTarget.value=String(draft);e.currentTarget.blur();}}}/><span aria-hidden="true">{suffix}</span><button type="button" className="tw-slider-revert" disabled={disabled||draft===original.current} title="Revert to the value when this editor opened" aria-label={typeof label==='string'?'Revert '+label:'Revert slider'} onClick={()=>{control.change(original.current);control.finish();}}>↶</button></span>
        </div>
      ) : null}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft}
        disabled={disabled}
        onPointerDown={(event) => { control.begin(); event.currentTarget.setPointerCapture(event.pointerId); }}
        onChange={(event) => {
          const next = Number(event.target.value);
          control.change(next);
        }}
        onPointerUp={control.finish}
        onPointerCancel={control.finish}
        onLostPointerCapture={control.finish}
        onKeyUp={control.finish}
        onBlur={control.finish}
        style={{ ["--tw-fill" as string]: `${percent}%` }}
        aria-label={typeof label === "string" ? label : "Slider"}
        onDoubleClick={()=>{control.change(original.current);control.finish();}}
        onKeyDown={event=>{if(event.shiftKey&&(event.key==="ArrowLeft"||event.key==="ArrowRight")){event.preventDefault();control.change(Math.max(min,Math.min(max,draft+(event.key==="ArrowRight"?1:-1)*step*10)));}}}
        aria-valuetext={format ? format(draft) : `${draft}${suffix}`}
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

export function navigateTabs(event: React.KeyboardEvent<HTMLElement>) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  if (!tabs.length) return;
  const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
  const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowLeft" ? -1 : 1) + tabs.length) % tabs.length;
  event.preventDefault(); tabs[next].focus(); tabs[next].click();
}

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
    <div className={`tw-segmented${wide ? " is-wide" : ""}`} role="tablist" onKeyDown={navigateTabs}>
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
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open || !panel.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = panel.current;
    const focusable = () => Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(el => el.getClientRects().length > 0);
    (focusable()[0] || root).focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || document.querySelector(".tw-color-pop")) return;
      // Only the topmost dialog traps focus when a picker opens a second dialog.
      const dialogs = document.querySelectorAll('.tw-modal');
      if (dialogs[dialogs.length - 1] !== root) return;
      const items = focusable(), first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); root.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.removeEventListener("keydown", trap); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector(".tw-color-pop") && document.querySelectorAll(".tw-modal")[document.querySelectorAll(".tw-modal").length - 1] === panel.current) { event.stopImmediatePropagation(); closeRef.current(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="tw-dash tw-dialog-portal" style={{display:"contents"}}><div className="tw-modal-layer" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="tw-modal" role="dialog" aria-modal="true" tabIndex={-1} aria-label={typeof title === "string" ? title : "Dialog"} ref={panel} style={{ width }}>
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
    </div></div>, document.body
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
