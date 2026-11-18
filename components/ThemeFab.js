import { Settings } from 'lucide-react';
import { sound } from '@/src/lib/interactiveEffects';

/**
 * Tombol Tema yang menempel di tepi kanan layar: tab setengah lingkaran melayang pelan,
 * ikon roda gigi berputar (lebih cepat saat disorot). Membuka Theme Studio.
 */
export default function ThemeFab({ onClick, hidden }) {
  return (
    <button
      type="button"
      className={`tf-fab ${hidden ? 'hide' : ''}`}
      onClick={() => { sound.playClick(); onClick(); }}
      aria-label="Buka Theme Studio"
      title="Pengaturan tema"
      tabIndex={hidden ? -1 : 0}
    >
      <span className="tf-ring" aria-hidden="true" />
      <Settings className="tf-gear" size={22} strokeWidth={2} />
      <span className="tf-tip" aria-hidden="true">Tema</span>
      <style jsx global>{`
        .tf-fab { position: fixed; z-index: 1500; right: 0; top: 46%; width: 46px; height: 58px; padding: 0 0 0 4px; display: grid; place-items: center; cursor: pointer; color: var(--text);
          border-radius: 30px 0 0 30px; border: 1px solid var(--dock-border); border-right: none;
          background: linear-gradient(135deg, color-mix(in srgb, var(--surface) 78%, transparent), color-mix(in srgb, var(--a1) 22%, transparent));
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          box-shadow: -8px 10px 28px -10px rgba(0,0,0,.65), inset 1px 1px 0 color-mix(in srgb, #fff 20%, transparent);
          transition: width .3s cubic-bezier(.34,1.56,.64,1), opacity .3s, transform .3s; }
        .tf-fab:hover { width: 56px; color: var(--a2); }
        .tf-fab.hide { opacity: 0; transform: translateX(100%); pointer-events: none; animation: none; }
        .tf-gear { animation: tf-spin 7s linear infinite; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--a2) 60%, transparent)); }
        .tf-fab:hover .tf-gear, .tf-fab:focus-visible .tf-gear { animation-duration: 1.6s; }
        .tf-fab:active .tf-gear { animation-duration: .6s; }
        .tf-ring { position: absolute; inset: 6px 4px 6px 8px; border-radius: 24px 0 0 24px; border: 1px dashed color-mix(in srgb, var(--a2) 45%, transparent); border-right: none; opacity: .6; pointer-events: none; }
        .tf-tip { position: absolute; right: calc(100% + 10px); top: 50%; transform: translate(8px, -50%); padding: 5px 10px; border-radius: 10px; background: var(--dock-bg); border: 1px solid var(--dock-border); font-size: .72rem; font-weight: 700; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .2s, transform .2s; }
        .tf-fab:hover .tf-tip, .tf-fab:focus-visible .tf-tip { opacity: 1; transform: translate(0, -50%); }
        @keyframes tf-spin { to { transform: rotate(360deg); } }
        html[data-anim='off'] .tf-gear { animation: none; }
        @media (prefers-reduced-motion: reduce) { .tf-gear { animation: none; } }
        @media (max-width: 480px) { .tf-fab { width: 40px; height: 52px; top: 40%; } .tf-fab:hover { width: 40px; } .tf-tip { display: none; } }
      `}</style>
    </button>
  );
}
