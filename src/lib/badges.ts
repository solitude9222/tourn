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
  /** Local file under /public/badges. Empty = monogram fallback. */
  art: string;
  /** Default tint colour for monochrome mode */
  color: string;
  /** Sold in the store instead of being unlocked by activity. */
  buyable?: boolean;
};

export type BadgeStyle = {
  glow: boolean;
  glowColor: string;
  glowIntensity: number; // 0–100
  glowPulse: boolean;
  monochrome: boolean;
  monoColor: string;
  overlay: boolean;
  overlayColor: string;
  overlayStrength: number; // 0–100
  animation: BadgeAnimationStyle;
  size: number; // 14–32px
  /** The little shelf the badges sit on. */
  rowBackground: string;
  rowOpacity: number; // 0–1
  rowBorderColor: string;
  rowBorderOpacity: number; // 0–1
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
  glow: false,
  glowColor: "#b4bffa",
  glowIntensity: 60,
  glowPulse: false,
  monochrome: false,
  monoColor: "#b4bffa",
  overlay: false,
  overlayColor: "#b4bffa",
  overlayStrength: 50,
  // Badges carry a light sweep by default so they never look like flat stickers.
  animation: "shimmer",
  size: 22,
  rowBackground: "#ffffff",
  rowOpacity: 0.07,
  rowBorderColor: "#ffffff",
  rowBorderOpacity: 0.12,
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
   The art lives in public/badges/icons/norm. The catalogue below is the
   single source of truth for what exists there — every path is a real file.
   ------------------------------------------------------------------------- */

const ICON = "/badges/icons/norm";

/* ── platform badges (tourn.lol's own) ─────────────────────── */

const PLATFORM: BadgeDef[] = [
  { id: "owner", name: "Owner", description: "Platform creator", requirement: "Automatic: given to the account that owns tourn.lol.", group: "platform", art: `${ICON}/owner.gif`, color: "#b4bffa" },
  { id: "staff", name: "Staff", description: "Core team member", requirement: "Automatic: your account has the admin flag.", group: "platform", art: `${ICON}/staffteam.png`, color: "#38bdf8" },
  { id: "verified", name: "Verified", description: "Officially verified user", requirement: "Granted by staff — ask in the Discord if you're a notable creator.", group: "platform", art: `${ICON}/verifed.png`, color: "#b4bffa" },
  { id: "partner", name: "Partner", description: "Official platform partner", requirement: "Granted by staff to official partners.", group: "platform", art: `${ICON}/parnter.png`, color: "#60a5fa" },
  { id: "donator", name: "Donator", description: "Donated to keep the site running", requirement: "Granted by staff after a donation.", group: "platform", art: `${ICON}/donator.gif`, color: "#fbbf24" },
  { id: "coder", name: "Coder", description: "Contributed code", requirement: "Automatic: publish a profile with a GitHub link or GitHub widget.", group: "platform", art: `${ICON}/coder.gif`, color: "#22c55e" },
  { id: "bughunter", name: "Bug Hunter", description: "Found and reported a real bug", requirement: "Granted by staff for a reproducible bug report.", group: "platform", art: `${ICON}/bughunter.png`, color: "#a3e635" },
  { id: "newbie", name: "Newbie", description: "Joined recently", requirement: "Automatic for your first 7 days, then it retires.", group: "platform", art: `${ICON}/newbie.png`, color: "#b4bffa" },
  { id: "user", name: "Active User", description: "Long-time active member", requirement: "Automatic: account is 30+ days old with a bio of at least 20 characters.", group: "platform", art: `${ICON}/iverauser.gif`, color: "#b4bffa" },
  { id: "premium", name: "Premium", description: "Supporter with premium perks", requirement: "Automatic: Premium is active on your account.", group: "platform", art: `${ICON}/premium.svg`, color: "#f472b6" },
  { id: "booster", name: "Booster", description: "Server booster", requirement: "Granted by staff to Discord server boosters.", group: "platform", art: `${ICON}/booster.png`, color: "#f472b6" },
];

/* ── seasonal badges ───────────────────────────────────────── */

/* ── platform badges: store drops and staff grants ─────────── */

const EXTRA: BadgeDef[] = [
  { id: "developer", name: "Developer", description: "Built tourn.lol", requirement: "Granted by staff to the people who build and maintain tourn.lol.", group: "platform", art: `${ICON}/developer.svg`, color: "#7dd3fc" },
  { id: "administrator", name: "Administrator", description: "Runs the platform", requirement: "Automatic: your account has the admin flag.", group: "platform", art: `${ICON}/administrator.svg`, color: "#f87171" },
  { id: "gifter", name: "Gifter", description: "Gifted a product to someone", requirement: "Automatic: transfer a username or product to another member.", group: "platform", art: `${ICON}/gifter.svg`, color: "#f472b6" },
  { id: "event-winner", name: "Winner", description: "Won a tourn.lol event", requirement: "Granted by staff for winning an event.", group: "platform", art: `${ICON}/event-winner.svg`, color: "#fbbf24" },
  { id: "event-second", name: "Second Place", description: "Placed second in an event", requirement: "Granted by staff for second place in an event.", group: "platform", art: `${ICON}/event-second.svg`, color: "#cbd5e1" },
  { id: "event-third", name: "Third Place", description: "Placed third in an event", requirement: "Granted by staff for third place in an event.", group: "platform", art: `${ICON}/event-third.svg`, color: "#d97706" },
  { id: "beta-tester", name: "Beta Tester", description: "Tested the beta", requirement: "Granted by staff to accounts that tested an early build.", group: "platform", art: `${ICON}/beta-tester.svg`, color: "#a3e635" },
  { id: "early-supporter", name: "Early Supporter", description: "Joined at the start", requirement: "Automatic: one of the first 100 accounts on tourn.lol.", group: "platform", art: `${ICON}/early-supporter.svg`, color: "#f0abfc" },
  { id: "inviter", name: "Inviter", description: "Brought 5 people in", requirement: "Granted by staff once you bring in 5 members.", group: "platform", art: `${ICON}/inviter.svg`, color: "#34d399" },
  { id: "server-tag", name: "Server Tag", description: "Wears the server tag", requirement: "Automatic: staff attach this badge to your Discord role in the automation rules.", group: "platform", art: `${ICON}/server-tag.svg`, color: "#5865f2" },
  { id: "innovator", name: "Innovator", description: "Shaped the product", requirement: "Granted by staff when your feature suggestion ships.", group: "platform", art: `${ICON}/innovator.svg`, color: "#22d3ee" },
  { id: "orion", name: "Orion", description: "Four store purchases", requirement: "Automatic: redeem four store purchases on this account.", group: "platform", art: `${ICON}/orion.svg`, color: "#c084fc" },
];

const SEASONAL: BadgeDef[] = [
  { id: "halloween_2026", name: "Halloween 2026", description: "Celebrated Halloween 2026", requirement: "Buy it from the store — it lands on your account as soon as the order confirms.", group: "seasonal", art: `${ICON}/hallowen.gif`, color: "#f97316", buyable: true },
  { id: "christmas_2026", name: "Christmas 2026", description: "Celebrated Christmas 2026", requirement: "Buy it from the store — it lands on your account as soon as the order confirms.", group: "seasonal", art: `${ICON}/christmas.gif`, color: "#dc2626", buyable: true },
  { id: "easter", name: "Easter", description: "Seasonal Easter badge", requirement: "Buy it from the store — it lands on your account as soon as the order confirms.", group: "seasonal", art: `${ICON}/easter.svg`, color: "#f9a8d4", buyable: true },
  { id: "autumn", name: "Autumn", description: "Seasonal Autumn badge", requirement: "Buy it from the store — it lands on your account as soon as the order confirms.", group: "seasonal", art: `${ICON}/autumn.svg`, color: "#fb923c", buyable: true },
  { id: "summer", name: "Summer", description: "Seasonal Summer badge", requirement: "Buy it from the store — it lands on your account as soon as the order confirms.", group: "seasonal", art: `${ICON}/summer.svg`, color: "#facc15", buyable: true },
];

/* ── Discord badges — local art (reliable, never 404s) ─────── */

const DISCORD: BadgeDef[] = [
  { id: "dc_indiscord", name: "Discord Member", description: "Member of the Discord community", requirement: "Automatic: the bot sees your Discord account in the tourn.lol server.", group: "discord", art: `${ICON}/discord.gif`, color: "#5865f2" },
];

/* ── full catalogue ────────────────────────────────────────── */

export const BADGE_CATALOGUE: BadgeDef[] = [...PLATFORM, ...EXTRA, ...SEASONAL, ...DISCORD];
/** Unlocked by activity, dates or staff. */
export const EARNABLE_BADGES: BadgeDef[] = BADGE_CATALOGUE.filter((badge) => !badge.buyable);
/** Bought from the store and granted on delivery. */
export const BUYABLE_BADGES: BadgeDef[] = BADGE_CATALOGUE.filter((badge) => badge.buyable);
export const BADGE_MAP = new Map(BADGE_CATALOGUE.map((b) => [b.id, b]));

/** Admins hold the whole catalogue automatically; everyone else gets theirs. */
export function ownedWithAdmin(earned: string[], isAdmin: boolean): string[] {
  if (!isAdmin) return earned;
  const set = new Set(earned);
  for (const badge of BADGE_CATALOGUE) set.add(badge.id);
  return [...set];
}

export function badgeDef(id: string): BadgeDef | undefined {
  return BADGE_MAP.get(id);
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
    const equipped = Array.isArray(parsed.equipped)
      ? parsed.equipped
          .filter((e): e is BadgeInstance => Boolean(e && typeof e === "object" && typeof e.id === "string"))
          .map((e) => ({ id: e.id, visible: e.visible !== false, ...(e.automatic ? { automatic: true } : {}) }))
      : [];
    return {
      equipped,
      style: {
        glow: bool(style.glow, DEFAULT_BADGE_STYLE.glow),
        glowColor: hex(style.glowColor, DEFAULT_BADGE_STYLE.glowColor),
        glowIntensity: clamp(style.glowIntensity, DEFAULT_BADGE_STYLE.glowIntensity, 0, 100),
        glowPulse: bool(style.glowPulse, DEFAULT_BADGE_STYLE.glowPulse),
        monochrome: bool(style.monochrome, DEFAULT_BADGE_STYLE.monochrome),
        monoColor: hex(style.monoColor, DEFAULT_BADGE_STYLE.monoColor),
        overlay: bool(style.overlay, DEFAULT_BADGE_STYLE.overlay),
        overlayColor: hex(style.overlayColor, DEFAULT_BADGE_STYLE.overlayColor),
        overlayStrength: clamp(style.overlayStrength, DEFAULT_BADGE_STYLE.overlayStrength, 0, 100),
        animation: animIn(style.animation, DEFAULT_BADGE_STYLE.animation),
        size: clamp(style.size, DEFAULT_BADGE_STYLE.size, 14, 32),
        rowBackground: hex(style.rowBackground, DEFAULT_BADGE_STYLE.rowBackground),
        rowOpacity: clamp(style.rowOpacity, DEFAULT_BADGE_STYLE.rowOpacity, 0, 1),
        rowBorderColor: hex(style.rowBorderColor, DEFAULT_BADGE_STYLE.rowBorderColor),
        rowBorderOpacity: clamp(style.rowBorderOpacity, DEFAULT_BADGE_STYLE.rowBorderOpacity, 0, 1),
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
