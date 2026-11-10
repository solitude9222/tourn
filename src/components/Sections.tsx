import { useRef } from "react";
import type { LanyardData } from "../lib/api";
import type { Polled } from "../lib/hooks";
import type { Settings } from "../config";
import type { WidgetStore } from "../lib/widgets";
import type { SiteStats } from "../lib/siteStats";
import { formatCompactNumber } from "../lib/format";
import { Bento } from "./Bento";
import { ProfileCard } from "./ProfileCard";
import {
  ArrowRight,
  CheckIcon,
  ChevronIcon,
  DiscordIcon,
  SpotifyIcon,
  SteamIcon,
} from "./Icons";

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
    <section className="hero" id="top">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <h1 className="hero-title">
            tourn<span className="accent">.</span>lol
          </h1>
          <p className="hero-sub">
            One short link for everything you play. Your bio, live widgets and every platform you
            use — on a page that stays current instead of going stale.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={onPrimary}>
              {signedIn ? "Open your dashboard" : "Claim your link"}
              <ArrowRight size={15} />
            </button>
            <button type="button" className="btn btn-ghost" onClick={onPremium}>
              Buy premium
            </button>
          </div>
          <div className="hero-meta">
            <span>
              <CheckIcon size={13} /> Free while in beta
            </span>
            <span>
              <CheckIcon size={13} /> Email or Discord sign-in
            </span>
          </div>
        </div>
        <div className="hero-card-slot">
          <ProfileCard />
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- stats band */

