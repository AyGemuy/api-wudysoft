import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class DeepAI {
  constructor() {
    this.baseURL = "https://api.deepai.org";
    this.ua = this._ua();
    this.styles = {
      "stable-diffusion": "api/stable-diffusion",
      "cute-creature": "api/cute-creature-generator",
      "fantasy-world": "api/fantasy-world-generator",
      cyberpunk: "api/cyberpunk-generator",
      "anime-portrait": "api/anime-portrait-generator",
      "old-style": "api/old-style-generator",
      renaissance: "api/renaissance-painting-generator",
      abstract: "api/abstract-painting-generator",
      impressionism: "api/impressionism-painting-generator",
      "surreal-graphics": "api/surreal-graphics-generator",
      "3d-objects": "api/3d-objects-generator",
      "origami-3d": "api/origami-3d-generator",
      "hologram-3d": "api/hologram-3d-generator",
      "3d-character": "api/3d-character-generator",
      watercolor: "api/watercolor-painting-generator",
      "pop-art": "api/pop-art-generator",
      "contemporary-arch": "api/contemporary-architecture-generator",
      "future-arch": "api/future-architecture-generator",
      "watercolor-arch": "api/watercolor-architecture-generator",
      "fantasy-character": "api/fantasy-character-generator",
      steampunk: "api/steampunk-generator",
      logo: "api/logo-generator",
      "pixel-art": "api/pixel-art-generator",
      "street-art": "api/street-art-generator",
      "surreal-portrait": "api/surreal-portrait-generator",
      "anime-world": "api/anime-world-generator",
      "fantasy-portrait": "api/fantasy-portrait-generator",
      "comics-portrait": "api/comics-portrait-generator",
      "cyberpunk-portrait": "api/cyberpunk-portrait-generator"
    };
    this.rules = {
      chat: ["prompt"],
      txt2img: ["prompt"],
      gen: ["prompt", "style"],
      edit: ["prompt", "image"],
      rmbg: ["image"],
      upscale: ["image"],
      srgan: ["image"],
      colorize: ["image"],
      video: ["prompt"],
      audio: ["prompt"]
    };
  }
  _ok(data) {
    return {
      status: "ok",
      ...data
    };
  }
  _err(code, msg, extra = {}) {
    return {
      status: "error",
      code: code,
      message: msg,
      ...extra
    };
  }
  _validate(mode, opts) {
    const modes = Object.keys(this.rules);
    if (!mode) return this._err("MISSING_MODE", "mode is required", {
      available: modes
    });
    if (!this.rules[mode]) return this._err("INVALID_MODE", `unknown mode "${mode}"`, {
      available: modes
    });
    const missing = this.rules[mode].filter(f => !opts[f]);
    if (missing.length) return this._err("MISSING_FIELDS", "required fields missing", {
      missing: missing
    });
    if (mode === "gen" && !this.styles[opts.style]) return this._err("INVALID_STYLE", `unknown style "${opts.style}"`, {
      available: Object.keys(this.styles)
    });
    return null;
  }
  _ua() {
    try {
      const os = [10, 11, 12, 13, 14][Math.floor(Math.random() * 5)];
      const chr = [120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131][Math.floor(Math.random() * 12)];
      const l = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" [Math.floor(Math.random() * 26)];
      return `Mozilla/5.0 (Linux; Android ${os}; ${l}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chr}.0.0.0 Mobile Safari/537.36`;
    } catch (e) {
      console.error("[ua]", e.message);
      return "Mozilla/5.0 (Linux; Android 13; A) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36";
    }
  }
  _md5(s) {
    try {
      return crypto.createHash("md5").update(s).digest("hex").split("").reverse().join("");
    } catch (e) {
      console.error("[md5]", e.message);
      throw e;
    }
  }
  _key() {
    try {
      const r = Math.round(Math.random() * 1e11) + "";
      const sc = "hackers_become_a_little_stinkier_every_time_they_hack";
      const h = this._md5(this.ua + this._md5(this.ua + this._md5(this.ua + r + sc)));
      return `tryit-${r}-${h}`;
    } catch (e) {
      console.error("[key]", e.message);
      throw e;
    }
  }
  _form(data) {
    try {
      const f = new FormData();
      for (const [k, v] of Object.entries(data)) {
        if (v == null) continue;
        f.append(k, typeof v === "object" && !Buffer.isBuffer(v) ? JSON.stringify(v) : v);
      }
      return f;
    } catch (e) {
      console.error("[form]", e.message);
      throw e;
    }
  }
  async _post(endpoint, data = {}, extra = {}) {
    try {
      console.log(`[post] ${endpoint}`, Object.keys(data));
      const f = this._form(data);
      const res = await axios.post(`${this.baseURL}${endpoint}`, f, {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "api-key": this._key(),
          origin: this.baseURL,
          referer: `${this.baseURL}/`,
          "user-agent": this.ua,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-request-id": crypto.randomBytes(8).toString("hex"),
          ...f.getHeaders(),
          ...extra
        }
      });
      console.log(`[post] ${endpoint} -> ${res.status}`);
      return res.data;
    } catch (e) {
      console.error(`[post] ${endpoint}:`, e?.response?.data ?? e.message);
      throw e;
    }
  }
  async generate({
    mode,
    prompt,
    image,
    style,
    messages,
    model,
    version,
    gridSize,
    dimensions,
    ...rest
  }) {
    try {
      const opts = {
        prompt: prompt,
        image: image,
        style: style,
        messages: messages,
        model: model,
        version: version,
        gridSize: gridSize,
        dimensions: dimensions,
        ...rest
      };
      const invalid = this._validate(mode, opts);
      if (invalid) {
        console.warn("[gen] validation failed:", invalid);
        return invalid;
      }
      console.log(`[gen] mode=${mode} style=${style ?? "-"}`);
      switch (mode) {
        case "chat": {
          try {
            const data = await this._post("/hacking_is_a_serious_crime", {
              chat_style: rest.chatStyle ?? "chat",
              chatHistory: messages?.length ? messages : [{
                role: "user",
                content: prompt
              }],
              model: model ?? "standard",
              hacker_is_stinky: "very_stinky"
            });
            return this._ok({
              mode: mode,
              result: data
            });
          } catch (e) {
            console.error("[gen:chat]", e.message);
            return this._err("CHAT_FAILED", e.message);
          }
        }
        case "txt2img": {
          try {
            const data = await this._post("/api/text2img", {
              text: prompt,
              image_generator_version: version ?? "hd"
            });
            return this._ok({
              mode: mode,
              result: data
            });
          } catch (e) {
            console.error("[gen:txt2img]", e.message);
            return this._err("TXT2IMG_FAILED", e.message);
          }
        }
        case "gen": {
          try {
            const ep = this.styles[style];
            const data = await this._post(`/${ep}`, {
              text: prompt,
              grid_size: gridSize ?? 1,
              ...rest
            });
            return this._ok({
              mode: mode,
              style: style,
              result: data
            });
          } catch (e) {
            console.error("[gen:gen]", e.message);
            return this._err("GEN_FAILED", e.message);
          }
        }
        case "edit": {
          try {
            const data = await this._post("/api/image-editor", {
              image: image,
              text: prompt
            });
            return this._ok({
              mode: mode,
              result: data
            });
          } catch (e) {
            console.error("[gen:edit]", e.message);
            return this._err("EDIT_FAILED", e.message);
          }
        }
        case "rmbg": {
          try {
            const data = await this._post("/api/background-remover", {
              image: image
            });
            return this._ok({
              mode: mode,
              result: data
            });
          } catch (e) {
            console.error("[gen:rmbg]", e.message);
            return this._err("RMBG_FAILED", e.message);
          }
        }
        case "upscale": {
          try {
            const data = await this._post("/api/waifu2x", {
              image: image
            });
            return this._ok({
              mode: mode,
              result: data
            });
          } catch (e) {
            console.error("[gen:upscale]", e.message);
            return this._err("UPSCALE_FAILED", e.message);
          }
        }
        case "srgan": {
          try {
            const data = await this._post("/api/torch-srgan", {
              image: image
            });
            return this._ok({
              mode: mode,
              result: data
            });
          } catch (e) {
            console.error("[gen:srgan]", e.message);
            return this._err("SRGAN_FAILED", e.message);
          }
        }
        case "colorize": {
          try {
            const data = await this._post("/api/colorizer", {
              image: image
            });
            return this._ok({
              mode: mode,
              result: data
            });
          } catch (e) {
            console.error("[gen:colorize]", e.message);
            return this._err("COLORIZE_FAILED", e.message);
          }
        }
        case "video": {
          try {
            const data = await this._post("/generate_video", {
              textPrompt: prompt,
              dimensions: dimensions ?? "default"
            });
            return this._ok({
              mode: mode,
              result: data
            });
          } catch (e) {
            console.error("[gen:video]", e.message);
            return this._err("VIDEO_FAILED", e.message);
          }
        }
        case "audio": {
          try {
            const data = await this._post("/audio_response", {
              text: prompt
            }, {
              "content-type": "application/json"
            });
            return this._ok({
              mode: mode,
              result: data
            });
          } catch (e) {
            console.error("[gen:audio]", e.message);
            return this._err("AUDIO_FAILED", e.message);
          }
        }
      }
    } catch (e) {
      console.error("[gen] fatal:", e.message);
      return this._err("FATAL", e.message);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new DeepAI();
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