/* ---------------------------------------------------------------------------
   Dashboard theme.

   The console ships five palettes. The choice lives in localStorage, is applied
   as a data attribute on <html> so every dashboard sheet can read it, and is
   announced so the theme picker and the shell stay in sync without a store.
   --------------------------------------------------------------------------- */

import { useEffect, useState } from "react";

export type DashTheme = "default" | "black" | "mono" | "ocean" | "lime";

export type DashThemeDef = {
  id: DashTheme;
  label: string;
  description: string;
  /** page, card, accent — used by the picker swatch. */
  swatch: [string, string, string];
};

export const DASH_THEMES: DashThemeDef[] = [
  {
    id: "default",
    label: "Tourn blue",
    description: "Black surfaces, electric blue actions and cool neutral text.",
    swatch: ["#09090b", "#18181c", "#3b82f6"],
  },
  {
    id: "black",
    label: "Flat black",
    description: "One flat charcoal surface, separated by hairlines only.",
    swatch: ["#0b0b0d", "#141418", "#3b82f6"],
  },
  {
    id: "mono",
    label: "Black & white",
    description: "No colour at all: white accents, grey chrome.",
    swatch: ["#000000", "#131316", "#f4f4f5"],
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Deep blue-black surfaces with a cool blue accent.",
    swatch: ["#050b12", "#0e171f", "#3ea8e0"],
  },
  {
    id: "lime",
    label: "Lime green",
    description: "Dark olive surfaces with a bright lime accent.",
    swatch: ["#070a05", "#12160f", "#a3e635"],
  },
];

const KEY = "tourn.dashTheme";
const EVENT = "tourn:dash-theme";

export function readDashTheme(): DashTheme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && DASH_THEMES.some((theme) => theme.id === saved)) return saved as DashTheme;
  } catch {
    /* private mode */
  }
  return "default";
}

export function applyDashTheme(theme: DashTheme) {
  document.documentElement.dataset.dashTheme = theme;
}

export function setDashTheme(theme: DashTheme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode */
  }
  applyDashTheme(theme);
  window.dispatchEvent(new CustomEvent<DashTheme>(EVENT, { detail: theme }));
}

export function useDashTheme(): [DashTheme, (theme: DashTheme) => void] {
  const [theme, setTheme] = useState<DashTheme>(readDashTheme);

  useEffect(() => {
    applyDashTheme(theme);
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<DashTheme>).detail;
      if (next) setTheme(next);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [theme]);

  return [theme, setDashTheme];
}

const ACCENT_KEY = "tourn.dashAccent";
export function readDashAccent(): string {
  try { const value = localStorage.getItem(ACCENT_KEY) || ""; return /^#[0-9a-f]{6}$/i.test(value) ? value : ""; } catch { return ""; }
}
export function setDashAccent(color: string) {
  try { color ? localStorage.setItem(ACCENT_KEY, color) : localStorage.removeItem(ACCENT_KEY); } catch { /* optional */ }
  window.dispatchEvent(new CustomEvent("tourn:dash-accent", { detail: color }));
}
export function useDashAccent(): [string, (color: string) => void] {
  const [color, setColor] = useState(readDashAccent);
  useEffect(() => {
    const sync = () => setColor(readDashAccent());
    const change = (event: Event) => { const value = (event as CustomEvent<string>).detail; if (value === "" || /^#[0-9a-f]{6}$/i.test(value)) setColor(value); };
    window.addEventListener("tourn:dash-accent", change);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("tourn:dash-accent", change); window.removeEventListener("storage", sync); };
  }, []);
  return [color, setDashAccent];
}

/** Choose the higher-contrast foreground for any custom accent. */
export function accentForeground(color: string): string {
  const parts = color.slice(1).match(/../g)?.map(part => {
    const value = parseInt(part, 16) / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  });
  if (!parts || parts.length !== 3) return "#ffffff";
  const luminance = .2126 * parts[0] + .7152 * parts[1] + .0722 * parts[2];
  return luminance > .179 ? "#09090b" : "#ffffff";
}
