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
  const revealRef = useRef<HTMLDivElement>(null);
  const reveal = () => {
    const pill=revealRef.current;if(!pill || matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const direction=settings.popupSide.includes("right")?1:-1;
    pill.animate([{opacity:0,transform:`translateX(${direction*18}px) scale(.82)`},{opacity:1,transform:"translateX(0) scale(1)"}],{duration:Math.max(300,settings.popupDuration),easing:"cubic-bezier(.16,1,.3,1)"});
  };
  const settleTimer = useRef<number | undefined>(undefined);

  useEffect(() => subscribeAudioBus(setState), []);
  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

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
      className={`ap-popup ap-popup--mute ap-popup-style--${settings.popupStyle || "glossy"}${silent ? " is-muted" : ""}${settling ? " is-settling" : ""}`}
      onPointerEnter={reveal}
      onFocus={event=>{if(!event.currentTarget.contains(event.relatedTarget))reveal();}}
      style={
        {
          "--ap-edge-color": settings.edgeColor,
          "--ap-edge-speed": `${settings.edgeSpeed}s`,
          "--popup-size": `${settings.popupSize}px`,
          "--popup-color": settings.popupColor,
          "--popup-background": settings.popupBackground,
          "--popup-opacity": settings.cardOpacity,
          "--popup-bar-width": `${settings.popupBarWidth}px`,
          "--popup-duration": `${Math.max(300,settings.popupDuration)}ms`,
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
        <div className="ap-popup-volume" ref={revealRef}>
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
            onPointerUp={settle}
            onPointerCancel={settle}
            onKeyUp={settle}
            onBlur={settle}
          />
        </div>
      </div>
    </div>
  );
}
