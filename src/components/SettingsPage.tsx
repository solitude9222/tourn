/* ---------------------------------------------------------------------------
   Account settings.

   Rendered as a normal dashboard page: the same cards, buttons, fields and
   type scale as every other page, instead of a second, older design language.
   Platform connections (Discord, Spotify, Steam, …) live on the Widgets page,
   so there is no "Connections" tab here — just the account itself.
   --------------------------------------------------------------------------- */

import { useEffect, useState } from "react";
import { accountUid, useAuth } from "../lib/auth";
import { formatJoined } from "../lib/format";
import { Button, Card, CardHead, Chip, Field, Icon, TextInput } from "../dash/ui";
import { UploadEmbedCard, UploadResponseCard } from "./UploadSettings";

type SettingsNavigateTarget = "about" | "widgets" | "links";

export function SettingsPage({
  onNavigate,
  onReset,
}: {
  onNavigate?: (page: SettingsNavigateTarget) => void;
  onReset?: () => void;
}) {
  const { user, isPremiumUser, setAlias, setAlias2, security, configured, isAdmin, linkDiscord } =
    useAuth();
  const [linkBusy, setLinkBusy] = useState(false);
  // The Discord link flow returns here with its result in the hash.
  const [linkMsg, setLinkMsg] = useState<string | null>(() => {
    const hash = window.location.hash;
    if (hash.includes("linked=discord")) return "Discord is now connected to this account.";
    if (hash.includes("error=discord_taken")) {
      return "That Discord account is already attached to a different tourn.lol account.";
    }
    if (hash.includes("error=link_expired")) return "That link expired — sign in and connect again.";
    return null;
  });
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
    else setAliasMsg("Primary claim saved.");
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
    <div className="tw-set">
      <Card>
        <div className="tw-set-id">
          <span className="tw-set-avatar">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" />
            ) : (
              displayName.slice(0, 1).toUpperCase()
            )}
          </span>
          <div className="tw-set-idcopy">
            <b>{displayName}</b>
            <small>
              @{user?.username}
              {user?.email ? ` · ${user.email}` : ""}
            </small>
            <div className="tw-set-chips">
              <Chip>#{uid}</Chip>
              {isPremiumUser ? <Chip tone="accent">Premium</Chip> : null}
              {isAdmin ? <Chip tone="amber">Admin</Chip> : null}
              {user ? <Chip>Joined {formatJoined(new Date(user.joinedAt))}</Chip> : null}
            </div>
          </div>
          <div className="tw-row">
            <a className="tw-btn tw-btn--ghost" href={`#/profile/${user?.username ?? ""}`}>
              <Icon name="eye" size={15} />
              Public page
            </a>
            {onNavigate ? (
              <Button icon="grid" onClick={() => onNavigate("widgets")}>
                Edit widgets
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <CardHead
          icon="link"
          title="Claims"
          subtitle="Your handle on tourn.lol, plus the Premium second claim on swats.bio."
        />

        <div className="tw-set-grid">
          <div className="tw-set-block">
            <div className="tw-set-block-head">
              <b>Primary claim</b>
              <Chip tone="success">Free</Chip>
            </div>
            <Field label="Alias" hint="Letters, numbers, dots, underscores and dashes only. 3–24 characters.">
              <span className="tw-prefix">
                <i>tourn.lol/</i>
                <input
                  value={aliasDraft}
                  onChange={(event) => setAliasDraft(event.target.value)}
                  placeholder={user?.username ?? "yourname"}
                  maxLength={24}
                  spellCheck={false}
                />
              </span>
            </Field>
            <div className="tw-row">
              <Button variant="primary" disabled={aliasBusy} onClick={() => void saveAlias()}>
                {aliasBusy ? "Saving…" : "Save claim"}
              </Button>
              <Button onClick={() => setAliasDraft(user?.username ?? "")}>Use handle</Button>
            </div>
            {aliasMsg ? <p className="tw-set-note">{aliasMsg}</p> : null}
          </div>

          <div className={`tw-set-block${isPremiumUser ? "" : " is-locked"}`}>
            <div className="tw-set-block-head">
              <b>Second claim</b>
              <Chip tone={isPremiumUser ? "accent" : "muted"}>Premium</Chip>
            </div>
            <Field
              label="swats.bio alias"
              hint={
                isPremiumUser
                  ? "Claiming is checked against every taken handle first."
                  : "A second claim on swats.bio is one of Premium's perks."
              }
            >
              <span className="tw-prefix">
                <i>swats.bio/</i>
                <input
                  value={alias2Draft}
                  onChange={(event) => setAlias2Draft(event.target.value)}
                  placeholder={isPremiumUser ? "yoursecondname" : "Premium"}
                  maxLength={24}
                  spellCheck={false}
                  disabled={!isPremiumUser}
                />
              </span>
            </Field>
            <div className="tw-row">
              {isPremiumUser ? (
                <>
                  <Button variant="primary" disabled={aliasBusy} onClick={() => void saveAlias2()}>
                    Save second claim
                  </Button>
                  {user?.alias2 ? (
                    <Button
                      icon="trash"
                      onClick={() => {
                        setAlias2Draft("");
                        void setAlias2(null).then(() => setAlias2Msg("Second claim cleared."));
                      }}
                    >
                      Release
                    </Button>
                  ) : null}
                </>
              ) : (
                <Button
                  variant="primary"
                  icon="crown"
                  onClick={() => {
                    window.location.hash = "#/premium";
                  }}
                >
                  Unlock with Premium
                </Button>
              )}
            </div>
            {alias2Msg ? <p className="tw-set-note">{alias2Msg}</p> : null}
          </div>
        </div>

        {user ? (
          <div className="tw-set-links">
            <span>
              <code>tourn.lol/{user.alias?.trim() || user.username}</code>
              <small>always live</small>
            </span>
            <span>
              <code>swats.bio/{user.alias2 || user.username}</code>
              <small>{isPremiumUser ? "premium" : "premium — locked"}</small>
            </span>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHead
          icon="discord"
          title="Connections"
          subtitle="Attach Discord so widgets and the server can find you."
        />
        <div className={`tw-set-row${user?.discordLinked ? " is-on" : ""}`}>
          <span className="tw-set-row-icon">
            <Icon name="discord" size={18} />
          </span>
          <span className="tw-set-row-copy">
            <b>Discord</b>
            <small>
              {user?.discordLinked
                ? "Connected — your Discord profile is available to widgets and server tools."
                : "Not connected. Link it to use your Discord profile without a second account."}
            </small>
          </span>
          {user?.discordLinked ? (
            <Chip tone="success">Connected</Chip>
          ) : (
            <Button
              variant="primary"
              icon="discord"
              disabled={linkBusy || configured === false}
              onClick={() => {
                setLinkBusy(true);
                setLinkMsg(null);
                void linkDiscord().then((result) => {
                  setLinkBusy(false);
                  if (result.error) setLinkMsg(result.error);
                });
              }}
            >
              {linkBusy ? "Opening Discord…" : "Connect"}
            </Button>
          )}
        </div>
        {linkMsg ? <p className="tw-set-note">{linkMsg}</p> : null}
        <p className="tw-set-note">
          Signing in with Discord attaches it automatically when the Discord email matches this
          account. Use the button above when they don't match.
        </p>
      </Card>

      <UploadEmbedCard />

      <UploadResponseCard />

      <Card>
        <CardHead
          icon="shield"
          title="Security"
          subtitle="Email, password, two-factor authentication and signed-in devices."
        />
        <SecurityPanel security={security} configured={configured} isAdmin={isAdmin} />
      </Card>

      <Card>
        <CardHead
          icon="crown"
          title="Plan"
          subtitle={isPremiumUser ? "Premium is active on this account." : "Free plan."}
          actions={
            <Button
              variant={isPremiumUser ? "ghost" : "primary"}
              icon={isPremiumUser ? "settings" : "bolt"}
              onClick={() => {
                window.location.hash = "#/premium";
              }}
            >
              {isPremiumUser ? "Manage plan" : "See Premium"}
            </Button>
          }
        />
        <ul className="tw-set-plan">
          {[
            ["None background and text effects", true],
            ["Background / overlay effects", isPremiumUser],
            ["Every audio style and file upload", isPremiumUser],
            ["Glass and glow link card styles", isPremiumUser],
            ["Second claim on swats.bio", isPremiumUser],
            ["Ten template shares instead of two", isPremiumUser],
          ].map(([label, on]) => (
            <li key={String(label)} className={on ? "is-on" : ""}>
              <Icon name={on ? "check" : "lock"} size={13} />
              {label}
              <small>{on ? "Included" : "Premium"}</small>
            </li>
          ))}
        </ul>
        {onNavigate ? (
          <p className="tw-set-note">
            <button type="button" className="tw-inline-link" onClick={() => onNavigate("links")}>
              Style your links
            </button>{" "}
            or{" "}
            <button type="button" className="tw-inline-link" onClick={() => onNavigate("about")}>
              edit your profile
            </button>
            .
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHead
          icon="refresh"
          title="Reset"
          subtitle="Put your profile appearance back to the tourn.lol defaults."
        />
        <div className="tw-set-row">
          <span className="tw-set-row-icon">
            <Icon name="refresh" size={16} />
          </span>
          <span className="tw-set-row-copy">
            <b>Reset to defaults</b>
            <small>
              Card colours, layout, widget style and effects go back to how they shipped. Your bio,
              links and uploaded artwork stay.
            </small>
          </span>
          <Button icon="refresh" disabled={!onReset} onClick={onReset}>
            Reset to defaults
          </Button>
        </div>
      </Card>
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
    <div className="tw-set-sec">
      {!configured ? (
        <p className="tw-set-warn">
          Sign-in isn't wired up on this deployment — the backend's /env.js isn't reachable. Start
          the API (npm run server) and password, 2FA and session controls come alive.
        </p>
      ) : (
        <p className="tw-set-note">
          <b>Verify with Discord:</b> the bot DMs you a 6-digit code to confirm password, email and
          2FA changes, so a stolen browser session alone can't lock you out.
        </p>
      )}

      <div className="tw-set-row">
        <span className="tw-set-row-icon">
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <Icon name="user" size={16} />}
        </span>
        <span className="tw-set-row-copy">
          <b>{user?.email ?? "Discord account"}</b>
          <small>
            @{user?.username}
            {user?.id ? ` · ${user.id.slice(0, 8)}…` : ""}
          </small>
        </span>
        {isAdmin ? <Chip tone="amber">Admin</Chip> : <Chip>Member</Chip>}
      </div>

      {configured ? (
        <>
          <div className="tw-set-grid">
            <div className="tw-set-block">
              <div className="tw-set-block-head">
                <b>Email</b>
              </div>
              <Field label="New email" hint="The backend updates it immediately — it becomes a second sign-in method.">
                <TextInput
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder={user?.email ?? ""}
                  autoComplete="email"
                />
              </Field>
              <Button disabled={busy || !newEmail.trim()} onClick={() => void changeEmail()}>
                Send change request
              </Button>
              {emailMsg ? <p className="tw-set-note">{emailMsg}</p> : null}
            </div>

            <div className="tw-set-block">
              <div className="tw-set-block-head">
                <b>Password</b>
              </div>
              <Field label="Current password">
                <TextInput
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Required before any change"
                  autoComplete="current-password"
                />
              </Field>
              <Field label="New password" hint="At least 8 characters.">
                <TextInput
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                />
              </Field>
              <Button variant="primary" disabled={busy || !newPassword} onClick={() => void changePassword()}>
                Update password
              </Button>
              {passwordMsg ? <p className="tw-set-note">{passwordMsg}</p> : null}
            </div>
          </div>

          <div className="tw-set-block">
            <div className="tw-set-block-head">
              <b>Two-factor authentication</b>
              {mfaFactors.length ? <Chip tone="success">On</Chip> : <Chip>Off</Chip>}
            </div>
            {mfaFactors.length > 0 ? (
              <>
                {mfaFactors.map((factor) => (
                  <div className="tw-set-row" key={factor.id}>
                    <span className="tw-set-row-icon">
                      <Icon name="shield" size={16} />
                    </span>
                    <span className="tw-set-row-copy">
                      <b>Authenticator app</b>
                      <small>added {new Date(factor.createdAt).toLocaleDateString()}</small>
                    </span>
                    <Button disabled={busy} onClick={() => void stopMfa(factor.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </>
            ) : mfaQr ? (
              <div className="tw-set-mfa">
                <img src={mfaQr} alt="TOTP enrollment QR code" width={164} height={164} />
                <div className="tw-set-mfa-side">
                  <code>{mfaSecret}</code>
                  <Field label="Code from your app">
                    <TextInput
                      value={mfaCode}
                      onChange={(event) =>
                        setMfaCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="123456"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                  </Field>
                  <div className="tw-row">
                    <Button
                      variant="primary"
                      disabled={busy || mfaCode.length !== 6}
                      onClick={() => void verifyMfa()}
                    >
                      Verify &amp; enable
                    </Button>
                    <Button onClick={() => setMfaQr("")}>Cancel</Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button icon="shield" disabled={busy} onClick={() => void startMfa()}>
                Set up authenticator app
              </Button>
            )}
            {mfaMsg ? <p className="tw-set-note">{mfaMsg}</p> : null}
          </div>

          <div className="tw-set-row">
            <span className="tw-set-row-icon">
              <Icon name="logout" size={16} />
            </span>
            <span className="tw-set-row-copy">
              <b>Other sessions</b>
              <small>Any old device still signed in to this account</small>
            </span>
            <Button disabled={busy} onClick={() => void killSessions()}>
              Sign them out
            </Button>
          </div>
          {sessionMsg ? <p className="tw-set-note">{sessionMsg}</p> : null}
        </>
      ) : null}

      <div className="tw-set-danger">
        <div>
          <b>Sign out of this device</b>
          <small>Your saved profile stays on tourn.lol.</small>
        </div>
        <Button icon="logout" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
