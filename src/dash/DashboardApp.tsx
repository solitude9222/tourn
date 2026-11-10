/* ---------------------------------------------------------------------------
   tourn.lol dashboard root.

   Holds the unsaved draft of every dashboard store, publishes it through the
   existing save callbacks, and routes the sidebar to the new pages. All data
   comes from the same stores the public profile reads.
   --------------------------------------------------------------------------- */

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Account } from "../lib/auth";
import type { About } from "../lib/about";
import type { Settings } from "../config";
import type { WidgetStore } from "../lib/widgets";
import type { BadgeStore } from "../lib/badges";
import type { LinkStore } from "../lib/links";
import type { LanyardData } from "../lib/api";
import type { Polled } from "../lib/hooks";
import { savePendingDocument, loadPendingDocument } from "../lib/serverProfile";
import { getViewCount } from "../lib/views";
import { DashContext, type Page, type ProfileTab, type TabDef } from "./context";
import { Shell } from "./Shell";
import { Button, Icon, type IconName } from "./ui";
import { HomePage } from "./pages/Home";
import { AccountProfilePage, AffiliatesPage, AnalyticsPage } from "./pages/Account";
import { CustomizeProfilePage } from "./pages/Customize";
import { LayoutPage } from "./pages/Layout";
import { EffectsPage } from "./pages/Effects";
import { BadgesPage } from "./pages/Badges";
import { LinksPage } from "./pages/Links";
import { WidgetsPage } from "./pages/Widgets";
import { AssetBrowserPage, LeaderboardPage, TemplatesPage } from "./pages/Community";
import { BillingPage, PremiumPage } from "./pages/Plan";

const AccountSettingsPage = lazy(() =>
  import("./pages/Embedded").then((module) => ({ default: module.AccountSettingsPage })),
);
const AdminPage = lazy(() =>
  import("./pages/Embedded").then((module) => ({ default: module.AdminPage })),
);
import "./dash.css";
import "./pages.css";

export type DashboardProps = {
  user: Account | null;
  about: About;
  lanyard: Polled<LanyardData>;
  settings: Settings;
  widgets: WidgetStore;
  badges: BadgeStore;
  profileLinks: LinkStore;
  isPremium: boolean;
  isAdmin: boolean;
  authLoading?: boolean;
  authUnavailable?: boolean;
  onRetryAuth?: () => void;
  earned: string[];
  onSaveAbout: (about: About) => void;
  onSaveWidgets: (store: WidgetStore) => void;
  onSaveBadges: (store: BadgeStore) => void;
  onSaveLinks: (store: LinkStore) => void;
  onSaveAll: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
  onAddAccount: () => void;
};

const PROFILE_TABS: TabDef[] = [
  { id: "profile", label: "Profile", icon: "user" },
  { id: "experience", label: "Experience", icon: "sparkles" },
  { id: "integrations", label: "Integrations", icon: "link" },
  { id: "switches", label: "Extra", icon: "sliders" },
];

const META: Record<Page, { title: string; subtitle: string; icon: IconName; crumb: string }> = {
  home: { title: "Home", subtitle: "Here's how your profile and live data are doing.", icon: "home", crumb: "Home" },
  "account-profile": {
    title: "Profile",
    subtitle: "Your name, picture and description.",
    icon: "user",
    crumb: "Account",
  },
  badges: { title: "Badges", subtitle: "Manage your badges", icon: "shield", crumb: "Account" },
  affiliates: {
    title: "Affiliates",
    subtitle: "Every address that points at your page.",
    icon: "users",
    crumb: "Account",
  },
  analytics: {
    title: "Analytics",
    subtitle: "Who visits your page and where they come from.",
    icon: "chart",
    crumb: "Account",
  },
  "customize-profile": {
    title: "Profile",
    subtitle: "Profile details, visibility toggles and card styling",
    icon: "sliders",
    crumb: "Customize",
  },
  layout: {
    title: "Card",
    subtitle: "Card layout, widget positions and styling in one place.",
    icon: "layout",
    crumb: "Customize",
  },
  effects: {
    title: "Effects",
    subtitle: "Background, overlay, text and cursor motion.",
    icon: "sparkles",
    crumb: "Customize",
  },
  premium: {
    title: "Premium",
    subtitle: "Unlock the full customisation toolkit.",
    icon: "star",
    crumb: "Premium",
  },
  links: { title: "Social Links", subtitle: "Links and buttons on your profile.", icon: "link", crumb: "Links" },
  widgets: {
    title: "Widgets",
    subtitle: "Add rich platform widgets to your profile",
    icon: "grid",
    crumb: "Links",
  },
  assets: {
    title: "Assets",
    subtitle: "Your uploads, ready to reuse on the profile.",
    icon: "image",
    crumb: "Community",
  },
  leaderboard: {
    title: "Leaderboard",
    subtitle: "The most viewed profiles on tourn.lol.",
    icon: "chart",
    crumb: "Community",
  },
  templates: {
    title: "Templates",
    subtitle: "Apply a look, or share your own with a code.",
    icon: "grid",
    crumb: "Community",
  },
  billing: {
    title: "Billing",
    subtitle: "Your plan and payment details.",
    icon: "crown",
    crumb: "Settings",
  },
  settings: {
    title: "Account Settings",
    subtitle: "Your claims, account security and plan.",
    icon: "settings",
    crumb: "Settings",
  },
  admin: {
    title: "Admin",
    subtitle: "Members, invites, site settings and the Discord bot.",
    icon: "shield",
    crumb: "Settings",
  },
};

