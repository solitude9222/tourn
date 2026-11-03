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
/** Where the profile view counter sits. */
export type ViewPosition = "top-right" | "footer" | "hidden";
/** Where the “joined” date sits. */
export type JoinPosition = "footer" | "under-name" | "hidden";
/** Where the location pill sits. */
export type LocationPosition = "top" | "under-name" | "footer" | "hidden";

/** Browser-tab behaviour for the public page. */
export type TabAnimation = "none" | "cycle" | "typewriter";

export type JoinDateFormat = "relative" | "us" | "eu";

export type AboutMetadata = {
  /** Custom tab title. Empty = the account's name + tourn.lol. */
  title: string;
  /** How the join date reads on the public page. */
  joinFormat?: JoinDateFormat;
  /** How dates are written across the dashboard. */
  dateFormat?: "us" | "eu";
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
  /** Solid backdrop painted behind the entry content. */
  background: string;
  /** Optional photo behind the entry content, over the solid colour. */
  backgroundImageUrl: string;
  /** 0–100 darkening over the backdrop so light text always reads. */
  dim: number;
  /** 0–100 corner darkening over the whole screen. */
  vignette: number;
  titleSize: number;
  subtitleSize: number;
  hintSize: number;
  imageSize: number;
  imageFit: "cover" | "contain";
  /** Small line under the subtitle — "click anywhere", etc. */
  hint: string;
  align: "center" | "top" | "bottom";
  /** Show the entry screen once per browser session instead of every visit. */
  oncePerSession: boolean;

  /* ── type ───────────────────────────────────────────────── */
  titleColor: string;
  subtitleColor: string;
  hintColor: string;
  /** Negative tightens the title, positive opens it up (em). */
  letterSpacing: number;

  /* ── layout ─────────────────────────────────────────────── */
  /** Gap between the image, title, subtitle and hint. */
  contentGap: number;
  /** Content width as a percentage of the screen. */
  contentWidth: number;
  /** Corner radius of the entry image. */
  imageRadius: number;
  /** Drop-shadow strength under the entry image, 0–100. */
  imageShadow: number;

  /* ── glass panel ────────────────────────────────────────── */
  panel: boolean;
  panelOpacity: number; // 0–100
  panelBlur: number; // px
  panelRadius: number; // px

  /** How long the click-to-enter animation runs, in milliseconds. */
  animationDuration: number;
};

export type ProfileColors = {
  accent: string;
  text: string;
  muted: string;
  background: string;
  card: string;
  border: string;
};

/** Surface styling for the small pills on a profile (location, views, join). */
export type PillStyle = {
  background: string;
  opacity: number;
  borderOpacity: number;
  radius: number;
  blur: number;
};

export const DEFAULT_PILL_STYLE: PillStyle = {
  background: "#ffffff",
  opacity: 0.05,
  borderOpacity: 0.1,
  radius: 999,
  blur: 6,
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
  viewPosition: ViewPosition;
  joinPosition: JoinPosition;
  locationPosition: LocationPosition;
  slideshow: SlideshowSettings;
  entry: EntrySettings;
  colors: ProfileColors;
  pills: PillStyle;
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
  accent: "#b4bffa",
  text: "#f4f6fb",
  muted: "#98a2b3",
  background: "#07070a",
  card: "#12141a",
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
  background: "#07070a",
  backgroundImageUrl: "",
  dim: 45,
  vignette: 0,
  titleSize: 22,
  subtitleSize: 11,
  hintSize: 10,
  imageSize: 82,
  imageFit: "cover",
  hint: "",
  align: "center",
  oncePerSession: false,
  titleColor: "#f4f6fb",
  subtitleColor: "#98a2b3",
  hintColor: "#8b93a1",
  letterSpacing: -0.04,
  contentGap: 10,
  contentWidth: 84,
  imageRadius: 20,
  imageShadow: 55,
  panel: false,
  panelOpacity: 34,
  panelBlur: 12,
  panelRadius: 22,
  animationDuration: 760,
};

