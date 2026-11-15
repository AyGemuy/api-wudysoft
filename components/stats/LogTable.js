import { useMemo, useState } from 'react';
import { Icons } from '@/components/Icons';
import { MethodBadge, cx } from '@/components/playground/ui';
import { formatBytes, statusTone } from '@/src/lib/playgroundCore';
import ps from '@/styles/playground.module.css';
import s from '@/styles/stats.module.css';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const CLASSES = ['2xx', '3xx', '4xx', '5xx'];
const klass = (st) => `${Math.floor(st / 100)}xx`;

export default function LogTable({ events, now, onOpen, empty }) {
  const [q, setQ] = useState('');
  const [methods, setMethods] = useState(new Set());
  const [classes, setClasses] = useState(new Set());

  const toggle = (set, setSet, v) => setSet((p) => { const n = new Set(p); n.has(v) ? n.delete(v) : n.add(v); return n; });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return events.filter((e) => {
      if (methods.size && !methods.has(e.method)) return false;
      if (classes.size && !classes.has(klass(e.status))) return false;
      if (needle && !`${e.method} ${e.path} ${e.ip} ${e.status}`.toLowerCase().includes(needle)) return false;
      return true;
    }).slice(0, 200);
  }, [events, q, methods, classes]);

  return (
    <div className={s.logBox}>
      <div className={s.filters}>
        <label className={ps.search}>
          <Icons.Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter path, IP, status…" aria-label="Filter log" />
          {q && <button type="button" onClick={() => setQ('')} aria-label="Hapus"><Icons.Close size={14} /></button>}
        </label>
        <div className={s.chipRow}>
          {METHODS.map((m) => <button key={m} type="button" className={cx(s.fchip, methods.has(m) && s.fchipOn)} onClick={() => toggle(methods, setMethods, m)}>{m}</button>)}
        </div>
        <div className={s.chipRow}>
          {CLASSES.map((c) => <button key={c} type="button" className={cx(s.fchip, classes.has(c) && s.fchipOn)} onClick={() => toggle(classes, setClasses, c)}>{c}</button>)}
        </div>
      </div>

      <div className={s.tableHead} aria-hidden="true">
        <span>Waktu</span><span>Method</span><span>Path</span><span>Status</span><span>Durasi</span><span className={s.colSize}>Ukuran</span><span className={s.colIp}>IP</span>
      </div>

      <div className={s.rows} role="list">
        {rows.length === 0 && <div className={s.noRows}>{empty}</div>}
        {rows.map((e) => {
          const fresh = now - e.ts < 1600;
          const tone = statusTone(e.status);
          return (
            <button key={e.id} type="button" role="listitem" className={cx(s.row, fresh && s.rowNew)} onClick={() => onOpen(e)}>
              <span className={s.cTime}>{new Date(e.ts).toLocaleTimeString([], { hour12: false })}</span>
              <span><MethodBadge m={e.method} tiny /></span>
              <span className={s.cPath}>{e.path}{e.query && Object.keys(e.query).length ? <em>?{Object.keys(e.query).join('&')}</em> : null}</span>
              <span><b className={cx(s.stat, ps[`t_${tone}`])}>{e.status}</b></span>
              <span className={s.cMs}><i style={{ width: `${Math.min(100, (e.ms / 600) * 100)}%` }} className={e.ms > 400 ? s.msSlow : ''} />{e.ms}<small>ms</small></span>
              <span className={s.colSize}>{formatBytes(e.res?.bytes)}</span>
              <span className={s.colIp}>{e.ip}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
