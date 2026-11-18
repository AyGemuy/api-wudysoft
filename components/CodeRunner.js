import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Square, Trash2, Copy, Check, Loader2, Globe, Server } from 'lucide-react';
import { highlight } from '@/src/lib/highlight';
import { RUN_LANGS, runBrowser, htmlDoc } from '@/src/lib/runners';

/** Editor ber-highlight (textarea transparan di atas <pre>). */
export function CodeEditor({ value, onChange, lang, minHeight = 220, onRun }) {
  const pre = useRef(null);
  const html = useMemo(() => highlight(value + '\n', lang), [value, lang]);
  const sync = (e) => { if (pre.current) { pre.current.scrollTop = e.target.scrollTop; pre.current.scrollLeft = e.target.scrollLeft; } };
  const onKey = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun?.(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const t = e.target; const { selectionStart: a, selectionEnd: b } = t;
      onChange(value.slice(0, a) + '  ' + value.slice(b));
      requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = a + 2; });
    }
  };
  return (
    <div className="ce" style={{ minHeight }}>
      <pre ref={pre} className="hl ce-pre" aria-hidden="true"><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
      <textarea className="ce-ta" value={value} onChange={(e) => onChange(e.target.value)} onScroll={sync} onKeyDown={onKey} spellCheck={false} autoCapitalize="none" autoCorrect="off" aria-label="Editor kode" style={{ minHeight }} />
      <style jsx global>{`
        .ce { position: relative; border-radius: 12px; border: 1px solid var(--border); background: color-mix(in srgb, var(--bg1, #000) 62%, transparent); overflow: hidden; }
        .ce-pre, .ce-ta { margin: 0; padding: 12px 14px; font-family: var(--font-mono); font-size: .78rem; line-height: 1.6; tab-size: 2; white-space: pre; border: 0; width: 100%; box-sizing: border-box; }
        .ce-pre { position: absolute; inset: 0; overflow: hidden; pointer-events: none; color: var(--text); }
        .ce-pre code { font: inherit; }
        .ce-ta { position: relative; display: block; resize: vertical; background: transparent; color: transparent; caret-color: var(--text); outline: none; overflow: auto; height: 100%; }
        .ce:focus-within { border-color: var(--a2); }
      `}</style>
    </div>
  );
}

/**
 * Compiler mini: pilih bahasa, edit, jalankan. Browser untuk JS/TS/Python/HTML, server (Wandbox) untuk bahasa lain.
 * props: code, onCode (terkendali) | initialCode; lang, onLang; langs (batasi pilihan); compact.
 */
