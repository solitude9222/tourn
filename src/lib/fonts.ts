/* ---------------------------------------------------------------------------
   Fonts — a categorised catalogue of Google Fonts plus a dynamic loader.
   Fonts are only requested from Google when actually selected, and each
   family is only requested once per page load.
   --------------------------------------------------------------------------- */

export type FontEntry = { family: string; weights: string };

export type FontCategory = {
  id: string;
  name: string;
  fonts: FontEntry[];
};

export const FONT_CATEGORIES: FontCategory[] = [
  {
    id: "sans",
    name: "Sans-serif",
    fonts: [
      { family: "Inter", weights: "400;600;700" },
      { family: "Poppins", weights: "400;600;700" },
      { family: "Montserrat", weights: "400;600;700" },
      { family: "Outfit", weights: "400;600;700" },
      { family: "Sora", weights: "400;600;700" },
      { family: "Manrope", weights: "400;600;800" },
      { family: "DM Sans", weights: "400;600;700" },
      { family: "Work Sans", weights: "400;600;700" },
      { family: "Plus Jakarta Sans", weights: "400;600;700" },
    ],
  },
  {
    id: "serif",
    name: "Serif",
    fonts: [
      { family: "Playfair Display", weights: "400;600;700" },
      { family: "Merriweather", weights: "400;700" },
      { family: "Lora", weights: "400;600;700" },
      { family: "Cormorant Garamond", weights: "400;600;700" },
      { family: "Libre Baskerville", weights: "400;700" },
      { family: "Crimson Text", weights: "400;600;700" },
    ],
  },
  {
    id: "display",
    name: "Display",
    fonts: [
      { family: "Bebas Neue", weights: "400" },
      { family: "Anton", weights: "400" },
      { family: "Archivo Black", weights: "400" },
      { family: "Oswald", weights: "400;600;700" },
      { family: "Big Shoulders", weights: "400;700" },
      { family: "Fjalla One", weights: "400" },
    ],
  },
  {
    id: "script",
    name: "Handwriting",
    fonts: [
      { family: "Caveat", weights: "400;600;700" },
      { family: "Pacifico", weights: "400" },
      { family: "Dancing Script", weights: "400;600;700" },
      { family: "Shadows Into Light", weights: "400" },
      { family: "Permanent Marker", weights: "400" },
      { family: "Satisfy", weights: "400" },
    ],
  },
  {
    id: "mono",
    name: "Monospace",
    fonts: [
      { family: "JetBrains Mono", weights: "400;600;700" },
      { family: "Space Mono", weights: "400;700" },
      { family: "Fira Code", weights: "400;600;700" },
      { family: "IBM Plex Mono", weights: "400;600;700" },
      { family: "Source Code Pro", weights: "400;600;700" },
    ],
  },
  {
    id: "gaming",
    name: "Gaming / Stylized",
    fonts: [
      { family: "Orbitron", weights: "400;600;800" },
      { family: "Audiowide", weights: "400" },
      { family: "Press Start 2P", weights: "400" },
      { family: "Bungee", weights: "400" },
      { family: "Rajdhani", weights: "400;600;700" },
      { family: "Russo One", weights: "400" },
      { family: "Monoton", weights: "400" },
      { family: "Black Ops One", weights: "400" },
    ],
  },
];

export const FONT_MAP = new Map(
  FONT_CATEGORIES.flatMap((category) => category.fonts.map((font) => [font.family, font])),
);

const loadedFonts = new Set<string>();

/** Injects a <link> for the given Google Font family the first time it is
 *  used. Safe to call repeatedly — later calls for an already-loaded family
 *  are no-ops. No-ops outside the browser too, so it's safe to call from
 *  code shared with any non-DOM render path. */
export function loadGoogleFont(family: string): void {
  if (!family || loadedFonts.has(family) || typeof document === "undefined") return;
  loadedFonts.add(family);
  const entry = FONT_MAP.get(family);
  const weights = entry?.weights ?? "400;600;700";
  const encoded = family.replace(/ /g, "+");
  const href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@${weights}&display=swap`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}
