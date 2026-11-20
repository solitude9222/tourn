import type { ProfileDocument } from "../lib/serverProfile";
/* ---------------------------------------------------------------------------
   tourn.lol dashboard root.

   Holds the unsaved draft of every dashboard store, publishes it through the
   existing save callbacks, and routes the sidebar to the new pages. All data
   comes from the same stores the public profile reads.
   --------------------------------------------------------------------------- */

import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Account } from "../lib/auth";
import type { About } from "../lib/about";
import type { Settings } from "../config";
import type { WidgetStore } from "../lib/widgets";
import { ownedWithAdmin, type BadgeStore } from "../lib/badges";
import type { LinkStore } from "../lib/links";
import type { LanyardData } from "../lib/api";
import type { Polled } from "../lib/hooks";
import { getViewCount } from "../lib/views";
import { DashContext, type Page, type ProfileTab, type TabDef } from "./context";
import { Shell } from "./Shell";
import { Button, Icon, type IconName } from "./ui";
import { navTabsForPage } from "./nav";

/* Each console page is its own chunk: the dashboard shell and Home paint first,
   and a heavy editor (widgets, layout, appearance) is fetched only when opened. */
const lazyPage = <T extends Record<string, unknown>, K extends keyof T>(
  loader: () => Promise<T>,
  name: K,
) => lazy(async () => ({ default: (await loader())[name] as unknown as React.ComponentType<any> }));

const DecorationsStudioPage = lazyPage(() => import("./pages/Studio"), "DecorationsStudioPage");
const AppearanceStudioPage = lazyPage(() => import("./pages/Studio"), "AppearanceStudioPage");
const ProfileGeneralPage = lazyPage(() => import("./pages/Studio"), "ProfileGeneralPage");
const PortfolioGeneralPage = lazyPage(() => import("./pages/PortfolioStudio"), "PortfolioGeneralPage");
const PortfolioAboutPage = lazyPage(() => import("./pages/PortfolioStudio"), "PortfolioAboutPage");
const GalleryPage = lazyPage(() => import("./pages/Gallery"), "GalleryPage");
const DesignPage = lazyPage(() => import("./pages/Design"), "DesignPage");
const HomePage = lazyPage(() => import("./pages/Home"), "HomePage");
const AccountProfilePage = lazyPage(() => import("./pages/Account"), "AccountProfilePage");
const AffiliatesPage = lazyPage(() => import("./pages/Account"), "AffiliatesPage");
const AnalyticsPage = lazyPage(() => import("./pages/Account"), "AnalyticsPage");
const CustomizeProfilePage = lazyPage(() => import("./pages/Customize"), "CustomizeProfilePage");
const AudioPage = lazyPage(() => import("./pages/Customize"), "AudioPage");
const LayoutPage = lazyPage(() => import("./pages/Layout"), "LayoutPage");
const EffectsPage = lazyPage(() => import("./pages/Effects"), "EffectsPage");
const BadgesPage = lazyPage(() => import("./pages/Badges"), "BadgesPage");
const LinksPage = lazyPage(() => import("./pages/Links"), "LinksPage");
const WidgetsPage = lazyPage(() => import("./pages/Widgets"), "WidgetsPage");
const AssetBrowserPage = lazyPage(() => import("./pages/Community"), "AssetBrowserPage");
const LeaderboardPage = lazyPage(() => import("./pages/Community"), "LeaderboardPage");
const TemplatesPage = lazyPage(() => import("./pages/Templates"), "TemplatesPage");
const BillingPage = lazyPage(() => import("./pages/Plan"), "BillingPage");
const PremiumPage = lazyPage(() => import("./pages/Plan"), "PremiumPage");
const PortfolioPage = lazyPage(() => import("./pages/Workspaces"), "PortfolioPage");
const ProfileWorkspacePage = lazyPage(() => import("./pages/Workspaces"), "ProfileWorkspacePage");
const ThemePage = lazyPage(() => import("./pages/Theme"), "ThemePage");
const SupportPage = lazyPage(() => import("./pages/Support"), "SupportPage");

const AccountSettingsPage = lazy(() =>
  import("./pages/Embedded").then((module) => ({ default: module.AccountSettingsPage })),
);
const InventoryPage = lazyPage(() => import("./pages/Inventory"), "InventoryPage");
const AdminPage = lazy(() =>
  import("./pages/Embedded").then((module) => ({ default: module.AdminPage })),
);
/* Warm a page chunk when its navigation entry is hovered or focused, so the
   click does not sit through a cold dynamic import. */
