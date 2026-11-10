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
export type CursorStyle = "default" | "dot" | "ring" | "crosshair" | "glow" | "custom";
/** How the pointer trail is drawn. */
export type CursorTrailType = "dots" | "line" | "glow" | "comet";
export type ProfileBackgroundStyle = "solid" | "gradient" | "image" | "video";
/** Canvas background effects — the same twelve engines power both the
 *  behind-the-card layer and the above-everything overlay layer. */
export type BackgroundEffectId =
  | "none"
  | "snowstorm"
  | "stars"
  | "blur"
  | "night"
  | "tv"
  | "dither"
  | "fuzzy"
  | "flash"
  | "snow"
  | "rain"
  | "dust"
  | "leaf";
export type OverlayEffectId = BackgroundEffectId | "grain" | "scanlines" | "vignette" | "bloom" | "fog" | "chromatic" | "custom";
export type AudioStyle = "none" | "compact" | "lyrics" | "pill";
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
  | "shake";
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

export const TEXT_EFFECT_PARAM: Record<TextEffectId, EffectParamSpec | null> = {
  none: null,
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
  snowstorm: { kind: "slider", key: "gusts", label: "Wind gusts", min: 0, max: 100, step: 5, unit: "%", default: 50 },
  stars: { kind: "slider", key: "meteorRate", label: "Meteor rate", min: 0, max: 100, step: 5, unit: "%", default: 50 },
  blur: { kind: "slider", key: "extraBlur", label: "Extra blur", min: 0, max: 100, step: 5, unit: "%", default: 30 },
  night: { kind: "slider", key: "vignette", label: "Corner darkening", min: 0, max: 100, step: 5, unit: "%", default: 50 },
  tv: { kind: "slider", key: "scanlines", label: "Scanline strength", min: 0, max: 100, step: 5, unit: "%", default: 50 },
  dither: { kind: "slider", key: "pixel", label: "Pixel size", min: 0, max: 100, step: 5, unit: "%", default: 40 },
  fuzzy: { kind: "slider", key: "grain", label: "Grain size", min: 0, max: 100, step: 5, unit: "%", default: 50 },
  flash: { kind: "slider", key: "lightSize", label: "Light size", min: 0, max: 100, step: 5, unit: "%", default: 50 },
  snow: { kind: "slider", key: "drift", label: "Drift & sway", min: 0, max: 100, step: 5, unit: "%", default: 50 },
  rain: { kind: "slider", key: "slant", label: "Wind slant", min: 0, max: 100, step: 5, unit: "%", default: 40 },
  dust: { kind: "slider", key: "size", label: "Particle size", min: 0, max: 100, step: 5, unit: "%", default: 50 },
  leaf: { kind: "slider", key: "spin", label: "Spin & flip", min: 0, max: 100, step: 5, unit: "%", default: 50 },
};

export const OVERLAY_EFFECT_PARAM: Record<OverlayEffectId, EffectParamSpec | null> = {
  ...BACKGROUND_EFFECT_PARAM, grain: null, scanlines: null, vignette: null, bloom: null, fog: null, chromatic: null, custom: null,
};

export type DecorationSettings = {
  style: AvatarDecorationStyle;
  color: string;
  size: number;
  spin: boolean;
  /** Discord CDN avatar-decoration-preset URL (APNG overlay). */
  discordUrl?: string;
  /** Avatar zoom 0.5–2 */
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
  trailLength: number;
  imageUrl: string;
};

