import { useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { Account } from "../lib/auth";
import { accountUid } from "../lib/auth";
import { DEFAULT_ABOUT_DESIGN, hexToRgba, type About } from "../lib/about";
import { DEFAULT_PROFILE_ASSETS } from "../lib/profileAssets";
import { DEFAULT_BADGE_STYLE, type BadgeInstance, type BadgeStyle } from "../lib/badges";
import { DEFAULT_LINK_DESIGN, type LinkDesign, type LinkInstance } from "../lib/links";
import { loadGoogleFont } from "../lib/fonts";
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
  hideViews = false,
  hideJoined = false,
  hideLocation = false,
  /** The entry screen is still covering the page — hold the audio. */
  entryActive = false,
  /** Marketing previews (the home hero) show the card, not the player. */
  hideAudio = false,
  disableTilt = false,
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
  /** The Left layout's side rail owns these, so the card must not repeat them. */
  hideViews?: boolean;
  hideJoined?: boolean;
  hideLocation?: boolean;
  /** True while the entry overlay is up, so the track starts after entering. */
  entryActive?: boolean;
  /** Hide the audio player entirely — used by the home page preview. */
  hideAudio?: boolean;
  disableTilt?: boolean;
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
  // One tooltip design for the whole card: names, badges and link icons all
  // use this same skin. They used to be hardcoded, which made the setting
  // look broken.
  const tooltips = design.tooltips ?? DEFAULT_ABOUT_DESIGN.tooltips;
  const uid = accountUid(user);
  const tiltEnabled = !disableTilt && (design.tilt ?? 0) > 0;
  const tilt = useTilt<HTMLElement>(disableTilt ? 0 : design.tilt ?? 0, Boolean(design.tiltInvert));
  const viewPosition = design.viewPosition === "side" && design.layout !== "left" ? "footer" : design.viewPosition ?? "top-right";
  // The join date is part of the identity now: display name, handle, then the
  // date. "footer" is still accepted from older saved profiles but reads the
  // same as "under-name" so nobody's card silently loses the date.
  const joinPosition =
    design.joinPosition === "side" && design.layout !== "left"
      ? "under-name"
      : design.joinPosition ?? "under-name";
  const locationPosition = design.locationPosition === "side" && design.layout !== "left" ? "footer" : design.locationPosition ?? "under-name";
  const viewCount = typeof views === "number" ? views : null;
  const showViews = !hideViews && viewCount !== null && viewPosition !== "hidden";
  // The links row and the player are titled sections too, so the card reads as
  // labelled blocks (Connections, Links, Music) instead of one long stack.
  const visibleLinks = links.filter((link) => link.visible && link.url.trim());
  const hasLinks = visibleLinks.length > 0;
  const hasAudio = assets.audio.style !== "none" && Boolean(assets.audio.fileUrl);
  const showJoined = !hideJoined && Boolean(joined) && joinPosition !== "hidden";
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
            tooltipAnimation={tooltips.animation}
          />
        </span>
      </div>
    ) : null;

  // The left layout puts the badges on the same line as the handle, so it
  // renders that row itself instead of using the free-floating badge slots.
  const inlineBadges = design.badgePosition === "default";

  const locationPill = location && !hideLocation ? (
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

  // Metadata can live in the new card-corner slots, in the inline identity
  // slots, or in the original top/footer rails. The legacy rails keep their
  // own markup below; these helpers only handle the new placements.
  const metaPins = [
    { kind: "location" as const, position: locationPosition, node: locationPill },
    { kind: "views" as const, position: viewPosition, node: showViews ? viewsNode : null },
    { kind: "joined" as const, position: joinPosition, node: showJoined ? joinedNode : null },
  ].filter((pin) => Boolean(pin.node) && pin.position !== "hidden");
  const absolutePins = metaPins.filter(
    (pin) => pin.position.startsWith("inside-") || pin.position.startsWith("outside-"),
  );
  const inlinePins = (position: string) =>
    metaPins
      .filter((pin) => pin.position === position)
      .map((pin) => (
        <span key={pin.kind} className={`pv-pin pv-pin--inline pv-pin--${pin.kind}`}>
          {pin.node}
        </span>
      ));
  const pinnedLayer = absolutePins.length ? (
    <>
      {absolutePins.map((pin) => (
        <span key={pin.kind} className={`pv-pin pv-pin--${pin.position} pv-pin--${pin.kind}`}>
          {pin.node}
        </span>
      ))}
    </>
  ) : null;

  // Every size in the card is expressed against a 726px reference card, so a
  // narrower card shrinks its type, avatar and spacing with it instead of
  // keeping full-size text in a small box.
  const narrow = useNarrowCard();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const element = tilt.ref.current;
    if (!element) return;
    const measure = () => setMeasuredWidth(element.getBoundingClientRect().width);
    measure(); const observer = new ResizeObserver(measure); observer.observe(element);
    return () => observer.disconnect();
  }, [tilt.ref]);
  useEffect(() => { if (design.font) loadGoogleFont(design.font); }, [design.font]);
  useEffect(() => {
    if (!design.customFontUrl || !window.FontFace) return;
    let active = true;
    const face = new FontFace(`tourn-${user.id}`, `url(${JSON.stringify(design.customFontUrl)})`);
    void face.load().then((loaded) => { if (active) document.fonts.add(loaded); }).catch(() => undefined);
    return () => { active = false; document.fonts.delete(face); };
  }, [design.customFontUrl, user.id]);
  const renderedWidth = measuredWidth || (narrow ? Math.min(design.cardWidth, 400) : design.cardWidth);
  const scale = Math.max(0.45, Math.min(1.6, renderedWidth / 726));

  const style = {
    "--pv-scale": scale,
    "--pv-font": design.customFontUrl ? `"tourn-${user.id}", sans-serif` : design.font ? `"${design.font.replace(/["\\]/g, "")}", sans-serif` : '"Segoe UI", system-ui, sans-serif',
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
      {cardFx.id !== "none" ? <span className={`pv-card-fx pv-card-fx--${cardFx.id}`} aria-hidden="true" /> : null}
      {cardFx.id === "beam" ? <><span className="pv-beam-glow pv-beam-glow--tl" aria-hidden="true" /><span className="pv-beam-glow pv-beam-glow--br" aria-hidden="true" /></> : null}
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
      {pinnedLayer}
      <div className="pv-body">
        {(showViews && (viewPosition === "top" || viewPosition === "top-right")) ||
        (location && (locationPosition === "top" || locationPosition === "top-right")) ||
        (showJoined && (joinPosition === "top" || joinPosition === "top-right")) ||
        (badgeRow && design.badgePosition === "top-right") ? <div className="pv-meta-rail">
          {locationPosition === "top" || locationPosition === "top-right" ? locationPill : null}
          {design.badgePosition === "top-right" ? badgeRow : null}
          {showJoined && (joinPosition === "top" || joinPosition === "top-right") ? joinedNode : null}
          {showViews && (viewPosition === "top" || viewPosition === "top-right") ? <span className="pv-views" aria-label={`${viewCount} profile views`}><EyeIcon size={12} />{viewCount.toLocaleString("en-US")}</span> : null}
        </div> : null}
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
          {inlinePins("beside-avatar")}
          {/* The reference header: picture on the left, and everything that
              identifies the person (name, handle, badges, bio) stacked in the
              column beside it. */}
          <div className="pv-head-text">
            {inlinePins("above-name")}
            {/* name and badges share one line, so the rail sits right beside
                the name instead of floating to the far edge of the card */}
            <div className="pv-id">
              <h3>
                {/* The account number belongs to the name, not the picture:
                    hover the name to read it. */}
                <Tooltip
                  text={tooltips.enabled ? `#${uid}` : ""}
                  style={tooltips.style}
                  animation={tooltips.animation}
                >
                  <EffectText text={displayName} settings={assets.effects.text.name} />
                </Tooltip>
              </h3>
              {inlinePins("next-to-name")}
              {inlineBadges || design.badgePosition === "default" || design.badgePosition === "above-name"
                ? badgeRow
                : null}
            </div>

            <div className="pv-ident">
              <span className="pv-handle">
                <EffectText text={`@${user.username}`} settings={assets.effects.text.alias} />
              </span>
              {inlinePins("next-to-handle")}
            </div>

            {showJoined && joinPosition === "under-name" ? <span className="pv-joined-inline">{joinedNode}</span> : null}
            {locationPosition === "under-name" ? locationPill : null}
            {viewPosition === "under-name" ? viewsNode : null}

            <div
              className={`pv-bio${bio ? "" : " is-empty"}${
                textEffectClass(bioEffect) ? ` ${textEffectClass(bioEffect)}` : ""
              }`}
              style={textEffectClass(bioEffect) ? textEffectStyle(bioEffect) : undefined}
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
            {inlinePins("below-bio")}
          </div>
          {design.badgePosition === "beside-avatar" && !inlineBadges ? badgeRow : null}
        </div>

        {children}

        {hasLinks ? (
          <div className="pv-links-block">
            <ProfileLinks
              links={visibleLinks}
              design={linkDesign ?? DEFAULT_LINK_DESIGN}
              tooltipStyle={tooltips.style}
              tooltipEnabled={tooltips.enabled}
              tooltipAnimation={tooltips.animation}
            />
          </div>
        ) : null}

        {hideAudio || !hasAudio ? null : (
          <div className="pv-audio-block">
            <AudioPlayer
              settings={assets.audio}
              enabled={!entryActive}
              tilt={design.widgetTilt ? design.tilt ?? 0 : 0}
            />
          </div>
        )}

        {design.badgePosition === "bottom" && !inlineBadges ? badgeRow : null}

        {(location && locationPosition === "footer") ||
        (showViews && viewPosition === "footer") ||
        (showJoined && joinPosition === "footer") ? (
          <div className="pv-foot">
            {locationPosition === "footer" ? locationPill : <span />}
            {joinPosition === "footer" ? joinedNode : null}
            {viewPosition === "footer" ? viewsNode : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
