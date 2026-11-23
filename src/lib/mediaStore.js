/** Helper bersama untuk penyimpanan media chat (/api/media). Aman dipakai di klien & server. */

export const MEDIA_URL_RE = /^\/api\/media\/[0-9a-f]{24}$/i;

/** Hanya tipe yang aman ditampilkan inline; selain itu (SVG, HTML, dst.) dipaksa unduh. */
const INLINE = /^(image\/(png|jpe?g|gif|webp|avif|bmp)|video\/(mp4|webm|quicktime|ogg)|audio\/(mpeg|mp3|ogg|wav|x-wav|aac|mp4|x-m4a|webm|flac|opus)|application\/pdf|text\/plain)$/i;
export const isInlineSafe = (mime = "") => INLINE.test(String(mime));

export function kindFromMime(mime = "", name = "") {
  const m = String(mime).toLowerCase();
  if (m.startsWith("image/") && m !== "image/svg+xml") return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  const ext = String(name).split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "avif"].includes(ext)) return "image";
  if (["mp4", "webm", "mov", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "m4a", "opus", "aac"].includes(ext)) return "audio";
  return "file";
}

/** ID lampiran milik kita dari sebuah URL relatif/absolut, atau null. */
export function ownMediaId(url = "") {
  const m = /(?:^|\/)api\/media\/([0-9a-f]{24})(?:[?#].*)?$/i.exec(String(url));
  return m ? m[1] : null;
}
