/** Pesan error NextAuth → bahasa yang ramah. Dipakai halaman /auth, /auth/guest, /auth/oauth. */
const MAP = {
  CredentialsSignin: 'Email atau password salah.',
  OAuthSignin: 'Gagal memulai login dengan provider. Coba lagi.',
  OAuthCallback: 'Provider menolak atau gagal memproses login.',
  OAuthCreateAccount: 'Tidak bisa membuat akun dari provider tersebut.',
  OAuthAccountNotLinked: 'Email ini sudah terdaftar dengan metode lain. Masuk dengan metode awal.',
  EmailCreateAccount: 'Tidak bisa membuat akun dengan email tersebut.',
  Callback: 'Terjadi kesalahan saat proses login.',
  AccessDenied: 'Akses ditolak.',
  Verification: 'Tautan verifikasi tidak valid atau kedaluwarsa.',
  SessionRequired: 'Silakan masuk terlebih dahulu.',
  Configuration: 'Konfigurasi autentikasi server bermasalah.',
  Default: 'Terjadi kesalahan autentikasi.',
};

export function authErrorMessage(code) {
  const c = Array.isArray(code) ? code[0] : code;
  if (!c) return '';
  return MAP[c] || String(c).slice(0, 160);
}

/** Skor kekuatan password 0–4 (hanya untuk indikator UI). */
export function passwordStrength(pw = '') {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) score = Math.min(score, 1);
  return Math.min(score, 4);
}
