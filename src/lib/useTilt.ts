import { useRef, useState, type CSSProperties, type PointerEvent } from "react";

/**
 * Pointer-driven 3D tilt for the profile card.
 *
 * `max` is the maximum rotation in degrees; 0 disables the effect entirely so
 * the card stays flat and no pointer listeners do work.
 */
export function useTilt(max = 8, invert = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});
  const enabled = max > 0;
  const direction = invert ? -1 : 1;

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    setStyle({
      transform: `perspective(1100px) rotateX(${((0.5 - y) * max * 2 * direction).toFixed(2)}deg) rotateY(${((x - 0.5) * max * 2 * direction).toFixed(2)}deg)`,
      "--mx": `${x * 100}%`,
      "--my": `${y * 100}%`,
    } as CSSProperties);
  };

  const onPointerLeave = () => {
    if (!enabled) return;
    setStyle({ transform: "", "--mx": "50%", "--my": "50%" } as CSSProperties);
  };

  return { ref, style: enabled ? style : ({} as CSSProperties), onPointerMove, onPointerLeave };
}
