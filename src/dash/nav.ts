/* ---------------------------------------------------------------------------
   Dashboard navigation model.

   One flat list of top-level places. Everything below a place is a subtab, and
   each subtab is a real page id, so the URL, the page header tabs and the
   sidebar all read from this one table.
   --------------------------------------------------------------------------- */

import type { Page } from "./context";
import type { IconName } from "./ui";

export type NavTab = { page: Page; label: string; icon: IconName };

export type NavItem = {
  key: string;
  label: string;
  icon: IconName;
  /** The first tab is where clicking the sidebar entry lands. */
  tabs: NavTab[];
};

export const NAV: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "home",
    tabs: [
      { page: "home", label: "Overview", icon: "home" },
      { page: "analytics", label: "Analytics", icon: "chart" },
      { page: "leaderboard", label: "Leaderboard", icon: "crown" },
    ],
  },
  {
    key: "appearance",
    label: "Appearance",
    icon: "palette",
    tabs: [
      { page: "profile-appearance", label: "Card", icon: "palette" },
      { page: "effects", label: "Effects", icon: "sparkles" },
      { page: "music", label: "Audio", icon: "music" },
      { page: "templates", label: "Templates", icon: "grid" },
    ],
  },
  {
    key: "profile",
    label: "Profile",
    icon: "user",
    tabs: [
      { page: "profile-main", label: "Profile", icon: "user" },
      { page: "profile-experience", label: "Entry screen", icon: "sparkles" },
      { page: "profile-switches", label: "Switches", icon: "sliders" },
      { page: "aliases", label: "Inventory", icon: "layers" },
    ],
  },
  {
    key: "content",
    label: "Content",
    icon: "layers",
    tabs: [
      { page: "layout", label: "Layout", icon: "layout" },
      { page: "portfolio-general", label: "Overview", icon: "home" },
      { page: "portfolio-sections", label: "Sections", icon: "layers" },
      { page: "portfolio-gallery", label: "Gallery", icon: "image" },
      { page: "portfolio-design", label: "Design", icon: "palette" },
    ],
  },
  {
    key: "links",
    label: "Social Links",
    icon: "link",
    tabs: [{ page: "links", label: "Links", icon: "link" }],
  },
  {
    key: "widgets",
    label: "Widgets",
    icon: "grid",
    tabs: [{ page: "widgets", label: "Widget stack", icon: "grid" }],
  },
  {
    key: "badges",
    label: "Badges",
    icon: "shield",
    tabs: [{ page: "badges", label: "Badges", icon: "shield" }],
  },
  {
    key: "settings",
    label: "Settings",
    icon: "settings",
    tabs: [
      { page: "settings", label: "Account", icon: "settings" },
      { page: "theme", label: "Theme", icon: "palette" },
      { page: "affiliates", label: "Affiliates", icon: "users" },
    ],
  },
  {
    key: "billing",
    label: "Billing",
    icon: "crown",
    tabs: [
      { page: "billing", label: "Plan", icon: "crown" },
      { page: "premium", label: "Premium", icon: "star" },
    ],
  },
  {
    key: "support",
    label: "Support",
    icon: "help",
    tabs: [{ page: "support", label: "Tickets", icon: "help" }],
  },
];

/** Pages that exist but are reached from inside another place. */
const OWNER: Partial<Record<Page, string>> = {
  "account-profile": "profile",
  "customize-profile": "appearance",
  assets: "content",
  admin: "settings",
  premium: "billing",
  theme: "settings",
};

export function navItemForPage(page: Page): NavItem | undefined {
  return (
    NAV.find((item) => item.tabs.some((tab) => tab.page === page)) ??
    NAV.find((item) => item.key === OWNER[page])
  );
}

export function navTabsForPage(page: Page, isAdmin = false): NavTab[] {
  const item = navItemForPage(page);
  if (!item) return [];
  if (item.key === "settings" && isAdmin && !item.tabs.some((tab) => tab.page === "admin")) {
    return [...item.tabs, { page: "admin" as Page, label: "Admin", icon: "shield" }];
  }
  return item.tabs;
}

/** Where a sidebar entry and its empty subnav should point. */
export function navHome(item: NavItem): Page {
  return item.tabs[0]?.page ?? "home";
}
