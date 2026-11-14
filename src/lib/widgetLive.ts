import {
  fetchGuildInvite,
  fetchLanyard,
  fetchSpotifyMeta,
  WidgetError,
} from "./api";
import { currentGame, customStatus, avatarUrl, decorationUrl, snowflakeDate, formatJoined } from "./format";
import { discordBadges, discordProfileBadges, primaryGuildTag, readableGuildTag, type DiscordBadge } from "./discord";
import { usePolled } from "./hooks";
import { fetchSteamProfile } from "./steam";
import { FEATURED_TRACK, spotifyTrackId } from "../config";
import { WIDGET_PLATFORM_BY_ID, type WidgetInstance } from "./widgets";

export type LiveStatus = "online" | "idle" | "dnd" | "offline" | null;

export type WidgetLive = {
  title: string;
  subtitle: string;
  meta: string[];
  avatar: string | null;
  decoration: string | null;
  banner: string | null;
  art: string | null;
  accent: string | null;
  tag: string | null;
  tagBadge?: string | null;
  badges: DiscordBadge[];
  status: LiveStatus;
  timezone?: string;
  presenceNotice?: string;
};

const STATUS_LABELS: Record<Exclude<LiveStatus, null>, string> = {
  online: "Online",
  idle: "Idle",
  dnd: "Do not disturb",
  offline: "Offline",
};

type DiscordLookupUser = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  public_flags?: number;
  premium_type?: number;
  badges?: unknown[];
  banner?: string | null;
  accent_color?: number | null;
  banner_color?: string | null;
  primary_guild?: {
    identity_guild_id?: string;
    identity_enabled?: boolean;
    tag?: string;
    badge?: string;
  } | null;
  clan?: { tag?: string; badge?: string } | null;
  avatar_decoration_data?: { asset: string } | null;
};

type DiscordLookup = {
  user: DiscordLookupUser;
  badges?: unknown[];
  avatar_url: string | null;
  banner_url: string | null;
  banner_color: string | null;
};

type RobloxUser = {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  created?: string;
};

type RobloxThumbnail = {
  data?: { imageUrl?: string; state?: string }[];
};

type CountResponse = { count?: number };

type GithubUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  followers: number;
  public_repos: number;
};

type GithubRepo = {
  name: string;
  full_name: string;
  owner: { login: string; avatar_url: string };
  description: string | null;
  stargazers_count: number;
  forks_count: number;
};

type WeatherGeo = {
  results?: {
    name: string;
    country_code?: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }[];
};

type WeatherForecast = {
  current?: { temperature_2m?: number; weather_code?: number };
};

const discordUserId = (input: string): string | null => {
  const urlMatch = input.match(/(?:users\/|\/)(\d{16,20})(?:\/|$|\?)/);
  if (urlMatch) return urlMatch[1];
  if (/^\d{16,20}$/.test(input)) return input;
  return null;
};

const discordInviteCode = (input: string): string | null => {
  const urlMatch = input.match(/(?:discord\.gg\/|discord\.com\/invite\/)([a-zA-Z0-9-]+)/i);
  if (urlMatch) return urlMatch[1];
  if (!input.includes("discord") && /^[a-zA-Z0-9-]{2,}$/.test(input)) return input;
  return null;
};

