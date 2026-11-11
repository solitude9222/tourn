export type DiscordBadgeKind =
  | "staff"
  | "partner"
  | "hypesquad"
  | "bug"
  | "early"
  | "developer"
  | "moderator"
  | "active"
  | "bot"
  | "bravery"
  | "brilliance"
  | "balance"
  | "profile";

export type DiscordBadge = {
  stage?: number;
  count?: string;
  kind: DiscordBadgeKind;
  label: string;
  flag: number;
  /** Official Discord badge artwork, served locally so it can't break. */
  art?: string;
};

export type DiscordBadgeStage = {
  /** 1-based evolution level, stored in the widget option string. */
  level: number;
  name: string;
  /** Threshold or unlock text shown in the picker, e.g. "3 years". */
  requirement: string;
};

export type AdditionalDiscordBadge = {
  id: string;
  label: string;
  art: string;
  /** Real Discord evolution tiers. Single-tier badges keep one entry. */
  stages: DiscordBadgeStage[];
  countLabel?: string;
  countPlaceholder?: string;
  countHint?: string;
};

const badgeStage = (
  level: number,
  name: string,
  requirement: string,
): DiscordBadgeStage => ({ level, name, requirement });

/**
 * Extra display badges are only meaningful for a Discord user profile. A
 * server invite or a bot application has no user badge set, so the picker
 * should not offer fake tiers there.
 */
