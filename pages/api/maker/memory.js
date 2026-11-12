import apiConfig from "@/configs/apiConfig";
import Html from "@/data/html/memory/list";
import axios from "axios";
class MemoryGen {
  constructor() {
    this.client = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}`,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36"
      },
      timeout: 6e4
    });
  }
  async down(url) {
    console.log(`[LOG] Mulai download data gambar dari URL: ${url}`);
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 6e4
      });
      const buffer = Buffer.from(res.data);
      const contentType = res.headers["content-type"] || "image/png";
      return {
        buffer: buffer,
        contentType: contentType
      };
    } catch (error) {
      console.error(`[LOG: GAGAL] Gagal mendownload data dari URL. Error: ${error.message}`);
      throw new Error(`Download Failed: ${error.message}`);
    }
  }
  async generate({
    template = 1,
    name,
    type = "v5",
    ...rest
  }) {
    console.log("[LOG] Memulai proses generate gambar...");
    try {
      const finalWidth = rest?.width || 1280;
      const finalHeight = rest?.height || 720;
      const htmlContent = Html({
        template: template,
        name: name,
        ...rest
      });
      const payload = {
        html: htmlContent,
        width: finalWidth,
        height: finalHeight
      };
      console.log("[LOG] Mengirim permintaan ke API generator...");
      const apiRes = await this.client.post(`/api/tools/html2img/${type}`, payload);
      const imageUrlFromApi = apiRes.data?.url;
      if (!imageUrlFromApi) {
        const errorMessage = apiRes.data?.message || "URL gambar tidak ditemukan di respon API.";
        console.error(`[LOG: GAGAL] ${errorMessage}`);
        throw new Error(errorMessage);
      }
      console.log(`[LOG] Sukses mendapatkan URL (${imageUrlFromApi}). Melanjutkan ke proses download...`);
      const imageData = await this.down(imageUrlFromApi);
      console.log("[LOG] Proses generate dan download selesai.");
      return imageData;
    } catch (error) {
      const errMsg = error.message.includes("Download Failed") ? error.message : error.response?.data?.message || error.message || "Terjadi kesalahan tidak terduga.";
      console.error(`[LOG: ERROR UTAMA] Gagal dalam proses generate. Pesan: ${errMsg}`);
      throw new Error(`Image Generation Error: ${errMsg}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.name) {
    return res.status(400).json({
      error: "Parameter 'name' diperlukan"
    });
  }
  try {
    const api = new MemoryGen();
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    console.error("Terjadi kesalahan di handler API:", error.message);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}