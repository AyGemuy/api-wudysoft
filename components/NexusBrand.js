import Link from 'next/link';

const WORD = 'NEXUS'.split('');

/**
 * Brand di top header: ikon Nexus (SVG beranimasi) + judul "NEXUS" berfont Orbitron.
 * Animasi: cincin heksagon berputar, inti berdenyut, titik orbit, huruf "N" digambar ulang;
 * judul punya gradien mengalir, kedip huruf berurutan, dan garis pindai.
 * Otomatis diam bila tema memilih animasi "off" atau perangkat meminta reduced-motion.
 */
export default function NexusBrand({ onClick }) {
  return (
    <Link href="/" className="nx-brand" aria-label="NEXUS — Beranda" title="NEXUS — Beranda" onClick={onClick}>
      <span className="nx-icon" aria-hidden="true">
        <svg viewBox="0 0 48 48" width="100%" height="100%">
          <defs>
            <linearGradient id="nxG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--a2)" />
              <stop offset="55%" stopColor="var(--a3)" />
              <stop offset="100%" stopColor="var(--a1)" />
            </linearGradient>
            <radialGradient id="nxCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--a2)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g className="nx-orbit">
            <polygon className="nx-hex-outer" points="24,3 42,13.5 42,34.5 24,45 6,34.5 6,13.5" fill="none" stroke="url(#nxG)" strokeWidth="2" strokeLinejoin="round" />
            <circle className="nx-dot" cx="24" cy="3" r="2.6" fill="var(--a2)" />
          </g>
          <polygon className="nx-hex-inner" points="24,10 36,17 36,31 24,38 12,31 12,17" fill="color-mix(in srgb, var(--a3) 14%, transparent)" stroke="url(#nxG)" strokeWidth="1" strokeOpacity="0.55" />
          <circle className="nx-core" cx="24" cy="24" r="11" fill="url(#nxCore)" />
          <path className="nx-n" d="M17.5 31 V17 L30.5 31 V17" fill="none" stroke="url(#nxG)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <g className="nx-nodes" fill="#fff">
            <circle cx="17.5" cy="17" r="1.6" />
            <circle cx="30.5" cy="31" r="1.6" />
          </g>
        </svg>
      </span>

      <span className="nx-word" aria-hidden="true">
        {WORD.map((ch, i) => (
          <span key={i} className="nx-ch" style={{ '--i': i }}>{ch}</span>
        ))}
        <i className="nx-scan" />
      </span>

      <style jsx>{`
        :global(.nx-brand) {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          height: var(--hd-size, 40px);
          padding: 0 12px 0 4px;
          border-radius: var(--r-dock-btn, 16px);
          color: var(--text);
          text-decoration: none;
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.2s ease;
        }
        :global(.nx-brand:hover) { transform: translateY(-1px); }
        :global(.nx-brand:active) { transform: scale(0.97); }
        :global(.nx-brand:focus-visible) { outline: 2px solid var(--a2); outline-offset: 2px; }

        .nx-icon {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          display: block;
          filter: drop-shadow(0 0 8px color-mix(in srgb, var(--a2) 55%, transparent));
          animation: nxGlow 3.2s ease-in-out infinite;
        }
        .nx-icon svg { overflow: visible; display: block; }
        .nx-orbit { transform-origin: 24px 24px; animation: nxSpin 9s linear infinite; }
        .nx-hex-inner { transform-origin: 24px 24px; animation: nxSpin 16s linear infinite reverse; }
        .nx-core { transform-origin: 24px 24px; animation: nxPulse 2.4s ease-in-out infinite; }
        .nx-n {
          stroke-dasharray: 60;
          stroke-dashoffset: 0;
          animation: nxDraw 5s ease-in-out infinite;
        }
        .nx-nodes circle { animation: nxBlink 2.4s ease-in-out infinite; }
        .nx-nodes circle:nth-child(2) { animation-delay: 1.2s; }

        .nx-word {
          position: relative;
          display: inline-flex;
          align-items: baseline;
          font-family: 'Orbitron', var(--font), system-ui, sans-serif;
          font-weight: 900;
          font-size: 1.12rem;
          letter-spacing: 0.2em;
          margin-right: -0.2em; /* kompensasi letter-spacing huruf terakhir */
          line-height: 1;
          text-transform: uppercase;
          white-space: nowrap;
          padding-bottom: 5px;
        }
        .nx-ch {
          display: inline-block;
          background: linear-gradient(100deg, var(--text) 0%, var(--a2) 28%, var(--a3) 52%, var(--a2) 76%, var(--text) 100%);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation:
            nxFlow 5s linear infinite,
            nxIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both,
            nxFlicker 7s steps(1, end) infinite;
          animation-delay: calc(var(--i) * -0.35s), calc(var(--i) * 0.08s), calc(var(--i) * 0.45s);
          filter: drop-shadow(0 0 6px color-mix(in srgb, var(--a2) 40%, transparent));
        }
        .nx-scan {
          position: absolute;
          left: 0;
          right: 0.2em;
          bottom: 0;
          height: 2px;
          border-radius: 2px;
          background: linear-gradient(90deg, transparent, var(--a2), var(--a3), transparent);
          background-size: 60% 100%;
          background-repeat: no-repeat;
          animation: nxScan 2.8s ease-in-out infinite;
          opacity: 0.9;
        }

        @keyframes nxSpin { to { transform: rotate(360deg); } }
        @keyframes nxPulse { 0%, 100% { transform: scale(0.8); opacity: 0.7; } 50% { transform: scale(1.15); opacity: 1; } }
        @keyframes nxGlow {
          0%, 100% { filter: drop-shadow(0 0 5px color-mix(in srgb, var(--a2) 40%, transparent)); }
          50% { filter: drop-shadow(0 0 12px color-mix(in srgb, var(--a3) 75%, transparent)); }
        }
        @keyframes nxDraw {
          0% { stroke-dashoffset: 60; }
          35%, 80% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -60; }
        }
        @keyframes nxBlink { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
        @keyframes nxFlow { to { background-position: -300% 0; } }
        @keyframes nxIn { from { opacity: 0; transform: translateY(-8px) scale(0.8); } to { opacity: 1; transform: none; } }
        @keyframes nxFlicker {
          0%, 92%, 96%, 100% { opacity: 1; }
          93%, 95% { opacity: 0.25; }
          94% { opacity: 0.9; }
        }
        @keyframes nxScan {
          0% { background-position: -80% 0; }
          100% { background-position: 180% 0; }
        }

        /* HP kecil: perkecil sedikit agar muat bersama ikon lain */
        @media (max-width: 400px) {
          :global(.nx-brand) { gap: 7px; padding-right: 6px; }
          .nx-icon { width: 34px; height: 34px; }
          .nx-word { font-size: 0.98rem; letter-spacing: 0.16em; margin-right: -0.16em; }
        }
        @media (max-width: 340px) { .nx-word { display: none; } }

        /* animasi dimatikan lewat Theme Studio atau preferensi sistem */
        :global(html[data-anim='off']) .nx-icon,
        :global(html[data-anim='off']) .nx-orbit,
        :global(html[data-anim='off']) .nx-hex-inner,
        :global(html[data-anim='off']) .nx-core,
        :global(html[data-anim='off']) .nx-n,
        :global(html[data-anim='off']) .nx-nodes circle,
        :global(html[data-anim='off']) .nx-ch,
        :global(html[data-anim='off']) .nx-scan { animation: none !important; }
        :global(html[data-anim='off']) .nx-ch { background-position: 40% 0; }
        @media (prefers-reduced-motion: reduce) {
          .nx-icon, .nx-orbit, .nx-hex-inner, .nx-core, .nx-n, .nx-nodes circle, .nx-ch, .nx-scan { animation: none !important; }
          .nx-ch { background-position: 40% 0; }
        }
      `}</style>
    </Link>
  );
}
