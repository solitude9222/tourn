import { useState, type CSSProperties } from "react";
import { linkHref, type LinkDesign, type LinkInstance } from "../lib/links";
import { getPlatform } from "../lib/linkPlatforms";
import { LinkIcon } from "./Icons";

/**
 * A profile's links: one row of icon buttons, nothing else. No cards, no
 * labels, no hover popups — the icon is the whole link. Colour, size and an
 * optional halo come from the owner's link style.
 */
export function ProfileLinks({
  links,
  design,
  className = "",
}: {
  links: LinkInstance[];
  design: LinkDesign;
  className?: string;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const visible = links.filter((l) => l.visible && l.url.trim());
  if (!visible.length) return null;

  const iconPx = Math.max(14, Math.round(design.iconSize * 0.5));

  const copyValue = async (link: LinkInstance) => {
    try {
      await navigator.clipboard.writeText(link.url.trim());
      setCopiedId(link.id);
      window.setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 1600);
    } catch {
      /* clipboard can be blocked — the value is still visible in the dashboard */
    }
  };

  const rowStyle = {
    "--lnk-size": `${design.iconSize}px`,
    "--lnk-glow": design.glowColor,
    "--lnk-glow-strength": design.glowIntensity / 100,
    "--lnk-colour": design.iconColor || undefined,
  } as CSSProperties;

  return (
    <div
      className={`pv-link-icons${design.glow ? " is-glow" : ""}${className ? ` ${className}` : ""}`}
      style={rowStyle}
    >
      {visible.map((link) => {
        const platform = getPlatform(link.platform);
        const href = linkHref(link.url);
        const label = link.label || platform?.name || "Link";
        const brand = link.iconUrl ? undefined : platform?.color;

        const icon = link.iconUrl ? (
          <img src={link.iconUrl} alt="" className="pv-link-img" />
        ) : platform ? (
          <platform.Icon size={iconPx} />
        ) : (
          <LinkIcon size={iconPx} />
        );

        const shared = {
          className: `pv-link-icon${copiedId === link.id ? " is-copied" : ""}`,
          style: { "--lnk-brand": brand } as CSSProperties,
          title: label,
          "aria-label": label,
        };

        return href ? (
          <a
            key={link.id}
            {...shared}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
          >
            {icon}
          </a>
        ) : (
          <button
            key={link.id}
            {...shared}
            type="button"
            onClick={() => void copyValue(link)}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
