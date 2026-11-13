import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles.css";

// `/demo` is served by the static host as index.html. Turn it into the hash the
// router understands while keeping the address the visitor typed.
if (
  !window.location.hash &&
  window.location.pathname.replace(/\/+$/, "").toLowerCase() === "/demo"
) {
  const base = import.meta.env.BASE_URL || "/";
  window.history.replaceState(null, "", `${base}#/demo`);
}

/* A deploy renames every chunk. A tab still running the previous build then
   asks for a file that no longer exists; reloading once picks up the new
   index.html and its matching chunk names instead of leaving the page broken
   (admin and settings are lazy-loaded, so they were the pages that failed). */
const CHUNK_RELOAD_KEY = "tourn:chunk-reload";
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  let already = "";
  try {
    already = sessionStorage.getItem(CHUNK_RELOAD_KEY) || "";
    if (!already) sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage can be blocked; still worth one reload.
  }
  if (!already) window.location.reload();
});
window.addEventListener("load", () => {
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    } catch {
      // ignore
    }
  }, 10_000);
});

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
