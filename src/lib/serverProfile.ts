/* ---------------------------------------------------------------------------
   Public profile documents.

   The dashboard edits four stores (about, widgets, badges, links). They are
   saved to the backend so tourn.lol/<handle> renders the same page for every
   visitor — not just the browser that created it. Local storage stays as the
   offline copy the dashboard reads instantly.
   --------------------------------------------------------------------------- */

import type { Account } from "./auth";
import { api, apiBase } from "./backend";
import { normalizeAbout, type About } from "./about";
import { normalizeWidgetStore, type WidgetStore } from "./widgets";
import { normalizeBadgeStore, type BadgeStore } from "./badges";
import { normalizeLinkStore, type LinkStore } from "./links";

export type ProfileDocument = {
  about: About;
  widgets: WidgetStore;
  badges: BadgeStore;
  links: LinkStore;
};

export type ProfilePayload = {
  account: Account;
  profile: ProfileDocument | null;
  /** Badge ids the backend has verified for this account. `null` when the
   *  payload doesn't say — treated as "unknown", never as "none earned". */
  earned: string[] | null;
};

export function normalizeDocument(input: unknown): ProfileDocument {
  const raw = (input ?? {}) as Partial<ProfileDocument>;
  return {
    about: normalizeAbout(raw.about),
    widgets: normalizeWidgetStore(raw.widgets),
    badges: normalizeBadgeStore(raw.badges),
    links: normalizeLinkStore(raw.links),
  };
}

function withDocument(payload: Omit<ProfilePayload, "profile"> & { profile: unknown }): ProfilePayload {
  return {
    account: payload.account,
    earned: Array.isArray(payload.earned)
      ? payload.earned.filter((id): id is string => typeof id === "string")
      : null,
    profile: payload.profile ? normalizeDocument(payload.profile) : null,
  };
}

/* ---------------------------------------------------------------------------
   Profile cache.

   A linker page has to paint immediately. The published document is cached per
   handle in localStorage so a repeat visit (or a click between two profiles)
   renders the real card — entry screen included — before any network request
   finishes. The fetch still runs and replaces the cached copy when it lands.
   --------------------------------------------------------------------------- */

const CACHE_PREFIX = "tourn.lol/profile-cache/v2/";
/** Cached copies older than this are ignored so a stale page never sticks. */
const CACHE_MAX_AGE = 1000 * 60 * 60 * 12;
/** Big pages (data-URL backgrounds) would blow the storage quota — skip those. */
const CACHE_MAX_BYTES = 320_000;

/* A payload already seen in this session never touches storage again — the
   path stays synchronous either way, but a Map lookup cannot be blocked by a
   quota error or a slow localStorage. */
const memoryCache = new Map<string, ProfilePayload>();
const inflight = new Map<string, Promise<void>>();

export function readCachedProfile(handle: string): ProfilePayload | null {
  const memo = memoryCache.get(handle.toLowerCase());
  if (memo) return memo;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + handle.toLowerCase());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; data?: unknown };
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_MAX_AGE) return null;
    const data = withDocument(parsed.data as ProfilePayload);
    if (!data.account?.username) return null;
    memoryCache.set(handle.toLowerCase(), data);
    return data;
  } catch {
    return null;
  }
}

/** Warm a profile before the visitor commits to the link, so the click paints
 *  the real card instead of a black screen. Failures stay silent. */
export function preloadProfile(handle: string): void {
  const key = handle.trim().toLowerCase();
  if (!key || memoryCache.has(key) || inflight.has(key)) return;
  const run = fetchPublicProfile(key)
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, run);
}

function writeCachedProfile(handle: string, data: ProfilePayload): void {
  memoryCache.set(handle.toLowerCase(), data);
  try {
    const serialized = JSON.stringify({ savedAt: Date.now(), data });
    if (serialized.length > CACHE_MAX_BYTES) return;
    localStorage.setItem(CACHE_PREFIX + handle.toLowerCase(), serialized);
  } catch {
    /* quota or private mode — the page still works, it just skips the cache */
  }
}

/** The public page behind tourn.lol/<handle>. */
export async function fetchPublicProfile(
  handle: string,
): Promise<{ ok: true; data: ProfilePayload } | { ok: false; notFound: boolean; error: string }> {
  const result = await api<ProfilePayload>(`/api/profile/${encodeURIComponent(handle)}`);
  if (!result.ok) {
    return { ok: false, notFound: result.status === 404, error: result.error };
  }
  const data = withDocument(result.data);
  if (data.profile) writeCachedProfile(handle, data);
  return { ok: true, data };
}

/** Drop a cached page, e.g. right after the owner publishes an edit. */
export function clearCachedProfile(handle: string): void {
  memoryCache.delete(handle.toLowerCase());
  try {
    localStorage.removeItem(CACHE_PREFIX + handle.toLowerCase());
  } catch {
    /* ignore */
  }
}

/** The signed-in account's own document — hydrates a new device. */
export async function fetchOwnProfile(): Promise<
  { ok: true; data: ProfilePayload } | { ok: false; error: string }
> {
  const result = await api<ProfilePayload>("/api/profile");
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, data: withDocument(result.data) };
}

export async function saveProfile(document: ProfileDocument): Promise<{ ok: boolean; error?: string }> {
  const result = await api("/api/profile", {
    method: "PUT",
    body: JSON.stringify({ data: document }),
  });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

/* ---------------------------------------------------------------------------
   Unsaved work.

   A publish can fail for reasons the page cannot see — an expired session, a
   document over the backend's size limit, a dropped connection — and a publish
   that fails silently used to be lost on the next refresh, because the server
   copy then overwrote the local one. An unpublished document is now kept next
   to the local stores and republished on the next visit.
   --------------------------------------------------------------------------- */

const PENDING_PREFIX = "tourn.lol/pending-profile/v1/";

export function savePendingDocument(userId: string, document: ProfileDocument): void {
  try {
    localStorage.setItem(PENDING_PREFIX + userId, JSON.stringify(document));
  } catch {
    /* private mode / quota — the local stores still have the edit */
  }
}

export function loadPendingDocument(userId: string): ProfileDocument | null {
  try {
    const raw = localStorage.getItem(PENDING_PREFIX + userId);
    if (!raw) return null;
    return normalizeDocument(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearPendingDocument(userId: string): void {
  try {
    localStorage.removeItem(PENDING_PREFIX + userId);
  } catch {
    /* ignore */
  }
}

/** Publish on the way out (tab hidden or closed), where there is no time left
 *  to await a normal request. */
export function flushProfileDocument(document: ProfileDocument): void {
  try {
    const body = JSON.stringify({ data: document });
    if (body.length > 90_000) return; // keepalive requests are size-capped
    void fetch(`${apiBase()}/api/profile`, {
      method: "PUT",
      keepalive: true,
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
    });
  } catch {
    /* nothing else to do — the pending copy covers the next visit */
  }
}
