import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class NanoBanana {
  constructor() {
    this.jar = {};
    this.email = null;
    this.baseUrl = "https://nanobanana.io";
    this.mailApi = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.models = ["nano-banana", "nanobanana", "ai-image-enhancer", "seedream4", "seedream-4-0", "background-remover", "sora-2", "veo-3-1", "wan-2-5", "nano-banana-pro", "vidu-q2", "nano-banana-2", "nanobanana2", "seedream-4-5", "nanobanana-pro", "z-image", "seedance-1-5-pro", "sora-2-pro", "kling-o1", "wan-2-2", "wan-2-6", "wan-2-7", "kling-2-6", "glm-image", "grok-imagine", "seedance-2-0", "seedance-2-0-fast", "seedream-5-0-lite", "seedream-5-0", "nano-banana-multi", "nano-banana-pro-multi", "nano-banana-2-multi", "kling-3-motion-control", "wananobanana2", "knanobanana2", "kling-3-motion-control-kie", "wan-2-2-animate", "kling-video-o3", "video-face-swap", "dreamactor-v2", "kling-3-0", "gpt-image-1-5", "wan-2-7-image", "pixverse-v-6", "vidu-q3", "kling-3-0-motion-control", "gpt-image-2", "gptimage2", "happy-horse-1-0", "nano-banana-3", "pixverse-c1", "seedance-2-5", "nano-banana-2-lite", "seedream-5-0-pro", "wan-3-0", "minimax-h3"];
    this.ratios = ["1:1", "16:9", "9:16", "3:4", "4:3", "3:2", "2:3", "21:9", "auto", "landscape", "portrait", "square"];
    this.client = this._cli();
  }
  _cli() {
    try {
      const inst = axios.create({
        baseURL: this.baseUrl,
        timeout: 3e4,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      inst.interceptors.request.use(cfg => {
        try {
          const cookieStr = Object.entries(this.jar || {}).map(([k, v]) => `${k}=${v}`).join("; ");
          if (cookieStr) cfg.headers["cookie"] = cookieStr;
          return cfg;
        } catch (e) {
          console.log(`[NanoBanana Cookie Req Error] ${e?.message || e}`);
          return cfg;
        }
      }, err => Promise.reject(err));
      inst.interceptors.response.use(res => {
        try {
          const sc = res?.headers?.["set-cookie"] || [];
          const arr = Array.isArray(sc) ? sc : [sc];
          for (const item of arr) {
            if (!item) continue;
            const [pair] = item.split(";");
            const [k, ...v] = (pair || "").split("=");
            if (k?.trim()) this.jar[k.trim()] = v.join("=").trim();
          }
          return res;
        } catch (e) {
          console.log(`[NanoBanana Cookie Res Error] ${e?.message || e}`);
          return res;
        }
      }, err => Promise.reject(err));
      return inst;
    } catch (e) {
      console.log(`[NanoBanana Client Init Error] ${e?.message || e}`);
      return axios.create({
        baseURL: this.baseUrl
      });
    }
  }
  _slp(ms) {
    try {
      return new Promise(r => setTimeout(r, ms || 3e3));
    } catch (e) {
      console.log(`[NanoBanana Sleep Error] ${e?.message || e}`);
      return Promise.resolve();
    }
  }
  _enc() {
    try {
      return Buffer.from(JSON.stringify({
        jar: this.jar || {},
        email: this.email || null
      })).toString("base64");
    } catch (e) {
      console.log(`[NanoBanana Encode State Error] ${e?.message || e}`);
      return "";
    }
  }
  _dec(state) {
    try {
      if (!state) return false;
      const parsed = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
      this.jar = parsed?.jar || {};
      this.email = parsed?.email || null;
      console.log("[NanoBanana] Sesi state base64 berhasil dimuat");
      return true;
    } catch (e) {
      console.log(`[NanoBanana Decode State Error] ${e?.message || e}`);
      return false;
    }
  }
  _val(opts) {
    try {
      if (!opts?.prompt || typeof opts.prompt !== "string" || !opts.prompt.trim()) {
        return {
          valid: false,
          message: 'Parameter "prompt" wajib diisi (string non-kosong)'
        };
      }
      const model = opts?.model || "nano-banana-2-lite";
      if (!this.models.includes(model)) {
        return {
          valid: false,
          message: `Model "${model}" tidak valid. Pilihan: ${this.models.join(", ")}`
        };
      }
      const ratio = opts?.aspect_ratio || opts?.ratio || "auto";
      if (ratio && !this.ratios.includes(ratio)) {
        return {
          valid: false,
          message: `Aspect ratio "${ratio}" tidak valid. Pilihan: ${this.ratios.join(", ")}`
        };
      }
      return {
        valid: true,
        model: model,
        ratio: ratio
      };
    } catch (e) {
      console.log(`[NanoBanana Validation Error] ${e?.message || e}`);
      return {
        valid: false,
        message: e?.message || "Gagal validasi parameter"
      };
    }
  }
  _bld(model, prompt, images = [], opts = {}) {
    try {
      const {
        aspect_ratio,
        ratio,
        resolution,
        resolution_gpt,
        duration,
        video_length,
        sound,
        quality,
        scale,
        target_resolution,
        video_url,
        face_image,
        character_orientation,
        frames_images,
        last_image,
        web_search,
        max_images,
        num_images,
        ...rest
      } = opts;
      const ar = aspect_ratio || ratio || "auto";
      const res = resolution || resolution_gpt || "2k";
      const dur = Number(duration || video_length) || 5;
      const totalImages = Number(max_images || num_images) || 1;
      const params = {
        ...rest
      };
      if (images?.length) {
        params.images = images;
        params.image_urls = images;
        params.image = images[0];
      }
      if (ar && ar !== "aspect_ratio") {
        params.aspect_ratio = ar;
      }
      if (res) {
        const strRes = String(res).toLowerCase();
        params.resolution = strRes === "1k" || strRes === "1" ? "1K" : strRes === "4k" || strRes === "4" ? "4K" : strRes === "2k" || strRes === "2" ? "2K" : res;
      }
      if (duration || video_length) {
        params.duration = dur;
        params.video_length = dur;
      }
      if (sound !== undefined) {
        params.sound = Boolean(sound);
        params.generate_audio = Boolean(sound);
        params.generate_audio_switch = Boolean(sound);
      }
      if (scale || target_resolution) {
        params.target_resolution = scale || target_resolution || "4k";
      }
      if (quality) params.quality = quality;
      if (video_url) params.video_url = video_url;
      if (face_image) params.face_image = Array.isArray(face_image) ? face_image : [face_image];
      if (character_orientation) params.character_orientation = character_orientation;
      if (frames_images) params.frames_images = frames_images;
      if (last_image) params.last_image = last_image;
      if (web_search !== undefined) params.web_search = Boolean(web_search);
      if (totalImages > 1) {
        params.max_images = totalImages;
        params.num_images = totalImages;
      }
      if (ar && ar !== "auto" && ar !== "aspect_ratio") {
        const is4k = String(res).toLowerCase() === "4k" || res === 4;
        const sz4k = {
          "1:1": "4096*4096",
          "16:9": "4096*2304",
          "9:16": "2304*4096",
          "3:4": "3072*4096",
          "4:3": "4096*3072",
          "3:2": "4096*3072",
          "2:3": "3072*4096",
          "21:9": "4096*1755"
        };
        const sz2k = {
          "1:1": "2048*2048",
          "16:9": "2560*1440",
          "9:16": "1440*2560",
          "3:4": "1680*2240",
          "4:3": "2240*1680",
          "3:2": "2240*1680",
          "2:3": "1680*2240",
          "21:9": "2560*1080"
        };
        params.size = (is4k ? sz4k[ar] : sz2k[ar]) || params.size;
      }
      return {
        model: model,
        prompt: prompt.trim(),
        params: params
      };
    } catch (e) {
      console.log(`[NanoBanana Build Payload Error] ${e?.message || e}`);
      return {
        model: model || "nano-banana-2-lite",
        prompt: prompt || "",
        params: {
          ...images?.length ? {
            images: images
          } : {}
        }
      };
    }
  }
  async _buf(img) {
    try {
      if (!img) return null;
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          console.log(`[NanoBanana] Mengunduh gambar: ${img}`);
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return Buffer.isBuffer(res?.data) ? res.data : Buffer.from(res?.data || "");
        }
        const b64 = img.includes(";base64,") ? img.split(";base64,")[1] : img;
        return Buffer.from(b64 || "", "base64");
      }
      return null;
    } catch (e) {
      console.log(`[NanoBanana Image Buffer Error] ${e?.message || e}`);
      return null;
    }
  }
  async _auth() {
    try {
      console.log("[NanoBanana] Membuat email sementara...");
      const mRes = await axios.get(`${this.mailApi}?action=create`);
      this.email = mRes?.data?.email || null;
      if (!this.email) {
        console.log("[NanoBanana] Gagal mendapatkan alamat email baru");
        return false;
      }
      console.log(`[NanoBanana] Email terdaftar: ${this.email}`);
      console.log("[NanoBanana] Mengambil token CSRF...");
      const csrfRes = await this.client.get("/api/auth/csrf", {
        headers: {
          "content-type": "application/json",
          referer: `${this.baseUrl}/create`
        }
      });
      const csrfToken = csrfRes?.data?.csrfToken || "";
      console.log("[NanoBanana] Mengirim permintaan Magic Link...");
      await this.client.post("/api/auth/magic-link", {
        email: this.email
      }, {
        headers: {
          "content-type": "application/json",
          origin: this.baseUrl,
          referer: `${this.baseUrl}/create`
        }
      });
      console.log("[NanoBanana] Menunggu token Magic Link dari kotak masuk...");
      let token = null;
      for (let i = 0; i < 20; i++) {
        await this._slp(3e3);
        const chk = await axios.get(`${this.mailApi}?action=message&email=${encodeURIComponent(this.email)}`);
        const msgs = chk?.data?.data || [];
        for (const m of msgs) {
          const txt = m?.text_content || m?.html_content || "";
          const match = txt.match(/token=([a-zA-Z0-9_\.\-]+)/);
          if (match?.[1]) {
            token = match[1];
            break;
          }
        }
        if (token) break;
      }
      if (!token) {
        console.log("[NanoBanana] Gagal menerima token autentikasi magic link");
        return false;
      }
      console.log("[NanoBanana] Memproses callback verifikasi magic login...");
      const params = new URLSearchParams();
      params.append("token", token);
      params.append("redirect", "false");
      params.append("csrfToken", csrfToken);
      params.append("callbackUrl", `${this.baseUrl}/auth/magic-login?token=${token}`);
      await this.client.post("/api/auth/callback/magic-link?", params.toString(), {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "x-auth-return-redirect": "1",
          origin: this.baseUrl,
          referer: `${this.baseUrl}/auth/magic-login?token=${token}`
        }
      });
      await this.client.get(`/auth/magic-login?token=${token}`, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "upgrade-insecure-requests": "1",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1"
        }
      });
      console.log("[NanoBanana] Autentikasi akun berhasil diselesaikan");
      return true;
    } catch (e) {
      console.log(`[NanoBanana Auth Error] ${e?.message || e}`);
      return false;
    }
  }
  async _up(img) {
    try {
      if (typeof img === "string" && img.includes("cdn.nanobanana.io")) return img;
      console.log("[NanoBanana] Memproses upload gambar...");
      const buf = await this._buf(img);
      if (!buf) {
        console.log("[NanoBanana] Buffer gambar tidak valid");
        return null;
      }
      const form = new FormData();
      const fileName = `${crypto.randomUUID?.() || Date.now()}.png`;
      form.append("image", buf, {
        filename: fileName,
        contentType: "image/png"
      });
      const res = await this.client.post("/api/image/upload", form, {
        headers: {
          ...form.getHeaders?.(),
          origin: this.baseUrl,
          referer: `${this.baseUrl}/create`
        }
      });
      const url = res?.data?.data?.image_url || null;
      console.log(`[NanoBanana] Gambar berhasil diunggah: ${url || "gagal"}`);
      return url;
    } catch (e) {
      console.log(`[NanoBanana Upload Error] ${e?.message || e}`);
      return null;
    }
  }
  async _chk(predictionId) {
    try {
      console.log(`[NanoBanana] Mulai polling task status: ${predictionId}`);
      for (let i = 0; i < 60; i++) {
        await this._slp(3e3);
        const res = await this.client.post("/api/task/check", {
          predictionId: predictionId
        }, {
          headers: {
            "content-type": "application/json",
            origin: this.baseUrl,
            referer: `${this.baseUrl}/create`
          }
        });
        const data = res?.data?.data || {};
        const code = res?.data?.code;
        if (code === 0 && (data?.result?.length || data?.outputs?.length || data?.output)) {
          console.log("[NanoBanana] Task selesai diproses dengan sukses");
          return data.result || data.outputs || (data.output ? [data.output] : []);
        }
        console.log(`[NanoBanana] Menunggu proses generasi... (${i + 1}/60)`);
      }
      console.log("[NanoBanana] Polling task melebihi batas percobaan (timeout 60)");
      return null;
    } catch (e) {
      console.log(`[NanoBanana Check Polling Error] ${e?.message || e}`);
      return null;
    }
  }
  async generate({
    state,
    prompt,
    image,
    model,
    aspect_ratio,
    ratio,
    ...rest
  }) {
    try {
      const v = this._val({
        prompt: prompt,
        model: model,
        aspect_ratio: aspect_ratio || ratio
      });
      if (!v.valid) {
        console.log(`[NanoBanana Validation Failed] ${v.message}`);
        return {
          status: false,
          result: null,
          error: v.message,
          state: this._enc()
        };
      }
      if (state) this._dec(state);
      if (!this.jar?.["__Secure-authjs.session-token"]) {
        console.log("[NanoBanana] Sesi aktif tidak ditemukan, melakukan pendaftaran baru...");
        const authed = await this._auth();
        if (!authed) {
          return {
            status: false,
            result: null,
            error: "Gagal melakukan autentikasi akun otomatis",
            state: this._enc()
          };
        }
      }
      const images = [];
      if (image) {
        const rawImages = Array.isArray(image) ? image : [image];
        for (const item of rawImages) {
          const upUrl = await this._up(item);
          if (upUrl) images.push(upUrl);
        }
      }
      console.log("[NanoBanana] Mengonfigurasi payload sesuai konfigurasi web...");
      const payload = this._bld(v.model, prompt, images, {
        aspect_ratio: v.ratio,
        ...rest
      });
      console.log("[NanoBanana] Mengirim payload pembuatan task:", JSON.stringify(payload));
      const res = await this.client.post("/api/task/create", payload, {
        headers: {
          "content-type": "application/json",
          origin: this.baseUrl,
          referer: `${this.baseUrl}/create`
        }
      });
      const predictionId = res?.data?.data?.predictionId || res?.data?.data?.id || null;
      const taskId = res?.data?.data?.taskId || null;
      if (!predictionId) {
        const errMsg = res?.data?.message || "Gagal membuat task atau predictionId kosong";
        console.log(`[NanoBanana Task Create Failed] ${errMsg}`);
        return {
          status: false,
          result: null,
          error: errMsg,
          state: this._enc()
        };
      }
      const output = await this._chk(predictionId);
      if (!output) {
        return {
          status: false,
          result: null,
          error: "Polling timeout atau task gagal diselesaikan oleh worker server",
          state: this._enc()
        };
      }
      return {
        status: true,
        result: {
          task_id: taskId,
          prediction_id: predictionId,
          result_urls: output?.map(r => r?.url || r) || []
        },
        state: this._enc()
      };
    } catch (err) {
      console.log(`[NanoBanana Generate Error] ${err?.message || err}`);
      return {
        status: false,
        result: null,
        error: err?.message || String(err),
        state: this._enc()
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
  const api = new NanoBanana();
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