export type AvatarDecorationStyle = "none" | "ring" | "glow" | "stars" | "flame" | "blob";
/** Light-and-sheen treatments for the profile card itself. */
export type CardEffectId =
  | "none"
  | "beam"
  | "shimmer"
  | "sheen"
  | "hologram"
  | "aurora"
  | "edgeGlow"
  | "frost";
export type CursorSkin = "system" | "dot" | "ring" | "dotRing" | "crosshair";
export type CursorStyle = CursorSkin | "custom";
/** How the pointer trail is drawn. */
export type CursorTrailType =
  | "none"
  | "fairyDust"
  | "snowflakes"
  | "trailingCursor"
  | "ghost"
  | "sparkler"
  | "lightning"
  | "tracer"
  | "petals"
  | "orbit"
  | "pixels"
  | "ripple"
  | "warp"
  | "constellation";

export type ClickEffectId = "none" | "ripple" | "burst" | "sparks" | "pixelPop" | "shockwave";

export type CursorMotionSettings = {
  /** Multiplier for the effect's natural particle / shape size. */
  size: number;
  /** Density multiplier for emitted particles. */
  amount: number;
  /** Lifespan multiplier. */
  life: number;
  /** Empty means the trail keeps its authored colour palette. */
  color: string;
  rainbow: boolean;
};

/** The pointer trails offered in Customize › Effects › Pointer. */
export const CURSOR_TRAILS: { id: CursorTrailType; name: string; hint: string }[] = [
  { id: "none", name: "None", hint: "No pointer trail" },
  { id: "fairyDust", name: "Fairy Dust", hint: "Glittering sparkles drifting from the pointer" },
  { id: "snowflakes", name: "Snowflakes", hint: "Snowflakes that fall and spin behind the pointer" },
  { id: "trailingCursor", name: "Trailing Cursor", hint: "A trail of cursor arrows lagging behind the pointer" },
  { id: "ghost", name: "Ghost Following", hint: "A little ghost floats behind the pointer" },
  { id: "sparkler", name: "Sparkler", hint: "Bright sparks shooting out from the pointer" },
  { id: "lightning", name: "Lightning", hint: "Small electric bolts crackle off the pointer" },
  { id: "tracer", name: "Tracer", hint: "A thin line follows the path of the pointer" },
  { id: "petals", name: "Petals", hint: "Soft petals tumble away from the pointer" },
  { id: "orbit", name: "Orbit", hint: "Six little planets orbit the pointer" },
  { id: "pixels", name: "Pixels", hint: "Pixel blocks snap to a grid behind the pointer" },
  { id: "ripple", name: "Ripple", hint: "Small rings expand from the pointer" },
  { id: "warp", name: "Warp", hint: "Streaking stars are pulled outward from the pointer" },
  { id: "constellation", name: "Constellation", hint: "Dots drift and link into constellations" },
];

/** Cursor skins replace the system pointer while active. */
export const CURSOR_SKINS: { id: CursorSkin; name: string; hint: string }[] = [
  { id: "system", name: "System cursor", hint: "Keep the normal pointer" },
  { id: "dot", name: "Dot", hint: "A solid dot at the pointer" },
  { id: "ring", name: "Ring", hint: "A ring that trails slightly behind" },
  { id: "dotRing", name: "Dot + Ring", hint: "A dot with a trailing outer ring" },
  { id: "crosshair", name: "Crosshair", hint: "Four short lines around the pointer" },
];

export const CLICK_EFFECTS: { id: ClickEffectId; name: string; hint: string }[] = [
  { id: "none", name: "None", hint: "No click effect" },
  { id: "ripple", name: "Ripple", hint: "Two rings expand from every click" },
  { id: "burst", name: "Burst", hint: "A radial burst of dots" },
  { id: "sparks", name: "Sparks", hint: "Sharp sparks fly out from the click" },
  { id: "pixelPop", name: "Pixel Pop", hint: "Pixel shards pop out with gravity" },
  { id: "shockwave", name: "Shockwave", hint: "One wide, fast shockwave" },
];

export const DEFAULT_CURSOR_MOTION: CursorMotionSettings = {
  size: 1,
  amount: 1,
  life: 1,
  color: "",
  rainbow: false,
};

function motionMap<T extends string>(items: readonly { id: T }[]): Record<T, CursorMotionSettings> {
  return Object.fromEntries(items.map((item) => [item.id, { ...DEFAULT_CURSOR_MOTION }])) as Record<T, CursorMotionSettings>;
}

/** Old trail ids keep working after the catalogue changed. */
const LEGACY_TRAILS: Record<string, CursorTrailType> = {
  dots: "trailingCursor", line: "tracer", ribbon: "trailingCursor", smoke: "tracer",
  glow: "fairyDust", sparkle: "fairyDust", fairy: "fairyDust",
  snow: "snowflakes", trailing: "trailingCursor", emoji: "none",
  characters: "none", comet: "sparkler", bubbles: "petals",
  hearts: "petals", stars: "sparkler", custom: "constellation",
};
export type ProfileBackgroundStyle = "solid" | "gradient" | "image" | "video";
/** Transparent particle layers drawn behind the profile page. */
export type BackgroundEffectId = "none" | "rain" | "snow" | "night" | "storm" | "warp" | "shootingStars";
/** Full-page CSS filters, grain and the snowfall filter. */
export type OverlayEffectId = "none" | "oldTv" | "blurred" | "snowFall" | "dotPattern" | "lines" | "gridLines" | "crt" | "grain";
export type AudioStyle =
  | "none"
  | "compact"
  | "lyrics"
  | "pill"
  | "vinyl"
  | "bars"
  | "minimal"
  | "cover"
  | "glass";
