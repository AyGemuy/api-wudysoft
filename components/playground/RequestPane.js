import { useState } from 'react';
import { Icons } from '@/components/Icons';
import { MethodBadge, Tabs, Seg, KVTable, CopyBtn, CodeView, cx } from './ui';
import { BODY_MODES, row, syncPathVars, draftFromOperation } from '@/src/lib/playgroundCore';
import s from '@/styles/playground.module.css';

const METHOD_LIST = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const AUTH_TYPES = [
  { id: 'inherit', label: 'Cookie sesi (default)' },
  { id: 'none', label: 'Tanpa auth' },
  { id: 'bearer', label: 'Bearer token' },
  { id: 'basic', label: 'Basic auth' },
  { id: 'apikey', label: 'API key' },
];

export default function RequestPane({ draft, op, siblings = [], parsed, update, sending, onSend, onCancel, files, onCode, sessionToken, collapsedHint }) {
  const [tab, setTab] = useState('params');
  const enabled = (rows) => rows.filter((r) => r.on && r.key).length;
  const b = draft.body;
  const setBody = (patch) => update((d) => ({ ...d, body: { ...d.body, ...patch } }));
  const setAuth = (patch) => update((d) => ({ ...d, auth: { ...d.auth, ...patch } }));

  // pindahkan ?a=b dari URL ke tabel query saat selesai mengetik
  const extractQuery = () => {
    update((d) => {
      const i = d.url.indexOf('?');
      if (i < 0) return d;
      const base = d.url.slice(0, i);
      const params = new URLSearchParams(d.url.slice(i + 1));
      const have = new Set(d.query.map((r) => r.key));
      const add = [];
      params.forEach((v, k) => { if (!have.has(k)) add.push(row({ key: k, value: v })); });
      return syncPathVars({ ...d, url: base, query: [...d.query, ...add] });
    });
  };

  // ganti metode: jika path punya operasi dengan metode itu di spesifikasi, muat params/body-nya
  const changeMethod = (m) => {
    const sib = siblings.find((x) => x.method === m);
    update((d) => {
      if (!sib) return { ...d, method: m };
      const nd = draftFromOperation(sib, parsed);
      const keep = (oldRows, newRows) => newRows.map((r) => { const o = oldRows.find((x) => x.key === r.key && x.value !== ''); return o ? { ...r, value: o.value, on: true } : r; });
      return syncPathVars({ ...nd, id: d.id, auth: d.auth, query: keep(d.query, nd.query), pathVars: keep(d.pathVars, nd.pathVars), headers: keep(d.headers, nd.headers), url: d.url.includes('{{baseUrl}}') ? nd.url : d.url });
    });
    if (sib) setTab('params');
  };
  const hasOp = (m) => siblings.some((x) => x.method === m);

  const bodyContents = op?.body?.contents || {};
  const jsonMime = Object.keys(bodyContents).find((m) => /json/.test(m));
  const jsonExamples = jsonMime ? bodyContents[jsonMime].examples : [];
  let jsonState = { ok: true, msg: '' };
  if (b.mode === 'json' && b.json.trim()) {
    try { JSON.parse(b.json); jsonState = { ok: true, msg: 'JSON valid' }; }
    catch (e) { jsonState = /\{\{/.test(b.json) ? { ok: true, msg: 'Mengandung variabel {{…}}' } : { ok: false, msg: e.message.replace(/^JSON\.parse: /, '') }; }
  }

  const tabs = [
    { id: 'params', label: 'Params', badge: enabled(draft.query) + enabled(draft.pathVars) || '' },
    { id: 'headers', label: 'Headers', badge: enabled(draft.headers) || '' },
    { id: 'body', label: 'Body', badge: b.mode !== 'none' ? '•' : '' },
    { id: 'auth', label: 'Auth', badge: draft.auth.type !== 'inherit' && draft.auth.type !== 'none' ? '•' : '' },
    ...(op ? [{ id: 'docs', label: 'Docs' }] : []),
  ];

  return (
    <section className={s.pane} aria-label="Request">
      <div className={s.paneHead}>
        <input className={s.titleIn} value={draft.title} onChange={(e) => update((d) => ({ ...d, title: e.target.value }))} aria-label="Nama request" />
        <div className={s.paneActions}>
          {draft.opKey && <span className={s.chip}><Icons.Link size={11} />OpenAPI</span>}
          <button type="button" className={s.ghost} onClick={onCode}><Icons.FileCode size={13} /><span>Kode</span></button>
        </div>
      </div>

      {/* Bar URL */}
      <div className={s.urlBar}>
        <select className={cx(s.methodSel, s[`m_${draft.method}`])} value={draft.method} onChange={(e) => changeMethod(e.target.value)} aria-label="Method" title={siblings.length > 1 ? `Metode tersedia di spesifikasi: ${siblings.map((x) => x.method).join(', ')}` : undefined}>
          {METHOD_LIST.map((m) => <option key={m} value={m}>{m}{hasOp(m) && siblings.length > 1 ? ' ●' : ''}</option>)}
        </select>
        <input
          className={s.urlIn}
          value={draft.url}
          placeholder="{{baseUrl}}/api/…"
          onChange={(e) => update((d) => syncPathVars({ ...d, url: e.target.value }))}
          onBlur={extractQuery}
          onKeyDown={(e) => { if (e.key === 'Enter') { extractQuery(); onSend(); } }}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="url"
          aria-label="URL"
        />
        {sending ? (
          <button type="button" className={cx(s.sendBtn, s.cancelBtn)} onClick={onCancel}><Icons.Square size={14} /><span>Batal</span></button>
        ) : (
          <button type="button" className={s.sendBtn} onClick={onSend} title="Ctrl/⌘ + Enter"><Icons.Send size={15} /><span>Kirim</span></button>
        )}
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      <div className={s.paneBody}>
        {tab === 'params' && (
          <>
            {draft.pathVars.length > 0 && (
              <div className={s.block}>
                <h4>Path variables</h4>
                <KVTable rows={draft.pathVars} onChange={(rows) => update((d) => ({ ...d, pathVars: rows }))} lockKeys valuePh="Nilai" />
              </div>
            )}
            <div className={s.block}>
              <h4>Query params</h4>
              <KVTable rows={draft.query} onChange={(rows) => update((d) => ({ ...d, query: rows }))} addLabel="Tambah parameter" />
            </div>
          </>
        )}

        {tab === 'headers' && (
          <div className={s.block}>
            <h4>Headers</h4>
            <KVTable rows={draft.headers} onChange={(rows) => update((d) => ({ ...d, headers: rows }))} keyPh="Header" addLabel="Tambah header" />
            <p className={s.hint}>Content-Type dan Authorization dibuat otomatis dari tab Body / Auth. Gunakan <code>{'{{variabel}}'}</code> dari Environment.</p>
          </div>
        )}

        {tab === 'body' && (
          <div className={s.block}>
            <div className={s.rowBetween}>
              <Seg small value={b.mode} onChange={(mode) => setBody({ mode })} options={BODY_MODES} />
              {['GET', 'HEAD'].includes(draft.method) && b.mode !== 'none' && <span className={s.warnText}>{draft.method} tidak mengirim body</span>}
            </div>

            {b.mode === 'none' && <p className={s.hint}>Request ini tidak memiliki body.</p>}

            {b.mode === 'json' && (
              <>
                <div className={s.editorTools}>
                  <button type="button" className={s.ghost} onClick={() => { try { setBody({ json: JSON.stringify(JSON.parse(b.json), null, 2) }); } catch {} }}><Icons.Wand2 size={13} /> Rapikan</button>
                  <button type="button" className={s.ghost} onClick={() => { try { setBody({ json: JSON.stringify(JSON.parse(b.json)) }); } catch {} }}>Minify</button>
                  {jsonMime && (
                    <button type="button" className={s.ghost} onClick={() => setBody({ json: JSON.stringify(bodyContents[jsonMime].example ?? {}, null, 2) })}><Icons.Sparkles size={13} /> Dari skema</button>
                  )}
                  {jsonExamples.length > 0 && (
                    <select className={cx(s.in, s.exSel)} value="" onChange={(e) => { const ex = jsonExamples.find((x) => x.name === e.target.value); if (ex) setBody({ json: JSON.stringify(ex.value, null, 2) }); }} aria-label="Contoh">
                      <option value="">Contoh…</option>
                      {jsonExamples.map((ex) => <option key={ex.name} value={ex.name}>{ex.summary}</option>)}
                    </select>
                  )}
                </div>
                <textarea className={s.editor} value={b.json} onChange={(e) => setBody({ json: e.target.value })} spellCheck={false} rows={10} placeholder={'{\n  "key": "value"\n}'} aria-label="Body JSON" />
                <div className={cx(s.jsonState, !jsonState.ok && s.jsonBad)}>{b.json.trim() ? (jsonState.ok ? <Icons.CheckCircle2 size={13} /> : <Icons.AlertCircle size={13} />) : null}{b.json.trim() ? jsonState.msg : ''}</div>
              </>
            )}

            {b.mode === 'form' && <KVTable rows={b.form} withType files={files} onChange={(rows) => setBody({ form: rows })} addLabel="Tambah field" />}
            {b.mode === 'urlencoded' && <KVTable rows={b.urlencoded} onChange={(rows) => setBody({ urlencoded: rows })} addLabel="Tambah field" />}

            {b.mode === 'raw' && (
              <>
                <select className={s.in} value={b.rawType} onChange={(e) => setBody({ rawType: e.target.value })} aria-label="Content-Type">
                  {['text/plain', 'application/xml', 'text/html', 'application/javascript', 'application/x-yaml'].map((t) => <option key={t}>{t}</option>)}
                </select>
                <textarea className={s.editor} value={b.raw} onChange={(e) => setBody({ raw: e.target.value })} spellCheck={false} rows={10} aria-label="Body raw" />
              </>
            )}
          </div>
        )}

        {tab === 'auth' && (
          <div className={s.block}>
            <select className={s.in} value={draft.auth.type} onChange={(e) => setAuth({ type: e.target.value })} aria-label="Tipe auth">
              {AUTH_TYPES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            {draft.auth.type === 'inherit' && (
              <p className={s.hint}>Request ke origin yang sama membawa <b>cookie sesi NextAuth</b> otomatis{op?.secure ? ' — endpoint ini butuh login' : ''}. Untuk server lain gunakan Bearer.</p>
            )}
            {draft.auth.type === 'bearer' && (
              <>
                <input className={s.in} value={draft.auth.token} onChange={(e) => setAuth({ token: e.target.value })} placeholder="Token atau {{token}}" spellCheck={false} aria-label="Token" />
                <div className={s.editorTools}>
                  <button type="button" className={s.ghost} onClick={() => setAuth({ token: '{{token}}' })}>Pakai {'{{token}}'}</button>
                  {sessionToken && <span className={s.okText}><Icons.CheckCircle2 size={12} /> {'{{token}}'} terisi dari sesi aktif</span>}
                </div>
              </>
            )}
            {draft.auth.type === 'basic' && (
              <>
                <input className={s.in} value={draft.auth.user} onChange={(e) => setAuth({ user: e.target.value })} placeholder="Username" autoCapitalize="none" aria-label="Username" />
                <input className={s.in} type="password" value={draft.auth.pass} onChange={(e) => setAuth({ pass: e.target.value })} placeholder="Password" autoComplete="off" aria-label="Password" />
              </>
            )}
            {draft.auth.type === 'apikey' && (
              <>
                <input className={s.in} value={draft.auth.keyName} onChange={(e) => setAuth({ keyName: e.target.value })} placeholder="Nama (mis. X-API-Key)" aria-label="Nama key" />
                <input className={s.in} value={draft.auth.keyValue} onChange={(e) => setAuth({ keyValue: e.target.value })} placeholder="Nilai" aria-label="Nilai key" />
                <Seg small value={draft.auth.in} onChange={(v) => setAuth({ in: v })} options={[{ id: 'header', label: 'Header' }, { id: 'query', label: 'Query' }]} />
              </>
            )}
          </div>
        )}

        {tab === 'docs' && op && (
          <div className={s.block}>
            <div className={s.docHead}><MethodBadge m={op.method} /><code>{op.path}</code>{op.deprecated && <span className={s.depTag}>deprecated</span>}</div>
            {op.summary && <h4 className={s.docTitle}>{op.summary}</h4>}
            {op.description && <p className={s.docDesc}>{op.description}</p>}
            {op.secure && <p className={s.hint}><Icons.Lock size={12} /> Butuh autentikasi: {op.security.join(', ')}</p>}

            {op.parameters.length > 0 && (
              <>
                <h4>Parameter</h4>
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead><tr><th>Nama</th><th>Di</th><th>Tipe</th><th>Keterangan</th></tr></thead>
                    <tbody>
                      {op.parameters.map((p) => (
                        <tr key={`${p.in}:${p.name}`}>
                          <td><code>{p.name}</code>{p.required && <em className={s.req}> *</em>}</td>
                          <td>{p.in}</td>
                          <td>{p.schema?.type || '—'}{p.enum ? <small> ({p.enum.join(' | ')})</small> : null}</td>
                          <td>{p.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <h4>Respons</h4>
            {op.responses.map((r) => (
              <details key={r.code} className={s.respDoc}>
                <summary><b className={s.respCode}>{r.code}</b> {r.description || '—'}{r.mime ? <small> · {r.mime}</small> : null}</summary>
                {r.example !== undefined && r.example !== null ? (
                  <div className={s.respEx}>
                    <CopyBtn text={JSON.stringify(r.example, null, 2)} />
                    <CodeView json wrap text={JSON.stringify(r.example, null, 2)} />
                  </div>
                ) : <p className={s.hint}>Tidak ada skema/contoh.</p>}
              </details>
            ))}
          </div>
        )}
      </div>
      {collapsedHint}
    </section>
  );
}
