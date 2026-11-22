import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BookOpen, Search, Copy, Check, Lock, Play, Download, ChevronRight } from 'lucide-react';
import { Reveal, TextReveal } from '@/components/motion';
import { copyText } from '@/src/lib/timeAgo';

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
const slug = (m, p) => `${m}-${p}`.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

function buildOps(spec) {
  const ops = [];
  for (const [path, item] of Object.entries(spec.paths || {})) {
    for (const m of METHODS) {
      const op = item[m];
      if (!op) continue;
      ops.push({
        id: slug(m, path), method: m.toUpperCase(), path, tag: (op.tags && op.tags[0]) || 'default',
        summary: op.summary || '', description: op.description || '', secure: !!(op.security && op.security.length),
        params: [...(item.parameters || []), ...(op.parameters || [])], body: op.requestBody || null, responses: op.responses || {},
      });
    }
  }
  return ops;
}

const sample = (schema) => {
  if (!schema) return 'string';
  if (schema.example !== undefined) return schema.example;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.type === 'object') return Object.fromEntries(Object.entries(schema.properties || {}).slice(0, 6).map(([k, v]) => [k, sample(v)]));
  if (schema.type === 'array') return [sample(schema.items)];
  if (schema.type === 'integer' || schema.type === 'number') return 1;
  if (schema.type === 'boolean') return true;
  return 'string';
};

function snippets(op, base) {
  const q = op.params.filter((p) => p.in === 'query' && p.required).map((p) => `${p.name}=${encodeURIComponent(sample(p.schema))}`);
  const url = `${base}${op.path.replace(/\{(\w+)\}/g, (_, k) => `:${k}`)}${q.length ? `?${q.join('&')}` : ''}`;
  const bodySchema = op.body?.content?.['application/json']?.schema;
  const hasBody = bodySchema && !['GET', 'HEAD'].includes(op.method);
  const json = hasBody ? JSON.stringify(sample(bodySchema), null, 2) : '';
  const curl = [`curl -X ${op.method} '${url}'`, hasBody && `  -H 'Content-Type: application/json'`, hasBody && `  -d '${json.replace(/\n\s*/g, ' ')}'`].filter(Boolean).join(' \\\n');
  const fetchJs = `const res = await fetch('${url}', {\n  method: '${op.method}',\n  headers: {${hasBody ? `\n    'Content-Type': 'application/json',` : ''}\n  },${hasBody ? `\n  body: JSON.stringify(${json.replace(/\n/g, '\n  ')}),` : ''}\n});\nconst data = await res.json();`;
  const py = `import requests\n\nres = requests.request('${op.method}', '${url}'${hasBody ? `,\n  json=${json.replace(/\n/g, '\n  ')}` : ''})\nprint(res.json())`;
  return { curl, js: fetchJs, py };
}

const statusClass = (c) => (c.startsWith('2') ? 'ok' : c.startsWith('4') ? 'warn' : 'err');

