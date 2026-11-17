import { useState } from 'react';
import Link from 'next/link';
import { Copy, Download, ExternalLink, Pencil, ArrowLeft, Clock, Check } from 'lucide-react';
import Seo from '@/components/Seo';
import connectMongo from '@/lib/mongoose';
import Paste from '@/models/Paste';
import { fmtDateTime, copyText } from '@/src/lib/timeAgo';

/** Halaman bagikan paste. Meta + gambar preview dibuat dari ISI paste (judul, cuplikan, sintaks). */
export async function getServerSideProps({ params, res }) {
  try {
    await connectMongo();
    const doc = await Paste.findOne({ key: String(params.key) }).lean();
    if (!doc || (doc.expiresAt && new Date(doc.expiresAt) < new Date())) return { notFound: true };
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
    return {
      props: {
        paste: {
          key: doc.key,
          title: doc.title,
          content: doc.content,
          syntax: doc.syntax || 'text',
          createdAt: new Date(doc.createdAt).toISOString(),
          updatedAt: new Date(doc.updatedAt || doc.createdAt).toISOString(),
          expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
        },
      },
    };
  } catch {
    return { notFound: true };
  }
}

export default function PasteView({ paste: p }) {
  const [copied, setCopied] = useState('');
  const lines = p.content.split('\n').length;
  const raw = `/api/tools/paste/v1?action=get&key=${encodeURIComponent(p.key)}&raw=true`;

  const copy = async (what, text) => {
    if (await copyText(text)) {
      setCopied(what);
      setTimeout(() => setCopied(''), 1500);
    }
  };

  return (
    <>
      <Seo
        title={p.title}
        path={`/tools/pastes/${p.key}`}
        label={`PASTE · ${p.syntax}`}
        meta={`${lines} baris · ${p.key}`}
        description={p.content}
        type="article"
        publishedTime={p.createdAt}
        noindex
      />
      <div className="pv-page">
        <Link href="/tools/pastes" className="pv-back"><ArrowLeft size={14} /> Semua paste</Link>
        <header>
          <h1>{p.title}</h1>
          <div className="pv-meta">
            <span className="badge">{p.syntax}</span>
            <code>{p.key}</code>
            <span>{lines} baris</span>
            <span>dibuat {fmtDateTime(p.createdAt)}</span>
            {p.updatedAt !== p.createdAt && <span>diubah {fmtDateTime(p.updatedAt)}</span>}
            {p.expiresAt && <span className="pv-exp"><Clock size={12} /> kedaluwarsa {fmtDateTime(p.expiresAt)}</span>}
          </div>
        </header>

        <div className="pv-actions">
          <button className="btn primary" onClick={() => copy('content', p.content)}>{copied === 'content' ? <Check size={14} /> : <Copy size={14} />} Salin isi</button>
          <button className="btn" onClick={() => copy('link', window.location.href)}>{copied === 'link' ? <Check size={14} /> : <ExternalLink size={14} />} Salin tautan</button>
          <a className="btn" href={raw} target="_blank" rel="noreferrer">Raw</a>
          <a className="btn" href={`data:text/plain;charset=utf-8,${encodeURIComponent(p.content)}`} download={`${p.key}.txt`}><Download size={14} /> Unduh</a>
          <Link className="btn" href={`/tools/pastes?edit=${encodeURIComponent(p.key)}`}><Pencil size={14} /> Edit</Link>
        </div>

        <pre className="glass card pv-code"><code>{p.content}</code></pre>
      </div>

      <style jsx>{`
        .pv-page { width: min(980px, 100%); margin: 0 auto; display: grid; gap: 14px; padding-bottom: 24px; }
        .pv-page :global(.pv-back) { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--muted); text-decoration: none; justify-self: start; }
        .pv-page h1 { overflow-wrap: anywhere; }
        .pv-meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; font-size: 0.74rem; color: var(--muted); margin-top: 6px; }
        .pv-meta code { font-family: var(--font-mono); }
        .pv-exp { display: inline-flex; align-items: center; gap: 4px; }
        .pv-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .pv-code { margin: 0; overflow: auto; max-height: 70vh; font-family: var(--font-mono); font-size: 0.8rem; line-height: 1.55; white-space: pre; tab-size: 2; }
      `}</style>
    </>
  );
}
