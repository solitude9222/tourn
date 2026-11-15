/* ---------------------------------------------------------------------------
   Community messages for the tourn.lol Discord bot.

   Pure payload builders: no token, client or database here, so the leaderboard
   format, welcome card and DM panel can be inspected on their own. The
   automation service owns the REST calls.
   --------------------------------------------------------------------------- */

export const SITE_URL = "https://tourn.lol";
export const SUPPORT_URL = "https://discord.gg/a9uwptuepD";
export const BRAND_RED = 0xb8080c;
export const LEADERBOARD_CHANNEL_ID =
  process.env.DISCORD_LEADERBOARD_CHANNEL_ID || "1570797329202811051";
export const WELCOME_CHANNEL_ID =
  process.env.DISCORD_WELCOME_CHANNEL_ID || "1557282173147676752";

const MEDALS = ["🥇", "🥈", "🥉"];

const count = (value) => Number(value || 0).toLocaleString("en-US");
const profileUrl = (username) => `${SITE_URL}/${encodeURIComponent(String(username || ""))}`;
const safeIcon = (value) =>
  typeof value === "string" && /^https?:\/\//i.test(value) ? value : `${SITE_URL}/logo.png`;

/** Discord CDN avatar for a user object, with the default avatar as fallback. */
export function discordAvatar(user) {
  const id = String(user?.id || "");
  if (!/^\d{16,20}$/.test(id)) return `${SITE_URL}/logo.png`;
  if (user?.avatar) return `https://cdn.discordapp.com/avatars/${id}/${user.avatar}.png?size=128`;
  let index = 0;
  try {
    index = Number((BigInt(id) >> 22n) % 6n);
  } catch {
    index = 0;
  }
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

/**
 * One embed per profile so every entry can carry that person's Discord avatar
 * in the author icon. Red throughout, views and likes on the same line.
 */
export function buildLeaderboardMessage(rows = [], identities = {}) {
  const entries = rows.filter(Boolean).slice(0, 10);
  if (!entries.length) return null;

  let views = 0;
  let likes = 0;
  const embeds = entries.map((row, index) => {
    views += Number(row.views || 0);
    likes += Number(row.likes || 0);
    const identity = identities[String(row.discord_id)] || null;
    const alias = String(row.alias || row.username || "profile");
    const handle = identity?.username ? `  ·  @${identity.username}` : "";
    return {
      color: BRAND_RED,
      author: {
        name: `${MEDALS[index] || `#${index + 1}`}  ${alias}${handle}`.slice(0, 256),
        icon_url: safeIcon(identity?.avatar || row.avatar_url),
        url: profileUrl(row.username),
      },
      description: `👁 **${count(row.views)}** views  ·  👍 **${count(row.likes)}** likes`,
    };
  });

  return {
    content: [
      "# 🏆 tourn.lol leaderboard",
      `-# ranked by profile views and likes · [full board](${SITE_URL}/#/leaderboard)`,
    ].join("\n"),
    embeds,
    allowed_mentions: { parse: [] },
  };
}

/** Welcome ping for someone who just joined, with the short version of tourn. */
export function buildWelcomeMessage(member = {}) {
  const id = String(member.id || "");
  const mention = `<@${id}>`;
  return {
    content: `${mention} welcome to **tourn.lol** 🎉`,
    allowed_mentions: { parse: [], users: id ? [id] : [] },
    embeds: [
      {
        color: BRAND_RED,
        description: [
          "Grab your alias, build the card and drop your links — it takes a minute.",
          "",
          `• Profile & links → ${SITE_URL}`,
          `• Leaderboard → ${SITE_URL}/#/leaderboard`,
          `• Questions → ${SUPPORT_URL}`,
        ].join("\n"),
        thumbnail: { url: safeIcon(member.avatar) },
        footer: { text: "tourn.lol · your profile, your links" },
      },
    ],
  };
}

/** The only DM the bot ever sends to a stranger: help, terms and a link. */
export function buildDmPanel() {
  return {
    content:
      "Thanks for messaging **tourn.lol** — everything you need is below. This is the only time I will reply.",
    embeds: [
      {
        color: BRAND_RED,
        title: "tourn.lol",
        description:
          `Build a profile card, link everything you own and get on the [leaderboard](${SITE_URL}/#/leaderboard).`,
        footer: { text: "Pick an option below" },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          { type: 2, style: 5, label: "Help", url: SUPPORT_URL },
          { type: 2, style: 5, label: "Terms of Service", url: `${SITE_URL}/#/legal` },
          { type: 2, style: 5, label: "Link my profile", url: `${SITE_URL}/#/dashboard` },
        ],
      },
    ],
  };
}
