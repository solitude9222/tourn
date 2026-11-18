import type { AboutDesign } from "../lib/about";

const STYLE_KEYS: (keyof AboutDesign)[] = ["theme", "layout", "cardStyle", "font", "cardWidth", "cardRadius", "borderWidth", "borderOpacity", "backgroundOpacity", "backgroundBlur", "avatarSize", "widgetGap", "cardPadding", "nameSize", "bioSize", "tilt", "stackTilt", "colors", "pills", "surfaces", "projectLayout", "pfpPosition", "badgePosition", "namePosition", "bioPosition", "avatarShape", "interestMode"];
export function styleFrom(design: AboutDesign): Partial<AboutDesign> { return Object.fromEntries(STYLE_KEYS.map(key => [key, design[key]])); }

export function contrastRatio(foreground: string, background: string): number {
  const light = (hex: string) => {
    const full = hex.length === 4 ? "#" + hex.slice(1).split("").map(part => part + part).join("") : hex;
    const values = [1, 3, 5].map(offset => {
      const value = parseInt(full.slice(offset, offset + 2), 16) / 255;
      return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    });
    return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
  };
  const a = light(foreground), b = light(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

