import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, X, Send, Sparkles, Trash2, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { sound } from '@/src/lib/interactiveEffects';
import CodeBlock from '@/components/CodeBlock';

const KEY = 'wudysoft_assistant_v1';
const STATE_KEY = 'wudysoft_assistant_state';
const CFG_KEY = 'wudysoft_assistant_cfg';
const ACTIONS = ['chat', 'generate', 'init'];
const DEFAULT_CFG = { endpoint: '/api/ai/loqal', method: 'POST', action: 'chat', media: '', extra: '' };
const HELLO = { role: 'bot', text: 'Halo! Semua jawaban saya datang langsung dari API. Atur endpoint, metode, dan action lewat ikon ⚙ di atas.' };
const QUICK = ['Halo, kamu siapa?', 'Jelaskan REST API singkat', 'Buatkan contoh fetch POST JSON'];

/** Pecah teks balasan menjadi bagian teks & blok kode (```lang ... ```). */
function splitParts(s) {
  const out = []; const re = /```(\w*)\n?([\s\S]*?)```/g; let last = 0; let m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ t: s.slice(last, m.index).trim() });
    out.push({ code: m[2].replace(/\n$/, ''), lang: m[1] || 'plaintext' });
    last = re.lastIndex;
  }
  if (last < s.length) out.push({ t: s.slice(last).trim() });
  return out.filter((p) => p.t || p.code);
}

function readLS(k, fb) { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? fb; } catch { return fb; } }

/** Semua jawaban berasal dari API; endpoint, metode, action & parameter diatur pengguna. */
async function callApi(prompt, cfg) {
  let state = '';
  try { state = localStorage.getItem(STATE_KEY) || ''; } catch {}
  let extra = {};
  if (cfg.extra.trim()) { try { extra = JSON.parse(cfg.extra); } catch { throw new Error('Parameter tambahan bukan JSON valid'); } }
  const params = { action: cfg.action, prompt, state, ...(cfg.media.trim() ? { media: cfg.media.trim() } : {}), ...extra };
  const isGet = cfg.method === 'GET';
  const url = isGet ? `${cfg.endpoint}?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]))}` : cfg.endpoint;
  const r = await fetch(url, isGet ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.status === false) throw new Error(j?.error || j?.message || `HTTP ${r.status}`);
  if (typeof j.state === 'string' && j.state) { try { localStorage.setItem(STATE_KEY, j.state); } catch {} }
  const text = j?.result?.text ?? j?.text ?? j?.result?.message ?? (typeof j?.result === 'string' ? j.result : '');
  return { text: String(text || ''), raw: j };
}

