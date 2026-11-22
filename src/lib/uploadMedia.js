import { mediaKind } from '@/src/lib/chatUser';

/**
 * Unggah otomatis file/gambar ke host publik lewat /api/tools/upload dan kembalikan URL-nya.
 * Mencoba beberapa host berurutan sampai ada yang berhasil. Gambar diperkecil dulu di browser.
 */
export const UPLOAD_HOSTS = ['Catbox', 'Tmpfiles', 'Uguu', 'Poners', 'Telegraph', 'Litterbox'];
export const MAX_UPLOAD_MB = 4.5; // aman untuk batas payload hosting serverless

const loadImg = (file) => new Promise((ok, no) => {
  const u = URL.createObjectURL(file);
  const i = new Image();
  i.onload = () => { URL.revokeObjectURL(u); ok(i); };
  i.onerror = () => { URL.revokeObjectURL(u); no(new Error('Gambar tidak dapat dibaca')); };
  i.src = u;
});

/** Perkecil gambar (maks 1600px, JPEG/WebP). GIF/SVG dibiarkan apa adanya. */
export async function shrinkImage(file, maxEdge = 1600, quality = 0.84) {
  if (!/^image\/(jpeg|png|webp|bmp|avif)$/i.test(file.type)) return file;
  try {
    const img = await loadImg(file);
    const k = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    if (k === 1 && file.size < 900 * 1024) return file;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch { return file; }
}

/** Ambil URL http(s) pertama dari hasil host yang bentuknya beragam (string/objek/array). */
export function pickUrl(v) {
  if (!v) return '';
  if (typeof v === 'string') {
    const t = v.trim();
    const m = t.match(/https?:\/\/[^\s"'<>]+/);
    return m ? m[0] : '';
  }
  if (Array.isArray(v)) { for (const x of v) { const u = pickUrl(x); if (u) return u; } return ''; }
  if (typeof v === 'object') {
    for (const k of ['url', 'direct_url', 'link', 'src', 'file', 'data']) { const u = pickUrl(v[k]); if (u) return u; }
    for (const x of Object.values(v)) { const u = pickUrl(x); if (u) return u; }
  }
  return '';
}

function post(host, file, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/tools/upload?host=${encodeURIComponent(host)}`);
    xhr.responseType = 'text';
    xhr.timeout = 120000;
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    xhr.onload = () => {
      let j = {}; try { j = JSON.parse(xhr.responseText); } catch { j = { result: xhr.responseText }; }
      if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(j.error || j.message || `HTTP ${xhr.status}`));
      const url = pickUrl(j.result ?? j.url);
      if (!url) return reject(new Error('Host tidak mengembalikan URL'));
      resolve(url);
    };
    xhr.onerror = () => reject(new Error('Jaringan terputus'));
    xhr.ontimeout = () => reject(new Error('Waktu unggah habis'));
    if (signal) signal.addEventListener('abort', () => { xhr.abort(); reject(new Error('Dibatalkan')); }, { once: true });
    const fd = new FormData();
    fd.append('file', file, file.name);
    xhr.send(fd);
  });
}

/**
 * @returns {Promise<{url, type, name, size, mime, host}>}
 * @param opts.onProgress (0..1)  opts.signal AbortSignal  opts.hosts daftar host berurutan
 */
export async function uploadMedia(input, opts = {}) {
  let file = input;
  if (!(file instanceof File)) throw new Error('File tidak valid');
  file = await shrinkImage(file);
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`Ukuran file maksimal ${MAX_UPLOAD_MB} MB`);
  let lastErr;
  for (const host of opts.hosts || UPLOAD_HOSTS) {
    try {
      const url = await post(host, file, opts.onProgress, opts.signal);
      return { url, host, name: file.name, size: file.size, mime: file.type || '', type: mediaKind(file.type, file.name) };
    } catch (e) {
      lastErr = e;
      if (e.message === 'Dibatalkan') throw e;
    }
  }
  throw new Error(`Gagal mengunggah: ${lastErr?.message || 'semua host gagal'}`);
}

/** Data URL / Blob → File (untuk gambar hasil tempel atau hasil AI). */
export function dataUrlToFile(dataUrl, name = 'image.png') {
  const [h, b] = dataUrl.split(',');
  const mime = (h.match(/data:([^;]+)/) || [])[1] || 'image/png';
  const bin = atob(b); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: mime });
}
