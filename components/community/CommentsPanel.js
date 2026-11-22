import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { MessageSquareText, Send, Reply, Pencil, Trash2, X } from 'lucide-react';
import { PageHead, useToast, kit as s } from '@/components/PageKit';
import { http } from '@/src/lib/http';
import { confirmToast } from '@/src/lib/toast';
import { timeAgo } from '@/src/lib/timeAgo';

export default function CommentsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', message: '' });
  const [reply, setReply] = useState(null); // { id, name, message }
  const [edit, setEdit] = useState(null); // { id, message }
  const [busy, setBusy] = useState(false);
  const [toast, flash] = useToast();

  const load = useCallback(async () => {
    try { setItems((await http('GET', '/api/comments')).data || []); } catch (e) { flash(e.message, 'err'); } finally { setLoading(false); }
  }, [flash]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (session?.user?.name) setForm((f) => (f.name ? f : { ...f, name: session.user.name })); }, [session?.user?.name]);

  const post = async (payload, after) => {
    if (busy) return;
    setBusy(true);
    try { await http('POST', '/api/comments', payload); after(); flash('Terkirim.'); await load(); } catch (e) { flash(e.message, 'err'); } finally { setBusy(false); }
  };
  const submit = (e) => { e.preventDefault(); post({ name: form.name, message: form.message }, () => setForm((f) => ({ ...f, message: '' }))); };
  const submitReply = (e) => { e.preventDefault(); post({ name: reply.name, message: reply.message, parentId: reply.id }, () => setReply(null)); };
  const saveEdit = async (e) => {
    e.preventDefault();
    try { await http('PUT', '/api/comments', { commentId: edit.id, message: edit.message }); setEdit(null); flash('Komentar diperbarui.'); load(); } catch (er) { flash(er.message, 'err'); }
  };
  const remove = async (c) => {
    if (!(await confirmToast('Hapus komentar ini beserta balasannya?', { danger: true, okLabel: 'Hapus' }))) return;
    try { await http('DELETE', '/api/comments', { commentId: c._id }); flash('Komentar dihapus.'); load(); } catch (e) { flash(e.message, 'err'); }
  };

  return (
    <>
      {toast}
      <div className={s.page}>
        <PageHead Icon={MessageSquareText} badge="KOMENTAR" title="Buku Tamu" desc="Tinggalkan komentar atau balas pengunjung lain. Tidak perlu login." />

        <form className={`glass card ${s.form}`} onSubmit={submit}>
          <h3><Send size={16} /> Komentar baru</h3>
          <div className="field"><label htmlFor="cm-name">Nama</label><input id="cm-name" className="input" maxLength={64} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama kamu" /></div>
          <div className="field"><label htmlFor="cm-msg">Pesan</label><textarea id="cm-msg" className="input" rows={3} maxLength={2000} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tulis komentar…" /></div>
          <div className={s.row}><button className="btn primary" type="submit" disabled={busy}>{busy ? 'Mengirim…' : 'Kirim'}</button><span className={s.muted}>{form.message.length}/2000</span></div>
        </form>

        <section className="glass card">
          <h3>Komentar <span className={s.muted}>({items.length})</span></h3>
          {loading ? <p className={s.empty}>Memuat…</p> : items.length === 0 ? <p className={s.empty}>Belum ada komentar. Jadilah yang pertama!</p> : (
            <ul className={s.list}>
              {items.map((c) => (
                <li key={c._id} className={s.item}>
                  <div className={s.itemHead}>
                    <b>{c.name}</b>
                    <button type="button" className={s.link} onClick={() => setReply({ id: c._id, name: form.name, message: '' })}><Reply size={13} /> Balas</button>
                    {isAdmin && <button type="button" className={s.link} onClick={() => setEdit({ id: c._id, message: c.message })} aria-label="Edit"><Pencil size={13} /></button>}
                    {isAdmin && <button type="button" className={`${s.link} ${s.danger}`} onClick={() => remove(c)} aria-label="Hapus"><Trash2 size={13} /></button>}
                  </div>
                  {edit?.id === c._id ? (
                    <form className={s.form} onSubmit={saveEdit}>
                      <textarea className="input" rows={3} maxLength={2000} required value={edit.message} onChange={(e) => setEdit({ ...edit, message: e.target.value })} />
                      <div className={s.row}><button className="btn primary" type="submit">Simpan</button><button className="btn" type="button" onClick={() => setEdit(null)}><X size={14} /> Batal</button></div>
                    </form>
                  ) : <p className={s.body}>{c.message}</p>}
                  <div className={s.meta}><span>{timeAgo(c.createdAt || c.timestamp)}</span>{c.updatedAt && c.createdAt && c.updatedAt !== c.createdAt && <span>(diedit)</span>}</div>

                  {c.replies?.length > 0 && (
                    <div className={s.replies}>
                      {c.replies.map((r, i) => (
                        <div key={i}><b style={{ fontSize: '0.84rem' }}>{r.name}</b> <span className={s.muted}>· {timeAgo(r.timestamp)}</span><p className={s.body}>{r.message}</p></div>
                      ))}
                    </div>
                  )}

                  {reply?.id === c._id && (
                    <form className={s.form} onSubmit={submitReply}>
                      <input className="input" maxLength={64} required placeholder="Nama kamu" value={reply.name} onChange={(e) => setReply({ ...reply, name: e.target.value })} />
                      <textarea className="input" rows={2} maxLength={2000} required placeholder="Tulis balasan…" value={reply.message} onChange={(e) => setReply({ ...reply, message: e.target.value })} />
                      <div className={s.row}><button className="btn primary" type="submit" disabled={busy}>Kirim balasan</button><button className="btn" type="button" onClick={() => setReply(null)}>Batal</button></div>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
