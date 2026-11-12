import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FONT_CATEGORIES, loadGoogleFont } from "../lib/fonts";
import { CheckIcon, ChevronIcon } from "./Icons";

export function FontPicker({
  value,
  onChange,
  label = "Font",
}: {
  value: string;
  onChange: (family: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  // Portalled to <body>, so it's never clipped by a scrolling modal body and
  // can flip above the trigger when there isn't room below.
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    // Loading every catalogued family up front keeps the picker itself from
    // showing fallback glyphs the first time it opens.
    if (value) loadGoogleFont(value);
  }, [open, value]);

  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const gap = 6;
      const edge = 10;
      const below = window.innerHeight - rect.bottom - gap - edge;
      const above = rect.top - gap - edge;
      const openUp = below < 200 && above > below;
      const maxHeight = Math.max(160, Math.min(320, openUp ? above : below));
      setPosition({
        left: Math.min(Math.max(edge, rect.left), window.innerWidth - rect.width - edge),
        top: openUp ? Math.max(edge, rect.top - gap - maxHeight) : rect.bottom + gap,
        width: rect.width,
        maxHeight,
      });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (family: string) => {
    if (family) loadGoogleFont(family);
    onChange(family);
    setOpen(false);
  };

  return (
    <div className="font-picker" ref={wrapRef}>
      <span className="font-picker-label">{label}</span>
      <button
        type="button"
        ref={triggerRef}
        className="font-picker-trigger"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={{ fontFamily: value || "inherit" }}>{value || "Theme font"}</span>
        <ChevronIcon size={11} className="font-picker-chevron" />
      </button>

      {open && position
        ? createPortal(
            <div
              ref={popRef}
              className="font-picker-pop"
              style={{
                left: position.left,
                top: position.top,
                width: position.width,
                maxHeight: position.maxHeight,
              }}
            >
              <button
                type="button"
                className={`font-picker-item${!value ? " is-active" : ""}`}
                onClick={() => choose("")}
              >
                Theme font (default)
                {!value ? <CheckIcon size={10} /> : null}
              </button>

              {FONT_CATEGORIES.map((category) => (
                <div className="font-picker-group" key={category.id}>
                  <span className="font-picker-group-label">{category.name}</span>
                  {category.fonts.map((font) => (
                    <button
                      type="button"
                      key={font.family}
                      className={`font-picker-item${value === font.family ? " is-active" : ""}`}
                      style={{ fontFamily: font.family }}
                      onPointerEnter={() => loadGoogleFont(font.family)}
                      onFocus={() => loadGoogleFont(font.family)}
                      onClick={() => choose(font.family)}
                    >
                      {font.family}
                      {value === font.family ? <CheckIcon size={10} /> : null}
                    </button>
                  ))}
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
