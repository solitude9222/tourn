import { useEffect } from "react";
import { startOneko } from "../lib/oneko";

/**
 * Mounts the oneko cat (github.com/adryd325/oneko.js) for as long as it is on
 * screen. On the home page it is always running; on a profile it follows the
 * profile's "ONEKO" setting.
 */
export function Oneko({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    // The rest of the site animates regardless of the OS setting, so the cat
    // follows suit instead of being the one thing that silently never shows.
    return startOneko({ respectReducedMotion: false });
  }, [enabled]);

  return null;
}
