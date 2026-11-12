import type { CSSProperties } from "react";

/**
 * Small copies of the site mark, scattered and rotated across the top of the
 * home page — a few quiet stamps instead of a tiled wallpaper.
 */
const MARKS: { x: string; y: string; size: number; rotate: number; opacity: number }[] = [
  { x: "2%", y: "12%", size: 78, rotate: -22, opacity: 0.07 },
  { x: "8%", y: "34%", size: 52, rotate: 18, opacity: 0.05 },
  { x: "12%", y: "62%", size: 66, rotate: -8, opacity: 0.06 },
  { x: "18%", y: "18%", size: 44, rotate: 40, opacity: 0.05 },
  { x: "21%", y: "82%", size: 88, rotate: 26, opacity: 0.05 },
  { x: "26%", y: "44%", size: 58, rotate: -34, opacity: 0.06 },
  { x: "29%", y: "24%", size: 38, rotate: -26, opacity: 0.04 },
  { x: "32%", y: "10%", size: 50, rotate: 12, opacity: 0.05 },
  { x: "36%", y: "68%", size: 74, rotate: -16, opacity: 0.06 },
  { x: "41%", y: "30%", size: 46, rotate: 52, opacity: 0.05 },
  { x: "45%", y: "90%", size: 64, rotate: 8, opacity: 0.04 },
  { x: "50%", y: "52%", size: 82, rotate: -28, opacity: 0.06 },
  { x: "55%", y: "14%", size: 42, rotate: 30, opacity: 0.05 },
  { x: "59%", y: "76%", size: 70, rotate: -42, opacity: 0.05 },
  { x: "62%", y: "92%", size: 42, rotate: 20, opacity: 0.04 },
  { x: "64%", y: "36%", size: 54, rotate: 18, opacity: 0.06 },
  { x: "68%", y: "6%", size: 92, rotate: -12, opacity: 0.07 },
  { x: "72%", y: "60%", size: 48, rotate: 36, opacity: 0.05 },
  { x: "76%", y: "88%", size: 60, rotate: -20, opacity: 0.04 },
  { x: "80%", y: "24%", size: 72, rotate: 14, opacity: 0.06 },
  { x: "84%", y: "48%", size: 44, rotate: -36, opacity: 0.05 },
  { x: "88%", y: "72%", size: 86, rotate: 24, opacity: 0.05 },
  { x: "91%", y: "10%", size: 56, rotate: -48, opacity: 0.06 },
  { x: "94%", y: "40%", size: 68, rotate: 10, opacity: 0.05 },
  { x: "4%", y: "88%", size: 56, rotate: 44, opacity: 0.04 },
  { x: "96%", y: "64%", size: 40, rotate: 32, opacity: 0.04 },
];

/**
 * The site's ambient layer: a flat black canvas with the site mark stamped a
 * few times, small and rotated, across the top of the home page.
 */
export function SiteBackdrop() {
  return (
    <div className="site-backdrop" aria-hidden="true">
      {MARKS.map((mark) => (
        <span
          key={`${mark.x}-${mark.y}`}
          className="site-mark"
          style={
            {
              left: mark.x,
              top: mark.y,
              width: mark.size,
              height: mark.size,
              "--mark-rotate": `${mark.rotate}deg`,
              "--mark-opacity": mark.opacity,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
