import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, post } from "./backend";
import { publicEnv } from "./runtimeEnv";
import { loadIsPremium } from "./premium";

export type Account = {
  id: string;
  username: string;
  alias?: string | null;
  /** Premium second claim — shown as swats.bio/<alias2>. */
  alias2?: string | null;
  email: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  /** Granted by an admin (profiles.premium) — re-exports auth.tsx consumers. */
  premium?: boolean;
  /** True when the profiles row is flaged is_admin OR the owner env matches. */
  isAdmin?: boolean;
  /** Set by the backend when the account email matches the owner email. */
  isOwner?: boolean;
};

type AuthResult = { error?: string; needsConfirmation?: boolean };

/** Handles that resolve to app pages and can never be claimed. */
export const RESERVED_HANDLES = new Set([
  "admin",
  "about",
  "shop",
  "leaderboard",
  "dashboard",
  "profile",
  "demo",
  "login",
  "signin",
  "signup",
  "help",
  "support",
  "api",
]);

export function normalizeHandle(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

/**
 * Stable numeric UID shown on the profile card ("UID#1").
 * Every account gets a deterministic number derived from its id, so the same
 * account always shows the same UID.
 */
export function accountUid(accountId: string | undefined | null): number {
  if (!accountId) return 1;
  let hash = 5381;
  for (let index = 0; index < accountId.length; index += 1) {
    hash = ((hash * 33) ^ accountId.charCodeAt(index)) >>> 0;
  }
  return (hash % 999_999) + 1;
}

type AuthValue = {
  user: Account | null;
  first: Account | null;
  isOwner: boolean;
  isAdmin: boolean;
  isPremiumUser: boolean;
  /** Trait aliases (primary claim). Owner can set it; all accounts can claim. */
  setAlias: (alias: string) => Promise<AuthResult>;
  /** Second alias (swats.bio claim) — premium only. */
  setAlias2: (alias2: string | null) => Promise<AuthResult>;
  security: {
    changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<AuthResult>;
    changeEmail: (email: string) => Promise<AuthResult>;
    /** Kills every other signed-in device; the current one stays. */
    signOutOthers: () => Promise<AuthResult>;
    mfaFactors: () => Promise<{ factors: { id: string; createdAt: string }[]; error?: string }>;
    mfaEnroll: () => Promise<{ factorId: string; qr: string; secret: string; error?: string }>;
    mfaVerify: (factorId: string, code: string) => Promise<AuthResult>;
    mfaUnenroll: (factorId: string) => Promise<AuthResult>;
  };
  loading: boolean;
  configured: boolean;
  /** Email + password sign-in for accounts that added a password. */
  signIn: (input: { email: string; password: string }) => Promise<AuthResult>;
  /** Discord OAuth — the ONLY way to create an account. Redirects the page. */
  signInWithDiscord: (invite?: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/** Owner is the account whose email matches VITE_OWNER_EMAIL. */
export function isOwnerEmail(email: string | null): boolean {
  const owner = publicEnv("VITE_OWNER_EMAIL").toLowerCase();
  return Boolean(owner && email && email.trim().toLowerCase() === owner);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [first, setFirst] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session (JWT cookie) from the backend on load.
  useEffect(() => {
    let active = true;
    void api<{ account: Account | null }>("/api/auth/me").then((result) => {
      if (!active) return;
      setUser(result.ok ? result.data.account : null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const refreshFirst = useCallback(async () => {
    const result = await api<{ owner: Account | null }>("/api/profiles/owner");
    setFirst(result.ok ? result.data.owner : null);
  }, []);

  useEffect(() => {
    void refreshFirst();
  }, [refreshFirst, user]);

  const signIn = useCallback<AuthValue["signIn"]>(async ({ email, password }) => {
    const result = await post<{ account: Account }>("/api/auth/login", {
      email: email.trim(),
      password,
    });
    if (!result.ok) return { error: result.error };
    setUser(result.data.account);
    return {};
  }, []);

  const signInWithDiscord = useCallback<AuthValue["signInWithDiscord"]>(async (invite) => {
    // Ask the backend for the Discord authorize URL, then send the browser
    // straight to Discord. Navigating to the API host itself would expose the
    // Railway domain to visitors.
    const code = invite?.trim();
    const result = await api<{ url?: string }>(
      `/api/auth/discord${code ? `?invite=${encodeURIComponent(code)}` : ""}`,
    );
    const url = result.ok ? result.data.url : null;
    if (!result.ok) return { error: result.error };
    if (!url) return { error: "Discord sign-in isn't available right now." };
    window.location.href = url;
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await post("/api/auth/logout");
    setUser(null);
  }, []);

  const setAlias = useCallback<AuthValue["setAlias"]>(
    async (alias) => {
      if (!user) return { error: "Sign in to claim an alias." };
      const clean = normalizeHandle(alias);
      if (clean.length > 24) return { error: "Aliases must be 24 characters or fewer." };
      if (clean.length < 3) return { error: "Aliases need at least 3 characters." };
      if (RESERVED_HANDLES.has(clean)) return { error: `"${clean}" is reserved by the site.` };
      const result = await post<{ account: Account }>("/api/profile/alias", { alias: clean });
      if (!result.ok) return { error: result.error };
      setUser(result.data.account);
      void refreshFirst();
      return {};
    },
    [user, refreshFirst],
  );

  const setAlias2 = useCallback<AuthValue["setAlias2"]>(
    async (input) => {
      if (!user) return { error: "Sign in to claim an alias." };
      const clean = input ? normalizeHandle(input) : "";
      if (clean && RESERVED_HANDLES.has(clean)) {
        return { error: `"${clean}" is already taken.` };
      }
      const result = await post<{ account: Account }>("/api/profile/alias2", { alias2: clean });
      if (!result.ok) return { error: result.error };
      setUser(result.data.account);
      return {};
    },
    [user],
  );

  const changePassword = useCallback<AuthValue["security"]["changePassword"]>(
    async ({ currentPassword, newPassword }) => {
      if (!user) return { error: "Sign in to manage your password." };
      if (newPassword.length < 8) return { error: "Use a password with at least 8 characters." };
      const result = await post("/api/auth/password", { currentPassword, newPassword });
      return result.ok ? {} : { error: result.error };
    },
    [user],
  );

  const changeEmail = useCallback<AuthValue["security"]["changeEmail"]>(
    async (email) => {
      if (!user) return { error: "Sign in to change your email." };
      const result = await post("/api/auth/email", { email: email.trim() });
      return result.ok ? {} : { error: result.error };
    },
    [user],
  );

  const signOutOthers = useCallback<AuthValue["security"]["signOutOthers"]>(async () => {
    const result = await post("/api/auth/signout-others");
    return result.ok ? {} : { error: result.error };
  }, []);

  const mfaFactors = useCallback<AuthValue["security"]["mfaFactors"]>(async () => {
    const result = await api<{ factors: { id: string; createdAt: string }[] }>(
      "/api/auth/mfa/factors",
    );
    return result.ok
      ? { factors: result.data.factors ?? [] }
      : { factors: [], error: result.error };
  }, []);

  const mfaEnroll = useCallback<AuthValue["security"]["mfaEnroll"]>(async () => {
    const result = await post<{ factorId: string; qr: string; secret: string }>(
      "/api/auth/mfa/enroll",
    );
    return result.ok
      ? { factorId: result.data.factorId, qr: result.data.qr, secret: result.data.secret }
      : { factorId: "", qr: "", secret: "", error: result.error };
  }, []);

  const mfaVerify = useCallback<AuthValue["security"]["mfaVerify"]>(
    async (factorId, code) => {
      void factorId;
      const result = await post("/api/auth/mfa/verify", { code });
      return result.ok ? {} : { error: result.error };
    },
    [],
  );

  const mfaUnenroll = useCallback<AuthValue["security"]["mfaUnenroll"]>(
    async (factorId) => {
      void factorId;
      const result = await post("/api/auth/mfa/unenroll");
      return result.ok ? {} : { error: result.error };
    },
    [],
  );

  const ownPremium = user ? Boolean(user.premium) || loadIsPremium(user.id) : false;
  const isOwner = isOwnerEmail(user?.email ?? null) || Boolean(user?.isOwner);
  const isAdmin = isOwner || Boolean(user?.isAdmin);

  const accountWithProfile = useMemo<Account | null>(
    () => (user ? { ...user, premium: ownPremium, isAdmin, isOwner } : null),
    [user, ownPremium, isAdmin, isOwner],
  );

  const security = useMemo<AuthValue["security"]>(
    () => ({ changePassword, changeEmail, signOutOthers, mfaFactors, mfaEnroll, mfaVerify, mfaUnenroll }),
    [changePassword, changeEmail, signOutOthers, mfaFactors, mfaEnroll, mfaVerify, mfaUnenroll],
  );

  const value = useMemo<AuthValue>(
    () => ({
      user: accountWithProfile,
      first,
      isOwner,
      isAdmin,
      isPremiumUser: ownPremium,
      setAlias,
      setAlias2,
      security,
      loading,
      configured: true,
      signIn,
      signInWithDiscord,
      signOut,
    }),
    [
      accountWithProfile,
      first,
      isOwner,
      isAdmin,
      ownPremium,
      setAlias,
      setAlias2,
      security,
      loading,
      signIn,
      signInWithDiscord,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
