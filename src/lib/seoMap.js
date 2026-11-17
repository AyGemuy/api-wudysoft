/**
 * Metadata bawaan per rute. Dipakai <Seo /> sebagai nilai awal (judul, deskripsi, label gambar),
 * sehingga halaman tanpa props tetap punya pratinjau link yang sesuai isinya.
 * Halaman dinamis (mis. /paste/[key]) menimpa nilai ini dengan data kontennya sendiri.
 */
export const ROUTE_META = {
  '/': { title: 'Command Deck', tag: 'Beranda', description: 'Wudysoft: platform API, tools developer, dan ruang obrolan dalam satu dasbor bergaya Microsoft Fluent.' },
  '/playground': { title: 'API Playground', tag: 'Playground', description: 'Uji endpoint dari spesifikasi OpenAPI, kirim request, dan lihat respons secara real-time.' },
  '/stats': { title: 'System & API Stats', tag: 'Stats', description: 'Telemetri penggunaan API, log permintaan realtime, dan kesehatan sistem dalam satu dasbor.' },
  '/rooms': { title: 'Cyber Rooms', tag: 'Chat', description: 'Ruang obrolan real-time dengan banyak kanal untuk koordinasi cepat.' },
  '/tools/beautify': { title: 'Code Beautifier & Unpacker', tag: 'Tools', description: 'Rapikan, minify, dan buka bungkusan kode JavaScript, HTML, dan CSS dalam hitungan detik.' },
  '/tools/upload': { title: 'Multi-Host File Uploader', tag: 'Tools', description: 'Unggah file ke beberapa host sekaligus dan dapatkan tautan siap bagikan.' },
  '/tools/pastes': { title: 'Pastes', tag: 'Pastes', description: 'Simpan, edit, dan bagikan potongan teks atau kode dengan tautan singkat dan masa berlaku opsional.' },
  '/tools/code-share': { title: 'Code Share', tag: 'Code Share', description: 'Bagikan snippet kode, jelajahi karya komunitas, beri suka, dan salin dengan sekali klik.' },
  '/auth': { title: 'Masuk & Daftar', tag: 'Akun', description: 'Masuk atau daftar dengan email, GitHub, atau Google.' },
  '/auth/signup': { title: 'Daftar Akun', tag: 'Akun', description: 'Buat akun Wudysoft dalam hitungan detik.' },
  '/auth/guest': { title: 'Akses Tamu', tag: 'Akun', description: 'Coba Wudysoft tanpa mendaftar. Sesi tamu dibuat otomatis.' },
  '/auth/oauth': { title: 'Otorisasi OAuth', tag: 'Akun', description: 'Masuk dengan akun GitHub atau Google.' },
  '/profile': { title: 'Profil Saya', tag: 'Profil', description: 'Kelola profil dan pengaturan akun Wudysoft.' },
};

export const DEFAULT_META = {
  title: 'Wudysoft',
  tag: 'Wudysoft',
  description: 'Wudysoft: platform API, tools developer, dan komunitas dengan tampilan Microsoft Fluent.',
};

export function routeMeta(pathname = '/') {
  const p = (pathname || '/').split('?')[0].replace(/\/+$/, '') || '/';
  return ROUTE_META[p] || DEFAULT_META;
}
