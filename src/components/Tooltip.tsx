import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { TooltipStyle } from "../lib/links";

/** How long the pointer has to rest on the element before the bubble opens. */
const OPEN_DELAY = 220;
/** Matches the fade-out in about.css, so the bubble is not cut off. */
const CLOSE_MS = 180;

/**
 * A hover tooltip. It sits centred directly above the element it belongs to
 * (with a small gap), and flips below the element when there is no room above,
 * so it never covers what you are about to click or runs off the top of the
 * screen. It is rendered through a portal with position:fixed, so page
 * transforms (tilt cards, parallax, zoom effects) can never displace or clip
 * it.
 *
 * While visible it also watches the document: the moment the pointer moves
 * off the wrapped element — or the page scrolls, the window resizes, or the
 * pointer is pressed — the tooltip hides. That guarantees tooltips can never
 * get "stuck" on screen when React swaps the hovered node out from under the
 * cursor (polling widgets, virtualised lists, HMR) and pointerleave never
 * fires.
 *
 * It opens after a short rest so sweeping the pointer across a row of icons
 * does not flash a dozen bubbles, and it closes with a fade instead of
 * vanishing: `mounted` keeps it in the DOM for the length of that fade while
 * `open` drives the class the CSS transitions on.
 */
export function Tooltip({
  text,
  style = "default",
  children,
}: {
  text: string;
  style?: TooltipStyle;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number; below: boolean } | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const frame = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const hide = useCallback(() => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    setOpen(false);
    closeTimer.current = setTimeout(() => setMounted(false), CLOSE_MS);
  }, []);

  // Measure after the bubble is in the DOM but before the browser paints, so
  // it is placed correctly on its very first frame (no jump from 0,0).
  useLayoutEffect(() => {
    if (!mounted) {
      setCoords(null);
      return;
    }
    const wrap = wrapRef.current;
    const tip = tipRef.current;
    if (!wrap || !tip) return;

    const anchor = wrap.getBoundingClientRect();
    const bubble = tip.getBoundingClientRect();
    const gap = 10;
    const below = anchor.top - gap - bubble.height < 6;

    // Centred on the element, nudged back inside the viewport at the edges.
    const half = bubble.width / 2;
    const margin = 8;
    const center = anchor.left + anchor.width / 2;
    const left = Math.min(
      Math.max(center, half + margin),
      Math.max(half + margin, window.innerWidth - half - margin),
    );
    const top = below ? anchor.bottom + gap : anchor.top - gap;

    setCoords({ left, top, below });
  }, [mounted, text]);

  useEffect(() => {
    if (!mounted) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onDocMove = (event: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      // A generous box around the element: the bubble lives above it, so
      // moving towards the text must not dismiss it mid-hover.
      const inside =
        event.clientX >= r.left - 6 &&
        event.clientX <= r.right + 6 &&
        event.clientY >= r.top - 40 &&
        event.clientY <= r.bottom + 6;
      if (!inside) hide();
    };

    document.addEventListener("pointermove", onDocMove, { passive: true });
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    window.addEventListener("pointerdown", hide, true);
    window.addEventListener("blur", hide);
    return () => {
      document.removeEventListener("pointermove", onDocMove);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("pointerdown", hide, true);
      window.removeEventListener("blur", hide);
    };
  }, [mounted, hide]);

  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
      if (frame.current !== undefined) clearTimeout(frame.current);
    },
    [],
  );

  if (!text) return <>{children}</>;

  const enter = () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => {
      setMounted(true);
      // One paint closed, then open — otherwise the bubble mounts already
      // finished and the transition never runs. A timer rather than a frame,
      // so it still opens when the tab is not painting (hidden, or a machine
      // with animations paused).
      frame.current = window.setTimeout(() => setOpen(true), 16);
    }, OPEN_DELAY);
  };

  return (
    <span ref={wrapRef} className="tt-wrap" onPointerEnter={enter} onPointerLeave={hide}>
      {children}
      {mounted
        ? createPortal(
            <span
              ref={tipRef}
              className={`tt tt--fixed tt--${style}${open ? " is-in" : ""}`}
              role="tooltip"
              style={{
                left: coords?.left ?? 0,
                top: coords?.top ?? 0,
                transform: coords?.below ? "translate(-50%, 0)" : "translate(-50%, -100%)",
                visibility: coords ? "visible" : "hidden",
              }}
            >
              <span className="tt-in">{text}</span>
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
