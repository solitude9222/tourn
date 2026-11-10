import "./lib/preloadLinks";
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AuthProvider, useAuth } from "./lib/auth";
import { DEFAULT_SETTINGS, EMPTY_SETTINGS, loadSettings, type Settings } from "./config";
import { EMPTY_ABOUT, loadAbout, saveAbout, type About } from "./lib/about";
import {
  EMPTY_WIDGET_STORE,
  loadWidgetStore,
  saveWidgetStore,
  type WidgetStore,
} from "./lib/widgets";
import {
  EMPTY_BADGE_STORE,
  loadBadgeStore,
  saveBadgeStore,
  type BadgeStore,
} from "./lib/badges";
import {
  EMPTY_LINK_STORE,
  loadLinkStore,
  saveLinkStore,
  type LinkStore,
} from "./lib/links";
import { fetchLanyard } from "./lib/api";
import { usePolled } from "./lib/hooks";
import { useHashRoute, profileHandleFromLocation } from "./lib/router";
import { formatJoinDate } from "./lib/format";
import { useReveal } from "./lib/useReveal";
import { getSiteStats, type SiteStats } from "./lib/siteStats";
import { Header } from "./components/Header";
import { AuthDialog, type AuthMode } from "./components/AuthDialog";
import { SiteBackdrop } from "./components/Chrome";
import { Oneko } from "./components/Oneko";
import { post } from "./lib/backend";

import { CopyIcon, ExternalIcon, MailIcon, UserIcon } from "./components/Icons";

/* The marketing site, the dashboard and the demo page are not needed to render
   tourn.lol/<handle>. Splitting them keeps a profile visit down to the profile
   bundle instead of parsing the whole dashboard first. */
const Dashboard = lazy(() =>
  import("./dash/DashboardApp").then((module) => ({ default: module.Dashboard })),
);
const DemoPage = lazy(() =>
  import("./components/DemoPage").then((module) => ({ default: module.DemoPage })),
);
const Hero = lazy(() => import("./components/Sections").then((m) => ({ default: m.Hero })));
const StatsBand = lazy(() => import("./components/Sections").then((m) => ({ default: m.StatsBand })));
const BentoSection = lazy(() =>
  import("./components/Sections").then((m) => ({ default: m.BentoSection })),
);
const FaqSection = lazy(() => import("./components/Sections").then((m) => ({ default: m.FaqSection })));
const Footer = lazy(() => import("./components/Sections").then((m) => ({ default: m.Footer })));
const LeaderboardPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.LeaderboardPage })),
);
const ShopPage = lazy(() => import("./components/Pages").then((m) => ({ default: m.ShopPage })));
const PremiumPage = lazy(() =>
  import("./components/Pages").then((m) => ({ default: m.PremiumPage })),
);
const LegalPage = lazy(() => import("./components/Pages").then((m) => ({ default: m.LegalPage })));

/* The hero card (and its canvas effects) lives in the marketing chunk. Waiting
   for the first render to ask for that chunk added a whole round-trip before
   the card could paint, which read as the card "loading slowly". Start the
   download with the bundle instead. */
void import("./components/Sections");
import type { Account } from "./lib/auth";
import { LinkerPreview } from "./components/LinkerPreview";
import {
  clearCachedProfile,
  clearPendingDocument,
  fetchOwnProfile,
  fetchPublicProfile,
  loadPendingDocument,
  preloadProfile,
  readCachedProfile,
  savePendingDocument,
  saveProfile,
  type ProfileDocument,
  type ProfilePayload,
} from "./lib/serverProfile";
import { getViewCount, recordView } from "./lib/views";

/* Route names that are never a handle, so hovering the nav never fires a
   pointless profile request. */
const RESERVED_PATHS = new Set([
  "",
  "dashboard",
  "leaderboard",
  "shop",
  "premium",
  "legal",
  "demo",
  "settings",
  "admin",
]);

