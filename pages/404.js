import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Seo from '@/components/Seo';
import {
  Radio, Satellite, Compass, ArrowLeft, Terminal, RefreshCw, Rocket, Ghost, Bug, Unplug, Orbit, Telescope,
  Radar, Zap, Home, Activity, MessageSquare, FileText, FileCode, Wifi, WifiOff, Sparkles, Search,
} from 'lucide-react';
import { sound } from '@/src/lib/interactiveEffects';

/** Bintang deterministik (LCG) → identik di server & klien, tanpa mismatch hydration. */
const STARS = (() => {
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 70 }, () => ({ x: r() * 100, y: r() * 100, s: 1 + r() * 2.2, d: 2 + r() * 4, t: -r() * 6 }));
})();

/** Ikon melayang di latar, tiap-tiap dengan gerak berbeda. */
const DRIFT = [
  { Icon: Rocket, x: '8%', y: '18%', size: 34, anim: 'nf-fly', dur: 9 },
  { Icon: Satellite, x: '84%', y: '14%', size: 30, anim: 'nf-float', dur: 6 },
  { Icon: Ghost, x: '10%', y: '70%', size: 32, anim: 'nf-wobble', dur: 5 },
  { Icon: Bug, x: '88%', y: '66%', size: 26, anim: 'nf-crawl', dur: 7 },
  { Icon: Compass, x: '22%', y: '40%', size: 28, anim: 'nf-spin', dur: 16 },
  { Icon: Unplug, x: '76%', y: '38%', size: 28, anim: 'nf-wobble', dur: 6.5 },
  { Icon: Telescope, x: '5%', y: '44%', size: 26, anim: 'nf-float', dur: 7.5 },
  { Icon: Radar, x: '92%', y: '42%', size: 28, anim: 'nf-spin', dur: 12 },
  { Icon: WifiOff, x: '30%', y: '84%', size: 24, anim: 'nf-blink', dur: 2.4 },
  { Icon: Orbit, x: '70%', y: '86%', size: 28, anim: 'nf-spin', dur: 20 },
  { Icon: Zap, x: '48%', y: '8%', size: 22, anim: 'nf-blink', dur: 1.8 },
  { Icon: Sparkles, x: '62%', y: '24%', size: 22, anim: 'nf-float', dur: 4.5 },
];

const LINKS = [
  { href: '/', label: 'Beranda', Icon: Home },
  { href: '/playground', label: 'Playground', Icon: Terminal },
  { href: '/docs?tab=stats', label: 'Live Stats', Icon: Activity },
  { href: '/rooms', label: 'Chat Rooms', Icon: MessageSquare },
  { href: '/tools/pastes', label: 'Pastes', Icon: FileText },
  { href: '/tools/code-share', label: 'Code Share', Icon: FileCode },
];

function useTyped(text, speed = 38) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    const id = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(id), v) : v + 1)), speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return text.slice(0, n);
}

/** Angka 0 berupa planet bercincin + satelit yang mengorbit. */
function Planet() {
  return (
    <span className="nf-planet" aria-hidden="true">
      <span className="nf-orbit"><Satellite size={18} /></span>
      <svg viewBox="0 0 120 120" width="100%" height="100%">
        <defs>
          <radialGradient id="nfP" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="var(--a2)" /><stop offset="55%" stopColor="var(--a1)" /><stop offset="100%" stopColor="var(--a3)" />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="60" rx="56" ry="14" fill="none" stroke="var(--a2)" strokeOpacity=".5" strokeWidth="3" transform="rotate(-22 60 60)" />
        <circle cx="60" cy="60" r="36" fill="url(#nfP)" />
        <circle cx="48" cy="50" r="7" fill="#fff" fillOpacity=".14" /><circle cx="72" cy="70" r="5" fill="#000" fillOpacity=".12" />
        <path d="M6 78 A56 14 -22 0 0 114 42" transform="rotate(0 60 60)" fill="none" stroke="var(--a2)" strokeOpacity=".85" strokeWidth="3" strokeLinecap="round" clipPath="none" />
      </svg>
    </span>
  );
}

