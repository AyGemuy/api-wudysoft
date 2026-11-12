import axios from "axios";
class PlaceWaifu {
  constructor() {
    this.api = "https://placewaifu.com";
  }
  fmt(w, h, s) {
    return w && h ? `/image/${w}/${h}` : s ? `/image/${s}` : "/image";
  }
  async generate({
    size,
    width,
    height,
    all,
    ...rest
  }) {
    const isAll = typeof all === "boolean" ? all : false;
    try {
      console.log("[LOG] Inisialisasi request...");
      if (isAll) {
        console.log("[LOG] Mengambil semua daftar waifu...");
        const res = await axios.get(`${this.api}/images`, {
          params: rest || {}
        });
        console.log("[LOG] Data JSON berhasil diambil.");
        return {
          status: res?.status === 200 ? true : false,
          result: res?.data || []
        };
      }
      const path = this.fmt(width, height, size);
      console.log(`[LOG] Mengunduh gambar dari: ${this.api}${path}`);
      const res = await axios.get(`${this.api}${path}`, {
        params: rest || {},
        responseType: "arraybuffer"
      });
      console.log("[LOG] Gambar berhasil diunduh.");
      return {
        status: res?.status === 200 ? true : false,
        buffer: res?.data ? Buffer.from(res.data) : null,
        contentType: res?.headers?.["content-type"] || "image/svg+xml"
      };
    } catch (err) {
      console.log(`[LOG ERROR] ${err?.message || "Terjadi kesalahan sistem"}`);
      return {
        status: false,
        error: err?.response?.data || err?.message || "Unknown Error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new PlaceWaifu();
  try {
    const data = await api.generate(params);
    if (!data?.status) {
      return res.status(400).json(data);
    }
    if (data?.buffer) {
      res.setHeader("Content-Type", data?.contentType || "image/svg+xml");
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