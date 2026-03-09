import axios from "axios";
class ArtStation {
  constructor() {
    this.http = axios.create({
      baseURL: "https://api2.apps.web.id/artstation",
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
    this.slug = url => url?.match(/artwork\/([a-zA-Z0-9]+)/)?.[1] || url;
  }
  async download({
    url,
    ...rest
  }) {
    const slug = this.slug(url);
    console.log(`[download] fetch post: ${slug}`);
    try {
      const res = await this.http.get(`/post/${slug}`, {
        ...rest
      });
      const data = res?.data;
      console.log(`[download] judul: "${data?.title}" | assets: ${data?.assets?.length || 0}`);
      const result = data;
      return {
        result: result
      };
    } catch (err) {
      console.error(`[download] gagal:`, err?.response?.data || err?.message);
      return {
        result: null
      };
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
  const api = new ArtStation();
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