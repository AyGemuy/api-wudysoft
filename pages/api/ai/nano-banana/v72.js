import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import FormData from "form-data";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class NanoBanana {
  constructor(cfg = {}) {
    const rand = crypto.randomBytes(4).toString("hex");
    this.email = cfg.email || null;
    this.pass = cfg.password || `Guest!${rand}A`;
    this.tok = null;
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://nanobananapro.pics",
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "user-agent": this.ua
      }
    }));
    this.mailClient = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}`,
      headers: {
        accept: "*/*",
        "user-agent": this.ua
      }
    });
    this.sbUrl = "https://toutihxlwjegnifhfabh.supabase.co/auth/v1";
    this.sbHdrs = {
      apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdXRpaHhsd2plZ25pZmhmYWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MTgzNTUsImV4cCI6MjA3OTI5NDM1NX0.6fM6QWrm_fj8f_di5wexxDrJ7fQkx49RrjbH1_oCV9g",
      authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdXRpaHhsd2plZ25pZmhmYWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MTgzNTUsImV4cCI6MjA3OTI5NDM1NX0.6fM6QWrm_fj8f_di5wexxDrJ7fQkx49RrjbH1_oCV9g",
      "content-type": "application/json;charset=UTF-8"
    };
    this.models = {
      "gpt-image-2": {
        supports: {
          textToImage: true,
          imageToImage: true
        },
        capabilities: {
          capabilityTags: ["text2image", "image2image"]
        }
      },
      "gemini-2.5-flash": {
        supports: {
          textToImage: true,
          imageToImage: true
        },
        capabilities: {
          capabilityTags: ["text2image", "image2image"],
          aspectRatios: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9"]
        }
      },
      "nano-banana-pro": {
        supports: {
          textToImage: true,
          imageToImage: true
        },
        capabilities: {
          capabilityTags: ["text2image", "image2image"],
          aspectRatios: ["1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9"],
          resolutions: ["1K", "2K", "4K"]
        }
      },
      "grok-imagine": {
        supports: {
          textToImage: true,
          imageToImage: false
        },
        capabilities: {
          capabilityTags: ["text2image"],
          aspectRatios: ["2:3", "3:2", "1:1"]
        }
      },
      midjourney: {
        supports: {
          textToImage: true,
          imageToImage: true
        },
        capabilities: {
          capabilityTags: ["text2image", "image2image", "text2video", "image2video"],
          aspectRatios: ["1:2", "9:16", "2:3", "3:4", "5:6", "6:5", "4:3", "3:2", "1:1", "16:9", "2:1"]
        }
      },
      "openai-4o-image": {
        supports: {
          textToImage: true,
          imageToImage: true
        },
        capabilities: {
          capabilityTags: ["text2image", "image2image"]
        }
      },
      "flux-kontext": {
        supports: {
          textToImage: true,
          imageToImage: true
        },
        capabilities: {
          capabilityTags: ["text2image", "image2image"]
        }
      },
      "seedream-4.0": {
        supports: {
          textToImage: true,
          imageToImage: true
        },
        capabilities: {
          capabilityTags: ["text2image", "image2image"]
        }
      },
      "seedream-3.0": {
        supports: {
          textToImage: true,
          imageToImage: false
        },
        capabilities: {
          capabilityTags: ["text2image"]
        }
      },
      "qwen-image": {
        supports: {
          textToImage: true,
          imageToImage: true
        },
        capabilities: {
          capabilityTags: ["text2image", "image2image"]
        }
      },
      "ideogram-v3": {
        supports: {
          textToImage: true,
          imageToImage: true
        },
        capabilities: {
          capabilityTags: ["text2image", "image2image"]
        }
      },
      "imagen-4": {
        supports: {
          textToImage: true,
          imageToImage: true
        },
        capabilities: {
          capabilityTags: ["text2image", "image2image"]
        }
      }
    };
  }
  _log(step, msg) {
    console.log(`[NanoBanana - ${step}] ${msg}`);
  }
  toState() {
    if (!this.email) return null;
    return Buffer.from(`${this.email}:${this.pass}`).toString("base64");
  }
  fromState(state) {
    if (!state) return;
    try {
      const decoded = Buffer.from(state, "base64").toString("utf8");
      const [email, pass] = decoded.split(":");
      if (email && pass) {
        this.email = email;
        this.pass = pass;
        this._log("STATE_LOAD", `State pendek dimuat: ${this.email}`);
      }
    } catch (err) {
      this._log("STATE_ERR", err.message);
    }
  }
  validateInput(modelId, prompt, hasImage, aspect_ratio, resolution) {
    const rules = this.models[modelId];
    if (!rules) {
      return {
        isValid: false,
        error: `Model ID '${modelId}' tidak dikenal.`
      };
    }
    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return {
        isValid: false,
        error: `Prompt wajib diisi untuk model '${modelId}'.`
      };
    }
    if (hasImage && !rules.supports.imageToImage) {
      return {
        isValid: false,
        error: `Model '${modelId}' tidak mendukung fitur Image-to-Image (Input Gambar).`
      };
    }
    if (aspect_ratio && rules.capabilities.aspectRatios) {
      if (!rules.capabilities.aspectRatios.includes(aspect_ratio)) {
        return {
          isValid: false,
          error: `Aspect ratio '${aspect_ratio}' tidak didukung oleh '${modelId}'. Pilihan: ${rules.capabilities.aspectRatios.join(", ")}`
        };
      }
    }
    if (resolution && rules.capabilities.resolutions) {
      if (!rules.capabilities.resolutions.includes(resolution)) {
        return {
          isValid: false,
          error: `Resolusi '${resolution}' tidak didukung oleh '${modelId}'. Pilihan: ${rules.capabilities.resolutions.join(", ")}`
        };
      }
    }
    return {
      isValid: true
    };
  }
  async _newMail() {
    try {
      this._log("MAIL_GEN", "Membuat email baru...");
      const res = await this.mailClient.get("/api/mails/v9?action=create");
      this.email = res.data?.email || this.email;
      if (!this.email) return {
        success: false,
        error: "Email API error."
      };
      this._log("MAIL_GEN", `Email: ${this.email}`);
      return {
        success: true,
        email: this.email
      };
    } catch (err) {
      this._log("MAIL_ERR", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async _getLink() {
    let attempts = 0;
    this._log("MAIL_CHECK", `Polling inbox: ${this.email}...`);
    while (attempts < 15) {
      try {
        attempts++;
        const res = await this.mailClient.get(`/api/mails/v9?action=message&email=${this.email}`);
        const messages = res.data?.data || [];
        for (const msg of messages) {
          const match = (msg.text_content || "").match(/https:\/\/nanobananapro\.pics\/auth\/confirm\?token_hash=[a-zA-Z0-9&%=._\+~#-]+/g);
          if (match?.[0]) {
            this._log("MAIL_CHECK", "Link verifikasi ditemukan.");
            return {
              success: true,
              link: match[0]
            };
          }
        }
        await new Promise(r => setTimeout(r, 3e3));
      } catch (err) {
        this._log("MAIL_POLL_ERR", err.message);
      }
    }
    return {
      success: false,
      error: "Verification link timeout."
    };
  }
  async auth() {
    try {
      const cookies = await this.jar.getCookies("https://nanobananapro.pics");
      const hasAuthCook = cookies.some(c => c.key.includes("auth-token"));
      if (this.tok && hasAuthCook) return {
        success: true,
        token: this.tok
      };
      if (this.email && this.pass) {
        this._log("AUTO_LOGIN", `Mencoba login otomatis untuk: ${this.email}`);
      } else {
        const mailRes = await this._newMail();
        if (!mailRes.success) return mailRes;
        this._log("SIGNUP", `Sign up: ${this.email}`);
        await this.client.post("/api/auth/email/sign-up", {
          email: this.email,
          password: this.pass
        }, {
          headers: {
            origin: "https://nanobananapro.pics",
            referer: "https://nanobananapro.pics/ai-image/gpt-image-2"
          }
        });
        const linkRes = await this._getLink();
        if (!linkRes.success) return linkRes;
        this._log("VERIFY", "Follow redirect link verifikasi email...");
        await this.client.get(linkRes.link, {
          maxRedirects: 5,
          headers: {
            referer: "https://nanobananapro.pics/"
          }
        });
      }
      this._log("LOGIN", "Sign in token Supabase...");
      const resTok = await axios.post(`${this.sbUrl}/token?grant_type=password`, {
        email: this.email,
        password: this.pass,
        gotrue_meta_security: {}
      }, {
        headers: {
          ...this.sbHdrs,
          origin: "https://nanobananapro.pics"
        }
      });
      this.tok = resTok.data?.access_token || "";
      if (!this.tok) return {
        success: false,
        error: "Gagal mendapatkan token akses Supabase."
      };
      this._log("CALLBACK", "Sync session cookie internal...");
      await this.client.post("/api/auth/callback", {}, {
        headers: {
          origin: "https://nanobananapro.pics",
          authorization: `Bearer ${this.tok}`
        }
      });
      this._log("AUTH_SUCCESS", "Sesi login berhasil diikat ke Cookie Jar.");
      return {
        success: true,
        token: this.tok
      };
    } catch (err) {
      const errMsg = err.response?.data?.error_description || err.response?.data?.msg || err.message;
      this._log("AUTH_ERR", errMsg);
      this.email = null;
      return {
        success: false,
        error: errMsg
      };
    }
  }
  async _resImg(img) {
    try {
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string" && img.startsWith("http")) {
        const res = await axios.get(img, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      if (typeof img === "string" && img.startsWith("data:image")) {
        return Buffer.from(img.split(",")[1], "base64");
      }
      if (typeof img === "string") return Buffer.from(img, "base64");
      return null;
    } catch {
      return null;
    }
  }
  async _up(imgBuffer) {
    try {
      const loginStatus = await this.auth();
      if (!loginStatus.success) return {
        success: false,
        error: loginStatus.error
      };
      const resTok = await this.client.post("/api/kie/upload-token", {});
      const {
        apiKey,
        uploadEndpoint
      } = resTok.data || {};
      if (!apiKey || !uploadEndpoint) return {
        success: false,
        error: "Gagal memuat upload token."
      };
      const fName = `image-${Date.now()}.png`;
      const form = new FormData();
      form.append("file", imgBuffer, {
        filename: fName,
        contentType: "image/png"
      });
      form.append("uploadPath", "images");
      form.append("fileName", fName);
      const resUp = await axios.post(uploadEndpoint, form, {
        headers: {
          "user-agent": this.ua,
          ...form.getHeaders(),
          authorization: `Bearer ${apiKey}`,
          origin: "https://nanobananapro.pics"
        }
      });
      return {
        success: true,
        url: resUp.data?.data?.downloadUrl || ""
      };
    } catch (err) {
      this._log("UP_ERR", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async _poll(tId) {
    let attempts = 0;
    while (attempts < 60) {
      try {
        attempts++;
        const res = await this.client.get(`/api/kie-service/poll?taskId=${tId}`);
        const status = res.data?.data?.status || "failed";
        this._log("POLL", `Attempt ${attempts}: ${status}`);
        if (status === "completed" || res.data?.data?.state === "success") {
          return {
            success: true,
            result: res.data?.data?.result
          };
        }
        if (status === "failed") return {
          success: false,
          error: "Task broken on remote engine."
        };
        await new Promise(r => setTimeout(r, 3e3));
      } catch (err) {
        this._log("POLL_ERR", err.message);
        return {
          success: false,
          error: err.message
        };
      }
    }
    return {
      success: false,
      error: "Task timeout polling."
    };
  }
  async generate({
    state,
    prompt,
    image,
    ...rest
  }) {
    try {
      if (state) this.fromState(state);
      const targetModel = rest.modelId || "nano-banana-pro";
      const hasImage = !!image;
      const validation = this.validateInput(targetModel, prompt, hasImage, rest.aspect_ratio, rest.resolution);
      if (!validation.isValid) {
        this._log("VALIDATION_FAILED", validation.error);
        return {
          success: false,
          error: validation.error
        };
      }
      const loginStatus = await this.auth();
      if (!loginStatus.success) return {
        success: false,
        error: loginStatus.error
      };
      let imgUrls = [];
      const rawImages = Array.isArray(image) ? image : image ? [image] : [];
      for (const imgItem of rawImages) {
        const buf = await this._resImg(imgItem);
        if (buf) {
          this._log("IMG_UP", "Uploading image sequence...");
          const upRes = await this._up(buf);
          if (upRes.success && upRes.url) imgUrls.push(upRes.url);
        }
      }
      const baseModelPath = imgUrls.length > 0 ? "google/nano-banana-edit" : "google/nano-banana";
      this._log("GEN", `Dispatching task via model: ${targetModel}`);
      const resGen = await this.client.post("/api/kie-service", {
        model: rest.model || baseModelPath,
        modelId: targetModel,
        input: {
          prompt: prompt,
          image_urls: imgUrls,
          output_format: rest.output_format || "PNG",
          image_size: rest.image_size || "auto",
          ...rest.aspect_ratio && {
            aspect_ratio: rest.aspect_ratio
          },
          ...rest.resolution && {
            resolution: rest.resolution
          }
        }
      }, {
        headers: {
          "content-type": "application/json"
        }
      });
      const taskId = resGen.data?.data?.taskId;
      if (!taskId) return {
        success: false,
        error: "Task ID unresolved from API."
      };
      const pollRes = await this._poll(taskId);
      if (!pollRes.success) return pollRes;
      return {
        success: true,
        result: pollRes.result,
        state: this.toState()
      };
    } catch (err) {
      this._log("FATAL", err.message);
      return {
        success: false,
        error: err.message
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