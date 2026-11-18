import { memo, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { highlight } from '@/src/lib/highlight';

/** Blok kode dengan syntax highlighting (highlight.js) + tombol salin. */
function CodeBlock({ code, lang = 'plaintext', wrap = true, copy = true, maxHeight = 520, label, className = '' }) {
  const html = useMemo(() => highlight(code, lang), [code, lang]);
  const [done, setDone] = useState(false);
  const doCopy = async () => {
    try { await navigator.clipboard.writeText(code); setDone(true); setTimeout(() => setDone(false), 1400); } catch {}
  };
  return (
    <div className={`cb ${className}`}>
      {(label || copy) && (
        <div className="cb-bar">
          <span>{label || lang}</span>
          {copy && <button type="button" onClick={doCopy} aria-label="Salin kode">{done ? <Check size={13} /> : <Copy size={13} />}{done ? 'Tersalin' : 'Salin'}</button>}
        </div>
      )}
      <pre className={`hl cb-pre ${wrap ? 'wrap' : ''}`} style={{ maxHeight }}><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
      <style jsx global>{`
        .cb { border-radius: 12px; border: 1px solid var(--border); background: color-mix(in srgb, var(--bg1, #000) 62%, transparent); overflow: hidden; min-width: 0; }
        .cb-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; font-family: var(--font-mono); font-size: .66rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--border); background: color-mix(in srgb, #fff 4%, transparent); }
        .cb-bar button { display: inline-flex; align-items: center; gap: 5px; background: none; border: 1px solid var(--border); color: var(--text); border-radius: 8px; padding: 3px 9px; font: inherit; font-size: .64rem; cursor: pointer; text-transform: none; letter-spacing: 0; }
        .cb-bar button:hover { border-color: var(--a2); }
        .cb-pre { margin: 0; padding: 12px 14px; overflow: auto; font-family: var(--font-mono); font-size: .76rem; line-height: 1.6; color: var(--text); white-space: pre; tab-size: 2; }
        .cb-pre.wrap { white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
        .cb-pre code { font: inherit; }
      `}</style>
    </div>
  );
}
export default memo(CodeBlock);
