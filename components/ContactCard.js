import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Mail, Users, UsersRound, Code2, Check, Copy, ExternalLink, Link2, ArrowRight } from 'lucide-react';
import { toast } from '@/src/lib/toast';
import site from '@/configs/siteConfig';
import { copyText } from '@/src/lib/timeAgo';

const C = site.CONTACT;

/** Daftar kontak & komunitas (sumber tunggal: configs/siteConfig.cjs → CONTACT). */
export const CONTACT_ITEMS = [
  { id: 'wa', Icon: MessageCircle, label: 'WhatsApp Admin', value: C.WHATSAPP, href: C.WHATSAPP_URL, hint: 'Chat langsung dengan admin/author', copy: C.WHATSAPP },
  { id: 'mail', Icon: Mail, label: 'Email', value: C.EMAIL, href: `mailto:${C.EMAIL}`, hint: 'Kerja sama, bug report, atau pertanyaan', copy: C.EMAIL },
  { id: 'group', Icon: Users, label: 'Grup WhatsApp', value: 'Gabung grup diskusi', href: C.WA_GROUP_URL, hint: 'Tanya jawab & diskusi pengguna' },
  { id: 'community', Icon: UsersRound, label: 'Komunitas WhatsApp', value: 'Gabung komunitas', href: C.WA_COMMUNITY_URL, hint: 'Pengumuman & update terbaru' },
  { id: 'gh', Icon: Code2, label: 'GitHub', value: `@${site.GITHUB_USER}`, href: C.GITHUB_URL, hint: 'Profil pengembang' },
  { id: 'repo', Icon: Code2, label: 'Source Code', value: C.REPO, href: C.REPO_URL, hint: 'Repositori open source — star & kontribusi welcome' },
];

const HOST = 'wudysoft.app';

/**
 * Satu kartu kontak bergaya kartu di Home: chrome (lampu + URL + status) → badan (judul, deskripsi)
 * → daftar kontak dalam satu kartu → footer. Sorotan kursor & kemiringan lembut mengikuti pengaturan tema.
 */