export default function CodeRunner({ code: codeProp, onCode, lang: langProp, onLang, langs, initialCode, minHeight = 240, compact, hideLangPicker }) {
  const list = useMemo(() => (langs ? RUN_LANGS.filter((l) => langs.includes(l.id)) : RUN_LANGS), [langs]);
  const [langS, setLangS] = useState(langProp || 'javascript');
  const lang = langProp || langS;
  const L = RUN_LANGS.find((l) => l.id === lang) || RUN_LANGS[0];
  const [codeS, setCodeS] = useState(initialCode ?? L.sample);
  const code = codeProp ?? codeS;
  const setCode = onCode || setCodeS;
  const [stdin, setStdin] = useState('');
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState('');
  const [preview, setPreview] = useState(null);
  const [copied, setCopied] = useState(false);
  const job = useRef(null);
  const token = useRef(Math.random().toString(36).slice(2));
  const outRef = useRef(null);

  const push = useCallback((k, v) => setLines((a) => [...a.slice(-400), { k, v: String(v) }]), []);

  useEffect(() => {
    const on = (e) => { const d = e.data; if (d && d.__run === token.current) push(d.k, d.v); };
    window.addEventListener('message', on);
    return () => { window.removeEventListener('message', on); job.current?.stop?.(); };
  }, [push]);
  useEffect(() => { if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight; }, [lines]);

  const pickLang = (id) => {
    const cur = RUN_LANGS.find((l) => l.id === id);
    // ganti contoh hanya bila isi editor masih contoh bawaan atau kosong
    if (!code.trim() || RUN_LANGS.some((l) => l.sample === code)) setCode(cur.sample);
    (onLang || setLangS)(id);
    setLines([]); setPreview(null); setMeta('');
  };

  const run = async () => {
    if (busy) return;
    setLines([]); setMeta(''); setPreview(null); setBusy(true);
    const t0 = performance.now();
    try {
      if (L.id === 'html') {
        setPreview(htmlDoc(code, token.current));
        push('sys', 'Pratinjau HTML dimuat di iframe sandbox');
      } else if (L.where === 'browser') {
        job.current = runBrowser(L.id, code, push);
        await job.current.done;
      } else {
        push('sys', `Mengirim ke server eksekusi (${L.label})…`);
        const r = await fetch('/api/tools/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: L.id, code, stdin }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) push('err', j.error || `HTTP ${r.status}`);
        else {
          if (j.stdout) push('out', j.stdout.replace(/\n$/, ''));
          if (j.stderr) push('err', j.stderr.replace(/\n$/, ''));
          if (!j.stdout && !j.stderr) push('sys', '(tanpa keluaran)');
          setMeta(`${j.compiler} · exit ${j.status}${j.signal ? ` · ${j.signal}` : ''}`);
        }
      }
    } catch (e) { push('err', e.message || 'Gagal menjalankan'); }
    setBusy(false);
    setMeta((m) => `${m ? m + ' · ' : ''}${Math.round(performance.now() - t0)} ms`);
  };
  const stop = () => { job.current?.stop?.(); setBusy(false); };

  return (
    <div className={`cr ${compact ? 'compact' : ''}`}>
      <div className="cr-bar">
        {!hideLangPicker && (
          <select value={lang} onChange={(e) => pickLang(e.target.value)} aria-label="Bahasa">
            <optgroup label="Di browser">{list.filter((l) => l.where === 'browser').map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</optgroup>
            {list.some((l) => l.where === 'server') && <optgroup label="Lewat server">{list.filter((l) => l.where === 'server').map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</optgroup>}
          </select>
        )}
        <span className="cr-where" title={L.where === 'browser' ? 'Dijalankan di perangkat Anda' : 'Dikirim ke layanan eksekusi (Wandbox); tanpa akses internet'}>
          {L.where === 'browser' ? <Globe size={13} /> : <Server size={13} />}{L.where === 'browser' ? 'Browser' : 'Server'}
        </span>
        <span className="cr-sp" />
        <button type="button" className="cr-b" onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1300); } catch {} }} aria-label="Salin kode">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
        {busy ? (
          <button type="button" className="cr-run stop" onClick={stop}><Square size={14} /> Stop</button>
        ) : (
          <button type="button" className="cr-run" onClick={run}><Play size={14} /> Jalankan</button>
        )}
      </div>

      <CodeEditor value={code} onChange={setCode} lang={L.hl} minHeight={minHeight} onRun={run} />

      {L.where === 'server' && (
        <input className="cr-in" value={stdin} onChange={(e) => setStdin(e.target.value)} placeholder="stdin (opsional)" aria-label="Input stdin" spellCheck={false} />
      )}

      {preview !== null && <iframe className="cr-frame" title="Pratinjau" sandbox="allow-scripts allow-forms allow-modals" srcDoc={preview} />}

      <div className="cr-out">
        <div className="cr-oh">
          <span>Keluaran {busy && <Loader2 size={12} className="cr-spin" />}</span>
          <small>{meta}</small>
          <button type="button" className="cr-b" onClick={() => { setLines([]); setMeta(''); }} aria-label="Bersihkan"><Trash2 size={13} /></button>
        </div>
        <pre ref={outRef} className="cr-log" aria-live="polite">
          {lines.length === 0 ? <i className="cr-empty">Tekan Jalankan (Ctrl+Enter)</i> : lines.map((l, i) => <span key={i} className={`k-${l.k}`}>{l.v + '\n'}</span>)}
        </pre>
      </div>

      <style jsx global>{`
        .cr { display: grid; gap: 10px; min-width: 0; }
        .cr-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .cr-bar select, .cr-in { height: 36px; padding: 0 10px; border-radius: 10px; background: color-mix(in srgb, #fff 6%, transparent); border: 1px solid var(--border); color: var(--text); font: inherit; font-size: .8rem; }
        .cr-bar select option, .cr-bar select optgroup { background: var(--bg2, #111); color: var(--text); }
        .cr-in { width: 100%; box-sizing: border-box; font-family: var(--font-mono); }
        .cr-where { display: inline-flex; align-items: center; gap: 5px; font-size: .68rem; color: var(--muted); font-family: var(--font-mono); }
        .cr-sp { flex: 1; }
        .cr-b { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 10px; background: transparent; border: 1px solid var(--border); color: var(--muted); cursor: pointer; }
        .cr-b:hover { color: var(--text); border-color: var(--a2); }
        .cr-run { display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 16px; border-radius: 10px; border: 0; font: inherit; font-weight: 700; font-size: .82rem; cursor: pointer; color: var(--on-accent); background: linear-gradient(135deg, var(--a1), var(--a3)); box-shadow: 0 8px 20px -8px var(--a1); }
        .cr-run.stop { background: #ef4444; color: #fff; box-shadow: none; }
        .cr-frame { width: 100%; height: 240px; border: 1px solid var(--border); border-radius: 12px; background: #fff; }
        .cr-out { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: color-mix(in srgb, var(--bg1, #000) 70%, transparent); }
        .cr-oh { display: flex; align-items: center; gap: 8px; padding: 6px 8px 6px 12px; border-bottom: 1px solid var(--border); font-size: .68rem; text-transform: uppercase; letter-spacing: .1em; font-family: var(--font-mono); color: var(--muted); }
        .cr-oh small { flex: 1; text-transform: none; letter-spacing: 0; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cr-oh .cr-b { width: 28px; height: 28px; }
        .cr-log { margin: 0; padding: 10px 12px; min-height: 90px; max-height: 280px; overflow: auto; font-family: var(--font-mono); font-size: .76rem; line-height: 1.55; white-space: pre-wrap; word-break: break-word; color: var(--text); }
        .cr-log .k-err { color: #f87171; } .cr-log .k-sys { color: var(--muted); font-style: italic; }
        .cr-empty { color: var(--muted); }
        .cr-spin { animation: crspin .8s linear infinite; vertical-align: -2px; }
        @keyframes crspin { to { transform: rotate(360deg); } }
        .cr.compact .cr-log { max-height: 200px; }
      `}</style>
    </div>
  );
}
