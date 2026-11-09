export type DiscordBadgeKind =
  | "staff"
  | "partner"
  | "hypesquad"
  | "bug"
  | "early"
  | "developer"
  | "moderator"
  | "bot"
  | "bravery"
  | "brilliance"
  | "balance";

export type DiscordBadge = {
  kind: DiscordBadgeKind;
  label: string;
  flag: number;
  /** Official Discord badge artwork, served locally so it can't break. */
  art?: string;
};

/**
 * Discord public flags. These are the only badges a public user payload can
 * expose — Nitro and booster badges are intentionally not shown because they
 * are not part of `public_flags`.
 */
const BADGES: DiscordBadge[] = [
  { kind: "staff", label: "Discord Staff", flag: 1 << 0, art: "/badges/discord/staff.svg" },
  {
    kind: "partner",
    label: "Partnered Server Owner",
    flag: 1 << 1,
    art: "/badges/discord/partnered_server_owner.svg",
  },
  {
    kind: "hypesquad",
    label: "HypeSquad Events",
    flag: 1 << 2,
    art: "/badges/discord/hypesquad_events.svg",
  },
  {
    kind: "bug",
    label: "Bug Hunter",
    flag: 1 << 3,
    art: "/badges/discord/bug_hunter_level_1.svg",
  },
  {
    kind: "bravery",
    label: "HypeSquad Bravery",
    flag: 1 << 6,
    art: "/badges/discord/hypesquad_bravery.svg",
  },
  {
    kind: "brilliance",
    label: "HypeSquad Brilliance",
    flag: 1 << 7,
    art: "/badges/discord/hypesquad_brilliance.svg",
  },
  {
    kind: "balance",
    label: "HypeSquad Balance",
    flag: 1 << 8,
    art: "/badges/discord/hypesquad_balance.svg",
  },
  {
    kind: "early",
    label: "Early Supporter",
    flag: 1 << 9,
    art: "/badges/discord/early_supporter.svg",
  },
  {
    kind: "bug",
    label: "Bug Hunter Gold",
    flag: 1 << 14,
    art: "/badges/discord/bug_hunter_level_2.svg",
  },
  // Discord exposes a flag for verified bots but has no badge artwork for it
  // in the profile badge set, so this one keeps the local robot icon.
  { kind: "bot", label: "Verified Bot", flag: 1 << 16 },
  {
    kind: "developer",
    label: "Early Verified Bot Developer",
    flag: 1 << 17,
    art: "/badges/discord/early_verified_developer.svg",
  },
  {
    kind: "moderator",
    label: "Certified Moderator",
    flag: 1 << 18,
    art: "/badges/discord/certified_moderator.svg",
  },
  {
    kind: "developer",
    label: "Active Developer",
    flag: 1 << 22,
    art: "/badges/discord/active_developer.svg",
  },
];

export function discordBadges(flags: number | null | undefined): DiscordBadge[] {
  if (!flags) return [];
  return BADGES.filter((badge) => (flags & badge.flag) === badge.flag);
}

export type DiscordPrimaryGuild = {
  identity_guild_id?: string;
  identity_enabled?: boolean;
  tag?: string;
  badge?: string;
} | null | undefined;

/**
 * Some servers set their tag to characters that draw nothing — combining marks
 * and Arabic diacritics such as `ٴٴٴ` — so the plaque shows the server's badge
 * next to an empty gap. Those tags are not text: strip the marks and, if
 * nothing readable is left, report no tag so the card shows just the badge.
 */
const INVISIBLE_TAG_CHARS =
  /[\u0300-\u036F\u0610-\u061A\u064B-\u065F\u0670\u0674\u06D6-\u06ED\u1AB0-\u1AFF\u1DC0-\u1DFF\u200B-\u200F\u202A-\u202E\u2060-\u2064\u206A-\u206F\u20D0-\u20FF\uFE00-\uFE0F\uFE20-\uFE2F\uFEFF]/g;

export function readableGuildTag(tag: string | null | undefined): string | null {
  if (!tag) return null;
  const visible = tag.replace(INVISIBLE_TAG_CHARS, "").trim();
  if (!visible) return null;
  return tag.trim();
}

/** The tag shown next to a display name, e.g. `TOURN`. */
export function primaryGuildTag(guild: DiscordPrimaryGuild): string | null {
  if (!guild?.identity_enabled) return null;
  return readableGuildTag(guild.tag);
}

/** The guild id backing the tag, used when the card needs the raw id. */
export function primaryGuildId(guild: DiscordPrimaryGuild): string | null {
  return guild?.identity_guild_id || null;
}

/**
 * The real tag badge Discord draws to the left of a server tag. It is keyed by
 * the guild id and the badge hash, so it is a stable CDN URL rather than a
 * guess — and it renders even when the tag's letters are invisible.
 */
export function guildTagBadge(guild: DiscordPrimaryGuild): string | null {
  // The badge hash and guild id are what the CDN needs; `identity_enabled`
  // only says whether the member currently shows the tag, and requiring it
  // hid the badge on accounts that still carry one.
  if (!guild) return null;
  const badge = guild.badge;
  const guildId = guild.identity_guild_id;
  if (!badge) return null;
  if (badge.startsWith("http")) return badge;
  if (!guildId) return null;
  return `https://cdn.discordapp.com/guild-tag-badges/${guildId}/${badge}.png?size=32`;
}
