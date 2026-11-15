import { useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
import { CalendarIcon } from "./Icons";
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
  /** Like / dislike controls, drawn in the card's bottom-right corner. */
  reactions,
  /** Marketing previews hide the detail corners entirely. */
  hideDetails = false,
  /** The slideshow has its own Links page, so the card must not repeat them. */
  hideLinks = false,
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
  /** Like / dislike controls, drawn in the card's bottom-right corner. */
  reactions?: ReactNode;
  hideDetails?: boolean;
  hideLinks?: boolean;
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
  // Composition is optional; the details are not. Location and the account
  // date live above the card on the right, the view counter in the bottom-left
  // corner and the reactions in the bottom-right. There is nothing to misplace.
  const custom = design.advancedLayout === true;
  const pfpPosition = custom ? design.pfpPosition : design.layout === "centered" ? "above" : "left";
  const namePosition = custom ? design.namePosition : design.layout === "centered" ? "center" : "left";
  const bioPosition = custom ? design.bioPosition : design.layout === "centered" ? "center" : "left";
  // A dashboard preview has no counter to read, but the element still has to
  // exist so its corner is visible while editing.
  const viewCount = typeof views === "number" ? views : 0;
  const showViews = !hideDetails && design.showViews !== false;
  const showLocation = !hideDetails && design.showLocation !== false;
  const joinedPlacement = design.joinedPlacement ?? "corner";
  const joinedCorner = !hideDetails && joinedPlacement === "corner" && Boolean(joined);
  const joinedUnderName = !hideDetails && joinedPlacement === "under-name" && Boolean(joined);
  // The links row and the player are titled sections too, so the card reads as
  // labelled blocks (Connections, Links, Music) instead of one long stack.
  const visibleLinks = links.filter((link) => link.visible && link.url.trim());
  const hasLinks = visibleLinks.length > 0;
  // An uploaded track always shows a player; "None" just means the owner
  // never picked a style, and AudioPlayer falls back to the compact layout.
  const hasAudio = Boolean(assets.audio.fileUrl);
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

  const locationPill = location && showLocation ? (
    <span className="pv-location">
      <LocationGlyph size={12} />
      {location}
    </span>
  ) : null;

  const joinedNode = (
    <span className="pv-foot-item" title={joined}>
      <CalendarIcon size={10} />
      Joined {joined ?? "—"}
    </span>
  );

  // Location and the account date belong to the page, not the card: top right
  // of the viewport. Portalled, so the card's tilt transform can never drag
  // them back inside its own box.
  const cornerMeta =
    (locationPill || joinedCorner) && typeof document !== "undefined"
      ? createPortal(
          <div className="pv-page-meta" style={{ color: design.colors.muted }}>
            {locationPill}
            {locationPill && joinedCorner ? (
              <span className="pv-corner-sep" aria-hidden="true">|</span>
            ) : null}
            {joinedCorner ? <span className="pv-corner-joined">{joinedNode}</span> : null}
          </div>,
          document.body,
        )
      : null;

  const viewsNode = (
    <span className="pv-foot-item pv-views" title={`${viewCount} profile views`}>
      <ViewsGlyph size={12} />
      {viewCount.toLocaleString("en-US")}
    </span>
  );

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
    // Lexend is the site font, so an untouched card matches the rest of tourn.lol
    // instead of falling back to Segoe UI.
    "--pv-font": design.customFontUrl
      ? `"tourn-${user.id}", "Lexend", sans-serif`
      : design.font
        ? `"${design.font.replace(/["\\]/g, "")}", "Lexend", sans-serif`
        : '"Lexend", "Segoe UI", system-ui, sans-serif',
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
    "--pv-meta-glow": design.metaGlowColor || "#ff8f92",
    "--pv-meta-glow-strength": design.metaGlowStrength ?? 0,
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
      data-pfp={pfpPosition}
      data-badges={design.badgePosition}
      data-name={namePosition}
      data-bio={bioPosition}
      data-shape={design.avatarShape}
    >
      {cardFx.id !== "none" ? <span className={`pv-card-fx pv-card-fx--${cardFx.id}`} aria-hidden="true" /> : null}
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
      {cornerMeta}
      <div className="pv-body">
        <div className="pv-topline">
          <span className="pv-avatar-wrap">
            <span className="pv-avatar" aria-hidden="true">
              {avatar ? (
                <img src={avatar} alt="" decoding="async" />
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
                <Tooltip
                  text={tooltips.enabled ? `#${uid}` : ""}
                  style={tooltips.style}
                  animation={tooltips.animation}
                >
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

            {joinedUnderName ? (
              <div className="pv-under-name">
                <span className="pv-joined-inline">{joinedNode}</span>
              </div>
            ) : null}

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
          </div>
          {design.badgePosition === "beside-avatar" && !inlineBadges ? badgeRow : null}
        </div>

        {children}

        {hasLinks && !hideLinks ? (
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

        {hideDetails ? null : (
          <div className="pv-card-foot">
            {showViews ? viewsNode : <span />}
            {reactions ? <div className="pv-card-react">{reactions}</div> : null}
          </div>
        )}
      </div>
    </article>
  );
}

/** Views: a slim eye with a lash crown, lighter than the old solid eye. */
function ViewsGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.6 12S6.2 5.7 12 5.7 21.4 12 21.4 12 17.8 18.3 12 18.3 2.6 12 2.6 12Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.9v1.6M20.6 5.9l-1.1 1.2M3.4 5.9l1.1 1.2" opacity="0.5" />
    </svg>
  );
}

/** Location: a slim map pin with a hollow centre. */
function LocationGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21.2c3.9-3.4 6.6-6.6 6.6-10.1a6.6 6.6 0 1 0-13.2 0c0 3.5 2.7 6.7 6.6 10.1Z" />
      <circle cx="12" cy="10.9" r="2.4" />
    </svg>
  );
}