export const DEFAULT_ABOUT_DESIGN: AboutDesign = {
  theme: "default",
  layout: "classic",
  cardStyle: "default",
  cardWidth: 643,
  cardRadius: 22,
  borderWidth: 0,
  borderOpacity: 0.1,
  backgroundOpacity: 0.08,
  backgroundBlur: 0,
  // A 72px avatar reads as a thumbnail on a 643px card — the profile picture is
  // the thing people look at first, so the default is large enough to see.
  avatarSize: 104,
  widgetGap: 12,
  cardPadding: 20,
  nameSize: 21,
  bioSize: 11.5,
  tilt: 0,
  tiltGlare: false,
  pfpPosition: "above",
  badgePosition: "default",
  namePosition: "center",
  bioPosition: "center",
  avatarShape: "circle",
  viewPosition: "top-right",
  joinPosition: "footer",
  locationPosition: "under-name",
  slideshow: DEFAULT_SLIDESHOW,
  entry: DEFAULT_ENTRY,
  colors: DEFAULT_PROFILE_COLORS,
  pills: DEFAULT_PILL_STYLE,
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

function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(raw)) return "#" + raw.split("").map((part) => part + part).join("");
  if (/^[0-9a-f]{8}$/.test(raw)) return "#" + raw.slice(0, 6);
  if (/^[0-9a-f]{6}$/.test(raw)) return "#" + raw;
  return null;
}

function validColor(value: unknown, fallback: string): string {
  return normalizeHexColor(value) ?? fallback;
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
const VIEW_POSITIONS: readonly ViewPosition[] = ["top-right", "footer", "hidden"];
const JOIN_POSITIONS: readonly JoinPosition[] = ["footer", "under-name", "hidden"];
const LOCATION_POSITIONS: readonly LocationPosition[] = ["top", "under-name", "footer", "hidden"];
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
    joinFormat: oneOf(raw.joinFormat, ["relative", "us", "eu"] as const, "relative"),
    dateFormat: raw.dateFormat === "eu" ? "eu" : "us",
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
    blur: numberIn(raw.blur, DEFAULT_ENTRY.blur, 0, 40),
    background: validColor(raw.background, DEFAULT_ENTRY.background),
    backgroundImageUrl: textIn(raw.backgroundImageUrl, DEFAULT_ENTRY.backgroundImageUrl, 2_500_000),
    dim: numberIn(raw.dim, DEFAULT_ENTRY.dim, 0, 100),
    vignette: numberIn(raw.vignette, DEFAULT_ENTRY.vignette, 0, 100),
    titleSize: numberIn(raw.titleSize, DEFAULT_ENTRY.titleSize, 12, 96),
    subtitleSize: numberIn(raw.subtitleSize, DEFAULT_ENTRY.subtitleSize, 8, 32),
    hintSize: numberIn(raw.hintSize, DEFAULT_ENTRY.hintSize, 8, 24),
    imageSize: numberIn(raw.imageSize, DEFAULT_ENTRY.imageSize, 32, 400),
    imageFit: raw.imageFit === "contain" ? "contain" : "cover",
    hint: textIn(raw.hint, DEFAULT_ENTRY.hint, 60),
    align:
      raw.align === "top" || raw.align === "bottom" ? raw.align : "center",
    oncePerSession: boolIn(raw.oncePerSession, DEFAULT_ENTRY.oncePerSession),
    titleColor: validColor(raw.titleColor, DEFAULT_ENTRY.titleColor),
    subtitleColor: validColor(raw.subtitleColor, DEFAULT_ENTRY.subtitleColor),
    hintColor: validColor(raw.hintColor, DEFAULT_ENTRY.hintColor),
    letterSpacing: numberIn(raw.letterSpacing, DEFAULT_ENTRY.letterSpacing, -0.12, 0.32),
    contentGap: numberIn(raw.contentGap, DEFAULT_ENTRY.contentGap, 0, 48),
    contentWidth: numberIn(raw.contentWidth, DEFAULT_ENTRY.contentWidth, 40, 100),
    imageRadius: numberIn(raw.imageRadius, DEFAULT_ENTRY.imageRadius, 0, 120),
    imageShadow: numberIn(raw.imageShadow, DEFAULT_ENTRY.imageShadow, 0, 100),
    panel: boolIn(raw.panel, DEFAULT_ENTRY.panel),
    panelOpacity: numberIn(raw.panelOpacity, DEFAULT_ENTRY.panelOpacity, 0, 100),
    panelBlur: numberIn(raw.panelBlur, DEFAULT_ENTRY.panelBlur, 0, 40),
    panelRadius: numberIn(raw.panelRadius, DEFAULT_ENTRY.panelRadius, 0, 48),
    animationDuration: numberIn(raw.animationDuration, DEFAULT_ENTRY.animationDuration, 200, 2000),
  };
}

