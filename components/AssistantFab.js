import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, X, Send, Sparkles, Trash2, SlidersHorizontal, RotateCcw, Paperclip, Wand2, MessageSquare, Eye, ImagePlus, Pencil, Download, Loader2, Square, ExternalLink } from 'lucide-react';
import { sound } from '@/src/lib/interactiveEffects';
import CodeBlock from '@/components/CodeBlock';
import { uploadMedia, MAX_UPLOAD_MB } from '@/src/lib/uploadMedia';
import { toast } from '@/src/lib/toast';

const KEY = 'wudysoft_assistant_v2';
const STATE_KEY = 'wudysoft_assistant_state';
const CFG_KEY = 'wudysoft_assistant_cfg';
const ACTIONS = ['chat', 'generate', 'init'];
const DEFAULT_CFG = { endpoint: '/api/ai/loqal', imgEndpoint: '/api/ai/imgeditor', method: 'POST', action: 'chat', extra: '' };
const MAX_IMG = 3;
const HELLO = { role: 'bot', text: 'Halo! Saya bisa ngobrol, menganalisa gambar (vision), membuat gambar, dan mengedit gambar. Lampirkan foto lewat 📎, tempel, atau seret ke sini — otomatis diunggah ke URL.' };
const QUICK = { auto: ['Halo, kamu siapa?', 'Buatkan gambar kucing astronot gaya anime', 'Jelaskan REST API singkat'], chat: ['Halo, kamu siapa?', 'Jelaskan REST API singkat', 'Buatkan contoh fetch POST JSON'], vision: ['Apa isi gambar ini?', 'Baca teks pada gambar ini', 'Jelaskan gambar ini secara detail'], image: ['Kucing astronot gaya anime, latar bulan', 'Logo minimalis kopi, warna hijau', 'Pemandangan gunung saat senja, realistis'], edit: ['Ubah latar menjadi pantai saat senja', 'Jadikan gaya anime', 'Hapus objek di belakang'] };
const MODES = [
  { id: 'auto', label: 'Auto', Icon: Wand2, hint: 'Mode dipilih otomatis dari pesan & lampiran' },
  { id: 'chat', label: 'Chat', Icon: MessageSquare, hint: 'Ngobrol teks biasa' },
  { id: 'vision', label: 'Vision', Icon: Eye, hint: 'Tanya/analisa gambar terlampir' },
  { id: 'image', label: 'Buat', Icon: ImagePlus, hint: 'Buat gambar dari deskripsi' },
  { id: 'edit', label: 'Edit', Icon: Pencil, hint: 'Ubah gambar terlampir sesuai perintah' },
];
const MODE_LABEL = Object.fromEntries(MODES.map((m) => [m.id, m.label]));

const RE_EDIT = /\b(edit|ubah|ganti|hapus|buang|tambah(kan)?|jadikan|jadi(kan)?|ubahlah|perbaiki|percantik|hilangkan|remove|replace|change|make (it|this)|convert|retouch|colorize|warnai|filter|style|gaya)\b/i;
const RE_DRAW = /(\b(buat(kan)?|bikin(kan)?|generate|gambar(kan)?|lukis(kan)?|create|draw|render|desain(kan)?)\b[\s\S]{0,40}\b(gambar|foto|ilustrasi|image|picture|logo|poster|wallpaper|lukisan|sketsa|kartun|ikon|icon|avatar|banner)\b)|^\s*\/(img|imagine|gambar)\b/i;

/** Pilih mode dari isi pesan + ada/tidaknya gambar terlampir. */
function detectMode(prompt, hasImg) {
  if (hasImg) return RE_EDIT.test(prompt) ? 'edit' : 'vision';
  return RE_DRAW.test(prompt) ? 'image' : 'chat';
}

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

