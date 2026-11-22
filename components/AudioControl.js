import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Music, Pause, Play, X, Volume2, VolumeX, Bell, Link2, Minus, Plus } from 'lucide-react';
import { audioStore, bgm, CUES, parseYouTube } from '@/src/lib/audio';
import { sound, PACKS, EVENTS } from '@/src/lib/interactiveEffects';
import { useTheme } from '@/components/ThemeContext';
import { toast } from '@/src/lib/toast';

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
  const [tab, setTab] = useState('bgm');
  const [url, setUrl] = useState('');
  const setUrlErr = (m) => { if (m) toast.warn(m); };
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
    const f = () => setOpen(true);
    window.addEventListener('wudysoft:open-audio', f);
    return () => window.removeEventListener('wudysoft:open-audio', f);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
          <div className="au-backdrop" onClick={() => setOpen(false)}>
          <motion.section
            className="au-panel"
            role="dialog"
            aria-label="Pengaturan audio"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="au-head">
              <div className="au-head-t"><Music size={18} color="var(--a2)" /><h3>Audio</h3></div>
              <div className="au-head-r">
                <span className={`au-badge ${playing ? 'on' : ''}`}>{playing ? 'Memutar' : 'Siap'}</span>
                <button className="au-x" onClick={() => setOpen(false)} aria-label="Tutup"><X size={20} /></button>
              </div>
            </header>
            <div className="au-tabs" role="tablist">
              {[['bgm', 'Musik'], ['sfx', 'Efek'], ['cues', 'Suara']].map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} className={`au-tab ${tab === id ? 'active' : ''}`} onClick={() => { sound.playClick(); setTab(id); }}>
                  {label}
                  {tab === id && <span className="au-tab-line" />}
                </button>
              ))}
            </div>
            <div className="au-body">

            {tab === 'bgm' && <div className="au-sec">
              <div className="au-title">Musik latar (BGM)</div>
              <Switch id="au-bgm" on={a.bgmOn} label="BGM" hint={a.bgmUrl ? 'Putar musik latar' : 'Tempel link dulu'} onChange={(v) => { if (!a.bgmUrl) return setUrlErr('Tempel link YouTube di bawah dulu.'); sound.playClick(); bgm.setOn(v); }} />
              <form className="au-url" onSubmit={apply}>
                <label htmlFor="au-link" className="au-sr">Link YouTube</label>
                <div className="au-input"><Link2 size={14} /><input id="au-link" className="input" placeholder="Link YouTube (video / playlist)" value={url} onChange={(e) => { setUrl(e.target.value); setUrlErr(''); }} inputMode="url" autoComplete="off" spellCheck={false} /></div>
                <button className="btn primary" type="submit">Setel</button>
              </form>
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
            </div>}

            {tab === 'sfx' && <div className="au-sec">
              <div className="au-title">Efek suara</div>
              <Switch on={sfxOn} label="Efek suara" hint="Klik, login, logout, 404" onChange={(v) => { setConfig({ ...config, soundEnabled: v }); if (v) { sound.enabled = true; sound.playBeep(); } }} />
              <Volume label="Volume efek" icon={<Volume2 size={13} />} value={a.sfxVol} onChange={(v) => audioStore.set({ sfxVol: v })} onCommit={() => sound.fx('tab')} />
              <div className="au-title" style={{ marginTop: 14 }}>Paket suara</div>
              <div className="au-packs" role="radiogroup" aria-label="Paket suara">
                {PACKS.map((p) => (
                  <button key={p.id} type="button" role="radio" aria-checked={(a.pack || 'pop') === p.id} data-sound="off" className={`au-pack ${(a.pack || 'pop') === p.id ? 'on' : ''}`}
                    onClick={() => { audioStore.set({ pack: p.id }); sound.enabled = true; setTimeout(() => sound.fx('done'), 20); }}>
                    <b>{p.label}</b><span>{p.hint}</span>
                  </button>
                ))}
              </div>
              <div className="au-title" style={{ marginTop: 14 }}>Suara interaksi</div>
              <ul className="au-cues">
                {EVENTS.map((ev) => (
                  <li key={ev.id}>
                    <Switch on={(a.events?.[ev.id] ?? ev.def) !== false} label={ev.label} hint={ev.hint} onChange={(v) => audioStore.set({ events: { ...(a.events || {}), [ev.id]: v } })} />
                  </li>
                ))}
              </ul>
            </div>}

            {tab === 'cues' && <div className="au-sec">
              <div className="au-title">Suara per kejadian</div>
              <ul className="au-cues">
                {CUES.map((c) => (
                  <li key={c.id}>
                    <Switch on={a.cues[c.id] !== false} label={c.label} hint={c.hint} onChange={(v) => audioStore.set({ cues: { ...a.cues, [c.id]: v } })} />
                    <button className="au-test" onClick={() => { const was = sound.enabled; sound.enabled = true; const on = audioStore.get().cues[c.id]; audioStore.set({ cues: { ...audioStore.get().cues, [c.id]: true } }); sound.play(c.id); audioStore.set({ cues: { ...audioStore.get().cues, [c.id]: on } }); sound.enabled = was; }} aria-label={`Tes suara ${c.label}`} title="Tes"><Bell size={13} /></button>
                  </li>
                ))}
              </ul>
            </div>}
            </div>
          </motion.section>
          </div>
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
        .au-root { position: static; }
        /* tab di tepi kanan tepat di bawah tombol Tema (gaya sama) */
        .au-fab { position: fixed; z-index: 1500; right: 0; top: calc(46% + 70px); width: 46px; height: 58px; padding: 0 0 0 4px; display: grid; place-items: center; cursor: pointer; color: var(--text);
          border-radius: min(var(--r-modal, 16px), 22px) 0 0 min(var(--r-modal, 16px), 22px); border: 1px solid var(--dock-border); border-right: none;
          background: linear-gradient(135deg, color-mix(in srgb, var(--surface) 78%, transparent), color-mix(in srgb, var(--a3) 22%, transparent));
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          box-shadow: -8px 10px 28px -10px rgba(0,0,0,.65), inset 1px 1px 0 color-mix(in srgb, #fff 20%, transparent);
          transition: width .3s cubic-bezier(.34,1.56,.64,1), opacity .3s, transform .3s; }
        .au-fab:hover { width: 56px; color: var(--a2); }
        [data-overlay] .au-fab { opacity: 0; transform: translateX(100%); pointer-events: none; animation: none; }
        .au-ico { display: grid; place-items: center; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--a2) 60%, transparent)); animation: au-sway 3.4s ease-in-out infinite; }
        .au-fab.live .au-ico { animation: none; }
        .au-fab:hover .au-ico { animation: au-sway 0.9s ease-in-out infinite; }
        .au-ring { position: absolute; inset: 6px 4px 6px 8px; border-radius: max(min(var(--r-modal, 16px), 22px) - 6px, 2px) 0 0 max(min(var(--r-modal, 16px), 22px) - 6px, 2px); border: 1px dashed color-mix(in srgb, var(--a3) 45%, transparent); border-right: none; opacity: .5; pointer-events: none; }
        .au-fab.live .au-ring { opacity: .9; border-style: solid; border-color: color-mix(in srgb, var(--a2) 60%, transparent); }
        .au-tip { position: absolute; right: calc(100% + 10px); top: 50%; transform: translate(8px, -50%); padding: 5px 10px; border-radius: var(--r-chip, 10px); background: var(--dock-bg); border: 1px solid var(--dock-border); font-size: .72rem; font-weight: 700; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .2s, transform .2s; }
        .au-fab:hover .au-tip, .au-fab:focus-visible .au-tip { opacity: 1; transform: translate(0, -50%); }
        @keyframes au-sway { 0%, 100% { transform: rotate(-8deg) scale(1); } 50% { transform: rotate(8deg) scale(1.1); } }
        .au-backdrop { position: fixed; inset: 0; z-index: 99999; display: flex; justify-content: flex-end; background: color-mix(in srgb, var(--shadow-c) 60%, transparent); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        .au-panel { width: 100%; max-width: 380px; height: 100%; height: 100dvh; display: flex; flex-direction: column; background: var(--surface); color: var(--text); border-left: 1px solid var(--border); box-shadow: -10px 0 30px color-mix(in srgb, var(--shadow-c) 55%, transparent); }
        .au-body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 16px 16px calc(24px + env(safe-area-inset-bottom, 0px)); display: grid; gap: 18px; align-content: start; }
        @media (max-width: 560px) { .au-fab { top: calc(40% + 62px); width: 40px; height: 52px; } .au-fab:hover { width: 40px; } .au-tip { display: none; } }
        html[data-anim='off'] .au-ico { animation: none; }
        .au-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: calc(14px + env(safe-area-inset-top, 0px)) 16px 12px; border-bottom: 1px solid var(--border); background: var(--surface-2); }
        .au-head-t, .au-head-r { display: flex; align-items: center; gap: 8px; }
        .au-head h3 { font-size: 1rem; }
        .au-badge { font-family: var(--font-mono); font-size: .66rem; padding: 3px 9px; border-radius: var(--r-l); border: 1px solid var(--border); color: var(--muted); }
        .au-badge.on { color: var(--a2); border-color: var(--a2); }
        .au-x { background: none; border: none; color: var(--muted); cursor: pointer; display: flex; }
        .au-x:hover { color: var(--text); }
        .au-tabs { display: flex; overflow-x: auto; gap: 2px; padding: 0 10px; border-bottom: 1px solid var(--border); scrollbar-width: none; }
        .au-tab { position: relative; flex: 1 0 auto; padding: 12px; background: none; border: none; color: var(--muted); font-family: var(--font-mono); font-size: .74rem; cursor: pointer; white-space: nowrap; }
        .au-tab.active { color: var(--a2); }
        .au-tab-line { animation: au-line .25s ease-out; position: absolute; left: 8px; right: 8px; bottom: 0; height: 2px; border-radius: 2px; background: var(--a2); box-shadow: 0 0 8px var(--a2); }
        @keyframes au-line { from { transform: scaleX(.2); opacity: 0; } to { transform: none; opacity: 1; } }
        .au-sec { display: grid; gap: 10px; }
        .au-title { font-size: .68rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); font-family: var(--font-mono); }
        /* saklar & slider: gaya yang sama dengan Theme Studio */
        .au-panel .switch-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 10px 14px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-m); color: var(--text); text-align: left; cursor: pointer; font: inherit; transition: border-color .2s; }
        .au-panel .switch-row:hover { border-color: var(--a2); }
        .au-panel .switch-text { display: flex; flex-direction: column; font-size: .84rem; min-width: 0; }
        .au-panel .switch-text small { color: var(--muted); font-size: .7rem; }
        .au-panel .switch-knob { flex-shrink: 0; width: 40px; height: 22px; border-radius: var(--r-l); background: var(--surface-3); position: relative; transition: background .2s; }
        .au-panel .switch-knob.on { background: var(--a2); }
        .au-panel .circle { width: 16px; height: 16px; border-radius: 50%; background: #fff; position: absolute; top: 3px; left: 3px; transition: transform .2s; }
        .au-panel .switch-knob.on .circle { transform: translateX(18px); }
        .au-panel .cfg { display: flex; flex-direction: column; gap: 8px; }
        .au-panel .cfg-row { display: flex; justify-content: space-between; align-items: center; }
        .au-panel .cfg-label { display: inline-flex; align-items: center; gap: 6px; font-size: .74rem; color: var(--muted); font-family: var(--font-mono); letter-spacing: .05em; }
        .au-panel .cfg-value { color: var(--a2); font-family: var(--font-mono); font-size: .78rem; }
        .au-vol-row { display: flex; align-items: center; gap: 10px; }
        .au-step { width: 36px; height: 36px; flex-shrink: 0; display: grid; place-items: center; border-radius: var(--r-m); background: var(--surface-2); border: 1px solid var(--border); color: var(--text); cursor: pointer; touch-action: none; user-select: none; transition: border-color .2s, color .2s, transform .15s; }
        .au-step:hover:not(:disabled) { border-color: var(--a2); color: var(--a2); }
        .au-step:active:not(:disabled) { transform: scale(.9); }
        .au-step:disabled { opacity: .4; cursor: not-allowed; }
        .au-range { -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 6px; border-radius: var(--r-l); outline: none; cursor: pointer; margin: 0;
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
        .au-err { font-size: .72rem; color: var(--err); }
        .au-status { display: flex; align-items: center; gap: 8px; font-size: .74rem; color: var(--muted); padding: 8px 10px; border-radius: var(--r-s); background: color-mix(in srgb, var(--surface) 60%, transparent); border: 1px solid var(--border); min-width: 0; }
        .au-status.error { color: var(--err); border-color: color-mix(in srgb, var(--err) 40%, var(--border)); }
        .au-status.playing { color: var(--text); }
        .au-status-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .au-play { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; border: 1px solid var(--border); background: transparent; color: var(--text); cursor: pointer; flex-shrink: 0; }
        .au-play:hover { border-color: var(--a2); color: var(--a2); }
        .au-cues { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .au-cues li { display: flex; gap: 6px; align-items: stretch; }
        .au-cues li .switch-row { flex: 1; min-width: 0; }
        .au-test { width: 40px; flex-shrink: 0; border-radius: var(--r-m); border: 1px solid var(--border); background: var(--surface-2); color: var(--muted); cursor: pointer; display: grid; place-items: center; }
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
        .au-packs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .au-pack { display: flex; flex-direction: column; gap: 2px; text-align: left; padding: 9px 11px; border-radius: min(var(--r-btn, 10px), 14px); border: 1px solid var(--border); background: color-mix(in srgb, var(--surface) 70%, transparent); color: var(--text); cursor: pointer; transition: border-color .2s, background .2s, translate .2s; }
        .au-pack b { font-size: 12.5px; }
        .au-pack span { font-size: 10.5px; color: var(--muted); line-height: 1.3; }
        .au-pack:hover { translate: 0 -2px; border-color: color-mix(in srgb, var(--a2) 50%, var(--border)); }
        .au-pack.on { border-color: var(--a2); background: color-mix(in srgb, var(--a1) 16%, var(--surface)); }
      `}
      </style>
    </div>
  );
  return mounted ? createPortal(ui, document.body) : null;
}
