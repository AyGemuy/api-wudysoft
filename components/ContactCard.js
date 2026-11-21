import { useState } from 'react';
import { MessageCircle, Mail, Users, UsersRound, Code2, Check, Copy, ExternalLink } from 'lucide-react';
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

export default function ContactCard({ items = CONTACT_ITEMS }) {
  const [copied, setCopied] = useState('');
  const copy = async (id, text) => {
    await copyText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 1500);
  };
  return (
    <ul className="ct-list">
      {items.map((it) => (
        <li key={it.id} className="glass ct-item">
          <span className="ct-ico"><it.Icon size={18} /></span>
          <div className="ct-main">
            <b>{it.label}</b>
            <span className="ct-val">{it.value}</span>
            <span className="ct-hint">{it.hint}</span>
          </div>
          <div className="ct-act">
            {it.copy && (
              <button type="button" className="btn" onClick={() => copy(it.id, it.copy)} aria-label={`Salin ${it.label}`}>
                {copied === it.id ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
            <a className="btn primary" href={it.href} target="_blank" rel="noopener noreferrer">
              Buka <ExternalLink size={13} />
            </a>
          </div>
        </li>
      ))}
      <style jsx>{`
        .ct-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }
        .ct-item { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: var(--r-m); transition: translate 0.2s, border-color 0.2s; }
        .ct-item:hover { translate: 0 -2px; border-color: color-mix(in srgb, var(--a2) 45%, var(--border)); }
        .ct-ico { flex: none; width: 38px; height: 38px; display: grid; place-items: center; border-radius: var(--r-s); color: var(--on-accent); background: linear-gradient(135deg, var(--a1), var(--a3)); }
        .ct-main { display: grid; gap: 2px; flex: 1; min-width: 0; }
        .ct-val { font-family: var(--font-mono); font-size: 0.78rem; overflow-wrap: anywhere; }
        .ct-hint { font-size: 0.72rem; color: var(--muted); }
        .ct-act { display: flex; gap: 6px; flex: none; }
        .ct-act :global(.btn) { display: inline-flex; align-items: center; gap: 5px; }
      `}</style>
    </ul>
  );
}
