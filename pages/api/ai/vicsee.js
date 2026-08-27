import crypto from "crypto";
import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class Vicsee {
  constructor() {
    this.baseURL = "https://vicsee.com";
    this.mailURL = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,en;q=0.9",
      "cache-control": "no-cache",
      origin: "https://vicsee.com",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.imgModels = ["nano-banana-2", "nano-banana", "nano-banana-pro", "flux-2", "gpt-image-2", "z-image", "seedream-4-5", "seedream-5", "grok-imagine-image", "vicsee-standard-image"];
    this.vidModels = ["sora-2", "sora-2-pro", "veo-3-1", "kling-2-6", "kling-3-0", "hailuo-2-3", "wan-2-6", "wan-2-6-flash", "seedance-1-0", "seedance-1-5-pro", "seedance-2-0", "seedance-2-0-fast", "seedance-2-mini", "seedance-2-5", "minimax-h3", "happy-horse-1-0", "grok-imagine", "vicsee-standard"];
    this.ratios = ["auto", "1:1", "16:9", "9:16", "4:3", "3:4", "4:5", "5:4", "2:3", "3:2", "21:9", "4:1", "1:4", "8:1", "1:8"];
    this.resolutions = ["480p", "720p", "768P", "1080p", "1080P", "1K", "2K", "4K"];
    this.http = axios.create({
      baseURL: this.baseURL,
      headers: this.headers
    });
  }
  slp(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  enc(data) {
    try {
      return Buffer.from(JSON.stringify(data)).toString("base64");
    } catch {
      return null;
    }
  }
  dec(str) {
    try {
      return JSON.parse(Buffer.from(str, "base64").toString("utf-8"));
    } catch {
      return null;
    }
  }
  async getMail() {
    try {
      console.log("[VicSee] Membuat email sementara...");
      const res = await axios.get(`${this.mailURL}?action=create`);
      const email = res?.data?.email;
      if (!email) {
        return {
          status: false,
          email: null,
          error: "Gagal membuat email sementara"
        };
      }
      return {
        status: true,
        email: email,
        error: null
      };
    } catch (err) {
      return {
        status: false,
        email: null,
        error: err?.message || "Error saat membuat email"
      };
    }
  }
  async getMagicLink(email, maxTry = 30) {
    try {
      console.log(`[VicSee] Menunggu Magic Link verifikasi untuk: ${email}...`);
      for (let i = 0; i < maxTry; i++) {
        await this.slp(3e3);
        const res = await axios.get(`${this.mailURL}?action=message&email=${encodeURIComponent(email)}`);
        const msgs = res?.data?.data || [];
        for (const m of msgs) {
          const txt = m?.text_content || m?.html_content || "";
          const match = txt.match(/token=([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            console.log(`[VicSee] Token Magic Link ditemukan: ${match[1]}`);
            return {
              status: true,
              token: match[1],
              error: null
            };
          }
        }
      }
      return {
        status: false,
        token: null,
        error: "Waktu tunggu verifikasi Magic Link habis"
      };
    } catch (err) {
      return {
        status: false,
        token: null,
        error: err?.message || "Error saat mengecek pesan Magic Link"
      };
    }
  }
  async auth() {
    try {
      console.log("[VicSee] Memulai alur autentikasi Magic Link...");
      const mailRes = await this.getMail();
      if (!mailRes?.status) return mailRes;
      const email = mailRes.email;
      console.log(`[VicSee] Mengirim permintaan Magic Link ke ${email}...`);
      const magicRes = await this.http.post("/api/auth/sign-in/magic-link", {
        email: email,
        callbackURL: "/nano-banana-pro"
      }, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        }
      });
      if (magicRes?.data?.code !== 0 && magicRes?.data?.message !== "ok" && !magicRes?.data?.status) {
        return {
          status: false,
          data: null,
          error: magicRes?.data?.message || "Gagal mengirim magic link"
        };
      }
      const linkRes = await this.getMagicLink(email);
      if (!linkRes?.status) return linkRes;
      console.log("[VicSee] Memverifikasi Magic Link Token...");
      const verifyRes = await this.http.get(`/api/auth/magic-link/verify?token=${encodeURIComponent(linkRes.token)}&callbackURL=%2Fnano-banana-pro`, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      const rawCookies = verifyRes?.headers?.["set-cookie"] || [];
      let sessionToken = "";
      for (const cookie of rawCookies) {
        const match = cookie.match(/__Secure-better-auth\.session_token=([^;]+)/);
        if (match && match[1]) {
          sessionToken = match[1];
          break;
        }
      }
      if (!sessionToken) {
        return {
          status: false,
          data: null,
          error: "Gagal mendapatkan session token dari server"
        };
      }
      const cookieHeader = `__Secure-better-auth.session_token=${sessionToken}`;
      console.log("[VicSee] Mengambil data user & saldo kredit...");
      const uInfoRes = await this.http.post("/api/user/get-user-info", {}, {
        headers: {
          ...this.headers,
          cookie: cookieHeader
        }
      });
      const uData = uInfoRes?.data?.data;
      const userId = uData?.id || "";
      const remainingCredits = uData?.credits?.remainingCredits ?? 20;
      console.log(`[VicSee] Login berhasil (User ID: ${userId}, Sisa Kredit: ${remainingCredits})`);
      return {
        status: true,
        data: {
          session_token: sessionToken,
          cookie: cookieHeader,
          user_id: userId,
          email: email,
          remaining_credits: remainingCredits
        },
        error: null
      };
    } catch (err) {
      return {
        status: false,
        data: null,
        error: err?.message || "Gagal proses autentikasi"
      };
    }
  }
  async toBuf(img) {
    try {
      if (Buffer.isBuffer(img)) return {
        status: true,
        buffer: img,
        error: null
      };
      if (typeof img === "string") {
        if (/^https?:\/\//i.test(img)) {
          console.log("[VicSee] Mengunduh gambar dari URL...");
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return {
            status: true,
            buffer: Buffer.from(res.data),
            error: null
          };
        }
        if (img.startsWith("data:")) {
          return {
            status: true,
            buffer: Buffer.from(img.split(",")[1], "base64"),
            error: null
          };
        }
        return {
          status: true,
          buffer: Buffer.from(img, "base64"),
          error: null
        };
      }
      return {
        status: false,
        buffer: null,
        error: "Format gambar harus URL, Base64, atau Buffer"
      };
    } catch (err) {
      return {
        status: false,
        buffer: null,
        error: err?.message || "Gagal konversi gambar"
      };
    }
  }
  async upImg(img, state) {
    try {
      console.log("[VicSee] Mendapatkan Presigned Upload URL...");
      const bufRes = await this.toBuf(img);
      if (!bufRes?.status) return bufRes;
      const filename = `${Date.now()}-${crypto.randomUUID()}.jpg`;
      const presignRes = await this.http.post("/api/storage/presign", {
        contentType: "image/jpeg",
        filename: filename
      }, {
        headers: {
          ...this.headers,
          "content-type": "application/json",
          cookie: state.cookie
        }
      });
      const pData = presignRes?.data?.data;
      const uploadUrl = pData?.uploadUrl;
      const publicUrl = pData?.publicUrl;
      if (!uploadUrl || !publicUrl) {
        return {
          status: false,
          file_url: null,
          error: presignRes?.data?.message || "Gagal mendapatkan presign URL"
        };
      }
      console.log("[VicSee] Mengunggah payload gambar ke Cloudflare Storage...");
      await axios.put(uploadUrl, bufRes.buffer, {
        headers: {
          "Content-Type": "image/jpeg"
        }
      });
      console.log(`[VicSee] Gambar berhasil diunggah: ${publicUrl}`);
      return {
        status: true,
        file_url: publicUrl,
        error: null
      };
    } catch (err) {
      return {
        status: false,
        file_url: null,
        error: err?.message || "Error saat upload gambar"
      };
    }
  }
  val({
    mode,
    model,
    prompt,
    aspect_ratio,
    resolution,
    duration
  }) {
    try {
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return {
          valid: false,
          error: "Parameter `prompt` wajib diisi dan berupa string"
        };
      }
      const isVideo = mode.includes("video") || mode === "t2v" || mode === "i2v";
      const allowedModels = isVideo ? this.vidModels : this.imgModels;
      if (model && !allowedModels.includes(model)) {
        return {
          valid: false,
          error: `Model '${model}' tidak valid untuk mode '${mode}'. Pilihan model:\n${allowedModels.join(", ")}`
        };
      }
      if (aspect_ratio && !this.ratios.includes(aspect_ratio)) {
        return {
          valid: false,
          error: `Aspect ratio '${aspect_ratio}' tidak valid. Pilihan rasio:\n${this.ratios.join(", ")}`
        };
      }
      if (resolution && !this.resolutions.map(r => r.toLowerCase()).includes(String(resolution).toLowerCase())) {
        return {
          valid: false,
          error: `Resolusi '${resolution}' tidak valid. Pilihan resolusi:\n${this.resolutions.join(", ")}`
        };
      }
      if (duration !== undefined && duration !== null) {
        const durNum = Number(duration);
        if (Number.isNaN(durNum) || durNum < 1 || durNum > 30) {
          return {
            valid: false,
            error: "Durasi video harus berupa angka antara 1 sampai 30 detik"
          };
        }
      }
      return {
        valid: true,
        error: null
      };
    } catch (err) {
      return {
        valid: false,
        error: err?.message || "Validasi input gagal"
      };
    }
  }
  async poll(taskId, state, interval = 3e3, maxAttempts = 60) {
    try {
      console.log(`[VicSee] Memulai polling task (Task ID: ${taskId})...`);
      for (let i = 0; i < maxAttempts; i++) {
        await this.slp(interval);
        const res = await this.http.post("/api/ai/query", {
          taskId: taskId
        }, {
          headers: {
            ...this.headers,
            "content-type": "application/json",
            cookie: state.cookie
          }
        });
        const data = res?.data?.data;
        const status = data?.status || "pending";
        console.log(`[VicSee] Antrean task [${i + 1}/${maxAttempts}] -> Status: ${status}`);
        if (status === "success") {
          let taskInfo = {};
          if (data?.taskInfo) {
            try {
              taskInfo = typeof data.taskInfo === "string" ? JSON.parse(data.taskInfo) : data.taskInfo;
            } catch {
              taskInfo = {};
            }
          }
          const images = [];
          if (data?.resultUrl && (data?.mediaType === "image" || data?.scene?.includes("image"))) {
            images.push(data.resultUrl);
          }
          if (Array.isArray(data?.resultUrls) && data.resultUrls.length) {
            images.push(...data.resultUrls);
          }
          if (Array.isArray(taskInfo?.images)) {
            for (const imgObj of taskInfo.images) {
              const url = imgObj?.imageUrl || imgObj?.url;
              if (url && !images.includes(url)) images.push(url);
            }
          }
          let videoUrl = null;
          if (data?.mediaType === "video" || data?.scene?.includes("video")) {
            videoUrl = data?.resultUrl || null;
          }
          if (!videoUrl && Array.isArray(taskInfo?.videos)) {
            videoUrl = taskInfo.videos[0]?.videoUrl || taskInfo.videos[0]?.url || null;
          }
          return {
            status: true,
            data: {
              task_id: taskId,
              status: status,
              cost_credits: data?.costCredits || 0,
              images: images,
              video_url: videoUrl
            },
            error: null
          };
        }
        if (status === "failed" || status === "canceled") {
          return {
            status: false,
            data: null,
            error: data?.errorMessage || "Task gagal diproses oleh server VicSee"
          };
        }
      }
      return {
        status: false,
        data: null,
        error: "Waktu polling task melebihi batas percobaan"
      };
    } catch (err) {
      return {
        status: false,
        data: null,
        error: err?.message || "Error saat polling task"
      };
    }
  }
  async generate({
    state,
    prompt,
    image,
    model,
    mode = "image",
    aspect_ratio,
    resolution,
    duration,
    google_search = false,
    ...rest
  }) {
    try {
      const hasImg = Boolean(image);
      const rawMode = (mode || "").toLowerCase();
      let isVideo = false;
      if (rawMode === "video" || rawMode === "t2v" || rawMode === "i2v" || this.vidModels.includes(model)) {
        isVideo = true;
      }
      let targetScene = "";
      if (isVideo) {
        targetScene = hasImg ? "image-to-video" : "text-to-video";
      } else {
        targetScene = hasImg ? "image-to-image" : "text-to-image";
      }
      console.log(`[VicSee] Mode terdeteksi: ${targetScene.toUpperCase()} (Media: ${isVideo ? "VIDEO" : "IMAGE"}, Input Gambar: ${hasImg ? "Ya" : "Tidak"})`);
      let selModel = model;
      if (!selModel) {
        selModel = isVideo ? hasImg ? "wan-2-6" : "seedance-2-0" : hasImg ? "nano-banana-2" : "nano-banana-2";
      }
      const valRes = this.val({
        mode: targetScene,
        model: selModel,
        prompt: prompt,
        aspect_ratio: aspect_ratio,
        resolution: resolution,
        duration: duration
      });
      if (!valRes?.valid) {
        return {
          status: false,
          result: null,
          error: valRes.error,
          state: state || null
        };
      }
      let activeState = state ? this.dec(state) : null;
      if (!activeState?.session_token || !activeState?.cookie || activeState?.remaining_credits !== undefined && activeState.remaining_credits < 2) {
        console.log("[VicSee] State tidak valid atau sisa kredit habis. Menyiapkan sesi baru...");
        const authRes = await this.auth();
        if (!authRes?.status) {
          return {
            status: false,
            result: null,
            error: authRes.error,
            state: null
          };
        }
        activeState = authRes.data;
      } else {
        console.log(`[VicSee] Menggunakan state tersimpan (User ID: ${activeState.user_id}, Sisa Kredit: ${activeState.remaining_credits})`);
      }
      let uploadedUrl = null;
      if (hasImg) {
        const upRes = await this.upImg(image, activeState);
        if (!upRes?.status) {
          return {
            status: false,
            result: null,
            error: upRes.error,
            state: this.enc(activeState)
          };
        }
        uploadedUrl = upRes.file_url;
      }
      let options = {
        resolution: resolution || (isVideo ? "720p" : "1K"),
        aspect_ratio: aspect_ratio || (isVideo ? "16:9" : "auto"),
        output_format: rest?.output_format || "jpg",
        google_search: Boolean(google_search),
        ...rest
      };
      if (isVideo) {
        options.duration = duration ? String(duration) : "5";
        if (targetScene === "image-to-video" && uploadedUrl) {
          options.image_input = [uploadedUrl];
        }
      } else {
        if (targetScene === "image-to-image" && uploadedUrl) {
          options.image_input = [uploadedUrl];
        }
      }
      const payload = {
        mediaType: isVideo ? "video" : "image",
        scene: targetScene,
        provider: "kie",
        model: selModel,
        prompt: prompt.trim(),
        options: options
      };
      console.log(`[VicSee] Mengirim task generate [Model: ${selModel}, Scene: ${targetScene}]...`);
      let genRes = await this.http.post("/api/ai/generate", payload, {
        headers: {
          ...this.headers,
          "content-type": "application/json",
          cookie: activeState.cookie
        }
      });
      let genData = genRes?.data?.data;
      let errMsg = genRes?.data?.message || "";
      if ((!genData?.id || genRes?.data?.code !== 0) && (/credit|unauthorized|session|token|auth/i.test(errMsg) || genRes?.data?.code !== 0)) {
        console.log(`[VicSee] Kendala sesi/kredit (${errMsg}). Melakukan re-autentikasi otomatis...`);
        const reAuth = await this.auth();
        if (reAuth?.status) {
          activeState = reAuth.data;
          if (hasImg && !uploadedUrl) {
            const reUp = await this.upImg(image, activeState);
            if (reUp?.status) {
              uploadedUrl = reUp.file_url;
              if (payload.options.image_input) payload.options.image_input = [uploadedUrl];
            }
          }
          genRes = await this.http.post("/api/ai/generate", payload, {
            headers: {
              ...this.headers,
              "content-type": "application/json",
              cookie: activeState.cookie
            }
          });
          genData = genRes?.data?.data;
        }
      }
      const taskId = genData?.id;
      if (!taskId) {
        return {
          status: false,
          result: null,
          error: genRes?.data?.message || "Gagal membuat task generate di server VicSee",
          state: this.enc(activeState)
        };
      }
      const pollRes = await this.poll(taskId, activeState);
      if (!pollRes?.status) {
        return {
          status: false,
          result: null,
          error: pollRes.error,
          state: this.enc(activeState)
        };
      }
      const finalData = pollRes.data;
      return {
        status: true,
        result: {
          mode: targetScene,
          model: selModel,
          ...finalData
        },
        state: this.enc(activeState)
      };
    } catch (err) {
      console.error(`[VicSee Error] ${err?.message || err}`);
      return {
        status: false,
        result: null,
        error: err?.message || "Terjadi kesalahan sistem",
        state: state || null
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
  const api = new Vicsee();
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