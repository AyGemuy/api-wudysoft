import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '@/components/Seo';
import { Key, ArrowLeft, RefreshCw, ChevronRight, Zap } from 'lucide-react';
import { sound } from '@/src/lib/interactiveEffects';

const PROVIDER_ICONS = {
  github: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  ),
  google: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  ),
};

export default function OAuthPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [providers, setProviders] = useState(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.replace(router.query.next || '/playground');
    }
  }, [status, session, router]);

  useEffect(() => {
    fetch('/api/oauth/providers')
      .then((r) => r.json())
      .then((d) => setProviders(d.providers || []))
      .catch(() => {
        setProviders([
          { key: 'github', label: 'GitHub', enabled: true },
          { key: 'google', label: 'Google', enabled: true },
        ]);
      });
  }, []);

  const handleOAuthSignIn = (providerKey) => {
    sound.playClick();
    const destination = router.query.next || '/playground';
    signIn(providerKey, { callbackUrl: destination });
  };

  return (
    <>
      <Seo title="Otorisasi OAuth" path="/auth/oauth" description="Masuk dengan akun GitHub atau Google." noindex />
      <div className="center">
        <motion.div
          className="auth-card glass"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >
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
              whileHover={{ rotate: 15, scale: 1.05 }}
            >
              <Key size={26} color="var(--a2)" />
            </motion.div>
            <h2>Pilih Provider</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Sambungkan akun terverifikasi kamu secara instan.
            </p>
          </div>

          <AnimatePresence>
            {router.query.error && (
              <motion.div
                className="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {router.query.error}
              </motion.div>
            )}
          </AnimatePresence>

          {!providers ? (
            <div style={{ textAlign: 'center', padding: '18px', color: 'var(--muted)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                style={{ display: 'inline-block', marginBottom: '6px' }}
              >
                <RefreshCw size={18} />
              </motion.div>
              <div>Memeriksa Protokol OAuth…</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {providers.map((p, i) => {
                const isReady = p.enabled !== false;
                const Icon = PROVIDER_ICONS[p.key] || <Zap size={18} />;

                return (
                  <motion.button
                    key={p.key}
                    type="button"
                    className="btn full"
                    onClick={() => isReady && handleOAuthSignIn(p.key)}
                    disabled={!isReady}
                    style={{
                      justifyContent: 'flex-start',
                      padding: '12px 16px',
                      opacity: isReady ? 1 : 0.45,
                      cursor: isReady ? 'pointer' : 'not-allowed',
                      border: isReady ? '1px solid var(--border)' : '1px dashed var(--border)',
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: isReady ? 1 : 0.45, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={isReady ? { scale: 1.02, x: 2 } : {}}
                    whileTap={isReady ? { scale: 0.98 } : {}}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>{Icon}</span>
                    <span style={{ flex: 1, textAlign: 'left', marginLeft: '10px', fontSize: '0.88rem' }}>
                      Lanjutkan dengan {p.label}
                    </span>
                    {!isReady ? (
                      <span style={{ fontSize: '0.68rem', color: '#f87171', fontFamily: 'var(--font-mono)' }}>
                        Belum Diatur
                      </span>
                    ) : (
                      <ChevronRight size={14} color="var(--a2)" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

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