import { useEffect } from "react";
import { onekoFilter, startOneko, type OnekoCat } from "../lib/oneko";

/**
 * Mounts the oneko cat (github.com/adryd325/oneko.js) for as long as it is on
 * screen. The cat is recoloured with a CSS filter rather than shipping a GIF
 * per colourway, so "different cats" stay a single sprite sheet.
 */
export function Oneko({ enabled = true, cat = "classic" }: { enabled?: boolean; cat?: OnekoCat }) {
  useEffect(() => {
    if (!enabled) return;
    // The rest of the site animates regardless of the OS setting, so the cat
    // follows suit instead of being the one thing that silently never shows.
    return startOneko({ respectReducedMotion: false, filter: onekoFilter(cat) });
  }, [enabled, cat]);

  return null;
}
