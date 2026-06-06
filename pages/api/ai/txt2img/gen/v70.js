import axios from "axios";
class ArtGenerator {
  constructor() {
    this.client = axios.create({
      baseURL: "https://generateimagev2-gfacqcws4a-uc.a.run.app",
      headers: {
        "Content-Type": "application/json"
      },
      responseType: "arraybuffer"
    });
  }
  async generate({
    prompt,
    filter = "enhance",
    size = "1024x1024",
    ...rest
  }) {
    console.log("[PROSES] Memulai validasi input...");
    if (!prompt || typeof prompt !== "string") {
      console.error("[ERROR] Validasi gagal: Prompt tidak valid.");
      return {
        success: false,
        error: "Prompt is required and must be a string"
      };
    }
    let parsedSize;
    try {
      console.log(`[PROSES] Memproses input size: "${size}"`);
      parsedSize = size.toLowerCase().split("x").map(num => parseInt(num, 10));
      if (parsedSize.length !== 2 || parsedSize.some(v => isNaN(v) || v <= 0)) {
        throw new Error();
      }
      console.log("[PROSES] Auto-split size sukses:", JSON.stringify(parsedSize));
    } catch (e) {
      console.error("[ERROR] Validasi gagal: Format size salah.");
      return {
        success: false,
        error: 'Size must be a string format like "1024x1024" containing two positive integers'
      };
    }
    const payload = {
      text: prompt,
      selectForApiFilter: filter,
      size: parsedSize,
      ...rest
    };
    console.log("[PROSES] Mengirim request ke API dengan payload:", JSON.stringify(payload));
    try {
      const response = await this.client.post("/", payload);
      console.log("[PROSES] Request berhasil, menerima respon dari server.");
      const contentType = response.headers["content-type"] || "image/png";
      console.log(`[PROSES] Content-Type terdeteksi: ${contentType}`);
      return {
        success: true,
        buffer: response.data,
        contentType: contentType
      };
    } catch (error) {
      console.error("[ERROR] Terjadi kesalahan saat request ke API.");
      if (error.response) {
        const status = error.response.status;
        let message = `HTTP ${status}`;
        if (status === 403) {
          message = "Request blocked (possibly due to inappropriate content)";
        }
        console.error(`[ERROR] Server merespon dengan status: ${status}`);
        return {
          success: false,
          error: `${message}: ${error.response.statusText}`
        };
      }
      console.error(`[ERROR] Network error: ${error.message}`);
      return {
        success: false,
        error: `Network error: ${error.message}`
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new ArtGenerator();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}