/** Tombol AI di tepi kanan (di bawah tombol Musik) + panel chat. Semua diproses di perangkat. */
export default function AssistantFab() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [msgs, setMsgs] = useState([HELLO]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [showCfg, setShowCfg] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    setCfg({ ...DEFAULT_CFG, ...readLS(CFG_KEY, {}) });
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (Array.isArray(s) && s.length) setMsgs(s.slice(-40)); } catch {}
    const f = () => setOpen(true);
    window.addEventListener('wudysoft:open-assistant', f);
    return () => window.removeEventListener('wudysoft:open-assistant', f);
  }, []);
  useEffect(() => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch {} }, [cfg]);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(msgs.slice(-40))); } catch {} }, [msgs]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy, open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [open]);

  const send = useCallback(async (value) => {
    const needsPrompt = cfg.action !== 'init';
    const v = String(value ?? text).trim();
    if ((needsPrompt && !v) || busy) return;
    sound.playClick();
    setText('');
    setMsgs((m) => [...m, { role: 'user', text: needsPrompt ? v : `⚙ action: ${cfg.action}`, tag: cfg.action }]);
    setBusy(true);
    try {
      const [r] = await Promise.all([callApi(v, cfg), new Promise((ok) => setTimeout(ok, 300))]);
      if (r.text) setMsgs((m) => [...m, { role: 'bot', ai: r.text, tag: cfg.action }]);
      else setMsgs((m) => [...m, { role: 'bot', code: { code: JSON.stringify(r.raw, null, 2), lang: 'json' }, tag: cfg.action }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'bot', text: `Gagal: ${e.message}`, err: true }]);
    }
    setBusy(false);
  }, [text, busy, cfg]);

  const patch = (o) => setCfg((c) => ({ ...c, ...o }));
  const newSession = () => { setMsgs([HELLO]); try { localStorage.removeItem(STATE_KEY); } catch {} };

  const ui = (
    <div className="as-root">
      <AnimatePresence>
        {open && (
          <div className="au-backdrop" onClick={() => setOpen(false)}>
            <motion.section className="au-panel as-panel" role="dialog" aria-label="Asisten AI lokal" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
              <header className="au-head">
                <div className="au-head-t"><Bot size={18} color="var(--a2)" /><h3>Asisten AI</h3></div>
                <div className="au-head-r">
                  <span className="au-badge on as-off"><Sparkles size={11} /> {cfg.action}</span>
                  <button className={`au-x ${showCfg ? 'as-on' : ''}`} onClick={() => setShowCfg((s) => !s)} aria-label="Pengaturan API" aria-pressed={showCfg} title="Pengaturan API"><SlidersHorizontal size={17} /></button>
                  <button className="au-x" onClick={newSession} aria-label="Sesi baru" title="Sesi baru"><Trash2 size={17} /></button>
                  <button className="au-x" onClick={() => setOpen(false)} aria-label="Tutup"><X size={20} /></button>
                </div>
              </header>

              <AnimatePresence initial={false}>
                {showCfg && (
                  <motion.div className="as-cfg" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }}>
                    <div className="as-cfg-in">
                      <label>Endpoint<input value={cfg.endpoint} onChange={(e) => patch({ endpoint: e.target.value })} spellCheck={false} /></label>
                      <div className="as-row">
                        <div className="as-seg" role="group" aria-label="Metode">{['POST', 'GET'].map((m) => <button key={m} type="button" className={cfg.method === m ? 'on' : ''} onClick={() => patch({ method: m })}>{m}</button>)}</div>
                      </div>
                      <div className="as-lbl">Action</div>
                      <div className="as-seg wrap" role="group" aria-label="Action">
                        {ACTIONS.map((a) => <button key={a} type="button" className={cfg.action === a ? 'on' : ''} onClick={() => patch({ action: a })}>{a}</button>)}
                        <input className="as-custom" value={ACTIONS.includes(cfg.action) ? '' : cfg.action} placeholder="kustom…" onChange={(e) => patch({ action: e.target.value.trim() || 'chat' })} spellCheck={false} aria-label="Action kustom" />
                      </div>
                      <label>Media (URL/base64, opsional)<input value={cfg.media} onChange={(e) => patch({ media: e.target.value })} placeholder="https://…/gambar.png" spellCheck={false} /></label>
                      <label>Parameter tambahan (JSON)<textarea rows={2} value={cfg.extra} onChange={(e) => patch({ extra: e.target.value })} placeholder='{"is_subscribed":"false"}' spellCheck={false} /></label>
                      <button type="button" className="as-reset" onClick={() => setCfg(DEFAULT_CFG)}><RotateCcw size={13} /> Kembalikan pengaturan</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="as-log" aria-live="polite">
                {msgs.map((m, i) => (
                  <motion.div key={i} className={`as-msg ${m.role} ${m.err ? 'err' : ''}`} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 360, damping: 28 }}>
                    {m.role === 'bot' && <span className="as-av"><Sparkles size={13} /></span>}
                    <div className="as-bub">
                      {m.text && <p>{m.text}</p>}
                      {m.ai && splitParts(m.ai).map((p, k) => (p.code != null ? <CodeBlock key={k} code={p.code} lang={p.lang} maxHeight={260} /> : <p key={k}>{p.t}</p>))}
                      {m.tag && m.role === 'bot' && <small className="as-src">action: {m.tag}</small>}
                      {m.code && <CodeBlock code={m.code.code} lang={m.code.lang} label={m.code.label} maxHeight={260} />}
                    </div>
                  </motion.div>
                ))}
                {busy && <div className="as-msg bot"><span className="as-av"><Sparkles size={13} /></span><div className="as-bub as-typing"><i /><i /><i /></div></div>}
                <div ref={endRef} />
              </div>

              <div className="as-foot">
                {msgs.length <= 1 && cfg.action !== 'init' && <div className="as-chips">{QUICK.map((q) => <button key={q} type="button" onClick={() => send(q)}>{q}</button>)}</div>}
                <form onSubmit={(e) => { e.preventDefault(); send(); }}>
                  <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={cfg.action === 'init' ? 'Tekan kirim untuk menjalankan init' : 'Tulis pesan…'} aria-label="Pesan" autoComplete="off" maxLength={300} />
                  <button type="submit" disabled={(cfg.action !== 'init' && !text.trim()) || busy} aria-label="Kirim"><Send size={16} /></button>
                </form>
                <small>Semua jawaban dari API · atur endpoint & action lewat ⚙</small>
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

      <button type="button" className="ai-fab" onClick={() => { sound.playClick(); setOpen((o) => !o); }} aria-label="Asisten AI lokal" aria-expanded={open} title="Asisten AI">
        <span className="ai-ring" aria-hidden="true" />
        <Bot className="ai-ico" size={22} />
        <span className="ai-dot" aria-hidden="true" />
        <span className="ai-tip" aria-hidden="true">Asisten</span>
      </button>

      <style jsx global>{`
        .ai-fab { position: fixed; z-index: 1500; right: 0; top: calc(50% + 43px); width: 46px; height: 58px; padding: 0 0 0 4px; display: grid; place-items: center; cursor: pointer; color: var(--text);
          border-radius: min(var(--r-modal, 16px), 22px) 0 0 min(var(--r-modal, 16px), 22px); border: 1px solid var(--dock-border); border-right: none;
          background: linear-gradient(135deg, color-mix(in srgb, var(--surface) 78%, transparent), color-mix(in srgb, var(--a2) 22%, transparent));
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          box-shadow: -8px 10px 28px -10px rgba(0,0,0,.65), inset 1px 1px 0 color-mix(in srgb, #fff 20%, transparent);
          transition: width .3s cubic-bezier(.34,1.56,.64,1), opacity .3s, transform .3s; }
        .ai-fab:hover { width: 56px; color: var(--a2); }
        [data-overlay] .ai-fab { opacity: 0; transform: translateX(100%); pointer-events: none; }
        .ai-ico { animation: ai-bob 3s ease-in-out infinite; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--a2) 60%, transparent)); }
        .ai-fab:hover .ai-ico { animation-duration: .8s; }
        .ai-ring { position: absolute; inset: 6px 4px 6px 8px; border-radius: max(min(var(--r-modal, 16px), 22px) - 6px, 2px) 0 0 max(min(var(--r-modal, 16px), 22px) - 6px, 2px); border: 1px dashed color-mix(in srgb, var(--a2) 45%, transparent); border-right: none; opacity: .55; pointer-events: none; }
        .ai-dot { position: absolute; top: 10px; right: 8px; width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px #22c55e; animation: ai-pulse 2s ease-in-out infinite; }
        .ai-tip { position: absolute; right: calc(100% + 10px); top: 50%; transform: translate(8px, -50%); padding: 5px 10px; border-radius: var(--r-chip, 10px); background: var(--dock-bg); border: 1px solid var(--dock-border); font-size: .72rem; font-weight: 700; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .2s, transform .2s; }
        .ai-fab:hover .ai-tip, .ai-fab:focus-visible .ai-tip { opacity: 1; transform: translate(0, -50%); }
        @keyframes ai-bob { 0%, 100% { transform: translateY(1px) rotate(-4deg); } 50% { transform: translateY(-2px) rotate(4deg); } }
        @keyframes ai-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(.7); } }
        html[data-anim='off'] .ai-ico, html[data-anim='off'] .ai-dot { animation: none; }
        .as-off { display: inline-flex; align-items: center; gap: 4px; }
        .as-panel { max-width: 420px; }
        .as-log { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 14px 14px 6px; display: flex; flex-direction: column; gap: 12px; }
        .as-msg { display: flex; gap: 8px; align-items: flex-end; max-width: 100%; }
        .as-msg.user { justify-content: flex-end; }
        .as-av { width: 24px; height: 24px; flex-shrink: 0; display: grid; place-items: center; border-radius: var(--r-chip, 8px); color: var(--on-accent); background: linear-gradient(135deg, var(--a1), var(--a3)); }
        .as-bub { min-width: 0; max-width: calc(100% - 32px); padding: 10px 12px; border-radius: var(--radius, 12px); border: 1px solid var(--border); background: var(--surface-2); font-size: .84rem; line-height: 1.5; display: grid; gap: 8px; }
        .as-msg.user .as-bub { background: linear-gradient(135deg, var(--a1), var(--a3)); color: var(--on-accent); border-color: transparent; max-width: 86%; }
        .as-bub p { margin: 0; white-space: pre-wrap; word-break: break-word; }
        .as-cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .as-cards button { position: relative; width: 100%; text-align: left; display: grid; gap: 2px; padding: 8px 28px 8px 10px; border-radius: var(--r-btn, 10px); border: 1px solid var(--border); background: color-mix(in srgb, var(--surface) 80%, transparent); color: var(--text); font: inherit; cursor: pointer; transition: border-color .2s, transform .2s; }
        .as-cards button:hover { border-color: var(--a2); transform: translateX(2px); }
        .as-cards b { font-family: var(--font-mono); font-size: .78rem; color: var(--a2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .as-cards small { color: var(--muted); font-size: .7rem; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .as-cards svg { position: absolute; right: 9px; top: 10px; color: var(--muted); }
        .as-acts, .as-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .as-acts button, .as-chips button { padding: 6px 11px; border-radius: var(--r-l); border: 1px solid var(--a2); background: color-mix(in srgb, var(--a2) 12%, transparent); color: var(--text); font: inherit; font-size: .72rem; font-weight: 600; cursor: pointer; transition: background .2s, transform .15s; }
        .as-acts button:hover, .as-chips button:hover { background: color-mix(in srgb, var(--a2) 26%, transparent); transform: translateY(-1px); }
        .as-chips button { border-color: var(--border); background: var(--surface-2); font-weight: 500; }
        .as-typing { display: flex; gap: 4px; align-items: center; padding: 12px; }
        .as-typing i { width: 6px; height: 6px; border-radius: 50%; background: var(--a2); animation: as-dot 1s ease-in-out infinite; }
        .as-typing i:nth-child(2) { animation-delay: .15s; } .as-typing i:nth-child(3) { animation-delay: .3s; }
        @keyframes as-dot { 0%, 60%, 100% { transform: translateY(0); opacity: .4; } 30% { transform: translateY(-4px); opacity: 1; } }
        .as-foot { padding: 8px 14px calc(12px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid var(--border); display: grid; gap: 8px; background: var(--surface-2); }
        .as-foot form { display: flex; gap: 8px; }
        .as-foot input { flex: 1; min-width: 0; height: 42px; padding: 0 12px; border-radius: var(--r-input, 10px); border: 1px solid var(--border); background: var(--surface); color: var(--text); font: inherit; font-size: .9rem; outline: none; }
        .as-foot input:focus { border-color: var(--a2); }
        .as-foot form button { width: 42px; height: 42px; display: grid; place-items: center; border-radius: var(--r-btn, 10px); border: 0; cursor: pointer; color: var(--on-accent); background: linear-gradient(135deg, var(--a1), var(--a3)); }
        .as-foot form button:disabled { opacity: .45; cursor: not-allowed; }
        .as-cfg { overflow: hidden; border-bottom: 1px solid var(--border); background: var(--surface-2); }
        .as-cfg-in { padding: 12px 14px; display: grid; gap: 10px; max-height: 42vh; overflow-y: auto; overscroll-behavior: contain; }
        .as-cfg label, .as-lbl { display: grid; gap: 4px; font-size: .68rem; font-family: var(--font-mono); color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
        .as-cfg input, .as-cfg textarea { width: 100%; padding: 8px 10px; border-radius: var(--r-input, 10px); border: 1px solid var(--border); background: var(--surface); color: var(--text); font: inherit; font-size: .8rem; text-transform: none; letter-spacing: 0; outline: none; resize: vertical; }
        .as-cfg input:focus, .as-cfg textarea:focus { border-color: var(--a2); }
        .as-seg { display: inline-flex; gap: 4px; padding: 3px; border-radius: var(--r-btn, 10px); border: 1px solid var(--border); background: var(--surface); }
        .as-seg.wrap { flex-wrap: wrap; display: flex; }
        .as-seg button { padding: 6px 12px; border-radius: max(calc(var(--r-btn, 10px) - 3px), 3px); border: 0; background: transparent; color: var(--muted); font: inherit; font-size: .74rem; font-weight: 700; cursor: pointer; }
        .as-seg button.on { color: var(--on-accent); background: linear-gradient(135deg, var(--a1), var(--a3)); }
        .as-seg .as-custom { flex: 1; min-width: 80px; padding: 5px 8px; border: 0; background: transparent; }
        .as-reset { justify-self: start; display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: var(--r-btn, 10px); border: 1px solid var(--border); background: transparent; color: var(--muted); font: inherit; font-size: .72rem; cursor: pointer; }
        .as-reset:hover { color: var(--a2); border-color: var(--a2); }
        .au-x.as-on { color: var(--a2); }
        .as-msg.err .as-bub { border-color: #ef4444; color: #ef4444; }
        .as-src { color: var(--muted); font-size: .62rem; font-family: var(--font-mono); }
        .as-foot small { text-align: center; color: var(--muted); font-size: .64rem; font-family: var(--font-mono); }
      `}</style>
    </div>
  );
  return mounted ? createPortal(ui, document.body) : null;
}
