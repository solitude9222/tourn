import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** A real viewport makes mobile media queries work even on a desktop editor. */
export function PreviewFrame({ children }: { children: ReactNode }) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  return <>
    <iframe title="Profile preview viewport" className="tw-preview-frame" srcDoc={'<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><div id="preview-root" style="height:100vh"></div></body></html>'} onLoad={event => {
      const frame = event.currentTarget.contentDocument;
      if (!frame) return;
      frame.head.querySelectorAll("[data-preview-style]").forEach(node => node.remove());
      document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => {
        const copy = node.cloneNode(true) as HTMLElement;
        copy.setAttribute("data-preview-style", ""); frame.head.append(copy);
      });
      setMount(frame.getElementById("preview-root"));
    }} />
    {mount ? createPortal(children, mount) : null}
  </>;
}
