import { useMemo, useRef, useState } from 'react';
import { Icons } from '@/components/Icons';
import { Modal, MethodBadge, Seg, KVTable, CopyBtn, CodeView, cx } from './ui';
import CodeBlock from '@/components/CodeBlock';
import CodeRunner from '@/components/CodeRunner';
import { row, uid, draftFromOperation, syncPathVars, buildRequest, sendRequest, validateResponse, SNIPPETS, statusTone } from '@/src/lib/playgroundCore';
import s from '@/styles/playground.module.css';

/* ================= Environment ================= */
export function EnvModal({ envs, envId, setEnvs, setEnvId, servers, onClose }) {
  const env = envs.find((e) => e.id === envId) || envs[0];
  const patch = (p) => setEnvs((all) => all.map((e) => (e.id === env.id ? { ...e, ...p } : e)));
  const setVar = (key, value) => {
    const has = env.vars.some((v) => v.key === key);
    patch({ vars: has ? env.vars.map((v) => (v.key === key ? { ...v, value } : v)) : [...env.vars, row({ key, value })] });
  };
  return (
    <Modal title="Environment & variabel" onClose={onClose} footer={<button type="button" className={s.primary} onClick={onClose}>Selesai</button>}>
      <div className={s.envBar}>
        <select className={s.in} value={env.id} onChange={(e) => setEnvId(e.target.value)} aria-label="Environment">
          {envs.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button type="button" className={s.ghost} onClick={() => { const n = { id: uid(), name: `Env ${envs.length + 1}`, vars: [row({ key: 'baseUrl', value: '' })] }; setEnvs([...envs, n]); setEnvId(n.id); }}><Icons.Plus size={13} /> Baru</button>
        {envs.length > 1 && <button type="button" className={s.ghost} onClick={() => { const rest = envs.filter((e) => e.id !== env.id); setEnvs(rest); setEnvId(rest[0].id); }}><Icons.Trash2 size={13} /></button>}
      </div>
      <input className={s.in} value={env.name} onChange={(e) => patch({ name: e.target.value })} aria-label="Nama environment" />

      {servers?.length > 0 && (
        <div className={s.block}>
          <h4>Server dari spesifikasi</h4>
          <div className={s.chips}>
            {servers.map((sv) => {
              const abs = /^https?:/.test(sv.url) ? sv.url.replace(/\/$/, '') : '';
              return <button key={sv.url} type="button" className={s.chipBtn} onClick={() => setVar('baseUrl', abs)} title={sv.description}>{abs || 'Origin saat ini'}</button>;
            })}
          </div>
        </div>
      )}

      <div className={s.block}>
        <h4>Variabel</h4>
        <KVTable rows={env.vars} onChange={(vars) => patch({ vars })} keyPh="nama" valuePh="nilai" addLabel="Tambah variabel" />
        <p className={s.hint}>
          Pakai dengan <code>{'{{nama}}'}</code> di URL, header, params, dan body. <code>baseUrl</code> kosong = origin saat ini. <code>token</code> otomatis diisi dari sesi login (bisa ditimpa).
        </p>
      </div>
    </Modal>
  );
}

/* ================= Import spec ================= */
export function ImportModal({ onImport, onReset, current, onClose }) {
  const [mode, setMode] = useState('url');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async (getText, label) => {
    setBusy(true); setErr('');
    try { await onImport(await getText(), label); onClose(); } catch (e) { setErr(e.message || 'Gagal mengimpor'); } finally { setBusy(false); }
  };

  return (
    <Modal title="Impor spesifikasi OpenAPI" onClose={onClose}>
      <p className={s.hint}>Sumber aktif: <b>{current}</b>. Mendukung OpenAPI 3.x dan Swagger 2.0 (JSON).</p>
      <Seg value={mode} onChange={setMode} options={[{ id: 'url', label: 'Dari URL' }, { id: 'paste', label: 'Tempel JSON' }, { id: 'file', label: 'Dari file' }]} />

      {mode === 'url' && (
        <div className={s.block}>
          <input className={s.in} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.contoh.com/openapi.json" inputMode="url" autoCapitalize="none" aria-label="URL spesifikasi" />
          <p className={s.hint}>Diambil langsung oleh browser, jadi server tujuan harus mengizinkan CORS. Jika gagal, unduh file lalu pakai “Dari file”.</p>
          <button type="button" className={s.primary} disabled={!url.trim() || busy} onClick={() => go(async () => { const r = await fetch(url.trim()); if (!r.ok) throw new Error(`HTTP ${r.status} saat mengambil spesifikasi`); return r.text(); }, new URL(url.trim(), location.href).host)}>{busy ? 'Mengambil…' : 'Impor'}</button>
        </div>
      )}
      {mode === 'paste' && (
        <div className={s.block}>
          <textarea className={s.editor} rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={'{ "openapi": "3.0.3", … }'} spellCheck={false} aria-label="JSON spesifikasi" />
          <button type="button" className={s.primary} disabled={!text.trim() || busy} onClick={() => go(async () => text, 'Tempel')}>Impor</button>
        </div>
      )}
      {mode === 'file' && (
        <div className={s.block}>
          <label className={cx(s.in, s.fileIn, s.fileBig)}>
            <Icons.Upload size={16} /> <span>Pilih file .json</span>
            <input type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) go(() => f.text(), f.name); }} />
          </label>
        </div>
      )}
      {err && <div className={s.errInline} role="alert"><Icons.AlertCircle size={14} /> {err}</div>}

      <div className={s.rowBetween}>
        <button type="button" className={s.ghost} onClick={() => { onReset(); onClose(); }}><Icons.Refresh size={13} /> Kembali ke /api/openapi</button>
      </div>
    </Modal>
  );
}

