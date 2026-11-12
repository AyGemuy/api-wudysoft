import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '@/components/Seo';
import {
  FileCode,
  Download,
  Link as LinkIcon,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  UploadCloud,
  FileText
} from 'lucide-react';
import { sound } from '@/src/lib/interactiveEffects';

export default function BeautifyPage() {
  const fileInputRef = useRef(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Memproses Code…');
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Eksekusi Beautify dari URL langsung
  const executeBeautify = async (targetUrl) => {
    setLoading(true);
    setLoadingText('Merapikan struktur kode…');

    try {
      const res = await fetch(`/api/tools/beauty-js?url=${encodeURIComponent(targetUrl)}`);
      if (!res.ok) throw new Error(`Gagal memproses: ${res.statusText}`);

      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Beautified.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      sound.playBeep();
      showToast('Berhasil! File Beautified.zip telah diunduh.', 'success');
      setUrl('');
    } catch (err) {
      showToast(err.message || 'Terjadi kesalahan saat beautify code.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit URL manual
  const handleBeautifyUrl = (e) => {
    e?.preventDefault();
    if (!url.trim()) {
      showToast('Masukkan URL file JS / Zip terlebih dahulu!', 'error');
      return;
    }
    sound.playClick();
    executeBeautify(url.trim());
  };

  // 3. AUTO UPLOAD & AUTO BEAUTIFY SAAT DROP FILE
  const processDroppedFile = async (file) => {
    if (!file) return;

    sound.playClick();
    setLoading(true);
    setLoadingText(`Mengunggah ${file.name}…`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Upload file ke temporary host (Uguu/Catbox/Tmpfiles)
      const uploadRes = await fetch('/api/tools/upload', {
        method: 'POST',
        body: formData,
      });

      const text = await uploadRes.text();
      let uploadData;
      try {
        uploadData = JSON.parse(text);
      } catch {
        uploadData = { result: text };
      }

      if (!uploadRes.ok) {
        throw new Error(uploadData?.error || 'Gagal mengunggah file untuk diproses');
      }

      const fileUploadedUrl = uploadData.result || uploadData.url || uploadData.file;
      if (!fileUploadedUrl) throw new Error('URL file hasil upload tidak ditemukan');

      showToast(`File ${file.name} terunggah, memulai proses beautify…`, 'success');
      
      // Otomatis beautify URL hasil upload
      await executeBeautify(fileUploadedUrl);
    } catch (error) {
      showToast(error.message || 'Gagal memproses file.', 'error');
      setLoading(false);
    }
  };

  // Drag and Drop Handlers
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
      const file = e.dataTransfer.files[0];
      processDroppedFile(file);
    }
  };

  return (
    <>
      <Seo title="Code Beautifier & Unpacker" path="/tools/beautify" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Toast Notification */}
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
            <span>CYBER CODE ENHANCER</span>
          </div>
          <h1>Code Beautifier & Unpacker</h1>
          <p>Drop file JavaScript/ZIP atau masukkan URL untuk format kode instan & auto-download.</p>
        </header>

        {/* Main Panel */}
        <motion.div
          className="glass card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* AUTO UPLOAD DROP ZONE */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '36px 20px',
              borderRadius: '18px',
              border: `2px dashed ${dragActive ? 'var(--a2)' : 'var(--border)'}`,
              background: dragActive ? 'rgba(56, 189, 248, 0.12)' : 'rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '16px',
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".js,.zip"
              onChange={(e) => {
                if (e.target.files?.[0]) processDroppedFile(e.target.files[0]);
              }}
              style={{ display: 'none' }}
            />
            <motion.div whileHover={{ scale: 1.03 }}>
              <UploadCloud size={44} color={dragActive ? 'var(--a2)' : 'var(--muted)'} style={{ margin: '0 auto 10px' }} />
              <strong style={{ display: 'block', fontSize: '1rem', color: '#fff' }}>
                Drop File JS / ZIP ke sini (Otomatis Upload & Beautify)
              </strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                atau klik untuk memilih file dari komputer/ponsel
              </span>
            </motion.div>
          </div>

          <div style={{ textAlign: 'center', margin: '4px 0 14px', fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            ── ATAU MASUKKAN URL FILE SECARA LANGSUNG ──
          </div>

          {/* URL Form */}
          <form onSubmit={handleBeautifyUrl} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LinkIcon size={14} color="var(--a2)" /> Target File URL (.js / .zip)
              </label>
              <input
                type="url"
                className="input"
                placeholder="https://example.com/assets/app.min.js atau .zip"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                <FileArchive size={16} color="var(--a2)" />
                <span>Auto Package Output: Beautified.zip</span>
              </div>

              <motion.button
                type="submit"
                className="btn primary"
                disabled={loading || !url.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ padding: '12px 24px' }}
              >
                {loading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <RefreshCw size={16} />
                    </motion.div>
                    <span>{loadingText}</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Beautify & Download Zip</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>

        {/* Info Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <motion.div className="glass card" whileHover={{ y: -3 }}>
            <FileCode size={24} color="var(--a2)" />
            <strong style={{ marginTop: '8px', display: 'block' }}>Format JS Bersih</strong>
            <p style={{ fontSize: '0.8rem' }}>Merapikan indentasi, deobfuscate variabel, dan struktur sintaks JavaScript terkompresi.</p>
          </motion.div>

          <motion.div className="glass card" whileHover={{ y: -3 }}>
            <FileArchive size={24} color="var(--a3)" />
            <strong style={{ marginTop: '8px', display: 'block' }}>Auto Zip Compression</strong>
            <p style={{ fontSize: '0.8rem' }}>Hasil file langsung diekspor ke format arsip ZIP siap pakai secara aman.</p>
          </motion.div>
        </div>
      </div>
    </>
  );
}