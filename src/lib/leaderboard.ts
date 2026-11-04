import { api } from "./backend";

export type LeaderboardEntry = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  views: number;
};

type Payload = {
  profiles?: {
    username?: string;
    displayName?: string | null;
    display_name?: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
    views?: number;
  }[];
};

/** Top profiles by lifetime views. Throws when the site backend is unreachable
 *  so the dashboard can show an honest "unavailable" state. */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const result = await api<Payload>("/api/leaderboard");
  if (!result.ok) throw new Error(result.error);
  const rows = result.data?.profiles ?? [];
  return rows
    .filter((row) => typeof row.username === "string" && row.username)
    .map((row) => ({
      username: String(row.username),
      displayName: row.displayName ?? row.display_name ?? null,
      avatarUrl: row.avatarUrl ?? row.avatar_url ?? null,
      views: Number(row.views) || 0,
    }));
}
