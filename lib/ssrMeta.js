/** Helper sisi server untuk halaman SSR: origin dari header request + ringkasan teks untuk deskripsi meta. */
export function originFromReq(req) {
  const proto = String(req.headers['x-forwarded-proto'] || (req.socket?.encrypted ? 'https' : 'http')).split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return host ? `${proto}://${host}` : '';
}

export const snippet = (text, n = 180) => {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

/** Dokumen Mongoose -> objek polos yang aman untuk props Next.js (tanggal jadi ISO string). */
export const plain = (doc) => JSON.parse(JSON.stringify(doc?.toObject ? doc.toObject() : doc));
