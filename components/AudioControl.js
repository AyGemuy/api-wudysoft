import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Music, Pause, Play, X, Volume2, VolumeX, Bell, Link2, Minus, Plus } from 'lucide-react';
import { audioStore, bgm, CUES, parseYouTube } from '@/src/lib/audio';
import { sound } from '@/src/lib/interactiveEffects';
import { useTheme } from '@/components/ThemeContext';

function useStore(store) {
  const [v, setV] = useState(store.get());
  useEffect(() => { setV(store.get()); return store.subscribe(setV); }, [store]);
  return v;
}

function Switch({ on, onChange, label, hint, id }) {
  return (
    <button type="button" id={id} role="switch" aria-checked={on} className="switch-row" onClick={() => onChange(!on)}>
      <span className="switch-text"><span>{label}</span>{hint && <small>{hint}</small>}</span>
      <span className={`switch-knob ${on ? 'on' : ''}`}><span className="circle" /></span>
    </button>
  );
}

/** Slider volume bergaya Theme Studio: tombol −/+ (tahan untuk berulang), trek berisi, nilai persen. */
function Volume({ label, value, onChange, onCommit, icon }) {
  const pct = Math.round(value * 100);
  const ref = useRef(value);
  ref.current = value;
  const timer = useRef(null);
  const stop = () => { clearTimeout(timer.current); clearInterval(timer.current); timer.current = null; };
  useEffect(() => stop, []);
  const step = (d) => { const v = Math.min(1, Math.max(0, Math.round((ref.current + d) * 100) / 100)); ref.current = v; onChange(v); };
  const hold = (d) => (e) => {
    e.preventDefault();
    stop();
    step(d);
    timer.current = setTimeout(() => { timer.current = setInterval(() => step(d), 90); }, 380);
  };
  const release = () => { if (timer.current) { stop(); onCommit?.(); } };
  return (
    <div className="cfg au-vol">
      <div className="cfg-row"><span className="cfg-label">{icon} {label}</span><span className="cfg-value">{pct}%</span></div>
      <div className="au-vol-row">
        <button type="button" className="au-step" aria-label={`Kurangi ${label}`} onPointerDown={hold(-0.05)} onPointerUp={release} onPointerLeave={release} onPointerCancel={release} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), step(-0.05), onCommit?.())} disabled={pct <= 0}><Minus size={16} /></button>
        <input className="au-range" type="range" min="0" max="100" step="1" value={pct} style={{ '--p': `${pct}%` }} onChange={(e) => onChange(e.target.value / 100)} onPointerUp={() => onCommit?.()} onKeyUp={() => onCommit?.()} aria-label={label} />
        <button type="button" className="au-step" aria-label={`Tambah ${label}`} onPointerDown={hold(0.05)} onPointerUp={release} onPointerLeave={release} onPointerCancel={release} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), step(0.05), onCommit?.())} disabled={pct >= 100}><Plus size={16} /></button>
      </div>
    </div>
  );
}

/**
 * Tombol & panel Audio (pojok kiri bawah): BGM dari link YouTube (on/off, volume, ganti link)
 * serta pengaturan efek suara (master, volume, tiap cue + tombol tes).
 * Juga memicu suara "welcome" sekali per sesi browser dan memulai BGM saat interaksi pertama.
 */