/* ================= Kode ================= */
export function CodeModal({ req, onClose }) {
  const [id, setId] = useState('curl');
  const [running, setRunning] = useState(false);
  const snip = SNIPPETS.find((x) => x.id === id) || SNIPPETS[0];
  const code = useMemo(() => (req ? snip.fn(req) : ''), [req, snip]);
  const openCompiler = () => {
    try { sessionStorage.setItem('wudysoft_compiler_seed', JSON.stringify({ lang: snip.run || 'javascript', code })); } catch {}
    window.open('/tools/compiler', '_blank', 'noopener');
  };
  return (
    <Modal title="Kode request" onClose={onClose} wide>
      {!req ? <p className={s.hint}>Tidak ada request.</p> : (
        <>
          {req.errors?.length > 0 && <div className={s.errInline}><Icons.AlertCircle size={14} /> {req.errors.join('; ')}</div>}
          <div className={s.langPick} role="tablist" aria-label="Bahasa">
            {SNIPPETS.map((x) => (
              <button key={x.id} type="button" role="tab" aria-selected={x.id === id} className={cx(s.langBtn, x.id === id && s.langOn)} onClick={() => { setId(x.id); setRunning(false); }}>{x.label}</button>
            ))}
          </div>
          {running && snip.run ? (
            <CodeRunner key={snip.id} lang={snip.run} hideLangPicker initialCode={code} minHeight={200} compact />
          ) : (
            <CodeBlock code={code} lang={snip.lang} label={snip.label} />
          )}
          <div className={s.rowBetween}>
            <span className={s.hint}>{snip.run ? 'Bisa dijalankan langsung di browser (request cross-origin tunduk pada CORS).' : 'Salin ke proyek Anda, atau buka di Compiler untuk mencoba kode JS/Python.'}</span>
            <div className={s.paneActions}>
              {snip.run && <button type="button" className={s.primary} onClick={() => setRunning((v) => !v)}><Icons.Play size={14} /> {running ? 'Kembali ke kode' : 'Edit & jalankan'}</button>}
              <button type="button" className={s.ghost} onClick={openCompiler}><Icons.Terminal size={13} /> Compiler</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ================= Collection Runner ================= */
export function RunnerModal({ parsed, vars, onClose, onOpenOp }) {
  const safe = (o) => o.method === 'GET' || o.method === 'HEAD';
  const [sel, setSel] = useState(() => new Set(parsed.operations.filter((o) => safe(o) && !o.deprecated).map((o) => o.key)));
  const [delay, setDelay] = useState(150);
  const [stopOnFail, setStopOnFail] = useState(false);
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const abort = useRef(null);

  const groups = useMemo(() => {
    const m = new Map();
    parsed.operations.forEach((o) => { const t = o.tags[0]; if (!m.has(t)) m.set(t, []); m.get(t).push(o); });
    return [...m.entries()];
  }, [parsed]);

  const toggle = (key) => setSel((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const setMany = (ops, on) => setSel((p) => { const n = new Set(p); ops.forEach((o) => (on ? n.add(o.key) : n.delete(o.key))); return n; });
  const unsafeSelected = parsed.operations.some((o) => sel.has(o.key) && !safe(o));

  const run = async () => {
    const list = parsed.operations.filter((o) => sel.has(o.key));
    if (!list.length) return;
    setRunning(true); setResults([]);
    const ctl = new AbortController(); abort.current = ctl;
    for (const op of list) {
      if (ctl.signal.aborted) break;
      const draft = syncPathVars(draftFromOperation(op, parsed));
      const req = buildRequest(draft, vars, {});
      let r;
      if (req.errors.length) r = { key: op.key, op, status: null, ms: 0, state: 'err', note: req.errors.join('; ') };
      else {
        const res = await sendRequest(req, { signal: ctl.signal });
        if (res.cancelled) break;
        const v = validateResponse(parsed, op, res);
        r = res.error
          ? { key: op.key, op, status: null, ms: res.ms, state: 'err', note: res.error }
          : { key: op.key, op, status: res.status, ms: res.ms, size: res.size, state: v?.state === 'ok' ? 'ok' : 'warn', note: v?.short || '' };
      }
      setResults((all) => [...all, r]);
      if (stopOnFail && r.state !== 'ok') break;
      if (delay) await new Promise((x) => setTimeout(x, delay));
    }
    setRunning(false);
  };

  const tally = results.reduce((a, r) => ({ ...a, [r.state]: (a[r.state] || 0) + 1 }), {});
  const exportJson = () => JSON.stringify(results.map((r) => ({ operation: r.key, status: r.status, ms: r.ms, result: r.state, note: r.note })), null, 2);

  return (
    <Modal title="Collection runner" onClose={() => { abort.current?.abort(); onClose(); }} wide
      footer={
        <>
          {running ? <button type="button" className={cx(s.primary, s.danger)} onClick={() => abort.current?.abort()}><Icons.Square size={14} /> Hentikan</button>
            : <button type="button" className={s.primary} disabled={!sel.size} onClick={run}><Icons.Play size={14} /> Jalankan {sel.size} request</button>}
        </>
      }>
      <p className={s.hint}>Menjalankan request contoh dari spesifikasi secara berurutan, lalu membandingkan status & skema respons dengan spec — seperti runner Postman.</p>

      <div className={s.runOpts}>
        <label>Jeda <input className={cx(s.in, s.numIn)} type="number" min={0} max={5000} step={50} value={delay} onChange={(e) => setDelay(Number(e.target.value))} /> ms</label>
        <label className={s.chk}><input type="checkbox" checked={stopOnFail} onChange={(e) => setStopOnFail(e.target.checked)} /> Berhenti saat gagal</label>
        <button type="button" className={s.ghost} onClick={() => setMany(parsed.operations, false)}>Kosongkan</button>
        <button type="button" className={s.ghost} onClick={() => setMany(parsed.operations.filter(safe), true)}>Semua GET</button>
      </div>
      {unsafeSelected && <div className={s.warnBox}><Icons.AlertCircle size={14} /> Operasi non-GET (POST/PUT/PATCH/DELETE) dapat mengubah atau menghapus data nyata.</div>}

      <div className={s.runList}>
        {groups.map(([tag, ops]) => (
          <div key={tag} className={s.runGroup}>
            <div className={s.runGroupHead}>
              <b>{tag}</b>
              <span>
                <button type="button" onClick={() => setMany(ops, true)}>semua</button> · <button type="button" onClick={() => setMany(ops, false)}>tidak</button>
              </span>
            </div>
            {ops.map((o) => (
              <label key={o.key} className={s.runItem}>
                <input type="checkbox" checked={sel.has(o.key)} onChange={() => toggle(o.key)} />
                <MethodBadge m={o.method} tiny />
                <code>{o.path}</code>
              </label>
            ))}
          </div>
        ))}
      </div>

      {(results.length > 0 || running) && (
        <div className={s.block}>
          <div className={s.rowBetween}>
            <h4>Hasil {running ? '(berjalan…)' : ''}</h4>
            <span className={s.tally}>
              <b className={s.t_ok}>{tally.ok || 0} sesuai</b> · <b className={s.t_warn}>{tally.warn || 0} peringatan</b> · <b className={s.t_err}>{tally.err || 0} gagal</b>
            </span>
          </div>
          <div className={s.runBar}><i style={{ width: `${(results.length / Math.max(1, sel.size)) * 100}%` }} /></div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>Request</th><th>Status</th><th>Waktu</th><th>Catatan</th></tr></thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.key} className={s.clickRow} onClick={() => { onOpenOp(r.op); onClose(); }}>
                    <td><MethodBadge m={r.op.method} tiny /> <code>{r.op.path}</code></td>
                    <td><span className={cx(s.statusMini, s[`t_${r.status ? statusTone(r.status) : 'err'}`])}>{r.status || 'ERR'}</span></td>
                    <td>{r.ms} ms</td>
                    <td className={cx(s[`t_${r.state}`])}>{r.note || (r.state === 'ok' ? 'OK' : '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!running && results.length > 0 && <CopyBtn text={exportJson} label="Salin hasil (JSON)" />}
        </div>
      )}
    </Modal>
  );
}
