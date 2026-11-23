import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Newspaper, Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import Card from '@/components/Card';
import { PageHead, useToast, kit as s } from '@/components/PageKit';
import { http, qs } from '@/src/lib/http';
import { confirmToast } from '@/src/lib/toast';
import { timeAgo } from '@/src/lib/timeAgo';

const SORTS = [{ v: '', l: 'Terbaru' }, { v: 'title', l: 'Judul A–Z' }, { v: 'author', l: 'Penulis A–Z' }];

export default function PostsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [form, setForm] = useState({ title: '', content: '', author: '' });
  const [edit, setEdit] = useState(null); // { id, title, content }
  const [busy, setBusy] = useState(false);
  const [toast, flash] = useToast();

  const load = useCallback(async () => {
    try {
      const d = await http('GET', `/api/posts?${qs({ search: search.trim(), sortBy })}`);
      setPosts(d.data || []);
    } catch (e) {
      if (/No posts found/i.test(e.message)) setPosts([]); else flash(e.message, 'err');
    } finally { setLoading(false); }
  }, [search, sortBy, flash]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { if (session?.user?.name) setForm((f) => (f.author ? f : { ...f, author: session.user.name })); }, [session?.user?.name]);

  const create = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await http('POST', '/api/posts', { ...form, authorAvatar: session?.user?.image || undefined });
      setForm((f) => ({ ...f, title: '', content: '' })); flash('Post dipublikasikan.'); load();
    } catch (er) { flash(er.message, 'err'); } finally { setBusy(false); }
  };
  const saveEdit = async (e) => {
    e.preventDefault();
    try { await http('PUT', '/api/posts', { postId: edit.id, newTitle: edit.title, newContent: edit.content }); setEdit(null); flash('Post diperbarui.'); load(); } catch (er) { flash(er.message, 'err'); }
  };
  const remove = async (p) => {
    if (!(await confirmToast(`Hapus post “${p.title}”?`, { danger: true, okLabel: 'Hapus' }))) return;
    try { await http('DELETE', `/api/posts?id=${p._id}`); flash('Post dihapus.'); load(); } catch (er) { flash(er.message, 'err'); }
  };

  return (
    <>
      {toast}
      <div className={s.page}>
        <PageHead Icon={Newspaper} badge="POSTS" title="Tulisan & Pengumuman" desc="Cari, baca, dan terbitkan post. Edit dan hapus hanya tersedia untuk admin." />

        <Card as="form" Icon={Plus} title="Post baru" subtitle="Terbitkan tulisan" onSubmit={create} bodyClassName={s.form} footer={<span>Judul maks 200 · isi maks 20.000 karakter</span>}>
          <div className={s.fields}>
            <div className="field"><label htmlFor="ps-title">Judul</label><input id="ps-title" className="input" maxLength={200} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="field"><label htmlFor="ps-author">Penulis</label><input id="ps-author" className="input" maxLength={64} required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
          </div>
          <div className="field"><label htmlFor="ps-content">Isi</label><textarea id="ps-content" className="input" rows={5} maxLength={20000} required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
          <div className={s.row}><button className="btn primary" type="submit" disabled={busy}>{busy ? 'Menerbitkan…' : 'Terbitkan'}</button></div>
        </Card>

        <Card Icon={Newspaper} title="Daftar post" badge={posts.length} footer={<span>{isAdmin ? 'Mode admin: edit & hapus aktif' : 'Edit & hapus khusus admin'}</span>}>
          <div className={s.fields}>
            <div className="field"><label htmlFor="ps-q"><Search size={12} /> Cari judul</label><input id="ps-q" className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Kata kunci…" /></div>
            <div className="field"><label htmlFor="ps-sort">Urutkan</label><select id="ps-sort" className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>{SORTS.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}</select></div>
          </div>
          {loading ? <p className={s.empty}>Memuat…</p> : posts.length === 0 ? <p className={s.empty}>{search ? 'Tidak ada post yang cocok.' : 'Belum ada post.'}</p> : (
            <ul className={s.list}>
              {posts.map((p) => (
                <li key={p._id} className={s.item}>
                  <div className={s.itemHead}>
                    {p.authorAvatar && <img src={p.authorAvatar} alt="" width={28} height={28} style={{ borderRadius: '50%', objectFit: 'cover' }} loading="lazy" />}
                    <b>{p.title}</b>
                    {isAdmin && <button type="button" className={s.link} onClick={() => setEdit({ id: p._id, title: p.title, content: p.content })} aria-label="Edit"><Pencil size={13} /></button>}
                    {isAdmin && <button type="button" className={`${s.link} ${s.danger}`} onClick={() => remove(p)} aria-label="Hapus"><Trash2 size={13} /></button>}
                  </div>
                  {edit?.id === p._id ? (
                    <form className={s.form} onSubmit={saveEdit}>
                      <input className="input" maxLength={200} required value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                      <textarea className="input" rows={5} maxLength={20000} required value={edit.content} onChange={(e) => setEdit({ ...edit, content: e.target.value })} />
                      <div className={s.row}><button className="btn primary" type="submit">Simpan</button><button className="btn" type="button" onClick={() => setEdit(null)}><X size={14} /> Batal</button></div>
                    </form>
                  ) : <p className={s.body}>{p.content}</p>}
                  <div className={s.meta}><span>oleh {p.author}</span><span>{timeAgo(p.createdAt)}</span>{p.updatedAt !== p.createdAt && <span>(diedit {timeAgo(p.updatedAt)})</span>}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
