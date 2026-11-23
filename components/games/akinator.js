import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RotateCcw, Undo2, Play, PartyPopper, Frown, Loader2 } from 'lucide-react';
import { PageHead, kit as s } from '@/components/PageKit';
import { http } from '@/src/lib/http';
import { toast } from '@/src/lib/toast';
import { sound } from '@/src/lib/interactiveEffects';

const API = '/api/game/akinator/v4';
const KEY = 'wudysoft_aki_session';
const LANGS = [['id', 'Indonesia'], ['en', 'English'], ['jp', '日本語'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['pt', 'Português'], ['ru', 'Русский'], ['ar', 'العربية'], ['tr', 'Türkçe'], ['kr', '한국어'], ['cn', '中文']];
// Urutan jawaban sesuai API: 0 ya, 1 tidak, 2 tidak tahu, 3 mungkin, 4 mungkin tidak
const OPTS = [
  { v: '0', label: 'Ya', fb: 'Ya', tone: 'ok' },
  { v: '3', label: 'Mungkin', fb: 'Mungkin', tone: 'info' },
  { v: '2', label: 'Tidak tahu', fb: 'Tidak tahu', tone: 'mute' },
  { v: '4', label: 'Mungkin tidak', fb: 'Mungkin tidak', tone: 'warn' },
  { v: '1', label: 'Tidak', fb: 'Tidak', tone: 'err' },
];

export default function AkinatorPage() {
  const [game, setGame] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState('id');
  const [child, setChild] = useState(true);
  const [verdict, setVerdict] = useState(''); // '' | 'win' | 'lose'

  const call = useCallback((params) => http('GET', `${API}?${new URLSearchParams(params)}`), []);

  // pulihkan sesi terakhir (tersimpan 24 jam di server)
  useEffect(() => {
    let id = '';
    try { id = localStorage.getItem(KEY) || ''; } catch {}
    if (!id) return;
    call({ action: 'detail', id }).then((d) => setGame(d.data)).catch(() => { try { localStorage.removeItem(KEY); } catch {} });
  }, [call]);

  const run = async (fn) => {
    setBusy(true);
    try { return await fn(); } catch (e) { toast.err(e.message); return null; } finally { setBusy(false); }
  };

  const start = () => run(async () => {
    sound.playClick();
    setVerdict('');
    const d = await call({ action: 'start', lang, mode: String(child) });
    setGame(d.data);
    try { localStorage.setItem(KEY, d.data._id); } catch {}
  });

  const answer = (v) => run(async () => {
    sound.playClick();
    const d = await call({ action: 'step', id: game._id, answer: v });
    setGame(d.data);
  });

  const back = () => run(async () => {
    const d = await call({ action: 'back', id: game._id });
    setGame(d.data);
  });

  const finish = async (won) => {
    setVerdict(won ? 'win' : 'lose');
    sound[won ? 'playBeep' : 'playClick']?.();
    if (won) toast.ok('Yeay, tebakanku benar! 🎉');
    else toast.info('Yah, meleset. Coba lagi dengan karakter lain!');
    try { localStorage.removeItem(KEY); } catch {}
    try { await call({ action: 'delete', id: game._id }); } catch {}
  };
  const reset = () => { setGame(null); setVerdict(''); try { localStorage.removeItem(KEY); } catch {} };

  const pct = Math.min(100, Math.max(0, Number(game?.progress) || 0));
  const guessed = game?.akiWin ? game.guessed : null;
  const labels = game?.answers?.length === 5 ? game.answers : null;
  // urutan label dari API: [ya, tidak, tidak tahu, mungkin, mungkin tidak]
  const labelFor = (v, fb) => (labels && labels[Number(v)]) || fb;

  return (
    <>
      <div className={s.page}>
        <PageHead Icon={Sparkles} badge="GAME" title="Akinator" desc="Pikirkan seorang tokoh (nyata atau fiksi), jawab pertanyaanku, dan aku akan menebaknya." />
        <Card Icon={Sparkles} title="Akinator" subtitle="Papan permainan" bodyClassName={s.game} footer={<span>Sesi disimpan 24 jam</span>}>
          {!game ? (
            <div className="ak-start">
              <div className="ak-orb" aria-hidden="true"><Sparkles size={34} /></div>
              <div className="ak-opts">
                <label>Bahasa
                  <select className="input" value={lang} onChange={(e) => setLang(e.target.value)}>{LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
                </label>
                <label className="ak-check"><input type="checkbox" checked={child} onChange={(e) => setChild(e.target.checked)} /> Mode ramah anak</label>
              </div>
              <button type="button" className="btn primary" onClick={start} disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : <Play size={14} />} Mulai bermain</button>
              <span className={s.muted}>Bahasa pertanyaan mengikuti pilihanmu. Sesi disimpan 24 jam.</span>
            </div>
          ) : guessed && !verdict ? (
            <motion.div className="ak-guess" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
              <span className={s.muted}>Aku menebak…</span>
              {guessed.photo && <img src={guessed.photo} alt={guessed.name} referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
              <h2>{guessed.name}</h2>
              {guessed.description && <p>{guessed.description}</p>}
              <div className={s.row}>
                <button type="button" className="btn primary" onClick={() => finish(true)}><PartyPopper size={14} /> Benar!</button>
                <button type="button" className="btn" onClick={() => finish(false)}><Frown size={14} /> Bukan</button>
              </div>
            </motion.div>
          ) : verdict ? (
            <motion.div className="ak-guess" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="ak-orb" aria-hidden="true">{verdict === 'win' ? <PartyPopper size={34} /> : <Frown size={34} />}</div>
              <h2>{verdict === 'win' ? 'Aku menang!' : 'Kamu menang!'}</h2>
              <p>{verdict === 'win' ? `Tebakanku benar: ${guessed?.name || ''}.` : 'Karaktermu berhasil mengelabuiku.'}</p>
              <button type="button" className="btn primary" onClick={() => { reset(); }}><RotateCcw size={14} /> Main lagi</button>
            </motion.div>
          ) : (
            <div className="ak-q">
              <div className="ak-prog" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Keyakinan Akinator"><i style={{ width: `${pct}%` }} /></div>
              <span className={s.muted}>Pertanyaan {game.currentStep + 1} · keyakinan {Math.round(pct)}%</span>
              <AnimatePresence mode="wait">
                <motion.h2 key={game.question} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>{game.question}</motion.h2>
              </AnimatePresence>
              <div className="ak-answers">
                {OPTS.map((o) => (
                  <button key={o.v} type="button" className={`ak-a ${o.tone}`} onClick={() => answer(o.v)} disabled={busy}>{labelFor(o.v, o.fb)}</button>
                ))}
              </div>
              <div className={s.row}>
                <button type="button" className="btn" onClick={back} disabled={busy || game.currentStep < 1}><Undo2 size={14} /> Kembali</button>
                <button type="button" className="btn" onClick={reset} disabled={busy}><RotateCcw size={14} /> Mulai ulang</button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <style jsx global>{`
        .ak-start, .ak-guess, .ak-q { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; justify-items: center; text-align: center; width: min(560px, 100%); }
        .ak-orb { width: 84px; height: 84px; display: grid; place-items: center; border-radius: 50%; color: var(--on-accent); background: radial-gradient(circle at 30% 30%, var(--a2), var(--a1) 60%, var(--a3)); box-shadow: 0 0 40px -6px var(--a2); animation: ak-float 3.4s ease-in-out infinite; }
        @keyframes ak-float { 50% { transform: translateY(-6px); } }
        .ak-opts { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; align-items: end; }
        .ak-opts label { display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; font-size: .78rem; color: var(--muted); text-align: left; }
        .ak-check { display: inline-flex !important; grid-auto-flow: column; align-items: center; gap: 8px !important; color: var(--text) !important; }
        .ak-prog { width: 100%; height: 8px; border-radius: 999px; background: color-mix(in srgb, var(--text) 10%, transparent); overflow: hidden; }
        .ak-prog i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--a1), var(--a2), var(--a3)); transition: width .5s ease; }
        .ak-q h2 { font-size: clamp(1.1rem, 3.4vw, 1.5rem); line-height: 1.35; margin: 4px 0 6px; min-height: 3.2em; display: grid; place-items: center; }
        .ak-answers { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; width: 100%; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
        .ak-a { padding: 11px 14px; border-radius: var(--r-btn, 12px); border: 1px solid var(--border); background: color-mix(in srgb, var(--text) 5%, transparent); color: var(--text); font: inherit; font-weight: 700; cursor: pointer; transition: transform .15s, border-color .2s, background .2s; }
        .ak-a:hover:not(:disabled) { transform: translateY(-2px); }
        .ak-a:disabled { opacity: .55; cursor: wait; }
        .ak-a.ok:hover { border-color: var(--ok); background: color-mix(in srgb, var(--ok) 14%, transparent); }
        .ak-a.err:hover { border-color: var(--err); background: color-mix(in srgb, var(--err) 14%, transparent); }
        .ak-a.warn:hover { border-color: var(--warn); background: color-mix(in srgb, var(--warn) 14%, transparent); }
        .ak-a.info:hover, .ak-a.mute:hover { border-color: var(--a2); background: color-mix(in srgb, var(--a2) 12%, transparent); }
        .ak-guess img { width: min(220px, 60%); aspect-ratio: 3/4; object-fit: cover; border-radius: var(--r-m); border: 1px solid var(--border); box-shadow: 0 16px 40px -18px var(--a2); }
        .ak-guess h2 { margin: 0; }
        .ak-guess p { margin: 0; color: var(--muted); font-size: .88rem; }
        .spin { animation: ak-spin .9s linear infinite; }
        @keyframes ak-spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
