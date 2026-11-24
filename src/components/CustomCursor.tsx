import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {CursorHotspot} from '../lib/cursorImage';

type Art = {url: string; hotspot: CursorHotspot};

/** Render outside the profile so filters and clipped cards cannot offset the pointer. */
export function CustomCursor({host, normal, pointer}: {
  host: HTMLElement | null;
  normal: Art | null;
  pointer: Art | null;
}) {
  const image = useRef<HTMLImageElement>(null);
  const point = useRef({x: 0, y: 0});
  const inside = useRef(false);
  const ready = useRef(false);
  const current = useRef<Art | null>(null);
  const [art, setArt] = useState<Art | null>(null);

  useEffect(() => {
    if (!host) return;
    let frame = 0;
    const draw = () => {
      frame = 0;
      const img = image.current, value = current.current;
      if (!img || !value) return;
      const show = inside.current && ready.current;
      img.style.visibility = show ? 'visible' : 'hidden';
      img.style.transform = `translate3d(${point.current.x - value.hotspot.x}px,${point.current.y - value.hotspot.y}px,0)`;
      host.classList.toggle('profile-uploaded-cursor-active', show);
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(draw); };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      point.current = {x: event.clientX, y: event.clientY};
      const target = event.target as Element;
      inside.current = host.contains(target);
      const interactive = Boolean(target.closest('a,button,[role=button],input[type=range]'));
      const next = inside.current ? (interactive ? pointer || normal : normal) : null;
      if (next?.url !== current.current?.url) {
        ready.current = false;
        current.current = next;
        setArt(next);
        host.classList.remove('profile-uploaded-cursor-active');
      }
      request();
    };
    const hide = () => { inside.current = false; request(); };
    const leave = (event: PointerEvent) => { if (!event.relatedTarget) hide(); };
    document.addEventListener('pointermove', move, {passive: true});
    document.addEventListener('pointerout', leave);
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', hide);
    current.current = null;
    ready.current = false;
    // Image normalization can finish after the last pointer event. Re-select
    // the image at that position so changing cursor art does not leave it
    // hidden until the visitor moves their mouse again.
    const target = inside.current ? document.elementFromPoint(point.current.x, point.current.y) : null;
    inside.current = Boolean(target && host.contains(target));
    const interactive = Boolean(target?.closest('a,button,[role=button],input[type=range]'));
    const next = inside.current ? (interactive ? pointer || normal : normal) : null;
    current.current = next;
    setArt(next);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerout', leave);
      window.removeEventListener('blur', hide);
      document.removeEventListener('visibilitychange', hide);
      host.classList.remove('profile-uploaded-cursor-active');
    };
  }, [host, normal?.url, pointer?.url, normal?.hotspot.x, normal?.hotspot.y, pointer?.hotspot.x, pointer?.hotspot.y]);

  if (!art) return null;
  return createPortal(<img
    ref={image} className="profile-uploaded-cursor" src={art.url} alt="" aria-hidden="true" draggable={false}
    onLoad={() => {
      ready.current = true;
      const img = image.current;
      if (!img) return;
      img.style.transform = `translate3d(${point.current.x - art.hotspot.x}px,${point.current.y - art.hotspot.y}px,0)`;
      img.style.visibility = inside.current ? 'visible' : 'hidden';
      host?.classList.toggle('profile-uploaded-cursor-active', inside.current);
    }}
    onError={() => {
      ready.current = false;
      host?.classList.remove('profile-uploaded-cursor-active');
      if (image.current) image.current.style.visibility = 'hidden';
    }}
    style={{position: 'fixed', left: 0, top: 0, width: 32, height: 32, objectFit: 'contain', pointerEvents: 'none', zIndex: 2147483000, visibility: 'hidden'}}
  />, document.body);
}
