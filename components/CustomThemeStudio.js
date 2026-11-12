import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';
import { sound } from '@/src/lib/interactiveEffects';

export default function CustomThemeStudio({ isOpen, onClose, config, setConfig }) {
  const themes = [
    { id: 'stealth', name: 'STEALTH', color: '#38bdf8' },
    { id: 'cyberpunk', name: 'CYBERPUNK', color: '#f43f5e' },
    { id: 'matrix', name: 'MATRIX', color: '#10b981' },
    { id: 'crimson', name: 'CRIMSON', color: '#e11d48' },
  ];

  const particles = [
    { id: 'off', label: 'Off' },
    { id: 'rain', label: 'Rain' },
    { id: 'stars', label: 'Stars' },
  ];

  const update = (key, val) => {
    sound.playClick();
    setConfig((prev) => {
      const next = { ...prev, [key]: val };
      if (typeof window !== 'undefined') {
        localStorage.setItem('nexus_theme_config', JSON.stringify(next));
      }
      return next;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="studio-overlay-backdrop" onClick={onClose}>
          <motion.div
            className="studio-panel-solid"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="studio-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.Sliders size={18} color="var(--a2)" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Theme Studio</h3>
              </div>
              <button className="close-btn" onClick={onClose}>
                <Icons.Close size={20} />
              </button>
            </div>

            <div className="studio-body">
              <div className="config-section">
                <span className="section-label">THEME PALETTE</span>
                <div className="palette-grid">
                  {themes.map((t) => {
                    const isActive = config.theme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`palette-box ${isActive ? 'active' : ''}`}
                        onClick={() => update('theme', t.id)}
                      >
                        <span className="dot" style={{ background: t.color }} />
                        <span className="name">{t.name}</span>
                        {isActive && <Icons.Check size={14} color="var(--a2)" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="config-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="section-label">Card Corner Radius</span>
                  <span style={{ color: 'var(--a2)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {config.radius}px
                  </span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="36"
                  value={config.radius}
                  onChange={(e) => update('radius', Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--a2)' }}
                />
              </div>

              <div className="config-section">
                <span className="section-label">AMBIENT PARTICLES</span>
                <div className="particle-row">
                  {particles.map((p) => {
                    const isActive = config.particle === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`particle-pill ${isActive ? 'active' : ''}`}
                        onClick={() => update('particle', p.id)}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="config-section">
                <span className="section-label">AUDIO FEEDBACK</span>
                <div
                  className="switch-row"
                  onClick={() => update('soundEnabled', !config.soundEnabled)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                    {config.soundEnabled ? <Icons.Volume size={16} /> : <Icons.VolumeMute size={16} />}
                    Web Audio Beeps
                  </span>
                  <div className={`switch-knob ${config.soundEnabled ? 'on' : ''}`}>
                    <div className="circle" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <style jsx>{`
        .studio-overlay-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
          z-index: 99999;
          display: flex;
          justify-content: flex-end;
        }

        .studio-panel-solid {
          width: 100%;
          max-width: 340px;
          height: 100%;
          background: #090e17 !important;
          border-left: 1px solid var(--border);
          box-shadow: -10px 0 30px rgba(0, 0, 0, 0.85);
          display: flex;
          flex-direction: column;
        }

        .studio-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          border-bottom: 1px solid var(--border);
          background: #0f172a;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
        }

        .studio-body {
          padding: 20px 18px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .config-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .section-label {
          font-size: 0.72rem;
          font-family: var(--font-mono);
          color: var(--muted);
          letter-spacing: 0.05em;
        }

        .palette-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .palette-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          background: #1e293b;
          border: 1px solid var(--border);
          color: #fff;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          cursor: pointer;
        }

        .palette-box.active {
          border-color: var(--a2);
          background: rgba(56, 189, 248, 0.15);
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .name {
          flex: 1;
          text-align: left;
        }

        .particle-row {
          display: flex;
          gap: 8px;
        }

        .particle-pill {
          flex: 1;
          padding: 8px;
          border-radius: 10px;
          background: #1e293b;
          border: 1px solid var(--border);
          color: var(--muted);
          font-family: var(--font-mono);
          font-size: 0.75rem;
          cursor: pointer;
        }

        .particle-pill.active {
          background: var(--a1);
          color: #fff;
          border-color: var(--a2);
        }

        .switch-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #1e293b;
          border: 1px solid var(--border);
          border-radius: 12px;
          cursor: pointer;
        }

        .switch-knob {
          width: 40px;
          height: 22px;
          border-radius: 20px;
          background: #334155;
          position: relative;
          transition: background 0.2s;
        }

        .switch-knob.on {
          background: var(--a2);
        }

        .circle {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          position: absolute;
          top: 3px;
          left: 3px;
          transition: transform 0.2s;
        }

        .switch-knob.on .circle {
          transform: translateX(18px);
        }
      `}</style>
    </AnimatePresence>
  );
}