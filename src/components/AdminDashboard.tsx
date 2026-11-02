import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/backend";
import { formatJoined } from "../lib/format";
import { profileHref } from "../lib/router";
import {
  ArrowUpRight,
  BoltIcon,
  CopyIcon,
  DiscordIcon,
  EyeIcon,
  KeyIcon,
  LinkIcon,
  LogoutIcon,
  SaveIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  TrashIcon,
  UsersIcon,
} from "./Icons";
import "../admin.css";

type Tab = "overview" | "members" | "invites" | "settings" | "bot";

type RegistrationMode = "open" | "invite" | "closed";

type AdminProfile = {
  id: string;
  username: string;
  alias: string | null;
  alias2: string | null;
  avatar_url: string | null;
  premium: boolean;
  is_admin: boolean;
  created_at: string;
  views: number;
};

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
  configured: boolean;
  tokenValid: boolean;
  bot: { id: string; username: string; avatar: string | null } | null;
  guildId: string | null;
  guild: { id: string; name: string; icon: string | null } | null;
  pendingCodes: number;
  inviteUrl: string | null;
};

type Draft = { alias: string; alias2: string; views: string };

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <EyeIcon size={14} /> },
  { id: "members", label: "Members", icon: <UsersIcon size={14} /> },
  { id: "invites", label: "Invites", icon: <KeyIcon size={14} /> },
  { id: "settings", label: "Site settings", icon: <SettingsIcon size={14} /> },
  { id: "bot", label: "Discord bot", icon: <DiscordIcon size={14} /> },
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

