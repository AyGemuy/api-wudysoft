import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Lightbulb, SkipForward, Eye, RotateCcw, Send, Flame, Trophy, Loader2 } from 'lucide-react';
import Card from '@/components/Card';
import { PageHead, kit as s } from '@/components/PageKit';
import { http } from '@/src/lib/http';
import { toast } from '@/src/lib/toast';
import { sound } from '@/src/lib/interactiveEffects';

const BEST_KEY = 'wudysoft_tebakgambar_best';
const norm = (t) => String(t || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

/** Topeng jawaban: huruf tersingkap sesuai jumlah petunjuk, spasi dipertahankan. */
function mask(answer, hints) {
  const idx = [];
  [...answer].forEach((c, i) => { if (/[a-z0-9]/i.test(c)) idx.push(i); });
  const reveal = new Set(idx.filter((_, n) => n % 3 === 0).slice(0, hints));
  const extra = idx.filter((i) => !reveal.has(i));
  for (let n = 0; reveal.size < Math.min(idx.length - 1, hints * 2) && n < extra.length; n++) reveal.add(extra[n * 2 % extra.length]);
  return [...answer].map((c, i) => (c === ' ' ? '  ' : /[a-z0-9]/i.test(c) ? (reveal.has(i) ? c.toUpperCase() : '_') : c)).join(' ');
}

export default function TebakGambarPage() {
  const [round, setRound] = useState(null); // { img, jawaban, deskripsi }
  const [loading, setLoading] = useState(false);
  const [guess, setGuess] = useState('');
  const [hints, setHints] = useState(0);
  const [state, setState] = useState('play'); // play | correct | revealed
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [imgOk, setImgOk] = useState(true);
  const [shake, setShake] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { try { setBest(Number(localStorage.getItem(BEST_KEY)) || 0); } catch {} }, []);

  const next = useCallback(async () => {
    setLoading(true);
    setGuess(''); setHints(0); setState('play'); setImgOk(true);
    try {
      const d = await http('GET', '/api/game/tebak-gambar');
      if (!d.img || !d.jawaban) throw new Error('Soal tidak lengkap');
      setRound(d);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (e) { toast.err(`Gagal memuat soal: ${e.message}`); } finally { setLoading(false); }
  }, []);
  useEffect(() => { next(); }, [next]);

  const submit = (e) => {
    e.preventDefault();
    if (!round || state !== 'play' || !guess.trim()) return;
    if (norm(guess) === norm(round.jawaban)) {
      const gain = Math.max(10, 100 - hints * 25);
      const ns = streak + 1;
      setScore((v) => v + gain + (ns > 1 ? (ns - 1) * 5 : 0)); setStreak(ns); setState('correct');
      sound.playBeep?.();
      toast.ok(`Benar! +${gain} poin${ns > 1 ? ` · streak ${ns}🔥` : ''}`);
      if (ns > best) { setBest(ns); try { localStorage.setItem(BEST_KEY, String(ns)); } catch {} }
    } else {
      setShake((n) => n + 1); setStreak(0);
      toast.err('Belum tepat, coba lagi!', { duration: 1800 });
    }
  };
  const hint = () => { if (state !== 'play' || !round) return; if (hints >= 3) return toast.info('Petunjuk sudah habis.'); setHints((h) => h + 1); sound.playClick(); };
  const reveal = () => { if (state !== 'play') return; setState('revealed'); setStreak(0); };

  return (
    <>
      <div className={s.page}>
        <PageHead Icon={ImageIcon} badge="GAME" title="Tebak Gambar" desc="Lihat gambar teka-teki, lalu tebak kata atau ungkapan yang dimaksud. Petunjuk mengurangi poin." />
        <Card Icon={ImageIcon} title="Tebak Gambar" subtitle="Papan permainan" bodyClassName={s.game} footer={<span>Tebak sebelum waktu habis</span>}>
          <div className="tg-stats">
            <span><Trophy size={14} /> Skor <b>{score}</b></span>
            <span><Flame size={14} /> Streak <b>{streak}</b></span>
            <span className={s.muted}>Terbaik: {best}</span>
          </div>

          <div className="tg-frame">
            {loading || !round ? <Loader2 className="spin" size={30} /> : imgOk ? (
              <AnimatePresence mode="wait"><motion.img key={round.img} src={round.img} alt="Gambar teka-teki" referrerPolicy="no-referrer" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} onError={() => setImgOk(false)} /></AnimatePresence>
            ) : (
              <div className="tg-bad"><p>Gambar tidak dapat dimuat.</p><button type="button" className="btn" onClick={next}><SkipForward size={14} /> Soal lain</button></div>
            )}
          </div>

          {round && (
            <div className="tg-mask" aria-label="Petunjuk huruf">
              {state === 'play' ? mask(round.jawaban, hints) : <b style={{ color: state === 'correct' ? 'var(--ok)' : 'var(--a2)' }}>{round.jawaban.toUpperCase()}</b>}
            </div>
          )}

          {state === 'play' ? (
            <motion.form onSubmit={submit} className="tg-form" key={shake} animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.35 }}>
              <input ref={inputRef} className="input" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Ketik tebakanmu…" aria-label="Tebakan" autoComplete="off" disabled={loading || !round} maxLength={60} />
              <button type="submit" className="btn primary" disabled={loading || !guess.trim()}><Send size={14} /> Tebak</button>
            </motion.form>
          ) : (
            round?.deskripsi && <p className="tg-desc">{round.deskripsi}</p>
          )}

          <div className={s.row}>
            {state === 'play' ? (
              <>
                <button type="button" className="btn" onClick={hint} disabled={loading || hints >= 3}><Lightbulb size={14} /> Petunjuk ({3 - hints})</button>
                <button type="button" className="btn" onClick={reveal} disabled={loading}><Eye size={14} /> Menyerah</button>
                <button type="button" className="btn" onClick={() => { setStreak(0); next(); }} disabled={loading}><SkipForward size={14} /> Lewati</button>
              </>
            ) : (
              <button type="button" className="btn primary" onClick={next} disabled={loading}><SkipForward size={14} /> Soal berikutnya</button>
            )}
            <button type="button" className="btn" onClick={() => { setScore(0); setStreak(0); toast.info('Skor direset.'); }}><RotateCcw size={14} /> Reset skor</button>
          </div>
        </Card>
      </div>

      <style jsx global>{`
        .tg-stats { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; font-size: .84rem; }
        .tg-stats span { display: inline-flex; align-items: center; gap: 6px; }
        .tg-stats b { font-family: var(--font-mono); color: var(--a2); }
        .tg-frame { width: min(480px, 100%); min-height: 220px; display: grid; place-items: center; border-radius: var(--r-m); border: 1px solid var(--border); background: color-mix(in srgb, var(--text) 5%, transparent); overflow: hidden; }
        .tg-frame img { width: 100%; height: auto; max-height: 420px; object-fit: contain; display: block; }
        .tg-bad { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; justify-items: center; padding: 20px; color: var(--muted); }
        .tg-mask { font-family: var(--font-mono); font-size: clamp(1rem, 4vw, 1.5rem); letter-spacing: .12em; text-align: center; overflow-wrap: anywhere; min-height: 1.6em; }
        .tg-form { display: flex; gap: 8px; width: min(480px, 100%); }
        .tg-form .input { flex: 1; min-width: 0; }
        .tg-desc { margin: 0; max-width: 480px; text-align: center; color: var(--muted); font-size: .86rem; }
        .spin { animation: tg-spin .9s linear infinite; }
        @keyframes tg-spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
