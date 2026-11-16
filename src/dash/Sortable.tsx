import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export type SortableDrag = { from: number; over: number };

/**
 * Pointer-driven reorder used by the manage lists. The rows stay in place
 * while dragging, so the list doesn't jump around under the pointer; a line
 * marks where the current row will land.
 */
export function usePointerSort<T extends { id: string }>(
  items: T[],
  move: (from: number, to: number) => void,
) {
  const refs = useRef(new Map<string, HTMLElement>());
  const dragRef = useRef<SortableDrag | null>(null);
  const [drag, setDragState] = useState<SortableDrag | null>(null);

  const setDrag = (next: SortableDrag | null) => {
    dragRef.current = next;
    setDragState(next);
  };

  const register = (id: string) => (node: HTMLElement | null) => {
    if (node) refs.current.set(id, node);
    else refs.current.delete(id);
  };

  const begin = (event: PointerEvent<HTMLElement>, index: number) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const pointerId = event.pointerId;
    const ids = items.map((item) => item.id);
    setDrag({ from: index, over: index });

    const targetIndex = (clientY: number) => {
      for (let i = 0; i < ids.length; i += 1) {
        const node = refs.current.get(ids[i]);
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        if (clientY < rect.top + rect.height / 2) return i;
      }
      return Math.max(0, ids.length - 1);
    };

    let frame = 0;
    const onMove = (moveEvent: globalThis.PointerEvent) => {
      if (moveEvent.pointerId !== pointerId || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const over = targetIndex(moveEvent.clientY);
        if (dragRef.current?.over === over) return;
        setDrag({ from: dragRef.current?.from ?? index, over });
      });
    };

    const finish = (upEvent: globalThis.PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      document.body.classList.remove("tw-sorting");
      const state = dragRef.current;
      setDrag(null);
      if (state && state.from !== state.over) move(state.from, state.over);
    };

    document.body.classList.add("tw-sorting");
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  const keyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const next = index + (event.key === "ArrowDown" ? 1 : -1);
    if (next < 0 || next >= items.length) return;
    move(index, next);
  };

  return { drag, begin, keyDown, register };
}
