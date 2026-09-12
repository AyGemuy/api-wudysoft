import axios from "axios";
class LazadaScraper {
  constructor() {
    this.api = "https://api.apps.web.id";
    this.client = axios.create({
      baseURL: this.api
    });
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log(`[Proses] Menarik data dari: ${url}`);
      const response = await this.client.get("/lazada/images", {
        params: {
          url: url
        },
        ...rest
      });
      const data = response?.data || {};
      const {
        images: rawImages,
        ...info
      } = data;
      const result = (rawImages || []).map(img => ({
        ...img,
        src: img.src?.startsWith("http") ? img.src : `https:${img.src}`,
        poster: img.poster?.startsWith("http") ? img.poster : `https:${img.poster}`
      }));
      console.log(`[Sukses] Berhasil mendapatkan ${result.length} gambar.`);
      return {
        result: result,
        ...info
      };
    } catch (error) {
      console.error(`[Error] Gagal download: ${error?.message || "Unknown Error"}`);
      return {
        result: [],
        error: true
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
  const api = new LazadaScraper();
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