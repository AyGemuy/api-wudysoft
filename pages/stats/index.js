import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '@/components/Seo';
import {
  Activity,
  Cpu,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Database,
  Trash2,
  Sparkles,
  Terminal,
  Radio
} from 'lucide-react';
import { sound } from '@/src/lib/interactiveEffects';

export default function StatsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch telemetry data
  const fetchStats = async (isManual = false) => {
    if (isManual) sound.playClick();
    setRefreshing(true);
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (isManual) sound.playBeep();
      }
    } catch (e) {
      console.warn('Gagal memuat telemetri stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    let interval = null;
    if (autoRefresh) {
      interval = setInterval(() => fetchStats(false), 5000); // Poll tiap 5s
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleClearLogs = async () => {
    if (!confirm('Hapus seluruh riwayat log transmisi dari database?')) return;
    sound.playClick();
    try {
      await fetch('/api/stats', { method: 'DELETE' });
      sound.playBeep();
      fetchStats();
    } catch {}
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d > 0 ? `${d}d ` : ''}${h}h ${m}m ${s}s`;
  };

  return (
    <>
      <Seo title="System Telemetry & OS Metrics" path="/stats" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* HEADER CONTROLS */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div className="badge ok" style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Radio size={13} className="animate-pulse" />
              <span>LIVE CLUSTER TELEMETRY ENGINE</span>
            </div>
            <h1>System & API Telemetry</h1>
            <p>Pendeteksi performa realtime, beban kernel OS, dan rasio transmisi HTTP.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className={`btn ${autoRefresh ? 'primary' : ''}`}
              onClick={() => {
                sound.playClick();
                setAutoRefresh(!autoRefresh);
              }}
              style={{ fontSize: '0.78rem', padding: '8px 14px' }}
            >
              <span>Auto-Pulse: {autoRefresh ? 'ON' : 'PAUSED'}</span>
            </button>

            <motion.button
              className="btn"
              onClick={() => fetchStats(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ padding: '8px 12px' }}
              title="Manual Reload"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </motion.button>
          </div>
        </header>

        {/* TOP 4 KEY METRIC TILES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* TOTAL REQUESTS */}
          <motion.div className="glass card" whileHover={{ y: -3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>TOTAL REQUESTS</span>
              <Activity size={18} color="var(--a2)" />
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '8px 0 2px' }}>
              {data?.metrics?.totalRequests?.toLocaleString() || '---'}
            </h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--a2)' }}>
              ● {data?.metrics?.successRate || 100}% Success Rate
            </span>
          </motion.div>

          {/* REQUESTS SUCCESS */}
          <motion.div className="glass card" whileHover={{ y: -3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>SUKSES (HTTP 2XX)</span>
              <CheckCircle2 size={18} color="#34d399" />
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#34d399', margin: '8px 0 2px' }}>
              {data?.metrics?.successRequests?.toLocaleString() || '---'}
            </h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              Transmisi terkirim bersih
            </span>
          </motion.div>

          {/* REQUESTS ERROR */}
          <motion.div className="glass card" whileHover={{ y: -3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>ERRORS (4XX / 5XX)</span>
              <AlertTriangle size={18} color="#f87171" />
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#f87171', margin: '8px 0 2px' }}>
              {data?.metrics?.errorRequests?.toLocaleString() || '0'}
            </h2>
            <span style={{ fontSize: '0.72rem', color: '#f87171' }}>
              Ditolak / Gagal eksekusi
            </span>
          </motion.div>

          {/* AVERAGE SPEED (MS) */}
          <motion.div className="glass card" whileHover={{ y: -3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>AVG LATENCY (MS)</span>
              <Zap size={18} color="var(--a2)" />
            </div>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '8px 0 2px' }}>
              {data?.metrics?.avgLatencyMs || 0} <span style={{ fontSize: '1rem', color: 'var(--muted)' }}>ms</span>
            </h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--a2)' }}>
              Kecepatan respon rata-rata
            </span>
          </motion.div>
        </div>

        {/* MIDDLE SECTION: SYSTEM KERNEL & MEMORY USAGE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* OS & KERNEL SPECS */}
          <motion.div className="glass card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <Server size={18} color="var(--a2)" />
              <h3 style={{ fontSize: '0.98rem' }}>Host Kernel & Hardware Architecture</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px', fontSize: '0.8rem' }}>
              <div className="spec-row">
                <span className="spec-label">Platform OS</span>
                <strong className="spec-val">{data?.system?.platform || 'Linux / Serverless Node'}</strong>
              </div>
              <div className="spec-row">
                <span className="spec-label">Processor Core</span>
                <strong className="spec-val">{data?.system?.cpuModel} ({data?.system?.cpuCores} Cores)</strong>
              </div>
              <div className="spec-row">
                <span className="spec-label">Node.js Runtime</span>
                <strong className="spec-val" style={{ color: 'var(--a2)' }}>{data?.system?.nodeVersion}</strong>
              </div>
              <div className="spec-row">
                <span className="spec-label">Load Average</span>
                <strong className="spec-val">{data?.system?.loadAverage || '0.12, 0.08, 0.02'}</strong>
              </div>
              <div className="spec-row">
                <span className="spec-label">OS System Uptime</span>
                <strong className="spec-val">{formatUptime(data?.system?.uptimeSeconds)}</strong>
              </div>
              <div className="spec-row">
                <span className="spec-label">Process Node Uptime</span>
                <strong className="spec-val">{formatUptime(data?.system?.processUptime)}</strong>
              </div>
            </div>
          </motion.div>

          {/* MEMORY & DATABASE CLUSTER GAUGE */}
          <motion.div className="glass card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <HardDrive size={18} color="var(--a2)" />
              <h3 style={{ fontSize: '0.98rem' }}>Memory Ingestion & Database Cluster</h3>
            </div>

            {/* RAM Progress Bar */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--muted)' }}>Host RAM Utilization</span>
                <strong>{data?.system?.memory?.usedMB} MB / {data?.system?.memory?.totalMB} MB ({data?.system?.memory?.percent}%)</strong>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', overflow: 'hidden' }}>
                <motion.div
                  style={{ height: '100%', background: 'linear-gradient(90deg, var(--a1), var(--a2))' }}
                  animate={{ width: `${data?.system?.memory?.percent || 0}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Node Heap Spec */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '18px' }}>
              <div className="mini-stat-card">
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>NODE HEAP USED</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--a2)' }}>
                  {data?.system?.memory?.nodeHeapUsedMB || 0} MB
                </strong>
              </div>
              <div className="mini-stat-card">
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>NODE RESIDENT RSS</span>
                <strong style={{ fontSize: '1.2rem' }}>
                  {data?.system?.memory?.nodeRssMB || 0} MB
                </strong>
              </div>
            </div>

            {/* MongoDB Telemetry Status */}
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={16} color="var(--a2)" />
                <span style={{ fontSize: '0.8rem' }}>MongoDB Atlas Cloud</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge ok">{data?.system?.database?.status}</span>
                <span className="badge">{data?.system?.database?.latencyMs} ms</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* BOTTOM: RECENT API TRANSMISSION LOGS */}
        <motion.div className="glass card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={18} color="var(--a2)" />
              <h3 style={{ fontSize: '0.98rem' }}>Recent Traffic Transmissions (Live Stream)</h3>
            </div>
            <button
              onClick={handleClearLogs}
              style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Trash2 size={13} /> Purge Logs
            </button>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>STATUS</th>
                  <th>METHOD</th>
                  <th>ROUTE PATH</th>
                  <th>SPEED (MS)</th>
                  <th>CLIENT IP</th>
                  <th>TIME</th>
                </tr>
              </thead>
              <tbody>
                {data?.metrics?.recentLogs && data.metrics.recentLogs.length > 0 ? (
                  data.metrics.recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <span className={`badge ${log.isSuccess ? 'ok' : 'err'}`}>
                          {log.statusCode}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--a2)' }}>{log.method}</strong>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{log.path}</td>
                      <td>{log.latencyMs} ms</td>
                      <td style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{log.ip}</td>
                      <td style={{ color: 'var(--muted)' }}>{log.time}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                      Belum ada rekaman transmisi log pada cluster ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        .spec-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .spec-label {
          color: var(--muted);
        }
        .spec-val {
          font-family: var(--font-mono);
        }
        .mini-stat-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .table-responsive {
          overflow-x: auto;
          margin-top: 10px;
        }
        .custom-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
          text-align: left;
        }
        .custom-table th {
          padding: 10px 12px;
          color: var(--muted);
          font-family: var(--font-mono);
          font-size: 0.72rem;
          border-bottom: 1px solid var(--border);
        }
        .custom-table td {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
      `}</style>
    </>
  );
}