/** Chat & vision: jawaban dari API (loqal). `media` = URL gambar hasil auto-upload (vision). */
async function callApi(prompt, cfg, media, signal) {
  let state = '';
  try { state = localStorage.getItem(STATE_KEY) || ''; } catch {}
  let extra = {};
  if (cfg.extra.trim()) { try { extra = JSON.parse(cfg.extra); } catch { throw new Error('Parameter tambahan bukan JSON valid'); } }
  const action = media ? 'chat' : cfg.action;
  const params = { action, prompt, state, ...(media ? { media } : {}), ...extra };
  const isGet = cfg.method === 'GET' && !media;
  const url = isGet ? `${cfg.endpoint}?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]))}` : cfg.endpoint;
  const r = await fetch(url, isGet ? { signal } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params), signal });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.status === false) throw new Error(j?.error || j?.message || `HTTP ${r.status}`);
  if (typeof j.state === 'string' && j.state) { try { localStorage.setItem(STATE_KEY, j.state); } catch {} }
  const text = j?.result?.text ?? j?.text ?? j?.result?.message ?? (typeof j?.result === 'string' ? j.result : '');
  return { text: String(text || ''), raw: j };
}

/** Buat / edit gambar: tanpa `images` = teks→gambar, dengan `images` (URL) = edit. Mengembalikan URL gambar hasil. */
async function callImage(prompt, images, cfg, signal) {
  const body = { prompt, ...(images.length ? { imageUrl: images.length === 1 ? images[0] : images } : {}) };
  const r = await fetch(cfg.imgEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || j?.message || `HTTP ${r.status}`);
  const first = (v) => (Array.isArray(v) ? first(v[0]) : typeof v === 'string' ? v : v?.url || v?.imageUrl || '');
  const url = first(j.result) || first(j.url) || first(j.images) || first(j.data);
  if (!/^https?:\/\//i.test(url || '')) throw new Error(j?.error || 'API tidak mengembalikan gambar');
  return url;
}

/** Tombol AI di tepi kanan (di bawah tombol Musik) + panel chat. Semua diproses di perangkat. */
export default function AssistantFab() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [msgs, setMsgs] = useState([HELLO]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState('');
  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [showCfg, setShowCfg] = useState(false);
  const [mode, setMode] = useState('auto');
  const [files, setFiles] = useState([]); // lampiran: { id, name, preview, status, progress, url }
  const [drag, setDrag] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const ctl = useRef(null);
  const ups = useRef(new Map());

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

  // ---------- Lampiran: pilih / tempel / seret → otomatis diunggah ke URL ----------
  const addUrlAttachment = useCallback((url, name = 'gambar') => {
    setFiles((l) => (l.length >= MAX_IMG ? l : [...l, { id: `u${Date.now()}`, name, preview: url, status: 'done', progress: 1, url }]));
  }, []);

  const addFiles = (list) => {
    const arr = Array.from(list || []).filter((f) => {
      if (!f.type.startsWith('image/')) { toast.warn(`${f.name}: hanya gambar yang didukung asisten.`); return false; }
      if (f.size > 25 * 1024 * 1024) { toast.err(`${f.name}: terlalu besar (maks ${MAX_UPLOAD_MB} MB setelah diperkecil).`); return false; }
      return true;
    });
    const room = MAX_IMG - files.length;
    if (!arr.length) return;
    if (room <= 0) return toast.warn(`Maksimal ${MAX_IMG} gambar.`);
    arr.slice(0, room).forEach((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const preview = URL.createObjectURL(file);
      setFiles((l) => [...l, { id, name: file.name, preview, status: 'uploading', progress: 0, url: '' }]);
      const c = new AbortController(); ups.current.set(id, c);
      uploadMedia(file, { signal: c.signal, onProgress: (v) => setFiles((l) => l.map((x) => (x.id === id ? { ...x, progress: v } : x))) })
        .then((m) => setFiles((l) => l.map((x) => (x.id === id ? { ...x, status: 'done', progress: 1, url: m.url } : x))))
        .catch((e) => { if (e.message !== 'Dibatalkan') { toast.err(`${file.name}: ${e.message}`); setFiles((l) => l.filter((x) => x.id !== id)); } })
        .finally(() => ups.current.delete(id));
    });
    sound.playClick();
  };
  const dropFile = (id) => { ups.current.get(id)?.abort(); setFiles((l) => l.filter((x) => x.id !== id)); };
  const uploading = files.some((f) => f.status === 'uploading');

  const stop = () => { ctl.current?.abort(); };

  const send = useCallback(async (value) => {
    const v = String(value ?? text).trim();
    const imgs = files.filter((f) => f.status === 'done').map((f) => f.url);
    const isInit = cfg.action === 'init' && mode === 'chat' && !imgs.length;
    if ((!isInit && !v) || busy || uploading) return;
    const m = mode === 'auto' ? detectMode(v, imgs.length > 0) : mode;
    if ((m === 'vision' || m === 'edit') && !imgs.length) { toast.warn(m === 'edit' ? 'Lampirkan gambar yang ingin diedit dulu (📎).' : 'Lampirkan gambar yang ingin dianalisa dulu (📎).'); return; }
    sound.playClick();
    setText('');
    setFiles([]);
    setMsgs((l) => [...l, { role: 'user', text: isInit ? `⚙ action: ${cfg.action}` : v, images: imgs, tag: m }]);
    setBusy(m);
    const c = new AbortController(); ctl.current = c;
    try {
      if (m === 'image' || m === 'edit') {
        const url = await callImage(v, m === 'edit' ? imgs : [], cfg, c.signal);
        setMsgs((l) => [...l, { role: 'bot', images: [url], tag: m, text: m === 'edit' ? 'Ini hasil editnya.' : 'Ini gambarnya.' }]);
      } else {
        const [r] = await Promise.all([callApi(v, cfg, m === 'vision' ? imgs[0] : '', c.signal), new Promise((ok) => setTimeout(ok, 300))]);
        if (r.text) setMsgs((l) => [...l, { role: 'bot', ai: r.text, tag: m }]);
        else setMsgs((l) => [...l, { role: 'bot', code: { code: JSON.stringify(r.raw, null, 2), lang: 'json' }, tag: m }]);
      }
    } catch (e) {
      if (e.name === 'AbortError') setMsgs((l) => [...l, { role: 'bot', text: 'Dibatalkan.', err: true }]);
      else { setMsgs((l) => [...l, { role: 'bot', text: `Gagal: ${e.message}`, err: true }]); toast.err(e.message); }
    }
    setBusy('');
  }, [text, busy, cfg, mode, files, uploading]);

  const patch = (o) => setCfg((c) => ({ ...c, ...o }));
  const newSession = () => { setMsgs([HELLO]); setFiles([]); try { localStorage.removeItem(STATE_KEY); } catch {} toast.info('Sesi baru dimulai.'); };
  const onPaste = (e) => {
    const f = Array.from(e.clipboardData?.files || []).filter((x) => x.type.startsWith('image/'));
    if (f.length) { e.preventDefault(); addFiles(f); }
  };
  const quick = QUICK[mode] || QUICK.auto;
  const placeholder = mode === 'image' ? 'Deskripsikan gambar yang ingin dibuat…' : mode === 'edit' ? 'Apa yang ingin diubah dari gambar?' : mode === 'vision' ? 'Tanya sesuatu tentang gambar…' : cfg.action === 'init' && mode === 'chat' ? 'Tekan kirim untuk menjalankan init' : 'Tulis pesan atau perintah gambar…';

  const ui = (
    <div className="as-root">
      <AnimatePresence>
        {open && (
          <div className="au-backdrop" onClick={() => setOpen(false)}>
            <motion.section className="au-panel as-panel" role="dialog" aria-label="Asisten AI" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} onClick={(e) => e.stopPropagation()}
              onDragOver={(e) => { if (e.dataTransfer?.types?.includes?.('Files')) { e.preventDefault(); setDrag(true); } }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDrag(false); }} onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer?.files); }}>
              <header className="au-head">
                <div className="au-head-t"><Bot size={18} color="var(--a2)" /><h3>Asisten AI</h3></div>
                <div className="au-head-r">
                  <span className="au-badge on as-off"><Sparkles size={11} /> {mode === 'auto' ? 'auto' : MODE_LABEL[mode].toLowerCase()}</span>
                  <button className={`au-x ${showCfg ? 'as-on' : ''}`} onClick={() => setShowCfg((v) => !v)} aria-label="Pengaturan API" aria-pressed={showCfg} title="Pengaturan API"><SlidersHorizontal size={17} /></button>
                  <button className="au-x" onClick={newSession} aria-label="Sesi baru" title="Sesi baru"><Trash2 size={17} /></button>
                  <button className="au-x" onClick={() => setOpen(false)} aria-label="Tutup"><X size={20} /></button>
                </div>
              </header>

              <div className="as-modes" role="tablist" aria-label="Mode asisten">
                {MODES.map(({ id, label, Icon, hint }) => (
                  <button key={id} type="button" role="tab" aria-selected={mode === id} className={mode === id ? 'on' : ''} title={hint} onClick={() => { sound.playClick(); setMode(id); }}><Icon size={13} /> {label}</button>
                ))}
              </div>

              <AnimatePresence initial={false}>
                {showCfg && (
                  <motion.div className="as-cfg" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }}>
                    <div className="as-cfg-in">
                      <label>Endpoint chat / vision<input value={cfg.endpoint} onChange={(e) => patch({ endpoint: e.target.value })} spellCheck={false} /></label>
                      <label>Endpoint buat & edit gambar<input value={cfg.imgEndpoint} onChange={(e) => patch({ imgEndpoint: e.target.value })} spellCheck={false} /></label>
                      <div className="as-row">
                        <div className="as-seg" role="group" aria-label="Metode">{['POST', 'GET'].map((m) => <button key={m} type="button" className={cfg.method === m ? 'on' : ''} onClick={() => patch({ method: m })}>{m}</button>)}</div>
                      </div>
                      <div className="as-lbl">Action chat</div>
                      <div className="as-seg wrap" role="group" aria-label="Action">
                        {ACTIONS.map((a) => <button key={a} type="button" className={cfg.action === a ? 'on' : ''} onClick={() => patch({ action: a })}>{a}</button>)}
                        <input className="as-custom" value={ACTIONS.includes(cfg.action) ? '' : cfg.action} placeholder="kustom…" onChange={(e) => patch({ action: e.target.value.trim() || 'chat' })} spellCheck={false} aria-label="Action kustom" />
                      </div>
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
                      {m.images?.length > 0 && (
                        <div className={`as-imgs n${Math.min(m.images.length, 3)}`}>
                          {m.images.map((u, k) => (
                            <div key={u + k} className="as-img">
                              <a href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt={m.role === 'bot' ? 'hasil AI' : 'lampiran'} loading="lazy" referrerPolicy="no-referrer" /></a>
                              {m.role === 'bot' && (
                                <div className="as-img-a">
                                  <button type="button" onClick={() => { addUrlAttachment(u, 'hasil-ai'); setMode('edit'); inputRef.current?.focus(); toast.info('Gambar dilampirkan — tulis perintah edit.'); }}><Pencil size={12} /> Edit</button>
                                  <a href={u} download target="_blank" rel="noopener noreferrer"><Download size={12} /> Unduh</a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {m.text && <p>{m.text}</p>}
                      {m.ai && splitParts(m.ai).map((p, k) => (p.code != null ? <CodeBlock key={k} code={p.code} lang={p.lang} maxHeight={260} /> : <p key={k}>{p.t}</p>))}
                      {m.tag && m.role === 'bot' && <small className="as-src">mode: {MODE_LABEL[m.tag] || m.tag}</small>}
                      {m.code && <CodeBlock code={m.code.code} lang={m.code.lang} label={m.code.label} maxHeight={260} />}
                    </div>
                  </motion.div>
                ))}
                {busy && (
                  <div className="as-msg bot"><span className="as-av"><Sparkles size={13} /></span>
                    <div className="as-bub as-typing"><i /><i /><i />{(busy === 'image' || busy === 'edit') && <small>{busy === 'edit' ? 'Mengedit' : 'Membuat'} gambar… bisa 30–90 detik</small>}</div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="as-foot">
                {msgs.length <= 1 && !busy && <div className="as-chips">{quick.map((q) => <button key={q} type="button" onClick={() => send(q)}>{q}</button>)}</div>}
                {files.length > 0 && (
                  <div className="as-files" aria-label="Lampiran gambar">
                    {files.map((f) => (
                      <div key={f.id} className="as-file" title={f.name}>
                        <img src={f.preview} alt="" referrerPolicy="no-referrer" />
                        {f.status === 'uploading' && <span className="as-up"><Loader2 size={14} className="spin" /><i style={{ width: `${Math.round(f.progress * 100)}%` }} /></span>}
                        <button type="button" onClick={() => dropFile(f.id)} aria-label={`Hapus ${f.name}`}><X size={11} /></button>
                      </div>
                    ))}
                    {uploading && <small>Mengunggah ke URL…</small>}
                  </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); send(); }}>
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                  <button type="button" className="as-attach" onClick={() => fileRef.current?.click()} aria-label="Lampirkan gambar" title="Lampirkan gambar (otomatis diunggah ke URL)"><Paperclip size={17} /></button>
                  <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onPaste={onPaste} placeholder={placeholder} aria-label="Pesan" autoComplete="off" maxLength={1000} />
                  {busy ? (
                    <button type="button" onClick={stop} aria-label="Hentikan" title="Hentikan"><Square size={15} /></button>
                  ) : (
                    <button type="submit" disabled={uploading || ((cfg.action !== 'init' || mode !== 'chat') && !text.trim())} aria-label="Kirim"><Send size={16} /></button>
                  )}
                </form>
                <small>Chat · Vision · Buat & Edit gambar · lampiran otomatis jadi URL</small>
              </div>
              <AnimatePresence>{drag && <motion.div className="as-drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><span><ImagePlus size={28} /><br />Lepaskan gambar di sini</span></motion.div>}</AnimatePresence>
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
        .as-panel { position: relative; }
        .as-modes { display: flex; gap: 4px; padding: 8px 12px; overflow-x: auto; border-bottom: 1px solid var(--border); background: var(--surface-2); scrollbar-width: none; }
        .as-modes::-webkit-scrollbar { display: none; }
        .as-modes button { flex: none; display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: var(--r-l, 999px); border: 1px solid var(--border); background: transparent; color: var(--muted); font: inherit; font-size: .72rem; font-weight: 700; cursor: pointer; transition: background .2s, color .2s, border-color .2s; }
        .as-modes button:hover { color: var(--text); border-color: var(--a2); }
        .as-modes button.on { color: var(--on-accent); border-color: transparent; background: linear-gradient(135deg, var(--a1), var(--a3)); }
        .as-imgs { display: grid; gap: 6px; }
        .as-imgs.n2, .as-imgs.n3 { grid-template-columns: repeat(2, 1fr); }
        .as-img { position: relative; border-radius: calc(var(--radius, 12px) - 4px); overflow: hidden; border: 1px solid var(--border); background: color-mix(in srgb, var(--text) 6%, transparent); }
        .as-img img { display: block; width: 100%; height: auto; max-height: 320px; object-fit: contain; }
        .as-img-a { display: flex; gap: 6px; padding: 6px; background: var(--surface-2); border-top: 1px solid var(--border); }
        .as-img-a button, .as-img-a a { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: var(--r-btn, 10px); border: 1px solid var(--border); background: transparent; color: var(--text); font: inherit; font-size: .7rem; font-weight: 600; text-decoration: none; cursor: pointer; }
        .as-img-a button:hover, .as-img-a a:hover { border-color: var(--a2); color: var(--a2); }
        .as-typing small { margin-left: 6px; color: var(--muted); font-size: .68rem; }
        .as-files { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .as-files small { color: var(--muted); font-size: .66rem; font-family: var(--font-mono); }
        .as-file { position: relative; width: 54px; height: 54px; border-radius: var(--r-m, 10px); overflow: hidden; border: 1px solid var(--border); }
        .as-file img { width: 100%; height: 100%; object-fit: cover; }
        .as-file button { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; display: grid; place-items: center; border: 0; border-radius: 50%; background: rgba(0,0,0,.65); color: #fff; cursor: pointer; padding: 0; }
        .as-up { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.5); color: #fff; }
        .as-up i { position: absolute; left: 0; bottom: 0; height: 3px; background: var(--a2); }
        .as-foot form .as-attach { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
        .as-foot form .as-attach:hover { color: var(--a2); border-color: var(--a2); }
        .as-drop { position: absolute; inset: 0; z-index: 30; display: grid; place-items: center; text-align: center; border: 2px dashed var(--a2); background: color-mix(in srgb, var(--bg1) 82%, transparent); backdrop-filter: blur(6px); color: var(--a2); font-weight: 700; pointer-events: none; }
        .spin { animation: as-spin .9s linear infinite; }
        @keyframes as-spin { to { transform: rotate(360deg); } }
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
