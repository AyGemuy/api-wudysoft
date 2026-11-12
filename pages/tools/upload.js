import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '@/components/Seo';
import {
  UploadCloud,
  Server,
  File,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Trash2,
  RefreshCw,
  Sparkles,
  ChevronDown,
  Check
} from 'lucide-react';
import { sound } from '@/src/lib/interactiveEffects';

export default function UploadPage() {
  const fileInputRef = useRef(null);
  const [hosts, setHosts] = useState([]);
  const [loadingHosts, setLoadingHosts] = useState(true);
  const [selectedHost, setSelectedHost] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadResults, setUploadResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. AUTO-GET ALL AVAILABLE HOSTS VIA NATIVE FETCH
  const fetchAvailableHosts = async () => {
    setLoadingHosts(true);
    try {
      const res = await fetch('/api/tools/upload');
      if (res.ok) {
        const data = await res.json();
        const hostList = Array.isArray(data.hosts)
          ? data.hosts.map((h) => (typeof h === 'string' ? { id: h, label: h.toUpperCase() } : h))
          : Array.isArray(data.result)
          ? data.result.map((h) => (typeof h === 'string' ? { id: h, label: h.toUpperCase() } : h))
          : null;

        if (hostList && hostList.length > 0) {
          setHosts(hostList);
          setSelectedHost(hostList[0].id);
          setLoadingHosts(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Gagal memuat host otomatis, menggunakan fallback bawaan.');
    }

    const defaultHosts = [
      { id: 'uguu', label: 'UGUU.SE' },
      { id: 'catbox', label: 'CATBOX.MOE' },
      { id: 'tmpfiles', label: 'TMPFILES.ORG' },
      { id: 'quax', label: 'QUAX.IO' },
      { id: 'datanodes', label: 'DATANODES' }
    ];
    setHosts(defaultHosts);
    setSelectedHost(defaultHosts[0].id);
    setLoadingHosts(false);
  };

  useEffect(() => {
    fetchAvailableHosts();
  }, []);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      sound.playClick();
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      sound.playClick();
      setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const removeFile = (index) => {
    sound.playClick();
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const copyToClipboard = (text) => {
    sound.playBeep();
    navigator.clipboard.writeText(text);
    showToast('Tautan berhasil disalin ke clipboard!', 'success');
  };

  // 2. UPLOAD MULTI-FILES MENGGUNAKAN NATIVE FETCH API
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      showToast('Pilih setidaknya 1 file untuk diunggah!', 'error');
      return;
    }

    sound.playClick();
    setLoading(true);
    const results = [];
    const totalFiles = selectedFiles.length;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: { status: 'mengunggah', progress: 50 },
        }));

        try {
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch(`/api/tools/upload?host=${encodeURIComponent(selectedHost)}`, {
            method: 'POST',
            body: formData,
          });

          const textResponse = await res.text();
          let data;
          try {
            data = JSON.parse(textResponse);
          } catch {
            data = { result: textResponse };
          }

          if (!res.ok) {
            throw new Error(data.error || data.message || `HTTP ${res.status}`);
          }

          const fileUrl = data.result || data.url || data.file || (typeof data === 'string' ? data : null);

          const result = {
            fileName: file.name,
            fileSize: (file.size / 1024).toFixed(2) + ' KB',
            url: fileUrl,
            host: selectedHost,
            success: true,
            timestamp: new Date().toLocaleTimeString(),
          };

          results.push(result);

          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: { status: 'berhasil', progress: 100 },
          }));

          showToast(`${file.name} berhasil diunggah! (${i + 1}/${totalFiles})`, 'success');
        } catch (fileError) {
          const errorResult = {
            fileName: file.name,
            fileSize: (file.size / 1024).toFixed(2) + ' KB',
            error: fileError.message || 'Gagal mengunggah file',
            success: false,
            timestamp: new Date().toLocaleTimeString(),
          };

          results.push(errorResult);

          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: { status: 'gagal', progress: 0 },
          }));

          showToast(`${file.name} gagal diunggah: ${errorResult.error}`, 'error');
        }
      }

      setUploadResults(results);

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        sound.playBeep();
        showToast(`Unggah selesai! ${successCount} berhasil${failCount > 0 ? `, ${failCount} gagal` : ''}`, 'success');
      }
    } catch (error) {
      showToast(`Kesalahan proses: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const currentHostObj = hosts.find((h) => h.id === selectedHost) || { label: selectedHost || 'PILIH HOST' };

  return (
    <>
      <Seo title="Multi-Host File Uploader" path="/tools/upload" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* Toast Notifikasi */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 18px',
                borderRadius: '14px',
                background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                backdropFilter: 'blur(16px)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              }}
            >
              {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header>
          <div className="badge ok" style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="var(--a2)" />
            <span>CLOUD STORAGE DISPATCHER</span>
          </div>
          <h1>Multi-Host File Uploader</h1>
          <p>Unggah file ke berbagai hosting serverless secara otomatis via Native Fetch.</p>
        </header>

        {/* Form Panel */}
        <motion.div
          className="glass card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* HOST SELECTION MENGGUNAKAN DROPDOWN LIST */}
          <div className="field" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={14} color="var(--a2)" /> Pilih Server Target
              </label>
              <button
                type="button"
                onClick={fetchAvailableHosts}
                style={{ background: 'none', border: 'none', color: 'var(--a2)', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={12} className={loadingHosts ? 'animate-spin' : ''} />
                <span>Auto-Refresh Hosts ({hosts.length})</span>
              </button>
            </div>

            {/* Custom Dropdown Trigger */}
            <motion.div
              className="dropdown-trigger glass"
              onClick={() => {
                sound.playClick();
                setDropdownOpen(!dropdownOpen);
              }}
              whileTap={{ scale: 0.99 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="pulse-indicator" />
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>
                  {currentHostObj.label}
                </span>
              </div>
              <motion.div animate={{ rotate: dropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={18} color="var(--muted)" />
              </motion.div>
            </motion.div>

            {/* Dropdown Menu Popup */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  className="dropdown-menu glass"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 4, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                >
                  {hosts.map((h) => {
                    const isSelected = selectedHost === h.id;
                    return (
                      <div
                        key={h.id}
                        className={`dropdown-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          sound.playClick();
                          setSelectedHost(h.id);
                          setDropdownOpen(false);
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{h.label}</span>
                        {isSelected && <Check size={16} color="var(--a2)" />}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              margin: '14px 0',
              padding: '36px 20px',
              borderRadius: '18px',
              border: `2px dashed ${dragActive ? 'var(--a2)' : 'var(--border)'}`,
              background: dragActive ? 'rgba(56, 189, 248, 0.1)' : 'rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <motion.div whileHover={{ scale: 1.05 }}>
              <UploadCloud size={44} color={dragActive ? 'var(--a2)' : 'var(--muted)'} style={{ margin: '0 auto 10px' }} />
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>
                Klik untuk memilih file atau seret & lepas ke sini
              </strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                Target Server Terpilih: {selectedHost.toUpperCase()}
              </span>
            </motion.div>
          </div>

          {/* File Queue */}
          {selectedFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  Antrean File ({selectedFiles.length})
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Bersihkan Semua
                </button>
              </div>

              {selectedFiles.map((file, i) => {
                const prog = uploadProgress[file.name];
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '10px 14px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <File size={16} color="var(--a2)" />
                        <span style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                          {file.name}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(i);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {prog && prog.status === 'mengunggah' && (
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
                        <motion.div
                          style={{ height: '100%', background: 'linear-gradient(90deg, var(--a1), var(--a2))' }}
                          animate={{ width: ['0%', '100%'] }}
                          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <motion.button
            className="btn primary full"
            disabled={loading || selectedFiles.length === 0}
            onClick={handleUpload}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            style={{ padding: '14px' }}
          >
            {loading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <RefreshCw size={16} />
                </motion.div>
                <span>Mengirim Paket via Native Fetch…</span>
              </>
            ) : (
              <>
                <UploadCloud size={16} />
                <span>Mulai Unggah Semua File ({selectedFiles.length})</span>
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Results Stream */}
        {uploadResults.length > 0 && (
          <motion.div
            className="glass card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3>Riwayat Unggahan Sesi Ini</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {uploadResults.map((res, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: res.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${res.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    {res.success ? <CheckCircle2 size={18} color="#34d399" /> : <AlertCircle size={18} color="#f87171" />}
                    <div>
                      <strong style={{ fontSize: '0.85rem', display: 'block' }}>{res.fileName}</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                        {res.fileSize} · [{res.host?.toUpperCase()}] · {res.timestamp}
                      </span>
                    </div>
                  </div>

                  {res.success && res.url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        readOnly
                        value={res.url}
                        className="input"
                        style={{ padding: '6px 10px', fontSize: '0.75rem', maxWidth: '240px' }}
                      />
                      <motion.button
                        className="btn"
                        onClick={() => copyToClipboard(res.url)}
                        whileTap={{ scale: 0.92 }}
                        style={{ padding: '8px' }}
                        title="Salin Tautan"
                      >
                        <Copy size={14} />
                      </motion.button>
                      <a href={res.url} target="_blank" rel="noreferrer" className="btn" style={{ padding: '8px' }} title="Buka Tautan">
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  )}

                  {!res.success && (
                    <span style={{ fontSize: '0.78rem', color: '#f87171', fontFamily: 'var(--font-mono)' }}>
                      Gagal: {res.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <style jsx>{`
        .dropdown-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border);
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .dropdown-trigger:hover {
          border-color: var(--a2);
        }
        .pulse-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--a2);
          box-shadow: 0 0 10px var(--a2);
        }
        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 50;
          padding: 6px;
          border-radius: 16px;
          background: #0d121d !important;
          border: 1px solid var(--border);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .dropdown-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 10px;
          color: var(--text);
          cursor: pointer;
          transition: background 0.15s;
        }
        .dropdown-option:hover {
          background: rgba(56, 189, 248, 0.12);
        }
        .dropdown-option.selected {
          background: rgba(56, 189, 248, 0.18);
          color: var(--a2);
        }
      `}</style>
    </>
  );
}