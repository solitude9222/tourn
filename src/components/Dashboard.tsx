import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Account } from "../lib/auth";
import type { About } from "../lib/about";
import type { Settings } from "../config";
import { inviteCode } from "../config";
import type { WidgetStore } from "../lib/widgets";
import type { BadgeStore } from "../lib/badges";
import type { LinkStore } from "../lib/links";
import { fetchGuildInvite, type LanyardData } from "../lib/api";
import { STATUS_LABELS, usePolled, type Polled } from "../lib/hooks";
import { formatJoined } from "../lib/format";
import { getViewCount } from "../lib/views";
import { useReveal } from "../lib/useReveal";
import { DashboardAbout } from "./DashboardAbout";
import { DashboardAssets } from "./DashboardAssets";
import { DashboardWidgets } from "./DashboardWidgets";
import { DashboardLayout } from "./DashboardLayout";
import { DashboardSlideshow } from "./DashboardSlideshow";
import { DashboardEntry } from "./DashboardEntry";
import { DashboardBadges } from "./DashboardBadges";
import { DashboardLinks } from "./DashboardLinks";
import { DashboardLeaderboard } from "./DashboardLeaderboard";
import { SettingsPage } from "./SettingsPage";
import { AdminDashboard } from "./AdminDashboard";
import {
  ProfileCompletionChart,
  ServerReachChart,
  type ProfileDetail,
} from "./DashboardCharts";
import {
  ArrowRight,
  ArrowUpRight,
  BagIcon,
  BoltIcon,
  CalendarIcon,
  ChevronIcon,
  CheckIcon,
  CopyIcon,
  DiscordIcon,
  EditIcon,
  EyeIcon,
  GridIcon,
  HomeIcon,
  LayoutIcon,
  LinkIcon,
  LogoutIcon,
  SaveIcon,
  SettingsIcon,
  SignalIcon,
  ShieldIcon,
  SlidersIcon,
  ExpandIcon,
  SpotifyIcon,
  SteamIcon,
  TrophyIcon,
  UserIcon,
} from "./Icons";
import "../dashboard.css";

type DashPage =
  | "overview"
  | "about"
  | "assets"
  | "widgets"
  | "layout"
  | "slideshow"
  | "entry"
  | "badges"
  | "links"
  | "leaderboard"
  | "settings"
  | "admin";

type DashboardProps = {
  user: Account | null;
  about: About;
  lanyard: Polled<LanyardData>;
  settings: Settings;
  widgets: WidgetStore;
  badges: BadgeStore;
  profileLinks: LinkStore;
  isPremium: boolean;
  isAdmin: boolean;
  /** The session check is still in flight — show the shell, never the gate. */
  authLoading?: boolean;
  /** The session check failed (API unreachable), so "signed out" is unknown. */
  authUnavailable?: boolean;
  onRetryAuth?: () => void;
  /** Badge ids the backend has verified — only these can be equipped. */
  earned: string[];
  onSaveAbout: (about: About) => void;
  onSaveWidgets: (store: WidgetStore) => void;
  onSaveBadges: (store: BadgeStore) => void;
  onSaveLinks: (store: LinkStore) => void;
  /** Re-saves every dashboard store at once (top-bar Save button). */
  onSaveAll: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
};

type Signal = {
  label: string;
  value: string;
  detail: string;
  ok: boolean;
  icon: ReactNode;
};

type NavGroups = { profile: boolean; extra: boolean };

const NAV_GROUPS_KEY = "tourn.lol/dashboard/nav-groups/v1";

function loadNavGroups(): NavGroups {
  try {
    const raw = localStorage.getItem(NAV_GROUPS_KEY);
    if (!raw) return { profile: true, extra: true };
    const parsed = JSON.parse(raw) as Partial<NavGroups>;
    return { profile: parsed.profile !== false, extra: parsed.extra !== false };
  } catch {
    return { profile: true, extra: true };
  }
}

