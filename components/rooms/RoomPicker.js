import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Hash, LayoutGrid, List, MessageSquare, Search, User, Calendar, Copy, Check, RefreshCw, Users, ArrowUpRight } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { sound } from '@/src/lib/interactiveEffects';

const SORTS = [['updated', 'Aktivitas terbaru'], ['created', 'Terbaru dibuat'], ['oldest', 'Terlama'], ['name', 'Nama A–Z'], ['total', 'Pesan terbanyak']];
const PAIRS = [['var(--a1)', 'var(--a3)'], ['var(--a2)', 'var(--a1)'], ['var(--a3)', 'var(--a2)'], ['var(--a1)', 'var(--a2)']];
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const fmtDate = (d) => { try { return d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; } catch { return '—'; } };
const shortId = (r) => (r._id ? String(r._id).slice(-6).toUpperCase() : '—');

/** Foto grup (pp): gambar bila ada, selain itu monogram bergradasi sesuai tema. */
export function GroupAvatar({ room, size = 46 }) {
  const [bad, setBad] = useState(false);
  const [c1, c2] = PAIRS[hash(room.roomName) % PAIRS.length];
  const style = { display: 'grid', placeItems: 'center', flexShrink: 0, objectFit: 'cover', color: 'var(--on-accent)', fontWeight: 800, boxShadow: '0 8px 20px -8px var(--a1)', width: size, height: size, borderRadius: 'var(--r-dock-btn, 12px)', fontSize: size * 0.42 };
  if (room.avatar && !bad) return <img className="rp-ava" style={style} src={room.avatar} alt="" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
  return <span className="rp-ava" style={{ ...style, background: `linear-gradient(135deg, ${c1}, ${c2})` }} aria-hidden="true">{(room.roomName || '#')[0].toUpperCase()}</span>;
}

function IdChip({ room }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="rp-id" title="Salin ID grup" onClick={async (e) => { e.stopPropagation(); try { await navigator.clipboard.writeText(String(room._id || room.roomName)); setOk(true); setTimeout(() => setOk(false), 1200); } catch {} }}>
      {ok ? <Check size={11} /> : <Copy size={11} />} #{shortId(room)}
    </button>
  );
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 26 } }, exit: { opacity: 0, scale: 0.96, transition: { duration: 0.12 } } };