function loadDesign(input: unknown): AboutDesign {
  const raw = (input ?? {}) as Partial<AboutDesign>;
  const rawColors = (raw.colors ?? {}) as Partial<ProfileColors>;
  const rawPills = (raw.pills ?? {}) as Partial<PillStyle>;
  const theme = raw.theme === "modern" || raw.theme === "portfolio" ? raw.theme : "default";
  const layout = raw.layout === "modern" ? "modern" : "classic";
  const cardStyle = CARD_STYLES.some((item) => item.id === raw.cardStyle)
    ? (raw.cardStyle as CardStyle)
    : DEFAULT_ABOUT_DESIGN.cardStyle;
  // Documents saved before the layout change have no viewPosition. They are
  // upgraded once so the new stacked layout applies without a manual reset.
  const legacyLayout = !("viewPosition" in raw);

  return {
    theme,
    layout,
    cardStyle,
    cardWidth: numberIn(raw.cardWidth, DEFAULT_ABOUT_DESIGN.cardWidth, 320, 1100),
    cardRadius: numberIn(raw.cardRadius, DEFAULT_ABOUT_DESIGN.cardRadius, 0, 72),
    borderWidth: legacyLayout
      ? DEFAULT_ABOUT_DESIGN.borderWidth
      : numberIn(raw.borderWidth, DEFAULT_ABOUT_DESIGN.borderWidth, 0, 12),
    borderOpacity: legacyLayout
      ? DEFAULT_ABOUT_DESIGN.borderOpacity
      : numberIn(raw.borderOpacity, DEFAULT_ABOUT_DESIGN.borderOpacity, 0, 1),
    backgroundOpacity: legacyLayout
      ? DEFAULT_ABOUT_DESIGN.backgroundOpacity
      : numberIn(raw.backgroundOpacity, DEFAULT_ABOUT_DESIGN.backgroundOpacity, 0, 1),
    backgroundBlur: numberIn(raw.backgroundBlur, DEFAULT_ABOUT_DESIGN.backgroundBlur, 0, 40),
    avatarSize: numberIn(raw.avatarSize, DEFAULT_ABOUT_DESIGN.avatarSize, 40, 200),
    widgetGap: numberIn(raw.widgetGap, DEFAULT_ABOUT_DESIGN.widgetGap, 0, 48),
    cardPadding: numberIn(raw.cardPadding, DEFAULT_ABOUT_DESIGN.cardPadding, 8, 64),
    nameSize: numberIn(raw.nameSize, DEFAULT_ABOUT_DESIGN.nameSize, 12, 48),
    bioSize: numberIn(raw.bioSize, DEFAULT_ABOUT_DESIGN.bioSize, 8, 24),
    tilt: numberIn(raw.tilt, DEFAULT_ABOUT_DESIGN.tilt, 0, 24),
    tiltGlare: boolIn(raw.tiltGlare, DEFAULT_ABOUT_DESIGN.tiltGlare),
    pfpPosition: legacyLayout
      ? DEFAULT_ABOUT_DESIGN.pfpPosition
      : oneOf(raw.pfpPosition, PFP_POSITIONS, DEFAULT_ABOUT_DESIGN.pfpPosition),
    badgePosition: legacyLayout
      ? DEFAULT_ABOUT_DESIGN.badgePosition
      : oneOf(raw.badgePosition, BADGE_POSITIONS, DEFAULT_ABOUT_DESIGN.badgePosition),
    namePosition: legacyLayout
      ? DEFAULT_ABOUT_DESIGN.namePosition
      : oneOf(raw.namePosition, TEXT_POSITIONS, DEFAULT_ABOUT_DESIGN.namePosition),
    bioPosition: legacyLayout
      ? DEFAULT_ABOUT_DESIGN.bioPosition
      : oneOf(raw.bioPosition, TEXT_POSITIONS, DEFAULT_ABOUT_DESIGN.bioPosition),
    avatarShape: legacyLayout
      ? DEFAULT_ABOUT_DESIGN.avatarShape
      : oneOf(raw.avatarShape, AVATAR_SHAPES, DEFAULT_ABOUT_DESIGN.avatarShape),
    viewPosition: oneOf(raw.viewPosition, VIEW_POSITIONS, DEFAULT_ABOUT_DESIGN.viewPosition),
    joinPosition: oneOf(raw.joinPosition, JOIN_POSITIONS, DEFAULT_ABOUT_DESIGN.joinPosition),
    locationPosition: oneOf(
      raw.locationPosition,
      LOCATION_POSITIONS,
      DEFAULT_ABOUT_DESIGN.locationPosition,
    ),
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
    pills: {
      background: validColor(rawPills.background, DEFAULT_PILL_STYLE.background),
      opacity: numberIn(rawPills.opacity, DEFAULT_PILL_STYLE.opacity, 0, 1),
      borderOpacity: numberIn(rawPills.borderOpacity, DEFAULT_PILL_STYLE.borderOpacity, 0, 1),
      radius: numberIn(rawPills.radius, DEFAULT_PILL_STYLE.radius, 0, 999),
      blur: numberIn(rawPills.blur, DEFAULT_PILL_STYLE.blur, 0, 30),
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
