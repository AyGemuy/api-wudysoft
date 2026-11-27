import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause, Maximize2, Minimize2 } from 'lucide-react';
import { sound } from '@/src/lib/interactiveEffects';

/**
 * Carousel kaca 3D (coverflow). items: [{ id, label, Icon }]. Terkendali: value = id aktif, onChange(id).
 * Toolbar kiri (putar otomatis, layar penuh) + bar kontrol bawah (sebelumnya, titik, berikutnya).
 * Bisa digeser (drag), klik kartu samping, atau panah keyboard.
 */
export default function GlassCarousel({ items, value, onChange, label = 'Pilih' }) {
  const idx = Math.max(0, items.findIndex((x) => x.id === value));
  const [auto, setAuto] = useState(false);
  const [full, setFull] = useState(false);
  const box = useRef(null);
  const go = useCallback((i) => { const n = items.length; onChange(items[((i % n) + n) % n].id); }, [items, onChange]);

  useEffect(() => {
    if (!auto) return undefined;
    const t = setInterval(() => go(idx + 1), 3200);
    return () => clearInterval(t);
  }, [auto, idx, go]);
  useEffect(() => {
    const on = () => setFull(!!(document.fullscreenElement && document.fullscreenElement === box.current));
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFull = () => {
    try { if (document.fullscreenElement) document.exitFullscreen(); else box.current?.requestFullscreen?.(); } catch {}
  };
  const onKey = (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); } };

  return (
    <div className="gc" ref={box} tabIndex={0} onKeyDown={onKey} role="group" aria-roledescription="carousel" aria-label={label}>
      <div className="gc-tools" role="toolbar" aria-label="Alat carousel">
        <button type="button" onClick={() => { sound.playClick(); setAuto((v) => !v); }} aria-pressed={auto} aria-label={auto ? 'Hentikan putar otomatis' : 'Putar otomatis'} title="Putar otomatis">{auto ? <Pause size={16} /> : <Play size={16} />}</button>
        <button type="button" onClick={() => { sound.playClick(); toggleFull(); }} aria-label="Layar penuh" title="Layar penuh">{full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
      </div>

      <motion.div className="gc-stage" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25}
        onDragEnd={(_, info) => { if (info.offset.x < -50) go(idx + 1); else if (info.offset.x > 50) go(idx - 1); }}>
        {items.map((it, i) => {
          let d = i - idx; const n = items.length;
          if (d > n / 2) d -= n; if (d < -n / 2) d += n;
          const a = Math.abs(d);
          const Icon = it.Icon;
          return (
            <button
              key={it.id} type="button" className={`gc-card ${d === 0 ? 'on' : ''}`} tabIndex={-1}
              aria-label={it.label} aria-current={d === 0}
              onClick={() => { sound.playClick(); go(i); }}
              style={{ transform: `translateX(${d * 58}%) translateZ(${-a * 90}px) rotateY(${d * -38}deg) scale(${d === 0 ? 1 : 0.86})`, zIndex: 10 - a, opacity: a > 2 ? 0 : 1 - a * 0.22, pointerEvents: a > 2 ? 'none' : 'auto' }}
            >
              <span className="gc-ico"><Icon size={34} /></span>
              <b>{it.label}</b>
            </button>
          );
        })}
      </motion.div>

      <div className="gc-bar">
        <button type="button" onClick={() => { sound.playClick(); go(idx - 1); }} aria-label="Sebelumnya"><ChevronLeft size={18} /></button>
        <span className="gc-dots" role="tablist" aria-label="Posisi">
          {items.map((it, i) => <button key={it.id} type="button" role="tab" aria-selected={i === idx} aria-label={it.label} className={i === idx ? 'on' : ''} onClick={() => go(i)} />)}
        </span>
        <span className="gc-count">{idx + 1} / {items.length}</span>
        <button type="button" onClick={() => { sound.playClick(); go(idx + 1); }} aria-label="Berikutnya"><ChevronRight size={18} /></button>
      </div>

      <style jsx global>{`
        .gc { position: relative; display: grid; gap: 12px; padding: 14px 14px 12px 60px; border-radius: var(--radius, 20px); background: linear-gradient(160deg, color-mix(in srgb, var(--a1) 14%, var(--glass, transparent)), var(--glass, transparent)); border: 1px solid var(--border); backdrop-filter: blur(var(--blur, 20px)); overflow: hidden; outline: none; }
        .gc:focus-visible { box-shadow: 0 0 0 2px var(--a2); }
        .gc:fullscreen { padding: 24px 24px 20px 80px; align-content: center; background: var(--bg1); }
        .gc-tools { position: absolute; left: 10px; top: 50%; translate: 0 -50%; display: grid; gap: 8px; padding: 6px; border-radius: 18px; background: color-mix(in srgb, #fff 10%, transparent); border: 1px solid var(--border); z-index: 20; }
        .gc-tools button, .gc-bar > button { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; background: transparent; border: 0; color: var(--text); cursor: pointer; transition: background .2s, transform .2s; }
        .gc-tools button:hover, .gc-bar > button:hover { background: color-mix(in srgb, var(--a1) 28%, transparent); transform: scale(1.06); }
        .gc-tools button[aria-pressed='true'] { background: var(--a1); color: var(--on-accent, #fff); }
        .gc-stage { position: relative; height: 190px; perspective: 900px; transform-style: preserve-3d; cursor: grab; touch-action: pan-y; }
        .gc:fullscreen .gc-stage { height: min(46vh, 340px); }
        .gc-card { position: absolute; left: 50%; top: 50%; width: min(190px, 52%); height: 160px; margin: -80px 0 0 calc(min(190px, 52%) / -2); display: grid; place-items: center; align-content: center; gap: 10px; border-radius: 26px; color: var(--text); font: inherit; cursor: pointer; border: 1px solid rgba(255, 255, 255, .3); background: linear-gradient(150deg, rgba(255, 255, 255, .26), rgba(255, 255, 255, .06) 55%, color-mix(in srgb, var(--a1) 22%, transparent)); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .4), 0 24px 40px -22px rgba(0, 0, 0, .7); backdrop-filter: blur(14px); transition: transform .55s cubic-bezier(.22, 1, .36, 1), opacity .4s; }
        .gc-card.on { border-color: color-mix(in srgb, var(--a2) 70%, #fff); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .5), 0 0 0 1px var(--a2), 0 28px 50px -20px var(--a1); }
        .gc-ico { width: 62px; height: 62px; border-radius: 20px; display: grid; place-items: center; background: linear-gradient(135deg, var(--a1), var(--a3)); color: var(--on-accent, #fff); box-shadow: 0 10px 24px -8px var(--a1); }
        .gc-card b { font-size: .9rem; }
        .gc-bar { display: flex; align-items: center; justify-content: center; gap: 12px; width: fit-content; max-width: 100%; margin: 0 auto; padding: 6px 10px; border-radius: 99px; background: color-mix(in srgb, #fff 10%, transparent); border: 1px solid var(--border); }
        .gc-dots { display: flex; gap: 6px; }
        .gc-dots button { width: 8px; height: 8px; padding: 0; border-radius: 99px; border: 0; background: color-mix(in srgb, var(--text) 30%, transparent); cursor: pointer; transition: width .3s, background .3s; }
        .gc-dots button.on { width: 22px; background: var(--a2); }
        .gc-count { font-family: var(--font-mono); font-size: .7rem; color: var(--muted); }
        @media (max-width: 520px) { .gc { padding: 12px 10px; } .gc-tools { position: static; translate: none; grid-auto-flow: column; width: fit-content; justify-self: center; } .gc-card { width: 56%; height: 150px; margin-top: -75px; } .gc-stage { height: 170px; } }
        @media (prefers-reduced-motion: reduce) { .gc-card { transition: none; } }
      `}</style>
    </div>
  );
}
