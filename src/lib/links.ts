/* ---------------------------------------------------------------------------
   Links system — platforms, per-link overrides, global card styling.
   --------------------------------------------------------------------------- */
import { getPlatform } from "./linkPlatforms";

export type LinkIconStyle = "default" | "rounded" | "circle" | "pill" | "none";
export type LinkCardStyle = "filled" | "outline" | "ghost" | "glass" | "glow";
export type TooltipStyle = "default" | "glass" | "accent" | "dark" | "minimal";
export type LinkDisplayMode = "card" | "icon";
export type LinkFold = "" | "hover";

export type LinkInstance = {
  id: string;
  platform: string;        // Platform id from linkPlatforms.ts ("website" / "email" / "custom" included)
  label: string;
  url: string;
  tooltip: string;         // hover text — empty = use label
  description: string;     // optional subtitle shown under the label in card mode
  fold: LinkFold;          // how the description behaves — "" always visible, "hover" reveals on hover
  mode: LinkDisplayMode;   // "card" (label + icon) or "icon" (icon-only bubble)
  visible: boolean;
  color: string;           // per-link colour override — "" = use the platform's brand colour
  glowOn: boolean;         // per-link glow, independent of (and additive with) the global glow toggle
  glowColor: string;       // per-link glow colour override — "" = use the global glow colour
  iconUrl: string;         // custom uploaded icon (data URL) — "" = use the platform's brand icon
};

export type LinkDesign = {
  cardStyle: LinkCardStyle;
  iconStyle: LinkIconStyle;
  showBackground: boolean;
  showIcon: boolean;
  /** Render every link as an icon bubble, whatever the per-link choice. */
  iconOnly: boolean;
  showGlow: boolean;
  glowColor: string;
  backgroundOpacity: number; // 0–0.6
  backgroundBlur: number;    // 0–24px
  borderRadius: number;  // 0–24
  gap: number;           // 4–16
  tooltipStyle: TooltipStyle;
  tooltipEnabled: boolean;
};

export type LinkStore = {
  links: LinkInstance[];
  design: LinkDesign;
};

export const DEFAULT_LINK_DESIGN: LinkDesign = {
  cardStyle: "filled",
  iconStyle: "default",
  showBackground: true,
  showIcon: true,
  iconOnly: false,
  showGlow: false,
  glowColor: "#b4bffa",
  backgroundOpacity: 0.12,
  backgroundBlur: 0,
  borderRadius: 12,
  gap: 8,
  tooltipStyle: "default",
  tooltipEnabled: true,
};

export const EMPTY_LINK_STORE: LinkStore = {
  links: [],
  design: { ...DEFAULT_LINK_DESIGN },
};

export const CARD_STYLES: { id: LinkCardStyle; name: string; hint: string }[] = [
  { id: "filled", name: "Filled", hint: "Solid background" },
  { id: "outline", name: "Outline", hint: "Border only" },
  { id: "ghost", name: "Ghost", hint: "No background or border" },
  { id: "glass", name: "Glass", hint: "Frosted translucent" },
  { id: "glow", name: "Glow", hint: "Soft coloured halo" },
];

export const ICON_STYLES: { id: LinkIconStyle; name: string }[] = [
  { id: "default", name: "Default" },
  { id: "rounded", name: "Rounded" },
  { id: "circle", name: "Circle" },
  { id: "pill", name: "Pill" },
  { id: "none", name: "Hidden" },
];

export const TOOLTIP_STYLES: { id: TooltipStyle; name: string }[] = [
  { id: "default", name: "Default" },
  { id: "glass", name: "Glass" },
  { id: "accent", name: "Accent" },
  { id: "dark", name: "Dark" },
  { id: "minimal", name: "Minimal" },
];

/** One-click looks for the whole link row. */
export const LINK_PRESETS: {
  id: string;
  name: string;
  hint: string;
  patch: Partial<LinkDesign>;
}[] = [
  {
    id: "cards",
    name: "Cards",
    hint: "Icon + label with a background",
    patch: { cardStyle: "filled", showBackground: true, iconOnly: false, showGlow: false, backgroundOpacity: 0.12 },
  },
  {
    id: "icons",
    name: "Icon only",
    hint: "Every link as an icon bubble",
    patch: { cardStyle: "filled", showBackground: true, iconOnly: true, iconStyle: "circle", showGlow: false },
  },
  {
    id: "bare-icons",
    name: "Icons, no background",
    hint: "Clean icons floating on the card",
    patch: { showBackground: false, iconOnly: true, iconStyle: "circle", showGlow: false },
  },
  {
    id: "glow-icons",
    name: "Glow + icon",
    hint: "Icon bubbles with a coloured halo",
    patch: { showBackground: true, iconOnly: true, iconStyle: "circle", showGlow: true },
  },
];

export const DISPLAY_MODES: { id: LinkDisplayMode; name: string }[] = [
  { id: "card", name: "Card" },
  { id: "icon", name: "Icon only" },
];

export const LINK_FOLDS: { id: LinkFold; name: string }[] = [
  { id: "", name: "Always visible" },
  { id: "hover", name: "Reveal on hover" },
];

/* ── helpers ───────────────────────────────────────────────── */