export type TextEffectId =
  | "none"
  | "rgb"
  | "wave"
  | "typewriter"
  | "glow"
  | "sparkle"
  | "shimmer"
  | "glitch"
  | "neon"
  | "bounce"
  | "fade"
  | "flicker"
  | "shake"
  | "aurora"
  | "outline"
  | "metallic"
  | "liner";
export type TextEffectTarget = "alias" | "name" | "bio";

/* ── per-effect custom settings ───────────────────────────────────────────
   Every effect gets its own extra control (and only one of these two slots
   is ever shown, decided by the schema below) instead of every effect
   sharing the same four generic knobs. `amount` backs a slider, `flag`
   backs a toggle. */
export type EffectParams = { amount: number; flag: boolean };

export type EffectParamSpec =
  | { kind: "slider"; key: string; label: string; min: number; max: number; step: number; unit?: string; default: number }
  | { kind: "toggle"; key: string; label: string; default: boolean };

export const DEFAULT_EFFECT_PARAMS: EffectParams = { amount: 50, flag: false };

export function defaultParamsFor(spec: EffectParamSpec | null): EffectParams {
  if (!spec) return { ...DEFAULT_EFFECT_PARAMS };
  return spec.kind === "slider" ? { amount: spec.default, flag: false } : { amount: 50, flag: spec.default };
}

function clampParamsFor(spec: EffectParamSpec | null, raw: unknown): EffectParams {
  const r = (raw ?? {}) as Partial<EffectParams>;
  const fallback = defaultParamsFor(spec);
  if (!spec) return fallback;
  if (spec.kind === "slider") {
    const n = Number(r.amount);
    const amount = Number.isFinite(n) ? Math.min(spec.max, Math.max(spec.min, n)) : fallback.amount;
    return { amount, flag: false };
  }
  return { amount: 50, flag: typeof r.flag === "boolean" ? r.flag : fallback.flag };
}

function loadCursorMotion(value: unknown): CursorMotionSettings {
  const raw = (value ?? {}) as Partial<CursorMotionSettings>;
  return {
    size: numberIn(raw.size, DEFAULT_CURSOR_MOTION.size, 0.4, 2),
    amount: numberIn(raw.amount, DEFAULT_CURSOR_MOTION.amount, 0.2, 3),
    life: numberIn(raw.life, DEFAULT_CURSOR_MOTION.life, 0.25, 2.5),
    color: normalizeHexColor(raw.color) ?? "",
    rainbow: boolIn(raw.rainbow, DEFAULT_CURSOR_MOTION.rainbow),
  };
}

export const TEXT_EFFECT_PARAM: Record<TextEffectId, EffectParamSpec | null> = {
  aurora: null, outline: null, metallic: null,
  none: null,
  liner: { kind: "slider", key: "lineGap", label: "Line spacing", min: 3, max: 18, step: 1, unit: "px", default: 7 },
  rgb: { kind: "slider", key: "bandSharpness", label: "Band sharpness", min: 10, max: 90, step: 5, unit: "%", default: 45 },
  wave: { kind: "slider", key: "amplitude", label: "Amplitude", min: 2, max: 16, step: 1, unit: "px", default: 6 },
  typewriter: { kind: "toggle", key: "cursor", label: "Blinking cursor", default: true },
  glow: { kind: "toggle", key: "pulse", label: "Pulse", default: true },
  sparkle: { kind: "slider", key: "density", label: "Density", min: 3, max: 20, step: 1, default: 10 },
  shimmer: { kind: "slider", key: "shineWidth", label: "Shine width", min: 10, max: 80, step: 5, unit: "%", default: 40 },
  glitch: { kind: "slider", key: "intensity", label: "Intensity", min: 1, max: 10, step: 1, default: 4 },
  neon: { kind: "toggle", key: "flicker", label: "Flicker", default: true },
  bounce: { kind: "slider", key: "amplitude", label: "Amplitude", min: 3, max: 18, step: 1, unit: "px", default: 8 },
  fade: { kind: "slider", key: "dimTo", label: "Dim to", min: 0, max: 80, step: 5, unit: "%", default: 20 },
  flicker: { kind: "slider", key: "chaos", label: "Chaos", min: 1, max: 10, step: 1, default: 5 },
  shake: { kind: "slider", key: "amplitude", label: "Amplitude", min: 1, max: 6, step: 1, unit: "px", default: 2 },
};

export const BACKGROUND_EFFECT_PARAM: Record<BackgroundEffectId, EffectParamSpec | null> = {
  none: null,
  rain: null,
  snow: null,
  night: null,
  storm: null,
  warp: null,
  shootingStars: null,
};

export const OVERLAY_EFFECT_PARAM: Record<OverlayEffectId, EffectParamSpec | null> = {
  none: null,
  oldTv: null,
  blurred: null,
  snowFall: null,
  dotPattern: null,
  lines: null,
  gridLines: null,
  crt: null,
  grain: null,
};

export type DecorationSettings = {
  style: AvatarDecorationStyle;
  color: string;
  size: number;
  spin: boolean;
  /** Discord CDN avatar-decoration-preset URL (APNG overlay). */
  discordUrl?: string;
  /** Avatar zoom 0.5–2.5 */
  zoom?: number;
  /** Avatar rotation in degrees */
  rotate?: number;
};

