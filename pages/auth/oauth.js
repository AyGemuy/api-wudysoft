import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signIn, getProviders } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '@/components/Seo';
import { Key, ArrowLeft, RefreshCw, ChevronRight, Zap } from 'lucide-react';
import { sound } from '@/src/lib/interactiveEffects';
import { safeNext } from '@/src/lib/safeNext';
import { goAfterLogin } from '@/src/lib/nav';
import { toast } from '@/src/lib/toast';
import { authErrorMessage } from '@/src/lib/authErrors';
import { PROVIDER_ICONS as ICONS, PROVIDER_LABELS } from '@/components/ProviderIcons';

export default function OAuthPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [providers, setProviders] = useState(null);

  const nextUrl = safeNext(router.query.next, '/playground');

  useEffect(() => {
    if (!router.isReady) return;
    if (status === 'authenticated' && session?.user) {
      goAfterLogin(nextUrl);
    }
  }, [router.isReady, status, session, nextUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (router.isReady && router.query.error) toast.err(authErrorMessage(router.query.error));
  }, [router.isReady, router.query.error]);

  useEffect(() => {
    // Provider aktif langsung dari konfigurasi NextAuth di server
    getProviders()
      .then((p) => {
        const active = Object.values(p || {}).filter((x) => x.type === 'oauth').map((x) => x.id);
        setProviders(
          ['github', 'google'].map((key) => ({ key, label: PROVIDER_LABELS[key], enabled: active.includes(key) }))
        );
      })
      .catch(() => setProviders([]));
  }, []);

  const handleOAuthSignIn = (providerKey) => {
    sound.playClick();
    const destination = nextUrl;
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
                const Icon = ICONS[p.key] ? ICONS[p.key](18) : <Zap size={18} />;

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
                      <span style={{ fontSize: '0.68rem', color: 'var(--err)', fontFamily: 'var(--font-mono)' }}>
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
      </div>
    </>
  );
}