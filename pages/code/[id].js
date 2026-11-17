import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Download, Share2, ThumbsUp, ThumbsDown, Eye, ArrowLeft, Code2 } from 'lucide-react';
import mongoose from 'mongoose';
import Seo from '@/components/Seo';
import { useToast } from '@/components/Toast';
import connectMongo from '@/lib/mongoose';
import Code from '@/models/CodeShare';
import { originFromReq, snippet, plain } from '@/lib/ssrMeta';
import { getVotes, setVote } from '@/src/lib/ownedCodes';

/** Halaman bagikan snippet — SSR agar pratinjau link berisi nama file, penulis, dan cuplikan kode. */
export async function getServerSideProps({ params, req, res }) {
  const origin = originFromReq(req);
  const id = String(params.id || '');
  let item = null;
  let dbError = false;
  if (mongoose.isValidObjectId(id)) {
    try {
      await connectMongo();
      const doc = await Code.findById(id);
      if (doc) item = plain(doc);
    } catch {
      dbError = true;
    }
  }
  if (dbError) { res.statusCode = 503; res.setHeader('Cache-Control', 'no-store'); }
  else if (!item) res.statusCode = 404;
  else res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return { props: { item, origin, idParam: id } };
}

export default function CodePage({ item, origin, idParam }) {
  const [data, setData] = useState(item);
  const [vote, setLocalVote] = useState(null);
  const [toast, toastNode] = useToast();

  useEffect(() => {
    setData(item);
    if (!item) return;
    setLocalVote(getVotes()[item._id] || null);
    // hitung 1 tampilan per sesi browser per snippet (crawler tidak menjalankan JS)
    try {
      const k = `wudysoft_viewed_${item._id}`;
      if (!sessionStorage.getItem(k)) {
        sessionStorage.setItem(k, '1');
        fetch('/api/code-share', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item._id, action: 'view' }) })
          .then((r) => r.json()).then((j) => j.code && setData(j.code)).catch(() => {});
      }
    } catch {}
  }, [item]);

  if (!item) {
    return (
      <>
        <Seo title="Snippet tidak ditemukan" description="Snippet yang kamu cari tidak ada atau sudah dihapus." path={`/code/${idParam}`} origin={origin} tag="CODE SHARE" noindex />
        <div className="glass card" style={{ alignItems: 'center', textAlign: 'center', gap: 12, padding: '48px 20px' }}>
          <Code2 size={40} color="var(--muted)" />
          <h1 style={{ fontSize: '1.5rem' }}>Snippet tidak ditemukan</h1>
          <p>Tautan salah, atau snippet sudah dihapus.</p>
          <Link href="/tools/code-share" className="btn primary">Ke Code Share</Link>
        </div>
      </>
    );
  }

  const url = `${origin}/code/${item._id}`;
  const copy = async (text, msg) => { try { await navigator.clipboard.writeText(text); toast(msg); } catch { toast('Gagal menyalin', 'err'); } };
  const doVote = async (kind) => {
    if (vote) return toast('Kamu sudah memberi suara', 'err');
    try {
      const r = await fetch('/api/code-share', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item._id, action: kind }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message);
      setData(j.code);
      setVote(item._id, kind);
      setLocalVote(kind);
    } catch (e) { toast(e.message || 'Gagal', 'err'); }
  };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([item.code], { type: 'text/plain;charset=utf-8' }));
    a.download = item.fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <Seo
        title={`${item.fileName} — oleh ${item.author}`}
        description={snippet(item.code, 190)}
        path={`/code/${item._id}`}
        origin={origin}
        type="article"
        tag={`CODE · ${item.tag}`}
        author={item.author}
        publishedTime={item.createdAt}
        modifiedTime={item.updatedAt}
        keywords={['code share', item.tag, item.fileName]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareSourceCode',
          name: item.fileName,
          codeSampleType: 'snippet',
          programmingLanguage: item.tag,
          text: item.code.slice(0, 5000),
          author: { '@type': 'Person', name: item.author },
          datePublished: item.createdAt,
          dateModified: item.updatedAt,
          url,
        }}
      />
      {toastNode}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Link href="/tools/code-share" className="muted-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={15} /> Semua snippet</Link>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ wordBreak: 'break-word', fontFamily: 'var(--font-mono)', fontSize: 'clamp(1.3rem, 4vw, 2rem)' }}>{item.fileName}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span className="chip">{item.tag}</span>
            <span className="chip muted">oleh {item.author}</span>
            <span className="chip muted">{new Date(item.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <span className="chip muted"><Eye size={11} /> {data.views}</span>
          </div>
        </header>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button className="btn sm" onClick={() => copy(item.code, 'Kode disalin')}><Copy size={14} /> Salin kode</button>
          <button className="btn sm" onClick={() => copy(url, 'Tautan disalin')}><Share2 size={14} /> Bagikan</button>
          <button className="btn sm" onClick={download}><Download size={14} /> Unduh</button>
          <button className="btn sm" onClick={() => doVote('like')} style={vote === 'like' ? { color: 'var(--a2)', borderColor: 'var(--a2)' } : undefined}><ThumbsUp size={14} /> {data.likes}</button>
          <button className="btn sm" onClick={() => doVote('dislike')} style={vote === 'dislike' ? { color: '#d13438', borderColor: '#d13438' } : undefined}><ThumbsDown size={14} /> {data.dislikes}</button>
        </div>
        <pre className="code-block" style={{ maxHeight: '70vh' }}>{item.code}</pre>
      </div>
    </>
  );
}
