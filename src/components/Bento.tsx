import type { CSSProperties, ReactNode } from "react";
import {
  fetchGuildInvite,
  fetchSpotifyMeta,
  type DiscordIdentity,
  type GuildInvite,
  type LanyardData,
} from "../lib/api";
import { STATUS_COLORS, STATUS_LABELS, usePolled, type Polled } from "../lib/hooks";
import { avatarUrl, currentGame, customStatus, formatClock } from "../lib/format";
import { FEATURED_TRACK, inviteCode, spotifyTrackId, type Settings } from "../config";
import { discordBadges, guildTagBadge, primaryGuildTag } from "../lib/discord";
import { fetchSteamProfile, steamProfileTarget } from "../lib/steam";
import { ScrollText } from "./Marquee";
import { Tooltip } from "./Tooltip";
import {
  CalendarIcon,
  ClockIcon,
  DiscIcon,
  DiscordBadgeIcon,
  DiscordIcon,
  ExternalIcon,
  HashIcon,
  SignalIcon,
  SpotifyIcon,
  SteamIcon,
  UsersIcon,
} from "./Icons";

/* ------------------------------------------------------------------ shell */

type CardTone = "discord" | "server" | "spotify" | "steam";

function Card({
  tone,
  art,
  label,
  labelIcon,
  action,
  delay = 0,
  children,
  onClick,
}: {
  tone: CardTone;
  art?: string | null;
  label: string;
  labelIcon: ReactNode;
  action?: ReactNode;
  delay?: number;
  children: ReactNode;
  onClick?: () => void;
}) {
  const style = { "--card-delay": `${delay}ms` } as CSSProperties;

  const content = (
    <>
      {art ? (
        <span
          className="bcard-art"
          style={{ backgroundImage: `url("${art}")` }}
          aria-hidden="true"
        />
      ) : null}
      <span className="bcard-tint" aria-hidden="true" />
      <span className="bcard-scrim" aria-hidden="true" />
      <span className="bcard-sheen" aria-hidden="true" />
      <span className="bcard-body">{children}</span>
      {action}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`bcard bcard--${tone} bcard--button`}
        style={style}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <article className={`bcard bcard--${tone}`} style={style}>
      {content}
    </article>
  );
}

function Media({ src, fallback }: { src?: string | null; fallback: ReactNode }) {
  return <span className="bcard-media">{src ? <img src={src} alt="" /> : fallback}</span>;
}

function MetaItem({
  icon,
  children,
  grow = false,
}: {
  icon?: ReactNode;
  children: ReactNode;
  grow?: boolean;
}) {
  return (
    <span className={`bcard-meta-item${grow ? " bcard-meta-item--grow" : ""}`}>
      {icon}
      {children}
    </span>
  );
}

function Dot({ color = "#7dd3fc" }: { color?: string }) {
  return <i className="bcard-dot" style={{ background: color }} />;
}

function SkeletonCard({ label, delay = 0 }: { label: string; delay?: number }) {
  return (
    <article className="bcard bcard--loading" style={{ "--card-delay": `${delay}ms` } as CSSProperties}>
      <span className="bcard-body">
        <span className="bcard-skel-row">
          <span className="skeleton bcard-skel-media" />
          <span className="bcard-skel-lines">
            <i className="skeleton" style={{ width: 110, height: 10 }} />
            <i className="skeleton" style={{ width: 70, height: 8 }} />
          </span>
        </span>
      </span>
    </article>
  );
}

/* ---------------------------------------------------------- discord user */