export function AdminDashboard() {
  const { user, isOwner, isAdmin, security, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [profiles, setProfiles] = useState<AdminProfile[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [registration, setRegistration] = useState<RegistrationMode | null>(null);
  const [modeDraft, setModeDraft] = useState<RegistrationMode>("open");
  const [bot, setBot] = useState<BotStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

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
    const result = await api<{ settings: { registration: RegistrationMode } }>(
      "/api/admin/settings",
    );
    if (!result.ok) {
      setError(errorText(result.error));
      return;
    }
    setRegistration(result.data.settings.registration);
    setModeDraft(result.data.settings.registration);
  }, []);

  const loadBot = useCallback(async () => {
    const result = await api<BotStatus>("/api/admin/bot");
    if (!result.ok) {
      setError(errorText(result.error));
      return;
    }
    setBot(result.data);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void loadProfiles();
    void loadSummary();
  }, [isAdmin, loadProfiles, loadSummary]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "invites" && invites === null) void loadInvites();
    if (tab === "settings" && registration === null) void loadSettings();
    if (tab === "bot" && bot === null) void loadBot();
  }, [tab, isAdmin, invites, registration, bot, loadInvites, loadSettings, loadBot]);

  const patch = async (id: string, fields: Partial<AdminProfile>, label: string) => {
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

  const saveDraft = async (row: AdminProfile) => {
    const draft = drafts[row.id];
    if (!draft) return;
    const views = Number(draft.views);
    if (!Number.isFinite(views) || views < 0) {
      setError("Views must be a positive number.");
      return;
    }
    const ok = await patch(
      row.id,
      { alias: draft.alias.trim() || null, alias2: draft.alias2.trim() || null, views },
      `@${row.username} updated.`,
    );
    if (ok) {
      setDrafts((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
    }
  };

  if (!isAdmin) {
    return (
      <main className="adm adm--gate">
        <div className="adm-gate" data-reveal>
          <span className="adm-gate-icon" aria-hidden="true">
            <ShieldIcon size={22} />
          </span>
          <span className="eyebrow eyebrow--sm">restricted</span>
          <h1>Admins only.</h1>
          <p>
            This area checks your account against the directory's admin list on every load — the
            server rejects any write from an account that isn't one, not just the UI.
          </p>
          <a className="btn btn-ghost btn-sm" href="#/dashboard">
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

  return (
    <main className="adm adm-page">
      <header className="adm-top">
        <div>
          <span className="eyebrow eyebrow--sm">
            <ShieldIcon size={11} />
            admin console
          </span>
          <h1>Directory control</h1>
          <p>
            Signed in as <b>{user?.email ?? user?.username}</b>
            {isOwner ? " (owner)" : ""}
          </p>
        </div>
        <div className="adm-top-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              void loadProfiles();
              void loadSummary();
              void loadInvites();
              void loadSettings();
              void loadBot();
            }}
          >
            Refresh
          </button>
          <a className="btn btn-ghost btn-sm" href="#/dashboard">
            Dashboard
          </a>
        </div>
      </header>

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
          <section className="adm-stats">
            <article className="adm-stat">
              <span className="adm-stat-label">Accounts</span>
              <b className="adm-stat-value">{summary?.users ?? "—"}</b>
              <small>every handle on the site</small>
            </article>
            <article className="adm-stat">
              <span className="adm-stat-label">Profile views</span>
              <b className="adm-stat-value">
                {summary ? summary.views.toLocaleString("en-US") : "—"}
              </b>
              <small>all handles, since launch</small>
            </article>
            <article className="adm-stat">
              <span className="adm-stat-label">Premium</span>
              <b className="adm-stat-value">{summary?.premium ?? "—"}</b>
              <small>granted accounts</small>
            </article>
            <article className="adm-stat">
              <span className="adm-stat-label">Active invites</span>
              <b className="adm-stat-value">{summary?.activeInvites ?? "—"}</b>
              <small>codes with uses left</small>
            </article>
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
                      <img src={row.avatar_url} alt="" width={24} height={24} />
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
                    <th>Premium</th>
                    <th>Admin</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const draft = drafts[row.id];
                    return (
                      <tr key={row.id} className={busy === row.id ? "is-busy" : undefined}>
                        <td>
                          <span className="adm-user-cell">
                            {row.avatar_url ? (
                              <img src={row.avatar_url} alt="" width={22} height={22} />
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
                          {draft ? (
                            <span className="adm-edit-fields">
                              <label className="adm-field">
                                <span>tourn.lol</span>
                                <input
                                  value={draft.alias}
                                  onChange={(event) =>
                                    setDrafts((current) => ({
                                      ...current,
                                      [row.id]: { ...draft, alias: event.target.value },
                                    }))
                                  }
                                  placeholder="alias"
                                  spellCheck={false}
                                />
                              </label>
                              <label className="adm-field">
                                <span>swats.bio</span>
                                <input
                                  value={draft.alias2}
                                  onChange={(event) =>
                                    setDrafts((current) => ({
                                      ...current,
                                      [row.id]: { ...draft, alias2: event.target.value },
                                    }))
                                  }
                                  placeholder="second alias"
                                  spellCheck={false}
                                />
                              </label>
                              <label className="adm-field">
                                <span>views</span>
                                <input
                                  value={draft.views}
                                  onChange={(event) =>
                                    setDrafts((current) => ({
                                      ...current,
                                      [row.id]: { ...draft, views: event.target.value },
                                    }))
                                  }
                                  inputMode="numeric"
                                  placeholder="0"
                                />
                              </label>
                            </span>
                          ) : (
                            <>
                              <span className="adm-claim">
                                tourn.lol/<b>{row.alias?.trim() || row.username}</b>
                              </span>
                              <span className={`adm-claim${row.alias2 ? "" : " adm-claim--unset"}`}>
                                swats.bio/<b>{row.alias2 || "—"}</b>
                              </span>
                              <span className="adm-claim adm-claim--views">
                                <EyeIcon size={10} /> {row.views.toLocaleString("en-US")} views
                              </span>
                            </>
                          )}
                        </td>
                        <td>{formatJoined(new Date(row.created_at))}</td>
                        <td>
                          <button
                            type="button"
                            className={`adm-toggle${row.premium ? " is-on" : ""}`}
                            onClick={() => void patch(row.id, { premium: !row.premium }, "Premium updated.")}
                            disabled={busy === row.id}
                            aria-label={row.premium ? "Revoke premium" : "Grant premium"}
                          >
                            <BoltIcon size={12} />
                            {row.premium ? "active" : "off"}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`adm-toggle adm-toggle--admin${row.is_admin ? " is-on" : ""}`}
                            onClick={() => void patch(row.id, { is_admin: !row.is_admin }, "Admin flag updated.")}
                            disabled={busy === row.id || row.id === user?.id}
                            title={row.id === user?.id ? "You can't demote yourself" : undefined}
                          >
                            <ShieldIcon size={12} />
                            {row.is_admin ? "admin" : "off"}
                          </button>
                        </td>
                        <td>
                          <span className="adm-row-actions">
                            {draft ? (
                              <>
                                <button
                                  type="button"
                                  className="adm-mini adm-mini--save"
                                  onClick={() => void saveDraft(row)}
                                  disabled={busy === row.id}
                                >
                                  <SaveIcon size={11} />
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="adm-mini"
                                  onClick={() =>
                                    setDrafts((current) => {
                                      const next = { ...current };
                                      delete next[row.id];
                                      return next;
                                    })
                                  }
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="adm-mini"
                                  onClick={() =>
                                    setDrafts((current) => ({
                                      ...current,
                                      [row.id]: {
                                        alias: row.alias ?? "",
                                        alias2: row.alias2 ?? "",
                                        views: String(row.views),
                                      },
                                    }))
                                  }
                                >
                                  Edit
                                </button>
                                <a
                                  className="adm-open"
                                  href={profileHref(row.alias?.trim() || row.username)}
                                >
                                  <LinkIcon size={12} />
                                  open
                                </a>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>
              <SettingsIcon size={14} />
              Registration
            </h2>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={registration === null || modeDraft === registration}
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
                setMsg("Registration mode saved.");
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
      ) : null}

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
              <small>{bot?.guildId ?? "DISCORD_GUILD_ID not set"}</small>
            </article>
          </section>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>
                <DiscordIcon size={14} />
                Bot identity
              </h2>
              {bot?.inviteUrl ? (
                <a
                  className="btn btn-ghost btn-sm"
                  href={bot.inviteUrl}
                  target="_blank"
                  rel="noreferrer"
                >
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
                  ? "The bot token is set, but Discord rejected it. Reset the token in the Discord developer portal and update Railway."
                  : "Set DISCORD_BOT_TOKEN on the Railway backend to turn on DMs and verification codes."}
              </p>
            )}
          </section>

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
          className="btn btn-ghost btn-sm"
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
    </main>
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
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
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
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !valid}>
        <DiscordIcon size={12} />
        {busy ? "Sending…" : "Send DM"}
      </button>
      {!valid && discordId.trim() ? (
        <span className="adm-hint adm-hint--error">That doesn't look like a user ID.</span>
      ) : null}
    </form>
  );
}
