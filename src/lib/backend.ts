/* ---------------------------------------------------------------------------
   Backend client — every account call is SAME-ORIGIN. The site proxies
   /api/* (and /env.js) through its own host to the Express backend, so the
   API domain never appears in page markup, in requests or in the address
   bar, and the session cookie stays first-party.

   `VITE_API_BASE_URL` still works for deliberately pointing at another host
   (e.g. `http://127.0.0.1:8787` when running the frontend without the dev
   proxy); empty means "this origin".
   --------------------------------------------------------------------------- */

import { publicEnv } from "./runtimeEnv";

export function apiBase(): string {
  return publicEnv("VITE_API_BASE_URL").replace(/\/+$/, "");
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

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
      return { ok: false, error: body?.error || `Request failed (${res.status})`, status: res.status };
    }
    return { ok: true, data: body };
  } catch (error) {
    // Keep the technical detail in the console; visitors get a plain message.
    console.warn("[backend] request failed", path, error);
    return {
      ok: false,
      error: "Couldn't reach tourn.lol right now — try again in a moment.",
      status: 0,
    };
  }
}

export async function post<T = unknown>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}