const PAGE_PRELOADS: Partial<Record<Page, () => Promise<unknown>>> = {
  appearance: () => import("./pages/Studio"),
  "portfolio-projects": () => import("./pages/Layout"),
  "portfolio-interests": () => import("./pages/Layout"),
  home: () => import("./pages/Home"),
  "account-profile": () => import("./pages/Account"),
  affiliates: () => import("./pages/Account"),
  analytics: () => import("./pages/Account"),
  badges: () => import("./pages/Badges"),
  music: () => import("./pages/Customize"),
  "customize-profile": () => import("./pages/Customize"),
  layout: () => import("./pages/Layout"),
  "profile-appearance": () => import("./pages/Layout"),
  "portfolio-sections": () => import("./pages/Layout"),
  effects: () => import("./pages/Studio"),
  links: () => import("./pages/Links"),
  widgets: () => import("./pages/Widgets"),
  assets: () => import("./pages/Community"),
  leaderboard: () => import("./pages/Community"),
  templates: () => import("./pages/Templates"),
  aliases: () => import("./pages/Inventory"),
  billing: () => import("./pages/Plan"),
  premium: () => import("./pages/Plan"),
  support: () => import("./pages/Support"),
  settings: () => import("./pages/Embedded"),
  admin: () => import("./pages/Embedded"),
  theme: () => import("./pages/Theme"),
  "portfolio-general": () => import("./pages/Workspaces"),
  "portfolio-gallery": () => import("./pages/Workspaces"),
  "portfolio-design": () => import("./pages/Workspaces"),
  "profile-main": () => import("./pages/Workspaces"),
  "profile-experience": () => import("./pages/Workspaces"),
  "profile-switches": () => import("./pages/Workspaces"),
};

import "./dash.css";
import "./pages.css";
import "./dashboardStudio.css";
import "./blueRefresh.css";
import "./simpleStudio.css";
import "./managePages.css";
import "./overview.css";
import "./spacing.css";

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
  onDraftChange: (document: ProfileDocument) => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
  onAddAccount: () => void;
};

const META: Record<Page, { title: string; subtitle: string; icon: IconName; crumb: string }> = {
  appearance: { title: "Media & fonts", subtitle: "Avatar, background, cursor and typography.", icon: "palette", crumb: "Customize" },
  "portfolio-projects": {title:"Portfolio",subtitle:"Projects, artwork and links.",icon:"layers",crumb:"Customize"},
  "portfolio-interests": {title:"Portfolio",subtitle:"Games, anime and everything you enjoy.",icon:"gamepad",crumb:"Customize"},
  aliases: {title:"Inventory",subtitle:"Your usernames, badges and collectables.",icon:"layers",crumb:"Account"},
  home: { title: "Account Overview", subtitle: "Check out information about your account.", icon: "home", crumb: "Home" },
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
    title: "Layout",
    subtitle: "Page layout, live preview and where every detail sits.",
    icon: "layout",
    crumb: "Customize",
  },
  music: { title: "Music", subtitle: "Your track, playback and player appearance.", icon: "music", crumb: "Customize" },
  effects: {
    title: "Decorations",
    subtitle: "All name, avatar, background, overlay, card and pointer effects.",
    icon: "sparkles",
    crumb: "Customize",
  },
  premium: {
    title: "Premium",
    subtitle: "Unlock the full customisation toolkit.",
    icon: "star",
    crumb: "Premium",
  },
  links: { title: "Social Links", subtitle: "Connect your social media accounts to your profile", icon: "link", crumb: "Links" },
  widgets: {
    title: "Widgets",
    subtitle: "Add rich platform widgets to your profile",
    icon: "grid",
    crumb: "Links",
  },
  assets: {
    title: "Importer",
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
  support: {
    title: "Support",
    subtitle: "One ticket at a time, answered in the thread.",
    icon: "help",
    crumb: "Dashboard",
  },
  settings: {
    title: "Account",
    subtitle: "Your claims, account security and plan.",
    icon: "settings",
    crumb: "Settings",
  },
  theme: {
    title: "Theme",
    subtitle: "Pick the palette the console itself is drawn in.",
    icon: "palette",
    crumb: "Settings",
  },
  "portfolio-general": {
    title: "Portfolio",
    subtitle: "Everything your page shows, at a glance.",
    icon: "home",
    crumb: "Portfolio",
  },
  "portfolio-about": {
    title: "Portfolio",
    subtitle: "The writing block and the tags inside it.",
    icon: "user",
    crumb: "Portfolio",
  },
  "portfolio-sections": {
    title: "Sections",
    subtitle: "Projects, games and interests, in the order they appear.",
    icon: "layers",
    crumb: "Portfolio",
  },
  "portfolio-gallery": {
    title: "Portfolio",
    subtitle: "Your uploads, ready to place on the page.",
    icon: "image",
    crumb: "Portfolio",
  },
  "portfolio-audio": {
    title: "Portfolio",
    subtitle: "The track, its playback and the player's look.",
    icon: "music",
    crumb: "Portfolio",
  },
  "portfolio-design": {
    title: "Portfolio",
    subtitle: "Colors, borders and roundness for every surface.",
    icon: "palette",
    crumb: "Portfolio",
  },
  "profile-main": {
    title: "Profile",
    subtitle: "Your name, picture and description.",
    icon: "user",
    crumb: "Profile",
  },
  "profile-appearance": {
    title: "Profile",
    subtitle: "Card, About and project surfaces in one design system.",
    icon: "palette",
    crumb: "Profile",
  },
  "profile-experience": {
    title: "Profile",
    subtitle: "The entry screen and the motion of the page.",
    icon: "sparkles",
    crumb: "Profile",
  },
  "profile-integrations": {
    title: "Profile",
    subtitle: "Discord, Spotify, Steam and the rest.",
    icon: "link",
    crumb: "Profile",
  },
  "profile-switches": {
    title: "Profile",
    subtitle: "Visibility and behaviour toggles.",
    icon: "sliders",
    crumb: "Profile",
  },
  admin: {
    title: "Admin",
    subtitle: "Members, invites, site settings and the Discord bot.",
    icon: "shield",
    crumb: "Settings",
  },
};

