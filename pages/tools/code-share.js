import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Code2, Plus, Search, RefreshCw, Copy, ThumbsUp, ThumbsDown, Eye, Trash2, Share2, Download, Send } from 'lucide-react';
import Seo from '@/components/Seo';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { sound } from '@/src/lib/interactiveEffects';
import { addOwned, getOwned, removeOwned, getVotes, setVote } from '@/src/lib/ownedCodes';

const API = '/api/code-share';
const TAGS = ['JavaScript', 'TypeScript', 'Python', 'PHP', 'HTML', 'CSS', 'JSON', 'Bash', 'SQL', 'Java', 'C++', 'Go', 'Rust', 'Lainnya'];
const SORTS = [{ v: 'createdAt', label: 'Terbaru' }, { v: 'likes', label: 'Terpopuler' }, { v: 'views', label: 'Paling dilihat' }];

const api = async (method, body, qs = '') => {
  const res = await fetch(`${API}${qs}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
};
const ago = (d) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(d)) / 1000));
  if (s < 60) return `${s} dtk lalu`;
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
};

export default function CodeSharePage() {
  const { data: session } = useSession();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [tag, setTag] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ author: '', fileName: '', tag: 'JavaScript', code: '' });
  const [saving, setSaving] = useState(false);
  const [owned, setOwned] = useState([]);
  const [votes, setVotes] = useState({});
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, toastNode] = useToast();

  useEffect(() => {
    setOwned(getOwned());
    setVotes(getVotes());
    try { setForm((f) => ({ ...f, author: localStorage.getItem('wudysoft_code_author') || '' })); } catch {}
  }, []);
  useEffect(() => {
    if (session?.user?.name) setForm((f) => (f.author ? f : { ...f, author: session.user.name }));
  }, [session]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ sortBy });
      if (debounced) qs.set('search', debounced);
      if (tag) qs.set('tag', tag);
      const data = await api('GET', null, `?${qs}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Gagal memuat snippet');
    } finally {
      setLoading(false);
    }
  }, [debounced, tag, sortBy]);
  useEffect(() => { load(); }, [load]);

  const copy = async (text, msg) => { try { await navigator.clipboard.writeText(text); toast(msg); } catch { toast('Gagal menyalin', 'err'); } };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const out = await api('POST', { author: form.author.trim(), fileName: form.fileName.trim(), tag: form.tag, code: form.code });
      addOwned(out.code._id);
      setOwned(getOwned());
      try { localStorage.setItem('wudysoft_code_author', form.author.trim()); } catch {}
      setOpen(false);
      setForm((f) => ({ ...f, fileName: '', code: '' }));
      sound.playBeep();
      toast('Snippet dibagikan');
      load();
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  const vote = async (item, kind) => {
    if (votes[item._id]) return toast('Kamu sudah memberi suara untuk snippet ini', 'err');
    sound.playClick();
    try {
      const out = await api('PUT', { id: item._id, action: kind });
      setItems((list) => list.map((x) => (x._id === item._id ? out.code : x)));
      setVote(item._id, kind);
      setVotes(getVotes());
    } catch (err) { toast(err.message, 'err'); }
  };

  const doDelete = async () => {
    const it = confirmDel;
    setConfirmDel(null);
    try {
      await api('DELETE', { id: it._id });
      removeOwned(it._id);
      setOwned(getOwned());
      setItems((list) => list.filter((x) => x._id !== it._id));
      toast('Snippet dihapus');
    } catch (err) { toast(err.message, 'err'); }
  };

  const download = (it) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([it.code], { type: 'text/plain;charset=utf-8' }));
    a.download = it.fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const shareUrl = (id) => `${window.location.origin}/code/${id}`;
  const allTags = useMemo(() => [...new Set([...TAGS, ...items.map((i) => i.tag).filter(Boolean)])], [items]);

  return (
    <>
      <Seo title="Code Share" path="/tools/code-share" />
      {toastNode}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="badge ok" style={{ marginBottom: 8, gap: 6 }}><Code2 size={14} /> <span>COMMUNITY SNIPPETS</span></div>
            <h1>Code Share</h1>
            <p>Bagikan snippet, jelajahi karya orang lain, beri suka, dan salin dengan sekali klik.</p>
          </div>
          <button className="btn primary" onClick={() => { sound.playClick(); setOpen(true); }}><Plus size={16} /> Bagikan Kode</button>
        </header>

        <div className="toolbar">
          <div className="search-box">
            <Search size={16} color="var(--muted)" />
            <input className="input" placeholder="Cari nama file…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Cari snippet" />
          </div>
          <select className="input sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Urutkan">
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
          <button className="btn" onClick={load} disabled={loading} aria-label="Muat ulang"><RefreshCw size={15} className={loading ? 'spin' : ''} /></button>
        </div>

        <div className="tags" role="group" aria-label="Filter tag">
          <button className={`chip-btn ${tag === '' ? 'on' : ''}`} onClick={() => setTag('')}>Semua</button>
          {allTags.map((t) => <button key={t} className={`chip-btn ${tag === t ? 'on' : ''}`} onClick={() => setTag(tag === t ? '' : t)}>{t}</button>)}
        </div>

        {error && <div className="alert">{error}</div>}

        {loading && items.length === 0 ? (
          <div className="grid">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 260, borderRadius: 8 }} />)}</div>
        ) : items.length === 0 ? (
          <div className="glass card empty">
            <Code2 size={36} color="var(--muted)" />
            <strong>{debounced || tag ? 'Tidak ada snippet yang cocok' : 'Belum ada snippet'}</strong>
            <p>Jadilah yang pertama membagikan kode.</p>
          </div>
        ) : (
          <div className="grid">
            {items.map((it) => (
              <motion.article key={it._id} className="glass card code-card" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div className="code-top">
                  <Link href={`/code/${it._id}`} className="code-title" title={it.fileName}>{it.fileName}</Link>
                  <span className="chip">{it.tag}</span>
                </div>
                <small className="by">oleh <b>{it.author}</b> · {ago(it.createdAt)}</small>
                <pre className="code-block code-preview">{it.code}</pre>
                <div className="stats">
                  <button className={`stat ${votes[it._id] === 'like' ? 'on' : ''}`} onClick={() => vote(it, 'like')} aria-label="Suka"><ThumbsUp size={14} /> {it.likes}</button>
                  <button className={`stat ${votes[it._id] === 'dislike' ? 'bad' : ''}`} onClick={() => vote(it, 'dislike')} aria-label="Tidak suka"><ThumbsDown size={14} /> {it.dislikes}</button>
                  <span className="stat static"><Eye size={14} /> {it.views}</span>
                </div>
                <div className="actions">
                  <button className="btn sm" onClick={() => copy(it.code, 'Kode disalin')}><Copy size={14} /> Salin</button>
                  <button className="btn sm" onClick={() => copy(shareUrl(it._id), 'Tautan disalin')}><Share2 size={14} /> Bagikan</button>
                  <button className="btn sm" onClick={() => download(it)} aria-label="Unduh"><Download size={14} /></button>
                  {owned.includes(it._id) && <button className="btn sm danger" onClick={() => setConfirmDel(it)} aria-label="Hapus"><Trash2 size={14} /></button>}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => !saving && setOpen(false)} title="Bagikan Kode" icon={<Code2 size={18} color="var(--a2)" />}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="c-author">Nama kamu</label>
              <input id="c-author" className="input" required maxLength={40} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="mis. Budi" />
            </div>
            <div className="field">
              <label htmlFor="c-tag">Tag</label>
              <select id="c-tag" className="input" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}>
                {TAGS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="c-file">Nama file</label>
            <input id="c-file" className="input" required maxLength={80} value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} placeholder="mis. debounce.js" />
          </div>
          <div className="field">
            <label htmlFor="c-code">Kode</label>
            <textarea id="c-code" className="input" required rows={12} spellCheck={false} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Tempel kode di sini…" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => setOpen(false)} disabled={saving}>Batal</button>
            <button type="submit" className="btn primary" disabled={saving || !form.author.trim() || !form.fileName.trim() || !form.code}><Send size={15} /> {saving ? 'Mengirim…' : 'Bagikan'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Hapus snippet?" icon={<Trash2 size={18} color="#d13438" />} maxWidth="420px">
        <p style={{ marginBottom: 16 }}>“{confirmDel?.fileName}” akan dihapus permanen.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => setConfirmDel(null)}>Batal</button>
          <button className="btn danger" onClick={doDelete}><Trash2 size={15} /> Hapus</button>
        </div>
      </Modal>

      <style jsx>{`
        .toolbar { display: flex; gap: 10px; align-items: center; }
        .search-box { position: relative; flex: 1; min-width: 0; display: flex; align-items: center; }
        .search-box :global(svg) { position: absolute; left: 12px; pointer-events: none; }
        .search-box :global(.input) { padding-left: 36px; font-family: var(--font); }
        .sort { width: auto; min-width: 140px; font-family: var(--font); }
        .tags { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
        .tags::-webkit-scrollbar { display: none; }
        .chip-btn { flex: 0 0 auto; padding: 6px 14px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font: inherit; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
        .chip-btn.on { background: var(--a2); border-color: var(--a2); color: var(--on-accent); }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 16px; }
        .empty { align-items: center; text-align: center; gap: 10px; padding: 40px 20px; }
        :global(.code-card) { gap: 10px; min-width: 0; }
        .code-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-width: 0; }
        :global(.code-title) { font-weight: 700; font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
        :global(.code-title:hover) { color: var(--a2); text-decoration: underline; }
        .by { color: var(--muted); }
        :global(.code-preview) { max-height: 150px; overflow: hidden; font-size: 0.74rem; }
        .stats { display: flex; gap: 8px; }
        .stat { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--muted); font: inherit; font-size: 0.76rem; cursor: pointer; }
        .stat.static { cursor: default; }
        .stat.on { color: var(--a2); border-color: var(--a2); }
        .stat.bad { color: #d13438; border-color: #d13438; }
        .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        :global(.spin) { animation: ws-spin 1s linear infinite; }
        @keyframes ws-spin { to { transform: rotate(360deg); } }
        @media (max-width: 560px) { .form-row { grid-template-columns: 1fr; } .sort { min-width: 0; width: 120px; } }
      `}</style>
    </>
  );
}
