import { signOut } from 'next-auth/react';

/** Navigasi penuh (reload) — menjamin sesi & konten segar setelah login/logout. */
export function hardGo(url) {
  window.location.assign(url);
}

/** Keluar tanpa bergantung pada NEXTAUTH_URL (yang sering bernilai localhost di server). */
export async function logout(to = '/') {
  try {
    await signOut({ redirect: false });
  } catch {}
  window.location.assign(to);
}
