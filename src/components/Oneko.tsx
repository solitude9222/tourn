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
    return startOneko({ respectReducedMotion: true });
  }, [enabled]);

  return null;
}
