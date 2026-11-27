import { api } from "./backend";

export type LeaderboardEntry = {
  username: string;
  /** Public URL handle: the claimed alias, or the internal username. */
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  views: number;
  likes: number;
  rankChange?:number|null;
};

type Payload = {
  profiles?: {
    username?: string;
    handle?: string;
    displayName?: string | null;
    display_name?: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
    views?: number;
    likes?: number;
    rankChange?: number|null;
  }[];
  total?: number;
};

export type LeaderboardResult = {
  entries: LeaderboardEntry[];
  /** Total registered profiles, so the dashboard can keep loading pages. */
  total: number;
};

/** Top profiles by lifetime views. Throws when the site backend is unreachable
 *  so the dashboard can show an honest "unavailable" state. */
export async function fetchLeaderboard(
  sort: "views" | "likes" = "views",
  limit = 25,
  offset = 0,
  period: "all"|"7d"|"30d" = "all",
): Promise<LeaderboardResult> {
  const params = new URLSearchParams({ sort, period, limit: String(limit), offset: String(offset) });
  const result = await api<Payload>(`/api/leaderboard?${params}`);
  if (!result.ok) throw new Error(result.error);
  const rows = Array.isArray(result.data?.profiles) ? result.data.profiles : [];
  const count = (value: unknown) => { const number = Number(value); return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0; };
  const seen = new Set<string>();
  const entries = rows
    .filter((row) => typeof row.username === "string" && row.username.trim())
    .filter(row => { const key=row.username!.trim().toLowerCase(); if(seen.has(key))return false;seen.add(key);return true; })
    .map((row) => ({
      username: String(row.username).trim(),
      handle: String(row.handle || row.username),
      displayName: row.displayName ?? row.display_name ?? null,
      avatarUrl: row.avatarUrl ?? row.avatar_url ?? null,
      views: count(row.views),
      likes: count(row.likes),
      rankChange:typeof row.rankChange==='number'&&Number.isInteger(row.rankChange)?row.rankChange:null,
    }));
  const total = Number(result.data?.total);
  return { entries, total: Number.isFinite(total) ? Math.max(entries.length, count(total)) : entries.length };
}
