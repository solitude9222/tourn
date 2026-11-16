/* ---------------------------------------------------------------------------
   Dashboard navigation model.

   One flat list of top-level places. Everything below a place is a subtab, and
   each subtab is a real page id, so the URL, the page header tabs and the
   sidebar all read from this one table.
   --------------------------------------------------------------------------- */

import type { Page } from "./context";
import type { IconName } from "./ui";

export type NavTab = { page: Page; label: string; icon: IconName };

export type NavGroup = "CUSTOMIZE" | "ASSETS" | "ACCOUNT";

export type NavItem = {
  key: string;
  label: string;
  icon: IconName;
  /** Hidden from everyone who is not an admin. */
  adminOnly?: boolean;
  /** Sidebar section heading; Dashboard sits above every group. */
  group?: NavGroup;
  /** The first tab is where clicking the sidebar entry lands. */
  tabs: NavTab[];
};

export const NAV: NavItem[] = [
 {key:"dashboard",label:"Home",icon:"home",tabs:[{page:"home",label:"Overview",icon:"home"},{page:"analytics",label:"Analytics",icon:"chart"},{page:"leaderboard",label:"Leaderboard",icon:"crown"}]},
 {key:"appearance",group:"CUSTOMIZE",label:"Appearance",icon:"palette",tabs:[{page:"appearance",label:"Appearance",icon:"palette"}]},
 {key:"profile",group:"CUSTOMIZE",label:"Profile",icon:"user",tabs:[{page:"profile-main",label:"Profile",icon:"user"},{page:"profile-appearance",label:"Appearance",icon:"palette"},{page:"profile-experience",label:"Experience",icon:"sparkles"},{page:"profile-integrations",label:"Integrations",icon:"link"},{page:"profile-switches",label:"Switches",icon:"eye"}]},
 {key:"layout",group:"CUSTOMIZE",label:"Layout",icon:"layout",tabs:[{page:"layout",label:"Layout",icon:"layout"}]},
 {key:"portfolio",group:"CUSTOMIZE",label:"Portfolio",icon:"layers",tabs:[{page:"portfolio-general",label:"General",icon:"sliders"},{page:"portfolio-about",label:"About",icon:"user"},{page:"portfolio-projects",label:"Projects",icon:"layers"},{page:"portfolio-gallery",label:"Gallery",icon:"image"},{page:"portfolio-audio",label:"Audio player",icon:"music"},{page:"portfolio-interests",label:"Interests",icon:"gamepad"},{page:"portfolio-design",label:"Design",icon:"palette"}]},
 {key:"importer",group:"CUSTOMIZE",label:"Importer",icon:"upload",tabs:[{page:"assets",label:"Media library",icon:"image"}]},
 {key:"links",group:"CUSTOMIZE",label:"Social Links",icon:"link",tabs:[{page:"links",label:"Links",icon:"link"}]},
 {key:"widgets",group:"CUSTOMIZE",label:"Widgets",icon:"grid",tabs:[{page:"widgets",label:"Widgets",icon:"grid"}]},
 {key:"templates",group:"ASSETS",label:"Templates",icon:"grid",tabs:[{page:"templates",label:"Templates",icon:"grid"}]},
 {key:"badges",group:"ASSETS",label:"Badges",icon:"shield",tabs:[{page:"badges",label:"Badges",icon:"shield"}]},
 {key:"inventory",group:"ASSETS",label:"Inventory",icon:"layers",tabs:[{page:"aliases",label:"Inventory",icon:"layers"}]},
 {key:"settings",group:"ACCOUNT",label:"Settings",icon:"settings",tabs:[{page:"settings",label:"Account",icon:"settings"},{page:"theme",label:"Console theme",icon:"palette"},{page:"affiliates",label:"Affiliates",icon:"users"}]},
 {key:"billing",group:"ACCOUNT",label:"Premium",icon:"crown",tabs:[{page:"billing",label:"Plan & billing",icon:"crown"},{page:"premium",label:"Premium",icon:"star"}]},
 {key:"support",group:"ACCOUNT",label:"Support",icon:"help",tabs:[{page:"support",label:"Tickets",icon:"help"}]},
];

/** Pages that exist but are reached from inside another place. */
const OWNER: Partial<Record<Page, string>> = {
  "account-profile": "profile",
  "customize-profile": "appearance",
  assets: "importer",
  effects: "appearance",
  music: "portfolio",
  "portfolio-sections": "portfolio",
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
