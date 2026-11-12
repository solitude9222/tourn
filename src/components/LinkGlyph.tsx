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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [iconUrl]);

  if (iconUrl && !failed) {
    return (
      <img
        src={iconUrl}
        alt=""
        className="pv-link-img"
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  }

  if (BrandIcon) return <BrandIcon size={size} />;
  return <PlatformIcon id={platformId} size={size} />;
}
