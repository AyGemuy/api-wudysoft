import axios from "axios";
class AnimeNotExist {
  constructor() {
    this.lvls = ["0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1.0", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "2.0"];
  }
  rndHost() {
    return Math.ceil(Math.random() * 10) === 10 ? "www.thiswaifudoesnotexist.net" : "thisanimedoesnotexist.ai";
  }
  rndUrl(host) {
    const hostname = host ? host : this.rndHost();
    if (hostname === "www.thiswaifudoesnotexist.net") {
      const id = Math.ceil(Math.random() * 99999);
      const v2 = Math.floor(Math.random() * 2);
      const path = `/${v2 ? "v2/" : ""}example-${id}.jpg`;
      return {
        hostname: hostname,
        path: path,
        id: String(id)
      };
    }
    const lvl = this.lvls[this.lvls.length * Math.random() | 0];
    const id = String(Math.floor(Math.random() * 1e5)).padStart(5, "0");
    const path = `/results/psi-${lvl}/seed${id}.png`;
    return {
      hostname: hostname,
      path: path,
      id: id
    };
  }
  async generate({
    all,
    host,
    ...rest
  } = {}) {
    const isAll = all === true || all === "true" ? true : false;
    try {
      console.log("[LOG] Inisialisasi request AI Waifu...");
      const meta = this.rndUrl(host);
      const fullUrl = `https://${meta?.hostname}${meta?.path}`;
      console.log(`[LOG] Menggunakan target: ${fullUrl}`);
      if (isAll) {
        console.log("[LOG] Mode JSON aktif, mengirim metadata...");
        return {
          status: true,
          result: {
            id: meta?.id,
            hostname: meta?.hostname,
            path: meta?.path,
            url: fullUrl
          }
        };
      }
      console.log("[LOG] Mengunduh gambar binary...");
      const res = await axios.get(fullUrl, {
        params: rest || {},
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });
      console.log("[LOG] Gambar berhasil diunduh.");
      return {
        status: res?.status === 200 ? true : false,
        buffer: res?.data ? Buffer.from(res.data) : null,
        contentType: res?.headers?.["content-type"] || "image/jpeg"
      };
    } catch (err) {
      console.log(`[LOG ERROR] ${err?.message || "Gagal memproses gambar"}`);
      return {
        status: false,
        error: err?.response?.data || err?.message || "Gagal mengambil gambar"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new AnimeNotExist();
  try {
    const data = await api.generate(params);
    if (!data?.status) {
      return res.status(400).json(data);
    }
    if (data?.buffer) {
      res.setHeader("Content-Type", data?.contentType || "image/jpeg");
      return res.status(200).send(data.buffer);
    }
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error?.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}