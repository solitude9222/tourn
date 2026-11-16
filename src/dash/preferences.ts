import { useState } from "react";

/** Browser preferences are conveniences; unavailable storage never blocks editing. */
export function usePreference<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { const saved = JSON.parse(localStorage.getItem(`tourn/preferences/${key}`) || "null"); return saved !== null && typeof saved === typeof initial && Array.isArray(saved) === Array.isArray(initial) ? saved as T : initial; }
    catch { return initial; }
  });
  const update = (next: T | ((current: T) => T)) => {
    setValue(current => {
      const result = typeof next === "function" ? (next as (current: T) => T)(current) : next;
      try { localStorage.setItem(`tourn/preferences/${key}`, JSON.stringify(result)); } catch { /* optional */ }
      return result;
    });
  };
  return [value, update] as const;
}
