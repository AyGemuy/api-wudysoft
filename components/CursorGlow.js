import { useEffect, useRef } from 'react';

/** Cahaya aksen yang mengikuti kursor (hanya perangkat dengan pointer halus). */
export default function CursorGlow({ enabled = true }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 3;
    let tx = x;
    let ty = y;

    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      el.style.opacity = '1';
    };
    const onLeave = () => (el.style.opacity = '0');
    const tick = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      el.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;
  return <div ref={ref} className="cursor-glow" aria-hidden="true" />;
}
