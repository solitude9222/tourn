/* ---------------------------------------------------------------------------
   Links system.

   A profile's links are a row of tappable icons — nothing else. There are no
   cards, backgrounds, labels or hover popups: the icon *is* the link. The only
   things an owner can style are the icon colour, its size, and an optional
   glow (colour + intensity).
   --------------------------------------------------------------------------- */
import { getPlatform } from "./linkPlatforms";

/** Tooltip skins — used by the avatar/badge tooltips, never by links. */
export type TooltipStyle = "default" | "glass" | "accent" | "dark" | "minimal";

export type LinkInstance = {
  id: string;
  /** Platform id from linkPlatforms.ts ("website" / "email" / "custom" included). */
  platform: string;
  label: string;
  url: string;
  visible: boolean;
  /** Custom uploaded icon (data URL) — "" = use the platform's brand icon. */
  iconUrl: string;
};

export type LinkDesign = {
  /** Icon colour — "" = each platform's own brand colour. */
  iconColor: string;
  /** Optional halo behind the icons. */
  glow: boolean;
  glowColor: string;
  /** 0–100 */
  glowIntensity: number;
  /** Icon button size in px. */
  iconSize: number;
};

export type LinkStore = {
  links: LinkInstance[];
  design: LinkDesign;
};

export const DEFAULT_LINK_DESIGN: LinkDesign = {
  iconColor: "",
  glow: false,
  glowColor: "#b4bffa",
  glowIntensity: 45,
  // Sized for the reference card: 40px icons on a 726px-wide card.
  iconSize: 40,
};

export const ICON_SIZES = { min: 22, max: 56 } as const;

export const EMPTY_LINK_STORE: LinkStore = {
  links: [],
  design: { ...DEFAULT_LINK_DESIGN },
};

/* ── helpers ───────────────────────────────────────────────── */

/**
 * Turn whatever someone typed into a URL that actually navigates.
 *
 * People paste `github.com/me`, `@handle`, an email, or a crypto wallet
 * address. Only the first two can become a link; a bare address/handle returns
 * "" so the icon can copy it instead of opening a broken relative URL.
 */
export function linkHref(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$|[?#])/i.test(value)) return `https://${value}`;
  return "";
}

export function createLink(platformId: string): LinkInstance {
  const platform = getPlatform(platformId);
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `link-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    platform: platformId,
    label: platform?.name ?? "Link",
    url: "",
    visible: true,
    iconUrl: "",
  };
}

function clamp(v: unknown, fb: number, min: number, max: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
}
function str(v: unknown, fb: string, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : fb;
}
function bool(v: unknown, fb: boolean): boolean {
  return typeof v === "boolean" ? v : fb;
}
/** Colour field that may legitimately be "" (meaning "inherit"). */
function colorOrInherit(v: unknown): string {
  if (typeof v !== "string" || !v) return "";
  return /^#[0-9a-f]{6}$/i.test(v) ? v : "";
}

/** Coerce anything (a saved document, a server payload) into a safe LinkStore. */
export function normalizeLinkStore(input: unknown): LinkStore {
  try {
    const parsed = (input ?? {}) as Partial<LinkStore> & { design?: Record<string, unknown> };
    const d = (parsed.design ?? {}) as Record<string, unknown>;
    const links: LinkInstance[] = Array.isArray(parsed.links)
      ? parsed.links
          .filter((l): l is LinkInstance & { icon?: string } =>
            Boolean(l && typeof l === "object" && typeof l.id === "string"),
          )
          .map((l) => ({
            id: l.id,
            // Legacy stores keyed the platform under "icon" — carry it over.
            platform: str(l.platform, str(l.icon, "custom", 30), 30),
            label: str(l.label, "Link", 60),
            url: str(l.url, "", 500),
            visible: bool(l.visible, true),
            iconUrl: typeof l.iconUrl === "string" ? l.iconUrl.slice(0, 400_000) : "",
          }))
      : [];
    return {
      links,
      design: {
        iconColor: colorOrInherit(d.iconColor),
        // Older documents called this "showGlow"; both meant the same thing.
        glow: bool(d.glow, bool(d.showGlow, DEFAULT_LINK_DESIGN.glow)),
        glowColor:
          colorOrInherit(d.glowColor) || DEFAULT_LINK_DESIGN.glowColor,
        glowIntensity: clamp(d.glowIntensity, DEFAULT_LINK_DESIGN.glowIntensity, 0, 100),
        iconSize: clamp(d.iconSize, DEFAULT_LINK_DESIGN.iconSize, ICON_SIZES.min, ICON_SIZES.max),
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
  } catch {
    /* private mode */
  }
}