export default function DocsPage() {
  const router = useRouter();
  const [spec, setSpec] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [lang, setLang] = useState('curl');
  const [copied, setCopied] = useState('');
  const [base, setBase] = useState('');

  useEffect(() => {
    fetch('/api/openapi').then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))).then((s) => { setSpec(s); setBase(s.servers?.[0]?.url || window.location.origin); }).catch((e) => setErr(e.message));
  }, []);

  const ops = useMemo(() => (spec ? buildOps(spec) : []), [spec]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? ops.filter((o) => `${o.method} ${o.path} ${o.summary} ${o.tag}`.toLowerCase().includes(s)) : ops;
  }, [ops, q]);
  const groups = useMemo(() => {
    const g = new Map();
    for (const o of filtered) { if (!g.has(o.tag)) g.set(o.tag, []); g.get(o.tag).push(o); }
    return [...g.entries()];
  }, [filtered]);

  const hash = (router.asPath.split('#')[1] || '').toLowerCase();
  const current = ops.find((o) => o.id === hash) || filtered[0] || null;
  const open = (o) => router.replace(`/docs#${o.id}`, undefined, { shallow: true, scroll: false });
  const copy = async (k, t) => { await copyText(t); setCopied(k); setTimeout(() => setCopied(''), 1400); };
  const snip = current ? snippets(current, base) : null;

  return (
    <>
      <div className="dc-page">
        <header>
          <Reveal variant="down"><div className="badge ok" style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}><BookOpen size={14} color="var(--a2)" /> <span>API REFERENCE</span></div></Reveal>
          <h1><TextReveal as="span" text="Dokumentasi API" by="word" /></h1>
          <Reveal as="p" variant="blur" delay={0.15}>{spec?.info?.title || 'Wudysoft API'} v{spec?.info?.version || '1.0.0'} · {ops.length} operasi · dibuat otomatis dari kode.</Reveal>
          <div className="dc-actions">
            <a className="btn" href="/api/openapi" target="_blank" rel="noreferrer"><Download size={15} /> openapi.json</a>
            <Link className="btn" href="/playground"><Play size={15} /> Playground</Link>
            
          </div>
        </header>

        {err && <div className="glass card" style={{ color: 'var(--err)' }}>Gagal memuat spesifikasi: {err}</div>}
        {!spec && !err && <div className="glass card">Memuat…</div>}

        {spec && (
          <div className="dc-grid">
            <aside className="glass card dc-side">
              <div className="dc-search"><Search size={15} /><input className="input" placeholder="Cari endpoint…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari endpoint" /></div>
              <nav className="dc-nav" aria-label="Daftar endpoint">
                {groups.length === 0 && <p className="dc-muted">Tidak ada hasil.</p>}
                {groups.map(([tag, list]) => (
                  <div key={tag}>
                    <div className="dc-tag">{tag}</div>
                    {list.map((o) => (
                      <button key={o.id} type="button" className={`dc-op ${current?.id === o.id ? 'on' : ''}`} onClick={() => open(o)}>
                        <span className={`dc-m m-${o.method}`}>{o.method}</span><span className="dc-path">{o.path}</span>
                        {o.secure && <Lock size={11} />}
                      </button>
                    ))}
                  </div>
                ))}
              </nav>
            </aside>

            <main className="dc-main">
              {current ? (
                <div className="glass card dc-detail" key={current.id}>
                  <div className="dc-title"><span className={`dc-m big m-${current.method}`}>{current.method}</span><code>{current.path}</code></div>
                  <h2>{current.summary}</h2>
                  {current.description && <p className="dc-muted">{current.description}</p>}
                  {current.secure && <div className="badge warn" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Lock size={12} /> Butuh login (sesi browser atau Bearer token)</div>}

                  {current.params.length > 0 && (
                    <section>
                      <h3>Parameter</h3>
                      <div className="dc-table">
                        {current.params.map((p) => (
                          <div className="dc-row" key={`${p.in}-${p.name}`}>
                            <div><code>{p.name}</code>{p.required && <b className="dc-req">wajib</b>}</div>
                            <div className="dc-muted">{p.in} · {p.schema?.type || 'string'}{p.schema?.enum ? ` · ${p.schema.enum.join(' | ')}` : ''}</div>
                            <div className="dc-muted">{p.description || ''}</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {current.body && <section><h3>Body (JSON)</h3><pre className="dc-code">{JSON.stringify(sample(current.body.content?.['application/json']?.schema), null, 2)}</pre></section>}

                  <section>
                    <div className="dc-snip-head">
                      <h3>Contoh</h3>
                      <div className="dc-tabs" role="tablist">
                        {[['curl', 'cURL'], ['js', 'JavaScript'], ['py', 'Python']].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={lang === k} className={lang === k ? 'on' : ''} onClick={() => setLang(k)}>{l}</button>)}
                      </div>
                      <select className="input dc-base" value={base} onChange={(e) => setBase(e.target.value)} aria-label="Server">{(spec.servers || [{ url: base }]).map((s) => <option key={s.url} value={s.url}>{s.url}</option>)}</select>
                    </div>
                    <div className="dc-codewrap">
                      <pre className="dc-code">{snip[lang]}</pre>
                      <button type="button" className="btn dc-copy" onClick={() => copy('snip', snip[lang])}>{copied === 'snip' ? <Check size={14} /> : <Copy size={14} />} {copied === 'snip' ? 'Tersalin' : 'Salin'}</button>
                    </div>
                  </section>

                  <section>
                    <h3>Respons</h3>
                    <div className="dc-resps">
                      {Object.entries(current.responses).map(([code, r]) => (
                        <details key={code} open={code.startsWith('2')}>
                          <summary><span className={`badge ${statusClass(code)}`}>{code}</span> {r.description}<ChevronRight size={14} className="dc-chev" /></summary>
                          {r.content?.['application/json']?.schema && <pre className="dc-code">{JSON.stringify(sample(r.content['application/json'].schema), null, 2)}</pre>}
                        </details>
                      ))}
                    </div>
                  </section>
                  <Link className="btn" href={`/playground?op=${encodeURIComponent(`${current.method} ${current.path}`)}`}><Play size={15} /> Coba di Playground</Link>
                </div>
              ) : <div className="glass card">Pilih endpoint di sebelah kiri.</div>}
            </main>
          </div>
        )}
      </div>

      <style jsx>{`
        .dc-page { width: min(1180px, 100%); margin: 0 auto; display: grid; gap: 18px; padding-bottom: 24px; }
        .dc-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .dc-grid { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; align-items: start; }
        .dc-side { position: sticky; top: 84px; display: grid; gap: 10px; max-height: calc(100vh - 110px); overflow: hidden; }
        .dc-search { display: flex; align-items: center; gap: 8px; color: var(--muted); }
        .dc-search :global(.input) { flex: 1; min-width: 0; }
        .dc-nav { overflow: auto; display: grid; gap: 10px; padding-right: 2px; }
        .dc-tag { font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin: 6px 4px; }
        .dc-op { display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 9px; border-radius: min(var(--r-s), 12px); border: 1px solid transparent; background: transparent; color: var(--text); cursor: pointer; text-align: left; font-size: 0.78rem; transition: background 0.2s, border-color 0.2s, translate 0.2s; }
        .dc-op:hover { background: color-mix(in srgb, var(--a2) 10%, transparent); translate: 2px 0; }
        .dc-op.on { background: color-mix(in srgb, var(--a1) 16%, transparent); border-color: color-mix(in srgb, var(--a2) 40%, var(--border)); }
        .dc-path { font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
        .dc-m { font-size: 0.62rem; font-weight: 800; padding: 2px 6px; border-radius: 6px; font-family: var(--font-mono); color: #fff; min-width: 46px; text-align: center; }
        .dc-m.big { font-size: 0.8rem; padding: 4px 10px; }
        .m-GET { background: #2563eb; } .m-POST { background: #16a34a; } .m-PUT { background: #d97706; } .m-PATCH { background: #7c3aed; } .m-DELETE { background: #dc2626; } .m-HEAD, .m-OPTIONS { background: #64748b; }
        .dc-detail { display: grid; gap: 14px; min-width: 0; animation: dc-in 0.35s ease both; }
        @keyframes dc-in { from { opacity: 0; translate: 0 10px; } to { opacity: 1; translate: 0 0; } }
        .dc-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .dc-title code { font-family: var(--font-mono); font-size: 1rem; overflow-wrap: anywhere; }
        .dc-detail h2 { font-size: 1.15rem; margin: 0; }
        .dc-detail h3 { font-size: 0.86rem; margin: 0 0 8px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
        .dc-muted { color: var(--muted); font-size: 0.82rem; margin: 0; }
        .dc-table { display: grid; border: 1px solid var(--border); border-radius: var(--r-m); overflow: hidden; }
        .dc-row { display: grid; grid-template-columns: 1.1fr 1fr 1.6fr; gap: 10px; padding: 9px 12px; font-size: 0.8rem; border-top: 1px solid var(--border); }
        .dc-row:first-child { border-top: 0; }
        .dc-row code { font-family: var(--font-mono); }
        .dc-req { margin-left: 6px; font-size: 0.62rem; color: var(--err); text-transform: uppercase; }
        .dc-snip-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
        .dc-snip-head h3 { margin: 0; }
        .dc-tabs { display: inline-flex; gap: 4px; padding: 3px; border: 1px solid var(--border); border-radius: min(var(--r-btn), 14px); }
        .dc-tabs button { border: 0; background: transparent; color: var(--muted); padding: 5px 10px; border-radius: min(var(--r-btn), 11px); cursor: pointer; font-size: 0.76rem; transition: background 0.2s, color 0.2s; }
        .dc-tabs button.on { background: color-mix(in srgb, var(--a1) 22%, transparent); color: var(--text); }
        .dc-base { margin-left: auto; max-width: 260px; font-size: 0.76rem; }
        .dc-codewrap { position: relative; }
        .dc-code { margin: 0; padding: 14px; border-radius: var(--r-m); border: 1px solid var(--border); background: color-mix(in srgb, var(--bg1) 55%, transparent); font-family: var(--font-mono); font-size: 0.76rem; line-height: 1.55; overflow: auto; white-space: pre; max-height: 360px; }
        .dc-copy { position: absolute; top: 8px; right: 8px; padding: 4px 10px; font-size: 0.72rem; }
        .dc-resps { display: grid; gap: 8px; }
        .dc-resps details { border: 1px solid var(--border); border-radius: var(--r-m); padding: 8px 12px; }
        .dc-resps summary { cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.82rem; list-style: none; }
        .dc-resps summary::-webkit-details-marker { display: none; }
        .dc-resps :global(.dc-chev) { margin-left: auto; transition: rotate 0.2s; }
        .dc-resps details[open] :global(.dc-chev) { rotate: 90deg; }
        .dc-resps .dc-code { margin-top: 8px; }
        @media (max-width: 900px) {
          .dc-grid { grid-template-columns: 1fr; }
          .dc-side { position: static; max-height: 320px; }
          .dc-row { grid-template-columns: 1fr; gap: 2px; }
          .dc-base { margin-left: 0; max-width: 100%; }
        }
      `}</style>
    </>
  );
}
