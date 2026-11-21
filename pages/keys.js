import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, Plus, Trash2, Copy, Check, X, ShieldCheck, FlaskConical, BookOpen } from 'lucide-react';
import Seo from '@/components/Seo';
import { Reveal, TextReveal } from '@/components/motion';
import { timeAgo, fmtDateTime, copyText } from '@/src/lib/timeAgo';

const EXP = [{ v: 0, l: 'Tanpa kedaluwarsa' }, { v: 7, l: '7 hari' }, { v: 30, l: '30 hari' }, { v: 90, l: '90 hari' }, { v: 365, l: '1 tahun' }];

async function api(method, url, body) {
  const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || `Gagal (${r.status})`);
  return d;
}

export default function KeysPage() {
  const [keys, setKeys] = useState([]);
  const [max, setMax] = useState(10);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', write: false, days: 0 });
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState(null); // { key, item }
  const [copied, setCopied] = useState('');
  const [test, setTest] = useState(null);
  const [toast, setToast] = useState(null);

  const flash = (m, t = 'ok') => { setToast({ m, t }); setTimeout(() => setToast(null), 2600); };
  const load = useCallback(async () => {
    try { const d = await api('GET', '/api/keys'); setKeys(d.keys); setMax(d.max); setErr(''); } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const d = await api('POST', '/api/keys', { name: form.name, scopes: form.write ? ['read', 'write'] : ['read'], expiresInDays: form.days });
      setFresh(d); setTest(null); setForm({ name: '', write: false, days: 0 }); load();
    } catch (er) { flash(er.message, 'err'); } finally { setBusy(false); }
  };
  const revoke = async (k) => {
    if (!window.confirm(`Cabut kunci “${k.name}”? Aplikasi yang memakainya akan langsung ditolak.`)) return;
    try { await api('DELETE', `/api/keys?id=${k.id}`); flash('Kunci dicabut.'); load(); } catch (er) { flash(er.message, 'err'); }
  };
  const copy = async (id, text) => { await copyText(text); setCopied(id); setTimeout(() => setCopied(''), 1500); };
  const runTest = async () => {
    setTest({ loading: true });
    const t0 = performance.now();
    const r = await fetch('/api/whoami', { headers: { 'x-api-key': fresh.key }, cache: 'no-store' });
    setTest({ code: r.status, ms: Math.round(performance.now() - t0), body: await r.json().catch(() => ({})) });
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const active = keys.filter((k) => !k.revoked).length;
  const state = (k) => (k.revoked ? ['Dicabut', 'err'] : k.expiresAt && new Date(k.expiresAt) < new Date() ? ['Kedaluwarsa', 'warn'] : ['Aktif', 'ok']);

  return (
    <>
      <Seo title="API Keys — kunci akses pribadi" path="/keys" label="API KEYS" description="Buat dan kelola kunci API pribadi untuk mengakses endpoint Wudysoft dari aplikasi Anda." noindex />
      <div className="ky-page">
        <header>
          <Reveal variant="down"><div className="badge ok" style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}><KeyRound size={14} color="var(--a2)" /> <span>API KEYS</span></div></Reveal>
          <h1><TextReveal as="span" text="Kunci API" by="word" /></h1>
          <Reveal as="p" variant="blur" delay={0.15}>Akses endpoint dari skrip atau aplikasi tanpa login. Kunci disimpan sebagai hash — teks aslinya hanya tampil sekali.</Reveal>
        </header>

        <AnimatePresence>{toast && <motion.div className={`ky-toast ${toast.t}`} initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{toast.t === 'err' ? <X size={16} /> : <Check size={16} />} {toast.m}</motion.div>}</AnimatePresence>

        <AnimatePresence>
          {fresh && (
            <motion.section className="glass card ky-fresh" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <h3><ShieldCheck size={16} /> Kunci “{fresh.item.name}” dibuat</h3>
              <p className="ky-warn">Salin dan simpan sekarang. Kunci ini <b>tidak akan ditampilkan lagi</b>.</p>
              <div className="ky-keybox"><code data-sound="off">{fresh.key}</code><button type="button" className="btn" onClick={() => copy('key', fresh.key)}>{copied === 'key' ? <Check size={14} /> : <Copy size={14} />} Salin</button></div>
              <pre className="ky-code">{`curl ${origin}/api/whoami \\\n  -H 'x-api-key: ${fresh.key}'`}</pre>
              <div className="ky-row">
                <button type="button" className="btn" onClick={runTest}><FlaskConical size={14} /> Tes kunci</button>
                <button type="button" className="btn" onClick={() => copy('curl', `curl ${origin}/api/whoami -H 'x-api-key: ${fresh.key}'`)}>{copied === 'curl' ? <Check size={14} /> : <Copy size={14} />} Salin cURL</button>
                <button type="button" className="btn" onClick={() => { setFresh(null); setTest(null); }}>Selesai</button>
              </div>
              {test && (test.loading ? <p className="ky-muted">Menguji…</p> : <div className={`ky-test ${test.code === 200 ? 'ok' : 'err'}`}><b>HTTP {test.code}</b> · {test.ms} ms<pre>{JSON.stringify(test.body, null, 2)}</pre></div>)}
            </motion.section>
          )}
        </AnimatePresence>

        <form className="glass card ky-form" onSubmit={create}>
          <h3><Plus size={16} /> Kunci baru <span className="ky-muted">({active}/{max} aktif)</span></h3>
          <div className="ky-fields">
            <div className="field"><label htmlFor="ky-name">Nama</label><input id="ky-name" className="input" maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mis. Bot Telegram" required /></div>
            <div className="field"><label htmlFor="ky-exp">Masa berlaku</label><select id="ky-exp" className="input" value={form.days} onChange={(e) => setForm({ ...form, days: +e.target.value })}>{EXP.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}</select></div>
            <label className="ky-check"><input type="checkbox" checked={form.write} onChange={(e) => setForm({ ...form, write: e.target.checked })} /> Izinkan tulis (POST/PUT/DELETE)</label>
          </div>
          <button className="btn primary" type="submit" disabled={busy || active >= max}>{busy ? 'Membuat…' : 'Buat kunci'}</button>
        </form>

        <section className="glass card">
          <h3>Kunci Anda</h3>
          {loading ? <p className="ky-muted">Memuat…</p> : err ? <p style={{ color: 'var(--err)' }}>{err}</p> : keys.length === 0 ? <p className="ky-muted">Belum ada kunci.</p> : (
            <ul className="ky-list">
              {keys.map((k) => { const [lbl, cls] = state(k); return (
                <li key={k.id} className={k.revoked ? 'dead' : ''}>
                  <div className="ky-main"><b>{k.name}</b><code>{k.prefix}••••••••</code></div>
                  <span className={`badge ${cls}`}>{lbl}</span>
                  <span className="badge">{k.scopes.includes('write') ? 'baca + tulis' : 'baca'}</span>
                  <div className="ky-meta"><span>Dibuat {timeAgo(k.createdAt)}</span><span>{k.lastUsedAt ? `Dipakai ${timeAgo(k.lastUsedAt)}` : 'Belum dipakai'} · {k.uses}×</span>{k.expiresAt && <span title={fmtDateTime(k.expiresAt)}>Berakhir {timeAgo(k.expiresAt)}</span>}</div>
                  {!k.revoked && <button type="button" className="ky-del" onClick={() => revoke(k)} aria-label={`Cabut ${k.name}`}><Trash2 size={15} /> Cabut</button>}
                </li>
              ); })}
            </ul>
          )}
        </section>

        <section className="glass card ky-doc">
          <h3><BookOpen size={16} /> Cara memakai</h3>
          <p>Kirim kunci di header <code>x-api-key</code> (atau <code>Authorization: Bearer wd_live_…</code>). Batas 120 permintaan per menit per kunci.</p>
          <pre className="ky-code">{`curl ${origin || 'https://domain-anda'}/api/whoami -H 'x-api-key: wd_live_xxxxxxxx'`}</pre>
          <Link className="btn" href="/docs">Lihat dokumentasi API</Link>
        </section>
      </div>

      <style jsx>{`
        .ky-page { width: min(860px, 100%); margin: 0 auto; display: grid; gap: 16px; padding-bottom: 24px; }
        h3 { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; margin: 0 0 10px; }
        .ky-muted { color: var(--muted); font-size: 0.8rem; font-weight: 400; }
        .ky-fresh { display: grid; gap: 10px; border-color: color-mix(in srgb, var(--ok) 50%, var(--border)); }
        .ky-warn { margin: 0; font-size: 0.82rem; color: var(--warn); }
        .ky-keybox { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 10px; border: 1px dashed var(--border); border-radius: var(--r-m); }
        .ky-keybox code { flex: 1 1 260px; font-family: var(--font-mono); font-size: 0.78rem; overflow-wrap: anywhere; user-select: all; }
        .ky-code { margin: 0; padding: 12px; border-radius: var(--r-m); border: 1px solid var(--border); background: color-mix(in srgb, var(--bg1) 55%, transparent); font-family: var(--font-mono); font-size: 0.74rem; overflow: auto; white-space: pre; }
        .ky-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .ky-test { padding: 10px 12px; border-radius: var(--r-m); border: 1px solid var(--border); font-size: 0.8rem; } .ky-test.ok { border-color: color-mix(in srgb, var(--ok) 50%, var(--border)); } .ky-test.err { border-color: color-mix(in srgb, var(--err) 50%, var(--border)); }
        .ky-test pre { margin: 6px 0 0; font-family: var(--font-mono); font-size: 0.72rem; overflow: auto; }
        .ky-form { display: grid; gap: 12px; } .ky-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; align-items: end; }
        .ky-check { display: flex; gap: 8px; align-items: center; font-size: 0.82rem; padding-bottom: 8px; cursor: pointer; }
        .ky-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
        .ky-list li { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 12px; border: 1px solid var(--border); border-radius: var(--r-m); transition: translate 0.2s, border-color 0.2s; }
        .ky-list li:hover { translate: 0 -2px; border-color: color-mix(in srgb, var(--a2) 40%, var(--border)); } .ky-list li.dead { opacity: 0.55; }
        .ky-main { display: grid; flex: 1 1 160px; min-width: 0; } .ky-main code { font-family: var(--font-mono); font-size: 0.74rem; color: var(--muted); }
        .ky-meta { display: flex; gap: 12px; flex-wrap: wrap; width: 100%; font-size: 0.72rem; color: var(--muted); }
        .ky-del { display: inline-flex; gap: 5px; align-items: center; border: 1px solid var(--border); background: transparent; color: var(--err); padding: 5px 10px; border-radius: min(var(--r-btn), 12px); cursor: pointer; font-size: 0.76rem; }
        .ky-doc p { font-size: 0.84rem; color: var(--muted); } .ky-doc code { font-family: var(--font-mono); }
        .ky-toast { position: fixed; top: 84px; right: 16px; z-index: 9999; display: flex; gap: 8px; align-items: center; padding: 10px 16px; border-radius: var(--r-m); color: #fff; font-size: 0.84rem; font-weight: 600; background: rgba(16, 124, 16, 0.95); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35); } .ky-toast.err { background: rgba(196, 43, 28, 0.95); }
      `}</style>
    </>
  );
}