export type CursorSettings = {
  style: CursorStyle;
  color: string;
  size: number;
  trail: boolean;
  trailType: CursorTrailType;
  /** Emoji/characters used by emoji and character trails. */
  trailText: string;
  /** Each trail keeps its own motion settings. */
  trailSettings: Record<CursorTrailType, CursorMotionSettings>;
  click: ClickEffectId;
  /** Each click effect keeps its own settings too. */
  clickSettings: Record<ClickEffectId, CursorMotionSettings>;
  imageUrl: string;
  /** The clickable (pointer) cursor, uploaded on its own. */
  pointerImageUrl: string;
  /** Extra uploaded cursors, used by the multi-cursor trail and as fallbacks. */
  customCursorUrls: string[];
  /** Hotspot offset for uploaded cursors, in image pixels. */
  hotspotX: number;
  hotspotY: number;
};

export type BackgroundSettings = {
  positionX?: number;
  positionY?: number;
  fit?: "cover" | "contain";
  style: ProfileBackgroundStyle;
  color: string;
  from: string;
  to: string;
  imageUrl: string;
  videoUrl: string;
  videoAudio: boolean;
  videoVolume: number;
  saturation: number;
  contrast: number;
  brightness: number;
  blur: number;
  dim: number;
  /** Gradient animation: "none" | "shift" | "pulse" | "aurora" | "sweep" */
  gradientAnim?: string;
  /** Gradient angle in degrees */
  angle?: number;
};

export type AudioSettings = {
  edgeEffect: "none" | "trace" | "pulse";
  edgeColor: string;
  edgeSpeed: number;
  volume: number;
  startMuted: boolean;
  /** The floating mute control, separate from the player itself. */
  muteButton: boolean;
  /** Pick a random song from the queue on each page load. */
  shuffle: boolean;
  /** Seconds into the song where playback starts. */
  startAt: number;
  /** Extra songs beyond the main file; three playable tracks in total. */
  queue: { id: string; url: string; title: string }[];
  loop: boolean;
  playbackRate: number;
  popupSide: "left" | "right" | "bottom-left" | "bottom-right";
  popupSize: number;
  popupStyle: "glossy" | "minimal" | "glass" | "rounded";
  popupColor: string;
  popupBackground: string;
  popupBarWidth: number;
  popupOffset: number;
  popupDuration: number;
  style: AudioStyle;
  /** Uploaded audio as a data URL — the only playback source. */
  fileUrl: string;
  /** Uploaded/pasted cover art shown in the player. */
  coverUrl: string;
  /** Manual track title — required, there's no metadata to read from a file. */
  title: string;
  artist: string;
  /** Custom lyrics: plain text or LRC (with [mm:ss.xx] timestamps). */
  lyrics: string;
  /** Look up synced lyrics automatically when no custom lyrics are set. */
  autoLyrics: boolean;
  /** Card background opacity, 0 (fully transparent) – 1 (solid). */
  cardOpacity: number;
  /** Accent colour for the progress fill / highlighted lyric line. */
  accentColor: string;
  /** Accent alpha, 0 (invisible) – 1 (fully opaque). */
  accentOpacity: number;
  /** Player surface colour under the accent wash. */
  playerColor: string;
  /** Border colour and its alpha, 0–1. */
  borderColor: string;
  borderOpacity: number;
  titleColor: string;
  artistColor: string;
  /** Filled and unfilled progress rail colours. */
  progressColor: string;
  trackColor: string;
  trackOpacity: number;
  /** Play / pause button surface and icon. */
  buttonColor: string;
  buttonIconColor: string;
  /** Player scale, 0.85–1.25 — retained for saved documents; always full width. */
  size: number;
  /** Start playing as soon as the page opens (with an interaction fallback). */
  autoplay: boolean;
};

export type BannerSettings = {
  enabled: boolean;
  imageUrl: string;
  height: number;
  opacity: number;
};

export type CardEffectSettings = {
  id: CardEffectId;
  color: string;
  /** 0–100, how strong the sheen reads. */
  intensity: number;
  /** seconds per sweep; higher = slower. */
  speed: number;
};

export type BackgroundEffectSettings = {
  id: BackgroundEffectId;
  intensity: number;
  speed: number;
  color: string;
  params: EffectParams;
};

export type OverlayEffectSettings = {
  imageUrl: string;
  id: OverlayEffectId;
  /** Canvas layer opacity, 0–1. */
  opacity: number;
  /** Kept for saved profiles; unused by the canvas engine. */
  scale: number;
  /** 0–100, the canvas engine's main slider. */
  intensity: number;
  /** 0.5–14s; higher = slower. */
  speed: number;
  /** Hex tint used by the engine. */
  color: string;
  params: EffectParams;
};

export type TextEffectSettings = {
  effect: TextEffectId;
  /** Extra effects stacked on top of the main one. */
  effects: TextEffectId[];
  colorA: string;
  colorB: string;
  speed: number;
  strength: number;
  params: EffectParams;
  /** Google Font family name; "" inherits the theme font. */
  font: string;
};

export type InteractionSettings = {
  sound: "none" | "soft" | "tick" | "pop" | "custom";
  fileUrl: string;
  volume: number;
  ripple: boolean;
  allClicks: boolean;
  color: string;
};

