import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession, signIn, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '@/components/Seo';
import { Icons } from '@/components/Icons';
import { sound } from '@/src/lib/interactiveEffects';

export default function AuthPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Auto redirect instan jika user sudah login
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const destination = router.query.next || '/';
      router.replace(destination);
    }
  }, [status, session, router]);

  // Tombol Tamu: Langsung sign-in dan replace ke /
  const loginGuest = async () => {
    sound.playClick();
    setLoading(true);
    setErr('');
    try {
      const target = router.query.next || '/';
      const res = await signIn('guest', { redirect: false, callbackUrl: target });
      if (res?.error) {
        setErr(res.error);
        setLoading(false);
      } else {
        router.replace(target);
      }
    } catch (e) {
      setErr('Terjadi gangguan saat login tamu.');
      setLoading(false);
    }
  };

  const loginCredentials = async (e) => {
    e.preventDefault();
    sound.playClick();
    setLoading(true);
    setErr('');
    try {
      const target = router.query.next || '/';
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
        callbackUrl: target,
      });
      if (res?.error) {
        setErr(res.error);
        setLoading(false);
      } else {
        router.replace(target);
      }
    } catch (e) {
      setErr('Gagal menghubungkan ke server.');
      setLoading(false);
    }
  };

  if (session?.user) {
    return (
      <>
        <Seo title="Sesi Terverifikasi" path="/auth" noindex />
        <div className="center">
          <motion.div
            className="glass auth-card text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <Icons.ShieldCheck size={44} color="var(--a2)" />
            </div>
            <div className="badge ok" style={{ margin: '4px auto 10px' }}>SESSION ACTIVE</div>
            <h3>{session.user.name}</h3>
            <p style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)', wordBreak: 'break-all' }}>
              {session.user.email}
            </p>

            <div style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>
              <button
                className="btn primary full"
                onClick={() => {
                  sound.playClick();
                  router.push(router.query.next || '/');
                }}
              >
                <span>Masuk ke Dashboard</span>
                <Icons.ArrowRight size={16} />
              </button>
              <button
                className="btn full"
                style={{ color: '#f87171' }}
                onClick={() => {
                  sound.playClick();
                  signOut({ callbackUrl: '/auth' });
                }}
              >
                <Icons.LogOut size={16} /> Ganti Akun / Logout
              </button>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Otorisasi Akses" path="/auth" noindex />
      <div className="center">
        <motion.div
          className="glass auth-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
              <Icons.Lock size={36} color="var(--a2)" />
            </div>
            <h2>Otorisasi Akses</h2>
            <p style={{ fontSize: '0.8rem' }}>Masuk ke cluster API Wudysoft atau via OAuth.</p>
          </div>

          <AnimatePresence>
            {err && (
              <motion.div className="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {err}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={loginCredentials} style={{ display: 'grid', gap: '12px' }}>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icons.Mail size={13} color="var(--a2)" /> Email
              </label>
              <input
                type="email"
                className="input"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@mail.com"
              />
            </div>

            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icons.Key size={13} color="var(--a2)" /> Password
              </label>
              <input
                type="password"
                className="input"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn primary full" disabled={loading} style={{ marginTop: '4px' }}>
              {loading ? 'Memverifikasi…' : 'Masuk dengan Akun'} <Icons.ArrowRight size={16} />
            </button>
          </form>

          <div style={{ textAlign: 'center', margin: '4px 0', fontSize: '0.72rem', color: 'var(--muted)' }}>
            ── ATAU OAUTH & GUEST ──
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            <button
              type="button"
              className="btn full"
              onClick={() => signIn('github', { callbackUrl: router.query.next || '/' })}
            >
              Masuk dengan GitHub
            </button>

            <button
              type="button"
              className="btn full"
              onClick={() => signIn('google', { callbackUrl: router.query.next || '/' })}
            >
              Masuk dengan Google
            </button>

            <button
              type="button"
              className="btn full"
              onClick={loginGuest}
              disabled={loading}
              style={{ borderColor: 'var(--a2)' }}
            >
              <Icons.Zap size={16} color="var(--a2)" /> Masuk Instan (Tamu)
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}