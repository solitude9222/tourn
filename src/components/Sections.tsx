import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { SiteStats } from "../lib/siteStats";
import { formatCompactNumber } from "../lib/format";
import { WidgetCard } from "./WidgetCard";
import {
  DEFAULT_WIDGET_DESIGN,
  WIDGET_PLATFORM_BY_ID,
  defaultWidgetOptions,
  type WidgetInstance,
} from "../lib/widgets";
import { DEFAULT_SETTINGS, FEATURED_TRACK } from "../config";
import { ProfileCard } from "./ProfileCard";
import { BADGE_CATALOGUE } from "../lib/badges";
import { Tooltip } from "./Tooltip";
import { WidgetPlatformIcon } from "./WidgetPlatformIcon";
import {
  ArrowRight,
  ArrowUpRight,
  BoltIcon,
  CheckIcon,
  ChevronIcon,
  DiscIcon,
  DiscordIcon,
  ExternalIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SpotifyIcon,
  UsersIcon,
  VolumeIcon,
} from "./Icons";
import "../home.css";

/* ------------------------------------------------------------------ data */

const HOME_WIDGETS: WidgetInstance[] = [
  {
    id: "home-discord",
    platform: "discord",
    content: DEFAULT_SETTINGS.discordUserId,
    visible: true,
    options: defaultWidgetOptions(WIDGET_PLATFORM_BY_ID.get("discord")!),
  },
  {
    id: "home-spotify",
    platform: "spotify",
    content: FEATURED_TRACK.id,
    visible: true,
    options: defaultWidgetOptions(WIDGET_PLATFORM_BY_ID.get("spotify")!),
  },
  {
    id: "home-github",
    platform: "github",
    content: "1546745348020772915",
    visible: true,
    options: defaultWidgetOptions(WIDGET_PLATFORM_BY_ID.get("github")!),
  },
  {
    id: "home-steam",
    platform: "steam",
    content: DEFAULT_SETTINGS.steamUrl,
    visible: true,
    options: defaultWidgetOptions(WIDGET_PLATFORM_BY_ID.get("steam")!),
  },
];

const HOME_WIDGET_DESIGN = {
  ...DEFAULT_WIDGET_DESIGN,
  backgroundStyle: "art" as const,
  backgroundColor: "#161616",
  backgroundOpacity: 0.92,
  borderColor: "#2e2e2e",
  borderOpacity: 1,
  radius: 16,
  gap: 18,
};

const PLATFORM_STRIP = [
  "discord",
  "spotify",
  "steam",
  "github",
  "roblox",
  "twitch",
  "valorant",
  "minecraft",
  "lastfm",
  "weather",
];

const AUDIO_STYLES = [
  { id: "compact", label: "Compact", caption: "One row: cover, title, transport, progress." },
  { id: "lyrics", label: "Lyrics", caption: "Lyrics that follow playback line by line." },
  { id: "marquee", label: "Marquee", caption: "A slim strip, the title runs through it. No transport." },
  { id: "vinyl", label: "Vinyl", caption: "A record in the card edge, spinning while it plays." },
] as const;

type AudioStyleId = (typeof AUDIO_STYLES)[number]["id"];

const PAGE_SAMPLES = [
  {
    handle: "trackdown",
    name: "trackdown",
    bio: ["owner @ tourn.lol", "discord.gg/tourn"],
    location: "trust in god",
    gradient: "linear-gradient(150deg, #0b2540 0%, #123a52 44%, #08111c 100%)",
  },
  {
    handle: "eivoran",
    name: "EIVORAN",
    bio: ["graphic designer · esports", "portfolio below"],
    location: "oslo",
    gradient: "linear-gradient(150deg, #3a1730 0%, #2a2140 46%, #0d0a14 100%)",
  },
  {
    handle: "monty",
    name: "monty",
    bio: ["notes, photos and playlists", "hi :)"],
    location: "london",
    gradient: "linear-gradient(150deg, #0d2c28 0%, #1d3b2f 42%, #07120f 100%)",
  },
];

