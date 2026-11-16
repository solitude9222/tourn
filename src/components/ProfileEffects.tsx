import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type {
  BackgroundEffectSettings,
  CursorSettings,
  OverlayEffectSettings,
  TextEffectSettings,
} from "../lib/profileAssets";
import { TEXT_EFFECT_PARAM } from "../lib/profileAssets";
import { loadGoogleFont } from "../lib/fonts";
import { mountBgEffect } from "../lib/bgEffects";

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
  const reduced = typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const calmIntensity = reduced ? Math.round(intensity * 0.6) : intensity;
  const calmSpeed = reduced ? speed * 2.2 : speed;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || effect === "none" || intensity <= 0) return;
    apiRef.current = mountBgEffect(host, {
      effect,
      intensity: calmIntensity,
      speed: calmSpeed,
      color,
      amount,
      flag,
      maxFps,
    });
    return () => {
      apiRef.current?.destroy();
      apiRef.current = null;
    };
    // Mount/unmount on effect or visibility change — settings updates go through update().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect, reduced, intensity <= 0]);

  useEffect(() => {
    if (effect === "none") return;
    apiRef.current?.update({
      effect,
      intensity: calmIntensity,
      speed: calmSpeed,
      color,
      amount,
      flag,
      maxFps,
    });
  }, [effect, calmIntensity, calmSpeed, color, amount, flag, maxFps]);

  if (effect === "none" || intensity <= 0) return null;
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
    />
  );
}

/* ------------------------------------------------------------ overlay effect */

