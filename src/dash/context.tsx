/* ---------------------------------------------------------------------------
   Dashboard context — the single place a page reads live account data from
   and writes drafts back to. Every write stays in the existing stores; pages
   never keep their own copy of the profile.
   --------------------------------------------------------------------------- */

import { createContext, useContext } from "react";
import type { Account } from "../lib/auth";
import type { About } from "../lib/about";
import type { WidgetStore } from "../lib/widgets";
import type { BadgeStore } from "../lib/badges";
import type { LinkStore } from "../lib/links";
import type { Settings } from "../config";
import type { IconName } from "./ui";

export type Page =
  | "home"
  | "account-profile"
  | "badges"
  | "affiliates"
  | "analytics"
  | "customize-profile"
  | "layout"
  | "effects"
  | "music"
  | "premium"
  | "links"
  | "widgets"
  | "assets"
  | "templates"
  | "leaderboard"
  | "billing"
  | "settings"
  | "admin";

export type ProfileTab = "profile" | "experience" | "integrations" | "switches";

export type TabDef = { id: string; label: string; icon: IconName };

export type ToastItem = { id: number; title: string; message: string };

export type DashContextValue = {
  user: Account;
  about: About;
  widgets: WidgetStore;
  badges: BadgeStore;
  links: LinkStore;
  settings: Settings;
  isPremium: boolean;
  isAdmin: boolean;
  earned: string[];
  profileViews: number | null;
  dirty: boolean;
  setAbout: (updater: (current: About) => About) => void;
  setWidgets: (updater: (current: WidgetStore) => WidgetStore) => void;
  setBadges: (updater: (current: BadgeStore) => BadgeStore) => void;
  setLinks: (updater: (current: LinkStore) => LinkStore) => void;
  save: () => void;
  discard: () => void;
  notify: (title: string, message: string) => void;
  go: (page: Page, tab?: ProfileTab, section?: string) => void;
  profileTab: ProfileTab;
  setProfileTab: (tab: ProfileTab) => void;
};

export const DashContext = createContext<DashContextValue | null>(null);

export function useDash(): DashContextValue {
  const value = useContext(DashContext);
  if (!value) throw new Error("useDash must be used inside the dashboard provider");
  return value;
}
