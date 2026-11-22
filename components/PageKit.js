import { useCallback } from 'react';
import { toast } from '@/src/lib/toast';
import { Reveal, TextReveal } from '@/components/motion';
import s from '@/styles/pagekit.module.css';

export { s as kit };

/** Kepala halaman seragam: badge kecil, judul beranimasi, dan deskripsi. */
export function PageHead({ Icon, badge, title, desc }) {
  return (
    <header>
      <Reveal variant="down">
        <div className="badge ok" style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {Icon && <Icon size={14} color="var(--a2)" />} <span>{badge}</span>
        </div>
      </Reveal>
      <h1><TextReveal as="span" text={title} by="word" /></h1>
      {desc && <Reveal as="p" variant="blur" delay={0.15}>{desc}</Reveal>}
    </header>
  );
}

/**
 * Toast global bertema: `const [toast, flash] = useToast();` — tetap kompatibel (`{toast}` kini null),
 * pesan tampil lewat <ToastHost /> di _app.js. flash(pesan, 'ok' | 'err' | 'warn' | 'info').
 */
export function useToast() {
  const flash = useCallback((m, type = 'ok', opts) => toast(m, type, opts), []);
  return [null, flash];
}
