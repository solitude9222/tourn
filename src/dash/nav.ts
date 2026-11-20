/* ---------------------------------------------------------------------------
   Dashboard navigation model.

   One flat list of top-level places. Everything below a place is a subtab, and
   each subtab is a real page id, so the URL, the page header tabs and the
   sidebar all read from this one table.
   --------------------------------------------------------------------------- */

import type { Page } from "./context";
import type { IconName } from "./ui";

export type NavTab = { page: Page; label: string; icon: IconName };

export type NavGroup = "OVERVIEW" | "PROFILE" | "CONTENT" | "LIBRARY" | "ACCOUNT";

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
 {key:"dashboard",group:"OVERVIEW",label:"Home",icon:"home",tabs:[{page:"home",label:"Overview",icon:"home"}]},
 {key:"analytics",group:"OVERVIEW",label:"Analytics",icon:"chart",tabs:[{page:"analytics",label:"Analytics",icon:"chart"}]},
 {key:"leaderboard",group:"OVERVIEW",label:"Leaderboard",icon:"crown",tabs:[{page:"leaderboard",label:"Leaderboard",icon:"crown"}]},
 {key:"profile",group:"PROFILE",label:"Profile",icon:"user",tabs:[{page:"profile-main",label:"Details",icon:"user"},{page:"profile-appearance",label:"Card",icon:"palette"},{page:"profile-experience",label:"Entry screen",icon:"sparkles"},{page:"profile-switches",label:"Visibility",icon:"eye"}]},
 {key:"appearance",group:"PROFILE",label:"Media & fonts",icon:"image",tabs:[{page:"appearance",label:"Media & fonts",icon:"image"}]},
 {key:"effects",group:"PROFILE",label:"Decorations",icon:"sparkles",tabs:[{page:"effects",label:"All effects",icon:"sparkles"}]},
 {key:"layout",group:"PROFILE",label:"Layout",icon:"layout",tabs:[{page:"layout",label:"Layout",icon:"layout"}]},
 {key:"portfolio",group:"CONTENT",label:"Portfolio",icon:"layers",tabs:[{page:"portfolio-general",label:"General",icon:"sliders"},{page:"portfolio-about",label:"About",icon:"user"},{page:"portfolio-projects",label:"Projects",icon:"layers"},{page:"portfolio-gallery",label:"Gallery",icon:"image"},{page:"portfolio-interests",label:"Interests",icon:"gamepad"}]},
 {key:"links",group:"CONTENT",label:"Social links",icon:"link",tabs:[{page:"links",label:"Links",icon:"link"}]},
 {key:"widgets",group:"CONTENT",label:"Widgets",icon:"grid",tabs:[{page:"widgets",label:"Widgets",icon:"grid"}]},
 {key:"importer",group:"LIBRARY",label:"Uploads",icon:"upload",tabs:[{page:"assets",label:"Media library",icon:"image"}]},
 {key:"templates",group:"LIBRARY",label:"Templates",icon:"grid",tabs:[{page:"templates",label:"Templates",icon:"grid"}]},
 {key:"inventory",group:"LIBRARY",label:"Inventory",icon:"layers",tabs:[{page:"aliases",label:"Owned items",icon:"layers"}]},
 {key:"badges",group:"LIBRARY",label:"Badges",icon:"shield",tabs:[{page:"badges",label:"Badges",icon:"shield"}]},
 {key:"settings",group:"ACCOUNT",label:"Settings",icon:"settings",tabs:[{page:"settings",label:"Account",icon:"settings"},{page:"theme",label:"Console theme",icon:"palette"},{page:"affiliates",label:"Addresses",icon:"users"}]},
 {key:"billing",group:"ACCOUNT",label:"Premium",icon:"crown",tabs:[{page:"billing",label:"Plan & billing",icon:"crown"},{page:"premium",label:"Features",icon:"star"}]},
 {key:"support",group:"ACCOUNT",label:"Support",icon:"help",tabs:[{page:"support",label:"Tickets",icon:"help"}]},
];

/** Pages that exist but are reached from inside another place. */
const OWNER: Partial<Record<Page, string>> = {
  "account-profile": "profile",
  "customize-profile": "profile",
  assets: "importer",
  effects: "effects",
  music: "appearance",
  "portfolio-audio": "appearance",
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
export type RailEntry={label:string;icon:IconName;page:Page;navKey?:string;adminOnly?:boolean};
export type RailSection={key:string;label:string;icon:IconName;items:RailEntry[]};
/** Six entry points; page tabs remain owned by NAV. */
export const RAIL_SECTIONS:RailSection[]=[
 {key:'home',label:'Home',icon:'home',items:[{label:'Home',icon:'home',page:'home'}]},
 {key:'customize',label:'Customize',icon:'palette',items:[{label:'Appearance',icon:'palette',page:'appearance',navKey:'appearance'},{label:'Profile',icon:'user',page:'profile-main',navKey:'profile'},{label:'Layout',icon:'layers',page:'layout',navKey:'layout'},{label:'Portfolio',icon:'layers',page:'portfolio-general',navKey:'portfolio'},{label:'Importer',icon:'upload',page:'assets'},{label:'Social Links',icon:'link',page:'links',navKey:'links'},{label:'Widgets',icon:'grid',page:'widgets',navKey:'widgets'},{label:'Decorations',icon:'sparkles',page:'effects',navKey:'effects'}]},
 {key:'premium',label:'Premium',icon:'star',items:[{label:'Overview',icon:'star',page:'premium'},{label:'Plan & billing',icon:'crown',page:'billing'}]},
 {key:'assets',label:'Assets',icon:'layers',items:[{label:'Templates',icon:'grid',page:'templates'},{label:'Inventory',icon:'layers',page:'aliases'}]},
 {key:'image-host',label:'Image Host',icon:'image',items:[{label:'Uploads',icon:'upload',page:'assets'},{label:'Gallery',icon:'image',page:'portfolio-gallery'}]},
 {key:'account',label:'Account',icon:'user',items:[{label:'Settings',icon:'settings',page:'settings',navKey:'settings'},{label:'Badges',icon:'shield',page:'badges'},{label:'Analytics',icon:'chart',page:'analytics'},{label:'Leaderboard',icon:'crown',page:'leaderboard'},{label:'Support',icon:'help',page:'support'},{label:'Admin',icon:'shield',page:'admin',adminOnly:true}]}
];
export function railEntryOwns(entry:RailEntry,page:Page){return entry.page===page||Boolean(entry.navKey&&NAV.find(item=>item.key===entry.navKey)?.tabs.some(tab=>tab.page===page));}
export function railSectionForPage(page:Page){return RAIL_SECTIONS.find(section=>section.items.some(entry=>railEntryOwns(entry,page)));}
