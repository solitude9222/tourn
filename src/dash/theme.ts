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
    label: "Default",
    description: "Near-black console with the tourn red accent.",
    swatch: ["#000000", "#16161b", "#e00a0e"],
  },
  {
    id: "black",
    label: "Full black",
    description: "Every surface is pure black, separated by hairlines only.",
    swatch: ["#000000", "#000000", "#e00a0e"],
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
