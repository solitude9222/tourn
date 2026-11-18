/* ---------------------------------------------------------------------------
   Uploaded cursors are ordinary images. Many cursor packs include transparent
   padding around the actual arrow, so a CSS hotspot of 0 0 points at empty
   space and the visible cursor feels offset. This helper finds the first
   meaningfully opaque pixel and returns it as the hotspot.
   --------------------------------------------------------------------------- */

export type CursorHotspot = { x: number; y: number };

/**
 * Crop the transparent padding from a cursor and fit it inside the size the
 * browser actually paints (32px). CSS hotspots use image pixels, but the
 * browser scales a larger image down, so the old hotspot pointed dozens of
 * pixels away from the arrow. After this the visible artwork starts at 0 0.
 */
export function normalizeCursorArt(
  url: string,
  size = 32,
): Promise<{ url: string; hotspot: CursorHotspot }> {
  if (!url || typeof document === "undefined") return Promise.resolve({ url, hotspot: { x: 0, y: 0 } });
  // Cropping a GIF would throw away its animation, so leave animated cursors
  // untouched and keep their measured hotspot.
  if (/^data:image\/gif/i.test(url) || /\.gif(?:[?#]|$)/i.test(url)) {
    return detectCursorHotspot(url).then((hotspot) => ({ url, hotspot }));
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onerror = () => resolve({ url, hotspot: { x: 0, y: 0 } });
    image.onload = () => {
      try {
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        if (!width || !height) {
          resolve({ url, hotspot: { x: 0, y: 0 } });
          return;
        }
        const source = document.createElement("canvas");
        source.width = width;
        source.height = height;
        const sourceContext = source.getContext("2d", { willReadFrequently: true });
        if (!sourceContext) {
          resolve({ url, hotspot: { x: 0, y: 0 } });
          return;
        }
        sourceContext.drawImage(image, 0, 0);
        const pixels = sourceContext.getImageData(0, 0, width, height).data;
        const threshold = 24;
        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;
        // The click point is the first visible pixel (the arrow's tip), not the
        // top-left corner of its bounding box. Those differ whenever the
        // graphic is wider at the bottom, which made the painted cursor sit
        // down and to the right of the actual pointer.
        let tipX = -1;
        let tipY = -1;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (pixels[(y * width + x) * 4 + 3] <= threshold) continue;
            if (tipX < 0) {
              tipX = x;
              tipY = y;
            }
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
        if (maxX < 0) {
          resolve({ url, hotspot: { x: 0, y: 0 } });
          return;
        }
        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;
        const scale = Math.min(1, size / cropWidth, size / cropHeight);
        const drawWidth = Math.max(1, Math.round(cropWidth * scale));
        const drawHeight = Math.max(1, Math.round(cropHeight * scale));
        // Always output a 32x32 canvas. The hotspot sliders and the CSS cursor
        // then share one coordinate space, even when the artwork is wide or
        // tall, instead of sometimes falling outside an unusually shaped image.
        const output = document.createElement("canvas");
        output.width = size;
        output.height = size;
        const padX = (size - drawWidth) / 2;
        const padY = (size - drawHeight) / 2;
        const outputContext = output.getContext("2d");
        if (!outputContext) {
          resolve({ url, hotspot: { x: 0, y: 0 } });
          return;
        }
        outputContext.drawImage(
          image,
          minX,
          minY,
          cropWidth,
          cropHeight,
          padX,
          padY,
          drawWidth,
          drawHeight,
        );
        resolve({
          url: output.toDataURL("image/png"),
          // Hotspots are in the pixels of the resized image, so the detected
          // inset has to follow the same crop, scale and centering.
          hotspot: {
            x: Math.round(padX + Math.max(0, tipX - minX) * scale),
            y: Math.round(padY + Math.max(0, tipY - minY) * scale),
          },
        });
      } catch {
        resolve({ url, hotspot: { x: 0, y: 0 } });
      }
    };
    image.src = url;
  });
}

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
