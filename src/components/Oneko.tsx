import { useEffect } from "react";
import { onekoSprite, startOneko, type OnekoCat } from "../lib/oneko";

/**
 * Mounts the oneko pet (github.com/adryd325/oneko.js) for as long as it is
 * on screen. Each cat is its own sprite sheet rather than a recolour, so a
 * dog really is a dog and not the cat in a filter.
 */
export function Oneko({ enabled = true, cat = "classic" }: { enabled?: boolean; cat?: OnekoCat }) {
  useEffect(() => {
    if (!enabled) return;
    // The rest of the site animates regardless of the OS setting, so the cat
    // follows suit instead of being the one thing that silently never shows.
    return startOneko({ respectReducedMotion: false, spriteUrl: onekoSprite(cat) });
  }, [enabled, cat]);

  return null;
}
