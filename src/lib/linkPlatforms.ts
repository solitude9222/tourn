/* ---------------------------------------------------------------------------
   Platform directory for the Links feature.

   Every platform is a real brand icon from react-icons (fa6 + si) plus a
   brand colour — no hand-drawn marks, no guessing. Grouped into browsable
   categories so the "Add a link" flow is a quick-pick of the 10 most common
   platforms with a searchable, categorised directory behind "Browse all".
   --------------------------------------------------------------------------- */
import type { IconType } from "react-icons";
import {
  FaDiscord, FaTiktok, FaSpotify, FaTwitch, FaYoutube, FaSteam,
  FaGithub, FaInstagram, FaXTwitter, FaRedditAlien, FaSnapchat, FaPinterest,
  FaTelegram, FaSoundcloud, FaApple, FaPaypal, FaLinkedin, FaBehance,
  FaFacebook, FaTumblr, FaDribbble, FaPatreon, FaMedium,
  FaBitcoin, FaEthereum, FaGlobe, FaEnvelope, FaLink, FaBox,
} from "react-icons/fa6";
import {
  SiValorant, SiEpicgames, SiKick, SiNetflix, SiRiotgames, SiRoblox,
  SiApplemusic, SiCashapp, SiCrunchyroll, SiWise, SiOsu,
  SiSolana, SiLitecoin, SiTether, SiMonero,
} from "react-icons/si";

export type Platform = {
  id: string;
  name: string;
  Icon: IconType;
  color: string;
  isCrypto?: boolean;
};

export const PLATFORMS: Platform[] = [
  { id: "discord", name: "Discord", Icon: FaDiscord, color: "#5865F2" },
  { id: "valorant", name: "Valorant", Icon: SiValorant, color: "#FF4655" },
  { id: "roblox", name: "Roblox", Icon: SiRoblox, color: "#E2231A" },
  { id: "tiktok", name: "TikTok", Icon: FaTiktok, color: "#ff0050" },
  { id: "spotify", name: "Spotify", Icon: FaSpotify, color: "#1DB954" },
  { id: "twitch", name: "Twitch", Icon: FaTwitch, color: "#9146FF" },
  { id: "youtube", name: "YouTube", Icon: FaYoutube, color: "#FF0000" },
  { id: "steam", name: "Steam", Icon: FaSteam, color: "#c7d5e0" },
  { id: "github", name: "GitHub", Icon: FaGithub, color: "#f5f5f5" },
  { id: "instagram", name: "Instagram", Icon: FaInstagram, color: "#E1306C" },
  { id: "x", name: "X / Twitter", Icon: FaXTwitter, color: "#e7e7e7" },
  { id: "reddit", name: "Reddit", Icon: FaRedditAlien, color: "#FF4500" },
  { id: "snapchat", name: "Snapchat", Icon: FaSnapchat, color: "#FFFC00" },
  { id: "pinterest", name: "Pinterest", Icon: FaPinterest, color: "#E60023" },
  { id: "telegram", name: "Telegram", Icon: FaTelegram, color: "#2AABEE" },
  { id: "soundcloud", name: "SoundCloud", Icon: FaSoundcloud, color: "#ff5500" },
  { id: "applemusic", name: "Apple Music", Icon: SiApplemusic, color: "#FA57C1" },
  { id: "apple", name: "Apple", Icon: FaApple, color: "#f5f5f5" },
  { id: "paypal", name: "PayPal", Icon: FaPaypal, color: "#00457C" },
  { id: "cashapp", name: "Cash App", Icon: SiCashapp, color: "#00D632" },
  { id: "bitcoin", name: "Bitcoin (BTC)", Icon: FaBitcoin, color: "#F7931A", isCrypto: true },
  { id: "ethereum", name: "Ethereum (ETH)", Icon: FaEthereum, color: "#627EEA", isCrypto: true },
  { id: "solana", name: "Solana (SOL)", Icon: SiSolana, color: "#14F195", isCrypto: true },
  { id: "litecoin", name: "Litecoin (LTC)", Icon: SiLitecoin, color: "#345D9D", isCrypto: true },
  { id: "tether", name: "Tether (USDT)", Icon: SiTether, color: "#26A17B", isCrypto: true },
  { id: "monero", name: "Monero (XMR)", Icon: SiMonero, color: "#FF6600", isCrypto: true },
  { id: "linkedin", name: "LinkedIn", Icon: FaLinkedin, color: "#0A66C2" },
  { id: "behance", name: "Behance", Icon: FaBehance, color: "#1769ff" },
  { id: "dribbble", name: "Dribbble", Icon: FaDribbble, color: "#EA4C89" },
  { id: "facebook", name: "Facebook", Icon: FaFacebook, color: "#1877F2" },
  { id: "tumblr", name: "Tumblr", Icon: FaTumblr, color: "#36465D" },
  { id: "patreon", name: "Patreon", Icon: FaPatreon, color: "#FF424D" },
  { id: "medium", name: "Medium", Icon: FaMedium, color: "#f5f5f5" },
  { id: "epicgames", name: "Epic Games", Icon: SiEpicgames, color: "#f5f5f5" },
  { id: "kick", name: "Kick", Icon: SiKick, color: "#53FC18" },
  { id: "netflix", name: "Netflix", Icon: SiNetflix, color: "#E50914" },
  { id: "riotgames", name: "Riot Games", Icon: SiRiotgames, color: "#FF4655" },
  { id: "crunchyroll", name: "Crunchyroll", Icon: SiCrunchyroll, color: "#F47521" },
  { id: "wise", name: "Wise", Icon: SiWise, color: "#9FE870" },
  { id: "osu", name: "osu!", Icon: SiOsu, color: "#FF66AA" },
  { id: "website", name: "Website", Icon: FaGlobe, color: "#ffb3ae" },
  { id: "email", name: "Email", Icon: FaEnvelope, color: "#ea580c" },
  { id: "product", name: "Product", Icon: FaBox, color: "#34d399" },
  { id: "custom", name: "Custom link", Icon: FaLink, color: "#8b939b" },
];

