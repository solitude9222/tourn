import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type {
  BackgroundEffectSettings,
  CursorSettings,
  OverlayEffectSettings,
  TextEffectSettings,
} from "../lib/profileAssets";
import { TEXT_EFFECT_PARAM } from "../lib/profileAssets";
import { mountBgEffect } from "../lib/bgEffects";
import { loadGoogleFont } from "../lib/fonts";

function randomish(index: number, salt = 1): number {
  const n = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/* -------------------------------------------------------- canvas effect host */

/**
 * Shared React wrapper around the bgEffects canvas engine. Mounts a single
 * canvas into `hostClass`'s positioned box and keeps it in sync with the
 * dashboard's per-effect settings (intensity, speed, colour, extra slider).
 */
function CanvasEffectLayer({
  effect,
  intensity,
  speed,
  color,
  amount,
  flag,
  hostClass,
  maxFps,
}: {
  effect: string;
  intensity: number;
  speed: number;
  color: string;
  amount: number;
  flag: boolean;
  hostClass: string;
  maxFps?: number;
}) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const apiRef = useRef<ReturnType<typeof mountBgEffect> | null>(null);
  const [hidden, setHidden] = useState(false);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || effect === "none" || reduced || hidden) return;
    apiRef.current = mountBgEffect(host, { effect, intensity, speed, color, amount, flag, maxFps });
    return () => {
      apiRef.current?.destroy();
      apiRef.current = null;
    };
    // Mount/unmount on effect or visibility change — settings updates go through update().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect, reduced, hidden]);

  useEffect(() => {
    if (effect === "none") return;
    apiRef.current?.update({ effect, intensity, speed, color, amount, flag, maxFps });
  }, [effect, intensity, speed, color, amount, flag]);

  if (effect === "none" || reduced || hidden) return null;
  return <span ref={hostRef} className={hostClass} aria-hidden="true" />;
}

/* -------------------------------------------------------- background effect */

export function BackgroundEffectLayer({
  settings,
  compact = false,
}: {
  settings: BackgroundEffectSettings;
  compact?: boolean;
}) {
  // Compact previews (dashboard cards) run at a reduced intensity so the
  // motion reads clearly at small sizes.
  const intensity = compact ? Math.max(0, Math.min(100, settings.intensity * 0.7)) : settings.intensity;
  return (
    <CanvasEffectLayer
      effect={settings.id}
      intensity={intensity}
      speed={settings.speed}
      color={settings.color}
      amount={settings.params.amount}
      flag={settings.params.flag}
      hostClass="profile-fx-bg profile-fx-canvas"
      maxFps={45}
    />
  );
}

/* ------------------------------------------------------------ overlay effect */

export function OverlayEffectLayer({ settings }: { settings: OverlayEffectSettings }) {
  return (
    <span className="profile-fx-overlay profile-fx-overlay--canvas" style={{ "--fx-opacity": settings.opacity } as CSSProperties} aria-hidden="true">
      {/* The overlay is a wash over the card, not a second background: capping
          the density keeps the same look for a fraction of the particles. */}
      <CanvasEffectLayer
        effect={settings.id}
        intensity={Math.min(settings.intensity, 45)}
        speed={settings.speed}
        color={settings.color}
        amount={settings.params.amount}
        flag={settings.params.flag}
        hostClass="profile-fx-canvas profile-fx-canvas--fill"
        maxFps={20}
      />
    </span>
  );
}

/* --------------------------------------------------------------- text effect */

export function textEffectStyle(settings: TextEffectSettings): CSSProperties {
  const amount = settings.params.amount;
  return {
    "--fx-color-a": settings.colorA,
    "--fx-color-b": settings.colorB,
    "--fx-speed": `${settings.speed}s`,
    "--fx-strength": settings.strength,
    "--fx-amp": `${amount}px`,
    "--fx-band": `${100 + amount * 2}%`,
    "--fx-dim": `${1 - settings.params.amount / 100}`,
    fontFamily: settings.font || undefined,
  } as CSSProperties;
}

export function textEffectClass(settings: TextEffectSettings): string {
  if (settings.effect === "none") return "";
  const flagOff = settings.params.flag === false;
  const flagClass =
    settings.effect === "typewriter" && flagOff ? " fx-no-cursor"
    : settings.effect === "glow" && flagOff ? " fx-no-pulse"
    : settings.effect === "neon" && flagOff ? " fx-no-flicker"
    : "";
  return `fx-text-wrap fx-text-wrap--${settings.effect}${flagClass}`;
}

/** Ensures a chosen Google Font is actually requested wherever text using it
 *  renders — the editor, a live preview, and a saved public page alike. */
function useEffectFont(family: string) {
  useEffect(() => {
    if (family) loadGoogleFont(family);
  }, [family]);
}