function readDashboardLocation(isAdmin: boolean): { page: Page; tab: ProfileTab } {
  const parts = window.location.hash.replace(/^#\/?/, "").split("?")[0].split("/");
  // Older bookmarks still point at the retired Projects and Games tabs.
  const aliases: Record<string,string> = { "portfolio-games":"portfolio-interests", "account-profile":"profile-main", "customize-profile":"profile-main", "profile-integrations":"widgets", "portfolio-design":"profile-appearance", "music":"portfolio-audio" };
  const requested = aliases[parts[1]] || parts[1];
  const candidate = parts[0] === "admin" ? "admin" : requested || "home";
  const page =
    Object.hasOwn(META, candidate) &&
    (candidate !== "admin" || isAdmin)
      ? (candidate as Page)
      : "home";
  const tab = ["profile", "experience", "integrations", "switches"].includes(parts[2]) ? parts[2] as ProfileTab : "profile";
  return { page, tab };
}

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
    onDraftChange,
    onSignIn,
    onSignUp,
    onSignOut,
    onAddAccount,
  } = props;

  const [page, setPage] = useState<Page>(() => readDashboardLocation(isAdmin).page);
  const [profileTab, setProfileTab] = useState<ProfileTab>(() => readDashboardLocation(isAdmin).tab);
  const prefetchPage = useCallback((next: Page) => {
    void PAGE_PRELOADS[next]?.();
  }, []);
  // Hover prefetch removes most of the wait, but a first visit can still hit a
  // cold chunk. Warm every editor once the shell is idle so opening a page is
  // a render, not a download. Failures stay silent; navigation retries itself.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const warm = () => {
      if (cancelled) return;
      const seen = new Set<() => Promise<unknown>>();
      for (const load of Object.values(PAGE_PRELOADS)) {
        if (!load || seen.has(load)) continue;
        seen.add(load);
        void load().catch(() => undefined);
      }
    };
    const idle = window.requestIdleCallback as
      | ((callback: () => void, options?: { timeout: number }) => number)
      | undefined;
    let idleId = 0;
    const timer = idle ? 0 : window.setTimeout(warm, 250);
    if (idle) idleId = idle(warm, { timeout: 1200 });
    return () => {
      cancelled = true;
      if (idle) window.cancelIdleCallback?.(idleId);
      if (timer) window.clearTimeout(timer);
    };
  }, [user?.id]);
  const [aboutDraft, setAboutDraft] = useState<About>(about);
  const [widgetsDraft, setWidgetsDraft] = useState<WidgetStore>(widgets);
  const [badgesDraft, setBadgesDraft] = useState<BadgeStore>(badges);
  const [linksDraft, setLinksDraft] = useState<LinkStore>(profileLinks);
  const [publishStatus, setPublishStatus] = useState<"saving" | "saved" | "retrying">("saved");
  useEffect(() => {
    setPublishStatus("saved");
    const update = (event: Event) => { const detail = (event as CustomEvent).detail; if (detail?.userId === user?.id) setPublishStatus(detail.state); };
    window.addEventListener("tourn:publish-status", update);
    return () => window.removeEventListener("tourn:publish-status", update);
  }, [user?.id]);
  const [profileViews, setProfileViews] = useState<number | null>(null);

  const draftRef=useRef({about:aboutDraft,widgets:widgetsDraft,badges:badgesDraft,links:linksDraft});
  useLayoutEffect(()=>{draftRef.current={about:aboutDraft,widgets:widgetsDraft,badges:badgesDraft,links:linksDraft};},[aboutDraft,widgetsDraft,badgesDraft,linksDraft]);
  // Paint control feedback before normalizing/serializing large uploaded media.
  const draftCallback=useRef(onDraftChange);draftCallback.current=onDraftChange;
  const draftJob=useRef<{value:ProfileDocument;frame:number;timer:number}|null>(null);
  const queueDraft=useCallback((value:ProfileDocument)=>{
    if(draftJob.current){draftJob.current.value=value;return;}
    const job={value,frame:0,timer:0};draftJob.current=job;
    job.frame=requestAnimationFrame(()=>{job.timer=window.setTimeout(()=>{if(draftJob.current===job){draftJob.current=null;draftCallback.current(job.value);}},0);});
  },[]);
  useEffect(()=>()=>{const job=draftJob.current;if(job){cancelAnimationFrame(job.frame);clearTimeout(job.timer);draftJob.current=null;draftCallback.current(job.value);}},[]);
  const history = useRef<{ past: ProfileDocument[]; future: ProfileDocument[]; at: number; section: string }>({ past: [], future: [], at: 0, section: "" });
  const [historyVersion, setHistoryVersion] = useState(0);
  const restoreDraft = useCallback((next: ProfileDocument) => {
    draftRef.current = next;
    setAboutDraft(next.about); setWidgetsDraft(next.widgets); setBadgesDraft(next.badges); setLinksDraft(next.links);
    queueDraft(next);
  }, [queueDraft]);
  const undo = useCallback(() => {
    if (!user || authLoading) return;
    const previous = history.current.past.pop();
    if (!previous) return;
    history.current.future.push(draftRef.current); history.current.at = 0;
    restoreDraft(previous); setHistoryVersion(v => v + 1);
  }, [restoreDraft, user, authLoading]);
  const redo = useCallback(() => {
    if (!user || authLoading) return;
    const next = history.current.future.pop();
    if (!next) return;
    history.current.past.push(draftRef.current); history.current.at = 0;
    restoreDraft(next); setHistoryVersion(v => v + 1);
  }, [restoreDraft, user, authLoading]);
  const changeDraft=(section:keyof ProfileDocument,updater:(value:any)=>any)=>{
    if(!user || authLoading)return;
    const next={...draftRef.current,[section]:updater(draftRef.current[section])};
    if (Object.is(next[section], draftRef.current[section])) return;
    try{const id=window.location.hash.split("/")[2]||"profile-main";const key=`tourn/preferences/recent-${user.id}`;const prior=JSON.parse(localStorage.getItem(key)||"[]");localStorage.setItem(key,JSON.stringify([id,...(Array.isArray(prior)?prior:[]).filter(value=>value!==id)].slice(0,8)));}catch{/* Optional convenience. */}
    const h = history.current, now = Date.now();
    // Coalesce typing and slider gestures, retaining the state before the gesture.
    if (h.section !== section || now - h.at > 600 || !h.past.length) h.past = [...h.past.slice(-39), draftRef.current];
    h.at = now; h.section = section; h.future = [];
    setHistoryVersion(v => v + 1); draftRef.current=next;
    queueDraft(next);
    if(section==='about')setAboutDraft(next.about);if(section==='widgets')setWidgetsDraft(next.widgets);if(section==='badges')setBadgesDraft(next.badges);if(section==='links')setLinksDraft(next.links);
  };
  const lastProps = useRef({ about, widgets, badges, profileLinks });

  // Hydration can replace every prop in the same render that clears
  // authLoading. Apply that server copy once; otherwise the dashboard can keep
  // showing the pre-hydration local draft indefinitely.
  useLayoutEffect(() => {
    if (authLoading) return;
    history.current = { past: [], future: [], at: 0, section: "" };
    setHistoryVersion(v => v + 1);
    setAboutDraft(about);
    setWidgetsDraft(widgets);
    setBadgesDraft(badges);
    setLinksDraft(profileLinks);
    lastProps.current = { about, widgets, badges, profileLinks };
    // This intentionally runs only when hydration finishes. Later prop changes
    // are merged by the per-store effects below without discarding edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

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
    const refresh = () => {
      if (document.hidden) return;
      void getViewCount(user.username).then((count) => { if (active) setProfileViews(count); });
    };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false; window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [user?.username]);

  useEffect(() => {
    const apply = () => {
      const next = readDashboardLocation(isAdmin);
      setPage(next.page); setProfileTab(next.tab);
    };
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [isAdmin]);

  useLayoutEffect(() => {
    const main = document.querySelector<HTMLElement>(".tw-main");
    if (main) main.scrollTop = 0;
    const frame = window.requestAnimationFrame(() => {
      const section = new URLSearchParams(window.location.hash.split("?")[1]).get("section");
      if (section) document.getElementById(`dash-section-${section}`)?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [page, profileTab]);

  const aboutChanged = useMemo(() => serialized(aboutDraft) !== serialized(about), [aboutDraft,about]);
  const widgetsChanged = useMemo(() => serialized(widgetsDraft) !== serialized(widgets), [widgetsDraft,widgets]);
  const badgesChanged = useMemo(() => serialized(badgesDraft) !== serialized(badges), [badgesDraft,badges]);
  const linksChanged = useMemo(() => serialized(linksDraft) !== serialized(profileLinks), [linksDraft,profileLinks]);
  const dirty = aboutChanged || widgetsChanged || badgesChanged || linksChanged;

  useEffect(() => {
    if (!dirty && publishStatus === "saved") return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, publishStatus]);

  const notify = useCallback((title: string, message: string) => {
    window.dispatchEvent(new CustomEvent("tourn:toast", { detail: { title, message } }));
  }, []);

  const save = useCallback(() => {
    if (!user) return;
    // Push every store, not just the ones that differ from the last props: an
    // explicit Save from Links or Widgets always ends up in the published
    // document, even if the background auto-save already matched it.
    onSaveAbout(aboutDraft);
    onSaveWidgets(widgetsDraft);
    onSaveBadges(badgesDraft);
    onSaveLinks(linksDraft);
    notify("Saving your page", "Links, widgets and every other change are being published.");
  }, [
    user,
    aboutDraft,
    widgetsDraft,
    badgesDraft,
    linksDraft,
    onSaveAbout,
    onSaveWidgets,
    onSaveBadges,
    onSaveLinks,
    notify,
  ]);



  const discard = useCallback(() => {
    history.current.past.push(draftRef.current);
    history.current.future = []; history.current.at = 0;
    restoreDraft({ about, widgets, badges, links: profileLinks });
    setHistoryVersion(v => v + 1);
    notify("Changes discarded", "Your profile is back to the saved version.");
  }, [about, widgets, badges, profileLinks, notify, restoreDraft]);

  const go = useCallback((next: Page, tab?: ProfileTab, section?: string) => {
    setPage(next);
    if (tab) setProfileTab(tab);
    const nextTab = next === "customize-profile" ? tab || profileTab : undefined;
    window.location.hash = `#/dashboard/${next}${nextTab ? `/${nextTab}` : ""}${section ? `?section=${encodeURIComponent(section)}` : ""}`;
  }, [profileTab]);
  const changeProfileTab = useCallback((next: ProfileTab) => {
    setProfileTab(next);
    if (page === "customize-profile") window.location.hash = `#/dashboard/customize-profile/${next}`;
  }, [page]);

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
      earned: ownedWithAdmin(earned, isAdmin),
      profileViews,
      dirty, publishStatus,
      undo, redo, canUndo: history.current.past.length > 0, canRedo: history.current.future.length > 0,
      setAbout: (updater: (current: About) => About) => changeDraft("about",updater),
      setWidgets: (updater: (current: WidgetStore) => WidgetStore) => changeDraft("widgets",updater),
      setBadges: (updater: (current: BadgeStore) => BadgeStore) => changeDraft("badges",updater),
      setLinks: (updater: (current: LinkStore) => LinkStore) => changeDraft("links",updater),
      save,
      discard,
      notify,
      go,
      profileTab,
      setProfileTab: changeProfileTab,
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
      changeProfileTab,
      historyVersion, undo, redo, publishStatus,
      authLoading,
      onDraftChange,
    ],
  );

  if(authLoading)return <div className="route-loading" role="status" aria-label="Loading your dashboard"/>;
  if (!user || authUnavailable) {
    return (
      <div className="tw-gate">
        <a className="tw-brand tw-gate-brand" href="#/">
          <img src="/brand/tourn-mark.svg" alt="" width={37} height={37} />
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
              <AuthRetryNote onRetry={onRetryAuth} />
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
    case "appearance":
      content = <AppearanceStudioPage />;
      break;
    case "account-profile":
      content = <ProfileGeneralPage />;
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
    case "music":
      content = <AudioPage />;
      break;
    case "customize-profile":
      content = <ProfileGeneralPage />;
      break;
    case "layout":
      content = <LayoutPage />;
      break;
    case "effects":
      content = <DecorationsStudioPage />;
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
    case "aliases":
      content = <InventoryPage />;
      break;
    case "billing":
      content = <BillingPage />;
      break;
    case "support":
      content = <SupportPage />;
      break;
    case "settings":
      content = <AccountSettingsPage />;
      break;
    case "theme":
      content = <ThemePage />;
      break;
    case "portfolio-general":
      content = <PortfolioGeneralPage />;
      break;
    case "portfolio-about":
      content = <PortfolioAboutPage />;
      break;
    case "portfolio-projects":
      content = <LayoutPage section="sections" filterKind="project" />;
      break;
    case "portfolio-interests":
      content = <LayoutPage section="sections" filterKind="interest" />;
      break;
    case "portfolio-audio":
      content = <AudioPage />;
      break;
    case "portfolio-sections":
      content = <LayoutPage section="sections" />;
      break;
    case "portfolio-gallery":
      content = <GalleryPage />;
      break;
    case "portfolio-design":
      content = <PortfolioPage tab="design" />;
      break;
    case "profile-main":
      content = <ProfileGeneralPage />;
      break;
    case "profile-appearance":
      content = <div className="tw-studio-page"><LayoutPage section="style" /><DesignPage /></div>;
      break;
    case "profile-experience":
      content = <ProfileWorkspacePage tab="experience" />;
      break;
    case "profile-integrations":
      content = <WidgetsPage />;
      break;
    case "profile-switches":
      content = <ProfileWorkspacePage tab="switches" />;
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
        onPrefetchPage={prefetchPage}
        title={meta.title}
        subtitle={meta.subtitle}
        icon={meta.icon}
        crumb={meta.crumb}
        tabs={navTabsForPage(page, isAdmin).map((tab) => ({ id: tab.page, label: tab.label, icon: tab.icon }))}
        activeTab={page}
        onTab={(id) => go(id as Page)}
        onAddAccount={onAddAccount}
        onSignOut={onSignOut}
      >
        <Suspense fallback={<div className="tw-page-loading" role="status" aria-label="Loading editor"><div /><div /><div /></div>}>{content}</Suspense>
      </Shell>
    </DashContext.Provider>
  );
}

/* The account API is a separate service, so a failed check is often a blip.
   Say when the last one happened and keep retrying on a slow beat instead of
   leaving the owner to guess whether the page is stuck. */
function AuthRetryNote({ onRetry }: { onRetry?: () => void }) {
  const [at, setAt] = useState(() => Date.now());
  const [left, setLeft] = useState(20);
  const retry = useRef(onRetry);
  retry.current = onRetry;
  useEffect(() => {
    const timer = window.setInterval(() => setLeft(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [at]);
  useEffect(() => {
    if (left > 0) return;
    retry.current?.();
    setAt(Date.now());
    setLeft(20);
  }, [left]);
  return (
    <p className="tw-gate-note" role="status">
      Last checked {new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.
      {onRetry ? ` Trying again in ${left}s.` : " Reload the page to try again."}
    </p>
  );
}
