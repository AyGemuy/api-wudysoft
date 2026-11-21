import { Fingerprint, UserPlus, Ghost, BadgeCheck, User, Mail, Lock, KeyRound, ShieldCheck, Sparkles, Cloud, Globe } from 'lucide-react';

const MODES = {
  signin: { Icon: Fingerprint, tone: 'a' },
  signup: { Icon: UserPlus, tone: 'b' },
  guest: { Icon: Ghost, tone: 'c' },
  active: { Icon: BadgeCheck, tone: 'a' },
};

/** Kubus kaca melayang (dekorasi) — mengikuti gaya "glassy login". */
const CUBES = [
  { Icon: Lock, cls: 'c1' },
  { Icon: Mail, cls: 'c2' },
  { Icon: User, cls: 'c3' },
  { Icon: KeyRound, cls: 'c4' },
  { Icon: ShieldCheck, cls: 'c5' },
  { Icon: Sparkles, cls: 'c6' },
  { Icon: Cloud, cls: 'c7' },
  { Icon: Globe, cls: 'c8' },
];

/** Pembungkus kartu: menempatkan kubus kaca melayang di sekitar kartu. */
export function AuthScene({ children }) {
  return (
    <div className="as-outer">
      <div className="as-scene">
        {CUBES.map(({ Icon, cls }) => (
          <span key={cls} className={`as-cube ${cls}`} aria-hidden="true"><Icon size={22} /></span>
        ))}
        {children}
      </div>
      <style jsx global>{`
        .as-outer { width: 100%; overflow-x: clip; padding: 24px 0; display: flex; justify-content: center; }
        .as-scene { position: relative; width: 100%; max-width: 420px; }
        .as-scene > :not(.as-cube) { position: relative; z-index: 2; }
        .as-cube { position: absolute; z-index: 1; display: grid; place-items: center; width: 54px; height: 54px; border-radius: var(--r-l); color: color-mix(in srgb, var(--a2) 85%, #fff);
          background: linear-gradient(145deg, color-mix(in srgb, #fff 22%, transparent), color-mix(in srgb, var(--a1) 16%, transparent));
          border: 1px solid color-mix(in srgb, #fff 26%, transparent); backdrop-filter: blur(6px);
          box-shadow: 0 18px 40px -14px color-mix(in srgb, var(--a1) 70%, transparent), inset 0 1px 0 color-mix(in srgb, #fff 40%, transparent);
          animation: as-float 7s ease-in-out infinite; pointer-events: none; }
        .as-cube.c1 { top: -14px; right: -34px; width: 70px; height: 70px; border-radius: var(--r-l); animation-delay: -1s; transform: rotate(12deg); }
        .as-cube.c2 { bottom: 70px; right: -46px; width: 60px; height: 60px; animation-delay: -3s; }
        .as-cube.c3 { top: 60px; left: -50px; width: 64px; height: 64px; animation-delay: -2s; }
        .as-cube.c4 { bottom: -10px; left: -30px; animation-delay: -4s; }
        .as-cube.c5 { top: 40%; left: -86px; width: 40px; height: 40px; border-radius: var(--r-m); animation-delay: -5s; opacity: .8; }
        .as-cube.c6 { top: 30%; right: -84px; width: 38px; height: 38px; border-radius: var(--r-m); animation-delay: -2.5s; opacity: .8; }
        .as-cube.c7 { bottom: -34px; right: 18%; width: 42px; height: 42px; border-radius: var(--r-m); animation-delay: -6s; opacity: .7; }
        .as-cube.c8 { top: -30px; left: 14%; width: 42px; height: 42px; border-radius: var(--r-m); animation-delay: -1.5s; opacity: .7; }
        @keyframes as-float { 0%, 100% { translate: 0 0; rotate: 0deg; } 33% { translate: 6px -14px; rotate: 6deg; } 66% { translate: -6px 8px; rotate: -5deg; } }
        @media (max-width: 760px) { .as-cube.c5, .as-cube.c6 { display: none; } .as-cube.c1 { right: -12px; width: 52px; height: 52px; } .as-cube.c2 { right: -14px; width: 46px; height: 46px; } .as-cube.c3 { left: -16px; width: 48px; height: 48px; } .as-cube.c4 { left: -8px; } .as-cube.c7 { right: 12%; } }
        html[data-anim='off'] .as-cube, html[data-anim='off'] .ah-ring, html[data-anim='off'] .ah-tile { animation: none !important; }
        @media (prefers-reduced-motion: reduce) { .as-cube, .ah-ring, .ah-tile, .ah-dot { animation: none !important; } }
      `}</style>
    </div>
  );
}

/** Ikon besar di atas form: ubin kaca 96px, cincin orbit, titik satelit. */
export default function AuthHero({ mode = 'signin', size = 104 }) {
  const { Icon } = MODES[mode] || MODES.signin;
  return (
    <div className="ah" style={{ '--ah': `${size}px` }} aria-hidden="true">
      <span className="ah-halo" />
      <span className="ah-ring r1"><i className="ah-dot" /></span>
      <span className="ah-ring r2"><i className="ah-dot" /></span>
      <span className="ah-tile"><Icon size={Math.round(size * 0.5)} strokeWidth={1.7} /></span>
      <style jsx global>{`
        .ah { position: relative; width: calc(var(--ah) * 1.7); height: calc(var(--ah) * 1.35); margin: 0 auto 4px; display: grid; place-items: center; }
        .ah-halo { position: absolute; width: calc(var(--ah) * 1.5); height: calc(var(--ah) * 1.5); border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--a1) 55%, transparent), transparent 68%); filter: blur(14px); opacity: .7; }
        .ah-tile { position: relative; width: var(--ah); height: var(--ah); border-radius: 32%; display: grid; place-items: center; color: var(--on-accent);
          background: linear-gradient(145deg, var(--a2), var(--a1) 55%, var(--a3));
          box-shadow: 0 24px 44px -14px var(--a1), 0 0 0 1px color-mix(in srgb, #fff 28%, transparent) inset, 0 2px 0 color-mix(in srgb, #fff 45%, transparent) inset;
          animation: ah-bob 4.8s ease-in-out infinite; }
        .ah-tile::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,.35) 50%, transparent 70%); background-size: 250% 100%; animation: ah-sheen 3.6s linear infinite; }
        .ah-tile svg { position: relative; z-index: 1; filter: drop-shadow(0 4px 10px rgba(0,0,0,.35)); }
        .ah-ring { position: absolute; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--a2) 45%, transparent); animation: ah-spin 14s linear infinite; }
        .ah-ring.r1 { width: calc(var(--ah) * 1.38); height: calc(var(--ah) * 1.38); }
        .ah-ring.r2 { width: calc(var(--ah) * 1.7); height: calc(var(--ah) * 1.7); border-style: dashed; border-color: color-mix(in srgb, var(--a3) 35%, transparent); animation-duration: 22s; animation-direction: reverse; }
        .ah-dot { position: absolute; top: -4px; left: 50%; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: var(--a2); box-shadow: 0 0 12px var(--a2); }
        .ah-ring.r2 .ah-dot { background: var(--a3); box-shadow: 0 0 12px var(--a3); top: auto; bottom: -4px; }
        @keyframes ah-bob { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-8px) rotate(2deg); } }
        @keyframes ah-spin { to { transform: rotate(360deg); } }
        @keyframes ah-sheen { from { background-position: 150% 0; } to { background-position: -100% 0; } }
        @media (max-width: 380px) { .ah { --ah: 88px !important; } }
      `}</style>
    </div>
  );
}
