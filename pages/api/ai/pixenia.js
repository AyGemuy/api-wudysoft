import axios from "axios";
import FormData from "form-data";
class PhotoAI {
  constructor() {
    this.ua = "okhttp/4.10.0";
    this.headers = {
      "User-Agent": this.ua,
      Connection: "Keep-Alive",
      Accept: "application/json"
    };
  }
  async _solve(input) {
    try {
      if (!input) return null;
      let buf = Buffer.isBuffer(input) ? input : null;
      let mime = "image/jpeg";
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          console.log("[LOG] Mengunduh gambar dari URL...");
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          mime = res.headers["content-type"] || mime;
          buf = Buffer.from(res?.data);
        } else if (input.includes("base64,") || input.length > 100) {
          console.log("[LOG] Memproses gambar dari Base64...");
          const match = input.match(/^data:(image\/\w+);base64,/);
          mime = match ? match[1] : mime;
          buf = Buffer.from(input.replace(/^data:image\/\w+;base64,/, ""), "base64");
        }
      }
      if (buf && !input.startsWith("http")) {
        const hex = buf.toString("hex", 0, 4);
        if (hex.startsWith("89504e47")) mime = "image/png";
        else if (hex.startsWith("47494638")) mime = "image/gif";
        else if (hex.startsWith("52494646") && buf.toString("hex", 8, 12) === "57454250") mime = "image/webp";
      }
      return buf ? {
        buf: buf,
        mime: mime
      } : null;
    } catch (err) {
      console.error("[LOG] Gagal parsing gambar:", err?.message);
      return null;
    }
  }
  async styles({
    ...rest
  } = {}) {
    try {
      console.log("[LOG] Memulai pencarian daftar styles...");
      const res = await axios.get("https://photo-art.proxglobal.co/ai-filter/swap-face/data.json", {
        headers: {
          ...this.headers,
          "Accept-Encoding": "gzip"
        },
        params: rest
      });
      return {
        status: true,
        result: res?.data?.data || []
      };
    } catch (err) {
      console.error("[LOG] Gagal mengambil styles:", err?.response?.data || err?.message);
      return {
        status: false,
        result: err?.response?.data || err?.message || null
      };
    }
  }
  async generate({
    image,
    style = "Anime",
    ...rest
  } = {}) {
    try {
      if (!image) {
        console.error('[LOG] Validasi Gagal: Parameter "image" wajib diisi.');
        return {
          status: false,
          result: 'Parameter "image" wajib diisi.'
        };
      }
      console.log("[LOG] Memulai proses generasi gambar AI...");
      const parsed = await this._solve(image);
      if (!parsed) {
        console.error("[LOG] Buffer gambar kosong atau tidak valid.");
        return {
          status: false,
          result: "Gambar tidak valid."
        };
      }
      const form = new FormData();
      form.append("style_name", style);
      form.append("source_faces", parsed.buf, {
        filename: `face_0.${parsed.mime.split("/")[1] || "jpg"}`,
        contentType: parsed.mime
      });
      Object.entries(rest).forEach(([k, v]) => {
        if (form.has(k)) form.delete(k);
        form.append(k, v);
      });
      console.log(`[LOG] Mengirim data ke server dengan style: "${style}"...`);
      const res = await axios.post("https://photoaiart.nowtechai.com/api/v1/process", form, {
        headers: {
          ...this.headers,
          ...form.getHeaders(),
          "Accept-Encoding": "gzip"
        }
      });
      console.log("[LOG] Generasi AI selesai berhasil.");
      const data = res?.data || {};
      return {
        status: data.code === 200 || res?.status === 200,
        result: {
          code: data.code || res?.status,
          message: data.message || "Success",
          url: data.result_image_url || null,
          sec: data.processing_time_seconds ? parseFloat(data.processing_time_seconds.toFixed(3)) : null
        }
      };
    } catch (err) {
      console.error("[LOG] Gagal generate gambar:", err?.response?.data || err?.message);
      const errData = err?.response?.data || {};
      return {
        status: false,
        result: {
          code: errData.code || err?.response?.status || 500,
          message: errData.message || err?.message || "Internal Server Error",
          url: errData.result_image_url || null,
          sec: errData.processing_time_seconds ? parseFloat(errData.processing_time_seconds.toFixed(3)) : null
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["styles", "generate"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          styles: "/?action=styles",
          generate: "/?action=generate&image=https://example.com/face.jpg&style=Anime"
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new PhotoAI();
  try {
    let response;
    switch (action) {
      case "styles":
        response = await api.styles(params);
        break;
      case "generate":
        if (!params.image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'image' (URL, Base64, atau Buffer) wajib diisi untuk action 'generate'.",
            example: "/?action=generate&image=https://example.com/face.jpg&style=Anime"
          });
        }
        response = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari AI server. Coba lagi nanti."
      });
    }
    return res.status(response.status ? 200 : 400).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server PhotoAI.",
      error: error.message || "Unknown Error"
    });
  }
}