export type ProfileAssets = {
  interactions: InteractionSettings;
  avatarUrl: string;
  /** Card-level light treatment (shimmer, sheen, hologram, …). */
  card: CardEffectSettings;
  decoration: DecorationSettings;
  cursor: CursorSettings;
  background: BackgroundSettings;
  banner: BannerSettings;
  audio: AudioSettings;
  effects: {
    background: BackgroundEffectSettings;
    overlay: OverlayEffectSettings;
    text: Record<TextEffectTarget, TextEffectSettings>;
  };
};

export const DEFAULT_TEXT_EFFECT: TextEffectSettings = {
  effect: "none",
  effects: [],
  colorA: "#ffcfa8",
  colorB: "#93c5fd",
  speed: 3,
  strength: 1,
  params: defaultParamsFor(null),
  font: "",
};

export const DEFAULT_PROFILE_ASSETS: ProfileAssets = {
  interactions: { sound: "none", fileUrl: "", volume: 0.35, ripple: false, allClicks: false, color: "#ffffff" },
  avatarUrl: "",
  card: {
    // Two beams chase each other around the card's edge — the default look.
    id: "beam",
    color: "#60a5fa",
    intensity: 70,
    speed: 6,
  },
  decoration: {
    style: "none",
    color: "#93c5fd",
    size: 1,
    spin: false,
  },
  cursor: {
    style: "system",
    color: "#93c5fd",
    size: 10,
    trail: false,
    trailType: "trailingCursor",
    trailText: "",
    trailSettings: motionMap(CURSOR_TRAILS),
    click: "none",
    clickSettings: motionMap(CLICK_EFFECTS),
    imageUrl: "",
    pointerImageUrl: "",
    customCursorUrls: [],
    hotspotX: 0,
    hotspotY: 0,
  },
  background: {
    style: "solid",
    color: "#0b0d10",
    from: "#0b0d10",
    to: "#3a1617",
    imageUrl: "",
    videoUrl: "",
    videoAudio: false,
    videoVolume: 0.5,
    saturation: 1,
    contrast: 1,
    brightness: 1,
    blur: 0,
    dim: 0.25,
    gradientAnim: "none",
    angle: 160,
  },
  banner: {
    enabled: true,
    imageUrl: "",
    // Tall enough to read as a real banner, not a thin strip.
    height: 150,
    opacity: 0.92,
  },
  audio: {
    volume: .7, startMuted: false, muteButton: false, shuffle: false, startAt: 0, queue: [], loop: true, playbackRate: 1,
    popupSide: "left", popupSize: 60, popupStyle: "glossy", popupColor: "#ffffff", popupBackground: "#151515", popupBarWidth: 110, popupOffset: 20, popupDuration: 250,
    style: "none",
    fileUrl: "",
    coverUrl: "",
    title: "",
    artist: "",
    lyrics: "",
    autoLyrics: true,
    edgeEffect:"none",edgeColor:"#ffffff",edgeSpeed:5,
    cardOpacity: 0.92,
    accentColor: "#93c5fd",
    accentOpacity: 1,
    playerColor: "#0a0b0d",
    borderColor: "#ffffff",
    borderOpacity: 0.09,
    titleColor: "#f2f5f7",
    artistColor: "#aab3bb",
    progressColor: "#ffffff",
    trackColor: "#ffffff",
    trackOpacity: 0.14,
    buttonColor: "#f2f5f7",
    buttonIconColor: "#0b0d10",
    size: 1,
    autoplay: true,
  },
  effects: {
    background: {
      id: "none",
      intensity: 50,
      speed: 9,
      color: "#93c5fd",
      params: defaultParamsFor(null),
    },
    overlay: {
      imageUrl: "",
      id: "none",
      opacity: 0.9,
      scale: 1,
      intensity: 50,
      speed: 9,
      color: "#ffffff",
      params: defaultParamsFor(null),
    },
    text: {
      alias: { ...DEFAULT_TEXT_EFFECT },
      name: { ...DEFAULT_TEXT_EFFECT },
      bio: { ...DEFAULT_TEXT_EFFECT },
    },
  },
};

export const CARD_EFFECTS: { id: CardEffectId; name: string; hint: string }[] = [
  { id: "none", name: "None", hint: "Plain card surface" },
  { id: "beam", name: "Beam ring", hint: "Two light beams chase around the card edge" },
  { id: "shimmer", name: "Shimmer", hint: "A soft light band sweeps across the card" },
  { id: "sheen", name: "Sheen", hint: "Glossy top highlight that breathes" },
  { id: "hologram", name: "Hologram", hint: "Iridescent colour drift along the edges" },
  { id: "aurora", name: "Aurora", hint: "Slow, cloudy colour wash behind the content" },
  { id: "edgeGlow", name: "Edge glow", hint: "Accent light hugging the card border" },
  { id: "frost", name: "Frost", hint: "Fine frosted grain with a dull shine" },
];

export const DECORATIONS: { id: AvatarDecorationStyle; name: string; hint: string }[] = [
  { id: "none", name: "None", hint: "Clean avatar" },
  { id: "ring", name: "Orbit ring", hint: "Rotating ring" },
  { id: "glow", name: "Glow", hint: "Coloured halo" },
  { id: "stars", name: "Stars", hint: "Orbiting sparks" },
  { id: "flame", name: "Flame", hint: "Flickering edge" },
  { id: "blob", name: "Aura", hint: "Soft colour cloud" },
];

