import { useMemo, useState } from 'react';
import { Icons } from '@/components/Icons';
import { MethodBadge, Seg, cx } from './ui';
import { statusTone } from '@/src/lib/playgroundCore';
import s from '@/styles/playground.module.css';

export default function Sidebar({ parsed, activeKey, onOpen, history, onOpenHistory, onClearHistory, onClose, specLabel }) {
  const [view, setView] = useState('endpoints');
  const [q, setQ] = useState('');
  const [closed, setClosed] = useState({});

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const map = new Map();
    for (const op of parsed.operations) {
      if (needle && !`${op.method} ${op.path} ${op.summary} ${op.tags.join(' ')}`.toLowerCase().includes(needle)) continue;
      for (const t of op.tags.slice(0, 1)) {
        if (!map.has(t)) map.set(t, []);
        map.get(t).push(op);
      }
    }
    return [...map.entries()];
  }, [parsed, q]);

  return (
    <aside className={s.sidebar} aria-label="Daftar endpoint">
      <div className={s.sbHead}>
        <div className={s.sbTitle}>
          <Icons.BookOpen size={16} />
          <div>
            <strong>{parsed.info.title || 'API'}</strong>
            <small>{specLabel} · v{parsed.info.version || '—'} · {parsed.operations.length} operasi</small>
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

          <div className={s.sbScroll}>
            {groups.length === 0 && <div className={s.kvEmpty}>Tidak ada endpoint cocok.</div>}
            {groups.map(([tag, ops]) => {
              const isClosed = closed[tag] && !q;
              return (
                <div key={tag} className={s.group}>
                  <button type="button" className={s.groupHead} onClick={() => setClosed((c) => ({ ...c, [tag]: !c[tag] }))} aria-expanded={!isClosed}>
                    <Icons.ChevronRight size={14} className={cx(s.chev, !isClosed && s.chevOpen)} />
                    <Icons.Folder size={14} />
                    <span>{tag}</span>
                    <i>{ops.length}</i>
                  </button>
                  {!isClosed && (
                    <ul className={s.opList}>
                      {ops.map((op) => (
                        <li key={op.key}>
                          <button type="button" className={cx(s.op, activeKey === op.key && s.opOn, op.deprecated && s.opDep)} onClick={() => onOpen(op)}>
                            <MethodBadge m={op.method} tiny />
                            <span className={s.opText}>
                              <b>{op.summary || op.path}</b>
                              <small>{op.path}</small>
                            </span>
                            {op.secure && <Icons.Lock size={12} className={s.opLock} />}
                          </button>
                        </li>
                      ))}
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
                {history.map((h) => (
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
            </>
          )}
        </div>
      )}
    </aside>
  );
}
