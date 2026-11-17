import { useEffect, useRef, type CSSProperties } from "react";

type Dot = { x: number; y: number; r: number };

/**
 * Renders text as a grid of glowing dots, based on the profile's new
 * "Scattered" treatment. The canvas is transparent and transparent padding is
 * trimmed, so it drops straight into the name line without a background.
 */
export function DotMatrixText({
  text,
  fontSize = 44,
  cell = 2,
  glow = 6,
  color = "#ffffff",
  shimmer = true,
  className = "",
}: {
  text: string;
  fontSize?: number;
  cell?: number;
  glow?: number;
  color?: string;
  shimmer?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const label = text.trim() || " ";
    const size = Math.max(12, fontSize);
    const step = Math.max(2, Math.round(cell));
    const font = `800 ${size}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dots: Dot[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let disposed = false;

    const build = () => {
      if (disposed) return;
      const scratch = document.createElement("canvas");
      const scratchContext = scratch.getContext("2d", { willReadFrequently: true });
      if (!scratchContext) return;

      scratchContext.font = font;
      const padding = step * 3;
      width = Math.ceil(scratchContext.measureText(label).width) + padding * 2;
      height = Math.ceil(size * 1.4) + padding * 2;
      scratch.width = width;
      scratch.height = height;
      scratchContext.font = font;
      scratchContext.fillStyle = "#fff";
      scratchContext.textBaseline = "alphabetic";
      scratchContext.fillText(label, padding, padding + size);

      const pixels = scratchContext.getImageData(0, 0, width, height).data;
      dots = [];
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          let coverage = 0;
          let samples = 0;
          for (let yy = y; yy < Math.min(y + step, height); yy++) {
            for (let xx = x; xx < Math.min(x + step, width); xx++) {
              coverage += pixels[(yy * width + xx) * 4 + 3];
              samples++;
            }
          }
          const amount = coverage / (samples * 255);
          if (amount > 0.12) {
            dots.push({
              x: x + step / 2,
              y: y + step / 2,
              r: step * 0.5 * Math.min(1, Math.sqrt(amount) + 0.1),
            });
          }
        }
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      // Width is explicit, height follows the canvas ratio (`height: auto` in
      // CSS), so a long name shrinks without being squashed.
      canvas.style.width = `${width}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      if (disposed || !width || !height) return;
      const seconds = now / 1000;
      context.clearRect(0, 0, width, height);
      context.fillStyle = color;
      for (const dot of dots) {
        context.globalAlpha = shimmer && !reducedMotion
          ? 0.82 + 0.18 * Math.sin(dot.x * 0.03 + dot.y * 0.02 - seconds * 1.6)
          : 1;
        context.beginPath();
        context.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    };

    const loop = (now: number) => {
      draw(now);
      frame = window.requestAnimationFrame(loop);
    };

    build();
    if (shimmer && !reducedMotion) frame = window.requestAnimationFrame(loop);
    else draw(performance.now());

    void document.fonts.ready.then(() => {
      if (disposed) return;
      build();
      if (!shimmer || reducedMotion) draw(performance.now());
    });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
    };
  }, [text, fontSize, cell, color, shimmer]);

  return (
    <canvas
      ref={canvasRef}
      className={`dot-matrix-text${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={text}
      style={{ "--dot-glow-color": color, "--dot-glow": `${Math.max(0, glow)}px` } as CSSProperties}
    />
  );
}
