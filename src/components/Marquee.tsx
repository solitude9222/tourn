import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * A single-line label that measures itself and pans (then resets) only when the
 * content is actually wider than its container. Cards use this for names,
 * handles and song titles so a long value never disappears behind an ellipsis.
 */
export function ScrollText({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const outerRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const measure = () => {
      const next = Math.max(0, Math.ceil(inner.scrollWidth - outer.clientWidth));
      setOverflow((previous) => (Math.abs(previous - next) > 1 ? next : previous));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);

    if (document.fonts?.ready) void document.fonts.ready.then(measure).catch(() => undefined);

    return () => observer.disconnect();
  }, [children]);

  const style =
    overflow > 0
      ? ({
          "--scroll-distance": `${overflow + 7}px`,
          "--scroll-duration": `${Math.max(6, Math.min(15, (overflow + 7) / 17 + 4.2))}s`,
        } as CSSProperties)
      : undefined;

  return (
    <span
      ref={outerRef}
      className={`scroll-text${overflow > 0 ? " is-scrolling" : ""}${className ? ` ${className}` : ""}`}
    >
      <span ref={innerRef} className="scroll-text-inner" style={style}>
        {children}
      </span>
    </span>
  );
}
