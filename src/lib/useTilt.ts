import { useEffect, useRef, type CSSProperties, type PointerEvent } from "react";

/**
 * Pointer-driven 3D tilt for a card.
 *
 * `max` is the maximum rotation in degrees; 0 disables the effect entirely so
 * the card stays flat and no pointer listeners do work. Pointer moves are
 * coalesced into one CSS-variable write per animation frame. The transform
 * itself lives in CSS (`--tilt-x` / `--tilt-y`), so moving over the card never
 * re-renders the tree.
 *
 * When the pointer leaves, the card eases back to flat instead of snapping:
 * the reset writes `--tilt-ease`, which the CSS transform reads as its
 * transition duration, then clears it once the card has settled so the next
 * hover tracks the pointer without lag.
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>(max = 8, invert = false) {
  const ref = useRef<T>(null);
  const frame = useRef(0);
  const easeTimer = useRef(0);
  const next = useRef<{ clientX: number; clientY: number } | null>(null);
  const enabled = max > 0;
  const direction = invert ? -1 : 1;

  useEffect(() => {
    return () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
      if (easeTimer.current) window.clearTimeout(easeTimer.current);
    };
  }, []);

  const follow = (element: HTMLElement) => {
    // While the pointer is on the card the transform must track it directly,
    // so any in-flight settle transition is cancelled.
    if (easeTimer.current) {
      window.clearTimeout(easeTimer.current);
      easeTimer.current = 0;
    }
    element.style.setProperty("--tilt-ease", "0ms");
  };

  const reset = () => {
    const element = ref.current;
    if (!element) return;
    window.clearTimeout(easeTimer.current);
    element.style.setProperty("--tilt-ease", "320ms");
    element.style.setProperty("--tilt-x", "0deg");
    element.style.setProperty("--tilt-y", "0deg");
    element.style.setProperty("--mx", "50%");
    element.style.setProperty("--my", "50%");
    easeTimer.current = window.setTimeout(() => {
      element.style.setProperty("--tilt-ease", "0ms");
    }, 340);
  };

  const paint = () => {
    frame.current = 0;
    const element = ref.current;
    const point = next.current;
    if (!element || !point) return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.min(1, Math.max(0, (point.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (point.clientY - rect.top) / rect.height));
    element.style.setProperty(
      "--tilt-x",
      `${((0.5 - y) * max * 2 * direction).toFixed(2)}deg`,
    );
    element.style.setProperty(
      "--tilt-y",
      `${((x - 0.5) * max * 2 * direction).toFixed(2)}deg`,
    );
    element.style.setProperty("--mx", `${(x * 100).toFixed(2)}%`);
    element.style.setProperty("--my", `${(y * 100).toFixed(2)}%`);
  };

  const onPointerMove = (event: PointerEvent<T>) => {
    if (!enabled || event.pointerType === "touch") return;
    const element = ref.current;
    if (element) follow(element);
    next.current = { clientX: event.clientX, clientY: event.clientY };
    if (!frame.current) frame.current = window.requestAnimationFrame(paint);
  };

  const onPointerLeave = () => {
    if (!enabled) return;
    next.current = null;
    if (frame.current) {
      window.cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    reset();
  };

  return {
    ref,
    // Kept for callers that spread this into their existing style object.
    style: {} as CSSProperties,
    onPointerMove,
    onPointerLeave,
  };
}
