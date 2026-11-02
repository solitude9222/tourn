import { useEffect, useState } from "react";
import { accountUid, useAuth } from "../lib/auth";
import { formatJoined } from "../lib/format";
import {
  ArrowUpRight,
  BoltIcon,
  CheckIcon,
  CloseIcon,
  GridIcon,
  KeyIcon,
  LinkIcon,
  MailIcon,
  ShieldIcon,
  TrashIcon,
  UserIcon,
} from "./Icons";
import "../dashboard.css";

type SettingsNavigateTarget = "about" | "widgets" | "links";

/**
 * Account settings, rendered as a normal dashboard page instead of a pop-up.
 * Platform connections (Discord, Spotify, Steam, …) live on the Widgets page,
 * so there is no "Connections" tab here.
 */
export function SettingsPage({
  onNavigate,
}: {
  onNavigate?: (page: SettingsNavigateTarget) => void;
}) {
  const { user, isPremiumUser, setAlias, setAlias2, security, configured, isAdmin } = useAuth();
  const [aliasDraft, setAliasDraft] = useState("");
  const [alias2Draft, setAlias2Draft] = useState("");
  const [aliasMsg, setAliasMsg] = useState<string | null>(null);
  const [alias2Msg, setAlias2Msg] = useState<string | null>(null);
  const [aliasBusy, setAliasBusy] = useState(false);

  useEffect(() => {
    setAliasDraft(user?.alias ?? "");
    setAlias2Draft(user?.alias2 ?? "");
  }, [user?.id, user?.alias, user?.alias2]);

  const saveAlias = async () => {
    setAliasBusy(true);
    setAliasMsg(null);
    const result = await setAlias(aliasDraft);
    setAliasBusy(false);
    if (result.error) setAliasMsg(result.error);
    else setAliasMsg("Primary alias saved.");
  };

  const saveAlias2 = async () => {
    setAliasBusy(true);
    setAlias2Msg(null);
    const result = await setAlias2(alias2Draft.trim() || null);
    setAliasBusy(false);
    if (result.error) setAlias2Msg(result.error);
    else
      setAlias2Msg(
        alias2Draft.trim() ? "Second claim saved — live on swats.bio." : "Second claim cleared.",
      );
  };

  const displayName = user?.alias?.trim() || user?.username || "Account";
  const uid = accountUid(user);

  return (
    <div className="settings-page">
      <header className="settings-hero" data-reveal>
        <div className="settings-hero-id">
          {user?.avatarUrl ? (
            <img className="settings-hero-avatar" src={user.avatarUrl} alt="" />
          ) : (
            <span className="settings-hero-avatar settings-hero-avatar--initial">
              {displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="settings-hero-name">
            <b>{displayName}</b>
            <small>{user?.email ?? "Discord account"}</small>
          </div>
          <div className="settings-hero-tags">
            <span className="settings-tag">#{uid}</span>
            {isPremiumUser ? (
              <span className="settings-tag settings-tag--premium">
                <BoltIcon size={10} />
                Premium
              </span>
            ) : null}
            {isAdmin ? <span className="settings-tag settings-tag--admin">Admin</span> : null}
            {user ? (
              <span className="settings-tag settings-tag--dim">
                Joined {formatJoined(new Date(user.joinedAt))}
              </span>
            ) : null}
          </div>
        </div>
        <div className="settings-hero-actions">
          <a className="btn btn-ghost btn-sm" href={`#/profile/${user?.username ?? ""}`}>
            View public bio
            <ArrowUpRight size={12} />
          </a>
          {onNavigate ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate("widgets")}>
              <GridIcon size={12} />
              Edit widgets
            </button>
          ) : null}
        </div>
      </header>

      <section className="dash-panel about-panel" data-reveal>
        <header className="about-panel-head">
          <div>
            <h2>Claims</h2>
            <p>Your handle on tourn.lol, plus the Premium second claim on swats.bio.</p>
          </div>
          <span className="dash-section-icon dash-section-icon--small">
            <LinkIcon size={13} />
          </span>
        </header>

        <div className="settings-page-body settings-aliases">
          <div className="settings-grid">
            <div className="settings-block">
              <h3>
                <LinkIcon size={13} /> Primary claim
              </h3>
              <label className="about-field">
                <span>Alias (shown as tourn.lol/&lt;alias&gt;)</span>
                <div className="input-prefix">
                  <span>tourn.lol/</span>
                  <input
                    value={aliasDraft}
                    onChange={(event) => setAliasDraft(event.target.value)}
                    placeholder={user?.username ?? "yourname"}
                    maxLength={24}
                    spellCheck={false}
                  />
                </div>
                <small>
                  Letters, numbers, dots, underscores and dashes only. 3–24 characters. Free for
                  every account.
                </small>
              </label>
              <div className="settings-alias-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void saveAlias()}
                  disabled={aliasBusy}
                >
                  {aliasBusy ? "Saving…" : "Save primary claim"}
                  <ArrowUpRight size={13} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setAliasDraft(user?.username ?? "")}
                >
                  Use handle
                </button>
              </div>
              {aliasMsg ? <p className="settings-note">{aliasMsg}</p> : null}
            </div>

            <div className={`settings-block${isPremiumUser ? "" : " is-locked"}`}>
              <h3>
                <BoltIcon size={13} /> Second claim · Premium
              </h3>
              <label className="about-field">
                <span>Second alias (shown as swats.bio/&lt;alias&gt;)</span>
                <div className={`input-prefix${isPremiumUser ? "" : " input-prefix--locked"}`}>
                  <span>swats.bio/</span>
                  <input
                    value={alias2Draft}
                    onChange={(event) => setAlias2Draft(event.target.value)}
                    placeholder={isPremiumUser ? "yoursecondname" : "Premium"}
                    maxLength={24}
                    spellCheck={false}
                    disabled={!isPremiumUser}
                  />
                </div>
                <small>
                  {isPremiumUser
                    ? "Premium accounts can claim a second handle on swats.bio. Claiming is checked against every taken handle first."
                    : "A second claim on swats.bio is one of Premium's perks. Unlock it, then claim yours."}
                </small>
              </label>
              <div className="settings-alias-actions">
                {isPremiumUser ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => void saveAlias2()}
                      disabled={aliasBusy}
                    >
                      Save second claim
                    </button>
                    {user?.alias2 ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setAlias2Draft("");
                          void setAlias2(null).then(() => setAlias2Msg("Second claim cleared."));
                        }}
                      >
                        <TrashIcon size={13} />
                        Release claim
                      </button>
                    ) : null}
                  </>
                ) : (
                  <a className="btn btn-primary btn-sm" href="#/premium">
                    <BoltIcon size={13} />
                    Unlock with Premium
                  </a>
                )}
              </div>
              {alias2Msg ? <p className="settings-note">{alias2Msg}</p> : null}
            </div>
          </div>

          {user ? (
            <div className="settings-block">
              <h3>
                <LinkIcon size={13} /> Your two links
              </h3>
              <ul className="settings-link-list">
                <li>
                  <code>tourn.lol/{user.alias?.trim() || user.username}</code>
                  <small>always live</small>
                </li>
                <li>
                  <code>swats.bio/{user.alias2 || user.username}</code>
                  <small>{isPremiumUser ? "premium" : "premium — locked"}</small>
                </li>
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="dash-panel about-panel" data-reveal data-reveal-delay="60">
        <header className="about-panel-head">
          <div>
            <h2>Security</h2>
            <p>Password, email, two-factor authentication and signed-in devices.</p>
          </div>
          <span className="dash-section-icon dash-section-icon--small">
            <ShieldIcon size={13} />
          </span>
        </header>
        <div className="settings-page-body">
          <SecurityPanel security={security} configured={configured} isAdmin={isAdmin} />
        </div>
      </section>

      <section className="dash-panel about-panel" data-reveal data-reveal-delay="120">
        <header className="about-panel-head">
          <div>
            <h2>Premium</h2>
            <p>What is free, what is unlocked with Premium, and where to get it.</p>
          </div>
          <span className="dash-section-icon dash-section-icon--small">
            <BoltIcon size={13} />
          </span>
        </header>

        <div className="settings-page-body settings-premium">
          <p className="settings-premium-state">
            <BoltIcon size={14} />
            {isPremiumUser ? (
              <>
                <b>Premium is active</b> on this account — everything on this list is unlocked.
              </>
            ) : (
              <>
                <b>Free plan.</b> Everything core stays free; the extras below are Premium.
              </>
            )}
          </p>
          <ul className="settings-premium-list">
            <li>
              <CheckIcon size={12} /> "None" background and text effects
              <small>Free</small>
            </li>
            <li>
              <BoltIcon size={12} /> Background / overlay effects beyond None
              <small>Premium</small>
            </li>
            <li>
              <BoltIcon size={12} /> Flashier audio styles + file-upload audio
              <small>Premium</small>
            </li>
            <li>
              <BoltIcon size={12} /> Glass / Glow link card styles
              <small>Premium</small>
            </li>
            <li>
              <BoltIcon size={12} /> Second claim → swats.bio/&lt;alias&gt;
              <small>Premium</small>
            </li>
          </ul>
          <div className="settings-premium-actions">
            <a className="btn btn-primary btn-sm" href="#/premium">
              <BoltIcon size={13} />
              See the full Premium plan
              <ArrowUpRight size={13} />
            </a>
            {onNavigate ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onNavigate("links")}
              >
                Style your links
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ security */

function SecurityPanel({
  security,
  configured,
  isAdmin,
}: {
  security: ReturnType<typeof useAuth>["security"];
  configured: boolean;
  isAdmin: boolean;
}) {
  const { user, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [sessionMsg, setSessionMsg] = useState<string | null>(null);
  const [mfaFactors, setMfaFactors] = useState<{ id: string; createdAt: string }[]>([]);
  const [mfaQr, setMfaQr] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaMsg, setMfaMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMfaFactors([]);
    setMfaQr("");
    setMfaSecret("");
    setMfaFactorId("");
    setMfaCode("");
    setMfaMsg(null);
    if (configured) {
      void security.mfaFactors().then((result) => {
        setMfaFactors(result.factors);
        if (result.error) setMfaMsg(result.error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  const changePassword = async () => {
    setBusy(true);
    setPasswordMsg(null);
    if (newPassword !== "" && currentPassword === "") {
      setBusy(false);
      setPasswordMsg("Confirm with your current password.");
      return;
    }
    const result = await security.changePassword({ currentPassword, newPassword });
    setBusy(false);
    if (result.error) setPasswordMsg(result.error);
    else {
      setPasswordMsg("Password changed — it took effect immediately.");
      setCurrentPassword("");
      setNewPassword("");
    }
  };

  const changeEmail = async () => {
    setBusy(true);
    setEmailMsg(null);
    const result = await security.changeEmail(newEmail.trim());
    setBusy(false);
    if (result.error) setEmailMsg(result.error);
    else if (result.needsConfirmation) {
      setEmailMsg(`Sent a confirmation link to ${newEmail.trim()} — click it to finish.`);
      setNewEmail("");
    }
  };

  const killSessions = async () => {
    setBusy(true);
    setSessionMsg(null);
    const result = await security.signOutOthers();
    setBusy(false);
    setSessionMsg(result.error ?? "Every other signed-in device has been signed out.");
  };

  const startMfa = async () => {
    setBusy(true);
    setMfaMsg(null);
    const result = await security.mfaEnroll();
    setBusy(false);
    if (result.error) {
      setMfaMsg(result.error);
      return;
    }
    setMfaQr(result.qr);
    setMfaSecret(result.secret);
    setMfaFactorId(result.factorId);
  };

  const verifyMfa = async () => {
    setBusy(true);
    setMfaMsg(null);
    const result = await security.mfaVerify(mfaFactorId, mfaCode);
    setBusy(false);
    if (result.error) {
      setMfaMsg(result.error);
      return;
    }
    setMfaQr("");
    setMfaSecret("");
    setMfaFactorId("");
    setMfaCode("");
    const { factors } = await security.mfaFactors();
    setMfaFactors(factors);
    setMfaMsg("Two-factor authentication is on.");
  };

  const stopMfa = async (factorId: string) => {
    setBusy(true);
    setMfaMsg(null);
    const result = await security.mfaUnenroll(factorId);
    setBusy(false);
    if (result.error) setMfaMsg(result.error);
    else {
      const { factors } = await security.mfaFactors();
      setMfaFactors(factors);
      setMfaMsg("Two-factor authentication is off.");
    }
  };

  return (
    <div className="settings-security">
      {!configured ? (
        <p className="settings-note settings-note--warn">
          Sign-in isn't wired up on this deployment — the backend's /env.js isn't reachable. Make
          sure the Railway backend is running (see SETUP.md). Locally: run npm run server
          alongside npm run dev. Passwords, MFA and session controls come alive once it is.
        </p>
      ) : null}

      {configured ? (
        <p className="settings-note">
          <b>Verify with Discord:</b> the tourn.lol bot DMs you a 6-digit code to confirm password,
          email and 2FA changes — a stolen browser session alone can't lock you out. Until the bot
          ships, password changes re-verify your current password and 2FA uses your authenticator
          app.
        </p>
      ) : null}

      <section className="settings-block">
        <h3>
          <MailIcon size={13} /> Account
        </h3>
        <div className="settings-session-box">
          <div className="settings-session-row">
            <img src={user?.avatarUrl ?? "/logo.png"} alt="" width={20} height={20} />
            <span>
              <b>{user?.email ?? "Discord account"}</b>
              <small>@{user?.username}</small>
            </span>
            <span className="settings-session-id">{user?.id ? `${user.id.slice(0, 8)}…` : null}</span>
            {isAdmin ? <span className="settings-admin-tag">admin</span> : null}
          </div>
          {configured ? (
            <div className="settings-session-row">
              <KeyIcon size={14} />
              <span>
                <b>Other active sessions</b>
                <small>Any old device still signed into this account</small>
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void killSessions()}
                disabled={busy}
              >
                Sign them out
              </button>
            </div>
          ) : null}
          {sessionMsg ? <p className="settings-note">{sessionMsg}</p> : null}
        </div>
        {configured ? (
          <>
            <label className="about-field">
              <span>Change email</span>
              <input
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                placeholder={user?.email ?? ""}
                autoComplete="email"
              />
              <small>The backend updates your email immediately — it becomes a second sign-in method.</small>
            </label>
            <div className="settings-alias-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void changeEmail()}
                disabled={busy || !newEmail.trim()}
              >
                Send change request
              </button>
            </div>
            {emailMsg ? <p className="settings-note">{emailMsg}</p> : null}
          </>
        ) : null}
      </section>

      {configured ? (
        <section className="settings-block">
          <h3>
            <KeyIcon size={13} /> Password
          </h3>
          <label className="about-field">
            <span>Current password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Required before any change"
              autoComplete="current-password"
            />
          </label>
          <label className="about-field">
            <span>New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
            />
          </label>
          <div className="settings-alias-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void changePassword()}
              disabled={busy || !newPassword}
            >
              Update password
            </button>
          </div>
          {passwordMsg ? <p className="settings-note">{passwordMsg}</p> : null}
        </section>
      ) : null}

      {configured ? (
        <section className="settings-block">
          <h3>
            <ShieldIcon size={13} /> Two-factor (TOTP)
          </h3>
          {mfaFactors.length > 0 ? (
            <div className="settings-session-box">
              {mfaFactors.map((factor) => (
                <div className="settings-session-row" key={factor.id}>
                  <ShieldIcon size={14} />
                  <span>
                    <b>Authenticator app</b>
                    <small>added {new Date(factor.createdAt).toLocaleDateString()}</small>
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void stopMfa(factor.id)}
                    disabled={busy}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : mfaQr ? (
            <>
              <div className="settings-mfa-qr" aria-label="Authenticator QR code">
                <img src={mfaQr} alt="TOTP enrollment QR code" />
              </div>
              <code className="settings-mfa-secret">{mfaSecret}</code>
              <label className="about-field">
                <span>Paste the 6-digit code from your app</span>
                <input
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </label>
              <div className="settings-alias-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void verifyMfa()}
                  disabled={busy || mfaCode.length !== 6}
                >
                  Verify & enable
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMfaQr("")}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void startMfa()}
              disabled={busy}
            >
              <ShieldIcon size={13} />
              Set up authenticator app
            </button>
          )}
          {mfaMsg ? <p className="settings-note">{mfaMsg}</p> : null}
        </section>
      ) : null}

      {configured ? (
        <section className="settings-block">
          <h3>
            <UserIcon size={13} /> Danger zone
          </h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm settings-signout"
            onClick={() => void signOut()}
          >
            <CloseIcon size={12} />
            Sign out of this device
          </button>
        </section>
      ) : null}
    </div>
  );
}
