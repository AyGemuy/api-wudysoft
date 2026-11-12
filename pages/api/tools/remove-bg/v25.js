import axios from "axios";
import FormData from "form-data";
class BgRemover {
  constructor() {
    this.key = "gb60zJLJdnJRRa3UGM6zDmwQip0FNhYKxdgrcxxjOSCcAABRim";
    this.url = "https://newfaceswap.fastdl.video/api/remove-bg/";
  }
  async solve(input) {
    try {
      console.log("[Proses] Validasi format gambar...");
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string" && input.startsWith("http")) {
        console.log("[Proses] Mengunduh gambar dari URL...");
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data || "");
      }
      if (typeof input === "string" && input.includes("base64,")) {
        return Buffer.from(input.split("base64,")[1], "base64");
      }
      return Buffer.from(input || "", "base64");
    } catch (e) {
      console.error("[Error Solve]", e.message);
      throw new Error("Gagal memproses input gambar");
    }
  }
  async generate({
    image,
    ...rest
  }) {
    try {
      console.log("[Proses] Menyiapkan payload...");
      const imgData = await this.solve(image);
      const form = new FormData();
      form.append("image", imgData, {
        filename: "file.png"
      });
      const extra = rest || {};
      Object.entries(extra).forEach(([k, v]) => form.append(k, v));
      console.log(`[Proses] Mengirim request ke endpoint...`);
      const {
        data
      } = await axios.post(this.url, form, {
        headers: {
          ...form.getHeaders(),
          "X-Secret-Key": this.key,
          "User-Agent": "okhttp/5.0.0-alpha.11",
          "Accept-Encoding": "gzip"
        },
        timeout: 6e4
      });
      console.log("[Sukses] Request selesai");
      return data;
    } catch (err) {
      const msg = err?.response?.data || err.message || "Unknown Network Error";
      console.error("[Error Remove]", msg);
      return {
        error: true,
        message: msg
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new BgRemover();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}