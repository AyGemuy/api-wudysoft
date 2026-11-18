import Link from 'next/link';
import site from '@/configs/siteConfig';

const WORD = 'Wudysoft'.split('');

/**
 * Brand di top header: ikon Wudysoft (SVG beranimasi, bahasa visual Fluent) + judul "Wudysoft".
 * Ikon: kotak bersudut halus dengan sapuan cahaya berputar, monogram "W" yang digambar ulang,
 * dan titik aksen berdenyut. Judul: Segoe UI Semibold dengan gradien mengalir + garis pindai.
 * Otomatis diam bila tema memilih animasi "off" atau perangkat meminta reduced-motion.
 */
export default function WudysoftBrand({ onClick }) {
  return (
    <Link href="/" className="wd-brand" aria-label={`${site.APP_NAME} — Beranda`} title={`${site.APP_NAME} — Beranda`} onClick={onClick}>
      <span className="wd-icon" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="100%" height="100%">
          <defs>
            <linearGradient id="wdG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--a2)" />
              <stop offset="55%" stopColor="var(--a1)" />
              <stop offset="100%" stopColor="var(--a3)" />
            </linearGradient>
            <linearGradient id="wdSheen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fff" stopOpacity="0" />
              <stop offset="50%" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <clipPath id="wdClip"><rect x="5" y="5" width="38" height="38" rx="9" /></clipPath>
          </defs>
          <rect className="wd-tile" x="5" y="5" width="38" height="38" rx="9" fill="url(#wdG)" />
          <g clipPath="url(#wdClip)">
            <rect className="wd-sheen" x="-30" y="0" width="24" height="48" fill="url(#wdSheen)" transform="skewX(-20)" />
          </g>
          <rect className="wd-ring" x="3" y="3" width="42" height="42" rx="11" fill="none" stroke="url(#wdG)" strokeWidth="1.5" strokeLinecap="round" pathLength="100" strokeDasharray="26 74" />
          <path className="wd-w" d="M13.5 17 L18.5 32 L24 21 L29.5 32 L34.5 17" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle className="wd-dot" cx="38" cy="10" r="2.4" fill="#fff" />
        </svg>
      </span>

      <span className="wd-word" aria-hidden="true">
        {WORD.map((ch, i) => (
          <span key={i} className="wd-ch" style={{ '--i': i }}>{ch}</span>
        ))}
        <i className="wd-scan" />
      </span>

      <style jsx>{`
        :global(.wd-brand) {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          height: var(--hd-size, 40px);
          padding: 0 12px 0 4px;
          border-radius: var(--r-dock-btn, 8px);
          color: var(--text);
          text-decoration: none;
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.2s ease;
        }
        :global(.wd-brand:hover) { transform: translateY(-1px); }
        :global(.wd-brand:active) { transform: scale(0.97); }
        :global(.wd-brand:focus-visible) { outline: 2px solid var(--a2); outline-offset: 2px; }

        .wd-icon {
          width: 36px; height: 36px; flex-shrink: 0; display: block;
          filter: drop-shadow(0 2px 8px color-mix(in srgb, var(--a1) 55%, transparent));
          animation: wdGlow 3.4s ease-in-out infinite;
        }
        .wd-icon svg { overflow: visible; display: block; }
        .wd-ring { animation: wdTrace 3.6s linear infinite; }
        .wd-sheen { animation: wdSheen 4.2s ease-in-out infinite; }
        .wd-w { stroke-dasharray: 64; animation: wdDraw 5s ease-in-out infinite; }
        .wd-dot { transform-origin: 38px 10px; animation: wdPulse 2.2s ease-in-out infinite; }

        .wd-word {
          position: relative;
          display: inline-flex;
          align-items: baseline;
          font-family: 'Segoe UI Variable Display', 'Segoe UI', 'Selawik', 'Open Sans', system-ui, sans-serif;
          font-weight: 700;
          font-size: 1.28rem;
          letter-spacing: -0.01em;
          line-height: 1;
          white-space: nowrap;
          padding-bottom: 5px;
        }
        .wd-ch {
          display: inline-block;
          background: linear-gradient(100deg, var(--text) 0%, var(--a2) 30%, var(--a1) 50%, var(--a3) 70%, var(--text) 100%);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: wdFlow 6s linear infinite, wdIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
          animation-delay: calc(var(--i) * -0.3s), calc(var(--i) * 0.06s);
        }
        .wd-scan {
          position: absolute; left: 0; right: 0; bottom: 0; height: 2px; border-radius: 2px;
          background: linear-gradient(90deg, transparent, var(--a2), var(--a1), transparent);
          background-size: 55% 100%; background-repeat: no-repeat;
          animation: wdScan 2.8s ease-in-out infinite;
        }

        /* garis menyusuri tepi kotak (bukan memutar kotak), sehingga selalu mengikuti pinggiran ikon */
        @keyframes wdTrace { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -100; } }
        @keyframes wdSheen { 0%, 55% { transform: translateX(0) skewX(-20deg); } 100% { transform: translateX(120px) skewX(-20deg); } }
        @keyframes wdGlow {
          0%, 100% { filter: drop-shadow(0 2px 6px color-mix(in srgb, var(--a1) 40%, transparent)); }
          50% { filter: drop-shadow(0 2px 14px color-mix(in srgb, var(--a2) 75%, transparent)); }
        }
        @keyframes wdDraw { 0% { stroke-dashoffset: 64; } 35%, 80% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -64; } }
        @keyframes wdPulse { 0%, 100% { transform: scale(0.7); opacity: 0.6; } 50% { transform: scale(1.2); opacity: 1; } }
        @keyframes wdFlow { to { background-position: -300% 0; } }
        @keyframes wdIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
        @keyframes wdScan { 0% { background-position: -80% 0; } 100% { background-position: 180% 0; } }

        @media (max-width: 400px) {
          :global(.wd-brand) { gap: 7px; padding-right: 6px; }
          .wd-icon { width: 32px; height: 32px; }
          .wd-word { font-size: 1.1rem; }
        }
        @media (max-width: 340px) { .wd-word { display: none; } }

        :global(html[data-anim='off']) .wd-icon,
        :global(html[data-anim='off']) .wd-ring,
        :global(html[data-anim='off']) .wd-sheen,
        :global(html[data-anim='off']) .wd-w,
        :global(html[data-anim='off']) .wd-dot,
        :global(html[data-anim='off']) .wd-ch,
        :global(html[data-anim='off']) .wd-scan { animation: none !important; }
        :global(html[data-anim='off']) .wd-ch { background-position: 40% 0; }
        @media (prefers-reduced-motion: reduce) {
          .wd-icon, .wd-ring, .wd-sheen, .wd-w, .wd-dot, .wd-ch, .wd-scan { animation: none !important; }
          .wd-ch { background-position: 40% 0; }
        }
      `}</style>
    </Link>
  );
}
