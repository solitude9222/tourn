import { DEFAULT_PROFILE_ASSETS, loadProfileAssets, type ProfileAssets } from "./profileAssets";

export type AboutTheme = "default" | "modern" | "portfolio";
export type AboutLayout = "classic" | "modern";

/** The public "linker" page layout. */
export type CardStyle = "default" | "banner" | "compact" | "minimal" | "slideshow";

/** Where the avatar sits in the card's top row. */
export type PfpPosition = "default" | "center" | "top-right" | "left" | "right" | "above";
/** Where the badge row renders. */
export type BadgePosition = "default" | "above-name" | "top-right" | "bottom" | "beside-avatar" | "hidden";
/** Alignment shared by the display name and bio. */
export type TextAlignPosition = "default" | "center" | "left" | "right";
export type AvatarShape = "circle" | "rounded" | "square" | "hexagon";

/** Browser-tab behaviour for the public page. */
export type TabAnimation = "none" | "cycle" | "typewriter";

export type AboutMetadata = {
  /** Custom tab title. Empty = the account's name + tourn.lol. */
  title: string;
  /** Custom favicon. Empty = the account's profile picture. */
  faviconUrl: string;
  animation: TabAnimation;
  /** Titles cycled in the tab, one per entry. */
  messages: string[];
  /** Seconds each title stays up. */
  interval: number;
};

export type EntryAnimation = "split" | "bottom-right" | "top-left" | "fade" | "zoom";

export type SlideshowSettings = {
  smooth: boolean;
  indicator: boolean;
  sideNav: boolean;
  speed: number;
};

export type EntrySettings = {
  enabled: boolean;
  title: string;
  subtitle: string;
  imageUrl: string;
  animation: EntryAnimation;
  blur: number;
};

export type ProfileColors = {
  accent: string;
  text: string;
  muted: string;
  background: string;
  card: string;
  border: string;
};

export type AboutDesign = {
  theme: AboutTheme;
  layout: AboutLayout;
  cardStyle: CardStyle;
  cardWidth: number;
  cardRadius: number;
  borderWidth: number;
  borderOpacity: number;
  backgroundOpacity: number;
  backgroundBlur: number;
  avatarSize: number;
  widgetGap: number;
  cardPadding: number;
  nameSize: number;
  bioSize: number;
  /** Pointer tilt strength in degrees (0 = off). */
  tilt: number;
  /** Retained for saved documents; the pointer glare is no longer rendered. */
  tiltGlare: boolean;
  pfpPosition: PfpPosition;
  badgePosition: BadgePosition;
  namePosition: TextAlignPosition;
  bioPosition: TextAlignPosition;
  avatarShape: AvatarShape;
  slideshow: SlideshowSettings;
  entry: EntrySettings;
  colors: ProfileColors;
  /** Avatar position offset from default */
  avatarX?: number;
  avatarY?: number;
  /** Badge row position offset */
  badgeX?: number;
  badgeY?: number;
};

export type About = {
  displayName: string;
  bio: string;
  location: string;
  metadata: AboutMetadata;
  design: AboutDesign;
  assets: ProfileAssets;
};

export const DEFAULT_METADATA: AboutMetadata = {
  title: "",
  faviconUrl: "",
  animation: "none",
  messages: [],
  interval: 6,
};

export const MAX_BIO_LENGTH = 800;

export const DEFAULT_PROFILE_COLORS: ProfileColors = {
  accent: "#ffcfa8",
  text: "#f3f7fa",
  muted: "#98a3ad",
  background: "#0b0d10",
  card: "#12161b",
  border: "#ffffff",
};

export const DEFAULT_SLIDESHOW: SlideshowSettings = {
  smooth: true,
  indicator: true,
  sideNav: true,
  speed: 650,
};

export const DEFAULT_ENTRY: EntrySettings = {
  enabled: false,
  title: "",
  subtitle: "",
  imageUrl: "",
  animation: "split",
  blur: 8,
};

export const DEFAULT_ABOUT_DESIGN: AboutDesign = {
  theme: "default",
  layout: "classic",
  cardStyle: "default",
  cardWidth: 420,
  cardRadius: 22,
  borderWidth: 1,
  borderOpacity: 0.14,
  backgroundOpacity: 0.94,
  backgroundBlur: 0,
  avatarSize: 72,
  widgetGap: 12,
  cardPadding: 20,
  nameSize: 21,
  bioSize: 11.5,
  tilt: 0,
  tiltGlare: false,
  pfpPosition: "default",
  badgePosition: "default",
  namePosition: "default",
  bioPosition: "default",
  avatarShape: "circle",
  slideshow: DEFAULT_SLIDESHOW,
  entry: DEFAULT_ENTRY,
  colors: DEFAULT_PROFILE_COLORS,
};

