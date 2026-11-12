import { useLayoutEffect } from "react";

/**
 * Reveals `[data-reveal]` elements as they scroll into view.
 *
 * Everything already on screen at mount is revealed inside the same frame, before
 * the browser paints. It used to be a `setTimeout` + CSS transition, which meant
 * the page painted its hidden state (opacity 0, blurred, pushed down) and then
 * animated in — that double paint is the "flash" you see on a cold load. Only
 * elements below the fold animate now, so the first screen is painted once.
 *
 * The landing page lazy-loads its lower sections, so those nodes do not exist
 * when the first query runs. A MutationObserver registers them as they mount;
 * without it the home widget stack stayed at opacity 0 forever.
 */
export function useReveal(deps: unknown[] = []) {
  useLayoutEffect(() => {
    const revealNow = (node: HTMLElement) => {
      const delay = Number(node.dataset.revealDelay ?? 0) || 0;
      node.style.setProperty("--reveal-delay", `${delay}ms`);
      node.classList.add("is-revealed");
    };

    if (!("IntersectionObserver" in window)) {
      const revealAll = () =>
        document.querySelectorAll<HTMLElement>("[data-reveal]").forEach(revealNow);
      revealAll();
      const mutation = new MutationObserver(revealAll);
      mutation.observe(document.body, { childList: true, subtree: true });
      return () => mutation.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -7% 0px", threshold: 0.06 },
    );

    const seen = new WeakSet<Element>();

    const register = (node: HTMLElement) => {
      if (seen.has(node)) return;
      seen.add(node);

      const delay = Number(node.dataset.revealDelay ?? 0) || 0;
      node.style.setProperty("--reveal-delay", `${delay}ms`);

      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 1.08) {
        node.classList.add("is-revealed");
      } else {
        observer.observe(node);
      }
    };

    const scan = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches("[data-reveal]")) register(root);
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach(register);
    };

    scan(document);

    const mutation = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) scan(node);
        });
      });
    });
    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, deps);
}
