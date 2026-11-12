/* ---------------------------------------------------------------------------
   Backend client — every account call is SAME-ORIGIN. The site proxies
   /api/* through its own host to the Express backend, so the API domain never
   appears in page markup, in requests or in the address bar, and the session
   cookie stays first-party. /env.js is a static public file, not proxied.

   `VITE_API_BASE_URL` still works for deliberately pointing at another host
   (e.g. `http://127.0.0.1:8787` when running the frontend without the dev
   proxy); empty means "this origin".
   --------------------------------------------------------------------------- */

import { publicEnv } from "./runtimeEnv";

/**
 * `/env.js` used to be a blocking <script> in the document head, so every page
 * waited a full round-trip before React could even start. It is loaded here
 * instead: the request starts as soon as this module runs, runs alongside the
 * first render, and only the first API call actually waits for it.
 */
let envReady: Promise<void> | null = null;

function ensurePublicEnv(): Promise<void> {
  if (typeof window === "undefined" || window.__ENV__) return Promise.resolve();
  if (!envReady) {
    envReady = new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      const script = document.createElement("script");
      script.src = "/env.js";
      script.async = true;
      script.onload = finish;
      script.onerror = finish;
      document.head.appendChild(script);
      // A cold backend must never hold the first request hostage.
      window.setTimeout(finish, 1500);
    });
  }
  return envReady;
}

void ensurePublicEnv();

export function apiBase(): string {
  return publicEnv("VITE_API_BASE_URL").replace(/\/+$/, "");
}

export type ApiResult<T> =
  | { ok: true; data: T }
  // The body is kept on errors so callers can act on a 409 revision conflict.
  | { ok: false; error: string; status: number; data?: T };

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    await ensurePublicEnv();
    const res = await fetch(`${apiBase()}${path}`, {
      // Profile reads must never be satisfied by an old browser/HTTP cache.
      cache: "no-store",
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      ...init,
    });
    const body = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      return { ok: false, error: body?.error || `Request failed (${res.status})`, status: res.status, data: body };
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
