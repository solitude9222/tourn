import { useEffect, useRef, useState } from "react";
import type { CursorSettings } from "../lib/profileAssets";
import { mountCursorEffects } from "../lib/cursorEffects";

/** Renders the scoped canvas pointer system: trails, click effects and skins. */
export function CursorTrailLayer({ settings }: { settings: CursorSettings }) {
  const layerRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(motion.matches);
    update();
    motion.addEventListener("change", update);
    return () => motion.removeEventListener("change", update);
  }, []);

  const hasTrail = settings.trail && settings.trailType !== "none";
  const hasClick = settings.click !== "none";
  const hasSkin = settings.style !== "system" && settings.style !== "custom";
  const active = !reduced && (hasTrail || hasClick || hasSkin);

  useEffect(() => {
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    if (!active || !layer || !canvas) return;
    const host = layer.parentElement;
    if (!host) return;
    if (hasSkin) host.classList.add("profile-cursor-hidden");
    const destroy = mountCursorEffects(host, canvas, settings, (visible) => layer.classList.toggle("is-active", visible));
    return () => {
      destroy();
      host.classList.remove("profile-cursor-hidden");
    };
  }, [active, hasSkin, settings]);

  if (!active) return null;

  return (
    <span ref={layerRef} className={`profile-cursor profile-cursor--${settings.style}`} aria-hidden="true">
      <canvas ref={canvasRef} className="profile-cursor-canvas" />
    </span>
  );
}
