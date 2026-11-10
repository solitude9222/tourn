import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Account } from "../lib/auth";
import { hexToRgba, type About } from "../lib/about";
import { DEFAULT_PROFILE_ASSETS } from "../lib/profileAssets";
import type { WidgetStore } from "../lib/widgets";
import { DEFAULT_BADGE_STYLE, EMPTY_BADGE_STORE, type BadgeStore } from "../lib/badges";
import { DEFAULT_LINK_DESIGN, EMPTY_LINK_STORE, type LinkStore } from "../lib/links";
import { ProfilePreview } from "./ProfilePreview";
import { ProfileLinks } from "./ProfileLinks";
import { ProfileMetadata } from "./ProfileMetadata";
import { BackgroundEffectLayer, OverlayEffectLayer, ProfileCursor } from "./ProfileEffects";
import { WidgetCard } from "./WidgetCard";
import { ProfileInteractions } from "./ProfileInteractions";
import { AudioPlayer } from "./AudioPlayer";
import { ChevronIcon } from "./Icons";
import "../about.css";

export function EntryOverlay({
  about,
  onEnter,
  playToken = 0,
  preview = false,
}: {
  about: About;
  onEnter: () => void;
  playToken?: number;
  /** Dashboard preview: renders the real screen but never responds to clicks. */
  preview?: boolean;
}) {
  const entry = about.design.entry;
  const accent = about.design.colors.accent;
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  const beginLeave = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    // The screen is gone as soon as it is clicked, not after a fixed 760ms — a
    // long fixed delay made the first click look ignored, so people clicked
    // twice.
    timerRef.current = window.setTimeout(() => onEnterRef.current(), entry.animationDuration);
  }, [entry.animationDuration]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (playToken <= 0) return;
    const timer = window.setTimeout(beginLeave, 260);
    return () => window.clearTimeout(timer);
  }, [playToken, beginLeave]);

  // Nothing is invented here — no default greeting, no "click to enter" copy.
  // Whatever the owner typed is the whole entry screen.
  const title = entry.title.trim();

  const content = (
    <>
      {entry.imageUrl ? (
        <div className="lkr-entry-visual">
          {entry.animation === "split" ? (
            <span className="lkr-image-split">
              <img className="lkr-image-half lkr-image-half--top" src={entry.imageUrl} alt="" />
              <img className="lkr-image-half lkr-image-half--bottom" src={entry.imageUrl} alt="" aria-hidden="true" />
            </span>
          ) : (
            <img src={entry.imageUrl} alt="" />
          )}
        </div>
      ) : null}

      {title ? (
        <h2 className="lkr-entry-title">
          {entry.animation === "split" ? (
            <span className="lkr-split">
              <span className="lkr-split-half lkr-split-half--top">{title}</span>
              <span className="lkr-split-half lkr-split-half--bottom" aria-hidden="true">
                {title}
              </span>
            </span>
          ) : (
            title
          )}
        </h2>
      ) : null}

      {entry.divider ? (
        <span
          className="lkr-entry-divider"
          aria-hidden="true"
          style={{
            width: `${entry.dividerWidth ?? 42}%`,
            height: `${entry.dividerSize ?? 1}px`,
            background: entry.dividerColor ?? "#ffffff",
            opacity: entry.dividerOpacity ?? 0.4,
          }}
        />
      ) : null}
    </>
  );

  return (
    <div
      className={`lkr-entry lkr-entry--${entry.animation} lkr-entry--${entry.align}${leaving ? " is-leaving" : ""}${
        preview ? " lkr-entry--preview" : ""
      }`}
      role={preview ? undefined : "button"}
      tabIndex={preview ? -1 : 0}
      aria-label={preview ? undefined : "Enter profile"}
      onPointerDown={preview ? undefined : beginLeave}
      onClick={preview ? undefined : beginLeave}
      onKeyDown={
        preview
          ? undefined
          : (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                beginLeave();
              }
            }
      }
      style={{
        "--lkr-entry-accent": accent,
        "--lkr-entry-blur": `${entry.blur}px`,
        "--lkr-entry-bg": entry.background,
        "--lkr-entry-dim": entry.dim / 100,
        "--lkr-entry-title": `${entry.titleSize}px`,
        "--lkr-entry-sub-size": `${entry.subtitleSize}px`,
        "--lkr-entry-hint-size": `${entry.hintSize}px`,
        "--lkr-entry-title-color": entry.titleColor,
        "--lkr-entry-sub-color": entry.subtitleColor,
        "--lkr-entry-hint-color": entry.hintColor,
        "--lkr-entry-tracking": `${entry.letterSpacing}em`,
        "--lkr-entry-gap": `${entry.contentGap}px`,
        "--lkr-entry-width": `${entry.contentWidth}%`,
        "--lkr-entry-image": `${entry.imageSize}px`,
        "--lkr-entry-image-radius": `${entry.imageRadius}px`,
        "--lkr-entry-image-shadow": entry.imageShadow / 100,
        "--lkr-entry-panel-opacity": entry.panelOpacity / 100,
        "--lkr-entry-panel-blur": `${entry.panelBlur}px`,
        "--lkr-entry-panel-radius": `${entry.panelRadius}px`,
        "--lkr-entry-vignette": entry.vignette / 100,
        "--lkr-entry-duration": `${entry.animationDuration}ms`,
        "--lkr-entry-fit": entry.imageFit,
      } as CSSProperties}
    >
      <div className="lkr-entry-bg" aria-hidden="true">
        {entry.backgroundImageUrl ? (
          <span
            className="lkr-entry-bg-image"
            style={{
              backgroundImage: `url("${entry.backgroundImageUrl.replace(/"/g, '\\"')}")`,
            }}
          />
        ) : null}
      </div>
      <div className="lkr-entry-dim" aria-hidden="true" />
      {entry.vignette > 0 ? <div className="lkr-entry-vignette" aria-hidden="true" /> : null}
      <div className={`lkr-entry-content${entry.panel ? " lkr-entry-content--panel" : ""}`}>
        {content}
        {entry.subtitle ? <p className="lkr-entry-sub">{entry.subtitle}</p> : null}
        {entry.hint ? <p className="lkr-entry-hint">{entry.hint}</p> : null}
      </div>
    </div>
  );
}