export default function RoomPicker({ onPick, refreshKey = 0 }) {
  const [view, setView] = useState('list');
  const [limit, setLimit] = useState(8);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('updated');
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const first = useRef(true);

  useEffect(() => { try { const v = localStorage.getItem('wd_rooms_view'); if (v === 'grid' || v === 'list') setView(v); const l = parseInt(localStorage.getItem('wd_rooms_limit'), 10); if (l) setLimit(l); } catch {} }, []);
  useEffect(() => { const t = setTimeout(() => { setDq(q.trim()); setPage(1); }, 280); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const res = await fetch(`/api/rooms?page=${page}&limit=${limit}&sort=${sort}&q=${encodeURIComponent(dq)}`);
      const json = await res.json();
      if (!json.success) throw new Error('x');
      setRows(json.data || []);
      setMeta({ total: json.meta?.total ?? json.data?.length ?? 0, pages: json.meta?.pages ?? 1 });
    } catch {
      setFailed(true);
      setRows([{ roomName: 'general', isGroup: true, total: 0, createdBy: '' }]);
      setMeta({ total: 1, pages: 1 });
    } finally { setLoading(false); first.current = false; }
  }, [page, limit, sort, dq]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const setV = (v) => { sound.playClick(); setView(v); try { localStorage.setItem('wd_rooms_view', v); } catch {} };
  const setL = (l) => { setLimit(l); setPage(1); try { localStorage.setItem('wd_rooms_limit', String(l)); } catch {} };
  const key = useMemo(() => `${view}-${page}-${limit}-${sort}-${dq}`, [view, page, limit, sort, dq]);

  const meta3 = (r) => [
    [User, 'Dibuat oleh', r.createdBy || '—'],
    [Calendar, 'Dibuat', fmtDate(r.createdAt)],
    [MessageSquare, 'Pesan', `${r.total ?? 0}`],
  ];

  return (
    <div className="rp">
      <div className="rp-tools">
        <label className="rp-search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari grup…" aria-label="Cari grup" autoComplete="off" spellCheck={false} /></label>
        <select className="rp-sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="Urutkan">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div className="rp-seg" role="group" aria-label="Tampilan">
          <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setV('list')} aria-pressed={view === 'list'} aria-label="Tampilan daftar"><List size={16} />{view === 'list' && <i className="rp-seg-bg" />}</button>
          <button type="button" className={view === 'grid' ? 'on' : ''} onClick={() => setV('grid')} aria-pressed={view === 'grid'} aria-label="Tampilan grid"><LayoutGrid size={16} />{view === 'grid' && <i className="rp-seg-bg" />}</button>
        </div>
        <button type="button" className="rp-refresh" onClick={() => { sound.playClick(); load(); }} aria-label="Muat ulang"><RefreshCw size={15} className={loading ? 'rp-spin' : ''} /></button>
      </div>

      {failed && <div className="rp-note">Daftar grup tidak dapat dimuat. Menampilkan grup bawaan.</div>}

      <motion.div key={key} variants={container} initial="hidden" animate="show" className={view === 'grid' ? 'rp-grid' : 'rp-list'} aria-busy={loading}>
          {rows.length === 0 && !loading && (
            <motion.div variants={item} className="rp-empty"><Users size={28} /><b>Grup tidak ditemukan</b><span>Coba kata kunci lain atau buat channel baru.</span></motion.div>
          )}
          {rows.map((r) => (
            <motion.div key={r.roomName} variants={item} className={`glass rp-card ${view}`} whileHover={{ y: -3 }} whileTap={{ scale: 0.985 }} role="button" tabIndex={0}
              onClick={() => { sound.playClick(); onPick(r); }} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick(r))} aria-label={`Buka grup ${r.roomName}`}>
              <GroupAvatar room={r} size={view === 'grid' ? 56 : 46} />
              <div className="rp-main">
                <div className="rp-title"><Hash size={14} /><b>{r.roomName}</b><IdChip room={r} /></div>
                <div className="rp-meta">
                  {meta3(r).map(([Ic, label, val]) => (<span key={label} title={label}><Ic size={12} /><em>{label}</em> {val}</span>))}
                </div>
              </div>
              <span className="rp-go" aria-hidden="true"><ArrowUpRight size={17} /></span>
            </motion.div>
          ))}
        </motion.div>

      <Pagination page={page} pages={meta.pages} total={meta.total} limit={limit} loading={loading} onPage={setPage} onLimit={setL} label="grup" sizes={[8, 12, 24, 48]} />

      <style jsx global>{`
        .rp { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; min-width: 0; }
        .rp-tools { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .rp-search { flex: 1 1 200px; min-width: 0; display: flex; align-items: center; gap: 8px; height: 42px; padding: 0 12px; border-radius: var(--r-input, 12px); border: 1px solid var(--border); background: var(--surface-2); color: var(--muted); }
        .rp-search:focus-within { border-color: var(--a2); }
        .rp-search input { flex: 1; min-width: 0; background: transparent; border: 0; outline: none; color: var(--text); font: inherit; font-size: .88rem; }
        .rp-sort { height: 42px; padding: 0 10px; border-radius: var(--r-input, 12px); border: 1px solid var(--border); background: var(--surface-2); color: var(--text); font: inherit; font-size: .8rem; }
        .rp-seg { display: flex; padding: 3px; gap: 2px; border-radius: var(--r-btn, 12px); border: 1px solid var(--border); background: var(--surface-2); }
        .rp-seg button { position: relative; width: 38px; height: 34px; display: grid; place-items: center; border: 0; background: transparent; color: var(--muted); cursor: pointer; border-radius: calc(var(--r-btn, 12px) - 2px); }
        .rp-seg button.on { color: var(--on-accent); }
        .rp-seg button > svg { position: relative; z-index: 1; }
        .rp-seg-bg { animation: rpseg .25s ease-out; position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(135deg, var(--a1), var(--a3)); }
        @keyframes rpseg { from { transform: scale(.6); opacity: 0; } to { transform: none; opacity: 1; } }
        .rp-refresh { width: 42px; height: 42px; display: grid; place-items: center; border-radius: var(--r-btn, 12px); border: 1px solid var(--border); background: var(--surface-2); color: var(--muted); cursor: pointer; }
        .rp-refresh:hover { color: var(--a2); border-color: var(--a2); }
        .rp-spin { animation: rpspin .8s linear infinite; } @keyframes rpspin { to { transform: rotate(360deg); } }
        .rp-note { font-size: .78rem; color: var(--muted); padding: 8px 12px; border: 1px dashed var(--border); border-radius: var(--r-btn, 12px); }
        .rp-list { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
        .rp-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
        .rp-card { position: relative; display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: var(--radius, 14px); border: 1px solid var(--border); background: color-mix(in srgb, var(--surface) 70%, transparent); backdrop-filter: blur(10px); cursor: pointer; min-width: 0; overflow: hidden; transition: border-color .2s, box-shadow .2s; }
        .rp-card::before { content: ''; position: absolute; inset: 0; background: radial-gradient(240px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--text) 7%, transparent), transparent 65%); opacity: 0; transition: opacity .25s; pointer-events: none; border-radius: inherit; }
        .rp-card:hover, .rp-card:focus-visible { border-color: color-mix(in srgb, var(--text) 24%, var(--border)); box-shadow: 0 16px 30px -22px rgba(0, 0, 0, 0.45); outline: none; }
        .rp-card:hover::before { opacity: 1; }
        .rp-card.grid { flex-direction: column; align-items: flex-start; gap: 12px; padding: 16px; }
        .rp-ava { display: grid; place-items: center; flex-shrink: 0; object-fit: cover; color: var(--on-accent); font-weight: 800; box-shadow: 0 8px 20px -8px var(--a1); }
        .rp-main { flex: 1; min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; width: 100%; }
        .rp-title { display: flex; align-items: center; gap: 6px; color: var(--a2); min-width: 0; flex-wrap: wrap; }
        .rp-title b { color: var(--text); font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
        .rp-id { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: var(--r-l); border: 1px solid var(--border); background: var(--surface-2); color: var(--muted); font-family: var(--font-mono); font-size: .64rem; cursor: pointer; }
        .rp-id:hover { color: var(--a2); border-color: var(--a2); }
        .rp-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: .74rem; color: var(--text); min-width: 0; }
        .rp-meta span { display: inline-flex; align-items: center; gap: 5px; min-width: 0; }
        .rp-meta svg { color: var(--a2); flex-shrink: 0; }
        .rp-meta em { font-style: normal; color: var(--muted); }
        .rp-card.grid .rp-meta { flex-direction: column; gap: 4px; }
        .rp-go { color: var(--muted); flex-shrink: 0; transition: transform .25s, color .2s; }
        .rp-card.grid .rp-go { position: absolute; top: 14px; right: 14px; }
        .rp-card:hover .rp-go { color: var(--a2); transform: translate(2px, -2px); }
        .rp-empty { grid-column: 1 / -1; display: grid; justify-items: center; gap: 6px; padding: 36px 12px; color: var(--muted); text-align: center; }
        .rp-empty b { color: var(--text); }
        @media (max-width: 560px) { .rp-meta em { display: none; } .rp-sort { flex: 1; } .rp-grid { grid-template-columns: 1fr 1fr; gap: 10px; } .rp-card.grid { padding: 12px; } }
        @media (max-width: 560px) { .rp-card.grid .rp-meta em { display: inline; } }
        @media (max-width: 380px) { .rp-grid { grid-template-columns: minmax(0, 1fr); } }
        html[data-anim='off'] .rp-spin { animation: none; }
      `}</style>
    </div>
  );
}
