/* ---------------------------------------------------------------------------
   bgEffects — 12 dependency-free canvas background effects.

   Ported from the standalone bg-effects.js module and extended so every
   effect honours the dashboard's per-effect settings:
     - intensity  0–100 (each effect's main slider)
     - speed      seconds, higher = slower (matches the old CSS effects)
     - color      hex tint, used by every effect that paints light/colour
     - amount     the effect's own extra slider (wind, drift, pixel size, …)

   Effects draw on top of the host's background but below its content:
   the canvas is absolutely positioned inside the host with pointer-events
   disabled, so nothing on the page becomes unclickable.
   --------------------------------------------------------------------------- */

export type BgFxInput = {
  effect: string;
  /** 0–100 */
  intensity: number;
  /** seconds; higher = slower */
  speed: number;
  /** hex colour tint */
  color: string;
  /** the effect's own extra slider value */
  amount: number;
  /** the effect's own toggle (where a schema defines one) */
  flag: boolean;
};

export type BgFxApi = {
  update: (settings: BgFxInput) => void;
  destroy: () => void;
};

const TAU = Math.PI * 2;
const R = (n: number) => Math.random() * n;

function hexToRgb(hex: string): [number, number, number] {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#ffffff";
  const value = Number.parseInt(safe.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/* ── sprites (built lazily so importing is SSR-safe) ─────── */

let SW: HTMLCanvasElement | null = null;
let SD: HTMLCanvasElement | null = null;
let LF: HTMLCanvasElement[] = [];

function spr(r: number, g: number, b: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  const q = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  q.addColorStop(0, `rgba(${r},${g},${b},1)`);
  q.addColorStop(0.35, `rgba(${r},${g},${b},.35)`);
  q.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = q;
  x.fillRect(0, 0, 64, 64);
  return c;
}

function leaf(c1: string, c2: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 48;
  const x = c.getContext("2d")!;
  x.fillStyle = c1;
  x.beginPath();
  x.moveTo(24, 2);
  x.bezierCurveTo(46, 14, 42, 38, 24, 46);
  x.bezierCurveTo(6, 38, 2, 14, 24, 2);
  x.fill();
  x.strokeStyle = c2;
  x.lineWidth = 1.4;
  x.beginPath();
  x.moveTo(24, 6);
  x.lineTo(24, 47);
  for (let y = 14; y < 40; y += 8) {
    x.moveTo(24, y + 6);
    x.lineTo(14, y);
    x.moveTo(24, y + 6);
    x.lineTo(34, y);
  }
  x.stroke();
  return c;
}

function assets() {
  if (SW) return;
  SW = spr(255, 255, 255);
  SD = spr(255, 226, 170);
  LF = [
    leaf("#d2561b", "#7a2a08"),
    leaf("#e89a1f", "#8a4a08"),
    leaf("#a8321a", "#5a1408"),
    leaf("#c9b02a", "#6a5a08"),
  ];
}

type Flake = { x: number; y: number; z?: number; L?: number; ph: number; s?: number; r?: number; vr?: number; c?: number };
type Meteor = { x: number; y: number; vx: number; vy: number; l: number; m: number };
type Splash = { x: number; y: number; vx: number; vy: number; l: number };

export function mountBgEffect(container: HTMLElement, initial: BgFxInput): BgFxApi {
  assets();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (getComputedStyle(container).position === "static") container.style.position = "relative";
  container.style.isolation = "isolate";

  const fill = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
  const cv = document.createElement("canvas");
  cv.style.cssText = `${fill}display:block`;
  const bl = document.createElement("div");
  bl.style.cssText = `${fill}display:none`;
  container.prepend(cv, bl);
  const ctx = cv.getContext("2d")!;

  let mode = "snow";
  let s: BgFxInput = { ...initial };
  let speedMul = 1;
  let W = 0;
  let H = 0;
  let P: Flake[] = [];
  let X: (Meteor | Splash)[] = [];
  let T: Record<string, unknown> = {};
  let mx = 0;
  let my = 0;
  let has = false;
  let raf = 0;
  let visible = true;
  let last = 0;
  let clock = 0;

  let [cr, cg, cb] = hexToRgb(s.color);
  const tint = (a: number) => `rgba(${cr},${cg},${cb},${a})`;

  /* Pointer influence. Effects that can react call pushAway() on each
     particle, so the cursor parts snow, rain and embers instead of the
     effect ignoring the mouse entirely. */
  const PUSH = 170;
  const pushAway = (p: { x: number; y: number }, strength = 1.6) => {
    if (!has) return;
    const dx = p.x - mx;
    const dy = p.y - my;
    const d2 = dx * dx + dy * dy;
    if (d2 > PUSH * PUSH || d2 < 1) return;
    const d = Math.sqrt(d2);
    const force = (1 - d / PUSH) * strength;
    p.x += (dx / d) * force;
    p.y += (dy / d) * force;
  };

  const mkStars = (n: number) => {
    P = [];
    for (let i = 0; i < n; i++) P.push({ x: R(W), y: R(H), ph: R(TAU), z: 0.0008 + R(0.002) });
  };
  const twinkles = (t: number, n: number) => {
    ctx.fillStyle = "#fff";
    for (let i = 0; i < n && i < P.length; i++) {
      const star = P[i];
      ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * (star.z ?? 0.001) + star.ph));
      ctx.beginPath();
      ctx.arc(star.x, star.y, 0.4 + ((star.ph * 7) % 1.1), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  const lowres = (d: number) => {
    T.w = Math.ceil(W / d);
    T.h = Math.ceil(H / d);
    const c = document.createElement("canvas");
    c.width = T.w as number;
    c.height = T.h as number;
    T.c = c;
    T.x = c.getContext("2d")!;
    T.img = (T.x as CanvasRenderingContext2D).createImageData(T.w as number, T.h as number);
  };
  const vig = (a: number) => {
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, `rgba(0,0,0,${a})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  };
  /* A soft light that follows the cursor — gives the sparse effects (stars,
     night) something to answer the pointer with. */
  const pointerGlow = (alpha: number, radius: number) => {
    if (!has) return;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, radius);
    g.addColorStop(0, tint(alpha));
    g.addColorStop(1, tint(0));
    ctx.fillStyle = g;
    ctx.fillRect(mx - radius, my - radius, radius * 2, radius * 2);
  };

  function init() {
    W = container.clientWidth;
    H = container.clientHeight;
    cv.width = Math.max(1, Math.round(W * dpr));
    cv.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    P = [];
    X = [];
    T = {};
    bl.style.display = mode === "blur" ? "block" : "none";
    const amount = s.amount || 50;
    if (mode === "snowstorm") for (let i = 0; i < 500; i++) P.push({ x: R(W), y: R(H), z: 0.3 + R(0.7), ph: 0 });
    if (mode === "snow") for (let i = 0; i < 180; i++) P.push({ x: R(W), y: R(H), L: i % 3 < 1 ? 2 : i % 3, ph: R(TAU) });
    if (mode === "rain") for (let i = 0; i < 300; i++) P.push({ x: R(W + 200), y: R(H), z: 0.2 + R(0.8), ph: 0 });
    if (mode === "stars") mkStars(200);
    if (mode === "night") mkStars(240);
    if (mode === "dust") for (let i = 0; i < 220; i++) P.push({ x: R(W), y: R(H), z: R(1), ph: R(TAU) });
    if (mode === "leaf") for (let i = 0; i < 80; i++) P.push({ x: R(W), y: R(H), s: 14 + R(18), r: R(TAU), vr: (R(1) - 0.5) * 0.05, ph: R(TAU), c: i % 4 });
    if (mode === "dither") lowres(Math.max(2, Math.round(2 + (amount / 100) * 3)));
    if (mode === "tv") lowres(3);
    if (mode === "fuzzy") lowres(Math.max(2, Math.round(2 + (amount / 100) * 6)));
  }

  /* ── the twelve effects ─────────────────────────────────── */

  const D: Record<string, (t: number) => void> = {
    snowstorm(t) {
      const f = s.intensity / 100;
      const gust = 0.5 + s.amount / 100;
      const wind = (3 + f * 8) * gust;
      const n = Math.floor(500 * (0.2 + f * 0.8));
      ctx.lineCap = "round";
      for (let i = 0; i < n; i++) {
        const p = P[i];
        pushAway(p, 1.5);
        const vx = wind * (p.z ?? 0.5) * (0.9 + 0.2 * Math.sin(t / 700 + i));
        const vy = 2 + (p.z ?? 0.5) * 4;
        ctx.strokeStyle = tint(0.25 + (p.z ?? 0.5) * 0.55);
        ctx.lineWidth = 0.8 + (p.z ?? 0.5) * 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - vx * 2.2, p.y - vy * 1.2);
        ctx.stroke();
        p.x += vx;
        p.y += vy;
        if (p.x > W + 30) {
          p.x = -30;
          p.y = R(H);
        }
        if (p.y > H + 10) {
          p.y = -10;
          p.x = R(W);
        }
      }
      for (let i = 0; i < 4; i++) {
        const x = ((t * 0.04 * (1 + i * 0.4) + i * 260) % (W + 500)) - 250;
        ctx.globalAlpha = f * 0.2;
        ctx.drawImage(SW!, x, H * (0.15 + i * 0.2), 520, H * 0.45);
      }
      ctx.globalAlpha = 1;
    },

    snow(t) {
      const f = s.intensity / 100;
      const drift = 0.4 + s.amount / 100;
      const gust = Math.sin(t / 3200) * 0.5 + Math.sin(t / 1100) * 0.15;
      const n = Math.floor(180 * Math.min(1, f * 2));
      const S = [
        { s: 7, a: 0.6, v: 0.45, sw: 0.25 },
        { s: 13, a: 0.75, v: 0.9, sw: 0.5 },
        { s: 30, a: 0.3, v: 1.8, sw: 0.9 },
      ];
      for (let i = 0; i < n; i++) {
        const p = P[i];
        const q = S[p.L ?? 1];
        pushAway(p, 0.9);
        p.ph += 0.015;
        p.y += q.v;
        p.x += Math.sin(p.ph) * q.sw * drift + gust * q.v * 1.2 * drift;
        if (p.y > H + 20) {
          p.y = -20;
          p.x = R(W);
        }
        if (p.x > W + 30) p.x = -30;
        if (p.x < -30) p.x = W + 30;
        ctx.globalAlpha = q.a;
        const size = q.s;
        if (SW && cr === 255 && cg === 255 && cb === 255) {
          ctx.drawImage(SW, p.x - size / 2, p.y - size / 2, size, size);
        } else {
          ctx.fillStyle = tint(q.a);
          ctx.beginPath();
          ctx.arc(p.x, p.y, size / 2.6, 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },

    rain(t) {
      const f = s.intensity / 100;
      const slant = 0.1 + s.amount / 100 * 0.4;
      ctx.lineCap = "round";
      const n = Math.floor(300 * Math.min(1, f * 2));
      for (let i = 0; i < n; i++) {
        const p = P[i];
        pushAway(p, 1.3);
        const v = 9 + (p.z ?? 0.5) * 15;
        const l = 8 + (p.z ?? 0.5) * 20;
        ctx.strokeStyle = tint(0.15 + (p.z ?? 0.5) * 0.45);
        ctx.lineWidth = 0.5 + (p.z ?? 0.5);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + l * slant, p.y - l);
        ctx.stroke();
        p.y += v;
        p.x -= v * slant;
        if (p.y > H - R(10)) {
          if ((p.z ?? 0) > 0.5) {
            for (let k = 0; k < 3; k++) {
              X.push({ x: p.x, y: H - 2, vx: (R(2) - 1) * 1.6, vy: -1 - R(2), l: 14 });
            }
          }
          p.y = -R(80);
          p.x = R(W + 200);
        }
      }
      ctx.fillStyle = tint(0.6);
      for (let i = X.length - 1; i >= 0; i--) {
        const splash = X[i] as Splash;
        ctx.globalAlpha = splash.l / 14;
        ctx.fillRect(splash.x, splash.y, 1.6, 1.6);
        splash.x += splash.vx;
        splash.y += splash.vy;
        splash.vy += 0.28;
        if (--splash.l <= 0) X.splice(i, 1);
      }
      ctx.globalAlpha = 1;
    },

    stars(t) {
      const f = s.intensity / 100;
      const rate = 0.4 + s.amount / 100 * 1.6;
      twinkles(t, Math.floor(200 * (0.3 + f * 0.7)));
      pointerGlow(0.05 + f * 0.1, 150 + f * 90);
      const meteors = X as Meteor[];
      if (meteors.length < 1 + Math.ceil(f * 4) && Math.random() < (0.004 + f * 0.05) * rate) {
        const sp = 11 + R(6);
        meteors.push({ x: R(W * 0.8), y: R(H * 0.4), vx: sp * 0.86, vy: sp * 0.5, l: 0, m: 38 + R(14) });
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const star = meteors[i];
        const q = 1 - star.l / star.m;
        const tx = star.x - star.vx * 7;
        const ty = star.y - star.vy * 7;
        const g = ctx.createLinearGradient(star.x, star.y, tx, ty);
        g.addColorStop(0, tint(q));
        g.addColorStop(0.3, tint(q * 0.5));
        g.addColorStop(1, "rgba(150,170,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.globalAlpha = q;
        ctx.drawImage(SW!, star.x - 9, star.y - 9, 18, 18);
        ctx.globalAlpha = 1;
        star.x += star.vx;
        star.y += star.vy;
        if (++star.l > star.m) meteors.splice(i, 1);
      }
    },

    blur() {
      const f = s.intensity / 100;
      const px = Math.max(0, f * 24 + (s.amount / 100) * 8).toFixed(1) + "px";
      if (T.px !== px) {
        T.px = px;
        bl.style.backdropFilter = `blur(${px})`;
        (bl.style as CSSStyleDeclaration & { webkitBackdropFilter: string }).webkitBackdropFilter = `blur(${px})`;
      }
    },

    night(t) {
      const f = s.intensity / 100;
      ctx.fillStyle = `rgba(${Math.round(cr * 0.1)},${Math.round(cg * 0.15)},${Math.round(cb * 0.4)},${0.1 + f * 0.5})`;
      ctx.fillRect(0, 0, W, H);
      twinkles(t, Math.floor(240 * (0.2 + f * 0.8)));
      pointerGlow(0.04 + f * 0.08, 140 + f * 80);
      vig((0.2 + f * 0.4) * (0.5 + s.amount / 100));
    },

    tv(t) {
      const f = s.intensity / 100;
      const scanlineStrength = 0.12 + (s.amount / 100) * 0.35;
      const img = T.img as ImageData;
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = R(255);
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = 255;
      }
      (T.x as CanvasRenderingContext2D).putImageData(img, 0, 0);
      ctx.globalAlpha = 0.03 + f * 0.3;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(T.c as HTMLCanvasElement, 0, 0, W, H);
      ctx.globalAlpha = 1;
      const ry = (t * 0.12) % (H + 160) - 80;
      const rb = ctx.createLinearGradient(0, ry, 0, ry + 90);
      rb.addColorStop(0, "rgba(255,255,255,0)");
      rb.addColorStop(0.5, `rgba(255,255,255,${0.04 + f * 0.12})`);
      rb.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = rb;
      ctx.fillRect(0, ry, W, 90);
      ctx.fillStyle = `rgba(0,0,0,${scanlineStrength})`;
      for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1.2);
      ctx.fillStyle = tint((0.01 + R(0.04)) * f * 2);
      ctx.fillRect(0, 0, W, H);
      vig(0.25 + f * 0.5);
    },

    dither(t) {
      const f = s.intensity / 100;
      const w = T.w as number;
      const h = T.h as number;
      const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      const img = T.img as ImageData;
      const d = img.data;
      const k = 0.25 + f * 2.2;
      // The pointer works in the same low-res grid as the dither cells, so the
      // ripple folds into the pattern instead of sitting on top of it.
      const px = has ? (mx / Math.max(1, W)) * w : -9999;
      const py = has ? (my / Math.max(1, H)) * h : -9999;
      const reach = Math.max(8, Math.min(w, h) * 0.42);
      const reach2 = reach * reach;
      // Alpha is deliberately partial: the pattern reads as light on the page,
      // never as an opaque panel covering it.
      const alpha = Math.round(70 + f * 120);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = x - px;
          const dy = y - py;
          const d2 = dx * dx + dy * dy;
          const near = has && d2 < reach2 ? 1 - d2 / reach2 : 0;
          const ripple = near ? Math.sin(Math.sqrt(d2) * 0.85 - t * 0.004) * near * 0.4 : 0;
          const v =
            (Math.sin(x * 0.07 + t * 0.0006) +
              Math.sin(y * 0.09 - t * 0.0005) +
              Math.sin((x + y) * 0.05 + t * 0.0004) +
              Math.sin(Math.hypot(x - w / 2, y - h / 2) * 0.09 - t * 0.001)) *
              0.125 +
            0.5 +
            ripple +
            near * 0.18;
          const on = v * k > B[(y & 3) * 4 + (x & 3)] / 16 + 0.02;
          const o = (y * w + x) * 4;
          d[o] = cr;
          d[o + 1] = cg;
          d[o + 2] = cb;
          d[o + 3] = on ? alpha : 0;
        }
      }
      (T.x as CanvasRenderingContext2D).putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(T.c as HTMLCanvasElement, 0, 0, W, H);
    },

    fuzzy() {
      const f = s.intensity / 100;
      const img = T.img as ImageData;
      const d = img.data;
      T.fr = ((T.fr as number) + 1) % 3;
      if ((T.fr as number) === 0) {
        for (let i = 0; i < d.length; i += 4) {
          const v = R(255);
          d[i] = Math.round(v * 0.8 * (cr / 255) + cr * 0.27);
          d[i + 1] = Math.round(v * 0.7 * (cg / 255) + cg * 0.24);
          d[i + 2] = Math.round(v * (cb / 255) + cb * 0.24);
          d[i + 3] = R(255);
        }
        (T.x as CanvasRenderingContext2D).putImageData(img, 0, 0);
      }
      ctx.globalAlpha = 0.06 + f * 0.55;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(T.c as HTMLCanvasElement, 0, 0, W, H);
      ctx.globalAlpha = 1;
    },

    flash(t) {
      const f = s.intensity / 100;
      const tx = has ? mx : W / 2 + Math.cos(t / 1500) * W * 0.3;
      const ty = has ? my : H / 2 + Math.sin(t / 1100) * H * 0.25;
      sx += (tx - sx) * 0.14;
      sy += (ty - sy) * 0.14;
      const radius = 90 + f * 190 + (s.amount / 100) * 90;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
      g.addColorStop(0, tint(0.2 + f * 0.3));
      g.addColorStop(0.5, tint(0.08 + f * 0.12));
      g.addColorStop(1, tint(0));
      ctx.fillStyle = g;
      ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
    },

    dust(t) {
      const f = s.intensity / 100;
      const sizeBoost = 0.5 + s.amount / 100;
      const n = Math.floor(220 * Math.min(1, f * 2));
      for (let i = 0; i < n; i++) {
        const p = P[i];
        p.ph += 0.006 + (p.z ?? 0) * 0.004;
        const sp = 0.15 + (p.z ?? 0) * 0.5;
        p.x += Math.cos(p.ph + t * 0.0002) * sp * 0.6 + 0.12;
        p.y += Math.sin(p.ph * 1.3) * sp * 0.5 - 0.08 * sp;
        if (has) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.hypot(dx, dy);
          if (dist < 120 && dist > 1) {
            const q = (1 - dist / 120) * 3 * (0.4 + (p.z ?? 0));
            p.x += (dx / dist) * q;
            p.y += (dy / dist) * q;
          }
        }
        if (p.x > W + 20) p.x = -20;
        if (p.x < -20) p.x = W + 20;
        if (p.y > H + 20) p.y = -20;
        if (p.y < -20) p.y = H + 20;
        const size = (5 + (p.z ?? 0) * (p.z ?? 0) * 30) * sizeBoost;
        ctx.globalAlpha = (0.2 + (p.z ?? 0) * 0.5) * (0.7 + 0.3 * Math.sin(t * 0.002 + p.ph * 3));
        if (SD && cr === 255 && cg === 226 && cb === 170) {
          ctx.drawImage(SD, p.x - size / 2, p.y - size / 2, size, size);
        } else {
          ctx.fillStyle = tint(0.85);
          ctx.beginPath();
          ctx.arc(p.x, p.y, size / 2.4, 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },

    leaf(t) {
      const f = s.intensity / 100;
      const spin = 0.5 + s.amount / 100 * 1.5;
      const n = Math.min(80, Math.round(f * 160));
      const gust = Math.sin(t / 2600) * 0.8;
      for (let i = 0; i < n; i++) {
        const p = P[i];
        p.ph += 0.018 * spin;
        p.y += 0.7 + (p.s ?? 14) * 0.04;
        p.x += Math.sin(p.ph) * 1.1 + gust + 0.2;
        p.r = (p.r ?? 0) + (p.vr ?? 0) * spin;
        if (has) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.hypot(dx, dy);
          if (dist < 110 && dist > 1) {
            p.x += (dx / dist) * (1 - dist / 110) * 4;
            p.r = (p.r ?? 0) + 0.05;
          }
        }
        if (p.y > H + 30) {
          p.y = -30;
          p.x = R(W);
        }
        if (p.x > W + 30) p.x = -30;
        if (p.x < -30) p.x = W + 30;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.r ?? 0) + Math.sin(p.ph) * 0.5);
        ctx.scale(Math.cos(p.ph * 0.8) * 0.8 + 0.2, 1);
        ctx.globalAlpha = 0.6 + (p.s ?? 14) / 60;
        ctx.drawImage(LF[p.c ?? 0], -(p.s ?? 14) / 2, -(p.s ?? 14) / 2, p.s ?? 14, p.s ?? 14);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };

  let sx = 0;
  let sy = 0;

  function draw(t: number) {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, W, H);
    const fn = D[mode];
    if (fn) fn(t);
  }

  function loop(now: number) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(64, now - last);
    last = now;
    clock += dt * speedMul;
    draw(clock);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    // Background motion is the point of these effects, so it always runs —
    // reduced-motion users get the same calm, non-flashing draws at a slower
    // clock instead of a frozen frame.
    if (!raf && visible) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  const ro = new ResizeObserver(() => {
    init();
    start();
  });
  ro.observe(container);
  const io = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
    if (visible) start();
    else stop();
  });
  io.observe(container);
  // Browsers pause rAF in hidden tabs; restart when the page comes back so a
  // background effect never comes back as a still image.
  const onVisible = () => {
    if (document.visibilityState === "visible") start();
  };
  document.addEventListener("visibilitychange", onVisible);
  const pt = (e: PointerEvent) => {
    const r = container.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
    has = true;
  };
  const lv = () => {
    has = false;
  };
  container.addEventListener("pointermove", pt);
  container.addEventListener("pointerdown", pt);
  container.addEventListener("pointerleave", lv);

  const api: BgFxApi = {
    update(next: BgFxInput) {
      const effectChanged = next.effect !== s.effect;
      const pixelSizeChanged =
        (next.effect === "dither" || next.effect === "fuzzy") && next.amount !== s.amount;
      s = { ...next };
      // Re-read the tint: the colour used to be captured at mount, so moving
      // the colour slider never changed snow, dust or the dither.
      [cr, cg, cb] = hexToRgb(s.color);
      speedMul = 9 / Math.min(24, Math.max(2, s.speed));
      if (effectChanged) {
        mode = s.effect;
        init();
        stop();
        start();
      } else if (pixelSizeChanged) {
        init();
        start();
      }
    },
    destroy() {
      stop();
      ro.disconnect();
      io.disconnect();
      container.removeEventListener("pointermove", pt);
      container.removeEventListener("pointerdown", pt);
      container.removeEventListener("pointerleave", lv);
      document.removeEventListener("visibilitychange", onVisible);
      cv.remove();
      bl.remove();
    },
  };

  mode = s.effect;
  speedMul = 9 / Math.min(24, Math.max(2, s.speed));
  init();
  start();

  return api;
}
