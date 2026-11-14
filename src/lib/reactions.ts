/* ---------------------------------------------------------------------------
   Profile reactions — likes and dislikes.

   The backend stores one vote per hashed IP per profile, so the client never
   has to enforce a limit; it just shows what the server says.
   --------------------------------------------------------------------------- */

import { api, post } from "./backend";

export type ReactionKind = "like" | "dislike";

export type ReactionState = {
  likes: number;
  dislikes: number;
  /** This visitor's vote, or null when they have not voted yet. */
  mine: ReactionKind | null;
};

export async function readReactions(username: string): Promise<ReactionState | null> {
  const handle = username.trim().toLowerCase();
  if (!handle) return null;
  const result = await api<ReactionState>(`/api/reactions/${encodeURIComponent(handle)}`);
  return result.ok
    ? {
        likes: Number(result.data.likes) || 0,
        dislikes: Number(result.data.dislikes) || 0,
        mine: result.data.mine === "like" || result.data.mine === "dislike" ? result.data.mine : null,
      }
    : null;
}

/** Vote, or take the vote back by posting the same kind twice. */
export async function sendReaction(
  username: string,
  kind: ReactionKind,
): Promise<ReactionState | null> {
  const handle = username.trim().toLowerCase();
  if (!handle) return null;
  const result = await post<ReactionState>(`/api/reactions/${encodeURIComponent(handle)}`, { kind });
  return result.ok
    ? {
        likes: Number(result.data.likes) || 0,
        dislikes: Number(result.data.dislikes) || 0,
        mine: result.data.mine === "like" || result.data.mine === "dislike" ? result.data.mine : null,
      }
    : null;
}
