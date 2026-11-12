import axios from "axios";
import FormData from "form-data";
class FaceSwap {
  constructor() {
    this.key = "gb60zJLJdnJRRa3UGM6zDmwQip0FNhYKxdgrcxxjOSCcAABRim";
    this.baseUrl = "https://newfaceswap.fastdl.video/api";
  }
  async solve(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string" && input.startsWith("http")) {
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data || "");
      }
      const base64Data = input.includes("base64,") ? input.split("base64,")[1] : input;
      return Buffer.from(base64Data, "base64");
    } catch (e) {
      console.error("[Error Solve]", e.message);
      throw new Error("Gagal memproses data gambar");
    }
  }
  async generate({
    source,
    target,
    ...rest
  }) {
    try {
      console.log("[Proses] Menyiapkan Face Swap...");
      const faceData = await this.solve(source);
      const form = new FormData();
      form.append("target_face_file", faceData, {
        filename: "face.png"
      });
      if (typeof target === "string" && target.startsWith("http")) {
        form.append("target_image_file_url", target);
      } else {
        const targetData = await this.solve(target);
        form.append("target_image_file", targetData, {
          filename: "target.png"
        });
      }
      const extra = rest || {};
      Object.entries(extra).forEach(([k, v]) => form.append(k, v));
      console.log("[Proses] Mengirim request swap ke server...");
      const {
        data
      } = await axios.post(`${this.baseUrl}/face-swap/`, form, {
        headers: {
          ...form.getHeaders(),
          "X-Secret-Key": this.key,
          "User-Agent": "okhttp/5.0.0-alpha.11",
          Connection: "Keep-Alive"
        }
      });
      console.log("[Sukses] Face Swap Berhasil");
      return data;
    } catch (err) {
      const errorMsg = err?.response?.data || err.message || "Unknown Error";
      console.error("[Error Swap]", errorMsg);
      return {
        error: true,
        msg: errorMsg
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.source || !params.target) {
    return res.status(400).json({
      error: "Parameter 'source' dan 'target' diperlukan"
    });
  }
  const api = new FaceSwap();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}