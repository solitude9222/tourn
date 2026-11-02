import { useEffect } from "react";
import type { Account } from "../lib/auth";
import type { About } from "../lib/about";

/**
 * Applies the owner's metadata while their public page is mounted: the tab
 * title (optionally cycling or typing), and a favicon that defaults to their
 * profile picture. Everything is restored when the page unmounts so the site's
 * own tab title and icon come back.
 */
export function ProfileMetadata({
  about,
  user,
}: {
  about: About;
  user: Pick<Account, "username" | "avatarUrl">;
}) {
  const meta = about.metadata;
  const baseTitle = meta.title.trim() || `${about.displayName.trim() || user.username} · tourn.lol`;
  const favicon =
    meta.faviconUrl.trim() || about.assets.avatarUrl.trim() || user.avatarUrl || "/logo.png";
  const messages = meta.messages.map((item) => item.trim()).filter(Boolean);
  const messageKey = messages.join("\u0000");

  useEffect(() => {
    const previousTitle = document.title;
    const existing = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    const link = existing ?? document.createElement("link");
    if (!existing) {
      link.rel = "icon";
      document.head.appendChild(link);
    }
    const previousHref = existing?.getAttribute("href") ?? null;
    const previousType = existing?.getAttribute("type") ?? null;
    link.setAttribute("href", favicon);
    if (favicon.startsWith("data:image/svg")) link.setAttribute("type", "image/svg+xml");
    else if (favicon.startsWith("data:image/png")) link.setAttribute("type", "image/png");
    else link.removeAttribute("type");

    let cancelled = false;
    let interval: number | undefined;
    let timeout: number | undefined;
    const setTitle = (value: string) => {
      if (!cancelled) document.title = value;
    };

    if (meta.animation !== "none" && messages.length) {
      if (meta.animation === "cycle") {
        let index = 0;
        setTitle(messages[0]);
        interval = window.setInterval(() => {
          index = (index + 1) % messages.length;
          setTitle(messages[index]);
        }, Math.max(2, meta.interval) * 1000);
      } else {
        // Typewriter: type a message out, hold it, then backspace the next one.
        let index = 0;
        let shown = 0;
        let deleting = false;
        const tick = () => {
          const message = messages[index % messages.length];
          shown += deleting ? -1 : 1;
          setTitle(message.slice(0, Math.max(0, shown)));
          let delay = deleting ? 30 : 65;
          if (!deleting && shown >= message.length) {
            deleting = true;
            delay = Math.max(2, meta.interval) * 1000;
          } else if (deleting && shown <= 0) {
            deleting = false;
            index += 1;
            delay = 220;
          }
          timeout = window.setTimeout(tick, delay);
        };
        tick();
      }
    } else {
      setTitle(baseTitle);
    }

    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
      if (timeout) window.clearTimeout(timeout);
      document.title = previousTitle;
      if (previousHref) {
        link.setAttribute("href", previousHref);
        if (previousType) link.setAttribute("type", previousType);
        else link.removeAttribute("type");
      } else if (!existing) {
        link.remove();
      } else {
        link.removeAttribute("href");
      }
    };
  }, [baseTitle, favicon, meta.animation, meta.interval, messageKey, messages.length]);

  return null;
}
