import { DiscordAutomationPanel } from "./DiscordAutomationPanel";
import { DataTransferPanel } from "./DataTransferPanel";
import { HOME_PREVIEW_MODE_KEY, type HomePreviewMode } from "../lib/homePreview";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/backend";
import { formatJoined } from "../lib/format";
import { profileHref } from "../lib/router";
import { BADGE_CATALOGUE } from "../lib/badges";
import {
  ArrowUpRight,
  BoltIcon,
  CheckIcon,
  ChevronIcon,
  CloseIcon,
  CopyIcon,
  DiscordIcon,
  EditIcon,
  EyeIcon,
  KeyIcon,
  LinkIcon,
  LogoutIcon,
  SaveIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  SignalIcon,
  TrashIcon,
  UsersIcon,
} from "./Icons";
import { Select } from "./Select";
import "../admin.css";

type Tab = "overview" | "members" | "invites" | "settings" | "data" | "bot";

type RegistrationMode = "open" | "invite" | "closed";

type AdminProfile = {
  id: string;
  username: string;
  alias: string | null;
  alias2: string | null;
  avatar_url: string | null;
  premium: boolean;
  is_admin: boolean;
  is_owner: boolean;
  /** Badges granted by an admin, merged with the earned ones on read. */
  badges: string[];
  created_at: string;
  views: number;
};

/** What the member popup may send — flags, hand-granted badges and a role. */
type MemberPatch = Partial<AdminProfile> & { role?: "owner" | "staff" | "member" };

type Summary = {
  users: number;
  views: number;
  premium: number;
  admins: number;
  activeInvites: number;
};

type Invite = {
  code: string;
  premium: boolean;
  maxUses: number;
  uses: number;
  note: string | null;
  revoked: boolean;
  expiresAt: string | null;
  createdAt: string;
  creator: string | null;
};

type BotStatus = {
  error?: string | null;
  configured: boolean;
  tokenValid: boolean;
  bot: { id: string; username: string; avatar: string | null } | null;
  guildId: string | null;
  guild: { id: string; name: string; icon: string | null } | null;
  pendingCodes: number;
  inviteUrl: string | null;
};

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <EyeIcon size={13} /> },
  { id: "members", label: "Members", icon: <UsersIcon size={13} /> },
  { id: "invites", label: "Invites", icon: <KeyIcon size={13} /> },
  { id: "settings", label: "Site settings", icon: <SettingsIcon size={13} /> },
  { id: "data", label: "Data transfer", icon: <SaveIcon size={13} /> },
  { id: "bot", label: "Discord bot", icon: <DiscordIcon size={13} /> },
];

/* Section cards on the admin landing — orientation, not a second navigation. */
const ADMIN_CARDS: { tab: Tab; title: string; body: string; icon: ReactNode }[] = [
  {
    tab: "members",
    title: "Members",
    body: "Every account, its claims, views, premium and admin flags — edited in a popup.",
    icon: <UsersIcon size={16} />,
  },
  {
    tab: "invites",
    title: "Invite codes",
    body: "Generate codes, cap their uses, and hand out Premium on sign-up.",
    icon: <KeyIcon size={16} />,
  },
  {
    tab: "settings",
    title: "Site settings",
    body: "Open, invite-only or closed registration — enforced by the backend.",
    icon: <SettingsIcon size={16} />,
  },
  {
    tab: "bot",
    title: "Discord bot",
    body: "Bot identity, pending verification codes and direct messages.",
    icon: <DiscordIcon size={16} />,
  },
];

const HOME_PREVIEW_OPTIONS: { id: HomePreviewMode; title: string; description: string }[] = [
  {
    id: "off",
    title: "Brand example",
    description: "Show the generic tourn.lol card instead of a real profile.",
  },
  {
    id: "koni",
    title: "Always /koni",
    description: "Every visitor sees the published /koni profile.",
  },
  {
    id: "random",
    title: "Random top 3",
    description: "/koni or one of the three most viewed pages, chosen per page load.",
  },
];

const REGISTRATION_OPTIONS: { id: RegistrationMode; title: string; desc: string }[] = [
  {
    id: "open",
    title: "Open sign-up",
    desc: "Anyone can create an account with Discord — the normal beta flow.",
  },
  {
    id: "invite",
    title: "Invite only",
    desc: "New accounts must enter a valid invite code during Discord sign-up.",
  },
  {
    id: "closed",
    title: "Closed",
    desc: "No new accounts. Existing members can still sign in normally.",
  },
];

function errorText(message: string): string {
  return message === "Admins only."
    ? "Your account isn't an admin on the backend, so there's nothing to manage here."
    : message;
}

/* ── member editor ───────────────────────────────────────────────────────
   A dialog, not an inline row: opening a member used to stretch the table
   cell and reflow the whole page. The popup keeps the list intact and gives
   the fields room to breathe.
   ---------------------------------------------------------------------- */

type MemberDraft = { alias: string; alias2: string; views: string };

type AdminRole = "owner" | "staff" | "member";

const ROLE_OPTIONS: { value: AdminRole; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "staff", label: "Staff — admin access" },
  { value: "owner", label: "Owner — full control" },
];

/* One popup for everything about a member: claims, views, role, flags and
   hand-granted badges. Nothing here expands the table row behind it. */

