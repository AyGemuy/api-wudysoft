import { useEffect, useState } from 'react';
import site from '@/configs/siteConfig';
import { Reveal, Stagger, Item } from '@/components/motion';

const GhMark = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 014 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);
const fmtN = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n ?? 0));
const ago = (d) => {
  const days = Math.floor((Date.now() - new Date(d)) / 864e5);
  return days < 1 ? 'hari ini' : days < 30 ? `${days} hari lalu` : days < 365 ? `${Math.floor(days / 30)} bln lalu` : `${Math.floor(days / 365)} thn lalu`;
};

/** Kartu info GitHub pengembang (data dari /api/github, aman bila GitHub tidak terjangkau). */
export default function GithubCard({ variant = 'left' }) {
  const [d, setD] = useState(null);
  const user = site.GITHUB_USER;
  const href = `https://github.com/${user}`;

  useEffect(() => {
    let alive = true;
    fetch('/api/github').then((r) => r.json()).then((j) => alive && setD(j)).catch(() => alive && setD({ ok: false }));
    return () => { alive = false; };
  }, []);

  const u = d?.ok ? d.user : null;
  return (
    <Reveal as="section" variant={variant} className="glass gh-card" aria-label="Repositori GitHub">
      <div className="gh-top">
        <span className="gh-ava">{u?.avatar ? <img src={u.avatar} alt="" loading="lazy" /> : <GhMark size={26} />}</span>
        <div className="gh-id">
          <h3>{u?.name || user}</h3>
          <a href={href} target="_blank" rel="noopener noreferrer" className="gh-handle"><GhMark size={13} /> @{user}</a>
        </div>
        <a className="btn gh-btn" href={href} target="_blank" rel="noopener noreferrer">Lihat repo</a>
      </div>

      {!d && <div className="mo-skeleton" style={{ height: 64, borderRadius: 10 }} />}
      {d && !u && <p className="gh-note">Data GitHub sedang tidak dapat dimuat. Buka profil langsung lewat tombol di atas.</p>}

      {u && (
        <>
          {u.bio && <p className="gh-bio">{u.bio}</p>}
          <div className="gh-stats">
            <div><b>{fmtN(u.publicRepos)}</b><span>Repo</span></div>
            <div><b>{fmtN(d.stats.stars)}</b><span>Bintang</span></div>
            <div><b>{fmtN(d.stats.forks)}</b><span>Fork</span></div>
            <div><b>{fmtN(u.followers)}</b><span>Pengikut</span></div>
          </div>
          {d.stats.languages.length > 0 && (
            <div className="gh-langs">{d.stats.languages.map((l) => <span key={l.name} className="badge">{l.name} · {l.count}</span>)}</div>
          )}
          <Stagger cycle className="gh-list">
            {d.repos.map((r) => (
              <Item as="a" key={r.name} href={r.url} target="_blank" rel="noopener noreferrer" className="gh-repo mo-lift">
                <strong>{r.name}</strong>
                <span className="gh-desc">{r.description || 'Tanpa deskripsi'}</span>
                <span className="gh-meta">
                  {r.language && <span>● {r.language}</span>}
                  <span>★ {fmtN(r.stars)}</span>
                  <span>⑂ {fmtN(r.forks)}</span>
                  <span>{ago(r.pushedAt)}</span>
                </span>
              </Item>
            ))}
          </Stagger>
          <small className="gh-note">{[u.location, u.company, u.createdAt && `di GitHub sejak ${new Date(u.createdAt).getFullYear()}`].filter(Boolean).join(' · ')}</small>
        </>
      )}

      <style jsx global>{`
        .gh-card { padding: clamp(16px, 4vw, 24px); border-radius: var(--radius); display: grid; gap: 14px; }
        .gh-top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .gh-ava { width: 48px; height: 48px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; background: var(--surface); border: 1px solid var(--border); flex-shrink: 0; }
        .gh-ava img { width: 100%; height: 100%; object-fit: cover; }
        .gh-id { min-width: 0; flex: 1 1 140px; display: grid; gap: 2px; }
        .gh-id h3 { font-size: 1rem; overflow-wrap: anywhere; }
        .gh-handle { display: inline-flex; align-items: center; gap: 5px; font-size: 0.78rem; font-family: var(--font-mono); color: var(--muted); text-decoration: none; }
        .gh-handle:hover { color: var(--a2); }
        .gh-btn { font-size: 0.78rem; }
        .gh-bio, .gh-note { font-size: 0.8rem; color: var(--muted); }
        .gh-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .gh-stats div { display: grid; text-align: center; padding: 10px 4px; border: 1px solid var(--border); border-radius: var(--r-s); background: color-mix(in srgb, var(--surface) 60%, transparent); }
        .gh-stats b { font-size: 1.05rem; color: var(--a2); }
        .gh-stats span { font-size: 0.68rem; color: var(--muted); }
        .gh-langs { display: flex; flex-wrap: wrap; gap: 6px; }
        .gh-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); gap: 10px; }
        .gh-repo { display: grid; gap: 6px; align-content: start; padding: 12px; border: 1px solid var(--border); border-radius: var(--r-m); text-decoration: none; color: inherit; min-width: 0; background: color-mix(in srgb, var(--surface) 55%, transparent); }
        .gh-repo strong { font-size: 0.85rem; color: var(--a2); overflow-wrap: anywhere; }
        .gh-desc { font-size: 0.74rem; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .gh-meta { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 0.68rem; color: var(--muted); font-family: var(--font-mono); }
        @media (max-width: 420px) { .gh-stats { grid-template-columns: repeat(2, 1fr); } .gh-btn { width: 100%; justify-content: center; } }
      `}</style>
    </Reveal>
  );
}
