import axios from "axios";
const BASE = "https://api.apps.web.id/joox";
const HEADERS = {
  accept: "*/*",
  "accept-language": "id-ID",
  "cache-control": "no-cache",
  origin: "https://afianf.vercel.app",
  pragma: "no-cache",
  referer: "https://afianf.vercel.app/",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
};
class Joox {
  constructor() {
    this.req = axios.create({
      baseURL: BASE,
      headers: HEADERS
    });
  }
  async get(path, params = {}) {
    console.log(`[GET] ${path}`, params);
    try {
      const {
        data
      } = await this.req.get(path, {
        params: params
      });
      console.log(`[OK] ${path}`);
      return data;
    } catch (e) {
      console.error(`[ERR] ${path} —`, e?.message || e);
      return null;
    }
  }
  async find(q) {
    console.log(`[find] mencari: "${q}"`);
    try {
      const data = await this.get("/search", {
        q: q
      });
      console.log(`[find] selesai`);
      return data;
    } catch (e) {
      console.error(`[find] gagal —`, e?.message || e);
      return null;
    }
  }
  async single(id) {
    console.log(`[single] ambil detail id: ${id}`);
    try {
      const d = await this.get("/single", {
        id: id
      });
      console.log(`[single] selesai id: ${id}`);
      return {
        mp3: d?.mp3Url || null,
        m4a: d?.m4aUrl || null,
        cover: d?.imgSrc || null,
        hifi: d?.has_hifi ?? false
      };
    } catch (e) {
      console.error(`[single] gagal —`, e?.message || e);
      return {};
    }
  }
  async lrc(id) {
    console.log(`[lrc] ambil lirik id: ${id}`);
    try {
      const l = await this.get("/lyrics", {
        id: id
      });
      const raw = l?.lyric || null;
      const lyric = raw ? Buffer.from(raw, "base64").toString("utf-8") : null;
      console.log(`[lrc] selesai id: ${id}`);
      return {
        lyric: lyric
      };
    } catch (e) {
      console.error(`[lrc] gagal —`, e?.message || e);
      return {
        lyric: null
      };
    }
  }
  async search({
    query,
    limit = 5,
    detail = true,
    lyric = true,
    ...rest
  }) {
    console.log(`[search] mulai — query: "${query}", limit: ${limit}, detail: ${detail}, lyric: ${lyric}`);
    try {
      const res = await this.find(query);
      const items = res?.section_list?.[0]?.item_list || [];
      console.log(`[search] total item: ${items.length}`);
      const songs = [];
      for (const item of items) {
        const info = item?.song?.[0]?.song_info;
        if (!info) continue;
        const base = {
          id: info?.id || null,
          name: info?.name || "Unknown",
          artist: info?.artist_list?.[0]?.name || "Unknown",
          album: info?.album_name || "Unknown",
          thumb: info?.images?.[0]?.url || null,
          duration: info?.play_duration || 0
        };
        console.log(`[search] proses [${songs.length + 1}/${limit}]: "${base.name}" — ${base.artist}`);
        let detailResult = {};
        let lyricResult = {};
        if (detail && base.id) {
          console.log(`[search] ambil detail: "${base.name}"`);
          detailResult = await this.single(base.id);
          console.log(`[search] detail OK: "${base.name}"`);
          if (lyric) {
            console.log(`[search] ambil lirik: "${base.name}"`);
            lyricResult = await this.lrc(base.id);
            console.log(`[search] lirik OK: "${base.name}"`);
          }
        }
        songs.push({
          ...base,
          ...detailResult,
          ...lyricResult
        });
        console.log(`[search] ditambahkan: "${base.name}" (${songs.length}/${limit})`);
        if (songs.length >= limit) break;
      }
      console.log(`[search] selesai — total: ${songs.length} lagu`);
      return songs;
    } catch (e) {
      console.error(`[search] error —`, e?.message || e);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new Joox();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}