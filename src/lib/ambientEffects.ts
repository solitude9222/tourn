/* ---------------------------------------------------------------------------
   ambientEffects — the transparent background scenes from the supplied effects
   module: rain, snow, night, storm, warp and shooting stars.

   The standalone script draws fixed layers on document.body. This version
   mounts the same scenes into a host element so dashboard previews and the
   public profile can each run their own layer without fighting over z-index.
   --------------------------------------------------------------------------- */

export type AmbientScene =
  | "rain"
  | "snow"
  | "night"
  | "storm"
  | "warp"
  | "shootingStars"
  | "embers"
  | "bubbles"
  | "fireflies"
  | "petals";

type Particle = {
  x: number;
  y: number;
  l?: number;
  v?: number;
  r?: number;
  ph?: number;
  on?: boolean;
  wait?: number;
  vx?: number;
  vy?: number;
  a?: number;
  d?: number;
  life?: number;
  s?: number;
  vr?: number;
};

type Scene = {
  area?: number;
  count?: number;
  make: (w: number, h: number, first: boolean, index?: number) => Particle;
  update: (p: Particle, w: number, h: number, dt: number, t: number) => void;
  draw: (ctx: CanvasRenderingContext2D, p: Particle, t: number, w: number, h: number) => void;
  pre?: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number, state: { flash: number }) => void;
};

const TAU = Math.PI * 2;
const rnd = (a: number, b: number) => Math.random() * (b - a) + a;

