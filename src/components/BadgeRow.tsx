import { useState, type CSSProperties } from "react";
import { hexToRgba } from "../lib/about";
import { badgeDef, type BadgeInstance, type BadgeStyle } from "../lib/badges";
import type { TooltipStyle } from "../lib/links";
import { Tooltip } from "./Tooltip";

export function BadgeChip({
  badge,
  style,
  size,
}: {
  badge: BadgeInstance;
  style: BadgeStyle;
  size?: number;
}) {
  const def = badgeDef(badge.id);
  // A failed image (art not uploaded yet) falls back to a monogram, so a badge
  // never renders as a broken-image icon on someone's card.
  const [artBroken, setArtBroken] = useState(false);
  if (!def || !badge.visible) return null;

  const px = size ?? style.size;
  const glowAlpha = Math.round((style.glowIntensity / 100) * 255).toString(16).padStart(2, "0");
  const glowRadius = 2 + (style.glowIntensity / 100) * 6;
  const art = !artBroken ? def.art : "";
  const tint = style.monochrome ? style.monoColor : def.color;

  const chipStyle: CSSProperties = {
    width: px,
    height: px,
    "--badge-glow-color": `${style.glowColor}${glowAlpha}`,
    "--badge-glow-radius": `${glowRadius}px`,
    "--badge-glow-opacity": style.glow ? style.glowIntensity / 100 : 0,
    "--badge-tint": tint,
    ...(style.animation === "shimmer" && art ? { "--badge-shimmer-mask": `url("${art}")` } : {}),
  } as CSSProperties;

  const maskStyle: CSSProperties = {
    WebkitMaskImage: `url("${art}")`,
    maskImage: `url("${art}")`,
    WebkitMaskSize: "cover",
    maskSize: "cover",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };

  // Monochrome replaces the multi-colour art with a flat tint, masked by the
  // art's own alpha — this is the only way to get a clean single-colour
  // badge regardless of how many colours the source art uses.
  const showMono = style.monochrome;
  const showOverlay = !showMono && style.overlay && style.overlayStrength > 0;

  return (
    <span
      className={`badge-chip${style.glow ? " has-glow" : ""}${style.glowPulse ? " glow-pulse" : ""} badge-anim--${style.animation}${art ? "" : " badge-chip--monogram"}`}
      style={chipStyle}
      title={def.name}
    >
      {showMono && art ? (
        <span
          className="badge-chip-mono"
          style={{ ...maskStyle, backgroundColor: style.monoColor } as CSSProperties}
        />
      ) : art ? (
        <img
          className="badge-chip-art"
          src={art}
          alt={def.name}
          width={px}
          height={px}
          decoding="async"
          draggable={false}
          onError={() => setArtBroken(true)}
        />
      ) : (
        <span className="badge-chip-initial" aria-hidden="true">
          {def.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      {showOverlay && art ? (
        <span
          className="badge-chip-overlay"
          aria-hidden="true"
          style={{ ...maskStyle, backgroundColor: style.overlayColor, opacity: style.overlayStrength / 100 } as CSSProperties}
        />
      ) : null}
    </span>
  );
}

export function BadgeRow({
  badges,
  style,
  size,
  className = "",
  tooltipStyle = "dark",
  tooltipEnabled = true,
}: {
  badges: BadgeInstance[];
  style: BadgeStyle;
  size?: number;
  className?: string;
  /** The profile's tooltip design, so the badge hover matches the links. */
  tooltipStyle?: TooltipStyle;
  tooltipEnabled?: boolean;
}) {
  const visible = badges.filter((b) => b.visible && badgeDef(b.id));
  if (!visible.length) return null;

  const rowStyle = {
    "--badge-row-bg": hexToRgba(style.rowBackground, style.rowOpacity),
    "--badge-row-border": hexToRgba(style.rowBorderColor, style.rowBorderOpacity),
    "--badge-row-radius": `${style.rowRadius}px`,
    "--badge-row-blur": `${style.rowBlur}px`,
    "--badge-row-pad": `${style.rowPadding}px`,
    "--badge-row-gap": `${style.rowGap}px`,
  } as CSSProperties;

  return (
    <span className={`badge-row${className ? ` ${className}` : ""}`} style={rowStyle}>
      {visible.map((badge) => (
        <Tooltip
          key={badge.id}
          text={tooltipEnabled ? badgeDef(badge.id)?.name ?? badge.id : ""}
          style={tooltipStyle}
        >
          <BadgeChip badge={badge} style={style} size={size} />
        </Tooltip>
      ))}
    </span>
  );
}
