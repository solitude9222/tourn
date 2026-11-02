/* ---------------------------------------------------------------------------
   Backend client — every account call goes to the Railway backend
   (Postgres lives there too). The base URL comes from the backend's own
   /env.js at runtime (window.__ENV__), falls back to import.meta.env for
   local dev, then to the known production URL.
   --------------------------------------------------------------------------- */

import { publicEnv } from "./runtimeEnv";

export const DEFAULT_BACKEND_URL = "https://tourn-production.up.railway.app";

export function apiBase(): string {
  return publicEnv("VITE_API_BASE_URL") || DEFAULT_BACKEND_URL;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      ...init,
    });
    const body = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      return { ok: false, error: body?.error || `Request failed (${res.status})` };
    }
    return { ok: true, data: body };
  } catch (error) {
    // Keep the technical detail in the console; visitors get a plain message.
    console.warn("[backend] request failed", path, error);
    return { ok: false, error: "Couldn't reach tourn.lol right now — try again in a moment." };
  }
}

export async function post<T = unknown>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}