async function fetchDiscordLookup(id: string, signal: AbortSignal): Promise<DiscordLookup> {
  const local = await fetch(`/api/discord/${encodeURIComponent(id)}`, { signal, headers: { Accept: "application/json" } }).catch(() => null);
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  if (local?.ok) {
    const body = await local.json().catch(() => null);
    if (body?.user?.id) return body as DiscordLookup;
  }
  const res = await fetch(`https://discord-lookup.lookupbotdc.workers.dev/search/${encodeURIComponent(id)}`, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new WidgetError("network", "Discord profile lookup is unavailable. Try again shortly.");
  const body = await res.json();
  if (!body?.user?.id) throw new WidgetError("not_found", "No Discord profile was returned for that ID.");
  return body as DiscordLookup;
}

async function discordLive(
  widget: WidgetInstance,
  input: string,
  signal: AbortSignal,
  asBot = false,
): Promise<WidgetLive> {
  const id = discordUserId(input);

  if (!id) {
    const code = discordInviteCode(input);
    if (!code) {
      throw new WidgetError("invalid", "Use a Discord user ID or an invite link");
    }
    const invite = await fetchGuildInvite(code, signal);
    if (!invite.guild) throw new WidgetError("not_found", "That invite doesn't point at a server");
    const icon = invite.guild.icon
      ? `https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.png?size=128`
      : null;
    const meta: string[] = [];
    if (typeof invite.approximate_presence_count === "number") {
      meta.push(`${invite.approximate_presence_count.toLocaleString("en-US")} online`);
    }
    if (typeof invite.approximate_member_count === "number") {
      meta.push(`${invite.approximate_member_count.toLocaleString("en-US")} members`);
    }

    return {
      title: invite.guild.name,
      subtitle: `discord.gg/${invite.code || code}`,
      meta,
      avatar: icon,
      decoration: null,
      banner: null,
      art: icon,
      accent: "#5865f2",
      tag: null,
      badges: [],
      status: null,
    };
  }

  const [lookupResult, presenceResult] = await Promise.allSettled([
    fetchDiscordLookup(id, signal), fetchLanyard(id, signal),
  ]);
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const lookup = lookupResult.status === "fulfilled" ? lookupResult.value : null;
  const presence = presenceResult.status === "fulfilled" ? presenceResult.value : null;
  const presenceError = presenceResult.status === "rejected" ? presenceResult.reason : null;

  if (!lookup && !presence) {
    throw presenceError instanceof WidgetError ? presenceError : new WidgetError("network", "Discord profile lookup is temporarily unavailable");
  }

  const user = presence?.discord_user;
  const lookupUser = lookup?.user;
  const username = user?.username || lookupUser?.username || "discord";
  const displayName =
    user?.display_name ||
    user?.global_name ||
    lookupUser?.global_name ||
    lookupUser?.username ||
    username;
  const avatar =
    lookup?.avatar_url ||
    (user ? avatarUrl(user, 128) : null) ||
    null;
  const decorationAsset =
    user?.avatar_decoration_data?.asset || lookupUser?.avatar_decoration_data?.asset || null;
  const decoration = decorationAsset ? decorationUrl(decorationAsset) : null;
  const banner = lookup?.banner_url || null;
  const showBanner = widget.options.show_banner !== false;
  // Lanyard can omit flags or return 0 while the lookup endpoint still has
  // them; OR the two public payloads instead of letting the first one win.
  const flags = (user?.public_flags ?? 0) | (lookupUser?.public_flags ?? 0);
  const badges = discordProfileBadges(flags, { ...lookupUser, badges: lookup?.badges || lookupUser?.badges });
  const lookupGuild = lookupUser?.primary_guild;
  const tag =
    primaryGuildTag(user?.primary_guild) ||
    (lookupGuild?.identity_enabled !== false ? readableGuildTag(lookupGuild?.tag) : null) ||
    readableGuildTag(lookupUser?.clan?.tag) ||
    null;
  const guildBadge =
    user?.primary_guild?.badge || lookupUser?.primary_guild?.badge || lookupUser?.clan?.badge || null;
  const guildId =
    user?.primary_guild?.identity_guild_id || lookupUser?.primary_guild?.identity_guild_id || null;
  const tagBadge = guildBadge
    ? guildBadge.startsWith("http")
      ? guildBadge
      : guildId
        ? `https://cdn.discordapp.com/guild-tag-badges/${guildId}/${guildBadge}.png?size=32`
        : null
    : null;
  const status = widget.options.status === false ? null : presence?.discord_status ?? null;
  const game = presence ? currentGame(presence.activities) : null;
  const custom = presence ? customStatus(presence.activities) : null;
  const spotify = presence?.spotify ?? null;

  // Elapsed time for the active activity ("Playing VALORANT · for 1h 23m").
  const elapsed = (ms: number | undefined): string | null => {
    if (!ms) return null;
    const totalMinutes = Math.max(0, Math.floor((Date.now() - ms) / 60_000));
    if (totalMinutes < 1) return null;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `for ${days}d ${hours % 24}h`;
    }
    return hours ? `for ${hours}h ${minutes}m` : `for ${minutes}m`;
  };

  // Where the account is active right now (desktop / mobile / web).
  const platforms = presence
    ? [
        presence.active_on_discord_desktop ? "desktop" : null,
        presence.active_on_discord_mobile ? "mobile" : null,
        presence.active_on_discord_web ? "web" : null,
      ].filter(Boolean)
    : [];

  const customText = custom?.trim() ?? null;
  const activity = spotify
    ? `Listening to ${spotify.song}${elapsed(spotify.timestamps?.start) ? ` · ${elapsed(spotify.timestamps?.start)}` : ""}`
    : game
      ? `Playing ${game.name}${elapsed(game.timestamps?.start) ? ` · ${elapsed(game.timestamps?.start)}` : ""}`
      : customText
        ? customText
        : null;

  const joined = snowflakeDate(id);
  const meta: string[] = [];
  if (asBot) {
    meta.push("Discord bot");
    if (joined) meta.push(`Created ${formatJoined(joined)}`);
    return {
      title: displayName,
      subtitle: `@${username}`,
      meta,
      avatar,
      decoration: null,
      banner,
      art: showBanner && (banner || avatar) ? banner || avatar : avatar,
      accent: lookup?.banner_color || "#5865f2",
      tag,
      tagBadge,
      badges,
      status: null,
    };
  }
  if (widget.options.status !== false && status) meta.push(STATUS_LABELS[status]);
  if (platforms.length && widget.options.status !== false) meta.push(platforms.join(" · "));
  if (activity && widget.options.status !== false) meta.push(activity);
  if (joined) meta.push(`Joined ${formatJoined(joined)}`);

  return {
    title: displayName,
    subtitle: `@${username}`,
    meta,
    avatar,
    decoration,
    banner,
    art: showBanner && banner ? banner : avatar,
    accent: lookup?.banner_color || "#5865f2",
    tag,
    tagBadge,
    badges,
    status,
    presenceNotice: presence || widget.options.status === false ? undefined : presenceError instanceof WidgetError && presenceError.code === "not_monitored"
      ? "Live status needs Lanyard. Join discord.gg/lanyard, then refresh."
      : "Live status is temporarily unavailable. Your Discord profile is still shown.",
  };
}

