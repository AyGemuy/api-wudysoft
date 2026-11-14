import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSession, signIn, signOut, getProviders } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '@/components/Seo';
import { Icons } from '@/components/Icons';
import { PROVIDER_ICONS, PROVIDER_LABELS } from '@/components/ProviderIcons';
import { sound } from '@/src/lib/interactiveEffects';
import { safeNext } from '@/src/lib/safeNext';
import { authErrorMessage, passwordStrength } from '@/src/lib/authErrors';

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const STRENGTH_LABEL = ['Terlalu lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'];

function pwProblem(pw) {
  if (pw.length < 8) return 'Minimal 8 karakter';
  if (pw.length > 72) return 'Maksimal 72 karakter';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Harus ada huruf dan angka';
  return '';
}

export default function AuthPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [mode, setMode] = useState('signin'); // signin | signup
  const [busy, setBusy] = useState(''); // '', 'form', 'guest', provider-id
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [providers, setProviders] = useState([]);

  const nextUrl = safeNext(router.query.next, '/');
  const isSignup = mode === 'signup';

  // sinkronkan mode & error dari URL
  useEffect(() => {
    if (!router.isReady) return;
    setMode(router.query.mode === 'signup' ? 'signup' : 'signin');
    if (router.query.error) setErr(authErrorMessage(router.query.error));
  }, [router.isReady, router.query.mode, router.query.error]);

  // sudah login → arahkan
  useEffect(() => {
    if (!router.isReady) return;
    if (status === 'authenticated' && session?.user) router.replace(nextUrl);
  }, [router.isReady, status, session, nextUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // provider OAuth yang benar-benar aktif di server
  useEffect(() => {
    getProviders()
      .then((p) => setProviders(Object.values(p || {}).filter((x) => x.type === 'oauth')))
      .catch(() => setProviders([]));
  }, []);

  const switchMode = (m) => {
    if (m === mode) return;
    sound.playClick();
    setErr('');
    setInfo('');
    setMode(m);
    const query = { ...router.query };
    if (m === 'signup') query.mode = 'signup';
    else delete query.mode;
    delete query.error;
    router.replace({ pathname: '/auth', query }, undefined, { shallow: true });
  };

  const strength = useMemo(() => passwordStrength(password), [password]);

  const problems = useMemo(() => {
    const p = {};
    if (email && !EMAIL_RE.test(email.trim())) p.email = 'Format email tidak valid';
    if (isSignup && password) {
      const m = pwProblem(password);
      if (m) p.password = m;
    }
    if (isSignup && confirm && confirm !== password) p.confirm = 'Password tidak sama';
    return p;
  }, [email, password, confirm, isSignup]);

  const canSubmit =
    EMAIL_RE.test(email.trim()) &&
    password.length > 0 &&
    (!isSignup || (!pwProblem(password) && confirm === password));

  const finish = (target) => {
    sound.playBeep();
    router.replace(target);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    sound.playClick();
    setBusy('form');
    setErr('');
    setInfo('');
    try {
      const res = await signIn(isSignup ? 'signup' : 'credentials', {
        redirect: false,
        callbackUrl: nextUrl,
        email: email.trim(),
        password,
        ...(isSignup ? { name: name.trim() } : {}),
      });
      if (res?.error) {
        setErr(authErrorMessage(res.error));
        setBusy('');
        return;
      }
      setInfo(isSignup ? 'Akun dibuat! Mengalihkan…' : 'Berhasil masuk. Mengalihkan…');
      finish(nextUrl);
    } catch {
      setErr('Gagal menghubungi server. Periksa koneksi lalu coba lagi.');
      setBusy('');
    }
  };

  const guest = async () => {
    if (busy) return;
    sound.playClick();
    setBusy('guest');
    setErr('');
    try {
      const res = await signIn('guest', { redirect: false, callbackUrl: nextUrl });
      if (res?.error) {
        setErr(authErrorMessage(res.error));
        setBusy('');
      } else finish(nextUrl);
    } catch {
      setErr('Terjadi gangguan saat membuat sesi tamu.');
      setBusy('');
    }
  };

  const oauth = (id) => {
    if (busy) return;
    sound.playClick();
    setBusy(id);
    signIn(id, { callbackUrl: nextUrl });
  };

  if (status === 'loading') {
    return (
      <div className="center">
        <div className="badge">Memeriksa sesi…</div>
      </div>
    );
  }

  if (session?.user) {
    return (
      <>
        <Seo title="Sesi Terverifikasi" path="/auth" noindex />
        <div className="center">
          <motion.div className="glass auth-card text-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <Icons.ShieldCheck size={44} color="var(--a2)" />
            </div>
            <div className="badge ok" style={{ margin: '4px auto 10px' }}>SESSION ACTIVE</div>
            <h3>{session.user.name}</h3>
            <p style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)', wordBreak: 'break-all' }}>
              {session.user.email || 'Sesi tamu'}
            </p>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <button className="btn primary full" onClick={() => router.push(nextUrl)}>
                <span>Masuk ke Dashboard</span>
                <Icons.ArrowRight size={16} />
              </button>
              <button className="btn full" style={{ color: '#f87171' }} onClick={() => signOut({ callbackUrl: '/auth' })}>
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
      <Seo title={isSignup ? 'Daftar Akun' : 'Otorisasi Akses'} path="/auth" noindex />
      <div className="center">
        <motion.div className="glass auth-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
              {isSignup ? <Icons.Sparkles size={34} color="var(--a2)" /> : <Icons.Lock size={34} color="var(--a2)" />}
            </div>
            <h2>{isSignup ? 'Buat Akun Baru' : 'Otorisasi Akses'}</h2>
            <p style={{ fontSize: '0.8rem' }}>
              {isSignup ? 'Daftar dengan email, atau lanjutkan dengan GitHub / Google.' : 'Masuk ke cluster API atau via OAuth.'}
            </p>
          </div>

          {/* Tab Masuk / Daftar */}
          <div className="auth-tabs" role="tablist">
            {[
              { id: 'signin', label: 'Masuk' },
              { id: 'signup', label: 'Daftar' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={mode === t.id}
                className={`auth-tab ${mode === t.id ? 'active' : ''}`}
                onClick={() => switchMode(t.id)}
              >
                {mode === t.id && <motion.span layoutId="authTab" className="auth-tab-bg" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                <span className="auth-tab-label">{t.label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {(err || info) && (
              <motion.div
                key={err || info}
                className={err ? 'alert' : 'alert ok-alert'}
                role={err ? 'alert' : 'status'}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {err || info}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 12 }}>
            <AnimatePresence initial={false}>
              {isSignup && (
                <motion.div
                  key="name"
                  className="field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <label htmlFor="a-name" className="lbl"><Icons.User size={13} color="var(--a2)" /> Nama (opsional)</label>
                  <input id="a-name" className="input" autoComplete="name" maxLength={32} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama tampilan" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="field">
              <label htmlFor="a-email" className="lbl"><Icons.Mail size={13} color="var(--a2)" /> Email</label>
              <input
                id="a-email"
                type="email"
                name="email"
                className="input"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@mail.com"
                aria-invalid={!!problems.email}
              />
              {problems.email && <small className="hint bad">{problems.email}</small>}
            </div>

            <div className="field">
              <label htmlFor="a-pass" className="lbl"><Icons.Key size={13} color="var(--a2)" /> Password</label>
              <div className="pw-wrap">
                <input
                  id="a-pass"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  className="input"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignup ? 'Min. 8 karakter, huruf & angka' : '••••••••'}
                  aria-invalid={!!problems.password}
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}>
                  {showPw ? 'Sembunyi' : 'Lihat'}
                </button>
              </div>
              {isSignup && password && (
                <div className="meter" aria-live="polite">
                  <div className="meter-bars">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={i <= strength ? `on s${strength}` : ''} />
                    ))}
                  </div>
                  <small className={`hint ${problems.password ? 'bad' : ''}`}>{problems.password || STRENGTH_LABEL[strength]}</small>
                </div>
              )}
            </div>

            <AnimatePresence initial={false}>
              {isSignup && (
                <motion.div
                  key="confirm"
                  className="field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <label htmlFor="a-conf" className="lbl"><Icons.ShieldCheck size={13} color="var(--a2)" /> Konfirmasi password</label>
                  <input
                    id="a-conf"
                    type={showPw ? 'text' : 'password'}
                    className="input"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Ulangi password"
                    aria-invalid={!!problems.confirm}
                  />
                  {problems.confirm && <small className="hint bad">{problems.confirm}</small>}
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" className="btn primary full" disabled={!canSubmit || !!busy} style={{ marginTop: 2 }}>
              {busy === 'form' ? 'Memproses…' : isSignup ? 'Daftar & Masuk' : 'Masuk dengan Akun'} <Icons.ArrowRight size={16} />
            </button>
          </form>

          <div className="divider"><span>atau lanjutkan dengan</span></div>

          {providers.length > 0 && (
            <div className="prov-grid" style={{ gridTemplateColumns: providers.length > 1 ? '1fr 1fr' : '1fr' }}>
              {providers.map((p) => (
                <button key={p.id} type="button" className="btn" disabled={!!busy} onClick={() => oauth(p.id)}>
                  {PROVIDER_ICONS[p.id] ? PROVIDER_ICONS[p.id](17) : <Icons.Key size={16} />}
                  <span>{busy === p.id ? 'Mengalihkan…' : PROVIDER_LABELS[p.id] || p.name}</span>
                </button>
              ))}
            </div>
          )}

          <button type="button" className="btn full" onClick={guest} disabled={!!busy} style={{ borderColor: 'var(--a2)' }}>
            <Icons.Zap size={16} color="var(--a2)" /> {busy === 'guest' ? 'Membuat sesi…' : 'Masuk Instan (Tamu)'}
          </button>

          <p className="auth-foot">
            {isSignup ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
            <button type="button" className="link-btn" onClick={() => switchMode(isSignup ? 'signin' : 'signup')}>
              {isSignup ? 'Masuk' : 'Daftar gratis'}
            </button>
            {' · '}
            <Link href={`/auth/guest${router.query.next ? `?next=${encodeURIComponent(nextUrl)}` : ''}`} className="link-btn">
              Tamu dengan nama
            </Link>
          </p>
          {!isSignup && (
            <p className="auth-foot" style={{ marginTop: -4 }}>
              Mendaftar lewat GitHub/Google? Gunakan tombol provider di atas.
            </p>
          )}
        </motion.div>
      </div>

      <style jsx>{`
        .auth-tabs {
          display: flex;
          padding: 4px;
          gap: 4px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--bg1) 45%, transparent);
          border: 1px solid var(--border);
        }
        .auth-tab {
          position: relative;
          flex: 1;
          padding: 9px 0;
          border: none;
          background: transparent;
          border-radius: 999px;
          color: var(--muted);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          cursor: pointer;
          transition: color 0.2s;
        }
        .auth-tab.active {
          color: var(--on-accent);
        }
        :global(.auth-tab-bg) {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--a1), var(--a3));
          box-shadow: 0 4px 14px var(--border-glow);
        }
        .auth-tab-label {
          position: relative;
        }
        .lbl {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pw-wrap {
          position: relative;
        }
        .pw-wrap :global(.input) {
          padding-right: 74px;
        }
        .pw-toggle {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          padding: 5px 9px;
          border: none;
          border-radius: 8px;
          background: color-mix(in srgb, var(--text) 8%, transparent);
          color: var(--muted);
          font-family: var(--font-mono);
          font-size: 0.68rem;
          cursor: pointer;
        }
        .hint {
          display: block;
          margin-top: 4px;
          font-size: 0.72rem;
          font-family: var(--font-mono);
          color: var(--muted);
        }
        .hint.bad {
          color: #f87171;
        }
        .meter {
          margin-top: 6px;
        }
        .meter-bars {
          display: flex;
          gap: 4px;
        }
        .meter-bars span {
          flex: 1;
          height: 4px;
          border-radius: 4px;
          background: color-mix(in srgb, var(--text) 12%, transparent);
          transition: background 0.25s;
        }
        .meter-bars span.on.s1 {
          background: #f87171;
        }
        .meter-bars span.on.s2 {
          background: #fbbf24;
        }
        .meter-bars span.on.s3 {
          background: #84cc16;
        }
        .meter-bars span.on.s4 {
          background: #34d399;
        }
        .divider {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--muted);
          font-size: 0.7rem;
          font-family: var(--font-mono);
        }
        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .prov-grid {
          display: grid;
          gap: 8px;
        }
        .auth-foot {
          text-align: center;
          font-size: 0.78rem;
          color: var(--muted);
        }
        .link-btn {
          background: none;
          border: none;
          padding: 0;
          color: var(--a2);
          font: inherit;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        :global(.ok-alert) {
          background: color-mix(in srgb, #34d399 14%, transparent) !important;
          border-color: color-mix(in srgb, #34d399 40%, transparent) !important;
          color: #34d399 !important;
        }
      `}</style>
    </>
  );
}
