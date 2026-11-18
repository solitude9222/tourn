/* ---------------------------------------------------------------------------
   Dashboard shell — sidebar, breadcrumb, page header, tabs, unsaved-changes
   bar and toasts. The nav structure and measurements follow the reference.
   --------------------------------------------------------------------------- */

import { useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { accountUid, useAuth } from "../lib/auth";
import { forgetAccount, loadAccounts, switchSession, type StoredAccount } from "../lib/accounts";
import { useDash, type Page, type ProfileTab, type TabDef } from "./context";
import { Button, Icon, IconButton, navigateTabs, type IconName } from "./ui";
import { api, post } from "../lib/backend";
import { TradeThread } from "./Trades";
import { useDashTheme, useDashAccent, accentForeground } from "./theme";

import { NAV, navHome } from "./nav";
import { AliasRequiredGate } from "./AliasGate";

type ShellTrade = {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender_username: string;
  recipient_username: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  item_count: number;
};

/* Navigation lives in ./nav so the sidebar and the page tabs agree. */

const READ_KEY = "tourn.lol/notes-read";

function loadRead(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(READ_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, 200) : [];
  } catch {
    return [];
  }
}

/* A short two-note ping for new notifications. Synthesised, so there is no
   audio file to load and no autoplay permission to ask for. */
let audioContext: AudioContext | null = null;
function ping() {
  try {
    audioContext ??= new AudioContext();
    const context = audioContext;
    if (context.state === "suspended") void context.resume();
    const at = context.currentTime;
    [880, 1320].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, at + index * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.09, at + index * 0.09 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + index * 0.09 + 0.16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at + index * 0.09);
      oscillator.stop(at + index * 0.09 + 0.18);
    });
  } catch {
    // Audio is a nicety; a blocked context must never break notifications.
  }
}

