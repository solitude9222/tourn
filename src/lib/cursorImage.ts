/* ---------------------------------------------------------------------------
   Uploaded cursors are ordinary images. Many cursor packs include transparent
   padding around the actual arrow, so a CSS hotspot of 0 0 points at empty
   space and the visible cursor feels offset. This helper finds the first
   meaningfully opaque pixel and returns it as the hotspot.
   --------------------------------------------------------------------------- */

export type CursorHotspot = { x: number; y: number };

/**
 * Measure the visible top-left of a cursor image. Returns 0 0 for images that
 * cannot be inspected (cross-origin, non-browser, broken or fully transparent).
 */
export function detectCursorHotspot(url: string): Promise<CursorHotspot> {
  if (!url || typeof document === "undefined") return Promise.resolve({ x: 0, y: 0 });

  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onerror = () => resolve({ x: 0, y: 0 });
    image.onload = () => {
      try {
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        if (!width || !height) {
          resolve({ x: 0, y: 0 });
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          resolve({ x: 0, y: 0 });
          return;
        }
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, width, height).data;
        // Ignore almost-transparent antialiasing/glow around the artwork.
        const threshold = 24;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (pixels[(y * width + x) * 4 + 3] > threshold) {
              resolve({ x, y });
              return;
            }
          }
        }
        resolve({ x: 0, y: 0 });
      } catch {
        // A cross-origin bitmap taints the canvas; leave the saved hotspot.
        resolve({ x: 0, y: 0 });
      }
    };
    image.src = url;
  });
}
