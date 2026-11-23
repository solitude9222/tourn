/* ---------------------------------------------------------------------------
   Badge system — platform badges, seasonal badges, Discord badges, and
   customisation (glow, monochrome, overlay colour, animation).

   All art is served from /public/badges — local files, not third-party CDN
   URLs — so a badge can never silently fail to load. A badge whose art has
   not been uploaded yet still renders as a tinted monogram (see BadgeRow),
   instead of a broken image.
   --------------------------------------------------------------------------- */

/* ── types ─────────────────────────────────────────────────── */

export type BadgeGroup = "platform" | "seasonal" | "discord";
export type BadgeAnimationStyle = "none" | "pulse" | "shimmer" | "spin" | "bounce";

export type BadgeDef = {
  id: string;
  name: string;
  description: string;
  /** How the badge is earned — shown to the account in the dashboard. */
  requirement: string;
  group: BadgeGroup;
  /** Animated local file under /public/badges. Empty = monogram fallback. */
  art: string;
  /** Static fallback for browsers that cannot animate the SVG. */
  artStatic?: string;
  /** Default tint colour for monochrome mode */
  color: string;
  /** Sold in the store instead of being unlocked by activity. */
  buyable?: boolean;
};

export type BadgeStyle = {
  animated: boolean;
  glow: boolean;
  glowColor: string;
  glowRadius: number;
  glowIntensity: number; // 0–100
  glowPulse: boolean;
  monochrome: boolean;
  monoColor: string;
  overlay: boolean;
  overlayColor: string;
  overlayStrength: number; // 0–100
  animation: BadgeAnimationStyle;
  size: number; // Fixed at 24px; retained for stored-document compatibility.
  /** Bumped when the size scale changes so old saved sizes migrate once. */
  sizeVersion?: number;
  /** The little shelf the badges sit on. */
  rowBackground: string;
  rowOpacity: number; // 0–1
  rowBorderColor: string;
  rowBorderOpacity: number; // 0–1
  rowBorderWidth: number; // px
  rowShadowColor: string;
  rowShadowOpacity: number; // 0–1
  rowShadowBlur: number; // px
  rowOffsetY: number; // px
  rowRadius: number; // px
  rowBlur: number; // px
  rowPadding: number; // px
  rowGap: number; // px
};

export type BadgeInstance = {
  automatic?: boolean;
  id: string;
  visible: boolean;
};

export type BadgeStore = {
  /** Which badges the user has equipped (ordered) */
  equipped: BadgeInstance[];
  /** Shared visual style applied to all badges */
  style: BadgeStyle;
};

/* ── defaults ──────────────────────────────────────────────── */

export const DEFAULT_BADGE_STYLE: BadgeStyle = {
  animated: true,
  glow: false,
  glowColor: "#8aa6ff",
  glowRadius: 12,
  glowIntensity: 60,
  glowPulse: false,
  monochrome: false,
  monoColor: "#8aa6ff",
  overlay: false,
  overlayColor: "#8aa6ff",
  overlayStrength: 50,
  // Badges carry a light sweep by default so they never look like flat stickers.
  animation: "none",
  size: 24,
  sizeVersion: 7,
  rowBackground: "#ffffff",
  rowOpacity: 0.07,
  rowBorderColor: "#ffffff",
  rowBorderOpacity: 0.12,
  rowBorderWidth: 1,
  rowShadowColor: "#000000",
  rowShadowOpacity: 0.32,
  rowShadowBlur: 18,
  rowOffsetY: 0,
  rowRadius: 999,
  rowBlur: 6,
  rowPadding: 7,
  rowGap: 6,
};

export const EMPTY_BADGE_STORE: BadgeStore = {
  equipped: [],
  style: { ...DEFAULT_BADGE_STYLE },
};

/** One-click finishes for the badge shelf, applied on top of the live style. */
export type BadgeRowPreset = {
  id: string;
  name: string;
  hint: string;
  style: Pick<
    BadgeStyle,
    | "rowBackground"
    | "rowOpacity"
    | "rowBorderColor"
    | "rowBorderOpacity"
    | "rowRadius"
    | "rowBlur"
    | "rowPadding"
    | "rowGap"
  >;
};