function MemberEditor({
  row,
  busy,
  isSelf,
  canGrantOwner,
  onClose,
  onSave,
  onToggle,
}: {
  row: AdminProfile;
  busy: boolean;
  /** Your own account can't lose admin or owner from here. */
  isSelf: boolean;
  /** Only owners can hand out owner. */
  canGrantOwner: boolean;
  onClose: () => void;
  onSave: (fields: { alias: string | null; alias2: string | null; views: number }) => Promise<boolean>;
  onToggle: (fields: MemberPatch, label: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<MemberDraft>({
    alias: row.alias ?? "",
    alias2: row.alias2 ?? "",
    views: String(row.views),
  });
  const [badges, setBadges] = useState<string[]>(row.badges ?? []);
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBadges(row.badges ?? []);
  }, [row.id, row.badges]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Lock the page without the table behind it resizing: the scrollbar's
    // width is handed back as padding, so nothing shifts when it disappears.
    const { body } = document;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    firstField.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [onClose]);

  const role: AdminRole = row.is_owner ? "owner" : row.is_admin ? "staff" : "member";
  const publicUrl = `${window.location.origin}/${row.alias?.trim() || row.username}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setLocalError("The clipboard is blocked here — copy the address from the browser.");
    }
  };

  const changeRole = (next: AdminRole) => {
    if (next === role) return;
    const label =
      next === "owner"
        ? `@${row.username} is now an owner.`
        : next === "staff"
          ? `@${row.username} is now staff.`
          : `@${row.username} is back to member.`;
    void onToggle({ role: next }, label);
  };

  const toggleBadge = (id: string) => {
    const next = badges.includes(id) ? badges.filter((badge) => badge !== id) : [...badges, id];
    setBadges(next);
    void onToggle({ badges: next }, `Badges for @${row.username} updated.`);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const views = Number(draft.views);
    if (!Number.isFinite(views) || views < 0) {
      setLocalError("Views must be a positive number.");
      return;
    }
    setLocalError(null);
    const ok = await onSave({
      alias: draft.alias.trim() || null,
      alias2: draft.alias2.trim() || null,
      views,
    });
    if (ok) onClose();
  };

  return createPortal(
    <div
      className="adm-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="adm-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adm-member-title"
        onSubmit={submit}
      >
        <header className="adm-modal-head">
          <span className="adm-modal-avatar">
            {row.avatar_url ? (
              <img src={row.avatar_url} alt="" width={40} height={40} />
            ) : (
              <span className="adm-user-initial">{row.username.slice(0, 1).toUpperCase()}</span>
            )}
          </span>
          <span className="adm-modal-id">
            <b id="adm-member-title">@{row.username}</b>
            <small>joined {formatJoined(new Date(row.created_at))}</small>
          </span>
          <button
            type="button"
            className={`adm-copy-link${copied ? " is-done" : ""}`}
            onClick={() => void copyLink()}
          >
            <CopyIcon size={12} />
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            className="adm-modal-close"
            onClick={onClose}
            aria-label="Close member editor"
          >
            <CloseIcon size={14} />
          </button>
        </header>

        <div className="adm-modal-body">
          <div className="adm-modal-grid">
            <label className="adm-field">
              <span>tourn.lol claim</span>
              <input
                ref={firstField}
                value={draft.alias}
                onChange={(event) => setDraft({ ...draft, alias: event.target.value })}
                placeholder={row.username}
                spellCheck={false}
              />
            </label>
            <label className="adm-field">
              <span>swats.bio claim</span>
              <input
                value={draft.alias2}
                onChange={(event) => setDraft({ ...draft, alias2: event.target.value })}
                placeholder="not claimed"
                spellCheck={false}
              />
            </label>
            <div className="adm-field">
              <span>Profile views</span>
              <span className="adm-field-row">
                <input
                  value={draft.views}
                  onChange={(event) => setDraft({ ...draft, views: event.target.value })}
                  inputMode="numeric"
                  placeholder="0"
                />
                <button
                  type="button"
                  className="adm-mini"
                  onClick={() => setDraft({ ...draft, views: "0" })}
                >
                  Reset
                </button>
              </span>
            </div>
          </div>

          {localError ? <p className="adm-modal-error">{localError}</p> : null}

          <div className="adm-modal-group">
            <h4>
              Role
              <span className="adm-badge-count">{role === "owner" ? "owner" : role === "staff" ? "staff" : "member"}</span>
            </h4>
            <div className="adm-role-seg" role="group" aria-label="Member role">
              {ROLE_OPTIONS.filter(
                (option) => option.value !== "owner" || canGrantOwner || role === "owner",
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`adm-role-btn${role === option.value ? " is-active" : ""}`}
                  aria-pressed={role === option.value}
                  disabled={busy}
                  onClick={() => changeRole(option.value)}
                >
                  <b>{option.label.split(" — ")[0]}</b>
                  <small>
                    {option.value === "member"
                      ? "No console access"
                      : option.value === "staff"
                        ? "Members, invites, settings"
                        : "Everything + owner grants"}
                  </small>
                </button>
              ))}
            </div>
            {isSelf ? (
              <p className="adm-modal-note">You can't demote your own account from the console.</p>
            ) : null}
          </div>

          <div className="adm-modal-group">
            <h4>Flags</h4>
            <div className="adm-modal-toggles">
              <div className="adm-toggle-row">
                <div>
                  <b>Premium</b>
                  <small>Grants premium perks and the premium badge.</small>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={row.premium}
                  aria-label="Premium"
                  className={`adm-switch${row.premium ? " is-on" : ""}`}
                  disabled={busy}
                  onClick={() => void onToggle({ premium: !row.premium }, "Premium updated.")}
                >
                  <span />
                </button>
              </div>
              <div className="adm-toggle-row">
                <div>
                  <b>Admin</b>
                  <small>
                    {isSelf
                      ? "You can't remove the admin flag from your own account."
                      : "Full access to members, invites and site settings."}
                  </small>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={row.is_admin}
                  aria-label="Admin"
                  className={`adm-switch${row.is_admin ? " is-on" : ""}`}
                  disabled={busy || isSelf}
                  title={isSelf ? "You can't demote yourself" : undefined}
                  onClick={() => void onToggle({ is_admin: !row.is_admin }, "Admin flag updated.")}
                >
                  <span />
                </button>
              </div>
            </div>
          </div>

          <div className="adm-modal-group">
            <h4>
              Badges
              <span className="adm-badge-count">
                {badges.length === 0 ? "none granted" : `${badges.length} granted`}
              </span>
            </h4>
            <p className="adm-modal-note">
              Granted badges appear next to the ones the account earned. Tap to grant or revoke.
            </p>
            <div className="adm-badge-grid">
              {BADGE_CATALOGUE.map((badge) => {
                const active = badges.includes(badge.id);
                return (
                  <button
                    key={badge.id}
                    type="button"
                    className={`adm-badge-pick${active ? " is-on" : ""}`}
                    aria-pressed={active}
                    disabled={busy}
                    onClick={() => toggleBadge(badge.id)}
                    title={`${badge.description} — ${badge.requirement}`}
                  >
                    {badge.art ? (
                      <img src={badge.art} alt="" width={18} height={18} loading="lazy" />
                    ) : (
                      <span className="adm-badge-initial" aria-hidden="true">
                        {badge.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span>{badge.name}</span>
                    {active ? <CheckIcon size={10} className="adm-badge-check" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <footer className="adm-modal-foot">
          <a className="adm-modal-link" href={profileHref(row.alias?.trim() || row.username)}>
            <LinkIcon size={12} />
            Open profile
          </a>
          <span className="adm-modal-actions">
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="adm-btn adm-btn--primary" disabled={busy}>
              <SaveIcon size={12} />
              {busy ? "Saving…" : "Save changes"}
            </button>
          </span>
        </footer>
      </form>
    </div>,
    document.body,
  );
}

/* ── console ─────────────────────────────────────────────────────────── */

export function AdminDashboard({ embedded = false }: { embedded?: boolean }) {
  const { user, isOwner, isAdmin, security, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [profiles, setProfiles] = useState<AdminProfile[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [registration, setRegistration] = useState<RegistrationMode | null>(null);
  const [homePreview, setHomePreview] = useState<HomePreviewMode>("random");
  const [homeDraft, setHomeDraft] = useState<HomePreviewMode>("random");
  const [premiumRain, setPremiumRain] = useState(false);
  const [premiumDraft, setPremiumDraft] = useState(false);
  const [modeDraft, setModeDraft] = useState<RegistrationMode>("open");
  const [bot, setBot] = useState<BotStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    const result = await api<{ profiles: AdminProfile[] }>("/api/admin/profiles");
    if (!result.ok) {
      setError(errorText(result.error));
      setProfiles([]);
      return;
    }
    setError(null);
    setProfiles(result.data.profiles);
  }, []);

  const loadSummary = useCallback(async () => {
    const result = await api<Summary>("/api/admin/summary");
    if (result.ok) setSummary(result.data);
  }, []);

  const loadInvites = useCallback(async () => {
    const result = await api<{ invites: Invite[] }>("/api/admin/invites");
    if (!result.ok) {
      setError(errorText(result.error));
      setInvites([]);
      return;
    }
    setInvites(result.data.invites);
  }, []);

  const loadSettings = useCallback(async () => {
    const result = await api<{ settings: { registration: RegistrationMode; homePreview?: HomePreviewMode; premiumRain?: boolean } }>(
      "/api/admin/settings",
    );
    if (!result.ok) {
      setError(errorText(result.error));
      return;
    }
    setRegistration(result.data.settings.registration);
    setModeDraft(result.data.settings.registration);
    const preview = result.data.settings.homePreview || "random";
    setHomePreview(preview);
    setHomeDraft(preview);
    const rain = result.data.settings.premiumRain === true;
    setPremiumRain(rain);
    setPremiumDraft(rain);
  }, []);

  const loadBot = useCallback(async () => {
    const result = await api<BotStatus>("/api/admin/bot");
    if (!result.ok) {
      setError(errorText(result.error));
      return;
    }
    setBot(result.data);
  }, []);

  const refreshAll = useCallback(() => {
    void loadProfiles();
    void loadSummary();
    void loadInvites();
    void loadSettings();
    void loadBot();
  }, [loadProfiles, loadSummary, loadInvites, loadSettings, loadBot]);

  const exportSnapshot = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      admin: user?.username ?? null,
      summary,
      registration,
      invites,
      bot,
      profiles,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tourn-admin-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [user, summary, registration, invites, bot, profiles]);

  useEffect(() => {
    if (!isAdmin) return;
    // The landing page shows every panel's health, so load them all up front.
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "invites" && invites === null) void loadInvites();
    if (tab === "settings" && registration === null) void loadSettings();
    if (tab === "bot" && bot === null) void loadBot();
  }, [tab, isAdmin, invites, registration, bot, loadInvites, loadSettings, loadBot]);

  const patch = async (id: string, fields: MemberPatch, label: string) => {
    setBusy(id);
    setError(null);
    setMsg(null);
    const result = await api<{ profile: AdminProfile }>(`/api/admin/profiles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setProfiles((rows) =>
      rows ? rows.map((row) => (row.id === id ? result.data.profile : row)) : rows,
    );
    setMsg(label);
    return true;
  };

  if (!isAdmin) {
    return (
      <main className="adm adm--gate">
        <div className="adm-gate">
          <span className="adm-gate-icon" aria-hidden="true">
            <ShieldIcon size={22} />
          </span>
          <span className="adm-eyebrow">restricted</span>
          <h1>Admins only.</h1>
          <p>
            This area checks your account against the directory's admin list on every load — the
            server rejects any write from an account that isn't one, not just the UI.
          </p>
          <a className="adm-btn adm-btn--ghost" href="#/dashboard">
            Back to your dashboard
          </a>
        </div>
      </main>
    );
  }

  const filtered = (profiles ?? []).filter((row) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      row.username.toLowerCase().includes(q) ||
      (row.alias ?? "").toLowerCase().includes(q) ||
      (row.alias2 ?? "").toLowerCase().includes(q)
    );
  });

  const recent = useMemo(() => (profiles ?? []).slice(0, 6), [profiles]);
  const editing = editingId ? (profiles ?? []).find((row) => row.id === editingId) ?? null : null;

  return (
    <div className={`adm${embedded ? " adm--embedded" : " adm-page"}`}>
      {embedded ? null : (
        <header className="adm-head">
          <div className="adm-head-copy">
            <span className="adm-eyebrow">
              <ShieldIcon size={11} />
              admin console
            </span>
            <h1>Directory control</h1>
            <p>
              Signed in as <b>{user?.email ?? user?.username}</b>
              {isOwner ? " (owner)" : ""}
            </p>
          </div>
          <div className="adm-head-actions">
            <button type="button" className="adm-btn adm-btn--ghost" onClick={refreshAll}>
              <SignalIcon size={12} />
              Refresh
            </button>
            <a className="adm-btn adm-btn--ghost" href="#/dashboard">
              Dashboard
            </a>
          </div>
        </header>
      )}

      <nav className="adm-tabs" aria-label="Admin sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`adm-tab${tab === item.id ? " is-active" : ""}`}
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? "page" : undefined}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {error ? <p className="adm-msg">{error}</p> : null}
      {msg ? <p className="adm-msg adm-msg--ok">{msg}</p> : null}

      {tab === "overview" ? (
        <>
          <section className="adm-hero">
            <span className="adm-hero-icon" aria-hidden="true">
              <ShieldIcon size={18} />
            </span>
            <div className="adm-hero-copy">
              <h2>Admin</h2>
              <p>
                Signed in as <b>@{user?.username}</b>
                {isOwner ? " (owner)" : ""}. Everything below is the platform itself — users,
                access, and what people are told.
              </p>
            </div>
            <span className="adm-health">
              <i aria-hidden="true" />
              Systems answering
            </span>
          </section>

          <section className="adm-stats">
            <article className="adm-stat">
              <span className="adm-stat-label">
                <UsersIcon size={12} /> Accounts
              </span>
              <b className="adm-stat-value">{summary?.users ?? "—"}</b>
              <small>every handle on the site</small>
            </article>
            <article className="adm-stat">
              <span className="adm-stat-label">
                <EyeIcon size={12} /> Profile views
              </span>
              <b className="adm-stat-value">
                {summary ? summary.views.toLocaleString("en-US") : "—"}
              </b>
              <small>all handles, since launch</small>
            </article>
            <article className="adm-stat">
              <span className="adm-stat-label">
                <BoltIcon size={12} /> Premium
              </span>
              <b className="adm-stat-value">{summary?.premium ?? "—"}</b>
              <small>
                {summary
                  ? `${summary.admins} admin${summary.admins === 1 ? "" : "s"} on the team`
                  : "granted accounts"}
              </small>
            </article>
            <article className="adm-stat">
              <span className="adm-stat-label">
                <KeyIcon size={12} /> Active invites
              </span>
              <b className="adm-stat-value">{summary?.activeInvites ?? "—"}</b>
              <small>codes with uses left</small>
            </article>
          </section>

          <section className="adm-panel adm-ops">
            <div className="adm-ops-head">
              <h2>
                <BoltIcon size={14} />
                Operations &amp; system health
              </h2>
              <span className="adm-health">
                <i aria-hidden="true" />
                All systems operational
              </span>
            </div>

            <div className="adm-metrics">
              <div className="adm-metric">
                <span>Accounts API</span>
                <b>{error ? "Degraded" : "Healthy"}</b>
              </div>
              <div className="adm-metric">
                <span>Registration</span>
                <b>
                  {registration === "open"
                    ? "Open"
                    : registration === "invite"
                      ? "Invite only"
                      : registration === "closed"
                        ? "Closed"
                        : "—"}
                </b>
              </div>
              <div className="adm-metric">
                <span>Invite codes</span>
                <b>{invites ? `${invites.length} total` : "—"}</b>
              </div>
              <div className="adm-metric">
                <span>Discord bot</span>
                <b>
                  {bot
                    ? bot.tokenValid
                      ? "Online"
                      : bot.configured
                        ? "Token rejected"
                        : "Not configured"
                    : "—"}
                </b>
              </div>
            </div>

            <div className="adm-ops-actions">
              <button type="button" className="adm-action" onClick={refreshAll}>
                <SignalIcon size={12} />
                Refresh everything
              </button>
              <button type="button" className="adm-action" onClick={exportSnapshot}>
                <SaveIcon size={12} />
                Export snapshot
              </button>
              <button type="button" className="adm-action" onClick={() => setTab("members")}>
                <UsersIcon size={12} />
                Manage members
              </button>
              <button type="button" className="adm-action" onClick={() => setTab("settings")}>
                <SettingsIcon size={12} />
                Site settings
              </button>
            </div>
          </section>

          <section className="adm-cards">
            {ADMIN_CARDS.map((card) => (
              <button
                type="button"
                key={card.tab}
                className="adm-card"
                onClick={() => setTab(card.tab)}
              >
                <span className="adm-card-icon">{card.icon}</span>
                <span className="adm-card-copy">
                  <b>
                    {card.title}
                    <ChevronIcon size={12} />
                  </b>
                  <small>{card.body}</small>
                </span>
              </button>
            ))}
          </section>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>
                <UsersIcon size={14} />
                Newest accounts
              </h2>
              <button type="button" className="adm-link" onClick={() => setTab("members")}>
                Manage members
                <ArrowUpRight size={11} />
              </button>
            </div>
            {profiles === null ? (
              <p className="adm-empty">Loading directory…</p>
            ) : recent.length === 0 ? (
              <p className="adm-empty">No accounts yet.</p>
            ) : (
              <ul className="adm-recent">
                {recent.map((row) => (
                  <li key={row.id}>
                    {row.avatar_url ? (
                      <img src={row.avatar_url} alt="" width={28} height={28} />
                    ) : (
                      <span className="adm-user-initial">{row.username.slice(0, 1).toUpperCase()}</span>
                    )}
                    <span className="adm-recent-id">
                      <b>@{row.username}</b>
                      <small>{row.alias ? `tourn.lol/${row.alias}` : "no alias yet"}</small>
                    </span>
                    <span className="adm-recent-meta">
                      {row.views.toLocaleString("en-US")} views · joined{" "}
                      {formatJoined(new Date(row.created_at))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {tab === "members" ? (
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>
              <UsersIcon size={14} />
              Members
            </h2>
            <label className="adm-search">
              <SearchIcon size={13} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search handle or alias…"
                spellCheck={false}
              />
            </label>
          </div>

          {profiles === null ? (
            <p className="adm-empty">Loading directory…</p>
          ) : filtered.length === 0 ? (
            <p className="adm-empty">No accounts match.</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Claims · views</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className={busy === row.id ? "is-busy" : undefined}>
                      <td>
                        <span className="adm-user-cell">
                          {row.avatar_url ? (
                            <img src={row.avatar_url} alt="" width={24} height={24} />
                          ) : (
                            <span className="adm-user-initial">
                              {row.username.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <span>
                            <b>@{row.username}</b>
                            {row.id === user?.id ? <small>you</small> : null}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="adm-claim">
                          tourn.lol/<b>{row.alias?.trim() || row.username}</b>
                        </span>
                        <span className={`adm-claim${row.alias2 ? "" : " adm-claim--unset"}`}>
                          swats.bio/<b>{row.alias2 || "—"}</b>
                        </span>
                        <span className="adm-claim adm-claim--views">
                          <EyeIcon size={10} /> {row.views.toLocaleString("en-US")}
                        </span>
                      </td>
                      <td className="adm-cell-date">{formatJoined(new Date(row.created_at))}</td>
                      <td>
                        <span className="adm-flags">
                          <span className={`adm-flag${row.premium ? " is-on" : ""}`}>
                            <BoltIcon size={10} />
                            {row.premium ? "premium" : "free"}
                          </span>
                          <span className={`adm-flag adm-flag--admin${row.is_admin ? " is-on" : ""}`}>
                            <ShieldIcon size={10} />
                            {row.is_admin ? "admin" : "member"}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="adm-row-actions">
                          <button
                            type="button"
                            className="adm-mini adm-mini--edit"
                            onClick={() => setEditingId(row.id)}
                            disabled={busy === row.id}
                          >
                            <EditIcon size={11} />
                            Edit
                          </button>
                          <a
                            className="adm-open"
                            href={profileHref(row.alias?.trim() || row.username)}
                          >
                            <LinkIcon size={12} />
                            open
                          </a>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editing ? (
            <MemberEditor
              canGrantOwner={isOwner}
              key={editing.id}
              row={editing}
              busy={busy === editing.id}
              isSelf={editing.id === user?.id}
              onClose={() => setEditingId(null)}
              onSave={(fields) => patch(editing.id, fields, `@${editing.username} updated.`)}
              onToggle={(fields, label) => patch(editing.id, fields, label)}
            />
          ) : null}
        </section>
      ) : null}

      {tab === "invites" ? (
        <>
          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>
                <KeyIcon size={14} />
                Create invite codes
              </h2>
              <span className="adm-hint">Codes only matter while sign-up is set to “Invite only”.</span>
            </div>
            <InviteForm
              onCreate={async (input) => {
                setBusy("invite-create");
                setError(null);
                setMsg(null);
                const result = await api<{ invites: Invite[] }>("/api/admin/invites", {
                  method: "POST",
                  body: JSON.stringify(input),
                });
                setBusy(null);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setInvites((current) => [...result.data.invites, ...(current ?? [])]);
                setMsg(
                  result.data.invites.length === 1
                    ? "Invite code created."
                    : `${result.data.invites.length} invite codes created.`,
                );
                void loadSummary();
              }}
              busy={busy === "invite-create"}
            />
          </section>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>
                <LinkIcon size={14} />
                Codes
              </h2>
              <span className="adm-hint">{invites?.length ?? 0} total</span>
            </div>
            {invites === null ? (
              <p className="adm-empty">Loading invite codes…</p>
            ) : invites.length === 0 ? (
              <p className="adm-empty">No invite codes yet — create one above.</p>
            ) : (
              <div className="adm-invite-list">
                {invites.map((invite) => {
                  const exhausted = invite.uses >= invite.maxUses;
                  const expired = Boolean(invite.expiresAt && new Date(invite.expiresAt) < new Date());
                  const dead = invite.revoked || exhausted || expired;
                  return (
                    <article className={`adm-invite${dead ? " is-dead" : ""}`} key={invite.code}>
                      <div className="adm-invite-main">
                        <code className="adm-code">{invite.code}</code>
                        <span className="adm-invite-meta">
                          {invite.uses}/{invite.maxUses} used ·{" "}
                          {invite.expiresAt
                            ? `expires ${new Date(invite.expiresAt).toLocaleDateString()}`
                            : "no expiry"}
                          {invite.creator ? ` · by @${invite.creator}` : ""}
                        </span>
                        {invite.note ? <span className="adm-invite-note">{invite.note}</span> : null}
                      </div>
                      <span className="adm-invite-tags">
                        {invite.premium ? <span className="adm-badge adm-badge--premium">Premium</span> : null}
                        {invite.revoked ? <span className="adm-badge">Revoked</span> : null}
                        {!invite.revoked && exhausted ? <span className="adm-badge">Used up</span> : null}
                        {!invite.revoked && expired ? <span className="adm-badge">Expired</span> : null}
                      </span>
                      <span className="adm-invite-actions">
                        <button
                          type="button"
                          className="adm-mini"
                          onClick={() => void navigator.clipboard.writeText(invite.code)}
                        >
                          <CopyIcon size={11} />
                          Copy
                        </button>
                        {invite.revoked ? null : (
                          <button
                            type="button"
                            className="adm-mini adm-mini--danger"
                            onClick={async () => {
                              const result = await api<{ invite: Invite }>(
                                `/api/admin/invites/${encodeURIComponent(invite.code)}`,
                                { method: "PATCH", body: JSON.stringify({ revoked: true }) },
                              );
                              if (!result.ok) {
                                setError(result.error);
                                return;
                              }
                              setInvites((current) =>
                                current
                                  ? current.map((item) =>
                                      item.code === invite.code ? result.data.invite : item,
                                    )
                                  : current,
                              );
                              void loadSummary();
                            }}
                          >
                            <TrashIcon size={11} />
                            Revoke
                          </button>
                        )}
                      </span>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}

      {tab === "settings" ? (
        <>
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>
              <SettingsIcon size={14} />
              Registration
            </h2>
            <button
              type="button"
              className="adm-btn adm-btn--primary"
              disabled={registration === null || modeDraft === registration || busy === "settings"}
              onClick={async () => {
                setBusy("settings");
                setError(null);
                setMsg(null);
                const result = await api<{ settings: { registration: RegistrationMode } }>(
                  "/api/admin/settings",
                  { method: "PATCH", body: JSON.stringify({ registration: modeDraft }) },
                );
                setBusy(null);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setRegistration(result.data.settings.registration);
                setMsg("Registration setting saved.");
              }}
            >
              <SaveIcon size={12} />
              {busy === "settings" ? "Saving…" : "Save"}
            </button>
          </div>

          <p className="adm-hint adm-hint--block">
            Accounts are always created with Discord. Email + password is only a second sign-in
            method for members who add one later.
          </p>

          <div className="adm-settings-grid">
            {REGISTRATION_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`adm-mode${modeDraft === option.id ? " is-active" : ""}`}
                onClick={() => setModeDraft(option.id)}
              >
                <span className="adm-mode-head">
                  <b>{option.title}</b>
                  {registration === option.id ? (
                    <span className="adm-badge adm-badge--live">Live</span>
                  ) : null}
                </span>
                <small>{option.desc}</small>
                {modeDraft === option.id ? <span className="adm-mode-check" aria-hidden="true">✓</span> : null}
              </button>
            ))}
          </div>
        </section>

        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>
              <EyeIcon size={14} />
              Homepage preview
            </h2>
            <button
              type="button"
              className="adm-btn adm-btn--primary"
              disabled={homeDraft === homePreview || busy === "home-preview"}
              onClick={async () => {
                setBusy("home-preview");
                setError(null);
                setMsg(null);
                const result = await api<{ settings: { homePreview?: HomePreviewMode } }>(
                  "/api/admin/settings",
                  { method: "PATCH", body: JSON.stringify({ homePreview: homeDraft }) },
                );
                setBusy(null);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                const next = result.data.settings.homePreview || homeDraft;
                setHomePreview(next);
                setHomeDraft(next);
                try {
                  localStorage.setItem(HOME_PREVIEW_MODE_KEY, next);
                } catch {
                  /* private mode */
                }
                setMsg("Homepage preview saved.");
              }}
            >
              <SaveIcon size={12} />
              {busy === "home-preview" ? "Saving…" : "Save preview"}
            </button>
          </div>

          <p className="adm-hint adm-hint--block">
            The home hero paints from a bundled snapshot before the network answers, so a real
            profile is there instantly. “Random top 3” picks /koni or one of the three most viewed
            pages again on every page load.
          </p>

          <div className="adm-settings-grid">
            {HOME_PREVIEW_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`adm-mode${homeDraft === option.id ? " is-active" : ""}`}
                aria-pressed={homeDraft === option.id}
                onClick={() => setHomeDraft(option.id)}
              >
                <span className="adm-mode-head">
                  <b>{option.title}</b>
                  {homePreview === option.id ? (
                    <span className="adm-badge adm-badge--live">Live</span>
                  ) : null}
                </span>
                <small>{option.description}</small>
                {homeDraft === option.id ? (
                  <span className="adm-mode-check" aria-hidden="true">✓</span>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>
              <BoltIcon size={14} />
              Premium rain signup
            </h2>
            <button
              type="button"
              className="adm-btn adm-btn--primary"
              disabled={premiumDraft === premiumRain || busy === "premium-rain"}
              onClick={async () => {
                setBusy("premium-rain");
                setError(null);
                setMsg(null);
                const result = await api<{ settings: { premiumRain?: boolean } }>(
                  "/api/admin/settings",
                  { method: "PATCH", body: JSON.stringify({ premiumRain: premiumDraft }) },
                );
                setBusy(null);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                const next = result.data.settings.premiumRain === true;
                setPremiumRain(next);
                setPremiumDraft(next);
                setMsg(next ? "Premium rain is on for new signups." : "Premium rain signup is off.");
              }}
            >
              <SaveIcon size={12} />
              {busy === "premium-rain" ? "Saving…" : "Save"}
            </button>
          </div>

          <p className="adm-hint adm-hint--block">
            While this is on, every account created — Discord or email — keeps Premium permanently.
            They keep the rain effect, every other Premium cosmetic and their second claim even after
            you switch this off. Accounts created while it was off are not changed.
          </p>

          <button
            type="button"
            className={`adm-mode${premiumDraft ? " is-active" : ""}`}
            aria-pressed={premiumDraft}
            onClick={() => setPremiumDraft((current) => !current)}
          >
            <span className="adm-mode-head">
              <b>{premiumDraft ? "Premium rain: on" : "Premium rain: off"}</b>
              {premiumRain ? <span className="adm-badge adm-badge--live">Live</span> : null}
            </span>
            <small>
              {premiumDraft
                ? "New signups receive Premium forever, including the rain effect."
                : "New signups start on the free plan."}
            </small>
            {premiumDraft ? <span className="adm-mode-check" aria-hidden="true">✓</span> : null}
          </button>
        </section>
        </>
      ) : null}

      {tab === "data" ? isOwner ? <DataTransferPanel /> : <section className="adm-panel"><h2>Owner access required</h2><p>Only the site owner can export or import the full database.</p></section> : null}

      {tab === "bot" ? (
        <>
          <section className="adm-stats adm-stats--bot">
            <article className="adm-stat">
              <span className="adm-stat-label">Bot token</span>
              <b className="adm-stat-value">{bot?.configured ? "Set" : "Missing"}</b>
              <small>{bot?.tokenValid ? "Discord accepts it" : "No valid bot identity"}</small>
            </article>
            <article className="adm-stat">
              <span className="adm-stat-label">Pending codes</span>
              <b className="adm-stat-value">{bot?.pendingCodes ?? "—"}</b>
              <small>unused verification codes</small>
            </article>
            <article className="adm-stat">
              <span className="adm-stat-label">Guild</span>
              <b className="adm-stat-value">{bot?.guild?.name ?? "—"}</b>
              <small>{bot?.guildId ?? "Choose a server below"}</small>
            </article>
          </section>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>
                <DiscordIcon size={14} />
                Bot identity
              </h2>
              {bot?.inviteUrl ? (
                <a className="adm-btn adm-btn--ghost" href={bot.inviteUrl} target="_blank" rel="noreferrer">
                  Add bot to a server
                  <ArrowUpRight size={11} />
                </a>
              ) : null}
            </div>
            {bot === null ? (
              <p className="adm-empty">Checking the bot…</p>
            ) : bot.bot ? (
              <div className="adm-bot-identity">
                {bot.bot.avatar ? <img src={bot.bot.avatar} alt="" width={40} height={40} /> : null}
                <span>
                  <b>{bot.bot.username}</b>
                  <small>id {bot.bot.id}</small>
                </span>
              </div>
            ) : (
              <p className="adm-empty">
                {bot.configured
                  ? bot.error || "The bot could not be verified. Refresh the connection details below."
                  : "Set DISCORD_BOT_TOKEN on the Railway backend to turn on DMs and verification codes."}
              </p>
            )}
          </section>

          <DiscordAutomationPanel isOwner={isOwner} />

          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>
                <KeyIcon size={14} />
                Send a test DM
              </h2>
            </div>
            <BotTestForm
              onSubmit={async (discordId, message) => {
                setBusy("bot-dm");
                setError(null);
                setMsg(null);
                const result = await api("/api/admin/bot/test-dm", {
                  method: "POST",
                  body: JSON.stringify({ discordId, message }),
                });
                setBusy(null);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setMsg(`DM sent to ${discordId}.`);
              }}
              busy={busy === "bot-dm"}
            />
          </section>
        </>
      ) : null}

      <footer className="adm-foot">
        <button
          type="button"
          className="adm-btn adm-btn--ghost"
          onClick={() => void security.signOutOthers()}
          title="Sign out every device except this one"
        >
          <LogoutIcon size={12} />
          Kill other sessions
        </button>
        <button type="button" className="adm-signout" onClick={() => void signOut()}>
          <LogoutIcon size={12} />
          Sign out of this device
        </button>
      </footer>
    </div>
  );
}

/* ── invite form ───────────────────────────────────────────────────────── */

function InviteForm({
  onCreate,
  busy,
}: {
  onCreate: (input: {
    count: number;
    maxUses: number;
    premium: boolean;
    expiresInDays: number | null;
    note: string;
  }) => Promise<void>;
  busy: boolean;
}) {
  const [count, setCount] = useState("1");
  const [maxUses, setMaxUses] = useState("1");
  const [expires, setExpires] = useState("");
  const [note, setNote] = useState("");
  const [premium, setPremium] = useState(false);

  return (
    <form
      className="adm-invite-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onCreate({
          count: Number(count) || 1,
          maxUses: Number(maxUses) || 1,
          premium,
          expiresInDays: expires.trim() ? Number(expires) : null,
          note: note.trim(),
        });
      }}
    >
      <label className="adm-field">
        <span>How many codes</span>
        <input
          value={count}
          onChange={(event) => setCount(event.target.value)}
          inputMode="numeric"
          min={1}
          max={100}
          placeholder="1"
        />
      </label>
      <label className="adm-field">
        <span>Uses per code</span>
        <input
          value={maxUses}
          onChange={(event) => setMaxUses(event.target.value)}
          inputMode="numeric"
          min={1}
          placeholder="1"
        />
      </label>
      <label className="adm-field">
        <span>Expires in (days)</span>
        <input
          value={expires}
          onChange={(event) => setExpires(event.target.value)}
          inputMode="numeric"
          placeholder="never"
        />
      </label>
      <label className="adm-field adm-field--wide">
        <span>Note</span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="tournament winners, creators…"
          maxLength={80}
        />
      </label>
      <label className="adm-check">
        <input
          type="checkbox"
          checked={premium}
          onChange={(event) => setPremium(event.target.checked)}
        />
        <span>Premium attaches to these accounts</span>
      </label>
      <button type="submit" className="adm-btn adm-btn--primary" disabled={busy}>
        <KeyIcon size={12} />
        {busy ? "Generating…" : Number(count) > 1 ? "Generate codes" : "Generate code"}
      </button>
    </form>
  );
}

/* ── bot test form ─────────────────────────────────────────────────────── */

function BotTestForm({
  onSubmit,
  busy,
}: {
  onSubmit: (discordId: string, message: string) => Promise<void>;
  busy: boolean;
}) {
  const [discordId, setDiscordId] = useState("");
  const [message, setMessage] = useState("");
  const valid = /^\d{16,20}$/.test(discordId.trim());

  return (
    <form
      className="adm-bot-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        void onSubmit(discordId.trim(), message.trim());
      }}
    >
      <label className="adm-field">
        <span>Discord user ID</span>
        <input
          value={discordId}
          onChange={(event) => setDiscordId(event.target.value)}
          placeholder="1546745348020772915"
          inputMode="numeric"
          spellCheck={false}
        />
      </label>
      <label className="adm-field adm-field--wide">
        <span>Message</span>
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="tourn.lol bot check — DMs are working."
          maxLength={500}
        />
      </label>
      <button type="submit" className="adm-btn adm-btn--primary" disabled={busy || !valid}>
        <DiscordIcon size={12} />
        {busy ? "Sending…" : "Send DM"}
      </button>
      {!valid && discordId.trim() ? (
        <span className="adm-hint adm-hint--error">That doesn't look like a user ID.</span>
      ) : null}
    </form>
  );
}