async function robloxProxy<T>(url: string, signal: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/roblox?url=${encodeURIComponent(url)}`, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new WidgetError("network", "Roblox is unreachable right now");
  }
  if (!res.ok) {
    if (res.status === 404) throw new WidgetError("not_found", "That Roblox profile was not found");
    if (res.status === 400 || res.status === 403) {
      throw new WidgetError("invalid", "That doesn't look like a Roblox profile");
    }
    if (res.status >= 500) {
      throw new WidgetError("http", "Roblox is temporarily unreachable — try again in a moment");
    }
    throw new WidgetError("http", `Roblox responded ${res.status}`);
  }
  return (await res.json()) as T;
}

const robloxUserId = (input: string): string | null => {
  const match = input.match(/roblox\.com\/users\/(\d+)/i) || input.match(/^\s*(\d{2,})\s*$/);
  return match?.[1] ?? null;
};

async function robloxLive(
  widget: WidgetInstance,
  input: string,
  signal: AbortSignal,
): Promise<WidgetLive> {
  let id = robloxUserId(input);

  if (!id) {
    const username = input.trim();
    if (!username || username.includes("/") || username.includes(".")) {
      throw new WidgetError("invalid", "Use your Roblox username or profile URL");
    }
    const search = await robloxProxy<{ data?: { id: number; name: string }[] }>(
      `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`,
      signal,
    ).catch(() => null);
    const match =
      search?.data?.find((item) => item.name.toLowerCase() === username.toLowerCase()) ??
      search?.data?.[0];
    id = match ? String(match.id) : null;
  }

  if (!id) throw new WidgetError("not_found", "Couldn't find that Roblox user");

  const [user, headshot, friends, followers] = await Promise.all([
    robloxProxy<RobloxUser>(`https://users.roblox.com/v1/users/${id}`, signal),
    robloxProxy<RobloxThumbnail>(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=150x150&format=Png&isCircular=false`,
      signal,
    ).catch(() => null),
    robloxProxy<CountResponse>(`https://friends.roblox.com/v1/users/${id}/friends/count`, signal).catch(
      () => null,
    ),
    robloxProxy<CountResponse>(
      `https://friends.roblox.com/v1/users/${id}/followers/count`,
      signal,
    ).catch(() => null),
  ]);

  const headshotUrl = headshot?.data?.[0]?.imageUrl ?? null;
  let bodyshot: string | null = null;
  if (widget.options.bodyshot === true) {
    const body = await robloxProxy<RobloxThumbnail>(
      `https://thumbnails.roblox.com/v1/users/avatar?userIds=${id}&size=420x420&format=Png&isCircular=false`,
      signal,
    ).catch(() => null);
    bodyshot = body?.data?.[0]?.imageUrl ?? null;
  }

  const meta: string[] = [];
  if (typeof friends?.count === "number") meta.push(`${friends.count.toLocaleString("en-US")} friends`);
  if (typeof followers?.count === "number") {
    meta.push(`${followers.count.toLocaleString("en-US")} followers`);
  }
  if (user.created) {
    const year = new Date(user.created).getFullYear();
    if (Number.isFinite(year)) meta.push(`Joined ${year}`);
  }

  return {
    title: user.displayName || user.name,
    subtitle: `@${user.name}`,
    meta,
    avatar: headshotUrl,
    decoration: null,
    banner: null,
    art: bodyshot || headshotUrl,
    accent: "#e2231a",
    tag: null,
    badges: [],
    status: null,
  };
}

