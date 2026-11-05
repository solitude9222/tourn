import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { Account } from "../lib/auth";
import { accountUid } from "../lib/auth";
import { DEFAULT_ABOUT_DESIGN, hexToRgba, type About } from "../lib/about";
import { DEFAULT_PROFILE_ASSETS } from "../lib/profileAssets";
import { DEFAULT_BADGE_STYLE, type BadgeInstance, type BadgeStyle } from "../lib/badges";
import { DEFAULT_LINK_DESIGN, type LinkDesign, type LinkInstance } from "../lib/links";
import { useTilt } from "../lib/useTilt";
import { EffectText, SparkleLayer, textEffectClass, textEffectStyle } from "./ProfileEffects";
import { BadgeRow } from "./BadgeRow";
import { ProfileLinks } from "./ProfileLinks";
import { AudioPlayer } from "./AudioPlayer";
import { Tooltip } from "./Tooltip";
import { RichText } from "./RichText";
import { CalendarIcon, EyeIcon, PinIcon } from "./Icons";
import "../about.css";

/** The card is full-bleed on phones, so its type has to follow the screen. */
function useNarrowCard(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return narrow;
}

export function ProfilePreview({
  user,
  about,
  badges = [],
  badgeStyle,
  links = [],
  linkDesign,
  className = "",
  compact = false,
  views,
  joined,
  /** The entry screen is still covering the page — hold the audio. */
  entryActive = false,
  /** Marketing previews (the home hero) show the card, not the player. */
  hideAudio = false,
  children,
}: {
  user: Pick<Account, "id" | "uid" | "username" | "avatarUrl">;
  about: About;
  badges?: BadgeInstance[];
  badgeStyle?: BadgeStyle;
  links?: LinkInstance[];
  linkDesign?: LinkDesign;
  className?: string;
  compact?: boolean;
  /** Public profile view count. Hidden when it has not loaded. */
  views?: number | null;
  /** Already-formatted join date, e.g. "Nov 2026". */
  joined?: string;
  /** True while the entry overlay is up, so the track starts after entering. */
  entryActive?: boolean;
  /** Hide the audio player entirely — used by the home page preview. */
  hideAudio?: boolean;
  children?: ReactNode;
}) {
  const design = about.design;
  const assets = about.assets ?? DEFAULT_PROFILE_ASSETS;
  const displayName = about.displayName.trim() || user.username;
  const bio = about.bio.trim();
  const location = about.location.trim();
  const avatar = assets.avatarUrl.trim() || user.avatarUrl;
  const decoration = assets.decoration;
  const banner = assets.banner;
  // A banner without an image is just a blank tinted band, so it needs both.
  const hasBanner = banner.enabled && Boolean(banner.imageUrl.trim());
  const bioEffect = assets.effects.text.bio;
  const cardFx = assets.card;
  // One tooltip design for the whole card — badges and the avatar used to be
  // hardcoded to "dark", which made the tooltip settings look broken. Links
  // never show a tooltip; only these two do.
  const tooltips = design.tooltips ?? DEFAULT_ABOUT_DESIGN.tooltips;
  const uid = accountUid(user);
  const tiltEnabled = (design.tilt ?? 0) > 0;
  const tilt = useTilt(design.tilt ?? 0, Boolean(design.tiltInvert));
  const viewPosition = design.viewPosition ?? "top-right";
  // The join date is part of the identity now: display name, handle, then the
  // date. "footer" is still accepted from older saved profiles but reads the
  // same as "under-name" so nobody's card silently loses the date.
  const joinPosition = design.joinPosition === "hidden" ? "hidden" : "under-name";
  const locationPosition = design.locationPosition ?? "under-name";
  const viewCount = typeof views === "number" ? views : null;
  const showViews = viewCount !== null && viewPosition !== "hidden";
  // The links row and the player are titled sections too, so the card reads as
  // labelled blocks (Connections, Links, Music) instead of one long stack.
  const visibleLinks = links.filter((link) => link.visible && link.url.trim());
  const hasLinks = visibleLinks.length > 0;
  const hasAudio = assets.audio.style !== "none" && Boolean(assets.audio.fileUrl);
  const showJoined = Boolean(joined) && joinPosition !== "hidden";
  // The badge rail carries no explanation popover any more: the little arrow
  // that opened it pushed the rail away from the name. Each badge still shows
  // its own tooltip on hover.
  const badgeRow =
    badges.length > 0 && design.badgePosition !== "hidden" ? (
      <div className={`pv-badges pv-badges--${design.badgePosition}`}>
        <span className="pv-badge-pill">
          <BadgeRow
            badges={badges}
            style={badgeStyle ?? DEFAULT_BADGE_STYLE}
            size={20}
            tooltipStyle={tooltips.style}
            tooltipEnabled={tooltips.enabled}
          />
        </span>
      </div>
    ) : null;

  // The left layout puts the badges on the same line as the handle, so it
  // renders that row itself instead of using the free-floating badge slots.
  const inlineBadges = design.layout === "left";

  const locationPill = location ? (
    <span className="pv-location">
      <PinIcon size={10} />
      {location}
    </span>
  ) : null;

  const joinedNode = (
    <span className="pv-foot-item" title={joined}>
      <CalendarIcon size={10} />
      Joined {joined ?? "—"}
    </span>
  );

  const viewsNode = (
    <span className="pv-foot-item" title={viewCount === null ? undefined : `${viewCount} views`}>
      <EyeIcon size={10} />
      {viewCount === null ? "—" : viewCount.toLocaleString("en-US")}
    </span>
  );

  // Every size in the card is expressed against a 726px reference card, so a
  // narrower card shrinks its type, avatar and spacing with it instead of
  // keeping full-size text in a small box.
  const narrow = useNarrowCard();
  const renderedWidth = narrow ? Math.min(design.cardWidth, 400) : design.cardWidth;
  const scale = Math.max(0.45, Math.min(1.6, renderedWidth / 726));

  const style = {
    "--pv-scale": scale,
    "--pv-accent": design.colors.accent,
    "--pv-text": design.colors.text,
    "--pv-muted": design.colors.muted,
    "--pv-bg": design.colors.background,
    "--pv-card": hexToRgba(design.colors.card, design.backgroundOpacity),
    "--pv-border-color": hexToRgba(design.colors.border, design.borderOpacity),
    "--pv-border-width": `${design.borderWidth}px`,
    "--pv-radius": `${design.cardRadius}px`,
    "--pv-width": `${design.cardWidth}px`,
    "--pv-avatar": `calc(${design.avatarSize}px * var(--pv-scale))`,
    "--pv-blur": `${design.backgroundBlur}px`,
    "--pv-pad": `calc(${design.cardPadding}px * var(--pv-scale))`,
    "--pv-name": `calc(${design.nameSize}px * var(--pv-scale))`,
    "--pv-bio-size": `calc(${design.bioSize}px * var(--pv-scale))`,
    "--pv-card-fx-color": cardFx.color,
    "--pv-card-fx-strength": cardFx.intensity / 100,
    "--pv-card-fx-speed": `${Math.max(1.5, cardFx.speed)}s`,
    "--pv-pill-bg": hexToRgba(design.pills.background, design.pills.opacity),
    "--pv-pill-border": hexToRgba(design.colors.accent, design.pills.borderOpacity),
    "--pv-pill-radius": `${design.pills.radius}px`,
    "--pv-pill-blur": `${design.pills.blur}px`,
    "--pv-zoom": decoration.zoom ?? 1,
    "--pv-rotate": `${decoration.rotate ?? 0}deg`,
  } as CSSProperties;

  return (
    <article
      ref={tilt.ref}
      onPointerMove={tiltEnabled ? tilt.onPointerMove : undefined}
      onPointerLeave={tiltEnabled ? tilt.onPointerLeave : undefined}
      className={`profile-preview pv-theme-${design.theme} pv-layout-${design.layout} pv-card-${design.cardStyle}${
        hasBanner ? " pv-has-banner" : ""
      }${design.backgroundOpacity <= 0 ? " pv-clear" : ""}${
        tiltEnabled ? " profile-preview--tilt" : ""
      }${
        compact ? " profile-preview--compact" : ""
      }${className ? ` ${className}` : ""}`}
      style={{ ...style, ...tilt.style }}
      data-pfp={design.pfpPosition}
      data-badges={design.badgePosition}
      data-name={design.namePosition}
      data-bio={design.bioPosition}
      data-shape={design.avatarShape}
      data-views={viewPosition}
      data-join={joinPosition}
      data-location={locationPosition}
    >
      {hasBanner ? (
        <div
          className={`pv-banner${banner.imageUrl ? " pv-banner--image" : ""}`}
          style={
            {
              height: `${banner.height}px`,
              opacity: banner.opacity,
              backgroundImage: banner.imageUrl ? `url("${banner.imageUrl.replace(/"/g, '\\"')}")` : undefined,
            } as CSSProperties
          }
          aria-hidden="true"
        />
      ) : null}
      {showViews && viewPosition === "top-right" ? (
        <span className="pv-views pv-views--corner" aria-label={`${viewCount} profile views`}>
          <EyeIcon size={12} />
          {viewCount.toLocaleString("en-US")}
        </span>
      ) : null}

      <div className="pv-body">
        <div className="pv-topline">
          <span className="pv-avatar-wrap">
            <span className="pv-avatar" aria-hidden="true">
              {avatar ? (
                <img src={avatar} alt="" />
              ) : (
                <span>{displayName.slice(0, 1).toUpperCase()}</span>
              )}
            </span>
            {decoration.discordUrl ? (
              <img
                className="pv-avatar-decoration"
                src={decoration.discordUrl}
                alt=""
                aria-hidden="true"
                draggable={false}
              />
            ) : null}
          </span>
          {/* The reference header: picture on the left, and everything that
              identifies the person (name, handle, badges, bio) stacked in the
              column beside it. */}
          <div className="pv-head-text">
            {/* name and badges share one line, so the rail sits right beside
                the name instead of floating to the far edge of the card */}
            <div className="pv-id">
              <h3>
                {/* The account number belongs to the name, not the picture:
                    hover the name to read it. */}
                <Tooltip text={tooltips.enabled ? `#${uid}` : ""} style={tooltips.style}>
                  <EffectText text={displayName} settings={assets.effects.text.name} />
                </Tooltip>
              </h3>
              {inlineBadges || design.badgePosition === "default" || design.badgePosition === "above-name"
                ? badgeRow
                : null}
            </div>

            <div className="pv-ident">
              <span className="pv-handle">
                <EffectText text={`@${user.username}`} settings={assets.effects.text.alias} />
              </span>
            </div>

            {showJoined ? <span className="pv-joined-inline">{joinedNode}</span> : null}
            {locationPosition === "under-name" ? locationPill : null}

            <div
              className={`pv-bio${bio ? "" : " is-empty"}${
                bioEffect.effect !== "none" ? ` ${textEffectClass(bioEffect)}` : ""
              }`}
              style={bioEffect.effect !== "none" ? textEffectStyle(bioEffect) : undefined}
            >
              {bio ? (
                <>
                  <RichText text={bio} />
                  <SparkleLayer settings={bioEffect} />
                </>
              ) : (
                <span>A bio is on the way.</span>
              )}
            </div>
          </div>
          {design.badgePosition === "beside-avatar" && !inlineBadges ? badgeRow : null}
          {locationPosition === "top" ? locationPill : null}
        </div>

        {design.badgePosition === "top-right" && !inlineBadges ? badgeRow : null}

        {children}

        {hasLinks ? (
          <div className="pv-links-block">
            <ProfileLinks links={visibleLinks} design={linkDesign ?? DEFAULT_LINK_DESIGN} />
          </div>
        ) : null}

        {hideAudio || !hasAudio ? null : (
          <div className="pv-audio-block">
            <AudioPlayer settings={assets.audio} enabled={!entryActive} />
          </div>
        )}

        {design.badgePosition === "bottom" && !inlineBadges ? badgeRow : null}

        {locationPosition === "footer" || viewPosition === "footer" ? (
          <div className="pv-foot">
            {locationPosition === "footer" ? locationPill : <span />}
            {viewPosition === "footer" ? viewsNode : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