export function isDiscordUserId(input: unknown): boolean {
  const value = String(input ?? "").trim();
  if (/^\d{15,21}$/.test(value)) return true;
  return /(?:discord(?:app)?\.com\/users\/)(\d{15,21})(?:[/?#]|$)/i.test(value);
}

/**
 * Discord public flags. These are the only badges a public user payload can
 * expose. Extra profile data and additional display choices are handled
 * separately because newer badges are not part of `public_flags`.
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
    label: "Bug Hunter Silver",
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
    label: "Moderator Program Alumni",
    flag: 1 << 18,
    art: "/badges/discord/certified_moderator.svg",
  },
  {
    kind: "active",
    label: "Active Developer",
    flag: 1 << 22,
    art: "/badges/discord/active_developer.svg",
  },
];

export function discordBadges(flags: number | null | undefined): DiscordBadge[] {
  if (!flags) return [];
  return BADGES.filter((badge) => (flags & badge.flag) === badge.flag);
}

/**
 * Real Discord profile-badge evolution tiers. Discord publishes the badge
 * meanings in its support guide and the exact progression in the in-app Badge
 * Directory; the community badge archive mirrors those thresholds:
 * https://support.discord.com/hc/en-us/articles/44369363856663
 * https://github.com/EliteZilla/Discord-Badges
 *
 * Orbs, Quests and Legacy Username are single badges with no evolution tiers,
 * and Last Meadow Online has no published level table, so those keep one
 * honest tier instead of invented levels.
 */
export const ADDITIONAL_DISCORD_BADGES: AdditionalDiscordBadge[] = [
  {
    id: "account-age",
    label: "Account Age",
    art: "/badges/discord/account-age.svg",
    countLabel: "Account age",
    countPlaceholder: "e.g. 3 years",
    countHint: "Discord evolves this badge every year.",
    stages: [
      badgeStage(1, "Seed", "1 year"),
      badgeStage(2, "Sprout", "2 years"),
      badgeStage(3, "Bud", "3 years"),
      badgeStage(4, "Sapling", "4 years"),
      badgeStage(5, "Blossom", "5 years"),
      badgeStage(6, "Redwood", "6 years"),
      badgeStage(7, "Sequoia", "7 years"),
      badgeStage(8, "Bristlecone", "8 years"),
      badgeStage(9, "Stromatolite", "9 years"),
      badgeStage(10, "Primordial", "10+ years"),
    ],
  },
  {
    id: "game-time",
    label: "Game Time",
    art: "/badges/discord/game-time.svg",
    countLabel: "Total playtime",
    countPlaceholder: "e.g. 150 hours",
    countHint: "Detected desktop playtime since Dec 8, 2025.",
    stages: [
      badgeStage(1, "Casual", "1 hour"),
      badgeStage(2, "Recreational", "5 hours"),
      badgeStage(3, "Dedicated", "20 hours"),
      badgeStage(4, "Committed", "75 hours"),
      badgeStage(5, "Serious", "150 hours"),
      badgeStage(6, "Devoted", "300 hours"),
      badgeStage(7, "Seasoned", "500 hours"),
      badgeStage(8, "Ironclad", "1,000 hours"),
      badgeStage(9, "Unshakeable", "2,000 hours"),
      badgeStage(10, "Eternal", "5,000+ hours"),
    ],
  },
  {
    id: "game-variety",
    label: "Game Variety",
    art: "/badges/discord/game-variety.svg",
    countLabel: "Games played",
    countPlaceholder: "e.g. 20 games",
    countHint: "Unique games detected by the desktop app.",
    stages: [
      badgeStage(1, "Sampler", "2 games"),
      badgeStage(2, "Dabbler", "5 games"),
      badgeStage(3, "Enthusiast", "10 games"),
      badgeStage(4, "Ranger", "15 games"),
      badgeStage(5, "Explorer", "20 games"),
      badgeStage(6, "Adventurer", "30 games"),
      badgeStage(7, "Voyager", "40 games"),
      badgeStage(8, "Maverick", "60 games"),
      badgeStage(9, "Polymath", "80 games"),
      badgeStage(10, "Universalist", "100+ games"),
    ],
  },
  {
    id: "gifting",
    label: "Gifting",
    art: "/badges/discord/gifting.svg",
    countLabel: "Gifts sent",
    countPlaceholder: "e.g. 6 gifts",
    countHint: "Nitro and Shop gifts both count.",
    stages: [
      badgeStage(1, "Patron", "1 gift"),
      badgeStage(2, "Champion", "2 gifts"),
      badgeStage(3, "Luminary", "3 gifts"),
      badgeStage(4, "Icon", "6 gifts"),
      badgeStage(5, "Hero", "10 gifts"),
      badgeStage(6, "Legend", "20+ gifts"),
    ],
  },
  {
    id: "nitro",
    label: "Nitro",
    art: "/badges/discord/nitro.svg",
    countLabel: "Months subscribed",
    countPlaceholder: "e.g. 24 months",
    countHint: "Full Nitro only; Basic and Classic do not evolve.",
    stages: [
      badgeStage(1, "Bronze", "1 month"),
      badgeStage(2, "Silver", "3 months"),
      badgeStage(3, "Gold", "6 months"),
      badgeStage(4, "Platinum", "12 months"),
      badgeStage(5, "Diamond", "24 months"),
      badgeStage(6, "Emerald", "36 months"),
      badgeStage(7, "Ruby", "60 months"),
      badgeStage(8, "Opal", "72+ months"),
    ],
  },
  {
    id: "orbs",
    label: "Orbs",
    art: "/badges/discord/orbs.svg",
    stages: [badgeStage(1, "Orbs", "Purchased from the Orbs shop")],
  },
  {
    id: "quests",
    label: "Quests",
    art: "/badges/discord/quests.svg",
    stages: [badgeStage(1, "Quest", "Complete an eligible Quest")],
  },
  {
    id: "booster",
    label: "Server Booster",
    art: "/badges/discord/booster.svg",
    countLabel: "Months boosted",
    countPlaceholder: "e.g. 9 months",
    countHint: "Longest unbroken boost streak; stopping resets it.",
    stages: [
      badgeStage(1, "1 Month", "1 month"),
      badgeStage(2, "2 Months", "2 months"),
      badgeStage(3, "3 Months", "3 months"),
      badgeStage(4, "6 Months", "6 months"),
      badgeStage(5, "9 Months", "9 months"),
      badgeStage(6, "1 Year", "12 months"),
      badgeStage(7, "15 Months", "15 months"),
      badgeStage(8, "18 Months", "18 months"),
      badgeStage(9, "2 Years", "24 months"),
    ],
  },
  {
    id: "streaming",
    label: "Streaming",
    art: "/badges/discord/streaming.svg",
    countLabel: "Hours streamed",
    countPlaceholder: "e.g. 150 hours",
    countHint: "Desktop screen share with at least one viewer.",
    stages: [
      badgeStage(1, "Newcomer", "1 hour"),
      badgeStage(2, "Fledgling", "5 hours"),
      badgeStage(3, "Breakout", "20 hours"),
      badgeStage(4, "Standout", "75 hours"),
      badgeStage(5, "Trendsetter", "150 hours"),
      badgeStage(6, "Headliner", "300 hours"),
      badgeStage(7, "Star", "500 hours"),
      badgeStage(8, "Sensation", "1,000 hours"),
      badgeStage(9, "Visionary", "2,000 hours"),
      badgeStage(10, "Phenomenon", "5,000+ hours"),
    ],
  },
  {
    id: "last-meadow",
    label: "Last Meadow Online",
    art: "/badges/discord/last-meadow.svg",
    countLabel: "Game level",
    countPlaceholder: "e.g. 12",
    countHint: "Event badge from April 1–7, 2026; Discord shows your level on hover.",
    stages: [badgeStage(1, "Event", "Earned April 1–7, 2026")],
  },
  {
    id: "legacy-username",
    label: "Legacy Username",
    art: "/badges/discord/legacy-username.svg",
    stages: [badgeStage(1, "Legacy", "Kept a legacy username and discriminator")],
  },
];

export function discordProfileBadges(flags: number, input: unknown, selected: string[] = []): DiscordBadge[] {
  const badges = discordBadges(flags);
  const raw = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const list = Array.isArray(raw.badges) ? raw.badges : [];
  for (const item of list.slice(0, 40)) {
    if (!item || typeof item !== "object") continue;
    const badge = item as Record<string, unknown>;
    const label = String(badge.description || badge.name || badge.id || "Discord badge").slice(0, 120);
    const icon = String(badge.icon || "");
    const url = String(badge.icon_url || "");
    const art = /^[a-zA-Z0-9_]+$/.test(icon) ? `https://cdn.discordapp.com/badge-icons/${icon}.png` : /^https:\/\/(cdn|media)\.discordapp\.(com|net)\//.test(url) ? url : undefined;
    if (art && !badges.some((entry) => entry.label === label)) badges.push({ kind: "profile", flag: 0, label, art });
  }
  const extras = [...selected];
  if (Number(raw.premium_type) > 0) extras.push("nitro");
  for (const encoded of new Set(extras)) {
    const [id, stageValue, countValue] = encoded.split("~");
    const badge = ADDITIONAL_DISCORD_BADGES.find((entry) => entry.id === id);
    if (!badge) continue;
    if (badges.some((entry) => entry.art === badge.art || entry.label.toLowerCase().includes(badge.label.toLowerCase()))) continue;
    const requested = Math.trunc(Number(stageValue));
    const stage = badge.stages.find((entry) => entry.level === requested) ?? badge.stages[0];
    const count = (countValue || "").replace(/[^0-9.,+]/g, "").slice(0, 12);
    const label = [
      badge.label,
      badge.stages.length > 1 ? stage.name : "",
      count || (badge.stages.length > 1 ? stage.requirement : ""),
    ]
      .filter(Boolean)
      .join(" · ");
    badges.push({ kind: "profile", flag: 0, label, art: badge.art, stage: stage.level, count });
  }
  return badges;
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
