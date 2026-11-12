/**
 * oneko.js — the little pixel cat that chases your cursor.
 *
 * Ported from https://github.com/adryd325/oneko.js (MIT), which is itself a
 * port of the original Oneko by Neko. The sprite sheet is public/oneko.gif
 * (16 frames of 32×32, so the sheet is 256×128).
 *
 * Kept as a plain function instead of a copy-pasted script tag so React can
 * start and stop it with the page (and so the settings toggle can turn it off
 * without a reload). Behaviour, timing and animations are the upstream ones.
 */

export type OnekoOptions = {
  /** Sprite sheet URL. Defaults to the bundled copy. */
  spriteUrl?: string;
  /** Pixels per tick (upstream default is 10, one tick every 100ms). */
  speed?: number;
  /** Where the cat starts, in viewport pixels. */
  startX?: number;
  startY?: number;
  /**
   * Upstream bails out entirely when the OS asks for less motion. The rest of
   * this site (tilt, marquee, sparkles, the entry screen) animates regardless,
   * so hiding the one thing the setting is toggled on for would just look
   * broken. Callers that want the strict behaviour can pass `true`.
   */
  respectReducedMotion?: boolean;
};

type SpriteFrame = [number, number];

const SPRITES: Record<string, SpriteFrame[]> = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [
    [-5, 0],
    [-6, 0],
    [-7, 0],
  ],
  scratchWallN: [
    [0, 0],
    [0, -1],
  ],
  scratchWallS: [
    [-7, -1],
    [-6, -2],
  ],
  scratchWallE: [
    [-2, -2],
    [-2, -3],
  ],
  scratchWallW: [
    [-4, 0],
    [-4, -1],
  ],
  tired: [[-3, -2]],
  sleeping: [
    [-2, 0],
    [-2, -1],
  ],
  N: [
    [-1, -2],
    [-1, -3],
  ],
  NE: [
    [0, -2],
    [0, -3],
  ],
  E: [
    [-3, 0],
    [-3, -1],
  ],
  SE: [
    [-5, -1],
    [-5, -2],
  ],
  S: [
    [-6, -3],
    [-7, -2],
  ],
  SW: [
    [-5, -3],
    [-6, -1],
  ],
  W: [
    [-4, -2],
    [-4, -3],
  ],
  NW: [
    [-1, 0],
    [-1, -1],
  ],
};

const SIZE = 32;
const TICK_MS = 100;

/** Starts the cat. Returns a cleanup function that removes it. */
export function startOneko(options: OnekoOptions = {}): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  const { spriteUrl = "/oneko.gif", speed = 10, respectReducedMotion = true } = options;

  if (respectReducedMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => {};
  }

  const el = document.createElement("div");
  el.className = "oneko";
  el.setAttribute("aria-hidden", "true");

  let posX = options.startX ?? Math.min(64, window.innerWidth - SIZE);
  let posY = options.startY ?? Math.min(96, window.innerHeight - SIZE);
  let mouseX = posX;
  let mouseY = posY;

  let frameCount = 0;
  let idleTime = 0;
  let idleAnimation: string | null = null;
  let idleAnimationFrame = 0;

  let lastTick = 0;
  let raf = 0;
  let stopped = false;

  el.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${SIZE}px`,
    `height:${SIZE}px`,
    "pointer-events:none",
    "image-rendering:pixelated",
    "background-repeat:no-repeat",
    `background-image:url("${spriteUrl}")`,
    "z-index:2147483646",
    "will-change:transform",
    "transform:translate3d(0,0,0)",
  ].join(";");

  const place = () => {
    el.style.transform = `translate3d(${Math.round(posX - SIZE / 2)}px, ${Math.round(
      posY - SIZE / 2,
    )}px, 0)`;
  };

  const setSprite = (name: string, frame: number) => {
    const set = SPRITES[name] ?? SPRITES.idle;
    const sprite = set[frame % set.length];
    el.style.backgroundPosition = `${sprite[0] * SIZE}px ${sprite[1] * SIZE}px`;
  };

  const resetIdle = () => {
    idleAnimation = null;
    idleAnimationFrame = 0;
  };

  const idle = () => {
    idleTime += 1;

    if (idleTime > 10 && Math.floor(Math.random() * 200) === 0 && idleAnimation === null) {
      const available = ["sleeping", "scratchSelf"];
      if (posX < SIZE) available.push("scratchWallW");
      if (posY < SIZE) available.push("scratchWallN");
      if (posX > window.innerWidth - SIZE) available.push("scratchWallE");
      if (posY > window.innerHeight - SIZE) available.push("scratchWallS");
      idleAnimation = available[Math.floor(Math.random() * available.length)];
    }

    switch (idleAnimation) {
      case "sleeping":
        if (idleAnimationFrame < 8) {
          setSprite("tired", 0);
          break;
        }
        setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
        if (idleAnimationFrame > 192) resetIdle();
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        setSprite(idleAnimation, idleAnimationFrame);
        if (idleAnimationFrame > 9) resetIdle();
        break;
      default:
        setSprite("idle", 0);
        return;
    }
    idleAnimationFrame += 1;
  };

  const frame = () => {
    frameCount += 1;
    const diffX = posX - mouseX;
    const diffY = posY - mouseY;
    const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

    if (distance < speed || distance < 48) {
      idle();
      return;
    }

    idleAnimation = null;
    idleAnimationFrame = 0;

    if (idleTime > 1) {
      setSprite("alert", 0);
      // Pause for a beat after waking up before giving chase.
      idleTime = Math.min(idleTime, 7);
      idleTime -= 1;
      return;
    }

    let direction = diffY / distance > 0.5 ? "N" : "";
    direction += diffY / distance < -0.5 ? "S" : "";
    direction += diffX / distance > 0.5 ? "W" : "";
    direction += diffX / distance < -0.5 ? "E" : "";
    setSprite(direction, frameCount);

    posX -= (diffX / distance) * speed;
    posY -= (diffY / distance) * speed;

    posX = Math.min(Math.max(SIZE / 2, posX), window.innerWidth - SIZE / 2);
    posY = Math.min(Math.max(SIZE / 2, posY), window.innerHeight - SIZE / 2);

    place();
  };

  const loop = (timestamp: number) => {
    if (stopped) return;
    if (!lastTick) lastTick = timestamp;
    if (timestamp - lastTick > TICK_MS) {
      lastTick = timestamp;
      frame();
    }
    raf = window.requestAnimationFrame(loop);
  };

  const onMove = (event: MouseEvent) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  };

  place();
  setSprite("idle", 0);
  document.body.appendChild(el);
  document.addEventListener("mousemove", onMove, { passive: true });
  raf = window.requestAnimationFrame(loop);

  return () => {
    stopped = true;
    window.cancelAnimationFrame(raf);
    document.removeEventListener("mousemove", onMove);
    el.remove();
  };
}