export function DiscordCard({
  lanyard,
  identity,
  guildId,
  onConfigure,
}: {
  lanyard: Polled<LanyardData>;
  /** Public profile used when Lanyard isn't watching this account. */
  identity?: DiscordIdentity | null;
  guildId: string | null;
  onConfigure: () => void;
}) {
  if (!lanyard.data) {
    if (lanyard.loading) return <SkeletonCard label="Discord" />;
    if (identity) {
      const badges = discordBadges(identity.publicFlags);
      return (
        <Card
          tone="discord"
          art={identity.avatar}
          label="Discord"
          labelIcon={<DiscordIcon size={11} />}
        >
          <Media src={identity.avatar} fallback={<DiscordIcon size={22} />} />
          <span className="bcard-main">
            <span className="bcard-line">
              <ScrollText className="bcard-title">{identity.displayName}</ScrollText>
              {badges.length ? (
                <span className="bcard-badges">
                  {badges.slice(0, 3).map((badge) => (
                    <Tooltip key={`${badge.kind}-${badge.flag}`} text={badge.label}>
                      <DiscordBadgeIcon kind={badge.kind} label={badge.label} />
                    </Tooltip>
                  ))}
                </span>
              ) : null}
            </span>
            <ScrollText className="bcard-sub">@{identity.username}</ScrollText>
            <span className="bcard-meta">
              <MetaItem icon={<Dot color="#64748b" />}>Presence not shared</MetaItem>
            </span>
          </span>
        </Card>
      );
    }
    return (
      <Card
        tone="discord"
        label="Discord"
        labelIcon={<DiscordIcon size={11} />}
        onClick={onConfigure}
      >
        <Media fallback={<DiscordIcon size={22} />} />
        <span className="bcard-main">
          <span className="bcard-title">Discord</span>
          <span className="bcard-sub">
            {lanyard.error?.code === "not_monitored" ? "Not monitored yet" : "Not connected"}
          </span>
        </span>
      </Card>
    );
  }

  const user = lanyard.data.discord_user;
  const game = currentGame(lanyard.data.activities);
  const custom = customStatus(lanyard.data.activities);
  const badges = discordBadges(user.public_flags);
  const guildTag = primaryGuildTag(user.primary_guild);
  const guildBadge = guildTagBadge(user.primary_guild);
  const displayName = user.display_name || user.global_name || user.username;
  const activity = custom ?? (game ? `Playing ${game.name}` : null);

  return (
    <Card
      tone="discord"
      art={avatarUrl(user, 128)}
      label="Discord"
      labelIcon={<DiscordIcon size={11} />}
    >
      <Media src={avatarUrl(user, 128)} fallback={<DiscordIcon size={22} />} />
      <span className="bcard-main">
        <span className="bcard-line">
          <ScrollText className="bcard-title">{displayName}</ScrollText>
          {guildBadge || guildTag ? (
            <span className="bcard-guild-tag" title={guildTag ? `${guildTag} server tag` : "Server tag"}>
              {guildBadge ? <img src={guildBadge} alt="" width={11} height={11} loading="lazy" /> : null}
              {guildTag}
            </span>
          ) : null}
          {badges.length ? (
            <span className="bcard-badges">
              {badges.slice(0, 3).map((badge) => (
                <Tooltip key={`${badge.kind}-${badge.flag}`} text={badge.label}>
                  <DiscordBadgeIcon kind={badge.kind} label={badge.label} />
                </Tooltip>
              ))}
            </span>
          ) : null}
        </span>
        <ScrollText className="bcard-sub">
          @{user.username}
          {activity ? ` · ${activity}` : ""}
        </ScrollText>
      </span>
    </Card>
  );
}

/* --------------------------------------------------------- discord guild */

