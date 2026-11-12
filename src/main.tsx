import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
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

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