export const BACKGROUND_EFFECTS: { id: BackgroundEffectId; name: string; hint: string }[] = [
  { id: "none", name: "None", hint: "No animated background" },
  { id: "rain", name: "Rain", hint: "Slanted rain drifting across the page" },
  { id: "snow", name: "Snow", hint: "Soft snowflakes falling at different speeds" },
  { id: "night", name: "Night", hint: "A quiet field of twinkling stars" },
  { id: "storm", name: "Storm", hint: "Heavy rain with distant lightning flashes" },
  { id: "warp", name: "Warp", hint: "Stars streaking outward from the centre" },
  { id: "shootingStars", name: "Shooting Stars", hint: "Occasional meteors crossing the night sky" },
];

export const OVERLAY_EFFECTS: { id: OverlayEffectId; name: string; hint: string }[] = [
  { id: "none", name: "None", hint: "No filter applied" },
  { id: "oldTv", name: "Old TV", hint: "Scanlines, a dark vignette and a subtle flicker" },
  { id: "blurred", name: "Blurred", hint: "Softens the background behind your profile" },
  { id: "snowFall", name: "Snow Fall", hint: "Snow falling above the page" },
  { id: "dotPattern", name: "Dot Pattern", hint: "A fine dotted texture over the page" },
  { id: "lines", name: "Lines", hint: "Fine horizontal lines across the page" },
  { id: "gridLines", name: "Grid Lines", hint: "A faint 40px grid over the page" },
  { id: "crt", name: "CRT", hint: "Scanlines, RGB stripes, a flicker and a heavy vignette" },
  { id: "grain", name: "Film Grain", hint: "Animated monochrome noise over the page" },
];
export const TEXT_EFFECTS: { id: TextEffectId; name: string; hint: string }[] = [
  { id: "none", name: "None", hint: "Plain text" },
  { id: "rgb", name: "RGB flow", hint: "Moving colour gradient" },
  { id: "wave", name: "Wave", hint: "Letters rise and fall" },
  { id: "typewriter", name: "Typewriter", hint: "Reveal letter by letter" },
  { id: "glow", name: "Glow", hint: "Soft coloured halo" },
  { id: "sparkle", name: "Sparkle", hint: "Twinkling stars around your text" },
  { id: "shimmer", name: "Shimmer", hint: "Light sweeps across the letters" },
  { id: "glitch", name: "Glitch", hint: "Digital interference" },
  { id: "neon", name: "Neon", hint: "Bright tube glow" },
  { id: "bounce", name: "Bounce", hint: "Letters hop in sequence" },
  { id: "fade", name: "Fade", hint: "Smooth pulse in and out" },
  { id: "flicker", name: "Flicker", hint: "Broken neon flashing" },
  { id: "shake", name: "Shake", hint: "Rapid vibration" },
  {id:"aurora",name:"Aurora",hint:"A flowing two-tone ribbon"},
  {id:"outline",name:"Outline",hint:"Crisp illuminated letter edges"},
  {id:"metallic",name:"Metallic",hint:"A narrow silver light sweep"},
  {id:"liner",name:"Liner",hint:"Fine animated lines cut through the letters"},
];

export const AUDIO_STYLES: { id: AudioStyle; name: string; hint: string }[] = [
  { id: "none", name: "None", hint: "No audio player shown" },
  { id: "compact", name: "Compact", hint: "One row: cover, title, transport, progress" },
  { id: "lyrics", name: "Lyrics", hint: "Custom or auto-fetched lyrics that follow playback" },
  { id: "pill", name: "Pill", hint: "A long bar with cover art and a track name that glides back and forth" },
  { id: "vinyl", name: "Vinyl", hint: "A record in the card edge, spinning while it plays" },
  { id: "bars", name: "Equalizer", hint: "Cover, title and live equalizer bars that dance while it plays" },
  { id: "minimal", name: "Minimal", hint: "One quiet line: play, title – artist, time, hairline progress" },
  { id: "cover", name: "Album card", hint: "A tall card with big cover art, title and transport underneath" },
  { id: "glass", name: "Glass", hint: "Blurred cover backdrop with a circular progress ring around play" },
];

export const TEXT_TARGETS: { id: TextEffectTarget; name: string }[] = [
  { id: "alias", name: "Alias" },
  { id: "name", name: "Display name" },
  { id: "bio", name: "Bio" },
];

function numberIn(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function boolIn(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function textIn(value: unknown, fallback: string, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}


function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(raw)) return "#" + raw.split("").map((part) => part + part).join("");
  if (/^[0-9a-f]{8}$/.test(raw)) return "#" + raw.slice(0, 6);
  if (/^[0-9a-f]{6}$/.test(raw)) return "#" + raw;
  return null;
}

function colorIn(value: unknown, fallback: string): string {
  return normalizeHexColor(value) ?? fallback;
}


function choiceIn<T extends string>(value: unknown, choices: readonly T[], fallback: T): T {
  return choices.includes(value as T) ? (value as T) : fallback;
}

function loadTextEffect(value: unknown): TextEffectSettings {
  const raw = (value ?? {}) as Partial<TextEffectSettings>;
  const choices = TEXT_EFFECTS.map((e) => e.id);
  const effect = choiceIn(raw.effect, choices, DEFAULT_TEXT_EFFECT.effect);
  const effects = Array.isArray(raw.effects)
    ? [
        ...new Set(
          raw.effects.filter(
            (id): id is TextEffectId =>
              typeof id === "string" && choices.includes(id as TextEffectId) && id !== "none" && id !== effect,
          ),
        ),
      ].slice(0, 4)
    : [];
  return {
    effect,
    effects,
    colorA: colorIn(raw.colorA, DEFAULT_TEXT_EFFECT.colorA),
    colorB: colorIn(raw.colorB, DEFAULT_TEXT_EFFECT.colorB),
    speed: numberIn(raw.speed, DEFAULT_TEXT_EFFECT.speed, 0.5, 12),
    strength: numberIn(raw.strength, DEFAULT_TEXT_EFFECT.strength, 0.2, 3),
    params: clampParamsFor(TEXT_EFFECT_PARAM[effect], raw.params),
    font: textIn(raw.font, DEFAULT_TEXT_EFFECT.font, 60),
  };
}

