/* ---------------------------------------------------------------------------
   The like / dislike bar.

   Two shapes: a floating dock on a public profile, and a quiet inline row for
   the dashboard. Both read the same endpoint, so the numbers always agree.
   --------------------------------------------------------------------------- */

import { useEffect, useState } from "react";
import { readReactions, sendReaction, type ReactionKind, type ReactionState } from "../lib/reactions";
import type { TooltipAnimation, TooltipStyle } from "../lib/links";
import { Tooltip } from "./Tooltip";

/** Solid thumb; the dislike is the same shape mirrored vertically. */
export function ThumbIcon({ down = false, size = 15 }: { down?: boolean; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <g transform={down ? "matrix(1 0 0 -1 0 24)" : undefined}>
        <rect x="2" y="10" width="4" height="12" rx="1.5" />
        <path d="M8.5 10.5 12 3a3 3 0 0 1 3 3.6L14.3 10H19.5a2.5 2.5 0 0 1 2.4 3.1l-2 7A2.5 2.5 0 0 1 17.5 22H9.5a1 1 0 0 1-1-1Z" />
      </g>
    </svg>
  );
}

/** The same shape with no numbers, so a dashboard preview still shows where
    the like and dislike buttons live. */
export function ReactionGhost() {
  return (
    <span className="pv-react pv-react--card pv-react--ghost" aria-hidden="true">
      <span className="pv-react-btn">
        <ThumbIcon />
        <b>—</b>
      </span>
      <span className="pv-react-btn">
        <ThumbIcon down />
        <b>—</b>
      </span>
    </span>
  );
}

export function ReactionBar({
  handle,
  variant = "dock",
  tooltipStyle = "default",
  tooltipAnimation = "slide",
  tooltipEnabled = true,
}: {
  handle: string;
  variant?: "dock" | "inline" | "card";
  tooltipStyle?: TooltipStyle;
  tooltipAnimation?: TooltipAnimation;
  tooltipEnabled?: boolean;
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
      <Tooltip
        text={tooltipEnabled ? `${state.likes.toLocaleString("en-US")} likes` : ""}
        style={tooltipStyle}
        animation={tooltipAnimation}
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
      </Tooltip>
      <Tooltip
        text={tooltipEnabled ? `${state.dislikes.toLocaleString("en-US")} dislikes` : ""}
        style={tooltipStyle}
        animation={tooltipAnimation}
      >
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
      </Tooltip>
    </div>
  );
}