export const PLATFORM_MAP: Map<string, Platform> = new Map(PLATFORMS.map((p) => [p.id, p]));

export function getPlatform(id: string): Platform | undefined {
  const aliases:Record<string,string>={btc:"bitcoin",eth:"ethereum",sol:"solana",ltc:"litecoin",usdt:"tether",xmr:"monero",twitter:"x"};
  const key=id.trim().toLowerCase();
  return PLATFORM_MAP.get(aliases[key] || key);
}

/** The ten platforms shown as one-click quick-add tiles before "Browse all". */
export const QUICK_PRESETS = [
  "discord", "tiktok", "instagram", "youtube", "twitch",
  "spotify", "x", "roblox", "github", "website",
];

export type PlatformCategoryId = "all" | "popular" | "social" | "gaming" | "media" | "dev" | "finance" | "custom";

export const CATEGORIES: { id: PlatformCategoryId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "popular", label: "Popular" },
  { id: "social", label: "Socials" },
  { id: "gaming", label: "Gaming" },
  { id: "media", label: "Media & Audio" },
  { id: "dev", label: "Dev & Portfolio" },
  { id: "finance", label: "Crypto & Pay" },
  { id: "custom", label: "Custom" },
];

export const PLATFORM_CATEGORIES: Record<PlatformCategoryId, string[]> = {
  all: PLATFORMS.map((p) => p.id),
  popular: QUICK_PRESETS,
  social: ["discord", "x", "instagram", "tiktok", "telegram", "reddit", "snapchat", "pinterest", "facebook", "tumblr"],
  gaming: ["roblox", "steam", "twitch", "valorant", "kick", "epicgames", "riotgames", "osu"],
  media: ["spotify", "youtube", "soundcloud", "applemusic", "apple", "netflix", "crunchyroll"],
  dev: ["github", "linkedin", "behance", "dribbble", "medium", "patreon"],
  finance: ["paypal", "cashapp", "wise", "bitcoin", "ethereum", "solana", "litecoin", "tether", "monero"],
  custom: ["website", "email", "product", "custom"],
};