export default function NotFound() {
  const router = useRouter();
  const [path, setPath] = useState('');
  const sceneRef = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 90, damping: 18 });
  const sy = useSpring(my, { stiffness: 90, damping: 18 });
  const rotX = useTransform(sy, [-1, 1], [7, -7]);
  const rotY = useTransform(sx, [-1, 1], [-9, 9]);
  const bgX = useTransform(sx, [-1, 1], [-14, 14]);
  const bgY = useTransform(sy, [-1, 1], [-10, 10]);

  useEffect(() => { sound.playWhenReady('notfound'); }, []);
  useEffect(() => { setPath(window.location.pathname + window.location.search); }, [router.asPath]);

  const typed = useTyped(path ? `$ GET ${path.length > 38 ? `${path.slice(0, 37)}…` : path}  →  404 Not Found` : '');

  const onMove = (e) => {
    const r = sceneRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };

  const stars = useMemo(() => STARS, []);

  return (
    <>
      <Seo title="404 — Halaman tidak ditemukan" label="404" description="Halaman yang Anda cari tidak ada atau sudah dipindahkan." noindex />
      <div className="nf" ref={sceneRef} onPointerMove={onMove} onPointerLeave={() => { mx.set(0); my.set(0); }}>
        {/* langit berbintang + bintang jatuh */}
        <motion.div className="nf-sky" style={{ x: bgX, y: bgY }} aria-hidden="true">
          {stars.map((s, i) => (
            <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDuration: `${s.d}s`, animationDelay: `${s.t}s` }} />
          ))}
          <b className="nf-shoot s1" /><b className="nf-shoot s2" /><b className="nf-shoot s3" />
        </motion.div>

        {/* ikon melayang */}
        <div className="nf-drift" aria-hidden="true">
          {DRIFT.map(({ Icon, x, y, size, anim, dur }, i) => (
            <span key={i} className={`nf-ico ${anim}`} style={{ left: x, top: y, animationDuration: `${dur}s`, animationDelay: `${-i * 0.7}s` }}>
              <Icon size={size} strokeWidth={1.6} />
            </span>
          ))}
        </div>

        <motion.section
          className="nf-card glass"
          style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 900 }}
          initial={{ opacity: 0, scale: 0.88, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 160 }}
        >
          <span className="nf-scan" aria-hidden="true" />

          <motion.div className="nf-badge badge err" animate={{ opacity: [0.65, 1, 0.65] }} transition={{ repeat: Infinity, duration: 1.6 }}>
            <Radio size={13} /> SIGNAL LOST // SECTOR DISCONNECTED
          </motion.div>

          <h1 className="nf-num" aria-label="404">
            <motion.span className="nf-d" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }} data-t="4">4</motion.span>
            <motion.span animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut', delay: 0.3 }}><Planet /></motion.span>
            <motion.span className="nf-d" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut', delay: 0.6 }} data-t="4">4</motion.span>
          </h1>

          <p className="nf-title">Koordinat tidak ditemukan</p>
          <p className="nf-sub">Node yang kamu tuju tidak ada di cluster jaringan ini. Mungkin tautannya salah, atau halamannya sudah dipindahkan.</p>

          <div className="nf-term" aria-live="polite"><span className="nf-dots"><i /><i /><i /></span><code>{typed}<em className="nf-caret" /></code></div>

          <div className="nf-cta">
            <Link href="/" onClick={() => sound.playClick()} className="nf-btn nf-primary"><ArrowLeft size={16} /> Kembali ke beranda</Link>
            <button className="nf-btn" onClick={() => { sound.playClick(); router.reload(); }}><RefreshCw size={15} className="nf-spinhover" /> Coba lagi</button>
          </div>

          <div className="nf-quick">
            <span className="nf-quick-cap"><Search size={12} /> Mungkin kamu mencari</span>
            <div className="nf-grid">
              {LINKS.map(({ href, label, Icon }, i) => (
                <motion.div key={href} initial={{ opacity: 0, y: 14, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.5 + i * 0.07, type: 'spring', stiffness: 260, damping: 20 }}>
                  <Link href={href} className="nf-chip" onClick={() => sound.playClick()}><Icon size={17} /><span>{label}</span></Link>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      </div>

      <style jsx global>{`
        .nf { position: relative; min-height: calc(100dvh - 210px); display: grid; place-items: center; padding: 18px 0 36px; overflow-x: clip; perspective: 900px; }
        .nf-sky { position: absolute; inset: -30px; pointer-events: none; }
        .nf-sky i { position: absolute; border-radius: 50%; background: #fff; opacity: .2; animation: nf-twinkle 3s ease-in-out infinite; box-shadow: 0 0 6px 1px color-mix(in srgb, var(--a2) 55%, transparent); }
        .nf-shoot { position: absolute; width: 120px; height: 2px; border-radius: 2px; background: linear-gradient(90deg, transparent, #fff); opacity: 0; transform: rotate(-35deg); animation: nf-shoot 6s linear infinite; }
        .nf-shoot.s1 { top: 12%; left: 70%; animation-delay: 1s; } .nf-shoot.s2 { top: 30%; left: 95%; animation-delay: 3.4s; animation-duration: 7s; } .nf-shoot.s3 { top: 6%; left: 40%; animation-delay: 5.2s; }
        .nf-drift { position: absolute; inset: 0; pointer-events: none; }
        .nf-ico { position: absolute; color: color-mix(in srgb, var(--a2) 70%, var(--muted)); opacity: .5; filter: drop-shadow(0 0 10px color-mix(in srgb, var(--a2) 45%, transparent)); animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
        .nf-float { animation-name: nf-float; } .nf-spin { animation-name: nf-spinr; animation-timing-function: linear; } .nf-wobble { animation-name: nf-wobble; }
        .nf-fly { animation-name: nf-fly; } .nf-crawl { animation-name: nf-crawl; } .nf-blink { animation-name: nf-blink; }

        .nf-card { position: relative; width: min(560px, 100%); padding: clamp(22px, 5vw, 38px) clamp(16px, 4vw, 32px); border-radius: calc(var(--radius) + 6px); text-align: center; overflow: hidden; z-index: 2; display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; justify-items: center; transform-style: preserve-3d; box-shadow: 0 40px 90px -30px rgba(0,0,0,.7), 0 0 60px -20px color-mix(in srgb, var(--a1) 60%, transparent); }
        .nf-scan { position: absolute; left: 0; right: 0; top: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--a2), transparent); opacity: .75; animation: nf-scan 3.6s linear infinite; pointer-events: none; }
        .nf-badge { display: inline-flex; align-items: center; gap: 6px; font-size: .68rem; letter-spacing: .04em; }
        .nf-num { display: flex; align-items: center; justify-content: center; gap: clamp(2px, 1.5vw, 10px); margin: 4px 0 0; line-height: 1; font-size: clamp(5.5rem, 24vw, 9.5rem); font-weight: 800; letter-spacing: -.04em; }
        .nf-d { position: relative; display: inline-block; background: linear-gradient(180deg, #fff 30%, color-mix(in srgb, var(--a2) 55%, transparent)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 8px 24px color-mix(in srgb, var(--a1) 60%, transparent)); }
        .nf-d::before, .nf-d::after { content: attr(data-t); position: absolute; inset: 0; -webkit-text-fill-color: currentColor; background: none; opacity: 0; }
        .nf-d::before { color: #ff3b6b; animation: nf-glitch1 3.2s steps(1) infinite; } .nf-d::after { color: #22d3ee; animation: nf-glitch2 3.2s steps(1) infinite; }
        .nf-planet { position: relative; display: inline-block; width: .82em; height: .82em; vertical-align: middle; filter: drop-shadow(0 10px 26px color-mix(in srgb, var(--a1) 70%, transparent)); }
        .nf-planet svg { overflow: visible; animation: nf-tilt 6s ease-in-out infinite; }
        .nf-orbit { position: absolute; inset: -22%; border-radius: 50%; animation: nf-spinr 5s linear infinite; color: var(--a2); }
        .nf-orbit svg { position: absolute; top: -6px; left: 50%; margin-left: -9px; width: 18px; height: 18px; animation: none; transform: rotate(45deg); }
        .nf-title { font-size: clamp(1.05rem, 3.4vw, 1.3rem); font-weight: 800; margin-top: 2px; }
        .nf-sub { font-size: .84rem; color: var(--muted); max-width: 400px; }
        .nf-term { width: 100%; max-width: 440px; display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: var(--r-m); background: rgba(0,0,0,.35); border: 1px solid var(--border); text-align: left; min-height: 40px; }
        .nf-term code { font-family: var(--font-mono); font-size: .74rem; color: var(--a2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
        .nf-dots { display: inline-flex; gap: 4px; flex-shrink: 0; } .nf-dots i { width: 8px; height: 8px; border-radius: 50%; background: var(--err); } .nf-dots i:nth-child(2) { background: var(--warn); } .nf-dots i:nth-child(3) { background: var(--ok); }
        .nf-caret { display: inline-block; width: 7px; height: 13px; margin-left: 2px; vertical-align: -2px; background: var(--a2); animation: nf-caret 1s steps(1) infinite; }
        .nf-cta { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; width: 100%; }
        .nf-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 20px; border-radius: var(--r-l); font: inherit; font-weight: 700; font-size: .86rem; cursor: pointer; text-decoration: none; color: var(--text); background: color-mix(in srgb, #fff 7%, transparent); border: 1px solid var(--border); transition: transform .25s cubic-bezier(.34,1.56,.64,1), border-color .2s, box-shadow .2s; }
        .nf-btn:hover { transform: translateY(-3px); border-color: var(--a2); }
        .nf-primary { background: linear-gradient(135deg, var(--a1), var(--a3)); color: var(--on-accent); border: none; box-shadow: 0 14px 30px -10px var(--a1); }
        .nf-primary:hover svg { animation: nf-nudge .6s ease infinite; }
        .nf-btn:hover .nf-spinhover { animation: nf-spinr .8s linear infinite; }
        .nf-quick { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; width: 100%; margin-top: 4px; }
        .nf-quick-cap { display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: .64rem; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); font-family: var(--font-mono); }
        .nf-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .nf-chip { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 6px; border-radius: var(--r-m); text-decoration: none; color: var(--muted); font-size: .72rem; font-weight: 600; background: color-mix(in srgb, #fff 5%, transparent); border: 1px solid var(--border); transition: transform .3s cubic-bezier(.34,1.56,.64,1), color .2s, border-color .2s, background .2s; }
        .nf-chip svg { transition: transform .35s cubic-bezier(.34,1.56,.64,1); }
        .nf-chip:hover { color: var(--a2); border-color: var(--a2); background: color-mix(in srgb, var(--a2) 10%, transparent); transform: translateY(-4px); }
        .nf-chip:hover svg { transform: scale(1.25) rotate(-8deg); }

        @keyframes nf-twinkle { 0%, 100% { opacity: .1; transform: scale(.8); } 50% { opacity: .95; transform: scale(1.3); } }
        @keyframes nf-shoot { 0% { opacity: 0; translate: 0 0; } 4% { opacity: 1; } 14% { opacity: 0; translate: -260px 180px; } 100% { opacity: 0; translate: -260px 180px; } }
        @keyframes nf-float { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-18px) rotate(6deg); } }
        @keyframes nf-spinr { to { transform: rotate(360deg); } }
        @keyframes nf-wobble { 0%, 100% { transform: translate(0, 0) rotate(-8deg); } 25% { transform: translate(8px, -10px) rotate(8deg); } 50% { transform: translate(0, -16px) rotate(-4deg); } 75% { transform: translate(-8px, -6px) rotate(10deg); } }
        @keyframes nf-fly { 0% { transform: translate(-10px, 14px) rotate(35deg); } 50% { transform: translate(34px, -26px) rotate(35deg); } 100% { transform: translate(-10px, 14px) rotate(35deg); } }
        @keyframes nf-crawl { 0%, 100% { transform: translateX(0) rotate(0); } 50% { transform: translateX(-22px) rotate(-12deg); } }
        @keyframes nf-blink { 0%, 45%, 55%, 100% { opacity: .55; } 50% { opacity: .08; } }
        @keyframes nf-scan { 0% { transform: translateY(0); } 100% { transform: translateY(520px); } }
        @keyframes nf-caret { 50% { opacity: 0; } }
        @keyframes nf-nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-4px); } }
        @keyframes nf-tilt { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
        @keyframes nf-glitch1 { 0%, 92%, 100% { opacity: 0; transform: none; } 93% { opacity: .85; transform: translate(-4px, 1px); clip-path: inset(10% 0 55% 0); } 96% { opacity: .85; transform: translate(3px, -1px); clip-path: inset(60% 0 8% 0); } }
        @keyframes nf-glitch2 { 0%, 91%, 100% { opacity: 0; transform: none; } 94% { opacity: .85; transform: translate(4px, -1px); clip-path: inset(45% 0 20% 0); } 97% { opacity: .85; transform: translate(-3px, 2px); clip-path: inset(5% 0 70% 0); } }

        @media (max-width: 560px) { .nf-grid { grid-template-columns: repeat(3, 1fr); } .nf-ico:nth-child(n+9) { display: none; } .nf-btn { flex: 1 1 100%; } }
        html[data-anim='off'] .nf *, html[data-anim='off'] .nf { animation: none !important; }
        @media (prefers-reduced-motion: reduce) { .nf *, .nf-d::before, .nf-d::after { animation: none !important; } }
      `}</style>
    </>
  );
}
