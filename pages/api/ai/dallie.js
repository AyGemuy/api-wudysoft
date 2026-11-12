import axios from "axios";
import FormData from "form-data";
const BASE = "https://loadbalancer.dalliegenerator.app/images";
const MODES = ["remove", "edit", "gen"];
const MODELS = ["flux.2-pro", "z-image", "qwen-image", "imagen-4", "grok-imagine"];
const FORMATS = ["1:1", "16:9", "9:16", "4:3", "3:4"];
const QUANTITIES = [1, 2, 3, 4];
const log = (t, ...a) => console.log(`[dallie:${t}]`, ...a);
const ok = v => v !== undefined && v !== null && v !== "";
class Dallie {
  constructor() {
    this.timeout = 12e4;
  }
  async run({
    mode,
    prompt,
    image,
    model,
    format,
    quantity
  } = {}) {
    try {
      if (!ok(mode)) return {
        ok: false,
        message: "mode is required",
        available: MODES
      };
      if (!MODES.includes(mode)) return {
        ok: false,
        message: "mode invalid",
        available: MODES
      };
      log("run", `starting mode: ${mode}`);
      if (mode === "remove") return await this._remove({
        image: image
      });
      if (mode === "edit") return await this._edit({
        image: image,
        prompt: prompt,
        model: model
      });
      if (mode === "gen") return await this._gen({
        prompt: prompt,
        model: model,
        format: format,
        quantity: quantity
      });
    } catch (e) {
      log("error", "run", e.message);
      return {
        ok: false,
        message: e.message
      };
    }
  }
  async toBuffer(image) {
    try {
      if (Buffer.isBuffer(image)) return {
        buf: image,
        type: "image/jpeg"
      };
      if (typeof image === "string") {
        if (/^https?:\/\//.test(image)) {
          log("img", "fetch url", image.substring(0, 50) + "...");
          const r = await axios.get(image, {
            responseType: "arraybuffer",
            timeout: 3e4
          });
          return {
            buf: Buffer.from(r.data),
            type: r.headers["content-type"] || "image/jpeg"
          };
        }
        const m = image.match(/^data:([^;]+);/);
        const b64 = image.includes(",") ? image.split(",")[1] : image;
        return {
          buf: Buffer.from(b64, "base64"),
          type: m?.[1] || "image/jpeg"
        };
      }
      throw new Error("image must be url, base64, or Buffer");
    } catch (e) {
      throw new Error(`toBuffer failed: ${e.message}`);
    }
  }
  async _remove({
    image
  }) {
    if (!ok(image)) return {
      ok: false,
      message: "image is required"
    };
    try {
      log("remove", "resolving image");
      const {
        buf,
        type
      } = await this.toBuffer(image);
      const fd = new FormData();
      fd.append("file", buf, {
        filename: "file.jpg",
        contentType: type
      });
      log("remove", "POST /remove-bg");
      const r = await axios.post(`${BASE}/remove-bg`, fd, {
        headers: {
          "User-Agent": "okhttp/4.9.2",
          ...fd.getHeaders()
        },
        timeout: this.timeout
      });
      log("remove", "response", r.data);
      return this._parse(r.data);
    } catch (e) {
      const errData = e.response?.data || e.message;
      log("error", "_remove", errData);
      return {
        ok: false,
        message: errData.message || e.message
      };
    }
  }
  async _edit({
    image,
    prompt,
    model
  }) {
    if (!ok(image)) return {
      ok: false,
      message: "image is required"
    };
    if (!ok(prompt)) return {
      ok: false,
      message: "prompt is required"
    };
    try {
      log("edit", "resolving image");
      const {
        buf,
        type
      } = await this.toBuffer(image);
      const fd = new FormData();
      fd.append("instruction", prompt);
      fd.append("model", model || "gemini-2.5-flash-image");
      fd.append("file", buf, {
        filename: "file.jpg",
        contentType: type
      });
      log("edit", "POST /edit");
      const r = await axios.post(`${BASE}/edit`, fd, {
        headers: {
          "User-Agent": "okhttp/4.9.2",
          ...fd.getHeaders()
        },
        timeout: this.timeout
      });
      log("edit", "response", r.data);
      return this._parse(r.data);
    } catch (e) {
      const errData = e.response?.data || e.message;
      log("error", "_edit", errData);
      return {
        ok: false,
        message: errData.message || e.message
      };
    }
  }
  async _gen({
    prompt,
    model,
    format,
    quantity
  }) {
    try {
      if (!ok(prompt)) return {
        ok: false,
        message: "prompt is required"
      };
      const payload = {
        prompt: prompt,
        model: model || "z-image",
        format: format || "9:16",
        quantity: quantity || 1
      };
      log("gen", "POST /generate", payload);
      const r = await axios.post(`${BASE}/generate`, payload, {
        headers: {
          "User-Agent": "okhttp/4.9.2",
          "Content-Type": "application/json"
        },
        timeout: this.timeout
      });
      log("gen", "response", r.data);
      const job_id = r.data?.job_id;
      if (!job_id) throw new Error("no job_id in response");
      return await this._poll(job_id);
    } catch (e) {
      const errData = e.response?.data || e.message;
      log("error", "_gen", errData);
      return {
        ok: false,
        message: errData.message || e.message
      };
    }
  }
  async _poll(job_id, tries = 60, delay = 3e3) {
    log("poll", `start polling for: ${job_id}`);
    for (let i = 1; i <= tries; i++) {
      try {
        const r = await axios.get(`${BASE}/status/${job_id}`, {
          headers: {
            "User-Agent": "okhttp/4.9.2"
          },
          timeout: this.timeout
        });
        const d = r.data;
        log("poll", `attempt ${i} status:`, d?.status);
        if (d?.status === "succeeded") {
          const img = d.images?.[0];
          if (img?.url) {
            log("poll", "downloading result", img.url);
            const dl = await axios.get(img.url, {
              responseType: "arraybuffer"
            });
            return {
              ok: true,
              buffer: Buffer.from(dl.data),
              contentType: dl.headers["content-type"] || "image/png"
            };
          }
          if (img?.b64_json) {
            return {
              ok: true,
              buffer: Buffer.from(img.b64_json, "base64"),
              contentType: "image/png"
            };
          }
          return {
            ok: false,
            message: "job succeeded but no image found"
          };
        }
        if (d?.status === "failed") return {
          ok: false,
          message: "job failed on server"
        };
        await new Promise(res => setTimeout(res, delay));
      } catch (e) {
        log("error", "poll_loop", e.message);
        if (i === tries) return {
          ok: false,
          message: "polling connection error: " + e.message
        };
        await new Promise(res => setTimeout(res, delay));
      }
    }
    return {
      ok: false,
      message: "polling timeout"
    };
  }
  _parse(data) {
    const b64 = data?.image_base64 || data?.data?.image_base64;
    if (!b64) return {
      ok: false,
      message: "no image in response",
      raw: data
    };
    return {
      ok: true,
      buffer: Buffer.from(b64, "base64"),
      contentType: data?.mime_type || "image/png"
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params?.mode) {
    return res.status(400).json({
      ok: false,
      message: "Parameter 'mode' wajib diisi.",
      available_modes: MODES,
      usage: {
        method: "GET / POST",
        params: {
          remove: {
            mode: "remove",
            image: "<url|base64>"
          },
          edit: {
            mode: "edit",
            image: "<url|base64>",
            prompt: "...",
            model: "(opsional)"
          },
          gen: {
            mode: "gen",
            prompt: "...",
            model: "(opsional)",
            format: "(opsional)",
            quantity: "(opsional)"
          }
        },
        available_models: MODELS,
        available_formats: FORMATS,
        available_quantities: QUANTITIES
      }
    });
  }
  const api = new Dallie();
  try {
    const result = await api.run(params);
    if (result?.ok && Buffer.isBuffer(result.buffer)) {
      res.setHeader("Content-Type", result.contentType || "image/png");
      res.setHeader("Content-Length", result.buffer.length);
      return res.status(200).send(result.buffer);
    }
    const status = result?.ok === false ? 400 : 200;
    return res.status(status).json(result);
  } catch (error) {
    log("error", "handler", error.message);
    return res.status(500).json({
      ok: false,
      message: error.message || "Internal server error"
    });
  }
}