export default function AudioControl() {
  const { config, setConfig } = useTheme();
  const a = useStore(audioStore);
  const [b, setB] = useState(bgm.get());
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [urlErr, setUrlErr] = useState('');
  const box = useRef(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => bgm.subscribe(setB), []);
  useEffect(() => { setUrl(audioStore.get().bgmUrl); }, []);

  // welcome sekali per sesi + mulai BGM saat interaksi pertama (kebijakan autoplay browser)
  useEffect(() => {
    try {
      if (!sessionStorage.getItem('wd_welcomed')) {
        sessionStorage.setItem('wd_welcomed', '1');
        sound.playWhenReady('welcome');
      }
    } catch {}
    bgm.sync(false);
    const first = () => { bgm.sync(true); off(); };
    const off = () => { window.removeEventListener('pointerdown', first, true); window.removeEventListener('keydown', first, true); };
    window.addEventListener('pointerdown', first, true);
    window.addEventListener('keydown', first, true);
    return off;
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onDown = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open]);

  const apply = useCallback((e) => {
    e?.preventDefault();
    const v = url.trim();
    if (v && !parseYouTube(v)) return setUrlErr('Link YouTube tidak valid. Contoh: https://youtu.be/dQw4w9WgXcQ');
    setUrlErr('');
    sound.playClick();
    audioStore.set({ bgmOn: !!v });
    bgm.setUrl(v);
  }, [url]);

  const playing = b.status === 'playing';
  const sfxOn = config?.soundEnabled !== false;
  const statusText = {
    idle: a.bgmUrl ? (a.bgmOn ? 'Menunggu interaksi pertama…' : 'Dimatikan') : 'Belum ada link BGM',
    loading: 'Memuat…',
    playing: b.title ? `Memutar: ${b.title}` : 'Memutar',
    paused: 'Dijeda',
    error: b.error || 'Terjadi kesalahan',
  }[b.status];

  // Portal ke <body>: .wrap (z-index 2) membuat stacking context sehingga tombol tertahan di belakang elemen lain
  const ui = (
    <div className="au-root" ref={box}>
      <AnimatePresence>
        {open && (
          <motion.section
            className="au-panel glass"
            role="dialog"
            aria-label="Pengaturan audio"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <header className="au-head">
              <h3><Music size={16} /> Audio</h3>
              <button className="au-x" onClick={() => setOpen(false)} aria-label="Tutup"><X size={16} /></button>
            </header>

            <div className="au-sec">
              <div className="au-title">Musik latar (BGM)</div>
              <Switch id="au-bgm" on={a.bgmOn} label="BGM" hint={a.bgmUrl ? 'Putar musik latar' : 'Tempel link dulu'} onChange={(v) => { if (!a.bgmUrl) return setUrlErr('Tempel link YouTube di bawah dulu.'); sound.playClick(); bgm.setOn(v); }} />
              <form className="au-url" onSubmit={apply}>
                <label htmlFor="au-link" className="au-sr">Link YouTube</label>
                <div className="au-input"><Link2 size={14} /><input id="au-link" className="input" placeholder="Link YouTube (video / playlist)" value={url} onChange={(e) => { setUrl(e.target.value); setUrlErr(''); }} inputMode="url" autoComplete="off" spellCheck={false} /></div>
                <button className="btn primary" type="submit">Setel</button>
              </form>
              {urlErr && <div className="au-err" role="alert">{urlErr}</div>}
              <div className={`au-status ${b.status}`} aria-live="polite">
                {playing && <span className="au-eq" aria-hidden="true"><i /><i /><i /></span>}
                <span className="au-status-t">{statusText}</span>
                {a.bgmUrl && b.status !== 'error' && (
                  <button className="au-play" onClick={() => { sound.playClick(); bgm.toggle(); }} aria-label={a.bgmOn ? 'Jeda BGM' : 'Putar BGM'}>
                    {a.bgmOn && b.status !== 'paused' ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                )}
              </div>
              <Volume label="Volume BGM" icon={<Music size={13} />} value={a.bgmVol} onChange={(v) => bgm.setVolume(v)} />
            </div>

            <div className="au-sec">
              <div className="au-title">Efek suara</div>
              <Switch on={sfxOn} label="Efek suara" hint="Klik, login, logout, 404" onChange={(v) => { setConfig({ ...config, soundEnabled: v }); if (v) { sound.enabled = true; sound.playBeep(); } }} />
              <Volume label="Volume efek" icon={<Volume2 size={13} />} value={a.sfxVol} onChange={(v) => audioStore.set({ sfxVol: v })} onCommit={() => sound.playBeep()} />
              <ul className="au-cues">
                {CUES.map((c) => (
                  <li key={c.id}>
                    <Switch on={a.cues[c.id] !== false} label={c.label} hint={c.hint} onChange={(v) => audioStore.set({ cues: { ...a.cues, [c.id]: v } })} />
                    <button className="au-test" onClick={() => { const was = sound.enabled; sound.enabled = true; const on = audioStore.get().cues[c.id]; audioStore.set({ cues: { ...audioStore.get().cues, [c.id]: true } }); sound.play(c.id); audioStore.set({ cues: { ...audioStore.get().cues, [c.id]: on } }); sound.enabled = was; }} aria-label={`Tes suara ${c.label}`} title="Tes"><Bell size={13} /></button>
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <button className={`au-fab ${playing ? 'live' : ''}`} onClick={() => { sound.playClick(); setOpen((o) => !o); }} aria-label="Pengaturan audio" aria-expanded={open} title="Audio">
        <span className="au-ring" aria-hidden="true" />
        <span className="au-ico">
          {playing ? <span className="au-eq big" aria-hidden="true"><i /><i /><i /><i /></span> : a.bgmOn || sfxOn ? <Music size={22} /> : <VolumeX size={22} />}
        </span>
        <span className="au-tip" aria-hidden="true">Audio</span>
      </button>

      <style jsx global>{`
        .au-root { position: relative; z-index: 1600; }
        /* tab di tepi kanan tepat di bawah tombol Tema (gaya sama) */
        .au-fab { position: fixed; z-index: 1500; right: 0; top: calc(46% + 70px); width: 46px; height: 58px; padding: 0 0 0 4px; display: grid; place-items: center; cursor: pointer; color: var(--text);
          border-radius: 30px 0 0 30px; border: 1px solid var(--dock-border); border-right: none;
          background: linear-gradient(135deg, color-mix(in srgb, var(--surface) 78%, transparent), color-mix(in srgb, var(--a3) 22%, transparent));
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          box-shadow: -8px 10px 28px -10px rgba(0,0,0,.65), inset 1px 1px 0 color-mix(in srgb, #fff 20%, transparent);
          transition: width .3s cubic-bezier(.34,1.56,.64,1), opacity .3s, transform .3s; }
        .au-fab:hover { width: 56px; color: var(--a2); }
        [data-overlay] .au-fab { opacity: 0; transform: translateX(100%); pointer-events: none; animation: none; }
        .au-ico { display: grid; place-items: center; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--a2) 60%, transparent)); animation: au-sway 3.4s ease-in-out infinite; }
        .au-fab.live .au-ico { animation: none; }
        .au-fab:hover .au-ico { animation: au-sway 0.9s ease-in-out infinite; }
        .au-ring { position: absolute; inset: 6px 4px 6px 8px; border-radius: 24px 0 0 24px; border: 1px dashed color-mix(in srgb, var(--a3) 45%, transparent); border-right: none; opacity: .5; pointer-events: none; }
        .au-fab.live .au-ring { opacity: .9; border-style: solid; border-color: color-mix(in srgb, var(--a2) 60%, transparent); }
        .au-tip { position: absolute; right: calc(100% + 10px); top: 50%; transform: translate(8px, -50%); padding: 5px 10px; border-radius: 10px; background: var(--dock-bg); border: 1px solid var(--dock-border); font-size: .72rem; font-weight: 700; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .2s, transform .2s; }
        .au-fab:hover .au-tip, .au-fab:focus-visible .au-tip { opacity: 1; transform: translate(0, -50%); }
        @keyframes au-sway { 0%, 100% { transform: rotate(-8deg) scale(1); } 50% { transform: rotate(8deg) scale(1.1); } }
        .au-panel { position: fixed; right: 62px; top: clamp(70px, 12vh, 130px); width: min(340px, calc(100vw - 80px)); max-height: min(78vh, 640px); overflow: auto; padding: 14px; border-radius: var(--radius); display: grid; gap: 14px; transform-origin: right center; overscroll-behavior: contain; z-index: 1600; }
        @media (max-width: 560px) { .au-fab { top: calc(40% + 62px); width: 40px; height: 52px; } .au-fab:hover { width: 40px; } .au-tip { display: none; }
          .au-panel { right: 12px; left: 12px; width: auto; top: 78px; max-height: calc(100dvh - 190px); } }
        html[data-anim='off'] .au-ico { animation: none; }
        .au-head { display: flex; justify-content: space-between; align-items: center; }
        .au-head h3 { display: flex; align-items: center; gap: 8px; font-size: .95rem; }
        .au-x { background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 8px; }
        .au-x:hover { color: var(--text); }
        .au-sec { display: grid; gap: 10px; }
        .au-title { font-size: .68rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); font-family: var(--font-mono); }
        /* saklar & slider: gaya yang sama dengan Theme Studio */
        .au-panel .switch-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 10px 14px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; color: var(--text); text-align: left; cursor: pointer; font: inherit; transition: border-color .2s; }
        .au-panel .switch-row:hover { border-color: var(--a2); }
        .au-panel .switch-text { display: flex; flex-direction: column; font-size: .84rem; min-width: 0; }
        .au-panel .switch-text small { color: var(--muted); font-size: .7rem; }
        .au-panel .switch-knob { flex-shrink: 0; width: 40px; height: 22px; border-radius: 20px; background: var(--surface-3); position: relative; transition: background .2s; }
        .au-panel .switch-knob.on { background: var(--a2); }
        .au-panel .circle { width: 16px; height: 16px; border-radius: 50%; background: #fff; position: absolute; top: 3px; left: 3px; transition: transform .2s; }
        .au-panel .switch-knob.on .circle { transform: translateX(18px); }
        .au-panel .cfg { display: flex; flex-direction: column; gap: 8px; }
        .au-panel .cfg-row { display: flex; justify-content: space-between; align-items: center; }
        .au-panel .cfg-label { display: inline-flex; align-items: center; gap: 6px; font-size: .74rem; color: var(--muted); font-family: var(--font-mono); letter-spacing: .05em; }
        .au-panel .cfg-value { color: var(--a2); font-family: var(--font-mono); font-size: .78rem; }
        .au-vol-row { display: flex; align-items: center; gap: 10px; }
        .au-step { width: 36px; height: 36px; flex-shrink: 0; display: grid; place-items: center; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text); cursor: pointer; touch-action: none; user-select: none; transition: border-color .2s, color .2s, transform .15s; }
        .au-step:hover:not(:disabled) { border-color: var(--a2); color: var(--a2); }
        .au-step:active:not(:disabled) { transform: scale(.9); }
        .au-step:disabled { opacity: .4; cursor: not-allowed; }
        .au-range { -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 6px; border-radius: 99px; outline: none; cursor: pointer; margin: 0;
          background: linear-gradient(90deg, var(--a2) var(--p, 50%), var(--surface-3) var(--p, 50%)); }
        .au-range::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #fff; border: 3px solid var(--a2); box-shadow: 0 2px 8px rgba(0,0,0,.5), 0 0 0 4px color-mix(in srgb, var(--a2) 18%, transparent); cursor: grab; transition: transform .15s; }
        .au-range::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 3px solid var(--a2); box-shadow: 0 2px 8px rgba(0,0,0,.5); cursor: grab; }
        .au-range:active::-webkit-slider-thumb { transform: scale(1.15); cursor: grabbing; }
        .au-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 5px color-mix(in srgb, var(--a2) 40%, transparent); }
        .au-url { display: flex; gap: 8px; }
        .au-input { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; color: var(--muted); }
        .au-input .input { flex: 1; min-width: 0; font-size: .78rem; height: 38px; }
        .au-url .btn { height: 38px; padding: 0 14px; }
        .au-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
        .au-err { font-size: .72rem; color: #f87171; }
        .au-status { display: flex; align-items: center; gap: 8px; font-size: .74rem; color: var(--muted); padding: 8px 10px; border-radius: 10px; background: color-mix(in srgb, var(--surface) 60%, transparent); border: 1px solid var(--border); min-width: 0; }
        .au-status.error { color: #f87171; border-color: color-mix(in srgb, #f87171 40%, var(--border)); }
        .au-status.playing { color: var(--text); }
        .au-status-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .au-play { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; border: 1px solid var(--border); background: transparent; color: var(--text); cursor: pointer; flex-shrink: 0; }
        .au-play:hover { border-color: var(--a2); color: var(--a2); }
        .au-cues { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .au-cues li { display: flex; gap: 6px; align-items: stretch; }
        .au-cues li .switch-row { flex: 1; min-width: 0; }
        .au-test { width: 40px; flex-shrink: 0; border-radius: 12px; border: 1px solid var(--border); background: var(--surface-2); color: var(--muted); cursor: pointer; display: grid; place-items: center; }
        .au-test:hover { color: var(--a2); border-color: var(--a2); }
        .au-eq { display: inline-flex; align-items: flex-end; gap: 2px; height: 12px; }
        .au-eq.big { height: 16px; gap: 3px; }
        .au-eq i { width: 3px; background: var(--a2); border-radius: 2px; animation: au-bar 0.9s ease-in-out infinite; height: 100%; }
        .au-eq.big i { width: 3px; }
        .au-eq i:nth-child(2) { animation-delay: -.3s; }
        .au-eq i:nth-child(3) { animation-delay: -.6s; }
        @keyframes au-bar { 0%,100% { transform: scaleY(.25); } 50% { transform: scaleY(1); } }
        .au-eq i { transform-origin: bottom; }
        html[data-anim='off'] .au-eq i { animation: none; }
        @media (prefers-reduced-motion: reduce) { .au-eq i, .au-ico { animation: none; } }
      `}</style>
    </div>
  );
  return mounted ? createPortal(ui, document.body) : null;
}
