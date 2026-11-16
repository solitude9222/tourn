import { useEffect, useRef } from "react";
import type { CursorSettings } from "../lib/profileAssets";
import { mountCursorEffects } from "../lib/cursorEffects";

export type CursorPreviewMode = "skin" | "trail" | "click";

/** Renders the scoped canvas pointer system: trails, click effects and skins. */
export function CursorTrailLayer({ settings, preview }: { settings: CursorSettings; preview?: CursorPreviewMode }) {
  const layerRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const hasTrail = settings.trail && settings.trailType !== "none";
  const hasClick = settings.click !== "none";
  const hasSkin = settings.style !== "system" && settings.style !== "custom";
  const active = hasTrail || hasClick || hasSkin;

  useEffect(() => {
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    if (!active || !layer || !canvas) return;
    const host = layer.parentElement;
    if (!host) return;
    if (hasSkin) host.classList.add("profile-cursor-hidden");
    const destroy = mountCursorEffects(host, canvas, settings, (visible) => layer.classList.toggle("is-active", visible));

    // Selector tiles have no real click of their own: hover starts a short
    // sweep or a repeating click so the tile previews the actual engine.
    let timer = 0;
    let sweep = 0;
    let clicks = 0;
    const point = (x: number, y: number, type: "pointermove" | "pointerdown" = "pointermove") => {
      const rect = host.getBoundingClientRect();
      host.dispatchEvent(new PointerEvent(type, {
        clientX: rect.left + rect.width * x,
        clientY: rect.top + rect.height * y,
        pointerType: "mouse",
        button: 0,
        bubbles: true,
      }));
    };
    if (preview) {
      timer = window.setTimeout(() => {
        if (preview === "trail") {
          const start = performance.now();
          const step = (now: number) => {
            const k = Math.min(1, (now - start) / 1600);
            point(0.12 + k * 0.76, 0.5 + Math.sin(k * Math.PI * 3) * 0.22);
            if (k < 1) sweep = requestAnimationFrame(step);
          };
          sweep = requestAnimationFrame(step);
        } else {
          point(0.5, 0.5);
          if (preview === "click") {
            const fire = () => point(0.5, 0.5, "pointerdown");
            fire();
            clicks = window.setInterval(fire, 900);
          }
        }
      }, 50);
    }

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(clicks);
      cancelAnimationFrame(sweep);
      destroy();
      host.classList.remove("profile-cursor-hidden");
    };
  }, [active, hasSkin, settings, preview]);

  if (!active) return null;

  return (
    <span ref={layerRef} className={`profile-cursor profile-cursor--${settings.style}`} aria-hidden="true">
      <canvas ref={canvasRef} className="profile-cursor-canvas" />
    </span>
  );
}
