import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '@/components/Seo';
import { Zap, User, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react';
import AuthHero, { AuthScene } from '@/components/AuthHero';
import { sound } from '@/src/lib/interactiveEffects';
import { safeNext } from '@/src/lib/safeNext';
import { hardGo, goAfterLogin } from '@/src/lib/nav';
import { toast } from '@/src/lib/toast';
import { authErrorMessage } from '@/src/lib/authErrors';

export default function GuestPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const setError = (m) => { if (m) toast.err(m); };

  const nextUrl = safeNext(router.query.next, '/playground');

  // 1. Redirect jika sudah login (tunggu query siap)
  useEffect(() => {
    if (!router.isReady) return;
    if (status === 'authenticated' && session?.user) {
      hardGo(nextUrl);
    }
  }, [router.isReady, status, session, nextUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Eksekusi Login Tamu via NextAuth
  const handleStartGuest = async (e) => {
    e?.preventDefault();
    sound.playClick();
    setBusy(true);
    setError('');

    const targetDestination = nextUrl;

    try {
      const res = await signIn('guest', {
        redirect: false,
        callbackUrl: targetDestination,
        name: name.trim(),
      });

      if (res?.error) {
        throw new Error(authErrorMessage(res.error) || 'Gagal memulai sesi tamu');
      }

      goAfterLogin(targetDestination);
    } catch (err) {
      setError(err.message || 'Terjadi gangguan jaringan');
      setBusy(false);
    }
  };

  return (
    <>
      <Seo title="Masuk Sebagai Tamu" path="/auth/guest" description="Eksplorasi tanpa mendaftar akun." noindex />

      <div className="center">
        <AuthScene>
        <motion.div
          className="auth-card glass"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >
          {/* Top Icon HUD */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <AuthHero mode="guest" />
            <h2>Sesi Tamu Instan</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Inisialisasi akses cepat tanpa email & kata sandi.
            </p>
          </div>

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
              href={router.query.next ? `/auth?next=${encodeURIComponent(nextUrl)}` : '/auth'}
              className="muted-link"
              onClick={() => sound.playClick()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Pilihan Login</span>
            </Link>
          </div>
        </motion.div>
        </AuthScene>
      </div>
    </>
  );
}