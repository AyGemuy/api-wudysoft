import axios from "axios";
class Urlbox {
  constructor() {
    try {
      console.log("[LOG: INIT] Mengonfigurasi Axios client dengan header lengkap...");
      this.client = axios.create({
        baseURL: "https://urlbox.com",
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          cookie: "initial_landing_page=/; ",
          origin: "https://urlbox.com",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://urlbox.com/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      console.log("[LOG: INIT] Axios client dengan header lengkap siap digunakan.");
    } catch (err) {
      console.error("[LOG: ERROR] Gagal mengonfigurasi Axios client:", err?.message);
      throw err;
    }
  }
  async dl(imgUrl) {
    console.log("[LOG: DOWNLOAD] Memulai proses pengunduhan gambar...");
    try {
      console.log(`[LOG: DOWNLOAD] Menghubungi URL biner: ${imgUrl}`);
      const res = await axios.get(imgUrl, {
        responseType: "arraybuffer"
      });
      console.log("[LOG: DOWNLOAD] Pengunduhan biner selesai.");
      return {
        status: res?.status || 200,
        buffer: res?.data || null,
        contentType: res?.headers?.["content-type"] || "image/png"
      };
    } catch (err) {
      console.error("[LOG: ERROR] Gagal mengunduh biner gambar:", err?.message);
      throw err;
    }
  }
  async generate({
    url,
    ...rest
  }) {
    console.log("[LOG: GENERATE] Menyiapkan parameter payload...");
    try {
      const targetUrl = url || "apple.com";
      const payload = {
        url: targetUrl,
        width: 1440,
        height: 1024,
        full_page: false,
        selector: "",
        dark_mode: false,
        hide_cookie_banners: true,
        format: "png",
        ...rest
      };
      console.log("[LOG: GENERATE] Mengirim permintaan payload ke API Urlbox...", JSON.stringify(payload));
      const res = await this.client.post("/api/render", payload);
      console.log("[LOG: GENERATE] Respons berhasil diterima dari API.");
      const imgUrl = res?.data?.screenshotUrl;
      if (!imgUrl) {
        throw new Error("Properti screenshotUrl tidak ditemukan pada data respons.");
      }
      console.log(`[LOG: GENERATE] URL Screenshot berhasil didapatkan: ${imgUrl}`);
      const result = await this.dl(imgUrl);
      console.log("[LOG: GENERATE] Seluruh rangkaian proses berhasil diselesaikan.");
      return result;
    } catch (err) {
      console.error("[LOG: ERROR] Kegagalan pada proses eksekusi generate:", err?.response?.data || err?.message);
      throw err;
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
  const api = new Urlbox();
  try {
    const data = await api.generate(params);
    res.setHeader("Content-Type", data?.contentType || "image/png");
    return res.status(data?.status || 200).send(data?.buffer);
  } catch (error) {
    const errorMessage = error?.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}