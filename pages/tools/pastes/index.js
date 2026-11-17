import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Plus, Pencil, Trash2, Copy, ExternalLink, FileText, RefreshCw, Search, Clock, Check, X } from 'lucide-react';
import Seo from '@/components/Seo';
import { sound } from '@/src/lib/interactiveEffects';
import { timeAgo, fmtDateTime, copyText } from '@/src/lib/timeAgo';
import { Reveal, Stagger, Item, TextReveal, Magnetic } from '@/components/motion';

const API = '/api/tools/paste/v1';
const SYNTAXES = ['text', 'markdown', 'javascript', 'typescript', 'json', 'html', 'css', 'python', 'php', 'java', 'c', 'cpp', 'go', 'rust', 'bash', 'sql', 'yaml'];
const EXPIRES = [
  { v: '', label: 'Permanen' },
  { v: '600', label: '10 menit' },
  { v: '3600', label: '1 jam' },
  { v: '86400', label: '1 hari' },
  { v: '604800', label: '7 hari' },
  { v: '2592000', label: '30 hari' },
];
const EMPTY = { title: '', content: '', syntax: 'text', expireIn: '', key: '' };

async function call(method, params) {
  const r = method === 'GET'
    ? await fetch(`${API}?${new URLSearchParams(params)}`, { cache: 'no-store' })
    : await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }
  if (!r.ok) throw new Error(data?.error || `Permintaan gagal (${r.status})`);
  return data;
}