export function ServerCard({
  request,
  invite,
  onConfigure,
}: {
  request: Polled<GuildInvite>;
  invite: string;
  onConfigure: () => void;
}) {
  const code = inviteCode(invite);

  if (!request.data) {
    if (request.loading) return <SkeletonCard label="Server" delay={70} />;
    return (
      <Card
        tone="server"
        label="Server"
        labelIcon={<DiscordIcon size={11} />}
        delay={70}
        onClick={onConfigure}
      >
        <Media fallback={<DiscordIcon size={22} />} />
        <span className="bcard-main">
          <span className="bcard-title">Server</span>
          <span className="bcard-sub">
            {request.error?.code === "not_found" ? "Invite expired" : "Not connected"}
          </span>
        </span>
      </Card>
    );
  }

  const data = request.data;
  const guild = data.guild;
  if (!guild) {
    return (
      <Card
        tone="server"
        label="Server"
        labelIcon={<DiscordIcon size={11} />}
        delay={70}
        onClick={onConfigure}
      >
        <Media fallback={<DiscordIcon size={22} />} />
        <span className="bcard-main">
          <span className="bcard-title">Server</span>
          <span className="bcard-sub">Invite has no server</span>
        </span>
      </Card>
    );
  }

  const icon = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : null;

  return (
    <Card
      tone="server"
      art={icon}
      label="Server"
      labelIcon={<DiscordIcon size={11} />}
      delay={70}
      action={
        <a
          className="bcard-action"
          href={`https://discord.gg/${data.code || code}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`Join ${guild.name}`}
        >
          <ExternalIcon size={12} />
        </a>
      }
    >
      <Media
        src={icon}
        fallback={<span className="bcard-initial">{guild.name.slice(0, 1).toUpperCase()}</span>}
      />
      <span className="bcard-main">
        <ScrollText className="bcard-title">{guild.name}</ScrollText>
        <ScrollText className="bcard-sub">{guild.description || "Discord server"}</ScrollText>
        <span className="bcard-meta">
          {typeof data.approximate_presence_count === "number" ? (
            <MetaItem icon={<Dot />}>
              {data.approximate_presence_count.toLocaleString("en-US")} online
            </MetaItem>
          ) : typeof data.approximate_member_count === "number" ? (
            <MetaItem icon={<UsersIcon size={10} />}>
              {data.approximate_member_count.toLocaleString("en-US")} members
            </MetaItem>
          ) : null}
        </span>
      </span>
    </Card>
  );
}

/* --------------------------------------------------------------- spotify */

export function SpotifyCard({
  lanyard,
  track,
}: {
  lanyard: Polled<LanyardData>;
  track: string;
}) {
  const live = lanyard.data?.spotify ?? null;
  const id = spotifyTrackId(track);
  const isFeatured = id === FEATURED_TRACK.id;
  const fallback = usePolled(
    !live && !isFeatured && Boolean(id),
    id,
    (signal) => fetchSpotifyMeta(id, signal),
    600_000,
  );

  if (lanyard.loading && !lanyard.data) return <SkeletonCard label="Spotify" delay={140} />;

  const featured = isFeatured ? FEATURED_TRACK : null;
  const cover = live?.album_art_url ?? featured?.art ?? fallback.data?.image ?? null;
  const title = live?.song ?? featured?.title ?? fallback.data?.title ?? "Nothing playing";
  const artist = live?.artist ?? featured?.artist ?? (fallback.data ? "Saved track" : "Spotify");
  const hasTrack = Boolean(live || featured || fallback.data);
  const trackId = live ? live.track_id : id;
  const href = hasTrack ? `https://open.spotify.com/track/${trackId}` : undefined;

  const meta = live
    ? [{ icon: <DiscIcon size={10} />, text: live.album }]
    : featured
      ? [{ icon: <DiscIcon size={10} />, text: featured.album }]
      : [];

  return (
    <Card
      tone="spotify"
      art={cover}
      label="Spotify"
      labelIcon={<SpotifyIcon size={11} />}
      delay={140}
      action={
        href ? (
          <a
            className="bcard-action"
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${title} on Spotify`}
          >
            <ExternalIcon size={12} />
          </a>
        ) : undefined
      }
    >
      <a
        className="bcard-media-link"
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={hasTrack ? `Open ${title} on Spotify` : "Spotify"}
      >
        <Media src={cover} fallback={<SpotifyIcon size={22} className="bcard-media-icon" />} />
      </a>
      <span className="bcard-main">
        <ScrollText className="bcard-title">{title}</ScrollText>
        <ScrollText className="bcard-sub">{artist}</ScrollText>
        {meta.length ? (
          <span className="bcard-meta">
            {meta.map((item) => (
              <MetaItem key={item.text} icon={item.icon}>
                {item.text}
              </MetaItem>
            ))}
          </span>
        ) : null}
      </span>
    </Card>
  );
}

/* ----------------------------------------------------------------- steam */

export function SteamCard({
  url,
  onConfigure,
}: {
  url: string;
  onConfigure: () => void;
}) {
  const target = steamProfileTarget(url);
  const request = usePolled(Boolean(url), url, (signal) => fetchSteamProfile(url, signal), 120_000);

  if (!url) {
    return (
      <Card
        tone="steam"
        label="Steam"
        labelIcon={<SteamIcon size={11} />}
        delay={210}
        onClick={onConfigure}
      >
        <Media fallback={<SteamIcon size={22} />} />
        <span className="bcard-main">
          <span className="bcard-title">Steam</span>
          <span className="bcard-sub">Not connected</span>
        </span>
      </Card>
    );
  }

  if (request.loading && !request.data) return <SkeletonCard label="Steam" delay={210} />;

  const profile = request.data;
  if (!profile) {
    return (
      <Card
        tone="steam"
        label="Steam"
        labelIcon={<SteamIcon size={11} />}
        delay={210}
        onClick={target ? undefined : onConfigure}
        action={
          target ? (
            <a
              className="bcard-action"
              href={target.profileUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open Steam profile"
            >
              <ExternalIcon size={12} />
            </a>
          ) : undefined
        }
      >
        <Media fallback={<SteamIcon size={22} />} />
        <span className="bcard-main">
          <span className="bcard-title">Steam</span>
          <span className="bcard-sub">
            {request.error?.code === "invalid" ? "That URL looks wrong" : "Profile saved"}
          </span>
          <span className="bcard-meta">
            <MetaItem icon={<SignalIcon size={10} />}>
              {request.error?.code === "network" ? "Steam unreachable" : "Not live yet"}
            </MetaItem>
          </span>
        </span>
      </Card>
    );
  }

  const subtitle = profile.summary || (profile.customUrl ? `@${profile.customUrl}` : "Steam profile");

  return (
    <Card
      tone="steam"
      art={profile.avatar}
      label="Steam"
      labelIcon={<SteamIcon size={11} />}
      delay={210}
      action={
        <a
          className="bcard-action"
          href={profile.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${profile.username} on Steam`}
        >
          <ExternalIcon size={12} />
        </a>
      }
    >
      <a
        className="bcard-media-link"
        href={profile.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${profile.username} on Steam`}
      >
        <Media src={profile.avatar} fallback={<SteamIcon size={22} />} />
      </a>
      <span className="bcard-main">
        <ScrollText className="bcard-title">{profile.username}</ScrollText>
        <ScrollText className="bcard-sub">{subtitle}</ScrollText>
        <span className="bcard-meta">
          <MetaItem
            icon={
              <Dot
                color={
                  profile.online === null ? "#7dd3fc" : profile.online ? "#4ade80" : "#64748b"
                }
              />
            }
          >
            {profile.stateLabel}
          </MetaItem>
          {profile.memberSince ? (
            <MetaItem icon={<CalendarIcon size={10} />}>since {profile.memberSince}</MetaItem>
          ) : null}
        </span>
      </span>
    </Card>
  );
}

/* ----------------------------------------------------------------- bento */

export function Bento({
  lanyard,
  settings,
  onConfigure,
}: {
  lanyard: Polled<LanyardData>;
  settings: Settings;
  onConfigure: () => void;
}) {
  const code = inviteCode(settings.discordInvite);
  const invite = usePolled(
    Boolean(code),
    code,
    (signal) => fetchGuildInvite(code, signal),
    120_000,
  );

  // When Lanyard isn't watching the account, the invite still carries a real
  // public profile (name, avatar, badges) for the person who made it.
  const inviter = invite.data?.inviter ?? null;
  const identity: DiscordIdentity | null = inviter?.id
    ? {
        id: inviter.id,
        username: inviter.username || "discord",
        displayName: inviter.global_name || inviter.username || "discord",
        avatar: inviter.avatar
          ? `https://cdn.discordapp.com/avatars/${inviter.id}/${inviter.avatar}.png?size=128`
          : null,
        banner: null,
        accent: null,
        publicFlags: inviter.public_flags ?? 0,
      }
    : null;

  return (
    <div className="bento-grid" data-reveal>
      <DiscordCard
        lanyard={lanyard}
        identity={identity}
        guildId={invite.data?.guild?.id ?? null}
        onConfigure={onConfigure}
      />
      <ServerCard request={invite} invite={settings.discordInvite} onConfigure={onConfigure} />
      <SpotifyCard lanyard={lanyard} track={settings.spotifyTrack} />
      <SteamCard url={settings.steamUrl} onConfigure={onConfigure} />
    </div>
  );
}
