import axios from "axios";
import crypto from "crypto";
class RaphaelApp {
  constructor() {
    this.base = "https://raphael.app";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      cookie: "",
      origin: this.base,
      pragma: "no-cache",
      referer: `${this.base}/id`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.client = axios.create({
      baseURL: this.base
    });
    this.client.interceptors.response.use(res => {
      const setCookie = res.headers["set-cookie"];
      if (setCookie) {
        console.log(`[PROSES] Menangkap set-cookie baru dari server...`);
        const parsed = setCookie.map(c => c.split(";")[0]).join("; ");
        this.headers.cookie = this.headers.cookie ? `${this.headers.cookie}; ${parsed}` : parsed;
      }
      return res;
    }, err => Promise.reject(err));
  }
  async init() {
    try {
      console.log(`[PROSES] Melakukan inisialisasi awal tanpa cookie...`);
      await this.client.get("/id", {
        headers: this.headers
      });
      console.log(`[SUKSES] Cookie berhasil didapatkan secara otomatis.`);
    } catch (e) {
      console.log(`[WARN] Gagal auto-init cookie halaman utama: ${e?.message}`);
    }
  }
  vRatio(w, h) {
    console.log(`[PROSES] Menghitung rasio aspek dimensi: ${w || 0}x${h || 0}`);
    if (!w || !h) return "1:1";
    const current = w / h;
    const list = [{
      value: "1:1",
      ratio: 1
    }, {
      value: "3:4",
      ratio: 3 / 4
    }, {
      value: "4:3",
      ratio: 4 / 3
    }, {
      value: "16:9",
      ratio: 16 / 9
    }, {
      value: "9:16",
      ratio: 9 / 16
    }, {
      value: "2:3",
      ratio: 2 / 3
    }, {
      value: "3:2",
      ratio: 1.5
    }, {
      value: "21:9",
      ratio: 21 / 9
    }, {
      value: "4:5",
      ratio: .8
    }, {
      value: "5:4",
      ratio: 5 / 4
    }];
    return list.reduce((prev, curr) => Math.abs(Math.log(current / prev.ratio)) < Math.abs(Math.log(current / curr.ratio)) ? prev : curr).value;
  }
  async toB64(input) {
    try {
      if (typeof input === "string" && (input.startsWith("http://") || input.startsWith("https://"))) {
        console.log(`[PROSES] Mengunduh gambar dari URL ke Base64...`);
        const res = await this.client.get(input, {
          responseType: "arraybuffer"
        });
        const mime = res.headers["content-type"] || "image/webp";
        return `data:${mime};base64,${Buffer.from(res.data).toString("base64")}`;
      }
      if (Buffer.isBuffer(input)) {
        return `data:image/webp;base64,${input.toString("base64")}`;
      }
      return input || "";
    } catch (e) {
      console.error(`[ERR] Gagal konversi gambar ke Base64:`, e?.message);
      return "";
    }
  }
  async enh(prompt) {
    try {
      console.log(`[PROSES] Mengoptimalkan (Enhancing) prompt: "${prompt}"`);
      const {
        data
      } = await this.client.post("/api/video/enhance-prompt", {
        prompt: prompt
      }, {
        headers: this.headers
      });
      return data?.enhanced || prompt;
    } catch (e) {
      console.log(`[WARN] Gagal enhance prompt, gunakan asli: ${e?.message}`);
      return prompt;
    }
  }
  async generate({
    prompt,
    image,
    enhanced = false,
    width,
    height,
    ...rest
  }) {
    try {
      if (!this.headers.cookie) {
        await this.init();
      }
      console.log(`[PROSES] Memulai generate gambar...`);
      const reqId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const aspect = this.vRatio(width, height);
      let finalPrompt = prompt;
      let enhancedPrompt = undefined;
      if (enhanced) {
        finalPrompt = await this.enh(prompt);
        enhancedPrompt = finalPrompt;
      }
      const inputImages = [];
      if (image) {
        const listImages = Array.isArray(image) ? image : [image];
        for (const img of listImages) {
          const b64 = await this.toB64(img);
          if (b64) inputImages.push(b64);
        }
      }
      const isI2I = inputImages.length > 0;
      const defaultPayload = {
        prompt: prompt,
        enhanced_prompt: enhancedPrompt,
        entry_type: "ai-image",
        aspect: aspect || "1:1",
        isSafeContent: true,
        autoTranslate: true,
        model_id: "raphael-pro",
        number_of_images: 1,
        highQuality: false,
        fastMode: false,
        turnstileToken: null,
        client_request_id: reqId,
        action: isI2I ? "img2img" : undefined,
        input_image: isI2I ? inputImages[0] : undefined,
        input_image_list: isI2I ? inputImages : undefined
      };
      const payload = {
        ...defaultPayload,
        ...rest
      };
      console.log(`[PROSES] Mengirim permintaan payload ke server Raphael API (${isI2I ? "I2I Mode" : "T2I Mode"})...`);
      const {
        data
      } = await this.client.post("/api/generate-image", payload, {
        headers: this.headers
      });
      if (data?.url && !data.url.startsWith("http")) {
        data.full_url = `${this.base}${data.url}`;
      }
      console.log(`[SUKSES] Gambar berhasil diproses!`);
      return data;
    } catch (e) {
      console.error(`[ERR] Gagal pada fungsi generate:`, e?.response?.data || e?.message);
      throw e;
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
  const api = new RaphaelApp();
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