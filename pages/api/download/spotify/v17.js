import axios from "axios";
class Spotify {
  constructor() {
    this.http = axios.create({
      baseURL: "https://api.apps.web.id",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://afianf.vercel.app",
        pragma: "no-cache",
        referer: "https://afianf.vercel.app/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async info(url) {
    console.log("[info]", url);
    try {
      const {
        data: {
          result,
          ...info
        }
      } = await this.http.get("/spotify/info", {
        params: {
          url: url
        }
      });
      console.log("[info] ok:", result?.name);
      return {
        ...result,
        ...info
      };
    } catch (e) {
      console.error("[info] err:", e?.message || e);
      throw e;
    }
  }
  async start(gid, id) {
    console.log("[start] gid:", gid, "id:", id);
    try {
      const {
        data: {
          result,
          ...info
        }
      } = await this.http.get(`/spotify/start/${gid}/${id}`);
      console.log("[start] ok:", result?.tid);
      return {
        ...result,
        ...info,
        download_url: "https://api.fabdl.com" + (result?.download_url || "")
      };
    } catch (e) {
      console.error("[start] err:", e?.message || e);
      throw e;
    }
  }
  async download({
    url,
    ...rest
  }) {
    console.log("[dl] url:", url);
    try {
      const track = await this.info(url);
      const dl = await this.start(track?.gid || rest?.gid, track?.id || rest?.id);
      console.log("[dl] ready:", track?.name, "-", track?.artists);
      return {
        ...track,
        ...dl
      };
    } catch (e) {
      console.error("[dl] err:", e?.message || e);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new Spotify();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}