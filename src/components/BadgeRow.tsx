import type { CSSProperties } from "react";
import { badgeDef, type BadgeInstance, type BadgeStyle } from "../lib/badges";
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
  if (!def || !badge.visible) return null;

  const px = size ?? style.size;
  const glowAlpha = Math.round((style.glowIntensity / 100) * 255).toString(16).padStart(2, "0");
  const glowRadius = 3 + (style.glowIntensity / 100) * 10;

  const chipStyle: CSSProperties = {
    width: px,
    height: px,
    "--badge-glow-color": `${style.glowColor}${glowAlpha}`,
    "--badge-glow-radius": `${glowRadius}px`,
    "--badge-glow-opacity": style.glow ? style.glowIntensity / 100 : 0,
    ...(style.animation === "shimmer" ? { "--badge-shimmer-mask": `url("${def.art}")` } : {}),
  } as CSSProperties;

  const maskStyle: CSSProperties = {
    WebkitMaskImage: `url("${def.art}")`,
    maskImage: `url("${def.art}")`,
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
      className={`badge-chip${style.glow ? " has-glow" : ""}${style.glowPulse ? " glow-pulse" : ""} badge-anim--${style.animation}`}
      style={chipStyle}
    >
      {showMono ? (
        <span
          className="badge-chip-mono"
          style={{ ...maskStyle, backgroundColor: style.monoColor } as CSSProperties}
        />
      ) : (
        <img
          className="badge-chip-art"
          src={def.art}
          alt={def.name}
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      )}
      {showOverlay ? (
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
}: {
  badges: BadgeInstance[];
  style: BadgeStyle;
  size?: number;
  className?: string;
}) {
  const visible = badges.filter((b) => b.visible && badgeDef(b.id));
  if (!visible.length) return null;

  return (
    <span className={`badge-row${className ? ` ${className}` : ""}`}>
      {visible.map((badge) => (
        <Tooltip key={badge.id} text={badgeDef(badge.id)?.name ?? badge.id} style="dark">
          <BadgeChip badge={badge} style={style} size={size} />
        </Tooltip>
      ))}
    </span>
  );
}