function loadAudio(value: unknown): AudioSettings {
  const raw = (value ?? {}) as Partial<AudioSettings> & {
    // Legacy fields from the removed Spotify source — read but dropped.
    source?: unknown;
    trackUrl?: unknown;
  };
  void raw.source;
  void raw.trackUrl;
  return {
    // Profiles saved with the old marquee player land on the pill it became;
    // the vinyl player is supported again.
    style: choiceIn(
      String(raw.style) === "marquee"
        ? "pill"
        : raw.style,
      AUDIO_STYLES.map((item) => item.id),
      DEFAULT_PROFILE_ASSETS.audio.style,
    ),
    volume: numberIn(raw.volume, .7, 0, 1), startMuted: boolIn(raw.startMuted, false), muteButton: boolIn(raw.muteButton, false), shuffle: boolIn(raw.shuffle, false), startAt: numberIn(raw.startAt, 0, 0, 600), queue: Array.isArray(raw.queue) ? raw.queue.filter((item) => item && typeof item.url === "string" && item.url).slice(0, 2).map((item, index) => ({ id: typeof item.id === "string" ? item.id : "q" + index, url: item.url.slice(0, 8_500_000), title: typeof item.title === "string" ? item.title.slice(0, 80) : "" })) : [], loop: boolIn(raw.loop, true), playbackRate: numberIn(raw.playbackRate, 1, .5, 2),
    popupSide: choiceIn(raw.popupSide, ["left", "right", "bottom-left", "bottom-right"], "left"), popupSize: numberIn(!raw.popupStyle && raw.popupSize === 42 ? 60 : raw.popupSize, 60, 28, 64), popupStyle: choiceIn(raw.popupStyle, ["glossy", "minimal", "glass", "rounded"] as const, "glossy"), popupColor: colorIn(raw.popupColor, "#ffffff"), popupBackground: colorIn(raw.popupBackground, "#151515"), popupBarWidth: numberIn(raw.popupBarWidth, 110, 60, 180), popupOffset: numberIn(raw.popupOffset, 20, 8, 80), popupDuration: numberIn(raw.popupDuration, 250, 100, 700),
    fileUrl: textIn(raw.fileUrl, DEFAULT_PROFILE_ASSETS.audio.fileUrl, 8_500_000),
    coverUrl: textIn(raw.coverUrl, "", 2_500_000),
    title: textIn(raw.title, DEFAULT_PROFILE_ASSETS.audio.title, 80),
    artist: textIn(raw.artist, DEFAULT_PROFILE_ASSETS.audio.artist, 80),
    lyrics: textIn(raw.lyrics, "", 40_000),
    autoLyrics: boolIn(raw.autoLyrics, DEFAULT_PROFILE_ASSETS.audio.autoLyrics),
    edgeEffect: choiceIn(raw.edgeEffect,["none","trace","pulse"] as const,"none"),edgeColor:colorIn(raw.edgeColor,"#ffffff"),edgeSpeed:numberIn(raw.edgeSpeed,5,1,15),
    cardOpacity: numberIn(raw.cardOpacity, DEFAULT_PROFILE_ASSETS.audio.cardOpacity, 0, 1),
    accentColor: colorIn(raw.accentColor, DEFAULT_PROFILE_ASSETS.audio.accentColor),
    accentOpacity: numberIn(raw.accentOpacity, DEFAULT_PROFILE_ASSETS.audio.accentOpacity, 0, 1),
    playerColor: colorIn(raw.playerColor, DEFAULT_PROFILE_ASSETS.audio.playerColor),
    borderColor: colorIn(raw.borderColor, DEFAULT_PROFILE_ASSETS.audio.borderColor),
    borderOpacity: numberIn(raw.borderOpacity, DEFAULT_PROFILE_ASSETS.audio.borderOpacity, 0, 1),
    titleColor: colorIn(raw.titleColor, DEFAULT_PROFILE_ASSETS.audio.titleColor),
    artistColor: colorIn(raw.artistColor, DEFAULT_PROFILE_ASSETS.audio.artistColor),
    progressColor: colorIn(raw.progressColor, DEFAULT_PROFILE_ASSETS.audio.progressColor),
    trackColor: colorIn(raw.trackColor, DEFAULT_PROFILE_ASSETS.audio.trackColor),
    trackOpacity: numberIn(raw.trackOpacity, DEFAULT_PROFILE_ASSETS.audio.trackOpacity, 0, 1),
    buttonColor: colorIn(raw.buttonColor, DEFAULT_PROFILE_ASSETS.audio.buttonColor),
    buttonIconColor: colorIn(raw.buttonIconColor, DEFAULT_PROFILE_ASSETS.audio.buttonIconColor),
    size: 1,
    autoplay: boolIn(raw.autoplay, DEFAULT_PROFILE_ASSETS.audio.autoplay),
  };
}

