/* ---------------------------------------------------------------------------
   Real profile view counts, stored in Railway Postgres via the backend.
   The browser still throttles to one view per visitor per handle per day so
   refreshing can't inflate the number.
   --------------------------------------------------------------------------- */

import { api, post } from "./backend";

function seenKey(username: string): string {
  return `tourn.lol/views-seen/v1/${username.toLowerCase()}`;
}

/** Reads the current view count without incrementing it. */
export async function getViewCount(username: string): Promise<number | null> {
  const handle = username.trim().toLowerCase();
  if (!handle) return null;
  const result = await api<{ views: number }>(`/api/views/${encodeURIComponent(handle)}`);
  return result.ok ? Number(result.data.views) || 0 : null;
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
