import crypto from "crypto";
import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class Vidguru {
  constructor() {
    this.baseURL = `${proxy}https://www.vidguru.ai`;
    this.mailURL = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID,en;q=0.9",
      "cache-control": "no-cache",
      origin: "https://www.vidguru.ai",
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
    this.imgModels = ["nano-banana", "nano-banana-2", "nano-banana-2-lite", "nano-banana-pro", "seedream", "seedream-4.5", "seedream-5-pro", "seedream-5-lite", "flux", "flux-schnell", "flux-1.1-pro", "flux-2-dev", "flux-2-pro", "flux-2-max", "imagen-4", "imagen-4-ultra", "ideogram-v4", "ideogram-v4-quality", "ideogram-v4-balanced", "gpt-image-1.5", "gpt-image-2", "recraft-v4", "recraft-v4.1", "xai-grok-imagine-image", "xai-grok-imagine-image-edit", "grok-imagine-image-2", "grok-imagine-image-quality"];
    this.vidModels = ["veo-3-fast", "veo-3", "veo-3.1-fast", "veo-3.1", "veo-3.1-lite", "happyhorse-1.0", "happyhorse-1.1", "hailuo-02", "hailuo-2.3", "hailuo-2.3-fast", "wan-2.5-i2v", "wan-2.5-t2v", "wan-2.6-i2v", "wan-2.6-t2v", "ltx-2-fast", "ltx-2-pro", "ltx-2.5-fast", "sora-2", "sora-2-pro", "kling-v2.1", "kling-v2.5", "kling-v2.6", "kling-v3-video", "seedance-2.0", "seedance-2.0-t2v", "seedance-2.5", "seedance-2.5-i2v", "seedance-2.0-mini", "seedance-1-pro-fast", "seedance-1-pro", "seedance-1.5-pro", "gen-4.5-t2v", "gen-4.5-i2v", "flux-3", "flux-3-i2v", "grok-imagine-video", "grok-imagine-video-1.5", "xai-grok-imagine-video-t2v", "vidguru-generator"];
    this.ratios = ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9", "match_input_image"];
    this.resolutions = ["480p", "512p", "720p", "768p", "1080p", "1K", "2K", "3K", "4K"];
    this.http = axios.create({
      baseURL: this.baseURL,
      headers: this.headers
    });
  }
  slp(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  rnd(len = 40) {
    try {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_/";
      const bytes = crypto.randomBytes(len);
      let str = "";
      for (let i = 0; i < len; i++) {
        str += chars[bytes[i] % chars.length];
      }
      return str;
    } catch {
      return crypto.randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);
    }
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
      console.log("[Vidguru] Membuat email sementara...");
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
  async getOtp(email, maxTry = 30) {
    try {
      console.log(`[Vidguru] Menunggu OTP untuk: ${email}...`);
      for (let i = 0; i < maxTry; i++) {
        await this.slp(3e3);
        const res = await axios.get(`${this.mailURL}?action=message&email=${encodeURIComponent(email)}`);
        const msgs = res?.data?.data || [];
        for (const m of msgs) {
          const txt = m?.text_content || m?.html_content || "";
          const match = txt.match(/\b\d{6}\b/);
          if (match) {
            console.log(`[Vidguru] OTP diterima: ${match[0]}`);
            return {
              status: true,
              otp: match[0],
              error: null
            };
          }
        }
      }
      return {
        status: false,
        otp: null,
        error: "Waktu tunggu verifikasi OTP habis"
      };
    } catch (err) {
      return {
        status: false,
        otp: null,
        error: err?.message || "Error saat mengecek pesan OTP"
      };
    }
  }
  async auth() {
    try {
      console.log("[Vidguru] Memulai alur autentikasi email...");
      console.log("[Vidguru] Mengambil Visitor ID (VID) awal...");
      const touristRes = await this.http.post("/cgi-bin/login", new URLSearchParams({
        type: "0",
        code: this.rnd(40)
      }).toString(), {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded;charset=utf-8"
        }
      });
      const vid = touristRes?.data?.data?.uid;
      const touristTicket = touristRes?.data?.data?.ticket;
      if (!vid || !touristTicket) {
        return {
          status: false,
          data: null,
          error: touristRes?.data?.message || "Gagal menginisialisasi visitor ID"
        };
      }
      console.log(`[Vidguru] Visitor ID diperoleh: ${vid}`);
      const mailRes = await this.getMail();
      if (!mailRes?.status) return mailRes;
      const email = mailRes.email;
      console.log(`[Vidguru] Mengirim kode verifikasi ke ${email}...`);
      const sendRes = await this.http.post("/cgi-bin/email/send-verify-code", new URLSearchParams({
        email: email
      }).toString(), {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded;charset=utf-8",
          cookie: `vg_locale=en; i18n_locale=en; ticket=${touristTicket}; uid=${vid}`
        }
      });
      const sig = sendRes?.data?.data?.signature;
      if (!sig) {
        return {
          status: false,
          data: null,
          error: sendRes?.data?.message || "Gagal mengirim kode verifikasi"
        };
      }
      const otpRes = await this.getOtp(email);
      if (!otpRes?.status) return otpRes;
      console.log("[Vidguru] Melakukan login akun via email & VID...");
      const loginParams = new URLSearchParams({
        type: "5",
        code: otpRes.otp,
        email: email,
        signature: sig,
        vid: String(vid)
      });
      const loginRes = await this.http.post("/cgi-bin/login", loginParams.toString(), {
        headers: {
          ...this.headers,
          "content-type": "application/x-www-form-urlencoded;charset=utf-8",
          cookie: `vg_locale=en; i18n_locale=en; ticket=${touristTicket}; uid=${vid}`
        }
      });
      const uData = loginRes?.data?.data;
      if (!uData?.ticket || !uData?.uid) {
        return {
          status: false,
          data: null,
          error: loginRes?.data?.message || "Login akun gagal"
        };
      }
      console.log(`[Vidguru] Login akun sukses (UID: ${uData.uid}, Sisa Kredit: ${uData.remain})`);
      return {
        status: true,
        data: {
          ticket: uData.ticket,
          uid: uData.uid,
          email: email,
          remain: uData.remain
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
          console.log("[Vidguru] Mengunduh gambar dari URL...");
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
      console.log("[Vidguru] Mengunggah gambar via FormData...");
      const bufRes = await this.toBuf(img);
      if (!bufRes?.status) return bufRes;
      const form = new FormData();
      form.append("file", bufRes.buffer, {
        filename: `upload_${Date.now()}.webp`,
        contentType: "image/webp"
      });
      const res = await this.http.post("/cgi-bin/auth/aigc/vidguru/upload", form, {
        headers: {
          ...this.headers,
          ...form.getHeaders(),
          cookie: `vg_locale=en; i18n_locale=en; ticket=${state.ticket}; uid=${state.uid}`
        }
      });
      const fileUrl = res?.data?.data?.file_url;
      if (!fileUrl) {
        return {
          status: false,
          file_url: null,
          error: res?.data?.message || "Gagal upload gambar"
        };
      }
      console.log(`[Vidguru] Gambar berhasil diunggah: ${fileUrl}`);
      return {
        status: true,
        file_url: fileUrl,
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
      const isVideo = mode.includes("v");
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
  async poll(taskId, taskType, state, interval = 3e3, maxAttempts = 60) {
    try {
      console.log(`[Vidguru] Memulai polling task (Task ID: ${taskId}, Type: ${taskType})...`);
      for (let i = 0; i < maxAttempts; i++) {
        await this.slp(interval);
        const res = await this.http.post("/cgi-bin/auth/aigc/vidguru/vtask-get", {
          task_id: taskId,
          task_type: String(taskType)
        }, {
          headers: {
            ...this.headers,
            "content-type": "application/json",
            cookie: `vg_locale=en; i18n_locale=en; ticket=${state.ticket}; uid=${state.uid}`
          }
        });
        const task = res?.data?.data?.task;
        const progress = task?.progress || "0";
        const st = task?.state;
        console.log(`[Vidguru] Antrean task [${i + 1}/${maxAttempts}] -> Progress: ${progress}%`);
        if (st === "1" || progress === "100") {
          let resJson = {};
          try {
            resJson = typeof task?.result_json === "string" ? JSON.parse(task.result_json) : task?.result_json || {};
          } catch {
            resJson = task?.result_json || {};
          }
          return {
            status: true,
            data: {
              task_id: taskId,
              task_type: taskType,
              progress: progress,
              cover_img: task?.cover_img || null,
              credit_change: task?.credit_change || "0",
              images: resJson?.images || (resJson?.img ? [resJson.img] : []),
              video_url: resJson?.video_url || resJson?.video || null
            },
            error: null
          };
        }
        if (st === "-1" || task?.status === "failed") {
          return {
            status: false,
            data: null,
            error: "Task gagal diproses oleh server Vidguru"
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
    ...rest
  }) {
    try {
      const hasImg = Boolean(image);
      const rawMode = (mode || "").toLowerCase();
      let targetMode = "t2i";
      if (rawMode === "video" || rawMode === "t2v" || rawMode === "i2v") {
        targetMode = hasImg ? "i2v" : "t2v";
      } else {
        targetMode = hasImg ? "i2i" : "t2i";
      }
      console.log(`[Vidguru] Mode terdeteksi: ${targetMode.toUpperCase()} (Input Gambar: ${hasImg ? "Ya" : "Tidak"})`);
      let selModel = model;
      if (!selModel) {
        if (targetMode === "t2i") selModel = "nano-banana-2-lite";
        else if (targetMode === "i2i") selModel = "nano-banana";
        else if (targetMode === "t2v") selModel = "seedance-2.0";
        else if (targetMode === "i2v") selModel = "wan-2.5-i2v";
      }
      const valRes = this.val({
        mode: targetMode,
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
      if (!activeState?.ticket || !activeState?.uid) {
        console.log("[Vidguru] State tidak ditemukan atau kadaluarsa. Menginisialisasi sesi baru...");
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
        console.log(`[Vidguru] Menggunakan state tersimpan (UID: ${activeState.uid})`);
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
      let eventType = "12";
      let payload = {
        model: selModel,
        prompt: prompt.trim(),
        expected_credit: 2,
        edit_json_visible: 0,
        result_json_visible: 1,
        ...rest
      };
      if (targetMode === "i2i") {
        eventType = "11";
        payload.model = selModel || "nano-banana";
        payload.aspect_ratio = aspect_ratio || "match_input_image";
        payload.size = resolution || "1K";
        payload.image_input = [uploadedUrl];
        payload.source_images = [uploadedUrl];
      } else if (targetMode === "t2i") {
        eventType = "12";
        payload.model = selModel || "nano-banana-2-lite";
        payload.aspect_ratio = aspect_ratio || "1:1";
        payload.output_format = rest?.output_format || "png";
      } else if (targetMode === "t2v") {
        eventType = "1";
        payload.model = selModel || "seedance-2.0";
        payload.duration = duration ? Number(duration) : 5;
        payload.resolution = resolution || "720p";
        payload.aspect_ratio = aspect_ratio || "16:9";
        payload.expected_credit = 10;
      } else if (targetMode === "i2v") {
        eventType = "2";
        payload.model = selModel || "wan-2.5-i2v";
        payload.duration = duration ? Number(duration) : 5;
        payload.resolution = resolution || "720p";
        payload.image_input = [uploadedUrl];
        payload.source_images = [uploadedUrl];
        payload.expected_credit = 4;
      }
      console.log(`[Vidguru] Mengirim task generate [Model: ${payload.model}, Event: ${eventType}]...`);
      const genRes = await this.http.post("/cgi-bin/aigc/proxy", {
        event_type: eventType,
        param_json: JSON.stringify(payload)
      }, {
        headers: {
          ...this.headers,
          "content-type": "application/json",
          cookie: `vg_locale=en; i18n_locale=en; ticket=${activeState.ticket}; uid=${activeState.uid}`
        }
      });
      const rawResult = genRes?.data?.data?.result_json;
      if (!rawResult) {
        return {
          status: false,
          result: null,
          error: genRes?.data?.message || "Gagal memulai proses generate di server",
          state: this.enc(activeState)
        };
      }
      let parsedResult = {};
      try {
        parsedResult = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
      } catch {
        parsedResult = rawResult;
      }
      const taskId = parsedResult?.task_id;
      const taskType = parsedResult?.task_type || (targetMode === "i2i" ? "209" : targetMode === "t2i" ? "204" : "1");
      if (!taskId) {
        return {
          status: false,
          result: null,
          error: parsedResult?.message || "Task ID tidak valid dari server",
          state: this.enc(activeState)
        };
      }
      const pollRes = await this.poll(taskId, taskType, activeState);
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
          mode: targetMode,
          model: payload.model,
          ...finalData
        },
        state: this.enc(activeState)
      };
    } catch (err) {
      console.error(`[Vidguru Error] ${err?.message || err}`);
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
  const api = new Vidguru();
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