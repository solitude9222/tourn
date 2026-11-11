export type WidgetOption = {
  key: string;
  label: string;
  hint: string;
  type: "toggle" | "select";
  default: boolean | string;
  choices?: { value: string; label: string }[];
};

export type WidgetPlatform = {
  id: string;
  name: string;
  description: string;
  color: string;
  contentLabel: string;
  contentPlaceholder: string;
  didYouKnow: string;
  options: WidgetOption[];
};

export type WidgetInstance = {
  id: string;
  platform: string;
  content: string;
  options: Record<string, boolean | string>;
  /** false hides the widget on the public page without deleting it. */
  visible?: boolean;
};

/**
 * The real destination behind a widget, so every card opens the profile it is
 * describing — even the platforms with no public data API.
 */
export function widgetProfileUrl(platformId: string, content: string): string | null {
  const raw = content.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, "").replace(/^\/+|\/+$/g, "");
  if (!handle) return null;
  const enc = (value: string) => encodeURIComponent(value);

  switch (platformId) {
    case "roblox":
      return /^\d+$/.test(handle) ? `https://www.roblox.com/users/${handle}/profile` : null;
    case "github":
      return `https://github.com/${enc(handle)}`;
    case "steam":
      if (/^\d{17}$/.test(handle)) return `https://steamcommunity.com/profiles/${handle}`;
      return `https://steamcommunity.com/id/${enc(handle)}`;
    case "lastfm":
      return `https://www.last.fm/user/${enc(handle)}`;
    case "statsfm":
      return `https://stats.fm/${enc(handle)}`;
    case "valorant": {
      const [name, tag] = handle.split("#");
      return tag ? `https://tracker.gg/valorant/profile/riot/${enc(name)}%23${enc(tag)}/overview` : null;
    }
    case "twitch":
      return `https://twitch.tv/${enc(handle)}`;
    case "kick":
      return `https://kick.com/${enc(handle)}`;
    case "x":
      return `https://x.com/${enc(handle)}`;
    case "instagram":
      return `https://instagram.com/${enc(handle)}`;
    case "tiktok":
      return `https://tiktok.com/@${enc(handle)}`;
    case "reddit":
      return `https://reddit.com/user/${enc(handle)}`;
    case "telegram":
      return `https://t.me/${enc(handle)}`;
    case "soundcloud":
      return `https://soundcloud.com/${enc(handle)}`;
    case "applemusic":
      return `https://music.apple.com/us/artist/${enc(handle)}`;
    case "osu":
      return `https://osu.ppy.sh/users/${enc(handle)}`;
    case "chess":
      return `https://www.chess.com/member/${enc(handle)}`;
    case "hypixel":
      return `https://hypixel.net/player/${enc(handle)}`;
    case "fortnite":
      return `https://fortnitetracker.com/profile/all/${enc(handle)}`;
    case "league": {
      const [name, tag] = handle.split("#");
      return tag ? `https://op.gg/summoners/${enc(name)}-${enc(tag)}` : `https://op.gg/summoners/${enc(handle)}`;
    }
    case "rocketleague":
      return `https://rocketleague.tracker.network/rocket-league/profile/steam/${enc(handle)}/overview`;
    case "clashofclans": {
      const tag = handle.replace(/^#/, "");
      return /^[0-9A-Z]{5,12}$/i.test(tag)
        ? `https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${enc(tag)}`
        : null;
    }
    case "clashroyale": {
      const tag = handle.replace(/^#/, "");
      return /^[0-9A-Z]{5,12}$/i.test(tag) ? `https://link.clashroyale.com/en?playerInfo?id=${enc(tag)}` : null;
    }
    case "brawlstars": {
      const tag = handle.replace(/^#/, "");
      return /^[0-9A-Z]{5,12}$/i.test(tag) ? `https://link.brawlstars.com/en?action=openPlayerProfile&tag=${enc(tag)}` : null;
    }
    case "timezone":
    case "weather":
    case "minecraft":
      return null;
    default:
      return null;
  }
}

export type WidgetBackground = "frosted" | "gradient" | "rgb" | "solid" | "art";

/** A line of light that runs around the widget's edge. */
export type WidgetOutlineEffect = "none" | "trace" | "march" | "pulse" | "glow";

export type WidgetDesign = {
  backgroundStyle: WidgetBackground;
  borderWidth: number;
  borderOpacity: number;
  borderColor: string;
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
  backgroundOpacity: number;
  artOpacity: number;
  scrimOpacity: number;
  backgroundBlur: number;
  radius: number;
  /** Space between cards in the stack, in px. */
  gap: number;
  /** Show the live meta chips (members, followers, scrobbles…). */
  showMeta: boolean;
  /** Show Discord's public-flag badges on the card. */
  showBadges: boolean;
  /** A line of light travelling around the card edge. */
  outlineEffect: WidgetOutlineEffect;
  /** Colour of that line. */
  outlineColor: string;
  /** Seconds for one full lap — lower is faster. */
  outlineSpeed: number;
  /** Lift the card a pixel on hover. */
  hoverLift: boolean;
};

export type WidgetStore = {
  widgets: WidgetInstance[];
  design: WidgetDesign;
};

export const DEFAULT_WIDGET_DESIGN: WidgetDesign = {
  backgroundStyle: "solid",
  borderWidth: 1,
  borderOpacity: 0.08,
  borderColor: "#ffffff",
  backgroundColor: "#0b0c10",
  gradientFrom: "#ff5f6d",
  gradientTo: "#7c5cff",
  backgroundOpacity: 0.94,
  artOpacity: 0.9,
  scrimOpacity: 1,
  backgroundBlur: 0,
  radius: 16,
  gap: 10,
  showMeta: true,
  showBadges: true,
  outlineEffect: "none",
  outlineColor: "#b4bffa",
  outlineSpeed: 4,
  hoverLift: true,
};

const baseOptions = (): WidgetOption[] => [
  {
    key: "inside",
    label: "Inside Profile Card",
    hint: "Embed will place inside your profile card.",
    type: "toggle",
    default: true,
  },
];

const DID_YOU_KNOW =
  "If you're using the third layout or set a max width of at least 600px, embeds inside the profile card will be displayed in a grid.";

/* The catalog is deliberately limited to these fifteen platforms — anything
   else is not offered, and widgets saved for a removed platform are dropped
   by normalizeWidgetStore below. */
const ALL_WIDGET_PLATFORMS: WidgetPlatform[] = [
  {
    id: "discord",
    name: "Discord",
    description: "Display your Discord bot or server information with member count and status.",
    color: "#5865f2",
    contentLabel: "Discord user ID or server invite",
    contentPlaceholder: "User ID, https://discord.gg/… or https://discord.com/users/…",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "status",
        label: "Show Online Status",
        hint: "Display your live presence and activity.",
        type: "toggle",
        default: true,
      },
      {
        key: "show_banner",
        label: "Show Profile Banner",
        hint: "Use the banner from your public Discord profile when the card uses artwork.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "discordbot",
    name: "Discord bot",
    description: "Show a bot's own card — name, avatar and badges straight from Discord.",
    color: "#5865f2",
    contentLabel: "Discord bot ID",
    contentPlaceholder: "Application ID, e.g. 1535359723040276560",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "show_banner",
        label: "Show Bot Banner",
        hint: "Use the bot's banner when the card uses artwork.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    description: "Showcase your GitHub profile with follower count, repositories, and top starred projects.",
    color: "#24292f",
    contentLabel: "GitHub profile URL",
    contentPlaceholder: "https://github.com/username",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "repositories",
        label: "Show Top Repositories",
        hint: "List your most-starred public repositories.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "roblox",
    name: "Roblox",
    description: "Display your Roblox profile with followers, friends, and online status.",
    color: "#e2231a",
    contentLabel: "Roblox profile URL",
    contentPlaceholder: "https://www.roblox.com/users/301974334/profile",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "bodyshot",
        label: "Show Bodyshot",
        hint: "The background will show your bodyshot image.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "lastfm",
    name: "Last.fm",
    description: "Show your Last.fm listening history with total scrobbles, top artists, and most played track.",
    color: "#d51007",
    contentLabel: "Last.fm username or URL",
    contentPlaceholder: "https://www.last.fm/user/username",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "tracks",
        label: "Show Recent Tracks",
        hint: "Include your latest scrobbles under the stats.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "statsfm",
    name: "Stats.fm",
    description: "Display your Stats.fm profile with streaming statistics, recent tracks, and listening insights.",
    color: "#1ed760",
    contentLabel: "Stats.fm username or URL",
    contentPlaceholder: "https://stats.fm/username",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "artists",
        label: "Show Top Artists",
        hint: "Add your most-streamed artists.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "valorant",
    name: "Valorant",
    description: "Show your Valorant rank, competitive stats, and account level.",
    color: "#ff4655",
    contentLabel: "Riot ID",
    contentPlaceholder: "Name#TAG",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "rank",
        label: "Show Competitive Rank",
        hint: "Display your current act rank and RR.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "timezone",
    name: "Timezone",
    description: "Show a live analog clock for your selected time zone.",
    color: "#ef4444",
    contentLabel: "Time zone",
    contentPlaceholder: "Europe/London",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "analog",
        label: "Analog Clock",
        hint: "Use an analog face instead of digital time.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "steam",
    name: "Steam",
    description: "Display your Steam profile with game library, playtime, friends count, and recent games.",
    color: "#1b2838",
    contentLabel: "Steam profile URL",
    contentPlaceholder: "https://steamcommunity.com/id/username",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "library",
        label: "Show Game Library",
        hint: "Include your recently played games.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "twitch",
    name: "Twitch",
    description: "Show your Twitch channel with follower count, live status, and viewer count when streaming.",
    color: "#9146ff",
    contentLabel: "Twitch channel",
    contentPlaceholder: "https://twitch.tv/channel",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "live",
        label: "Show Live Status",
        hint: "Highlight when the channel is live.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "spotify",
    name: "Spotify",
    description: "Display Spotify content: user profiles, tracks, albums, artists, or playlists.",
    color: "#1db954",
    contentLabel: "Spotify URL",
    contentPlaceholder: "https://open.spotify.com/user/username",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "nowplaying",
        label: "Show Now Playing",
        hint: "Show the currently playing track when available.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "minecraft",
    name: "Minecraft Server",
    description: "Display your Minecraft server with online player count and MOTD.",
    color: "#3f8f53",
    contentLabel: "Server address",
    contentPlaceholder: "play.example.net",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "players",
        label: "Show Player Count",
        hint: "Display online and maximum players.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "clashofclans",
    name: "Clash of Clans",
    description: "Show your Clash of Clans player stats with town hall level, trophies, and clan information.",
    color: "#8a6a2f",
    contentLabel: "Player tag",
    contentPlaceholder: "#PLAYERTAG",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "townhall",
        label: "Show Town Hall",
        hint: "Include your town hall and hero levels.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "clashroyale",
    name: "Clash Royale",
    description: "Show your Clash Royale player stats with arena, trophies, and card levels.",
    color: "#3b74d8",
    contentLabel: "Player tag",
    contentPlaceholder: "#PLAYERTAG",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "arena",
        label: "Show Arena",
        hint: "Display your current arena and trophies.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "brawlstars",
    name: "Brawl Stars",
    description: "Show your Brawl Stars profile with trophies, brawlers unlocked, and club information.",
    color: "#d9a520",
    contentLabel: "Player tag",
    contentPlaceholder: "#PLAYERTAG",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "trophies",
        label: "Show Trophies",
        hint: "Display total trophies and highest brawler.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "weather",
    name: "Weather",
    description: "Display current weather conditions and temperature for your location.",
    color: "#3b9ad9",
    contentLabel: "Location",
    contentPlaceholder: "City or postcode",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "forecast",
        label: "Show 3-Day Forecast",
        hint: "Add a compact forecast under the current conditions.",
        type: "toggle",
        default: false,
      },
    ],
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Show your channel with subscribers, total views, and your latest upload.",
    color: "#ff0033",
    contentLabel: "Channel URL or handle",
    contentPlaceholder: "https://youtube.com/@channel",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "latest",
        label: "Show Latest Video",
        hint: "Feature the most recent upload under your channel stats.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "kick",
    name: "Kick",
    description: "Show your Kick channel with followers, category, and live status.",
    color: "#53fc18",
    contentLabel: "Kick channel",
    contentPlaceholder: "https://kick.com/channel",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "live",
        label: "Show Live Status",
        hint: "Highlight the card while you are streaming.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "x",
    name: "X",
    description: "Show your X profile with followers and your latest post.",
    color: "#e7e9ea",
    contentLabel: "X handle",
    contentPlaceholder: "@username",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "latest",
        label: "Show Latest Post",
        hint: "Include your most recent post under the profile line.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Show your Instagram profile with followers and recent posts.",
    color: "#e1306c",
    contentLabel: "Instagram profile",
    contentPlaceholder: "https://instagram.com/username",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "posts",
        label: "Show Recent Posts",
        hint: "Add a small row of your latest photos.",
        type: "toggle",
        default: false,
      },
    ],
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Show your TikTok profile with followers, likes, and recent videos.",
    color: "#25f4ee",
    contentLabel: "TikTok handle",
    contentPlaceholder: "https://tiktok.com/@username",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "videos",
        label: "Show Recent Videos",
        hint: "Include your latest videos under the profile stats.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "reddit",
    name: "Reddit",
    description: "Show your Reddit profile with karma, posts, and top communities.",
    color: "#ff4500",
    contentLabel: "Reddit profile",
    contentPlaceholder: "https://reddit.com/user/username",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "communities",
        label: "Show Communities",
        hint: "List the subreddits you post in most.",
        type: "toggle",
        default: false,
      },
    ],
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Show your Telegram channel with subscriber count and latest update.",
    color: "#2aabee",
    contentLabel: "Channel or username",
    contentPlaceholder: "https://t.me/channel",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "latest",
        label: "Show Latest Update",
        hint: "Include the most recent channel post.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    description: "Show your SoundCloud profile with tracks, followers, and latest upload.",
    color: "#ff5500",
    contentLabel: "SoundCloud profile",
    contentPlaceholder: "https://soundcloud.com/username",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "tracks",
        label: "Show Recent Tracks",
        hint: "List your latest uploads under the profile line.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "applemusic",
    name: "Apple Music",
    description: "Show your Apple Music profile with playlists and recent listens.",
    color: "#fa243c",
    contentLabel: "Apple Music profile",
    contentPlaceholder: "https://music.apple.com/profile/username",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "playlists",
        label: "Show Playlists",
        hint: "Include your public playlists.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "osu",
    name: "osu!",
    description: "Show your osu! profile with global rank, accuracy, and play count.",
    color: "#ff66aa",
    contentLabel: "osu! username or ID",
    contentPlaceholder: "https://osu.ppy.sh/users/12345",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "top",
        label: "Show Top Play",
        hint: "Feature your highest-ranked play.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "rocketleague",
    name: "Rocket League",
    description: "Show your Rocket League rank, MMR, and recent matches.",
    color: "#1f5cff",
    contentLabel: "Tracker profile or ID",
    contentPlaceholder: "https://rocketleague.tracker.network/…",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "matches",
        label: "Show Recent Matches",
        hint: "Add your latest results under the rank.",
        type: "toggle",
        default: false,
      },
    ],
  },
  {
    id: "league",
    name: "League of Legends",
    description: "Show your League rank, recent matches, and most played champions.",
    color: "#0ac8b9",
    contentLabel: "Riot ID",
    contentPlaceholder: "Name#TAG",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "champions",
        label: "Show Top Champions",
        hint: "List your most played champions this season.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "fortnite",
    name: "Fortnite",
    description: "Show your Fortnite stats with wins, eliminations, and account level.",
    color: "#2b6df6",
    contentLabel: "Epic username",
    contentPlaceholder: "Your Epic name",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "level",
        label: "Show Account Level",
        hint: "Display your current battle pass level.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "hypixel",
    name: "Hypixel",
    description: "Show your Hypixel network level and favourite game stats.",
    color: "#f5b301",
    contentLabel: "Minecraft username",
    contentPlaceholder: "https://hypixel.net/player/username",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "games",
        label: "Show Game Stats",
        hint: "Include stats for your most played games.",
        type: "toggle",
        default: true,
      },
    ],
  },
  {
    id: "chess",
    name: "Chess.com",
    description: "Show your Chess.com rating, win rate, and latest games.",
    color: "#81b64c",
    contentLabel: "Chess.com username",
    contentPlaceholder: "https://chess.com/member/username",
    didYouKnow: DID_YOU_KNOW,
    options: [
      ...baseOptions(),
      {
        key: "games",
        label: "Show Recent Games",
        hint: "List your latest rated results.",
        type: "toggle",
        default: false,
      },
    ],
  },
];