export type ShellProps = {
  page: Page;
  onNavigate: (page: Page, tab?: ProfileTab) => void;
  /** Warm the next page's chunk before the click commits. */
  onPrefetchPage?: (page: Page) => void;
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
  onPrefetchPage,
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
  useEffect(() => { document.title = `tourn | ${title}`; }, [title]);
  const { user, about, settings, dirty, save, discard, undo, redo, isPremium, isAdmin, profileViews, go, notify } =
    useDash();
  const { accounts, retryAuth } = useAuth();
  useDashTheme();
  const [accent] = useDashAccent();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const [menuOpen, setMenuVisible] = useState(false);
  const [menuClosing,setMenuClosing]=useState(false);
  const closeMenuTimer=useRef<number|undefined>(undefined);
  const setMenuOpen=(next:boolean|((value:boolean)=>boolean))=>{const open=typeof next==="function"?next(menuOpen):next;clearTimeout(closeMenuTimer.current);if(open){setMenuClosing(false);setMenuVisible(true);}else{setMenuVisible(false);setMenuClosing(true);closeMenuTimer.current=window.setTimeout(()=>setMenuClosing(false),180);}};
  useEffect(()=>()=>clearTimeout(closeMenuTimer.current),[]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notes, setNotes] = useState(false);
  const [trades, setTrades] = useState<ShellTrade[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [saved, setSaved] = useState<StoredAccount[]>(() => loadAccounts());
  const [switching, setSwitching] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<string[]>(() => loadRead());
  const menuRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef<Set<string> | null>(null);

  const displayName = about.displayName.trim() || user.alias?.trim() || user.username;
  const avatarUrl = (about.assets.avatarUrl || user.avatarUrl || "").trim();
  const navItems = NAV.filter((item) => !item.adminOnly || isAdmin);

  const loadTrades = async () => {
    const result = await api<{ trades: ShellTrade[] }>("/api/trades");
    if (result.ok) setTrades(result.data.trades);
  };

  const answerTrade = async (id: string, accept: boolean) => {
    const result = await post(`/api/trades/${id}/respond`, { accept });
    if (result.ok) {
      notify(
        accept ? "Trade accepted" : "Trade declined",
        accept ? "The items moved to their new owners." : "Nothing changed hands.",
      );
    }
    await loadTrades();
    retryAuth();
  };

  const incoming = trades.filter((trade) => trade.status === "pending" && trade.recipient_id === user.id);
  const unread = incoming.filter((trade) => !readIds.includes(trade.id));

  // Poll while the dashboard is open so a trade lands without a refresh, and
  // ping once per genuinely new request.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const result = await api<{ trades: ShellTrade[] }>("/api/trades");
      if (!alive || !result.ok) return;
      const fresh = result.data.trades.filter((trade) => trade.status === "pending" && trade.recipient_id === user.id);
      if (seenRef.current) {
        const isNew = fresh.some((trade) => !seenRef.current?.has(trade.id));
        if (isNew) ping();
      }
      seenRef.current = new Set(fresh.map((trade) => trade.id));
      setTrades(result.data.trades);
    };
    if (notes) {
      void tick();
      return () => {
        alive = false;
      };
    }
    void tick();
    const timer = window.setInterval(() => void tick(), 25_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [notes, user.id]);

  // Mark everything in the panel as read once it has been opened.
  useEffect(() => {
    if (!notes || !incoming.length) return;
    setReadIds((current) => {
      const next = [...new Set([...current, ...incoming.map((trade) => trade.id)])].slice(-200);
      try {
        localStorage.setItem(READ_KEY, JSON.stringify(next));
      } catch {
        // Private mode: reading state just will not survive a reload.
      }
      return next;
    });
  }, [notes, trades]);

  useEffect(() => {
    if (!notes) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (notesRef.current?.contains(event.target as Node)) return;
      if (target?.closest?.(".tw-user-bell")) return;
      setNotes(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotes(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [notes]);

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

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "k") { event.preventDefault(); setMobileOpen(true); searchRef.current?.focus(); }
      if (event.key.toLowerCase() === "s") { event.preventDefault(); if (dirty) save(); }
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable=true]")) return;
      if (event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      if (event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [save, dirty, undo, redo]);

  const searching = query.trim().length > 0;

  const matches = (label: string) => label.toLowerCase().includes(query.trim().toLowerCase());

  const showSectionCrumb = crumb !== (breadcrumbLabel ?? title);

  return (
    <div className={`tw-dash${mobileOpen ? " is-menu-open" : ""}`} style={accent ? { "--accent": accent, "--accent-on": accentForeground(accent), "--accent-bright": accent, "--accent-text": accent, "--accent-soft": `color-mix(in srgb, ${accent} 16%, var(--page))`, "--accent-border": `color-mix(in srgb, ${accent} 45%, var(--border))` } as CSSProperties : undefined}>
      <aside className="tw-rail" aria-label="Dashboard navigation">
        <a className="tw-brand" href="#/" aria-label="tourn.lol home">
          <img src="/brand/tourn-mark.svg" alt="" width={37} height={37} />
          <span className="tw-brand-text">
            tourn<i>.</i>lol
          </span>
        </a>

        <label className="tw-search">
          <Icon name="search" size={16} />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search dashboard"
          />
          <kbd>Ctrl K</kbd>
        </label>

        <div className="tw-rail-scroll">
          <nav className="tw-nav" aria-label="Dashboard">
            {navItems.map((item, index) => {
              const active = item.tabs.some((tab) => tab.page === page);
              const heading = item.group && item.group !== navItems[index - 1]?.group ? item.group : null;
              const tabs = item.tabs.filter(
                (tab) => !searching || matches(item.label) || matches(tab.label),
              );
              if (searching && !tabs.length) return null;
              return (
                <div className="tw-nav-block" key={item.key}>
                  {heading ? <div className="tw-nav-group">{heading}</div> : null}
                  <button
                    type="button"
                    className={`tw-nav-item${active ? " is-active" : ""}`}
                    onClick={() => onNavigate(searching ? tabs[0].page : navHome(item))}
                    onPointerEnter={() => onPrefetchPage?.(navHome(item))}
                    onFocus={() => onPrefetchPage?.(navHome(item))}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon name={item.icon} size={18} className="tw-nav-symbol" />
                    {item.label}
                  </button>
                  {searching ? tabs.map(tab => <button className="tw-nav-search-result" type="button" key={tab.page} onClick={() => { onNavigate(tab.page); setQuery(""); }}><Icon name={tab.icon} size={14} />{tab.label}</button>) : null}
                </div>
              );
            })}
            {searching && !navItems.some(item => matches(item.label) || item.tabs.some(tab => matches(tab.label))) ? <p className="tw-foot-note" role="status">No matching settings. Try “Audio”, “Card”, or “Links”.</p> : null}
          </nav>
        </div>

        <div className="tw-rail-foot">
          <button
            type="button"
            className={`tw-premium-card${isPremium ? " is-active" : ""}`}
            onClick={() => go(isPremium ? "billing" : "premium")}
          >
            <span className="tw-premium-icon">
              <img src="/badges/v2/still/premium.svg" alt="" width={18} height={18} />
            </span>
            <span className="tw-premium-copy">
              <b>{isPremium ? "Premium active" : "Upgrade to Premium"}</b>
              <small>{isPremium ? "Manage your plan" : "Unlock exclusive features"}</small>
            </span>
            <Icon name="chevron-right" size={14} className="tw-premium-chev" />
          </button>

          <div className="tw-user" ref={menuRef}>
            {menuOpen || menuClosing ? (
              <div className={`tw-user-pop${menuClosing?" is-closing":""}`} role="menu" aria-label="Account menu" aria-hidden={!menuOpen}>
                <div className="tw-user-pop-head"><div><b>Your accounts</b><small>Signed in on this browser</small></div><span className="tw-account-count">{new Set([user.id,...saved.map(account=>account.id)]).size}</span></div>
                <div className="tw-user-pop-list"><div className="tw-current-account"><span className="tw-account-avatar">{avatarUrl?<img src={avatarUrl} alt=""/>:displayName.slice(0,1).toUpperCase()}</span><span className="tw-account-copy"><b>{displayName}</b><small>Current</small></span><IconButton label="Sign out of current account" icon="logout" onClick={()=>{setMenuOpen(false);onSignOut?.();}}/></div>
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

                <div className="tw-user-pop-actions"><button type="button" role="menuitem" className="tw-user-pop-item" onClick={()=>{const url=window.location.origin+"/"+encodeURIComponent(user.username);void navigator.clipboard.writeText(url).then(()=>notify("Profile link","Copied to clipboard.")).catch(()=>notify("Profile link",url));}}><Icon name="share" size={14}/>Share profile</button><a role="menuitem" className="tw-user-pop-item" href="https://discord.gg/a9uwptuepD" target="_blank" rel="noreferrer"><Icon name="link" size={14}/>Discord server</a>
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
                  <small>ID {accountUid(user)}</small>
                </span>
                <span className="tw-account-more" aria-hidden="true">•••</span>
              </button>

              <button
                type="button"
                className={`tw-user-bell${unread.length ? " is-on" : ""}`}
                aria-label={unread.length ? `Notifications, ${unread.length} unread` : "Notifications"}
                aria-expanded={notes}
                onClick={() => setNotes((open) => !open)}
              >
                <Icon name="bell" size={15} />
                {unread.length ? <i className="tw-bell-dot" /> : null}
              </button>
            </div>

            {notes ? (
              <div className="tw-note-pop" role="dialog" aria-label="Notifications" ref={notesRef}>
                <header className="tw-note-head">
                  <b>Notifications</b>
                  <small>{unread.length ? `${unread.length} new` : "All caught up"}</small>
                </header>
                <div className="tw-note-stack">
                  {trades.slice(0, 8).map((trade) => {
                    const waiting = trade.status === "pending" && trade.recipient_id === user.id;
                    const isNew = waiting && !readIds.includes(trade.id);
                    return (
                      <div className={`tw-note-bar${isNew ? " is-new" : ""}`} key={trade.id}>
                        <span className={`tw-note-mark${waiting ? " is-waiting" : ""}`} aria-hidden="true">
                          <Icon name={waiting ? "bell" : "check"} size={12} />
                        </span>
                        <span className="tw-note-copy">
                          <b>
                            @{trade.sender_username} · {trade.item_count} item{trade.item_count === 1 ? "" : "s"}
                          </b>
                          <small>{waiting ? "wants to trade" : trade.status}</small>
                        </span>
                        <span className="tw-note-actions">
                          {waiting ? (
                            <>
                              <button
                                type="button"
                                className="tw-note-act is-yes"
                                aria-label="Accept trade"
                                onClick={() => void answerTrade(trade.id, true)}
                              >
                                <Icon name="check" size={12} />
                              </button>
                              <button
                                type="button"
                                className="tw-note-act"
                                aria-label="Decline trade"
                                onClick={() => void answerTrade(trade.id, false)}
                              >
                                <Icon name="x" size={12} />
                              </button>
                            </>
                          ) : null}
                          <button type="button" className="tw-note-open" onClick={() => setThreadId(trade.id)}>
                            Open
                          </button>
                        </span>
                      </div>
                    );
                  })}
                  {!trades.length ? <p className="tw-note-empty">Nothing here yet.</p> : null}
                </div>
                <footer className="tw-note-foot">
                  <small>{profileViews ?? 0} profile views</small>
                  <button type="button" className="tw-note-clear" onClick={() => setNotes(false)}>
                    Close
                  </button>
                </footer>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <TradeThread open={Boolean(threadId)} tradeId={threadId} onClose={() => setThreadId(null)} onChanged={() => void loadTrades()} />

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

      <a className="tw-skip-link" href="#dash-main" onClick={event => { event.preventDefault(); document.getElementById("dash-main")?.focus(); }}>Skip to editor</a>
      <main className="tw-main" id="dash-main" tabIndex={-1}>
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
          </div>
        </div>

        <header className="tw-page-head">
          <div className="tw-page-copy">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div id="tw-page-actions" className="tw-page-actions" />
        </header>

        {tabs && tabs.length > 1 && activeTab && onTab ? (
          <div className="tw-tabs" role="tablist" onKeyDown={navigateTabs} aria-label={`${title} sections`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={tab.id === activeTab}
                className={`tw-tab${tab.id === activeTab ? " is-active" : ""}`}
                onClick={() => onTab(tab.id)}
                onPointerEnter={() => onPrefetchPage?.(tab.id as Page)}
                onFocus={() => onPrefetchPage?.(tab.id as Page)}
              >
                {tab.icon ? <Icon name={tab.icon} size={15} /> : null}
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="tw-page-swap" key={`${page}-${activeTab ?? ""}`}>{children}</div>
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
      <AliasRequiredGate />
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
