import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '@/components/Seo';
import { Icons } from '@/components/Icons';
import { sound } from '@/src/lib/interactiveEffects';

export default function Home({ sessionUser }) {
  const [activeTab, setActiveTab] = useState('telemetry');
  const [temp, setTemp] = useState(24);
  const [time, setTime] = useState('08:24');
  const [nodes, setNodes] = useState({
    server: true,
    neural: true,
    shield: false,
    quantum: true,
  });

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleNode = (k) => {
    sound.playClick();
    setNodes((p) => ({ ...p, [k]: !p[k] }));
  };

  const tabs = [
    { id: 'telemetry', label: 'Telemetry', icon: Icons.Activity },
    { id: 'matrix', label: 'Clusters', icon: Icons.Cpu },
    { id: 'security', label: 'Security', icon: Icons.Shield },
  ];

  return (
    <>
      <Seo title="Command Deck Dashboard" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* HEADER BAR */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div className="badge ok" style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Icons.Radio size={12} className="animate-pulse" />
              <span>{sessionUser ? 'AUTHORIZED OPERATOR' : 'GUEST RECON'}</span>
            </div>
            <h1>Command Deck</h1>
            <p>
              Cluster Ingestion Rate: <strong style={{ color: 'var(--text)' }}>43.058 MB/s</strong> · Clock: {time}
            </p>
          </div>

          {/* TAB NAVIGATION PILL */}
          <div className="tab-pill-box glass">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`tab-switch-btn ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    sound.playClick();
                    setActiveTab(tab.id);
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="tabActiveBg"
                      className="tab-active-glow"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </header>

        {/* TAB VIEWS */}
        <AnimatePresence mode="wait">
          {activeTab === 'telemetry' && (
            <motion.div
              key="tab-telemetry"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="dash-columns"
            >
              {/* CARD 1: CORE THERMAL GAUGE */}
              <div className="glass card text-center">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icons.Flame size={18} color="var(--a2)" />
                    <h3>Core Thermal</h3>
                  </div>
                  <span className="badge ok">STABLE</span>
                </div>

                {/* Gauge Sederhana Presisi */}
                <div className="dial-container">
                  <svg className="dial-svg" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="66" className="dial-bg" />
                    <circle
                      cx="80"
                      cy="80"
                      r="66"
                      className="dial-fill"
                      strokeDasharray={414}
                      strokeDashoffset={414 - (414 * (temp / 50))}
                    />
                  </svg>
                  <div className="dial-meta">
                    <span className="dial-temp-text">{temp}°C</span>
                    <span className="dial-sub-text">CORE TEMPERATURE</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
                  <button
                    className="btn"
                    onClick={() => { sound.playClick(); setTemp((t) => Math.max(16, t - 1)); }}
                    style={{ width: '36px', height: '36px', padding: 0 }}
                  >
                    −
                  </button>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    Fan Throttle
                  </span>
                  <button
                    className="btn"
                    onClick={() => { sound.playClick(); setTemp((t) => Math.min(48, t + 1)); }}
                    style={{ width: '36px', height: '36px', padding: 0 }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* CARD 2: BANDWIDTH TELEMETRY */}
              <div className="glass card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icons.Gauge size={18} color="var(--a2)" />
                    <h3>Bandwidth Telemetry</h3>
                  </div>
                  <span className="badge">LIVE FEED</span>
                </div>

                <div style={{ margin: '14px 0 6px' }}>
                  <h2 style={{ fontSize: '2.6rem', fontWeight: 800 }}>43.058</h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--a2)', fontFamily: 'var(--font-mono)' }}>
                    MB/S INGESTION RATE
                  </span>
                </div>

                {/* Wave Curve */}
                <div style={{ width: '100%', height: '80px', marginTop: '8px' }}>
                  <svg viewBox="0 0 300 80" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="waveG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--a2)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--a2)" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,55 Q40,75 80,35 T160,30 T220,10 T300,25 L300,80 L0,80 Z" fill="url(#waveG)" />
                    <path d="M0,55 Q40,75 80,35 T160,30 T220,10 T300,25" fill="none" stroke="var(--a2)" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="220" cy="10" r="4" fill="#fff" stroke="var(--a2)" strokeWidth="2.5" />
                  </svg>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  <span>Allocated: 76%</span>
                  <span>Latency: 4.8ms</span>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'matrix' && (
            <motion.div
              key="tab-matrix"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="dash-columns"
            >
              {[
                { k: 'server', name: 'Master Engine', sub: 'Cluster 01-A', icon: Icons.Server },
                { k: 'neural', name: 'Neural LLM Node', sub: 'RTX Ingestion', icon: Icons.Cpu },
                { k: 'shield', name: 'AES Edge Shield', sub: 'Firewall Subsystem', icon: Icons.Shield },
                { k: 'quantum', name: 'Gateway Proxy', sub: 'Zero Latency', icon: Icons.Radio },
              ].map((item) => {
                const ItemIcon = item.icon;
                const isOnline = nodes[item.k];
                return (
                  <div
                    key={item.k}
                    className={`glass card node-box ${isOnline ? 'active' : ''}`}
                    onClick={() => toggleNode(item.k)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ItemIcon size={24} color={isOnline ? 'var(--a2)' : 'var(--muted)'} />
                      <span className={`status-bulb ${isOnline ? 'on' : ''}`} />
                    </div>
                    <strong style={{ fontSize: '1.02rem', marginTop: '8px', display: 'block' }}>{item.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{item.sub}</span>
                    <div style={{ marginTop: '14px', fontSize: '0.72rem', color: isOnline ? 'var(--a2)' : 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      {isOnline ? '● OPERATIONAL' : '○ DEACTIVATED'}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              key="tab-security"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="glass card"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Icons.ShieldCheck size={24} color="var(--a2)" />
                <h3>Cluster Security Protocols</h3>
              </div>
              <p>Edge sliding window rate limiting active at 60 req/min per IP address.</p>
              
              <div style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>
                <div className="security-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icons.Lock size={15} color="var(--a2)" /> HMAC SHA-256 Token Signature
                  </span>
                  <span className="badge ok">VERIFIED</span>
                </div>
                <div className="security-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icons.Shield size={15} color="var(--a2)" /> SSL/TLS Strict Transport
                  </span>
                  <span className="badge ok">SECURED</span>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <Link href="/playground" onClick={() => sound.playClick()}>
                  <div className="btn primary" style={{ display: 'inline-flex', gap: '8px' }}>
                    <span>Buka Console Dispatcher</span>
                    <Icons.ArrowRight size={15} />
                  </div>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .tab-pill-box {
          display: flex;
          padding: 4px;
          border-radius: 30px;
          gap: 4px;
        }
        .tab-switch-btn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: transparent;
          border: none;
          color: var(--muted);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          cursor: pointer;
          border-radius: 20px;
          transition: color 0.2s;
        }
        .tab-switch-btn.active {
          color: #fff;
        }
        .tab-active-glow {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, var(--a1), var(--a3));
          border-radius: 20px;
          z-index: -1;
          box-shadow: 0 4px 14px var(--border-glow);
        }

        /* Dial Termal Tanpa Elemen Liar */
        .dial-container {
          position: relative;
          width: 150px;
          height: 150px;
          margin: 12px auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dial-svg {
          position: absolute;
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }
        .dial-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.06);
          stroke-width: 10;
        }
        .dial-fill {
          fill: none;
          stroke: var(--a2);
          stroke-width: 10;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.4s ease;
        }
        .dial-meta {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }
        .dial-temp-text {
          font-size: 2.4rem;
          font-weight: 800;
          line-height: 1;
        }
        .dial-sub-text {
          font-size: 0.65rem;
          color: var(--muted);
          letter-spacing: 0.12em;
          font-family: var(--font-mono);
          margin-top: 4px;
        }

        .node-box {
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .node-box.active {
          border-color: var(--a2);
          background: rgba(56, 189, 248, 0.12);
        }
        .status-bulb {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #475569;
        }
        .status-bulb.on {
          background: var(--a2);
          box-shadow: 0 0 10px var(--a2);
        }
        .security-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          font-family: var(--font-mono);
          font-size: 0.8rem;
        }
      `}</style>
    </>
  );
}