import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import { DEFAULT_PROFILE_ASSETS } from "../lib/profileAssets";
import {
  initialCommunityPeople,
  loadCommunityPeople,
  type CommunityPerson,
} from "../lib/homePeople";
import { AudioPlayer } from "./AudioPlayer";
import { Tooltip } from "./Tooltip";
import { WidgetPlatformIcon } from "./WidgetPlatformIcon";
import {
  ArrowRight,
  ChevronIcon,
  DiscordIcon,
  ExternalIcon,
  SpotifyIcon,
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
  { id: "marquee", label: "Marquee", caption: "A slim strip, the title runs through it." },
  { id: "vinyl", label: "Vinyl", caption: "A record in the card edge, spinning while it plays." },
] as const;

type AudioStyleId = (typeof AUDIO_STYLES)[number]["id"];

const PAGE_GRADIENTS = [
  "linear-gradient(150deg, #0b2540 0%, #123a52 44%, #08111c 100%)",
  "linear-gradient(150deg, #3a1730 0%, #2a2140 46%, #0d0a14 100%)",
  "linear-gradient(150deg, #0d2c28 0%, #1d3b2f 42%, #07120f 100%)",
];

/** Real members, bundled snapshot first, then the live leaderboard. */
function useCommunityPeople() {
  const [people, setPeople] = useState<CommunityPerson[]>(() => initialCommunityPeople());
  useEffect(() => {
    let active = true;
    void loadCommunityPeople().then((next) => {
      if (active && next.length) setPeople(next);
    });
    return () => {
      active = false;
    };
  }, []);
  return people;
}

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

