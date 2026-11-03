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
import { loadIsPremium } from "./lib/premium";
import { fetchLanyard } from "./lib/api";
import { usePolled } from "./lib/hooks";
import { useHashRoute, profileHandleFromLocation } from "./lib/router";
import { formatJoined } from "./lib/format";
import { useReveal } from "./lib/useReveal";
import { getSiteStats, type SiteStats } from "./lib/siteStats";
import { Header } from "./components/Header";
import { AuthDialog, type AuthMode } from "./components/AuthDialog";
import { SiteBackdrop } from "./components/Chrome";

import { CopyIcon, ExternalIcon, MailIcon, UserIcon } from "./components/Icons";

/* The marketing site, the dashboard and the demo page are not needed to render
   tourn.lol/<handle>. Splitting them keeps a profile visit down to the profile
   bundle instead of parsing the whole dashboard first. */
const Dashboard = lazy(() =>
  import("./components/Dashboard").then((module) => ({ default: module.Dashboard })),
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
import type { Account } from "./lib/auth";
import { LinkerPreview } from "./components/LinkerPreview";
import {
  fetchOwnProfile,
  fetchPublicProfile,
  readCachedProfile,
  saveProfile,
  type ProfilePayload,
} from "./lib/serverProfile";
import { getViewCount, recordView } from "./lib/views";

export default function App() {
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
  onSignIn,
}: {
  handle: string | null;
  user: Account | null;
  about: About;
  widgets: WidgetStore;
  badges: BadgeStore;
  links: LinkStore;
  earned: string[];
  onSignIn: () => void;
}) {
  const isOwn = Boolean(handle && user && user.username.toLowerCase() === handle);
  // A cached copy paints the real page — entry screen included — on the very
  // first frame. The fetch below only refreshes it in the background.
  const cached = useMemo(
    () => (handle && !isOwn ? readCachedProfile(handle) : null),
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
        <LinkerPreview
          user={user}
          about={about}
          widgets={widgets}
          badges={{ ...badges, equipped: badges.equipped.filter((b) => earned.includes(b.id)) }}
          links={links}
          interactive
          views={views}
          joined={formatJoined(new Date(user.joinedAt))}
        />
      </section>
    );
  }

  // Nothing to paint yet: a plain black screen, never a skeleton flash. The
  // entry screen (or the page itself) replaces it as soon as data is ready.
  if (remote.status === "loading") {
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
        <LinkerPreview
          user={remote.data.account}
          about={document.about}
          widgets={document.widgets}
          badges={{
            ...document.badges,
            equipped: document.badges.equipped.filter((b) => remote.data.earned.includes(b.id)),
          }}
          links={document.links}
          interactive
          views={views}
          joined={formatJoined(new Date(remote.data.account.joinedAt))}
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
  const { user, first, isOwner, isAdmin, loading, unavailable, retryAuth, signOut } = useAuth();
  const route = useHashRoute();
  // Start empty so a signed-in account never fires a request for the site's
  // marketing demo IDs while auth/account settings are still resolving.
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [about, setAbout] = useState<About>(EMPTY_ABOUT);
  const [widgets, setWidgets] = useState<WidgetStore>(EMPTY_WIDGET_STORE);
  const [badges, setBadges] = useState<BadgeStore>(EMPTY_BADGE_STORE);
  const [profileLinks, setProfileLinks] = useState<LinkStore>(EMPTY_LINK_STORE);
  const [isPremium, setIsPremiumState] = useState(false);
  const [earned, setEarned] = useState<string[]>([]);
  const hydratedFor = useRef<string | null>(null);
  const lastSaved = useRef<string>("");
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [siteStats, setSiteStats] = useState<SiteStats>({ users: null, views: null });

  useReveal([route, user?.id]);

  // Coming back from Discord with ?error=… used to land on the home page with
  // the message silently dropped: the dialog reads the URL only when it opens,
  // and nothing opened it. Open it here so the failure is actually explained.
  useEffect(() => {
    const raw =
      window.location.hash.match(/[?&]error=([^&]+)/)?.[1] ??
      window.location.search.match(/[?&]error=([^&]+)/)?.[1];
    if (raw) setAuthMode("signin");
  }, []);

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
      void import("./components/Dashboard");
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
    setAbout(user ? loadAbout(user.id) : EMPTY_ABOUT);
    setWidgets(user ? loadWidgetStore(user.id) : EMPTY_WIDGET_STORE);
    setBadges(user ? loadBadgeStore(user.id) : EMPTY_BADGE_STORE);
    setProfileLinks(user ? loadLinkStore(user.id) : EMPTY_LINK_STORE);
    // Premium = granted by an admin on the profile row, or the local testing flag.
    setIsPremiumState(user ? Boolean(user.premium) || loadIsPremium(user.id) : false);
    setSettings(loadSettings(user?.id ?? null));
  }, [user?.id]);

  // Pull the published document from the backend: it is what every visitor
  // sees, so a new device (or a cleared browser) restores it instead of
  // starting from an empty page.
  useEffect(() => {
    if (!user) {
      hydratedFor.current = null;
      lastSaved.current = "";
      setEarned([]);
      return;
    }
    let active = true;
    void fetchOwnProfile().then((result) => {
      if (!active || !result.ok) return;
      setEarned(result.data.earned);
      if (result.data.profile) {
        const document = result.data.profile;
        setAbout(document.about);
        setWidgets(document.widgets);
        setBadges(document.badges);
        setProfileLinks(document.links);
        saveAbout(user.id, document.about);
        saveWidgetStore(user.id, document.widgets);
        saveBadgeStore(user.id, document.badges);
        saveLinkStore(user.id, document.links);
        lastSaved.current = JSON.stringify(document);
      } else {
        // First publish for this account: push what this browser already has.
        const document = {
          about: loadAbout(user.id),
          widgets: loadWidgetStore(user.id),
          badges: loadBadgeStore(user.id),
          links: loadLinkStore(user.id),
        };
        lastSaved.current = JSON.stringify(document);
        void saveProfile(document);
      }
      hydratedFor.current = user.id;
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  // Any dashboard edit republishes the page (debounced so sliders don't spam).
  useEffect(() => {
    if (!user || hydratedFor.current !== user.id) return;
    const document = { about, widgets, badges, links: profileLinks };
    const serialized = JSON.stringify(document);
    if (serialized === lastSaved.current) return;
    const timer = window.setTimeout(() => {
      lastSaved.current = serialized;
      void saveProfile(document);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [user?.id, about, widgets, badges, profileLinks]);

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
    const document = { about, widgets, badges, links: profileLinks };
    lastSaved.current = JSON.stringify(document);
    void saveProfile(document);
  }, [user, about, widgets, badges, profileLinks]);

  return (
    <div className={`app${route === "dashboard" ? " app--dash" : " app--site"}`}>
      <Suspense fallback={null}>
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
        <main className="page-enter">
          <ProfilePage
            key={profileHandleFromLocation() ?? "none"}
            handle={profileHandleFromLocation()}
            user={user}
            about={about}
            widgets={widgets}
            badges={badges}
            links={profileLinks}
            earned={earned}
            onSignIn={() => setAuthMode("signup")}
          />
        </main>
      ) : route === "dashboard" ? (
        <Dashboard
          user={user}
          about={about}
          lanyard={lanyard}
          settings={settings}
          widgets={widgets}
          badges={badges}
          isPremium={isPremium}
          isAdmin={isAdmin}
          authLoading={loading}
          authUnavailable={unavailable}
          onRetryAuth={() => void retryAuth()}
          earned={earned}
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
                  onExample={() => scrollTo("example")}
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
