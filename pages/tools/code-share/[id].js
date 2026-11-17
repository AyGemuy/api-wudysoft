import { useEffect, useState } from 'react';
import Link from 'next/link';
import mongoose from 'mongoose';
import { Copy, Download, Eye, ThumbsUp, ThumbsDown, ArrowLeft, Check, ExternalLink } from 'lucide-react';
import Seo from '@/components/Seo';
import connectMongo from '@/lib/mongoose';
import CodeShare from '@/models/CodeShare';
import { fmtDateTime, copyText } from '@/src/lib/timeAgo';

/** Halaman bagikan kode. Meta + preview dibuat dari isi kode (nama file, bahasa, cuplikan). */
export async function getServerSideProps({ params, res }) {
  if (!mongoose.isValidObjectId(params.id)) return { notFound: true };
  try {
    await connectMongo();
    const d = await CodeShare.findById(params.id).lean();
    if (!d) return { notFound: true };
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    return {
      props: {
        item: {
          id: String(d._id),
          author: d.author,
          fileName: d.fileName,
          code: d.code,
          tag: d.tag || 'Unknown',
          likes: d.likes || 0,
          dislikes: d.dislikes || 0,
          views: d.views || 0,
          createdAt: new Date(d.createdAt).toISOString(),
        },
      },
    };
  } catch {
    return { notFound: true };
  }
}

export default function CodeView({ item }) {
  const [copied, setCopied] = useState('');
  const [views, setViews] = useState(item.views);
  const lines = item.code.split('\n').length;

  // hitung 1 tayangan per sesi browser
  useEffect(() => {
    const k = `wd_cs_v_${item.id}`;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch {}
    fetch('/api/code-share', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, action: 'view' }) })
      .then((r) => r.json()).then((d) => d?.code && setViews(d.code.views)).catch(() => {});
  }, [item.id]);

  const copy = async (what, text) => {
    if (await copyText(text)) { setCopied(what); setTimeout(() => setCopied(''), 1500); }
  };

  return (
    <>
      <Seo
        title={`${item.fileName} — ${item.tag}`}
        path={`/tools/code-share/${item.id}`}
        label={`CODE · ${item.tag}`}
        meta={`oleh ${item.author} · ${lines} baris`}
        description={`${item.author} membagikan ${item.fileName} (${item.tag}, ${lines} baris): ${item.code}`}
        type="article"
        publishedTime={item.createdAt}
        noindex
      />
      <div className="cv-page">
        <Link href="/tools/code-share" className="cv-back"><ArrowLeft size={14} /> Semua kode</Link>
        <header>
          <h1>{item.fileName}</h1>
          <div className="cv-meta">
            <span className="badge">{item.tag}</span>
            <span>oleh <b>{item.author}</b></span>
            <span>{lines} baris</span>
            <span>{fmtDateTime(item.createdAt)}</span>
            <span className="cv-i"><Eye size={13} /> {views}</span>
            <span className="cv-i"><ThumbsUp size={13} /> {item.likes}</span>
            <span className="cv-i"><ThumbsDown size={13} /> {item.dislikes}</span>
          </div>
        </header>
        <div className="cv-actions">
          <button className="btn primary" onClick={() => copy('code', item.code)}>{copied === 'code' ? <Check size={14} /> : <Copy size={14} />} Salin kode</button>
          <button className="btn" onClick={() => copy('link', window.location.href)}>{copied === 'link' ? <Check size={14} /> : <ExternalLink size={14} />} Salin tautan</button>
          <a className="btn" download={item.fileName} href={`data:text/plain;charset=utf-8,${encodeURIComponent(item.code)}`}><Download size={14} /> Unduh</a>
        </div>
        <pre className="glass card cv-code"><code>{item.code}</code></pre>
      </div>
      <style jsx>{`
        .cv-page { width: min(980px, 100%); margin: 0 auto; display: grid; gap: 14px; padding-bottom: 24px; }
        .cv-page :global(.cv-back) { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--muted); text-decoration: none; justify-self: start; }
        .cv-page h1 { overflow-wrap: anywhere; }
        .cv-meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; font-size: 0.76rem; color: var(--muted); margin-top: 6px; }
        .cv-i { display: inline-flex; align-items: center; gap: 4px; }
        .cv-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .cv-code { margin: 0; overflow: auto; max-height: 70vh; font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.55; white-space: pre; tab-size: 2; }
      `}</style>
    </>
  );
}
