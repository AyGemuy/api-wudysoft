import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '@/components/Icons';
import { tokenizeJson, uid, row as newRow } from '@/src/lib/playgroundCore';
import s from '@/styles/playground.module.css';

export const cx = (...a) => a.filter(Boolean).join(' ');

/** Render ke <body> agar tidak terjebak stacking context (header/navbar melayang). */
export function Portal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

export function useMedia(query) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

export function MethodBadge({ m, tiny }) {
  return <span className={cx(s.method, s[`m_${m}`], tiny && s.methodTiny)}>{m === 'DELETE' ? 'DEL' : m}</span>;
}

export function Tabs({ tabs, value, onChange, right }) {
  return (
    <div className={s.tabs} role="tablist">
      <div className={s.tabsScroll}>
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={value === t.id} className={cx(s.tab, value === t.id && s.tabOn)} onClick={() => onChange(t.id)}>
            {t.label}
            {t.badge ? <i className={s.tabBadge}>{t.badge}</i> : null}
          </button>
        ))}
      </div>
      {right ? <div className={s.tabsRight}>{right}</div> : null}
    </div>
  );
}

export function Seg({ options, value, onChange, small }) {
  return (
    <div className={cx(s.seg, small && s.segSmall)}>
      {options.map((o) => (
        <button key={o.id} type="button" className={cx(s.segBtn, value === o.id && s.segOn)} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CopyBtn({ text, label = 'Salin', icon = true, compact }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={cx(s.ghost, compact && s.iconOnly)}
      title={label}
      aria-label={label}
      onClick={async () => {
        try { await navigator.clipboard.writeText(typeof text === 'function' ? text() : text); setDone(true); setTimeout(() => setDone(false), 1400); } catch {}
      }}
    >
      {icon && (done ? <Icons.Check size={13} /> : <Icons.Copy size={13} />)}
      {!compact && <span>{done ? 'Tersalin' : label}</span>}
    </button>
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <motion.div className={s.modalBack} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className={cx(s.modal, wide && s.modalWide)} role="dialog" aria-label={title} initial={{ y: 24, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 320 }}>
        <div className={s.modalHead}>
          <h3>{title}</h3>
          <button type="button" className={s.iconBtn} onClick={onClose} aria-label="Tutup"><Icons.Close size={18} /></button>
        </div>
        <div className={s.modalBody}>{children}</div>
        {footer ? <div className={s.modalFoot}>{footer}</div> : null}
      </motion.div>
    </motion.div>
  );
}

export function Empty({ icon: Icon = Icons.Zap, title, children }) {
  return (
    <div className={s.empty}>
      <span className={s.emptyIco}><Icon size={26} /></span>
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

/** Tabel key-value ala Postman. rows: [{id,on,key,value,desc,required,enumValues,type}] */
export function KVTable({ rows, onChange, files, withType, keyPh = 'Key', valuePh = 'Value', addLabel = 'Tambah baris', lockKeys }) {
  const update = (id, patch) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id) => onChange(rows.filter((r) => r.id !== id));
  return (
    <div className={s.kv}>
      {rows.length === 0 && <div className={s.kvEmpty}>Belum ada baris.</div>}
      {rows.map((r) => (
        <div key={r.id} className={cx(s.kvRow, !r.on && s.kvOff)}>
          <label className={s.kvCheck}>
            <input type="checkbox" checked={!!r.on} onChange={(e) => update(r.id, { on: e.target.checked })} aria-label="Aktifkan" />
          </label>
          <div className={s.kvKey}>
            <input className={s.in} value={r.key} placeholder={keyPh} readOnly={lockKeys} onChange={(e) => update(r.id, { key: e.target.value })} spellCheck={false} autoCapitalize="none" />
            {r.required ? <em className={s.req} title="Wajib">*</em> : null}
          </div>
          <div className={s.kvVal}>
            {withType && (
              <select className={cx(s.in, s.kvType)} value={r.type} onChange={(e) => update(r.id, { type: e.target.value })} aria-label="Tipe">
                <option value="text">Text</option>
                <option value="file">File</option>
              </select>
            )}
            {r.type === 'file' ? (
              <label className={cx(s.in, s.fileIn)}>
                <Icons.Upload size={13} />
                <span>{r.value || 'Pilih file…'}</span>
                <input type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { files.current[r.id] = f; update(r.id, { value: f.name, on: true }); } }} />
              </label>
            ) : r.enumValues?.length ? (
              <select className={s.in} value={r.value} onChange={(e) => update(r.id, { value: e.target.value, on: true })}>
                {!r.required && <option value="">—</option>}
                {r.enumValues.map((v) => <option key={String(v)} value={String(v)}>{String(v)}</option>)}
              </select>
            ) : (
              <input className={s.in} value={r.value} placeholder={valuePh} onChange={(e) => update(r.id, { value: e.target.value, ...(e.target.value && !r.on ? { on: true } : {}) })} spellCheck={false} autoCapitalize="none" />
            )}
          </div>
          {lockKeys ? <span /> : (
            <button type="button" className={s.iconBtn} onClick={() => remove(r.id)} aria-label="Hapus baris"><Icons.Trash2 size={15} /></button>
          )}
          {r.desc ? <div className={s.kvDesc}>{r.desc}{r.ptype ? <code>{r.ptype}</code> : null}</div> : null}
        </div>
      ))}
      {!lockKeys && (
        <button type="button" className={s.addRow} onClick={() => onChange([...rows, newRow({ on: true })])}>
          <Icons.Plus size={14} /> {addLabel}
        </button>
      )}
    </div>
  );
}

/** JSON berwarna / teks biasa dengan highlight pencarian. */
export function CodeView({ text, json, search, wrap, className }) {
  const body = useMemo(() => {
    const big = text.length > 400_000;
    if (search && search.length > 0) {
      const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = text.split(new RegExp(`(${esc})`, 'gi'));
      return parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>));
    }
    if (json && !big) return tokenizeJson(text).map((t, i) => <span key={i} className={s[`tk_${t.t}`]}>{t.v}</span>);
    return text;
  }, [text, json, search]);
  return <pre className={cx(s.code, wrap && s.codeWrap, className)}>{body}</pre>;
}

export { AnimatePresence, uid };
