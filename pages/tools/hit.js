import { useEffect, useState } from 'react';
import { MousePointerClick, Plus, Eye, Copy, Check } from 'lucide-react';
import Seo from '@/components/Seo';
import { PageHead, useToast, kit as s } from '@/components/PageKit';
import { http, qs } from '@/src/lib/http';
import { copyText, timeAgo } from '@/src/lib/timeAgo';

const KEY = 'wd_hit_sites';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };

export default function HitCounterPage() {
  const [name, setName] = useState('');
  const [sites, setSites] = useState([]); // situs yang pernah dipakai di browser ini: [{ name, hit, at }]
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState(false);
  const [toast, flash] = useToast();

  useEffect(() => setSites(load()), []);

  const remember = (d) => {
    const next = [{ name: d.site_name, hit: d.hit, at: Date.now() }, ...load().filter((x) => x.name !== d.site_name)].slice(0, 20);
    save(next); setSites(next);
  };
  const run = async (kind, label) => {
    const site = name.trim();
    if (!site) return flash('Isi nama situs dulu.', 'err');
    setBusy(kind);
    try {
      const d = await http('GET', `/api/tools/hit/${kind}?${qs({ sites: site })}`);
      remember(d.data);
      flash(label(d.data));
    } catch (e) { flash(e.message, 'err'); } finally { setBusy(''); }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const site = name.trim() || 'nama-situs';
  const snippet = `fetch('${origin}/api/tools/hit/hit?sites=${encodeURIComponent(site)}')\n  .then((r) => r.json())\n  .then((d) => console.log(d.data.hit));`;

  return (
    <>
      <Seo title="Hit Counter — penghitung kunjungan" path="/tools/hit" label="HIT COUNTER" description="Daftarkan situs lalu hitung kunjungannya lewat satu endpoint sederhana." />
      {toast}
      <div className={s.page}>
        <PageHead Icon={MousePointerClick} badge="HIT COUNTER" title="Penghitung Kunjungan" desc="Daftarkan nama situs, lalu panggil endpoint hit setiap ada kunjungan. Tanpa API key." />

        <section className={`glass card ${s.form}`}>
          <div className="field"><label htmlFor="ht-name">Nama situs</label><input id="ht-name" className="input" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. blog-saya" /></div>
          <div className={s.row}>
            <button type="button" className="btn primary" disabled={!!busy} onClick={() => run('create', (d) => `“${d.site_name}” terdaftar.`)}><Plus size={14} /> {busy === 'create' ? 'Mendaftarkan…' : 'Daftarkan'}</button>
            <button type="button" className="btn" disabled={!!busy} onClick={() => run('hit', (d) => `Hit ke-${d.hit} untuk “${d.site_name}”.`)}><MousePointerClick size={14} /> {busy === 'hit' ? 'Menambah…' : 'Tambah hit'}</button>
            <button type="button" className="btn" disabled={!!busy} onClick={() => run('view', (d) => `“${d.site_name}”: ${d.hit} hit.`)}><Eye size={14} /> {busy === 'view' ? 'Memuat…' : 'Lihat jumlah'}</button>
          </div>
        </section>

        <section className="glass card">
          <h3>Situs di browser ini <span className={s.muted}>({sites.length})</span></h3>
          {sites.length === 0 ? <p className={s.empty}>Belum ada. Daftarkan situs untuk mulai.</p> : (
            <ul className={s.list}>
              {sites.map((x) => (
                <li key={x.name} className={s.item}>
                  <div className={s.itemHead}><b>{x.name}</b><span className="badge ok">{x.hit} hit</span><button type="button" className={s.link} onClick={() => setName(x.name)}>Pakai</button></div>
                  <div className={s.meta}><span>Terakhir dicek {timeAgo(x.at)}</span></div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass card">
          <h3>Cara pakai</h3>
          <pre className={s.code}>{snippet}</pre>
          <div className={s.row} style={{ marginTop: 8 }}>
            <button type="button" className="btn" onClick={async () => { await copyText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check size={14} /> : <Copy size={14} />} Salin</button>
          </div>
        </section>
      </div>
    </>
  );
}