export type BackgroundSettings = {
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
  colorA: "#ffcfa8",
  colorB: "#a8e0ff",
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
    color: "#b4bffa",
    intensity: 70,
    speed: 6,
  },
  decoration: {
    style: "none",
    color: "#a8e0ff",
    size: 1,
    spin: false,
  },
  cursor: {
    style: "default",
    color: "#a8e0ff",
    size: 10,
    trail: false,
    trailType: "dots",
    trailLength: 5,
    imageUrl: "",
  },
  background: {
    style: "solid",
    color: "#0b0d10",
    from: "#0b0d10",
    to: "#16233a",
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
    style: "none",
    fileUrl: "",
    coverUrl: "",
    title: "",
    artist: "",
    lyrics: "",
    autoLyrics: true,
    cardOpacity: 0.92,
    accentColor: "#f2c9dd",
    size: 1,
    autoplay: true,
  },
  effects: {
    background: {
      id: "none",
      intensity: 50,
      speed: 9,
      color: "#a8e0ff",
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
  { id: "none", name: "None", hint: "No background motion" },
  { id: "snowstorm", name: "Snowstorm", hint: "Heavy wind-blown snow with drifting white haze" },
  { id: "stars", name: "Shooting Stars", hint: "Twinkling stars with streaking meteors" },
  { id: "blur", name: "Blurred Background", hint: "Softens whatever is behind the card" },
  { id: "night", name: "Night Time", hint: "Dark tint, twinkling stars, darker corners" },
  { id: "tv", name: "Old TV", hint: "CRT static, scanlines and a rolling light bar" },
  { id: "dither", name: "Dither", hint: "Retro 1-bit dot pattern in motion" },
  { id: "fuzzy", name: "Fuzzy", hint: "Soft shimmering coloured grain" },
  { id: "flash", name: "Flashlight", hint: "A warm light that follows the pointer" },
  { id: "snow", name: "Snow", hint: "Calm snowfall in three depths" },
  { id: "rain", name: "Rain", hint: "Slanted raindrops with tiny splashes" },
  { id: "dust", name: "Particles", hint: "Glowing dust that dodges the pointer" },
  { id: "leaf", name: "Leaf Fall", hint: "Autumn leaves that spin and sway as they fall" },
];

export const OVERLAY_EFFECTS: { id: OverlayEffectId; name: string; hint: string }[] = [
  { id: "none", name: "None", hint: "A clear page" },
  { id: "custom", name: "Custom image overlay", hint: "Your transparent image or animated GIF" },
  { id: "grain", name: "Film grain", hint: "Fine animated film texture" },
  { id: "scanlines", name: "Scanlines", hint: "Subtle CRT lines" },
  { id: "vignette", name: "Vignette", hint: "Soft dark corners" },
  { id: "bloom", name: "Soft bloom", hint: "A gentle coloured wash" },
  { id: "fog", name: "Drifting fog", hint: "Slow, translucent haze" },
  { id: "chromatic", name: "Chromatic edges", hint: "Coloured light at the edges" },
];

export const TEXT_EFFECTS: { id: TextEffectId; name: string; hint: string }[] = [
  { id: "none", name: "None", hint: "Plain text" },
  { id: "rgb", name: "RGB flow", hint: "Moving colour gradient" },
  { id: "wave", name: "Wave", hint: "Letters rise and fall" },
  { id: "typewriter", name: "Typewriter", hint: "Reveal letter by letter" },
  { id: "glow", name: "Glow", hint: "Soft coloured halo" },
  { id: "sparkle", name: "Sparkle", hint: "Fine glitter inside the letters" },
  { id: "shimmer", name: "Shimmer", hint: "Light sweeps across the letters" },
  { id: "glitch", name: "Glitch", hint: "Digital interference" },
  { id: "neon", name: "Neon", hint: "Bright tube glow" },
  { id: "bounce", name: "Bounce", hint: "Letters hop in sequence" },
  { id: "fade", name: "Fade", hint: "Smooth pulse in and out" },
  { id: "flicker", name: "Flicker", hint: "Broken neon flashing" },
  { id: "shake", name: "Shake", hint: "Rapid vibration" },
];

export const AUDIO_STYLES: { id: AudioStyle; name: string; hint: string }[] = [
  { id: "none", name: "None", hint: "No audio player shown" },
  { id: "compact", name: "Compact", hint: "One row: cover, title, transport, progress" },
  { id: "lyrics", name: "Lyrics", hint: "Custom or auto-fetched lyrics that follow playback" },
  { id: "pill", name: "Pill", hint: "A long bar with cover art and a track name that glides back and forth" },
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
  const effect = choiceIn(
    raw.effect,
    TEXT_EFFECTS.map((e) => e.id),
    DEFAULT_TEXT_EFFECT.effect,
  );
  return {
    effect,
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
    // Profiles saved with the old marquee/vinyl players land on the compact
    // one instead of silently losing their track.
    style: choiceIn(
      String(raw.style) === "marquee" || String(raw.style) === "vinyl"
        ? "compact"
        : raw.style,
      AUDIO_STYLES.map((item) => item.id),
      DEFAULT_PROFILE_ASSETS.audio.style,
    ),
    fileUrl: textIn(raw.fileUrl, DEFAULT_PROFILE_ASSETS.audio.fileUrl, 8_500_000),
    coverUrl: textIn(raw.coverUrl, "", 2_500_000),
    title: textIn(raw.title, DEFAULT_PROFILE_ASSETS.audio.title, 80),
    artist: textIn(raw.artist, DEFAULT_PROFILE_ASSETS.audio.artist, 80),
    lyrics: textIn(raw.lyrics, "", 40_000),
    autoLyrics: boolIn(raw.autoLyrics, DEFAULT_PROFILE_ASSETS.audio.autoLyrics),
    cardOpacity: numberIn(raw.cardOpacity, DEFAULT_PROFILE_ASSETS.audio.cardOpacity, 0, 1),
    accentColor: colorIn(raw.accentColor, DEFAULT_PROFILE_ASSETS.audio.accentColor),
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
  const cursorImage = textIn(cursor.imageUrl, "", 250_000);

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
      zoom: numberIn(decoration.zoom, 1, 0.5, 2),
      rotate: numberIn(decoration.rotate, 0, -180, 180),
    },
    cursor: {
      // The preset cursors were replaced by a single uploaded image. Migrate
      // old saved presets to either the custom image or the system cursor.
      style: cursorImage ? "custom" : "default",
      color: colorIn(cursor.color, DEFAULT_PROFILE_ASSETS.cursor.color),
      size: numberIn(cursor.size, DEFAULT_PROFILE_ASSETS.cursor.size, 4, 32),
      trail: boolIn(cursor.trail, DEFAULT_PROFILE_ASSETS.cursor.trail),
      trailType: choiceIn(
        cursor.trailType,
        ["dots", "line", "glow", "comet"] as const,
        DEFAULT_PROFILE_ASSETS.cursor.trailType,
      ),
      trailLength: numberIn(cursor.trailLength, DEFAULT_PROFILE_ASSETS.cursor.trailLength, 1, 24),
      imageUrl: cursorImage,
    },
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
        const id = choiceIn(
          backgroundEffect.id,
          BACKGROUND_EFFECTS.map((item) => item.id),
          DEFAULT_PROFILE_ASSETS.effects.background.id,
        );
        return {
          id,
          intensity: numberIn(
            backgroundEffect.intensity,
            DEFAULT_PROFILE_ASSETS.effects.background.intensity,
            8,
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
        const id = choiceIn(
          overlay.id,
          [...OVERLAY_EFFECTS.map((item) => item.id), ...BACKGROUND_EFFECTS.map((item) => item.id)],
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
