import { signOut } from 'next-auth/react';
import { sound } from '@/src/lib/interactiveEffects';

/** Navigasi penuh (reload) — menjamin sesi & konten segar setelah login/logout. */
export function hardGo(url, delay = 0) {
  if (delay > 0) setTimeout(() => window.location.assign(url), delay);
  else window.location.assign(url);
}

/** Suara sukses login, lalu pindah halaman setelah nadanya selesai. Welcome dilewati agar tidak dobel. */
export function goAfterLogin(url) {
  try { sessionStorage.setItem('wd_welcomed', '1'); } catch {}
  const ms = sound.play('success');
  hardGo(url, ms ? Math.min(900, ms * 1000) : 0);
}

/** Keluar tanpa bergantung pada NEXTAUTH_URL (yang sering bernilai localhost di server). */
export async function logout(to = '/') {
  const ms = sound.play('logout');
  try {
    await signOut({ redirect: false });
  } catch {}
  try { sessionStorage.removeItem('wd_welcomed'); } catch {}
  setTimeout(() => window.location.assign(to), ms ? Math.min(900, ms * 1000) : 0);
}
