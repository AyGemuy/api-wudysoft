import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class IbboAI {
  constructor() {
    try {
      this.base = "https://ibbo.ai";
      const today = new Date().toISOString().split("T")[0];
      this.cookies = {
        "__Secure-authjs.callback-url": encodeURIComponent(`${this.base}/`),
        nb_free_usage: encodeURIComponent(JSON.stringify({
          date: today,
          count: 0
        }))
      };
      this.user = null;
      this.endpoints = {
        welcome_bonus: "/api/welcome-bonus",
        csrf: "/api/auth/csrf",
        signup: "/api/auth/signup",
        signin: "/api/auth/callback/credentials",
        session: "/api/auth/session",
        user_info: "/api/get-user-info",
        t2i: {
          "nano-banana": "/api/nano-banana-text-to-image",
          "nano-banana-2": "/api/nano-banana-2-text-to-image",
          "nano-banana-pro": "/api/nano-banana-pro-text-to-image",
          gptimage2: "/api/gptimage2-text-to-image",
          "gptimage25-flare": "/api/gptimage25-text-to-image",
          "gptimage25-sunburst": "/api/gptimage25-text-to-image"
        },
        i2i: {
          "nano-banana-lite": "/api/nano-banana-lite-image-to-image",
          "nano-banana": "/api/nano-banana-image-to-image",
          "nano-banana-2": "/api/nano-banana-2-image-to-image",
          "nano-banana-pro": "/api/nano-banana-pro-image-to-image",
          gptimage2: "/api/gptimage2-image-to-image",
          "gptimage25-flare": "/api/gptimage25-image-to-image",
          "gptimage25-sunburst": "/api/gptimage25-image-to-image"
        },
        status: {
          "nano-banana-2": "/api/check-nano-banana-2-status",
          "nano-banana-pro": "/api/check-nano-banana-pro-status",
          default: "/api/check-kie-status"
        }
      };
      this.models = ["nano-banana-lite", "nano-banana", "nano-banana-2", "nano-banana-pro", "gptimage2", "gptimage25-flare", "gptimage25-sunburst"];
      this.aspect_ratios = ["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "2:1", "1:2", "3:1", "1:3", "21:9", "9:21", "5:4", "4:5"];
      this.resolutions = ["1K", "2K", "4K"];
      this.headers = {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en;q=0.8",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        origin: this.base,
        referer: `${this.base}/`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
      this.http = axios.create({
        baseURL: this.base,
        timeout: 12e4,
        headers: this.headers,
        validateStatus: () => true
      });
      this.http.interceptors.request.use(cfg => {
        try {
          const cookieHeader = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
          if (cookieHeader) {
            cfg.headers["cookie"] = cookieHeader;
            cfg.headers["Cookie"] = cookieHeader;
          }
        } catch (e) {
          console.error(`[INTERCEPTOR_REQ_ERR] ${e.message}`);
        }
        return cfg;
      });
      this.http.interceptors.response.use(res => {
        try {
          const setCookies = res.headers?.["set-cookie"] || [];
          for (const cookie of setCookies) {
            const raw = cookie.split(";")[0];
            const firstEqual = raw.indexOf("=");
            if (firstEqual > -1) {
              const key = raw.slice(0, firstEqual).trim();
              const val = raw.slice(firstEqual + 1).trim();
              if (key && val) this.cookies[key] = val;
            }
          }
        } catch (e) {
          console.error(`[INTERCEPTOR_RES_ERR] ${e.message}`);
        }
        return res;
      });
      console.log("[INIT] IbboAI client berhasil diinisialisasi.");
    } catch (err) {
      console.error(`[CONSTRUCTOR_ERR] ${err.message}`);
    }
  }
  rnd(len = 8) {
    try {
      return crypto.randomBytes(len).toString("hex").slice(0, len);
    } catch {
      return Math.random().toString(36).slice(2, 2 + len);
    }
  }
  genCred() {
    try {
      const id = this.rnd(4);
      return {
        email: `user_${id}_${Date.now()}@gmail.com`,
        password: `Pass${this.rnd(3)}!${Date.now().toString().slice(-4)}`
      };
    } catch (e) {
      return {
        email: `user_${Date.now()}@gmail.com`,
        password: `Pass123!${Date.now().toString().slice(-4)}`
      };
    }
  }
  slp(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async slvImg(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) {
        return {
          buffer: input,
          filename: `${this.rnd(8)}.jpg`,
          content_type: "image/jpeg"
        };
      }
      if (typeof input === "string") {
        if (input.startsWith("data:")) {
          const match = input.match(/^data:(image\/\w+);base64,(.+)$/);
          const mime = match?.[1] || "image/jpeg";
          const data = match?.[2] || input.split(",")[1];
          const ext = mime.split("/")[1] || "jpg";
          return {
            buffer: Buffer.from(data, "base64"),
            filename: `${this.rnd(8)}.${ext}`,
            content_type: mime
          };
        }
        if (/^https?:\/\//i.test(input)) {
          console.log(`[IBBO] Downloading reference image: ${input}`);
          const res = await axios.get(input, {
            responseType: "arraybuffer",
            timeout: 3e4
          });
          const contentType = res.headers?.["content-type"] || "image/jpeg";
          const ext = contentType.split("/")[1] || "jpg";
          return {
            buffer: Buffer.from(res.data),
            filename: `${this.rnd(8)}.${ext}`,
            content_type: contentType
          };
        }
        return {
          buffer: Buffer.from(input, "base64"),
          filename: `${this.rnd(8)}.jpg`,
          content_type: "image/jpeg"
        };
      }
      return null;
    } catch (e) {
      console.error(`[IBBO_IMG_ERR] Failed to resolve image: ${e.message}`);
      return null;
    }
  }
  async init() {
    try {
      console.log("[IBBO] Initializing guest session...");
      await this.http.get(this.endpoints.welcome_bonus);
      const csrfRes = await this.http.get(this.endpoints.csrf);
      const csrfToken = csrfRes?.data?.csrfToken || this.cookies["__Host-authjs.csrf-token"]?.split("%7C")?.[0] || "";
      const creds = this.genCred();
      console.log(`[IBBO] Registering temp user: ${creds.email}`);
      await this.http.post(this.endpoints.signup, {
        email: creds.email,
        password: creds.password,
        locale: "en"
      }, {
        headers: {
          "content-type": "application/json"
        }
      });
      console.log(`[IBBO] Authenticating session token...`);
      const signinParams = new URLSearchParams({
        csrfToken: csrfToken,
        email: creds.email,
        password: creds.password,
        callbackUrl: `${this.base}/`,
        redirect: "false",
        json: "true"
      }).toString();
      await this.http.post(this.endpoints.signin, signinParams, {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        maxRedirects: 0
      });
      if (!this.cookies["__Secure-authjs.session-token"] && !this.cookies["authjs.session-token"]) {
        await this.http.post(this.endpoints.signin, {
          csrfToken: csrfToken,
          email: creds.email,
          password: creds.password,
          callbackUrl: `${this.base}/`,
          redirect: false,
          json: true
        }, {
          headers: {
            "content-type": "application/json"
          },
          maxRedirects: 0
        });
      }
      await this.http.get(this.endpoints.session);
      const userRes = await this.http.post(this.endpoints.user_info, {}, {
        headers: {
          "content-type": "application/json",
          "content-length": "0"
        }
      });
      this.user = userRes?.data?.data || null;
      if (!this.user?.id && !this.cookies["__Secure-authjs.session-token"]) {
        console.warn("[IBBO_WARN] Auth session token tidak terdeteksi di cookies.");
      }
      const credits = this.user?.credits?.left_credits ?? 5;
      console.log(`[IBBO] Session authenticated. User ID: ${this.user?.id || "guest"}, Credits: ${credits}`);
      return {
        status: true,
        result: {
          user_id: this.user?.id || null,
          email: this.user?.email || creds.email,
          credits: credits
        }
      };
    } catch (e) {
      console.error(`[IBBO_INIT_ERR] Session init failed: ${e?.response?.data?.message || e.message}`);
      return {
        status: false,
        error: e?.response?.data?.message || e.message
      };
    }
  }
  async pol(taskId, model) {
    try {
      console.log(`[IBBO_POLL] Polling task: ${taskId} for model: ${model}`);
      const endpoint = this.endpoints.status[model] || this.endpoints.status["default"];
      const maxAttempts = 60;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await this.slp(3e3);
          console.log(`[IBBO_POLL] Checking status (${attempt}/${maxAttempts})...`);
          const res = await this.http.post(endpoint, {
            task_id: taskId
          }, {
            headers: {
              "content-type": "application/json"
            }
          });
          const data = res?.data?.data || res?.data || {};
          if (data?.status === "completed" || data?.image_url) {
            console.log("[IBBO_POLL] Task completed successfully!");
            return {
              status: true,
              result: {
                image_url: data?.image_url || data?.r2_url || null,
                r2_url: data?.r2_url || data?.image_url || null,
                source_url: data?.source_url || null
              }
            };
          }
          if (data?.status === "failed") {
            return {
              status: false,
              error: data?.error || "Task generation status returned failed."
            };
          }
        } catch (err) {
          if ([404, 429, 500, 502, 503, 504].includes(err?.response?.status)) {
            console.warn(`[IBBO_POLL] Warning HTTP ${err.response.status}, retrying...`);
            continue;
          }
          return {
            status: false,
            error: err?.response?.data?.message || err.message
          };
        }
      }
      return {
        status: false,
        error: "Generation timed out after 180 seconds."
      };
    } catch (e) {
      return {
        status: false,
        error: e.message
      };
    }
  }
  async generate({
    prompt,
    image = null,
    model = "nano-banana-2",
    aspect_ratio = "auto",
    resolution = "1K",
    output_format = "png",
    background = "auto",
    variant = "flare",
    ...rest
  }) {
    try {
      if (!this.user) {
        const initRes = await this.init();
        if (!initRes?.status) return initRes;
      }
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return {
          status: false,
          error: "Parameter 'prompt' wajib diisi."
        };
      }
      const selectedModel = this.models.includes(model) ? model : "nano-banana-2";
      const selectedRatio = this.aspect_ratios.includes(aspect_ratio) ? aspect_ratio : "auto";
      const selectedRes = this.resolutions.includes(resolution) ? resolution : "1K";
      const hasImage = Boolean(image && (Array.isArray(image) ? image.length > 0 : true));
      const isI2I = hasImage;
      console.log(`[IBBO_GEN] Mode: ${isI2I ? "Image-to-Image" : "Text-to-Image"} | Model: ${selectedModel}`);
      if (selectedModel === "nano-banana-lite" && !isI2I) {
        return {
          status: false,
          error: "Model 'nano-banana-lite' hanya mendukung mode Image-to-Image."
        };
      }
      if (isI2I) {
        const endpoint = this.endpoints.i2i[selectedModel] || this.endpoints.i2i["nano-banana-2"];
        const imageList = Array.isArray(image) ? image : [image];
        const form = new FormData();
        for (const imgItem of imageList) {
          const resolved = await this.slvImg(imgItem);
          if (resolved) {
            form.append("file", resolved.buffer, {
              filename: resolved.filename,
              contentType: resolved.content_type
            });
          }
        }
        form.append("prompt", prompt.trim());
        form.append("output_format", output_format || "png");
        if (selectedModel === "nano-banana-2") {
          form.append("aspect_ratio", selectedRatio);
          form.append("resolution", selectedRes);
          form.append("google_search", "false");
        } else if (selectedModel === "nano-banana-pro") {
          form.append("aspect_ratio", selectedRatio);
          form.append("resolution", selectedRes);
        } else if (selectedModel === "gptimage2") {
          form.append("background", background || "auto");
          form.append("aspect_ratio", selectedRatio);
          form.append("resolution", selectedRes);
        } else if (selectedModel.startsWith("gptimage25")) {
          form.append("variant", selectedModel.includes("sunburst") ? "sunburst" : variant || "flare");
          form.append("aspect_ratio", selectedRatio);
          form.append("resolution", selectedRes);
        }
        console.log(`[IBBO_GEN] Requesting I2I endpoint: ${endpoint}`);
        const res = await this.http.post(endpoint, form, {
          headers: {
            ...form.getHeaders()
          }
        });
        const data = res?.data?.data || res?.data || {};
        if (data?.task_id) {
          const pollRes = await this.pol(data.task_id, selectedModel);
          if (!pollRes?.status) return pollRes;
          return {
            status: true,
            result: {
              task_id: data.task_id,
              model: selectedModel,
              image_url: pollRes.result?.image_url,
              r2_url: pollRes.result?.r2_url,
              source_url: pollRes.result?.source_url || null,
              is_free: Boolean(data?.is_free)
            }
          };
        }
        const directUrl = data?.image_url || data?.r2_url || data?.data?.[0]?.url;
        if (directUrl) {
          return {
            status: true,
            result: {
              model: selectedModel,
              image_url: directUrl,
              r2_url: data?.r2_url || directUrl,
              source_url: data?.source_url || null,
              is_free: Boolean(data?.is_free)
            }
          };
        }
        return {
          status: false,
          error: data?.message || res?.data?.message || res?.data?.error || "Gagal memproses gambar."
        };
      }
      const endpoint = this.endpoints.t2i[selectedModel] || this.endpoints.t2i["nano-banana-2"];
      let payload = {
        prompt: prompt.trim(),
        output_format: output_format || "png",
        image_size: selectedRatio
      };
      if (selectedModel === "nano-banana-2") {
        payload = {
          prompt: prompt.trim(),
          aspect_ratio: selectedRatio,
          resolution: selectedRes,
          output_format: output_format || "png",
          google_search: false,
          ...rest
        };
      } else if (selectedModel === "nano-banana-pro") {
        payload = {
          prompt: prompt.trim(),
          aspect_ratio: selectedRatio,
          resolution: selectedRes,
          output_format: output_format || "png",
          ...rest
        };
      } else if (selectedModel === "gptimage2") {
        payload = {
          prompt: prompt.trim(),
          aspect_ratio: selectedRatio,
          resolution: selectedRes,
          background: background || "auto",
          ...rest
        };
      } else if (selectedModel.startsWith("gptimage25")) {
        payload = {
          prompt: prompt.trim(),
          aspect_ratio: selectedRatio,
          resolution: selectedRes,
          variant: selectedModel.includes("sunburst") ? "sunburst" : variant || "flare",
          ...rest
        };
      }
      console.log(`[IBBO_GEN] Requesting T2I endpoint: ${endpoint}`);
      const res = await this.http.post(endpoint, payload, {
        headers: {
          "content-type": "application/json"
        }
      });
      const data = res?.data?.data || res?.data || {};
      if (data?.task_id) {
        const pollRes = await this.pol(data.task_id, selectedModel);
        if (!pollRes?.status) return pollRes;
        return {
          status: true,
          result: {
            task_id: data.task_id,
            model: selectedModel,
            image_url: pollRes.result?.image_url,
            r2_url: pollRes.result?.r2_url,
            is_free: Boolean(data?.is_free)
          }
        };
      }
      const directUrl = data?.image_url || data?.r2_url;
      if (directUrl) {
        return {
          status: true,
          result: {
            model: selectedModel,
            image_url: directUrl,
            r2_url: data?.r2_url || directUrl,
            is_free: Boolean(data?.is_free)
          }
        };
      }
      return {
        status: false,
        error: data?.message || res?.data?.message || res?.data?.error || "Gagal menghasilkan gambar dari teks."
      };
    } catch (e) {
      const errMsg = e?.response?.data?.message || e?.response?.data?.error || e.message;
      console.error(`[IBBO_GEN_ERR] ${errMsg}`);
      return {
        status: false,
        error: errMsg
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
  const api = new IbboAI();
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