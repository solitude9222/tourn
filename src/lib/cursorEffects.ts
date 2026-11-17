/* ---------------------------------------------------------------------------
   cursorEffects — the supplied pointer system, scoped to one host:
   trails, click bursts, skins and per-effect motion settings.

   The standalone script owns the window and draws fixed layers. This version
   listens on the profile host and paints into its canvas so dashboard
   previews and public profiles can run independently.
   --------------------------------------------------------------------------- */

import {
  DEFAULT_CURSOR_MOTION,
  type ClickEffectId,
  type CursorMotionSettings,
  type CursorSettings,
  type CursorTrailType,
} from "./profileAssets";

type TrailArt = {
  image: HTMLImageElement;
  hotspot: { x: number; y: number };
  ready: boolean;
};

/** First visible pixel of an uploaded cursor; the same point the real CSS cursor uses. */
function measureCursorArt(image: HTMLImageElement): { x: number; y: number } {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return { x: 0, y: 0 };
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 24) return { x, y };
      }
    }
  } catch { /* Cross-origin or broken image — fall back to 0 0. */ }
  return { x: 0, y: 0 };
}

type Point = [number, number];

type Particle = {
  t: "sparkle" | "flake" | "text" | "spark" | "dot" | "bolt" | "ring" | "box" | "petal";
  x: number;
  y: number;
  vx: number;
  vy: number;
  g?: number;
  life: number;
  max: number;
  s?: number;
  col: string;
  tw?: number;
  ch?: string;
  sway?: number;
  rot?: number;
  vr?: number;
  pts?: Point[];
  w?: number;
  h?: number;
  R?: number;
  lw?: number;
  al?: number;
  shrink?: boolean;
  acc?: number;
  drag?: number;
};

const TAU = Math.PI * 2;
const EMOJIS = ["😀", "😂", "🔥", "💖", "✨", "🎉", "🌟", "😎"];
const CONTINUOUS: CursorTrailType[] = ["trailingCursor", "ghost", "tracer", "orbit"];
const rnd = (a: number, b: number) => Math.random() * (b - a) + a;
const pick = <T,>(arr: T[]): T => arr[(Math.random() * arr.length) | 0];

function hslRgb(hue: number): string {
  const h = (((hue % 360) + 360) % 360) / 360;
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return Math.round(255 * (0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return `${f(0)},${f(8)},${f(4)}`;
}

function hexRgb(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!match) return "255,255,255";
  const n = parseInt(match[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function tint(fallback: string, motion: CursorMotionSettings): string {
  return motion.rainbow
    ? hslRgb(performance.now() / 8)
    : motion.color ? hexRgb(motion.color) : fallback;
}

function sparklePath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
}

/** The normal pointer arrow, with its hotspot at x/y. */
function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha: number, fill: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 17);
  ctx.lineTo(4.5, 13);
  ctx.lineTo(7.5, 20);
  ctx.lineTo(10, 19);
  ctx.lineTo(7, 12);
  ctx.lineTo(12.5, 12);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,.9)";
  ctx.stroke();
  ctx.restore();
}

function ghostShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  alpha: number,
  rgb: string,
  tilt: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(0, -s * 0.1, s * 0.5, Math.PI, 0);
  ctx.lineTo(s * 0.5, s * 0.55);
  const band = s / 3;
  for (let i = 0; i < 3; i++) {
    const x1 = s * 0.5 - i * band;
    ctx.quadraticCurveTo(x1 - band / 2, s * 0.3, x1 - band, s * 0.55);
  }
  ctx.closePath();
  ctx.fillStyle = `rgb(${rgb})`;
  ctx.fill();
  ctx.fillStyle = "rgba(20,20,30,.85)";
  ctx.beginPath();
  ctx.ellipse(-s * 0.18, -s * 0.12, s * 0.07, s * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.18, -s * 0.12, s * 0.07, s * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, s * 0.13, s * 0.06, s * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function mountCursorEffects(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  settings: CursorSettings,
  onActive: (active: boolean) => void,
): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => undefined;

  const mode: CursorTrailType = settings.trail ? settings.trailType : "none";
  const trailCfg = settings.trailSettings[mode] ?? DEFAULT_CURSOR_MOTION;
  const clickCfg = settings.clickSettings[settings.click] ?? DEFAULT_CURSOR_MOTION;
  const chars = Array.from(settings.trailText.trim());
  const skin = settings.style;
  // Uploaded cursors are shared by the trailing-cursor effect, so a custom
  // cursor never falls back to eight identical white arrows.
  const cursorArt: TrailArt[] = [...new Set([
    ...(settings.style === "custom" ? [settings.imageUrl] : []),
    ...settings.customCursorUrls,
  ].map((url) => url.trim()).filter(Boolean))]
    .slice(0, 8)
    .map((url) => {
      const art: TrailArt = { image: new Image(), hotspot: { x: 0, y: 0 }, ready: false };
      art.image.onload = () => {
        art.hotspot = measureCursorArt(art.image);
        art.ready = true;
      };
      art.image.src = url;
      return art;
    });

  let width = 1;
  let height = 1;
  let particles: Particle[] = [];
  let mx = -100;
  let my = -100;
  let px: number | null = null;
  let py: number | null = null;
  let raf = 0;
  let active = false;
  let points = Array.from({ length: 8 }, () => ({ x: -100, y: -100 }));
  let history: { x: number; y: number }[] = [];
  let ghostX = -100;
  let ghostY = -100;
  let ghostHistory: { x: number; y: number }[] = [];
  let orbitX = -100;
  let orbitY = -100;
  let skinX = -100;
  let skinY = -100;
  let angle = 0;

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const addParticle = (particle: Particle, motion: CursorMotionSettings) => {
    particle.life = 0;
    particle.max = Math.max(4, particle.max * motion.life);
    if (particle.s) particle.s *= motion.size;
    if (particle.w) particle.w *= motion.size;
    if (particle.h) particle.h *= motion.size;
    if (particle.R) particle.R *= motion.size;
    particles.push(particle);
  };

  const spawn = (x: number, y: number, dx: number, dy: number) => {
    const motion = trailCfg;
    const S = motion.size;
    switch (mode) {
      case "fairyDust":
        for (let i = 0; i < 2; i++) {
          addParticle({
            t: "sparkle", x: x + rnd(-4, 4), y: y + rnd(-4, 4),
            vx: rnd(-0.5, 0.5) + dx * 0.04, vy: rnd(0.1, 0.9) + dy * 0.04,
            g: 0.015, life: 0, max: rnd(35, 60), s: rnd(3, 6),
            col: tint(pick(["255,240,170", "255,255,255", "255,200,235", "190,230,255"]), motion),
            tw: rnd(0, 6),
          }, motion);
        }
        break;
      case "snowflakes":
        addParticle({
          t: "flake", x, y, vx: rnd(-0.3, 0.3), vy: rnd(0.5, 1.2), g: 0,
          life: 0, max: rnd(70, 110), s: rnd(5, 9), col: tint("210,235,255", motion),
          sway: rnd(0, 6), rot: rnd(0, TAU), vr: rnd(-0.05, 0.05),
        }, motion);
        break;
      case "emojiRain":
        addParticle({
          t: "text", ch: pick(chars.length ? chars : EMOJIS), x, y,
          vx: rnd(-0.5, 0.5), vy: rnd(-0.5, 0.5), g: 0.14, life: 0, max: 75,
          s: rnd(14, 22), col: "255,255,255", rot: rnd(-0.4, 0.4), vr: rnd(-0.05, 0.05),
        }, motion);
        break;
      case "characterRain":
        addParticle({
          t: "text", ch: pick(chars.length ? chars : ["0", "1"]), x: x + rnd(-6, 6), y,
          vx: 0, vy: rnd(1.2, 2.6), g: 0.04, life: 0, max: 60,
          s: rnd(12, 16), col: tint("90,255,140", motion), rot: 0, vr: 0,
        }, motion);
        break;
      case "sparkler":
        for (let i = 0; i < 3; i++) {
          const a = rnd(0, TAU);
          const v = rnd(1, 4);
          addParticle({
            t: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.09,
            life: 0, max: rnd(14, 30), s: rnd(1, 2),
            col: tint(pick(["255,200,80", "255,255,220", "255,150,50"]), motion),
          }, motion);
        }
        break;
      case "lightning":
        if (Math.random() < 0.45) {
          const a = rnd(0, TAU);
          const len = rnd(25, 75) * S;
          const count = 5;
          const bolts: Point[] = [[x, y]];
          for (let i = 1; i <= count; i++) {
            const k = i / count;
            const jitter = i === count ? 0 : rnd(-9, 9) * S;
            bolts.push([
              x + Math.cos(a) * len * k - Math.sin(a) * jitter,
              y + Math.sin(a) * len * k + Math.cos(a) * jitter,
            ]);
          }
          addParticle({
            t: "bolt", pts: bolts, x: 0, y: 0, vx: 0, vy: 0, g: 0,
            life: 0, max: 9, col: tint("200,230,255", motion), lw: 1.6 * S,
          }, motion);
        }
        break;
      case "petals":
        addParticle({
          t: "petal", x, y, vx: rnd(-0.3, 0.3), vy: rnd(0.4, 1), g: 0,
          life: 0, max: rnd(80, 120), s: rnd(5, 9), sway: rnd(0, 6),
          rot: rnd(0, TAU), vr: rnd(-0.05, 0.05), col: tint("255,170,200", motion),
        }, motion);
        break;
      case "pixels": {
        const grid = 8 * S;
        addParticle({
          t: "box", x: Math.floor(x / grid) * grid, y: Math.floor(y / grid) * grid,
          vx: 0, vy: 0, g: 0, w: 8, h: 8, life: 0, max: 28,
          col: tint(pick(["0,255,255", "255,0,200", "255,255,255"]), motion), al: 0.85,
        }, motion);
        break;
      }
      case "ripple":
        if (Math.random() < 0.35) {
          addParticle({
            t: "ring", x, y, vx: 0, vy: 0, g: 0, life: 0, max: 28,
            s: 2, R: rnd(25, 40), col: tint("255,255,255", motion),
          }, motion);
        }
        break;
      case "warp": {
        const a = rnd(0, TAU);
        const v = rnd(0.5, 1.5);
        addParticle({
          t: "spark", acc: 1.12, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          g: 0, life: 0, max: 28, s: 1, col: tint("200,220,255", motion),
        }, motion);
        break;
      }
      case "constellation":
        if (particles.length < 70) {
          addParticle({
            t: "dot", x, y, vx: rnd(-0.25, 0.25), vy: rnd(-0.25, 0.25), g: 0,
            life: 0, max: 90, s: 1.8, col: tint("200,220,255", motion),
          }, motion);
        }
        break;
      default:
        break;
    }
  };

  const clickFx = (x: number, y: number) => {
    if (settings.click === "none") return;
    const motion = clickCfg;
    const palette = ["255,255,255", "255,200,80", "120,200,255", "255,120,180"];
    const amount = Math.max(0.2, motion.amount);
    switch (settings.click) {
      case "ripple":
        addParticle({ t: "ring", x, y, vx: 0, vy: 0, g: 0, life: 0, max: 30, s: 4, R: 45, col: tint("255,255,255", motion) }, motion);
        addParticle({ t: "ring", x, y, vx: 0, vy: 0, g: 0, life: 0, max: 42, s: 4, R: 85, col: tint("255,255,255", motion) }, motion);
        break;
      case "burst":
        for (let i = 0; i < Math.round(16 * amount); i++) {
          const a = (TAU * i) / Math.max(1, Math.round(16 * amount)) + rnd(-0.1, 0.1);
          const v = rnd(1.5, 4);
          addParticle({
            t: "dot", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0,
            drag: 0.94, life: 0, max: 35, s: rnd(2, 4), shrink: true,
            col: tint(pick(palette), motion),
          }, motion);
        }
        break;
      case "sparks":
        for (let i = 0; i < Math.round(14 * amount); i++) {
          const a = rnd(0, TAU);
          const v = rnd(2, 6);
          addParticle({
            t: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.08,
            drag: 0.96, life: 0, max: rnd(20, 36), s: rnd(1, 2),
            col: tint(pick(["255,200,80", "255,255,220", "255,150,50"]), motion),
          }, motion);
        }
        break;
      case "pixelPop":
        for (let i = 0; i < Math.round(12 * amount); i++) {
          addParticle({
            t: "box", x, y, vx: rnd(-3, 3), vy: rnd(-4, 1), g: 0.15,
            w: 6, h: 6, life: 0, max: 40,
            col: tint(pick(["0,255,255", "255,0,200", "255,255,255"]), motion), al: 0.9,
          }, motion);
        }
        break;
      case "shockwave":
        addParticle({ t: "ring", x, y, vx: 0, vy: 0, g: 0, life: 0, max: 22, s: 6, R: 140, lw: 3, col: tint("255,255,255", motion) }, motion);
        break;
      default:
        break;
    }
  };

  const paint = (now: number) => {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    const S = trailCfg.size;
    const trailColor = tint("255,255,255", trailCfg);

    if (mode === "trailingCursor") {
      const n = points.length;
      points[0].x = mx;
      points[0].y = my;
      for (let i = 1; i < n; i++) {
        points[i].x += (points[i - 1].x - points[i].x) * 0.3;
        points[i].y += (points[i - 1].y - points[i].y) * 0.3;
      }
      const fill = trailCfg.color || trailCfg.rainbow ? `rgb(${trailColor})` : "#fff";
      for (let i = n - 1; i >= 1; i--) {
        const alpha = (1 - i / n) * 0.75;
        const art = cursorArt.length ? cursorArt[(n - i) % cursorArt.length] : null;
        if (art?.image.complete && art.image.naturalWidth) {
          const size = 22 * S;
          const ratio = art.image.naturalHeight / art.image.naturalWidth || 1;
          // The real cursor places its hotspot under the pointer. Draw the
          // duplicate with that same inset instead of its top-left corner.
          const manual = settings.hotspotX !== 0 || settings.hotspotY !== 0;
          // Auto mode: hide the image's transparent padding, so the artwork
          // starts on the pointer. Manual mode: the real cursor is moved by
          // exactly that many CSS pixels, so move the duplicate by the same
          // amount instead of scaling the offset with the trail size.
          const offsetX = manual ? settings.hotspotX : 0;
          const offsetY = manual ? settings.hotspotY : 0;
          const scale = size / art.image.naturalWidth;
          const insetX = art.ready ? art.hotspot.x * scale : 0;
          const insetY = art.ready ? art.hotspot.y * scale : 0;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.drawImage(
            art.image,
            points[i].x - offsetX - insetX,
            points[i].y - offsetY - insetY,
            size,
            size * ratio,
          );
          ctx.restore();
        } else {
          arrow(ctx, points[i].x, points[i].y, S, alpha, fill);
        }
      }
    } else if (mode === "tracer") {
      if (mx > 0) history.push({ x: mx, y: my });
      const maxLength = Math.max(6, Math.round(40 * trailCfg.life));
      while (history.length > maxLength) history.shift();
      const rgb = tint("255,255,255", trailCfg);
      ctx.lineCap = "round";
      ctx.lineWidth = 2 * S;
      for (let i = 1; i < history.length; i++) {
        ctx.beginPath();
        ctx.moveTo(history[i - 1].x, history[i - 1].y);
        ctx.lineTo(history[i].x, history[i].y);
        ctx.strokeStyle = `rgba(${rgb},${i / history.length})`;
        ctx.stroke();
      }
    } else if (mode === "orbit") {
      orbitX += (mx - orbitX) * 0.3;
      orbitY += (my - orbitY) * 0.3;
      angle += 0.08;
      const radius = 20 * S;
      ctx.beginPath();
      ctx.arc(orbitX, orbitY, radius, 0, TAU);
      ctx.strokeStyle = "rgba(255,255,255,.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
      for (let k = 0; k < 6; k++) {
        const a = angle + (k * TAU) / 6;
        const r = radius + 4 * S * Math.sin(now / 300 + k);
        ctx.beginPath();
        ctx.arc(orbitX + Math.cos(a) * r, orbitY + Math.sin(a) * r, 3 * S, 0, TAU);
        ctx.fillStyle = trailCfg.color || trailCfg.rainbow
          ? `rgba(${tint("255,255,255", trailCfg)},.95)`
          : `hsla(${(now / 10 + k * 60) % 360},100%,65%,.95)`;
        ctx.fill();
      }
    } else if (mode === "ghost") {
      // Float the ghost a little farther to the lower-right of the pointer so
      // it reads as a separate companion rather than part of the cursor.
      const ghostOffsetX = 30;
      const ghostOffsetY = 22;
      ghostX += (mx + ghostOffsetX - ghostX) * 0.1;
      ghostY += (my + ghostOffsetY - ghostY) * 0.1;
      ghostHistory.push({ x: ghostX, y: ghostY });
      if (ghostHistory.length > 18) ghostHistory.shift();
      const bob = Math.sin(now / 250) * 3;
      const size = 26 * S;
      const rgb = tint("255,255,255", trailCfg);
      const tilt = Math.max(-0.35, Math.min(0.35, (mx + ghostOffsetX - ghostX) * 0.004));
      ([[0, 0.08], [6, 0.16], [12, 0.3]] as const).forEach(([index, alpha]) => {
        const point = ghostHistory[index];
        if (point) ghostShape(ctx, point.x, point.y + bob, size, alpha, rgb, 0);
      });
      ghostShape(ctx, ghostX, ghostY + bob, size, 0.92, rgb, tilt);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.life++;
      if (particle.life > particle.max) {
        particles.splice(i, 1);
        continue;
      }
      if (particle.acc) {
        particle.vx *= particle.acc;
        particle.vy *= particle.acc;
      }
      if (particle.drag) {
        particle.vx *= particle.drag;
        particle.vy *= particle.drag;
      }
      particle.x += particle.vx + (particle.sway !== undefined ? Math.sin(now / 300 + particle.sway) * 0.5 : 0);
      particle.y += particle.vy;
      particle.vy += particle.g ?? 0;
      const alpha = 1 - particle.life / particle.max;
      switch (particle.t) {
        case "text":
          particle.rot = (particle.rot ?? 0) + (particle.vr ?? 0);
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(particle.rot);
          ctx.globalAlpha = Math.min(1, alpha * 1.5);
          ctx.font = `${particle.s ?? 14}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = `rgb(${particle.col})`;
          ctx.fillText(particle.ch ?? "", 0, 0);
          ctx.restore();
          break;
        case "flake":
          particle.rot = (particle.rot ?? 0) + (particle.vr ?? 0);
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(particle.rot);
          ctx.strokeStyle = `rgba(${particle.col},${Math.min(1, alpha * 1.5)})`;
          ctx.lineWidth = 1;
          ctx.lineCap = "round";
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            ctx.rotate(TAU / 6);
            const size = particle.s ?? 6;
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -size);
            ctx.moveTo(0, -size * 0.55);
            ctx.lineTo(size * 0.3, -size * 0.8);
            ctx.moveTo(0, -size * 0.55);
            ctx.lineTo(-size * 0.3, -size * 0.8);
          }
          ctx.stroke();
          ctx.restore();
          break;
        case "sparkle":
          ctx.fillStyle = `rgba(${particle.col},${alpha * (0.6 + 0.4 * Math.sin(now / 80 + (particle.tw ?? 0)))})`;
          sparklePath(ctx, particle.x, particle.y, (particle.s ?? 4) * (0.5 + 0.5 * alpha));
          break;
        case "spark":
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(particle.x - particle.vx * 2.5, particle.y - particle.vy * 2.5);
          ctx.strokeStyle = `rgba(${particle.col},${alpha})`;
          ctx.lineWidth = particle.s ?? 1;
          ctx.lineCap = "round";
          ctx.stroke();
          break;
        case "dot": {
          const radius = Math.max(0.3, (particle.s ?? 1) * (particle.shrink ? alpha : 1));
          ctx.fillStyle = `rgba(${particle.col},${alpha})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, radius, 0, TAU);
          ctx.fill();
          break;
        }
        case "bolt":
          ctx.beginPath();
          (particle.pts ?? []).forEach(([bx, by], index) => (index ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by)));
          ctx.strokeStyle = `rgba(${particle.col},${alpha})`;
          ctx.lineWidth = particle.lw ?? 1.6;
          ctx.lineJoin = "round";
          ctx.stroke();
          break;
        case "ring":
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, (particle.s ?? 2) + (1 - alpha) * (particle.R ?? 40), 0, TAU);
          ctx.strokeStyle = `rgba(${particle.col},${alpha * 0.7})`;
          ctx.lineWidth = particle.lw ?? 1.5;
          ctx.stroke();
          break;
        case "box":
          ctx.fillStyle = `rgba(${particle.col},${alpha * (particle.al ?? 0.8)})`;
          ctx.fillRect(particle.x, particle.y, particle.w ?? 8, particle.h ?? 8);
          break;
        case "petal":
          particle.rot = (particle.rot ?? 0) + (particle.vr ?? 0);
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(particle.rot);
          ctx.fillStyle = `rgba(${particle.col},${Math.min(1, alpha * 1.6)})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, particle.s ?? 6, (particle.s ?? 6) * 0.55, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
        default:
          break;
      }
    }

    if (mode === "constellation") {
      const rgb = tint("200,220,255", trailCfg);
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          if (a.t !== "dot" || b.t !== "dot") continue;
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance < 60) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${rgb},${0.3 * (1 - distance / 60) * Math.min(1 - a.life / a.max, 1 - b.life / b.max)})`;
            ctx.stroke();
          }
        }
      }
    }
    if (mode === "sparkler" && mx > 0) {
      ctx.beginPath();
      ctx.arc(mx, my, 2.5 * S, 0, TAU);
      ctx.fillStyle = "rgba(255,245,200,.9)";
      ctx.fill();
    }
    if (particles.length > 600) particles.splice(0, particles.length - 600);

    // Skins are drawn on the same canvas so they line up exactly with trails.
    skinX += (mx - skinX) * 0.25;
    skinY += (my - skinY) * 0.25;
    if (skin !== "system" && skin !== "custom" && mx > 0) {
      const scale = Math.max(0.4, settings.size / 10);
      const color = settings.color;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.5;
      if (skin === "dot" || skin === "dotRing") {
        ctx.beginPath();
        ctx.arc(mx, my, 3.5 * scale, 0, TAU);
        ctx.fill();
      }
      if (skin === "ring" || skin === "dotRing") {
        ctx.beginPath();
        ctx.arc(skinX, skinY, 13 * scale, 0, TAU);
        ctx.stroke();
      }
      if (skin === "crosshair") {
        const length = 10 * scale;
        const gap = 3 * scale;
        ctx.beginPath();
        ctx.moveTo(mx - length, my);
        ctx.lineTo(mx - gap, my);
        ctx.moveTo(mx + gap, my);
        ctx.lineTo(mx + length, my);
        ctx.moveTo(mx, my - length);
        ctx.lineTo(mx, my - gap);
        ctx.moveTo(mx, my + gap);
        ctx.lineTo(mx, my + length);
        ctx.stroke();
      }
    }

    if (active) raf = requestAnimationFrame(paint);
    else raf = 0;
  };

  const start = () => {
    if (active) return;
    active = true;
    onActive(true);
    if (!raf) raf = requestAnimationFrame(paint);
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === "touch" || document.hidden) return;
    const rect = host.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    mx = x;
    my = y;
    if (points[0].x < 0) points.forEach((point) => { point.x = x; point.y = y; });
    if (ghostX < 0) { ghostX = x + 30; ghostY = y + 22; }
    if (orbitX < 0) { orbitX = x; orbitY = y; }
    if (skinX < 0) { skinX = x; skinY = y; }
    start();
    if (mode === "none" || CONTINUOUS.includes(mode)) return;
    if (px === null || py === null) { px = x; py = y; }
    const dx = x - px;
    const dy = y - py;
    const distance = Math.hypot(dx, dy);
    const steps = Math.min(Math.max(Math.round(distance / 8), 1), 12);
    for (let i = 1; i <= steps; i++) {
      for (let k = trailCfg.amount; k > 0; k -= 1) {
        if (k >= 1 || Math.random() < k) {
          spawn(px + dx * i / steps, py + dy * i / steps, dx, dy);
        }
      }
    }
    px = x;
    py = y;
  };

  const onDown = (event: PointerEvent) => {
    if (event.button !== 0 || document.hidden) return;
    const rect = host.getBoundingClientRect();
    clickFx(event.clientX - rect.left, event.clientY - rect.top);
    start();
  };

  const onLeave = () => {
    active = false;
    onActive(false);
    particles = [];
    history = [];
    ghostHistory = [];
    points = Array.from({ length: 8 }, () => ({ x: -100, y: -100 }));
    ghostX = -100;
    ghostY = -100;
    orbitX = -100;
    orbitY = -100;
    skinX = -100;
    skinY = -100;
    px = null;
    py = null;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    ctx.clearRect(0, 0, width, height);
  };

  resize();
  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  observer?.observe(host);
  window.addEventListener("resize", resize);
  host.addEventListener("pointermove", onMove, { passive: true });
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointerleave", onLeave);
  window.addEventListener("blur", onLeave);
  document.addEventListener("visibilitychange", onLeave);

  return () => {
    onLeave();
    observer?.disconnect();
    window.removeEventListener("resize", resize);
    host.removeEventListener("pointermove", onMove);
    host.removeEventListener("pointerdown", onDown);
    host.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("blur", onLeave);
    document.removeEventListener("visibilitychange", onLeave);
  };
}
