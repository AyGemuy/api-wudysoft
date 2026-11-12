import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '@/components/Seo';
import { Zap, User, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react';
import { sound } from '@/src/lib/interactiveEffects';

export default function GuestPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // 1. Redirect jika sudah login
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.replace(router.query.next || '/playground');
    }
  }, [status, session, router]);

  // 2. Eksekusi Login Tamu via NextAuth
  const handleStartGuest = async (e) => {
    e?.preventDefault();
    sound.playClick();
    setBusy(true);
    setError('');

    const targetDestination = router.query.next || '/playground';

    try {
      const res = await signIn('guest', {
        redirect: false,
        callbackUrl: targetDestination,
      });

      if (res?.error) {
        throw new Error(res.error || 'Gagal memulai sesi tamu');
      }

      sound.playBeep();
      router.replace(targetDestination);
    } catch (err) {
      setError(err.message || 'Terjadi gangguan jaringan');
      setBusy(false);
    }
  };

  return (
    <>
      <Seo title="Masuk Sebagai Tamu" path="/auth/guest" description="Eksplorasi tanpa mendaftar akun." noindex />

      <div className="center">
        <motion.div
          className="auth-card glass"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >
          {/* Top Icon HUD */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <motion.div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
              }}
              whileHover={{ rotate: 12, scale: 1.05 }}
            >
              <Zap size={28} color="var(--a2)" />
            </motion.div>
            <h2>Sesi Tamu Instan</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Inisialisasi akses cepat tanpa email & kata sandi.
            </p>
          </div>

          {/* Alert Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Input */}
          <form onSubmit={handleStartGuest} style={{ display: 'grid', gap: '14px' }}>
            <div className="field">
              <label htmlFor="guest-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={13} color="var(--a2)" /> Codename / Nama Tampilan (Opsional)
              </label>
              <input
                id="guest-name"
                className="input"
                value={name}
                maxLength={32}
                placeholder="Misal: Shadow, Ghost, Hunter (Atau biarkan kosong)..."
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <motion.button
              type="submit"
              className="btn primary full"
              disabled={busy}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ padding: '13px' }}
            >
              {busy ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <RefreshCw size={16} />
                  </motion.div>
                  <span>Menginisialisasi Node…</span>
                </>
              ) : (
                <>
                  <span>Mulai Eksplorasi Tamu</span>
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          {/* Link Kembali */}
          <div style={{ textAlign: 'center', marginTop: '6px' }}>
            <Link
              href={router.query.next ? `/auth?next=${encodeURIComponent(router.query.next)}` : '/auth'}
              className="muted-link"
              onClick={() => sound.playClick()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Pilihan Login</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
}