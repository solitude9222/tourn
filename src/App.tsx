import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { BentoSection, FaqSection, Footer, Hero, StatsBand } from "./components/Sections";
import { LeaderboardPage, PremiumPage, ShopPage } from "./components/Pages";
import { SiteBackdrop } from "./components/Chrome";
import { Dashboard } from "./components/Dashboard";
import type { HeroIdentity } from "./components/ProfileCard";
import type { Account } from "./lib/auth";
import { LinkerPreview } from "./components/LinkerPreview";
import { DemoPage } from "./components/DemoPage";
import {
  fetchOwnProfile,
  fetchPublicProfile,
  saveProfile,
  type ProfilePayload,
} from "./lib/serverProfile";
import { recordView } from "./lib/views";

export default function App() {
  return (
    <AuthProvider>
      <Site />
    </AuthProvider>
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
  const [remote, setRemote] = useState<
    { status: "loading" } | { status: "ok"; data: ProfilePayload } | { status: "missing" } | { status: "error"; error: string }
  >({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!handle || isOwn) return;
    let active = true;
    setRemote({ status: "loading" });
    void fetchPublicProfile(handle).then((result) => {
      if (!active) return;
      if (result.ok) {
        setRemote({ status: "ok", data: result.data });
        if (result.data.profile) void recordView(result.data.account.username);
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
    return (
      <section className="profile-page profile-page--empty">
        <h1>Profile</h1>
        <p>That link doesn't point at a profile.</p>
        <a className="btn btn-primary btn-sm" href="#/">
          Go to tourn.lol
        </a>
      </section>
    );
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
        />
        <a className="demo-edit-btn" href="#/dashboard">
          Edit this page
        </a>
      </section>
    );
  }

  if (remote.status === "loading") {
    return (
      <section className="profile-page profile-page--empty">
        <span className="spinner" />
        <p>Loading tourn.lol/{handle}…</p>
      </section>
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
        />
        {user ? (
          <a className="demo-edit-btn" href="#/dashboard">
            Edit this page
          </a>
        ) : null}
      </section>
    );
  }

  if (remote.status === "error") {
    return (
      <section className="profile-page profile-page--empty">
        <h1>tourn.lol/{handle}</h1>
        <p>{remote.error}</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </button>
      </section>
    );
  }

  // Known account, but the page hasn't been published yet.
  if (remote.status === "ok") {
    return (
      <section className="profile-page profile-page--empty">
        <h1>tourn.lol/{handle}</h1>
        <p>
          @{remote.data.account.username} hasn't published a page yet.
          {isOwn ? " Open your dashboard to build it." : ""}
        </p>
        {isOwn ? (
          <a className="btn btn-primary btn-sm" href="#/dashboard">
            Open dashboard
          </a>
        ) : null}
      </section>
    );
  }

  return (
    <section className="profile-page profile-page--empty">
      <h1>tourn.lol/{handle} is free</h1>
      <p>No one has claimed this link yet. It could be yours.</p>
      {user ? (
        <button type="button" className="btn btn-primary btn-sm" onClick={onSignIn}>
          Claim a handle
        </button>
      ) : (
        <button type="button" className="btn btn-primary btn-sm" onClick={onSignIn}>
          Sign up and claim it
        </button>
      )}
    </section>
  );
}

function Site() {
  const { user, first, isOwner, isAdmin, loading, signOut } = useAuth();
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

  // Landing pages should always open at the top, not at a restored scroll offset.
  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
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


  const identity = useMemo<HeroIdentity | null>(() => {
    // Home card: the owner's profile when one exists, otherwise the viewer's own.
    if (!user && first) {
      return {
        displayName: first.alias?.trim() || first.username,
        handle: first.username,
        avatarUrl: first.avatarUrl,
        joined: `Member since ${formatJoined(new Date(first.joinedAt))}`,
        location: "",
        bio: "",
        discordLinked: false,
        spotifyLinked: false,
        steamLinked: false,
        live: false,
      };
    }
    if (!user) return null;

    return {
      displayName: (user.alias?.trim() || about.displayName.trim() || user.username),
      handle: user.username,
      avatarUrl: user.avatarUrl,
      joined: `Member since ${formatJoined(new Date(user.joinedAt))}`,
      location: about.location.trim(),
      bio: about.bio,
      discordLinked: Boolean(settings.discordUserId),
      spotifyLinked: Boolean(settings.spotifyTrack || lanyard.data?.spotify),
      steamLinked: Boolean(settings.steamUrl),
      live: Boolean(lanyard.data),
    };
  }, [user, first, about, lanyard.data, settings.steamUrl]);

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
      {route === "demo" || route === "profile" ? null : <SiteBackdrop />}

      {route !== "dashboard" && route !== "demo" && route !== "profile" ? (
        <Header
          route={route}
          user={user}
          loading={loading}
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
            ) : (
              <>
                <Hero
                  identity={identity}
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
