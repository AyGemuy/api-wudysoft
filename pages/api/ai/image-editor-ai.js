import axios from "axios";
import crypto from "crypto";
class AIGenerator {
  constructor() {
    this.baseURL = "https://image-editor-ai.com";
    this.cookie = "NEXT_LOCALE=en;";
    this.models = ["flux-klein", "gpt-image-2", "neximage-ai", "nano-banana-edit-kie", "nano-banana-pro", "nano-banana-kie"];
    this.ratios = ["auto", "1:1", "16:9", "9:16", "3:2", "2:3"];
    this.defModel = "gpt-image-2";
    this.defRatio = "auto";
    this.maxPoll = 60;
    this.pollInt = 3e3;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      cookie: this.cookie,
      origin: this.baseURL,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `${this.baseURL}/`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: this.headers,
      timeout: 6e4
    });
  }
  _uid() {
    return crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  _ms(t) {
    return new Promise(r => setTimeout(r, t));
  }
  async _up(img) {
    try {
      if (typeof img === "string" && /^https?:\/\//i.test(img)) {
        console.log(`[Upload] Menggunakan URL gambar langsung: ${img}`);
        return img;
      }
      console.log("[Upload] Mendeteksi format input gambar untuk proses unggah...");
      let buf, mime, ext;
      if (typeof img === "string" && img.startsWith("data:")) {
        const m = img.match(/^data:([^;]+);base64,(.+)$/);
        if (!m) {
          console.error("[Upload] Format base64 tidak valid");
          return {
            error: "Format base64 tidak valid"
          };
        }
        mime = m[1];
        buf = Buffer.from(m[2], "base64");
        ext = mime.split("/")[1] || "png";
      } else if (Buffer.isBuffer(img)) {
        buf = img;
        mime = "image/jpeg";
        ext = "jpg";
      } else {
        console.error("[Upload] Jenis input gambar tidak didukung");
        return {
          error: "Format input harus berupa URL, base64, atau Buffer"
        };
      }
      const ts = Date.now().toString();
      const name = `image2image/${ts}_${ts}_${this._uid().slice(0, 8)}.${ext}`;
      console.log(`[Upload] Meminta presigned URL R2 untuk berkas: ${name}`);
      const res = await this.api.post("/api/r2PresignedUrl", {
        fileName: name,
        contentType: mime
      });
      const {
        url,
        publicUrl
      } = res.data || {};
      if (!url || !publicUrl) {
        console.error("[Upload] Respons presigned URL R2 tidak lengkap");
        return {
          error: "Gagal mendapatkan link upload"
        };
      }
      console.log("[Upload] Mengunggah data gambar ke penyimpanan R2...");
      await axios.put(url, buf, {
        headers: {
          "Content-Type": mime
        }
      });
      console.log(`[Upload] Unggah berhasil. URL Publik: ${publicUrl}`);
      return publicUrl;
    } catch (err) {
      console.error(`[Upload] Terjadi kegagalan saat unggah: ${err.message}`);
      return {
        error: `Proses upload gagal: ${err.message}`
      };
    }
  }
  async _sub({
    prompt,
    model,
    ratio,
    urls,
    type,
    overrides
  }) {
    try {
      const ts = Date.now().toString();
      const payload = {
        prompts: prompt,
        model: model,
        generateType: type,
        token: ts,
        timestamp: ts,
        nonce: this._uid(),
        aspect_ratio: ratio,
        numberOfOutputs: 1,
        ...overrides
      };
      if (urls && urls.length > 0) {
        payload.image_url = overrides.image_url || urls[0];
        payload.image_urls = overrides.image_urls || urls;
      }
      console.log(`[Submit] Mengirimkan permintaan tugas (${type}) ke API...`);
      console.log(`[Submit] Payload:`, JSON.stringify(payload));
      const res = await this.api.post("/api/FalAIVideo", payload);
      const id = res.data?.data?.taskId || res.data?.taskId;
      if (!id) {
        console.error("[Submit] Gagal mendapatkan Task ID dari respons server");
        return {
          error: "Task ID tidak ditemukan dari respons"
        };
      }
      console.log(`[Submit] Tugas berhasil terdaftar dengan Task ID: ${id}`);
      return id;
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      console.error(`[Submit] Terjadi kegagalan pendaftaran tugas: ${msg}`);
      return {
        error: msg
      };
    }
  }
  async _chk(id, model, type) {
    let att = 0;
    console.log(`[Polling] Memulai pelacakan status untuk Task ID: ${id}`);
    console.log(`[Polling] Konfigurasi: Maksimal ${this.maxPoll} kali dengan jeda ${this.pollInt}ms`);
    while (att < this.maxPoll) {
      try {
        att++;
        console.log(`[Polling] Percobaan ${att}/${this.maxPoll}...`);
        const res = await this.api.get(`/api/FalAIVideoGetRes?id=${id}&model=${model}&type=${type}`);
        const d = res.data?.data || res.data;
        console.log(`[Polling] Status Respons: ${d?.state || "Unknown"}`);
        if (d?.state === "success" || d?.state === "completed") {
          let urls = [];
          if (d.resultJson) {
            try {
              urls = JSON.parse(d.resultJson)?.resultUrls || [];
            } catch (_) {}
          }
          console.log(`[Polling] Tugas selesai. Hasil ditemukan: ${urls.length} gambar.`);
          return urls;
        }
        if (d?.state === "fail" || d?.state === "failed") {
          console.error(`[Polling] Tugas dilaporkan gagal oleh sistem: ${d?.failMsg}`);
          return {
            error: d?.failMsg || "Gagal diproses oleh sistem"
          };
        }
        await this._ms(this.pollInt);
      } catch (err) {
        console.warn(`[Polling] Error pada percobaan ${att}: ${err.message}`);
        if (att >= this.maxPoll) {
          console.error("[Polling] Batas maksimal percobaan habis setelah mengalami error berkelanjutan");
          return {
            error: err.message
          };
        }
        await this._ms(this.pollInt);
      }
    }
    console.error("[Polling] Batas waktu pelacakan (timeout) tercapai");
    return {
      error: "Waktu polling habis"
    };
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    console.log("[Generate] Memulai inisialisasi pembuatan gambar...");
    try {
      if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
        console.error("[Generate] Input validasi gagal: Prompt kosong");
        return {
          status: "error",
          result: "Prompt wajib diisi"
        };
      }
      const model = rest.model || this.defModel;
      const ratio = rest.aspect_ratio || rest.ratio || this.defRatio;
      if (!this.models.includes(model)) {
        console.error(`[Generate] Input validasi gagal: Model "${model}" tidak didukung`);
        return {
          status: "error",
          result: `Model tidak valid. Pilihan: ${this.models.join(", ")}`
        };
      }
      if (!this.ratios.includes(ratio)) {
        console.error(`[Generate] Input validasi gagal: Rasio "${ratio}" tidak didukung`);
        return {
          status: "error",
          result: `Rasio tidak valid. Pilihan: ${this.ratios.join(", ")}`
        };
      }
      const hasImage = image && (!Array.isArray(image) || image.length > 0);
      const type = hasImage ? "imagetoimage" : "texttoimage";
      console.log(`[Generate] Tipe proses yang terdeteksi: ${type}`);
      let urls = [];
      if (hasImage) {
        const imgs = Array.isArray(image) ? image : [image];
        console.log(`[Generate] Memulai pemrosesan ${imgs.length} gambar input...`);
        for (const img of imgs) {
          const upRes = await this._up(img);
          if (upRes && upRes.error) {
            return {
              status: "error",
              result: upRes.error
            };
          }
          urls.push(upRes);
        }
      }
      const subRes = await this._sub({
        prompt: prompt,
        model: model,
        ratio: ratio,
        urls: urls,
        type: type,
        overrides: rest
      });
      if (subRes && subRes.error) {
        return {
          status: "error",
          result: subRes.error
        };
      }
      const activeModel = rest.model || model;
      const activeType = rest.generateType || type;
      const chkRes = await this._chk(subRes, activeModel, activeType);
      if (chkRes && chkRes.error) {
        return {
          status: "error",
          result: chkRes.error
        };
      }
      console.log("[Generate] Proses pembuatan gambar selesai dengan sukses");
      return {
        status: "success",
        result: chkRes
      };
    } catch (err) {
      console.error(`[Generate] Terjadi kesalahan fatal pada sistem: ${err.message}`);
      return {
        status: "error",
        result: err.message
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
  const api = new AIGenerator();
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