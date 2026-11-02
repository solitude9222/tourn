import { useEffect, useState, type CSSProperties } from "react";
import { hexToRgba } from "../lib/about";
import {
  WIDGET_PLATFORM_BY_ID,
  widgetProfileUrl,
  type WidgetDesign,
  type WidgetInstance,
  type WidgetPlatform,
} from "../lib/widgets";
import { useWidgetLive, widgetSupportsLive, type WidgetLive } from "../lib/widgetLive";
import { STATUS_COLORS } from "../lib/hooks";
import type { WidgetError } from "../lib/api";
import { PlatformIcon } from "./PlatformIcons";
import { DiscordBadgeIcon, SettingsIcon, TrashIcon } from "./Icons";
import "../widgets.css";

const SQUARE_AVATARS = new Set(["roblox", "spotify", "youtube", "minecraft", "weather", "timezone"]);

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
    <span
      className={`widget-card-avatar${SQUARE_AVATARS.has(platform.id) ? " is-square" : ""}${
        status ? ` is-${status}` : ""
      }`}
    >
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <PlatformIcon id={platform.id} size={22} />
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
  const meta = live?.meta.filter(Boolean).slice(0, 2) ?? [];

  const style = {
    "--wg-border-color": hexToRgba(design.borderColor, design.borderOpacity),
    "--wg-border-width": `${design.borderWidth}px`,
    "--wg-bg": hexToRgba(design.backgroundColor, design.backgroundOpacity),
    "--wg-bg-strong": hexToRgba(
      design.backgroundColor,
      Math.min(1, design.backgroundOpacity + 0.35),
    ),
    "--wg-grad-from": hexToRgba(
      design.gradientFrom,
      Math.min(0.92, design.backgroundOpacity + 0.3),
    ),
    "--wg-grad-to": hexToRgba(design.gradientTo, Math.min(0.92, design.backgroundOpacity + 0.2)),
    "--wg-art-opacity": Math.min(0.9, 0.4 + design.backgroundOpacity * 0.55).toFixed(2),
    "--wg-blur": `${design.backgroundBlur}px`,
    "--wg-radius": `${design.radius}px`,
    "--wg-brand": platform.color,
  } as CSSProperties;

  return (
    <article
      className={`widget-card widget-card--bg-${background}${hasArt ? " has-art" : ""}${
        live?.status ? ` is-${live.status}` : ""
      }${loading && !live ? " is-loading" : ""}${error ? " has-error" : ""}${
        compact ? " is-compact" : ""
      }${preview ? " widget-card--preview" : ""}${className ? ` ${className}` : ""}`}
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
                <span className="widget-card-tag" title={`Guild tag: ${live.tag}`}>
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
              {live?.badges.length ? (
                <span className="widget-card-badges">
                  {live.badges.slice(0, 2).map((badge) => (
                    <DiscordBadgeIcon
                      key={`${badge.kind}-${badge.flag}`}
                      kind={badge.kind}
                      label={badge.label}
                      size={11}
                    />
                  ))}
                </span>
              ) : null}
            </span>
            <span className={`widget-card-handle${error ? " is-error" : ""}`} title={subtitle}>
              {subtitle}
            </span>
          </span>
        </span>

        <span className="widget-card-bottom">
          <span className="widget-card-meta">
            {meta.map((item, index) => (
              <span className="widget-card-chip" key={`${item}-${index}`} title={item}>
                {index === 0 && live?.status ? (
                  <i style={{ background: STATUS_COLORS[live.status] }} aria-hidden="true" />
                ) : null}
                {item}
              </span>
            ))}
          </span>
          {profileHref && !preview ? (
            <a
              className="widget-card-mark widget-card-mark--link"
              style={{ color: platform.color }}
              href={profileHref}
              target="_blank"
              rel="noreferrer noopener"
              title={`Open on ${platform.name}`}
            >
              <PlatformIcon id={platform.id} size={13} />
              <b>{platform.name}</b>
            </a>
          ) : (
            <span className="widget-card-mark" style={{ color: platform.color }}>
              <PlatformIcon id={platform.id} size={13} />
              <b>{platform.name}</b>
            </span>
          )}
        </span>
      </span>

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
}: {
  widget: WidgetInstance;
  design: WidgetDesign;
  onConfigure?: (widget: WidgetInstance) => void;
  onRemove?: (widget: WidgetInstance) => void;
  className?: string;
}) {
  const platform = WIDGET_PLATFORM_BY_ID.get(widget.platform);
  const result = useWidgetLive(widget);

  if (!platform) return null;

  return (
    <WidgetCardSurface
      widget={widget}
      platform={platform}
      design={design}
      live={result.data}
      loading={result.loading}
      error={result.error}
      className={className}
      onConfigure={onConfigure}
      onRemove={onRemove}
    />
  );
}

export function WidgetCardPreview({
  design,
  username,
}: {
  design: WidgetDesign;
  username: string;
}) {
  const platform = WIDGET_PLATFORM_BY_ID.get("discord");
  if (!platform) return null;

  const sampleWidget: WidgetInstance = {
    id: "widget-preview",
    platform: "discord",
    content: `tourn.lol/${username}`,
    options: { inside: true, compact: false, status: true, show_banner: true },
  };

  const sampleLive: WidgetLive = {
    title: "tourn.lol",
    subtitle: `@${username}`,
    meta: ["Online", "Editing the profile"],
    avatar: null,
    decoration: null,
    banner: null,
    art: null,
    accent: platform.color,
    tag: "TOURN",
    badges: [],
    status: "online",
  };

  return (
    <WidgetCardSurface
      widget={sampleWidget}
      platform={platform}
      design={design}
      live={sampleLive}
      loading={false}
      error={null}
      preview
    />
  );
}
