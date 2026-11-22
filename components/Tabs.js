import { useEffect, useId, useRef, useState } from 'react';

/**
 * Tab modern (pill + indikator bergeser halus). Aksesibel: role=tablist, panah kiri/kanan, Home/End.
 * tabs: [{ id, label, Icon? }]  ·  value: id aktif  ·  onChange(id)
 */
export default function Tabs({ tabs, value, onChange, label = 'Tab', compact = false }) {
  const uid = useId();
  const ref = useRef(null);
  const [ind, setInd] = useState(null); // posisi indikator (CSS transition, tanpa layout animation framer-motion)

  useEffect(() => {
    const measure = () => {
      const el = ref.current?.querySelector('[aria-selected=true]');
      if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready?.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [value, tabs]);

  const onKey = (e) => {
    const i = tabs.findIndex((t) => t.id === value);
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    if (n < 0) return;
    e.preventDefault();
    onChange(tabs[n].id);
    ref.current?.querySelectorAll('[role=tab]')[n]?.focus();
  };

  return (
    <div className={`tb-wrap ${compact ? 'compact' : ''}`}>
      <div ref={ref} className="tb glass" role="tablist" aria-label={label} onKeyDown={onKey}>
        {ind && <i className="tb-ind" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} aria-hidden="true" />}
        {tabs.map(({ id, label: text, Icon }) => {
          const active = id === value;
          return (
            <button
              key={id}
              role="tab"
              id={`${uid}-${id}`}
              aria-selected={active}
              aria-controls={`${uid}-panel`}
              tabIndex={active ? 0 : -1}
              className={`tb-btn ${active ? 'on' : ''}`}
              onClick={() => onChange(id)}
            >
              {Icon && <Icon size={15} />}
              <span>{text}</span>
            </button>
          );
        })}
      </div>
      <style jsx>{`
        .tb-wrap { width: 100%; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; padding: 2px; }
        .tb-wrap::-webkit-scrollbar { display: none; }
        .tb { position: relative; display: inline-flex; gap: 4px; padding: 5px; border-radius: 999px; min-width: min-content; }
        .tb-btn {
          position: relative; display: inline-flex; align-items: center; gap: 7px; white-space: nowrap;
          padding: 9px 16px; border: none; border-radius: 999px; background: transparent; cursor: pointer;
          font: inherit; font-size: 0.84rem; font-weight: 600; color: var(--muted); transition: color 0.2s;
        }
        .compact .tb-btn { padding: 7px 12px; font-size: 0.78rem; }
        .tb-btn:hover { color: var(--text); }
        .tb-btn.on { color: var(--on-accent); }
        .tb-btn:focus-visible { outline: 2px solid var(--a2); outline-offset: 1px; }
        .tb-btn > :global(svg), .tb-btn > span { position: relative; z-index: 1; }
        .tb-ind {
          position: absolute; top: 5px; bottom: 5px; left: 0; border-radius: 999px; z-index: 0;
          transition: transform 0.35s cubic-bezier(.22,1,.36,1), width 0.35s cubic-bezier(.22,1,.36,1);
          background: linear-gradient(135deg, var(--a1), var(--a3)); box-shadow: 0 6px 18px -6px var(--border-glow);
        }
      `}</style>
    </div>
  );
}
