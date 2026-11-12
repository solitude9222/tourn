import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { PlatformIcon } from "./PlatformIcons";

/**
 * A link's icon: the uploaded image when there is one, the platform's own mark
 * otherwise. An uploaded icon can point at a URL that has since gone away (or
 * a data URL saved by an older build), and an `<img>` that fails just leaves a
 * blank hole in the row — so a failed image falls back to the brand mark
 * instead of disappearing.
 */
export function LinkGlyph({
  platformId,
  iconUrl,
  size,
  brandIcon: BrandIcon,
}: {
  platformId: string;
  iconUrl?: string;
  size: number;
  brandIcon?: ComponentType<{ size?: number; className?: string }>;
}) {
  const [src, setSrc] = useState(iconUrl ?? "");

  useEffect(() => {
    setSrc(iconUrl ?? "");
  }, [iconUrl]);

  // Google's favicon service occasionally has no icon for a domain. When that
  // happens, try the site's own icon through DuckDuckGo before falling back to
  // the generic platform mark.
  const fallback =
    iconUrl && iconUrl.includes("google.com/s2/favicons")
      ? iconUrl
          .replace("https://www.google.com/s2/favicons?domain=", "https://icons.duckduckgo.com/ip3/")
          .replace(/&sz=\d+/, ".ico")
      : "";

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="pv-link-img"
        style={{ width: size, height: size }}
        onError={() => setSrc(fallback && src !== fallback ? fallback : "")}
      />
    );
  }

  if (BrandIcon) return <BrandIcon size={size} />;
  return <PlatformIcon id={platformId} size={size} />;
}
