import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class Magi1Client {
  constructor() {
    this.baseUrl = "https://www.magi1.ai";
    this.userAgent = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.cookies = {
      magi_adult_generate_entry_v1: "1"
    };
    this.config = {
      models: {
        "ai-sexy-image": {
          req: "/api/image-generator/z-image",
          stat: "/api/image-task-status",
          ikey: "reference_image_url",
          reqs: ["prompt"],
          defs: {
            model: "ai-sexy-image",
            enable_safety_checker: false,
            num_images: 1,
            aspect_ratio: "1:1",
            seed: -1
          },
          mpl: 3500,
          lnimg: [1],
          lratio: ["1:1", "16:9", "9:16", "4:3", "3:4"]
        },
        "ai-sexy-image-2": {
          req: "/api/image-generator/ai-sexy-image-2",
          stat: "/api/image-task-status",
          reqs: ["prompt"],
          defs: {
            model: "ai-sexy-image-2",
            num_images: 1,
            aspect_ratio: "1:1"
          },
          mpl: 3500,
          lnimg: [1],
          lratio: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]
        },
        "ai-sexy-image-3": {
          req: "/api/image-generator/ai-sexy-image-3",
          stat: "/api/image-task-status",
          reqs: ["prompt"],
          defs: {
            model: "ai-sexy-image-3",
            num_images: 1,
            aspect_ratio: "1:1",
            seed: -1
          },
          mpl: 3500,
          lnimg: [1],
          lratio: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]
        },
        "kling-image-o1-text-to-image": {
          req: "/api/image-generator/kling-image-o1",
          stat: "/api/image-task-status",
          reqs: ["prompt"],
          defs: {
            model: "kling-image-o1-text-to-image",
            enable_safety_checker: true,
            num_images: 1,
            aspect_ratio: "1:1"
          },
          mpl: 3500,
          lnimg: [1],
          lratio: ["1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"],
          lqual: ["1k", "2k"]
        },
        "text-image-doubao-seedream-4-0-250828": {
          req: "/api/image-generator/seedream4",
          stat: "/api/image-task-status",
          reqs: ["prompt"],
          defs: {
            model: "text-image-doubao-seedream-4-0-250828",
            num_images: 1,
            aspect_ratio: "1:1"
          },
          mpl: 3500,
          lnimg: [1],
          lratio: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"]
        },
        "kling-image-o1-image-to-image": {
          req: "/api/image-generator/kling-image-o1",
          stat: "/api/image-task-status",
          ikey: "image_urls",
          reqs: ["prompt"],
          defs: {
            model: "kling-image-o1-image-to-image",
            enable_safety_checker: true,
            num_images: 1,
            aspect_ratio: "1:1",
            seed: -1
          },
          mpl: 3500,
          limg: 10,
          lnimg: [1, 2, 3, 4],
          lratio: ["1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"],
          lqual: ["1k", "2k"]
        },
        "ai-sexy-image-2-edit": {
          req: "/api/image-generator/ai-sexy-image-2-edit",
          stat: "/api/image-task-status",
          ikey: "image_urls",
          reqs: ["prompt", "image"],
          defs: {
            model: "ai-sexy-image-2-edit",
            enable_safety_checker: false,
            num_images: 1,
            aspect_ratio: "1:1"
          },
          mpl: 3500,
          limg: 4,
          lnimg: [1, 2, 3, 4],
          lratio: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]
        },
        "ai-sexy-image-3-edit": {
          req: "/api/image-generator/ai-sexy-image-3-edit",
          stat: "/api/image-task-status",
          ikey: "image_urls",
          reqs: ["prompt", "image"],
          defs: {
            model: "ai-sexy-image-3-edit",
            enable_safety_checker: false,
            num_images: 1,
            aspect_ratio: "1:1",
            seed: -1
          },
          mpl: 3500,
          limg: 3,
          lnimg: [1, 2, 3, 4],
          lratio: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]
        },
        "image-editor-doubao-seedream-4-0-250828": {
          req: "/api/image-generator/seedream4",
          stat: "/api/image-task-status",
          ikey: "image_urls",
          reqs: ["prompt", "image"],
          defs: {
            model: "image-editor-doubao-seedream-4-0-250828",
            num_images: 1,
            aspect_ratio: "1:1"
          },
          mpl: 3500,
          limg: 10,
          lnimg: [1, 2, 3, 4],
          lratio: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"]
        },
        "seedream3-image-to-image": {
          req: "/api/seedream3",
          stat: "/api/image-task-status",
          ikey: "image_urls",
          reqs: ["image"],
          defs: {
            model: "seedream3-image-to-image",
            num_images: 1,
            seed: -1
          },
          limg: 1,
          lnimg: [1, 2, 3, 4]
        }
      }
    };
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: this.baseUrl,
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": this.userAgent
      }
    });
    this.client.interceptors.response.use(res => {
      this._sck(res.headers["set-cookie"]);
      return res;
    }, err => {
      if (err.response?.headers?.["set-cookie"]) {
        this._sck(err.response.headers["set-cookie"]);
      }
      return Promise.reject(err);
    });
    this.client.interceptors.request.use(config => {
      const header = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
      if (header) {
        config.headers["cookie"] = header;
      }
      return config;
    }, err => Promise.reject(err));
  }
  _sck(setCookies) {
    if (setCookies && Array.isArray(setCookies)) {
      for (const str of setCookies) {
        const parts = str.split(";")[0].split("=");
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const val = parts.slice(1).join("=").trim();
          this.cookies[name] = val;
        }
      }
    }
  }
  _gid() {
    try {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, e => {
        let r = 16 * Math.random() | 0;
        return ("x" === e ? r : 3 & r | 8).toString(16);
      });
    } catch {
      return "a0044431-940d-4eb6-b53a-fe5d76545bbb";
    }
  }
  _gfp() {
    return {
      screen_resolution: "424x942",
      timezone_offset: "480",
      language: "id-ID",
      platform: "Linux armv81",
      canvas_hash: "32065b6",
      webgl_hash: "37fbb630",
      hardware_concurrency: "8",
      device_memory: "8",
      session_storage: "1",
      local_storage: "1"
    };
  }
  _val(modelId, params) {
    const schema = this.config.models[modelId] || this.config.models["ai-sexy-image"];
    const merged = {
      ...schema.defs,
      ...params
    };
    const missing = [];
    for (const key of schema.reqs) {
      if (merged[key] === undefined || merged[key] === null || merged[key] === "") {
        missing.push(key);
      }
    }
    if (missing.length > 0) {
      return {
        isValid: false,
        error: `Parameter wajib tidak ditemukan: ${missing.join(", ")}`
      };
    }
    if (schema.mpl && merged.prompt && merged.prompt.length > schema.mpl) {
      return {
        isValid: false,
        error: `Panjang prompt melebihi batas maksimum (${schema.mpl} karakter).`
      };
    }
    if (schema.lratio && merged.aspect_ratio && !schema.lratio.includes(merged.aspect_ratio)) {
      return {
        isValid: false,
        error: `Rasio aspek "${merged.aspect_ratio}" tidak didukung oleh model ini.`
      };
    }
    if (schema.lnimg && merged.num_images && !schema.lnimg.includes(merged.num_images)) {
      return {
        isValid: false,
        error: `Jumlah gambar yang diminta (${merged.num_images}) tidak valid.`
      };
    }
    if (schema.lqual && merged.quality && !schema.lqual.includes(merged.quality)) {
      return {
        isValid: false,
        error: `Kualitas "${merged.quality}" tidak didukung oleh model ini.`
      };
    }
    return {
      isValid: true,
      data: merged
    };
  }
  async _up(image) {
    try {
      if (!image) {
        return {
          status: false,
          error: "Tidak ada data gambar yang diberikan."
        };
      }
      console.log("[Magi1] Memproses berkas gambar rujukan...");
      let base64Data = "";
      let imageType = "jpeg";
      if (Buffer.isBuffer(image)) {
        base64Data = image.toString("base64");
      } else if (typeof image === "string") {
        if (image.startsWith("http://") || image.startsWith("https://")) {
          const res = await axios.get(image, {
            responseType: "arraybuffer"
          });
          base64Data = Buffer.from(res.data).toString("base64");
          const contentType = res.headers["content-type"] || "image/jpeg";
          imageType = contentType.includes("png") ? "png" : "jpeg";
        } else if (image.startsWith("data:image")) {
          const matches = image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
          imageType = matches?.[1] === "png" ? "png" : "jpeg";
          base64Data = matches?.[2] || "";
        } else {
          base64Data = image;
        }
      }
      const imageSource = `data:image/${imageType};base64,${base64Data}`;
      console.log("[Magi1] Mengirim berkas terenkripsi ke endpoint CDN...");
      const response = await this.client.post("/api/cdn/upload-image", {
        imageSource: imageSource,
        imageType: imageType
      });
      const uploadedUrl = response?.data?.url || null;
      if (!uploadedUrl) {
        return {
          status: false,
          error: "Gagal memperoleh tautan balik dari server CDN."
        };
      }
      console.log("[Magi1] Gambar rujukan tersimpan di CDN:", uploadedUrl);
      return {
        status: true,
        result: uploadedUrl
      };
    } catch (error) {
      console.error("[Magi1] Kendala saat mengunggah gambar:", error?.message);
      return {
        status: false,
        error: error?.message || "Gagal memproses gambar."
      };
    }
  }
  async checkCredit() {
    try {
      console.log("[Magi1] Memeriksa saldo kredit aktif...");
      const response = await this.client.post("/api/credits", {});
      const credits = response?.data?.credits;
      console.log("[Magi1] Saldo kredit saat ini:", credits);
      return {
        status: true,
        result: credits
      };
    } catch (error) {
      console.error("[Magi1] Gagal memeriksa saldo kredit:", error?.message);
      return {
        status: false,
        error: error?.message || "Gagal memeriksa kredit."
      };
    }
  }
  async _auth(stateStr) {
    try {
      if (stateStr) {
        try {
          const decoded = JSON.parse(Buffer.from(stateStr, "base64").toString("utf8"));
          if (decoded?.cookies) {
            this.cookies = {
              ...this.cookies,
              ...decoded.cookies
            };
            const b64 = Buffer.from(JSON.stringify({
              cookies: this.cookies,
              email: decoded.email,
              credits: decoded.credits
            })).toString("base64");
            return {
              status: true,
              state: b64
            };
          }
        } catch {
          console.warn("[Magi1] Gagal parsing state, memicu registrasi ulang...");
        }
      }
      console.log("[Magi1] Sesi baru diinisiasi. Membuat alamat email sementara...");
      const mailRes = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      const email = mailRes?.data?.email;
      if (!email) return {
        status: false,
        error: "Gagal membuat email sementara."
      };
      console.log("[Magi1] Alamat email dibuat:", email);
      const verifier = crypto.randomBytes(32).toString("hex");
      const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
      console.log("[Magi1] Mengajukan pengiriman kode masuk (OTP)...");
      const otpPayload = {
        email: email,
        data: {},
        create_user: true,
        gotrue_meta_security: {},
        code_challenge: challenge,
        code_challenge_method: "s256"
      };
      const otpHeaders = {
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1enhrcXJ6Ymx1aHVmanZ5amZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzMzMDksImV4cCI6MjA4MTQ0OTMwOX0.7a74bXsRq_ZZ0jL9R4eingLSTqotVRgMLx0pvmaOECs",
        authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1enhrcXJ6Ymx1aHVmanZ5amZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzMzMDksImV4cCI6MjA4MTQ0OTMwOX0.7a74bXsRq_ZZ0jL9R4eingLSTqotVRgMLx0pvmaOECs"
      };
      await this.client.post("https://cuzxkqrzbluhufjvyjfz.supabase.co/auth/v1/otp?redirect_to=https%3A%2F%2Fwww.magi1.ai%2Fapi%2Fauth%2Fcallback%3Ffrom%3D%252F", otpPayload, {
        headers: otpHeaders
      });
      console.log("[Magi1] Menunggu kedatangan tautan verifikasi dari kotak masuk...");
      let verifyLink = null;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const inboxRes = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        const messages = inboxRes?.data?.data || [];
        const found = messages.find(m => m.text_content && m.text_content.includes("verify?token="));
        if (found) {
          const match = found.text_content.match(/(https:\/\/cuzxkqrzbluhufjvyjfz\.supabase\.co\/auth\/v1\/verify\S+)/);
          if (match) {
            verifyLink = match[1].trim();
            break;
          }
        }
      }
      if (!verifyLink) {
        return {
          status: false,
          error: "Magic link tidak ditemukan."
        };
      }
      console.log("[Magi1] Melakukan verifikasi tautan masuk...");
      const verifyRes = await this.client.get(verifyLink, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      let callbackUrl = verifyRes.headers["location"];
      if (!callbackUrl) {
        return {
          status: false,
          error: "Gagal mendapatkan tautan callback redirect."
        };
      }
      if (callbackUrl && !callbackUrl.startsWith("http")) {
        callbackUrl = "https://www.magi1.ai" + callbackUrl;
      }
      console.log("[Magi1] Memproses pertukaran kode autentikasi PKCE...");
      this.cookies["sb-cuzxkqrzbluhufjvyjfz-auth-token-code-verifier"] = `"${verifier}"`;
      await this.client.get(callbackUrl, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      delete this.cookies["sb-cuzxkqrzbluhufjvyjfz-auth-token-code-verifier"];
      console.log("[Magi1] Mengklaim kuota bonus pendaftaran...");
      await this.client.get("/api/bonus/bonus_check");
      const checkRes = await this.checkCredit();
      const credits = checkRes.status ? checkRes.result : 0;
      const stateObj = {
        cookies: this.cookies,
        email: email,
        credits: credits
      };
      const stateB64 = Buffer.from(JSON.stringify(stateObj)).toString("base64");
      console.log("[Magi1] Pendaftaran berhasil diselesaikan.");
      return {
        status: true,
        state: stateB64
      };
    } catch (err) {
      console.error("[Magi1] Autentikasi otomatis gagal:", err?.message);
      return {
        status: false,
        error: err?.message || "Registrasi gagal."
      };
    }
  }
  async chat({
    prompt,
    messages,
    state,
    ...rest
  }) {
    try {
      const auth = await this._auth(state);
      if (!auth.status) {
        return {
          status: false,
          error: auth.error
        };
      }
      console.log("[Magi1] Mengirim pesan obrolan...");
      const characterId = rest.characterId || "7cba0111-4b77-4cbc-a3c2-2f0b9655b312";
      const sessionId = rest.sessionId || this._gid().substring(0, 12);
      const anonId = rest.anonId || this._gid();
      const msgList = messages ? [...messages] : [];
      if (prompt) {
        msgList.push({
          role: "user",
          content: prompt
        });
      }
      const payload = {
        messages: msgList,
        characterId: characterId,
        sessionId: sessionId,
        anonId: anonId,
        clientSeq: 1,
        scenarioId: null,
        spiceLevel: null,
        customScenario: null,
        ...rest
      };
      const response = await this.client.post("/api/chat-v2/chat", payload);
      const rawData = response?.data || "";
      let textResult = rawData;
      if (typeof rawData === "string" && rawData.includes("data:")) {
        textResult = rawData.split("\n").filter(line => line.startsWith("data:")).map(line => {
          try {
            const cleaned = line.slice(5).trim();
            return JSON.parse(cleaned);
          } catch {
            return null;
          }
        }).filter(item => item?.type === "delta").map(item => item.v).join("");
      }
      return {
        status: true,
        result: textResult,
        state: auth.state
      };
    } catch (error) {
      console.error("[Magi1] Kendala pengiriman obrolan:", error?.message);
      return {
        status: false,
        error: error?.message || "Gagal menyelesaikan sesi obrolan."
      };
    }
  }
  async generate({
    prompt,
    image,
    state,
    ...rest
  }) {
    try {
      const auth = await this._auth(state);
      if (!auth.status) {
        return {
          status: false,
          error: auth.error
        };
      }
      console.log("[Magi1] Menyiapkan inisiasi tugas generate...");
      const selectedModelId = rest.model || "ai-sexy-image";
      const modelMeta = this.config.models[selectedModelId] || this.config.models["ai-sexy-image"];
      const validation = this._val(selectedModelId, {
        prompt: prompt,
        image: image,
        ...rest
      });
      if (!validation.isValid) {
        console.warn("[Magi1] Parameter wajib tidak terpenuhi:", validation.error);
        return {
          status: false,
          error: validation.error
        };
      }
      const params = validation.data;
      const solvedImageUrls = [];
      if (params.image) {
        const imageList = Array.isArray(params.image) ? params.image : [params.image];
        const maxImagesAllowed = modelMeta.limg || 1;
        if (imageList.length > maxImagesAllowed) {
          return {
            status: false,
            error: `Jumlah gambar yang dikirimkan melebihi batas maksimum model (${maxImagesAllowed} gambar).`
          };
        }
        for (const img of imageList) {
          const uploadResponse = await this._up(img);
          if (!uploadResponse.status) {
            return {
              status: false,
              error: `Gagal memproses salah satu gambar: ${uploadResponse.error}`
            };
          }
          solvedImageUrls.push(uploadResponse.result);
        }
      }
      const anonId = rest.anonId || this._gid();
      const fingerprint = this._gfp();
      const payload = {
        prompt: params.prompt,
        model: params.model,
        enable_safety_checker: params.enable_safety_checker !== undefined ? params.enable_safety_checker : false,
        num_images: params.num_images,
        aspect_ratio: params.aspect_ratio,
        seed: params.seed,
        ...rest
      };
      if (modelMeta.req.includes("z-image")) {
        if (!payload.anonymous_id) payload.anonymous_id = anonId;
        if (!payload.fingerprint_components) payload.fingerprint_components = fingerprint;
      }
      if (solvedImageUrls.length > 0) {
        if (modelMeta.ikey === "image_urls") {
          payload.image_urls = solvedImageUrls;
        } else {
          payload.reference_image_url = solvedImageUrls[0];
        }
      }
      console.log(`[Magi1] Mengirim tugas ke: ${modelMeta.req}`);
      const response = await this.client.post(modelMeta.req, payload);
      const responseData = response?.data?.data || response?.data;
      const taskId = responseData?.task_id;
      if (!taskId) {
        return {
          status: false,
          error: "Inisialisasi gagal; task ID tidak dikirimkan oleh server."
        };
      }
      console.log("[Magi1] Tugas terdaftar. Memulai polling status ID:", taskId);
      const pollInterval = 3e3;
      const maxRetries = 60;
      let attempt = 0;
      while (attempt < maxRetries) {
        attempt++;
        console.log(`[Magi1] Polling ke-${attempt}: Membaca status pengerjaan gambar...`);
        const checkRes = await this.client.get(`${modelMeta.stat}?task_id=${taskId}`);
        const statusData = checkRes?.data?.data || checkRes?.data;
        const status = statusData?.status || "PENDING";
        if (status === "SUCCEEDED") {
          console.log("[Magi1] Pembuatan gambar selesai diproses.");
          return {
            status: true,
            result: statusData?.result_images || [],
            state: auth.state
          };
        } else if (status === "FAILED") {
          return {
            status: false,
            error: statusData?.error || "Pembuatan gambar dibatalkan oleh server."
          };
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
      return {
        status: false,
        error: "Batas waktu pemeriksaan status (timeout) 60 detik telah terlampaui."
      };
    } catch (error) {
      console.error("[Magi1] Kendala dalam generate gambar:", error?.message);
      return {
        status: false,
        error: error?.message || "Terjadi kesalahan sistem internal."
      };
    }
  }
  async search({
    query,
    state,
    ...rest
  }) {
    try {
      const auth = await this._auth(state);
      if (!auth.status) {
        return {
          status: false,
          error: auth.error
        };
      }
      console.log("[Magi1] Mencari karakter berdasarkan kata kunci...");
      const limit = rest.limit || 20;
      const offset = rest.offset || 0;
      const tab = rest.tab || "all";
      const seed = rest.seed || Math.floor(Math.random() * 1e6);
      const payload = {
        limit: limit,
        offset: offset,
        tab: tab,
        seed: seed,
        q: query || "",
        ...rest
      };
      const response = await this.client.get("/api/chat-v2/characters", {
        params: payload
      });
      console.log("[Magi1] Selesai mencari.");
      const characters = response?.data?.characters || [];
      return {
        status: true,
        result: characters,
        state: auth.state
      };
    } catch (error) {
      console.error("[Magi1] Kendala pencarian karakter:", error?.message);
      return {
        status: false,
        error: error?.message || "Gagal menghubungi server pencarian."
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["chat", "generate", "search"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          chat: "/?action=chat&prompt=Halo+Ava",
          generate: "/?action=generate&prompt=Blonde",
          search: "/?action=search&query=Ava"
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
  const api = new Magi1Client();
  try {
    let response;
    switch (action) {
      case "chat":
        if (!params.prompt && (!params.messages || params.messages.length === 0)) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' atau array 'messages' wajib disediakan untuk action 'chat'.",
            example: "/?action=chat&prompt=Halo+Ava"
          });
        }
        response = await api.chat(params);
        break;
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'.",
            example: "/?action=generate&prompt=beautiful+girl"
          });
        }
        response = await api.generate(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' (pencarian nama bot) wajib diisi untuk action 'search'.",
            example: "/?action=search&query=Ava"
          });
        }
        response = await api.search(params);
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
        error: "Tidak ada respons dari sistem target. Silakan coba kembali nanti."
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server api route atau website target.",
      error: error.message || "Unknown Error"
    });
  }
}