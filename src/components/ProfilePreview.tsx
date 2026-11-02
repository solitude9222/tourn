import type { CSSProperties, ReactNode } from "react";
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
import { PinIcon } from "./Icons";
import "../about.css";

export function ProfilePreview({
  user,
  about,
  badges = [],
  badgeStyle,
  links = [],
  linkDesign,
  className = "",
  compact = false,
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
  const uid = accountUid(user);
  const tiltEnabled = (design.tilt ?? 0) > 0;
  const tilt = useTilt(design.tilt ?? 0);
  const badgeRow =
    badges.length > 0 && design.badgePosition !== "hidden" ? (
      <div className={`pv-badges pv-badges--${design.badgePosition}`}>
        <BadgeRow badges={badges} style={badgeStyle ?? DEFAULT_BADGE_STYLE} />
      </div>
    ) : null;

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
      }${className ? ` ${className}` : ""}`}
      style={{ ...style, ...tilt.style }}
      data-pfp={design.pfpPosition}
      data-badges={design.badgePosition}
      data-name={design.namePosition}
      data-bio={design.bioPosition}
      data-shape={design.avatarShape}
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
      <div className="pv-body">
        <div className="pv-topline">
          <span className="pv-avatar-wrap">
            <Tooltip text={`#${uid}`} style="dark">
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
          {location ? (
            <span className="pv-location">
              <PinIcon size={10} />
              {location}
            </span>
          ) : null}
        </div>

        {design.badgePosition === "top-right" ? badgeRow : null}
        {design.badgePosition === "above-name" ? badgeRow : null}

        <div className="pv-id">
          <h3>
            <EffectText text={displayName} settings={assets.effects.text.name} />
          </h3>
          <span>
            <EffectText text={`@${user.username}`} settings={assets.effects.text.alias} />
          </span>
        </div>

        {design.badgePosition === "default" ? badgeRow : null}

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

        <AudioPlayer settings={assets.audio} />

        {children}

        {design.badgePosition === "bottom" ? badgeRow : null}
      </div>
    </article>
  );
}
