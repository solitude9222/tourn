/* ---------------------------------------------------------------------------
   Real profile view counts, stored in Railway Postgres via the backend.
   The browser still throttles to one view per visitor per handle per day so
   refreshing can't inflate the number.
   --------------------------------------------------------------------------- */

import { api, post } from "./backend";

function seenKey(username: string): string {
  return `tourn.lol/views-seen/v1/${username.toLowerCase()}`;
}

const countReads = new Map<string, Promise<number | null>>();

/** Reads the current view count without incrementing it. Concurrent callers
 *  share one request (the page and recordView both asked for it at load). */
export function getViewCount(username: string): Promise<number | null> {
  const handle = username.trim().toLowerCase();
  if (!handle) return Promise.resolve(null);
  const pending = countReads.get(handle);
  if (pending) return pending;
  const request = api<{ views: number }>(`/api/views/${encodeURIComponent(handle)}`)
    .then((result) => (result.ok ? Number(result.data.views) || 0 : null))
    .finally(() => countReads.delete(handle));
  countReads.set(handle, request);
  return request;
}

/** Records one view for `username` — at most once per visitor per calendar
 *  day — and returns the updated total. Call this from the public profile
 *  route, not from the owner's own dashboard/preview. */
export async function recordView(username: string): Promise<number | null> {
  const handle = username.trim().toLowerCase();
  if (!handle) return null;

  const today = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(seenKey(handle)) === today) return getViewCount(handle);
  } catch { /* The server also deduplicates visits when storage is blocked. */ }
  const result = await post<{ views: number }>(`/api/views/${encodeURIComponent(handle)}`, {
    referrer: document.referrer,
  });
  if (result.ok) {
    try { localStorage.setItem(seenKey(handle), today); } catch { /* optional cache */ }
    return Number(result.data.views) || 0;
  }
  return getViewCount(handle);
}