const SUPPORTED_IDS = [
  "discord",
  "discordbot",
  "github",
  "roblox",
  "lastfm",
  "statsfm",
  "valorant",
  "timezone",
  "steam",
  "twitch",
  "spotify",
  "minecraft",
  "clashofclans",
  "clashroyale",
  "brawlstars",
  "weather",
  "youtube",
] as const;

const SUPPORTED = new Set<string>(SUPPORTED_IDS);

export const WIDGET_PLATFORMS: WidgetPlatform[] = SUPPORTED_IDS.map(
  (id) => ALL_WIDGET_PLATFORMS.find((platform) => platform.id === id)!,
).filter((platform) => SUPPORTED.has(platform.id));

export const WIDGET_PLATFORM_BY_ID = new Map(WIDGET_PLATFORMS.map((platform) => [platform.id, platform]));

export function defaultWidgetOptions(platform: WidgetPlatform): Record<string, boolean | string> {
  return Object.fromEntries(platform.options.map((option) => [option.key, option.default]));
}

export function createWidgetInstance(platform: WidgetPlatform): WidgetInstance {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `widget-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    platform: platform.id,
    content: "",
    options: defaultWidgetOptions(platform),
    visible: true,
  };
}

/**
 * A believable handle for each platform, so the dashboard can show a real
 * widget card before the owner has typed anything.
 */
export const WIDGET_SAMPLE_CONTENT: Record<string, string> = {
  discord: "tourn.lol",
  github: "tourn-lol",
  roblox: "301974334",
  discordbot: "1535359723040276560",
  lastfm: "tourn",
  statsfm: "tourn",
  valorant: "tourn#lol",
  timezone: "Europe/London",
  steam: "76561198000000000",
  twitch: "tourn",
  spotify: "tourn",
  minecraft: "play.tourn.lol",
  clashofclans: "#2PP",
  clashroyale: "#2PP",
  brawlstars: "#2PP",
  weather: "London",
  youtube: "@tourn",
};

export function sampleContentFor(platformId: string): string {
  return WIDGET_SAMPLE_CONTENT[platformId] ?? "tourn.lol";
}

/** A widget instance pre-filled with sample content, used for previews only. */
export function sampleWidgetInstance(platform: WidgetPlatform): WidgetInstance {
  return {
    id: `sample-${platform.id}`,
    platform: platform.id,
    content: sampleContentFor(platform.id),
    options: defaultWidgetOptions(platform),
    visible: true,
  };
}

export function widgetOption(instance: WidgetInstance, key: string): boolean {
  return instance.options[key] === true;
}

function clamp(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function color(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

export const EMPTY_WIDGET_STORE: WidgetStore = {
  widgets: [],
  design: DEFAULT_WIDGET_DESIGN,
};

function storageKey(userId: string): string {
  return `tourn.lol/widgets/v1/${userId}`;
}

/** Coerce anything (a saved document, a server payload) into a safe WidgetStore. */
export function normalizeWidgetStore(input: unknown): WidgetStore {
  try {
    const parsed = (input ?? {}) as Partial<WidgetStore>;
    const rawDesign = (parsed.design ?? {}) as Partial<WidgetDesign>;
    const widgets = Array.isArray(parsed.widgets)
      ? parsed.widgets
          .filter(
            (item): item is WidgetInstance =>
              Boolean(
                item &&
                  typeof item === "object" &&
                  typeof item.id === "string" &&
                  typeof item.platform === "string" &&
                  WIDGET_PLATFORM_BY_ID.has(item.platform),
              ),
          )
          .map((item) => {
            const platform = WIDGET_PLATFORM_BY_ID.get(item.platform)!;
            return {
              id: item.id,
              platform: item.platform,
              content: typeof item.content === "string" ? item.content.slice(0, 300) : "",
              options: { ...defaultWidgetOptions(platform), ...(item.options ?? {}) },
              visible: item.visible !== false,
            };
          })
      : [];

    return {
      widgets,
      design: {
        backgroundStyle: ["frosted", "gradient", "rgb", "solid", "art"].includes(
          String(rawDesign.backgroundStyle),
        )
          ? (rawDesign.backgroundStyle as WidgetBackground)
          : DEFAULT_WIDGET_DESIGN.backgroundStyle,
        borderWidth: clamp(rawDesign.borderWidth, DEFAULT_WIDGET_DESIGN.borderWidth, 0, 8),
        borderOpacity: clamp(rawDesign.borderOpacity, DEFAULT_WIDGET_DESIGN.borderOpacity, 0, 1),
        borderColor: color(rawDesign.borderColor, DEFAULT_WIDGET_DESIGN.borderColor),
        backgroundColor: color(rawDesign.backgroundColor, DEFAULT_WIDGET_DESIGN.backgroundColor),
        gradientFrom: color(rawDesign.gradientFrom, DEFAULT_WIDGET_DESIGN.gradientFrom),
        gradientTo: color(rawDesign.gradientTo, DEFAULT_WIDGET_DESIGN.gradientTo),
        backgroundOpacity: clamp(
          rawDesign.backgroundOpacity,
          DEFAULT_WIDGET_DESIGN.backgroundOpacity,
          0,
          1,
        ),
        artOpacity: clamp(rawDesign.artOpacity, DEFAULT_WIDGET_DESIGN.artOpacity, 0, 1),
        scrimOpacity: clamp(rawDesign.scrimOpacity, DEFAULT_WIDGET_DESIGN.scrimOpacity, 0, 1),
        backgroundBlur: clamp(rawDesign.backgroundBlur, DEFAULT_WIDGET_DESIGN.backgroundBlur, 0, 30),
        radius: clamp(rawDesign.radius, DEFAULT_WIDGET_DESIGN.radius, 0, 30),
        gap: clamp(rawDesign.gap, DEFAULT_WIDGET_DESIGN.gap, 0, 28),
        showMeta: rawDesign.showMeta !== false,
        showBadges: rawDesign.showBadges !== false,
        outlineEffect: (["none", "trace", "march", "pulse", "glow"] as const).includes(
          rawDesign.outlineEffect as WidgetOutlineEffect,
        )
          ? (rawDesign.outlineEffect as WidgetOutlineEffect)
          : DEFAULT_WIDGET_DESIGN.outlineEffect,
        outlineColor: color(rawDesign.outlineColor, DEFAULT_WIDGET_DESIGN.outlineColor),
        outlineSpeed: clamp(rawDesign.outlineSpeed, DEFAULT_WIDGET_DESIGN.outlineSpeed, 1, 12),
        hoverLift: rawDesign.hoverLift !== false,
      },
    };
  } catch {
    return { ...EMPTY_WIDGET_STORE, widgets: [], design: { ...DEFAULT_WIDGET_DESIGN } };
  }
}

export function loadWidgetStore(userId: string): WidgetStore {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...EMPTY_WIDGET_STORE, widgets: [], design: { ...DEFAULT_WIDGET_DESIGN } };
    return normalizeWidgetStore(JSON.parse(raw));
  } catch {
    return { ...EMPTY_WIDGET_STORE, widgets: [], design: { ...DEFAULT_WIDGET_DESIGN } };
  }
}

export function saveWidgetStore(userId: string, store: WidgetStore): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(store));
  } catch {
    /* private mode — the changes still work for this session */
  }
}
