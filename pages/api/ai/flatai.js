import axios from "axios";
import https from "https";
import FormData from "form-data";
import * as cheerio from "cheerio";
class FlatAIClient {
  constructor() {
    this.config = {
      apiDefault: "https://flatai.org/wp-admin/admin-ajax.php",
      modes: {
        chat: {
          home: "https://flatai.org/free-ai-chatbot-no-registration/",
          nonceKey: "chatbot_nonce",
          action: "my_chatbot",
          required: ["prompt"]
        },
        image: {
          home: "https://flatai.org/ai-image-generator-free-no-signup/",
          nonceKey: "ai_generate_image_nonce",
          action: "ai_generate_image",
          actionEdit: "ai_image_edit_with_text",
          required: ["prompt"]
        }
      }
    };
    this.home = this.config.modes.chat.home;
    this.api = "";
    this.nonce = "";
    this.agent = new https.Agent({
      keepAlive: true,
      maxSockets: 50,
      keepAliveMsecs: 1e4
    });
    this.http = axios.create({
      httpsAgent: this.agent,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://flatai.org",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  enc(obj) {
    try {
      return Buffer.from(JSON.stringify(obj)).toString("base64");
    } catch (e) {
      console.error("[ERR] Gagal mengencode state:", e.message);
      return null;
    }
  }
  dec(str) {
    try {
      return JSON.parse(Buffer.from(str, "base64").toString("utf-8"));
    } catch (e) {
      console.error("[ERR] Gagal mendecode state:", e.message);
      return null;
    }
  }
  async img(input) {
    if (!input) return null;
    try {
      console.log("[LOG] Memproses data input gambar...");
      if (Buffer.isBuffer(input)) {
        return {
          value: input,
          options: {
            filename: "image.jpg",
            contentType: "image/jpeg"
          }
        };
      }
      if (typeof input === "string" && input.startsWith("http")) {
        console.log(`[LOG] Mengunduh gambar dari URL: ${input}`);
        const res = await axios.get(input, {
          responseType: "arraybuffer",
          httpsAgent: this.agent
        });
        return {
          value: Buffer.from(res.data),
          options: {
            filename: "image.jpg",
            contentType: res.headers["content-type"] || "image/jpeg"
          }
        };
      }
      if (typeof input === "string") {
        let b64 = input;
        let mime = "image/jpeg";
        if (input.includes(";base64,")) {
          const parts = input.split(";base64,");
          mime = parts[0].replace("data:", "");
          b64 = parts[1];
        }
        return {
          value: Buffer.from(b64, "base64"),
          options: {
            filename: "image.jpg",
            contentType: mime
          }
        };
      }
    } catch (e) {
      console.error("[ERR] Gagal memproses gambar:", e.message);
      return null;
    }
    return null;
  }
  _updCookie(headers, state) {
    const sc = headers["set-cookie"];
    if (!sc) return state.cookie || "";
    const current = state.cookie ? state.cookie.split(";").reduce((acc, c) => {
      const [k, v] = c.split("=");
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    }, {}) : {};
    sc.forEach(cookieStr => {
      const parts = cookieStr.split(";")[0].split("=");
      if (parts[0] && parts[1]) current[parts[0].trim()] = parts[1].trim();
    });
    return Object.entries(current).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  async ini(cookieHeader = "", mode = "chat") {
    try {
      const cfg = this.config.modes[mode];
      console.log(`[LOG] Menginisialisasi session via: ${this.home}`);
      const response = await this.http.get(this.home, {
        headers: {
          referer: this.home,
          cookie: cookieHeader
        }
      });
      const $ = cheerio.load(response.data);
      let ajaxUrl, extractedNonce;
      const scriptContent = $("#jquery-core-js-extra").html();
      if (scriptContent) {
        const match = scriptContent.match(/var\s+my_ajax_object\s*=\s*({[^;]+});/);
        if (match && match[1]) {
          const obj = eval("(" + match[1] + ")");
          ajaxUrl = obj.ajax_url;
          extractedNonce = obj[cfg.nonceKey];
        }
      }
      this.api = ajaxUrl || this.config.apiDefault;
      this.nonce = extractedNonce || "";
      console.log(`[LOG] Inisialisasi Sukses [Mode: ${mode.toUpperCase()}]. API: ${this.api} | Nonce: ${this.nonce}`);
      return {
        api: this.api,
        nonce: this.nonce,
        cookie: this._updCookie(response.headers, {
          cookie: cookieHeader
        })
      };
    } catch (e) {
      console.error("[ERR] Gagal melakukan inisialisasi:", e.message);
      return {
        status: 500,
        success: false,
        error: e.message
      };
    }
  }
  async generate(options) {
    try {
      const {
        mode = "chat",
          state,
          prompt,
          messages,
          image, ...rest
      } = options;
      const cfg = this.config.modes[mode];
      if (!cfg) {
        return {
          status: 400,
          success: false,
          error: `Mode [${mode}] tidak terdaftar di dalam config.`
        };
      }
      let paramError = null;
      cfg.required.forEach(param => {
        if (!options[param] && param === "prompt" && !messages) {
          paramError = `Parameter [${param}] wajib diisi untuk mode [${mode.toUpperCase()}]`;
        }
      });
      if (paramError) return {
        status: 400,
        success: false,
        error: paramError
      };
      this.home = cfg.home;
      console.log(`[LOG] Menjalankan mode: [${mode.toUpperCase()}]`);
      let activeState = typeof state === "string" ? this.dec(state) : state || {};
      if (!activeState) activeState = {};
      activeState.cookie = activeState.cookie || "";
      if (!this.api || !activeState.nonce || activeState.mode !== mode) {
        console.log("[LOG] Token tidak ditemukan atau mode berubah. Memulai ulang token...");
        const fresh = await this.ini(activeState.cookie, mode);
        if (fresh.error) return fresh;
        activeState.api = fresh.api;
        activeState.nonce = fresh.nonce;
        activeState.cookie = fresh.cookie;
        activeState.mode = mode;
      }
      this.api = activeState.api || this.api;
      switch (mode) {
        case "chat": {
          let finalMessages = messages ? [...messages] : [{
            role: "assistant",
            content: "Welcome! What do you want to talk about today?"
          }];
          if (prompt) finalMessages.push({
            role: "user",
            content: prompt
          });
          console.log("[LOG] Menyusun payload form-data untuk Chat...");
          const form = new FormData();
          form.append("action", cfg.action);
          form.append("nonce", activeState.nonce);
          form.append("model", "default");
          form.append("system_message_content", "You are a friendly girl.");
          form.append("messages", JSON.stringify(finalMessages));
          for (const [k, v] of Object.entries(rest)) {
            form.append(k, typeof v === "object" ? JSON.stringify(v) : v);
          }
          const parsedImg = await this.img(image);
          if (parsedImg) {
            console.log("[LOG] Menambahkan vision_image ke payload chat.");
            form.append("vision_image", parsedImg.value, parsedImg.options);
          }
          console.log("[LOG] Mengirim request stream ke API Chat...");
          const response = await this.http.post(this.api, form, {
            headers: {
              ...form.getHeaders(),
              referer: this.home,
              cookie: activeState.cookie
            },
            responseType: "stream"
          });
          activeState.cookie = this._updCookie(response.headers, activeState);
          let fullText = "";
          return new Promise(resolve => {
            response.data.on("data", chunk => {
              const lines = chunk.toString().split("\n");
              for (let line of lines) {
                line = line.trim();
                if (!line || !line.startsWith("data: ")) continue;
                const rawData = line.slice(6).trim();
                if (rawData === "[DONE]") continue;
                try {
                  const json = JSON.parse(rawData);
                  const delta = json?.choices?.[0]?.delta?.content || "";
                  fullText += delta;
                } catch (e) {}
              }
            });
            response.data.on("end", () => {
              console.log("[LOG] Aliran data stream selesai.");
              const cleanText = fullText.split("<memory>")[0].trim();
              finalMessages.push({
                role: "assistant",
                content: cleanText
              });
              resolve({
                status: 200,
                result: cleanText,
                state: this.enc(activeState),
                messages: finalMessages
              });
            });
            response.data.on("error", err => {
              console.error("[ERR] Kendala pada aliran data stream:", err.message);
              resolve({
                status: 500,
                success: false,
                error: err.message
              });
            });
          });
          break;
        }
        case "image": {
          console.log("[LOG] Mempersiapkan form data untuk Image Generation...");
          const form = new FormData();
          form.append("nonce", activeState.nonce);
          form.append("prompt", prompt || "");
          form.append("aspect_ratio", rest.aspect_ratio || "1:1");
          form.append("style_model", rest.style_model || "flataipro");
          const parsedImg = await this.img(image);
          if (parsedImg) {
            console.log("[LOG] Deteksi input gambar aktif. Memulai Mode Image-to-Image (i2i)...");
            form.append("action", cfg.actionEdit);
            form.append("image_file", parsedImg.value, parsedImg.options);
            const response = await this.http.post(this.api, form, {
              headers: {
                ...form.getHeaders(),
                referer: this.home,
                cookie: activeState.cookie
              }
            });
            activeState.cookie = this._updCookie(response.headers, activeState);
            console.log("[LOG] Request i2i selesai.");
            return {
              status: 200,
              success: response.data.success,
              result: response.data.data?.editedImageUrl || null,
              data: response.data.data,
              state: this.enc(activeState)
            };
          } else {
            console.log("[LOG] Gambar tidak ditemukan. Memulai Mode Text-to-Image (t2i)...");
            const payload = new URLSearchParams({
              action: cfg.action,
              nonce: activeState.nonce,
              prompt: prompt || "",
              aspect_ratio: rest.aspect_ratio || "1:1",
              enable_upscale: rest.enable_upscale !== undefined ? String(rest.enable_upscale) : "true",
              style_model: rest.style_model || "flataipro"
            });
            if (rest.seed) payload.append("seed", String(rest.seed));
            const response = await this.http.post(this.api, payload.toString(), {
              headers: {
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                referer: this.home,
                cookie: activeState.cookie
              }
            });
            activeState.cookie = this._updCookie(response.headers, activeState);
            if (response.data?.data?.pending && response.data?.data?.job_token) {
              const token = response.data.data.job_token;
              console.log(`[LOG] Gambar masuk antrean (QUEUED). Job Token: ${token}. Memulai polling status...`);
              let completed = false;
              let pollResult = null;
              while (!completed) {
                console.log("[LOG] Menunggu 2.5 detik sebelum melakukan polling...");
                await new Promise(r => setTimeout(r, 2500));
                const pollPayload = new URLSearchParams({
                  action: "ai_poll_generation_status",
                  nonce: activeState.nonce,
                  job_token: token
                });
                const pollRes = await this.http.post(this.api, pollPayload.toString(), {
                  headers: {
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    referer: this.home,
                    cookie: activeState.cookie
                  }
                });
                activeState.cookie = this._updCookie(pollRes.headers, activeState);
                if (pollRes.data?.success && pollRes.data?.data?.images) {
                  console.log("[LOG] Gambar berhasil dirender oleh provider.");
                  pollResult = pollRes.data;
                  completed = true;
                } else {
                  console.log(`[LOG] Status Image: ${pollRes.data?.data?.status || "PENDING"}...`);
                }
              }
              return {
                status: 200,
                success: true,
                result: pollResult.data.images[0],
                data: pollResult.data,
                state: this.enc(activeState)
              };
            }
            console.warn("[LOG] Respon tidak sesuai skema polling atau gagal antrean.");
            return {
              status: 400,
              success: false,
              data: response.data
            };
          }
          break;
        }
        default:
          return {
            status: 400,
              success: false,
              error: `Mode [${mode}] tidak didukung.`
          };
      }
    } catch (err) {
      console.error("[ERR] Terjadi kesalahan fatal pada method generate:", err?.response?.data || err.message);
      return {
        status: 500,
        success: false,
        error: err?.response?.data || err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new FlatAIClient();
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