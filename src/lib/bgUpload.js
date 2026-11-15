export const BG_UPLOAD_KEY = 'nexus_bg_upload';

const load = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('File bukan gambar yang valid')); };
    img.src = url;
  });

function encode(img, maxEdge, quality) {
  const k = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * k));
  c.height = Math.max(1, Math.round(img.naturalHeight * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

/** Perkecil gambar (maks 1920px, JPEG) lalu simpan di localStorage agar ringan & tahan refresh. */
export async function saveBackgroundFile(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Pilih file gambar (JPG, PNG, WebP).');
  if (file.size > 25 * 1024 * 1024) throw new Error('Ukuran file terlalu besar (maks 25 MB).');
  const img = await load(file);
  let data = encode(img, 1920, 0.82);
  if (data.length > 3_500_000) data = encode(img, 1280, 0.7);
  try {
    localStorage.setItem(BG_UPLOAD_KEY, data);
  } catch {
    throw new Error('Penyimpanan browser penuh. Coba gambar yang lebih kecil atau pakai tautan.');
  }
  window.dispatchEvent(new Event('nexus:bg-upload'));
  return { size: data.length };
}

export function readBackground() {
  try { return localStorage.getItem(BG_UPLOAD_KEY) || ''; } catch { return ''; }
}

export function clearBackground() {
  try { localStorage.removeItem(BG_UPLOAD_KEY); } catch {}
  window.dispatchEvent(new Event('nexus:bg-upload'));
}
