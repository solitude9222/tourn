import { DEFAULT_PROFILE_ASSETS, loadProfileAssets, type ProfileAssets } from "./profileAssets";
import type { TooltipAnimation, TooltipStyle } from "./links";

export type AboutTheme = "default" | "modern" | "portfolio";
/** The page layout: how the card, the widgets and the links are arranged.
 *  `stacked` is one column, `left` pins the card left with widgets beside it,
 *  `centered` is a single narrow column centred on the page. */
export type AboutLayout = "stacked" | "left" | "centered";

/** The public "linker" page layout. Each one only changes spacing and how
 *  large the widgets sit — never the card's colour, background or blur. */
export type CardStyle = "default" | "compact" | "minimal" | "slide";

/** Where the avatar sits in the card's top row. */
export type PfpPosition = "default" | "center" | "top-right" | "left" | "right" | "above";
/** Where the badge row renders. */
export type BadgePosition = "default" | "above-name" | "top-right" | "bottom" | "beside-avatar" | "hidden";
/** Alignment shared by the display name and bio. */
export type TextAlignPosition = "default" | "center" | "left" | "right";
export type AvatarShape = "circle" | "rounded" | "square" | "hexagon";
/** Every place a piece of card metadata can sit. The legacy values keep old
 *  documents working; the inside/outside values give the card real corners. */
export type MetadataPosition =
  | "top"
  | "top-right"
  | "under-name"
  | "footer"
  | "side"
  | "hidden"
  | "outside-top-left"
  | "outside-top-right"
  | "outside-bottom-left"
  | "outside-bottom-right"
  | "outside-above"
  | "outside-below"
  | "outside-left"
  | "outside-right"
  | "outside-below-left"
  | "inside-top-left"
  | "inside-top-right"
  | "inside-bottom-left"
  | "inside-bottom-right"
  | "next-to-name"
  | "next-to-handle"
  | "beside-avatar"
  | "above-name"
  | "below-bio";
/** Where the profile view counter sits. */
export type ViewPosition = MetadataPosition;
/** Where the “joined” date sits. */
export type JoinPosition = MetadataPosition;
/** Where the location pill sits. */
export type LocationPosition = MetadataPosition;
/** Where the widget cards sit relative to the profile card. */
export type WidgetsPosition = "auto" | "inside" | "below";

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

export type EntryAnimation = "split" | "bottom-right" | "top-left" | "fade" | "zoom" | "blur" | "rise" | "wipe";
export type EntryImageMode = "inline" | "background";
export type EntryLayer = "text" | "image" | "background";

export type EntrySettings = {
  enabled: boolean;
  title: string;
  subtitle: string;
  imageUrl: string;
  animation: EntryAnimation;
  /** Which entry-screen layers take part in the exit animation. */
  layers: EntryLayer[];
  blur: number;
  /** Solid backdrop painted behind the entry content. */
  background: string;
  /** Optional photo behind the entry content, over the solid colour. */
  backgroundImageUrl: string;
  /** Inline keeps the small image; background makes the entry image full-bleed. */
  imageMode: EntryImageMode;
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

  /** Divider drawn under the entry copy. */
  divider: boolean;
  dividerColor: string;
  /** Divider length as a percentage of the entry content width. */
  dividerWidth: number;
  /** Divider thickness in pixels. */
  dividerSize: number;
  /** Divider opacity, 0–1. */
  dividerOpacity: number;

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

/** One styled surface: a container or a pill inside a profile section. */
export type ContainerStyle = {
  background: string;
  border: string;
  backgroundOpacity: number;
  borderOpacity: number;
  borderWidth: number;
  blur: number;
  radius: number;
};

export type SurfacePill = ContainerStyle & { text: string };

/** Per-surface design for the About block and the project cards. */
export type SurfaceStyles = {
  about: { container: ContainerStyle; pill: SurfacePill };
  project: { container: ContainerStyle; pill: SurfacePill };
};

export const DEFAULT_CONTAINER_STYLE: ContainerStyle = {
  background: "#111111",
  border: "#ffffff",
  backgroundOpacity: 0.72,
  borderOpacity: 0.12,
  borderWidth: 2,
  blur: 14,
  radius: 24,
};

export const DEFAULT_SURFACE_PILL: SurfacePill = {
  background: "#ffffff",
  border: "#ffffff",
  text: "#ffffff",
  backgroundOpacity: 0.08,
  borderOpacity: 0.12,
  borderWidth: 2,
  blur: 14,
  radius: 999,
};

export const DEFAULT_SURFACES: SurfaceStyles = {
  about: { container: DEFAULT_CONTAINER_STYLE, pill: DEFAULT_SURFACE_PILL },
  project: { container: DEFAULT_CONTAINER_STYLE, pill: DEFAULT_SURFACE_PILL },
};

/** Hover tooltip shown on the avatar and badges (links never show one). */
export type TooltipSettings = {
  enabled: boolean;
  style: TooltipStyle;
  /** Entrance motion: rise, blur up, or pop in place. */
  animation: TooltipAnimation;
};

export const DEFAULT_PILL_STYLE: PillStyle = {
  background: "#ffffff",
  opacity: 0.05,
  borderOpacity: 0.1,
  radius: 999,
  blur: 6,
};

/** Sections are just two things now: work you built, and things you like. */
export type ProfileSectionKind = "project" | "interest";

/** A named link inside a project/media section. */
export type ProfileSectionLink = { label: string; url: string };

/** One pick inside an Interests section: several animes can share a section. */
export type SectionPick = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  meta: string;
  url: string;
};

