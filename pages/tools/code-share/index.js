import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Plus, Trash2, Copy, ThumbsUp, ThumbsDown, Eye, Search, RefreshCw, Check, X, ExternalLink } from 'lucide-react';
import Seo from '@/components/Seo';
import { sound } from '@/src/lib/interactiveEffects';
import { timeAgo, copyText } from '@/src/lib/timeAgo';
import { Reveal, Stagger, Item, TextReveal, Magnetic } from '@/components/motion';

const API = '/api/code-share';
const TAGS = ['JavaScript', 'TypeScript', 'Python', 'PHP', 'HTML', 'CSS', 'JSON', 'Bash', 'SQL', 'Java', 'C/C++', 'Go', 'Rust', 'Other'];
const SORTS = [
  { v: 'createdAt', label: 'Terbaru' },
  { v: 'likes', label: 'Terpopuler (suka)' },
  { v: 'views', label: 'Paling dilihat' },
];
const EMPTY = { fileName: '', tag: 'JavaScript', code: '', author: '' };

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch { return {}; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

async function req(method, body, qs) {
  const r = await fetch(method === 'GET' ? `${API}?${new URLSearchParams(qs)}` : API, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(d?.message || `Permintaan gagal (${r.status})`);
  return d;
}

export default function CodeSharePage() {
  const { data: session } = useSession();
  const me = session?.user && !session.user.isGuest ? session.user.name : session?.user?.name || '';
  const formRef = useRef(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [open, setOpen] = useState(null);
  const [votes, setVotes] = useState({});
  const [mine, setMine] = useState({});
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => { setVotes(store.get('wd_cs_votes')); setMine(store.get('wd_cs_mine')); }, []);

  const flash = (message, type = 'ok') => { setToast({ message, type }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const qs = { sortBy };
      if (search.trim()) qs.search = search.trim();
      if (tag) qs.tag = tag;
      const d = await req('GET', null, qs);
      setItems(Array.isArray(d) ? d : []);
    } catch (e) {
      setLoadErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, tag, sortBy]);

  // debounce pencarian
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const author = (form.author || me || '').trim();
    if (!author || !form.fileName.trim() || !form.code.trim()) return flash('Nama, nama file, dan kode wajib diisi.', 'err');
    setBusy(true);
    sound.playClick();
    try {
      const d = await req('POST', { author, fileName: form.fileName.trim(), tag: form.tag, code: form.code });
      const next = { ...mine, [d.code._id]: 1 };
      setMine(next); store.set('wd_cs_mine', next);
      setItems((l) => [d.code, ...l]);
      setForm({ ...EMPTY, author: form.author });
      setShowForm(false);
      sound.playBeep();
      flash('Kode dibagikan.');
    } catch (err) {
      flash(err.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const vote = async (it, action) => {
    if (votes[it._id]) return flash('Kamu sudah memberi suara untuk kode ini.', 'err');
    sound.playClick();
    try {
      const d = await req('PUT', { id: it._id, action });
      setItems((l) => l.map((x) => (x._id === it._id ? d.code : x)));
      const next = { ...votes, [it._id]: action };
      setVotes(next); store.set('wd_cs_votes', next);
    } catch (err) {
      flash(err.message, 'err');
    }
  };

  const toggleOpen = async (it) => {
    const opening = open !== it._id;
    setOpen(opening ? it._id : null);
    if (opening && !sessionStorage.getItem(`wd_cs_v_${it._id}`)) {
      try {
        sessionStorage.setItem(`wd_cs_v_${it._id}`, '1');
        const d = await req('PUT', { id: it._id, action: 'view' });
        setItems((l) => l.map((x) => (x._id === it._id ? d.code : x)));
      } catch {}
    }
  };

  const remove = async (id) => {
    try {
      await req('DELETE', { id });
      setItems((l) => l.filter((x) => x._id !== id));
      flash('Kode dihapus.');
    } catch (err) {
      flash(err.message, 'err');
    } finally {
      setConfirmDel(null);
    }
  };

  const link = (id) => `${window.location.origin}/tools/code-share/${id}`;
  const doCopy = async (text, msg) => flash((await copyText(text)) ? msg : 'Tidak bisa menyalin.');
  const canDelete = (it) => Boolean(mine[it._id]) || (me && it.author === me);

  return (
    <>
      <Seo
        title="Code Share — bagikan potongan kode"
        path="/tools/code-share"
        label="CODE SHARE"
        description="Bagikan potongan kode, cari berdasarkan nama atau bahasa, beri suka, dan kirim tautan dengan preview otomatis."
      />

      <div className="cs-page">
        <header className="cs-head">
          <div>
            <Reveal variant="down">
              <div className="badge ok" style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Code2 size={14} color="var(--a2)" /> <span>CODE SHARE</span>
              </div>
            </Reveal>
            <h1><TextReveal text="Code Share" by="char" /></h1>
            <Reveal as="p" variant="blur" delay={0.15}>Bagikan potongan kode dan temukan milik orang lain.</Reveal>
          </div>
          <Reveal variant="right" delay={0.2}>
            <Magnetic>
              <button className="btn primary" onClick={() => { sound.playClick(); setShowForm((v) => !v); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }}>
                <Plus size={16} /> {showForm ? 'Tutup form' : 'Bagikan kode'}
              </button>
            </Magnetic>
          </Reveal>
        </header>

        <AnimatePresence>
          {toast && (
            <motion.div className={`cs-toast ${toast.type}`} initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {toast.type === 'err' ? <X size={16} /> : <Check size={16} />} {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showForm && (
            <motion.section ref={formRef} className="glass card cs-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <form onSubmit={submit}>
                <div className="cs-row">
                  <div className="field">
                    <label htmlFor="cs-author">Nama kamu</label>
                    <input id="cs-author" className="input" maxLength={40} value={form.author || me} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Anonim" />
                  </div>
                  <div className="field">
                    <label htmlFor="cs-file">Nama file</label>
                    <input id="cs-file" className="input" maxLength={120} value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} placeholder="contoh: debounce.js" />
                  </div>
                  <div className="field">
                    <label htmlFor="cs-tag">Bahasa</label>
                    <select id="cs-tag" className="input" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}>
                      {TAGS.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="cs-code">Kode</label>
                  <textarea id="cs-code" className="input cs-mono" rows={12} spellCheck={false} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Tempel kode di sini…" />
                </div>
                <div className="cs-actions">
                  <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Membagikan…' : 'Bagikan'}</button>
                  <button className="btn" type="button" onClick={() => setShowForm(false)}>Batal</button>
                </div>
              </form>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="cs-filters">
          <div className="cs-search">
            <Search size={15} />
            <input className="input" placeholder="Cari nama file…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari kode" />
          </div>
          <select className="input cs-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Urutkan">
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
          <button className="btn" onClick={() => { sound.playClick(); load(); }} disabled={loading} aria-label="Muat ulang"><RefreshCw size={14} /></button>
        </section>
        <div className="cs-tags">
          {['', ...TAGS].map((t) => (
            <button key={t || 'all'} className={`cs-chip ${tag === t ? 'on' : ''}`} onClick={() => setTag(t)}>{t || 'Semua'}</button>
          ))}
        </div>

        {loadErr && <div className="alert">{loadErr}</div>}
        {loading && !items.length && <div className="badge">Memuat…</div>}
        {!loading && !loadErr && !items.length && <div className="glass card cs-empty">Belum ada kode{search || tag ? ' yang cocok' : ''}. Jadilah yang pertama berbagi!</div>}

        <Stagger className="cs-list" cycle gap={0.06} amount={0.05}>
          {items.map((it, idx) => (
            <Item as="article" key={it._id} index={idx} layout className="glass card cs-item mo-lift">
              <div className="cs-item-head">
                <div className="cs-titlebox">
                  <Link href={`/tools/code-share/${it._id}`} className="cs-title">{it.fileName}</Link>
                  <small>oleh <b>{it.author}</b> · {timeAgo(it.createdAt)}</small>
                </div>
                <span className="badge">{it.tag}</span>
              </div>

              <pre className={`cs-code ${open === it._id ? 'open' : ''}`}><code>{open === it._id ? it.code : it.code.split('\n').slice(0, 6).join('\n')}</code></pre>
              {it.code.split('\n').length > 6 && (
                <button className="cs-more" onClick={() => toggleOpen(it)}>{open === it._id ? 'Ciutkan' : `Tampilkan semua (${it.code.split('\n').length} baris)`}</button>
              )}

              <div className="cs-bar">
                <div className="cs-stats">
                  <button className={`cs-vote ${votes[it._id] === 'like' ? 'on' : ''}`} onClick={() => vote(it, 'like')} aria-label="Suka"><ThumbsUp size={14} /> {it.likes}</button>
                  <button className={`cs-vote ${votes[it._id] === 'dislike' ? 'on bad' : ''}`} onClick={() => vote(it, 'dislike')} aria-label="Tidak suka"><ThumbsDown size={14} /> {it.dislikes}</button>
                  <span className="cs-views"><Eye size={14} /> {it.views}</span>
                </div>
                <div className="cs-actions">
                  <button className="btn" onClick={() => doCopy(it.code, 'Kode disalin.')} aria-label="Salin kode"><Copy size={14} /></button>
                  <button className="btn" onClick={() => doCopy(link(it._id), 'Tautan disalin.')} aria-label="Salin tautan"><ExternalLink size={14} /></button>
                  {canDelete(it) && (confirmDel === it._id ? (
                    <>
                      <button className="btn cs-danger" onClick={() => remove(it._id)}>Ya, hapus</button>
                      <button className="btn" onClick={() => setConfirmDel(null)}>Batal</button>
                    </>
                  ) : (
                    <button className="btn cs-danger" onClick={() => setConfirmDel(it._id)} aria-label="Hapus"><Trash2 size={14} /></button>
                  ))}
                </div>
              </div>
            </Item>
          ))}
        </Stagger>
      </div>

      <style jsx>{`
        .cs-page { width: min(980px, 100%); margin: 0 auto; display: grid; gap: 16px; padding-bottom: 24px; }
        .cs-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
        :global(.cs-form) { overflow: hidden; }
        :global(.cs-form) form { display: grid; gap: 12px; }
        .cs-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
        .cs-mono { font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.5; resize: vertical; min-height: 180px; tab-size: 2; }
        .cs-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .cs-filters { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .cs-search { flex: 1 1 220px; display: flex; align-items: center; gap: 8px; }
        .cs-search :global(.input) { flex: 1; }
        .cs-sort { flex: 0 1 190px; }
        .cs-tags { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
        .cs-tags::-webkit-scrollbar { display: none; }
        .cs-chip { flex-shrink: 0; padding: 6px 12px; border-radius: var(--r-chip, 8px); border: 1px solid var(--border); background: transparent; color: var(--muted); font-size: 0.76rem; cursor: pointer; }
        .cs-chip.on { color: var(--a2); border-color: var(--a2); background: color-mix(in srgb, var(--a2) 12%, transparent); }
        :global(.cs-list) { display: grid; gap: 14px; }
        :global(.cs-item) { display: grid; gap: 10px; min-width: 0; }
        .cs-item-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .cs-titlebox { display: grid; gap: 2px; min-width: 0; }
        .cs-titlebox :global(.cs-title) { font-weight: 700; color: var(--text); text-decoration: none; overflow-wrap: anywhere; }
        .cs-titlebox :global(.cs-title:hover) { color: var(--a2); }
        .cs-titlebox small { color: var(--muted); font-size: 0.72rem; }
        .cs-code { margin: 0; padding: 12px; border-radius: 10px; overflow: auto; max-height: 150px; font-family: var(--font-mono); font-size: 0.76rem; line-height: 1.5; background: color-mix(in srgb, var(--bg1) 55%, transparent); border: 1px solid var(--border); tab-size: 2; }
        .cs-code.open { max-height: 480px; }
        .cs-more { justify-self: start; background: none; border: none; color: var(--a2); font-size: 0.76rem; cursor: pointer; padding: 0; }
        .cs-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
        .cs-stats { display: flex; gap: 8px; align-items: center; }
        .cs-vote { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--muted); font-size: 0.76rem; cursor: pointer; }
        .cs-vote.on { color: var(--a2); border-color: var(--a2); }
        .cs-vote.on.bad { color: #f87171; border-color: #f87171; }
        .cs-views { display: inline-flex; align-items: center; gap: 5px; font-size: 0.76rem; color: var(--muted); }
        .cs-empty { text-align: center; color: var(--muted); }
        :global(.cs-danger) { color: #f87171; }
        .cs-toast { position: fixed; top: 84px; right: 16px; z-index: 9999; display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px; color: #fff; font-size: 0.84rem; font-weight: 600; background: rgba(16, 124, 16, 0.95); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35); }
        .cs-toast.err { background: rgba(196, 43, 28, 0.95); }
      `}</style>
    </>
  );
}