export default function ContactCard({ items = CONTACT_ITEMS, heading: H = 'h3' }) {
  const [copied, setCopied] = useState('');
  const ref = useRef(null);
  const copy = async (id, text) => {
    await copyText(text);
    setCopied(id);
    toast.ok('Disalin ke clipboard.');
    setTimeout(() => setCopied(''), 1500);
  };
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  return (
    <motion.article
      ref={ref}
      className="ct-card glass"
      style={{ '--ac': 'var(--a1)' }}
      initial={{ opacity: 0, y: 34, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      onPointerMove={onMove}
    >
      <span className="ct-spot" aria-hidden="true" />

      {/* 1. Chrome: lampu + URL + status */}
      <div className="ct-chrome">
        <span className="ct-traffic" aria-hidden="true"><i /><i /><i /></span>
        <span className="ct-url"><Link2 size={10} /><span>{HOST}/profile?tab=kontak</span></span>
        <span className="ct-status">ONLINE</span>
      </div>

      {/* 2. Badan */}
      <div className="ct-body">
        <div className="ct-title-row">
          <span className="ct-icon"><MessageCircle size={18} /></span>
          <H>Kontak & Komunitas</H>
        </div>
        <p>Proyek ini open source. Hubungi admin/author, gabung grup atau komunitas WhatsApp, atau kirim kontribusi lewat GitHub.</p>

        <ul className="ct-list">
          {items.map((it) => (
            <li key={it.id} className="ct-item">
              <span className="ct-ico"><it.Icon size={17} /></span>
              <div className="ct-main">
                <b>{it.label}</b>
                <span className="ct-val">{it.value}</span>
                <span className="ct-hint">{it.hint}</span>
              </div>
              <div className="ct-act">
                {it.copy && (
                  <button type="button" className="ct-btn" onClick={() => copy(it.id, it.copy)} aria-label={`Salin ${it.label}`} title="Salin">
                    {copied === it.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                )}
                <a className="ct-btn go" href={it.href} target="_blank" rel="noopener noreferrer" aria-label={`Buka ${it.label}`}>
                  Buka <ExternalLink size={12} />
                </a>
              </div>
            </li>
          ))}
        </ul>

        <div className="ct-tags">
          {['WhatsApp', 'Email', 'Komunitas', 'GitHub'].map((t) => <span key={t}>{t}</span>)}
        </div>
      </div>

      {/* 3. Footer */}
      <div className="ct-foot">
        <span className="ct-cat">KOMUNIKASI</span>
        <span className="ct-meta">{items.length} kanal</span>
        <a className="ct-open" href={items[0]?.href} target="_blank" rel="noopener noreferrer">
          Chat admin <ArrowRight size={14} />
        </a>
      </div>

      <style jsx global>{`
        .ct-card { --mx: 50%; --my: 0%; position: relative; display: flex; flex-direction: column; width: 100%; overflow: hidden; transition: border-color .25s ease, box-shadow .3s ease; }
        .ct-card:hover { border-color: color-mix(in srgb, var(--text) 24%, var(--border)); box-shadow: 0 22px 40px -26px rgba(0, 0, 0, .45); }
        .ct-spot { position: absolute; inset: 0; pointer-events: none; opacity: 0; z-index: 3; transition: opacity .3s ease; background: radial-gradient(260px circle at var(--mx) var(--my), color-mix(in srgb, var(--text) 7%, transparent), transparent 65%); }
        .ct-card:hover .ct-spot { opacity: 1; }
        .ct-chrome { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-bottom: 1px solid var(--border); background: color-mix(in srgb, var(--text) 4%, transparent); }
        .ct-traffic { display: flex; gap: 5px; flex-shrink: 0; }
        .ct-traffic i { width: 8px; height: 8px; border-radius: 50%; background: color-mix(in srgb, var(--text) 22%, transparent); transition: background .25s ease; }
        .ct-card:hover .ct-traffic i:nth-child(1) { background: var(--err); }
        .ct-card:hover .ct-traffic i:nth-child(2) { background: var(--warn); }
        .ct-card:hover .ct-traffic i:nth-child(3) { background: var(--ok); }
        .ct-url { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: var(--r-chip); font-family: var(--font-mono); font-size: .66rem; color: var(--muted); background: color-mix(in srgb, var(--bg1) 45%, transparent); border: 1px solid var(--border); }
        .ct-url span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ct-status { flex-shrink: 0; font-family: var(--font-mono); font-size: .6rem; font-weight: 700; letter-spacing: .05em; padding: 3px 7px; border-radius: 6px; color: var(--ok); background: color-mix(in srgb, var(--ok) 14%, transparent); border: 1px solid color-mix(in srgb, var(--ok) 35%, transparent); }
        .ct-body { display: flex; flex-direction: column; gap: 12px; padding: calc(16px * var(--space, 1)) calc(18px * var(--space, 1)) calc(12px * var(--space, 1)); }
        .ct-title-row { display: flex; align-items: center; gap: 10px; }
        .ct-title-row :is(h1, h3) { font-size: 1.05rem; min-width: 0; margin: 0; }
        .ct-icon { flex-shrink: 0; width: 34px; height: 34px; border-radius: var(--r-m); display: flex; align-items: center; justify-content: center; color: var(--ac); background: color-mix(in srgb, var(--ac) 14%, transparent); border: 1px solid color-mix(in srgb, var(--ac) 30%, transparent); transition: transform .35s cubic-bezier(.34, 1.56, .64, 1); }
        .ct-card:hover .ct-icon { transform: rotate(-10deg) scale(1.14); }
        .ct-body > p { font-size: .84rem; line-height: 1.55; margin: 0; }
        .ct-list { list-style: none; margin: 2px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 0 18px; }
        .ct-item { display: flex; align-items: center; gap: 12px; padding: 12px 6px; border-top: 1px solid var(--border); border-radius: 0; transition: background-color .2s ease; }
        .ct-item:hover { background: color-mix(in srgb, var(--text) 4%, transparent); }
        .ct-ico { flex: none; width: 36px; height: 36px; display: grid; place-items: center; border-radius: var(--r-s); color: var(--on-accent); background: linear-gradient(135deg, var(--a1), var(--a3)); }
        .ct-main { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2px; flex: 1; min-width: 0; }
        .ct-main b { font-size: .88rem; }
        .ct-val { font-family: var(--font-mono); font-size: .76rem; overflow-wrap: anywhere; }
        .ct-hint { font-size: .72rem; color: var(--muted); }
        .ct-act { display: flex; gap: 6px; flex: none; }
        .ct-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: var(--r-btn, 10px); border: 1px solid var(--border); background: color-mix(in srgb, var(--text) 5%, transparent); color: var(--text); font: inherit; font-size: .74rem; font-weight: 700; text-decoration: none; cursor: pointer; transition: border-color .2s, color .2s; }
        .ct-btn:hover { border-color: var(--a2); color: var(--a2); }
        .ct-btn.go { color: var(--ac); border-color: color-mix(in srgb, var(--ac) 35%, var(--border)); background: color-mix(in srgb, var(--ac) 12%, transparent); }
        .ct-tags { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 2px; }
        .ct-tags span { font-family: var(--font-mono); font-size: .64rem; padding: 3px 8px; border-radius: 6px; color: var(--muted); background: color-mix(in srgb, var(--text) 6%, transparent); border: 1px solid var(--border); }
        .ct-foot { display: flex; align-items: center; gap: 10px; padding: calc(12px * var(--space, 1)) calc(18px * var(--space, 1)); border-top: 1px solid var(--border); font-family: var(--font-mono); font-size: .7rem; color: var(--muted); }
        .ct-cat { text-transform: uppercase; letter-spacing: .06em; }
        .ct-meta { flex: 1; }
        .ct-open { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: var(--ac); text-decoration: none; }
        .ct-open svg { transition: transform .25s ease; }
        .ct-card:hover .ct-open svg { transform: translateX(5px); }
        @media (max-width: 520px) { .ct-list { grid-template-columns: minmax(0, 1fr); } .ct-item { flex-wrap: wrap; } .ct-act { width: 100%; justify-content: flex-end; } }
      `}</style>
    </motion.article>
  );
}