export function AudioSection() {
  const [style, setStyle] = useState<AudioStyleId>("compact");
  const segmentedRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const active = AUDIO_STYLES.find((entry) => entry.id === style) ?? AUDIO_STYLES[0];

  // The chooser's highlight is a single sliding pill that glides to the tab in
  // use, rather than a square painted onto whichever label is active.
  useLayoutEffect(() => {
    const wrap = segmentedRef.current;
    if (!wrap) return;
    const measure = () => {
      const button = wrap.querySelector<HTMLButtonElement>(".hm-seg.is-active");
      if (!button) return;
      setIndicator({ left: button.offsetLeft, width: button.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [style]);

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
          <div className="hm-segmented" role="tablist" aria-label="Player style" ref={segmentedRef}>
            <span
              className="hm-seg-glow"
              aria-hidden="true"
              style={{
                width: indicator.width,
                transform: `translateX(${indicator.left}px)`,
                opacity: indicator.width ? 1 : 0,
              }}
            />
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
            <AudioPlayer
              settings={{
                ...DEFAULT_PROFILE_ASSETS.audio,
                // "Marquee" is the pill player's scrolling title strip.
                style: style === "marquee" ? "pill" : style,
                fileUrl: "/audio/preview.mp3",
                coverUrl: FEATURED_TRACK.art,
                title: FEATURED_TRACK.title,
                artist: FEATURED_TRACK.artist,
                volume: 0.35,
                autoplay: false,
                loop: true,
                autoLyrics: false,
                lyrics:
                  "[00:00.00]A quiet pad, fading in\n[00:07.00]Every note plays from your own upload\n[00:14.00]Lyrics follow the track line by line\n[00:21.00]Pick a style and it is live",
              }}
            />
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
  const people = useCommunityPeople().slice(0, 3);

  return (
    <section className="hm-section" id="pages">
      <div className="hm-wrap">
        <div className="hm-sec-head hm-sec-head--center">
          <span className="hm-label">Profile Pages</span>
          <h2 className="hm-title">Three looks. One editor.</h2>
          <p className="hm-sub">
            Real pages from the community — three different looks, all built in the same editor.
          </p>
        </div>

        <div className="hm-pages-grid">
          {people.map((person, index) => {
            const bio = person.bio
              ? person.bio.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 2)
              : [`tourn.lol/${person.handle}`];
            return (
              <a
                key={person.handle}
                className="hm-page-preview"
                href={`#/profile/${encodeURIComponent(person.handle)}`}
                style={{ "--hm-page-bg": PAGE_GRADIENTS[index % PAGE_GRADIENTS.length] } as CSSProperties}
              >
                <span className="hm-page-location">
                  {person.views === null ? "tourn.lol" : `${formatCompactNumber(person.views)} views`}
                </span>
                <span className="hm-page-card">
                  <span className="hm-page-avatar">
                    {person.avatar ? (
                      <img src={person.avatar} alt="" loading="lazy" decoding="async" />
                    ) : (
                      person.name.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <b>{person.name}</b>
                  <small>@{person.handle}</small>
                  <em>
                    {bio.map((line) => (
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
                </span>
                <span className="hm-page-caption">@{person.handle}</span>
              </a>
            );
          })}
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

type ChartPoint = { label: string; value: number };

/** Cumulative profile views across the most-viewed real creators. */
function viewsSeries(people: CommunityPerson[]): ChartPoint[] {
  let total = 0;
  return people
    .filter((person) => (person.views ?? 0) > 0)
    .sort((a, b) => (a.views ?? 0) - (b.views ?? 0))
    .slice(-8)
    .map((person) => {
      total += person.views ?? 0;
      return { label: `@${person.handle}`, value: total };
    });
}

/** Cumulative signups by the month the real accounts joined. */
function signupSeries(people: CommunityPerson[]): ChartPoint[] {
  const months = new Map<string, { date: Date; count: number }>();
  for (const person of people) {
    if (!person.joinedAt) continue;
    const joined = new Date(person.joinedAt);
    if (Number.isNaN(joined.getTime())) continue;
    const key = `${joined.getFullYear()}-${joined.getMonth()}`;
    const row = months.get(key);
    if (row) row.count += 1;
    else months.set(key, { date: new Date(joined.getFullYear(), joined.getMonth(), 1), count: 1 });
  }
  let total = 0;
  return [...months.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((row) => {
      total += row.count;
      return {
        label: row.date.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        value: total,
      };
    });
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 200;
const CHART_TOP = 16;
const CHART_BOTTOM = 24;

function TrendChart({ points, label }: { points: ChartPoint[]; label: string }) {
  const gradientId = useId();
  if (!points.length) {
    return <p className="hm-chart-empty">Nothing recorded yet — the first page starts the line.</p>;
  }

  const max = Math.max(...points.map((point) => point.value), 1);
  const usable = CHART_HEIGHT - CHART_TOP - CHART_BOTTOM;
  const step = points.length > 1 ? CHART_WIDTH / (points.length - 1) : CHART_WIDTH;
  const coords = points.map((point, index) => ({
    x: points.length > 1 ? index * step : CHART_WIDTH / 2,
    y: CHART_TOP + usable - (point.value / max) * usable,
  }));
  const line = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const area = `${line} L${CHART_WIDTH} ${CHART_HEIGHT - CHART_BOTTOM} L0 ${CHART_HEIGHT - CHART_BOTTOM} Z`;

  return (
    <div className="hm-chart">
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label={label}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5381f2" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#5381f2" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="#7d9bf5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="3.5" fill="#0b0b0d" stroke="#7d9bf5" strokeWidth="2" />
        ))}
      </svg>
      <div className="hm-chart-axis">
        <span>{points[0].label}</span>
        <span className="hm-chart-peak">{formatCompactNumber(points[points.length - 1].value)}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}

export function StatsBand({ stats }: { stats: SiteStats; onClaim?: () => void }) {
  const people = useCommunityPeople();
  const [metric, setMetric] = useState<"views" | "signups">("views");
  const chart = useMemo(
    () => (metric === "views" ? viewsSeries(people) : signupSeries(people)),
    [metric, people],
  );
  // Enough copies that a short list still fills the strip before it loops.
  const copies = people.length ? Math.max(2, Math.ceil(8 / people.length)) : 0;
  const base = copies ? Array.from({ length: copies }, () => people).flat() : [];
  const marquee = [...base, ...base];

  return (
    <section className="hm-section" id="community">
      <div className="hm-wrap">
        <div className="hm-sec-head hm-sec-head--center">
          <span className="hm-label">Community</span>
          <h2 className="hm-title">The numbers so far</h2>
          <p className="hm-sub">A quick look at how the platform is being used.</p>
        </div>

        <div className="hm-metrics" role="tablist" aria-label="Community metrics">
          <button
            type="button"
            role="tab"
            aria-selected={metric === "views"}
            className={`hm-metric${metric === "views" ? " is-active" : ""}`}
            onClick={() => setMetric("views")}
          >
            <b>
              <StatValue value={stats.views} />
            </b>
            <span>Profile views</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={metric === "signups"}
            className={`hm-metric${metric === "signups" ? " is-active" : ""}`}
            onClick={() => setMetric("signups")}
          >
            <b>
              <StatValue value={stats.users} />
            </b>
            <span>Registered users</span>
          </button>
          <div className="hm-metric">
            <b>15</b>
            <span>Widget platforms</span>
          </div>
          <div className="hm-metric">
            <b>{BADGE_CATALOGUE.length}</b>
            <span>Badges</span>
          </div>
        </div>

        <div className="hm-chart-panel">
          <div className="hm-chart-head">
            <span>{metric === "views" ? "Views by creator" : "Signups by month"}</span>
            <span>{people.length} creators</span>
          </div>
          <TrendChart
            points={chart}
            label={metric === "views" ? "Cumulative profile views" : "Cumulative signups"}
          />
        </div>

        <div className="hm-people" aria-hidden="true">
          {[0, 1].map((row) => (
            <div className={`hm-people-row hm-people-row--${row}`} key={row}>
              {marquee.map((person, index) => (
                <span className="hm-person" key={`${row}-${person.handle}-${index}`}>
                  <span className="hm-person-avatar">
                    {person.avatar ? (
                      <img src={person.avatar} alt="" loading="lazy" decoding="async" />
                    ) : (
                      person.name.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span className="hm-person-id">
                    <b>{person.name}</b>
                    <small>@{person.handle}</small>
                  </span>
                </span>
              ))}
            </div>
          ))}
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
          <div className="hm-cta-logo" aria-hidden="true" />
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