export const BADGE_ROW_PRESETS: BadgeRowPreset[] = [
  {
    id: "glass",
    name: "Glass",
    hint: "Soft translucent shelf",
    style: {
      rowBackground: "#ffffff",
      rowOpacity: 0.07,
      rowBorderColor: "#ffffff",
      rowBorderOpacity: 0.12,
      rowRadius: 999,
      rowBlur: 6,
      rowPadding: 7,
      rowGap: 6,
    },
  },
  {
    id: "solid",
    name: "Solid",
    hint: "Dark rounded panel",
    style: {
      rowBackground: "#0b0d10",
      rowOpacity: 0.82,
      rowBorderColor: "#ffffff",
      rowBorderOpacity: 0.08,
      rowRadius: 14,
      rowBlur: 0,
      rowPadding: 8,
      rowGap: 6,
    },
  },
  {
    id: "outline",
    name: "Outline",
    hint: "Border only, no fill",
    style: {
      rowBackground: "#ffffff",
      rowOpacity: 0,
      rowBorderColor: "#ffffff",
      rowBorderOpacity: 0.28,
      rowRadius: 999,
      rowBlur: 0,
      rowPadding: 8,
      rowGap: 6,
    },
  },
  {
    id: "bare",
    name: "Bare",
    hint: "No shelf at all",
    style: {
      rowBackground: "#000000",
      rowOpacity: 0,
      rowBorderColor: "#000000",
      rowBorderOpacity: 0,
      rowRadius: 0,
      rowBlur: 0,
      rowPadding: 0,
      rowGap: 4,
    },
  },
];

export const BADGE_ANIMATIONS: { id: BadgeAnimationStyle; name: string; hint: string }[] = [
  { id: "none", name: "None", hint: "Static" },
  { id: "pulse", name: "Pulse", hint: "Gentle breathing scale" },
  { id: "shimmer", name: "Shimmer", hint: "Light sweep across" },
  { id: "spin", name: "Spin", hint: "Slow rotation" },
  { id: "bounce", name: "Bounce", hint: "Small hop in place" },
];

/* ── icon files ────────────────────────────────────────────────
   The art lives in public/badges/icons. `art` is the animated SVG and
   `artStatic` is its still fallback; both are local so a badge cannot 404.
   ------------------------------------------------------------------------- */

const ANIMATED = "/badges/icons/animated";
const ICON = "/badges/icons/norm";

/** New badge ids are accepted too, while existing accounts keep old ids. */
export const BADGE_ALIASES: Record<string, string> = {
  "bug-hunter": "bughunter",
  donor: "donator",
  "server-booster": "booster",
  ivera: "user",
  winner: "event-winner",
  "second-place": "event-second",
  "third-place": "event-third",
  "christmas-2026": "christmas_2026",
  "early-supporter": "og",
  "easter-2026": "easter",
  "summer-2026": "summer",
  discord: "dc_indiscord",
};

export function canonicalBadgeId(id: string): string {
  return BADGE_ALIASES[id] ?? id;
}

/* ── platform badges (tourn.lol's own) ─────────────────────── */

const PLATFORM: BadgeDef[] = [
  { id: "owner", name: "Owner", description: "Platform creator", requirement: "Automatic: given to the account that owns tourn.lol.", group: "platform", art: `${ANIMATED}/owner.svg`, artStatic: `${ICON}/owner.svg`, color: "#ffdf00" },
  { id: "staff", name: "Staff", description: "Core team member", requirement: "Automatic: your account has the admin flag.", group: "platform", art: `${ANIMATED}/staff.svg`, artStatic: `${ICON}/staff.svg`, color: "#8579ef" },
  { id: "helper", name: "Helper", description: "Active community helper", requirement: "Granted by staff for helping members in the tourn.lol Discord.", group: "platform", art: `${ANIMATED}/helper.svg`, artStatic: `${ICON}/helper.svg`, color: "#e8a43c" },
  { id: "premium", name: "Premium", description: "Supporter with premium perks", requirement: "Automatic: Premium is active on your account.", group: "platform", art: `${ANIMATED}/premium.svg`, artStatic: `${ICON}/premium.svg`, color: "#ffad0d" },
  { id: "verified", name: "Verified", description: "Officially verified user", requirement: "Granted by staff — ask in the Discord if you're a notable creator.", group: "platform", art: `${ANIMATED}/verified.svg`, artStatic: `${ICON}/verified.svg`, color: "#3275f3" },
  { id: "donator", name: "Donor", description: "Donated to keep the site running", requirement: "Granted by staff after a donation.", group: "platform", art: `${ANIMATED}/donor.svg`, artStatic: `${ICON}/donor.svg`, color: "#1fc46b" },
  { id: "gifter", name: "Gifter", description: "Gifted a product to someone", requirement: "Automatic: transfer a username or product to another member.", group: "platform", art: `${ANIMATED}/gifter.svg`, artStatic: `${ICON}/gifter.svg`, color: "#ffa51f" },
  { id: "og", name: "OG", description: "Early supporter of tourn.lol", requirement: "Automatic: one of the first 100 accounts on tourn.lol.", group: "platform", art: `${ANIMATED}/og.svg`, artStatic: `${ICON}/og.svg`, color: "#91df2a" },
  { id: "booster", name: "Server Booster", description: "Boosted the tourn.lol Discord", requirement: "Granted by staff to Discord server boosters.", group: "platform", art: `${ANIMATED}/server-booster.svg`, artStatic: `${ICON}/server-booster.svg`, color: "#b66bd1" },
  { id: "bughunter", name: "Bug Hunter", description: "Found and reported a real bug", requirement: "Granted by staff for a reproducible bug report.", group: "platform", art: `${ANIMATED}/bug-hunter.svg`, artStatic: `${ICON}/bug-hunter.svg`, color: "#3ecf5a" },
  { id: "user", name: "Active User", description: "Part of the tourn.lol community", requirement: "Automatic: account is 30+ days old with a bio of at least 20 characters.", group: "platform", art: `${ANIMATED}/ivera.svg`, artStatic: `${ICON}/ivera.svg`, color: "#f5c518" },
];

