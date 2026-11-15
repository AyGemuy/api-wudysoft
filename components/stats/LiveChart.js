import { useMemo } from 'react';
import s from '@/styles/stats.module.css';

const BUCKETS = 60;

/** Grafik 60 detik terakhir: batang = request/detik (hijau sukses, merah error), garis = rata-rata latensi. */
export default function LiveChart({ events, now }) {
  const { bars, max, maxMs, line } = useMemo(() => {
    const start = now - BUCKETS * 1000;
    const b = Array.from({ length: BUCKETS }, () => ({ ok: 0, err: 0, ms: 0, n: 0 }));
    for (const e of events) {
      if (e.ts < start || e.ts > now) continue;
      const i = Math.min(BUCKETS - 1, Math.floor((e.ts - start) / 1000));
      b[i][e.status >= 400 ? 'err' : 'ok'] += 1;
      b[i].ms += e.ms; b[i].n += 1;
    }
    const maxCount = Math.max(4, ...b.map((x) => x.ok + x.err));
    const maxLatency = Math.max(50, ...b.map((x) => (x.n ? x.ms / x.n : 0)));
    const pts = b.map((x, i) => (x.n ? [i, x.ms / x.n] : null)).filter(Boolean);
    return { bars: b, max: maxCount, maxMs: maxLatency, line: pts };
  }, [events, now]);

  const W = 600, H = 150, bw = W / BUCKETS;
  const path = line.map(([i, ms], k) => `${k ? 'L' : 'M'}${(i * bw + bw / 2).toFixed(1)},${(H - 8 - (ms / maxMs) * (H - 24)).toFixed(1)}`).join(' ');

  return (
    <div className={s.chartWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={s.chart} role="img" aria-label="Request per detik, 60 detik terakhir">
        {[0.25, 0.5, 0.75].map((t) => <line key={t} x1="0" x2={W} y1={H * t} y2={H * t} className={s.grid} />)}
        {bars.map((x, i) => {
          const hOk = (x.ok / max) * (H - 16);
          const hErr = (x.err / max) * (H - 16);
          return (
            <g key={i}>
              <title>{`${x.ok + x.err} req${x.n ? ` · ${Math.round(x.ms / x.n)} ms` : ''}`}</title>
              <rect x={i * bw + 1} y={H - hOk} width={Math.max(1, bw - 2)} height={hOk} rx="2" className={s.barOk} />
              <rect x={i * bw + 1} y={H - hOk - hErr} width={Math.max(1, bw - 2)} height={hErr} rx="2" className={s.barErr} />
            </g>
          );
        })}
        {path && <path d={path} className={s.latLine} fill="none" />}
      </svg>
      <div className={s.chartAxis}>
        <span>-60s</span>
        <span className={s.legend}><i className={s.dotOk} /> sukses <i className={s.dotErr} /> error <i className={s.dotLat} /> latensi (maks {Math.round(maxMs)} ms)</span>
        <span>sekarang</span>
      </div>
    </div>
  );
}