const CHIPS = [
  "trackdown",
  "koni",
  "monty",
  "eivoran",
  "psyduck",
  "m0nty",
  "aimlarps",
  "tourn",
  "nina",
  "vee",
  "solace",
  "riven",
  "eight",
  "ash",
  "luca",
  "nova",
  "kira",
  "max",
  "juno",
  "rei",
  "sage",
  "zayn",
  "wren",
  "finn",
];

/* ------------------------------------------------------------------- hero */

export function Hero({
  signedIn,
  onPrimary,
  onPremium,
}: {
  signedIn: boolean;
  onPrimary: () => void;
  onPremium: () => void;
}) {
  return (
    <section className="hm-hero" id="top">
      <div className="hm-hero-glow" aria-hidden="true" />
      <div className="hm-hero-bolts" aria-hidden="true" />
      <div className="hm-wrap hm-hero-grid">
        <div className="hm-hero-copy">
          <h1 className="hm-hero-title">
            tourn<span>.</span>lol
          </h1>
          <p className="hm-hero-sub">
            The all-in-one biolink platform for creators, influencers &amp; professionals.
            Customize everything, track analytics, and grow your audience.
          </p>
          <div className="hm-hero-actions">
            <button type="button" className="hm-btn hm-btn--blue" onClick={onPrimary}>
              {signedIn ? "Open your dashboard" : "Create account"}
            </button>
            <button type="button" className="hm-btn hm-btn--dark" onClick={onPremium}>
              <span className="hm-btn-tag" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20.6 12.4 12.4 20.6a2 2 0 0 1-2.8 0l-6.2-6.2a2 2 0 0 1-.6-1.4V4.6c0-1.1.9-2 2-2h8.4c.5 0 1 .2 1.4.6l6.2 6.2a2 2 0 0 1 0 3Z" />
                  <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
                </svg>
              </span>
              View pricing
            </button>
          </div>
        </div>
        <div className="hm-hero-card">
          <ProfileCard />
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- widgets */

export function BentoSection({
  signedIn,
  onOpenWidgets,
}: {
  signedIn: boolean;
  onOpenWidgets: () => void;
}) {
  return (
    <section className="hm-section" id="widgets">
      <div className="hm-wrap">
        <div className="hm-sec-head">
          <span className="hm-label">Widgets</span>
        </div>
        <div className="hm-widgets-grid">
          <div className="hm-widgets-copy">
            <h2 className="hm-title">
              Your profile, <span>live.</span>
            </h2>
            <p className="hm-sub">
              Discord status, what is playing, game stats. Connect once, the widgets keep
              themselves current after that.
            </p>
            <div className="hm-platforms" aria-label="Supported platforms">
              {PLATFORM_STRIP.map((id) => (
                <span key={id} className="hm-platform" title={WIDGET_PLATFORM_BY_ID.get(id)?.name ?? id}>
                  <WidgetPlatformIcon id={id} size={19} />
                </span>
              ))}
            </div>
            <p className="hm-caption">15 platforms</p>
            <button type="button" className="hm-btn hm-btn--blue hm-btn--sm" onClick={onOpenWidgets}>
              {signedIn ? "Manage your widgets" : "Build your profile"}
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="hm-widget-stack">
            {HOME_WIDGETS.map((widget) => (
              <div className="hm-widget-item" key={widget.id}>
                <WidgetCard widget={widget} design={HOME_WIDGET_DESIGN} tilt={9} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- audio */

function Equalizer() {
  return (
    <span className="hm-eq" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function AudioPreview({ style }: { style: AudioStyleId }) {
  const track = FEATURED_TRACK;
  const spotifyHref = `https://open.spotify.com/track/${track.id}`;

  if (style === "marquee") {
    return (
      <div className="hm-audio-marquee">
        <span className="hm-audio-play" aria-hidden="true">
          <PlayIcon size={11} />
        </span>
        <span className="hm-audio-marquee-track">
          <span>
            {track.artist} · {track.title} · {track.artist} · {track.title}
          </span>
        </span>
        <span className="hm-audio-volume" aria-hidden="true">
          <VolumeIcon size={15} />
        </span>
      </div>
    );
  }

  if (style === "vinyl") {
    return (
      <div className="hm-audio-vinyl">
        <span className="hm-vinyl" aria-hidden="true">
          <img src={track.art} alt="" />
        </span>
        <div className="hm-audio-vinyl-copy">
          <div className="hm-audio-vinyl-head">
            <div>
              <b>{track.title}</b>
              <small>{track.artist}</small>
            </div>
            <span className="hm-audio-controls" aria-hidden="true">
              <SkipBackIcon size={12} />
              <span className="hm-audio-pause">
                <PauseIcon size={10} />
              </span>
              <SkipForwardIcon size={12} />
            </span>
          </div>
          <em>I am sweeter than any valentine rose</em>
          <span className="hm-audio-bar">
            <i style={{ width: "36%" }} />
          </span>
        </div>
      </div>
    );
  }

  if (style === "lyrics") {
    return (
      <div className="hm-audio-lyrics">
        <span className="hm-audio-lyrics-bg" aria-hidden="true" />
        <div className="hm-audio-lyrics-inner">
          <div className="hm-audio-lyrics-head">
            <img src={track.art} alt="" />
            <div>
              <b>{track.title}</b>
              <small>{track.artist}</small>
            </div>
            <span className="hm-audio-time">1:18 / 6:56</span>
          </div>
          <span className="hm-audio-bar">
            <i style={{ width: "19%" }} />
          </span>
          <div className="hm-audio-lyric-lines">
            <p className="is-dim">She said, early tomorrow, I will call for you</p>
            <p className="is-current">I am sweeter than any valentine rose</p>
            <p className="is-dim">I said, no my dear, I won't wait for you</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hm-audio-compact">
      <a
        className="hm-audio-cover"
        href={spotifyHref}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${track.title} on Spotify`}
      >
        <img src={track.art} alt="" />
      </a>
      <div className="hm-audio-copy">
        <div className="hm-audio-title">
          <Equalizer />
          <b>{track.title}</b>
        </div>
        <small>
          {track.artist} · {track.album}
        </small>
        <span className="hm-audio-bar">
          <i style={{ width: "41%" }} />
        </span>
        <span className="hm-audio-times">
          <span>1:18</span>
          <span>6:56</span>
        </span>
      </div>
      <div className="hm-audio-transport" aria-hidden="true">
        <VolumeIcon size={14} />
        <SkipBackIcon size={13} />
        <span className="hm-audio-pause">
          <PauseIcon size={11} />
        </span>
        <SkipForwardIcon size={13} />
      </div>
    </div>
  );
}

export function AudioSection() {
  const [style, setStyle] = useState<AudioStyleId>("compact");
  const active = AUDIO_STYLES.find((entry) => entry.id === style) ?? AUDIO_STYLES[0];

  return (
    <section className="hm-section" id="audio">
      <div className="hm-wrap">
        <div className="hm-sec-head hm-sec-head--center">
          <span className="hm-label">Audio player</span>
          <h2 className="hm-title">Music on your profile.</h2>
          <p className="hm-sub">
            Upload a track, pick a style, done. Two of the four styles show lyrics as well.
          </p>
        </div>

        <div className="hm-audio-stage">
          <div className="hm-segmented" role="tablist" aria-label="Player style">
            {AUDIO_STYLES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={style === entry.id}
                className={`hm-seg${style === entry.id ? " is-active" : ""}`}
                onClick={() => setStyle(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <p className="hm-audio-caption">{active.caption}</p>
          <div className={`hm-audio-frame hm-audio-frame--${style}`} key={style}>
            <AudioPreview style={style} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- badges */

export function BadgesSection() {
  const badges = BADGE_CATALOGUE.slice(0, 33);
  return (
    <section className="hm-section" id="badges">
      <div className="hm-wrap">
        <div className="hm-sec-head">
          <span className="hm-label">Badges</span>
          <h2 className="hm-title hm-title--left">
            {badges.length} badges total, {Math.max(0, badges.length - 4)} of them earnable.
          </h2>
          <p className="hm-sub hm-sub--left">4 are staff-only. Hover one to see how it unlocks.</p>
        </div>

        <div className="hm-badge-grid">
          {badges.map((badge, index) => (
            <Tooltip
              key={badge.id}
              text={`${badge.name} - unlockable`}
              style="default"
              animation="slide"
            >
              <span
                className={`hm-badge${index < 4 ? " is-staff" : ""}`}
                style={{ "--hm-badge": badge.color } as CSSProperties}
                data-reveal
                data-reveal-delay={index * 32}
              >
                <img src={badge.art} alt={badge.name} loading="lazy" decoding="async" />
              </span>
            </Tooltip>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- profile pages */

export function PagesSection() {
  const [index, setIndex] = useState(0);
  const sample = PAGE_SAMPLES[index];
  const thumbs = PAGE_SAMPLES.filter((_, i) => i !== index).slice(0, 2);

  return (
    <section className="hm-section" id="pages">
      <div className="hm-wrap hm-pages-wrap">
        <div className="hm-sec-head">
          <span className="hm-label">Profile Pages</span>
          <h2 className="hm-title">Three looks. One editor.</h2>
          <p className="hm-sub">
            Switch between live profile previews and see how different a tourn.lol page can feel.
          </p>
        </div>

        <div className="hm-pages-grid">
          <div className="hm-page-preview" style={{ "--hm-page-bg": sample.gradient } as CSSProperties}>
            <span className="hm-page-location">{sample.location}</span>
            <div className="hm-page-card">
              <span className="hm-page-avatar">{sample.name.slice(0, 1).toUpperCase()}</span>
              <b>{sample.name}</b>
              <small>@{sample.handle}</small>
              <em>
                {sample.bio.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </em>
              <span className="hm-page-links" aria-hidden="true">
                <i>
                  <DiscordIcon size={12} />
                </i>
                <i>
                  <SpotifyIcon size={12} />
                </i>
                <i>
                  <ExternalIcon size={12} />
                </i>
              </span>
              <span className="hm-page-counts" aria-hidden="true">
                128 · 4
              </span>
            </div>
            <span className="hm-page-caption">
              @{sample.handle} · Joined 187 years ago
            </span>
          </div>

          <div className="hm-page-thumbs">
            {thumbs.map((thumb) => (
              <button
                key={thumb.handle}
                type="button"
                className="hm-page-thumb"
                style={{ "--hm-page-bg": thumb.gradient } as CSSProperties}
                onClick={() => setIndex(PAGE_SAMPLES.findIndex((entry) => entry.handle === thumb.handle))}
              >
                <span className="hm-page-thumb-handle">@{thumb.handle}</span>
                <b>{thumb.name}</b>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- numbers */

function useCountUp(target: number | null, duration = 1600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === null) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return target === null ? "—" : formatCompactNumber(value);
}

function StatValue({ value }: { value: number | null }) {
  const shown = useCountUp(value);
  return <>{shown}</>;
}

export function StatsBand({
  stats,
  onClaim,
}: {
  stats: SiteStats;
  onClaim?: () => void;
}) {
  return (
    <section className="hm-section" id="community">
      <div className="hm-wrap">
        <div className="hm-sec-head hm-sec-head--center">
          <span className="hm-label">Community</span>
          <h2 className="hm-title">The numbers so far</h2>
          <p className="hm-sub">A quick look at how the platform is being used.</p>
        </div>

        <div className="hm-bento">
          <article className="hm-stat hm-stat--tall">
            <span className="hm-stat-icon">
              <UsersIcon size={16} />
            </span>
            <div>
              <b>
                <StatValue value={stats.users} />
              </b>
              <span>Registered Users</span>
            </div>
            <UsersIcon size={190} className="hm-stat-mark" />
          </article>

          <article className="hm-stat">
            <span className="hm-stat-icon">
              <CheckIcon size={16} />
            </span>
            <div>
              <b>
                <StatValue value={stats.views} />
              </b>
              <span>Profile Views</span>
            </div>
            <ArrowUpRight size={180} className="hm-stat-mark" />
          </article>

          <article className="hm-stat">
            <span className="hm-stat-icon">
              <DiscIcon size={16} />
            </span>
            <div>
              <b>15</b>
              <span>Widget Platforms</span>
            </div>
            <DiscIcon size={180} className="hm-stat-mark" />
          </article>

          <article className="hm-stat hm-stat--narrow">
            <span className="hm-stat-icon">
              <BoltIcon size={16} />
            </span>
            <div>
              <b>{BADGE_CATALOGUE.length}</b>
              <span>Badges</span>
            </div>
            <BoltIcon size={150} className="hm-stat-mark" />
          </article>

          <article className="hm-stat hm-stat--cta">
            <p>
              Already <b>{stats.users === null ? "630" : formatCompactNumber(stats.users)}</b> people have a
              tourn.lol profile.
            </p>
            <form
              className="hm-claim"
              onSubmit={(event) => {
                event.preventDefault();
                onClaim?.();
              }}
            >
              <label className="hm-claim-field">
                <span>tourn.lol/</span>
                <input type="text" name="username" placeholder="username" aria-label="Username" />
              </label>
              <button type="submit" className="hm-btn hm-btn--blue hm-btn--sm">
                Claim Your Username
              </button>
            </form>
          </article>
        </div>

        <div className="hm-chip-rows" aria-hidden="true">
          {[0, 1, 2].map((row) => {
            const slice = CHIPS.slice(row * 8, row * 8 + 8);
            const doubled = [...slice, ...slice, ...slice];
            return (
              <div className={`hm-chip-row hm-chip-row--${row}`} key={row}>
                {doubled.map((handle, i) => (
                  <span className="hm-chip" key={`${handle}-${i}`}>
                    <i />
                    <small>@{handle}</small>
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- faq */

const FAQS = [
  {
    q: "How do I create my biolink page?",
    a: "Register an account, choose your username, and start customizing your links, content, and design. Takes a few minutes.",
  },
  {
    q: "Can I fully customize my design?",
    a: "Yes. Backgrounds, fonts, card shape, badges, widgets and the audio player all have their own settings in the dashboard.",
  },
  {
    q: "How many links can I add?",
    a: "There is no hard cap on your icon row — add every platform you use and drag them into the order you want.",
  },
  {
    q: "Is tourn.lol free to use?",
    a: "The core page is free. Premium adds extra storage, custom badges and a few cosmetic extras.",
  },
  {
    q: "Can I see analytics for my links?",
    a: "Yes. Profile views are tracked per day, with sources and devices broken out on the analytics page.",
  },
  {
    q: "Does it work on mobile devices?",
    a: "Every layout is responsive, and the editor works on a phone as well as on a desktop.",
  },
];

function FaqItem({ q, a, delay }: { q: string; a: string; delay: number }) {
  const details = useRef<HTMLDetailsElement>(null);
  const body = useRef<HTMLDivElement>(null);

  const onSummaryClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    const panel = details.current;
    const content = body.current;
    if (!panel || !content) return;

    content.getAnimations().forEach((animation) => animation.cancel());
    content.style.overflow = "hidden";

    if (panel.open) {
      const height = content.getBoundingClientRect().height;
      const animation = content.animate(
        [
          { height: `${height}px`, opacity: 1 },
          { height: "0px", opacity: 0 },
        ],
        { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
      animation.onfinish = () => {
        panel.open = false;
        content.style.overflow = "";
      };
    } else {
      panel.open = true;
      const height = content.getBoundingClientRect().height;
      const animation = content.animate(
        [
          { height: "0px", opacity: 0 },
          { height: `${height}px`, opacity: 1 },
        ],
        { duration: 280, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
      animation.onfinish = () => {
        content.style.overflow = "";
      };
    }
  };

  return (
    <details className="hm-faq-item" ref={details} data-reveal data-reveal-delay={delay}>
      <summary onClick={onSummaryClick}>
        <span className="hm-faq-q">{q}</span>
        <span className="hm-faq-chevron" aria-hidden="true">
          <ChevronIcon size={15} />
        </span>
      </summary>
      <div className="hm-faq-body" ref={body}>
        <p>{a}</p>
      </div>
    </details>
  );
}

export function FaqSection() {
  return (
    <section className="hm-section" id="faq">
      <div className="hm-wrap hm-faq-wrap">
        <div className="hm-sec-head hm-sec-head--center">
          <span className="hm-label">FAQ</span>
          <h2 className="hm-title">Frequently Asked Questions</h2>
          <p className="hm-sub">The most common questions about tourn.lol.</p>
        </div>
        <div className="hm-faq-list">
          {FAQS.map((item, index) => (
            <FaqItem q={item.q} a={item.a} key={item.q} delay={index * 40} />
          ))}
        </div>
        <div className="hm-faq-foot">
          <p>Anything not covered here is in the help center.</p>
          <a className="hm-btn hm-btn--blue hm-btn--sm" href="mailto:hello@tourn.lol">
            <span className="hm-help-mark" aria-hidden="true">
              ?
            </span>
            Visit Help Center
          </a>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- cta */

export function CtaBanner({ onClaim }: { onClaim: () => void }) {
  return (
    <section className="hm-section hm-section--cta">
      <div className="hm-wrap">
        <div className="hm-cta">
          <div className="hm-cta-bolts" aria-hidden="true" />
          <h2>Everything you need, right here.</h2>
          <p>Create your profile, connect your links, and keep your audience in one clean place.</p>
          <form
            className="hm-claim hm-claim--cta"
            onSubmit={(event) => {
              event.preventDefault();
              onClaim();
            }}
          >
            <label className="hm-claim-field">
              <span>tourn.lol/</span>
              <input type="text" name="username" placeholder="username" aria-label="Username" />
            </label>
            <button type="submit" className="hm-btn hm-btn--claim">
              Claim link
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- footer */

export function Footer({
  onSignIn,
  onSignUp,
  onFaq,
}: {
  onSignIn: () => void;
  onSignUp: () => void;
  onFaq: () => void;
}) {
  return (
    <footer className="hm-footer">
      <div className="hm-wrap">
        <div className="hm-footer-top">
          <div className="hm-footer-brand">
            <a className="hm-footer-logo" href="#/">
              tourn<span>.</span>lol
            </a>
            <p>
              The modern solution for your personal biolink website. Simple, fast, and fully
              customizable.
            </p>
            <button type="button" className="hm-lang">
              <span aria-hidden="true">🇬🇧</span>
              English
              <ChevronIcon size={12} />
            </button>
          </div>

          <div className="hm-footer-col">
            <h4>Informal</h4>
            <a href="#/premium">Pricing</a>
            <a href="#/leaderboard">Leaderboard</a>
            <a href="#/shop">Marketplace</a>
          </div>

          <div className="hm-footer-col">
            <h4>Resources</h4>
            <button type="button" className="hm-footer-link" onClick={onFaq}>
              Help Center
            </button>
            <button type="button" className="hm-footer-link" onClick={onSignUp}>
              Redeem Code
            </button>
            <button type="button" className="hm-footer-link" onClick={onSignIn}>
              Sign in
            </button>
          </div>

          <div className="hm-footer-community">
            <h4>Join our community</h4>
            <p>Connect with other creators, and stay updated with the latest features.</p>
            <a className="hm-footer-discord" href="https://discord.gg/a9uwptuepD" target="_blank" rel="noreferrer">
              <DiscordIcon size={14} />
              Discord Server
            </a>
          </div>
        </div>

        <div className="hm-footer-bottom">
          <span>© 2026 tourn.lol. All rights reserved.</span>
          <div>
            <a href="#/legal">Terms</a>
            <a href="#/legal">Privacy</a>
            <a href="#/legal">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