export type ProfileSection = {
  id: string;
  title: string;
  text: string;
  image: string;
  url: string;
  kind: ProfileSectionKind;
  /** One-line description under the title. */
  subtitle: string;
  /** Small status pill: Live, In progress, Archived, Finished… */
  status: string;
  /** Tech stack ids from lib/techStack. */
  stack: string[];
  /** Interests only: every anime picked into this section. */
  items: SectionPick[];
  /** Extra links shown beside the main one. */
  links: ProfileSectionLink[];
  /** Year, score, genre or other short metadata. */
  meta: string;
};

export function createProfileSection(kind: ProfileSectionKind = "project"): ProfileSection {
  const id = globalThis.crypto?.randomUUID?.() ?? `section-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { id, title: "", text: "", image: "", url: "", kind, subtitle: "", status: "", stack: [], links: [], meta: "", items: [] };
}

export type AboutDesign = {
  sections: ProfileSection[];
  sectionsEnabled?: boolean;
  slideshow?: boolean;
  /** Extra slideshow pages: links, badges and the bio on their own screens. */
  slideshowLinks?: boolean;
  slideshowBadges?: boolean;
  slideshowAbout?: boolean;
  /** Glow around the location, view and join details. */
  metaGlowColor?: string;
  metaGlowStrength?: number;
  /** The "About me" slideshow page: its own copy and speciality tags. */
  aboutSlide: { title: string; subtitle: string; text: string; tags: string[]; showProjects?: boolean };
  /** Off keeps each layout's own detail positions and hides position controls. */
  advancedLayout?: boolean;
  /** How the view counter reads. */
  viewStyle?: "icon" | "text" | "number";
  /** Location / views / joined: quiet text with a divider (plain) or boxed chips (pill). */
  metaStyle?: "plain" | "pill";
  skills?: string[];
  audioPosition: "auto" | "inside" | "below" | "side" | "popup" | "fixed-bottom" | "hidden";
  widgetsPosition: WidgetsPosition;
  customFontUrl: string;
  theme: AboutTheme;
  layout: AboutLayout;
  cardStyle: CardStyle;
  /** Card font family — kept for saved documents only; the card always uses
   *  the site font (Lexend) now. */
  font: string;
  /** Sizing revision. Documents without it are lifted to the current
   *  reference card once, then keep whatever the owner sets afterwards. */
  version?: number;
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
  stackTilt: boolean;
  /** Tilt the widget cards and the audio player along with the card. */
  widgetTilt?: boolean;
  /** Reverse the tilt direction. */
  tiltInvert?: boolean;
  /** A small cat that follows the pointer around the card. */
  oneko?: boolean;
  /** Avatar position offset from default */
  avatarX?: number;
  avatarY?: number;
  /** Badge row position offset */
  badgeX?: number;
  badgeY?: number;
  /** Avatar / badge hover tooltips. */
  tooltips: TooltipSettings;
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
  entry: EntrySettings;
  colors: ProfileColors;
  pills: PillStyle;
  /** About block and project card surfaces, each with its own pill style. */
  surfaces: SurfaceStyles;
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
  accent: "#ff9d98",
  text: "#f4f6fb",
  muted: "#98a2b3",
  background: "#07070a",
  card: "#14141e",
  border: "#ffffff",
};

export const DEFAULT_ENTRY: EntrySettings = {
  enabled: false,
  title: "",
  subtitle: "",
  imageUrl: "",
  animation: "split",
  layers: ["text", "image", "background"],
  blur: 8,
  background: "#07070a",
  backgroundImageUrl: "",
  imageMode: "background",
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
  divider: false,
  dividerColor: "#ffffff",
  dividerWidth: 42,
  dividerSize: 1,
  dividerOpacity: 0.4,
  animationDuration: 760,
};

export const DEFAULT_ABOUT_DESIGN: AboutDesign = {
  sections: [],
  aboutSlide: { title: "About me", subtitle: "", text: "", tags: [], showProjects: false },
  audioPosition: "auto",
  widgetsPosition: "auto",
  customFontUrl: "",
  theme: "default",
  layout: "stacked",
  cardStyle: "default",
  font: "",
  version: 2,
  // The reference card is 720px wide: 32px padding, a 24px radius, a 120px
  // avatar, a 36px name and a 20px bio, with a dark glass surface (55% fill,
  // 12px blur) and a 1px border at 12%. Every other metric is scaled from the
  // card's width, so these are "px at 720 wide".
  cardWidth: 620,
  cardRadius: 35,
  borderWidth: 1,
  borderOpacity: 0.12,
  backgroundOpacity: 0.55,
  backgroundBlur: 12,
  avatarSize: 112,
  widgetGap: 10,
  cardPadding: 22,
  nameSize: 30,
  bioSize: 16,
  tilt: 0,
  stackTilt: false,
  widgetTilt: false,
  tiltGlare: false,
  pfpPosition: "above",
  badgePosition: "default",
  namePosition: "center",
  bioPosition: "center",
  avatarShape: "circle",
  advancedLayout: false,
  viewStyle: "icon",
  metaStyle: "plain",
  viewPosition: "outside-below-left",
  joinPosition: "under-name",
  locationPosition: "outside-below-left",
  entry: DEFAULT_ENTRY,
  colors: DEFAULT_PROFILE_COLORS,
  pills: DEFAULT_PILL_STYLE,
  surfaces: DEFAULT_SURFACES,
  tooltips: { enabled: true, style: "default", animation: "slide" },
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
  { id: "default", name: "Default", description: "Full-size card with roomy spacing." },
  { id: "compact", name: "Compact", description: "Half-width card; widgets sit two across, with every detail kept." },
  { id: "minimal", name: "Minimal", description: "Smallest widgets, no extra chrome." },
  { id: "slide", name: "Slideshow", description: "Card first, then one snapped screen per section." },
];

export const ENTRY_ANIMATIONS: { id: EntryAnimation; name: string }[] = [
  { id: "split", name: "Split apart" },
  { id: "bottom-right", name: "From bottom right" },
  { id: "top-left", name: "From top left" },
  { id: "fade", name: "Fade in" },
  { id: "zoom", name: "Zoom in" },
  { id: "blur", name: "Blur away" },
  { id: "rise", name: "Rise up" },
  { id: "wipe", name: "Wipe up" },
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
const METADATA_POSITIONS: readonly MetadataPosition[] = [
  "top",
  "top-right",
  "under-name",
  "footer",
  "side",
  "hidden",
  "outside-top-left",
  "outside-top-right",
  "outside-bottom-left",
  "outside-bottom-right",
  "outside-above",
  "outside-below",
  "outside-left",
  "outside-right",
  "outside-below-left",
  "inside-top-left",
  "inside-top-right",
  "inside-bottom-left",
  "inside-bottom-right",
  "next-to-name",
  "next-to-handle",
  "beside-avatar",
  "above-name",
  "below-bio",
];
const VIEW_POSITIONS = METADATA_POSITIONS;

/** Outside slots belong to links, not to the card's own details. Older
 *  profiles can still hold one, so map it back inside the card. */
export function insideMetadata(position: MetadataPosition): MetadataPosition {
  // The one outside slot that is still used sits below the card, not on its edge.
  if (position === "outside-below-left") return position;
  switch (position) {
    case "outside-top-left":
    case "outside-left":
      return "inside-top-left";
    case "outside-top-right":
    case "outside-above":
      return "inside-top-right";
    case "outside-bottom-left":
      return "inside-bottom-left";
    case "outside-bottom-right":
    case "outside-below":
    case "outside-right":
      return "inside-bottom-right";
    default:
      return position;
  }
}

/** The detail positions every layout uses until advanced positioning is on. */
export function defaultMetadata(layout: AboutLayout): {
  locationPosition: MetadataPosition;
  viewPosition: MetadataPosition;
  joinPosition: MetadataPosition;
} {
  if (layout === "centered") {
    return {
      locationPosition: "inside-bottom-left",
      viewPosition: "inside-bottom-right",
      joinPosition: "under-name",
    };
  }
  return {
    locationPosition: "outside-below-left",
    viewPosition: "outside-below-left",
    joinPosition: "under-name",
  };
}
const JOIN_POSITIONS = METADATA_POSITIONS;
const LOCATION_POSITIONS = METADATA_POSITIONS;
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

function loadEntry(input: unknown): EntrySettings {
  const raw = (input ?? {}) as Partial<EntrySettings>;
  const animation = ENTRY_ANIMATIONS.some((item) => item.id === raw.animation)
    ? (raw.animation as EntryAnimation)
    : DEFAULT_ENTRY.animation;
  const layerChoices: EntryLayer[] = ["text", "image", "background"];
  const layers = Array.isArray(raw.layers)
    ? layerChoices.filter((layer) => raw.layers!.includes(layer))
    : DEFAULT_ENTRY.layers;
  return {
    enabled: boolIn(raw.enabled, DEFAULT_ENTRY.enabled),
    title: textIn(raw.title, DEFAULT_ENTRY.title, 48),
    subtitle: textIn(raw.subtitle, DEFAULT_ENTRY.subtitle, 96),
    imageUrl: textIn(raw.imageUrl, DEFAULT_ENTRY.imageUrl, 2_500_000),
    animation,
    layers,
    blur: numberIn(raw.blur, DEFAULT_ENTRY.blur, 0, 40),
    background: validColor(raw.background, DEFAULT_ENTRY.background),
    backgroundImageUrl: textIn(raw.backgroundImageUrl, DEFAULT_ENTRY.backgroundImageUrl, 2_500_000),
    imageMode: raw.imageMode === "background" ? "background" : "inline",
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
    divider: boolIn(raw.divider, DEFAULT_ENTRY.divider),
    dividerColor: validColor(raw.dividerColor, DEFAULT_ENTRY.dividerColor),
    dividerWidth: numberIn(raw.dividerWidth, DEFAULT_ENTRY.dividerWidth, 10, 100),
    dividerSize: numberIn(raw.dividerSize, DEFAULT_ENTRY.dividerSize, 1, 8),
    dividerOpacity: numberIn(raw.dividerOpacity, DEFAULT_ENTRY.dividerOpacity, 0, 1),
    animationDuration: numberIn(raw.animationDuration, DEFAULT_ENTRY.animationDuration, 200, 2000),
  };
}

/* Cards whose geometry was never touched still carry the old defaults, so they
   move onto the reference measurements (620×272, 35px radius, 112px avatar).
   Anyone who changed a size keeps exactly what they chose. */
function loadDesign(input: unknown): AboutDesign {
  const design = loadDesignRaw(input);
  if (
    design.cardWidth === 720 &&
    design.cardRadius === 24 &&
    design.avatarSize === 120 &&
    design.cardPadding === 32 &&
    design.nameSize === 36
  ) {
    design.cardWidth = 620;
    design.cardRadius = 35;
    design.avatarSize = 112;
    design.cardPadding = 22;
    design.nameSize = 30;
    design.bioSize = 16;
  }
  return design;
}

// Saved surfaces are merged field by field, so a document from before this
// setting existed still gets the defaults without losing anything it has.
function loadContainer(input: unknown, fallback: ContainerStyle): ContainerStyle {
  const raw = (input ?? {}) as Partial<ContainerStyle>;
  return {
    background: validColor(raw.background, fallback.background),
    border: validColor(raw.border, fallback.border),
    backgroundOpacity: numberIn(raw.backgroundOpacity, fallback.backgroundOpacity, 0, 1),
    borderOpacity: numberIn(raw.borderOpacity, fallback.borderOpacity, 0, 1),
    borderWidth: numberIn(raw.borderWidth, fallback.borderWidth, 0, 12),
    blur: numberIn(raw.blur, fallback.blur, 0, 40),
    radius: numberIn(raw.radius, fallback.radius, 0, 999),
  };
}

function loadSurfacePill(input: unknown, fallback: SurfacePill): SurfacePill {
  const raw = (input ?? {}) as Partial<SurfacePill>;
  return { ...loadContainer(raw, fallback), text: validColor(raw.text, fallback.text) };
}

function loadDesignRaw(input: unknown): AboutDesign {
  const raw = (input ?? {}) as Partial<AboutDesign>;
  const rawColors = (raw.colors ?? {}) as Partial<ProfileColors>;
  const rawPills = (raw.pills ?? {}) as Partial<PillStyle>;
  const rawSurfaces = (raw.surfaces ?? {}) as Partial<SurfaceStyles>;
  const rawTooltips = (raw.tooltips ?? {}) as Partial<TooltipSettings>;
  const theme = raw.theme === "modern" || raw.theme === "portfolio" ? raw.theme : "default";
  // Older documents only had classic/modern; both map onto the new names.
  // The old "modern" page was the centred one, so it lands on `centered`
  // rather than moving anyone's card to the side.
  const savedLayout = String(raw.layout ?? "");
  const layout: AboutLayout =
    savedLayout === "left"
      ? "left"
      : savedLayout === "centered" || savedLayout === "modern"
        ? "centered"
        : "stacked";
  const cardStyle = CARD_STYLES.some((item) => item.id === raw.cardStyle)
    ? (raw.cardStyle as CardStyle)
    : DEFAULT_ABOUT_DESIGN.cardStyle;
  // Preserve explicit saved values across releases; defaults apply only to missing fields.

  return {
    theme,
    sectionsEnabled: typeof raw.sectionsEnabled === "boolean" ? raw.sectionsEnabled : Boolean(raw.sections?.length),
    slideshow: raw.slideshow === true,
    slideshowLinks: raw.slideshowLinks === true,
    slideshowBadges: raw.slideshowBadges === true,
    slideshowAbout: raw.slideshowAbout === true,
    metaGlowColor: validColor(raw.metaGlowColor, "#ff9d98"),
    metaGlowStrength: numberIn(raw.metaGlowStrength, 0, 0, 1),
    aboutSlide: {
      title: typeof raw.aboutSlide?.title === "string" ? raw.aboutSlide.title.slice(0, 100) : "About me",
      subtitle: typeof raw.aboutSlide?.subtitle === "string" ? raw.aboutSlide.subtitle.slice(0, 180) : "",
      text: typeof raw.aboutSlide?.text === "string" ? raw.aboutSlide.text.slice(0, 4000) : "",
      tags: Array.isArray(raw.aboutSlide?.tags)
        ? [...new Set(raw.aboutSlide.tags.filter((tag): tag is string => typeof tag === "string"))].slice(0, 40)
        : [],
      // Optional: repeat the project cards on the About page as well.
      showProjects: raw.aboutSlide?.showProjects === true,
    },
    skills: Array.isArray(raw.skills) ? [...new Set(raw.skills.filter((id): id is string=>typeof id === "string"))].slice(0,100) : [],
    audioPosition: oneOf(raw.audioPosition, ["auto", "inside", "below", "side", "popup", "fixed-bottom", "hidden"] as const, "auto"),
    widgetsPosition: oneOf(raw.widgetsPosition, ["auto", "inside", "below"] as const, "auto"),
    sections: Array.isArray(raw.sections) ? raw.sections.slice(0, 24).filter((section) => section && typeof section === "object").map((section, index) => {
      const item = section as Partial<ProfileSection>;
      // Older documents had text, anime and game sections; they all become
      // Interests, which is the single library-backed kind now.
      const kind: ProfileSectionKind = item.kind === "project" ? "project" : "interest";
      const links = Array.isArray(item.links)
        ? item.links
            .filter((link) => link && typeof link.url === "string" && /^https?:\/\//i.test(link.url))
            .slice(0, 6)
            .map((link) => ({
              label: typeof link.label === "string" ? link.label.slice(0, 40) : "Link",
              url: link.url.slice(0, 1000),
            }))
        : [];
      return {
        id: typeof item.id === "string" ? item.id.slice(0, 80) : `section-${index}`,
        title: typeof item.title === "string" ? item.title.slice(0, 100) : "",
        text: typeof item.text === "string" ? item.text.slice(0, 4000) : "",
        image: typeof item.image === "string" ? item.image.slice(0, 1_000_000) : "",
        url: typeof item.url === "string" && /^https?:\/\//i.test(item.url) ? item.url.slice(0, 1000) : "",
        kind,
        subtitle: typeof item.subtitle === "string" ? item.subtitle.slice(0, 180) : "",
        status: typeof item.status === "string" ? item.status.slice(0, 28) : "",
        stack: Array.isArray(item.stack)
          ? item.stack.filter((entry): entry is string => typeof entry === "string").slice(0, 100)
          : [],
        links,
        meta: typeof item.meta === "string" ? item.meta.slice(0, 80) : "",
        items: Array.isArray(item.items)
          ? item.items
              .filter((pick) => pick && typeof pick === "object")
              .slice(0, 12)
              .map((pick, pickIndex) => ({
                id: typeof pick.id === "string" ? pick.id.slice(0, 80) : `pick-${index}-${pickIndex}`,
                title: typeof pick.title === "string" ? pick.title.slice(0, 100) : "",
                subtitle: typeof pick.subtitle === "string" ? pick.subtitle.slice(0, 180) : "",
                image: typeof pick.image === "string" ? pick.image.slice(0, 1_000_000) : "",
                meta: typeof pick.meta === "string" ? pick.meta.slice(0, 80) : "",
                url: typeof pick.url === "string" && /^https?:\/\//i.test(pick.url) ? pick.url.slice(0, 1000) : "",
              }))
          : [],
      };
    }) : [],
    layout,
    cardStyle,
    font: typeof raw.font === "string" ? raw.font.slice(0, 64) : "",
    customFontUrl: typeof raw.customFontUrl === "string" ? raw.customFontUrl.slice(0, 750_000) : "",
    version: 2,
    cardWidth: numberIn(raw.cardWidth, DEFAULT_ABOUT_DESIGN.cardWidth, 320, 1100),
    cardRadius: numberIn(raw.cardRadius, DEFAULT_ABOUT_DESIGN.cardRadius, 0, 72),
    borderWidth: numberIn(raw.borderWidth, DEFAULT_ABOUT_DESIGN.borderWidth, 0, 12),
    borderOpacity: numberIn(raw.borderOpacity, DEFAULT_ABOUT_DESIGN.borderOpacity, 0, 1),
    backgroundOpacity: numberIn(raw.backgroundOpacity, DEFAULT_ABOUT_DESIGN.backgroundOpacity, 0, 1),
    backgroundBlur: numberIn(raw.backgroundBlur, DEFAULT_ABOUT_DESIGN.backgroundBlur, 0, 40),
    avatarSize: numberIn(raw.avatarSize, DEFAULT_ABOUT_DESIGN.avatarSize, 40, 240),
    widgetGap: numberIn(raw.widgetGap, DEFAULT_ABOUT_DESIGN.widgetGap, 0, 48),
    cardPadding: numberIn(raw.cardPadding, DEFAULT_ABOUT_DESIGN.cardPadding, 0, 64),
    nameSize: numberIn(raw.nameSize, DEFAULT_ABOUT_DESIGN.nameSize, 12, 64),
    bioSize: numberIn(raw.bioSize, DEFAULT_ABOUT_DESIGN.bioSize, 8, 32),
    stackTilt: boolIn(raw.stackTilt, false),
    widgetTilt: boolIn(raw.widgetTilt, false),
    tilt: numberIn(raw.tilt, DEFAULT_ABOUT_DESIGN.tilt, 0, 24),
    tiltInvert: boolIn(raw.tiltInvert, false),
    oneko: boolIn(raw.oneko, false),
    avatarX: numberIn(raw.avatarX, 0, -200, 200),
    avatarY: numberIn(raw.avatarY, 0, -200, 200),
    badgeX: numberIn(raw.badgeX, 0, -200, 200),
    badgeY: numberIn(raw.badgeY, 0, -200, 200),
    tooltips: {
      enabled: boolIn(rawTooltips.enabled, DEFAULT_ABOUT_DESIGN.tooltips.enabled),
      style: (["default", "glass", "accent", "dark", "minimal"] as const).includes(
        rawTooltips.style as TooltipStyle,
      )
        ? (rawTooltips.style as TooltipStyle)
        : DEFAULT_ABOUT_DESIGN.tooltips.style,
      animation: (["slide", "blur", "pop"] as const).includes(
        rawTooltips.animation as TooltipAnimation,
      )
        ? (rawTooltips.animation as TooltipAnimation)
        : DEFAULT_ABOUT_DESIGN.tooltips.animation,
    },
    tiltGlare: boolIn(raw.tiltGlare, DEFAULT_ABOUT_DESIGN.tiltGlare),
    pfpPosition: oneOf(raw.pfpPosition, PFP_POSITIONS, DEFAULT_ABOUT_DESIGN.pfpPosition),
    badgePosition: oneOf(raw.badgePosition, BADGE_POSITIONS, DEFAULT_ABOUT_DESIGN.badgePosition),
    namePosition: oneOf(raw.namePosition, TEXT_POSITIONS, DEFAULT_ABOUT_DESIGN.namePosition),
    bioPosition: oneOf(raw.bioPosition, TEXT_POSITIONS, DEFAULT_ABOUT_DESIGN.bioPosition),
    avatarShape: oneOf(raw.avatarShape, AVATAR_SHAPES, DEFAULT_ABOUT_DESIGN.avatarShape),
    viewPosition: oneOf(raw.viewPosition, VIEW_POSITIONS, DEFAULT_ABOUT_DESIGN.viewPosition),
    joinPosition: oneOf(raw.joinPosition, JOIN_POSITIONS, DEFAULT_ABOUT_DESIGN.joinPosition),
    locationPosition: oneOf(
      raw.locationPosition,
      LOCATION_POSITIONS,
      DEFAULT_ABOUT_DESIGN.locationPosition,
    ),
    advancedLayout: boolIn(raw.advancedLayout, false),
    viewStyle: oneOf(raw.viewStyle, ["icon", "text", "number"] as const, "icon"),
    metaStyle: oneOf(raw.metaStyle, ["plain", "pill"] as const, "plain"),
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
    surfaces: {
      about: {
        container: loadContainer(rawSurfaces.about?.container, DEFAULT_SURFACES.about.container),
        pill: loadSurfacePill(rawSurfaces.about?.pill, DEFAULT_SURFACES.about.pill),
      },
      project: {
        container: loadContainer(rawSurfaces.project?.container, DEFAULT_SURFACES.project.container),
        pill: loadSurfacePill(rawSurfaces.project?.pill, DEFAULT_SURFACES.project.pill),
      },
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