/* ── seasonal badges ───────────────────────────────────────── */

/* ── platform badges: store drops and staff grants ─────────── */

const EXTRA: BadgeDef[] = [
  { id: "partner", name: "Partner", description: "Official platform partner", requirement: "Granted by staff to official partners.", group: "platform", art: `${ICON}/parnter.png`, color: "#60a5fa" },
  { id: "coder", name: "Coder", description: "Contributed code", requirement: "Automatic: publish a profile with a GitHub link or GitHub widget.", group: "platform", art: `${ICON}/coder.gif`, color: "#22c55e" },
  { id: "newbie", name: "Newbie", description: "Joined recently", requirement: "Automatic for your first 7 days, then it retires.", group: "platform", art: `${ICON}/newbie.png`, color: "#8aa6ff" },
  { id: "developer", name: "Developer", description: "Built tourn.lol", requirement: "Granted by staff to the people who build and maintain tourn.lol.", group: "platform", art: `${ICON}/developer.svg`, color: "#7ecac8" },
  { id: "administrator", name: "Administrator", description: "Runs the platform", requirement: "Automatic: your account has the admin flag.", group: "platform", art: `${ICON}/administrator.svg`, color: "#89a9f8" },
  { id: "event-winner", name: "Winner", description: "Won a tourn.lol event", requirement: "Granted by staff for winning an event.", group: "platform", art: `${ANIMATED}/winner.svg`, artStatic: `${ICON}/winner.svg`, color: "#ffc21f" },
  { id: "event-second", name: "Second Place", description: "Placed second in an event", requirement: "Granted by staff for second place in an event.", group: "platform", art: `${ANIMATED}/second-place.svg`, artStatic: `${ICON}/second-place.svg`, color: "#c0c0c0" },
  { id: "event-third", name: "Third Place", description: "Placed third in an event", requirement: "Granted by staff for third place in an event.", group: "platform", art: `${ANIMATED}/third-place.svg`, artStatic: `${ICON}/third-place.svg`, color: "#d9822b" },
  { id: "beta-tester", name: "Beta Tester", description: "Tested the beta", requirement: "Granted by staff to accounts that tested an early build.", group: "platform", art: `${ICON}/beta-tester.svg`, color: "#46d6e4" },
  { id: "inviter", name: "Inviter", description: "Brought 5 people in", requirement: "Granted by staff once you bring in 5 members.", group: "platform", art: `${ICON}/inviter.svg`, color: "#ca6ce7" },
  { id: "server-tag", name: "Server Tag", description: "Wears the server tag", requirement: "Automatic: staff attach this badge to your Discord role in the automation rules.", group: "platform", art: `${ICON}/server-tag.svg`, color: "#d7e84e" },
  { id: "innovator", name: "Innovator", description: "Shaped the product", requirement: "Granted by staff when your feature suggestion ships.", group: "platform", art: `${ICON}/innovator.svg`, color: "#5dcdb9" },
  { id: "orion", name: "Orion", description: "Four store purchases", requirement: "Automatic: redeem four store purchases on this account.", group: "platform", art: `${ICON}/orion.svg`, color: "#c084fc" },
  { id: "the-million", name: "The Million", description: "Celebrated 1M members", requirement: "Granted by staff when tourn.lol reached one million members.", group: "platform", art: `${ANIMATED}/the-million.svg`, artStatic: `${ICON}/the-million.svg`, color: "#27d3c0" },
];