export function createLink(platformId: string): LinkInstance {
  const platform = getPlatform(platformId);
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `link-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    platform: platformId,
    label: platform?.name ?? "Link",
    url: "",
    tooltip: "",
    description: "",
    fold: "",
    mode: "card",
    visible: true,
    color: "",
    glowOn: false,
    glowColor: "",
    iconUrl: "",
  };
}

function clamp(v: unknown, fb: number, min: number, max: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
}
function hex(v: unknown, fb: string): string {
  return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : fb;
}
function bool(v: unknown, fb: boolean): boolean {
  return typeof v === "boolean" ? v : fb;
}
function str(v: unknown, fb: string, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : fb;
}
/** Colour field that may legitimately be "" (meaning "inherit"), otherwise
 *  must be a valid hex colour. */
function colorOrInherit(v: unknown, max = 7): string {
  if (typeof v !== "string" || !v) return "";
  return /^#[0-9a-f]{6}$/i.test(v) ? v.slice(0, max) : "";
}

/** Coerce anything (a saved document, a server payload) into a safe LinkStore. */
export function normalizeLinkStore(input: unknown): LinkStore {
  try {
    const parsed = (input ?? {}) as Partial<LinkStore>;
    const d = (parsed.design ?? {}) as Partial<LinkDesign>;
    const links = Array.isArray(parsed.links)
      ? parsed.links
          .filter((l): l is LinkInstance & { icon?: string } => Boolean(l && typeof l === "object" && typeof l.id === "string"))
          .map((l) => ({
            id: l.id,
            // Legacy stores keyed the platform under "icon" — carry it over.
            platform: str(l.platform, str(l.icon, "custom", 30), 30),
            label: str(l.label, "Link", 60),
            url: str(l.url, "", 500),
            tooltip: str(l.tooltip, "", 120),
            description: str(l.description, "", 160),
            fold: (["", "hover"] as const).includes(l.fold as LinkFold) ? (l.fold as LinkFold) : "",
            mode: (["card", "icon"] as const).includes(l.mode as LinkDisplayMode) ? (l.mode as LinkDisplayMode) : "card",
            visible: bool(l.visible, true),
            color: colorOrInherit(l.color),
            glowOn: bool(l.glowOn, false),
            glowColor: colorOrInherit(l.glowColor),
            iconUrl: typeof l.iconUrl === "string" ? l.iconUrl.slice(0, 400_000) : "",
          }))
      : [];
    return {
      links,
      design: {
        cardStyle: (["filled", "outline", "ghost", "glass", "glow"] as const).includes(d.cardStyle as LinkCardStyle) ? d.cardStyle as LinkCardStyle : DEFAULT_LINK_DESIGN.cardStyle,
        iconStyle: (["default", "rounded", "circle", "pill", "none"] as const).includes(d.iconStyle as LinkIconStyle) ? d.iconStyle as LinkIconStyle : DEFAULT_LINK_DESIGN.iconStyle,
        showBackground: bool(d.showBackground, DEFAULT_LINK_DESIGN.showBackground),
        showIcon: bool(d.showIcon, DEFAULT_LINK_DESIGN.showIcon),
        iconOnly: bool(d.iconOnly, DEFAULT_LINK_DESIGN.iconOnly),
        showGlow: bool(d.showGlow, DEFAULT_LINK_DESIGN.showGlow),
        glowColor: hex(d.glowColor, DEFAULT_LINK_DESIGN.glowColor),
        backgroundOpacity: clamp(
          d.backgroundOpacity,
          DEFAULT_LINK_DESIGN.backgroundOpacity,
          0,
          0.6,
        ),
        backgroundBlur: clamp(d.backgroundBlur, DEFAULT_LINK_DESIGN.backgroundBlur, 0, 24),
        borderRadius: clamp(d.borderRadius, DEFAULT_LINK_DESIGN.borderRadius, 0, 24),
        gap: clamp(d.gap, DEFAULT_LINK_DESIGN.gap, 4, 16),
        tooltipStyle: (["default", "glass", "accent", "dark", "minimal"] as const).includes(d.tooltipStyle as TooltipStyle) ? d.tooltipStyle as TooltipStyle : DEFAULT_LINK_DESIGN.tooltipStyle,
        tooltipEnabled: bool(d.tooltipEnabled, DEFAULT_LINK_DESIGN.tooltipEnabled),
      },
    };
  } catch {
    return { ...EMPTY_LINK_STORE, links: [], design: { ...DEFAULT_LINK_DESIGN } };
  }
}

export function loadLinkStore(userId: string): LinkStore {
  try {
    const raw = localStorage.getItem(`tourn.lol/links/v1/${userId}`);
    if (!raw) return { ...EMPTY_LINK_STORE, links: [], design: { ...DEFAULT_LINK_DESIGN } };
    return normalizeLinkStore(JSON.parse(raw));
  } catch {
    return { ...EMPTY_LINK_STORE, links: [], design: { ...DEFAULT_LINK_DESIGN } };
  }
}

export function saveLinkStore(userId: string, store: LinkStore): void {
  try {
    localStorage.setItem(`tourn.lol/links/v1/${userId}`, JSON.stringify(store));
  } catch { /* private mode */ }
}
