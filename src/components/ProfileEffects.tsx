import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type {
  BackgroundEffectSettings,
  OverlayEffectSettings,
  TextEffectSettings,
} from "../lib/profileAssets";
import { TEXT_EFFECT_PARAM } from "../lib/profileAssets";
import { loadGoogleFont } from "../lib/fonts";
import { mountAmbientScene } from "../lib/ambientEffects";

function randomish(index: number, salt = 1): number {
  const n = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/* -------------------------------------------------------- background effect */

export function BackgroundEffectLayer({
  settings,
  compact = false,
}: {
  settings: BackgroundEffectSettings;
  compact?: boolean;
}) {
  const hostRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || settings.id === "none") return;
    // The scene pauses offscreen and honours reduced motion internally.
    const api = mountAmbientScene(host, settings.id, { compact });
    return () => api.destroy();
  }, [settings.id, compact]);

  if (settings.id === "none") return null;
  const opacity = Math.min(1, Math.max(0, settings.opacity ?? 1));
  return (
    <span
      ref={hostRef}
      className="profile-fx-bg profile-fx-canvas"
      style={{ opacity } as CSSProperties}
      aria-hidden="true"
    />
  );
}

/* ----------------------------------------------------------- grain filter */

function GrainOverlay({ opacity, compact }: { opacity: number; compact: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const draw = () => {
      const image = ctx.createImageData(200, 200);
      const data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = 55;
      }
      ctx.putImageData(image, 0, 0);
    };
    draw();
    const timer = window.setInterval(draw, compact ? 120 : 60);
    return () => window.clearInterval(timer);
  }, [compact]);
  return (
    <span className="profile-fx-overlay profile-fx-overlay--grain" style={{ "--fx-opacity": opacity } as CSSProperties} aria-hidden="true">
      <canvas ref={canvasRef} className="profile-fx-grain-canvas" aria-hidden="true" />
    </span>
  );
}

/* ------------------------------------------------------------ overlay effect */

export function OverlayEffectLayer({
  settings,
  compact = false,
}: {
  settings: OverlayEffectSettings;
  compact?: boolean;
}) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [reduced,setReduced]=useState(()=>matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(()=>{const motion=matchMedia("(prefers-reduced-motion: reduce)"),change=()=>setReduced(motion.matches);motion.addEventListener("change",change);return()=>motion.removeEventListener("change",change);},[]);
  const opacity = Math.min(1, Math.max(0, settings.opacity));

  useEffect(() => {
    const host = hostRef.current;
    if (!host || settings.id !== "snowFall") return;
    const api = mountAmbientScene(host, "snow", { compact });
    return () => api.destroy();
  }, [settings.id, compact]);

  if (settings.id === "none" || (reduced&&settings.reducedMotion==="none")) return null;
  if(reduced&&settings.reducedMotion==="grain")return <span className="profile-fx-overlay profile-fx-overlay--dotPattern" style={{"--fx-opacity":opacity} as CSSProperties} aria-hidden="true"/>;
  if (settings.id === "blurred") {
    // The page itself blurs its background layer through data-fx-filter.
    // A dashboard preview has no background layer, so it gets a local wash.
    return compact ? <span className="profile-fx-overlay profile-fx-overlay--blurred" aria-hidden="true" /> : null;
  }
  if (settings.id === "snowFall") {
    return <span ref={hostRef} className="profile-fx-overlay profile-fx-overlay--snowFall" style={{ "--fx-opacity": opacity } as CSSProperties} aria-hidden="true" />;
  }
  if (settings.id === "grain") return <GrainOverlay opacity={opacity} compact={compact} />;
  return <span className={`profile-fx-overlay profile-fx-overlay--${settings.id}`} style={{ "--fx-opacity": opacity } as CSSProperties} aria-hidden="true" />;
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
    // Keep a readable floor; the old 0.2 "dim to" value effectively erased text.
    "--fx-dim": `${Math.max(0.55, 1 - settings.params.amount / 100)}`,
    "--fx-line-gap": `${amount}px`,
    fontFamily: settings.font ? `"${settings.font.replace(/["\\]/g, "")}", sans-serif` : undefined,
  } as CSSProperties;
}

export function textEffectClass(settings: TextEffectSettings): string {
  const active = [settings.effect, ...(settings.effects ?? [])].filter(
    (id, index, list) => id !== "none" && list.indexOf(id) === index,
  );
  if (!active.length) return "";
  const flagOff = settings.params.flag === false;
  const flagClasses = active
    .map((id) =>
      id === "typewriter" && flagOff ? "fx-no-cursor"
      : id === "glow" && flagOff ? "fx-no-pulse"
      : id === "neon" && flagOff ? "fx-no-flicker"
      : "",
    )
    .filter(Boolean);
  return ["fx-text-wrap", ...active.map((id) => `fx-text-wrap--${id}`), ...flagClasses].join(" ");
}

function Sparkles({ settings, spread = false }: { settings: TextEffectSettings; spread?: boolean }) {
  const schemaDensity = TEXT_EFFECT_PARAM.sparkle?.kind === "slider" ? settings.params.amount : 10;
  const count = Math.max(3, Math.min(14, Math.round(schemaDensity)));
  return (
    <span className={`fx-sparkles${spread ? " fx-sparkles--spread" : ""}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <i
          key={index}
          style={
            {
              left: `${Math.round(randomish(index, 10) * 96)}%`,
              // Names sparkle around the top/bottom edge. A bio can wrap onto
              // many lines, so its stars spread over the whole text block.
              top: spread
                ? `${5 + Math.round(randomish(index, 11) * 88)}%`
                : `${index % 2 === 0 ? -6 - Math.round(randomish(index, 11) * 10) : 90 + Math.round(randomish(index, 11) * 16)}%`,
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
  useEffect(() => { if (settings.font) loadGoogleFont(settings.font); }, [settings.font]);
  const style = textEffectStyle(settings);
  const effectClasses = textEffectClass(settings);
  const classes = `fx-text ${className}${effectClasses ? ` ${effectClasses}` : ""}`;
  const hasSparkle = (settings.effects ?? []).includes("sparkle") || settings.effect === "sparkle";
  const sparkleNode = hasSparkle ? <Sparkles settings={settings} /> : null;

  if (settings.effect === "none") {
    return <span className={classes}>{text}{sparkleNode}</span>;
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
        {sparkleNode}
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
        {text}<Sparkles settings={settings} />
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
      {sparkleNode}
    </span>
  );
}

export function SparkleLayer({ settings, spread = false }: { settings: TextEffectSettings; spread?: boolean }) {
  if (settings.effect !== "sparkle" && !(settings.effects ?? []).includes("sparkle")) return null;
  return <Sparkles settings={settings} spread={spread} />;
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
