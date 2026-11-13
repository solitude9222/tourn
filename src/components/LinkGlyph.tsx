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

  // Old saves still point at Google/gstatic favicon URLs, and those 404 for a
  // lot of small shops. Rewrite them to the site's own icon on DuckDuckGo, then
  // fall back to the platform mark if even that fails.
  const toSiteIcon = (url: string): string => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.endsWith("gstatic.com") || parsed.hostname.includes("google.")
        ? parsed.searchParams.get("url")
          ? new URL(parsed.searchParams.get("url") as string).hostname
          : parsed.searchParams.get("domain")
        : null;
      return host ? `https://icons.duckduckgo.com/ip3/${host}.ico` : url;
    } catch {
      return url;
    }
  };

  const fallback = iconUrl ? toSiteIcon(iconUrl) : "";

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
