import { useLayoutEffect } from "react";

/**
 * Reveals `[data-reveal]` elements as they scroll into view.
 *
 * Everything already on screen at mount is revealed inside the same frame, before
 * the browser paints. It used to be a `setTimeout` + CSS transition, which meant
 * the page painted its hidden state (opacity 0, blurred, pushed down) and then
 * animated in — that double paint is the "flash" you see on a cold load. Only
 * elements below the fold animate now, so the first screen is painted once.
 */
export function useReveal(deps: unknown[] = []) {
  useLayoutEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (nodes.length === 0) return;

    if (!("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -7% 0px", threshold: 0.06 },
    );

    const aboveTheFold: HTMLElement[] = [];

    nodes.forEach((node) => {
      const delay = Number(node.dataset.revealDelay ?? 0) || 0;
      node.style.setProperty("--reveal-delay", `${delay}ms`);

      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 1.08) aboveTheFold.push(node);
      else observer.observe(node);
    });

    aboveTheFold.forEach((node) => node.classList.add("is-revealed"));

    return () => observer.disconnect();
  }, deps);
}
