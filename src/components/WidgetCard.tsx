import { useEffect, useState, type CSSProperties } from "react";
import { hexToRgba } from "../lib/about";
import {
  WIDGET_PLATFORM_BY_ID,
  defaultWidgetOptions,
  sampleContentFor,
  widgetProfileUrl,
  type WidgetDesign,
  type WidgetInstance,
  type WidgetPlatform,
} from "../lib/widgets";
import {
  useWidgetLive,
  widgetSupportsLive,
  type LiveStatus,
  type WidgetLive,
} from "../lib/widgetLive";
import { STATUS_COLORS } from "../lib/hooks";
import { discordProfileBadges, discordBadges, isDiscordUserId, type DiscordBadge } from "../lib/discord";
import type { WidgetError } from "../lib/api";
import { WidgetPlatformIcon } from "./WidgetPlatformIcon";
import { DiscordBadgeIcon, SettingsIcon, TrashIcon } from "./Icons";
import { Tooltip } from "./Tooltip";
import "../widgets.css";

function WidgetAvatar({
  platform,
  src,
  decoration,
  status,
}: {
  platform: WidgetPlatform;
  src: string | null;
  decoration: string | null;
  status: WidgetLive["status"];
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <span className={`widget-card-avatar${status ? ` is-${status}` : ""}`}>
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <WidgetPlatformIcon id={platform.id} size={22} />
      )}
      {decoration ? (
        <img
          className="widget-card-decoration"
          src={decoration}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      {status ? (
        <i
          className="widget-card-status"
          style={{
            background: STATUS_COLORS[status],
            boxShadow: `0 0 0 2px rgba(9, 10, 12, 0.85), 0 0 8px ${STATUS_COLORS[status]}`,
          }}
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}

function WidgetCardSurface({
  widget,
  platform,
  design,
  live,
  loading,
  error,
  className = "",
  onConfigure,
  onRemove,
  preview = false,
}: {
  widget: WidgetInstance;
  platform: WidgetPlatform;
  design: WidgetDesign;
  live: WidgetLive | null;
  loading: boolean;
  error: WidgetError | null;
  className?: string;
  onConfigure?: (widget: WidgetInstance) => void;
  onRemove?: (widget: WidgetInstance) => void;
  preview?: boolean;
}) {
  const content = widget.content.trim();
  const configured = Boolean(content);
  const supported = widgetSupportsLive(platform.id);
  const hasArt = design.backgroundStyle === "art" && Boolean(live?.art);
  const background = hasArt ? "art" : design.backgroundStyle === "art" ? "frosted" : design.backgroundStyle;
  const compact = widget.options.compact === true;
  // A widget with no surface of its own still has a readable version — the
  // card stays transparent and relies on its own type and chips.
  const bare = design.backgroundOpacity === 0;
  const profileHref = widgetProfileUrl(platform.id, content);

  const title = live?.title?.trim() || (configured ? content : platform.name);
  const subtitle =
    live?.subtitle ||
    (configured
      ? error
        ? error.message
        : loading
          ? "Reading public profile…"
          : supported
            ? "Live data unavailable"
            : profileHref
              ? `Open on ${platform.name}`
              : "Saved profile"
      : `Add ${platform.contentLabel.toLowerCase()}`);
  // Discord exposes a lot of raw presence fields; one line keeps the card
  // readable instead of turning it into a wall of labels.
  const meta = design.showMeta
    ? (live?.meta.filter(Boolean).slice(0, platform.id === "discord" ? 2 : 3) ?? [])
    : [];

  const style = {
    "--wg-border-color": hexToRgba(design.borderColor, design.borderOpacity),
    "--wg-border-width": `${design.borderWidth}px`,
    "--wg-bg": hexToRgba(design.backgroundColor, design.backgroundOpacity),
    "--wg-bg-strong": hexToRgba(
      design.backgroundColor,
      design.backgroundOpacity,
    ),
    "--wg-grad-from": hexToRgba(
      design.gradientFrom,
      design.backgroundOpacity,
    ),
    "--wg-grad-to": hexToRgba(design.gradientTo, design.backgroundOpacity),
    "--wg-art-opacity": (design.backgroundOpacity * design.artOpacity).toFixed(2),
    "--wg-scrim-opacity": design.backgroundOpacity * design.scrimOpacity,
    "--wg-blur": `${design.backgroundBlur}px`,
    "--wg-radius": `${design.radius}px`,
    "--wg-brand": platform.color,
    "--wg-scale": design.scale,
    "--wg-edge": design.outlineColor,
    "--wg-edge-speed": `${design.outlineSpeed || 4}s`,
  } as CSSProperties;

  return (
    <article
      className={`widget-card widget-card--bg-${background}${hasArt ? " has-art" : ""}${
        live?.status ? ` is-${live.status}` : ""
      }${loading && !live ? " is-loading" : ""}${error ? " has-error" : ""}${
        compact ? " is-compact" : ""
      }${bare ? " is-bare" : ""}${preview ? " widget-card--preview" : ""}${
        design.outlineEffect && design.outlineEffect !== "none"
          ? ` has-edge-${design.outlineEffect}`
          : ""
      }${design.hoverLift === false ? " no-lift" : ""}${
        className ? ` ${className}` : ""
      }`}
      style={style}
      data-platform={platform.id}
    >
      {hasArt && live?.art ? (
        <span
          className="widget-card-art"
          style={{ backgroundImage: `url("${live.art.replace(/"/g, '\\"')}")` }}
          aria-hidden="true"
        />
      ) : null}
      <span className="widget-card-scrim" aria-hidden="true" />

      <span className="widget-card-inner">
        <span className="widget-card-head">
          <WidgetAvatar
            platform={platform}
            src={live?.avatar ?? null}
            decoration={live?.decoration ?? null}
            status={live?.status ?? null}
          />

          <span className="widget-card-copy">
            <span className="widget-card-name">
              <b title={title}>{title}</b>
              {live?.tag ? (
                <span className="widget-card-tag">
                  {live.tagBadge ? (
                    <img
                      src={live.tagBadge}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  {live.tag}
                </span>
              ) : null}
              {design.showBadges && live?.badges.length ? (
                <span className="widget-card-badges">
                  {live.badges.map((badge) => (
                    <Tooltip key={`${badge.label}-${badge.art || badge.flag}`} text={badge.label}>
                      <span className="widget-staged-badge" data-stage={badge.stage || 1}><DiscordBadgeIcon
                        kind={badge.kind}
                        label={badge.label}
                        art={badge.art}
                        size={12}
                      />{badge.count?<small>{badge.count}</small>:null}</span>
                    </Tooltip>
                  ))}
                </span>
              ) : null}
            </span>
            <span className={`widget-card-handle${error ? " is-error" : ""}`} title={subtitle}>
              {subtitle}
            </span>
            {/* The stats live inside the text column, under the subtitle, like a
                real profile card — a separate bottom row made every card with
                meta taller than the one beside it. */}
            <span className="widget-card-bottom">
              <span className="widget-card-meta">
                {meta.map((item, index) => (
                  <span className="widget-card-chip" key={`${item}-${index}`} title={item}>
                    {/* Anything counting people who are on right now gets the
                        same green light, so "412 online" reads at a glance. */}
                    {/\bonline\b/i.test(item) && !live?.status ? (
                      <i className="widget-card-online" aria-hidden="true" />
                    ) : null}
                    {item}
                  </span>
                ))}
              </span>
            </span>
          </span>
        </span>
      </span>

      {live?.presenceNotice ? <p className="widget-card-presence-notice">{live.presenceNotice}</p> : null}
      {onConfigure || onRemove ? (
        <span className="widget-card-actions">
          {onConfigure ? (
            <button
              type="button"
              className="widget-card-action"
              onClick={() => onConfigure(widget)}
              aria-label={`Configure ${platform.name} widget`}
            >
              <SettingsIcon size={13} />
            </button>
          ) : null}
          {onRemove ? (
            <button
              type="button"
              className="widget-card-action widget-card-action--danger"
              onClick={() => onRemove(widget)}
              aria-label={`Remove ${platform.name} widget`}
            >
              <TrashIcon size={13} />
            </button>
          ) : null}
        </span>
      ) : null}
    </article>
  );
}

export function WidgetCard({
  widget,
  design,
  onConfigure,
  onRemove,
  className = "",
  refreshKey = 0,
}: {
  widget: WidgetInstance;
  design: WidgetDesign;
  onConfigure?: (widget: WidgetInstance) => void;
  onRemove?: (widget: WidgetInstance) => void;
  className?: string;
  refreshKey?: number;
  /** Kept for older call sites; widget cards are display-only now. */
  interactive?: boolean;
}) {
  const platform = WIDGET_PLATFORM_BY_ID.get(widget.platform);
  const result = useWidgetLive(widget);
  useEffect(() => { if (refreshKey) result.refresh(); }, [refreshKey, result.refresh]);

  let displayed: string[] = [];
  try { const parsed = JSON.parse(String(widget.options.profile_badges || "[]")); if (Array.isArray(parsed)) displayed = parsed.filter((id): id is string => typeof id === "string"); } catch { /* no extra badges */ }
  const extra = widget.platform === "discord" && isDiscordUserId(widget.content) ? discordProfileBadges(0, null, displayed) : [];
  const live = result.data ? { ...result.data, badges: [...result.data.badges, ...extra.filter((badge) => !result.data!.badges.some((entry) => entry.art === badge.art))] } : null;
  if (!platform) return null;

  return (
    <WidgetCardSurface
      widget={widget}
      platform={platform}
      design={design}
      live={live}
      loading={result.loading}
      error={result.error}
      className={className}
      onConfigure={onConfigure}
      onRemove={onRemove}
    />
  );
}

/** Believable live data per platform, so the editor previews a real card
 *  instead of a grey placeholder. Connected widgets preview their real data. */
type SampleBadge = DiscordBadge;

const SAMPLE_BADGES: SampleBadge[] = discordBadges(
  (1 << 0) | (1 << 1) | (1 << 2) | (1 << 9) | (1 << 17),
);

const SAMPLE_LIVE: Record<
  string,
  {
    title: string;
    subtitle: string;
    meta: string[];
    status?: LiveStatus;
    tag?: string;
    badges?: SampleBadge[];
  }
> = {
  discord: {
    title: "tourn.lol",
    subtitle: "Community server",
    meta: ["1,284 members", "412 online"],
    status: "online",
    tag: "TOURN",
    badges: SAMPLE_BADGES,
  },
  discordbot: {
    title: "tourn.lol bot",
    subtitle: "@tourn",
    meta: ["Discord bot", "Created Jan 2024"],
    badges: SAMPLE_BADGES.slice(0, 3),
  },
  github: { title: "tourn-lol", subtitle: "GitHub profile", meta: ["38 repositories", "126 followers"] },
  roblox: { title: "tourn", subtitle: "Roblox profile", meta: ["3.1K followers", "212 friends"], status: "online" },
  lastfm: { title: "tourn", subtitle: "Last.fm profile", meta: ["42,318 scrobbles", "Top artist · Burial"] },
  statsfm: { title: "tourn", subtitle: "Stats.fm profile", meta: ["128,904 minutes", "Top artist · Aphex Twin"] },
  valorant: { title: "tourn", subtitle: "Immortal 2 · 74 RR", meta: ["1.24 K/D", "18 wins"], status: "online" },
  timezone: { title: "20:41", subtitle: "Europe/London", meta: ["BST · UTC+1"] },
  steam: { title: "tourn", subtitle: "Steam profile", meta: ["312 games", "1,204 hours"], status: "online" },
  twitch: { title: "tourn", subtitle: "Twitch channel", meta: ["24.6K followers", "Live now"], status: "online" },
  spotify: { title: "tourn", subtitle: "Spotify profile", meta: ["Now playing · Bloom"] },
  minecraft: { title: "play.tourn.lol", subtitle: "Minecraft server", meta: ["48 / 200 online", "1.20.4"], status: "online" },
  clashofclans: { title: "tourn", subtitle: "Town Hall 15", meta: ["5,842 trophies", "Clan · TOURN"] },
  clashroyale: { title: "tourn", subtitle: "Arena 23", meta: ["7,102 trophies"] },
  brawlstars: { title: "tourn", subtitle: "Brawl Stars profile", meta: ["32,880 trophies", "68 brawlers"] },
  weather: { title: "18°C", subtitle: "London", meta: ["Partly cloudy", "Feels like 17°C"] },
};

export function WidgetCardPreview({
  design,
  platformId = "discord",
  content,
  className = "",
}: {
  design: WidgetDesign;
  platformId?: string;
  content?: string;
  className?: string;
}) {
  const platform = WIDGET_PLATFORM_BY_ID.get(platformId);
  if (!platform) return null;

  const sample = SAMPLE_LIVE[platform.id] ?? {
    title: content?.trim() || sampleContentFor(platform.id),
    subtitle: `${platform.name} profile`,
    meta: [] as string[],
  };

  const widget: WidgetInstance = {
    id: `preview-${platform.id}`,
    platform: platform.id,
    content: content?.trim() || sampleContentFor(platform.id),
    options: defaultWidgetOptions(platform),
  };

  const live: WidgetLive = {
    title: sample.title,
    subtitle: sample.subtitle,
    meta: sample.meta,
    avatar: null,
    decoration: null,
    banner: null,
    art: null,
    accent: platform.color,
    tag: sample.tag ?? null,
    badges: sample.badges ?? [],
    status: (sample.status ?? null) as LiveStatus,
  };

  return (
    <WidgetCardSurface
      widget={widget}
      platform={platform}
      design={design}
      live={live}
      loading={false}
      error={null}
      preview
      className={className}
    />
  );
}
