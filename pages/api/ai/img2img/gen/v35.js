import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import PROMPT from "@/configs/ai-prompt";
class AIImageToImage {
  constructor() {
    this.baseUrl = "https://api.aiimagetoimage.io";
    this.models = ["standard", "nano_banana"];
    this.ratios = ["match_input_image", "1:1", "3:2", "2:3", "9:16", "16:9", "3:4", "4:3"];
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 6e4
    });
  }
  gSerial() {
    const mn = [4283543511, 3981806797];
    const hn = [3301882366, 444984403];
    const $ = [2277735313, 289559509];
    const J = [1291169091, 658871167];
    const Ie = [0, 5];
    const gn = [0, 1390208809];
    const pn = [0, 944331445];

    function fn(e) {
      const t = new Uint8Array(e.length);
      for (let n = 0; n < e.length; n++) {
        const o = e.charCodeAt(n);
        if (o > 127) return new TextEncoder().encode(e);
        t[n] = o;
      }
      return t;
    }

    function T(e, t) {
      const n = e[0] >>> 16,
        o = e[0] & 65535,
        r = e[1] >>> 16,
        s = e[1] & 65535,
        i = t[0] >>> 16,
        a = t[0] & 65535,
        d = t[1] >>> 16,
        l = t[1] & 65535;
      let c = 0,
        u = 0,
        h = 0,
        f = 0;
      f += s + l, h += f >>> 16, f &= 65535, h += r + d, u += h >>> 16, h &= 65535, u += o + a,
        c += u >>> 16, u &= 65535, c += n + i, c &= 65535, e[0] = c << 16 | u, e[1] = h << 16 | f;
    }

    function C(e, t) {
      const n = e[0] >>> 16,
        o = e[0] & 65535,
        r = e[1] >>> 16,
        s = e[1] & 65535,
        i = t[0] >>> 16,
        a = t[0] & 65535,
        d = t[1] >>> 16,
        l = t[1] & 65535;
      let c = 0,
        u = 0,
        h = 0,
        f = 0;
      f += s * l, h += f >>> 16, f &= 65535, h += r * l, u += h >>> 16, h &= 65535, h += s * d,
        u += h >>> 16, h &= 65535, u += o * l, c += u >>> 16, u &= 65535, u += r * d, c += u >>> 16,
        u &= 65535, u += s * a, c += u >>> 16, u &= 65535, c += n * l + o * d + r * a + s * i,
        c &= 65535, e[0] = c << 16 | u, e[1] = h << 16 | f;
    }

    function G(e, t) {
      const n = e[0];
      t %= 64, t === 32 ? (e[0] = e[1], e[1] = n) : t < 32 ? (e[0] = n << t | e[1] >>> 32 - t, e[1] = e[1] << t | n >>> 32 - t) : (t -= 32, e[0] = e[1] << t | n >>> 32 - t, e[1] = n << t | e[1] >>> 32 - t);
    }

    function L(e, t) {
      t %= 64, t !== 0 && (t < 32 ? (e[0] = e[1 >>> 32 - t], e[1] = e[1] << t) : (e[0] = e[1] << t - 32, e[1] = 0));
    }

    function b(e, t) {
      e[0] ^= t[0], e[1] ^= t[1];
    }

    function Le(e) {
      const t = [0, e[0] >>> 1];
      b(e, t), C(e, mn), t[1] = e[0] >>> 1, b(e, t), C(e, hn), t[1] = e[0] >>> 1, b(e, t);
    }

    function murmurHash128(e, t) {
      const n = fn(e);
      t = t || 0;
      const o = [0, n.length],
        r = o[1] % 16,
        s = o[1] - r,
        i = [0, t],
        a = [0, t],
        d = [0, 0],
        l = [0, 0];
      let c;
      for (c = 0; c < s; c = c + 16) {
        d[0] = n[c + 4] | n[c + 5] << 8 | n[c + 6] << 16 | n[c + 7] << 24, d[1] = n[c] | n[c + 1] << 8 | n[c + 2] << 16 | n[c + 3] << 24,
          l[0] = n[c + 12] | n[c + 13] << 8 | n[c + 14] << 16 | n[c + 15] << 24, l[1] = n[c + 8] | n[c + 9] << 8 | n[c + 10] << 16 | n[c + 11] << 24,
          C(d, $), G(d, 31), C(d, J), b(i, d), G(i, 27), T(i, a), C(i, Ie), T(i, gn), C(l, J),
          G(l, 33), C(l, $), b(a, l), G(a, 31), T(a, i), C(a, Ie), T(a, pn);
      }
      d[0] = 0, d[1] = 0, l[0] = 0, l[1] = 0;
      const u = [0, 0];
      switch (r) {
        case 15:
          u[1] = n[c + 14], L(u, 48), b(l, u);
        case 14:
          u[1] = n[c + 13], L(u, 40), b(l, u);
        case 13:
          u[1] = n[c + 12], L(u, 32), b(l, u);
        case 12:
          u[1] = n[c + 11], L(u, 24), b(l, u);
        case 11:
          u[1] = n[c + 10], L(u, 16), b(l, u);
        case 10:
          u[1] = n[c + 9], L(u, 8), b(l, u);
        case 9:
          u[1] = n[c + 8], b(l, u), C(l, J), G(l, 33), C(l, $), b(a, l);
        case 8:
          u[1] = n[c + 7], L(u, 56), b(d, u);
        case 7:
          u[1] = n[c + 6], L(u, 48), b(d, u);
        case 6:
          u[1] = n[c + 5], L(u, 40), b(d, u);
        case 5:
          u[1] = n[c + 4], L(u, 32), b(d, u);
        case 4:
          u[1] = n[c + 3], L(u, 24), b(d, u);
        case 3:
          u[1] = n[c + 2], L(u, 16), b(d, u);
        case 2:
          u[1] = n[c + 1], L(u, 8), b(d, u);
        case 1:
          u[1] = n[c], b(d, u), C(d, $), G(d, 31), C(d, J), b(i, d);
      }
      return b(i, o), b(a, o), T(i, a), T(a, i), Le(i), Le(a), T(i, a), T(a, i), ("00000000" + (i[0] >>> 0).toString(16)).slice(-8) + ("00000000" + (i[1] >>> 0).toString(16)).slice(-8) + ("00000000" + (a[0] >>> 0).toString(16)).slice(-8) + ("00000000" + (a[1] >>> 0).toString(16)).slice(-8);
    }

    function serialize(obj) {
      let result = "";
      for (const key of Object.keys(obj).sort()) {
        const val = obj[key];
        const valueStr = val === undefined || val === null ? "null" : JSON.stringify(val);
        result += `${result ? "|" : ""}${key.replace(/([:|\\])/g, "\\$1")}:${valueStr}`;
      }
      return result;
    }
    try {
      const mockComponents = {
        randomSeed: crypto.randomBytes(32).toString("hex"),
        timestamp: Date.now(),
        entropy: Math.random() * 1e6,
        pseudoUuid: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"),
        mockUserAgent: "MockBrowser/" + (Math.random() * 10).toFixed(1) + " (Node.js; mock-client)",
        mockCanvas: crypto.createHash("sha256").update(crypto.randomBytes(8)).digest("hex"),
        screenResolution: [
          [1920, 1080],
          [1440, 900],
          [1366, 768],
          [2560, 1440]
        ][Math.floor(Math.random() * 4)],
        mockMemory: [4, 8, 16, 32][Math.floor(Math.random() * 4)],
        mockPlatform: ["Win32", "MacIntel", "Linux x86_64"][Math.floor(Math.random() * 3)]
      };
      const serializedString = serialize(mockComponents);
      return murmurHash128(serializedString);
    } catch (error) {
      return "fallback_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    }
  }
  vParams(model, ratio) {
    console.log(`[Validasi] Memeriksa parameter model: "${model}" dan rasio: "${ratio}"`);
    const isValidModel = this.models.includes(model);
    const isValidRatio = this.ratios.includes(ratio);
    if (!isValidModel) {
      return `Model "${model}" tidak valid. Pilihan: ${this.models.join(", ")}`;
    }
    if (!isValidRatio) {
      return `Rasio "${ratio}" tidak valid. Pilihan: ${this.ratios.join(", ")}`;
    }
    return null;
  }
  async resImg(img) {
    try {
      console.log("[Gambar] Mengolah input gambar...");
      if (Buffer.isBuffer(img)) {
        console.log("[Gambar] Mendeteksi tipe data: Buffer");
        return img;
      }
      if (typeof img === "string") {
        if (/^https?:\/\//i.test(img)) {
          console.log(`[Gambar] Mendeteksi tipe data: URL (${img})`);
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (/^data:image\/[^;]+;base64,/i.test(img)) {
          console.log("[Gambar] Mendeteksi tipe data: Base64 URI");
          const base64Data = img.replace(/^data:image\/[^;]+;base64,/, "");
          return Buffer.from(base64Data, "base64");
        }
        if (/^[a-zA-Z0-9+/]*={0,2}$/.test(img)) {
          console.log("[Gambar] Mendeteksi tipe data: Raw Base64 string");
          return Buffer.from(img, "base64");
        }
      }
      return {
        error: "Format gambar tidak didukung atau tidak dikenali."
      };
    } catch (error) {
      console.error("[Gambar] Gagal mengolah input gambar:", error.message);
      return {
        error: error.message || "Gagal memproses gambar."
      };
    }
  }
  async pollTask(jobId) {
    console.log(`[Polling] Mulai memantau progress pekerjaan untuk job_id: ${jobId}`);
    const maxRetries = 60;
    const interval = 3e3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Polling] Upaya ${attempt}/${maxRetries} - Mengambil status pekerjaan...`);
        const res = await this.client.get("/api/result/get", {
          params: {
            job_id: jobId
          },
          headers: {
            accept: "*/*",
            referer: "https://aiimagetoimage.io/",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        });
        const data = res?.data;
        const result = data?.result;
        if (data?.code === 200 && result?.image_url?.length > 0) {
          console.log("[Polling] Pekerjaan selesai. Hasil gambar ditemukan.");
          return {
            status: "completed",
            result: result
          };
        }
        console.log("[Polling] Gambar belum siap. Menunggu 3 detik...");
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        console.warn(`[Polling] Terjadi kendala saat memeriksa status: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    console.error("[Polling] Batas waktu pemantauan habis (timeout).");
    return {
      status: "failed",
      result: {
        error: "Task monitoring timeout",
        job_id: jobId
      }
    };
  }
  async generate({
    prompt = PROMPT.text,
    image,
    ...rest
  }) {
    try {
      console.log("[Proses] Memulai pembuatan gambar (Image-to-Image)...");
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        console.error('[Validasi] Parameter "prompt" kosong atau tidak valid.');
        return {
          status: "failed",
          result: {
            error: 'Parameter "prompt" bersifat wajib (required) dan harus berupa string.'
          }
        };
      }
      if (!image) {
        console.error('[Validasi] Parameter "image" kosong.');
        return {
          status: "failed",
          result: {
            error: 'Parameter "image" bersifat wajib (required) dalam format Buffer, URL, atau Base64.'
          }
        };
      }
      const modelType = rest.model_type ? rest.model_type : "standard";
      const aspectRatio = rest.aspect_ratio ? rest.aspect_ratio : "match_input_image";
      const negativePrompt = rest.negative_prompt || "";
      const paramError = this.vParams(modelType, aspectRatio);
      if (paramError) {
        console.error(`[Validasi] Gagal: ${paramError}`);
        return {
          status: "failed",
          result: {
            error: paramError
          }
        };
      }
      const imageResult = await this.resImg(image);
      if (imageResult?.error) {
        console.error(`[Gambar] Gagal memproses gambar: ${imageResult.error}`);
        return {
          status: "failed",
          result: {
            error: imageResult.error
          }
        };
      }
      const form = new FormData();
      const payload = {
        prompt: prompt,
        negative_prompt: negativePrompt,
        model_type: modelType,
        aspect_ratio: aspectRatio
      };
      for (const [key, value] of Object.entries(payload)) {
        form.append(key, value);
      }
      form.append("image", imageResult, {
        filename: "input_image.webp",
        contentType: "image/webp"
      });
      console.log("[Proses] Mengirim data payload ke API...");
      const serialHeader = this.gSerial();
      console.log(`[Proses] Menghasilkan product-serial secara dinamis: ${serialHeader}`);
      const res = await this.client.post("/api/img2img/image-generate/image2image", form, {
        headers: {
          ...form.getHeaders(),
          accept: "*/*",
          origin: "https://aiimagetoimage.io",
          referer: "https://aiimagetoimage.io/",
          "product-serial": serialHeader,
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      const responseData = res?.data;
      const jobId = responseData?.result?.job_id;
      if (responseData?.code === 200 && jobId) {
        console.log(`[Proses] Request berhasil diterima. Job ID: ${jobId}`);
        return await this.pollTask(jobId);
      }
      return {
        status: "failed",
        result: {
          error: responseData?.message || "Gagal mengirimkan pekerjaan ke server."
        }
      };
    } catch (error) {
      console.error("[Proses] Terjadi kesalahan dalam proses pembuatan gambar:", error.message);
      return {
        status: "failed",
        result: {
          error: error.message || "Unknown generation error"
        }
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
  const api = new AIImageToImage();
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