const URL_PLACEHOLDER: Record<string, string> = {
  discord: "https://discord.gg/your-invite",
  tiktok: "https://tiktok.com/@yourhandle",
  instagram: "https://instagram.com/yourhandle",
  youtube: "https://youtube.com/@yourchannel",
  twitch: "https://twitch.tv/yourchannel",
  spotify: "https://open.spotify.com/user/...",
  x: "https://x.com/yourhandle",
  roblox: "https://roblox.com/users/123456/profile",
  github: "https://github.com/yourhandle",
  steam: "https://steamcommunity.com/id/yourhandle",
  reddit: "https://reddit.com/u/yourhandle",
  telegram: "https://t.me/yourhandle",
  soundcloud: "https://soundcloud.com/yourhandle",
  linkedin: "https://linkedin.com/in/yourhandle",
  paypal: "https://paypal.me/yourhandle",
  cashapp: "https://cash.app/$yourtag",
  website: "https://yourdomain.com",
  email: "you@example.com",
  product: "https://yourstore.com/product",
  custom: "https://...",
};

export function placeholderFor(id: string): string {
  return URL_PLACEHOLDER[id] ?? "https://...";
}

/** Guesses a platform id from a pasted URL so picking a platform first is
 *  optional — paste a link and the right icon/colour follow automatically. */
export function detectPlatformFromUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const url = rawUrl.trim().toLowerCase();
  if (/^mailto:/.test(url)) return "email";
  if (/(?:tiktok\.com)/.test(url)) return "tiktok";
  if (/(?:discord(?:\.gg|app\.com|\.com))/.test(url)) return "discord";
  if (/(?:youtube\.com|youtu\.be)/.test(url)) return "youtube";
  if (/(?:spotify\.com)/.test(url)) return "spotify";
  if (/(?:twitch\.tv)/.test(url)) return "twitch";
  if (/(?:instagram\.com)/.test(url)) return "instagram";
  if (/(?:twitter\.com|x\.com)/.test(url)) return "x";
  if (/(?:github\.com)/.test(url)) return "github";
  if (/(?:steamcommunity\.com|steampowered\.com)/.test(url)) return "steam";
  if (/(?:roblox\.com)/.test(url)) return "roblox";
  if (/(?:reddit\.com)/.test(url)) return "reddit";
  if (/(?:t\.me|telegram\.me)/.test(url)) return "telegram";
  if (/(?:soundcloud\.com)/.test(url)) return "soundcloud";
  if (/(?:snapchat\.com)/.test(url)) return "snapchat";
  if (/(?:pinterest\.com)/.test(url)) return "pinterest";
  if (/(?:kick\.com)/.test(url)) return "kick";
  if (/(?:linkedin\.com)/.test(url)) return "linkedin";
  if (/(?:patreon\.com)/.test(url)) return "patreon";
  if (/(?:paypal\.me|paypal\.com)/.test(url)) return "paypal";
  if (/(?:cash\.app)/.test(url)) return "cashapp";
  if (/(?:music\.apple\.com|itunes\.apple\.com)/.test(url)) return "applemusic";
  if (/(?:apple\.com)/.test(url)) return "apple";
  if (/(?:netflix\.com)/.test(url)) return "netflix";
  if (/(?:crunchyroll\.com)/.test(url)) return "crunchyroll";
  if (/(?:osu\.ppy\.sh)/.test(url)) return "osu";
  if (/(?:facebook\.com|fb\.com)/.test(url)) return "facebook";
  if (/(?:tumblr\.com)/.test(url)) return "tumblr";
  if (/(?:behance\.net)/.test(url)) return "behance";
  if (/(?:dribbble\.com)/.test(url)) return "dribbble";
  if (/(?:medium\.com)/.test(url)) return "medium";
  return null;
}
