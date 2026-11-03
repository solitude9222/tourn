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
import { BackgroundEffectLayer, OverlayEffectLayer } from "./ProfileEffects";
import { WidgetCard } from "./WidgetCard";
import { ChevronIcon } from "./Icons";
import "../about.css";

function EntryOverlay({
  about,
  onEnter,
  playToken = 0,
}: {
  about: About;
  onEnter: () => void;
  playToken?: number;
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
    </>
  );

  return (
    <div
      className={`lkr-entry lkr-entry--${entry.animation} lkr-entry--${entry.align}${leaving ? " is-leaving" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="Enter profile"
      onPointerDown={beginLeave}
      onClick={beginLeave}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          beginLeave();
        }
      }}
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
  entryPlayToken = 0,
  views = null,
  joined,
}: {
  user: Pick<Account, "id" | "username" | "avatarUrl">;
  about: About;
  widgets: WidgetStore;
  badges?: BadgeStore;
  links?: LinkStore;
  className?: string;
  interactive?: boolean;
  showEntry?: boolean;
  entryPlayToken?: number;
  /** Real profile view count, when it has loaded. */
  views?: number | null;
  /** Formatted join date for the card footer. */
  joined?: string;
}) {
  const design = about.design;
  const assets = about.assets ?? DEFAULT_PROFILE_ASSETS;
  const entrySeenKey = `tourn.lol/entry-seen/v1/${user.username}`;
  const [entryOpen, setEntryOpen] = useState(() => {
    if (!showEntry || !design.entry.enabled) return false;
    if (!design.entry.oncePerSession) return true;
    try {
      return sessionStorage.getItem(entrySeenKey) === null;
    } catch {
      return true;
    }
  });
  const [active, setActive] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const slideshow = design.cardStyle === "slideshow";

  useEffect(() => {
    setEntryOpen(showEntry && design.entry.enabled);
  }, [showEntry, design.entry.enabled, user.username]);

  // "Replay" in the dashboard bumps the token: reopen the screen, then let
  // EntryOverlay play it out on its own.
  useEffect(() => {
    if (entryPlayToken <= 0) return;
    setEntryOpen(showEntry && design.entry.enabled);
  }, [entryPlayToken, showEntry, design.entry.enabled]);

  useEffect(() => {
    if (!slideshow) return;
    const scroller = scrollRef.current;
    if (!scroller) return;
    const onScroll = () => {
      const center = scroller.scrollTop + scroller.clientHeight / 2;
      let next = 0;
      sectionRefs.current.forEach((section, index) => {
        if (!section) return;
        if (section.offsetTop <= center) next = index;
      });
      setActive(next);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [slideshow, design.entry.enabled]);

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
    "--lkr-scroll-speed": `${design.slideshow.speed}ms`,
    "--lkr-bg-color": assets.background.color,
    "--lkr-bg-from": assets.background.from,
    "--lkr-bg-to": assets.background.to,
    "--lkr-bg-blur": `${assets.background.blur}px`,
    "--lkr-bg-dim": assets.background.dim,
    cursor: assets.cursor.imageUrl.trim()
      ? `url("${assets.cursor.imageUrl.trim().replace(/"/g, '\\"')}") 4 4, auto`
      : undefined,
  } as CSSProperties;

  const widgetStack = widgets.widgets.length ? (
    <div className="lkr-widgets">
      {widgets.widgets.map((widget) => (
        <WidgetCard key={widget.id} widget={widget} design={widgets.design} className="widget-card--linker" />
      ))}
    </div>
  ) : (
    <p className="lkr-empty">No widgets yet.</p>
  );

  const profileCard = (insideCard: boolean) => (
    <ProfilePreview
      user={user}
      about={about}
      badges={badges.equipped}
      badgeStyle={badges.style ?? DEFAULT_BADGE_STYLE}
      links={links.links}
      linkDesign={links.design ?? DEFAULT_LINK_DESIGN}
      className={slideshow ? "profile-preview--slide" : "profile-preview--with-widgets"}
      views={views}
      joined={joined}
    >
      {insideCard && widgets.widgets.length ? widgetStack : null}
    </ProfilePreview>
  );

  const goTo = (index: number) => {
    const section = sectionRefs.current[index];
    const scroller = scrollRef.current;
    if (!section || !scroller) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!design.slideshow.smooth || reduceMotion) {
      scroller.scrollTop = section.offsetTop;
      return;
    }

    const start = scroller.scrollTop;
    const distance = section.offsetTop - start;
    const duration = design.slideshow.speed;
    const started = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      scroller.scrollTop = start + distance * eased;
      if (progress < 1) window.requestAnimationFrame(step);
    };

    window.requestAnimationFrame(step);
  };

  const page = slideshow ? (
    <>
      <div
        ref={scrollRef}
        className="lkr-scroll lkr-slideshow"
      >
        <PageSection
          id="lkr-profile"
          className="lkr-slide lkr-slide--profile"
          innerRef={(node) => {
            sectionRefs.current[0] = node;
          }}
        >
          {profileCard(false)}
        </PageSection>
        <PageSection
          id="lkr-widgets"
          className="lkr-slide"
          innerRef={(node) => {
            sectionRefs.current[1] = node;
          }}
        >
          <h3 className="lkr-slide-title">Widgets</h3>
          {widgetStack}
        </PageSection>
        <PageSection
          id="lkr-links"
          className="lkr-slide"
          innerRef={(node) => {
            sectionRefs.current[2] = node;
          }}
        >
          <h3 className="lkr-slide-title">Find me</h3>
          {links.links.some((l) => l.visible && l.url.trim()) ? (
            <ProfileLinks links={links.links} design={links.design ?? DEFAULT_LINK_DESIGN} />
          ) : (
            <span className="lkr-link-pill">tourn.lol/{user.username}</span>
          )}
        </PageSection>
      </div>

      {design.slideshow.sideNav ? (
        <nav className="lkr-side-nav" aria-label="Profile sections">
          {["Profile", "Widgets", "Links"].map((label, index) => (
            <button
              key={label}
              type="button"
              className={`lkr-side-dot${active === index ? " is-active" : ""}`}
              onClick={() => goTo(index)}
              aria-label={label}
              title={label}
            >
              <span />
            </button>
          ))}
        </nav>
      ) : null}

      {design.slideshow.indicator ? (
        <button
          type="button"
          className="lkr-scroll-hint"
          onClick={() => goTo(Math.min(active + 1, 2))}
          aria-label="Scroll to next section"
        >
          <ChevronIcon size={13} />
        </button>
      ) : null}
    </>
  ) : (
    <div className="lkr-flow">
      {profileCard(true)}
    </div>
  );

  return (
    <div
      className={`lkr-page lkr-card-${design.cardStyle}${className ? ` ${className}` : ""}`}
      style={style}
      data-interactive={interactive ? "true" : undefined}
    >
      <ProfileMetadata about={about} user={user} />
      <div className={`lkr-bg lkr-bg--${assets.background.style}`} aria-hidden="true">
        {assets.background.style === "image" && assets.background.imageUrl ? (
          <span
            className="lkr-bg-image"
            style={{ backgroundImage: `url("${assets.background.imageUrl.replace(/"/g, '\\"')}")` }}
          />
        ) : null}
        <span className="lkr-bg-dim" />
      </div>
      <BackgroundEffectLayer settings={assets.effects.background} />
      {page}
      <OverlayEffectLayer settings={assets.effects.overlay} />
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
