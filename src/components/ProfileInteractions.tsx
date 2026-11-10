import { useEffect, useRef } from "react";
import type { InteractionSettings } from "../lib/profileAssets";

let context: AudioContext | null = null;
let customAudio: HTMLAudioElement | null = null;
export function playInteractionSound(settings: InteractionSettings) {
  if (settings.sound === "none" || settings.volume <= 0) return;
  if (settings.sound === "custom") {
    if (!settings.fileUrl) return;
    if (!customAudio || customAudio.getAttribute("src") !== settings.fileUrl) customAudio = new Audio(settings.fileUrl);
    customAudio.volume = settings.volume; customAudio.currentTime = 0;
    void customAudio.play().catch(() => undefined); return;
  }
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const oscillator = context.createOscillator(), gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = settings.sound === "tick" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(settings.sound === "pop" ? 700 : settings.sound === "tick" ? 1500 : 420, now);
    oscillator.frequency.exponentialRampToValueAtTime(100, now + .07);
    gain.gain.setValueAtTime(Math.max(.001, settings.volume * .15), now);
    gain.gain.exponentialRampToValueAtTime(.001, now + .08);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(now + .09);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  } catch { /* Browser without Web Audio: the profile stays usable. */ }
}

export function ProfileInteractions({ settings }: { settings: InteractionSettings }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    const rings = new Set<HTMLElement>();
    const click = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (settings.allClicks || (event.target as Element).closest("a, button, [role=button], .lkr-entry")) playInteractionSound(settings);
      if (!settings.ripple) return;
      const ring = document.createElement("i"); ring.className = "profile-click-ring";
      ring.style.left = `${event.clientX}px`; ring.style.top = `${event.clientY}px`; ring.style.color = settings.color;
      host.append(ring); rings.add(ring);
      ring.addEventListener("animationend", () => { ring.remove(); rings.delete(ring); }, { once: true });
    };
    host.addEventListener("pointerdown", click);
    return () => { host.removeEventListener("pointerdown", click); rings.forEach((ring) => ring.remove()); };
  }, [settings.sound, settings.volume, settings.fileUrl, settings.ripple, settings.color, settings.allClicks]);
  return <span ref={ref} aria-hidden="true" />;
}
