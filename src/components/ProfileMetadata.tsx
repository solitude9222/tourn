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
  user: Pick<Account, "username" | "alias" | "avatarUrl">;
}) {
  const meta = about.metadata;
  const baseTitle =
    meta.title.trim() ||
    `${about.displayName.trim() || user.alias?.trim() || user.username} · tourn.lol`;
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

    const messages = [baseTitle, ...meta.messages.filter(message=>message.trim() && message.trim()!==baseTitle)];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0, index = 0, count = 0, deleting = false, offset = 0;
    const tick = () => {
      if (reduced.matches || meta.animation === "none") { document.title=baseTitle; return; }
      const title=messages[index%messages.length], glyphs=Array.from(title);
      if (meta.animation === "cycle") { document.title=title; index++;timer=window.setTimeout(tick,meta.interval*1000); }
      else if(meta.animation === "marquee") { const line=Array.from(title+"   ·   ");document.title=[...line.slice(offset),...line.slice(0,offset)].join("");offset=(offset+1)%line.length;timer=window.setTimeout(tick,180); }
      else { count+=deleting?-1:1;document.title=glyphs.slice(0,Math.max(0,count)).join("")||"·";let delay=deleting?65:100;if(count>=glyphs.length){deleting=true;delay=meta.interval*1000;}if(count<=0){deleting=false;index++;delay=350;}timer=window.setTimeout(tick,delay); }
    };
    const restart=()=>{clearTimeout(timer);document.title=baseTitle;index=0;count=0;deleting=false;offset=0;if(!reduced.matches && meta.animation!=="none")timer=window.setTimeout(tick,150);};
    reduced.addEventListener("change",restart);restart();

    return () => {
      clearTimeout(timer); reduced.removeEventListener("change",restart);
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
  }, [baseTitle, favicon, meta.animation, meta.interval, meta.messages]);

  return null;
}