export function loadProfileAssets(input: unknown): ProfileAssets {
  const raw = (input ?? {}) as Partial<ProfileAssets>;
  const interactions = raw.interactions ?? DEFAULT_PROFILE_ASSETS.interactions;
  const decoration = (raw.decoration ?? {}) as Partial<DecorationSettings>;
  const cursor = (raw.cursor ?? {}) as Partial<CursorSettings>;
  const background = (raw.background ?? {}) as Partial<BackgroundSettings>;
  const banner = (raw.banner ?? {}) as Partial<BannerSettings>;
  const card = (raw.card ?? {}) as Partial<CardEffectSettings>;
  const effects = (raw.effects ?? {}) as Partial<ProfileAssets["effects"]>;
  const backgroundEffect = (effects.background ?? {}) as Partial<BackgroundEffectSettings>;
  const overlay = (effects.overlay ?? {}) as Partial<OverlayEffectSettings>;
  const text = (effects.text ?? {}) as Partial<Record<TextEffectTarget, TextEffectSettings>>;
  // Uploads are stored as compressed data URLs, so this field is no longer
  // limited to the length of a normal https:// URL.
  const cursorImage = textIn(cursor.imageUrl, "", 750_000);
  const cursorSet = Array.isArray(cursor.customCursorUrls)
    ? cursor.customCursorUrls
        .filter((url): url is string => typeof url === "string" && Boolean(url.trim()))
        .slice(0, 8)
        .map((url) => url.slice(0, 750_000))
    : [];

  return {
    interactions: {
      sound: choiceIn(interactions.sound, ["none", "soft", "tick", "pop", "custom"] as const, "none"),
      fileUrl: textIn(interactions.fileUrl, "", 750_000),
      volume: numberIn(interactions.volume, 0.35, 0, 1),
      ripple: boolIn(interactions.ripple, false),
      allClicks: boolIn(interactions.allClicks, false),
      color: colorIn(interactions.color, "#ffffff"),
    },
    avatarUrl: textIn(raw.avatarUrl, "", 2_500_000),
    card: {
      id: choiceIn(card.id, CARD_EFFECTS.map((item) => item.id), DEFAULT_PROFILE_ASSETS.card.id),
      color: colorIn(card.color, DEFAULT_PROFILE_ASSETS.card.color),
      intensity: numberIn(card.intensity, DEFAULT_PROFILE_ASSETS.card.intensity, 0, 100),
      speed: numberIn(card.speed, DEFAULT_PROFILE_ASSETS.card.speed, 1.5, 20),
    },
    decoration: {
      // Avatar decorations are Discord presets only; the old generated styles
      // (ring/glow/stars/…) are kept in the type for saved documents but are
      // never rendered.
      style: "none",
      color: colorIn(decoration.color, DEFAULT_PROFILE_ASSETS.decoration.color),
      size: numberIn(decoration.size, DEFAULT_PROFILE_ASSETS.decoration.size, 0.5, 1.8),
      spin: boolIn(decoration.spin, DEFAULT_PROFILE_ASSETS.decoration.spin),
      discordUrl: textIn(decoration.discordUrl, "", 900),
      zoom: numberIn(decoration.zoom, 1, 0.5, 2.5),
      rotate: numberIn(decoration.rotate, 0, -180, 180),
    },
    cursor: (() => {
      const rawStyle = String(cursor.style ?? "");
      const style: CursorStyle = rawStyle === "custom"
        ? (cursorImage || cursorSet.length ? "custom" : "system")
        : rawStyle === "default" ? "system"
        : rawStyle === "glow" ? "dotRing"
        : choiceIn(rawStyle, ["system", "dot", "ring", "dotRing", "crosshair"] as const, "system");
      const trailType = (() => {
        const raw = String(cursor.trailType ?? "");
        if (["emojiRain","characterRain","emoji","characters"].includes(raw)) return "none";
        if (CURSOR_TRAILS.some((entry) => entry.id === raw)) return raw as CursorTrailType;
        return LEGACY_TRAILS[raw] ?? DEFAULT_PROFILE_ASSETS.cursor.trailType;
      })();
      const rawTrailSettings = (cursor.trailSettings ?? {}) as Partial<Record<string, unknown>>;
      const trailSettings = Object.fromEntries(
        CURSOR_TRAILS.map((entry) => [entry.id, loadCursorMotion(rawTrailSettings[entry.id])]),
      ) as Record<CursorTrailType, CursorMotionSettings>;
      const rawClick = String(cursor.click ?? "");
      const click = CLICK_EFFECTS.some((entry) => entry.id === rawClick)
        ? rawClick as ClickEffectId
        : interactions.ripple ? "ripple" : "none";
      const rawClickSettings = (cursor.clickSettings ?? {}) as Partial<Record<string, unknown>>;
      const clickSettings = Object.fromEntries(
        CLICK_EFFECTS.map((entry) => [entry.id, loadCursorMotion(rawClickSettings[entry.id])]),
      ) as Record<ClickEffectId, CursorMotionSettings>;
      return {
        style,
        color: colorIn(cursor.color, DEFAULT_PROFILE_ASSETS.cursor.color),
        size: numberIn(cursor.size, DEFAULT_PROFILE_ASSETS.cursor.size, 4, 32),
        trail: boolIn(cursor.trail, DEFAULT_PROFILE_ASSETS.cursor.trail),
        trailType,
        trailText: textIn(cursor.trailText, DEFAULT_PROFILE_ASSETS.cursor.trailText, 32),
        trailSettings,
        click,
        clickSettings,
        imageUrl: cursorImage || cursorSet[0] || "",
        pointerImageUrl: textIn(cursor.pointerImageUrl, "", 750_000),
        customCursorUrls: cursorSet,
        hotspotX: numberIn(cursor.hotspotX, DEFAULT_PROFILE_ASSETS.cursor.hotspotX, 0, 64),
        hotspotY: numberIn(cursor.hotspotY, DEFAULT_PROFILE_ASSETS.cursor.hotspotY, 0, 64),
      };
    })(),
    background: {
      style: choiceIn(
        background.style,
        ["solid", "gradient", "image", "video"] as const,
        DEFAULT_PROFILE_ASSETS.background.style,
      ),
      color: colorIn(background.color, DEFAULT_PROFILE_ASSETS.background.color),
      from: colorIn(background.from, DEFAULT_PROFILE_ASSETS.background.from),
      to: colorIn(background.to, DEFAULT_PROFILE_ASSETS.background.to),
      imageUrl: textIn(background.imageUrl, "", 2_500_000),
      videoUrl: textIn(background.videoUrl, "", 6_000_000),
      videoAudio: boolIn(background.videoAudio, false),
      videoVolume: numberIn(background.videoVolume, 0.5, 0, 1),
      saturation: numberIn(background.saturation, 1, 0, 2),
      contrast: numberIn(background.contrast, 1, .5, 2),
      positionX: numberIn(background.positionX, 50, 0, 100),
      positionY: numberIn(background.positionY, 50, 0, 100),
      fit: background.fit === "contain" ? "contain" : "cover",
      brightness: numberIn(background.brightness, 1, .3, 2),
      gradientAnim: choiceIn(background.gradientAnim, ["none", "shift", "pulse", "aurora", "sweep"] as const, "none"),
      angle: numberIn(background.angle, 160, 0, 360),
      blur: numberIn(background.blur, DEFAULT_PROFILE_ASSETS.background.blur, 0, 30),
      dim: numberIn(background.dim, DEFAULT_PROFILE_ASSETS.background.dim, 0, 0.85),
    },
    banner: {
      enabled: boolIn(banner.enabled, DEFAULT_PROFILE_ASSETS.banner.enabled),
      imageUrl: textIn(banner.imageUrl, "", 2_500_000),
      height: numberIn(banner.height, DEFAULT_PROFILE_ASSETS.banner.height, 110, 260),
      opacity: numberIn(banner.opacity, DEFAULT_PROFILE_ASSETS.banner.opacity, 0, 1),
    },
    audio: loadAudio(raw.audio),
    effects: {
      background: (() => {
        const legacyBackground: Record<string, BackgroundEffectId> = {
          snowstorm: "snow", dust: "storm", ashes: "storm", stars: "night",
        };
        const rawBackground = String(backgroundEffect.id ?? "");
        const id = choiceIn(
          legacyBackground[rawBackground] ?? rawBackground,
          BACKGROUND_EFFECTS.map((item) => item.id),
          DEFAULT_PROFILE_ASSETS.effects.background.id,
        );
        return {
          id,
          intensity: numberIn(
            backgroundEffect.intensity,
            DEFAULT_PROFILE_ASSETS.effects.background.intensity,
            0,
            100,
          ),
          speed: numberIn(
            backgroundEffect.speed,
            DEFAULT_PROFILE_ASSETS.effects.background.speed,
            2,
            24,
          ),
          color: colorIn(backgroundEffect.color, DEFAULT_PROFILE_ASSETS.effects.background.color),
          params: clampParamsFor(BACKGROUND_EFFECT_PARAM[id], backgroundEffect.params),
        };
      })(),
      overlay: (() => {
        const legacyOverlay: Record<string, OverlayEffectId> = {
          dither: "dotPattern", scanlines: "lines", fuzzy: "lines",
          vignette: "oldTv", stars: "oldTv", bloom: "none", chromatic: "crt",
          fog: "blurred", custom: "none", flash: "none", dust: "snowFall",
          rain: "snowFall", leaf: "snowFall", snowstorm: "snowFall",
          tv: "oldTv", night: "oldTv", nightTime: "oldTv", blur: "blurred", snow: "snowFall",
          dotted: "dotPattern", aurora: "none", grid: "gridLines", gridwave: "gridLines",
        };
        const rawOverlay = String(overlay.id ?? "");
        const id = choiceIn(
          OVERLAY_EFFECTS.some(item => item.id === rawOverlay) ? rawOverlay : legacyOverlay[rawOverlay] ?? rawOverlay,
          OVERLAY_EFFECTS.map((item) => item.id),
          DEFAULT_PROFILE_ASSETS.effects.overlay.id,
        );
        return {
          id,
          imageUrl: textIn(overlay.imageUrl, "", 1_000_000),
          opacity: numberIn(overlay.opacity, DEFAULT_PROFILE_ASSETS.effects.overlay.opacity, 0, 1),
          scale: numberIn(overlay.scale, DEFAULT_PROFILE_ASSETS.effects.overlay.scale, 0.5, 3),
          intensity: numberIn(overlay.intensity, DEFAULT_PROFILE_ASSETS.effects.overlay.intensity, 0, 100),
          speed: numberIn(overlay.speed, DEFAULT_PROFILE_ASSETS.effects.overlay.speed, 2, 24),
          color: colorIn(overlay.color, DEFAULT_PROFILE_ASSETS.effects.overlay.color),
          params: clampParamsFor(OVERLAY_EFFECT_PARAM[id], overlay.params),
        };
      })(),
      text: {
        alias: loadTextEffect(text.alias),
        name: loadTextEffect(text.name),
        bio: loadTextEffect(text.bio),
      },
    },
  };
}
