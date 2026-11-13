/* ---------------------------------------------------------------------------
   Built-in templates.

   Each entry is a complete look: card shape, colours, effects and the styling of
   the link row, widgets and badges. Nothing about a person's content travels —
   the preview and the applied look always use that account's own links,
   widgets and badges, so a template can never add or remove links.
   --------------------------------------------------------------------------- */

import { DEFAULT_ABOUT_DESIGN, normalizeAbout, type AboutDesign } from "./about";
import { DEFAULT_PROFILE_ASSETS, loadProfileAssets, type ProfileAssets } from "./profileAssets";
import { DEFAULT_LINK_DESIGN, type LinkDesign } from "./links";
import { DEFAULT_WIDGET_DESIGN, type WidgetDesign } from "./widgets";
import { DEFAULT_BADGE_STYLE, type BadgeStyle } from "./badges";
import { withoutUploads, type TemplateSnapshot } from "./templates";

type GalleryEntry = {
  id: string;
  name: string;
  note: string;
  design: Partial<AboutDesign>;
  linkDesign?: Partial<LinkDesign>;
  widgetDesign?: Partial<WidgetDesign>;
  badgeStyle?: Partial<BadgeStyle>;
};

const GALLERY: GalleryEntry[] = [
  {
    id: "midnight-ink",
    name: "Midnight Ink",
    note: "Deep blue-black, soft glow, generous radius",
    design: {
      cardWidth: 720,
      cardRadius: 24,
      cardPadding: 34,
      borderWidth: 1,
      borderOpacity: 0.16,
      backgroundOpacity: 0.74,
      backgroundBlur: 18,
      colors: { background: "#05070c", card: "#0b0f17", text: "#f2f5ff", muted: "#8a93a6", accent: "#7c9cff", border: "#1b2233" },
    },
  },
  {
    id: "paper",
    name: "Paper",
    note: "Warm light card, crisp type, almost no border",
    design: {
      cardWidth: 700,
      cardRadius: 10,
      cardPadding: 36,
      borderWidth: 1,
      borderOpacity: 0.5,
      backgroundOpacity: 0.96,
      backgroundBlur: 0,
      font: "Inter",
      colors: { background: "#f4f2ec", card: "#ffffff", text: "#14161b", muted: "#6b7180", accent: "#1f6feb", border: "#e2ddd2" },
    },
    linkDesign: { glow: false },
  },
  {
    id: "terminal",
    name: "Terminal",
    note: "Monospace, square corners, phosphor green",
    design: {
      cardWidth: 740,
      cardRadius: 4,
      cardPadding: 30,
      borderWidth: 1,
      borderOpacity: 0.7,
      backgroundOpacity: 0.9,
      backgroundBlur: 0,
      font: "JetBrains Mono",
      colors: { background: "#040604", card: "#0a0f0a", text: "#d6ffd6", muted: "#6d8f6d", accent: "#3ddc84", border: "#16301c" },
    },
    widgetDesign: { radius: 4 },
    badgeStyle: { size: 22 },
  },
  {
    id: "sunset-glass",
    name: "Sunset Glass",
    note: "Plum card, pink accent, blurred edge",
    design: {
      cardWidth: 720,
      cardRadius: 28,
      cardPadding: 32,
      borderWidth: 1,
      borderOpacity: 0.22,
      backgroundOpacity: 0.62,
      backgroundBlur: 26,
      colors: { background: "#1a0d16", card: "#241019", text: "#ffe9f2", muted: "#c79ab0", accent: "#ff7ab6", border: "#3a1c2c" },
    },
    linkDesign: { glow: true },
  },
  {
    id: "ice",
    name: "Ice",
    note: "Cold navy, cyan accent, thin type",
    design: {
      cardWidth: 700,
      cardRadius: 18,
      cardPadding: 32,
      borderWidth: 1,
      borderOpacity: 0.3,
      backgroundOpacity: 0.7,
      backgroundBlur: 16,
      colors: { background: "#071019", card: "#0d1a26", text: "#eaf6ff", muted: "#8fb0c4", accent: "#5ad1ff", border: "#14303f" },
    },
  },
  {
    id: "mono",
    name: "Mono",
    note: "Black, white, zero decoration",
    design: {
      cardWidth: 660,
      cardRadius: 0,
      cardPadding: 30,
      borderWidth: 1,
      borderOpacity: 0.55,
      backgroundOpacity: 1,
      backgroundBlur: 0,
      font: "Inter",
      colors: { background: "#0a0a0a", card: "#111111", text: "#f5f5f5", muted: "#8c8c8c", accent: "#ffffff", border: "#262626" },
    },
    linkDesign: { glow: false },
    widgetDesign: { radius: 6 },
  },
  {
    id: "arcade",
    name: "Arcade",
    note: "Violet cabinet, gold accent, bold spacing",
    design: {
      cardWidth: 760,
      cardRadius: 16,
      cardPadding: 36,
      borderWidth: 2,
      borderOpacity: 0.5,
      backgroundOpacity: 0.82,
      backgroundBlur: 10,
      font: "Space Grotesk",
      colors: { background: "#10061f", card: "#1a0b2e", text: "#f6e9ff", muted: "#b193d0", accent: "#ffd166", border: "#35204f" },
    },
    linkDesign: { glow: true },
    badgeStyle: { size: 26 },
  },
  {
    id: "forest",
    name: "Forest",
    note: "Dark moss, mint accent, quiet borders",
    design: {
      cardWidth: 710,
      cardRadius: 20,
      cardPadding: 34,
      borderWidth: 1,
      borderOpacity: 0.24,
      backgroundOpacity: 0.78,
      backgroundBlur: 14,
      colors: { background: "#06110d", card: "#0c1a14", text: "#e8fff4", muted: "#8fb7a4", accent: "#46d39a", border: "#173227" },
    },
  },
  {
    id: "sand",
    name: "Sand",
    note: "Light stone, terracotta accent, soft radius",
    design: {
      cardWidth: 690,
      cardRadius: 14,
      cardPadding: 34,
      borderWidth: 1,
      borderOpacity: 0.5,
      backgroundOpacity: 0.94,
      backgroundBlur: 0,
      font: "Inter",
      colors: { background: "#ebe6dd", card: "#fbf8f2", text: "#2a241c", muted: "#7d7364", accent: "#b4693b", border: "#ddd3c4" },
    },
    linkDesign: { glow: false },
  },
];

export type GalleryTemplate = {
  id: string;
  name: string;
  note: string;
  swatch: string[];
  snapshot: TemplateSnapshot;
};

function build(entry: GalleryEntry): TemplateSnapshot {
  const assets: ProfileAssets = loadProfileAssets(DEFAULT_PROFILE_ASSETS);
  const about = normalizeAbout({
    design: { ...DEFAULT_ABOUT_DESIGN, ...entry.design },
    assets,
  });
  return {
    design: about.design,
    assets: withoutUploads(about.assets),
    links: { links: [], design: { ...DEFAULT_LINK_DESIGN, ...entry.linkDesign } },
    widgets: { widgets: [], design: { ...DEFAULT_WIDGET_DESIGN, ...entry.widgetDesign } },
    badges: { equipped: [], style: { ...DEFAULT_BADGE_STYLE, ...entry.badgeStyle } },
  };
}

export const TEMPLATE_GALLERY: GalleryTemplate[] = GALLERY.map((entry) => ({
  id: entry.id,
  name: entry.name,
  note: entry.note,
  swatch: [entry.design.colors?.background ?? "#0b0f17", entry.design.colors?.card ?? "#111", entry.design.colors?.accent ?? "#7c9cff"],
  snapshot: build(entry),
}));
