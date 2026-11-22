import { useCallback, useEffect, useState } from 'react';
import { Database, Plus, Pencil, Trash2, X, Copy, Check, RefreshCw } from 'lucide-react';
import Seo from '@/components/Seo';
import { PageHead, useToast, kit as s } from '@/components/PageKit';
import { http, qs } from '@/src/lib/http';
import { confirmToast } from '@/src/lib/toast';
import { copyText, timeAgo } from '@/src/lib/timeAgo';

const parse = (txt) => { try { const v = JSON.parse(txt); return v && typeof v === 'object' && !Array.isArray(v) ? { v } : { err: 'Harus berupa objek JSON, mis. {"a":1}' }; } catch (e) { return { err: `JSON tidak valid: ${e.message}` }; } };

export default function DataStorePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customId, setCustomId] = useState('');
  const [json, setJson] = useState('{\n  "hello": "wudysoft"\n}');
  const [edit, setEdit] = useState(null); // { id, text }
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const [toast, flash] = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await http('GET', '/api/tools/db')).users || []); }
    catch (e) { if (/No data found/i.test(e.message)) setItems([]); else flash(e.message, 'err'); }
    finally { setLoading(false); }
  }, [flash]);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    const p = parse(json);
    if (p.err) return flash(p.err, 'err');
    setBusy(true);
    try {
      const d = await http('POST', `/api/tools/db?${qs({ customId: customId.trim() })}`, p.v);
      flash(`Tersimpan: ${d.user.customId}`); setCustomId(''); load();
    } catch (er) { flash(er.message, 'err'); } finally { setBusy(false); }
  };
  const saveEdit = async (e) => {
    e.preventDefault();
    const p = parse(edit.text);
    if (p.err) return flash(p.err, 'err');
    try { await http('PUT', `/api/tools/db?${qs({ customId: edit.id })}`, p.v); setEdit(null); flash('Data diperbarui.'); load(); } catch (er) { flash(er.message, 'err'); }
  };
  const remove = async (id) => {
    if (!(await confirmToast(`Hapus data “${id}”?`, { danger: true, okLabel: 'Hapus' }))) return;
    try { await http('DELETE', `/api/tools/db?${qs({ customId: id })}`); flash('Data dihapus.'); load(); } catch (er) { flash(er.message, 'err'); }
  };
  const copy = async (id, text) => { await copyText(text); setCopied(id); setTimeout(() => setCopied(''), 1500); };

  return (
    <>
      <Seo title="Data Store — penyimpanan JSON" path="/tools/db" label="DATA STORE" description="Simpan, ubah, dan hapus data JSON berdasarkan ID kustom lewat satu endpoint." />
      {toast}
      <div className={s.page}>
        <PageHead Icon={Database} badge="DATA STORE" title="Penyimpanan JSON" desc="Simpan objek JSON bebas dengan ID kustom (atau ID acak), lalu ambil lagi lewat endpoint /api/tools/db. Data bersifat publik: jangan simpan rahasia." />

        <form className={`glass card ${s.form}`} onSubmit={create}>
          <h3><Plus size={16} /> Data baru</h3>
          <div className="field"><label htmlFor="db-id">ID kustom (opsional)</label><input id="db-id" className="input" maxLength={120} value={customId} onChange={(e) => setCustomId(e.target.value)} placeholder="Kosongkan untuk ID acak" /></div>
          <div className="field"><label htmlFor="db-json">Data (JSON)</label><textarea id="db-json" className="input" rows={6} spellCheck={false} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} value={json} onChange={(e) => setJson(e.target.value)} /></div>
          <div className={s.row}><button className="btn primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button></div>
        </form>

        <section className="glass card">
          <div className={s.row} style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Data tersimpan <span className={s.muted}>({items.length})</span></h3>
            <button type="button" className="btn" onClick={load} disabled={loading}><RefreshCw size={14} /> Muat ulang</button>
          </div>
          {loading ? <p className={s.empty}>Memuat…</p> : items.length === 0 ? <p className={s.empty}>Belum ada data.</p> : (
            <ul className={s.list} style={{ marginTop: 10 }}>
              {items.map((u) => {
                const text = JSON.stringify(u.data ?? {}, null, 2);
                return (
                  <li key={u.customId} className={s.item}>
                    <div className={s.itemHead}>
                      <b className={s.mono}>{u.customId}</b>
                      <button type="button" className={s.link} onClick={() => copy(u.customId, u.customId)} aria-label="Salin ID">{copied === u.customId ? <Check size={13} /> : <Copy size={13} />}</button>
                      <button type="button" className={s.link} onClick={() => setEdit({ id: u.customId, text })} aria-label="Edit"><Pencil size={13} /></button>
                      <button type="button" className={`${s.link} ${s.danger}`} onClick={() => remove(u.customId)} aria-label="Hapus"><Trash2 size={13} /></button>
                    </div>
                    {edit?.id === u.customId ? (
                      <form className={s.form} onSubmit={saveEdit}>
                        <textarea className="input" rows={6} spellCheck={false} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
                        <div className={s.row}><button className="btn primary" type="submit">Simpan</button><button className="btn" type="button" onClick={() => setEdit(null)}><X size={14} /> Batal</button></div>
                      </form>
                    ) : <pre className={s.code}>{text}</pre>}
                    <div className={s.meta}><span>Dibuat {timeAgo(u.createdAt)}</span>{u.updatedAt !== u.createdAt && <span>Diubah {timeAgo(u.updatedAt)}</span>}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