function handleFromHref(href: string): string | null {
  const hashAt = href.indexOf("#");
  if (hashAt === -1) return null;
  const path = href.slice(hashAt + 1).replace(/^\/+/, "").split(/[?#]/)[0];
  const first = path.split("/")[0]?.toLowerCase() ?? "";
  if (!first || RESERVED_PATHS.has(first) || first.includes(".")) return null;
  return first;
}

export default function App() {
  // Warm the profile the pointer is heading for. By the time the click lands
  // the document is already in memory, so the page paints on its first frame.
  useEffect(() => {
    const warm = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const handle = handleFromHref(anchor.getAttribute("href") ?? "");
      if (handle) preloadProfile(handle);
    };
    document.addEventListener("pointerover", warm, { passive: true });
    document.addEventListener("pointerdown", warm, { passive: true });
    document.addEventListener("focusin", warm);
    return () => {
      document.removeEventListener("pointerover", warm);
      document.removeEventListener("pointerdown", warm);
      document.removeEventListener("focusin", warm);
    };
  }, []);

  return (
    <AuthProvider>
      <Site />
    </AuthProvider>
  );
}

/**
 * The page behind a /handle that has no public profile (yet). One designed
 * layout for all four cases so a free handle, an unpublished page, a dead
 * backend and a malformed link never fall back to unstyled HTML.
 */
function ProfileNotice({
  handle,
  kind,
  account,
  viewer,
  isOwn,
  message,
  onSignIn,
  onRetry,
}: {
  handle: string | null;
  kind: "nohandle" | "missing" | "unpublished" | "error";
  account?: Account;
  /** The signed-in visitor, if any — the bottom account bar only renders for them. */
  viewer?: Account | null;
  isOwn?: boolean;
  message?: string;
  onSignIn?: () => void;
  onRetry?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const heading =
    kind === "nohandle"
      ? "That link isn't a profile"
      : kind === "missing"
        ? "Username not found"
        : kind === "unpublished"
          ? "Nothing published here yet"
          : "Couldn't load this page";

  const copy =
    kind === "nohandle"
      ? "tourn.lol links look like tourn.lol/yourname — this one doesn't point anywhere."
      : kind === "missing"
        ? "No one has claimed " +
          "tourn.lol/" +
          (handle ?? "yourname") +
          " yet. Claim this username by clicking the button below!"
        : kind === "unpublished"
          ? (isOwn
              ? "Your page is still private. Open the dashboard and publish it to make it public."
              : "@" + (account?.username ?? handle) + " has an account, but hasn't published a page yet.")
          : (message ?? "The tourn.lol backend didn't answer. It may be starting up.");

  const copyUrl = async () => {
    if (!viewer) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${viewer.username}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className={`profile-page pn pn--${kind}`}>
      <div className="pn-shell">
        <div className="pn-card">
          <span className="pn-mark" aria-hidden="true">
            {kind === "missing" ? (
              <b className="pn-mark-bang">!</b>
            ) : (
              <img src="/logo.png" alt="" width={34} height={34} />
            )}
          </span>

          <h1 className="pn-title">{heading}</h1>

          {kind !== "missing" && handle ? (
            <p className="pn-handle">
              <span>tourn.lol/</span>
              <b>{handle}</b>
            </p>
          ) : null}

          {kind === "unpublished" && account ? (
            <div className="pn-account">
              <span className="pn-avatar">
                {account.avatarUrl ? (
                  <img src={account.avatarUrl} alt="" />
                ) : (
                  account.username.slice(0, 1).toUpperCase()
                )}
              </span>
              <span>
                <b>{account.username}</b>
                <small>{kind === "unpublished" ? "Not published yet" : "Member"}</small>
              </span>
            </div>
          ) : null}

          <p className="pn-copy">{copy}</p>

          <div className="pn-actions">
            <a className="btn btn-ghost btn-sm" href="#/">
              Go Home
            </a>

            {isOwn ? (
              <a className="btn btn-primary btn-sm" href="#/dashboard">
                Open dashboard
              </a>
            ) : null}

            {kind === "missing" && onSignIn ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={onSignIn}>
                Claim Now!
              </button>
            ) : null}

            {kind === "error" && onRetry ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={onRetry}>
                Try again
              </button>
            ) : null}
          </div>
        </div>

        {viewer ? (
          <div className="pn-session">
            <p className="pn-session-who">
              <UserIcon size={14} />
              <span>
                Currently logged in as <b>@{viewer.username}</b>
              </span>
            </p>
            <div className="pn-session-actions">
              <a className="pn-session-btn" href={`/${viewer.username}`}>
                <ExternalIcon size={12} />
                Open
              </a>
              <button type="button" className="pn-session-btn" onClick={() => void copyUrl()}>
                <CopyIcon size={12} />
                {copied ? "Copied" : "Copy Profile URL"}
              </button>
              <a className="pn-session-btn" href="mailto:hello@tourn.lol">
                <MailIcon size={12} />
                Help
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * tourn.lol/<handle> — a standalone public page, never the marketing site.
 *
 * The document comes from the backend, so it renders for visitors and on any
 * device. The signed-in owner keeps seeing their live local state. A missing
 * handle stays on the same URL and offers to claim it — it never bounces home.
 */
function ProfilePage({
  handle,
  user,
  about,
  widgets,
  badges,
  links,
  earned,
  authLoading,
  savedHandles,
  onSignIn,
}: {
  handle: string | null;
  user: Account | null;
  about: About;
  widgets: WidgetStore;
  badges: BadgeStore;
  links: LinkStore;
  /** Badge ids the backend verified. `null` = not known yet, so nothing is hidden. */
  earned: string[] | null;
  /** The session check is still in flight. */
  authLoading: boolean;
  /** Handles this browser has an account for — a page for one is not "public". */
  savedHandles: string[];
  onSignIn: () => void;
}) {
  const isOwn = Boolean(handle && user && user.username.toLowerCase() === handle);
  // Loading your own page used to paint the public copy first and swap to the
  // live local card the moment the session check landed — that swap is the
  // flash on a cold load. Hold the page while we find out who is signed in.
  const mayBeOwn = Boolean(handle && savedHandles.includes(handle));
  const holdForAuth = !user && authLoading && mayBeOwn;
  // A cached copy paints the real page — entry screen included — on the very
  // first frame. The fetch below only refreshes it in the background.
  const cached = useMemo(
    () => (handle ? readCachedProfile(handle) : null),
    [handle, isOwn],
  );
  const [remote, setRemote] = useState<
    { status: "loading" } | { status: "ok"; data: ProfilePayload } | { status: "missing" } | { status: "error"; error: string }
  >(() => (cached ? { status: "ok", data: cached } : { status: "loading" }));
  const [attempt, setAttempt] = useState(0);
  const [views, setViews] = useState<number | null>(null);

  // View count for the card corner — the owner's page never increments it.
  useEffect(() => {
    if (!handle) return;
    let active = true;
    setViews(null);
    void getViewCount(handle).then((count) => {
      if (active) setViews(count);
    });
    return () => {
      active = false;
    };
  }, [handle]);

  useEffect(() => {
    if (!handle || isOwn) return;
    let active = true;
    // Keep an already-painted page on screen while revalidating.
    setRemote((current) => (current.status === "ok" ? current : { status: "loading" }));
    void fetchPublicProfile(handle).then((result) => {
      if (!active) return;
      if (result.ok) {
        setRemote({ status: "ok", data: result.data });
        if (result.data.profile) {
          void recordView(result.data.account.username).then((count) => {
            if (active && count > 0) setViews(count);
          });
        }
      } else if (result.notFound) {
        setRemote({ status: "missing" });
      } else {
        setRemote({ status: "error", error: result.error });
      }
    });
    return () => {
      active = false;
    };
  }, [handle, isOwn, attempt]);

  if (!handle) {
    return <ProfileNotice handle={null} kind="nohandle" />;
  }

  if (isOwn && user) {
    return (
      <section className="profile-page">
        <Oneko enabled={Boolean(about.design.oneko)} />
        <LinkerPreview
          user={user}
          about={about}
          widgets={widgets}
          badges={{
            ...badges,
            // Only strip unearned badges once the backend has actually told us
            // which ones are earned — an empty/unknown list used to hide every
            // badge on the card.
            equipped: earned ? badges.equipped.filter((b) => earned.includes(b.id)) : badges.equipped,
          }}
          links={links}
          interactive
          views={views}
          joined={formatJoinDate(user.joinedAt, about.metadata.joinFormat)}
        />
      </section>
    );
  }

  // Nothing to paint yet: a plain black screen, never a skeleton flash. The
  // entry screen (or the page itself) replaces it as soon as data is ready.
  if (holdForAuth || remote.status === "loading") {
    return (
      <section
        className="profile-page profile-page--loading"
        aria-busy="true"
        aria-label={`Loading tourn.lol/${handle}`}
      />
    );
  }

  if (remote.status === "ok" && remote.data.profile) {
    const document = remote.data.profile;
    return (
      <section className="profile-page">
        <Oneko enabled={Boolean(document.about.design.oneko)} />
        <LinkerPreview
          user={remote.data.account}
          about={document.about}
          widgets={document.widgets}
          badges={{
            ...document.badges,
            equipped: remote.data.earned
              ? document.badges.equipped.filter((b) => remote.data.earned!.includes(b.id))
              : document.badges.equipped,
          }}
          links={document.links}
          interactive
          views={views}
          joined={formatJoinDate(
            remote.data.account.joinedAt,
            document.about.metadata.joinFormat,
          )}
        />
      </section>
    );
  }

  if (remote.status === "error") {
    return (
      <ProfileNotice
        handle={handle}
        kind="error"
        message={remote.error}
        viewer={user}
        isOwn={isOwn}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    );
  }

  // Known account, but the page hasn't been published yet.
  if (remote.status === "ok") {
    return (
      <ProfileNotice
        handle={handle}
        kind="unpublished"
        account={remote.data.account}
        viewer={user}
        isOwn={isOwn}
      />
    );
  }

  return <ProfileNotice handle={handle} kind="missing" viewer={user} onSignIn={onSignIn} />;
}

function Site() {
  const { user, first, isOwner, isAdmin, loading, unavailable, retryAuth, signOut, accounts } =
    useAuth();
  const route = useHashRoute();
  // Start empty so a signed-in account never fires a request for the site's
  // marketing demo IDs while auth/account settings are still resolving.
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [about, setAbout] = useState<About>(EMPTY_ABOUT);
  const [widgets, setWidgets] = useState<WidgetStore>(EMPTY_WIDGET_STORE);
  const [badges, setBadges] = useState<BadgeStore>(EMPTY_BADGE_STORE);
  const [profileLinks, setProfileLinks] = useState<LinkStore>(EMPTY_LINK_STORE);
  const [isPremium, setIsPremiumState] = useState(false);
  // `null` until the backend tells us which badges this account earned. An
  // empty array means "nothing earned"; the two must not be conflated or a
  // failed request hides every equipped badge.
  const [earned, setEarned] = useState<string[] | null>(null);
  const hydratedFor = useRef<string | null>(null);
  const [hydratedId, setHydratedId] = useState<string | null>(null);
  const [hydrateAttempt, setHydrateAttempt] = useState(0);
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);
  const lastSaved = useRef<string>("");
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [siteStats, setSiteStats] = useState<SiteStats>({ users: null, views: null });

  useReveal([route, user?.id]);

  // The browser tab names the page you are on. A profile names itself (the
  // profile metadata does that), every other page is "tourn.lol — <page>", so a
  // tab never keeps a stale handle after you leave someone's bio.
  useEffect(() => {
    if (route === "profile") return;
    const names: Record<string, string> = {
      "": "home",
      dashboard: "dashboard",
      leaderboard: "leaderboard",
      shop: "shop",
      premium: "premium",
      legal: "legal",
      demo: "demo",
    };
    document.title = `tourn.lol — ${names[route] ?? route}`;
  }, [route]);

  // Coming back from Discord with ?error=… used to land on the home page with
  // the message silently dropped: the dialog reads the URL only when it opens,
  // and nothing opened it. Open it here so the failure is actually explained.
  useEffect(() => {
    const raw =
      window.location.hash.match(/[?&]error=([^&]+)/)?.[1] ??
      window.location.search.match(/[?&]error=([^&]+)/)?.[1];
    if (raw) setAuthMode("signin");
  }, []);

  // Discord's callback runs on the API host, so its cookie belongs there and
  // never reaches the site. The callback hands back a one-time ticket; trading
  // it here sets the session cookie first-party on tourn.lol.
  useEffect(() => {
    const [path, query] = window.location.hash.split("?");
    const params = new URLSearchParams(query ?? "");
    const ticket = params.get("login");
    if (!ticket) return;
    params.delete("login");
    const rest = params.toString();
    window.history.replaceState(null, "", `${path}${rest ? `?${rest}` : ""}`);
    void post("/api/auth/session", { ticket }).then((result) => {
      if (result.ok) void retryAuth();
    });
  }, [retryAuth]);

  // Site-wide totals for the landing page — public data, independent of
  // whichever account (if any) is signed in.
  useEffect(() => {
    let active = true;
    void getSiteStats().then((next) => {
      if (active) setSiteStats(next);
    });
    return () => {
      active = false;
    };
  }, []);

  // Warm the route bundles in the background. Without this the first click on
  // "Dashboard" had to wait for the chunk, so the click looked ignored and
  // people pressed twice.
  useEffect(() => {
    const preload = () => {
      void import("./dash/DashboardApp");
      void import("./components/Sections");
      void import("./components/Pages");
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (idle) {
      idle(preload);
      return;
    }
    const timer = window.setTimeout(preload, 900);
    return () => window.clearTimeout(timer);
  }, []);

  // Landing pages should always open at the top, not at a restored scroll offset.
  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  // Hydrate the saved profile before paint. A plain effect painted one frame
  // of empty defaults first — the flash the preview showed on sign-in.
  useLayoutEffect(() => {
    hydratedFor.current = null;
    setHydratedId(null);
    setProfileLoadFailed(false);
    lastSaved.current = "";
    setAbout(user ? loadAbout(user.id) : EMPTY_ABOUT);
    setWidgets(user ? loadWidgetStore(user.id) : EMPTY_WIDGET_STORE);
    setBadges(user ? loadBadgeStore(user.id) : EMPTY_BADGE_STORE);
    setProfileLinks(user ? loadLinkStore(user.id) : EMPTY_LINK_STORE);
    // Premium is server-owned: the account's premium flag is the only source.
    setIsPremiumState(Boolean(user?.premium));
    setSettings(loadSettings(user?.id ?? null));
  }, [user?.id]);

  // Pull the published document from the backend: it is what every visitor
  // sees, so a new device (or a cleared browser) restores it instead of
  // starting from an empty page.
  useEffect(() => {
    if (!user) {
      hydratedFor.current = null;
      lastSaved.current = "";
      setEarned(null);
      return;
    }
    let active = true;
    let retry = 0;
    void fetchOwnProfile().then((result) => {
      if (!active) return;
      if (!result.ok) {
        // Do not publish an unverified local baseline over an unread server copy.
        setProfileLoadFailed(true);
        retry = window.setTimeout(() => setHydrateAttempt((n) => n + 1), 3000);
        return;
      }
      setProfileLoadFailed(false);
      setEarned(result.data.earned);
      // A publish that failed last time leaves the newer document here. It has
      // to win over the server copy, or the failed publish is silently undone.
      const pending = loadPendingDocument(user.id);
      if (pending) {
        setAbout(pending.about);
        setWidgets(pending.widgets);
        setBadges(pending.badges);
        setProfileLinks(pending.links);
        saveAbout(user.id, pending.about);
        saveWidgetStore(user.id, pending.widgets);
        saveBadgeStore(user.id, pending.badges);
        saveLinkStore(user.id, pending.links);
        lastSaved.current = "";
        hydratedFor.current = user.id;
        setHydratedId(user.id);
        return;
      }
      if (result.data.profile) {
        const document = result.data.profile;
        // Empty arrays are valid saved deletions. Only a pending draft may
        // override the published document.
        const merged = document;
        setAbout(merged.about);
        setWidgets(merged.widgets);
        setBadges(merged.badges);
        setProfileLinks(merged.links);
        saveAbout(user.id, merged.about);
        saveWidgetStore(user.id, merged.widgets);
        saveBadgeStore(user.id, merged.badges);
        saveLinkStore(user.id, merged.links);
        lastSaved.current = JSON.stringify(document);
      } else {
        // First publish is handled by the acknowledged retrying save below.
        lastSaved.current = "";
      }
      hydratedFor.current = user.id;
      setHydratedId(user.id);
    });
    return () => {
      active = false;
      window.clearTimeout(retry);
    };
  }, [user?.id, hydrateAttempt]);

  // Any dashboard edit republishes the page (debounced so sliders don't spam).
  // The document only counts as saved once the backend says so: a failed PUT
  // keeps it pending, retries, and survives the next refresh.
  const retryRef = useRef(0);
  useEffect(() => {
    if (!user || hydratedFor.current !== user.id) return;
    let cancelled = false;
    let retryTimer = 0;

    const publish = async (document: ProfileDocument) => {
      const serialized = JSON.stringify(document);
      if (serialized === lastSaved.current) return;
      const result = await saveProfile(document, user.id, () => !cancelled && hydratedFor.current === user.id);
      if (cancelled) return;
      if (result.ok) {
        lastSaved.current = serialized;
        clearCachedProfile(user.username);
        if (user.alias) clearCachedProfile(user.alias);
        if (user.alias2) clearCachedProfile(user.alias2);
        retryRef.current = 0;
        const pending = loadPendingDocument(user.id);
        if (pending && JSON.stringify(pending) === serialized) clearPendingDocument(user.id);
        window.dispatchEvent(new CustomEvent("tourn:toast", { detail: {
          title: "Profile published", message: "Your changes are live.",
        } }));
        return;
      }
      if (!loadPendingDocument(user.id)) savePendingDocument(user.id, document);
      // 2s, 4s, 8s, 16s, then every 30s while the tab stays open.
      const delay = Math.min(30_000, 2000 * 2 ** retryRef.current);
      if (retryRef.current === 0) {
        window.dispatchEvent(
          new CustomEvent("tourn:toast", {
            detail: {
              title: "Couldn't save yet",
              message: `${result.error ?? "The server didn't accept the change."} Your edit is kept and will retry.`,
            },
          }),
        );
      }
      retryRef.current += 1;
      retryTimer = window.setTimeout(() => void publish(document), delay);
    };

    const document = { about, widgets, badges, links: profileLinks };
    const serialized = JSON.stringify(document);
    if (serialized === lastSaved.current) return;
    savePendingDocument(user.id, document);
    const timer = window.setTimeout(() => void publish(document), 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
    };
  }, [user?.id, hydratedId, about, widgets, badges, profileLinks]);

  // Closing the tab or switching away must not throw away the last edit: write
  // it down and send it with keepalive, which survives the page going away.
  useEffect(() => {
    if (!user || hydratedFor.current !== user.id) return;
    const flush = () => {
      const document = loadPendingDocument(user.id) ?? { about, widgets, badges, links: profileLinks };
      if (JSON.stringify(document) === lastSaved.current) return;
      savePendingDocument(user.id, document);
      // The durable pending copy is replayed on return. A second keepalive
      // PUT could race the active request and restore an older document.
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user?.id, hydratedId, about, widgets, badges, profileLinks]);

  const lanyard = usePolled(
    Boolean(settings.discordUserId),
    settings.discordUserId,
    (signal) => fetchLanyard(settings.discordUserId, signal),
    15_000,
  );

  // The home page's example stack is site data, not the viewer's, so it keeps
  // polling the demo accounts even after someone signs in.
  const exampleLanyard = usePolled(
    Boolean(DEFAULT_SETTINGS.discordUserId),
    DEFAULT_SETTINGS.discordUserId,
    (signal) => fetchLanyard(DEFAULT_SETTINGS.discordUserId, signal),
    15_000,
  );


  const closeAuth = useCallback(() => setAuthMode(null), []);

  const openPrimary = useCallback(() => {
    if (user) window.location.hash = "#/dashboard";
    else setAuthMode("signup");
  }, [user]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    if (window.location.hash === "#/dashboard") window.location.hash = "#/";
  }, [signOut]);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openFaq = useCallback(() => {
    if (route !== "") {
      window.location.hash = "#/";
      window.setTimeout(() => scrollTo("faq"), 80);
    } else {
      scrollTo("faq");
    }
  }, [route, scrollTo]);

  const handleSaveAbout = useCallback(
    (next: About) => {
      if (!user) return;
      setAbout(next);
      saveAbout(user.id, next);
    },
    [user],
  );

  const handleSaveWidgets = useCallback(
    (next: WidgetStore) => {
      if (!user) return;
      setWidgets(next);
      saveWidgetStore(user.id, next);
    },
    [user],
  );

  const handleSaveBadges = useCallback(
    (next: BadgeStore) => {
      if (!user) return;
      setBadges(next);
      saveBadgeStore(user.id, next);
    },
    [user],
  );

  const handleSaveLinks = useCallback(
    (next: LinkStore) => {
      if (!user) return;
      setProfileLinks(next);
      saveLinkStore(user.id, next);
    },
    [user],
  );

  // Top-bar "Save changes" — re-persists every dashboard store at once and
  // republishes the public page immediately.
  const handleSaveAll = useCallback(() => {
    if (!user) return;
    saveAbout(user.id, about);
    saveWidgetStore(user.id, widgets);
    saveBadgeStore(user.id, badges);
    saveLinkStore(user.id, profileLinks);
    // Let the publish effect send it: it marks the document saved only after
    // the backend confirms, so a failed save here is retried instead of lost.
    lastSaved.current = "";
  }, [user, about, widgets, badges, profileLinks]);

  return (
    <div className={`app${route === "dashboard" ? " app--dash" : " app--site"}${route === "" ? " app--home" : ""}`}>
      <Suspense fallback={<div className="route-loading" role="status">Loading your page�</div>}>
      {route === "demo" || route === "profile" ? null : <SiteBackdrop />}

      {route !== "dashboard" && route !== "demo" && route !== "profile" ? (
        <Header
          route={route}
          user={user}
          loading={loading}
          avatar={about.assets.avatarUrl}
          onSignIn={() => setAuthMode("signin")}
          onSignUp={() => setAuthMode("signup")}
          onSignOut={() => void handleSignOut()}
        />
      ) : null}

      {route === "demo" ? (
        <DemoPage
          user={user}
          isOwner={isOwner}
          first={first}
          about={about}
          widgets={widgets}
          badges={badges}
          links={profileLinks}
          onSignUp={() => {
            setAuthMode("signup");
            if (window.location.hash !== "#/") window.location.hash = "#/";
          }}
        />
      ) : route === "profile" ? (
        <main>
          <ProfilePage
            key={profileHandleFromLocation() ?? "none"}
            handle={profileHandleFromLocation()}
            user={user}
            about={about}
            widgets={widgets}
            badges={badges}
            links={profileLinks}
            earned={earned}
            authLoading={loading || Boolean(user && hydratedId !== user.id && !profileLoadFailed)}
            savedHandles={accounts.map((entry) => entry.username.toLowerCase())}
            onSignIn={() => setAuthMode("signup")}
          />
        </main>
      ) : route === "dashboard" ? (
        <Dashboard
            key={user?.id ?? "guest"}
          user={user}
          about={about}
          lanyard={lanyard}
          settings={settings}
          widgets={widgets}
          badges={badges}
          isPremium={isPremium}
          isAdmin={isAdmin}
          onAddAccount={() => setAuthMode("signin")}
          authLoading={loading || Boolean(user && hydratedId !== user.id && !profileLoadFailed)}
          authUnavailable={unavailable || profileLoadFailed}
          onRetryAuth={() => {
              if (user) { setProfileLoadFailed(false); setHydrateAttempt((n) => n + 1); }
              else void retryAuth();
            }}
          earned={earned ?? []}
          onSaveAbout={handleSaveAbout}
          onSaveWidgets={handleSaveWidgets}
          onSaveBadges={handleSaveBadges}
          onSaveLinks={handleSaveLinks}
          onSaveAll={handleSaveAll}
          profileLinks={profileLinks}
          onSignIn={() => setAuthMode("signin")}
          onSignUp={() => setAuthMode("signup")}
          onSignOut={() => void handleSignOut()}
        />
      ) : (
        <>
          <main key={route} className="page-enter">
            {route === "leaderboard" ? (
              <LeaderboardPage onSignUp={() => setAuthMode("signup")} />
            ) : route === "shop" ? (
              <ShopPage onSignUp={() => setAuthMode("signup")} />
            ) : route === "premium" ? (
              <PremiumPage onSignUp={() => setAuthMode("signup")} />
            ) : route === "legal" ? (
              <LegalPage />
            ) : (
              <>
                <Hero
                  signedIn={Boolean(user)}
                  onPrimary={openPrimary}
                  onPremium={() => {
                    window.location.hash = "#/premium";
                  }}
                />
                <StatsBand stats={siteStats} />
                <BentoSection
                  lanyard={exampleLanyard}
                  settings={DEFAULT_SETTINGS}
                  signedIn={Boolean(user)}
                  widgets={widgets}
                  onConfigure={() => {
                    window.location.hash = "#/dashboard";
                  }}
                  onOpenWidgets={() => {
                    window.location.hash = "#/dashboard";
                  }}
                />
                <FaqSection />
              </>
            )}
          </main>

          <Footer
            onSignIn={() => setAuthMode("signin")}
            onSignUp={() => setAuthMode("signup")}
            onFaq={openFaq}
          />
        </>
      )}
      </Suspense>

      <AuthDialog
        open={route !== "demo" && authMode !== null}
        mode={authMode ?? "signin"}
        onClose={closeAuth}
        onSwitch={setAuthMode}
        onDone={closeAuth}
      />
    </div>
  );
}
