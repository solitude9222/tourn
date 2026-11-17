import { useEffect } from "react";
import type { Account } from "../lib/auth";
import type { About } from "../lib/about";

type ManagedMeta = { selector: string; create: () => HTMLMetaElement | HTMLLinkElement; attrs: Record<string, string> };

function absoluteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${window.location.origin}${trimmed}`;
  return trimmed;
}

function iconType(href: string): string | null {
  if (href.startsWith("data:image/svg")) return "image/svg+xml";
  if (href.startsWith("data:image/png")) return "image/png";
  if (href.startsWith("data:image/x-icon")) return "image/x-icon";
  if (/\.svg(?:$|\?)/i.test(href)) return "image/svg+xml";
  if (/\.png(?:$|\?)/i.test(href)) return "image/png";
  if (/\.ico(?:$|\?)/i.test(href)) return "image/x-icon";
  return null;
}

/**
 * Applies the owner's page identity while their public page is mounted: the
 * tab title and favicon they picked, the canonical URL, and the metadata that
 * Discord, Slack, X and search engines read when the link is shared. Every tag
 * is restored when the page unmounts so the site's own metadata comes back.
 */
export function ProfileMetadata({
  about,
  user,
}: {
  about: About;
  user: Pick<Account, "username" | "alias" | "avatarUrl">;
}) {
  const meta = about.metadata;
  const handle = user.alias?.trim() || user.username;
  const pageUrl = `${window.location.origin}/${handle}`;
  const baseTitle =
    meta.title.trim() ||
    `${about.displayName.trim() || user.alias?.trim() || user.username} · tourn.lol`;
  const embedTitle = meta.shareTitle.trim() || about.displayName.trim() || user.alias?.trim() || user.username;
  const embedDescription =
    meta.shareDescription.trim() ||
    about.bio.trim() ||
    `Check out ${about.displayName.trim() || user.alias?.trim() || user.username} on tourn.lol.`;
  const shareImage = absoluteUrl(meta.shareImageUrl.trim() || about.assets.avatarUrl.trim() || user.avatarUrl || "/logo.png");
  const favicon = meta.faviconUrl.trim() || about.assets.avatarUrl.trim() || user.avatarUrl || "/logo.png";

  useEffect(() => {
    const previousTitle = document.title;
    const records: { node: Element; attr: string; previous: string | null }[] = [];
    const added = new Set<Element>();

    const apply = (selector: string, create: () => HTMLMetaElement | HTMLLinkElement, attrs: Record<string, string>) => {
      let node = document.head.querySelector(selector);
      if (!node) {
        node = create();
        node.setAttribute("data-profile-meta", "true");
        document.head.appendChild(node);
        added.add(node);
      }
      for (const [attr, value] of Object.entries(attrs)) {
        records.push({ node, attr, previous: node.getAttribute(attr) });
        node.setAttribute(attr, value);
      }
    };

    const icon = document.head.querySelector<HTMLLinkElement>("link[rel~='icon']");
    const iconNode = icon ?? document.createElement("link");
    if (!icon) {
      iconNode.rel = "icon";
      iconNode.setAttribute("data-profile-meta", "true");
      document.head.appendChild(iconNode);
      added.add(iconNode);
    }
    records.push(
      { node: iconNode, attr: "href", previous: icon?.getAttribute("href") ?? null },
      { node: iconNode, attr: "type", previous: icon?.getAttribute("type") ?? null },
    );
    iconNode.setAttribute("href", favicon);
    const type = iconType(favicon);
    if (type) iconNode.setAttribute("type", type);
    else iconNode.removeAttribute("type");

    const metaTag = (name: string) => () => {
      const node = document.createElement("meta");
      node.setAttribute("name", name);
      return node;
    };
    const propertyTag = (property: string) => () => {
      const node = document.createElement("meta");
      node.setAttribute("property", property);
      return node;
    };

    const tags: ManagedMeta[] = [
      { selector: "meta[name='description']", create: metaTag("description"), attrs: { content: embedDescription.slice(0, 300) } },
      { selector: "meta[property='og:type']", create: propertyTag("og:type"), attrs: { content: "profile" } },
      { selector: "meta[property='og:site_name']", create: propertyTag("og:site_name"), attrs: { content: "tourn.lol" } },
      { selector: "meta[property='og:title']", create: propertyTag("og:title"), attrs: { content: embedTitle.slice(0, 100) } },
      { selector: "meta[property='og:description']", create: propertyTag("og:description"), attrs: { content: embedDescription.slice(0, 300) } },
      { selector: "meta[property='og:url']", create: propertyTag("og:url"), attrs: { content: pageUrl } },
      { selector: "meta[property='og:image']", create: propertyTag("og:image"), attrs: { content: shareImage } },
      { selector: "meta[name='twitter:card']", create: metaTag("twitter:card"), attrs: { content: shareImage ? "summary_large_image" : "summary" } },
      { selector: "meta[name='twitter:title']", create: metaTag("twitter:title"), attrs: { content: embedTitle.slice(0, 100) } },
      { selector: "meta[name='twitter:description']", create: metaTag("twitter:description"), attrs: { content: embedDescription.slice(0, 300) } },
      { selector: "meta[name='twitter:image']", create: metaTag("twitter:image"), attrs: { content: shareImage } },
      { selector: "meta[name='theme-color']", create: metaTag("theme-color"), attrs: { content: meta.themeColor } },
      { selector: "link[rel='canonical']", create: () => { const node = document.createElement("link"); node.rel = "canonical"; return node; }, attrs: { href: pageUrl } },
      { selector: "link[rel='image_src']", create: () => { const node = document.createElement("link"); node.rel = "image_src"; return node; }, attrs: { href: shareImage } },
    ];
    if (meta.noIndex) {
      tags.push({ selector: "meta[name='robots']", create: metaTag("robots"), attrs: { content: "noindex, nofollow" } });
    } else {
      const robots = document.head.querySelector("meta[name='robots'][data-profile-meta='true']") ?? document.head.querySelector("meta[name='robots']");
      if (robots?.getAttribute("content") === "noindex, nofollow") robots.remove();
    }
    for (const tag of tags) apply(tag.selector, tag.create, tag.attrs);

    const messages = [baseTitle, ...meta.messages.filter((message) => message.trim() && message.trim() !== baseTitle)];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0;
    let index = 0;
    let count = 0;
    let deleting = false;
    let offset = 0;
    const tick = () => {
      if (reduced.matches || meta.animation === "none") {
        document.title = baseTitle;
        return;
      }
      const title = messages[index % messages.length];
      const glyphs = Array.from(title);
      if (meta.animation === "cycle") {
        document.title = title;
        index += 1;
        timer = window.setTimeout(tick, meta.interval * 1000);
      } else if (meta.animation === "marquee") {
        const line = Array.from(`${title}   ·   `);
        document.title = [...line.slice(offset), ...line.slice(0, offset)].join("");
        offset = (offset + 1) % line.length;
        timer = window.setTimeout(tick, 180);
      } else {
        count += deleting ? -1 : 1;
        document.title = glyphs.slice(0, Math.max(0, count)).join("") || "·";
        let delay = deleting ? 65 : 100;
        if (count >= glyphs.length) {
          deleting = true;
          delay = meta.interval * 1000;
        }
        if (count <= 0) {
          deleting = false;
          index += 1;
          delay = 350;
        }
        timer = window.setTimeout(tick, delay);
      }
    };
    const restart = () => {
      window.clearTimeout(timer);
      document.title = baseTitle;
      index = 0;
      count = 0;
      deleting = false;
      offset = 0;
      if (!reduced.matches && meta.animation !== "none") timer = window.setTimeout(tick, 150);
    };
    reduced.addEventListener("change", restart);
    restart();

    return () => {
      window.clearTimeout(timer);
      reduced.removeEventListener("change", restart);
      document.title = previousTitle;
      for (const record of records.reverse()) {
        if (added.has(record.node)) continue;
        if (record.previous === null) record.node.removeAttribute(record.attr);
        else record.node.setAttribute(record.attr, record.previous);
      }
      for (const node of added) node.remove();
    };
  }, [
    about.assets.avatarUrl,
    about.bio,
    about.displayName,
    baseTitle,
    embedDescription,
    embedTitle,
    favicon,
    meta.animation,
    meta.faviconUrl,
    meta.interval,
    meta.messages,
    meta.noIndex,
    meta.shareDescription,
    meta.shareImageUrl,
    meta.shareTitle,
    meta.themeColor,
    pageUrl,
    shareImage,
    user.alias,
    user.avatarUrl,
    user.username,
  ]);

  return null;
}
