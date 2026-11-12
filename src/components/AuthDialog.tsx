import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/backend";
import { ArrowRight, CloseIcon, DiscordIcon } from "./Icons";

export type AuthMode = "signin" | "signup";

const OAUTH_ERRORS: Record<string, string> = {
  oauth_config: "Discord sign-in isn't set up on this deployment — create an account with an email and password instead.",
  oauth_state: "That Discord link expired before it finished. Press Continue with Discord again.",
  discord_token:
    "Discord stopped before the handshake finished. Press Continue with Discord once more — if it keeps happening, create an account with an email and password instead.",
  discord_profile: "Discord didn't share a profile — allow email sharing on the consent screen and try again.",
  account_link_required: "An account already uses this email. Sign in with its password, then connect Discord from Settings. Contact support if you did not create that account.",
  oauth_failed: "Discord sign-in failed. Try again, or use an email and password.",
  registration_closed: "New accounts are closed right now — existing members can still sign in.",
  invite_required: "That invite code isn't valid or has already been used.",
  discord_taken: "That Discord account is already linked to another profile.",
  link_expired: "That linking link expired — start again from Settings.",
};

function oauthErrorFromUrl(): string | null {
  const hashQuery = window.location.hash.split("?")[1] ?? "";
  const params = new URLSearchParams(hashQuery || window.location.search.replace(/^\?/, ""));
  const raw = params.get("error");
  if (!raw) return null;
  const detail = params.get("detail");
  if (raw === "discord_token") {
    if (detail === "invalid_client") {
      return "Discord rejected the app credentials. On Railway, DISCORD_CLIENT_SECRET doesn't match this Discord app — or it picked up a space or newline when pasted. Fix it, redeploy, then press Continue with Discord again.";
    }
    if (detail === "invalid_grant") {
      return "Discord rejected the sign-in code. Either the callback URL registered on the Discord app doesn't match this deployment, or the code was already used. Check the redirect URL, then press Continue with Discord again.";
    }
    if (detail === "rate_limited") {
      return "Discord is rate-limiting sign-ins right now — wait a minute, then press Continue with Discord again.";
    }
  }
  return OAUTH_ERRORS[raw] ?? "Sign-in failed — try again.";
}

function clearOAuthError() {
  if (/[?&]error=/.test(window.location.hash)) {
    window.history.replaceState(null, "", window.location.hash.split("?")[0] || "#/");
  }
  if (/[?&]error=/.test(window.location.search)) {
    window.history.replaceState(null, "", window.location.pathname);
  }
}

export function AuthDialog({
  open,
  mode,
  onClose,
  onSwitch,
  onDone,
}: {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
  onSwitch: (mode: AuthMode) => void;
  onDone: () => void;
}) {
  const { signIn, signUp, signInWithDiscord, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "discord" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [invite, setInvite] = useState("");
  const [registration, setRegistration] = useState<"open" | "invite" | "closed">("open");

  useEffect(() => {
    if (!open) return;
    setBusy(null);
    // Read and clean up in the same pass. Checking the state variable meant the
    // URL kept its ?error= on the first open, so the message came back every
    // time the dialog was reopened.
    const urlError = oauthErrorFromUrl();
    setError(urlError);
    if (urlError) clearOAuthError();
    setNotice(null);
    setPassword("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  // The backend decides whether new accounts are open, invite-only or closed.
  useEffect(() => {
    if (!open || mode !== "signup") return;
    let active = true;
    void api<{ registration: "open" | "invite" | "closed" }>("/api/site/config").then(
      (result) => {
        if (!active) return;
        setRegistration(result.ok ? result.data.registration : "open");
      },
    );
    return () => {
      active = false;
    };
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const signingUp = mode === "signup";
  const closed = signingUp && registration === "closed";
  const needsInvite = signingUp && registration === "invite";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);
    if (needsInvite && !invite.trim()) {
      setError("Enter your invite code to create an account.");
      return;
    }
    setBusy("email");
    const payload = { email: email.trim(), password };
    const result = signingUp
      ? await signUp({ ...payload, invite: invite.trim() || undefined })
      : await signIn(payload);
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  };

  const handleDiscord = async () => {
    if (busy) return;
    setError(null);
    setNotice(null);
    if (closed) {
      setError("New accounts are closed right now — existing members can still sign in.");
      return;
    }
    if (needsInvite && !invite.trim()) {
      setError("Enter your invite code to create an account.");
      return;
    }
    setBusy("discord");
    const result = await signInWithDiscord(invite.trim() || undefined);
    if (result.error) {
      setBusy(null);
      setError(result.error);
      return;
    }
    if (!configured) {
      setBusy(null);
      onDone();
    }
    // With Discord configured the browser redirects — nothing else to do here.
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog dialog--auth" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <header className="dialog-head">
          <div>
            <img className="auth-logo" src="/logo.png" alt="" width={34} height={34} />
            <h2 id="auth-title">{signingUp ? "Claim your link" : "Welcome back"}</h2>
            <p>
              {signingUp
                ? "Create an account with an email and password — you can connect Discord in Settings later."
                : "Sign in with your email and password, or with Discord."}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon size={16} />
          </button>
        </header>

        <div className="auth-body" key={mode}>
          {!configured ? (
            <div className="auth-demo">
              <p>
                Accounts aren't available right now. Give it a few minutes and try again.
              </p>
            </div>
          ) : null}

          {closed ? (
            <div className="auth-demo">
              <p>
                New accounts are closed right now. If you already have an account, switch to
                sign in — existing members are unaffected.
              </p>
            </div>
          ) : null}

          {needsInvite ? (
            <label className="field auth-invite">
              <span>Invite code</span>
              <input
                value={invite}
                onChange={(event) => setInvite(event.target.value.toUpperCase())}
                placeholder="TOURN-XXXXXXXX"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          ) : null}

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                autoFocus
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={signingUp ? "At least 8 characters" : "Your password"}
                autoComplete={signingUp ? "new-password" : "current-password"}
                required
                minLength={8}
              />
            </label>

            {error ? <p className="auth-error">{error}</p> : null}
            {notice ? <p className="auth-notice">{notice}</p> : null}

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={busy !== null || closed}
            >
              {busy === "email" ? <span className="spinner" /> : null}
              {signingUp ? "Create account" : "Sign in"}
              {busy === "email" ? null : <ArrowRight size={14} />}
            </button>
          </form>

          <div className="auth-divider">
            <span>or use Discord</span>
          </div>

          <button
            type="button"
            className="btn btn-discord"
            onClick={handleDiscord}
            disabled={busy !== null || closed}
          >
            {busy === "discord" ? <span className="spinner" /> : <DiscordIcon size={16} />}
            {signingUp ? "Sign up with Discord" : "Continue with Discord"}
          </button>

          <p className="auth-note">
            {signingUp
              ? "Discord fills in your avatar and handle for you. Email accounts can connect it later in Settings."
              : "Email sign-in works on any account that has a password set. Discord-only accounts can add one in Settings → Security."}
          </p>

          <p className="auth-switch">
            {signingUp ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => onSwitch(signingUp ? "signin" : "signup")}
            >
              {signingUp ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