function serialized(value: unknown): string {
  return JSON.stringify(value);
}

export function Dashboard(props: DashboardProps) {
  const {
    user,
    about,
    widgets,
    badges,
    profileLinks,
    settings,
    isPremium,
    isAdmin,
    earned,
    authLoading,
    authUnavailable,
    onRetryAuth,
    onSaveAbout,
    onSaveWidgets,
    onSaveBadges,
    onSaveLinks,
    onSignIn,
    onSignUp,
    onSignOut,
    onAddAccount,
  } = props;

  const [page, setPage] = useState<Page>(() => {
    if (isAdmin && window.location.hash.includes("/admin")) return "admin";
    if (window.location.hash.includes("/settings")) return "settings";
    return "home";
  });
  const [profileTab, setProfileTab] = useState<ProfileTab>("profile");
  const [aboutDraft, setAboutDraft] = useState<About>(() => (user && loadPendingDocument(user.id)?.about) || about);
  const [widgetsDraft, setWidgetsDraft] = useState<WidgetStore>(() => (user && loadPendingDocument(user.id)?.widgets) || widgets);
  const [badgesDraft, setBadgesDraft] = useState<BadgeStore>(() => (user && loadPendingDocument(user.id)?.badges) || badges);
  const [linksDraft, setLinksDraft] = useState<LinkStore>(() => (user && loadPendingDocument(user.id)?.links) || profileLinks);
  const [profileViews, setProfileViews] = useState<number | null>(null);

  const lastProps = useRef({ about, widgets, badges, profileLinks });

  useEffect(() => {
    setAboutDraft((current) =>
      serialized(current) === serialized(lastProps.current.about) ? about : current,
    );
    lastProps.current.about = about;
  }, [about]);

  useEffect(() => {
    setWidgetsDraft((current) =>
      serialized(current) === serialized(lastProps.current.widgets) ? widgets : current,
    );
    lastProps.current.widgets = widgets;
  }, [widgets]);

  useEffect(() => {
    setBadgesDraft((current) =>
      serialized(current) === serialized(lastProps.current.badges) ? badges : current,
    );
    lastProps.current.badges = badges;
  }, [badges]);

  useEffect(() => {
    setLinksDraft((current) =>
      serialized(current) === serialized(lastProps.current.profileLinks)
        ? profileLinks
        : current,
    );
    lastProps.current.profileLinks = profileLinks;
  }, [profileLinks]);

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
    if (!isAdmin) return;
    const apply = () => {
      if (window.location.hash.includes("/admin") || /^\/admin\/?$/i.test(window.location.pathname)) {
        setPage("admin");
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [isAdmin]);

  const dirty =
    serialized(aboutDraft) !== serialized(about) ||
    serialized(widgetsDraft) !== serialized(widgets) ||
    serialized(badgesDraft) !== serialized(badges) ||
    serialized(linksDraft) !== serialized(profileLinks);

  const notify = useCallback((title: string, message: string) => {
    window.dispatchEvent(new CustomEvent("tourn:toast", { detail: { title, message } }));
  }, []);

  const save = useCallback(() => {
    if (!user) return;
    if (serialized(aboutDraft) !== serialized(about)) onSaveAbout(aboutDraft);
    if (serialized(widgetsDraft) !== serialized(widgets)) onSaveWidgets(widgetsDraft);
    if (serialized(badgesDraft) !== serialized(badges)) onSaveBadges(badgesDraft);
    if (serialized(linksDraft) !== serialized(profileLinks)) onSaveLinks(linksDraft);
    notify("Saved on this device", "Publishing your changes. Failed uploads are kept and retried.");
  }, [
    user,
    aboutDraft,
    about,
    widgetsDraft,
    widgets,
    badgesDraft,
    badges,
    linksDraft,
    profileLinks,
    onSaveAbout,
    onSaveWidgets,
    onSaveBadges,
    onSaveLinks,
    notify,
  ]);

  useEffect(() => {
    if (!user || authLoading || !dirty) return;
    savePendingDocument(user.id, {
      about: aboutDraft, widgets: widgetsDraft, badges: badgesDraft, links: linksDraft,
    });
    onSaveAbout(aboutDraft);
    onSaveWidgets(widgetsDraft);
    onSaveBadges(badgesDraft);
    onSaveLinks(linksDraft);
  }, [user?.id, authLoading, dirty, aboutDraft, widgetsDraft, badgesDraft, linksDraft,
      onSaveAbout, onSaveWidgets, onSaveBadges, onSaveLinks]);

  const discard = useCallback(() => {
    setAboutDraft(about);
    setWidgetsDraft(widgets);
    setBadgesDraft(badges);
    setLinksDraft(profileLinks);
    notify("Changes discarded", "Your profile is back to the saved version.");
  }, [about, widgets, badges, profileLinks, notify]);

  const go = useCallback((next: Page, tab?: ProfileTab) => {
    setPage(next);
    if (tab) setProfileTab(tab);
  }, []);

  const context = useMemo(
    () => ({
      user: user as Account,
      about: aboutDraft,
      widgets: widgetsDraft,
      badges: badgesDraft,
      links: linksDraft,
      settings,
      isPremium,
      isAdmin,
      earned,
      profileViews,
      dirty,
      setAbout: (updater: (current: About) => About) => setAboutDraft(updater),
      setWidgets: (updater: (current: WidgetStore) => WidgetStore) => setWidgetsDraft(updater),
      setBadges: (updater: (current: BadgeStore) => BadgeStore) => setBadgesDraft(updater),
      setLinks: (updater: (current: LinkStore) => LinkStore) => setLinksDraft(updater),
      save,
      discard,
      notify,
      go,
      profileTab,
      setProfileTab,
    }),
    [
      user,
      aboutDraft,
      widgetsDraft,
      badgesDraft,
      linksDraft,
      settings,
      isPremium,
      isAdmin,
      earned,
      profileViews,
      dirty,
      save,
      discard,
      notify,
      go,
      profileTab,
    ],
  );

  if (!user || authLoading || authUnavailable) {
    return (
      <div className="tw-gate">
        <a className="tw-brand tw-gate-brand" href="#/">
          <img src="/logo.png" alt="" width={37} height={37} />
          <span className="tw-brand-text">
            tourn<i>.</i>lol
          </span>
        </a>

        <div className="tw-gate-card">
          <span className="tw-gate-icon">
            <Icon name={authUnavailable ? "refresh" : "user"} size={22} />
          </span>
          {authLoading ? (
            <>
              <h1>Checking your session…</h1>
              <p>One moment while tourn.lol confirms which account this browser is signed into.</p>
            </>
          ) : authUnavailable ? (
            <>
              <h1>Couldn't reach tourn.lol.</h1>
              <p>
                The account API didn't answer, so this could be a connection problem rather than a
                signed-out browser. Nothing has been signed out.
              </p>
              <div className="tw-row">
                {onRetryAuth ? <Button variant="primary" onClick={onRetryAuth}>Try again</Button> : null}
                <Button onClick={onSignIn}>Sign in instead</Button>
              </div>
            </>
          ) : (
            <>
              <h1>Your dashboard starts with a handle.</h1>
              <p>Sign in or create an account to manage your bio, links and widgets.</p>
              <div className="tw-row">
                <Button variant="primary" trailingIcon="arrow-right" onClick={onSignUp}>
                  Create your account
                </Button>
                <Button onClick={onSignIn}>Sign in</Button>
              </div>
            </>
          )}
          <a className="tw-inline-link" href="#/">Back to the site</a>
        </div>
      </div>
    );
  }

  const meta = META[page];

  let content: React.ReactNode;
  switch (page) {
    case "home":
      content = <HomePage />;
      break;
    case "account-profile":
      content = <AccountProfilePage />;
      break;
    case "badges":
      content = <BadgesPage />;
      break;
    case "affiliates":
      content = <AffiliatesPage />;
      break;
    case "analytics":
      content = <AnalyticsPage />;
      break;
    case "customize-profile":
      content = <CustomizeProfilePage tab={profileTab} />;
      break;
    case "layout":
      content = <LayoutPage />;
      break;
    case "effects":
      content = <EffectsPage />;
      break;
    case "premium":
      content = <PremiumPage />;
      break;
    case "links":
      content = <LinksPage />;
      break;
    case "widgets":
      content = <WidgetsPage />;
      break;
    case "assets":
      content = <AssetBrowserPage />;
      break;
    case "leaderboard":
      content = <LeaderboardPage />;
      break;
    case "templates":
      content = <TemplatesPage />;
      break;
    case "billing":
      content = <BillingPage />;
      break;
    case "settings":
      content = <AccountSettingsPage />;
      break;
    case "admin":
      content = isAdmin ? <AdminPage /> : <HomePage />;
      break;
    default:
      content = <HomePage />;
  }

  return (
    <DashContext.Provider value={context}>
      <Shell
        page={page}
        onNavigate={go}
        title={meta.title}
        subtitle={meta.subtitle}
        icon={meta.icon}
        crumb={meta.crumb}
        tabs={page === "customize-profile" ? PROFILE_TABS : undefined}
        activeTab={profileTab}
        onTab={(id) => setProfileTab(id as ProfileTab)}
        onAddAccount={onAddAccount}
        onSignOut={onSignOut}
      >
        <Suspense fallback={null}>{content}</Suspense>
      </Shell>
    </DashContext.Provider>
  );
}