const SCENES: Record<AmbientScene, Scene> = {
  rain: {
    area: 9000,
    make: (w, h, first) => ({ x: rnd(0, w + 120), y: first ? rnd(0, h) : -20, l: rnd(10, 22), v: rnd(600, 900) }),
    update(p, w, h, dt) {
      p.y += (p.v ?? 0) * dt;
      p.x -= (p.v ?? 0) * dt * 0.15;
      if (p.y > h + 20 || p.x < -30) Object.assign(p, this.make(w, h, false));
    },
    draw(ctx, p) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + (p.l ?? 0) * 0.15, p.y - (p.l ?? 0));
      ctx.strokeStyle = "rgba(170,190,220,.45)";
      ctx.lineWidth = 1;
      ctx.stroke();
    },
  },
  snow: {
    area: 14000,
    make: (w, h, first) => ({ x: rnd(0, w), y: first ? rnd(0, h) : -10, r: rnd(1, 3.2), v: rnd(30, 80), ph: rnd(0, 6.28) }),
    update(p, w, h, dt, t) {
      p.y += (p.v ?? 0) * dt;
      p.x += Math.sin(t + (p.ph ?? 0)) * 20 * dt;
      if (p.y > h + 10) Object.assign(p, this.make(w, h, false));
    },
    draw(ctx, p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r ?? 1, 0, TAU);
      ctx.fillStyle = "rgba(255,255,255,.8)";
      ctx.fill();
    },
  },
  night: {
    area: 5000,
    make: (w, h) => ({ x: rnd(0, w), y: rnd(0, h), r: rnd(0.4, 1.5), ph: rnd(0, 6.28), s: rnd(0.5, 2) }),
    update(p, w, h, dt, t) {
      // A slow drift gives the field a direction even between twinkles.
      p.x = (((p.x ?? 0) + Math.sin(t * 0.35 + (p.ph ?? 0)) * 4 * dt) + w) % w;
      p.y = (((p.y ?? 0) + Math.cos(t * 0.22 + (p.ph ?? 0)) * 1.5 * dt) + h) % h;
    },
    draw(ctx, p, t) {
      const pulse = 0.55 + 0.45 * Math.sin(t * (p.s ?? 1) + (p.ph ?? 0));
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.r ?? 1) * (0.75 + pulse * 0.35), 0, TAU);
      ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.75 * pulse})`;
      ctx.fill();
    },
  },
  storm: {
    area: 4500,
    make: (w, h, first) => ({ x: rnd(0, w + 200), y: first ? rnd(0, h) : -30, l: rnd(16, 32), v: rnd(1000, 1500) }),
    update(p, w, h, dt) {
      p.y += (p.v ?? 0) * dt;
      p.x -= (p.v ?? 0) * dt * 0.25;
      if (p.y > h + 30 || p.x < -40) Object.assign(p, this.make(w, h, false));
    },
    draw(ctx, p) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + (p.l ?? 0) * 0.25, p.y - (p.l ?? 0));
      ctx.strokeStyle = "rgba(190,205,230,.5)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    },
    pre(ctx, w, h, _t, dt, state) {
      if (Math.random() < 0.004 * dt * 60) state.flash = 0.3;
      if (state.flash > 0) {
        ctx.fillStyle = `rgba(220,230,255,${state.flash})`;
        ctx.fillRect(0, 0, w, h);
        state.flash -= dt * 1.1;
      }
    },
  },
  warp: {
    area: 3500,
    make(w, h, first) {
      return {
        x: 0,
        y: 0,
        a: rnd(0, TAU),
        d: first ? rnd(0, Math.hypot(w, h) / 2) : rnd(0, 30),
        v: rnd(120, 260),
      };
    },
    update(p, w, h, dt) {
      p.d = (p.d ?? 0) + (p.v ?? 0) * dt;
      p.v = (p.v ?? 0) * (1 + dt * 1.2);
      if ((p.d ?? 0) > Math.hypot(w, h) / 2 + 40) Object.assign(p, this.make(w, h, false));
    },
    draw(ctx, p, _t, w, h) {
      const cx = w / 2;
      const cy = h / 2;
      const length = (p.v ?? 0) * 0.05;
      const alpha = Math.min(1, (p.d ?? 0) / 200);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(p.a ?? 0) * (p.d ?? 0), cy + Math.sin(p.a ?? 0) * (p.d ?? 0));
      ctx.lineTo(cx + Math.cos(p.a ?? 0) * ((p.d ?? 0) - length), cy + Math.sin(p.a ?? 0) * ((p.d ?? 0) - length));
      ctx.strokeStyle = `rgba(210,225,255,${alpha})`;
      ctx.lineWidth = 1 + alpha;
      ctx.lineCap = "round";
      ctx.stroke();
    },
  },
  embers: {
    area: 12000,
    make: (w, h, first) => ({
      x: rnd(0, w),
      y: first ? rnd(0, h) : h + rnd(0, 40),
      r: rnd(0.6, 2.2),
      v: rnd(20, 70),
      ph: rnd(0, 6.28),
      life: rnd(0.35, 1),
    }),
    update(p, w, h, dt, t) {
      p.y -= (p.v ?? 0) * dt;
      p.x += Math.sin(t * 0.7 + (p.ph ?? 0)) * 14 * dt;
      p.life = (p.life ?? 0) - dt * 0.32;
      if (p.y < -20 || (p.life ?? 0) <= 0) Object.assign(p, this.make(w, h, false));
    },
    draw(ctx, p, t) {
      const life = Math.max(0, Math.min(1, p.life ?? 1));
      const flicker = 0.55 + 0.45 * Math.sin(t * 3 + (p.ph ?? 0));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r ?? 1, 0, TAU);
      ctx.fillStyle = `rgba(255,${Math.round(150 + 60 * life)},${Math.round(70 + 50 * life)},${0.18 + 0.65 * life * flicker})`;
      ctx.fill();
    },
  },
  bubbles: {
    area: 16000,
    make: (w, h, first) => ({
      x: rnd(0, w),
      y: first ? rnd(0, h) : h + 20,
      r: rnd(4, 16),
      v: rnd(18, 50),
      ph: rnd(0, 6.28),
    }),
    update(p, w, h, dt, t) {
      p.y -= (p.v ?? 0) * dt;
      p.x += Math.sin(t * 0.8 + (p.ph ?? 0)) * 18 * dt;
      if (p.y < -30) Object.assign(p, this.make(w, h, false));
    },
    draw(ctx, p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r ?? 6, 0, TAU);
      ctx.strokeStyle = "rgba(190,225,255,.45)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(190,225,255,.08)";
      ctx.fill();
    },
  },
  fireflies: {
    area: 14000,
    make: (w, h) => ({
      x: rnd(0, w),
      y: rnd(0, h),
      r: rnd(0.8, 2),
      ph: rnd(0, 6.28),
      s: rnd(0.4, 1.1),
    }),
    update(p, w, h, dt, t) {
      p.x = (((p.x ?? 0) + Math.sin(t * 0.5 + (p.ph ?? 0)) * 10 * dt) + w) % w;
      p.y = (((p.y ?? 0) + Math.cos(t * 0.42 + (p.ph ?? 0)) * 8 * dt) + h) % h;
    },
    draw(ctx, p, t) {
      const pulse = 0.5 + 0.5 * Math.sin(t * (p.s ?? 1) * 1.6 + (p.ph ?? 0));
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.r ?? 1) * (0.8 + pulse * 0.6), 0, TAU);
      ctx.fillStyle = `rgba(255,236,150,${0.12 + 0.7 * pulse})`;
      ctx.fill();
    },
  },
  petals: {
    area: 12000,
    make: (w, h, first) => ({
      x: rnd(0, w),
      y: first ? rnd(0, h) : -20,
      r: rnd(3, 7),
      v: rnd(28, 60),
      ph: rnd(0, 6.28),
      vr: rnd(-1.2, 1.2),
      a: rnd(0, 6.28),
    }),
    update(p, w, h, dt, t) {
      p.y += (p.v ?? 0) * dt;
      p.x += (Math.sin(t * 0.9 + (p.ph ?? 0)) * 26 + 12) * dt;
      p.a = (p.a ?? 0) + (p.vr ?? 0) * dt;
      if (p.y > h + 20 || p.x > w + 30) Object.assign(p, this.make(w, h, false));
    },
    draw(ctx, p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a ?? 0);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r ?? 4, (p.r ?? 4) * 0.55, 0, 0, TAU);
      ctx.fillStyle = "rgba(255,183,205,.55)";
      ctx.fill();
      ctx.restore();
    },
  },
  shootingStars: {
    count: 4,
    make: (_w, _h, first, index = 0) => ({
      on: false,
      wait: first ? index * 0.55 + rnd(0, 0.45) : rnd(0.8, 2.8),
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
    }),
    update(p, w, h, dt) {
      if (!p.on) {
        p.wait = (p.wait ?? 0) - dt;
        if ((p.wait ?? 0) < 0) {
          p.on = true;
          p.life = 0;
          p.x = rnd(w * 0.2, w);
          p.y = rnd(0, h * 0.4);
          p.vx = -rnd(500, 800);
          p.vy = rnd(250, 400);
        }
        return;
      }
      p.life = (p.life ?? 0) + dt;
      p.x += (p.vx ?? 0) * dt;
      p.y += (p.vy ?? 0) * dt;
      if ((p.life ?? 0) > 0.7) {
        p.on = false;
        p.wait = rnd(1.2, 3.8);
      }
    },
    draw(ctx, p) {
      if (!p.on) return;
      const alpha = 1 - (p.life ?? 0) / 0.7;
      const gradient = ctx.createLinearGradient(p.x, p.y, p.x - (p.vx ?? 0) * 0.12, p.y - (p.vy ?? 0) * 0.12);
      gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - (p.vx ?? 0) * 0.12, p.y - (p.vy ?? 0) * 0.12);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.25;
      ctx.lineCap = "round";
      ctx.stroke();
    },
  },
};

const sceneAllocations = new Set<() => void>();
export type AmbientApi = { destroy: () => void };

/** Mount one scene into `host`; the host must be a positioned element. */
export function mountAmbientScene(
  host: HTMLElement,
  name: AmbientScene,
  { compact = false }: { compact?: boolean } = {},
): AmbientApi {
  const scene = SCENES[name];
  const canvas = document.createElement("canvas");
  canvas.className = "profile-fx-scene-canvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block";
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { destroy: () => canvas.remove() };

  let width = 0;
  let height = 0;
  let parts: Particle[] = [];
  let raf = 0;
  let last = performance.now();
  let stopped = false;
  let inView = true;
  const lowPower = Boolean((navigator as Navigator & {connection?:{saveData?:boolean}}).connection?.saveData);
  const sceneState = { flash: 0 };

  const fill = () => {
    if (!width || !height) return;
    const count = scene.count !== undefined
      ? scene.count
      : Math.max(4, Math.min(520, Math.round((width * height) / ((scene.area ?? 9000) * (compact ? 0.22 : 1)))));
    parts = Array.from({ length: Math.min(count,compact?64:lowPower?90:280,Math.max(12,Math.floor(560/Math.max(1,sceneAllocations.size)))) }, (_, index) => scene.make(width, height, true, index));
  };

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, compact || lowPower ? 1 : 2);
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    fill();
  };

  const paint = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;
    ctx.clearRect(0, 0, width, height);
    scene.pre?.(ctx, width, height, t, dt, sceneState);
    for (const particle of parts) {
      scene.update(particle, width, height, dt, t);
      scene.draw(ctx, particle, t, width, height);
    }
  };

  const loop = (now: number) => {
    // The owner chose this effect, so a visitor's OS "reduce motion" setting
    // does not freeze it — same rule as the player and the mute rail.
    if (stopped || document.hidden || !inView) {raf=0;return;}
    paint(now);
    raf = requestAnimationFrame(loop);
  };

  sceneAllocations.add(fill);sceneAllocations.forEach(allocate=>allocate());
  resize();
  const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  observer?.observe(host);
  window.addEventListener("resize", resize);
  const resume=()=>{cancelAnimationFrame(raf);raf=0;if(stopped)return;if(!document.hidden&&inView){last=performance.now();raf=requestAnimationFrame(loop);}};
  const intersection=new IntersectionObserver(entries=>{inView=entries.some(entry=>entry.isIntersecting);resume();});intersection.observe(host);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');motion.addEventListener('change',resume);
  document.addEventListener('visibilitychange',resume);resume();

  return {
    destroy() {
      stopped = true;
      sceneAllocations.delete(fill);sceneAllocations.forEach(allocate=>allocate());
      cancelAnimationFrame(raf);
      observer?.disconnect();
      intersection.disconnect();document.removeEventListener("visibilitychange",resume);
      window.removeEventListener("resize", resize);
      canvas.remove();
    },
  };
}
