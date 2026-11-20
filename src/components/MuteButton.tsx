/* ---------------------------------------------------------------------------
   The mute button.

   A floating control that silences the profile's track. It is deliberately not
   a player: no transport, no cover, no progress, no second <audio>. It talks to
   the real player through lib/audioBus, and its own look (corner, size, colour)
   is saved with the audio settings.
   --------------------------------------------------------------------------- */

import "../muteButton.css";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { AudioSettings } from "../lib/profileAssets";
import { audioBusState, setAudioBus, subscribeAudioBus } from "../lib/audioBus";

export function MuteButton({ settings }: { settings: AudioSettings }) {
  const [state, setState] = useState(audioBusState);
  const [settling, setSettling] = useState(false);
  /* The volume pill is opened from React instead of a bare :hover rule: the
     pointer has to cross a 10px gap between the button and the pill, and the
     close needs a short grace period. Tracking the state here lets the CSS
     animate both directions every time. */
  const [open, setOpen] = useState(false);
  const dragging = useRef(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const openReveal = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeReveal = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => { if (!dragging.current) setOpen(false); }, 170);
  };
  const settleTimer = useRef<number | undefined>(undefined);

  useEffect(() => subscribeAudioBus(setState), []);
  useEffect(
    () => () => {
      window.clearTimeout(settleTimer.current);
      window.clearTimeout(closeTimer.current);
    },
    [],
  );

  // A native range gives no release feedback. Restart a short settle animation
  // when the thumb is let go, so the volume does not just stop dead.
  const settle = () => {
    window.clearTimeout(settleTimer.current);
    setSettling(false);
    requestAnimationFrame(() => {
      setSettling(true);
      settleTimer.current = window.setTimeout(() => setSettling(false), 440);
    });
  };

  const silent = state.muted || state.volume === 0;

  const toggle = () => {
    if (silent) {
      // Unmuting is also the first gesture most people make, so let the player
      // start the track at the same time instead of leaving it paused.
      setAudioBus({ muted: false, volume: state.volume === 0 ? 0.7 : state.volume, playToken: state.playToken + 1 });
      return;
    }
    setAudioBus({ muted: true });
  };

  return (
    <div
      className={`ap-popup ap-popup--mute ap-popup-style--${settings.popupStyle || "glossy"}${silent ? " is-muted" : ""}${settling ? " is-settling" : ""}${open ? " is-open" : ""}`}
      onKeyDown={event => { if (event.key === "Escape") { setOpen(false); event.stopPropagation(); } }}
      onPointerEnter={openReveal}
      onPointerLeave={closeReveal}
      onFocus={event => { if (event.currentTarget.contains(event.relatedTarget as Node | null) === false) openReveal(); }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeReveal(); }}
      style={
        {
          "--ap-edge-color": settings.edgeColor,
          "--ap-edge-speed": `${settings.edgeSpeed}s`,
          "--popup-size": `${settings.popupSize}px`,
          "--popup-color": settings.popupColor,
          "--popup-background": settings.popupBackground,
          "--popup-opacity": settings.popupOpacity ?? .92,
          "--popup-rail-opacity":settings.popupRailOpacity ?? .92,
          "--popup-icon-opacity":settings.popupIconOpacity ?? 1,
          "--popup-glow": settings.popupGlow ? `drop-shadow(0 0 ${settings.popupGlowBlur}px color-mix(in srgb,${settings.popupGlowColor} ${settings.popupGlowStrength}%,transparent))` : `drop-shadow(0 0 12px color-mix(in srgb,${settings.popupGlowColor} 34%,transparent))`,
          "--popup-pill-glow": settings.popupGlow ? `0 0 ${settings.popupGlowBlur}px color-mix(in srgb,${settings.popupGlowColor} ${settings.popupGlowStrength}%,transparent)` : `0 0 18px color-mix(in srgb,${settings.popupGlowColor} 30%,transparent)`,
          "--popup-bar-width": `${settings.popupBarWidth}px`,
          "--popup-duration": `${Math.min(2000,Math.max(120,settings.popupDuration))}ms`,
          "--popup-volume": `${(silent ? 0 : state.volume) * 100}%`,
        } as CSSProperties
      }
    >
      <button
        className="ap-popup-icon"
        type="button"
        aria-label={silent ? "Unmute music" : "Mute music"}
        aria-pressed={silent}
        onClick={toggle}
      >
        <span className="ap-popup-glyph">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" strokeLinejoin="round" />
            {silent ? (
              <path d="m16 9 5 6m0-6-5 6" />
            ) : (
              <>
                <path d="M15 8a6 6 0 0 1 0 8" />
                <path d="M18 5a10 10 0 0 1 0 14" />
              </>
            )}
          </svg>
        </span>
      </button>
      <div className="ap-popup-reveal">
        <div className="ap-popup-volume">
          <input
            aria-label="Music volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={silent ? 0 : state.volume}
            onChange={(event) => {
              const volume = Number(event.target.value);
              setAudioBus({ volume, muted: volume === 0 });
            }}
            onPointerDown={event => { dragging.current = true; openReveal(); event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerUp={event => { dragging.current = false; settle(); if (!event.currentTarget.closest(".ap-popup")?.matches(":hover")) closeReveal(); }}
            onPointerCancel={() => { dragging.current = false; settle(); closeReveal(); }}
            onLostPointerCapture={() => { dragging.current = false; }}
            onKeyUp={settle}
            onBlur={settle}
          />
        </div>
      </div>
    </div>
  );
}
