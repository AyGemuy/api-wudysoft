import axios from "axios";
import FormData from "form-data";
class AIClient {
  constructor() {
    this.dartHeaders = {
      "User-Agent": "Dart/3.3 (dart:io)",
      Accept: "application/json",
      "Accept-Encoding": "gzip"
    };
    this.client = axios.create({
      baseURL: "https://imagine-ai-dot-chatbotai-477115.el.r.appspot.com",
      timeout: 6e4,
      headers: {
        ...this.dartHeaders
      }
    });
    this.pollInterval = 3e3;
    this.pollTimeout = 6e4;
    this._cache = null;
  }
  _norm(img) {
    try {
      if (Buffer.isBuffer(img)) return {
        buffer: img,
        name: "image.jpg"
      };
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) return {
          url: img
        };
        const m = img.match(/^data:image\/(\w+);base64,(.+)$/);
        if (m) return {
          buffer: Buffer.from(m[2], "base64"),
          name: `image.${m[1] || "jpg"}`
        };
        return {
          buffer: Buffer.from(img, "base64"),
          name: "image.jpg"
        };
      }
      return {
        error: "Format gambar tidak valid"
      };
    } catch (e) {
      return {
        error: e.message
      };
    }
  }
  async styles() {
    try {
      if (this._cache) return {
        status: "ok",
        result: this._cache
      };
      console.log("[AIClient] Mengambil daftar style...");
      const res = await this.client.get("/styles");
      if (Array.isArray(res.data)) {
        this._cache = res.data;
        return {
          status: "ok",
          result: res.data
        };
      }
      const fallback = ["None", "Classic", "Cyberpunk", "Anime", "Model Shoot", "AI Avatar", "Royal Portrait", "Superhero", "Comic Book", "Warrior", "Disney", "GTA Style", "AI Selfie", "Action Figure", "Lego Portrait", "Cartoon", "AI Cosplay", "Military", "Tattoo Look", "Pet Portrait", "AI Haircut"];
      this._cache = fallback;
      return {
        status: "ok",
        result: fallback
      };
    } catch (e) {
      console.warn("[AIClient] Gagal mengambil styles dari API, menggunakan fallback.");
      return {
        status: "error",
        result: e.message
      };
    }
  }
  async _up(images) {
    try {
      const list = Array.isArray(images) ? images : [images];
      console.log(`[AIClient] Memproses ${list.length} gambar input...`);
      const processed = [];
      for (const img of list) {
        const norm = this._norm(img);
        if (norm.error) return {
          status: "error",
          result: norm.error
        };
        if (norm.url) {
          console.log(`[AIClient] Mengunduh gambar dari URL: ${norm.url}`);
          const dl = await axios.get(norm.url, {
            responseType: "arraybuffer",
            headers: {
              "User-Agent": this.dartHeaders["User-Agent"]
            }
          });
          const name = norm.url.split("/").pop() || "image.jpg";
          processed.push({
            buffer: Buffer.from(dl.data),
            name: name
          });
        } else {
          processed.push({
            buffer: norm.buffer,
            name: norm.name
          });
        }
      }
      let uploadList = [...processed];
      if (uploadList.length === 1) {
        console.log("[AIClient] Menyesuaikan syarat server (min 2 gambar): buffer diduplikasi jadi 2 file upload tanpa download ulang.");
        uploadList = [uploadList[0], uploadList[0]];
      } else if (uploadList.length > 10) {
        console.warn("[AIClient] Maksimal 10 gambar diperbolehkan. Memotong ke 10 gambar pertama.");
        uploadList = uploadList.slice(0, 10);
      }
      console.log(`[AIClient] Mengunggah ${uploadList.length} file ke server...`);
      const form = new FormData();
      for (let i = 0; i < uploadList.length; i++) {
        const file = uploadList[i];
        const ext = file.name.split(".").pop() || "jpg";
        form.append("files", file.buffer, {
          filename: `image_${i + 1}.${ext}`
        });
      }
      const res = await this.client.post("/upload/images", form, {
        headers: {
          ...this.dartHeaders,
          ...form.getHeaders()
        }
      });
      console.log("[AIClient] Upload berhasil. Session ID:", res.data?.session_id);
      return {
        status: "ok",
        result: res.data
      };
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      console.error("[AIClient] Gagal upload:", msg);
      return {
        status: "error",
        result: msg
      };
    }
  }
  async _req(sid, prompt = "", style = "None") {
    try {
      console.log(`[AIClient] Mengirim request generate (Style: "${style}", Prompt: "${prompt}")`);
      const res = await this.client.post("/generate/request", {
        session_id: sid,
        user_prompt: prompt,
        style_id: style
      });
      console.log("[AIClient] Request diterima. Job ID:", res.data?.job_id);
      return {
        status: "ok",
        result: res.data
      };
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      console.error("[AIClient] Gagal request generate:", msg);
      return {
        status: "error",
        result: msg
      };
    }
  }
  async _poll(jobId, timeout = this.pollTimeout, interval = this.pollInterval) {
    try {
      console.log(`[AIClient] Memulai polling Job (${jobId})...`);
      const start = Date.now();
      let attempt = 0;
      while (Date.now() - start < timeout) {
        attempt++;
        try {
          const res = await this.client.get(`/generate/result/${jobId}`);
          const data = res.data;
          console.log(`[AIClient] Poll #${attempt} - Status: ${data?.status}`);
          if (data?.status === "completed" && data?.result_url) {
            console.log("[AIClient] Proses selesai! URL:", data.result_url);
            return {
              status: "ok",
              result: data
            };
          }
          if (data?.status === "failed") {
            console.error("[AIClient] Generate gagal dari server:", data?.message);
            return {
              status: "error",
              result: data?.message || "Gagal generate"
            };
          }
        } catch (_) {}
        await new Promise(r => setTimeout(r, interval));
      }
      console.error(`[AIClient] Polling timeout setelah ${timeout}ms`);
      return {
        status: "error",
        result: `Timeout (${timeout}ms)`
      };
    } catch (e) {
      return {
        status: "error",
        result: e.message
      };
    }
  }
  async generate({
    prompt = "",
    image,
    style_id = "None",
    session_id,
    pollTimeout,
    pollInterval,
    ...rest
  } = {}) {
    try {
      console.log("[AIClient] ===== Mulai Proses Generate =====");
      const targetImg = image || rest.img;
      if (!targetImg && !session_id && !rest.sid) {
        console.error('[AIClient] Error: Parameter "image" wajib diisi.');
        return {
          status: "error",
          result: "Parameter image wajib diisi."
        };
      }
      let targetStyle = style_id || rest.style || "None";
      const userPrompt = prompt || rest.prompt || "";
      let currentSessionId = session_id || rest.sid;
      const styleList = await this.styles();
      if (styleList.status === "ok" && !styleList.result.includes(targetStyle)) {
        console.warn(`[AIClient] Style "${targetStyle}" tidak dikenal, fallback ke "None".`);
        targetStyle = "None";
      }
      if (!currentSessionId) {
        const upRes = await this._up(targetImg);
        if (upRes.status === "error") return upRes;
        currentSessionId = upRes.result?.session_id;
      }
      const reqRes = await this._req(currentSessionId, userPrompt, targetStyle);
      if (reqRes.status === "error") return reqRes;
      const jobId = reqRes.result?.job_id;
      if (!jobId) return {
        status: "error",
        result: "Job ID tidak ditemukan dari server"
      };
      const pollRes = await this._poll(jobId, pollTimeout || rest.timeout || this.pollTimeout, pollInterval || rest.interval || this.pollInterval);
      console.log("[AIClient] ===== Selesai =====");
      return pollRes;
    } catch (e) {
      console.error("[AIClient] Error internal:", e.message);
      return {
        status: "error",
        result: e.message
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
  const api = new AIClient();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}