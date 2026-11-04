import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { Account } from "../lib/auth";
import { accountUid } from "../lib/auth";
import { hexToRgba, type About } from "../lib/about";
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

function OnekoCat() {
  const catRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const cat = catRef.current;
    const host = cat?.parentElement;
    if (!cat || !host) return;
    let frame = 0;
    let target = { x: 24, y: 24 };
    const current = { x: 24, y: 24 };

    const tick = () => {
      frame = 0;
      current.x += (target.x - current.x) * 0.16;
      current.y += (target.y - current.y) * 0.16;
      cat.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`;
      if (Math.abs(target.x - current.x) > 0.6 || Math.abs(target.y - current.y) > 0.6) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      target = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      if (!frame) frame = window.requestAnimationFrame(tick);
    };

    host.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      host.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <span ref={catRef} className="pv-oneko" aria-hidden="true">
      🐈
    </span>
  );
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
  const hasBanner = design.cardStyle === "banner" && banner.enabled;
  const bioEffect = assets.effects.text.bio;
  const cardFx = assets.card;
  // One tooltip design for the whole card — badges and the avatar used to be
  // hardcoded to "dark", which made the tooltip settings look broken.
  const tooltipDesign = linkDesign ?? DEFAULT_LINK_DESIGN;
  const uid = accountUid(user);
  const tiltEnabled = (design.tilt ?? 0) > 0;
  const tilt = useTilt(design.tilt ?? 0, Boolean(design.tiltInvert));
  const viewPosition = design.viewPosition ?? "top-right";
  const joinPosition = design.joinPosition ?? "footer";
  const locationPosition = design.locationPosition ?? "under-name";
  const viewCount = typeof views === "number" ? views : null;
  const showViews = viewCount !== null && viewPosition !== "hidden";
  const showJoined = Boolean(joined) && joinPosition !== "hidden";
  const badgeRow =
    badges.length > 0 && design.badgePosition !== "hidden" ? (
      <div className={`pv-badges pv-badges--${design.badgePosition}`}>
        <BadgeRow
          badges={badges}
          style={badgeStyle ?? DEFAULT_BADGE_STYLE}
          tooltipStyle={tooltipDesign.tooltipStyle}
          tooltipEnabled={tooltipDesign.tooltipEnabled}
        />
      </div>
    ) : null;

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

  const style = {
    "--pv-accent": design.colors.accent,
    "--pv-text": design.colors.text,
    "--pv-muted": design.colors.muted,
    "--pv-bg": design.colors.background,
    "--pv-card": hexToRgba(design.colors.card, design.backgroundOpacity),
    "--pv-border-color": hexToRgba(design.colors.border, design.borderOpacity),
    "--pv-border-width": `${design.borderWidth}px`,
    "--pv-radius": `${design.cardRadius}px`,
    "--pv-width": `${design.cardWidth}px`,
    "--pv-avatar": `${design.avatarSize}px`,
    "--pv-blur": `${design.backgroundBlur}px`,
    "--pv-pad": `${design.cardPadding}px`,
    "--pv-name": `${design.nameSize}px`,
    "--pv-bio-size": `${design.bioSize}px`,
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
      }${tiltEnabled ? " profile-preview--tilt" : ""}${
        compact ? " profile-preview--compact" : ""
      }${design.glowName ? " pv-glow-name" : ""}${design.glowLocation ? " pv-glow-location" : ""}${
        design.glowViews ? " pv-glow-views" : ""
      }${design.glowJoin ? " pv-glow-join" : ""}${className ? ` ${className}` : ""}`}
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
      <div className="pv-ambient" aria-hidden="true" />
      <span className={`pv-card-fx pv-card-fx--${cardFx.id}`} aria-hidden="true" />
      {cardFx.id === "beam" ? (
        <>
          <span className="pv-beam-glow pv-beam-glow--tl" aria-hidden="true" />
          <span className="pv-beam-glow pv-beam-glow--br" aria-hidden="true" />
        </>
      ) : null}

      {design.oneko ? <OnekoCat /> : null}

      {showViews && viewPosition === "top-right" ? (
        <span className="pv-views pv-views--corner" aria-label={`${viewCount} profile views`}>
          <EyeIcon size={12} />
          {viewCount.toLocaleString("en-US")}
        </span>
      ) : null}

      <div className="pv-body">
        <div className="pv-topline">
          <span className="pv-avatar-wrap">
            <Tooltip
              text={tooltipDesign.tooltipEnabled ? `#${uid}` : ""}
              style={tooltipDesign.tooltipStyle}
            >
              <span className="pv-avatar" aria-hidden="true">
                {avatar ? (
                  <img src={avatar} alt="" />
                ) : (
                  <span>{displayName.slice(0, 1).toUpperCase()}</span>
                )}
              </span>
            </Tooltip>
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
          {design.badgePosition === "beside-avatar" ? badgeRow : null}
          {locationPosition === "top" ? locationPill : null}
        </div>

        {design.badgePosition === "top-right" ? badgeRow : null}
        {design.badgePosition === "above-name" ? badgeRow : null}

        <div className="pv-id">
          <h3>
            <EffectText text={displayName} settings={assets.effects.text.name} />
          </h3>
        </div>

        {design.badgePosition === "default" ? badgeRow : null}

        <span className="pv-handle">
          <EffectText text={`@${user.username}`} settings={assets.effects.text.alias} />
        </span>

        {locationPosition === "under-name" ? locationPill : null}
        {joinPosition === "under-name" && joined ? (
          <span className="pv-joined-inline">{joinedNode}</span>
        ) : null}

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

        <ProfileLinks links={links} design={linkDesign ?? DEFAULT_LINK_DESIGN} />

        {hideAudio ? null : <AudioPlayer settings={assets.audio} enabled={!entryActive} />}

        {children}

        {design.badgePosition === "bottom" ? badgeRow : null}

        {showJoined && (joinPosition === "footer" || viewPosition === "footer") ? (
          <div className="pv-foot">
            {joinPosition === "footer" && joined ? joinedNode : <span />}
            {locationPosition === "footer" && locationPill}
            {viewPosition === "footer" ? viewsNode : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
