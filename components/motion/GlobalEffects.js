import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { ScrollProgress, useMotionOk } from './index';

/**
 * Efek global (dipasang sekali di _app):
 *  • ripple pada .btn / .nav-tab saat ditekan
 *  • bilah progres gulir
 *  • tombol "kembali ke atas" yang muncul setelah menggulir
 */
export default function GlobalEffects() {
  const { ok } = useMotionOk();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    if (!ok) return;
    const onDown = (e) => {
      const el = e.target.closest?.('.btn, .nav-tab, .hd-btn');
      if (!el || el.disabled || document.documentElement.dataset.animBtn === 'off') return;
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const dot = document.createElement('span');
      dot.className = 'mo-ripple-dot';
      dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.style.overflow = 'hidden';
      el.appendChild(dot);
      setTimeout(() => dot.remove(), 700);
    };
    document.addEventListener('pointerdown', onDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onDown);
  }, [ok]);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setShowTop(window.scrollY > 600));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <ScrollProgress />
      <button
        type="button"
        className={`mo-totop ${showTop ? 'show' : ''}`}
        aria-label="Kembali ke atas"
        tabIndex={showTop ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ChevronUp size={20} />
      </button>
    </>
  );
}

/** Orb berpendar sebagai latar dekoratif sebuah section: letakkan di dalam elemen `position: relative`. */
export function Orbs() {
  return (
    <div className="mo-orbs" aria-hidden="true">
      <i className="mo-orb" style={{ width: 280, height: 280, top: '-8%', left: '-6%' }} />
      <i className="mo-orb" style={{ width: 220, height: 220, bottom: '-10%', right: '-4%' }} />
      <i className="mo-orb" style={{ width: 160, height: 160, top: '40%', left: '55%' }} />
    </div>
  );
}
