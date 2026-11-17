import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ClipboardList, Plus, Search, RefreshCw, Copy, ExternalLink, Pencil, Trash2, Clock, FileText, Save } from 'lucide-react';
import Seo from '@/components/Seo';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { sound } from '@/src/lib/interactiveEffects';

const API = '/api/tools/paste/v1';

const SYNTAXES = ['text', 'javascript', 'typescript', 'json', 'html', 'css', 'python', 'php', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'bash', 'sql', 'yaml', 'markdown'];
const EXPIRES = [
  { v: 0, label: 'Tidak pernah' },
  { v: 600, label: '10 menit' },
  { v: 3600, label: '1 jam' },
  { v: 86400, label: '1 hari' },
  { v: 604800, label: '7 hari' },
  { v: 2592000, label: '30 hari' },
];
const EMPTY = { title: '', content: '', syntax: 'text', key: '', expireIn: 0 };

const call = async (payload) => {
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  if (!res.ok) throw new Error(json?.error || text || `HTTP ${res.status}`);
  return json;
};

const fmtDate = (d) => new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const isExpired = (p) => p.expiresAt && new Date(p.expiresAt) < new Date();
const fmtSize = (n) => (n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);

export default function PastesPage() {
  const [pastes, setPastes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState(null); // { mode: 'create'|'edit', form }
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, toastNode] = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}?action=list&summary=true`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setPastes(Array.isArray(json) ? json : []);
    } catch (e) {
      setError(e.message || 'Gagal memuat daftar paste');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pastes;
    return pastes.filter((p) => `${p.title} ${p.key} ${p.syntax}`.toLowerCase().includes(q));
  }, [pastes, query]);

  const shareUrl = (key) => `${window.location.origin}/paste/${key}`;
  const copy = async (text, msg) => {
    try { await navigator.clipboard.writeText(text); toast(msg); } catch { toast('Gagal menyalin', 'err'); }
  };

  const openCreate = () => { sound.playClick(); setEditor({ mode: 'create', form: { ...EMPTY } }); };

  const openEdit = async (p) => {
    sound.playClick();
    // daftar hanya membawa potongan konten, ambil versi lengkap dulu
    try {
      const full = p.truncated ? await (await fetch(`${API}?action=get&key=${encodeURIComponent(p.key)}`)).json() : p;
      if (full.error) throw new Error(full.error);
      setEditor({ mode: 'edit', form: { title: full.title, content: full.content, syntax: full.syntax || 'text', key: full.key, expireIn: -1 } });
    } catch (e) {
      toast(e.message || 'Gagal memuat paste', 'err');
    }
  };

  const setField = (k, v) => setEditor((e) => ({ ...e, form: { ...e.form, [k]: v } }));

  const submit = async (e) => {
    e.preventDefault();
    const { mode, form } = editor;
    setSaving(true);
    try {
      if (mode === 'create') {
        const out = await call({ action: 'create', title: form.title.trim(), content: form.content, syntax: form.syntax, key: form.key.trim() || undefined, expireIn: form.expireIn });
        toast('Paste dibuat');
        setEditor(null);
        await load();
        copy(shareUrl(out.key), 'Paste dibuat · tautan disalin');
      } else {
        const payload = { action: 'update', key: form.key, title: form.title.trim(), content: form.content, syntax: form.syntax };
        if (Number(form.expireIn) >= 0) payload.expireIn = form.expireIn; // -1 = biarkan masa berlaku lama
        await call(payload);
        toast('Perubahan disimpan');
        setEditor(null);
        load();
      }
      sound.playBeep();
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    const p = confirmDel;
    setConfirmDel(null);
    try {
      await call({ action: 'delete', key: p.key });
      setPastes((list) => list.filter((x) => x.key !== p.key));
      toast('Paste dihapus');
    } catch (err) {
      toast(err.message, 'err');
    }
  };

  return (
    <>
      <Seo title="Pastes" path="/tools/pastes" />
      {toastNode}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div className="badge ok" style={{ marginBottom: '8px', gap: '6px' }}>
              <ClipboardList size={14} /> <span>PASTEBIN</span>
            </div>
            <h1>Pastes</h1>
            <p>Simpan teks atau kode, bagikan lewat tautan singkat, atur masa berlaku.</p>
          </div>
          <motion.button className="btn primary" onClick={openCreate} whileTap={{ scale: 0.97 }}>
            <Plus size={16} /> Paste Baru
          </motion.button>
        </header>

        <div className="toolbar">
          <div className="search-box">
            <Search size={16} color="var(--muted)" />
            <input className="input" placeholder="Cari judul, key, atau bahasa…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari paste" />
          </div>
          <button className="btn" onClick={load} disabled={loading} aria-label="Muat ulang">
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> <span className="hide-sm">Muat ulang</span>
          </button>
        </div>

        {error && <div className="alert">{error}</div>}

        {loading && pastes.length === 0 ? (
          <div className="grid">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 170, borderRadius: 8 }} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="glass card empty">
            <FileText size={36} color="var(--muted)" />
            <strong>{query ? 'Tidak ada paste yang cocok' : 'Belum ada paste'}</strong>
            <p>{query ? 'Coba kata kunci lain.' : 'Buat paste pertama dan bagikan tautannya.'}</p>
            {!query && <button className="btn primary" onClick={openCreate}><Plus size={16} /> Paste Baru</button>}
          </div>
        ) : (
          <div className="grid">
            {filtered.map((p) => {
              const expired = isExpired(p);
              return (
                <motion.article key={p.key} className="glass card paste-card" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="paste-top">
                    <Link href={`/paste/${p.key}`} className="paste-title" title={p.title}>{p.title}</Link>
                    <span className="chip">{p.syntax}</span>
                  </div>
                  <pre className="code-block paste-preview">{p.content}{p.truncated ? '\n…' : ''}</pre>
                  <div className="paste-meta">
                    <span className="chip muted">/{p.key}</span>
                    <span className="chip muted">{fmtSize(p.size ?? p.content.length)}</span>
                    {expired ? <span className="chip warn"><Clock size={11} /> kedaluwarsa</span> : p.expiresAt ? <span className="chip warn"><Clock size={11} /> {fmtDate(p.expiresAt)}</span> : null}
                  </div>
                  <small className="paste-date">Dibuat {fmtDate(p.createdAt)}{p.updatedAt && p.updatedAt !== p.createdAt ? ` · diubah ${fmtDate(p.updatedAt)}` : ''}</small>
                  <div className="paste-actions">
                    <button className="btn sm" onClick={() => copy(shareUrl(p.key), 'Tautan disalin')}><Copy size={14} /> Salin link</button>
                    <Link className="btn sm" href={`/paste/${p.key}`}><ExternalLink size={14} /> Buka</Link>
                    <button className="btn sm" onClick={() => openEdit(p)}><Pencil size={14} /> Edit</button>
                    <button className="btn sm danger" onClick={() => setConfirmDel(p)} aria-label={`Hapus ${p.title}`}><Trash2 size={14} /></button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor: buat & edit */}
      <Modal open={!!editor} onClose={() => !saving && setEditor(null)} title={editor?.mode === 'edit' ? 'Edit Paste' : 'Paste Baru'} icon={<ClipboardList size={18} color="var(--a2)" />}>
        {editor && (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="field">
              <label htmlFor="p-title">Judul</label>
              <input id="p-title" className="input" required maxLength={120} placeholder="mis. Konfigurasi nginx" value={editor.form.title} onChange={(e) => setField('title', e.target.value)} autoFocus />
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="p-syntax">Bahasa</label>
                <select id="p-syntax" className="input" value={editor.form.syntax} onChange={(e) => setField('syntax', e.target.value)}>
                  {SYNTAXES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="p-exp">Masa berlaku</label>
                <select id="p-exp" className="input" value={editor.form.expireIn} onChange={(e) => setField('expireIn', Number(e.target.value))}>
                  {editor.mode === 'edit' && <option value={-1}>Biarkan seperti sekarang</option>}
                  {EXPIRES.map((x) => <option key={x.v} value={x.v}>{x.v === 0 && editor.mode === 'edit' ? 'Hapus batas waktu' : x.label}</option>)}
                </select>
              </div>
            </div>
            {editor.mode === 'create' && (
              <div className="field">
                <label htmlFor="p-key">Key kustom (opsional)</label>
                <input id="p-key" className="input" maxLength={64} pattern="[A-Za-z0-9_\-]+" title="Huruf, angka, - dan _" placeholder="kosongkan untuk key acak" value={editor.form.key} onChange={(e) => setField('key', e.target.value)} />
              </div>
            )}
            <div className="field">
              <label htmlFor="p-content">Isi</label>
              <textarea id="p-content" className="input" required rows={12} spellCheck={false} placeholder="Tempel teks atau kode di sini…" value={editor.form.content} onChange={(e) => setField('content', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" className="btn" onClick={() => setEditor(null)} disabled={saving}>Batal</button>
              <button type="submit" className="btn primary" disabled={saving || !editor.form.title.trim() || !editor.form.content}>
                <Save size={15} /> {saving ? 'Menyimpan…' : editor.mode === 'edit' ? 'Simpan perubahan' : 'Buat paste'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Konfirmasi hapus */}
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Hapus paste?" icon={<Trash2 size={18} color="#d13438" />} maxWidth="420px">
        <p style={{ marginBottom: 16 }}>“{confirmDel?.title}” akan dihapus permanen dan tautannya berhenti bekerja.</p>
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
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 16px; }
        .empty { align-items: center; text-align: center; gap: 10px; padding: 40px 20px; }
        :global(.paste-card) { gap: 12px; min-width: 0; }
        .paste-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-width: 0; }
        :global(.paste-title) { font-weight: 700; font-size: 1.02rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
        :global(.paste-title:hover) { color: var(--a2); text-decoration: underline; }
        :global(.paste-preview) { max-height: 112px; overflow: hidden; font-size: 0.74rem; }
        .paste-meta { display: flex; flex-wrap: wrap; gap: 6px; }
        .paste-date { color: var(--muted); font-size: 0.72rem; }
        .paste-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        :global(.spin) { animation: ws-spin 1s linear infinite; }
        @keyframes ws-spin { to { transform: rotate(360deg); } }
        @media (max-width: 560px) {
          .form-row { grid-template-columns: 1fr; }
          .hide-sm { display: none; }
        }
      `}</style>
    </>
  );
}
