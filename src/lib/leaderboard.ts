import { api } from "./backend";

export type LeaderboardEntry = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  views: number;
  likes: number;
};

type Payload = {
  profiles?: {
    username?: string;
    displayName?: string | null;
    display_name?: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
    views?: number;
    likes?: number;
  }[];
};

/** Top profiles by lifetime views. Throws when the site backend is unreachable
 *  so the dashboard can show an honest "unavailable" state. */
export async function fetchLeaderboard(sort: "views" | "likes" = "views"): Promise<LeaderboardEntry[]> {
  const result = await api<Payload>(`/api/leaderboard?sort=${sort}`);
  if (!result.ok) throw new Error(result.error);
  const rows = result.data?.profiles ?? [];
  return rows
    .filter((row) => typeof row.username === "string" && row.username)
    .map((row) => ({
      username: String(row.username),
      displayName: row.displayName ?? row.display_name ?? null,
      avatarUrl: row.avatarUrl ?? row.avatar_url ?? null,
      views: Number(row.views) || 0,
      likes: Number(row.likes) || 0,
    }));
}
