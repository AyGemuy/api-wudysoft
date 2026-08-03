import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class Generator {
  constructor() {
    this.client = null;
    this.token = null;
    console.log("[Generator] Instance dibuat.");
  }
  _genTkn() {
    try {
      console.log("[genTkn] Membuat token baru...");
      const payload = {
        x: "/generate/image?refid=undressai_com",
        lg: "en",
        dw: 424,
        dh: 942,
        cd: 24,
        to: "-480",
        u: crypto.randomBytes(5).toString("hex"),
        z: "",
        ymc: Date.now().toString(),
        re: "aidirectori_es",
        mk: {
          paypal: true
        },
        fl: ["paypal"]
      };
      const token = Buffer.from(JSON.stringify(payload)).toString("base64");
      console.log("[genTkn] Token berhasil dibuat.");
      return token;
    } catch (err) {
      console.error("[genTkn] Gagal membuat token:", err.message);
      throw new Error(`Gagal membuat token: ${err.message}`);
    }
  }
  _init(token) {
    try {
      console.log("[init] Memulai inisialisasi client...");
      if (!token && !this.token) {
        this.token = this._genTkn();
      } else if (token) {
        this.token = token;
      }
      if (!this.token) {
        throw new Error("Token tidak tersedia.");
      }
      this.client = axios.create({
        baseURL: `${proxy}https://pornworks.com/api/v2`,
        headers: {
          "cf-auth-token": this.token,
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          Site: "pornworks",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "id-ID",
          Referer: "https://pornworks.com/en/generate/image",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        }
      });
      this.client.interceptors.request.use(config => {
        console.log(`[Request] ${config.method?.toUpperCase()} -> ${config.url}`);
        return config;
      }, error => {
        console.error("[Request Interceptor Error]", error.message);
        return Promise.reject(error);
      });
      console.log("[init] Client berhasil diinisialisasi.");
    } catch (err) {
      console.error("[init] Gagal inisialisasi:", err.message);
      throw err;
    }
  }
  async _parseImg(img) {
    try {
      console.log("[parseImg] Memproses input gambar...");
      if (Buffer.isBuffer(img)) {
        console.log("[parseImg] Input adalah Buffer.");
        return img;
      }
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          console.log("[parseImg] Mengunduh dari URL:", img);
          const response = await axios.get(img, {
            responseType: "arraybuffer"
          });
          console.log("[parseImg] Unduhan berhasil, ukuran:", response.data.length);
          return Buffer.from(response.data);
        }
        if (img.startsWith("data:image")) {
          console.log("[parseImg] Mendekode data URL.");
          return Buffer.from(img.split(",")[1], "base64");
        }
        console.log("[parseImg] Menganggap sebagai Base64.");
        return Buffer.from(img, "base64");
      }
      throw new Error("Format input gambar tidak valid");
    } catch (err) {
      console.error("[parseImg] Error:", err.message);
      throw err;
    }
  }
  async _upload(imgInput) {
    try {
      console.log("[upload] Memulai upload...");
      const buffer = await this._parseImg(imgInput);
      const form = new FormData();
      const filename = `${crypto.randomUUID()}.jpg`;
      form.append("file", buffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      console.log("[upload] File siap, filename:", filename);
      const headers = {
        ...form.getHeaders(),
        Referer: "https://pornworks.com/en/banana"
      };
      console.log("[upload] PUT /uploads/banana");
      const response = await this.client.put("/uploads/banana", form, {
        headers: headers
      });
      const url = response?.data?.url;
      if (!url) {
        throw new Error("Respons upload tidak mengandung URL.");
      }
      console.log("[upload] Berhasil, URL:", url);
      return url;
    } catch (err) {
      console.error("[upload] Error:", err.message);
      throw err;
    }
  }
  async _poll(id) {
    try {
      const maxAttempts = 60,
        interval = 3e3;
      console.log(`[poll] Polling ID: ${id}`);
      for (let i = 0; i < maxAttempts; i++) {
        try {
          const r = Math.random();
          console.log(`[poll] Attempt ${i + 1}/${maxAttempts}, r=${r}`);
          const response = await this.client.get(`/generations/${id}/state?r=${r}`);
          const data = response?.data;
          const state = data?.state || "pending";
          console.log(`[poll] Status: ${state}`);
          if (state === "done") {
            console.log("[poll] Selesai.");
            return data?.results;
          }
          if (state === "failed") {
            throw new Error("Generasi gambar gagal di server.");
          }
        } catch (err) {
          console.warn(`[poll] Gangguan attempt ${i + 1}:`, err.message);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
      throw new Error("Waktu polling habis (timeout)");
    } catch (err) {
      console.error("[poll] Error:", err.message);
      throw err;
    }
  }
  async _listModels(baseModel = "sdxl", top = 40) {
    try {
      console.log(`[_listModels] baseModel=${baseModel}, top=${top}`);
      const referer = `https://pornworks.com/en/generate/image/templates;model=${baseModel}`;
      const response = await this.client.get("/models", {
        params: {
          baseModel: baseModel,
          top: top
        },
        headers: {
          Referer: referer
        }
      });
      console.log("[_listModels] Berhasil.");
      return response.data;
    } catch (err) {
      console.error("[_listModels] Error:", err.message);
      throw err;
    }
  }
  async _evaluatePrompt(baseModel, prompt) {
    try {
      console.log(`[_evaluatePrompt] baseModel=${baseModel}`);
      const referer = `https://pornworks.com/en/generate/image/templates;model=${baseModel}`;
      const body = {
        baseModel: baseModel,
        prompt: prompt
      };
      const response = await this.client.post("/evaluate-prompt", body, {
        headers: {
          Referer: referer
        }
      });
      console.log("[_evaluatePrompt] Berhasil.");
      return response.data;
    } catch (err) {
      console.error("[_evaluatePrompt] Error:", err.message);
      throw err;
    }
  }
  async _getThumbnail(modelId) {
    try {
      console.log(`[_getThumbnail] modelId=${modelId}`);
      const referer = "https://pornworks.com/en/generate/image";
      const response = await this.client.get("/models/thumbnail", {
        params: {
          id: modelId
        },
        headers: {
          Referer: referer
        }
      });
      console.log("[_getThumbnail] Berhasil.");
      return response.data;
    } catch (err) {
      console.error("[_getThumbnail] Error:", err.message);
      throw err;
    }
  }
  async _generate(options) {
    const {
      prompt,
      image,
      undress,
      ...rest
    } = options;
    let endpoint = "",
      body = {};
    const mode = undress ? "undress" : image ? "i2i" : "t2i";
    let evaluated = null;
    let thumbnail = null;
    try {
      if (mode === "undress") {
        if (!image) throw new Error("image wajib untuk undress.");
        const url = await this._upload(image);
        endpoint = "/generate/undress";
        body = {
          gender: rest.gender || "auto",
          image: url,
          ...rest
        };
      } else if (mode === "i2i") {
        if (!prompt) throw new Error("prompt wajib untuk i2i.");
        const url = await this._upload(image);
        endpoint = "/generate/text2image";
        body = {
          baseModel: "qwen_image_edit",
          checkpoint: "qwen_image_edit",
          prompt: prompt,
          ratio: rest.ratio || "1x1",
          performance: rest.performance || "quality",
          fast: rest.fast ?? false,
          reference: url,
          product: "banana",
          ...rest
        };
      } else {
        if (!prompt) throw new Error("prompt wajib untuk t2i.");
        let finalPrompt = prompt;
        let resources = rest.resources || [];
        if (rest.template || prompt.includes("<lora:")) {
          const baseModel = rest.baseModel || "sdxl";
          const evalResult = await this._evaluatePrompt(baseModel, prompt);
          evaluated = evalResult;
          finalPrompt = evalResult.restored || prompt;
          resources = evalResult.resources || [];
          if (rest.getThumbnail && resources.length) {
            thumbnail = await this._getThumbnail(resources[0].id);
          }
        }
        endpoint = "/generate/text2image";
        body = {
          baseModel: rest.baseModel || "sdxl",
          checkpoint: rest.checkpoint || "nude_people",
          prompt: finalPrompt,
          negativePrompt: rest.negativePrompt || "",
          resources: resources,
          ratio: rest.ratio || "2x3",
          sharpness: rest.sharpness ?? 5,
          cfgScale: rest.cfgScale ?? 17,
          performance: rest.performance || "express",
          denoisingStrength: rest.denoisingStrength ?? 1,
          fast: rest.fast ?? false,
          nsfw: rest.nsfw ?? false,
          ...rest
        };
      }
      const refererMap = {
        "/generate/text2image": "https://pornworks.com/en/generate/image",
        "/generate/undress": "https://pornworks.com/en/undress/image"
      };
      const referer = refererMap[endpoint] || "https://pornworks.com/en/generate/image";
      console.log(`[_generate] POST ${endpoint}`);
      const response = await this.client.post(endpoint, body, {
        headers: {
          Referer: referer
        }
      });
      const taskId = response?.data?.id;
      if (!taskId) throw new Error("Tidak mendapat ID tugas.");
      const results = await this._poll(taskId);
      return {
        data: results,
        evaluated: evaluated,
        thumbnail: thumbnail
      };
    } catch (err) {
      console.error("[_generate] Error:", err.message);
      throw err;
    }
  }
  async run({
    action,
    ...options
  }) {
    console.log("[run] Action:", action, "Options:", JSON.stringify(options, null, 2));
    try {
      this._init(options.token);
      const actionMap = {
        list: {
          fields: [],
          description: "List models (baseModel dan top opsional)"
        },
        models: {
          fields: [],
          description: "Alias untuk list models"
        },
        evaluate: {
          fields: ["baseModel", "prompt"],
          description: "Evaluasi prompt dengan baseModel tertentu"
        },
        thumbnail: {
          fields: ["modelId"],
          description: "Ambil thumbnail berdasarkan modelId"
        },
        generate: {
          fields: ["prompt"],
          description: "Generate gambar dari prompt (text-to-image). Juga bisa menerima image untuk img2img"
        },
        undress: {
          fields: ["image"],
          description: "Undress gambar (image wajib)"
        }
      };
      if (!action) {
        return {
          status: "error",
          result: `Action wajib diisi. Aksi yang tersedia: ${Object.keys(actionMap).join(", ")}`,
          token: this.token
        };
      }
      const actionDef = actionMap[action];
      if (!actionDef) {
        return {
          status: "error",
          result: `Action "${action}" tidak dikenal. Aksi yang tersedia: ${Object.keys(actionMap).join(", ")}`,
          token: this.token
        };
      }
      const missing = actionDef.fields.filter(f => !options[f]);
      if (missing.length) {
        return {
          status: "error",
          result: `Field wajib untuk action "${action}" hilang: ${missing.join(", ")}. Harap berikan: ${missing.join(", ")}`,
          token: this.token
        };
      }
      let result;
      switch (action) {
        case "list":
        case "models": {
          const {
            baseModel = "sdxl",
              top = 40
          } = options;
          result = await this._listModels(baseModel, top);
          break;
        }
        case "evaluate": {
          const {
            baseModel,
            prompt
          } = options;
          result = await this._evaluatePrompt(baseModel, prompt);
          break;
        }
        case "thumbnail": {
          const {
            modelId
          } = options;
          result = await this._getThumbnail(modelId);
          break;
        }
        case "generate": {
          const genResult = await this._generate(options);
          result = genResult;
          break;
        }
        case "undress": {
          const genResult = await this._generate({
            ...options,
            undress: true
          });
          result = genResult;
          break;
        }
        default:
          throw new Error("Aksi tidak terduga");
      }
      return {
        status: "success",
        result: result,
        token: this.token
      };
    } catch (err) {
      console.error("[run Error]", err.message);
      return {
        status: "error",
        result: err.message,
        token: this.token
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new Generator();
  try {
    const data = await api.run(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}