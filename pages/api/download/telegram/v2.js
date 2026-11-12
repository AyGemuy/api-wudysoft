import axios from "axios";
class Telegram {
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
  async download({
    url,
    ...rest
  }) {
    console.log("[dl] url:", url);
    try {
      const {
        data
      } = await this.http.get("/telegram/detail", {
        params: {
          url: url,
          ...rest
        }
      });
      console.log("[detail] ok:", data?.title);
      return data;
    } catch (e) {
      console.error("[detail] err:", e?.message || e);
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
  const api = new Telegram();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}