function githubTarget(input: string): { kind: "user" | "repo"; owner: string; repo?: string } | null {
  const raw = input.trim().replace(/^@/, "");
  if (!raw) return null;
  if (!raw.includes("http") && !raw.includes("/")) return { kind: "user", owner: raw };
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (!/(^|\.)github\.com$/i.test(url.hostname)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (!parts.length) return null;
    if (parts.length >= 2) return { kind: "repo", owner: parts[0], repo: parts[1] };
    return { kind: "user", owner: parts[0] };
  } catch {
    return null;
  }
}

async function githubLive(input: string, signal: AbortSignal): Promise<WidgetLive> {
  const target = githubTarget(input);
  if (!target) throw new WidgetError("invalid", "That doesn't look like a GitHub profile");

  // A numeric handle is an account id, not a GitHub username. The home page
  // pins one so the example card shows that id; asking GitHub for it would
  // only paint a "not found" card.
  if (/^\d+$/.test(target.owner)) {
    return {
      title: target.owner,
      subtitle: "GitHub profile",
      meta: [],
      avatar: null,
      decoration: null,
      banner: null,
      art: null,
      accent: "#e6edf3",
      tag: null,
      badges: [],
      status: null,
    };
  }

  if (target.kind === "repo" && target.repo) {
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}`,
      { signal, headers: { Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) throw new WidgetError("not_found", "That GitHub repository was not found");
    const repo = (await res.json()) as GithubRepo;
    return {
      title: repo.name,
      subtitle: repo.full_name,
      meta: [
        `${repo.stargazers_count.toLocaleString("en-US")} stars`,
        `${repo.forks_count.toLocaleString("en-US")} forks`,
      ],
      avatar: repo.owner.avatar_url,
      decoration: null,
      banner: null,
      art: repo.owner.avatar_url,
      accent: "#e6edf3",
      tag: repo.owner.login,
      badges: [],
      status: null,
    };
  }

  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(target.owner)}`, {
    signal,
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new WidgetError("not_found", "That GitHub profile was not found");
  const user = (await res.json()) as GithubUser;
  return {
    title: user.name || user.login,
    subtitle: `@${user.login}`,
    meta: [
      `${user.followers.toLocaleString("en-US")} followers`,
      `${user.public_repos.toLocaleString("en-US")} repos`,
    ],
    avatar: user.avatar_url,
    decoration: null,
    banner: null,
    art: user.avatar_url,
    accent: "#e6edf3",
    tag: null,
    badges: [],
    status: null,
  };
}

async function steamLive(input: string, signal: AbortSignal): Promise<WidgetLive> {
  const profile = await fetchSteamProfile(input, signal);
  return {
    title: profile.username,
    subtitle: profile.stateLabel,
    meta: profile.memberSince ? [`Member since ${profile.memberSince}`] : [],
    avatar: profile.avatar,
    decoration: null,
    banner: null,
    art: profile.avatar,
    accent: "#66c0f4",
    tag: null,
    badges: [],
    status: profile.online === true ? "online" : profile.online === false ? "offline" : null,
  };
}

/* Stats.fm is the one music service besides Spotify that exposes a public,
   CORS-open profile endpoint — so this card is real data, not a placeholder. */
async function statsfmLive(input: string, signal: AbortSignal): Promise<WidgetLive> {
  const username = input
    .trim()
    .replace(/^https?:\/\/(www\.)?stats\.fm\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
  if (!username) throw new WidgetError("invalid", "Add your Stats.fm username");

  const res = await fetch(`https://api.stats.fm/api/v1/users/${encodeURIComponent(username)}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) throw new WidgetError("not_found", "That Stats.fm user was not found");
  if (res.status === 429) throw new WidgetError("rate_limited", "Stats.fm is rate limiting lookups");
  if (!res.ok) throw new WidgetError("http", `Stats.fm responded ${res.status}`);

  const body = (await res.json()) as {
    item?: {
      customId?: string;
      displayName?: string;
      image?: string | null;
      createdAt?: string;
      isPlus?: boolean;
      isPro?: boolean;
    };
  };
  const item = body.item;
  if (!item?.customId) throw new WidgetError("not_found", "That Stats.fm user was not found");

  const meta: string[] = [item.isPro ? "Stats.fm Pro" : item.isPlus ? "Stats.fm Plus" : "Stats.fm member"];
  if (item.createdAt) {
    const year = new Date(item.createdAt).getFullYear();
    if (Number.isFinite(year)) meta.push(`Joined ${year}`);
  }

  return {
    title: item.displayName?.trim() || item.customId,
    subtitle: `@${item.customId}`,
    meta,
    avatar: item.image ?? null,
    decoration: null,
    banner: null,
    art: item.image ?? null,
    accent: "#1ed760",
    tag: null,
    badges: [],
    status: null,
  };
}

async function spotifyLive(input: string, signal: AbortSignal): Promise<WidgetLive> {
  const id = spotifyTrackId(input);
  if (!id) throw new WidgetError("invalid", "Paste a Spotify track link");
  const track = await fetchSpotifyMeta(id, signal).catch((error) => {
    if (id === FEATURED_TRACK.id && !signal.aborted) return { id, title: `${FEATURED_TRACK.title} - ${FEATURED_TRACK.artist}`, image: FEATURED_TRACK.art };
    throw error;
  });
  const featured = id === FEATURED_TRACK.id;
  const minutes = Math.floor(FEATURED_TRACK.duration / 60);
  const seconds = String(FEATURED_TRACK.duration % 60).padStart(2, "0");

  return {
    title: track.title,
    subtitle: "Spotify track",
    // The featured demo track carries its full public metadata, so the card
    // reads like a real record instead of a single "open" link.
    meta: featured
      ? [
          FEATURED_TRACK.artist,
          FEATURED_TRACK.album,
          FEATURED_TRACK.year,
          `${minutes}:${seconds}`,
        ]
      : ["Open on Spotify"],
    avatar: track.image,
    decoration: null,
    banner: null,
    art: track.image,
    accent: "#1db954",
    tag: null,
    badges: [],
    status: null,
  };
}

const WEATHER_LABELS: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  95: "Thunderstorm",
};

async function weatherLive(input: string, signal: AbortSignal): Promise<WidgetLive> {
  const place = input.trim();
  if (!place) throw new WidgetError("invalid", "Add a city for the weather widget");

  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=en&format=json`,
    { signal },
  );
  if (!geoRes.ok) throw new WidgetError("network", "Weather lookup is unavailable");
  const geo = (await geoRes.json()) as WeatherGeo;
  const location = geo.results?.[0];
  if (!location) throw new WidgetError("not_found", "Couldn't find that city");

  const forecastRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code`,
    { signal },
  );
  if (!forecastRes.ok) throw new WidgetError("network", "Weather data is unavailable");
  const forecast = (await forecastRes.json()) as WeatherForecast;
  const temperature = forecast.current?.temperature_2m;
  const code = forecast.current?.weather_code;
  if (typeof temperature !== "number") throw new WidgetError("network", "Weather data is empty");

  return {
    title: `${Math.round(temperature)}°C`,
    subtitle: [location.name, location.country_code].filter(Boolean).join(", "),
    meta: [code != null ? WEATHER_LABELS[code] ?? "Current weather" : "Current weather"],
    avatar: null,
    decoration: null,
    banner: null,
    art: null,
    accent: "#f2605a",
    tag: null,
    badges: [],
    status: null,
  };
}

async function minecraftLive(input: string, signal: AbortSignal): Promise<WidgetLive> {
  const host = input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!host) throw new WidgetError("invalid", "Add a Minecraft server address");
  const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(host)}`, { signal });
  if (!res.ok) throw new WidgetError("network", "Minecraft status is unavailable");
  const data = (await res.json()) as {
    online?: boolean;
    players?: { online?: number; max?: number };
    motd?: { clean?: string[] };
  };
  const online = Boolean(data.online);
  const players = data.players?.online ?? 0;
  const max = data.players?.max ?? 0;
  return {
    title: host,
    subtitle: online ? `${players}/${max} players online` : "Server offline",
    meta: data.motd?.clean?.[0] ? [data.motd.clean[0]] : [],
    avatar: null,
    decoration: null,
    banner: null,
    art: null,
    accent: "#3f8f53",
    tag: null,
    badges: [],
    status: online ? "online" : "offline",
  };
}

async function youtubeLive(input: string, signal: AbortSignal): Promise<WidgetLive> {
  const url = input.trim().startsWith("http") ? input.trim() : `https://www.youtube.com/watch?v=${input.trim()}`;
  const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
    signal,
  });
  if (!res.ok) throw new WidgetError("not_found", "Couldn't read that YouTube link");
  const data = (await res.json()) as {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
  };
  return {
    title: data.title || "YouTube",
    subtitle: data.author_name || "YouTube",
    meta: ["YouTube video"],
    avatar: null,
    decoration: null,
    banner: null,
    art: data.thumbnail_url || null,
    accent: "#ff0000",
    tag: null,
    badges: [],
    status: null,
  };
}

