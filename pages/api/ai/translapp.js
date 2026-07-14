import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class GalaxyAI {
  constructor() {
    this.uid = null;
    this.cfg = {
      base: "https://translapp.info",
      ep: {
        ask: "/ai/g/ask",
        send: "/ai/g/send",
        img: "/ai/g/ask_img"
      },
      mods: ["ASK", "GRAMMAR", "TRANSLATE", "REPLY", "TONE", "EXPAND", "PARAPHRASE", "SUMMARIZE"]
    };
    this.api = axios.create({
      baseURL: this.cfg.base,
      timeout: 5e5,
      headers: {
        "Accept-Language": "en",
        "User-Agent": "okhttp/4.11.0",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip"
      }
    });
  }
  _gKey(txt = "") {
    try {
      console.log("[PROCESS] Generating security signature & device key...");
      this.uid = this.uid || crypto.randomBytes(8).toString("hex");
      const chunk = String(txt || "").substring(0, 5).padEnd(5, "0");
      return {
        uid: this.uid,
        k: crypto.createHash("sha256").update(`${chunk}ZERO`, "utf8").digest("hex")
      };
    } catch (e) {
      console.error("[ERROR] Failed generating key signature:", e.message);
      throw e;
    }
  }
  async _buf(inp) {
    try {
      console.log("[PROCESS] Processing image input into buffer structure...");
      let b, t = "image/jpeg",
        n = `${crypto.randomBytes(8).toString("hex")}.jpg`;
      if (typeof inp === "string") {
        if (inp.startsWith("http")) {
          console.log(`[PROCESS] Fetching image from URL: ${inp}`);
          const r = await axios.get(inp, {
            responseType: "arraybuffer"
          });
          b = Buffer.from(r.data);
          t = r.headers["content-type"] || t;
          n = inp.split("/").pop().split("?")[0] || n;
        } else if (inp.startsWith("data:image")) {
          console.log("[PROCESS] Converting Base64 data URI to buffer...");
          const m = inp.match(/^data:([^;]+);base64,(.+)$/);
          if (!m) return null;
          t = m[1];
          b = Buffer.from(m[2], "base64");
          n = `${crypto.randomBytes(8).toString("hex")}.${t.split("/")[1] || "jpg"}`;
        } else {
          const fs = await import("fs").catch(() => null);
          if (fs?.existsSync?.(inp)) {
            console.log(`[PROCESS] Reading file from local path: ${inp}`);
            b = fs.readFileSync(inp);
            n = (await import("path")).basename(inp);
          } else {
            console.log("[PROCESS] Interpreting string as raw Base64 data...");
            b = Buffer.from(inp, "base64");
          }
        }
      } else b = Buffer.isBuffer(inp) ? inp : null;
      return b ? {
        buf: b,
        name: n,
        type: t
      } : null;
    } catch (e) {
      console.error("[ERROR] Buffering system failure:", e.message);
      return null;
    }
  }
  async _post(path, pld) {
    try {
      console.log(`[POST] Outbound Request -> JSON Endpoint: ${path}`);
      const r = await this.api.post(path, pld, {
        headers: {
          "Content-Type": "application/json; charset=UTF-8"
        }
      });
      return {
        status: true,
        result: r.data
      };
    } catch (e) {
      console.error(`[POST ERROR] Failed executing text route:`, e.response?.data || e.message);
      return {
        status: false,
        result: e.response?.data || e.message
      };
    }
  }
  async _img(fd, prms, cPath) {
    try {
      const target = cPath || this.cfg.ep.img;
      console.log(`[POST] Outbound Request -> Multipart Image Endpoint: ${target}`);
      const form = new FormData();
      form.append("k", prms.k);
      form.append("text", prms.text || prms.query || "");
      form.append("userId", prms.userId);
      form.append("module", prms.module);
      if (prms.to) form.append("to", prms.to);
      form.append("file", fd.buf, {
        filename: fd.name,
        contentType: fd.type
      });
      Object.keys(prms).forEach(f => {
        if (!["k", "text", "userId", "query", "to", "module"].includes(f) && prms[f] !== null && prms[f] !== undefined) {
          form.append(f, typeof prms[f] === "string" ? prms[f] : JSON.stringify(prms[f]));
        }
      });
      const res = await this.api.post(target, form, {
        headers: form.getHeaders(),
        timeout: 5e5
      });
      return {
        status: true,
        result: res.data
      };
    } catch (e) {
      console.error(`[IMAGE ERROR] Failed executing image route:`, e.response?.data || e.message);
      return {
        status: false,
        result: e.response?.data || e.message
      };
    }
  }
  async generate({
    module,
    prompt,
    image,
    messages = [],
    uid,
    mode,
    ...rest
  } = {}) {
    console.log("[PROCESS] Initializing Engine validation pipeline...");
    let id = uid || this.uid;
    const list = this.cfg.mods.join(", ");
    try {
      if (!module) {
        console.warn("[VALIDATION FAILED] Parameter module is completely missing.");
        return {
          status: false,
          uid: id,
          result: `Parameter "module" wajib diisi. Available: [${list}]`
        };
      }
      const mod = String(module).toUpperCase();
      console.log(`[PROCESS] Validating requested module: "${mod}"`);
      if (!this.cfg.mods.includes(mod)) {
        console.warn(`[VALIDATION FAILED] Module "${mod}" is not listed in available modules.`);
        return {
          status: false,
          uid: id,
          result: `Modul "${mod}" tidak valid. Available: [${list}]`
        };
      }
      const base = prompt || (messages.length > 0 ? messages[0].content : "") || rest.query || rest.text || "";
      const text = rest.text || base;
      let msg = [...messages];
      if (msg.length === 0 && base) msg.push({
        role: "user",
        content: base
      });
      switch (mod) {
        case "ASK":
          if (!base && !image) {
            console.warn("[VALIDATION FAILED] ASK module requires prompt, messages, or an image.");
            return {
              status: false,
              uid: id,
              result: 'Modul ASK butuh input "prompt", "messages", atau "image".'
            };
          }
          break;
        case "TRANSLATE":
          if (!text) {
            console.warn("[VALIDATION FAILED] TRANSLATE module requires prompt or text.");
            return {
              status: false,
              uid: id,
              result: 'Modul TRANSLATE butuh parameter "prompt" atau "text".'
            };
          }
          break;
        default:
          console.log(`[PROCESS] Standard generic payload check for module: ${mod}`);
          break;
      }
      const lang = rest.to || (mod === "TRANSLATE" ? "en" : "");
      let sm = String(mode || "auto").toLowerCase();
      let path = null;
      switch (sm) {
        case "ask":
          path = this.cfg.ep.ask;
          break;
        case "send":
          path = this.cfg.ep.send;
          break;
        case "ask_img":
        case "image":
          path = this.cfg.ep.img;
          break;
        default:
          console.log('[PROCESS] Mode routing falling back to "auto" positioning...');
          break;
      }
      if (image || sm === "ask_img" || sm === "image") {
        console.log("[PROCESS] Executing Image routing track...");
        const fd = await this._buf(image || "");
        if (!fd) {
          console.error("[PROCESS FAILED] Buffer payload creation returned empty value.");
          return {
            status: false,
            uid: id,
            result: "Gagal memproses gambar."
          };
        }
        const sign = this._gKey(fd.name);
        id = uid || sign.uid;
        const prms = {
          userId: id,
          module: mod,
          query: base || "Describe this image",
          k: rest.k || sign.k,
          text: text,
          to: lang,
          ...rest
        };
        return {
          ...await this._img(fd, prms, path),
          uid: id
        };
      }
      console.log("[PROCESS] Executing Text routing track...");
      const sign = this._gKey(base);
      id = uid || sign.uid;
      const pld = {
        userId: id,
        module: mod,
        query: base,
        messages: msg,
        k: rest.k || sign.k,
        text: text,
        to: lang,
        ...rest
      };
      const defaultPath = path || (mod === "ASK" ? this.cfg.ep.send : this.cfg.ep.ask);
      return {
        ...await this._post(defaultPath, pld),
        uid: id
      };
    } catch (e) {
      console.error("[FATAL EXCEPTION] Core generator pipeline crashed:", e.message);
      return {
        status: false,
        uid: id || this.uid,
        result: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new GalaxyAI();
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