export function StatsBand({ stats }: { stats: SiteStats }) {
  if (stats.users === null && stats.views === null) return null;

  return (
    <section className="stats-band" aria-label="tourn.lol, in numbers">
      <div className="wrap stats-band-row" data-reveal>
        <div className="stats-band-item">
          <b className="stats-band-value">
            {stats.users === null ? "—" : formatCompactNumber(stats.users)}
          </b>
          <span className="stats-band-label">
            <span className="stats-band-dot" aria-hidden="true" />
            {stats.users === 1 ? "creator signed up" : "creators signed up"}
          </span>
        </div>
        <div className="stats-band-item">
          <b className="stats-band-value">
            {stats.views === null ? "—" : formatCompactNumber(stats.views)}
          </b>
          <span className="stats-band-label">
            <span className="stats-band-dot" aria-hidden="true" />
            {stats.views === 1 ? "profile view" : "profile views"}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- bento bio */

export function BentoSection({
  lanyard,
  settings,
  signedIn,
  widgets,
  onConfigure,
  onOpenWidgets,
}: {
  lanyard: Polled<LanyardData>;
  settings: Settings;
  signedIn: boolean;
  widgets: WidgetStore;
  onConfigure: () => void;
  onOpenWidgets: () => void;
}) {
  return (
    <section className="section" id="example">
      <div className="wrap">
        <div className="bento-feature">
          <div className="bento-copy" data-reveal>
            <span className="eyebrow eyebrow--sm">widgets</span>
            <h2 className="section-title">
              Your profile, <span className="accent">live.</span>
            </h2>
            <p className="section-sub">
              Who you are, where you hang out, what's playing, what you're grinding. Widgets,
              connected once, current forever.
            </p>
            <div className="bento-actions">
              <button type="button" className="btn btn-primary" onClick={onOpenWidgets}>
                {signedIn ? "Open your dashboard" : "Start your stack"}
              </button>
            </div>
            <p className="bento-foot">
              {signedIn
                ? "This is the example stack — your own widgets live on your public page."
                : "This is an example stack. Build your own in the dashboard."}
            </p>
          </div>

          {/* The home page ALWAYS shows the default example stack — your own
              widgets live on your public page and in the dashboard preview. */}
          <div className="bento-stage">
            <Bento lanyard={lanyard} settings={settings} onConfigure={onConfigure} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- faq */

const FAQS = [
  {
    q: "What exactly is tourn.lol?",
    a: "A bio link. You claim one handle — tourn.lol/yourname — and that page holds everything you want people to see. One URL for Discord bios, X, Twitch panels and tournament sign-ups.",
  },
  {
    q: "What actually shows on my bio?",
    a: "Your avatar, handle, bio and the widget stack you build. Discord, Roblox, Spotify, Steam and more are available — you choose what appears, in what order.",
  },
  {
    q: "How do the widget cards fill in?",
    a: "Each platform has its own options. Discord presence and Spotify can come from Lanyard, a public presence bridge; server and game profiles are read from their public pages. Widgets you have not configured stay quiet instead of inventing data.",
  },
  {
    q: "What about Steam?",
    a: "Steam is its own live card now: avatar, persona, online state and member date. Development reads Steam's public XML through a same-origin proxy; a static host falls back to the profile's public metadata, so there is no API key to manage.",
  },
  {
    q: "Do you send a verification email?",
    a: "Accounts are created with Discord, so there is nothing to verify at sign-up. If you add an email + password later (Settings - Security), the backend checks it is unique and it becomes a second way to sign in.",
  },
  {
    q: "Can I just use Discord to sign in?",
    a: "That's the second option. Discord OAuth asks for the minimum scope (identify), then creates the same profile you'd get from email. Either way you end up with one handle.",
  },
  {
    q: "Can other people see my IDs?",
    a: "Only the public profile is visible to visitors. Your Discord user ID and invite stay in your browser's local storage and are only used to fetch the data the cards show.",
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
    <details className="faq-item" ref={details} data-reveal data-reveal-delay={delay}>
      <summary onClick={onSummaryClick}>
        <span className="faq-q">{q}</span>
        <span className="faq-chevron" aria-hidden="true">
          <ChevronIcon size={16} />
        </span>
      </summary>
      <div className="faq-body" ref={body}>
        <p>{a}</p>
      </div>
    </details>
  );
}

export function FaqSection() {
  return (
    <section className="section section--tight" id="faq">
      <div className="wrap faq-wrap">
        <div className="section-head section-head--center" data-reveal>
          <span className="eyebrow eyebrow--sm">faq</span>
          <h2 className="section-title">Questions, answered.</h2>
          <p className="section-sub">
            Short version: one link, your bio and a live widget stack. No clutter. The long version
            is here.
          </p>
        </div>
        <div className="faq-list">
          {FAQS.map((item, index) => (
            <FaqItem q={item.q} a={item.a} key={item.q} delay={index * 45} />
          ))}
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
    <footer className="footer" data-reveal>
      <div className="wrap footer-inner">
        <div className="footer-brand">
          <a className="brand" href="#/">
            <img className="brand-logo" src="/logo.png" alt="" width={30} height={30} />
            <span className="brand-text">
              tourn<span className="brand-dot">.</span>lol
            </span>
          </a>
          <p>One link for everything you grind for.</p>
          <div className="footer-badges">
            <span>
              <DiscordIcon size={13} />
            </span>
            <span>
              <SpotifyIcon size={13} />
            </span>
            <span>
              <SteamIcon size={13} />
            </span>
          </div>
        </div>
        <div className="footer-cols">
          <div>
            <h4>Product</h4>
            <a href="#/">Home</a>
            <a href="#/premium">Premium</a>
            <a href="#/legal">Legal</a>
            <a href="#/leaderboard">Leaderboard</a>
          </div>
          <div>
            <h4>Account</h4>
            <button type="button" className="footer-link" onClick={onSignUp}>
              Create account
            </button>
            <button type="button" className="footer-link" onClick={onSignIn}>
              Sign in
            </button>
            <button type="button" className="footer-link" onClick={onFaq}>
              FAQ
            </button>
          </div>
          <div>
            <h4>Contact</h4>
            <a href="mailto:hello@tourn.lol">hello@tourn.lol</a>
            <a href="mailto:legal@tourn.lol">legal@tourn.lol</a>
            <a href="#/legal">Terms &amp; privacy</a>
          </div>
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© 2026 tourn.lol</span>
        <span>Bio links for people who play.</span>
      </div>
    </footer>
  );
}