const SEASONAL: BadgeDef[] = [
  { id: "halloween_2026", name: "Halloween 2026", description: "Celebrated Halloween 2026", requirement: "Buy it from the store — it lands on your account as soon as the order confirms.", group: "seasonal", art: `${ICON}/hallowen.gif`, color: "#f97316", buyable: true },
  { id: "christmas-2025", name: "Christmas 2025", description: "Exclusive badge from the 2025 winter sale", requirement: "Buy it from the store — it lands on your account as soon as the order confirms.", group: "seasonal", art: `${ANIMATED}/christmas-2025.svg`, artStatic: `${ICON}/christmas-2025.svg`, color: "#6fc3ff", buyable: true },
  { id: "christmas_2026", name: "Christmas 2026", description: "Exclusive badge from the 2026 winter sale", requirement: "Buy it from the store — it lands on your account as soon as the order confirms.", group: "seasonal", art: `${ANIMATED}/christmas-2026.svg`, artStatic: `${ICON}/christmas-2026.svg`, color: "#79b8e9", buyable: true },
  { id: "easter-2025", name: "Easter 2025", description: "Exclusive badge from the 2025 Easter sale", requirement: "Buy it from the store — it lands on your account as soon as the order confirms.", group: "seasonal", art: `${ANIMATED}/easter-2025.svg`, artStatic: `${ICON}/easter-2025.svg`, color: "#ff9ccf", buyable: true },
  { id: "easter", name: "Easter 2026", description: "Exclusive badge from the 2026 Easter sale", requirement: "Buy it from the store — it lands on your account as soon as the order confirms.", group: "seasonal", art: `${ANIMATED}/easter-2026.svg`, artStatic: `${ICON}/easter-2026.svg`, color: "#8b7bff", buyable: true },
  { id: "autumn", name: "Autumn", description: "Seasonal Autumn badge", requirement: "Buy it from the store — it lands on your account as soon as the order confirms.", group: "seasonal", art: `${ICON}/autumn.svg`, color: "#fb923c", buyable: true },
  { id: "summer", name: "Summer 2026", description: "Exclusive badge from the 2026 summer sale", requirement: "Buy it from the store — it lands on your account as soon as the order confirms.", group: "seasonal", art: `${ANIMATED}/summer-2026.svg`, artStatic: `${ICON}/summer-2026.svg`, color: "#ffd21f", buyable: true },
];

/* ── Discord badges — local art (reliable, never 404s) ─────── */

const DISCORD: BadgeDef[] = [
  { id: "dc_indiscord", name: "Discord", description: "Member of the Discord community", requirement: "Automatic: the bot sees your Discord account in the tourn.lol server.", group: "discord", art: `${ANIMATED}/discord.svg`, artStatic: `${ICON}/discord.svg`, color: "#5865f2" },
];

/* ── full catalogue ────────────────────────────────────────── */

export const BADGE_CATALOGUE: BadgeDef[] = [...PLATFORM, ...EXTRA, ...SEASONAL, ...DISCORD].map(badge => ({...badge, art: `/badges/icons/motion/${badge.id}.svg`, artStatic: `/badges/icons/motion/still/${badge.id}.svg`}));
/** Unlocked by activity, dates or staff. */
export const EARNABLE_BADGES: BadgeDef[] = BADGE_CATALOGUE.filter((badge) => !badge.buyable);
/** Bought from the store and granted on delivery. */
export const BUYABLE_BADGES: BadgeDef[] = BADGE_CATALOGUE.filter((badge) => badge.buyable);
export const BADGE_MAP = new Map(BADGE_CATALOGUE.map((b) => [b.id, b]));

/** Admins hold the whole catalogue automatically; everyone else gets theirs. */
export function ownedWithAdmin(earned: string[], isAdmin: boolean): string[] {
  const set = new Set(earned.map(canonicalBadgeId));
  if (!isAdmin) return [...set];
  for (const badge of BADGE_CATALOGUE) set.add(badge.id);
  return [...set];
}

export function badgeDef(id: string): BadgeDef | undefined {
  return BADGE_MAP.get(canonicalBadgeId(id));
}

/* ── persistence ───────────────────────────────────────────── */

