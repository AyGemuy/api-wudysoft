import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Seo from '@/components/Seo';
import { Icons } from '@/components/Icons';
import { sound } from '@/src/lib/interactiveEffects';
import { logout } from '@/src/lib/nav';
import { passwordStrength } from '@/src/lib/authErrors';

const STRENGTH_LABEL = ['Terlalu lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'];
const fmtDate = (v) => (v ? new Date(v).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const pwProblem = (pw) =>
  pw.length < 8 ? 'Minimal 8 karakter' : pw.length > 72 ? 'Maksimal 72 karakter' : !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? 'Harus ada huruf dan angka' : '';

/** Kecilkan foto ke 160×160 JPEG (≤ ~60 KB) sebelum dikirim. */
async function resizeToAvatar(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Gunakan gambar JPEG, PNG, atau WebP.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Ukuran file terlalu besar (maks 8 MB).');
  const bmp = await createImageBitmap(file);
  const size = 160;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const side = Math.min(bmp.width, bmp.height);
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  for (const q of [0.85, 0.7, 0.55, 0.4]) {
    const url = canvas.toDataURL('image/jpeg', q);
    if (Math.ceil((url.length * 3) / 4) <= 55 * 1024) return url;
  }
  throw new Error('Foto terlalu kompleks untuk dikecilkan. Coba gambar lain.');
}

function Avatar({ src, name, size = 88 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div className="pf-avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {src && !failed ? (
        <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span>{(name || 'U').trim()[0]?.toUpperCase() || 'U'}</span>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const sUser = session?.user;
  const fileRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState('');
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const flash = (type, text) => setMsg({ type, text });

  const apply = useCallback((p) => {
    setProfile(p);
    setName(p.name || '');
    setBio(p.bio || '');
  }, []);

  // data terbaru dari database (bukan hanya isi token sesi)
  useEffect(() => {
    if (status !== 'authenticated') return;
    let alive = true;
    fetch('/api/profile', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok && d.ok) apply(d.profile);
        else setLoadErr(d.message || 'Gagal memuat profil.');
      })
      .catch(() => alive && setLoadErr('Tidak dapat menghubungi server.'));
    return () => { alive = false; };
  }, [status, apply]);

  const call = async (method, body) => {
    const r = await fetch('/api/profile', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) throw new Error(d.message || 'Gagal menyimpan.');
    return d;
  };

  const save = async (patch, okText, key = 'profile') => {
    if (busy) return;
    setBusy(key);
    flash('', '');
    try {
      const d = await call('PATCH', patch);
      apply(d.profile);
      await update(); // segarkan sesi NextAuth → header ikut berubah
      sound.playBeep();
      flash('ok', okText);
    } catch (e) {
      flash('err', e.message);
    } finally {
      setBusy('');
    }
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const avatarData = await resizeToAvatar(f);
      await save({ avatarData }, 'Foto profil diperbarui.', 'avatar');
    } catch (err) {
      flash('err', err.message);
    }
  };

  const changePw = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (pw.next !== pw.confirm) return flash('err', 'Konfirmasi password tidak sama.');
    const problem = pwProblem(pw.next);
    if (problem) return flash('err', problem);
    setBusy('pw');
    flash('', '');
    try {
      const d = await call('POST', { action: 'password', currentPassword: pw.current, newPassword: pw.next });
      apply(d.profile);
      setPw({ current: '', next: '', confirm: '' });
      sound.playBeep();
      flash('ok', 'Password berhasil diperbarui.');
    } catch (err) {
      flash('err', err.message);
    } finally {
      setBusy('');
    }
  };

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(sUser?.apiToken || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      flash('err', 'Tidak bisa menyalin. Salin manual dari kolom token.');
    }
  };

  if (status === 'loading') {
    return <div className="center"><div className="badge">Memuat profil…</div></div>;
  }
  if (status === 'unauthenticated' || !sUser) {
    return (
      <div className="center">
        <div className="glass auth-card text-center">
          <h3>Masuk untuk melihat profil</h3>
          <Link href="/auth?next=%2Fprofile" className="btn primary full" style={{ marginTop: 14 }}>Masuk atau daftar</Link>
        </div>
      </div>
    );
  }

  /* ------------ tamu ------------ */
  if (sUser.isGuest) {
    return (
      <>
        <Seo title="Profil" path="/profile" noindex />
        <div className="center">
          <motion.div className="glass auth-card text-center" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><Avatar name={sUser.name} /></div>
            <h3 style={{ marginTop: 10 }}>{sUser.name}</h3>
            <div className="badge" style={{ margin: '8px auto' }}>SESI TAMU</div>
            <p style={{ fontSize: '0.82rem' }}>Sesi tamu bersifat sementara dan tidak tersimpan di database. Daftar akun agar profil, foto, dan token API tersimpan permanen.</p>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <button className="btn primary full" onClick={() => logout('/auth?mode=signup&next=%2Fprofile')}>Buat akun</button>
              <button className="btn full" style={{ color: '#f87171' }} onClick={() => logout('/auth')}><Icons.LogOut size={16} /> Keluar</button>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  const p = profile || { ...sUser, providers: [], bio: '' };
  const strength = passwordStrength(pw.next);
  const dirty = profile && (name.trim() !== (profile.name || '') || bio.trim() !== (profile.bio || ''));
  const hasUploaded = (p.image || '').startsWith('/api/avatar/');

  return (
    <>
      <Seo title="Profil Saya" path="/profile" noindex />
      <div className="pf-page">
        <motion.section className="glass pf-card pf-hero" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <div className="pf-avatar-wrap">
            <Avatar src={p.image} name={p.name} size={96} />
            <button type="button" className="pf-cam" onClick={() => fileRef.current?.click()} disabled={!!busy} aria-label="Ganti foto profil" title="Ganti foto profil">
              <Icons.Upload size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />
          </div>
          <div className="pf-id">
            <h2>{p.name}</h2>
            <p className="pf-mail">{p.email}</p>
            <div className="pf-badges">
              <span className="badge ok">{p.provider}</span>
              <span className="badge">{p.role}</span>
              {p.emailVerified && <span className="badge ok">email terverifikasi</span>}
            </div>
            {p.image && (
              <button type="button" className="pf-link" disabled={!!busy} onClick={() => save({ removeAvatar: true }, 'Foto profil dihapus.', 'avatar')}>
                Hapus foto{hasUploaded ? '' : ' (dari provider)'}
              </button>
            )}
          </div>
        </motion.section>

        {(msg.text || loadErr) && (
          <div className={(msg.type === 'ok' ? 'alert ok-alert' : 'alert')} role={msg.type === 'ok' ? 'status' : 'alert'}>{msg.text || loadErr}</div>
        )}

        <section className="glass pf-card">
          <h3><Icons.User size={16} color="var(--a2)" /> Informasi profil</h3>
          <form
            className="pf-form"
            onSubmit={(e) => { e.preventDefault(); if (dirty) save({ name, bio }, 'Profil disimpan.'); }}
          >
            <div className="field">
              <label htmlFor="pf-name" className="lbl">Nama tampilan</label>
              <input id="pf-name" className="input" maxLength={32} value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
            </div>
            <div className="field">
              <label htmlFor="pf-bio" className="lbl">Bio <small style={{ opacity: 0.6 }}>({bio.length}/160)</small></label>
              <textarea id="pf-bio" className="input" rows={3} maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Ceritakan singkat tentang kamu" />
            </div>
            <button className="btn primary" type="submit" disabled={!dirty || !name.trim() || busy === 'profile'}>
              {busy === 'profile' ? 'Menyimpan…' : 'Simpan perubahan'}
            </button>
          </form>
        </section>

        <section className="glass pf-card">
          <h3><Icons.Server size={16} color="var(--a2)" /> Akun</h3>
          <dl className="pf-dl">
            <div><dt>Email</dt><dd>{p.email}</dd></div>
            <div><dt>Metode masuk</dt><dd>{[p.provider, ...(p.providers || []).map((x) => x.provider)].filter((v, i, a) => a.indexOf(v) === i).join(', ')}</dd></div>
            <div><dt>Bergabung</dt><dd>{fmtDate(p.createdAt)}</dd></div>
            <div><dt>Login terakhir</dt><dd>{fmtDate(p.lastLoginAt)}</dd></div>
            <div><dt>ID</dt><dd className="mono">{p.id}</dd></div>
          </dl>
        </section>

        <section className="glass pf-card">
          <h3><Icons.Key size={16} color="var(--a2)" /> {p.hasPassword ? 'Ganti password' : 'Buat password'}</h3>
          {!p.hasPassword && <p className="pf-note">Akun ini masuk lewat {p.provider}. Buat password agar bisa juga masuk dengan email.</p>}
          <form className="pf-form" onSubmit={changePw}>
            {p.hasPassword && (
              <div className="field">
                <label htmlFor="pf-cur" className="lbl">Password saat ini</label>
                <input id="pf-cur" type="password" className="input" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              </div>
            )}
            <div className="field">
              <label htmlFor="pf-new" className="lbl">Password baru</label>
              <input id="pf-new" type="password" className="input" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="Min. 8 karakter, huruf & angka" />
              {pw.next && <small className="pf-hint">{pwProblem(pw.next) || STRENGTH_LABEL[strength]}</small>}
            </div>
            <div className="field">
              <label htmlFor="pf-conf" className="lbl">Konfirmasi password baru</label>
              <input id="pf-conf" type="password" className="input" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              {pw.confirm && pw.confirm !== pw.next && <small className="pf-hint bad">Password tidak sama</small>}
            </div>
            <button className="btn" type="submit" disabled={busy === 'pw' || !pw.next || (p.hasPassword && !pw.current)}>
              {busy === 'pw' ? 'Menyimpan…' : p.hasPassword ? 'Perbarui password' : 'Simpan password'}
            </button>
          </form>
        </section>

        {sUser.apiToken && (
          <section className="glass pf-card">
            <h3><Icons.Terminal size={16} color="var(--a2)" /> Token API</h3>
            <p className="pf-note">Dipakai untuk endpoint yang membutuhkan Bearer token. Berlaku 7 hari sejak login. Jangan dibagikan.</p>
            <div className="pf-token">
              <input className="input mono" readOnly value={showToken ? sUser.apiToken : '•'.repeat(32)} aria-label="Token API" onFocus={(e) => showToken && e.target.select()} />
              <button type="button" className="btn" onClick={() => setShowToken((v) => !v)}>{showToken ? 'Sembunyi' : 'Lihat'}</button>
              <button type="button" className="btn" onClick={copyToken}>{copied ? 'Tersalin' : 'Salin'}</button>
            </div>
          </section>
        )}

        <button className="btn full pf-logout" onClick={() => logout('/')}><Icons.LogOut size={16} /> Keluar</button>
      </div>

      <style jsx>{`
        .pf-page { width: min(680px, 100%); margin: 0 auto; display: grid; gap: 16px; padding-bottom: 24px; }
        .pf-card { padding: clamp(16px, 4vw, 24px); border-radius: var(--radius); display: grid; gap: 14px; }
        .pf-card h3 { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; }
        .pf-hero { grid-template-columns: auto 1fr; align-items: center; gap: 18px; }
        .pf-avatar-wrap { position: relative; }
        :global(.pf-avatar) {
          border-radius: 50%; overflow: hidden; display: grid; place-items: center; font-weight: 800;
          color: var(--on-accent); background: linear-gradient(135deg, var(--a1), var(--a3));
          border: 2px solid color-mix(in srgb, var(--a2) 55%, transparent);
          box-shadow: 0 8px 24px -8px var(--border-glow);
        }
        :global(.pf-avatar img) { width: 100%; height: 100%; object-fit: cover; }
        .pf-cam {
          position: absolute; right: -2px; bottom: -2px; width: 30px; height: 30px; border-radius: 50%;
          display: grid; place-items: center; cursor: pointer; color: var(--on-accent);
          background: var(--a1); border: 2px solid var(--surface);
        }
        .pf-cam:disabled { opacity: 0.6; cursor: wait; }
        .pf-id { min-width: 0; display: grid; gap: 4px; }
        .pf-id h2 { font-size: 1.25rem; overflow-wrap: anywhere; }
        .pf-mail { font-size: 0.78rem; font-family: var(--font-mono); color: var(--muted); overflow-wrap: anywhere; }
        .pf-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
        .pf-link { justify-self: start; background: none; border: none; color: #f87171; font-size: 0.74rem; cursor: pointer; padding: 4px 0; }
        .pf-form { display: grid; gap: 12px; }
        .pf-note { font-size: 0.78rem; color: var(--muted); }
        .pf-hint { font-size: 0.72rem; color: var(--muted); }
        .pf-hint.bad { color: #f87171; }
        .pf-dl { display: grid; gap: 8px; }
        .pf-dl div { display: flex; justify-content: space-between; gap: 12px; font-size: 0.8rem; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
        .pf-dl div:last-child { border: none; padding: 0; }
        .pf-dl dt { color: var(--muted); flex-shrink: 0; }
        .pf-dl dd { text-align: right; overflow-wrap: anywhere; }
        .mono { font-family: var(--font-mono); font-size: 0.72rem; }
        .pf-token { display: flex; gap: 8px; flex-wrap: wrap; }
        .pf-token .input { flex: 1 1 200px; min-width: 0; }
        .pf-logout { color: #f87171; }
        @media (max-width: 480px) { .pf-hero { grid-template-columns: 1fr; justify-items: center; text-align: center; } .pf-badges { justify-content: center; } .pf-link { justify-self: center; } }
      `}</style>
    </>
  );
}
