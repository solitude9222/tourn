import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";

/**
 * Pointer-driven 3D tilt for the profile card.
 *
 * `max` is the maximum rotation in degrees; 0 disables the effect entirely so
 * the card stays flat and no pointer listeners do work. Pointer moves are
 * coalesced into one update per animation frame — setting React state on every
 * raw move forced a render per mouse event and was the main frame cost while
 * moving over a card.
 */
export function useTilt(max = 8, invert = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});
  const frame = useRef(0);
  const next = useRef<{ x: number; y: number } | null>(null);
  const enabled = max > 0;
  const direction = invert ? -1 : 1;

  useEffect(() => {
    return () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  const paint = () => {
    frame.current = 0;
    const point = next.current;
    if (!point) return;
    const x = Math.min(1, Math.max(0, point.x));
    const y = Math.min(1, Math.max(0, point.y));
    setStyle({
      transform: `perspective(1100px) rotateX(${((0.5 - y) * max * 2 * direction).toFixed(2)}deg) rotateY(${((x - 0.5) * max * 2 * direction).toFixed(2)}deg)`,
      "--mx": `${x * 100}%`,
      "--my": `${y * 100}%`,
    } as CSSProperties);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    next.current = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
    if (!frame.current) frame.current = window.requestAnimationFrame(paint);
  };

  const onPointerLeave = () => {
    if (!enabled) return;
    next.current = null;
    if (frame.current) {
      window.cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    setStyle({ transform: "", "--mx": "50%", "--my": "50%" } as CSSProperties);
  };

  return { ref, style: enabled ? style : ({} as CSSProperties), onPointerMove, onPointerLeave };
}
