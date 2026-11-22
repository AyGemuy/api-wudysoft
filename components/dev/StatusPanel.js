import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Plus, Trash2, RefreshCw, Pause, Play, CheckCircle2, AlertTriangle, XCircle, Download } from 'lucide-react';
import { Reveal, TextReveal } from '@/components/motion';
import { timeAgo } from '@/src/lib/timeAgo';

const KEY = 'wd_status_v2';
const MAX = 60;
const SLOW = 1200; // ms → dianggap lambat
const DEFAULTS = [
  { id: 'health', name: 'Health check', url: '/api/health' },
  { id: 'openapi', name: 'OpenAPI spec', url: '/api/openapi' },
  { id: 'providers', name: 'Auth providers', url: '/api/auth/providers' },
  { id: 'routes', name: 'Daftar route', url: '/api/system/routes' },
  { id: 'cache', name: 'Cache', url: '/api/cache' },
];

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };

async function probe(url) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 8000);
  const t0 = performance.now();
  try {
    const r = await fetch(url, { cache: 'no-store', signal: ctl.signal, headers: { Accept: 'application/json' } });
    const ms = Math.round(performance.now() - t0);
    return { t: Date.now(), ms, code: r.status, ok: r.status < 500 && r.status !== 0 };
  } catch (e) {
    return { t: Date.now(), ms: Math.round(performance.now() - t0), code: 0, ok: false, err: e.name === 'AbortError' ? 'timeout' : 'jaringan' };
  } finally { clearTimeout(to); }
}

