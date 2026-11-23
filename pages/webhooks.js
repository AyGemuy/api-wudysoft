import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Webhook, Plus, Trash2, Copy, Check, X, Eraser, Radio, Inbox } from 'lucide-react';
import Seo from '@/components/Seo';
import { CardDeco, CardHead, CardBody, CardFoot } from '@/components/Card';
import { Reveal, TextReveal } from '@/components/motion';
import Pagination from '@/components/Pagination';
import { timeAgo, fmtDateTime, copyText } from '@/src/lib/timeAgo';
import { toast, confirmToast } from '@/src/lib/toast';

const STATUSES = [200, 201, 202, 204, 400, 401, 403, 404, 429, 500, 503];
const M = { GET: '#2563eb', POST: '#16a34a', PUT: '#d97706', PATCH: '#7c3aed', DELETE: '#dc2626' };

async function api(method, url, body) {
  const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || `Gagal (${r.status})`);
  return d;
}

export default function WebhooksPage() {
  const [hooks, setHooks] = useState([]);
  const [max, setMax] = useState(10);
  const [sel, setSel] = useState('');
  const [detail, setDetail] = useState(null);
  const [reqs, setReqs] = useState([]);
  const [open, setOpen] = useState(null);
  const [live, setLive] = useState(true);
  const [form, setForm] = useState({ name: '', status: 200, ttlHours: 24 });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const [err, setErr] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const seen = useRef(0);

  const flash = (m, t = 'ok') => toast(m, t);
  const loadList = useCallback(async () => { try { const d = await api('GET', '/api/hooks'); setHooks(d.hooks); setMax(d.max); setErr(''); setSel((s) => s || d.hooks[0]?.slug || ''); } catch (e) { setErr(e.message); } }, []);
  const loadDetail = useCallback(async (slug) => {
    if (!slug) return;
    try { const d = await api('GET', `/api/hooks?slug=${slug}`); setDetail(d.hook); setReqs(d.requests); } catch { setDetail(null); setReqs([]); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { setPage(1); setOpen(null); seen.current = 0; loadDetail(sel); }, [sel, loadDetail]);
  useEffect(() => {
    if (!sel || !live) return undefined;
    const t = setInterval(() => loadDetail(sel), 3500);
    return () => clearInterval(t);
  }, [sel, live, loadDetail]);
  useEffect(() => { // tanda baru untuk request masuk
    if (reqs.length > seen.current && seen.current > 0) flash(`${reqs.length - seen.current} request baru masuk`);
    seen.current = reqs.length;
  }, [reqs.length]);

  const create = async (e) => {
    e.preventDefault(); if (busy) return; setBusy(true);
    try { const d = await api('POST', '/api/hooks', form); setForm({ name: '', status: 200, ttlHours: 24 }); await loadList(); setSel(d.hook.slug); flash('Webhook dibuat.'); } catch (er) { flash(er.message, 'err'); } finally { setBusy(false); }
  };
  const del = async (slug) => { if (!(await confirmToast('Hapus webhook ini beserta semua request-nya?', { danger: true, okLabel: 'Hapus' }))) return; try { await api('DELETE', `/api/hooks?slug=${slug}`); setSel(''); setDetail(null); setReqs([]); await loadList(); flash('Dihapus.'); } catch (er) { flash(er.message, 'err'); } };
  const clear = async () => { try { await api('PATCH', '/api/hooks', { slug: sel, clear: true }); setReqs([]); loadList(); flash('Riwayat dikosongkan.'); } catch (er) { flash(er.message, 'err'); } };
  const patch = async (p) => { try { await api('PATCH', '/api/hooks', { slug: sel, ...p }); loadDetail(sel); } catch (er) { flash(er.message, 'err'); } };
  const copy = async (k, t) => { await copyText(t); setCopied(k); setTimeout(() => setCopied(''), 1400); };

  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const url = sel ? `${origin}/api/hook/${sel}` : '';
  const pages = Math.max(1, Math.ceil(reqs.length / limit));
  const cur = Math.min(page, pages);
  const paged = useMemo(() => reqs.slice((cur - 1) * limit, cur * limit), [reqs, cur, limit]);

  return (
    <>
      <Seo title="Webhook Inspector — tangkap request" path="/webhooks" label="WEBHOOKS" description="Buat URL webhook sementara dan lihat setiap request masuk secara langsung: header, query, dan body." noindex />
      <div className="wh-page">
        <header>
          <Reveal variant="down"><div className="badge ok" style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Webhook size={14} color="var(--a2)" /> <span>WEBHOOK INSPECTOR</span></div></Reveal>
          <h1><TextReveal as="span" text="Webhook Inspector" by="word" /></h1>
          <Reveal as="p" variant="blur" delay={0.15}>Dapatkan URL sementara, arahkan layanan lain ke sana, dan periksa tiap request yang masuk secara langsung.</Reveal>
        </header>

        {err && <div className="glass card" style={{ color: 'var(--err)' }}>{err}</div>}

        <div className="wh-grid">
          <aside className="wh-side">
            <form className="glass card kc" onSubmit={create}>
              <CardDeco />
              <CardHead Icon={Plus} title="Webhook baru" badge={`${hooks.length}/${max}`} />
              <CardBody><div className="wh-form">
              <input className="input" placeholder="Nama (opsional)" maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Nama" />
              <div className="wh-two">
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: +e.target.value })} aria-label="Status balasan">{STATUSES.map((s) => <option key={s} value={s}>balas {s}</option>)}</select>
                <select className="input" value={form.ttlHours} onChange={(e) => setForm({ ...form, ttlHours: +e.target.value })} aria-label="Masa aktif">{[1, 6, 24, 72, 168].map((h) => <option key={h} value={h}>{h >= 24 ? `${h / 24} hari` : `${h} jam`}</option>)}</select>
              </div>
              </div></CardBody>
              <CardFoot><button className="btn primary" disabled={busy || hooks.length >= max}>Buat URL</button></CardFoot>
            </form>
            <div className="glass card kc">
              <CardDeco />
              <CardHead Icon={Webhook} title="Webhook aktif" badge={hooks.length} />
              <CardBody><div className="wh-list">
              {hooks.length === 0 ? <p className="wh-m">Belum ada webhook.</p> : hooks.map((h) => (
                <button key={h.slug} type="button" className={`wh-hook ${sel === h.slug ? 'on' : ''}`} onClick={() => setSel(h.slug)}>
                  <b>{h.name}</b><code>{h.slug}</code><span className="wh-m">{h.total} request · berakhir {timeAgo(h.expiresAt)}</span>
                </button>
              ))}
              </div></CardBody>
              <CardFoot><span>Kedaluwarsa otomatis</span></CardFoot>
            </div>
          </aside>

          <main className="wh-main">
            {!detail ? <div className="glass card kc"><CardDeco /><CardHead Icon={Inbox} title="Belum ada yang dipilih" /><CardBody><div className="wh-empty"><Inbox size={34} /><p>Buat atau pilih webhook untuk mulai menangkap request.</p></div></CardBody></div> : (
              <>
                <section className="glass card kc">
                  <CardDeco />
                  <CardHead Icon={Webhook} title="Endpoint penampung" subtitle={detail.name || detail.slug} />
                  <CardBody><div className="wh-url">
                  <div className="wh-urlrow"><code data-sound="off">{url}</code><button type="button" className="btn" onClick={() => copy('url', url)}>{copied === 'url' ? <Check size={14} /> : <Copy size={14} />} Salin</button></div>
                  <pre className="wh-code">{`curl -X POST ${url} \\\n  -H 'Content-Type: application/json' \\\n  -d '{"halo":"wudysoft"}'`}</pre>
                  </div></CardBody>
                  <CardFoot><div className="wh-bar">
                    <label className="wh-inline">Balas <select className="input" value={detail.status} onChange={(e) => patch({ status: +e.target.value })}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
                    <button type="button" className={`btn ${live ? 'primary' : ''}`} onClick={() => setLive((l) => !l)} aria-pressed={live}><Radio size={14} /> {live ? 'Live' : 'Jeda'}</button>
                    <button type="button" className="btn" onClick={() => copy('curl', `curl -X POST ${url} -H 'Content-Type: application/json' -d '{"halo":"wudysoft"}'`)}>{copied === 'curl' ? <Check size={14} /> : <Copy size={14} />} cURL</button>
                    <button type="button" className="btn" onClick={clear}><Eraser size={14} /> Kosongkan</button>
                    <button type="button" className="btn wh-del" onClick={() => del(detail.slug)}><Trash2 size={14} /> Hapus</button>
                  </div></CardFoot>
                </section>

                <section className="glass card kc">
                  <CardDeco />
                  <CardHead Icon={Radio} title="Request masuk" badge={detail.total} subtitle={`menampilkan ${reqs.length}`} />
                  <CardBody>
                  {reqs.length === 0 ? <div className="wh-empty"><Radio size={26} className="wh-pulse" /><p>Menunggu request… kirim sesuatu ke URL di atas.</p></div> : (
                    <>
                      <ul className="wh-reqs">
                        {paged.map((r, i) => { const id = `${r.at}-${i}`; const isOpen = open === id; return (
                          <li key={id} className={isOpen ? 'open' : ''}>
                            <button type="button" className="wh-rhead" onClick={() => setOpen(isOpen ? null : id)} aria-expanded={isOpen}>
                              <span className="wh-meth" style={{ background: M[r.method] || '#64748b' }}>{r.method}</span>
                              <span className="wh-rsum">{r.body ? r.body.replace(/\s+/g, ' ').slice(0, 70) : '(tanpa body)'}</span>
                              <span className="wh-m">{r.size} B · {r.ip}</span><time title={fmtDateTime(r.at)}>{timeAgo(r.at)}</time>
                            </button>
                            {isOpen && (
                              <div className="wh-rbody">
                                {Object.keys(r.query || {}).length > 0 && <><h4>Query</h4><pre className="wh-code">{JSON.stringify(r.query, null, 2)}</pre></>}
                                <h4>Header</h4><pre className="wh-code">{Object.entries(r.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}</pre>
                                <h4>Body <button type="button" className="wh-mini" onClick={() => copy(id, r.body)}>{copied === id ? 'tersalin' : 'salin'}</button></h4>
                                <pre className="wh-code">{(() => { try { return JSON.stringify(JSON.parse(r.body), null, 2); } catch { return r.body || '(kosong)'; } })()}</pre>
                              </div>
                            )}
                          </li>
                        ); })}
                      </ul>
                      <Pagination page={cur} pages={pages} total={reqs.length} limit={limit} onPage={setPage} onLimit={setLimit} label="request" sizes={[10, 25, 50]} />
                    </>
                  )}
                </CardBody>
                  <CardFoot><span>{live ? 'Live: diperbarui otomatis' : 'Dijeda'}</span></CardFoot>
                </section>
              </>
            )}
          </main>
        </div>
      </div>

      <style jsx>{`
        .wh-page { width: min(1120px, 100%); margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; padding-bottom: 24px; }
        .wh-grid { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; align-items: start; }
        .wh-side, .wh-main { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; min-width: 0; }
        h3 { display: flex; align-items: center; gap: 6px; font-size: 0.92rem; margin: 0 0 8px; } h4 { margin: 10px 0 4px; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); display: flex; gap: 8px; align-items: center; }
        .wh-m { color: var(--muted); font-size: 0.72rem; font-weight: 400; }
        .wh-form { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; } .wh-form h3 { margin: 0; } .wh-two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .wh-list { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
        .wh-hook { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2px; text-align: left; padding: 9px 11px; border-radius: min(var(--r-m), 14px); border: 1px solid var(--border); background: transparent; color: var(--text); cursor: pointer; transition: translate 0.2s, border-color 0.2s, background 0.2s; }
        .wh-hook:hover { translate: 2px 0; } .wh-hook.on { border-color: var(--a2); background: color-mix(in srgb, var(--a1) 14%, transparent); }
        .wh-hook code { font-family: var(--font-mono); font-size: 0.72rem; color: var(--muted); }
        .wh-url { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; } .wh-urlrow { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; } .wh-urlrow code { flex: 1 1 240px; font-family: var(--font-mono); font-size: 0.8rem; overflow-wrap: anywhere; user-select: all; }
        .wh-bar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; } .wh-inline { display: flex; gap: 6px; align-items: center; font-size: 0.8rem; } .wh-inline :global(.input) { width: auto; }
        .wh-del { color: var(--err); }
        .wh-code { margin: 0; padding: 10px 12px; border-radius: var(--r-s); border: 1px solid var(--border); background: color-mix(in srgb, var(--bg1) 55%, transparent); font-family: var(--font-mono); font-size: 0.72rem; line-height: 1.5; overflow: auto; max-height: 260px; white-space: pre-wrap; overflow-wrap: anywhere; }
        .wh-empty { display: grid; justify-items: center; gap: 6px; padding: 28px 12px; text-align: center; color: var(--muted); }
        :global(.wh-pulse) { animation: wh-p 1.6s ease-in-out infinite; } @keyframes wh-p { 0%, 100% { opacity: 1; scale: 1; } 50% { opacity: 0.4; scale: 1.2; } }
        .wh-reqs { list-style: none; margin: 0 0 8px; padding: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
        .wh-reqs li { border: 1px solid var(--border); border-radius: var(--r-m); overflow: hidden; animation: wh-in 0.3s ease both; } .wh-reqs li.open { border-color: color-mix(in srgb, var(--a2) 45%, var(--border)); }
        @keyframes wh-in { from { opacity: 0; translate: 0 8px; } to { opacity: 1; translate: 0 0; } }
        .wh-rhead { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 12px; border: 0; background: transparent; color: var(--text); cursor: pointer; text-align: left; font-size: 0.8rem; }
        .wh-rhead:hover { background: color-mix(in srgb, var(--a2) 8%, transparent); }
        .wh-meth { color: #fff; font-size: 0.64rem; font-weight: 800; padding: 3px 8px; border-radius: 6px; font-family: var(--font-mono); }
        .wh-rsum { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); font-size: 0.74rem; color: var(--muted); }
        .wh-rhead time { color: var(--muted); font-size: 0.7rem; white-space: nowrap; } .wh-rbody { padding: 0 12px 12px; }
        .wh-mini { border: 1px solid var(--border); background: transparent; color: var(--muted); border-radius: 6px; font-size: 0.66rem; padding: 1px 7px; cursor: pointer; }
        @media (max-width: 860px) { .wh-grid { grid-template-columns: minmax(0, 1fr); } .wh-rhead { flex-wrap: wrap; } }
        @media (prefers-reduced-motion: reduce) { :global(.wh-pulse), .wh-reqs li { animation: none !important; } }
      `}</style>
    </>
  );
}
