import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';
import { sound } from '@/src/lib/interactiveEffects';
import {
  PRESETS,
  FONTS,
  PARTICLES,
  CARD_STYLES,
  COLOR_KEYS,
  DEFAULT_CONFIG,
  resolveColors,
  sanitizeConfig,
  randomPalette,
  hexToRgb,
  isLight,
} from '@/src/lib/themes';

const TABS = [
  { id: 'preset', label: 'Preset' },
  { id: 'color', label: 'Warna' },
  { id: 'shape', label: 'Bentuk' },
  { id: 'fx', label: 'Efek' },
  { id: 'text', label: 'Teks' },
  { id: 'data', label: 'Data' },
];

function Slider({ label, value, min, max, step = 1, unit = '', onChange, format }) {
  return (
    <div className="cfg">
      <div className="cfg-row">
        <span className="cfg-label">{label}</span>
        <span className="cfg-value">{format ? format(value) : `${value}${unit}`}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Toggle({ label, hint, value, onChange }) {
  return (
    <button type="button" className="switch-row" onClick={() => onChange(!value)} aria-pressed={value}>
      <span className="switch-text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      <span className={`switch-knob ${value ? 'on' : ''}`}>
        <span className="circle" />
      </span>
    </button>
  );
}

function Segmented({ label, value, options, onChange }) {
  return (
    <div className="cfg">
      <span className="cfg-label">{label}</span>
      <div className="seg">
        {options.map((o) => (
          <button key={o.id} type="button" className={`seg-btn ${value === o.id ? 'active' : ''}`} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CustomThemeStudio({ isOpen, onClose, config, setConfig }) {
  const [tab, setTab] = useState('preset');
  const [importText, setImportText] = useState('');
  const [note, setNote] = useState('');
  const colors = useMemo(() => resolveColors(config), [config]);

  const set = (patch, silent) => {
    if (!silent) sound.playClick();
    setConfig((prev) => sanitizeConfig({ ...prev, ...patch }));
  };

  const setColor = (key, value) => {
    if (!hexToRgb(value)) return;
    setConfig((prev) => sanitizeConfig({ ...prev, custom: { ...prev.custom, [key]: value } }));
  };
  const resetColor = (key) => {
    sound.playClick();
    setConfig((prev) => {
      const custom = { ...prev.custom };
      delete custom[key];
      return sanitizeConfig({ ...prev, custom });
    });
  };

  const flash = (msg) => {
    setNote(msg);
    setTimeout(() => setNote(''), 2200);
  };

  const exportJson = JSON.stringify(config, null, 2);
  const copyExport = async () => {
    sound.playClick();
    try {
      await navigator.clipboard.writeText(exportJson);
      flash('Tema disalin ke clipboard');
    } catch {
      flash('Gagal menyalin, salin manual dari kotak di bawah');
    }
  };
  const applyImport = () => {
    try {
      const parsed = JSON.parse(importText);
      setConfig(sanitizeConfig(parsed));
      sound.playBeep();
      flash('Tema berhasil diimpor');
    } catch {
      flash('JSON tidak valid');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="studio-overlay-backdrop" onClick={onClose}>
          <motion.div
            className="studio-panel-solid"
            role="dialog"
            aria-label="Theme Studio"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="studio-head">
              <div className="head-title">
                <Icons.Sliders size={18} color="var(--a2)" />
                <h3>Theme Studio</h3>
              </div>
              <div className="head-actions">
                <div className="mini-swatches" aria-hidden="true">
                  {['a1', 'a2', 'a3'].map((k) => (
                    <span key={k} style={{ background: colors[k] }} />
                  ))}
                </div>
                <button className="close-btn" onClick={onClose} aria-label="Tutup">
                  <Icons.Close size={20} />
                </button>
              </div>
            </div>

            <div className="studio-tabs" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`studio-tab ${tab === t.id ? 'active' : ''}`}
                  onClick={() => {
                    sound.playClick();
                    setTab(t.id);
                  }}
                >
                  {t.label}
                  {tab === t.id && <motion.span layoutId="studioTab" className="studio-tab-underline" />}
                </button>
              ))}
            </div>

            <div className="studio-body">
              {tab === 'preset' && (
                <>
                  <span className="section-label">{PRESETS.length} PRESET TEMA</span>
                  <div className="palette-grid">
                    {PRESETS.map((p) => {
                      const active = config.theme === p.id && !Object.keys(config.custom).length;
                      const selected = config.theme === p.id;
                      const c = p.colors;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`palette-box ${selected ? 'active' : ''}`}
                          onClick={() => set({ theme: p.id, custom: {} })}
                          style={{ background: `linear-gradient(135deg, ${c.bg2}, ${c.bg1})` }}
                          title={p.name}
                        >
                          <span className="dots">
                            <i style={{ background: c.a1 }} />
                            <i style={{ background: c.a2 }} />
                            <i style={{ background: c.a3 }} />
                          </span>
                          <span className="name" style={{ color: c.text || (isLight(c.bg1) ? '#0f172a' : '#f8fafc') }}>
                            {p.name}
                          </span>
                          {active && <Icons.Check size={13} color={c.a2} />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="btn-row">
                    <button className="mini-btn" onClick={() => set({ theme: config.theme, custom: randomPalette(false) })}>
                      <Icons.Sparkles size={14} /> Acak gelap
                    </button>
                    <button className="mini-btn" onClick={() => set({ theme: config.theme, custom: randomPalette(true) })}>
                      <Icons.Sparkles size={14} /> Acak terang
                    </button>
                  </div>
                </>
              )}

              {tab === 'color' && (
                <>
                  <span className="section-label">WARNA KUSTOM (menimpa preset)</span>
                  <div className="color-list">
                    {COLOR_KEYS.map(({ key, label }) => {
                      const overridden = !!config.custom[key];
                      return (
                        <div className="color-row" key={key}>
                          <input
                            type="color"
                            value={colors[key]}
                            onChange={(e) => setColor(key, e.target.value)}
                            aria-label={label}
                          />
                          <div className="color-meta">
                            <span>{label}</span>
                            <input
                              className="hex"
                              value={colors[key]}
                              maxLength={7}
                              onChange={(e) => setColor(key, e.target.value)}
                              spellCheck={false}
                            />
                          </div>
                          <button className="mini-btn ghost" disabled={!overridden} onClick={() => resetColor(key)}>
                            Reset
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button className="mini-btn" onClick={() => set({ custom: {} })}>
                    Kembalikan semua warna preset
                  </button>
                </>
              )}

              {tab === 'shape' && (
                <>
                  <Segmented label="GAYA KARTU" value={config.card} options={CARD_STYLES} onChange={(v) => set({ card: v })} />
                  <Slider label="Sudut kartu" value={config.radius} min={0} max={40} unit="px" onChange={(v) => set({ radius: v }, true)} />
                  <Slider label="Blur kaca" value={config.blur} min={0} max={50} unit="px" onChange={(v) => set({ blur: v }, true)} />
                  <Slider label="Opasitas kaca" value={config.glass} min={0.1} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ glass: v }, true)} />
                  <Slider label="Garis tepi" value={config.border} min={0} max={0.6} step={0.02} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ border: v }, true)} />
                  <Segmented
                    label="KEPADATAN"
                    value={config.density}
                    options={[
                      { id: 'compact', label: 'Rapat' },
                      { id: 'normal', label: 'Normal' },
                      { id: 'spacious', label: 'Lega' },
                    ]}
                    onChange={(v) => set({ density: v })}
                  />
                  <Segmented
                    label="UKURAN KARTU HOME"
                    value={config.cardSize}
                    options={[
                      { id: 's', label: 'Kecil' },
                      { id: 'm', label: 'Sedang' },
                      { id: 'l', label: 'Besar' },
                    ]}
                    onChange={(v) => set({ cardSize: v })}
                  />
                </>
              )}

              {tab === 'fx' && (
                <>
                  <div className="cfg">
                    <span className="cfg-label">PARTIKEL LATAR</span>
                    <div className="chips">
                      {PARTICLES.map((p) => (
                        <button key={p.id} type="button" className={`chip ${config.particle === p.id ? 'active' : ''}`} onClick={() => set({ particle: p.id })}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Toggle label="Animasi" hint="Matikan untuk semua gerak" value={config.anim === 'on'} onChange={(v) => set({ anim: v ? 'on' : 'off' })} />
                  <Slider label="Kecepatan animasi" value={config.speed} min={0.5} max={2} step={0.1} format={(v) => `${v.toFixed(1)}×`} onChange={(v) => set({ speed: v }, true)} />
                  <Toggle label="Blob cahaya" value={config.blobs} onChange={(v) => set({ blobs: v })} />
                  <Slider label="Intensitas blob" value={config.blobIntensity} min={0} max={0.7} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ blobIntensity: v }, true)} />
                  <Toggle label="Grid latar" value={config.grid} onChange={(v) => set({ grid: v })} />
                  <Toggle label="Cahaya kursor" hint="Mengikuti pointer (desktop)" value={config.spotlight} onChange={(v) => set({ spotlight: v })} />
                  <Toggle label="Tilt 3D kartu" hint="Kartu miring mengikuti pointer" value={config.tilt} onChange={(v) => set({ tilt: v })} />
                  <Toggle label="Efek suara" value={config.soundEnabled} onChange={(v) => set({ soundEnabled: v })} />
                </>
              )}

              {tab === 'text' && (
                <>
                  <span className="section-label">FONT</span>
                  <div className="font-grid">
                    {FONTS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`font-box ${config.font === f.id ? 'active' : ''}`}
                        style={{ fontFamily: f.stack }}
                        onClick={() => set({ font: f.id })}
                      >
                        <strong>Aa</strong>
                        <span>{f.name}</span>
                      </button>
                    ))}
                  </div>
                  <Slider label="Ukuran teks" value={config.fontScale} min={85} max={120} step={5} unit="%" onChange={(v) => set({ fontScale: v }, true)} />
                </>
              )}

              {tab === 'data' && (
                <>
                  <span className="section-label">EKSPOR / IMPOR</span>
                  <textarea className="json-box" readOnly value={exportJson} rows={7} />
                  <div className="btn-row">
                    <button className="mini-btn" onClick={copyExport}>
                      <Icons.Copy size={14} /> Salin tema
                    </button>
                  </div>
                  <textarea
                    className="json-box"
                    placeholder="Tempel JSON tema di sini…"
                    rows={5}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                  <div className="btn-row">
                    <button className="mini-btn" disabled={!importText.trim()} onClick={applyImport}>
                      Terapkan impor
                    </button>
                    <button
                      className="mini-btn danger"
                      onClick={() => {
                        sound.playBeep();
                        setConfig({ ...DEFAULT_CONFIG });
                        flash('Semua pengaturan dikembalikan');
                      }}
                    >
                      Reset semua
                    </button>
                  </div>
                </>
              )}

              <AnimatePresence>
                {note && (
                  <motion.div className="studio-note" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {note}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}

      <style jsx global>{`.studio-overlay-backdrop {
          position: fixed;
          inset: 0;
          background: color-mix(in srgb, var(--shadow-c) 60%, transparent);
          backdrop-filter: blur(6px);
          z-index: 99999;
          display: flex;
          justify-content: flex-end;
        }

        .studio-panel-solid {
          width: 100%;
          max-width: 380px;
          height: 100%;
          height: 100dvh;
          background: var(--surface);
          color: var(--text);
          border-left: 1px solid var(--border);
          box-shadow: -10px 0 30px color-mix(in srgb, var(--shadow-c) 55%, transparent);
          display: flex;
          flex-direction: column;
        }

        .studio-panel-solid .studio-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: calc(14px + env(safe-area-inset-top, 0px)) 16px 12px;
          border-bottom: 1px solid var(--border);
          background: var(--surface-2);
        }

        .studio-panel-solid .head-title,
        .studio-panel-solid .head-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .studio-panel-solid .head-title h3 {
          font-size: 1rem;
        }

        .studio-panel-solid .mini-swatches {
          display: flex;
        }

        .studio-panel-solid .mini-swatches span {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid var(--surface-2);
          margin-left: -5px;
        }

        .studio-panel-solid .close-btn {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          display: flex;
        }

        .studio-panel-solid .studio-tabs {
          display: flex;
          overflow-x: auto;
          gap: 2px;
          padding: 0 10px;
          border-bottom: 1px solid var(--border);
          scrollbar-width: none;
        }

        .studio-panel-solid .studio-tabs::-webkit-scrollbar {
          display: none;
        }

        .studio-panel-solid .studio-tab {
          position: relative;
          flex: 1 0 auto;
          padding: 12px 12px;
          background: none;
          border: none;
          color: var(--muted);
          font-family: var(--font-mono);
          font-size: 0.74rem;
          cursor: pointer;
          white-space: nowrap;
        }

        .studio-panel-solid .studio-tab.active {
          color: var(--a2);
        }

        .studio-panel-solid .studio-tab-underline {
          position: absolute;
          left: 8px;
          right: 8px;
          bottom: 0;
          height: 2px;
          border-radius: 2px;
          background: var(--a2);
          box-shadow: 0 0 8px var(--a2);
        }

        .studio-panel-solid .studio-body {
          position: relative;
          padding: 18px 16px calc(22px + env(safe-area-inset-bottom, 0px));
          overflow-y: auto;
          overscroll-behavior: contain;
          display: flex;
          flex-direction: column;
          gap: 16px;
          flex: 1;
        }

        .studio-panel-solid .section-label,
        .studio-panel-solid .cfg-label {
          font-size: 0.7rem;
          font-family: var(--font-mono);
          color: var(--muted);
          letter-spacing: 0.05em;
        }

        .studio-panel-solid .cfg {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .studio-panel-solid .cfg-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .studio-panel-solid .cfg-value {
          color: var(--a2);
          font-family: var(--font-mono);
          font-size: 0.78rem;
        }

        .studio-panel-solid input[type='range'] {
          width: 100%;
          accent-color: var(--a2);
        }

        .studio-panel-solid .palette-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .studio-panel-solid .palette-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 10px;
          border-radius: 12px;
          border: 1px solid var(--border);
          font-family: var(--font-mono);
          font-size: 0.72rem;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease;
          min-width: 0;
        }

        .studio-panel-solid .palette-box:hover {
          transform: translateY(-1px);
        }

        .studio-panel-solid .palette-box.active {
          border-color: var(--a2);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--a2) 35%, transparent);
        }

        .studio-panel-solid .dots {
          display: flex;
        }

        .studio-panel-solid .dots i {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          margin-left: -3px;
          border: 1.5px solid rgba(0, 0, 0, 0.25);
        }

        .studio-panel-solid .dots i:first-child {
          margin-left: 0;
        }

        .studio-panel-solid .name {
          flex: 1;
          text-align: left;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .studio-panel-solid .btn-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .studio-panel-solid .mini-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 12px;
          border-radius: 10px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 0.74rem;
          cursor: pointer;
        }

        .studio-panel-solid .mini-btn:hover:not(:disabled) {
          border-color: var(--a2);
        }

        .studio-panel-solid .mini-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .studio-panel-solid .mini-btn.ghost {
          background: transparent;
          padding: 6px 8px;
        }

        .studio-panel-solid .mini-btn.danger {
          color: #f87171;
        }

        .studio-panel-solid .color-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .studio-panel-solid .color-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 12px;
          background: var(--surface-2);
          border: 1px solid var(--border);
        }

        .studio-panel-solid .color-row input[type='color'] {
          width: 38px;
          height: 38px;
          padding: 0;
          border: none;
          border-radius: 10px;
          background: none;
          cursor: pointer;
          flex-shrink: 0;
        }

        .studio-panel-solid .color-meta {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.78rem;
          min-width: 0;
        }

        .studio-panel-solid .hex {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: var(--muted);
          font-family: var(--font-mono);
          font-size: 0.74rem;
          text-transform: uppercase;
        }

        .studio-panel-solid .seg {
          display: flex;
          padding: 3px;
          gap: 3px;
          border-radius: 12px;
          background: var(--surface-2);
          border: 1px solid var(--border);
        }

        .studio-panel-solid .seg-btn {
          flex: 1;
          padding: 8px 4px;
          border-radius: 9px;
          border: none;
          background: transparent;
          color: var(--muted);
          font-family: var(--font-mono);
          font-size: 0.74rem;
          cursor: pointer;
        }

        .studio-panel-solid .seg-btn.active {
          background: linear-gradient(135deg, var(--a1), var(--a3));
          color: var(--on-accent);
        }

        .studio-panel-solid .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .studio-panel-solid .chip {
          padding: 7px 12px;
          border-radius: 999px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--muted);
          font-family: var(--font-mono);
          font-size: 0.74rem;
          cursor: pointer;
        }

        .studio-panel-solid .chip.active {
          background: var(--a1);
          border-color: var(--a2);
          color: var(--on-accent);
        }

        .studio-panel-solid .switch-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          padding: 10px 14px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text);
          text-align: left;
          cursor: pointer;
        }

        .studio-panel-solid .switch-text {
          display: flex;
          flex-direction: column;
          font-size: 0.84rem;
        }

        .studio-panel-solid .switch-text small {
          color: var(--muted);
          font-size: 0.7rem;
        }

        .studio-panel-solid .switch-knob {
          flex-shrink: 0;
          width: 40px;
          height: 22px;
          border-radius: 20px;
          background: var(--surface-3);
          position: relative;
          transition: background 0.2s;
        }

        .studio-panel-solid .switch-knob.on {
          background: var(--a2);
        }

        .studio-panel-solid .circle {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          position: absolute;
          top: 3px;
          left: 3px;
          transition: transform 0.2s;
        }

        .studio-panel-solid .switch-knob.on .circle {
          transform: translateX(18px);
        }

        .studio-panel-solid .font-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .studio-panel-solid .font-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text);
          cursor: pointer;
        }

        .studio-panel-solid .font-box strong {
          font-size: 1.3rem;
          color: var(--a2);
        }

        .studio-panel-solid .font-box span {
          font-size: 0.76rem;
        }

        .studio-panel-solid .font-box.active {
          border-color: var(--a2);
          background: color-mix(in srgb, var(--a2) 14%, var(--surface-2));
        }

        .studio-panel-solid .json-box {
          width: 100%;
          resize: vertical;
          padding: 10px 12px;
          border-radius: 12px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          outline: none;
        }

        .studio-panel-solid .studio-note {
          position: sticky;
          bottom: 0;
          align-self: center;
          padding: 8px 14px;
          border-radius: 999px;
          background: var(--a1);
          color: var(--on-accent);
          font-size: 0.76rem;
          box-shadow: 0 8px 20px color-mix(in srgb, var(--shadow-c) 40%, transparent);
        }
      `}</style>
    </AnimatePresence>
  );
}
