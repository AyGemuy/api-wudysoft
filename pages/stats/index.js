import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { AnimatePresence } from 'framer-motion';
import Seo from '@/components/Seo';
import { Icons } from '@/components/Icons';
import { sound } from '@/src/lib/interactiveEffects';
import { useLive } from '@/components/stats/useLive';
import LiveChart from '@/components/stats/LiveChart';
import LogTable from '@/components/stats/LogTable';
import LogDetail from '@/components/stats/LogDetail';
import { Portal, MethodBadge, cx } from '@/components/playground/ui';
import { formatBytes } from '@/src/lib/playgroundCore';
import s from '@/styles/stats.module.css';

const CONN = {
  socket: { label: 'Socket.IO · realtime', tone: 'ok' },
  poll: { label: 'Polling 2 detik', tone: 'warn', hint: 'Hosting ini tidak mendukung WebSocket (mis. Netlify).' },
  connecting: { label: 'Menyambung…', tone: 'info' },
  offline: { label: 'Terputus', tone: 'err' },
  unauthorized: { label: 'Perlu login', tone: 'warn' },
};

const fmtUptime = (sec = 0) => {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return d ? `${d}h ${h}j` : h ? `${h}j ${m}m` : `${m}m ${sec % 60}d`;
};

function Meter({ label, value, unit = '%', hint, tone }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={s.meter}>
      <div className={s.meterTop}><span>{label}</span><b>{value ?? '—'}{unit}</b></div>
      <div className={s.meterBar}><i style={{ width: `${v}%` }} className={cx(v > 85 ? s.mHot : v > 60 ? s.mWarm : '', tone)} /></div>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export default function StatsPage() {
  const { status: authStatus } = useSession();
  const live = useLive();
  const { status, events, counters, sys, paused, setPaused, clear, skew } = live;
  const [tick, setTick] = useState(() => Date.now());
  const now = tick + skew; // jam server (bukan jam perangkat) agar grafik & RPS akurat
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [purging, setPurging] = useState(false);

  // jam internal 1 detik untuk grafik & penanda baris baru
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // data sistem + riwayat database
  useEffect(() => {
    let alive = true;
    const load = () => fetch('/api/stats', { cache: 'no-store' }).then((r) => r.json()).then((d) => alive && d.ok && setStats(d)).catch(() => {});
    load();
    const id = setInterval(load, 10000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const k = useMemo(() => {
    const recent = events.filter((e) => now - e.ts <= 10000).length;
    const sorted = events.slice(0, 200).map((e) => e.ms).sort((a, b) => a - b);
    const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;
    const total = counters?.total ?? events.length;
    const errors = counters?.errors ?? events.filter((e) => e.status >= 400).length;
    return {
      rps: (recent / 10).toFixed(recent / 10 < 10 ? 1 : 0),
      total,
      errors,
      errRate: total ? ((errors / total) * 100).toFixed(1) : '0.0',
      avg: counters?.avgMs ?? (sorted.length ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0),
      p95,
    };
  }, [events, counters, now]);

  const top = useMemo(() => {
    const m = new Map();
    for (const e of events) {
      const key = `${e.method} ${e.path}`;
      const r = m.get(key) || { key, method: e.method, path: e.path, n: 0, ms: 0, err: 0 };
      r.n += 1; r.ms += e.ms; if (e.status >= 400) r.err += 1;
      m.set(key, r);
    }
    return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 6);
  }, [events]);

  const purge = async () => {
    if (!window.confirm('Hapus semua riwayat log (memori & database)?')) return;
    sound.playClick();
    setPurging(true);
    try {
      const r = await fetch('/api/stats', { method: 'DELETE' });
      if (r.ok) clear(); else window.alert((await r.json().catch(() => ({}))).error || 'Gagal menghapus log.');
    } finally { setPurging(false); }
  };

  const conn = CONN[status] || CONN.connecting;
  const sysSpecs = stats?.system;
  const db = stats?.metrics;
  const needLogin = status === 'unauthorized' || authStatus === 'unauthenticated';

  return (
    <>
      <Seo title="System & API Stats" />
      <div className={s.page}>
        <div className={s.head}>
          <div>
            <h1>System &amp; API Telemetry</h1>
            <p>Request dan respons API tercatat langsung saat terjadi.</p>
          </div>
          <div className={s.headActions}>
            <span className={cx(s.conn, s[`c_${conn.tone}`])} title={conn.hint}><i />{conn.label}</span>
            {!needLogin && (
              <>
                <button type="button" className={s.tool} onClick={() => { sound.playClick(); setPaused(!paused); }} aria-pressed={paused}>
                  {paused ? <Icons.Play size={14} /> : <Icons.Square size={14} />}<span>{paused ? 'Lanjut' : 'Jeda'}</span>
                </button>
                <button type="button" className={s.tool} onClick={() => { sound.playClick(); clear(); }}><Icons.Trash2 size={14} /><span>Bersihkan</span></button>
                <button type="button" className={cx(s.tool, s.toolDanger)} onClick={purge} disabled={purging}><Icons.Server size={14} /><span>Hapus DB</span></button>
              </>
            )}
          </div>
        </div>

        {needLogin ? (
          <div className={cx(s.card, s.loginCta)}>
            <Icons.Lock size={26} />
            <h3>Masuk untuk melihat log realtime</h3>
            <p>Isi request/respons API bisa memuat data sensitif, jadi stream log hanya untuk pengguna yang login.</p>
            <Link href="/auth?next=%2Fstats" className="btn primary">Masuk atau daftar</Link>
          </div>
        ) : (
          <>
            <div className={s.kpis}>
              <div className={s.kpi}><span className={s.kLabel}><Icons.Zap size={13} /> Request / detik</span><b className={s.kVal}>{k.rps}</b><small>rata-rata 10 detik terakhir</small></div>
              <div className={s.kpi}><span className={s.kLabel}><Icons.Activity size={13} /> Total request</span><b className={s.kVal}>{k.total.toLocaleString()}</b><small>{counters?.source === 'db' ? `database · ${counters.windowLabel}` : 'sejak instance menyala'}</small></div>
              <div className={s.kpi}><span className={s.kLabel}><Icons.AlertCircle size={13} /> Error</span><b className={cx(s.kVal, Number(k.errRate) > 5 && s.kBad)}>{k.errRate}%</b><small>{k.errors.toLocaleString()} permintaan 4xx/5xx</small></div>
              <div className={s.kpi}><span className={s.kLabel}><Icons.Clock size={13} /> Latensi</span><b className={s.kVal}>{k.avg}<em>ms</em></b><small>rata-rata · p95 {k.p95} ms</small></div>
            </div>

            <div className={s.card}>
              <div className={s.cardHead}><h3>Lalu lintas 60 detik terakhir</h3><span className={s.dim}>{paused ? 'dijeda' : 'live'}</span></div>
              <LiveChart events={events} now={now} />
            </div>

            <div className={s.card}>
              <div className={s.cardHead}><h3>Log request &amp; respons</h3><span className={s.dim}>{events.length} entri</span></div>
              <LogTable
                events={events}
                now={now}
                onOpen={setSelected}
                empty={status === 'connecting' ? 'Menyambung ke stream…' : 'Belum ada request API. Buka Playground dan kirim request, log akan muncul di sini.'}
              />
            </div>

            <div className={s.grid2}>
              <div className={s.card}>
                <div className={s.cardHead}><h3>Endpoint teratas</h3></div>
                {top.length === 0 ? <p className={s.dim}>Belum ada data.</p> : (
                  <ul className={s.topList}>
                    {top.map((r) => (
                      <li key={r.key}>
                        <MethodBadge m={r.method} tiny />
                        <span className={s.topPath}>{r.path}</span>
                        <span className={s.topNum}>{r.n}×</span>
                        <span className={s.topNum}>{Math.round(r.ms / r.n)} ms</span>
                        {r.err > 0 && <span className={s.topErr}>{r.err} err</span>}
                        <i style={{ width: `${(r.n / top[0].n) * 100}%` }} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={s.card}>
                <div className={s.cardHead}><h3>Server</h3><span className={s.dim}>{sys ? `uptime ${fmtUptime(sys.uptime)}` : ''}</span></div>
                <div className={s.meters}>
                  <Meter label="CPU proses" value={sys?.cpuPercent} />
                  <Meter label="Memori sistem" value={sys?.memPercent} />
                  <Meter label="Heap Node" value={sys?.heapMB} unit=" MB" hint={sys ? `RSS ${sys.rssMB} MB · load ${sys.load}` : ''} />
                </div>
              </div>
            </div>
          </>
        )}

        <div className={s.grid2}>
          <div className={s.card}>
            <div className={s.cardHead}><h3>Riwayat database</h3><span className={s.dim}>7 hari</span></div>
            {db ? (
              <dl className={s.dl}>
                <div><dt>Total tercatat</dt><dd>{db.totalRequests.toLocaleString()}</dd></div>
                <div><dt>Sukses</dt><dd>{db.successRequests.toLocaleString()}</dd></div>
                <div><dt>Error</dt><dd>{db.errorRequests.toLocaleString()}</dd></div>
                <div><dt>Rata-rata latensi</dt><dd>{db.avgLatencyMs} ms</dd></div>
                <div><dt>Tingkat sukses</dt><dd>{db.successRate}%</dd></div>
              </dl>
            ) : <p className={s.dim}>Memuat…</p>}
            {db && db.totalRequests === 0 && <p className={s.hint}>Belum ada riwayat di database (atau database belum terhubung).</p>}
          </div>

          <div className={s.card}>
            <div className={s.cardHead}><h3>Host &amp; database</h3></div>
            {sysSpecs ? (
              <dl className={s.dl}>
                <div><dt>Platform</dt><dd>{sysSpecs.platform}</dd></div>
                <div><dt>CPU</dt><dd>{sysSpecs.cpuCores} core · {sysSpecs.cpuModel}</dd></div>
                <div><dt>Memori</dt><dd>{sysSpecs.memory.usedMB} / {sysSpecs.memory.totalMB} MB</dd></div>
                <div><dt>Node.js</dt><dd>{sysSpecs.nodeVersion}</dd></div>
                <div><dt>Database</dt><dd className={sysSpecs.database.status === 'CONNECTED' ? s.okText : s.badText}>{sysSpecs.database.status} · {sysSpecs.database.latencyMs} ms</dd></div>
              </dl>
            ) : <p className={s.dim}>Memuat…</p>}
          </div>
        </div>
      </div>

      <Portal>
        <AnimatePresence>{selected && <LogDetail key="detail" ev={selected} onClose={() => setSelected(null)} />}</AnimatePresence>
      </Portal>
    </>
  );
}