function PageSection({
  id,
  className = "",
  innerRef,
  children,
}: {
  id: string;
  className?: string;
  innerRef?: (node: HTMLElement | null) => void;
  children: ReactNode;
}) {
  return (
    <section ref={innerRef} id={id} className={`lkr-section${className ? ` ${className}` : ""}`}>
      {children}
    </section>
  );
}

export function LinkerPreview({
  user,
  about,
  widgets,
  badges = EMPTY_BADGE_STORE,
  links = EMPTY_LINK_STORE,
  className = "",
  interactive = false,
  showEntry = true,
  showMetadata = true,
  entryPlayToken = 0,
  views = null,
  joined,
  /** Keeps dashboard previews silent — a preview must never start audio. */
  hideAudio = false,
}: {
  user: Pick<Account, "id" | "username" | "avatarUrl">;
  about: About;
  widgets: WidgetStore;
  badges?: BadgeStore;
  links?: LinkStore;
  className?: string;
  interactive?: boolean;
  showEntry?: boolean;
  /** Off for gallery thumbnails: several previews must not fight over the tab title. */
  showMetadata?: boolean;
  entryPlayToken?: number;
  /** Real profile view count, when it has loaded. */
  views?: number | null;
  /** Formatted join date for the card footer. */
  joined?: string;
  /** Drop the player entirely (dashboard previews). */
  hideAudio?: boolean;
}) {
  const design = about.design;
  const assets = about.assets ?? DEFAULT_PROFILE_ASSETS;
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = assets.background.videoVolume;
    video.muted = true;
    const unlock = () => { if (interactive && assets.background.videoAudio) { video.muted = false; void video.play().catch(() => undefined); } };
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, [assets.background.style, assets.background.videoUrl, assets.background.videoAudio, assets.background.videoVolume, interactive]);
  const entrySeenKey = `tourn.lol/entry-seen/v1/${user.username}`;
  // One question, asked both on mount and whenever the entry settings change,
  // so the "seen this visit" flag cannot be ignored (which reopened the entry
  // screen over an already-loaded card when navigating back to a profile).
  const entryWanted = () => {
    if (!showEntry || !design.entry.enabled) return false;
    if (!design.entry.oncePerSession) return true;
    try {
      return sessionStorage.getItem(entrySeenKey) === null;
    } catch {
      return true;
    }
  };
  const [entryOpen, setEntryOpen] = useState(entryWanted);

  useEffect(() => {
    setEntryOpen(entryWanted());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- entryWanted reads exactly these
  }, [showEntry, design.entry.enabled, design.entry.oncePerSession, user.username]);

  // "Replay" in the dashboard bumps the token: reopen the screen, then let
  // EntryOverlay play it out on its own.
  useEffect(() => {
    if (entryPlayToken <= 0) return;
    setEntryOpen(showEntry && design.entry.enabled);
  }, [entryPlayToken, showEntry, design.entry.enabled]);

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
    "--lkr-gap": `${design.widgetGap}px`,
    "--lkr-bg-color": assets.background.color,
    "--lkr-bg-from": assets.background.from,
    "--lkr-bg-to": assets.background.to,
    "--lkr-bg-blur": `${assets.background.blur}px`,
    "--lkr-bg-dim": assets.background.dim,
    "--lkr-bg-angle": `${assets.background.angle || 160}deg`,
    "--lkr-bg-saturation": assets.background.saturation,
    "--lkr-bg-contrast": assets.background.contrast,
    "--lkr-bg-brightness": assets.background.brightness,
    cursor: assets.cursor.style === "custom" && assets.cursor.imageUrl.trim()
      ? `url("${assets.cursor.imageUrl.trim().replace(/"/g, '\\"')}") 4 4, auto`
      : assets.cursor.style !== "default" && assets.cursor.style !== "custom" ? "none" : undefined,
  } as CSSProperties;

  const visibleWidgets = widgets.widgets.filter((widget) => widget.visible !== false);
  // Discord presence is the lead card on every layout: it takes the full top
  // row, with the rest of the stack in the order they were arranged below it.
  const orderedWidgets = [...visibleWidgets].sort((a, b) =>
    a.platform === "discord" ? -1 : b.platform === "discord" ? 1 : 0,
  );

  const widgetStack = orderedWidgets.length ? (
    <div className="lkr-widgets-block">
      <div className="lkr-widgets" style={{ gap: widgets.design.gap }}>
        {orderedWidgets.map((widget) => (
          <WidgetCard
            key={widget.id}
            widget={widget}
            design={widgets.design}
            className={`widget-card--linker${
              widget.platform === "discord" ? " widget-card--wide" : ""
            }`}
          />
        ))}
      </div>
    </div>
  ) : (
    <p className="lkr-empty">No widgets yet.</p>
  );

  const audioPosition = design.audioPosition === "auto" ? design.layout === "stacked" ? "below" : "inside" : design.audioPosition;
  const profileCard = (includeWidgets = true) => (
    <ProfilePreview
      user={user}
      about={about}
      badges={badges.equipped}
      badgeStyle={badges.style ?? DEFAULT_BADGE_STYLE}
      links={links.links}
      linkDesign={links.design ?? DEFAULT_LINK_DESIGN}
      className="profile-preview--with-widgets"
      views={views}
      joined={joined}
      entryActive={entryOpen}
      hideAudio={hideAudio || audioPosition !== "inside"}
    >
      {includeWidgets && widgets.widgets.length ? widgetStack : null}
    </ProfilePreview>
  );

  // The card stays in the middle of the page for every layout; the layouts
  // rearrange what is inside it. `stacked` is the exception: it lifts the
  // player out under the card so the track has its own titled panel.
  const hasTrack =
    !hideAudio && audioPosition !== "hidden" && about.assets.audio.style !== "none" && Boolean(about.assets.audio.fileUrl);

  const page = (
    <div className={`lkr-flow lkr-flow--${design.layout}`}>
      {profileCard(design.layout !== "left")}
      {design.layout === "left" && orderedWidgets.length ? <aside className="lkr-side-widgets">{widgetStack}</aside> : null}
      {audioPosition === "below" && hasTrack ? (
        <div className="lkr-stack">
          <div className="lkr-audio">
            <AudioPlayer settings={about.assets.audio} enabled={!entryOpen} />
          </div>
        </div>
      ) : null}
      {design.sections.map((section) => <section className={`lkr-custom-section lkr-section--${section.kind}`} key={section.id}>
        {section.title ? <h2>{section.title}</h2> : null}
        {section.image ? <img src={section.image} alt="" loading="lazy" /> : null}
        {section.text ? <p>{section.text}</p> : null}
        {/^https?:\/\//i.test(section.url) ? <a href={section.url} target="_blank" rel="noreferrer">{section.kind === "project" ? "View project" : "Open link"}</a> : null}
      </section>)}
    </div>
  );

  return (
    <div
      className={`lkr-page lkr-card-${design.cardStyle}${className ? ` ${className}` : ""}`}
      style={style}
      data-interactive={interactive ? "true" : undefined}
    >
      {interactive ? <ProfileInteractions settings={assets.interactions} /> : null}
      {showMetadata ? <ProfileMetadata about={about} user={user} /> : null}
      <div className={`lkr-bg lkr-bg--${assets.background.style} lkr-bg-anim-${assets.background.gradientAnim || "none"}`} aria-hidden="true">
        {assets.background.style === "image" && assets.background.imageUrl ? (
          <span
            className="lkr-bg-image"
            style={{ backgroundImage: `url("${assets.background.imageUrl.replace(/"/g, '\\"')}")` }}
          />
        ) : null}
        {assets.background.style === "video" && assets.background.videoUrl ? <video ref={videoRef} className="lkr-bg-video" src={assets.background.videoUrl} autoPlay muted loop playsInline preload="metadata" /> : null}
        <span className="lkr-bg-dim" />
      </div>
      <BackgroundEffectLayer settings={assets.effects.background} />
      {page}
      {hasTrack && audioPosition === "fixed-bottom" ? <div className="lkr-fixed-audio"><AudioPlayer settings={assets.audio} enabled={!entryOpen} /></div> : null}
      <OverlayEffectLayer settings={assets.effects.overlay} />
      <ProfileCursor settings={assets.cursor} />
      {entryOpen ? (
        <EntryOverlay
          about={about}
          onEnter={() => {
            setEntryOpen(false);
            if (design.entry.oncePerSession) {
              try {
                sessionStorage.setItem(entrySeenKey, "1");
              } catch {
                /* private mode */
              }
            }
          }}
          playToken={entryPlayToken}
        />
      ) : null}
    </div>
  );
}
