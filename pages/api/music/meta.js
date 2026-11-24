import { withApiLog } from "@/lib/apiLogger.cjs";

/**
 * GET /api/music/meta?id=<videoId>        → { title, author, description, thumb }
 * GET /api/music/meta?list=<playlistId>   → { title, author, items: [{ id, title, author, thumb }] }
 * Mengambil metadata publik YouTube di server (tanpa API key) agar pemutar bisa menampilkan
 * sampul, judul, artis, deskripsi, dan daftar lagu. Hasil di-cache sebentar.
 */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const ID_RE = /^[\w-]{11}$/;
const LIST_RE = /^[\w-]{10,64}$/;
const cache = new Map();
const TTL = 30 * 60 * 1000;

const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const txt = (o) => (o ? o.simpleText || (o.runs || []).map((r) => r.text).join("") : "") || "";

async function get(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "id,en;q=0.8" }, signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally { clearTimeout(t); }
}

/** Ambil objek JSON setelah penanda `var ytInitialXxx =` dengan menyeimbangkan kurung kurawal. */
function extractJson(html, marker) {
  const i = html.indexOf(marker);
  if (i < 0) return null;
  const start = html.indexOf("{", i);
  let depth = 0; let inStr = false; let esc = false;
  for (let k = start; k < html.length; k++) {
    const c = html[k];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) { try { return JSON.parse(html.slice(start, k + 1)); } catch { return null; } }
  }
  return null;
}

async function video(id) {
  let title = ""; let author = ""; let description = "";
  try {
    const o = JSON.parse(await get(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`));
    title = o.title || ""; author = o.author_name || "";
  } catch {}
  try {
    const html = await get(`https://www.youtube.com/watch?v=${id}&hl=id`);
    const pr = extractJson(html, "ytInitialPlayerResponse");
    const d = pr?.videoDetails;
    if (d) { title = title || d.title || ""; author = author || d.author || ""; description = d.shortDescription || ""; }
  } catch {}
  if (!title && !author) throw new Error("Video tidak ditemukan");
  return { id, title, author, description: description.slice(0, 1200), thumb: thumb(id) };
}

async function playlist(list) {
  const html = await get(`https://www.youtube.com/playlist?list=${list}&hl=id`);
  const data = extractJson(html, "ytInitialData");
  if (!data) throw new Error("Playlist tidak ditemukan");
  const title = data?.metadata?.playlistMetadataRenderer?.title || "";
  const owner = txt(data?.sidebar?.playlistSidebarRenderer?.items?.[1]?.playlistSidebarSecondaryInfoRenderer?.videoOwner?.videoOwnerRenderer?.title);
  const description = data?.metadata?.playlistMetadataRenderer?.description || "";
  const items = [];
  const walk = (n) => {
    if (!n || typeof n !== "object" || items.length >= 100) return;
    if (n.playlistVideoRenderer) {
      const v = n.playlistVideoRenderer;
      if (v.videoId) items.push({ id: v.videoId, title: txt(v.title), author: txt(v.shortBylineText), duration: v.lengthText?.simpleText || "", thumb: thumb(v.videoId) });
      return;
    }
    for (const k of Object.keys(n)) walk(n[k]);
  };
  walk(data);
  if (!items.length) throw new Error("Playlist kosong atau privat");
  return { list, title, author: owner, description: description.slice(0, 1200), items };
}

async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
  const id = String(req.query.id || "");
  const list = String(req.query.list || "");
  if (!ID_RE.test(id) && !LIST_RE.test(list)) return res.status(400).json({ success: false, message: "Parameter id atau list tidak valid" });
  const key = ID_RE.test(id) ? `v:${id}` : `l:${list}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return res.status(200).json({ success: true, data: hit.d });
  try {
    const d = ID_RE.test(id) ? await video(id) : await playlist(list);
    if (cache.size > 300) cache.clear();
    cache.set(key, { t: Date.now(), d });
    return res.status(200).json({ success: true, data: d });
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || "Gagal mengambil metadata" });
  }
}

export default withApiLog(handler);
