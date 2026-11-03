import { useState, type CSSProperties } from "react";
import { linkHref, type LinkDesign, type LinkInstance } from "../lib/links";
import { getPlatform } from "../lib/linkPlatforms";
import { LinkIcon } from "./Icons";
import { Tooltip } from "./Tooltip";

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

  const copyValue = async (link: LinkInstance) => {
    try {
      await navigator.clipboard.writeText(link.url.trim());
      setCopiedId(link.id);
      window.setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 1600);
    } catch {
      /* clipboard can be blocked — the value is still visible on the card */
    }
  };

  const rowStyle = {
    "--lnk-radius": `${design.borderRadius}px`,
    "--lnk-gap": `${design.gap}px`,
    "--lnk-glow-color": design.glowColor,
    "--lnk-bg-opacity": `${Math.round((design.backgroundOpacity ?? 0.12) * 100)}%`,
    "--lnk-bg-blur": `${design.backgroundBlur ?? 0}px`,
  } as CSSProperties;

  return (
    <div
      className={`pv-link-row pv-link-row--${design.cardStyle}${design.showBackground ? "" : " pv-link-row--no-bg"}${design.showGlow ? " pv-link-row--glow" : ""}${className ? ` ${className}` : ""}`}
      style={rowStyle}
    >
      {visible.map((link) => {
        const platform = getPlatform(link.platform);
        const accent = link.color || platform?.color || "#8b939b";
        const glowing = design.showGlow || link.glowOn;
        const isIconMode = design.iconOnly === true || link.mode === "icon";
        const hasDesc = !isIconMode && link.description.trim().length > 0;
        const shape = design.iconStyle === "none" ? "default" : design.iconStyle;
        const iconSize = isIconMode ? 22 : 17;

        const btnStyle = {
          "--lnk-accent": accent,
          ...(link.glowColor ? { "--lnk-glow-color": link.glowColor } : null),
        } as CSSProperties;

        const iconNode = link.iconUrl ? (
          <img src={link.iconUrl} alt="" className="pv-link-icon-img" />
        ) : platform ? (
          <platform.Icon size={iconSize} />
        ) : (
          <LinkIcon size={iconSize} />
        );

        const btnClass = [
          "pv-link-btn",
          isIconMode ? `pv-link-btn--icon-only pv-link-shape--${shape}` : "",
          hasDesc ? "pv-link-btn--has-desc" : "",
          glowing ? "is-glow" : "",
        ]
          .filter(Boolean)
          .join(" ");

        // A pasted handle or wallet address has no URL to open — copy it
        // instead of sending visitors to a broken relative link.
        const href = linkHref(link.url);
        const inner = (
          <>
            {isIconMode ? (
              <span className="pv-link-icon">{iconNode}</span>
            ) : (
              <span className="pv-link-main">
                {design.showIcon && design.iconStyle !== "none" ? (
                  <span className={`pv-link-icon pv-link-icon--${design.iconStyle}`}>{iconNode}</span>
                ) : null}
                <span className="pv-link-label">
                  {copiedId === link.id ? "Copied" : link.label}
                </span>
              </span>
            )}
            {hasDesc ? (
              <small className={`pv-link-desc${link.fold === "hover" ? " pv-link-desc--hover" : ""}`}>
                {link.description}
              </small>
            ) : null}
          </>
        );

        return (
          <Tooltip
            key={link.id}
            text={
              design.tooltipEnabled
                ? href
                  ? link.tooltip || link.label
                  : link.tooltip || "Copy"
                : ""
            }
            style={design.tooltipStyle}
          >
            {href ? (
              <a
                className={btnClass}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                style={btnStyle}
              >
                {inner}
              </a>
            ) : (
              <button
                type="button"
                className={`${btnClass} pv-link-btn--copy`}
                style={btnStyle}
                aria-label={`Copy ${link.label}`}
                onClick={() => void copyValue(link)}
              >
                {inner}
              </button>
            )}
          </Tooltip>
        );
      })}
    </div>
  );
}
