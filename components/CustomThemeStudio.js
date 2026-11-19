import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { Icons } from './Icons';
import { sound } from '@/src/lib/interactiveEffects';
import {
  PRESETS, FONTS, FONT_CATS, GRADIENTS, RADIUS_PRESETS, PARTICLES, CARD_STYLES, COLOR_KEYS, DEFAULT_CONFIG,
  resolveColors, sanitizeConfig, randomPalette, hexToRgb, isLight, fontPreviewHref,
} from '@/src/lib/themes';
import { saveBackgroundFile, clearBackground, readBackground } from '@/src/lib/bgUpload';

const TABS = [
  { id: 'preset', label: 'Preset' },
  { id: 'color', label: 'Warna' },
  { id: 'shape', label: 'Bentuk' },
  { id: 'anim', label: 'Animasi' },
  { id: 'fx', label: 'Efek' },
  { id: 'bg', label: 'Latar' },
  { id: 'text', label: 'Teks' },
  { id: 'data', label: 'Data' },
];

function Slider({ label, value, min, max, step = 1, unit = '', onChange, format, pill }) {
  const isPill = pill && value >= max;
  const dec = (String(step).split('.')[1] || '').length;
  const nudge = (d) => onChange(Math.min(max, Math.max(min, Number((value + d * step).toFixed(dec)))));
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="cfg">
      <div className="cfg-row">
        <span className="cfg-label">{label}</span>
        <span className="cfg-value">{isPill ? 'Pill' : format ? format(value) : `${value}${unit}`}</span>
      </div>
      <div className="sl-row">
        <button type="button" className="sl-step" aria-label={`Kurangi ${label}`} onClick={() => nudge(-1)} disabled={value <= min}><Icons.Minus size={15} /></button>
        <input className="sl-range" type="range" min={min} max={max} step={step} value={value} style={{ '--p': `${pct}%` }} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
        <button type="button" className="sl-step" aria-label={`Tambah ${label}`} onClick={() => nudge(1)} disabled={value >= max}><Icons.Plus size={15} /></button>
      </div>
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
      {label && <span className="cfg-label">{label}</span>}
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

const Section = ({ title, hint, children }) => (
  <div className="sec">
    <div className="sec-head">
      <span className="section-label">{title}</span>
      {hint && <small>{hint}</small>}
    </div>
    {children}
  </div>
);

/** Pilih font: tiap kotak dirender dengan fontnya sendiri. */
function FontPicker({ value, onChange, cats }) {
  const [cat, setCat] = useState(cats?.[0] || 'sans');
  const list = FONTS.filter((f) => (cats ? cats.includes(f.cat) : true) && (cats && cats.length === 1 ? true : f.cat === cat));
  return (
    <div className="font-pick">
      {(!cats || cats.length > 1) && (
        <div className="chips">
          {FONT_CATS.filter((c) => !cats || cats.includes(c.id)).map((c) => (
            <button key={c.id} type="button" className={`chip ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>{c.label}</button>
          ))}
        </div>
      )}
      <div className="font-grid">
        {list.map((f) => (
          <button key={f.id} type="button" className={`font-box ${value === f.id ? 'active' : ''}`} style={{ fontFamily: f.stack }} onClick={() => onChange(f.id)} title={f.name}>
            <strong>Aa</strong>
            <span>{f.name}</span>
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
  const [linkDraft, setLinkDraft] = useState(config.bgUrl);
  const [linkErr, setLinkErr] = useState('');
  const [upload, setUpload] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef(null);
  const colors = useMemo(() => resolveColors(config), [config]);

  useEffect(() => { setLinkDraft(config.bgUrl); }, [config.bgUrl]);
  useEffect(() => { if (isOpen && tab === 'bg') setUpload(readBackground()); }, [isOpen, tab]);

  // muat pratinjau font (hanya subset "Aa") saat tab Teks dibuka
  useEffect(() => {
    if (!isOpen || tab !== 'text') return;
    const href = fontPreviewHref();
    let el = document.getElementById('wudysoft-font-previews');
    if (!el) { el = document.createElement('link'); el.id = 'wudysoft-font-previews'; el.rel = 'stylesheet'; document.head.appendChild(el); }
    if (el.getAttribute('href') !== href) el.setAttribute('href', href);
  }, [isOpen, tab]);

  const set = (patch, silent) => {
    if (!silent) sound.playClick();
    setConfig((prev) => sanitizeConfig({ ...prev, ...patch }));
  };
  const resetDefault = () => {
    if (!confirmReset) { sound.playClick(); setConfirmReset(true); setTimeout(() => setConfirmReset(false), 3500); return; }
    sound.playBeep(); clearBackground(); setUpload(''); setLinkDraft('');
    setConfig({ ...DEFAULT_CONFIG }); setConfirmReset(false); flash('Tema dikembalikan ke default');
  };
  const setColor = (key, value) => {
    if (!hexToRgb(value)) return;
    setConfig((prev) => sanitizeConfig({ ...prev, custom: { ...prev.custom, [key]: value } }));
  };
  const resetColor = (key) => {
    sound.playClick();
    setConfig((prev) => { const custom = { ...prev.custom }; delete custom[key]; return sanitizeConfig({ ...prev, custom }); });
  };
  const flash = (msg) => { setNote(msg); setTimeout(() => setNote(''), 2400); };

  const applyLink = () => {
    const v = linkDraft.trim();
    if (!v) { set({ bgUrl: '' }); setLinkErr(''); return; }
    if (!/^https?:\/\//i.test(v)) { setLinkErr('Gunakan tautan yang diawali http:// atau https://'); return; }
    setLinkErr('');
    set({ bgType: 'link', bgUrl: v });
    flash('Latar dari tautan diterapkan');
  };
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    try {
      const { size } = await saveBackgroundFile(f);
      setUpload(readBackground());
      set({ bgType: 'upload' });
      flash(`Gambar disimpan (${Math.round(size / 1024)} KB)`);
    } catch (err) {
      flash(err.message || 'Gagal memproses gambar');
    } finally { setBusy(false); }
  };

  const exportJson = JSON.stringify(config, null, 2);
  const copyExport = async () => {
    sound.playClick();
    try { await navigator.clipboard.writeText(exportJson); flash('Tema disalin ke clipboard'); } catch { flash('Gagal menyalin, salin manual dari kotak di bawah'); }
  };
  const applyImport = () => {
    try { setConfig(sanitizeConfig(JSON.parse(importText))); sound.playBeep(); flash('Tema berhasil diimpor'); } catch { flash('JSON tidak valid'); }
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
                  {['a1', 'a2', 'a3'].map((k) => <span key={k} style={{ background: colors[k] }} />)}
                </div>
                <button className={`reset-btn ${confirmReset ? 'confirm' : ''}`} onClick={resetDefault} aria-label="Reset tema ke default" title="Reset tema ke default">
                  <RotateCcw size={15} /><span>{confirmReset ? 'Yakin? Ketuk lagi' : 'Reset'}</span>
                </button>
                <button className="close-btn" onClick={onClose} aria-label="Tutup"><Icons.Close size={20} /></button>
              </div>
            </div>

            <div className="studio-tabs" role="tablist">
              {TABS.map((t) => (
                <button key={t.id} role="tab" aria-selected={tab === t.id} className={`studio-tab ${tab === t.id ? 'active' : ''}`} onClick={() => { sound.playClick(); setTab(t.id); }}>
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
                      const c = p.colors;
                      const selected = config.theme === p.id;
                      const active = selected && !Object.keys(config.custom).length;
                      return (
                        <button key={p.id} type="button" className={`palette-box ${selected ? 'active' : ''}`} onClick={() => set({ theme: p.id, custom: {} })} style={{ background: `linear-gradient(135deg, ${c.bg2}, ${c.bg1})` }} title={p.name}>
                          <span className="dots"><i style={{ background: c.a1 }} /><i style={{ background: c.a2 }} /><i style={{ background: c.a3 }} /></span>
                          <span className="name" style={{ color: c.text || (isLight(c.bg1) ? '#0f172a' : '#f8fafc') }}>{p.name}</span>
                          {active && <Icons.Check size={13} color={c.a2} />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="btn-row">
                    <button className="mini-btn" onClick={() => set({ theme: config.theme, custom: randomPalette(false) })}><Icons.Sparkles size={14} /> Acak gelap</button>
                    <button className="mini-btn" onClick={() => set({ theme: config.theme, custom: randomPalette(true) })}><Icons.Sparkles size={14} /> Acak terang</button>
                  </div>
                </>
              )}

              {tab === 'color' && (
                <>
                  <span className="section-label">WARNA KUSTOM (menimpa preset)</span>
                  <div className="color-list">
                    {COLOR_KEYS.map(({ key, label }) => (
                      <div className="color-row" key={key}>
                        <input type="color" value={colors[key]} onChange={(e) => setColor(key, e.target.value)} aria-label={label} />
                        <div className="color-meta">
                          <span>{label}</span>
                          <input className="hex" value={colors[key]} maxLength={7} onChange={(e) => setColor(key, e.target.value)} spellCheck={false} />
                        </div>
                        <button className="mini-btn ghost" disabled={!config.custom[key]} onClick={() => resetColor(key)}>Reset</button>
                      </div>
                    ))}
                  </div>
                  <button className="mini-btn" onClick={() => set({ custom: {} })}>Kembalikan semua warna preset</button>
                </>
              )}

              {tab === 'shape' && (
                <>
                  <Section title="PRESET BENTUK" hint="Atur semua sudut sekaligus">
                    <div className="btn-row">
                      {RADIUS_PRESETS.map((p) => (
                        <button key={p.id} type="button" className="mini-btn" onClick={() => set(p.v)}>{p.label}</button>
                      ))}
                    </div>
                  </Section>

                  <Section title="FLOATING HEADER & NAVBAR" hint="Sudut atas dan bawah bisa berbeda">
                    <Slider label="Sudut atas" value={config.rDockTop} min={0} max={60} unit="px" pill onChange={(v) => set({ rDockTop: v }, true)} />
                    <Slider label="Sudut bawah" value={config.rDockBottom} min={0} max={60} unit="px" pill onChange={(v) => set({ rDockBottom: v }, true)} />
                    <Slider label="Tombol ikon di dalamnya" value={config.rDockBtn} min={0} max={60} unit="px" pill onChange={(v) => set({ rDockBtn: v }, true)} />
                  </Section>

                  <Section title="KARTU & PANEL">
                    <Segmented label="Gaya kartu" value={config.card} options={CARD_STYLES} onChange={(v) => set({ card: v })} />
                    <Slider label="Sudut kartu" value={config.radius} min={0} max={60} unit="px" pill onChange={(v) => set({ radius: v }, true)} />
                    <Slider label="Sudut modal / dialog" value={config.rModal} min={0} max={60} unit="px" pill onChange={(v) => set({ rModal: v }, true)} />
                    <Slider label="Blur kaca" value={config.blur} min={0} max={50} unit="px" onChange={(v) => set({ blur: v }, true)} />
                    <Slider label="Opasitas kaca" value={config.glass} min={0.1} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ glass: v }, true)} />
                    <Slider label="Garis tepi" value={config.border} min={0} max={0.6} step={0.02} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ border: v }, true)} />
                  </Section>

                  <Section title="TOMBOL, INPUT & CHIP">
                    <Slider label="Sudut tombol" value={config.rBtn} min={0} max={60} unit="px" pill onChange={(v) => set({ rBtn: v }, true)} />
                    <Slider label="Sudut input" value={config.rInput} min={0} max={60} unit="px" pill onChange={(v) => set({ rInput: v }, true)} />
                    <Slider label="Sudut chip / badge" value={config.rChip} min={0} max={60} unit="px" pill onChange={(v) => set({ rChip: v }, true)} />
                  </Section>

                  <Section title="TATA LETAK">
                    <Segmented label="Kepadatan" value={config.density} options={[{ id: 'compact', label: 'Rapat' }, { id: 'normal', label: 'Normal' }, { id: 'spacious', label: 'Lega' }]} onChange={(v) => set({ density: v })} />
                    <Segmented label="Ukuran kartu Home" value={config.cardSize} options={[{ id: 's', label: 'Kecil' }, { id: 'm', label: 'Sedang' }, { id: 'l', label: 'Besar' }]} onChange={(v) => set({ cardSize: v })} />
                  </Section>
                </>
              )}

              {tab === 'anim' && (
                <>
                  <Section title="UMUM">
                    <Toggle label="Semua animasi" hint="Matikan untuk menghentikan seluruh gerak" value={config.anim === 'on'} onChange={(v) => set({ anim: v ? 'on' : 'off' })} />
                    <Slider label="Kecepatan" value={config.speed} min={0.5} max={2} step={0.1} format={(v) => `${v.toFixed(1)}×`} onChange={(v) => set({ speed: v }, true)} />
                  </Section>
                  <Section title="TRANSISI HALAMAN">
                    <Segmented value={config.animPage} options={[{ id: 'auto', label: 'Auto' }, { id: 'slide', label: 'Geser' }, { id: 'slideX', label: 'Samping' }, { id: 'fade', label: 'Pudar' }, { id: 'zoom', label: 'Zoom' }, { id: 'blur', label: 'Blur' }, { id: 'rise', label: 'Naik' }, { id: 'flip', label: 'Flip' }, { id: 'drop', label: 'Turun' }, { id: 'skew', label: 'Miring' }, { id: 'none', label: 'Mati' }]} onChange={(v) => set({ animPage: v })} />
                    <Toggle label="Animasi masuk konten" hint="Kartu & hero muncul bertahap" value={config.animEntrance} onChange={(v) => set({ animEntrance: v })} />
                  </Section>
                  <Section title="INTERAKSI">
                    <Segmented label="Efek hover kartu" value={config.animHover} options={[{ id: 'lift', label: 'Angkat' }, { id: 'tilt', label: 'Tilt 3D' }, { id: 'glow', label: 'Glow' }, { id: 'none', label: 'Mati' }]} onChange={(v) => set({ animHover: v })} />
                    <Toggle label="Animasi tombol" hint="Transisi hover & tekan" value={config.animBtn} onChange={(v) => set({ animBtn: v })} />
                    <Toggle label="Animasi pratinjau kartu" hint="Terminal, grafik, chat di kartu Home" value={config.animPreview} onChange={(v) => set({ animPreview: v })} />
                    <Toggle label="Cahaya kursor" hint="Mengikuti pointer (desktop)" value={config.spotlight} onChange={(v) => set({ spotlight: v })} />
                  </Section>
                  <Section title="LATAR & LOADING">
                    <Toggle label="Blob cahaya bergerak" value={config.animBlobs} onChange={(v) => set({ animBlobs: v })} />
                    <Toggle label="Layar loading awal" hint="Splash saat pertama membuka situs" value={config.animSplash} onChange={(v) => set({ animSplash: v })} />
                    <Toggle label="Progress bar pindah halaman" value={config.animBar} onChange={(v) => set({ animBar: v })} />
                    <Toggle label="Efek suara" value={config.soundEnabled} onChange={(v) => set({ soundEnabled: v })} />
                  </Section>
                </>
              )}

              {tab === 'fx' && (
                <>
                  <div className="cfg">
                    <span className="cfg-label">PARTIKEL LATAR</span>
                    <div className="chips">
                      {PARTICLES.map((p) => <button key={p.id} type="button" className={`chip ${config.particle === p.id ? 'active' : ''}`} onClick={() => set({ particle: p.id })}>{p.label}</button>)}
                    </div>
                  </div>
                  <Toggle label="Blob cahaya" value={config.blobs} onChange={(v) => set({ blobs: v })} />
                  <Slider label="Intensitas blob" value={config.blobIntensity} min={0} max={0.7} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ blobIntensity: v }, true)} />
                  <Toggle label="Grid latar" value={config.grid} onChange={(v) => set({ grid: v })} />
                </>
              )}

              {tab === 'bg' && (
                <>
                  <Segmented label="SUMBER LATAR" value={config.bgType} options={[{ id: 'none', label: 'Tanpa' }, { id: 'gradient', label: 'Gradien' }, { id: 'link', label: 'Tautan' }, { id: 'upload', label: 'Unggah' }]} onChange={(v) => set({ bgType: v })} />

                  {config.bgType === 'gradient' && (
                    <div className="grad-grid">
                      {GRADIENTS.map((g) => (
                        <button key={g.id} type="button" className={`grad-box ${config.bgGradient === g.id ? 'active' : ''}`} style={{ backgroundImage: g.css, backgroundColor: colors.bg1 }} onClick={() => set({ bgGradient: g.id })}>
                          <span>{g.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {config.bgType === 'link' && (
                    <div className="cfg">
                      <span className="cfg-label">TAUTAN GAMBAR / VIDEO</span>
                      <input className="text-in" value={linkDraft} onChange={(e) => setLinkDraft(e.target.value)} onBlur={applyLink} onKeyDown={(e) => e.key === 'Enter' && applyLink()} placeholder="https://…/gambar.jpg atau .mp4" inputMode="url" autoCapitalize="none" spellCheck={false} aria-label="Tautan latar" />
                      {linkErr && <small className="bad">{linkErr}</small>}
                      <small className="hint">JPG, PNG, WebP, GIF, atau video .mp4/.webm. Server gambar harus mengizinkan hotlink.</small>
                    </div>
                  )}

                  {config.bgType === 'upload' && (
                    <div className="cfg">
                      <span className="cfg-label">GAMBAR DARI PERANGKAT</span>
                      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
                      <div className="upload-row">
                        <div className="bg-thumb" style={upload ? { backgroundImage: `url(${upload})` } : undefined}>{!upload && <Icons.UploadCloud size={22} />}</div>
                        <div className="upload-actions">
                          <button type="button" className="mini-btn" disabled={busy} onClick={() => fileRef.current?.click()}><Icons.Upload size={14} /> {busy ? 'Memproses…' : upload ? 'Ganti gambar' : 'Pilih gambar'}</button>
                          {upload && <button type="button" className="mini-btn danger" onClick={() => { clearBackground(); setUpload(''); }}><Icons.Trash2 size={14} /> Hapus</button>}
                        </div>
                      </div>
                      <small className="hint">Gambar diperkecil otomatis (maks 1920px) dan disimpan di browser ini.</small>
                    </div>
                  )}

                  {config.bgType !== 'none' && (
                    <>
                      {config.bgType !== 'gradient' && (
                        <>
                          <Segmented label="Ukuran" value={config.bgFit} options={[{ id: 'cover', label: 'Penuh' }, { id: 'contain', label: 'Muat' }, { id: 'repeat', label: 'Ubin' }]} onChange={(v) => set({ bgFit: v })} />
                          <Segmented label="Posisi" value={config.bgPos} options={[{ id: 'top', label: 'Atas' }, { id: 'center', label: 'Tengah' }, { id: 'bottom', label: 'Bawah' }]} onChange={(v) => set({ bgPos: v })} />
                          <Slider label="Gelapkan latar" value={config.bgDim} min={0} max={0.9} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ bgDim: v }, true)} />
                        </>
                      )}
                      <Slider label="Blur latar" value={config.bgBlur} min={0} max={24} unit="px" onChange={(v) => set({ bgBlur: v }, true)} />
                    </>
                  )}
                </>
              )}

              {tab === 'text' && (
                <>
                  <Section title="FONT UTAMA" hint={`${FONTS.length} font`}>
                    <FontPicker value={config.font} onChange={(v) => set({ font: v })} />
                  </Section>
                  <Section title="FONT JUDUL">
                    <Toggle label="Sama dengan font utama" value={config.fontHeading === 'same'} onChange={(v) => set({ fontHeading: v ? 'same' : 'orbitron' })} />
                    {config.fontHeading !== 'same' && <FontPicker value={config.fontHeading} onChange={(v) => set({ fontHeading: v })} />}
                  </Section>
                  <Section title="FONT KODE (MONOSPACE)">
                    <FontPicker value={config.fontMono} cats={['mono']} onChange={(v) => set({ fontMono: v })} />
                  </Section>
                  <Slider label="Ukuran teks" value={config.fontScale} min={85} max={120} step={5} unit="%" onChange={(v) => set({ fontScale: v }, true)} />
                  <div className="font-sample">
                    <h3>Judul contoh — Command Deck</h3>
                    <p>Teks isi dengan font utama. <code>kode_monospace()</code> memakai font kode.</p>
                  </div>
                </>
              )}

              {tab === 'data' && (
                <>
                  <span className="section-label">EKSPOR / IMPOR</span>
                  <textarea className="json-box" readOnly value={exportJson} rows={7} />
                  <div className="btn-row"><button className="mini-btn" onClick={copyExport}><Icons.Copy size={14} /> Salin tema</button></div>
                  <textarea className="json-box" placeholder="Tempel JSON tema di sini…" rows={5} value={importText} onChange={(e) => setImportText(e.target.value)} />
                  <div className="btn-row">
                    <button className="mini-btn" disabled={!importText.trim()} onClick={applyImport}>Terapkan impor</button>
                    <button className="mini-btn danger" onClick={() => { sound.playBeep(); clearBackground(); setConfig({ ...DEFAULT_CONFIG }); flash('Semua pengaturan dikembalikan'); }}>Reset semua</button>
                  </div>
                  <small className="hint">Gambar latar unggahan tidak ikut diekspor (disimpan terpisah di browser).</small>
                </>
              )}

              <AnimatePresence>
                {note && <motion.div className="studio-note" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{note}</motion.div>}
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

        .reset-btn { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: var(--r-btn, 10px); border: 1px solid var(--border); background: var(--surface-2); color: var(--text); font: inherit; font-size: .74rem; font-weight: 600; cursor: pointer; transition: border-color .2s, color .2s, background .2s; }
        .reset-btn:hover { border-color: var(--a2); color: var(--a2); }
        .reset-btn.confirm { border-color: #ef4444; color: #fff; background: #ef4444; }
        .reset-btn svg { transition: transform .4s; } .reset-btn:hover svg { transform: rotate(-200deg); }
        @media (max-width: 380px) { .reset-btn span { display: none; } }
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

        .studio-panel-solid .sl-row { display: flex; align-items: center; gap: 10px; }
        .studio-panel-solid .sl-step { width: 34px; height: 34px; flex-shrink: 0; display: grid; place-items: center; border-radius: 11px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text); cursor: pointer; transition: border-color .2s, color .2s, transform .15s; }
        .studio-panel-solid .sl-step:hover:not(:disabled) { border-color: var(--a2); color: var(--a2); }
        .studio-panel-solid .sl-step:active:not(:disabled) { transform: scale(.9); }
        .studio-panel-solid .sl-step:disabled { opacity: .4; cursor: not-allowed; }
        .studio-panel-solid input[type='range'].sl-range { -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; width: auto; height: 6px; margin: 0; border: none; border-radius: 99px; outline: none; cursor: pointer;
          background: linear-gradient(90deg, var(--a2) var(--p, 50%), var(--surface-3) var(--p, 50%)); }
        .studio-panel-solid .sl-range::-webkit-slider-runnable-track { -webkit-appearance: none; background: transparent; height: 6px; border: none; }
        .studio-panel-solid .sl-range::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; margin-top: -7px; border-radius: 50%; background: #fff; border: 3px solid var(--a2); box-shadow: 0 2px 8px rgba(0,0,0,.5), 0 0 0 4px color-mix(in srgb, var(--a2) 18%, transparent); cursor: grab; transition: transform .15s; }
        .studio-panel-solid .sl-range::-moz-range-track { background: transparent; height: 6px; border: none; }
        .studio-panel-solid .sl-range::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 3px solid var(--a2); box-shadow: 0 2px 8px rgba(0,0,0,.5); cursor: grab; }
        .studio-panel-solid .sl-range:active::-webkit-slider-thumb { transform: scale(1.15); cursor: grabbing; }
        .studio-panel-solid .sl-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 5px color-mix(in srgb, var(--a2) 40%, transparent); }

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
          flex-wrap: wrap;
          padding: 3px;
          gap: 3px;
          border-radius: 12px;
          background: var(--surface-2);
          border: 1px solid var(--border);
        }

        .studio-panel-solid .seg-btn {
          flex: 1 1 auto;
          min-width: 52px;
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
      
        .studio-panel-solid .sec { display: flex; flex-direction: column; gap: 12px; padding-bottom: 6px; border-bottom: 1px dashed var(--border); }
        .studio-panel-solid .sec:last-child { border-bottom: none; }
        .studio-panel-solid .sec-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
        .studio-panel-solid .sec-head small, .studio-panel-solid .hint { color: var(--muted); font-size: 0.7rem; line-height: 1.5; }
        .studio-panel-solid .bad { color: #f87171; font-size: 0.72rem; }
        .studio-panel-solid .text-in { width: 100%; min-height: 42px; padding: 0 12px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text); font-family: var(--font-mono); font-size: 0.78rem; outline: none; }
        .studio-panel-solid .text-in:focus { border-color: var(--a2); }
        .studio-panel-solid .grad-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .studio-panel-solid .grad-box { position: relative; height: 64px; border-radius: 12px; border: 1px solid var(--border); cursor: pointer; display: flex; align-items: flex-end; padding: 6px 8px; color: #fff; font-family: var(--font-mono); font-size: 0.7rem; text-shadow: 0 1px 4px rgba(0,0,0,.6); }
        .studio-panel-solid .grad-box.active { border-color: var(--a2); box-shadow: 0 0 0 2px color-mix(in srgb, var(--a2) 40%, transparent); }
        .studio-panel-solid .upload-row { display: flex; align-items: center; gap: 12px; }
        .studio-panel-solid .bg-thumb { width: 84px; height: 56px; flex-shrink: 0; border-radius: 10px; border: 1px dashed var(--border); background: var(--surface-2) center / cover no-repeat; display: grid; place-items: center; color: var(--muted); }
        .studio-panel-solid .upload-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .studio-panel-solid .font-pick { display: flex; flex-direction: column; gap: 10px; }
        .studio-panel-solid .font-sample { padding: 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface-2); }
        .studio-panel-solid .font-sample h3 { font-size: 1.05rem; margin-bottom: 4px; }
        .studio-panel-solid .font-sample p { font-size: 0.82rem; color: var(--muted); }
        .studio-panel-solid .font-sample code { font-family: var(--font-mono); font-size: 0.78rem; color: var(--a2); }
`}</style>
    </AnimatePresence>
  );
}
