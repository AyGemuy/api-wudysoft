/** Helper identitas gaya WhatsApp: @username, warna nama, inisial. Dipakai server (API rooms) & klien. */

const slug = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 16);

/** "Budi Santoso" + id → "budi_santoso" (+ 4 karakter terakhir id agar unik, mis. budi_santoso·3f2a). */
export function handleOf(name, userId) {
  const base = slug(name) || 'user';
  const tail = String(userId || '').replace(/[^a-z0-9]/gi, '').slice(-4).toLowerCase();
  return tail ? `${base}_${tail}` : base;
}

const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };

/** Warna nama pengirim yang stabil per pengguna (seperti nama di grup WhatsApp). */
export function colorOf(key) {
  const h = hash(key || 'x') % 360;
  return `color-mix(in srgb, hsl(${h} 78% 56%) 78%, var(--text))`;
}
export function bgOf(key) {
  const h = hash(key || 'x') % 360;
  return `linear-gradient(135deg, hsl(${h} 70% 52%), hsl(${(h + 40) % 360} 70% 42%))`;
}
export const initialOf = (name) => (String(name || '?').trim()[0] || '?').toUpperCase();

export const mediaKind = (mime = '', name = '') => {
  const m = String(mime).toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  const ext = String(name).split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'opus', 'aac'].includes(ext)) return 'audio';
  return 'file';
};