export function OverlayEffectLayer({ settings }: { settings: OverlayEffectSettings }) {
  const opacity = Math.min(0.9, Math.max(0, settings.opacity));
  if (settings.id === "dotted") {
    return <span className="profile-overlay profile-overlay--dotted" style={{ "--overlay-opacity": opacity, "--overlay-color": settings.color, "--overlay-speed": `${settings.speed}s`, "--overlay-strength": settings.intensity / 100 } as CSSProperties} aria-hidden="true" />;
  }
  return (
    <span className="profile-fx-overlay profile-fx-overlay--canvas" style={{ "--fx-opacity": opacity } as CSSProperties} aria-hidden="true">
      {/* The overlay is a wash over the card, not a second background: capping
          the density keeps the same look for a fraction of the particles. */}
      <CanvasEffectLayer
        effect={settings.id}
        intensity={settings.intensity}
        speed={settings.speed}
        color={settings.color}
        amount={settings.params.amount}
        flag={settings.params.flag}
        hostClass="profile-fx-canvas profile-fx-canvas--fill"
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
              top: `${index % 2 === 0 ? -6 - Math.round(randomish(index, 11) * 10) : 90 + Math.round(randomish(index, 11) * 16)}%`,
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

export function SparkleLayer({ settings }: { settings: TextEffectSettings }) {
  if (settings.effect !== "sparkle" && !(settings.effects ?? []).includes("sparkle")) return null;
  return <Sparkles settings={settings} />;
}

/* -------------------------------------------------------------------- cursor */

const PARTICLE_TRAILS = new Set(["fairy", "snow", "bubbles", "emoji", "characters", "sparkler", "hearts", "comet"]);

function splitGlyphs(text: string): string[] {
  const Segmenter = (Intl as unknown as { Segmenter?: new (locale?: string, options?: { granularity: string }) => { segment: (value: string) => Iterable<{ segment: string }> } }).Segmenter;
  const glyphs = Segmenter ? Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(text.trim()), part => part.segment) : Array.from(text.trim());
  return glyphs.length ? glyphs : ["✨"];
}

export function ProfileCursor({ settings }: { settings: CursorSettings }) {
  const layerRef = useRef<HTMLSpanElement>(null);
  const trailRef = useRef<(HTMLSpanElement | null)[]>([]);
  const particlesRef = useRef<HTMLSpanElement>(null);
  const dots = settings.trailLength;
  const beadTrail = settings.trail && ["trailing", "ribbon"].includes(settings.trailType);
  const particleTrail = settings.trail && PARTICLE_TRAILS.has(settings.trailType);
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
    let idleTimer = 0;
    let lastSpawn = 0;
    let lastPaint = 0;
    let lastPoint: { x: number; y: number } | null = null;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timers = new Set<number>();
    const animations = new Set<Animation>();
    let next = { x: 0, y: 0 };
    const alive = new Set<HTMLElement>();

    const paint = (now = performance.now()) => {
      frame = 0;
      const rect = layer.getBoundingClientRect();
      const x = next.x - rect.left;
      const y = next.y - rect.top;
      layer.style.setProperty("--fx-cx", `${x}px`);
      layer.style.setProperty("--fx-cy", `${y}px`);

      if (motion.matches) return;
      if (particleTrail && now - lastSpawn >= 16) {
        const distance = lastPoint ? Math.hypot(x-lastPoint.x,y-lastPoint.y) : 0;
        const steps = Math.min(6, Math.max(1, Math.ceil(distance / 18)));
        for (let step = 1; step <= steps; step++) burst(lastPoint ? lastPoint.x+(x-lastPoint.x)*step/steps : x, lastPoint ? lastPoint.y+(y-lastPoint.y)*step/steps : y);
        lastPoint = {x,y}; lastSpawn = now;
      }
      if (!beadTrail) return;
      const elapsed = lastPaint ? Math.min(50, now-lastPaint) : 16; lastPaint = now;
      if (!positions.length) for(let i=0;i<=dots;i++)positions.push({x,y});
      positions[0] = {x,y};
      const follow = 1-Math.exp(-elapsed*.018*settings.trailSpeed);
      let unsettled = false;
      for(let i=1;i<positions.length;i++){positions[i].x += (positions[i-1].x-positions[i].x)*follow; positions[i].y += (positions[i-1].y-positions[i].y)*follow; if(Math.abs(positions[i].x-x)+Math.abs(positions[i].y-y)>.5)unsettled=true;}
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
      if (unsettled && layer.classList.contains("is-active")) frame = requestAnimationFrame(paint);
    };

    /**
     * One burst of a particle trail. Each particle is a throw-away span with a
     * WAAPI animation, so a fast pointer never leaves thousands of nodes behind:
     * the browser composites them and they remove themselves when finished.
     */
    const burst = (x: number, y: number) => {
      const bucket = particlesRef.current;
      if (!bucket) return;
      const type = settings.trailType;
      const amount = Math.max(1, Math.round(settings.trailAmount));
      const speed = Math.max(0.2, settings.trailSpeed);
      const size = settings.size;
      const glyphs = splitGlyphs(settings.trailText);

      for (let index = 0; index < amount; index += 1) {
        if (alive.size >= 160) break;
        const node = document.createElement("span");
        node.className = `fx-cursor-particle fx-cursor-particle--${type}`;
        node.style.left = `${x + (Math.random() - 0.5) * 18}px`;
        node.style.top = `${y + (Math.random() - 0.5) * 18}px`;
        node.style.setProperty("--fx-p-color", settings.color);
        const scale = type === "emoji" || type === "characters" || type === "hearts" ? 1.35 : type === "snow" ? 0.95 : 0.42;
        node.style.setProperty("--fx-p-size", `${Math.round(size * scale)}px`);

        if (type === "hearts") node.textContent = "♥";
        if (type === "snow") node.textContent = Math.random() > 0.5 ? "❄" : "❅";
        if (type === "emoji" || type === "characters") {
          node.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
        }

        bucket.appendChild(node);
        alive.add(node);

        const drift = (Math.random() - 0.5) * 70;
        const fall = 60 + Math.random() * 90;
        const spin = (Math.random() - 0.5) * 200;
        let frames: Keyframe[];
        let duration: number;

        if (type === "snow") {
          duration = 1200 / speed;
          frames = [
            { opacity: 0, transform: "translate(-50%, -50%) scale(.6) rotate(0deg)" },
            { opacity: 0.95, offset: 0.15, transform: "translate(-50%, -50%) scale(1)" },
            { opacity: 0, transform: `translate(calc(-50% + ${drift}px), calc(-50% + ${fall}px)) scale(.9) rotate(${180 + spin}deg)` },
          ];
        } else if (type === "bubbles" || type === "hearts") {
          duration = 1300 / speed;
          frames = [
            { opacity: 0, transform: "translate(-50%, -50%) scale(.5)" },
            { opacity: 0.7, offset: 0.2, transform: "translate(-50%, -50%) scale(1)" },
            { opacity: 0, transform: `translate(calc(-50% + ${drift}px), calc(-50% - ${fall}px)) scale(1.25)` },
          ];
        } else if (type === "emoji" || type === "characters") {
          duration = 1400 / speed;
          frames = [
            { opacity: 0, transform: "translate(-50%, -50%) scale(.7)" },
            { opacity: 1, offset: 0.12, transform: "translate(-50%, -50%) scale(1)" },
            { opacity: 0, transform: `translate(calc(-50% + ${drift}px), calc(-50% + ${fall * 1.6}px)) scale(.9) rotate(${spin}deg)` },
          ];
        } else if (type === "sparkler" || type === "comet") {
          const angle = Math.random() * Math.PI * 2;
          const reach = 34 + Math.random() * 64;
          duration = 520 / speed;
          frames = [
            { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
            {
              opacity: 0,
              transform: `translate(calc(-50% + ${Math.cos(angle) * reach}px), calc(-50% + ${Math.sin(angle) * reach}px)) scale(.2)`,
            },
          ];
        } else {
          duration = 900 / speed;
          frames = [
            { opacity: 0, transform: "translate(-50%, -50%) scale(.4)" },
            { opacity: 1, offset: 0.2, transform: "translate(-50%, -50%) scale(1)" },
            { opacity: 0, transform: `translate(calc(-50% + ${drift}px), calc(-50% + ${fall * 0.5}px)) scale(.2)` },
          ];
        }

        const animation = node.animate(frames, {
          duration,
          easing: "cubic-bezier(.22,.61,.36,1)",
          fill: "forwards",
        });
        animations.add(animation);
        const drop = () => {
          animations.delete(animation);
          alive.delete(node);
          node.remove();
        };
        animation.onfinish = drop; animation.oncancel = drop;
        const timer = window.setTimeout(() => { timers.delete(timer); drop(); }, duration + 200); timers.add(timer);
      }
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch" || document.hidden) return;
      next = { x: event.clientX, y: event.clientY };
      layer.classList.remove("is-idle"); layer.classList.add("is-active");
      window.clearTimeout(idleTimer);idleTimer = window.setTimeout(() => layer.classList.add("is-idle"), 220);
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const onLeave = () => {
      layer.classList.remove("is-active");
      window.clearTimeout(idleTimer);
      positions.length = 0; lastPoint = null; lastPaint = 0;
      animations.forEach(animation => animation.cancel()); animations.clear();
      timers.forEach(timer => clearTimeout(timer)); timers.clear();
      alive.forEach(node => node.remove()); alive.clear();
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };
    const onVisible = () => { if (document.hidden) onLeave(); };
    motion.addEventListener("change", onLeave); document.addEventListener("visibilitychange", onVisible);
    host.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    host.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      onLeave();
      motion.removeEventListener("change", onLeave); document.removeEventListener("visibilitychange", onVisible);
      window.clearTimeout(idleTimer);
      alive.forEach((node) => node.remove());
      alive.clear();
      host.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      host.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [
    dots,
    beadTrail,
    particleTrail,
    settings.color,
    settings.size,
    settings.style,
    settings.trail,
    settings.trailAmount,
    settings.trailSpeed,
    settings.trailText,
    settings.trailType,
  ]);

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
          "--fx-ghost-size": `${Math.round(settings.size * 2.4)}px`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      {beadTrail
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
      {particleTrail ? <span className="fx-cursor-particles" ref={particlesRef} /> : null}
      {settings.trail && settings.trailType === "ghost" ? (
        <span className="fx-cursor-ghost">{splitGlyphs(settings.trailText)[0]}</span>
      ) : null}
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