function Sparkles({ settings }: { settings: TextEffectSettings }) {
  const schemaDensity = TEXT_EFFECT_PARAM.sparkle?.kind === "slider" ? settings.params.amount : 10;
  const count = Math.max(3, Math.min(14, Math.round(schemaDensity)));
  return (
    <span className="fx-sparkles" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <i
          key={index}
          style={
            {
              left: `${Math.round(randomish(index, 10) * 96)}%`,
              top: `${Math.round(randomish(index, 11) * 94)}%`,
              animationDelay: `${-(randomish(index, 12) * settings.speed).toFixed(2)}s`,
              "--fx-spark": `${2 + Math.round(randomish(index, 13) * 4)}px`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

export function EffectText({
  text,
  settings,
  className = "",
}: {
  text: string;
  settings: TextEffectSettings;
  className?: string;
}) {
  useEffectFont(settings.font);
  const style = textEffectStyle(settings);
  const classes = `fx-text ${className}${textEffectClass(settings) ? ` ${textEffectClass(settings)}` : ""}`;

  if (settings.effect === "none") {
    return <span className={classes} style={settings.font ? { fontFamily: settings.font } : undefined}>{text}</span>;
  }

  if (settings.effect === "wave" || settings.effect === "bounce") {
    return (
      <span className={classes} style={style} aria-label={text}>
        {Array.from(text).map((character, index) => (
          <span
            className="fx-text-char"
            key={`${character}-${index}`}
            aria-hidden="true"
            style={{ "--fx-index": index } as CSSProperties}
          >
            {character === " " ? "\u00a0" : character}
          </span>
        ))}
      </span>
    );
  }

  if (settings.effect === "glitch") {
    const intensity = settings.params.amount;
    const glitchStyle = { ...style, "--fx-glitch-amt": `${intensity * 0.6}px` } as CSSProperties;
    return (
      <span className={`${classes} fx-text--glitch`} style={glitchStyle} aria-label={text}>
        <span className="fx-glitch-layer" data-text={text} aria-hidden="true" />
        <span className="fx-glitch-layer" data-text={text} aria-hidden="true" />
        {text}
      </span>
    );
  }

  if (settings.effect === "sparkle") {
    return (
      <span className={`${classes} fx-text--sparkle`} style={style}>
        {text}
        <Sparkles settings={settings} />
      </span>
    );
  }

  if (settings.effect === "flicker") {
    const chaosStyle = { ...style, "--fx-chaos": settings.params.amount } as CSSProperties;
    return (
      <span className={`${classes} fx-text--flicker`} style={chaosStyle}>
        {text}
      </span>
    );
  }

  if (settings.effect === "shake") {
    const shakeStyle = { ...style, "--fx-amp": `${settings.params.amount}px` } as CSSProperties;
    return (
      <span className={`${classes} fx-text--shake`} style={shakeStyle}>
        {text}
      </span>
    );
  }

  return (
    <span className={`${classes} fx-text--${settings.effect}`} style={style}>
      {text}
    </span>
  );
}

export function SparkleLayer({ settings }: { settings: TextEffectSettings }) {
  if (settings.effect !== "sparkle") return null;
  return <Sparkles settings={settings} />;
}

/* -------------------------------------------------------------------- cursor */

export function ProfileCursor({ settings }: { settings: CursorSettings }) {
  const layerRef = useRef<HTMLSpanElement>(null);
  const trailRef = useRef<(HTMLSpanElement | null)[]>([]);
  const dots = settings.trailLength;
  // The system cursor (and a custom image, which the page sets itself) has no
  // marker of its own, but it can still leave a trail.
  const showPoint = settings.style !== "default" && settings.style !== "custom";

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const host = layer.parentElement;
    if (!host) return;

    const positions: { x: number; y: number }[] = [];
    let frame = 0;
    let next = { x: 0, y: 0 };

    const paint = () => {
      frame = 0;
      const rect = layer.getBoundingClientRect();
      const x = next.x - rect.left;
      const y = next.y - rect.top;
      layer.style.setProperty("--fx-cx", `${x}px`);
      layer.style.setProperty("--fx-cy", `${y}px`);

      if (!settings.trail) return;
      positions.unshift({ x, y });
      positions.splice(dots + 1);
      trailRef.current.forEach((dot, index) => {
        const point = positions[Math.min(index + 1, positions.length - 1)];
        const ahead = positions[Math.min(index, positions.length - 1)];
        if (!dot || !point) return;
        // The line and comet trails read direction from the segment they sit
        // on, so each dot is rotated to point the way the pointer is moving.
        const angle =
          ahead && (ahead.x !== point.x || ahead.y !== point.y)
            ? (Math.atan2(ahead.y - point.y, ahead.x - point.x) * 180) / Math.PI
            : 0;
        dot.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%) rotate(${angle}deg)`;
      });
    };

    const onMove = (event: PointerEvent) => {
      next = { x: event.clientX, y: event.clientY };
      layer.classList.add("is-active");
      if (frame) return;
      frame = window.requestAnimationFrame(paint);
    };

    host.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      host.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [settings.style, settings.size, settings.color, settings.trail, settings.trailLength]);

  if (!showPoint && !settings.trail) return null;

  return (
    <span
      ref={layerRef}
      className={`profile-cursor profile-cursor--${settings.style}`}
      style={
        {
          "--fx-cursor-color": settings.color,
          "--fx-cursor-size": `${settings.size}px`,
          "--fx-cursor-speed": `${Math.max(0.08, settings.trailLength * 0.025)}s`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      {settings.trail
        ? Array.from({ length: dots }, (_, index) => (
            <span
              key={index}
              ref={(node) => {
                trailRef.current[index] = node;
              }}
              className={`profile-cursor-trail profile-cursor-trail--${settings.trailType}`}
              style={
                {
                  "--fx-dot": Math.max(0.18, 1 - index / (dots + 1)),
                  opacity: Math.max(0.05, 1 - index / (dots + 1)),
                } as CSSProperties
              }
            />
          ))
        : null}
      {showPoint ? <span className="profile-cursor-point" /> : null}
    </span>
  );
}

export function EffectLayer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={className}>{children}</span>;
}
