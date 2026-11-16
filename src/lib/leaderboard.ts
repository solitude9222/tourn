import { api } from "./backend";

export type LeaderboardEntry = {
  username: string;
  /** Public URL handle: the claimed alias, or the internal username. */
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  views: number;
  likes: number;
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
): Promise<LeaderboardResult> {
  const params = new URLSearchParams({ sort, limit: String(limit), offset: String(offset) });
  const result = await api<Payload>(`/api/leaderboard?${params}`);
  if (!result.ok) throw new Error(result.error);
  const rows = result.data?.profiles ?? [];
  const entries = rows
    .filter((row) => typeof row.username === "string" && row.username)
    .map((row) => ({
      username: String(row.username),
      handle: String(row.handle ?? row.displayName ?? row.username),
      displayName: row.displayName ?? row.display_name ?? null,
      avatarUrl: row.avatarUrl ?? row.avatar_url ?? null,
      views: Number(row.views) || 0,
      likes: Number(row.likes) || 0,
    }));
  const total = Number(result.data?.total);
  return { entries, total: Number.isFinite(total) ? total : entries.length };
}
