import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Download, FileText, Film, Music2, Image as ImageIcon, Reply as ReplyIcon, ExternalLink } from 'lucide-react';
import { bgOf, colorOf, initialOf, handleOf } from '@/src/lib/chatUser';

/** Avatar bulat gaya WhatsApp: foto bila ada, kalau tidak inisial berwarna stabil per pengguna. */
export function UserAvatar({ name, userId, src, size = 34 }) {
  const [bad, setBad] = useState(false);
  const key = userId || name;
  const st = { width: size, height: size, fontSize: size * 0.42 };
  if (src && !bad) return <img className="cr-ava" style={st} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
  return <span className="cr-ava" style={{ ...st, background: bgOf(key) }} aria-hidden="true">{initialOf(name)}</span>;
}

export const fmtSize = (n) => (!n ? '' : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)"'\]])/g;
/** Teks pesan dengan tautan yang bisa diklik. */
export function Linkified({ text }) {
  const parts = String(text || '').split(URL_RE);
  return parts.map((p, i) => (i % 2 ? <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow">{p}</a> : <span key={i}>{p}</span>));
}

/** Kutipan pesan yang dibalas; klik untuk melompat ke pesan aslinya. */
export function ReplyQuote({ r, onJump, mine }) {
  if (!r) return null;
  const label = r.text || ({ image: 'Foto', video: 'Video', audio: 'Audio', file: 'Dokumen' }[r.mediaType]) || 'Pesan dihapus';
  const Ico = { image: ImageIcon, video: Film, audio: Music2, file: FileText }[r.mediaType];
  return (
    <button type="button" className={`cr-quote ${mine ? 'mine' : ''}`} onClick={onJump} style={{ '--qc': colorOf(r.userId || r.name) }}>
      <span className="cr-quote-t">
        <b>{r.name || 'Pengguna'}</b>
        <small>{r.text || !Ico ? label : <><Ico size={12} /> {label}</>}</small>
      </span>
      {r.mediaUrl && <img src={r.mediaUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />}
    </button>
  );
}

/** Lampiran dalam gelembung: gambar (grid), video, audio, dan file. */
export function MediaView({ media = [], onOpen }) {
  const imgs = media.filter((m) => m.type === 'image');
  const rest = media.filter((m) => m.type !== 'image');
  return (
    <div className="cr-media">
      {imgs.length > 0 && (
        <div className={`cr-imgs n${Math.min(imgs.length, 4)}`}>
          {imgs.slice(0, 4).map((m, i) => (
            <button type="button" key={m.url + i} className="cr-img" onClick={() => onOpen?.(m)} aria-label={`Buka gambar ${m.name || i + 1}`}>
              <img src={m.url} alt={m.name || 'gambar'} loading="lazy" referrerPolicy="no-referrer" />
              {i === 3 && imgs.length > 4 && <span className="cr-more">+{imgs.length - 4}</span>}
            </button>
          ))}
        </div>
      )}
      {rest.map((m, i) => {
        if (m.type === 'video') return <video key={m.url + i} className="cr-vid" src={m.url} controls preload="metadata" playsInline />;
        if (m.type === 'audio') return <audio key={m.url + i} className="cr-aud" src={m.url} controls preload="none" />;
        return (
          <a key={m.url + i} className="cr-file" href={m.url} target="_blank" rel="noopener noreferrer" download={m.name || undefined}>
            <span className="cr-file-i"><FileText size={18} /></span>
            <span className="cr-file-t"><b>{m.name || 'Berkas'}</b><small>{[m.mime?.split('/')[1], fmtSize(m.size)].filter(Boolean).join(' · ') || 'Buka berkas'}</small></span>
            <ExternalLink size={14} />
          </a>
        );
      })}
    </div>
  );
}

/** Pratinjau layar penuh untuk gambar. */
export function Lightbox({ item, onClose }) {
  useEffect(() => {
    if (!item) return undefined;
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [item, onClose]);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div className="cr-lb" data-sound="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <div className="cr-lb-bar" onClick={(e) => e.stopPropagation()}>
            <span>{item.name || 'Gambar'}</span>
            <a className="btn" href={item.url} target="_blank" rel="noopener noreferrer" download><Download size={14} /> Unduh</a>
            <button type="button" className="btn" onClick={onClose} aria-label="Tutup"><X size={15} /></button>
          </div>
          <motion.img src={item.url} alt={item.name || ''} referrerPolicy="no-referrer" initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export { ReplyIcon, handleOf };

/** Gaya gelembung/komposer chat (global agar dipakai halaman rooms). */
export function ChatStyles() {
  return (
    <style jsx global>{`
      .cr-ava { flex: none; border-radius: 50%; display: grid; place-items: center; object-fit: cover; color: #fff; font-weight: 800; box-shadow: 0 0 0 2px color-mix(in srgb, var(--surface) 70%, transparent); }
      .cr-row { display: flex; align-items: flex-end; gap: 8px; max-width: 86%; align-self: flex-start; touch-action: pan-y; position: relative; }
      .cr-row.mine { align-self: flex-end; flex-direction: row-reverse; }
      .cr-row.cont { margin-top: -8px; }
      .cr-spacer { flex: none; width: 34px; }
      .cr-bub { position: relative; min-width: 0; padding: 7px 10px 6px; border-radius: var(--r-m); border: 1px solid var(--border); background: color-mix(in srgb, var(--text) 7%, transparent); font-size: .9rem; line-height: 1.45; display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; }
      .cr-row:not(.mine):not(.cont) .cr-bub { border-top-left-radius: 4px; }
      .cr-row.mine:not(.cont) .cr-bub { border-top-right-radius: 4px; }
      .cr-row.mine .cr-bub { background: linear-gradient(135deg, color-mix(in srgb, var(--a1) 38%, transparent), color-mix(in srgb, var(--a3) 34%, transparent)); border-color: color-mix(in srgb, var(--a2) 40%, var(--border)); }
      .cr-who { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
      .cr-who b { font-size: .8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .cr-who small { color: var(--muted); font-size: .66rem; font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .cr-txt { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
      .cr-txt a { color: var(--a2); text-decoration: underline; text-underline-offset: 2px; }
      .cr-txt.del { color: var(--muted); font-style: italic; }
      .cr-foot { display: flex; align-items: center; justify-content: flex-end; gap: 6px; min-height: 20px; }
      .cr-time { color: var(--muted); font-family: var(--font-mono); font-size: .62rem; margin-right: auto; }
      .cr-btn { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: var(--r-s, 8px); border: 1px solid var(--border); background: color-mix(in srgb, var(--text) 4%, transparent); color: var(--muted); font: inherit; font-size: .68rem; cursor: pointer; }
      .cr-btn:hover { color: var(--text); border-color: color-mix(in srgb, var(--a2) 50%, var(--border)); }
      .cr-btn.liked { color: var(--a2); border-color: var(--a2); }
      .cr-btn.del:hover { color: var(--err); border-color: var(--err); }
      .cr-hl > .cr-bub { animation: cr-flash 1.4s ease; }
      @keyframes cr-flash { 0%, 100% { box-shadow: none; } 20%, 70% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--a2) 55%, transparent); } }
      .cr-swipe-ico { position: absolute; left: -30px; top: 50%; translate: 0 -50%; color: var(--a2); opacity: 0; pointer-events: none; }
      .spin { animation: cr-spin 0.9s linear infinite; }
      @keyframes cr-spin { to { transform: rotate(360deg); } }
      html[data-anim='off'] .spin { animation-duration: 2s; }
      .cr-date { align-self: center; padding: 3px 12px; border-radius: 999px; font-size: .68rem; font-family: var(--font-mono); color: var(--muted); background: color-mix(in srgb, var(--text) 6%, transparent); border: 1px solid var(--border); margin: 4px 0; }

      .cr-quote { display: flex; align-items: stretch; gap: 8px; width: 100%; text-align: left; padding: 5px 8px; border: 0; border-left: 3px solid var(--qc, var(--a2)); border-radius: 6px; background: color-mix(in srgb, var(--qc, var(--a2)) 12%, transparent); color: var(--text); font: inherit; cursor: pointer; overflow: hidden; }
      .cr-quote-t { min-width: 0; flex: 1; display: grid; grid-template-columns: minmax(0, 1fr); gap: 1px; }
      .cr-quote-t b { color: var(--qc, var(--a2)); font-size: .74rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .cr-quote-t small { color: var(--muted); font-size: .76rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
      .cr-quote-t small svg { vertical-align: -2px; }
      .cr-quote img { flex: none; width: 38px; height: 38px; border-radius: 6px; object-fit: cover; }

      .cr-media { display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; }
      .cr-imgs { display: grid; grid-template-columns: minmax(0, 1fr); gap: 3px; border-radius: calc(var(--r-m) - 4px); overflow: hidden; width: min(280px, 100%); }
      .cr-imgs.n1 { grid-template-columns: minmax(0, 1fr); } .cr-imgs.n2, .cr-imgs.n3, .cr-imgs.n4 { grid-template-columns: 1fr 1fr; }
      .cr-imgs.n3 .cr-img:first-child { grid-column: span 2; }
      .cr-img { position: relative; padding: 0; border: 0; background: color-mix(in srgb, var(--text) 8%, transparent); cursor: zoom-in; aspect-ratio: 1; overflow: hidden; }
      .cr-imgs.n1 .cr-img { aspect-ratio: auto; max-height: 340px; }
      .cr-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .cr-imgs.n1 .cr-img img { height: auto; max-height: 340px; object-fit: contain; }
      .cr-more { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.55); color: #fff; font-weight: 800; font-size: 1.3rem; }
      .cr-vid { width: min(300px, 100%); max-height: 300px; border-radius: calc(var(--r-m) - 4px); background: #000; }
      .cr-aud { width: min(280px, 100%); height: 38px; }
      .cr-file { display: flex; align-items: center; gap: 10px; width: min(280px, 100%); padding: 8px 10px; border-radius: calc(var(--r-m) - 4px); border: 1px solid var(--border); background: color-mix(in srgb, var(--text) 5%, transparent); color: var(--text); text-decoration: none; }
      .cr-file-i { flex: none; width: 34px; height: 34px; display: grid; place-items: center; border-radius: var(--r-s, 8px); color: var(--on-accent); background: linear-gradient(135deg, var(--a1), var(--a3)); }
      .cr-file-t { min-width: 0; flex: 1; display: grid; }
      .cr-file-t b { font-size: .8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .cr-file-t small { color: var(--muted); font-size: .68rem; }

      .cr-comp { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; padding: 10px 14px 12px; border-top: 1px solid var(--border); background: color-mix(in srgb, var(--bg1) 35%, transparent); position: relative; }
      .cr-replybar { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--r-m); background: color-mix(in srgb, var(--text) 5%, transparent); border: 1px solid var(--border); }
      .cr-replybar .cr-quote { flex: 1; min-width: 0; cursor: default; }
      .cr-tray { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 4px; scrollbar-width: thin; }
      .cr-chip { position: relative; flex: none; width: 66px; height: 66px; border-radius: var(--r-m); border: 1px solid var(--border); background: color-mix(in srgb, var(--text) 6%, transparent); overflow: hidden; display: grid; place-items: center; color: var(--muted); }
      .cr-chip img, .cr-chip video { width: 100%; height: 100%; object-fit: cover; }
      .cr-chip.err { border-color: var(--err); }
      .cr-chip .cr-name { position: absolute; left: 0; right: 0; bottom: 0; padding: 1px 4px; font-size: .56rem; background: rgba(0,0,0,.55); color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .cr-chip-x { position: absolute; top: 3px; right: 3px; width: 20px; height: 20px; display: grid; place-items: center; border-radius: 50%; border: 0; background: rgba(0,0,0,.65); color: #fff; cursor: pointer; z-index: 2; }
      .cr-prog { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.5); color: #fff; font-size: .7rem; font-weight: 700; z-index: 1; }
      .cr-prog i { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--a2); transition: width .2s; }
      .cr-inrow { display: flex; align-items: flex-end; gap: 8px; }
      .cr-icon-btn { flex: none; width: 42px; height: 42px; display: grid; place-items: center; border-radius: 14px; border: 1px solid var(--border); background: color-mix(in srgb, var(--text) 5%, transparent); color: var(--text); cursor: pointer; }
      .cr-icon-btn:hover { color: var(--a2); border-color: var(--a2); }
      .cr-ta { flex: 1; min-width: 0; resize: none; max-height: 130px; min-height: 42px; padding: 10px 12px; line-height: 1.4; }
      .cr-drop { position: absolute; inset: 0; z-index: 20; display: grid; place-items: center; text-align: center; border: 2px dashed var(--a2); border-radius: var(--radius); background: color-mix(in srgb, var(--bg1) 80%, transparent); backdrop-filter: blur(6px); color: var(--a2); font-weight: 700; pointer-events: none; }

      .cr-lb { position: fixed; inset: 0; z-index: 10002; display: grid; place-items: center; padding: 56px 12px 12px; background: rgba(0,0,0,.86); }
      .cr-lb img { max-width: min(96vw, 1100px); max-height: calc(100dvh - 90px); object-fit: contain; border-radius: var(--r-m); }
      .cr-lb-bar { position: absolute; top: 10px; left: 12px; right: 12px; display: flex; align-items: center; gap: 8px; color: #fff; font-size: .8rem; }
      .cr-lb-bar span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      @media (max-width: 768px) { .cr-row { max-width: 94%; } .cr-comp { padding: 8px 10px 10px; } }
    `}</style>
  );
}
