/* ---------------------------------------------------------------------------
   The like / dislike bar.

   Two shapes: a floating dock on a public profile, and a quiet inline row for
   the dashboard. Both read the same endpoint, so the numbers always agree.
   --------------------------------------------------------------------------- */

import { useEffect, useState } from "react";
import { readReactions, sendReaction, type ReactionKind, type ReactionState } from "../lib/reactions";

function ThumbIcon({ down = false, size = 15 }: { down?: boolean; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={down ? { transform: "rotate(180deg)" } : undefined}
    >
      <path d="M7.4 20V10.4l4.2-6.2c1.4 0 2.2 1 2 2.4l-.8 3h4.9a2 2 0 0 1 1.9 2.5l-1.4 5.6A2.4 2.4 0 0 1 15.9 20Z" />
      <path d="M3.4 10.4h4v9.6h-4z" />
    </svg>
  );
}

export function ReactionBar({
  handle,
  variant = "dock",
}: {
  handle: string;
  variant?: "dock" | "inline";
}) {
  const [state, setState] = useState<ReactionState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void readReactions(handle).then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [handle]);

  const vote = async (kind: ReactionKind) => {
    if (busy) return;
    setBusy(true);
    const next = await sendReaction(handle, kind);
    if (next) setState(next);
    setBusy(false);
  };

  if (!state) return null;

  return (
    <div
      className={`pv-react pv-react--${variant}`}
      role="group"
      aria-label="Rate this profile"
    >
      <button
        type="button"
        className={`pv-react-btn${state.mine === "like" ? " is-on" : ""}`}
        aria-pressed={state.mine === "like"}
        aria-label={`Like this profile, ${state.likes} likes`}
        disabled={busy}
        onClick={() => void vote("like")}
      >
        <ThumbIcon />
        <b>{state.likes.toLocaleString("en-US")}</b>
      </button>
      <button
        type="button"
        className={`pv-react-btn${state.mine === "dislike" ? " is-on" : ""}`}
        aria-pressed={state.mine === "dislike"}
        aria-label={`Dislike this profile, ${state.dislikes} dislikes`}
        disabled={busy}
        onClick={() => void vote("dislike")}
      >
        <ThumbIcon down />
        <b>{state.dislikes.toLocaleString("en-US")}</b>
      </button>
    </div>
  );
}
