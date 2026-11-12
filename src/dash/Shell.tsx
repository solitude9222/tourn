/* ---------------------------------------------------------------------------
   Dashboard shell — sidebar, breadcrumb, page header, tabs, unsaved-changes
   bar and toasts. The nav structure and measurements follow the reference.
   --------------------------------------------------------------------------- */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../lib/auth";
import { forgetAccount, loadAccounts, switchSession, type StoredAccount } from "../lib/accounts";
import { useDash, type Page, type ProfileTab, type TabDef } from "./context";
import { Button, Icon, IconButton, type IconName } from "./ui";

type NavChild = { page: Page; tab?: ProfileTab; label: string; icon: IconName };
type NavGroup = {
  key: "account" | "customize" | "links" | "community" | "settings";
  label: string;
  icon: IconName;
  children: NavChild[];
};

const GROUPS: NavGroup[] = [
  {
    key: "account",
    label: "Account",
    icon: "users",
    children: [
      { page: "account-profile", label: "Profile", icon: "user" },
      { page: "badges", label: "Badges", icon: "shield" },
      { page: "aliases", label: "Aliases", icon: "link" },
      { page: "affiliates", label: "Affiliates", icon: "link" },
      { page: "analytics", label: "Analytics", icon: "chart" },
    ],
  },
  {
    key: "customize",
    label: "Customize",
    icon: "palette",
    children: [
      { page: "customize-profile", tab: "profile", label: "Profile", icon: "user" },
      { page: "layout", label: "Card", icon: "layout" },
      { page: "effects", label: "Effects", icon: "sparkles" },
      { page: "music", label: "Music", icon: "music" },
    ],
  },
  {
    key: "links",
    label: "Links",
    icon: "link",
    children: [
      { page: "links", label: "Social Links", icon: "link" },
      { page: "widgets", label: "Widgets", icon: "grid" },
    ],
  },
  {
    key: "community",
    label: "Community",
    icon: "users",
    children: [
      { page: "assets", label: "Assets", icon: "image" },
      { page: "leaderboard", label: "Leaderboard", icon: "chart" },
      { page: "templates", label: "Templates", icon: "grid" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: "settings",
    children: [
      { page: "billing", label: "Billing", icon: "crown" },
      { page: "settings", label: "Account Settings", icon: "settings" },
    ],
  },
];

const PAGE_GROUP: Partial<Record<Page, NavGroup["key"]>> = {
  "account-profile": "account",
  badges: "account",
  affiliates: "account",
  aliases: "account",
  analytics: "account",
  "customize-profile": "customize",
  layout: "customize",
  effects: "customize",
  music: "customize",
  links: "links",
  widgets: "links",
  assets: "community",
  leaderboard: "community",
  templates: "community",
  billing: "settings",
  settings: "settings",
  admin: "settings",
};

const PREMIUM_ITEM: NavChild = { page: "premium", label: "Premium", icon: "star" };

export type ShellProps = {
  page: Page;
  onNavigate: (page: Page, tab?: ProfileTab) => void;
  title: string;
  subtitle: string;
  icon: IconName;
  crumb: string;
  breadcrumbLabel?: string;
  actions?: ReactNode;
  tabs?: TabDef[];
  activeTab?: string;
  onTab?: (id: string) => void;
  onAddAccount?: () => void;
  onSignOut?: () => void;
  children: ReactNode;
};

export function Shell({
  page,
  onNavigate,
  title,
  subtitle,
  icon,
  crumb,
  breadcrumbLabel,
  actions,
  tabs,
  activeTab,
  onTab,
  onAddAccount,
  onSignOut,
  children,
}: ShellProps) {
  const { user, about, settings, dirty, save, discard, isPremium, isAdmin, profileViews, go, notify } =
    useDash();
  const { accounts, retryAuth } = useAuth();
  const [openGroups, setOpenGroups] = useState<NavGroup["key"][]>(() => [
    PAGE_GROUP[page] ?? "account",
  ]);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notes, setNotes] = useState(false);
  const [saved, setSaved] = useState<StoredAccount[]>(() => loadAccounts());
  const [switching, setSwitching] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = about.displayName.trim() || user.username;
  const avatarUrl = (about.assets.avatarUrl || user.avatarUrl || "").trim();
  const ownGroup = PAGE_GROUP[page];

  useEffect(() => {
    if (ownGroup) setOpenGroups([ownGroup]);
  }, [ownGroup]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setMobileOpen(false);
  }, [page]);

  useEffect(() => {
    setSaved(loadAccounts());
  }, [accounts, user.id, menuOpen]);

  const switchTo = async (entry: StoredAccount) => {
    if (entry.id === user.id) {
      setMenuOpen(false);
      return;
    }
    setSwitching(entry.id);
    const result = await switchSession(entry.ticket);
    if (result.ok) {
      setMenuOpen(false);
      await retryAuth();
      setSwitching(null);
      return;
    }
    // The saved pass expired: forget it so the menu stops offering a dead row.
    setSaved(forgetAccount(entry.id));
    setSwitching(null);
    notify("Could not switch", "That saved session expired — add the account again.");
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const toggleGroup = (key: NavGroup["key"]) => {
    setOpenGroups((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [key],
    );
  };

  const searching = query.trim().length > 0;

  const matches = (label: string) => label.toLowerCase().includes(query.trim().toLowerCase());

  const isChildActive = (child: NavChild) =>
    child.page === page && (child.tab ? child.tab === activeTab : true);

  const showSectionCrumb = crumb !== (breadcrumbLabel ?? title);

  const groups = useMemo(() => GROUPS, []);

  return (
    <div className={`tw-dash${mobileOpen ? " is-menu-open" : ""}`}>
      <aside className="tw-rail" aria-label="Dashboard navigation">
        <a className="tw-brand" href="#/" aria-label="tourn.lol home">
          <img src="/logo.png" alt="" width={37} height={37} />
          <span className="tw-brand-text">
            tourn<i>.</i>lol
          </span>
        </a>

        <label className="tw-search">
          <Icon name="search" size={16} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="search dashboard..."
            aria-label="Search dashboard"
          />
        </label>

        <div className="tw-rail-scroll">
          <nav className="tw-nav" aria-label="Dashboard">
            <button
              type="button"
              className={`tw-nav-item${page === "home" ? " is-active" : ""}`}
              onClick={() => onNavigate("home")}
              aria-current={page === "home" ? "page" : undefined}
            >
              <Icon name="home" size={18} />
              Home
            </button>

            {groups.map((group) => {
              const children = group.children.filter((child) => !searching || matches(child.label));
              if (searching && !children.length) return null;
              const open = searching || openGroups.includes(group.key);
              return (
                <div key={group.key}>
                  <button
                    type="button"
                    className="tw-group-head"
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={open}
                  >
                    <Icon name={group.icon} size={18} />
                    {group.label}
                    <Icon name="chevron-down" size={14} className="tw-chevron" />
                  </button>
                  <div
                    className={`tw-group-body${open ? " is-open" : ""}`}
                    role="group"
                    aria-label={group.label}
                    inert={!open}
                  >
                    <div className="tw-group-inner">
                      {children.map((child) => (
                        <button
                          key={`${child.page}-${child.tab ?? child.label}`}
                          type="button"
                          className={`tw-subnav${isChildActive(child) ? " is-active" : ""}`}
                          onClick={() => onNavigate(child.page, child.tab)}
                        >
                          <Icon name={child.icon} size={16} />
                          {child.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {isAdmin && (!searching || matches("Admin")) ? (
              <button
                type="button"
                className={`tw-nav-item${page === "admin" ? " is-active" : ""}`}
                onClick={() => onNavigate("admin")}
              >
                <Icon name="shield" size={18} />
                Admin
              </button>
            ) : null}

            {!searching || matches(PREMIUM_ITEM.label) ? (
              <button
                type="button"
                className={`tw-nav-item${page === "premium" ? " is-active" : ""}`}
                onClick={() => onNavigate("premium")}
              >
                <Icon name="star" size={18} />
                Premium
              </button>
            ) : null}

          </nav>
        </div>

        <div className="tw-rail-foot">
          <button
            type="button"
            className={`tw-premium-card${isPremium ? " is-active" : ""}`}
            onClick={() => go(isPremium ? "billing" : "premium")}
          >
            <span className="tw-premium-icon">
              <img src="/badges/icons/norm/premium.svg" alt="" width={18} height={18} />
            </span>
            <span className="tw-premium-copy">
              <b>{isPremium ? "Premium active" : "Upgrade to Premium"}</b>
              <small>{isPremium ? "Manage your plan" : "Unlock every extra"}</small>
            </span>
            <Icon name="chevron-right" size={14} className="tw-premium-chev" />
          </button>

          <div className="tw-user" ref={menuRef}>
            {menuOpen ? (
              <div className="tw-user-pop" role="menu" aria-label="Account menu">
                <div className="tw-user-pop-head">
                  <small>Signed in as</small>
                  <b>@{user.username}</b>
                </div>

                <div className="tw-user-pop-list">
                  {saved
                    .filter((entry) => entry.id !== user.id)
                    .map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        role="menuitem"
                        className="tw-account-row"
                        disabled={switching === entry.id}
                        onClick={() => void switchTo(entry)}
                      >
                        <span className="tw-account-avatar">
                          {entry.avatarUrl ? (
                            <img src={entry.avatarUrl} alt="" />
                          ) : (
                            entry.username.slice(0, 1).toUpperCase()
                          )}
                        </span>
                        <span className="tw-account-copy">
                          <b>{entry.name || entry.username}</b>
                          <small>
                            {switching === entry.id ? "Switching…" : `@${entry.username}`}
                          </small>
                        </span>
                        <Icon name="chevron-right" size={13} />
                      </button>
                    ))}

                  <button
                    type="button"
                    role="menuitem"
                    className="tw-account-add"
                    onClick={() => {
                      setMenuOpen(false);
                      onAddAccount?.();
                    }}
                  >
                    <span className="tw-account-add-icon">
                      <Icon name="plus" size={14} />
                    </span>
                    <span>
                      <b>Add another account</b>
                      <small>Signed-in accounts stay one click away</small>
                    </span>
                  </button>
                </div>

                <div className="tw-user-pop-actions">
                  <a
                    role="menuitem"
                    href={`/${encodeURIComponent(user.username)}`}
                    className="tw-user-pop-item"
                  >
                    <Icon name="eye" size={14} />
                    View public page
                    <Icon name="external" size={12} />
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    className="tw-user-pop-item"
                    onClick={() => {
                      setMenuOpen(false);
                      go("settings");
                    }}
                  >
                    <Icon name="settings" size={14} />
                    Account settings
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="tw-user-pop-item"
                    onClick={() => {
                      setMenuOpen(false);
                      go("billing");
                    }}
                  >
                    <Icon name="crown" size={14} />
                    Billing
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="tw-user-pop-item tw-user-pop-item--danger"
                    onClick={() => {
                      setMenuOpen(false);
                      onSignOut?.();
                    }}
                  >
                    <Icon name="logout" size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            ) : null}

            <div className="tw-user-foot">
              <button
                type="button"
                className="tw-user-row"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="tw-avatar">
                  {avatarUrl ? <img src={avatarUrl} alt="" /> : displayName.slice(0, 1).toUpperCase()}
                  <i className={settings.discordUserId ? "is-on" : ""} />
                </span>
                <span className="tw-user-meta">
                  <b>{displayName}</b>
                  <small>@{user.username}</small>
                </span>
                <Icon name="chevron-down" size={14} className="tw-chevron" />
              </button>

              <button
                type="button"
                className="tw-user-bell"
                aria-label="Notifications"
                aria-expanded={notes}
                onClick={() => setNotes((open) => !open)}
              >
                <Icon name="bell" size={15} />
              </button>
            </div>

            {notes ? (
              <div className="tw-note-pop" role="status">
                <b>No new notifications</b>
                <small>{profileViews ?? 0} profile views so far.</small>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="tw-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <button
        type="button"
        className={`tw-menu-fab${mobileOpen ? " is-open" : ""}`}
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={mobileOpen}
      >
        <Icon name={mobileOpen ? "x" : "layout"} size={16} />
        Menu
      </button>

      <main className="tw-main">
        <div className="tw-topline">
          <div className="tw-crumbs" aria-label="Breadcrumb">
            <button
              type="button"
              className="tw-crumb-home"
              onClick={() => onNavigate("home")}
              aria-label="Dashboard home"
            >
              <Icon name="home" size={14} />
            </button>
            <Icon name="chevron-right" size={12} className="tw-crumb-sep" />
            {showSectionCrumb ? (
              <>
                <span>{crumb}</span>
                <Icon name="chevron-right" size={12} className="tw-crumb-sep" />
              </>
            ) : null}
            <b>{breadcrumbLabel ?? title}</b>
          </div>

          <div className="tw-row">
            {actions}
            <a
              className="tw-eye-btn"
              href={`/${encodeURIComponent(user.username)}`}
              aria-label="Preview profile"
              title="Preview profile"
            >
              <Icon name="eye" size={16} />
            </a>
          </div>
        </div>

        <header className="tw-page-head">
          <div className="tw-page-copy">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </header>

        {tabs && activeTab && onTab ? (
          <div className="tw-tabs" role="tablist" aria-label={`${title} sections`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tab.id === activeTab}
                className={`tw-tab${tab.id === activeTab ? " is-active" : ""}`}
                onClick={() => onTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        <div key={`${page}-${activeTab ?? ""}`}>{children}</div>
      </main>

      {dirty ? (
        <div className="tw-unsaved" role="status" aria-live="polite">
          <span className="tw-unsaved-icon">
            <Icon name="save" size={22} />
          </span>
          <span className="tw-unsaved-copy">
            <b>Unsaved Changes</b>
            <small>Save or discard your changes</small>
          </span>
          <Button onClick={discard}>Discard</Button>
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        </div>
      ) : null}

      <Toasts />
    </div>
  );
}

/* ------------------------------------------------------------------ toasts */

function Toasts() {
  const [items, setItems] = useState<{ id: number; title: string; message: string }[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<{ title: string; message: string }>).detail;
      if (!detail) return;
      const id = Date.now() + Math.random();
      setItems((current) => [...current.filter((item) => item.title !== detail.title || item.message !== detail.message), { id, ...detail }].slice(-3));
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== id));
      }, 4200);
    };
    window.addEventListener("tourn:toast", onToast);
    return () => window.removeEventListener("tourn:toast", onToast);
  }, []);

  return (
    <div className="tw-toasts" aria-live="polite" aria-atomic="false">
      {items.map((item) => (
        <div className="tw-toast" key={item.id}>
          <span className="tw-toast-icon">
            <Icon name="check" size={13} />
          </span>
          <span>
            <b>{item.title}</b>
            <small>{item.message}</small>
          </span>
          <IconButton
            label="Dismiss"
            icon="x"
            variant="plain"
            onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}
          />
        </div>
      ))}
    </div>
  );
}
