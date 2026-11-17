import { useState } from 'react';
import Link from 'next/link';
import { Copy, Download, ExternalLink, Clock, ArrowLeft, FileText, Check } from 'lucide-react';
import Seo from '@/components/Seo';
import { useToast } from '@/components/Toast';
import connectMongo from '@/lib/mongoose';
import Paste from '@/models/Paste';
import { originFromReq, snippet, plain } from '@/lib/ssrMeta';

/**
 * Halaman bagikan paste. Di-render di server supaya crawler (WhatsApp, Telegram, Discord, X, …)
 * langsung melihat <meta> dengan judul & cuplikan isi paste yang sebenarnya + gambar /api/og.
 */
export async function getServerSideProps({ params, req, res }) {
  const origin = originFromReq(req);
  const key = String(params.key || '');
  let paste = null;
  let dbError = false;
  if (/^[A-Za-z0-9_-]{1,64}$/.test(key)) {
    try {
      await connectMongo();
      const doc = await Paste.findOne({ key });
      if (doc) paste = plain(doc);
    } catch {
      dbError = true; // DB sedang bermasalah: jangan sampai crawler menyimpan 404 untuk tautan yang valid
    }
  }
  const expired = !!(paste && paste.expiresAt && new Date(paste.expiresAt) < new Date());
  if (dbError) { res.statusCode = 503; res.setHeader('Cache-Control', 'no-store'); }
  else if (!paste) res.statusCode = 404;
  else if (expired) res.statusCode = 410;
  else res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return { props: { paste: expired ? { key: paste.key, title: paste.title, expired: true } : paste, origin, keyParam: key } };
}

export default function PastePage({ paste, origin, keyParam }) {
  const [toast, toastNode] = useToast();
  const [copied, setCopied] = useState(false);

  if (!paste || paste.expired) {
    const gone = !!paste?.expired;
    return (
      <>
        <Seo title={gone ? 'Paste kedaluwarsa' : 'Paste tidak ditemukan'} description={gone ? 'Paste ini sudah melewati masa berlakunya.' : 'Paste yang kamu cari tidak ada atau sudah dihapus.'} path={`/paste/${keyParam}`} origin={origin} tag="PASTE" noindex />
        <div className="glass card" style={{ alignItems: 'center', textAlign: 'center', gap: 12, padding: '48px 20px' }}>
          <FileText size={40} color="var(--muted)" />
          <h1 style={{ fontSize: '1.5rem' }}>{gone ? 'Paste sudah kedaluwarsa' : 'Paste tidak ditemukan'}</h1>
          <p>{gone ? 'Masa berlaku paste ini telah habis.' : 'Tautan salah, atau paste sudah dihapus.'}</p>
          <Link href="/tools/pastes" className="btn primary">Ke daftar Pastes</Link>
        </div>
      </>
    );
  }

  const url = `${origin}/paste/${paste.key}`;
  const copy = async (text, msg) => {
    try { await navigator.clipboard.writeText(text); toast(msg); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { toast('Gagal menyalin', 'err'); }
  };
  const download = () => {
    const blob = new Blob([paste.content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${paste.title.replace(/[^\w.-]+/g, '_') || paste.key}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const lines = paste.content.split('\n').length;

  return (
    <>
      <Seo
        title={paste.title}
        description={snippet(paste.content, 190)}
        path={`/paste/${paste.key}`}
        origin={origin}
        type="article"
        tag={`PASTE · ${paste.syntax || 'text'}`}
        publishedTime={paste.createdAt}
        modifiedTime={paste.updatedAt}
        keywords={['paste', paste.syntax, paste.title]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: paste.title,
          text: paste.content.slice(0, 5000),
          programmingLanguage: paste.syntax,
          datePublished: paste.createdAt,
          dateModified: paste.updatedAt,
          url,
        }}
      />
      {toastNode}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Link href="/tools/pastes" className="muted-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={15} /> Semua paste</Link>

        <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ wordBreak: 'break-word' }}>{paste.title}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span className="chip">{paste.syntax || 'text'}</span>
            <span className="chip muted">{lines} baris</span>
            <span className="chip muted">{new Date(paste.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            {paste.expiresAt && <span className="chip warn"><Clock size={11} /> berakhir {new Date(paste.expiresAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>}
          </div>
        </header>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button className="btn sm" onClick={() => copy(paste.content, 'Isi disalin')}>{copied ? <Check size={14} /> : <Copy size={14} />} Salin isi</button>
          <button className="btn sm" onClick={() => copy(url, 'Tautan disalin')}><Copy size={14} /> Salin link</button>
          <a className="btn sm" href={`/api/tools/paste/v1?action=get&key=${encodeURIComponent(paste.key)}&raw=true`} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Raw</a>
          <button className="btn sm" onClick={download}><Download size={14} /> Unduh</button>
        </div>

        <pre className="code-block" style={{ maxHeight: '70vh' }}>{paste.content}</pre>
      </div>
    </>
  );
}
