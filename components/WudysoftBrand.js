import Link from 'next/link';

/**
 * Brand di top header: logo 4 kotak khas Microsoft (merah, hijau, biru, kuning) + wordmark "Wudysoft"
 * berfont Segoe UI. Kotak-kotak "menyala" bergantian saat hover; diam bila animasi dimatikan
 * lewat Theme Studio atau perangkat meminta reduced-motion.
 */
export default function WudysoftBrand({ onClick }) {
  return (
    <Link href="/" className="ws-brand" aria-label="Wudysoft — Beranda" title="Wudysoft — Beranda" onClick={onClick}>
      <span className="ws-logo" aria-hidden="true">
        <i className="ws-sq s1" />
        <i className="ws-sq s2" />
        <i className="ws-sq s3" />
        <i className="ws-sq s4" />
      </span>
      <span className="ws-word">Wudysoft</span>

      <style jsx>{`
        :global(.ws-brand) {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          height: var(--hd-size, 40px);
          padding: 0 12px 0 6px;
          border-radius: var(--r-dock-btn, 8px);
          color: var(--text);
          text-decoration: none;
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
          transition: background-color 0.15s ease;
        }
        :global(.ws-brand:hover) { background: color-mix(in srgb, var(--text) 6%, transparent); }
        :global(.ws-brand:active) { background: color-mix(in srgb, var(--text) 10%, transparent); }
        :global(.ws-brand:focus-visible) { outline: 2px solid var(--a2); outline-offset: 2px; }

        .ws-logo {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2px;
          width: 22px;
          height: 22px;
          flex-shrink: 0;
        }
        .ws-sq { display: block; transition: transform 0.2s ease, opacity 0.2s ease; }
        .s1 { background: #f25022; }
        .s2 { background: #7fba00; }
        .s3 { background: #00a4ef; }
        .s4 { background: #ffb900; }
        :global(.ws-brand:hover) .s1 { transform: translate(-1px, -1px); }
        :global(.ws-brand:hover) .s2 { transform: translate(1px, -1px); }
        :global(.ws-brand:hover) .s3 { transform: translate(-1px, 1px); }
        :global(.ws-brand:hover) .s4 { transform: translate(1px, 1px); }

        .ws-word {
          font-family: 'Segoe UI Variable Display', 'Segoe UI', var(--font), system-ui, sans-serif;
          font-weight: 600;
          font-size: 1.12rem;
          letter-spacing: -0.01em;
          line-height: 1;
          white-space: nowrap;
          color: var(--text);
        }

        @media (max-width: 340px) { .ws-word { display: none; } }

        :global(html[data-anim='off']) .ws-sq,
        :global(html[data-anim='off']) .ws-brand { transition: none !important; }
        @media (prefers-reduced-motion: reduce) {
          .ws-sq { transition: none !important; }
        }
      `}</style>
    </Link>
  );
}
