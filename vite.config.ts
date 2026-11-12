import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Steam's public profile XML has no CORS headers. This dev/preview middleware
 * fetches it server-side so the Steam card can show the real online state and
 * member date locally. Static production hosts fall back to Microlink metadata
 * in `src/lib/steam.ts`.
 */
function steamProfileProxy(): Plugin {
  const middleware = async (req: any, res: any) => {
    try {
      const requestUrl = new URL(req.url ?? "", "http://127.0.0.1");
      const target = requestUrl.searchParams.get("url");
      if (!target) {
        res.statusCode = 400;
        res.end("Missing url");
        return;
      }

      const targetUrl = new URL(target);
      if (
        targetUrl.protocol !== "https:" ||
        !/(^|\.)steamcommunity\.com$/i.test(targetUrl.hostname)
      ) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
      }

      const upstream = await fetch(targetUrl, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
          accept: "text/xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      const body = await upstream.text();
      res.statusCode = upstream.status;
      res.setHeader("content-type", "text/xml; charset=utf-8");
      res.setHeader("cache-control", "public, max-age=120");
      res.end(body);
    } catch {
      res.statusCode = 502;
      res.end("Steam proxy error");
    }
  };

  return {
    name: "tourn-steam-proxy",
    configureServer(server) {
      server.middlewares.use("/api/steam-profile", middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/steam-profile", middleware);
    },
  };
}

/**
 * Roblox's public profile endpoints don't send CORS headers. Keep the real
 * headshot, friends and follower counts flowing through a same-origin route in
 * development and `vite preview` instead of inventing placeholder stats.
 *
 * Roblox intermittently rejects unfamiliar user agents and drops connections,
 * so requests go out with a browser-like UA and are retried once before the
 * proxy admits failure with a 502.
 */
const ROBLOX_HOSTS = new Set([
  "users.roblox.com",
  "thumbnails.roblox.com",
  "friends.roblox.com",
  "apis.roblox.com",
]);

const ROBLOX_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

async function fetchRobloxOnce(targetUrl: URL): Promise<Response> {
  return fetch(targetUrl, {
    headers: {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.9",
      "user-agent": ROBLOX_UA,
    },
    signal: AbortSignal.timeout(15_000),
  });
}

function robloxProxy(): Plugin {
  const middleware = async (req: any, res: any) => {
    try {
      const requestUrl = new URL(req.url ?? "", "http://127.0.0.1");
      const target = requestUrl.searchParams.get("url");
      if (!target) {
        res.statusCode = 400;
        res.end("Missing url");
        return;
      }

      const targetUrl = new URL(target);
      if (targetUrl.protocol !== "https:" || !ROBLOX_HOSTS.has(targetUrl.hostname)) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
      }

      let upstream: Response | null = null;
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 2 && !upstream; attempt += 1) {
        try {
          upstream = await fetchRobloxOnce(targetUrl);
        } catch (error) {
          lastError = error;
        }
      }

      if (!upstream) {
        console.warn(
          `[roblox-proxy] ${targetUrl.hostname}${targetUrl.pathname} failed:`,
          lastError instanceof Error ? lastError.message : lastError,
        );
        res.statusCode = 502;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "Roblox proxy error", errors: [{ code: 0, message: "Upstream unreachable" }] }));
        return;
      }

      const body = await upstream.text();
      res.statusCode = upstream.status;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("cache-control", "public, max-age=60");
      res.end(body);
    } catch (error) {
      console.warn("[roblox-proxy] request error:", error instanceof Error ? error.message : error);
      res.statusCode = 502;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Roblox proxy error" }));
    }
  };

  return {
    name: "tourn-roblox-proxy",
    configureServer(server) {
      server.middlewares.use("/api/roblox", middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/roblox", middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), steamProfileProxy(), robloxProxy()],
  build: {
    // Locked production bundle: no source maps back to the source, no console
    // or debugger calls, and aggressively mangled identifiers. Browser code
    // can never be made secret — this just removes the free guided tour.
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true, passes: 2 },
      mangle: { toplevel: true, safari10: true },
      format: { comments: false },
    },
  },
  server: {
    port: 5180,
    host: "127.0.0.1",
    // The app talks to its own origin in every environment; in development
    // that origin forwards /api to the local Express backend on :8787, exactly
    // like the production host does. /env.js is the static public file.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        // Steam and Roblox widgets are served by the plugins above, never
        // forwarded to the account backend.
        bypass: (req) =>
          /^\/api\/(steam-profile|roblox)(\/|\?|$)/.test(req.url ?? "")
            ? req.url
            : undefined,
      },
    },
  },
  preview: {
    port: 5180,
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        bypass: (req) =>
          /^\/api\/(steam-profile|roblox)(\/|\?|$)/.test(req.url ?? "")
            ? req.url
            : undefined,
      },
    },
  },
});
