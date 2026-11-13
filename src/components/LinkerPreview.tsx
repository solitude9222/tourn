import {TECH_BY_ID,techIconUrl} from "../lib/techStack";
import { useTilt } from "../lib/useTilt";
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
import { ProfileSections } from "./ProfileSections";
import { BadgeRow } from "./BadgeRow";
import { CalendarIcon, ChevronIcon, EyeIcon, PinIcon } from "./Icons";
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

      {entry.divider ? (
        <span
          className="lkr-entry-divider"
          aria-hidden="true"
          style={{
            width: `${entry.dividerWidth ?? 42}%`,
            height: `${entry.dividerSize ?? 1}px`,
            background: `linear-gradient(90deg,transparent,${entry.dividerColor || "#ffffff"},transparent)`,
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
      }${leaving ? " is-leaving" : ""}${preview ? " lkr-entry--preview" : ""}`}
      data-layers={(entry.layers ?? ["text", "image", "background"]).join(" ")}
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
  const sharedTilt = design.layout === "stacked" && design.stackTilt;
  const stackMotion = useTilt(sharedTilt ? design.tilt : 0, Boolean(design.tiltInvert));
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
  const orderedWidgets = visibleWidgets;

  const widgetStack = orderedWidgets.length ? (
    <div className="lkr-widgets-block">
      <div className="lkr-widgets" style={{ gap: widgets.design.gap }}>
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

  const requestedAudioPosition = design.audioPosition === "hidden" ? "hidden" : assets.audio.style === "popup" ? "popup" : design.audioPosition === "auto" ? design.layout === "stacked" ? "below" : "inside" : design.audioPosition;
  // A slideshow replaces the card body on every slide, so a player living
  // inside the card would only exist on the first one. Lift it under the card
  // instead and it stays on screen across slides.
  const slideshowCards = design.slideshow === true || design.cardStyle === "slide";
  const audioPosition = (design.layout === "stacked" || slideshowCards) && requestedAudioPosition === "inside" ? "below" : design.layout !== "left" && requestedAudioPosition === "side" ? "below" : requestedAudioPosition;
  const requestedWidgetsPosition = design.widgetsPosition ?? "auto";
  const widgetsPosition = requestedWidgetsPosition === "auto" ? (design.layout === "stacked" ? "below" : "inside") : requestedWidgetsPosition;
  // Stacked has always kept widgets under the card; preserve that even when a
  // profile saved its placement before the setting existed.
  const effectiveWidgetsPosition = design.layout === "stacked" ? "below" : widgetsPosition;
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
      hideViews={design.layout === "left" && design.viewPosition === "side"}
      hideJoined={design.layout === "left" && design.joinPosition === "side"}
      hideLocation={design.layout === "left" && design.locationPosition === "side"}
      entryActive={entryOpen}
      disableTilt={sharedTilt}
      hideAudio={hideAudio || audioPosition !== "inside"}
    >
      {includeWidgets && orderedWidgets.length ? widgetStack : null}
    </ProfilePreview>
  );

  // The card stays in the middle of the page for every layout; the layouts
  // rearrange what is inside it. `stacked` is the exception: it lifts the
  // player out under the card so the track has its own titled panel.
  const hasTrack =
    !hideAudio && audioPosition !== "hidden" && about.assets.audio.style !== "none" && Boolean(about.assets.audio.fileUrl);

  const showWidgetsBelow = effectiveWidgetsPosition === "below" && orderedWidgets.length > 0;
  const showAudioSide = design.layout === "left" && audioPosition === "side" && hasTrack;
  const showAudioBelow = audioPosition === "below" && hasTrack;
  const sideViews = design.layout === "left" && design.viewPosition === "side";
  const sideJoined = design.layout === "left" && design.joinPosition === "side";
  const sideLocation = design.layout === "left" && design.locationPosition === "side";
  const hasSideMeta = sideViews || sideJoined || sideLocation;
  const sideMeta = hasSideMeta ? (
    <div className="lkr-side-meta">
      {sideViews ? <span className="lkr-side-pill"><EyeIcon size={12} />{typeof views === "number" ? views.toLocaleString("en-US") : "—"}</span> : null}
      {sideJoined ? <span className="lkr-side-pill"><CalendarIcon size={12} />Joined {joined ?? "—"}</span> : null}
      {sideLocation && about.location.trim() ? <span className="lkr-side-pill"><PinIcon size={12} />{about.location.trim()}</span> : null}
    </div>
  ) : null;
  const hasSide = hasSideMeta || showAudioSide;
  const sideRail = hasSide ? (
    <aside className="lkr-side" aria-label="Profile extras">
      {sideMeta}
      {showAudioSide ? <div className="lkr-side-audio"><AudioPlayer settings={about.assets.audio} enabled={!entryOpen} /></div> : null}
    </aside>
  ) : null;
  const belowStack = (
    <>
      {showWidgetsBelow ? <div className="lkr-stacked-widgets">{widgetStack}</div> : null}
      {showAudioBelow ? (
        <div className="lkr-stack">
          <div className="lkr-audio">
            <AudioPlayer settings={about.assets.audio} enabled={!entryOpen} />
          </div>
        </div>
      ) : null}
    </>
  );
  const primaryCards = (
    <>
      {profileCard(effectiveWidgetsPosition === "inside")}
      {sideRail}
      {belowStack}
    </>
  );
  const slidesRef=useRef<HTMLDivElement>(null);
  const dragRef=useRef<{y:number;scroll:number}|null>(null);
  const groupedSections:typeof design.sections[]=[];
  for(const section of design.sections){const last=groupedSections[groupedSections.length-1];if(last && last[0].kind===section.kind)last.push(section);else groupedSections.push([section]);}
  const skills=(design.skills||[]).flatMap(id=>{const item=TECH_BY_ID.get(id);return item?[item]:[];});
  const skillPills=skills.length?<section className="lkr-skills-section"><h2>Skills</h2><div className="lkr-tech-row">{skills.map(item=><span key={item.id} className="lkr-tech"><img src={techIconUrl(item)} alt=""/>{item.name}</span>)}</div></section>:null;
  const sectionsVisible = design.sectionsEnabled === true || design.cardStyle === "slide";
  const hasSkills = skills.length > 0;
  // Sections only ever appear as slideshow pages; the plain stack is gone.
  const slideshowLayout = design.slideshow === true || design.cardStyle === "slide";
  const slideshowActive = Boolean(
    slideshowLayout &&
      (hasSkills ||
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
              <ProfileSections sections={group} />
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
              size={26}
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
  }, [slideshowActive, design.sectionsEnabled, design.sections.length, design.skills?.length]);
  const goToSlide = (index: number) => {
    const flow = slidesRef.current;
    if (!flow) return;
    const slides = Array.from(flow.querySelectorAll<HTMLElement>(":scope > .lkr-slide"));
    const target = slides[index];
    if (target) flow.scrollTo({ top: target.offsetTop - flow.offsetTop, behavior: "smooth" });
  };
  const page = (
    <div ref={slidesRef} className={`lkr-flow lkr-flow--${design.layout}${slideshowActive?" lkr-flow--slideshow lkr-slideshow":""}`} onPointerDown={event=>{if(!slideshowActive || event.pointerType!=="mouse" || event.button!==0 || (event.target as HTMLElement).closest("a,button,input,textarea,select,video,audio"))return;dragRef.current={y:event.clientY,scroll:event.currentTarget.scrollTop};event.currentTarget.style.scrollBehavior="auto";event.currentTarget.style.scrollSnapType="none";event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{if(!dragRef.current)return;event.currentTarget.scrollTop=dragRef.current.scroll+dragRef.current.y-event.clientY;}} onPointerUp={event=>{if(!dragRef.current)return;dragRef.current=null;const el=event.currentTarget;el.style.scrollBehavior="";el.style.scrollSnapType="";const slides=Array.from(el.children).filter(item=>item.classList.contains("lkr-slide")) as HTMLElement[];const nearest=slides.reduce<HTMLElement|null>((best,item)=>!best||Math.abs(item.offsetTop-el.offsetTop-el.scrollTop)<Math.abs(best.offsetTop-el.offsetTop-el.scrollTop)?item:best,null);if(nearest)el.scrollTo({top:nearest.offsetTop-el.offsetTop,behavior:"smooth"});}} onPointerCancel={event=>{dragRef.current=null;event.currentTarget.style.scrollBehavior="";event.currentTarget.style.scrollSnapType="";}}>
      <div className={`${slideshowActive?"lkr-slide":"lkr-primary"}${design.layout==="left"?" lkr-primary--left":""}${design.layout==="left"&&!hasSide?" lkr-primary--left--empty":""}`}>
      {design.layout === "stacked" ? <div className={`lkr-stacked-group${sharedTilt && design.tilt > 0 ? " lkr-stacked-group--tilt" : ""}`} ref={stackMotion.ref} onPointerMove={stackMotion.onPointerMove} onPointerLeave={stackMotion.onPointerLeave}>{primaryCards}</div> : primaryCards}
      </div>
      {slideshowActive ? sectionContent : null}
      {slideshowExtras}
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
      {slideshowActive && slideCount > 1 ? (
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
      {hasTrack && audioPosition === "popup" ? <aside className={`lkr-popup-audio lkr-popup-audio--${assets.audio.popupSide}`} style={{ "--popup-offset": `${assets.audio.popupOffset}px` } as CSSProperties} aria-label="Popup audio player"><AudioPlayer settings={{ ...assets.audio, style: "popup" }} enabled={!entryOpen} /></aside> : null}
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
