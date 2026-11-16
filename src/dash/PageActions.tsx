import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Page-level buttons live in the shell header so every manage page can put its
 * primary actions in the same place as the reference dashboard.
 */
export function PageActions({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHost(document.getElementById("tw-page-actions"));
  }, []);

  return host ? createPortal(children, host) : null;
}
