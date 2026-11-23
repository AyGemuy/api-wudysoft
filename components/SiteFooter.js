import Link from 'next/link';
import { motion } from 'framer-motion';
import { Icons } from './Icons';
import { FOOTER_COLUMNS } from '@/src/lib/siteMap';
import { PRESETS } from '@/src/lib/themes';
import { useTheme } from './ThemeContext';
import { sound } from '@/src/lib/interactiveEffects';

export default function SiteFooter() {
  const { config, openStudio } = useTheme();
  const themeName = PRESETS.find((p) => p.id === config.theme)?.name || 'Custom';
  const custom = Object.keys(config.custom || {}).length > 0;

  return (
    <motion.footer
      className="site-footer glass"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="footer-top">
        <div className="footer-brand">
          <div className="brand-row">
            <span className="brand-badge-f">
              <Icons.Zap size={16} />
            </span>
            <strong>WUDYSOFT</strong>
            <span className="online">
              <i /> online
            </span>
          </div>
          <p>Platform API, tools, dan komunikasi dalam satu dasbor yang bisa kamu atur sepenuhnya.</p>
          <button
            type="button"
            className="theme-chip"
            onClick={() => {
              sound.playClick();
              openStudio();
            }}
          >
            <Icons.Sliders size={13} />
            <span>
              Tema: {themeName}
              {custom ? ' + kustom' : ''}
            </span>
          </button>
        </div>

        <div className="footer-cols">
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer">
                        {l.label}
                        <Icons.ExternalLink size={11} />
                      </a>
                    ) : (
                      <Link href={l.href}>{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Wudysoft · Dibangun dengan Next.js</span>
        <button
          type="button"
          className="to-top"
          onClick={() => {
            sound.playClick();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          Kembali ke atas <Icons.ArrowRight size={12} style={{ transform: 'rotate(-90deg)' }} />
        </button>
      </div>

      <style jsx>{`
        :global(.site-footer) {
          margin-top: 48px;
          padding: calc(26px * var(--space)) calc(24px * var(--space)) 16px;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .footer-top {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 2fr);
          gap: 28px;
        }
        .footer-brand {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: flex-start;
        }
        .brand-row {
          display: flex;
          align-items: center;
          gap: 10px;
          letter-spacing: 0.18em;
        }
        .brand-badge-f {
          width: 32px;
          height: 32px;
          border-radius: var(--r-s);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--on-accent);
          background: linear-gradient(135deg, var(--a1), var(--a3));
          box-shadow: 0 0 14px var(--border-glow);
        }
        .online {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 0.66rem;
          letter-spacing: 0;
          color: var(--ok);
        }
        .online i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--ok);
          box-shadow: 0 0 8px var(--ok);
          animation: ping calc(1.8s / var(--speed)) ease-in-out infinite;
        }
        @keyframes ping {
          50% {
            opacity: 0.35;
            transform: scale(0.8);
          }
        }
        .footer-brand p {
          max-width: 36ch;
          font-size: 0.84rem;
        }
        .theme-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border-radius: var(--r-chip);
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--text);
          background: color-mix(in srgb, var(--text) 6%, transparent);
          border: 1px solid var(--border);
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .theme-chip:hover {
          border-color: var(--a2);
        }
        .footer-cols {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 20px;
        }
        h4 {
          font-size: 0.72rem;
          font-family: var(--font-mono);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 10px;
        }
        ul {
          list-style: none;
          display: grid;
          gap: 8px;
        }
        li :global(a) {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.84rem;
          color: var(--text);
          opacity: 0.85;
          transition: color 0.2s, opacity 0.2s, transform 0.2s;
        }
        li :global(a:hover) {
          color: var(--a2);
          opacity: 1;
          transform: translateX(3px);
        }
        .footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          padding-top: 14px;
          border-top: 1px solid var(--border);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--muted);
        }
        .to-top {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: var(--a2);
          font: inherit;
          cursor: pointer;
        }
        @media (max-width: 760px) {
          .footer-top {
            grid-template-columns: minmax(0, 1fr);
          }
          .footer-cols {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </motion.footer>
  );
}
