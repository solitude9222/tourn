/* ---------------------------------------------------------------------------
   Dashboard file helpers.

   Profile assets stay in the browser as data URLs. Share previews are the
   exception: Discord needs a public URL, so those uploads go to the backend.
   --------------------------------------------------------------------------- */

import { api } from "../lib/backend";

export type LibraryAssetType = "Avatar" | "Audio" | "Background" | "Cursor";

export type LibraryAsset = {
  id: string;
  type: LibraryAssetType;
  name: string;
  url: string;
  createdAt: number;
  downloads: number;
  likes: number;
  favorite?: boolean;
};

const MAX_LIBRARY_BYTES = 3_500_000;

function key(userId: string): string {
  return `tourn.lol/asset-library/v1/${userId}`;
}

export function loadLibrary(userId: string): LibraryAsset[] {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is LibraryAsset => {
      if (!entry || typeof entry !== "object") return false;
      const item = entry as Partial<LibraryAsset>;
      return (
        typeof item.id === "string" &&
        typeof item.url === "string" &&
        typeof item.name === "string" &&
        ["Avatar", "Audio", "Background", "Cursor"].includes(String(item.type))
      );
    });
  } catch {
    return [];
  }
}

export function saveLibrary(userId: string, assets: LibraryAsset[]): boolean {
  try {
    if (assets.length > 60) return false;
    localStorage.setItem(key(userId), JSON.stringify(assets));
    return true;
  } catch {
    return false;
  }
}

export function newAsset(
  type: LibraryAssetType,
  name: string,
  url: string,
): LibraryAsset {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    name,
    url,
    createdAt: Date.now(),
    downloads: 0,
    likes: 0,
  };
}

export function fileToDataUrl(file: File, onProgress?: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = event => { if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100)); };
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

/** Downscale an image in the browser so a phone photo doesn't blow the store. */
export async function imageToDataUrl(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.86,
): Promise<string> {
  const raw = await fileToDataUrl(file);
  if (!file.type.startsWith("image/") || file.type === "image/gif") return raw;

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
      if (scale >= 1 && raw.length < MAX_LIBRARY_BYTES) {
        resolve(raw);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(raw);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const type = file.type === "image/png" ? "image/png" : "image/jpeg";
      resolve(canvas.toDataURL(type, quality));
    };
    image.onerror = () => resolve(raw);
    image.src = raw;
  });
}

export async function bannerToDataUrl(file: File, width = 1200, height = 630, quality = 0.9): Promise<string> {
  const raw = await fileToDataUrl(file);
  if (!file.type.startsWith("image/") || file.type === "image/gif") return raw;
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.max(width / image.width, height / image.height);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(raw);
        return;
      }
      context.drawImage(
        image,
        (width - image.width * scale) / 2,
        (height - image.height * scale) / 2,
        image.width * scale,
        image.height * scale,
      );
      const type = file.type === "image/png" ? "image/png" : "image/jpeg";
      resolve(canvas.toDataURL(type, quality));
    };
    image.onerror = () => resolve(raw);
    image.src = raw;
  });
}

export async function uploadImageDataUrl(dataUrl: string): Promise<string> {
  const result = await api<{ url: string }>("/api/media/image", {
    method: "POST",
    body: JSON.stringify({ dataUrl }),
  });
  if (!result.ok) throw new Error(result.error);
  return result.data.url;
}

export async function uploadShareImage(file: File): Promise<string> {
  return uploadImageDataUrl(await bannerToDataUrl(file, 1200, 630, 0.9));
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const selection = document.getSelection();
    const previous = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    const focused = document.activeElement as HTMLElement | null;
    const field = document.createElement("textarea");
    field.value = value;
    field.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.body.appendChild(field);
    field.select();
    try { return document.execCommand("copy"); }
    catch { return false; }
    finally {
      field.remove();
      if (focused?.isConnected) focused.focus({ preventScroll: true });
      if (previous?.startContainer.isConnected && selection) { selection.removeAllRanges(); selection.addRange(previous); }
    }
  }
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}