export function Dashboard({
  user,
  about,
  lanyard,
  settings,
  widgets,
  badges,
  profileLinks,
  isPremium,
  isAdmin,
  authLoading = false,
  authUnavailable = false,
  onRetryAuth,
  earned,
  onSaveAbout,
  onSaveWidgets,
  onSaveBadges,
  onSaveLinks,
  onSaveAll,
  onSignIn,
  onSignUp,
  onSignOut,
}: DashboardProps) {
  const [page, setPage] = useState<DashPage>(() =>
    isAdmin && window.location.hash.includes("/admin") ? "admin" : "overview",
  );
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const [groups, setGroups] = useState<NavGroups>(loadNavGroups);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [profileViews, setProfileViews] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const editRef = useRef<HTMLDivElement>(null);

  const toggleGroup = (group: "profile" | "extra") => {
    setGroups((current) => ({ ...current, [group]: !current[group] }));
  };

  useReveal([page, user?.id]);

  // Real view count for the quick-edit menu.
  useEffect(() => {
    if (!user) return;
    let active = true;
    void getViewCount(user.username).then((count) => {
      if (active) setProfileViews(count);
    });
    return () => {
      active = false;
    };
  }, [user?.username]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setMenuOpen(false);
  }, [page]);

  // `#/dashboard/admin` (the header's Admin link) opens the console in place.
  useEffect(() => {
    if (!isAdmin) return;
    const apply = () => {
      // `#/dashboard/admin` and the bare `/admin` path both open the console.
      if (
        window.location.hash.includes("/admin") ||
        /^\/admin\/?$/i.test(window.location.pathname)
      ) {
        setPage("admin");
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [isAdmin]);

  // `#/dashboard/settings` deep-links the settings page (the Discord link flow
  // returns there with a result in the query string).
  useEffect(() => {
    const apply = () => {
      if (window.location.hash.includes("/settings")) setPage("settings");
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(NAV_GROUPS_KEY, JSON.stringify(groups));
    } catch {
      /* private mode — collapse state still works for this session */
    }
  }, [groups]);

  useEffect(() => {
    if (!editOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!editRef.current?.contains(event.target as Node)) setEditOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [editOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuTriggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const serverCode = inviteCode(settings.discordInvite);
  const server = usePolled(
    Boolean(user && serverCode),
    serverCode,
    (signal) => fetchGuildInvite(serverCode, signal),
    60_000,
  );

  const cardsLinked = [
    settings.discordUserId,
    settings.discordInvite,
    settings.spotifyTrack,
    settings.steamUrl,
  ].filter(Boolean).length;

  const signals = useMemo<Signal[]>(() => {
    const spotifyLive = lanyard.data?.spotify;
    return [
      {
        label: "Discord presence",
        value: lanyard.data ? STATUS_LABELS[lanyard.data.discord_status] : "Waiting for Lanyard",
        detail: settings.discordUserId ? `User ${settings.discordUserId}` : "No Discord user id",
        ok: Boolean(lanyard.data),
        icon: <DiscordIcon size={15} />,
      },
      {
        label: "Server invite",
        value: server.data?.guild?.name ?? (settings.discordInvite ? "Resolving…" : "Not connected"),
        detail: server.data
          ? `${server.data.approximate_member_count ?? 0} members · ${server.data.approximate_presence_count ?? 0} online`
          : settings.discordInvite
            ? "Reading counts from Discord"
            : "Add a Discord widget",
        ok: Boolean(settings.discordInvite),
        icon: <LinkIcon size={15} />,
      },
      {
        label: "Spotify",
        value: spotifyLive?.song ?? (settings.spotifyTrack ? "Featured track ready" : "Not connected"),
        detail: spotifyLive
          ? `${spotifyLive.artist} · ${spotifyLive.album}`
          : settings.spotifyTrack
            ? "Shown when Discord is quiet"
            : "Pick a featured track",
        ok: Boolean(spotifyLive || settings.spotifyTrack),
        icon: <SpotifyIcon size={15} />,
      },
      {
        label: "Steam",
        value: settings.steamUrl ? "Profile linked" : "Not connected",
        detail: settings.steamUrl ? "Read from the public profile" : "Add a Steam profile URL",
        ok: Boolean(settings.steamUrl),
        icon: <SteamIcon size={15} />,
      },
    ];
  }, [lanyard.data, server.data, settings]);

  const copyLink = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  // The session cookie is still being checked: show the dashboard shell with a
  // quiet placeholder instead of the sign-up gate, which used to flash (and
  // stick, when the API was slow) on every reload of /dashboard.
  if (!user && authLoading) {
    return (
      <main className="dash dash--gate">
        <a className="dash-gate-brand" href="#/">
          <img src="/logo.png" alt="" width={30} height={30} />
          <span>
            tourn<span>.</span>lol
          </span>
        </a>
        <div className="dash-gate-card dash-gate-card--checking" aria-busy="true">
          <span className="dash-gate-icon" aria-hidden="true">
            <UserIcon size={22} />
          </span>
          <span className="eyebrow eyebrow--sm">dashboard</span>
          <h1>Checking your session…</h1>
          <p>One moment while tourn.lol confirms which account this browser is signed into.</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="dash dash--gate">
        <a className="dash-gate-brand" href="#/">
          <img src="/logo.png" alt="" width={30} height={30} />
          <span>
            tourn<span>.</span>lol
          </span>
        </a>
        {authUnavailable ? (
          <div className="dash-gate-card" data-reveal>
            <span className="dash-gate-icon" aria-hidden="true">
              <SignalIcon size={22} />
            </span>
            <span className="eyebrow eyebrow--sm">offline</span>
            <h1>Couldn't reach tourn.lol.</h1>
            <p>
              The account API didn't answer, so this could be a connection problem rather than a
              signed-out browser. Nothing has been signed out.
            </p>
            <div className="dash-gate-actions">
              {onRetryAuth ? (
                <button type="button" className="btn btn-primary" onClick={onRetryAuth}>
                  Try again
                </button>
              ) : null}
              <button type="button" className="btn btn-ghost" onClick={onSignIn}>
                Sign in instead
              </button>
            </div>
            <a className="dash-gate-back" href="#/">
              Back to the site
            </a>
          </div>
        ) : (
        <div className="dash-gate-card" data-reveal>
          <span className="dash-gate-icon" aria-hidden="true">
            <UserIcon size={22} />
          </span>
          <span className="eyebrow eyebrow--sm">dashboard</span>
          <h1>Your dashboard starts with a handle.</h1>
          <p>
            Sign in or create an account to manage your bio, connections and the four live cards
            visitors see.
          </p>
          <div className="dash-gate-actions">
            <button type="button" className="btn btn-primary" onClick={onSignUp}>
              Create your account
              <ArrowRight size={14} />
            </button>
            <button type="button" className="btn btn-ghost" onClick={onSignIn}>
              Sign in
            </button>
          </div>
          <a className="dash-gate-back" href="#/">
            Back to the site
          </a>
        </div>
        )}
      </main>
    );
  }

  const displayName = about.displayName.trim() || user.username;
  const handle = `tourn.lol/${user.username}`;
  const joined = formatJoined(new Date(user.joinedAt));
  const accountDays = Math.max(
    1,
    Math.floor((Date.now() - new Date(user.joinedAt).getTime()) / 86_400_000),
  );

  const profileDetails: ProfileDetail[] = [
    { label: "Handle", hint: `@${user.username}`, done: Boolean(user.username) },
    {
      label: "Display name",
      hint: about.displayName.trim() ? "Custom name set" : "Using your handle",
      done: Boolean(about.displayName.trim()),
    },
    {
      label: "Bio",
      hint: about.bio.trim() ? `${about.bio.trim().length} characters` : "Add a short bio",
      done: Boolean(about.bio.trim()),
    },
    {
      label: "Discord",
      hint: settings.discordUserId
        ? lanyard.data
          ? "Presence connected"
          : "Account linked"
        : "Not connected",
      done: Boolean(settings.discordUserId),
    },
    {
      label: "Server",
      hint: server.data?.guild?.name ?? (settings.discordInvite ? "Invite linked" : "No invite"),
      done: Boolean(settings.discordInvite),
    },
    {
      label: "Spotify",
      hint:
        lanyard.data?.spotify?.song ??
        (settings.spotifyTrack ? "Featured track ready" : "Not connected"),
      done: Boolean(settings.spotifyTrack),
    },
    {
      label: "Steam",
      hint: settings.steamUrl ? "Profile linked" : "Not connected",
      done: Boolean(settings.steamUrl),
    },
  ];
  const completed = profileDetails.filter((detail) => detail.done).length;
  const profileScore = Math.round((completed / profileDetails.length) * 100);
  const liveCards = [
    Boolean(lanyard.data),
    Boolean(settings.discordInvite),
    Boolean(lanyard.data?.spotify || settings.spotifyTrack),
    Boolean(settings.steamUrl),
  ].filter(Boolean).length;

  const serverMembers = server.data?.approximate_member_count ?? null;
  const serverOnline = server.data?.approximate_presence_count ?? null;

  const pageMeta = {
    overview: {
      title: "Welcome back",
      subtitle: "Here's how your profile and live data are doing.",
    },
    about: { title: "About me", subtitle: "The details visitors see on your bio card." },
    assets: { title: "Assets", subtitle: "Avatar, cursor, background, banner and the effects over them." },
    widgets: { title: "Widgets", subtitle: "Build the stack visitors see on your profile." },
    layout: { title: "Card/layout", subtitle: "Choose how your public page is laid out." },
    slideshow: { title: "Slideshow", subtitle: "Full-height sections and how they scroll." },
    entry: { title: "Entry screen", subtitle: "A short intro before visitors reach your profile." },
    badges: { title: "Badges", subtitle: "Equip badges and customise how they look on your card." },
    links: { title: "Links", subtitle: "Social links and buttons on your profile card." },
    leaderboard: { title: "Leaderboard", subtitle: "Every claimed handle, and where you sit on the board." },
    settings: { title: "Settings", subtitle: "Your claims, account security and plan." },
    admin: { title: "Admin", subtitle: "Members, invites, site settings and the Discord bot." },
  }[page];

  return (
    <div className="dash">
      <aside className="dash-rail">
        <a className="dash-brand" href="#/" aria-label="tourn.lol home">
          <img src="/logo.png" alt="" width={30} height={30} />
          <span>
            tourn<span>.</span>lol
          </span>
        </a>

        <div className="dash-rail-scroll">
          <nav className="dash-nav dash-nav--top" aria-label="Dashboard">
            <button
              type="button"
              className={`dash-nav-item${page === "overview" ? " is-active" : ""}`}
              onClick={() => setPage("overview")}
              aria-current={page === "overview" ? "page" : undefined}
            >
              <HomeIcon size={15} />
              Overview
              {page === "overview" ? <i className="dash-nav-dot" /> : null}
            </button>
          </nav>

          <section className={`dash-group${groups.profile ? "" : " is-collapsed"}`}>
            <button
              type="button"
              className="dash-group-head"
              onClick={() => toggleGroup("profile")}
              aria-expanded={groups.profile}
              aria-controls="dash-profile-nav"
            >
              <UserIcon size={13} />
              Profile
              <ChevronIcon size={13} className="dash-group-chevron" />
            </button>
            <nav
              className="dash-nav dash-group-body"
              id="dash-profile-nav"
              aria-label="Profile"
              aria-hidden={!groups.profile}
            >
              <button
                type="button"
                className={`dash-nav-item${page === "about" ? " is-active" : ""}`}
                onClick={() => setPage("about")}
                aria-current={page === "about" ? "page" : undefined}
              >
                <UserIcon size={15} />
                About me
                {page === "about" ? <i className="dash-nav-dot" /> : null}
              </button>
              <button
                type="button"
                className={`dash-nav-item${page === "assets" ? " is-active" : ""}`}
                onClick={() => setPage("assets")}
                aria-current={page === "assets" ? "page" : undefined}
              >
                <BagIcon size={15} />
                Assets
                {page === "assets" ? <i className="dash-nav-dot" /> : null}
              </button>
              <button
                type="button"
                className={`dash-nav-item${page === "widgets" ? " is-active" : ""}`}
                onClick={() => setPage("widgets")}
                aria-current={page === "widgets" ? "page" : undefined}
              >
                <GridIcon size={15} />
                Widgets
                {page === "widgets" ? <i className="dash-nav-dot" /> : null}
              </button>
              <button
                type="button"
                className={`dash-nav-item${page === "links" ? " is-active" : ""}`}
                onClick={() => setPage("links")}
                aria-current={page === "links" ? "page" : undefined}
              >
                <LinkIcon size={15} />
                Links
                {page === "links" ? <i className="dash-nav-dot" /> : null}
              </button>
              <button
                type="button"
                className={`dash-nav-item${page === "layout" ? " is-active" : ""}`}
                onClick={() => setPage("layout")}
                aria-current={page === "layout" ? "page" : undefined}
              >
                <LayoutIcon size={15} />
                Card/layout
                {page === "layout" ? <i className="dash-nav-dot" /> : null}
              </button>
              <button
                type="button"
                className={`dash-nav-item${page === "badges" ? " is-active" : ""}`}
                onClick={() => setPage("badges")}
                aria-current={page === "badges" ? "page" : undefined}
              >
                <BoltIcon size={15} />
                Badges
                {page === "badges" ? <i className="dash-nav-dot" /> : null}
              </button>
            </nav>
          </section>

          <section className={`dash-group${groups.extra ? "" : " is-collapsed"}`}>
            <button
              type="button"
              className="dash-group-head"
              onClick={() => toggleGroup("extra")}
              aria-expanded={groups.extra}
              aria-controls="dash-extra-nav"
            >
              <GridIcon size={13} />
              Extra
              <ChevronIcon size={13} className="dash-group-chevron" />
            </button>
            <nav
              className="dash-nav dash-group-body"
              id="dash-extra-nav"
              aria-label="Extra"
              aria-hidden={!groups.extra}
            >
              <button type="button" className="dash-nav-item" disabled title="Coming soon">
                <CopyIcon size={15} />
                Templates
                <span className="dash-soon">Soon</span>
              </button>
              <button type="button" className="dash-nav-item" disabled title="Coming soon">
                <SignalIcon size={15} />
                Analytics
                <span className="dash-soon">Soon</span>
              </button>
              <button
                type="button"
                className={`dash-nav-item${page === "leaderboard" ? " is-active" : ""}`}
                onClick={() => setPage("leaderboard")}
                aria-current={page === "leaderboard" ? "page" : undefined}
              >
                <TrophyIcon size={15} />
                Leaderboard
                {page === "leaderboard" ? <i className="dash-nav-dot" /> : null}
              </button>
              {about.design.cardStyle === "slideshow" ? (
                <button
                  type="button"
                  className={`dash-nav-item${page === "slideshow" ? " is-active" : ""}`}
                  onClick={() => setPage("slideshow")}
                  aria-current={page === "slideshow" ? "page" : undefined}
                >
                  <SlidersIcon size={15} />
                  Slideshow
                  {page === "slideshow" ? <i className="dash-nav-dot" /> : null}
                </button>
              ) : null}
              <button
                type="button"
                className={`dash-nav-item${page === "entry" ? " is-active" : ""}`}
                onClick={() => setPage("entry")}
                aria-current={page === "entry" ? "page" : undefined}
              >
                <ExpandIcon size={15} />
                Entry screen
                {page === "entry" ? <i className="dash-nav-dot" /> : null}
              </button>
            </nav>
          </section>

          <div className="dash-rail-links">
            <button
              type="button"
              className={`dash-rail-link${page === "settings" ? " dash-rail-link--active" : ""}`}
              onClick={() => setPage("settings")}
              aria-current={page === "settings" ? "page" : undefined}
            >
              <SettingsIcon size={14} />
              Settings
            </button>
            {isAdmin ? (
              <button
                type="button"
                className={`dash-rail-link dash-rail-link--admin${page === "admin" ? " dash-rail-link--active" : ""}`}
                onClick={() => setPage("admin")}
                aria-current={page === "admin" ? "page" : undefined}
              >
                <ShieldIcon size={14} />
                Admin
              </button>
            ) : null}
            {isPremium ? (
              <span className="dash-rail-link dash-rail-link--active" aria-current="true">
                <BoltIcon size={14} />
                Premium active
                <CheckIcon size={12} />
              </span>
            ) : (
              <a className="dash-rail-link" href="#/premium">
                <BoltIcon size={14} />
                Premium
                <ArrowUpRight size={12} />
              </a>
            )}
          </div>
        </div>

        <div className="dash-rail-foot">
          <div className="dash-user" ref={menuRef}>
            {menuOpen ? (
              <div className="dash-user-pop" role="menu" aria-label="Account menu">
                <div className="dash-user-pop-head">
                  <span className="dash-user-avatar">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" />
                    ) : (
                      displayName.slice(0, 1).toUpperCase()
                    )}
                    <i className={lanyard.data ? "is-on" : ""} />
                  </span>
                  <span className="dash-user-pop-id">
                    <b>{displayName}</b>
                    <small>@{user.username}</small>
                  </span>
                  <span className="dash-user-plan">Beta</span>
                </div>

                <div className="dash-user-pop-sep" />

                <a
                  className="dash-user-pop-item"
                  href={`/${encodeURIComponent(user.username)}`}
                  role="menuitem"
                >
                  <EyeIcon size={14} />
                  View public bio
                  <ArrowUpRight size={11} className="dash-user-pop-end" />
                </a>
                <button
                  type="button"
                  className="dash-user-pop-item"
                  role="menuitem"
                  onClick={() => void copyLink(`https://tourn.lol/${user.username}`)}
                >
                  {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  {copied ? "Link copied" : "Copy profile link"}
                </button>
                <button
                  type="button"
                  className="dash-user-pop-item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setPage("settings");
                  }}
                >
                  <SettingsIcon size={14} />
                  Account settings
                </button>

                <div className="dash-user-pop-sep" />

                <button
                  type="button"
                  className="dash-user-pop-item is-danger"
                  role="menuitem"
                  onClick={onSignOut}
                >
                  <LogoutIcon size={14} />
                  Sign out
                </button>
              </div>
            ) : null}

            <div className="dash-share">
              <span className="dash-share-icon">
                <LinkIcon size={14} />
              </span>
              <span className="dash-share-text">
                <b>Share your profile</b>
                <small>tourn.lol/{user.username}</small>
              </span>
              <button
                type="button"
                className="dash-share-copy"
                onClick={() => void copyLink(`https://tourn.lol/${user.username}`)}
                aria-label="Copy profile link"
              >
                {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
              </button>
            </div>

            <button
              type="button"
              className="dash-user-row"
              ref={menuTriggerRef}
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="dash-user-avatar">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" />
                ) : (
                  displayName.slice(0, 1).toUpperCase()
                )}
                <i className={lanyard.data ? "is-on" : ""} />
              </span>
              <span className="dash-user-meta">
                <span>Signed in as</span>
                <b>{displayName}</b>
                <small>@{user.username}</small>
              </span>
              <ChevronIcon size={13} className="dash-user-chevron" />
            </button>
          </div>
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-top" data-reveal>
          <div>
            <h1>{pageMeta.title}</h1>
            <p>{pageMeta.subtitle}</p>
          </div>
          <div className="dash-top-actions">
            <div className="dash-edit" ref={editRef}>
              <button
                type="button"
                className={`btn btn-ghost btn-sm${editOpen ? " is-active" : ""}`}
                onClick={() => setEditOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={editOpen}
              >
                <EditIcon size={13} />
                Edit
              </button>

              {editOpen ? (
                <div className="dash-edit-menu" role="menu" aria-label="Quick edit">
                  <div className="dash-edit-head">
                    <span>
                      <b>{profileViews === null ? "—" : profileViews.toLocaleString("en-US")}</b>
                      profile views
                    </span>
                    <span>
                      <b>{badges.equipped.filter((badge) => badge.visible).length}</b>
                      badges shown
                    </span>
                  </div>
                  {[
                    { id: "about" as DashPage, label: "Edit name & bio", icon: <UserIcon size={13} /> },
                    { id: "badges" as DashPage, label: "Assign badges", icon: <BoltIcon size={13} /> },
                    { id: "links" as DashPage, label: "Edit links", icon: <LinkIcon size={13} /> },
                    { id: "widgets" as DashPage, label: "Widget stack", icon: <GridIcon size={13} /> },
                    { id: "layout" as DashPage, label: "Card & layout", icon: <LayoutIcon size={13} /> },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      className="dash-edit-item"
                      onClick={() => {
                        setEditOpen(false);
                        setPage(item.id);
                      }}
                    >
                      {item.icon}
                      {item.label}
                      <ChevronIcon size={11} className="dash-edit-end" />
                    </button>
                  ))}
                  <div className="dash-edit-sep" />
                  <a
                    className="dash-edit-item"
                    role="menuitem"
                    href={`/${encodeURIComponent(user.username)}`}
                  >
                    <EyeIcon size={13} />
                    View public page
                    <ArrowUpRight size={11} className="dash-edit-end" />
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    className="dash-edit-item"
                    onClick={() => void copyLink(`https://tourn.lol/${user.username}`)}
                  >
                    {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                    {copied ? "Link copied" : "Copy profile link"}
                  </button>
                </div>
              ) : null}
            </div>

            <a className="btn btn-ghost btn-sm" href={`/${encodeURIComponent(user.username)}`}>
              <EyeIcon size={13} />
              View bio
            </a>
            <button
              type="button"
              className={`btn btn-primary btn-sm dash-save${saveState === "saved" ? " is-saved" : ""}`}
              onClick={() => {
                onSaveAll();
                setSaveState("saved");
                window.setTimeout(() => setSaveState("idle"), 1800);
              }}
            >
              {saveState === "saved" ? <CheckIcon size={13} /> : <SaveIcon size={13} />}
              {saveState === "saved" ? "Saved" : "Save changes"}
            </button>
            <button
              type="button"
              className="dash-icon-btn dash-top-signout"
              onClick={onSignOut}
              aria-label="Sign out"
            >
              <LogoutIcon size={14} />
            </button>
          </div>
        </header>

        <div className="dash-page" key={page}>
        {page === "about" ? (
          <DashboardAbout user={user} about={about} widgets={widgets} onSave={onSaveAbout} />
        ) : page === "assets" ? (
          <DashboardAssets user={user} about={about} widgets={widgets} isPremium={isPremium} onChange={onSaveAbout} />
        ) : page === "widgets" ? (
          <DashboardWidgets user={user} store={widgets} onChange={onSaveWidgets} />
        ) : page === "layout" ? (
          <DashboardLayout user={user} about={about} widgets={widgets} onChange={onSaveAbout} />
        ) : page === "slideshow" ? (
          <DashboardSlideshow user={user} about={about} widgets={widgets} onChange={onSaveAbout} />
        ) : page === "entry" ? (
          <DashboardEntry user={user} about={about} widgets={widgets} onChange={onSaveAbout} />
        ) : page === "badges" ? (
          <DashboardBadges user={user} badges={badges} earned={earned} onChange={onSaveBadges} />
        ) : page === "admin" && isAdmin ? (
          <AdminDashboard embedded />
        ) : page === "links" ? (
          <DashboardLinks
            user={user}
            links={profileLinks}
            isPremium={isPremium}
            onChange={onSaveLinks}
          />
        ) : page === "leaderboard" ? (
          <DashboardLeaderboard />
        ) : page === "settings" ? (
          <SettingsPage onNavigate={(target) => setPage(target)} />
        ) : (
          <>
            <section className="dash-stats" aria-label="Account statistics">
              <article className="dash-stat" data-reveal data-reveal-delay="40">
                <div>
                  <span className="dash-stat-label">Profile strength</span>
                  <b className="dash-stat-value">{profileScore}%</b>
                  <small>
                    {completed} of {profileDetails.length} details complete
                  </small>
                </div>
                <span className="dash-stat-icon">
                  <SignalIcon size={16} />
                </span>
              </article>
              <article className="dash-stat" data-reveal data-reveal-delay="80">
                <div>
                  <span className="dash-stat-label">Server members</span>
                  <b className="dash-stat-value">
                    {serverMembers !== null ? serverMembers.toLocaleString() : "—"}
                  </b>
                  <small>
                    {serverOnline !== null
                      ? `${serverOnline.toLocaleString()} online now`
                      : settings.discordInvite
                        ? "Reading from Discord"
                        : "No server linked"}
                  </small>
                </div>
                <span className="dash-stat-icon">
                  <DiscordIcon size={16} />
                </span>
              </article>
              <article className="dash-stat" data-reveal data-reveal-delay="120">
                <div>
                  <span className="dash-stat-label">Live sources</span>
                  <b className="dash-stat-value">{cardsLinked}/4</b>
                  <small>{liveCards} cards reading live data</small>
                </div>
                <span className="dash-stat-icon">
                  <LinkIcon size={16} />
                </span>
              </article>
              <article className="dash-stat" data-reveal data-reveal-delay="160">
                <div>
                  <span className="dash-stat-label">Account age</span>
                  <b className="dash-stat-value">{accountDays.toLocaleString()}d</b>
                  <small>member since {joined}</small>
                </div>
                <span className="dash-stat-icon">
                  <CalendarIcon size={16} />
                </span>
              </article>
            </section>

            <section className="dash-panel dash-links-strip" data-reveal data-reveal-delay="60" aria-label="Your links">
              <div className="dash-panel-head">
                <div>
                  <h2>Your links</h2>
                </div>
                <span className="dash-section-icon dash-section-icon--small">
                  <LinkIcon size={13} />
                </span>
              </div>
              <div className="dash-links-grid">
                <div className="dash-link-row">
                  <span className="dash-link-domain">tourn.lol/</span>
                  <b>{user.alias?.trim() || user.username}</b>
                  <button
                    type="button"
                    className="dash-copy"
                    onClick={() => void copyLink(`https://tourn.lol/${user.alias?.trim() || user.username}`)}
                    aria-label="Copy tourn.lol link"
                  >
                    {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                  </button>
                </div>
                <div className={`dash-link-row${isPremium ? "" : " dash-link-row--locked"}`}>
                  <span className="dash-link-domain">swats.bio/</span>
                  <b>{user.alias2 || user.username}</b>
                  {isPremium ? (
                    <button
                      type="button"
                      className="dash-copy"
                      onClick={() => void copyLink(`https://swats.bio/${user.alias2 || user.username}`)}
                      aria-label="Copy swats.bio link"
                    >
                      {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                    </button>
                  ) : (
                    <a className="dash-link-lock" href="#/premium">
                      <BoltIcon size={11} />
                      {user.alias2 ? "Unlock link" : "Premium"}
                    </a>
                  )}
                </div>
              </div>
              <div className="dash-account-foot">
                <span>
                  {user.alias?.trim()
                    ? "Your alias is live on both domains."
                    : `Claim an alias free in Settings — your links use @${user.username} until then.`}
                </span>
                <button type="button" className="dash-link" onClick={() => setPage("settings")}>
                  {isPremium ? "Manage aliases" : "Claim alias"}
                  <ArrowRight size={11} />
                </button>
              </div>
            </section>

            <div className="dash-charts">
              <ProfileCompletionChart
                details={profileDetails}
                score={profileScore}
                onEdit={() => setPage("about")}
              />
              <ServerReachChart
                invite={server.data}
                loading={server.loading}
                hasInvite={Boolean(settings.discordInvite)}
                error={server.error?.message ?? null}
                onConnect={() => setPage("widgets")}
                onRetry={server.refresh}
              />
            </div>

            <div className="dash-lower">
              <section className="dash-panel dash-account-card" data-reveal data-reveal-delay="100">
                <div className="dash-panel-head">
                  <div>
                    <h2>Account details</h2>
                  </div>
                  <span className="dash-section-icon dash-section-icon--small">
                    <UserIcon size={13} />
                  </span>
                </div>

                <ul className="dash-stat-rows">
                  <li>
                    <span className="dash-stat-row-label">Public link</span>
                    <span className="dash-stat-row-value">{handle}</span>
                    <button
                      type="button"
                      className="dash-copy"
                      onClick={() => void copyLink(`https://tourn.lol/${user.username}`)}
                      aria-label="Copy public link"
                    >
                      {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                    </button>
                  </li>
                  <li>
                    <span className="dash-stat-row-label">Handle</span>
                    <span className="dash-stat-row-value">@{user.username}</span>
                  </li>
                  <li>
                    <span className="dash-stat-row-label">Member since</span>
                    <span className="dash-stat-row-value">{joined}</span>
                  </li>
                  <li>
                    <span className="dash-stat-row-label">Account age</span>
                    <span className="dash-stat-row-value">{accountDays.toLocaleString()} days</span>
                  </li>
                  <li>
                    <span className="dash-stat-row-label">Live sources</span>
                    <span className="dash-stat-row-value">{cardsLinked}/4 configured</span>
                  </li>
                  <li>
                    <span className="dash-stat-row-label">Live cards</span>
                    <span className="dash-stat-row-value">{liveCards}/4 with data</span>
                  </li>
                </ul>

                <div className="dash-account-foot">
                  <span>Profile details are stored in this browser.</span>
                  <button type="button" className="dash-link" onClick={() => setPage("about")}>
                    Edit details
                    <ArrowRight size={11} />
                  </button>
                </div>
              </section>

              <section className="dash-panel dash-signals" data-reveal data-reveal-delay="140">
                <div className="dash-panel-head">
                  <div>
                    <h2>Live data</h2>
                  </div>
                  <span className={`dash-live${lanyard.data ? " is-live" : ""}`}>
                    <i />
                    {lanyard.data ? "connected" : "waiting"}
                  </span>
                </div>
                <ul className="dash-signal-list">
                  {signals.map((signal) => (
                    <li className="dash-signal" key={signal.label}>
                      <span className={`dash-signal-icon${signal.ok ? " is-ok" : ""}`}>
                        {signal.icon}
                      </span>
                      <span className="dash-signal-text">
                        <b>{signal.label}</b>
                        <span>{signal.detail}</span>
                      </span>
                      <span className="dash-signal-value">
                        <i className={signal.ok ? "is-ok" : ""} />
                        {signal.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
        </div>

        <footer className="dash-foot">
          <span>tourn.lol/{user.username}</span>
          <a href="#/">back to the site</a>
        </footer>
      </main>
    </div>
  );
}