function clamp(v: unknown, fallback: number, min: number, max: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
function hex(v: unknown, fallback: string): string {
  return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function animIn(v: unknown, fallback: BadgeAnimationStyle): BadgeAnimationStyle {
  return BADGE_ANIMATIONS.some((a) => a.id === v) ? (v as BadgeAnimationStyle) : fallback;
}

/** Coerce anything (a saved document, a server payload) into a safe BadgeStore. */
export function normalizeBadgeStore(input: unknown): BadgeStore {
  try {
    const parsed = (input ?? {}) as Partial<BadgeStore>;
    const style = (parsed.style ?? {}) as Partial<BadgeStyle>;
    // A single 24px scale replaces every legacy shrink/minimize setting.
    const seen = new Set<string>();
    const equipped = Array.isArray(parsed.equipped)
      ? parsed.equipped
          .filter((e): e is BadgeInstance => Boolean(e && typeof e === "object" && typeof e.id === "string"))
          .map((e) => ({ id: canonicalBadgeId(e.id), visible: e.visible !== false, ...(e.automatic ? { automatic: true } : {}) }))
          .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
      : [];
    return {
      equipped,
      style: {
        animated: bool(style.animated, true),
        glow: bool(style.glow, DEFAULT_BADGE_STYLE.glow),
        glowColor: hex(style.glowColor, DEFAULT_BADGE_STYLE.glowColor),
        glowRadius: clamp(style.glowRadius, 12, 0, 48),
        glowIntensity: clamp(style.glowIntensity, DEFAULT_BADGE_STYLE.glowIntensity, 0, 100),
        glowPulse: bool(style.glowPulse, DEFAULT_BADGE_STYLE.glowPulse),
        monochrome: bool(style.monochrome, DEFAULT_BADGE_STYLE.monochrome),
        monoColor: hex(style.monoColor, DEFAULT_BADGE_STYLE.monoColor),
        overlay: bool(style.overlay, DEFAULT_BADGE_STYLE.overlay),
        overlayColor: hex(style.overlayColor, DEFAULT_BADGE_STYLE.overlayColor),
        overlayStrength: clamp(style.overlayStrength, DEFAULT_BADGE_STYLE.overlayStrength, 0, 100),
        animation: animIn(style.animation, DEFAULT_BADGE_STYLE.animation),
        size: 24,
        sizeVersion: 7,
        rowBackground: hex(style.rowBackground, DEFAULT_BADGE_STYLE.rowBackground),
        rowOpacity: clamp(style.rowOpacity, DEFAULT_BADGE_STYLE.rowOpacity, 0, 1),
        rowBorderColor: hex(style.rowBorderColor, DEFAULT_BADGE_STYLE.rowBorderColor),
        rowBorderOpacity: clamp(style.rowBorderOpacity, DEFAULT_BADGE_STYLE.rowBorderOpacity, 0, 1),
        rowBorderWidth: clamp(style.rowBorderWidth, DEFAULT_BADGE_STYLE.rowBorderWidth, 0, 6),
        rowShadowColor: hex(style.rowShadowColor, DEFAULT_BADGE_STYLE.rowShadowColor),
        rowShadowOpacity: clamp(style.rowShadowOpacity, DEFAULT_BADGE_STYLE.rowShadowOpacity, 0, 1),
        rowShadowBlur: clamp(style.rowShadowBlur, DEFAULT_BADGE_STYLE.rowShadowBlur, 0, 48),
        rowOffsetY: clamp(style.rowOffsetY, DEFAULT_BADGE_STYLE.rowOffsetY, -24, 24),
        rowRadius: clamp(style.rowRadius, DEFAULT_BADGE_STYLE.rowRadius, 0, 999),
        rowBlur: clamp(style.rowBlur, DEFAULT_BADGE_STYLE.rowBlur, 0, 30),
        rowPadding: clamp(style.rowPadding, DEFAULT_BADGE_STYLE.rowPadding, 0, 18),
        rowGap: clamp(style.rowGap, DEFAULT_BADGE_STYLE.rowGap, 0, 18),
      },
    };
  } catch {
    return { ...EMPTY_BADGE_STORE, equipped: [], style: { ...DEFAULT_BADGE_STYLE } };
  }
}

export function loadBadgeStore(userId: string): BadgeStore {
  try {
    const raw = localStorage.getItem(`tourn.lol/badges/v1/${userId}`);
    if (!raw) return { ...EMPTY_BADGE_STORE, equipped: [], style: { ...DEFAULT_BADGE_STYLE } };
    return normalizeBadgeStore(JSON.parse(raw));
  } catch {
    return { ...EMPTY_BADGE_STORE, equipped: [], style: { ...DEFAULT_BADGE_STYLE } };
  }
}

export function saveBadgeStore(userId: string, store: BadgeStore): void {
  try {
    localStorage.setItem(`tourn.lol/badges/v1/${userId}`, JSON.stringify(store));
  } catch { /* private mode */ }
}
