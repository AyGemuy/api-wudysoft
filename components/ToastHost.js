import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { TOAST_EVENT, CONFIRM_EVENT } from '@/src/lib/toast';

const ICON = { ok: CheckCircle2, err: AlertCircle, warn: AlertTriangle, info: Info };
const MAX = 4;

function ToastItem({ t, onClose }) {
  const Icon = ICON[t.type] || Info;
  const total = t.duration ?? (t.type === 'err' ? 5200 : 3200);
  const [paused, setPaused] = useState(false);
  const left = useRef(total);
  const last = useRef(0);

  useEffect(() => {
    if (!total || total === Infinity) return undefined;
    if (paused) return undefined;
    last.current = Date.now();
    const timer = setTimeout(() => onClose(t.id), left.current);
    return () => { clearTimeout(timer); left.current -= Date.now() - last.current; };
  }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      layout
      className={`wd-toast wd-${t.type}`}
      data-type={t.type}
      role={t.type === 'err' ? 'alert' : 'status'}
      initial={{ opacity: 0, x: 40, scale: 0.94 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="wd-ico">{t.icon || <Icon size={17} />}</span>
      <div className="wd-main">
        {t.title && <b>{t.title}</b>}
        <span className="wd-msg">{t.message}</span>
        {t.actions?.length > 0 && (
          <div className="wd-acts">
            {t.actions.map((a, i) => (a.href ? (
              <a key={i} className={`wd-act ${a.primary ? 'primary' : ''}`} href={a.href} target="_blank" rel="noopener noreferrer" onClick={() => { a.onClick?.(); if (a.close !== false) onClose(t.id); }}>
                {a.icon}{a.label}
              </a>
            ) : (
              <button key={i} type="button" className={`wd-act ${a.primary ? 'primary' : ''}`} onClick={() => { a.onClick?.(); if (a.close !== false) onClose(t.id); }}>
                {a.icon}{a.label}
              </button>
            )))}
          </div>
        )}
      </div>
      <button type="button" className="wd-x" onClick={() => onClose(t.id)} aria-label="Tutup notifikasi"><X size={14} /></button>
      {total && total !== Infinity && <span className="wd-bar" style={{ animationDuration: `${total}ms`, animationPlayState: paused ? 'paused' : 'running' }} />}
    </motion.div>
  );
}

/** Tempat semua toast & dialog konfirmasi tampil. Dipasang sekali di _app.js. */
export default function ToastHost() {
  const [list, setList] = useState([]);
  const [ask, setAsk] = useState(null);
  const seen = useRef(new Map());

  const close = useCallback((id) => {
    setList((l) => {
      const t = l.find((x) => x.id === id);
      try { t?.onClose?.(); } catch {}
      return l.filter((x) => x.id !== id);
    });
  }, []);

  useEffect(() => {
    window.__wdToastHost = true;
    const onToast = (e) => {
      const d = e.detail || {};
      if (d.dismiss) return close(d.id);
      // pesan identik yang muncul beruntun (<900 ms) diabaikan agar tidak menumpuk
      const key = `${d.type}|${d.message}`;
      const now = Date.now();
      if (!d.id?.startsWith?.('keep') && now - (seen.current.get(key) || 0) < 900) return;
      seen.current.set(key, now);
      setList((l) => [...l.filter((x) => x.id !== d.id), d].slice(-MAX));
    };
    const onConfirm = (e) => setAsk(e.detail);
    window.addEventListener(TOAST_EVENT, onToast);
    window.addEventListener(CONFIRM_EVENT, onConfirm);
    return () => { window.__wdToastHost = false; window.removeEventListener(TOAST_EVENT, onToast); window.removeEventListener(CONFIRM_EVENT, onConfirm); };
  }, [close]);

  const answer = useCallback((v) => { setAsk((a) => { a?.resolve?.(v); return null; }); }, []);
  useEffect(() => {
    if (!ask) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') answer(false); if (e.key === 'Enter') answer(true); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ask, answer]);

  return (
    <>
      <div className="wd-stack" aria-live="polite">
        <AnimatePresence initial={false}>
          {list.map((t) => <ToastItem key={t.id} t={t} onClose={close} />)}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {ask && (
          <motion.div className="wd-cf-back" data-sound="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => answer(false)}>
            <motion.div className={`wd-cf glass ${ask.danger ? 'danger' : ''}`} role="alertdialog" aria-modal="true" aria-label={ask.title || 'Konfirmasi'}
              initial={{ opacity: 0, y: 18, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }} onClick={(e) => e.stopPropagation()}>
              <span className="wd-cf-ico">{ask.danger ? <AlertTriangle size={20} /> : <Info size={20} />}</span>
              <div className="wd-cf-t">
                <b>{ask.title || (ask.danger ? 'Yakin?' : 'Konfirmasi')}</b>
                <p>{ask.message}</p>
              </div>
              <div className="wd-cf-a">
                <button type="button" className="btn" onClick={() => answer(false)}>{ask.cancelLabel || 'Batal'}</button>
                <button type="button" className={`btn primary ${ask.danger ? 'wd-danger' : ''}`} onClick={() => answer(true)} autoFocus>{ask.okLabel || 'Ya, lanjut'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .wd-stack { position: fixed; z-index: 10000; top: calc(78px + env(safe-area-inset-top, 0px)); right: 16px; width: min(380px, calc(100vw - 32px)); display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; pointer-events: none; }
        .wd-toast { --tc: var(--a2); pointer-events: auto; position: relative; overflow: hidden; display: flex; align-items: flex-start; gap: 10px; padding: 11px 36px 12px 12px;
          border-radius: var(--r-m); border: 1px solid color-mix(in srgb, var(--tc) 42%, var(--border));
          background: linear-gradient(135deg, color-mix(in srgb, var(--tc) 14%, var(--surface)), var(--surface));
          backdrop-filter: blur(18px) saturate(1.2); -webkit-backdrop-filter: blur(18px) saturate(1.2);
          color: var(--text); font-size: .84rem; line-height: 1.42; box-shadow: 0 14px 38px -14px rgba(0,0,0,.55), inset 1px 1px 0 color-mix(in srgb, #fff 12%, transparent); }
        .wd-toast.wd-ok { --tc: var(--ok, #22c55e); }
        .wd-toast.wd-err { --tc: var(--err, #ef4444); }
        .wd-toast.wd-warn { --tc: var(--warn, #f59e0b); }
        .wd-toast.wd-info { --tc: var(--a2); }
        .wd-ico { flex: none; width: 28px; height: 28px; display: grid; place-items: center; border-radius: var(--r-s, 8px); color: var(--tc); background: color-mix(in srgb, var(--tc) 16%, transparent); border: 1px solid color-mix(in srgb, var(--tc) 32%, transparent); }
        .wd-main { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 2px; padding-top: 3px; }
        .wd-main b { font-size: .86rem; }
        .wd-msg { overflow-wrap: anywhere; white-space: pre-wrap; }
        .wd-x { position: absolute; top: 7px; right: 7px; width: 24px; height: 24px; display: grid; place-items: center; border: 0; border-radius: 50%; background: transparent; color: var(--muted); cursor: pointer; }
        .wd-x:hover { color: var(--text); background: color-mix(in srgb, var(--text) 10%, transparent); }
        .wd-acts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .wd-act { display: inline-flex; align-items: center; gap: 5px; text-decoration: none; padding: 5px 11px; border-radius: var(--r-btn, 10px); border: 1px solid var(--border); background: color-mix(in srgb, var(--text) 6%, transparent); color: var(--text); font: inherit; font-size: .74rem; font-weight: 700; cursor: pointer; }
        .wd-act.primary { color: var(--on-accent); border-color: transparent; background: linear-gradient(135deg, var(--a1), var(--a3)); }
        .wd-bar { position: absolute; left: 0; bottom: 0; height: 3px; width: 100%; background: var(--tc); opacity: .75; transform-origin: left; animation: wd-bar linear forwards; }
        @keyframes wd-bar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        .wd-cf-back { position: fixed; inset: 0; z-index: 10001; display: grid; place-items: center; padding: 16px; background: rgba(0,0,0,.5); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
        .wd-cf { width: min(400px, 100%); padding: 18px; display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; border-radius: var(--r-modal, 16px); box-shadow: 0 30px 70px -20px rgba(0,0,0,.7); }
        .wd-cf-ico { grid-row: span 2; width: 40px; height: 40px; display: grid; place-items: center; border-radius: var(--r-m); color: var(--a2); background: color-mix(in srgb, var(--a2) 15%, transparent); border: 1px solid color-mix(in srgb, var(--a2) 32%, transparent); }
        .wd-cf.danger .wd-cf-ico { color: var(--err, #ef4444); background: color-mix(in srgb, var(--err, #ef4444) 15%, transparent); border-color: color-mix(in srgb, var(--err, #ef4444) 35%, transparent); }
        .wd-cf-t b { font-size: 1rem; }
        .wd-cf-t p { margin: 4px 0 0; font-size: .86rem; color: var(--muted); overflow-wrap: anywhere; white-space: pre-wrap; }
        .wd-cf-a { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
        .btn.wd-danger { background: linear-gradient(135deg, var(--err, #ef4444), color-mix(in srgb, var(--err, #ef4444) 70%, #000)); color: #fff; }
        @media (max-width: 560px) { .wd-stack { right: 50%; transform: translateX(50%); top: calc(64px + env(safe-area-inset-top, 0px)); } }
        html[data-anim='off'] .wd-bar { animation: none; display: none; }
        @media (prefers-reduced-motion: reduce) { .wd-bar { animation: none; display: none; } }
      `}</style>
    </>
  );
}
