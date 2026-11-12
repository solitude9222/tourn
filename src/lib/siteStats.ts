/* ---------------------------------------------------------------------------
   Site-wide stats for the public landing page — total creators signed up and
   total profile views, read from Railway Postgres via the backend.
   --------------------------------------------------------------------------- */

import { api } from "./backend";

export type SiteStats = {
  users: number | null;
  views: number | null;
};

/** Both fields are `null` when the backend isn't reachable, so the landing
 *  page hides the stat instead of showing a fake zero. */
export async function getSiteStats(): Promise<SiteStats> {
  const result = await api<{ users: number; views: number }>("/api/stats");
  if (!result.ok) return { users: null, views: null };
  return {
    users: Number(result.data.users) || 0,
    views: Number(result.data.views) || 0,
  };
}