function Spark({ data }) {
  const w = 220, h = 44;
  if (data.length < 2) return <svg className="sp" viewBox={`0 0 ${w} ${h}`} aria-hidden />;
  const max = Math.max(200, ...data.map((d) => d.ms));
  const step = w / (MAX - 1);
  const x0 = w - (data.length - 1) * step;
  const pts = data.map((d, i) => [x0 + i * step, h - 4 - (Math.min(d.ms, max) / max) * (h - 10)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <svg className="sp" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Grafik latensi">
      <defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--a2)" stopOpacity=".4" /><stop offset="1" stopColor="var(--a2)" stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${pts[pts.length - 1][0]} ${h} L${pts[0][0]} ${h} Z`} fill="url(#spg)" />
      <path d={line} fill="none" stroke="var(--a2)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {data.map((d, i) => !d.ok && <circle key={i} cx={pts[i][0]} cy={pts[i][1]} r="2.6" fill="var(--err)" />)}
    </svg>
  );
}

export default function StatusPage() {
  const [eps, setEps] = useState(DEFAULTS);
  const [hist, setHist] = useState({});
  const [events, setEvents] = useState([]);
  const [every, setEvery] = useState(30);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', url: '' });
  const [ready, setReady] = useState(false);
  const ref = useRef({});
  ref.current = { eps, hist, events };

  useEffect(() => {
    const s = load();
    if (s) { if (s.eps?.length) setEps(s.eps); setHist(s.hist || {}); setEvents(s.events || []); if (s.every) setEvery(s.every); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) save({ eps, hist, events, every }); }, [eps, hist, events, every, ready]);

  const run = useCallback(async () => {
    setBusy(true);
    const list = ref.current.eps;
    const res = await Promise.all(list.map(async (e) => [e.id, await probe(e.url)]));
    setHist((h) => {
      const n = { ...h };
      const ev = [];
      for (const [id, r] of res) {
        const arr = n[id] || [];
        const prev = arr[arr.length - 1];
        if (prev && prev.ok !== r.ok) ev.push({ t: r.t, id, name: list.find((x) => x.id === id)?.name || id, up: r.ok, code: r.code });
        n[id] = [...arr, r].slice(-MAX);
      }
      if (ev.length) setEvents((old) => [...ev, ...old].slice(0, 30));
      return n;
    });
    setBusy(false);
  }, []);

  useEffect(() => { if (ready) run(); }, [ready, run]);
  useEffect(() => {
    if (!ready || paused) return undefined;
    const t = setInterval(run, every * 1000);
    return () => clearInterval(t);
  }, [ready, paused, every, run]);

  const rows = useMemo(() => eps.map((e) => {
    const a = hist[e.id] || [];
    const last = a[a.length - 1];
    const okN = a.filter((x) => x.ok).length;
    const ms = a.filter((x) => x.ok).map((x) => x.ms);
    const state = !last ? 'wait' : !last.ok ? 'down' : last.ms > SLOW ? 'slow' : 'up';
    return { ...e, a, last, state, uptime: a.length ? (okN / a.length) * 100 : null, avg: ms.length ? Math.round(ms.reduce((x, y) => x + y, 0) / ms.length) : null, p95: ms.length ? pct(ms, 0.95) : null };
  }), [eps, hist]);

  const down = rows.filter((r) => r.state === 'down').length;
  const slow = rows.filter((r) => r.state === 'slow').length;
  const overall = !rows.some((r) => r.last) ? 'wait' : down ? (down === rows.length ? 'down' : 'part') : slow ? 'slow' : 'up';
  const BANNER = { wait: ['Memeriksa…', 'Mengukur layanan pertama kali.'], up: ['Semua sistem normal', 'Semua endpoint merespons dengan cepat.'], slow: ['Sebagian melambat', `${slow} endpoint di atas ${SLOW} ms.`], part: ['Gangguan sebagian', `${down} dari ${rows.length} endpoint bermasalah.`], down: ['Gangguan besar', 'Semua endpoint tidak merespons.'] }[overall];

  const add = (e) => {
    e.preventDefault();
    let url = form.url.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) url = `/${url}`;
    const id = `c${Date.now().toString(36)}`;
    setEps((l) => [...l, { id, name: form.name.trim() || url, url, custom: true }]);
    setForm({ name: '', url: '' });
    setTimeout(run, 50);
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), endpoints: rows.map(({ a, ...r }) => ({ ...r, samples: a })) }, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(blob);
    const el = document.createElement('a'); el.href = u; el.download = 'wudysoft-status.json'; el.click(); URL.revokeObjectURL(u);
  };

  const Icon = { up: CheckCircle2, slow: AlertTriangle, part: AlertTriangle, down: XCircle, wait: Activity }[overall];

  return (
    <>
      <div className="st-page">
        <header>
          <Reveal variant="down"><div className="badge ok" style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Activity size={14} color="var(--a2)" /> <span>STATUS MONITOR</span></div></Reveal>
          <h1><TextReveal as="span" text="Status Layanan" by="word" /></h1>
          <Reveal as="p" variant="blur" delay={0.15}>Pengecekan dilakukan dari browser Anda tiap beberapa detik. Riwayat tersimpan lokal di perangkat ini.</Reveal>
        </header>

        <section className={`glass card st-banner s-${overall}`} aria-live="polite">
          <Icon size={30} />
          <div><h2>{BANNER[0]}</h2><p>{BANNER[1]}</p></div>
          <div className="st-ctl">
            <select className="input" value={every} onChange={(e) => setEvery(+e.target.value)} aria-label="Interval cek">{[10, 30, 60, 300].map((n) => <option key={n} value={n}>tiap {n >= 60 ? `${n / 60} mnt` : `${n} dtk`}</option>)}</select>
            <button type="button" className="btn" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>{paused ? <Play size={15} /> : <Pause size={15} />}{paused ? 'Lanjut' : 'Jeda'}</button>
            <button type="button" className="btn" onClick={run} disabled={busy}><RefreshCw size={15} className={busy ? 'st-spin' : ''} /> Cek</button>
            <button type="button" className="btn" onClick={exportJson}><Download size={15} /></button>
          </div>
        </section>

        <div className="st-grid">
          {rows.map((r) => (
            <article key={r.id} className={`glass card st-card s-${r.state}`}>
              <div className="st-head">
                <span className="st-dot" aria-hidden />
                <div className="st-name"><b>{r.name}</b><code>{r.url}</code></div>
                <span className={`badge ${r.state === 'up' ? 'ok' : r.state === 'slow' ? 'warn' : r.state === 'down' ? 'err' : ''}`}>{r.state === 'up' ? 'Online' : r.state === 'slow' ? 'Lambat' : r.state === 'down' ? 'Down' : '…'}</span>
                {r.custom && <button type="button" className="st-x" onClick={() => setEps((l) => l.filter((x) => x.id !== r.id))} aria-label={`Hapus ${r.name}`}><Trash2 size={14} /></button>}
              </div>
              <Spark data={r.a} />
              <dl className="st-stats">
                <div><dt>Terakhir</dt><dd>{r.last ? `${r.last.ms} ms` : '—'}</dd></div>
                <div><dt>Rata-rata</dt><dd>{r.avg != null ? `${r.avg} ms` : '—'}</dd></div>
                <div><dt>p95</dt><dd>{r.p95 != null ? `${r.p95} ms` : '—'}</dd></div>
                <div><dt>Uptime</dt><dd>{r.uptime != null ? `${r.uptime.toFixed(1)}%` : '—'}</dd></div>
                <div><dt>HTTP</dt><dd>{r.last ? r.last.code || r.last.err : '—'}</dd></div>
              </dl>
            </article>
          ))}
        </div>

        <div className="st-two">
          <form className="glass card st-add" onSubmit={add}>
            <h3><Plus size={15} /> Pantau endpoint lain</h3>
            <input className="input" placeholder="Nama (opsional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Nama" maxLength={40} />
            <input className="input" placeholder="/api/... atau https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} aria-label="URL" required />
            <button className="btn primary" type="submit">Tambah</button>
            <p className="st-note">URL eksternal harus mengizinkan CORS agar bisa dicek dari browser.</p>
          </form>
          <section className="glass card st-log">
            <h3>Riwayat kejadian</h3>
            {events.length === 0 ? <p className="st-note">Belum ada perubahan status. Bagus!</p> : (
              <ul>{events.map((e, i) => <li key={`${e.t}-${i}`} className={e.up ? 'up' : 'down'}>{e.up ? <CheckCircle2 size={14} /> : <XCircle size={14} />}<span><b>{e.name}</b> {e.up ? 'pulih' : `gagal (${e.code || 'timeout'})`}</span><time>{timeAgo(e.t)}</time></li>)}</ul>
            )}
          </section>
        </div>
      </div>

      <style jsx>{`
        .st-page { width: min(1100px, 100%); margin: 0 auto; display: grid; gap: 16px; padding-bottom: 24px; }
        .st-banner { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; border-color: color-mix(in srgb, var(--ok) 45%, var(--border)); }
        .st-banner :global(svg) { color: var(--ok); flex: none; }
        .st-banner h2 { margin: 0; font-size: 1.1rem; } .st-banner p { margin: 2px 0 0; color: var(--muted); font-size: 0.82rem; }
        .st-banner.s-slow, .st-banner.s-part { border-color: color-mix(in srgb, var(--warn) 55%, var(--border)); } .st-banner.s-slow :global(svg), .st-banner.s-part :global(svg) { color: var(--warn); }
        .st-banner.s-down { border-color: color-mix(in srgb, var(--err) 55%, var(--border)); } .st-banner.s-down :global(svg) { color: var(--err); }
        .st-banner.s-wait :global(svg) { color: var(--muted); }
        .st-ctl { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .st-ctl :global(.input) { width: auto; }
        :global(.st-spin) { animation: st-rot 0.8s linear infinite; } @keyframes st-rot { to { rotate: 360deg; } }
        .st-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 330px), 1fr)); gap: 14px; }
        .st-card { display: grid; gap: 10px; min-width: 0; }
        .st-head { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .st-name { display: grid; min-width: 0; flex: 1; } .st-name b { font-size: 0.92rem; } .st-name code { font-family: var(--font-mono); font-size: 0.7rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .st-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--muted); flex: none; }
        .s-up .st-dot { background: var(--ok); animation: st-pulse 2s ease-in-out infinite; } .s-slow .st-dot { background: var(--warn); } .s-down .st-dot { background: var(--err); animation: st-pulse 1s ease-in-out infinite; }
        @keyframes st-pulse { 0%, 100% { scale: 1; opacity: 1; } 50% { scale: 1.5; opacity: 0.55; } }
        .st-x { border: 0; background: transparent; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 8px; } .st-x:hover { color: var(--err); }
        :global(.sp) { width: 100%; height: 44px; display: block; }
        .st-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 0; }
        .st-stats div { min-width: 0; } .st-stats dt { font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); } .st-stats dd { margin: 2px 0 0; font-size: 0.8rem; font-weight: 700; font-family: var(--font-mono); }
        .st-two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); gap: 14px; align-items: start; }
        .st-add { display: grid; gap: 10px; } .st-add h3, .st-log h3 { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 0.92rem; }
        .st-note { color: var(--muted); font-size: 0.74rem; margin: 0; }
        .st-log { display: grid; gap: 10px; } .st-log ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; max-height: 260px; overflow: auto; }
        .st-log li { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; padding: 7px 10px; border-radius: var(--r-s); border: 1px solid var(--border); }
        .st-log li.up :global(svg) { color: var(--ok); } .st-log li.down :global(svg) { color: var(--err); } .st-log time { margin-left: auto; color: var(--muted); font-size: 0.7rem; white-space: nowrap; }
        @media (max-width: 760px) { .st-two { grid-template-columns: 1fr; } .st-ctl { margin-left: 0; } }
        @media (prefers-reduced-motion: reduce) { .st-dot, :global(.st-spin) { animation: none !important; } }
      `}</style>
    </>
  );
}
