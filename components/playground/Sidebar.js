import { useMemo, useState } from 'react';
import Pagination from '@/components/Pagination';
import { Icons } from '@/components/Icons';
import { MethodBadge, Seg, cx } from './ui';
import { statusTone } from '@/src/lib/playgroundCore';
import s from '@/styles/playground.module.css';

export default function Sidebar({ parsed, activeKey, activePath, onOpen, history, onOpenHistory, onClearHistory, onClose, specLabel }) {
  const [view, setView] = useState('endpoints');
  const [q, setQ] = useState('');
  const [hp, setHp] = useState(1);
  const HLIM = 12;
  const hPages = Math.max(1, Math.ceil(history.length / HLIM));
  const hCur = Math.min(hp, hPages);
  const [openMap, setOpenMap] = useState({}); // grup tertutup secara default
  const activeTag = useMemo(() => parsed.operations.find((o) => o.key === activeKey)?.tags[0], [parsed, activeKey]);
  const pathCount = useMemo(() => new Set(parsed.operations.map((o) => o.path)).size, [parsed]);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const map = new Map(); // tag → Map(path → { path, ops[] })
    for (const op of parsed.operations) {
      if (needle && !`${op.method} ${op.path} ${op.summary} ${op.tags.join(' ')}`.toLowerCase().includes(needle)) continue;
      const t = op.tags[0];
      if (!map.has(t)) map.set(t, new Map());
      const byPath = map.get(t);
      if (!byPath.has(op.path)) byPath.set(op.path, { path: op.path, ops: [] });
      byPath.get(op.path).ops.push(op);
    }
    // satu entri per path; metode GET diutamakan sebagai pembuka
    const ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    return [...map.entries()].map(([t, byPath]) => [t, [...byPath.values()].map((e) => ({ ...e, ops: e.ops.sort((a, b) => ORDER.indexOf(a.method) - ORDER.indexOf(b.method)) }))]);
  }, [parsed, q]);

  return (
    <aside className={s.sidebar} aria-label="Daftar endpoint">
      <div className={s.sbHead}>
        <div className={s.sbTitle}>
          <Icons.BookOpen size={16} />
          <div>
            <strong>{parsed.info.title || 'API'}</strong>
            <small>{specLabel} · v{parsed.info.version || '—'} · {pathCount} endpoint · {parsed.operations.length} metode</small>
          </div>
        </div>
        <button type="button" className={cx(s.iconBtn, s.onlyDrawer)} onClick={onClose} aria-label="Tutup daftar"><Icons.Close size={18} /></button>
      </div>

      <Seg small value={view} onChange={setView} options={[{ id: 'endpoints', label: 'Endpoint' }, { id: 'history', label: `Riwayat${history.length ? ` (${history.length})` : ''}` }]} />

      {view === 'endpoints' ? (
        <>
          <label className={s.search}>
            <Icons.Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari path, tag, method…" aria-label="Cari endpoint" />
            {q && <button type="button" onClick={() => setQ('')} aria-label="Hapus"><Icons.Close size={14} /></button>}
          </label>

          {!q && groups.length > 1 && (
            <div className={s.sbBulk}>
              <button type="button" onClick={() => setOpenMap(Object.fromEntries(groups.map(([t]) => [t, true])))}>Buka semua</button>
              <span>·</span>
              <button type="button" onClick={() => setOpenMap(Object.fromEntries(groups.map(([t]) => [t, false])))}>Tutup semua</button>
            </div>
          )}

          <div className={s.sbScroll}>
            {groups.length === 0 && <div className={s.kvEmpty}>Tidak ada endpoint cocok.</div>}
            {groups.map(([tag, ops]) => {
              const isOpen = q ? true : openMap[tag] !== undefined ? openMap[tag] : tag === activeTag;
              const isClosed = !isOpen;
              return (
                <div key={tag} className={s.group}>
                  <button type="button" className={s.groupHead} onClick={() => setOpenMap((m) => ({ ...m, [tag]: !isOpen }))} aria-expanded={isOpen}>
                    <Icons.ChevronRight size={14} className={cx(s.chev, isOpen && s.chevOpen)} />
                    <Icons.Folder size={14} />
                    <span>{tag}</span>
                    <i>{ops.length}</i>
                  </button>
                  {isOpen && (
                    <ul className={s.opList}>
                      {ops.map((e) => {
                        const main = e.ops[0];
                        const on = activePath === e.path;
                        return (
                          <li key={e.path}>
                            <button type="button" className={cx(s.op, on && s.opOn, main.deprecated && s.opDep)} onClick={() => onOpen(e.ops.find((o) => o.key === activeKey) || main)}>
                              <span className={s.opMethods}>{e.ops.map((o) => <MethodBadge key={o.key} m={o.method} tiny />)}</span>
                              <span className={s.opText}>
                                <b>{e.path}</b>
                                <small>{(main.summary || '').replace(/^(Ambil|Kirim)\s+/i, '') || main.tags[0]}</small>
                              </span>
                              {e.ops.some((o) => o.secure) && <Icons.Lock size={12} className={s.opLock} />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className={s.sbScroll}>
          {history.length === 0 ? (
            <div className={s.kvEmpty}>Belum ada riwayat. Kirim request untuk mulai.</div>
          ) : (
            <>
              <button type="button" className={s.ghost} onClick={onClearHistory}><Icons.Trash2 size={13} /> Bersihkan riwayat</button>
              <ul className={s.opList}>
                {history.slice((hCur - 1) * HLIM, hCur * HLIM).map((h) => (
                  <li key={h.id}>
                    <button type="button" className={s.op} onClick={() => onOpenHistory(h)}>
                      <MethodBadge m={h.method} tiny />
                      <span className={s.opText}>
                        <b>{h.title}</b>
                        <small>{new Date(h.ts).toLocaleTimeString()} · {h.ms} ms</small>
                      </span>
                      <span className={cx(s.statusMini, s[`t_${statusTone(h.status)}`])}>{h.status || 'ERR'}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <Pagination page={hCur} pages={hPages} total={history.length} limit={HLIM} onPage={setHp} label="riwayat" />
            </>
          )}
        </div>
      )}
    </aside>
  );
}
