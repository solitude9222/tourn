import { Fragment, useEffect, useState, type CSSProperties } from "react";
import { hexToRgba } from "../lib/about";
import { badgeDef, type BadgeInstance, type BadgeStyle } from "../lib/badges";
import type { TooltipAnimation, TooltipStyle } from "../lib/links";
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
  const [reduced,setReduced]=useState(()=>typeof matchMedia!=="undefined"&&matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(()=>{const query=matchMedia("(prefers-reduced-motion: reduce)");const update=()=>setReduced(query.matches);query.addEventListener("change",update);return()=>query.removeEventListener("change",update);},[]);
  // Animated art is the default. If it cannot load, try the still version, then
  // fall back to a monogram rather than a broken-image icon.
  const [artStage, setArtStage] = useState(0);
  if (!def || !badge.visible) return null;

  const px = size ?? 24;
  const glowAlpha = Math.round((style.glowIntensity / 100) * 255).toString(16).padStart(2, "0");
  const glowRadius = 2 + (style.glowIntensity / 100) * 6;
  const art = reduced ? def.artStatic || def.art : artStage === 0 ? def.art : artStage === 1 && def.artStatic ? def.artStatic : "";
  const maskArt = def.artStatic || def.art;
  const tint = style.monochrome ? style.monoColor : def.color;

  const chipStyle: CSSProperties = {
    width: px,
    height: px,
    "--badge-glow-color": `${style.glowColor}${glowAlpha}`,
    "--badge-glow-radius": `${glowRadius}px`,
    "--badge-glow-opacity": style.glow ? style.glowIntensity / 100 : 0,
    "--badge-tint": tint,
    ...(style.animation === "shimmer" && maskArt ? { "--badge-shimmer-mask": `url("${maskArt}")` } : {}),
  } as CSSProperties;

  const maskStyle: CSSProperties = {
    WebkitMaskImage: `url("${maskArt}")`,
    maskImage: `url("${maskArt}")`,
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
          onError={() => setArtStage((stage) => (stage === 0 && def.artStatic ? 1 : 2))}
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
  tooltipAnimation = "slide",
  donationTotal = null,
}: {
  badges: BadgeInstance[];
  style: BadgeStyle;
  size?: number;
  className?: string;
  /** The profile's tooltip design, so the badge hover matches the links. */
  tooltipStyle?: TooltipStyle;
  tooltipEnabled?: boolean;
  tooltipAnimation?: TooltipAnimation;
  /** Running total shown beside the Donor badge for the first account. */
  donationTotal?: number | null;
}) {
  const visible = badges.filter((b) => b.visible && badgeDef(b.id));
  if (!visible.length) return null;

  // Shelf turned all the way down means no shelf at all: no fill, no border,
  // no blur and no padding — otherwise a faint plate still sat behind the art.
  const bareShelf = style.rowOpacity <= 0.005 && style.rowBorderOpacity <= 0.005;
  const rowStyle = {
    "--badge-row-bg": bareShelf ? "transparent" : hexToRgba(style.rowBackground, style.rowOpacity),
    "--badge-row-border": bareShelf ? "transparent" : hexToRgba(style.rowBorderColor, style.rowBorderOpacity),
    "--badge-row-border-width": `${style.rowBorderWidth}px`,
    "--badge-row-shadow": bareShelf ? "transparent" : hexToRgba(style.rowShadowColor, style.rowShadowOpacity),
    "--badge-row-shadow-blur": `${style.rowShadowBlur}px`,
    "--badge-row-offset": `${style.rowOffsetY}px`,
    "--badge-row-radius": `${style.rowRadius}px`,
    "--badge-row-blur": bareShelf ? "0px" : `${style.rowBlur}px`,
    "--badge-row-pad": bareShelf ? "0px" : `${style.rowPadding}px`,
    "--badge-row-gap": `${style.rowGap}px`,
  } as CSSProperties;

  return (
    <span className={`badge-row${bareShelf ? " is-bare" : ""}${className ? ` ${className}` : ""}`} style={rowStyle}>
      {visible.map((badge) => {
        const def = badgeDef(badge.id);
        const total = badge.id === "donator" ? donationTotal : null;
        const tip = def?.name ?? badge.id;
        return (
          <Fragment key={badge.id}>
            <Tooltip
              text={tooltipEnabled ? (total === null ? tip : `${tip} · $${total.toLocaleString("en-US")} donated`) : ""}
              style={tooltipStyle}
              animation={tooltipAnimation}
            >
              <BadgeChip badge={badge} style={style} size={size} />
            </Tooltip>
            {total === null ? null : (
              <span
                className="badge-donation-total"
                title={`$${total.toLocaleString("en-US")} donated`}
                aria-label={`$${total.toLocaleString("en-US")} donated`}
              >
                ${total.toLocaleString("en-US")}
              </span>
            )}
          </Fragment>
        );
      })}
    </span>
  );
}
