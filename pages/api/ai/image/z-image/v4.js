import axios from "axios";
import {
  createHash
} from "crypto";
import SpoofHead from "@/lib/spoof-head";
const BASE = "https://zimage.run";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const HEADS = {
  "User-Agent": UA,
  Accept: "*/*",
  "Accept-Language": "id-ID",
  Origin: BASE,
  Referer: BASE + "/",
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  ...SpoofHead()
};
const RATIOS = {
  "1:1": {
    w: 512,
    h: 512
  },
  "3:2": {
    w: 768,
    h: 512
  },
  "2:3": {
    w: 512,
    h: 768
  },
  "16:9": {
    w: 1280,
    h: 720
  },
  "9:16": {
    w: 720,
    h: 1280
  },
  "4:3": {
    w: 1152,
    h: 896
  },
  "3:4": {
    w: 896,
    h: 1152
  }
};
const MODELS = ["turbo", "ernie-image-turbo", "flux2-klein-9b", "qwen-image", "beyond-reality", "redcraft", "dark-beast"];
class ZImage {
  constructor() {
    this.poll_max = 60;
    this.poll_ms = 3e3;
    this.cookie = "";
  }
  _h(extra) {
    try {
      return {
        ...HEADS,
        "Content-Type": "application/json",
        ...this.cookie ? {
          Cookie: this.cookie
        } : {},
        ...extra
      };
    } catch (e) {
      console.error("[h] error →", e.message);
      throw e;
    }
  }
  async _img(src) {
    try {
      if (Buffer.isBuffer(src)) {
        console.log("[img] buffer input");
        return `data:image/png;base64,${src.toString("base64")}`;
      }
      if (typeof src === "string" && /^data:image/.test(src)) {
        console.log("[img] base64 data url");
        return src;
      }
      if (typeof src === "string" && /^[A-Za-z0-9+/]+=*$/.test(src) && src.length > 100) {
        console.log("[img] raw base64");
        return `data:image/png;base64,${src}`;
      }
      if (typeof src === "string" && /^https?:\/\//.test(src)) {
        console.log("[img] axios url →", src);
        const res = await axios.get(src, {
          responseType: "arraybuffer"
        });
        const buf = Buffer.from(res.data);
        const mime = res.headers["content-type"] ?? "image/png";
        return `data:${mime};base64,${buf.toString("base64")}`;
      }
      throw new Error("unsupported image input type");
    } catch (e) {
      console.error("[img] error →", e.message);
      throw e;
    }
  }
  _mdl(model, mode) {
    try {
      const defaultModel = mode === "image-to-image" ? "flux2-klein-9b" : "turbo";
      const m = model ?? defaultModel;
      if (!MODELS.includes(m)) {
        console.warn(`[mdl] model "${m}" unknown, fallback for ${mode} → ${defaultModel}`);
        return defaultModel;
      }
      return m;
    } catch (e) {
      console.error("[mdl] error →", e.message);
      throw e;
    }
  }
  _dim(ratio, width, height) {
    try {
      if (width && height) {
        console.log("[dim] custom dim →", width, "x", height);
        return {
          width: width,
          height: height
        };
      }
      const r = ratio ?? "1:1";
      const d = RATIOS[r];
      if (!d) {
        console.warn(`[dim] ratio "${r}" unknown, fallback → 1:1`);
        return {
          width: RATIOS["1:1"].w,
          height: RATIOS["1:1"].h
        };
      }
      console.log("[dim] ratio →", r, "=", d.w, "x", d.h);
      return {
        width: d.w,
        height: d.h
      };
    } catch (e) {
      console.error("[dim] error →", e.message);
      throw e;
    }
  }
  async _mod(prompt, routeKey) {
    try {
      console.log("[mod] checking prompt →", prompt.slice(0, 40));
      const res = await axios.post(`${BASE}/api/prompt-moderation/check`, {
        prompt: prompt,
        routeKey: routeKey,
        targetType: routeKey
      }, {
        headers: this._h()
      });
      const json = res.data;
      const ok = json?.data?.allowed ?? false;
      const tok = json?.data?.promptModerationToken ?? null;
      console.log("[mod] allowed →", ok);
      if (!ok) throw new Error("prompt blocked by moderation");
      return tok;
    } catch (e) {
      console.error("[mod] error →", e.response?.data?.error || e.message);
      throw e;
    }
  }
  async _gen(body) {
    try {
      console.log("[gen] submitting task →", body.modelType, body.width + "x" + body.height);
      const res = await axios.post(`${BASE}/api/z-image/generate`, body, {
        headers: this._h()
      });
      const json = res.data;
      if (!json?.success) throw new Error(json?.error ?? "generate failed");
      const uuid = json?.data?.uuid;
      console.log("[gen] uuid →", uuid);
      return uuid;
    } catch (e) {
      console.error("[gen] error →", e.response?.data?.error || e.message);
      throw e;
    }
  }
  async _pol(uuid) {
    try {
      console.log("[pol] start →", uuid, `max=${this.poll_max} interval=${this.poll_ms}ms`);
      for (let i = 0; i < this.poll_max; i++) {
        try {
          await new Promise(r => setTimeout(r, this.poll_ms));
          const res = await axios.get(`${BASE}/api/z-image/task/${uuid}`, {
            headers: this._h()
          });
          const json = res.data;
          if (!json?.success) throw new Error(json?.error ?? "task query failed");
          const task = json?.data?.task ?? {};
          const status = task?.taskStatus ?? "unknown";
          const prog = task?.progress ?? 0;
          console.log(`[pol] #${i + 1} status=${status} progress=${prog}%`);
          if (status === "completed") {
            let urls = [];
            try {
              const parsed = JSON.parse(task.resultUrl);
              urls = Array.isArray(parsed) ? parsed : [task.resultUrl];
            } catch {
              urls = [task.resultUrl];
            }
            console.log("[pol] done → urls:", urls.length);
            return {
              task: task,
              urls: urls
            };
          }
          if (status === "failed") throw new Error(task?.errorMessage ?? "task failed");
        } catch (innerErr) {
          console.error(`[pol] attempt #${i + 1} failed →`, innerErr.response?.data?.error || innerErr.message);
          throw innerErr;
        }
      }
      throw new Error(`poll timeout after ${this.poll_max} attempts`);
    } catch (e) {
      console.error("[pol] fatal error →", e.message);
      throw e;
    }
  }
  async generate({
    prompt,
    image,
    model,
    ratio,
    width,
    height,
    batch = 1,
    seed,
    ...rest
  }) {
    try {
      console.log("[create] process started");
      const mode = image ? "image-to-image" : "text-to-image";
      const mdl = this._mdl(model, mode);
      const dim = this._dim(ratio, width, height);
      console.log("[create] mode →", mode, "| model →", mdl, "| batch →", batch);
      const imgs = [];
      if (image) {
        const list = Array.isArray(image) ? image : [image];
        for (const src of list) {
          const b64 = await this._img(src);
          imgs.push(b64);
        }
        console.log("[create] images resolved →", imgs.length);
      }
      const tok = await this._mod(prompt, "text_to_image");
      const body = {
        prompt: prompt,
        width: dim.width,
        height: dim.height,
        modelType: mdl,
        batchSize: batch,
        promptModerationToken: tok ?? undefined,
        ...seed ? {
          seed: String(seed)
        } : {},
        ...imgs.length ? {
          sourceImages: imgs
        } : {},
        ...rest
      };
      const uuid = await this._gen(body);
      const {
        task,
        urls
      } = await this._pol(uuid);
      console.log("[create] success result →", urls);
      return {
        uuid: uuid,
        urls: urls,
        task: task
      };
    } catch (e) {
      console.error("[create] fatal error →", e.message);
      throw e;
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
  const api = new ZImage();
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