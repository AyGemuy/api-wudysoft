import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import https from "https";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class PixWith {
  constructor() {
    this.base = "https://api.pixwith.ai/api";
    this.mailApi = `https://${apiConfig.DOMAIN_URL}/api/mails/v22`;
    const agentConfig = {
      keepAlive: true,
      timeout: 6e4
    };
    this.api = axios.create({
      httpsAgent: new https.Agent(agentConfig),
      timeout: 6e4
    });
    this.h = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "content-type": "application/json",
      origin: "https://pixwith.ai",
      referer: "https://pixwith.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...SpoofHead()
    };
    this.mods = {
      flux: {
        baseId: "0",
        name: "Flux Free",
        tool_type: "0",
        opt: {
          prompt_optimization: true,
          num_outputs: 1,
          aspect_ratio: "1:1"
        }
      },
      flux_dev: {
        baseId: "28",
        name: "Flux.1 Dev",
        tool_type: "0",
        opt: {
          prompt_optimization: true,
          num_outputs: 1,
          aspect_ratio: "0"
        }
      },
      flux_pro: {
        baseId: "29",
        name: "Flux.1 Pro",
        tool_type: "0",
        opt: {
          prompt_optimization: true,
          resolution: "720p"
        }
      },
      flux_realism: {
        baseId: "33",
        name: "Flux Realism",
        tool_type: "0",
        opt: {
          prompt_optimization: true,
          aspect_ratio: "1:1"
        }
      },
      kling: {
        baseId: "34",
        name: "Kling AI Image",
        tool_type: "0",
        opt: {
          prompt_optimization: true,
          num_outputs: 1,
          aspect_ratio: "auto",
          resolution: "1K"
        }
      },
      banana: {
        baseId: "10",
        name: "Nano Banana",
        tool_type: "0",
        opt: {
          prompt_optimization: true,
          num_outputs: 1,
          aspect_ratio: "1:1"
        }
      },
      banana_v2: {
        baseId: "23",
        name: "Nano Banana 2.0",
        tool_type: "0",
        opt: {
          prompt_optimization: true,
          num_outputs: 1,
          aspect_ratio: "1:1",
          resolution: "1K"
        }
      },
      qwen: {
        baseId: "24",
        name: "Qwen-VL",
        tool_type: "0",
        opt: {
          aspect_ratio: "3:4"
        }
      },
      grok: {
        baseId: "19",
        name: "Grok-2",
        tool_type: "0",
        opt: {
          aspect_ratio: "2:3"
        }
      },
      seedream: {
        baseId: "32",
        name: "SeeDream",
        tool_type: "0",
        opt: {
          prompt_optimization: true,
          num_outputs: 1,
          aspect_ratio: "1:1",
          resolution: "2K"
        }
      },
      zimage: {
        baseId: "31",
        name: "Z-Image",
        tool_type: "0",
        opt: {
          aspect_ratio: "1:1"
        }
      },
      chatgpt: {
        baseId: "37",
        name: "DALL-E 3 (via GPT)",
        tool_type: "0",
        opt: {
          prompt_optimization: true,
          num_outputs: 1,
          aspect_ratio: "1:1",
          quality: "low"
        }
      },
      wan: {
        baseId: "36",
        name: "Wan2.1",
        tool_type: "2",
        isVideo: true,
        opt: {
          resolution: "720p",
          duration: 5
        }
      },
      veo: {
        baseId: "11",
        name: "Google Veo",
        tool_type: "2",
        isVideo: true,
        opt: {
          aspect_ratio: "16:9"
        }
      },
      sora: {
        baseId: "13",
        name: "OpenAI Sora",
        tool_type: "2",
        isVideo: true,
        opt: {
          duration: 10,
          aspect_ratio: "16:9"
        }
      },
      kling_video: {
        baseId: "39",
        name: "Kling Video",
        tool_type: "2",
        isVideo: true,
        opt: {
          duration: 10
        }
      }
    };
  }
  log(step, msg, type = "info") {
    const icon = type === "error" ? "❌" : type === "success" ? "✅" : "🚀";
    console.log(`[${icon}][${step}] ${msg}`);
  }
  async attempt(fn, retries = 3, delay = 3e3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (e) {
        if (i === retries - 1) throw e;
        const isNetworkError = e.code === "ECONNRESET" || e.code === "ETIMEDOUT" || !e.response;
        if (isNetworkError) {
          this.log("RETRY", `Koneksi terputus, mencoba ulang (${i + 1}/${retries})...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw e;
      }
    }
  }
  rand(len) {
    return crypto.randomBytes(len).toString("hex");
  }
  async dailyCheckIn(token) {
    return this.attempt(async () => {
      this.log("CLAIM", "Mencoba Daily Check-in...");
      const {
        data
      } = await this.api.post(`${this.base}/user/daily_check_in`, {}, {
        headers: {
          ...this.h,
          "x-session-token": token
        }
      });
      if (data.code === 1) {
        this.log("CLAIM", `Berhasil! Bonus: +${data.data?.add_credits || 0} credits`, "success");
      } else {
        this.log("CLAIM", `Info: ${data.message || "Sudah diklaim hari ini"}`);
      }
    });
  }
  async createMail() {
    return this.attempt(async () => {
      this.log("AUTH", "Membuat email sementara (v22)...");
      const {
        data
      } = await this.api.get(`${this.mailApi}?action=create`);
      if (!data?.email) throw new Error("Gagal mendapatkan email");
      return data.email;
    });
  }
  async waitOtp(email) {
    this.log("AUTH", `Menunggu OTP untuk ${email}...`);
    const id = email.split("@")[0];
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3e3));
      try {
        const inboxRes = await this.attempt(() => this.api.get(`${this.mailApi}?action=inbox&id=${id}`));
        if (inboxRes.data?.messages?.length > 0) {
          const latest = inboxRes.data.messages[0];
          const {
            region,
            key
          } = latest.storage;
          if (region && key) {
            const msgRes = await this.attempt(() => this.api.get(`${this.mailApi}?action=message&region=${region}&key=${key}`));
            const msg = msgRes.data?.text_content || "";
            const match = msg.match(/Verification code:\s*([A-Z0-9]+)/);
            if (match) {
              this.log("AUTH", `OTP ditemukan: ${match[1]}`, "success");
              return match[1];
            }
          }
        }
      } catch (e) {
        this.log("AUTH", `Gagal cek inbox: ${e.message}. Mencoba lagi...`, "error");
      }
      if (i % 5 === 0) this.log("AUTH", "Masih memantau inbox...");
    }
    throw new Error("OTP Timeout");
  }
  async login() {
    try {
      const ses = this.rand(16) + "0";
      const email = await this.createMail();
      await this.attempt(() => this.api.post(`${this.base}/user/send_email_code`, {
        email: email
      }, {
        headers: {
          ...this.h,
          "x-session-token": ses
        }
      }));
      const code = await this.waitOtp(email);
      this.log("AUTH", "Verifikasi kode...");
      const v = await this.attempt(() => this.api.post(`${this.base}/user/verify_email_code`, {
        email: email,
        code: code
      }, {
        headers: {
          ...this.h,
          "x-session-token": ses
        }
      }));
      const ex = await this.attempt(() => this.api.post("https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyAoRsni0q79r831sDrUjUTynjAEG2ai-EY", {
        token: v.data?.data?.custom_token,
        returnSecureToken: true
      }));
      const l = await this.attempt(() => this.api.post(`${this.base}/user/get_user`, {
        token: ex.data?.idToken,
        ref: "-1"
      }, {
        headers: {
          ...this.h,
          "x-session-token": ses
        }
      }));
      const token = l.data?.data?.session_token;
      this.log("AUTH", `Login Berhasil! Credits: ${l.data?.data?.credits || 0}`, "success");
      await this.dailyCheckIn(token);
      return token;
    } catch (e) {
      this.log("AUTH", e.message, "error");
      throw e;
    }
  }
  async solveImg(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string" && input.startsWith("http")) {
        const res = await this.attempt(() => this.api.get(input, {
          responseType: "arraybuffer"
        }));
        return Buffer.from(res.data);
      }
      const b64 = input.includes("base64,") ? input.split("base64,")[1] : input;
      return Buffer.from(b64, "base64");
    } catch (e) {
      throw new Error(`Decode Image Gagal: ${e.message}`);
    }
  }
  async upload(img, token) {
    return this.attempt(async () => {
      this.log("UPLOAD", "Menyiapkan URL upload...");
      const {
        data: p
      } = await this.api.post(`${this.base}/chats/pre_url`, {
        image_name: `${this.rand(8)}.jpg`,
        content_type: "image/jpeg"
      }, {
        headers: {
          ...this.h,
          "x-session-token": token
        }
      });
      const {
        url,
        fields
      } = p?.data?.url || {};
      const form = new FormData();
      for (const [k, v] of Object.entries(fields)) form.append(k, v);
      const buffer = await this.solveImg(img);
      form.append("file", buffer, {
        filename: "file.jpg",
        contentType: "image/jpeg"
      });
      await this.api.post(url, form, {
        headers: form.getHeaders()
      });
      return fields.key;
    });
  }
  async generate({
    prompt,
    image,
    model = "banana",
    ...customOpt
  }) {
    try {
      const token = await this.login();
      const cfg = this.mods[model] || this.mods.flux;
      let prefix = image ? "1-" : "0-";
      if (cfg.isVideo) prefix = "2-";
      const model_id = `${prefix}${cfg.baseId}`;
      const histToolType = cfg.isVideo ? "2" : image ? "1" : "0";
      const payload = {
        images: {},
        prompt: prompt || "high quality portrait",
        options: {
          ...cfg.opt,
          ...customOpt
        },
        model_id: model_id
      };
      if (image) {
        this.log("GENERATE", "Memproses input gambar...");
        const imgs = Array.isArray(image) ? image : [image];
        let idx = 1;
        for (const item of imgs) {
          payload.images[`image${idx++}`] = await this.upload(item, token);
        }
      }
      this.log("GENERATE", `Membuat task → model_id: ${model_id}`);
      const createRes = await this.attempt(() => this.api.post(`${this.base}/items/create`, payload, {
        headers: {
          ...this.h,
          "x-session-token": token
        }
      }));
      console.log("[CREATE RESPONSE]", createRes.data);
      if (createRes.data.code !== 1) throw new Error(createRes.data.message || "Gagal membuat task");
      this.log("POLLING", `Task dibuat. Polling hasil... (tool_type: ${histToolType})`);
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const his = await this.attempt(() => this.api.post(`${this.base}/items/history`, {
          tool_type: histToolType,
          page: 0,
          tag: "",
          page_size: 10
        }, {
          headers: {
            ...this.h,
            "x-session-token": token
          }
        }));
        const task = his.data?.data?.items?.[0];
        if (task && task.status === 2) {
          this.log("SUCCESS", "Hasil didapatkan!", "success");
          return {
            success: true,
            model_name: cfg.name,
            model_id: model_id,
            urls: task.result_urls.filter(u => !u.is_input).map(u => u.hd),
            credits_left: createRes.data.data?.user_credits
          };
        }
        if (task && task.status === 3) throw new Error("Task gagal di server");
        if (i % 5 === 0) this.log("POLLING", `Menunggu... (${i * 3}s)`);
      }
      throw new Error("Polling timeout — hasil tidak datang dalam 6 menit");
    } catch (e) {
      this.log("FAILED", e.message, "error");
      return {
        success: false,
        error: e.message
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
  const api = new PixWith();
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