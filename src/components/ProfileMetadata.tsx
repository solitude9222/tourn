import { useEffect } from "react";
import type { Account } from "../lib/auth";
import type { About } from "../lib/about";

/**
 * Applies the owner's metadata while their public page is mounted: the main tab
 * title, and a favicon that defaults to their profile picture. Everything is
 * restored when the page unmounts so the site's own tab title and icon come
 * back.
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

    // One title, always: the owner's main title (or their name + tourn.lol).
    // The old cycling/typewriter messages are no longer a second title source.
    document.title = baseTitle;

    return () => {
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
  }, [baseTitle, favicon]);

  return null;
}