const timezoneLive = (zone: string): WidgetLive => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(new Date());
  } catch {
    throw new WidgetError("invalid", "That isn't a valid time zone");
  }
  return {
    title: new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date()),
    subtitle: zone.replace(/_/g, " "),
    meta: [
      new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(new Date()),
    ],
    avatar: null,
    decoration: null,
    banner: null,
    art: null,
    accent: "#ef4444",
    tag: null,
    badges: [],
    status: null,
    timezone: zone,
  };
};

async function liveForWidget(widget: WidgetInstance, signal: AbortSignal): Promise<WidgetLive> {
  const content = widget.content.trim();
  switch (widget.platform) {
    case "discord":
      return discordLive(widget, content, signal);
    case "discordbot":
      return discordLive(widget, content, signal, true);
    case "roblox":
      return robloxLive(widget, content, signal);
    case "github":
      return githubLive(content, signal);
    case "steam":
      return steamLive(content, signal);
    case "spotify":
      return spotifyLive(content, signal);
    case "statsfm":
      return statsfmLive(content, signal);
    case "weather":
      return weatherLive(content, signal);
    case "minecraft":
      return minecraftLive(content, signal);
    case "youtube":
      return youtubeLive(content, signal);
    case "timezone":
      return timezoneLive(content);
    default:
      throw new WidgetError("invalid", "Live data isn't available for this platform yet");
  }
}

const LIVE_PLATFORMS = new Set([
  "discord",
  "discordbot",
  "roblox",
  "github",
  "steam",
  "spotify",
  "statsfm",
  "weather",
  "minecraft",
  "youtube",
  "timezone",
]);

export function widgetSupportsLive(platformId: string): boolean {
  return LIVE_PLATFORMS.has(platformId);
}

export function useWidgetLive(widget: WidgetInstance) {
  const platform = WIDGET_PLATFORM_BY_ID.get(widget.platform);
  const content = widget.content.trim();
  const enabled = Boolean(platform && content && LIVE_PLATFORMS.has(widget.platform));
  const key = [
    widget.platform,
    content,
    widget.options.show_banner === false ? "nobanner" : "banner",
    widget.options.bodyshot === true ? "body" : "head",
    widget.options.status === false ? "nostatus" : "status",
  ].join("|");

  const interval = widget.platform === "discord" ? 15_000 : widget.platform === "timezone" ? 60_000 : 180_000;

  return usePolled(enabled, key, (signal) => liveForWidget(widget, signal), interval, 120_000);
}