export const EMPTY_ABOUT: About = {
  displayName: "",
  bio: "",
  location: "",
  metadata: DEFAULT_METADATA,
  design: DEFAULT_ABOUT_DESIGN,
  assets: DEFAULT_PROFILE_ASSETS,
};

export const CARD_STYLES: { id: CardStyle; name: string; description: string }[] = [
  { id: "default", name: "Default", description: "One centered card with your bio and widgets." },
  { id: "banner", name: "Banner", description: "A wide image strip behind your avatar." },
  { id: "compact", name: "Compact", description: "Tighter spacing for short, quick profiles." },
  { id: "minimal", name: "Minimal", description: "No card surface — just your content." },
  { id: "slideshow", name: "Slideshow", description: "Full-height sections with smooth scrolling." },
];

export const ENTRY_ANIMATIONS: { id: EntryAnimation; name: string }[] = [
  { id: "split", name: "Split apart" },
  { id: "bottom-right", name: "From bottom right" },
  { id: "top-left", name: "From top left" },
  { id: "fade", name: "Fade in" },
  { id: "zoom", name: "Zoom in" },
];

function numberIn(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function validColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function boolIn(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function textIn(value: unknown, fallback: string, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

const PFP_POSITIONS: readonly PfpPosition[] = ["default", "center", "top-right", "left", "right", "above"];
const BADGE_POSITIONS: readonly BadgePosition[] = [
  "default",
  "above-name",
  "top-right",
  "bottom",
  "beside-avatar",
  "hidden",
];
const TEXT_POSITIONS: readonly TextAlignPosition[] = ["default", "center", "left", "right"];
const AVATAR_SHAPES: readonly AvatarShape[] = ["circle", "rounded", "square", "hexagon"];
const TAB_ANIMATIONS: readonly TabAnimation[] = ["none", "cycle", "typewriter"];

function loadMetadata(input: unknown): AboutMetadata {
  const raw = (input ?? {}) as Partial<AboutMetadata>;
  const messages = Array.isArray(raw.messages)
    ? raw.messages
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.slice(0, 60).trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];
  return {
    title: textIn(raw.title, DEFAULT_METADATA.title, 60),
    faviconUrl: textIn(raw.faviconUrl, DEFAULT_METADATA.faviconUrl, 250_000),
    animation: oneOf(raw.animation, TAB_ANIMATIONS, DEFAULT_METADATA.animation),
    messages,
    interval: numberIn(raw.interval, DEFAULT_METADATA.interval, 2, 30),
  };
}

function loadSlideshow(input: unknown): SlideshowSettings {
  const raw = (input ?? {}) as Partial<SlideshowSettings>;
  return {
    smooth: boolIn(raw.smooth, DEFAULT_SLIDESHOW.smooth),
    indicator: boolIn(raw.indicator, DEFAULT_SLIDESHOW.indicator),
    sideNav: boolIn(raw.sideNav, DEFAULT_SLIDESHOW.sideNav),
    speed: numberIn(raw.speed, DEFAULT_SLIDESHOW.speed, 250, 1400),
  };
}

function loadEntry(input: unknown): EntrySettings {
  const raw = (input ?? {}) as Partial<EntrySettings>;
  const animation = ENTRY_ANIMATIONS.some((item) => item.id === raw.animation)
    ? (raw.animation as EntryAnimation)
    : DEFAULT_ENTRY.animation;
  return {
    enabled: boolIn(raw.enabled, DEFAULT_ENTRY.enabled),
    title: textIn(raw.title, DEFAULT_ENTRY.title, 48),
    subtitle: textIn(raw.subtitle, DEFAULT_ENTRY.subtitle, 96),
    imageUrl: textIn(raw.imageUrl, DEFAULT_ENTRY.imageUrl, 2_500_000),
    animation,
    blur: numberIn(raw.blur, DEFAULT_ENTRY.blur, 0, 24),
  };
}

function loadDesign(input: unknown): AboutDesign {
  const raw = (input ?? {}) as Partial<AboutDesign>;
  const rawColors = (raw.colors ?? {}) as Partial<ProfileColors>;
  const theme = raw.theme === "modern" || raw.theme === "portfolio" ? raw.theme : "default";
  const layout = raw.layout === "modern" ? "modern" : "classic";
  const cardStyle = CARD_STYLES.some((item) => item.id === raw.cardStyle)
    ? (raw.cardStyle as CardStyle)
    : DEFAULT_ABOUT_DESIGN.cardStyle;

  return {
    theme,
    layout,
    cardStyle,
    cardWidth: numberIn(raw.cardWidth, DEFAULT_ABOUT_DESIGN.cardWidth, 320, 900),
    cardRadius: numberIn(raw.cardRadius, DEFAULT_ABOUT_DESIGN.cardRadius, 0, 36),
    borderWidth: numberIn(raw.borderWidth, DEFAULT_ABOUT_DESIGN.borderWidth, 0, 6),
    borderOpacity: numberIn(raw.borderOpacity, DEFAULT_ABOUT_DESIGN.borderOpacity, 0, 1),
    backgroundOpacity: numberIn(
      raw.backgroundOpacity,
      DEFAULT_ABOUT_DESIGN.backgroundOpacity,
      0.2,
      1,
    ),
    backgroundBlur: numberIn(raw.backgroundBlur, DEFAULT_ABOUT_DESIGN.backgroundBlur, 0, 30),
    avatarSize: numberIn(raw.avatarSize, DEFAULT_ABOUT_DESIGN.avatarSize, 44, 132),
    widgetGap: numberIn(raw.widgetGap, DEFAULT_ABOUT_DESIGN.widgetGap, 4, 28),
    cardPadding: numberIn(raw.cardPadding, DEFAULT_ABOUT_DESIGN.cardPadding, 12, 40),
    nameSize: numberIn(raw.nameSize, DEFAULT_ABOUT_DESIGN.nameSize, 16, 34),
    bioSize: numberIn(raw.bioSize, DEFAULT_ABOUT_DESIGN.bioSize, 9, 16),
    tilt: numberIn(raw.tilt, DEFAULT_ABOUT_DESIGN.tilt, 0, 16),
    tiltGlare: boolIn(raw.tiltGlare, DEFAULT_ABOUT_DESIGN.tiltGlare),
    pfpPosition: oneOf(raw.pfpPosition, PFP_POSITIONS, DEFAULT_ABOUT_DESIGN.pfpPosition),
    badgePosition: oneOf(raw.badgePosition, BADGE_POSITIONS, DEFAULT_ABOUT_DESIGN.badgePosition),
    namePosition: oneOf(raw.namePosition, TEXT_POSITIONS, DEFAULT_ABOUT_DESIGN.namePosition),
    bioPosition: oneOf(raw.bioPosition, TEXT_POSITIONS, DEFAULT_ABOUT_DESIGN.bioPosition),
    avatarShape: oneOf(raw.avatarShape, AVATAR_SHAPES, DEFAULT_ABOUT_DESIGN.avatarShape),
    slideshow: loadSlideshow(raw.slideshow),
    entry: loadEntry(raw.entry),
    colors: {
      accent: validColor(rawColors.accent, DEFAULT_PROFILE_COLORS.accent),
      text: validColor(rawColors.text, DEFAULT_PROFILE_COLORS.text),
      muted: validColor(rawColors.muted, DEFAULT_PROFILE_COLORS.muted),
      background: validColor(rawColors.background, DEFAULT_PROFILE_COLORS.background),
      card: validColor(rawColors.card, DEFAULT_PROFILE_COLORS.card),
      border: validColor(rawColors.border, DEFAULT_PROFILE_COLORS.border),
    },
  };
}

/** Public-profile details are per account and stay in this browser without Supabase. */
function storageKey(userId: string): string {
  return `tourn.lol/about/v1/${userId}`;
}

/** Coerce anything (a saved document, a server payload) into a safe About. */
export function normalizeAbout(input: unknown): About {
  const parsed = (input ?? {}) as Partial<About>;
  if (!parsed || typeof parsed !== "object") {
    return { ...EMPTY_ABOUT, design: loadDesign(null) };
  }
  return {
    displayName: String(parsed.displayName ?? "").trim().slice(0, 32),
    bio: String(parsed.bio ?? "").slice(0, MAX_BIO_LENGTH),
    location: String(parsed.location ?? "").trim().slice(0, 64),
    metadata: loadMetadata(parsed.metadata),
    design: loadDesign(parsed.design),
    assets: loadProfileAssets(parsed.assets),
  };
}

export function loadAbout(userId: string): About {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...EMPTY_ABOUT, design: loadDesign(null) };
    return normalizeAbout(JSON.parse(raw));
  } catch {
    return { ...EMPTY_ABOUT, design: loadDesign(null) };
  }
}

export function saveAbout(userId: string, about: About): void {
  try {
    localStorage.setItem(
      storageKey(userId),
      JSON.stringify({
        ...about,
        bio: about.bio.slice(0, MAX_BIO_LENGTH),
        design: loadDesign(about.design),
        assets: loadProfileAssets(about.assets),
      }),
    );
  } catch {
    /* private mode — the page still reflects the change for this session */
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#ffffff";
  const value = Number.parseInt(safe.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`;
}
