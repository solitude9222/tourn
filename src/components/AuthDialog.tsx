import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { ArrowRight, CloseIcon, DiscordIcon } from "./Icons";

export type AuthMode = "signin" | "signup";

const OAUTH_ERRORS: Record<string, string> = {
  oauth_config: "Discord sign-in isn't available right now.",
  oauth_state: "That sign-in link expired — hit the button again.",
  discord_token: "Discord didn't accept the sign-in — try once more.",
  discord_profile: "Couldn't read your Discord profile — allow email sharing on the consent screen.",
  oauth_failed: "Discord sign-in failed. Check the Discord env vars on the Railway backend.",
};

function oauthErrorFromUrl(): string | null {
  const fromHash = window.location.hash.match(/[?&]error=([^&]+)/);
  const fromSearch = window.location.search.match(/[?&]error=([^&]+)/);
  const raw = decodeURIComponent(fromHash?.[1] ?? fromSearch?.[1] ?? "");
  return raw ? (OAUTH_ERRORS[raw] ?? "Sign-in failed — try again.") : null;
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
  const { signIn, signInWithDiscord, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "discord" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setBusy(null);
    setError(oauthErrorFromUrl());
    if (error) clearOAuthError();
    setNotice(null);
    setPassword("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);
    setBusy("email");
    const result = await signIn({ email: email.trim(), password });
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
    setBusy("discord");
    const result = await signInWithDiscord();
    if (result.error) {
      setBusy(null);
      setError(result.error);
      return;
    }
    if (!configured) {
      setBusy(null);
      onDone();
    }
    // With Supabase configured the browser redirects to Discord — nothing
    // else to do here.
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
            <h2 id="auth-title">{mode === "signup" ? "Claim your link" : "Welcome back"}</h2>
            <p>
              {mode === "signup"
                ? "Accounts are created with Discord. Once you're in, you can add an email and a password in Settings."
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
                Sign-in isn't wired up on this deployment — the backend at
                /env.js isn't reachable. Make sure the Railway backend is running with its
                /env.js endpoint (see SETUP.md). Locally: run npm run server alongside
                npm run dev.
              </p>
            </div>
          ) : null}

          <button type="button" className="btn btn-discord" onClick={handleDiscord} disabled={busy !== null}>
            {busy === "discord" ? <span className="spinner" /> : <DiscordIcon size={16} />}
            {mode === "signup" ? "Sign up with Discord" : "Continue with Discord"}
          </button>

          {mode === "signin" ? (
            <>
              <div className="auth-divider">
                <span>or use email</span>
              </div>

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
                    placeholder="Your password"
                    autoComplete="current-password"
                    required
                    minLength={8}
                  />
                </label>

                {error ? <p className="auth-error">{error}</p> : null}
                {notice ? <p className="auth-notice">{notice}</p> : null}

                <button type="submit" className="btn btn-primary auth-submit" disabled={busy !== null}>
                  {busy === "email" ? <span className="spinner" /> : null}
                  Sign in
                  {busy === "email" ? null : <ArrowRight size={14} />}
                </button>
              </form>
            </>
          ) : (
            <>
              {error ? <p className="auth-error">{error}</p> : null}
              {notice ? <p className="auth-notice">{notice}</p> : null}
              <p className="auth-note">
                One click — Discord sets up your account and handle for you.
                <br />
                Want a password too? Add one anytime in <b>Settings → Security</b> and you can
                sign in without Discord.
              </p>
            </>
          )}

          <p className="auth-switch">
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => onSwitch(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
