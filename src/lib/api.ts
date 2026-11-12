export type LanyardUser = {
  id: string;
  username: string;
  global_name: string | null;
  display_name?: string | null;
  avatar: string | null;
  avatar_decoration_data: { asset: string; sku_id?: string } | null;
  primary_guild?: {
    identity_guild_id?: string;
    identity_enabled?: boolean;
    tag?: string;
    badge?: string;
  } | null;
  public_flags?: number;
  discriminator?: string;
  bot?: boolean;
};

export type DiscordStatus = "online" | "idle" | "dnd" | "offline";

export type Activity = {
  name: string;
  type: number;
  details?: string;
  state?: string;
  application_id?: string;
  emoji?: { name: string; id?: string } | null;
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
  timestamps?: { start?: number; end?: number };
};

export type Spotify = {
  track_id: string;
  album: string;
  album_art_url: string;
  artist: string;
  song: string;
  timestamps: { start: number; end: number };
};

export type LanyardData = {
  discord_user: LanyardUser;
  discord_status: DiscordStatus;
  activities: Activity[];
  listening_to_spotify: boolean;
  spotify: Spotify | null;
  active_on_discord_desktop: boolean;
  active_on_discord_mobile: boolean;
  active_on_discord_web: boolean;
};

export type WidgetErrorCode =
  | "not_monitored"
  | "widget_disabled"
  | "unauthorized"
  | "rate_limited"
  | "not_found"
  | "invalid"
  | "network"
  | "http";

export class WidgetError extends Error {
  code: WidgetErrorCode;

  constructor(code: WidgetErrorCode, message: string) {
    super(message);
    this.name = "WidgetError";
    this.code = code;
  }
}

const jsonHeaders = { Accept: "application/json" };

async function request(url: string, signal: AbortSignal, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { signal, ...init });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new WidgetError("network", "Couldn't reach the API");
  }
}

export async function fetchLanyard(userId: string, signal: AbortSignal): Promise<LanyardData> {
  const res = await request(
    `https://api.lanyard.rest/v1/users/${encodeURIComponent(userId)}`,
    signal,
    { headers: jsonHeaders },
  );

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
    if (body?.error?.code === "user_not_monitored") {
      throw new WidgetError("not_monitored", "This account isn't monitored by Lanyard yet");
    }
    throw new WidgetError("http", `Lanyard responded ${res.status}`);
  }

  const body = (await res.json()) as { data?: LanyardData };
  if (!body.data) throw new WidgetError("http", "Lanyard returned an empty payload");
  return body.data;
}

export type DiscordIdentity = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  banner: string | null;
  accent: string | null;
  publicFlags: number;
};

/**
 * Public Discord profile (name, avatar, banner, badges) with no presence.
 *
 * Lanyard only knows accounts that joined its server, so this is the honest
 * fallback for everyone else: real identity, no invented online status.
 */
export async function fetchDiscordIdentity(
  userId: string,
  signal: AbortSignal,
): Promise<DiscordIdentity> {
  const res = await request(
    `https://discord-lookup.lookupbotdc.workers.dev/search/${encodeURIComponent(userId)}`,
    signal,
    { headers: jsonHeaders },
  );
  if (res.status === 404) throw new WidgetError("not_found", "That Discord ID has no public profile");
  if (res.status === 429) throw new WidgetError("rate_limited", "Discord lookup is rate limited");
  if (!res.ok) throw new WidgetError("http", `Discord lookup responded ${res.status}`);
  const body = (await res.json()) as {
    user?: {
      id?: string;
      username?: string;
      global_name?: string | null;
      public_flags?: number;
    };
    avatar_url?: string | null;
    banner_url?: string | null;
    banner_color?: string | null;
  };
  const user = body.user;
  if (!user?.id || !user.username) {
    throw new WidgetError("not_found", "That Discord ID has no public profile");
  }
  return {
    id: user.id,
    username: user.username,
    displayName: user.global_name || user.username,
    avatar: body.avatar_url ?? null,
    banner: body.banner_url ?? null,
    accent: body.banner_color ?? null,
    publicFlags: user.public_flags ?? 0,
  };
}

export type GuildInvite = {
  code: string;
  /** Public profile of whoever created the invite — real name and avatar. */
  inviter?: {
    id?: string;
    username?: string;
    global_name?: string | null;
    avatar?: string | null;
    public_flags?: number;
  } | null;
  guild: {
    id: string;
    name: string;
    icon: string | null;
    description: string | null;
  } | null;
  approximate_member_count: number | null;
  approximate_presence_count: number | null;
  expires_at: string | null;
};

export async function fetchGuildInvite(code: string, signal: AbortSignal): Promise<GuildInvite> {
  const res = await request(
    `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`,
    signal,
    { headers: jsonHeaders },
  );

  if (res.status === 404) {
    throw new WidgetError("not_found", "That invite is invalid or expired");
  }
  if (!res.ok) {
    throw new WidgetError("http", `Discord responded ${res.status}`);
  }
  const body = (await res.json()) as GuildInvite;
  if (!body.guild) throw new WidgetError("not_found", "That invite doesn't point at a server");
  return body;
}

export type SpotifyMeta = { id: string; title: string; image: string | null };

export async function fetchSpotifyMeta(id: string, signal: AbortSignal): Promise<SpotifyMeta> {
  const target = encodeURIComponent(`https://open.spotify.com/track/${id}`);
  const res = await request(`https://open.spotify.com/oembed?url=${target}`, signal, {
    headers: jsonHeaders,
  });
  if (!res.ok) throw new WidgetError("not_found", "Couldn't load that Spotify track");
  const body = (await res.json()) as { title?: string; thumbnail_url?: string };
  return { id, title: body.title ?? "Spotify track", image: body.thumbnail_url ?? null };
}
