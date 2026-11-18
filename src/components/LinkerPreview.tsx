import { ProfileGallery } from "./ProfileGallery";
import { DEFAULT_GALLERY, DEFAULT_PORTFOLIO } from "../lib/gallery";
import {TECH_BY_ID,techIconUrl} from "../lib/techStack";
import { useTilt } from "../lib/useTilt";
import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useOptionalAuth, type Account } from "../lib/auth";
import { hexToRgba, type About } from "../lib/about";
import { DEFAULT_PROFILE_ASSETS } from "../lib/profileAssets";
import type { WidgetStore } from "../lib/widgets";
import { DEFAULT_BADGE_STYLE, EMPTY_BADGE_STORE, type BadgeStore } from "../lib/badges";
import { normalizeCursorArt, type CursorHotspot } from "../lib/cursorImage";
import { DEFAULT_LINK_DESIGN, EMPTY_LINK_STORE, type LinkStore } from "../lib/links";
import { ProfilePreview } from "./ProfilePreview";
import { ProfileLinks } from "./ProfileLinks";
import { ProfileMetadata } from "./ProfileMetadata";
import { BackgroundEffectLayer, OverlayEffectLayer } from "./ProfileEffects";
import { CursorTrailLayer } from "./CursorTrailLayer";
import { WidgetCard } from "./WidgetCard";
import { ProfileInteractions } from "./ProfileInteractions";
import { AudioPlayer } from "./AudioPlayer";
import { ProfileSections } from "./ProfileSections";
import { BadgeRow } from "./BadgeRow";
import { CalendarIcon, ChevronIcon, EyeIcon, PinIcon } from "./Icons";
import { ReactionBar, ReactionGhost } from "./Reactions";
import { createPortal } from "react-dom";
import { ProfileBackgroundVideo } from "./ProfileBackgroundVideo";
import { MuteButton } from "./MuteButton";
import "../about.css";
import "../profileLayout.css";

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
    timerRef.current = window.setTimeout(() => onEnterRef.current(), (matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : Math.min(entry.animationDuration,600)));
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
  const backgroundImage =
    entry.imageMode === "background" ? entry.imageUrl || entry.backgroundImageUrl : entry.backgroundImageUrl;

  const content = (
    <>
      {entry.imageUrl && entry.imageMode !== "background" ? (
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

      <button type="button" className="lkr-entry-action" disabled={preview} onClick={event=>{event.stopPropagation();beginLeave();}}>Enter profile <ChevronIcon size={14}/></button>
      {entry.divider ? (
        <span
          className="lkr-entry-divider"
          aria-hidden="true"
          style={{
            width: `${entry.dividerWidth ?? 42}%`,
            height: `${entry.dividerSize ?? 1}px`,
            minHeight: "1px",
            // A solid centre with soft ends reads as one clean hairline; the
            // old transparent-to-colour fade vanished on darker backgrounds.
            background: `linear-gradient(90deg, transparent, ${entry.dividerColor || "#ffffff"} 12%, ${entry.dividerColor || "#ffffff"} 88%, transparent)`,
            boxShadow: `0 0 ${Math.max(8, (entry.dividerSize ?? 1) * 6)}px ${entry.dividerColor || "#ffffff"}55`,
            opacity: entry.dividerOpacity ?? 0.4,
          }}
        />
      ) : null}
    </>
  );

  return (
    <div
      className={`lkr-entry lkr-entry--${entry.animation} lkr-entry--${entry.align}${
        entry.imageMode === "background" && entry.imageUrl ? " lkr-entry--image-bg" : ""
      }${leaving ? " is-leaving" : ""}${preview ? " lkr-entry--preview" : ""}${entry.dim === 0 ? " lkr-entry--clear" : ""}`}
      data-layers={(entry.layers ?? ["text", "image", "background"]).join(" ")}
      role={preview ? undefined : "dialog"}
      aria-modal={preview ? undefined : true}
      tabIndex={preview ? -1 : 0}
      aria-label={preview ? undefined : "Profile entry"}
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
        "--lkr-entry-duration": `${Math.min(entry.animationDuration,600)}ms`,
        "--lkr-entry-fit": entry.imageFit,
      } as CSSProperties}
    >
      <div className="lkr-entry-bg" aria-hidden="true">
        {backgroundImage ? (
          <span
            className="lkr-entry-bg-image"
            style={{
              backgroundImage: `url("${backgroundImage.replace(/"/g, '\\"')}")`,
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

function AliasRequiredOverlay({
  account,
  owner,
}: {
  account: Pick<Account, "alias" | "aliasRequired">;
  owner: boolean;
}) {
  return (
    <div className="lkr-alias-lock" role="dialog" aria-modal="true" aria-labelledby="lkr-alias-lock-title">
      <div className="lkr-alias-lock-card">
        <span className="lkr-alias-lock-mark" aria-hidden="true">@</span>
        <h2 id="lkr-alias-lock-title">{owner ? "Set your alias" : "Profile setup in progress"}</h2>
        <p>
          {owner
            ? "Your old handle was your Discord username, so it has been released. Pick the name people will see on your page."
            : "This profile is being set up. Check back once the owner has chosen their alias."}
        </p>
        {owner ? (
          <a className="lkr-alias-lock-cta" href="#/dashboard/settings">Set your alias</a>
        ) : null}
        {account.alias?.startsWith("user_") && owner ? (
          <small>Temporary handle: @{account.alias}</small>
        ) : null}
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
  /** Render the page as a preview: visible player, no playback. */
  preview = false,
}: {
  user: Pick<Account, "id" | "username" | "alias" | "aliasRequired" | "avatarUrl">;
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
  /** Show the player but never start it — dashboard and demo previews. */
  preview?: boolean;
}) {
  const viewer = useOptionalAuth()?.user ?? null;
  const design = about.design;
  const assets = about.assets ?? DEFAULT_PROFILE_ASSETS;
  const previewMode = preview || !interactive;

  const sharedTilt = design.layout === "stacked" && design.stackTilt;
  const stackMotion = useTilt(sharedTilt ? design.tilt : 0, Boolean(design.tiltInvert));

  const entrySeenKey = `tourn.lol/entry-seen/v1/${user.username}`;
  // One question, asked both on mount and whenever the entry settings change,
  // so the "seen this visit" flag cannot be ignored (which reopened the entry
  // screen over an already-loaded card when navigating back to a profile).
  const entryWanted = () => {
    if (!showEntry || !design.entry.enabled) return false;
    // An enabled entry screen with nothing on it is just a black click blocker.
    // Skip straight to the first slide when there is no copy or image.
    const hasEntryContent = Boolean(
      design.entry.title.trim() ||
        design.entry.subtitle.trim() ||
        design.entry.hint.trim() ||
        design.entry.imageUrl.trim() ||
        design.entry.backgroundImageUrl.trim(),
    );
    if (!hasEntryContent) return false;
    if (!design.entry.oncePerSession) return true;
    try {
      return sessionStorage.getItem(entrySeenKey) === null;
    } catch {
      return true;
    }
  };
  const [entryOpen, setEntryOpen] = useState(entryWanted);
  // Page pins are portals into this element, so they sit on the page instead
  // of over whatever dashboard chrome happens to be behind the preview.
  const [pageHost, setPageHost] = useState<HTMLElement | null>(null);
  // Stable ref so React does not detach and re-attach the portal host every render.
  const attachPageHost = useCallback((node: HTMLElement | null) => setPageHost(node), []);

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

  // The background layer only gets a CSS filter when the owner actually changed
  // something. A permanent blur(0) saturate(1) contrast(1) brightness(1) chain
  // forced a full-screen filter pass on every frame of a background video.
  const bgFilter = [
    assets.background.blur > 0 ? `blur(${assets.background.blur}px)` : "",
    assets.background.saturation !== 1 ? `saturate(${assets.background.saturation})` : "",
    assets.background.contrast !== 1 ? `contrast(${assets.background.contrast})` : "",
    assets.background.brightness !== 1 ? `brightness(${assets.background.brightness})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const customCursorUrl = assets.cursor.style === "custom"
    ? (assets.cursor.imageUrl.trim() || assets.cursor.customCursorUrls[0]?.trim() || "")
    : "";
  const pointerCursorUrl = assets.cursor.pointerImageUrl.trim();
  // The browser scales an oversized cursor image down but leaves the CSS
  // hotspot in the image's own pixels, which throws the visible arrow far away
  // from the pointer. Crop/resize once, then the artwork starts exactly at 0 0.
  const [preparedCursors, setPreparedCursors] = useState<{
    cursor: { url: string; hotspot: CursorHotspot } | null;
    pointer: { url: string; hotspot: CursorHotspot } | null;
  }>({ cursor: null, pointer: null });
  useEffect(() => {
    let active = true;
    setPreparedCursors({ cursor: null, pointer: null });
    const apply = (key: "cursor" | "pointer", url: string) => {
      if (!url) return;
      void normalizeCursorArt(url).then((result) => {
        if (active) setPreparedCursors((current) => ({ ...current, [key]: result }));
      });
    };
    apply("cursor", customCursorUrl);
    apply("pointer", pointerCursorUrl);
    return () => { active = false; };
  }, [customCursorUrl, pointerCursorUrl]);
  const displayCursorUrl = preparedCursors.cursor?.url ?? customCursorUrl;
  const displayPointerUrl = preparedCursors.pointer?.url ?? pointerCursorUrl;
  // Automatic padding detection only drives the default. As soon as the owner
  // moves a hotspot slider their exact value wins, so an old manual correction
  // is never added to the detected inset twice.
  const manualHotspot = assets.cursor.hotspotX !== 0 || assets.cursor.hotspotY !== 0;
  const customCursorHotspot = manualHotspot
    ? `${Math.round(assets.cursor.hotspotX)} ${Math.round(assets.cursor.hotspotY)}`
    : `${preparedCursors.cursor?.hotspot.x ?? 0} ${preparedCursors.cursor?.hotspot.y ?? 0}`;
  const pointerCursorHotspot = manualHotspot
    ? `${Math.round(assets.cursor.hotspotX)} ${Math.round(assets.cursor.hotspotY)}`
    : `${preparedCursors.pointer?.hotspot.x ?? 0} ${preparedCursors.pointer?.hotspot.y ?? 0}`;

  const style = {
    "--lkr-bg-filter": bgFilter || "none",
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
    // About block and project card surfaces, each with its own pill style.
    "--pv-about-bg": hexToRgba(design.surfaces.about.container.background, design.surfaces.about.container.backgroundOpacity),
    "--pv-about-border": hexToRgba(design.surfaces.about.container.border, design.surfaces.about.container.borderOpacity),
    "--pv-about-bw": `${design.surfaces.about.container.borderWidth}px`,
    "--pv-about-blur": `${design.surfaces.about.container.blur}px`,
    "--pv-about-max": design.surfaces.about.container.width ? `${design.surfaces.about.container.width}px` : "none",
    "--pv-about-radius": `${design.surfaces.about.container.radius}px`,
    "--pv-about-pill-bg": hexToRgba(design.surfaces.about.pill.background, design.surfaces.about.pill.backgroundOpacity),
    "--pv-about-pill-border": hexToRgba(design.surfaces.about.pill.border, design.surfaces.about.pill.borderOpacity),
    "--pv-about-pill-text": design.surfaces.about.pill.text,
    "--pv-about-pill-bw": `${design.surfaces.about.pill.borderWidth}px`,
    "--pv-about-pill-blur": `${design.surfaces.about.pill.blur}px`,
    "--pv-about-pill-radius": `${design.surfaces.about.pill.radius}px`,
    "--pv-project-bg": hexToRgba(design.surfaces.project.container.background, design.surfaces.project.container.backgroundOpacity),
    "--pv-project-border": hexToRgba(design.surfaces.project.container.border, design.surfaces.project.container.borderOpacity),
    "--pv-project-bw": `${design.surfaces.project.container.borderWidth}px`,
    "--pv-project-blur": `${design.surfaces.project.container.blur}px`,
    "--pv-project-max": design.surfaces.project.container.width ? `${design.surfaces.project.container.width}px` : "none",
    "--pv-project-radius": `${design.surfaces.project.container.radius}px`,
    "--pv-project-pill-bg": hexToRgba(design.surfaces.project.pill.background, design.surfaces.project.pill.backgroundOpacity),
    "--pv-project-pill-border": hexToRgba(design.surfaces.project.pill.border, design.surfaces.project.pill.borderOpacity),
    "--pv-project-pill-text": design.surfaces.project.pill.text,
    "--pv-project-pill-bw": `${design.surfaces.project.pill.borderWidth}px`,
    "--pv-project-pill-blur": `${design.surfaces.project.pill.blur}px`,
    "--pv-project-pill-radius": `${design.surfaces.project.pill.radius}px`,
    "--pv-project-cols": `${design.projectLayout.columns}`,
    "--pv-project-gap": `${design.projectLayout.gap}px`,
    "--pv-project-media": `${design.projectLayout.mediaSize}%`,
    "--pv-project-lines": `${design.projectLayout.textLines}`,
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
    cursor: displayCursorUrl
      ? `url("${displayCursorUrl.replace(/"/g, '\\"')}") ${customCursorHotspot}, auto`
      : assets.cursor.style !== "system" && assets.cursor.style !== "custom" ? "none" : undefined,
    ...(displayPointerUrl
      ? { "--lkr-pointer-cursor": `url("${displayPointerUrl.replace(/"/g, '\\"')}") ${pointerCursorHotspot}, pointer` }
      : {}),
  } as CSSProperties;

  const visibleWidgets = widgets.widgets.filter((widget) => widget.visible !== false);
  const orderedWidgets = visibleWidgets;

  const widgetStack = orderedWidgets.length ? (
    <div className="lkr-widgets-block" data-detail="widgets">
      <div
        className="lkr-widgets"
        style={{ columnGap: widgets.design.gap, rowGap: widgets.design.gap }}
      >
        {orderedWidgets.map((widget) => (
          <WidgetCard
            key={widget.id}
            widget={widget}
            design={widgets.design}
            tilt={design.widgetTilt ? design.tilt ?? 0 : 0}
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

  // The player has four homes: inside the card's bottom edge, under the
  // card, or fixed at the top / bottom of the page with a small offset.
  const audioSlot = design.audioSlot ?? "below-card";

  const requestedWidgetsPosition = design.widgetsPosition ?? "auto";
  const widgetsPosition = requestedWidgetsPosition === "auto" ? "inside" : requestedWidgetsPosition;
  // Automatic placement uses the reference card; explicit below-card choices
  // stay outside. Both placements share the same fixed widget dimensions.
  const effectiveWidgetsPosition = widgetsPosition;
  const profileCard = (includeWidgets = true) => (
    <ProfilePreview
      user={user}
      about={about}
      badges={badges.equipped}
      badgeStyle={badges.style ?? DEFAULT_BADGE_STYLE}
      links={links.links}
      linkDesign={links.design ?? DEFAULT_LINK_DESIGN}
      hideLinks={(design.slideshow === true || design.cardStyle === "slide") && Boolean(design.slideshowLinks)}
      className="profile-preview--with-widgets"
      views={views}
      joined={joined}
      reactions={
        interactive ? (
          <ReactionBar
            handle={user.username}
            variant="card"
            tooltipStyle={about.design.tooltips.style}
            tooltipAnimation={about.design.tooltips.animation}
            tooltipEnabled={about.design.tooltips.enabled}
          />
        ) : (
          <ReactionGhost />
        )
      }
      entryActive={entryOpen}
      disableTilt={sharedTilt}
      hideAudio={hideAudio || audioSlot !== "card-bottom"}
      preview={previewMode}
      pageLayerTarget={pageHost}
    >
      {includeWidgets && orderedWidgets.length ? widgetStack : null}
    </ProfilePreview>
  );

  // The card stays in the middle of the page for every layout; the layouts
  // rearrange what is inside it. `stacked` is the exception: it lifts the
  // player out under the card so the track has its own titled panel.
  // The player skin can be off while the uploaded track still plays. The mute
  // button is the only control needed in that case.
  const hasTrack = !hideAudio && Boolean(about.assets.audio.fileUrl);

  const showWidgetsBelow = effectiveWidgetsPosition === "below" && orderedWidgets.length > 0;
  const showAudioBelow = audioSlot === "below-card" && hasTrack;
  const showAudioPage = (audioSlot === "page-top" || audioSlot === "page-bottom") && hasTrack;
  const belowStack = (
    <>
      {showWidgetsBelow ? <div className="lkr-stacked-widgets">{widgetStack}</div> : null}
      {showAudioBelow ? (
        <div className="lkr-stack">
          <div className="lkr-audio" data-detail="audio">
            <AudioPlayer settings={about.assets.audio} enabled={!entryOpen} preview={previewMode} />
          </div>
        </div>
      ) : null}
    </>
  );
  const primaryCards = (
    <>
      {profileCard(effectiveWidgetsPosition === "inside")}
      {belowStack}
    </>
  );
  const slidesRef=useRef<HTMLDivElement>(null);
  const dragRef=useRef<{y:number;scroll:number}|null>(null);
  const aboutProjects = (design.sections ?? []).filter(
    (section) => section.kind === "project" && ((section.title ?? "").trim() || section.image),
  );
  // Projects listed inside the About page leave the slide rotation: they are
  // the same cards, shown full size in About, not a second small copy.
  const projectsInAbout = new Set(design.aboutSlide?.showProjects ? aboutProjects.map((project) => project.id) : []);
  const groupedSections:typeof design.sections[]=[];
  for(const section of design.sections){if(projectsInAbout.has(section.id))continue;const last=groupedSections[groupedSections.length-1];if(last && last[0].kind===section.kind)last.push(section);else groupedSections.push([section]);}
  const skills=(design.skills||[]).flatMap(id=>{const item=TECH_BY_ID.get(id);return item?[item]:[];});
  const skillPills=skills.length?<section className="lkr-skills-section"><h2>Skills</h2><div className="lkr-tech-row">{skills.map(item=><span key={item.id} className="lkr-tech"><img src={techIconUrl(item)} alt=""/>{item.name}</span>)}</div></section>:null;
  const sectionsVisible = design.sectionsEnabled === true || design.cardStyle === "slide";
  const hasSkills = skills.length > 0;
  const gallerySettings = design.gallery || DEFAULT_GALLERY;
  const portfolio = design.portfolio || DEFAULT_PORTFOLIO;
  const hasGallery = gallerySettings.enabled && gallerySettings.items.length > 0;
  // Sections only ever appear as slideshow pages; the plain stack is gone.
  const slideshowLayout = design.slideshow === true || design.cardStyle === "slide";
  const slideshowActive = Boolean(
    slideshowLayout &&
      (hasGallery || hasSkills ||
        (sectionsVisible && groupedSections.length > 0) ||
        design.slideshowLinks ||
        design.slideshowBadges ||
        design.slideshowAbout),
  );
  const skillWrap = skillPills ? <div className={`lkr-skills-wrap${slideshowActive ? " lkr-slide" : ""}`}>{skillPills}</div> : null;
  const sectionContent = sectionsVisible || skillPills ? (
    <>
      {skillWrap}
      {sectionsVisible
        ? groupedSections.map((group) => (
            <div key={group[0].id} className={slideshowActive ? "lkr-slide" : ""}>
              <ProfileSections sections={group} interestMode={design.interestMode} projectLayout={design.projectLayout} />
            </div>
          ))
        : null}
    </>
  ) : null;
  const tooltips = design.tooltips;
  const showLinksSlide = slideshowActive && design.slideshowLinks && links.links.some((link) => link.visible && link.url.trim());
  const showBadgesSlide = slideshowActive && design.slideshowBadges && badges.equipped.length > 0;
  const aboutSlide = design.aboutSlide ?? { title: "About me", subtitle: "", text: "", tags: [] };
  // The About page is authored entirely in the editor now: its own title,
  // subtitle, writing and tags. The profile bio no longer leaks in here, so
  // leaving the slide empty really does leave the page blank.
  const showAboutSlide =
    slideshowActive &&
    design.slideshowAbout &&
    Boolean(
      aboutSlide.title.trim() ||
        aboutSlide.subtitle.trim() ||
        aboutSlide.text.trim() ||
        aboutSlide.tags.length,
    );

  // A slideshow must open on its first page; without this a restored scroll
  // position or a late layout shift can leave the card's top above the fold.
  useEffect(() => {
    if (!slideshowActive || !slidesRef.current) return;
    slidesRef.current.scrollTop = 0;
  }, [slideshowActive]);
  const slideshowExtras = showLinksSlide || showBadgesSlide || showAboutSlide ? (
    <>
      {showAboutSlide ? (
        <div className="lkr-slide">
          <section className="lkr-slide-panel lkr-about-slide">
              <h2 className="lkr-about-title">{aboutSlide.title || "About me"}</h2>
            {aboutSlide.subtitle ? <p className="lkr-about-sub">{aboutSlide.subtitle}</p> : null}
            {aboutSlide.text.trim() ? <p className="lkr-about-text">{aboutSlide.text}</p> : null}
            {aboutSlide.widgetIds?.length ? <div className="lkr-about-widgets">{aboutSlide.widgetIds.flatMap(id=>{const widget=visibleWidgets.find(item=>item.id===id);return widget?[<WidgetCard key={widget.id} widget={widget} design={widgets.design} className="widget-card--linker"/>]:[];})}</div> : null}
            {aboutSlide.showProjects && aboutProjects.length ? (
              <div className="lkr-about-projects lkr-about-projects--full">
                <ProfileSections sections={aboutProjects} interestMode={design.interestMode} projectLayout={design.projectLayout} />
              </div>
            ) : null}
            {aboutSlide.tags.length ? (
              <div className="lkr-about-tags">
                {aboutSlide.tags.map((id) => {
                  const tech = TECH_BY_ID.get(id);
                  return (
                    <span className="lkr-about-tag" key={id}>
                      {tech ? <img src={techIconUrl(tech)} alt="" loading="lazy" /> : null}
                      {tech?.name ?? id}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
      {showLinksSlide ? (
        <div className="lkr-slide">
          <section className="lkr-slide-panel">
            <span className="lkr-slide-label">Links</span>
            <ProfileLinks
              links={links.links}
              design={links.design}
              tooltipStyle={tooltips.style}
              tooltipEnabled={tooltips.enabled}
              tooltipAnimation={tooltips.animation}
            />
          </section>
        </div>
      ) : null}
      {showBadgesSlide ? (
        <div className="lkr-slide">
          <section className="lkr-slide-panel">
            <span className="lkr-slide-label">Badges</span>
            <BadgeRow
              badges={badges.equipped}
              style={badges.style ?? DEFAULT_BADGE_STYLE}
              tooltipStyle={tooltips.style}
              tooltipEnabled={tooltips.enabled}
              tooltipAnimation={tooltips.animation}
            />
          </section>
        </div>
      ) : null}
    </>
  ) : null;

  const [slideIndex, setSlideIndex] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  useEffect(() => {
    const flow = slidesRef.current;
    if (!flow || !slideshowActive) {
      setSlideCount(0);
      setSlideIndex(0);
      return;
    }
    let frame = 0;
    const sync = () => {
      const slides = Array.from(flow.querySelectorAll<HTMLElement>(":scope > .lkr-slide"));
      setSlideCount(slides.length);
      let active = 0;
      let nearest = Number.POSITIVE_INFINITY;
      slides.forEach((slide, index) => {
        const distance = Math.abs(slide.offsetTop - flow.offsetTop - flow.scrollTop);
        if (distance < nearest) {
          nearest = distance;
          active = index;
        }
      });
      setSlideIndex(active);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };
    sync();
    const settle = window.setTimeout(sync, 140);
    flow.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      flow.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", sync);
    };
  }, [slideshowActive, design.sectionsEnabled, design.sections.length, design.skills?.length, gallerySettings.items.length, portfolio.order.join(",")]);
  const goToSlide = (index: number) => {
    const flow = slidesRef.current;
    if (!flow) return;
    const slides = Array.from(flow.querySelectorAll<HTMLElement>(":scope > .lkr-slide"));
    const target = slides[index];
    if (target) flow.scrollTo({ top: target.offsetTop - flow.offsetTop, behavior: "smooth" });
  };
  const page = (
    <div ref={slidesRef} style={{scrollSnapType:portfolio.snap ? undefined : "none"}} className={`lkr-flow lkr-flow--${design.layout}${slideshowActive?" lkr-flow--slideshow lkr-slideshow":""}`} onPointerDown={event=>{if(!slideshowActive || event.pointerType!=="mouse" || event.button!==0 || (event.target as HTMLElement).closest("a,button,input,textarea,select,video,audio"))return;dragRef.current={y:event.clientY,scroll:event.currentTarget.scrollTop};event.currentTarget.style.scrollBehavior="auto";event.currentTarget.style.scrollSnapType="none";event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{if(!dragRef.current)return;event.currentTarget.scrollTop=dragRef.current.scroll+dragRef.current.y-event.clientY;}} onPointerUp={event=>{if(!dragRef.current)return;dragRef.current=null;const el=event.currentTarget;el.style.scrollBehavior="";el.style.scrollSnapType=portfolio.snap?"":"none";const slides=Array.from(el.children).filter(item=>item.classList.contains("lkr-slide")) as HTMLElement[];const nearest=slides.reduce<HTMLElement|null>((best,item)=>!best||Math.abs(item.offsetTop-el.offsetTop-el.scrollTop)<Math.abs(best.offsetTop-el.offsetTop-el.scrollTop)?item:best,null);if(nearest&&portfolio.snap)el.scrollTo({top:nearest.offsetTop-el.offsetTop,behavior:"smooth"});}} onPointerCancel={event=>{dragRef.current=null;event.currentTarget.style.scrollBehavior="";event.currentTarget.style.scrollSnapType=portfolio.snap?"":"none";}}>
      <div className={`${slideshowActive?"lkr-slide":"lkr-primary"}${design.layout==="left"?" lkr-primary--left":""}`}>
      {design.layout === "stacked" ? <div className={`lkr-stacked-group${sharedTilt && design.tilt > 0 ? " lkr-stacked-group--tilt" : ""}`} ref={stackMotion.ref} onPointerMove={stackMotion.onPointerMove} onPointerLeave={stackMotion.onPointerLeave}>{primaryCards}</div> : primaryCards}
      </div>
      {slideshowActive ? portfolio.order.map(key=><Fragment key={key}>{key==="about"?slideshowExtras:key==="sections"?sectionContent:hasGallery?<div className="lkr-slide"><ProfileGallery settings={gallerySettings}/></div>:null}</Fragment>) : null}
    </div>
  );

  return (
    <div
      ref={attachPageHost}
      className={`lkr-page lkr-card-${design.cardStyle}${className ? ` ${className}` : ""}`}
      style={style}
      data-interactive={interactive ? "true" : undefined}
      data-project-lines={design.projectLayout.textLines === 0 ? "all" : undefined}
      data-scattered={design.scattered ? "true" : undefined}
      data-fx-filter={assets.effects.overlay.id}
    >
      {interactive ? <ProfileInteractions settings={assets.interactions} /> : null}
      {showMetadata ? <ProfileMetadata about={about} user={user} /> : null}
      <div className={`lkr-bg lkr-bg--${assets.background.style} lkr-bg-anim-${assets.background.gradientAnim || "none"}`} aria-hidden="true">
        {assets.background.style === "image" && assets.background.imageUrl ? (
          <span
            className="lkr-bg-image"
            style={{ backgroundImage: `url("${assets.background.imageUrl.replace(/"/g, '\\"')}")`, backgroundPosition: `${assets.background.positionX ?? 50}% ${assets.background.positionY ?? 50}%`, backgroundSize: assets.background.fit || "cover", backgroundRepeat: "no-repeat" }}
          />
        ) : null}
        {assets.background.style === "video" && assets.background.videoUrl ? <ProfileBackgroundVideo settings={assets.background} entryActive={entryOpen} interactive={interactive}/> : null}
        <span className="lkr-bg-dim" />
      </div>
      <BackgroundEffectLayer settings={assets.effects.background} />
      {page}
      {slideshowActive && portfolio.hint && slideIndex === 0 ? (
        <button
          type="button"
          className={`lkr-scroll-hint${portfolio.hintAnimate ? " is-animated" : ""}`}
          onClick={() => goToSlide(1)}
          aria-label={portfolio.hintText || "Scroll to portfolio"}
        >
          <small>{portfolio.hintText || "Scroll to view more"}</small><span aria-hidden="true">⌄</span>
        </button>
      ) : null}
      {slideshowActive && slideCount > 1 && portfolio.indicators ? (
        <nav className="lkr-slide-dots" aria-label="Slideshow pages">
          {Array.from({ length: slideCount }, (_, index) => (
            <button
              key={index}
              type="button"
              className={`lkr-slide-dot${index === slideIndex ? " is-active" : ""}`}
              aria-label={`Go to slide ${index + 1} of ${slideCount}`}
              aria-current={index === slideIndex ? "true" : undefined}
              onClick={() => goToSlide(index)}
            />
          ))}
        </nav>
      ) : null}
      {showAudioPage ? (
        <div data-detail="audio" className={`lkr-page-audio lkr-page-audio--${audioSlot}`}>
          <AudioPlayer settings={about.assets.audio} enabled={!entryOpen} preview={previewMode} />
        </div>
      ) : null}
      {hasTrack && assets.audio.muteButton && !previewMode ? <aside className={`lkr-popup-audio lkr-popup-audio--${assets.audio.popupSide}`} style={{ "--popup-offset": `${assets.audio.popupOffset}px` } as CSSProperties} aria-label="Mute button"><MuteButton settings={assets.audio} /></aside> : null}
      <OverlayEffectLayer settings={assets.effects.overlay} />
      <CursorTrailLayer settings={assets.cursor} />
      {user.aliasRequired && interactive ? <AliasRequiredOverlay account={user} owner={viewer?.id === user.id} /> : null}
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
