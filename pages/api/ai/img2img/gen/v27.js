import axios from "axios";
import FormData from "form-data";
import {
  createHmac
} from "crypto";
import https from "https";
class Rita {
  constructor() {
    this.CONFIG = {
      BASE_REST: "https://api_v2.rita.ai",
      SIGN_SECRET: "e3438fe855d6c27b6aa3c50357d3d7115fd57917d86a7dc3c66d3086c2d8479a",
      UA: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36",
      AGENT: new https.Agent({
        keepAlive: false
      })
    };
    this._visitorId = this._genVisitorId();
  }
  _genVisitorId() {
    return Array.from({
      length: 16
    }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("");
  }
  _signVisitorId(vid) {
    try {
      const sig = createHmac("sha256", this.CONFIG.SIGN_SECRET).update(vid).digest("hex");
      return `${vid}:${sig}`;
    } catch (e) {
      throw new Error(`Signature Error: ${e.message}`);
    }
  }
  async _toBuffer(img) {
    try {
      if (Buffer.isBuffer(img)) return {
        buffer: img,
        mime: "image/jpeg"
      };
      if (typeof img === "string") {
        if (/^https?:\/\//.test(img)) {
          console.log(`[debug] Menarik data dari URL: ${img.substring(0, 50)}...`);
          const r = await axios.get(img, {
            responseType: "arraybuffer",
            httpsAgent: this.CONFIG.AGENT,
            timeout: 2e4
          });
          return {
            buffer: Buffer.from(r.data),
            mime: r.headers["content-type"]?.split(";")[0] || "image/jpeg"
          };
        }
        const m = img.match(/^data:([^;]+);base64,(.+)$/);
        if (m) return {
          buffer: Buffer.from(m[2], "base64"),
          mime: m[1]
        };
        return {
          buffer: Buffer.from(img, "base64"),
          mime: "image/jpeg"
        };
      }
      throw new Error("Format gambar tidak didukung.");
    } catch (e) {
      throw new Error(`Gagal konversi buffer: ${e.message}`);
    }
  }
  _headers(extra = {}) {
    return {
      accept: "*/*",
      "accept-language": "id,ms;q=0.9,en;q=0.8",
      "content-type": "application/json",
      origin: "https://www.rita.ai",
      referer: "https://www.rita.ai/",
      "sec-ch-ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": this.CONFIG.UA,
      visitorid: this._signVisitorId(this._visitorId),
      dnt: "1",
      ...extra
    };
  }
  async upload(image) {
    try {
      const {
        buffer,
        mime
      } = await this._toBuffer(image);
      const form = new FormData();
      form.append("file", buffer, {
        filename: "upload.png",
        contentType: mime
      });
      console.log("[debug] Mengirim ke /aichat/upload...");
      const r = await axios.post(`${this.CONFIG.BASE_REST}/aichat/upload`, form, {
        headers: {
          ...this._headers(),
          ...form.getHeaders()
        },
        httpsAgent: this.CONFIG.AGENT
      });
      console.log("[debug] Respon Upload Asli:", JSON.stringify(r.data, null, 2));
      if (r.data?.code !== 0) throw new Error(r.data?.message || "Upload failed");
      return r.data?.data?.img_url;
    } catch (e) {
      const msg = e.response?.data || e.message;
      throw new Error(`Upload Error: ${typeof msg === "object" ? JSON.stringify(msg) : msg}`);
    }
  }
  async generate({
    prompt,
    image = null,
    model_id = 1080,
    ratio = "1:1",
    ...rest
  }) {
    try {
      let image_url = null;
      if (image) {
        image_url = await this.upload(image);
      }
      const body = {
        tool_id: 3,
        generate: {
          prompt: prompt,
          model_id: model_id,
          ratio: ratio,
          image_num: 1,
          image_like: 4,
          ...image_url ? {
            image_url: image_url
          } : {},
          ...rest
        },
        model_id: model_id
      };
      console.log("[debug] Mengirim ke /aiArtTool/generate...");
      const r = await axios.post(`${this.CONFIG.BASE_REST}/aiArtTool/generate`, body, {
        headers: this._headers(),
        httpsAgent: this.CONFIG.AGENT
      });
      console.log("[debug] Respon Generate Asli:", JSON.stringify(r.data, null, 2));
      if (r.data?.code !== 0) throw new Error(r.data?.message || "Generate failed");
      const message_id = r.data?.data?.message_id;
      return await this.poll(message_id);
    } catch (e) {
      const msg = e.response?.data || e.message;
      throw new Error(`Generate Error: ${typeof msg === "object" ? JSON.stringify(msg) : msg}`);
    }
  }
  async poll(message_id, {
    interval = 3e3,
    timeout = 12e4
  } = {}) {
    const deadline = Date.now() + timeout;
    console.log(`[debug] Memulai polling untuk ID: ${message_id}`);
    while (Date.now() < deadline) {
      try {
        await new Promise(r => setTimeout(r, interval));
        const r = await axios.post(`${this.CONFIG.BASE_REST}/aiArtTool/notification`, {
          message_id: message_id
        }, {
          headers: this._headers(),
          httpsAgent: this.CONFIG.AGENT
        });
        console.log(`[debug] Respon Notification (RAW):\n${r.data}`);
        const lines = r.data.split("\n");
        for (let line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (!dataStr || dataStr === "[DONE]") continue;
            const json = JSON.parse(dataStr);
            const delta = json.choices?.[0]?.delta;
            if (delta?.result) {
              console.log("[debug] Gambar ditemukan!");
              return {
                status: "success",
                ...delta
              };
            }
            if (delta?.finish_reason === "fail") {
              throw new Error("Server mengembalikan finish_reason: fail");
            }
          }
        }
      } catch (e) {
        if (e.message.includes("fail")) throw e;
        console.warn(`[poll] Status: Belum selesai... (${e.message})`);
      }
    }
    throw new Error("Polling Timeout.");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new Rita();
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