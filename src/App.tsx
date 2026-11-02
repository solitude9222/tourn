import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useHashRoute, profileHandleFromHash } from "./lib/router";
import { formatJoined } from "./lib/format";
import { useReveal } from "./lib/useReveal";
import { getSiteStats, type SiteStats } from "./lib/siteStats";
import { Header } from "./components/Header";
import { AuthDialog, type AuthMode } from "./components/AuthDialog";
import { AdminDashboard } from "./components/AdminDashboard";
import { BentoSection, FaqSection, Footer, Hero, StatsBand } from "./components/Sections";
import { LeaderboardPage, PremiumPage, ShopPage } from "./components/Pages";
import { SiteBackdrop } from "./components/Chrome";
import { Dashboard } from "./components/Dashboard";
import type { HeroIdentity } from "./components/ProfileCard";
import type { Account } from "./lib/auth";
import { LinkerPreview } from "./components/LinkerPreview";
import { DemoPage } from "./components/DemoPage";

export default function App() {
  return (
    <AuthProvider>
      <Site />
    </AuthProvider>
  );
}

function ProfilePage({
  handle,
  user,
  about,
  widgets,
  badges,
  links,
  onSignIn,
}: {
  handle: string | null;
  user: Account | null;
  about: About;
  widgets: WidgetStore;
  badges: BadgeStore;
  links: LinkStore;
  onSignIn: () => void;
}) {
  // Only the signed-in account's own settings are stored in this browser, so
  // the full linker is shown for that account's handle.
  if (user && handle && user.username.toLowerCase() === handle) {
    return (
      <section className="profile-page">
        <LinkerPreview
          user={user}
          about={about}
          widgets={widgets}
          badges={badges}
          links={links}
          interactive
        />
      </section>
    );
  }

  return (
    <section className="profile-page profile-page--empty">
      <h1>{handle ? `@${handle}` : "Profile"}</h1>
      <p>
        {user
          ? "This profile's linker isn't available yet."
          : "Sign in to view your linker."}
      </p>
      {user ? null : (
        <button type="button" className="btn btn-primary btn-sm" onClick={onSignIn}>
          Sign in
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

  // Top-bar "Save changes" — re-persists every dashboard store at once.
  const handleSaveAll = useCallback(() => {
    if (!user) return;
    saveAbout(user.id, about);
    saveWidgetStore(user.id, widgets);
    saveBadgeStore(user.id, badges);
    saveLinkStore(user.id, profileLinks);
  }, [user, about, widgets, badges, profileLinks]);

  return (
    <div className={`app${route === "dashboard" ? " app--dash" : " app--site"}`}>
      {route === "demo" ? null : <SiteBackdrop />}

      {route !== "dashboard" && route !== "demo" ? (
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
            ) : route === "admin" ? (
              <AdminDashboard />
            ) : route === "profile" ? (
              <ProfilePage
                handle={profileHandleFromHash()}
                user={user}
                about={about}
                widgets={widgets}
                badges={badges}
                links={profileLinks}
                onSignIn={() => setAuthMode("signin")}
              />
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
