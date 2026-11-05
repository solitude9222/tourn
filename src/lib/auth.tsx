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
import {
  forgetAccount as forgetStoredAccount,
  loadAccounts,
  requestAccountTicket,
  switchSession,
  upsertAccount,
  type StoredAccount,
} from "./accounts";

export type Account = {
  id: string;
  /** Sequential account number — always shown as #1, #2, … */
  uid?: number | null;
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
  /** True once a Discord account is attached to this account. */
  discordLinked?: boolean;
  /** The owner's Discord id — used to prefill live presence. */
  discordId?: string | null;
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
 * The account's sequential number, shown as "#1", "#2", …
 * The backend derives it from sign-up order; unknown accounts fall back to #1
 * rather than inventing a random-looking value.
 */
export function accountUid(account: Pick<Account, "uid"> | null | undefined): number {
  const uid = account?.uid;
  return typeof uid === "number" && Number.isFinite(uid) && uid > 0 ? Math.floor(uid) : 1;
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
  /** True when the session check itself failed (backend down), not "signed out". */
  unavailable: boolean;
  /** Re-checks the session cookie — used by the "can't reach" states. */
  retryAuth: () => Promise<void>;
  configured: boolean;
  /** Email + password sign-in for accounts that added a password. */
  signIn: (input: { email: string; password: string }) => Promise<AuthResult>;
  /** Email + password account creation — works without Discord. */
  signUp: (input: { email: string; password: string; invite?: string }) => Promise<AuthResult>;
  /** Discord OAuth — the ONLY way to create an account. Redirects the page. */
  signInWithDiscord: (invite?: string) => Promise<AuthResult>;
  /**
   * Attach Discord to the signed-in account (email/password sign-ups).
   * Redirects the page to Discord and returns to Settings when done.
   */
  linkDiscord: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** Accounts saved on this device, most recent first. */
  accounts: StoredAccount[];
  /** Re-establishes a stored account without a password. */
  switchAccount: (id: string) => Promise<AuthResult>;
  /** Drops a saved account from this device only. */
  forgetAccount: (id: string) => void;
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
  const [unavailable, setUnavailable] = useState(false);
  const [accounts, setAccounts] = useState<StoredAccount[]>(() => loadAccounts());

  // Save a pass for the account that just signed in, so the rail can offer it
  // later without another password prompt.
  const rememberAccount = useCallback(async (account: Account) => {
    if (loadAccounts().some((item) => item.id === account.id)) return;
    const ticket = await requestAccountTicket();
    if (!ticket) return;
    setAccounts(
      upsertAccount({
        id: account.id,
        username: account.username,
        name: account.alias?.trim() || account.username,
        avatarUrl: account.avatarUrl,
        ticket,
      }),
    );
  }, []);

  // Restore the session (JWT cookie) from the backend on load. A failed request
  // is NOT the same as a signed-out visitor: "unavailable" keeps the dashboard
  // from claiming the account doesn't exist when the API is simply down.
  const retryAuth = useCallback(async () => {
    setLoading(true);
    const result = await api<{ account: Account | null }>("/api/auth/me");
    setUser(result.ok ? result.data.account : null);
    if (result.ok && result.data.account) void rememberAccount(result.data.account);
    setUnavailable(!result.ok);
    setLoading(false);
  }, [rememberAccount]);

  useEffect(() => {
    void retryAuth();
  }, [retryAuth]);

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
    void rememberAccount(result.data.account);
    return {};
  }, [rememberAccount]);

  const signUp = useCallback<AuthValue["signUp"]>(async ({ email, password, invite }) => {
    const result = await post<{ account: Account }>("/api/auth/register", {
      email: email.trim(),
      password,
      invite: invite?.trim() || undefined,
    });
    if (!result.ok) return { error: result.error };
    setUser(result.data.account);
    void rememberAccount(result.data.account);
    return {};
  }, [rememberAccount]);

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

  const linkDiscord = useCallback<AuthValue["linkDiscord"]>(async () => {
    if (!user) return { error: "Sign in to connect Discord." };
    const result = await api<{ url?: string }>("/api/auth/discord/link");
    if (!result.ok) return { error: result.error };
    const url = result.data.url;
    if (!url) return { error: "Discord linking isn't available right now." };
    window.location.href = url;
    return {};
  }, [user]);

  const signOut = useCallback(async () => {
    await post("/api/auth/logout");
    if (user) setAccounts(forgetStoredAccount(user.id));
    setUser(null);
  }, [user]);

  const switchAccount = useCallback<AuthValue["switchAccount"]>(
    async (id) => {
      const entry = loadAccounts().find((item) => item.id === id);
      if (!entry) return { error: "That account is no longer saved on this device." };
      const result = await switchSession(entry.ticket);
      if (!result.ok) {
        if (result.status === 401) setAccounts(forgetStoredAccount(id));
        return { error: result.error };
      }
      setUser(result.data.account as Account);
      void refreshFirst();
      return {};
    },
    [refreshFirst],
  );

  const forgetAccount = useCallback((id: string) => {
    setAccounts(forgetStoredAccount(id));
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
      unavailable,
      retryAuth,
      configured: true,
      signIn,
      signUp,
      signInWithDiscord,
      linkDiscord,
      signOut,
      accounts,
      switchAccount,
      forgetAccount,
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
      unavailable,
      retryAuth,
      signIn,
      signUp,
      signInWithDiscord,
      linkDiscord,
      signOut,
      accounts,
      switchAccount,
      forgetAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