export default function PastesPage() {
  const router = useRouter();
  const formRef = useRef(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [q, setQ] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // key yang sedang diedit
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [created, setCreated] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const flash = (message, type = 'ok') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const d = await call('GET', { action: 'list' });
      setList(Array.isArray(d) ? d : []);
    } catch (e) {
      setLoadErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = useCallback((p) => {
    setEditing(p.key);
    setCreated(null);
    setForm({ title: p.title, content: p.content, syntax: p.syntax || 'text', expireIn: '__keep', key: p.key });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, []);

  // /tools/pastes?edit=KEY dari halaman detail
  useEffect(() => {
    const k = router.query.edit;
    if (!k || !list.length || editing === k) return;
    const p = list.find((x) => x.key === k);
    if (p) startEdit(p);
  }, [router.query.edit, list, editing, startEdit]);

  const reset = () => { setEditing(null); setForm(EMPTY); if (router.query.edit) router.replace('/tools/pastes', undefined, { shallow: true }); };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!form.title.trim() || !form.content) return flash('Judul dan isi wajib diisi.', 'err');
    setBusy(true);
    sound.playClick();
    try {
      if (editing) {
        const body = { action: 'update', key: editing, title: form.title.trim(), content: form.content, syntax: form.syntax };
        if (form.expireIn !== '__keep') body.expireIn = form.expireIn || '0';
        const d = await call('POST', body);
        setList((l) => l.map((x) => (x.key === editing ? d : x)));
        flash('Paste diperbarui.');
        reset();
      } else {
        const body = { action: 'create', title: form.title.trim(), content: form.content, syntax: form.syntax };
        if (form.key.trim()) body.key = form.key.trim().replace(/[^\w-]/g, '').slice(0, 64);
        if (form.expireIn) body.expireIn = form.expireIn;
        const d = await call('POST', body);
        setList((l) => [d, ...l]);
        setCreated(d);
        setForm(EMPTY);
        flash('Paste dibuat.');
      }
      sound.playBeep();
    } catch (err) {
      flash(err.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (key) => {
    sound.playClick();
    try {
      await call('POST', { action: 'delete', key });
      setList((l) => l.filter((x) => x.key !== key));
      if (editing === key) reset();
      flash('Paste dihapus.');
    } catch (err) {
      flash(err.message, 'err');
    } finally {
      setConfirmDel(null);
    }
  };

  const link = (key) => `${typeof window !== 'undefined' ? window.location.origin : ''}/tools/pastes/${key}`;
  const doCopy = async (text, msg) => flash((await copyText(text)) ? msg : 'Tidak bisa menyalin.', 'ok');

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? list.filter((p) => `${p.title} ${p.key} ${p.syntax} ${p.content.slice(0, 400)}`.toLowerCase().includes(s)) : list;
  }, [list, q]);

  return (
    <>
      <Seo
        title="Pastes — simpan & bagikan teks"
        path="/tools/pastes"
        label="PASTES"
        description="Simpan potongan teks atau kode, atur masa berlaku, lalu bagikan lewat tautan singkat dengan preview otomatis."
      />

      <div className="pp-page">
        <header>
          <Reveal variant="down">
            <div className="badge ok" style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ClipboardList size={14} color="var(--a2)" /> <span>PASTE BIN</span>
            </div>
          </Reveal>
          <h1><TextReveal as="span" text="Pastes" by="char" /></h1>
          <Reveal as="p" variant="blur" delay={0.15}>Buat, ubah, dan hapus paste. Setiap paste punya tautan singkat dengan preview link otomatis.</Reveal>
        </header>

        <AnimatePresence>
          {toast && (
            <motion.div className={`pp-toast ${toast.type}`} initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {toast.type === 'err' ? <X size={16} /> : <Check size={16} />} {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- form buat / edit ---- */}
        <Reveal as="section" variant="blur" delay={0.1} className="glass card pp-form" ref={formRef}>
          <h3>{editing ? <><Pencil size={16} /> Edit paste <code>{editing}</code></> : <><Plus size={16} /> Paste baru</>}</h3>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="pp-title">Judul</label>
              <input id="pp-title" className="input" maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Mis. Konfigurasi nginx" />
            </div>
            <div className="pp-row">
              <div className="field">
                <label htmlFor="pp-syn">Sintaks</label>
                <select id="pp-syn" className="input" value={form.syntax} onChange={(e) => setForm({ ...form, syntax: e.target.value })}>
                  {SYNTAXES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="pp-exp">Kedaluwarsa</label>
                <select id="pp-exp" className="input" value={form.expireIn} onChange={(e) => setForm({ ...form, expireIn: e.target.value })}>
                  {editing && <option value="__keep">Biarkan seperti semula</option>}
                  {EXPIRES.map((x) => <option key={x.v} value={x.v}>{x.label}</option>)}
                </select>
              </div>
              {!editing && (
                <div className="field">
                  <label htmlFor="pp-key">Kunci kustom (opsional)</label>
                  <input id="pp-key" className="input" maxLength={64} value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="otomatis" />
                </div>
              )}
            </div>
            <div className="field">
              <label htmlFor="pp-body">Isi <small style={{ opacity: 0.6 }}>({form.content.length.toLocaleString('id-ID')} karakter)</small></label>
              <textarea id="pp-body" className="input pp-mono" rows={12} spellCheck={false} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Tempel teks atau kode di sini…" />
            </div>
            <div className="pp-actions">
              <Magnetic><button className="btn primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Buat paste'}</button></Magnetic>
              {(editing || form.title || form.content) && <button type="button" className="btn" onClick={reset}>Batal</button>}
            </div>
          </form>

          {created && (
            <div className="pp-created">
              <strong>Paste siap dibagikan</strong>
              <code>{link(created.key)}</code>
              <div className="pp-actions">
                <button className="btn" onClick={() => doCopy(link(created.key), 'Tautan disalin.')}><Copy size={14} /> Salin tautan</button>
                <Link className="btn" href={`/tools/pastes/${created.key}`}><ExternalLink size={14} /> Buka</Link>
              </div>
            </div>
          )}
        </Reveal>

        {/* ---- daftar ---- */}
        <section className="pp-list-head">
          <div className="pp-search">
            <Search size={15} />
            <input className="input" placeholder="Cari judul, kunci, atau isi…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari paste" />
          </div>
          <button className="btn" onClick={() => { sound.playClick(); load(); }} disabled={loading}><RefreshCw size={14} /> Muat ulang</button>
        </section>

        {loadErr && <div className="alert">{loadErr}</div>}
        {loading && !list.length && <div className="badge">Memuat…</div>}
        {!loading && !loadErr && !shown.length && (
          <div className="glass card pp-empty">{q ? 'Tidak ada paste yang cocok.' : 'Belum ada paste. Buat yang pertama di atas.'}</div>
        )}

        <Stagger className="pp-grid" cycle gap={0.06} amount={0.05}>
          {shown.map((p, idx) => (
            <Item as="article" key={p.key} index={idx} layout className="glass card pp-item mo-lift">
              <div className="pp-item-head">
                <FileText size={16} color="var(--a2)" />
                <Link href={`/tools/pastes/${p.key}`} className="pp-title">{p.title}</Link>
              </div>
              <pre className="pp-snippet">{p.content.slice(0, 220)}{p.content.length > 220 ? '…' : ''}</pre>
              <div className="pp-meta">
                <span className="badge">{p.syntax || 'text'}</span>
                <code>{p.key}</code>
                <span title={fmtDateTime(p.createdAt)}>{timeAgo(p.createdAt)}</span>
                {p.expiresAt && <span className="pp-exp" title={fmtDateTime(p.expiresAt)}><Clock size={12} /> sampai {fmtDateTime(p.expiresAt)}</span>}
              </div>
              <div className="pp-actions">
                <button className="btn" onClick={() => doCopy(link(p.key), 'Tautan disalin.')} aria-label="Salin tautan"><Copy size={14} /></button>
                <a className="btn" href={`${API}?action=get&key=${encodeURIComponent(p.key)}&raw=true`} target="_blank" rel="noreferrer">Raw</a>
                <button className="btn" onClick={() => startEdit(p)}><Pencil size={14} /> Edit</button>
                {confirmDel === p.key ? (
                  <>
                    <button className="btn pp-danger" onClick={() => remove(p.key)}>Ya, hapus</button>
                    <button className="btn" onClick={() => setConfirmDel(null)}>Batal</button>
                  </>
                ) : (
                  <button className="btn pp-danger" onClick={() => setConfirmDel(p.key)} aria-label="Hapus"><Trash2 size={14} /></button>
                )}
              </div>
            </Item>
          ))}
        </Stagger>
      </div>

      <style jsx>{`
        .pp-page { width: min(980px, 100%); margin: 0 auto; display: grid; gap: 18px; padding-bottom: 24px; }
        :global(.pp-form) { display: grid; gap: 12px; }
        :global(.pp-form) h3 { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; }
        :global(.pp-form) form { display: grid; gap: 12px; }
        .pp-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
        .pp-mono { font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.5; resize: vertical; min-height: 180px; tab-size: 2; }
        .pp-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .pp-created { display: grid; gap: 8px; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: color-mix(in srgb, var(--a2) 8%, transparent); }
        .pp-created code { font-family: var(--font-mono); font-size: 0.78rem; overflow-wrap: anywhere; }
        .pp-list-head { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .pp-search { flex: 1 1 240px; display: flex; align-items: center; gap: 8px; }
        .pp-search :global(.input) { flex: 1; }
        :global(.pp-grid) { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); gap: 14px; }
        :global(.pp-item) { display: grid; gap: 10px; min-width: 0; }
        .pp-item-head { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .pp-item-head :global(.pp-title) { font-weight: 700; color: var(--text); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pp-item-head :global(.pp-title:hover) { color: var(--a2); }
        .pp-snippet { margin: 0; max-height: 110px; overflow: hidden; font-family: var(--font-mono); font-size: 0.74rem; line-height: 1.45; color: var(--muted); white-space: pre-wrap; overflow-wrap: anywhere; padding: 10px; border-radius: 10px; background: color-mix(in srgb, var(--bg1) 45%, transparent); border: 1px solid var(--border); }
        .pp-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 0.72rem; color: var(--muted); }
        .pp-meta code { font-family: var(--font-mono); }
        .pp-exp { display: inline-flex; align-items: center; gap: 4px; }
        .pp-empty { text-align: center; color: var(--muted); }
        :global(.pp-danger) { color: #f87171; }
        .pp-toast { position: fixed; top: 84px; right: 16px; z-index: 9999; display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px; color: #fff; font-size: 0.84rem; font-weight: 600; background: rgba(16, 124, 16, 0.95); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35); }
        .pp-toast.err { background: rgba(196, 43, 28, 0.95); }
      `}</style>
    </>
  );
}
