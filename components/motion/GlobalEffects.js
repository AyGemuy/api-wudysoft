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

  // efek magnet: tombol sedikit tertarik ke arah kursor (hanya mouse/pen)
  useEffect(() => {
    if (!ok) return undefined;
    let cur = null;
    const SEL = '.btn, .dial-chip, .sb-quick button, .nav-center-action';
    const clear = (el) => { el.style.removeProperty('--tx'); el.style.removeProperty('--ty'); };
    const onMove = (e) => {
      if (e.pointerType === 'touch' || document.documentElement.dataset.anim === 'off') return;
      const el = e.target.closest?.(SEL);
      if (cur && cur !== el) { clear(cur); cur = null; }
      if (!el || el.disabled) return;
      cur = el;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.setProperty('--tx', `${(dx * 8).toFixed(1)}px`);
      el.style.setProperty('--ty', `${(dy * 6).toFixed(1)}px`);
    };
    const onOut = (e) => { if (cur && !cur.contains(e.relatedTarget)) { clear(cur); cur = null; } };
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    return () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerout', onOut); };
  }, [ok]);

  // spotlight mengikuti kursor + tilt 3D ringan pada kartu (hanya mouse/pen)
  useEffect(() => {
    if (!ok) return undefined;
    let raf = 0; let cur = null;
    const reset = (el) => { ['--mx', '--my', '--rx', '--ry'].forEach((k) => el.style.removeProperty(k)); };
    const onMove = (e) => {
      if (e.pointerType === 'touch' || document.documentElement.dataset.anim === 'off') return;
      const el = e.target.closest?.('.card, .rp-card');
      if (cur && cur !== el) { reset(cur); cur = null; }
      if (!el) return;
      cur = el;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left; const y = e.clientY - r.top;
        el.style.setProperty('--mx', `${x}px`); el.style.setProperty('--my', `${y}px`);
        const small = r.width * r.height < 420000 && !el.classList.contains('rp-card');
        const k = small ? 7 : 0;
        el.style.setProperty('--ry', `${((x / r.width) - 0.5) * k}deg`);
        el.style.setProperty('--rx', `${-((y / r.height) - 0.5) * k}deg`);
      });
    };
    const onOut = (e) => { if (cur && !cur.contains(e.relatedTarget)) { reset(cur); cur = null; } };
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    return () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerout', onOut); cancelAnimationFrame(raf); };
  }, [ok]);

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
