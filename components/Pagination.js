import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/** Daftar nomor halaman dengan elipsis: 1 … 4 5 [6] 7 8 … 20 */
function windowed(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out = [1];
  const lo = Math.max(2, page - 1);
  const hi = Math.min(pages - 1, page + 1);
  if (lo > 2) out.push('…l');
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < pages - 1) out.push('…r');
  out.push(pages);
  return out;
}

/**
 * Pagination bersama (Pastes & Code Share). Responsif: di layar sempit hanya menampilkan
 * tombol awal/sebelumnya/"hal x / y"/berikutnya/akhir; di layar lebar ditambah nomor halaman.
 */
export default function Pagination({ page, pages, total, limit, loading, onPage, onLimit, label = 'item', sizes = [6, 12, 24, 48] }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  const go = (n) => n >= 1 && n <= pages && n !== page && onPage(n);

  return (
    <nav className="pgn" aria-label="Navigasi halaman">
      <div className="pgn-info">
        Menampilkan <b>{from}–{to}</b> dari <b>{total}</b> {label}
      </div>

      {pages > 1 && (
        <div className="pgn-ctrl">
          <button className="pgn-b" onClick={() => go(1)} disabled={page <= 1 || loading} aria-label="Halaman pertama"><ChevronsLeft size={15} /></button>
          <button className="pgn-b" onClick={() => go(page - 1)} disabled={page <= 1 || loading} aria-label="Sebelumnya"><ChevronLeft size={15} /></button>
          <span className="pgn-cur" aria-live="polite">Hal. {page} / {pages}</span>
          <span className="pgn-nums">
            {windowed(page, pages).map((n) =>
              typeof n === 'number' ? (
                <button key={n} className={`pgn-b pgn-n ${n === page ? 'on' : ''}`} onClick={() => go(n)} disabled={loading} aria-current={n === page ? 'page' : undefined} aria-label={`Halaman ${n}`}>{n}</button>
              ) : (
                <span key={n} className="pgn-gap" aria-hidden="true">…</span>
              )
            )}
          </span>
          <button className="pgn-b" onClick={() => go(page + 1)} disabled={page >= pages || loading} aria-label="Berikutnya"><ChevronRight size={15} /></button>
          <button className="pgn-b" onClick={() => go(pages)} disabled={page >= pages || loading} aria-label="Halaman terakhir"><ChevronsRight size={15} /></button>
        </div>
      )}

      {onLimit && (
        <label className="pgn-size">
          <span>Per halaman</span>
          <select className="input" value={limit} onChange={(e) => onLimit(Number(e.target.value))}>
            {sizes.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      )}

      <style jsx>{`
        .pgn { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 16px; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius); background: color-mix(in srgb, var(--surface) 60%, transparent); }
        .pgn-info { font-size: 0.76rem; color: var(--muted); }
        .pgn-info b { color: var(--text); }
        .pgn-ctrl { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: center; }
        .pgn-b { min-width: 34px; height: 34px; padding: 0 8px; display: inline-grid; place-items: center; border-radius: var(--r-s); border: 1px solid var(--border); background: transparent; color: var(--text); font: inherit; font-size: 0.8rem; cursor: pointer; transition: background 0.2s, border-color 0.2s, transform 0.15s; }
        .pgn-b:hover:not(:disabled) { border-color: var(--a2); background: color-mix(in srgb, var(--a2) 12%, transparent); transform: translateY(-1px); }
        .pgn-b:disabled { opacity: 0.4; cursor: not-allowed; }
        .pgn-n.on { background: linear-gradient(135deg, var(--a1), var(--a3)); color: var(--on-accent); border-color: transparent; font-weight: 700; cursor: default; }
        .pgn-gap { color: var(--muted); padding: 0 2px; }
        .pgn-nums { display: none; align-items: center; gap: 6px; }
        .pgn-cur { font-size: 0.78rem; font-family: var(--font-mono); padding: 0 6px; }
        .pgn-size { display: inline-flex; align-items: center; gap: 8px; font-size: 0.74rem; color: var(--muted); }
        .pgn-size :global(.input) { width: 72px; height: 34px; padding: 0 8px; }
        @media (min-width: 640px) { .pgn-nums { display: inline-flex; } .pgn-cur { display: none; } }
        @media (max-width: 639px) { .pgn { justify-content: center; text-align: center; } }
      `}</style>
    </nav>
  );
}
