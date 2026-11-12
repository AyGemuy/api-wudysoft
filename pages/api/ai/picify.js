import axios from "axios";
import {
  createHash,
  randomBytes
} from "crypto";
import FormData from "form-data";
class Picify {
  constructor() {
    this.token = null;
    this.uid = null;
    this.API_BASE = "https://api.picify.net";
    this.STUDIO_BASE = "https://aistudio.picify.net";
    this.ENHANCER_BASE = "https://app-ai.ahaquiz.me";
    this.ANI_BASE = "https://ani.ahaquiz.me";
    this.FB_KEY = "AIzaSyB1e8jdcU93iftgb4Zrsqc6L0pZ9DaUG2w";
    this.FB_URL = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${this.FB_KEY}`;
    this.TRYON_CDN = "https://aistudio.picify.net/data/tryon/";
    this.COUPLE_CDN = "https://aistudio.picify.net/data/couple/";
    this.CG_CDN = "https://aistudio.picify.net/data/cg/";
    this.HEADERS = {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
      "X-Android-Package": "com.artgenerator.texttoimage.aiart.removeobject.picify",
      "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81",
      "X-Client-Version": "Android/Fallback/X23002000/FirebaseCore-Android",
      "X-Firebase-GMPID": "1:888742325812:android:c41898c79d0c91b792a461",
      "X-Firebase-Client": "H4sIAAAAAAAA_6tWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA",
      "Accept-Language": "id-ID, en-US",
      "Accept-Encoding": "gzip",
      Connection: "Keep-Alive"
    };
    this.MODES = {
      faceswap: {
        required: ["source", "destination"]
      },
      tryon: {
        required: ["image"]
      },
      tryon_custom: {
        required: ["image1", "image2"]
      },
      ai_filter: {
        required: ["image", "prompt"]
      },
      couple: {
        required: ["image1", "image2"]
      },
      enhancer: {
        required: ["source"]
      },
      remove_object: {
        required: ["source", "mask"]
      },
      face_animation: {
        required: ["source", "driving"]
      },
      get_styles: {
        required: []
      },
      get_couples: {
        required: []
      },
      get_style_item: {
        required: ["style_id"]
      },
      get_couple_item: {
        required: ["couple_id"]
      },
      get_category: {
        required: ["cat_id"]
      },
      get_init_app: {
        required: []
      },
      get_filters: {
        required: []
      },
      status: {
        required: ["task_id", "status_path"]
      }
    };
    this.http = axios.create({
      headers: this.HEADERS
    });
    this.http.interceptors.request.use(cfg => {
      console.log(`[req] ${cfg.method?.toUpperCase()} ${cfg.url}`);
      return cfg;
    }, err => {
      console.error("[req err]", err?.message);
      return Promise.reject(err);
    });
    this.http.interceptors.response.use(r => {
      console.log(`[res] ${r.status} ${r.config?.url}`);
      return r;
    }, err => {
      console.error("[res err]", err?.response?.status, err?.response?.data ?? err?.message);
      return Promise.reject(err);
    });
  }
  async login() {
    if (this.token) {
      console.log("[auth] cached");
      return {
        uid: this.uid
      };
    }
    console.log("[auth] signing in ...");
    try {
      const {
        data
      } = await axios.post(this.FB_URL, {
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: {
          ...this.HEADERS,
          "Content-Type": "application/json"
        }
      });
      this.token = data?.idToken ?? null;
      this.uid = data?.localId ?? null;
      if (!this.token) throw new Error("idToken missing");
      console.log(`[auth] ok uid=${this.uid}`);
      return {
        uid: this.uid
      };
    } catch (e) {
      console.error("[auth] failed:", e?.response?.data ?? e?.message);
      throw e;
    }
  }
  sign() {
    const ts = Date.now().toString();
    const rand = randomBytes(8).toString("hex");
    const sig = createHash("sha256").update(`${ts}${rand}${this.uid ?? ""}`).digest("hex");
    return {
      Authorization: `Bearer ${this.token}`,
      "X-Request-ID": rand,
      "X-Timestamp": ts,
      "X-Signature": sig
    };
  }
  chkMode(mode) {
    if (!mode || !this.MODES[mode]) {
      const msg = mode ? `invalid mode "${mode}"` : "mode required";
      console.error(`[chk] ${msg}`);
      throw Object.assign(new Error(msg), {
        available: Object.keys(this.MODES)
      });
    }
  }
  chkInput(mode, input) {
    const missing = (this.MODES[mode]?.required ?? []).filter(k => input[k] == null || input[k] === "");
    if (missing.length) {
      console.error(`[chk] missing fields for "${mode}":`, missing);
      throw Object.assign(new Error("missing fields"), {
        missing: missing
      });
    }
  }
  mimeOf(buf) {
    if (buf[0] === 255 && buf[1] === 216) return {
      mime: "image/jpeg",
      ext: "jpg"
    };
    if (buf[0] === 137 && buf[1] === 80) return {
      mime: "image/png",
      ext: "png"
    };
    if (buf[0] === 71 && buf[1] === 73) return {
      mime: "image/gif",
      ext: "gif"
    };
    if (buf[0] === 82 && buf[4] === 87) return {
      mime: "image/webp",
      ext: "webp"
    };
    return {
      mime: "image/jpeg",
      ext: "jpg"
    };
  }
  async imgBuf(input, label = "image") {
    console.log(`[img] ${label} resolving ...`);
    try {
      if (!input) throw new Error(`${label} empty`);
      if (Buffer.isBuffer(input)) {
        console.log(`[img] ${label} Buffer(${input.length}B)`);
        return input;
      }
      if (typeof input !== "string") throw new Error(`${label} must be string/Buffer/URL`);
      if (/^data:image/.test(input)) {
        const buf = Buffer.from(input.split(",")[1], "base64");
        console.log(`[img] ${label} data-URI -> ${buf.length}B`);
        return buf;
      }
      if (/^https?:\/\//.test(input)) {
        console.log(`[img] ${label} downloading ${input}`);
        const r = await axios.get(input, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: new URL(input).origin
          }
        });
        const buf = Buffer.isBuffer(r.data) ? r.data : Buffer.from(new Uint8Array(r.data));
        console.log(`[img] ${label} downloaded ${buf.length}B`);
        return buf;
      }
      const buf = Buffer.from(input, "base64");
      console.log(`[img] ${label} base64 -> ${buf.length}B`);
      return buf;
    } catch (e) {
      console.error(`[img] ${label} failed:`, e?.message);
      throw e;
    }
  }
  async fetchJson(url) {
    console.log(`[fetch] GET ${url}`);
    try {
      const {
        data
      } = await axios.get(url, {
        headers: this.HEADERS
      });
      console.log(`[fetch] ok items=${Array.isArray(data) ? data.length : "obj"}`);
      return data;
    } catch (e) {
      console.error(`[fetch] failed ${url}:`, e?.message);
      throw e;
    }
  }
  async post(url, fields) {
    console.log(`[post] -> ${url}`);
    try {
      await this.login();
      const form = new FormData();
      for (const [k, v] of Object.entries(fields)) {
        if (v == null) {
          console.log(`[post] skip null "${k}"`);
          continue;
        }
        if (Buffer.isBuffer(v)) {
          const {
            mime,
            ext
          } = this.mimeOf(v);
          form.append(k, v, {
            filename: `${k}.${ext}`,
            contentType: mime
          });
          console.log(`[post] field "${k}" binary(${v.length}B) ${mime}`);
        } else {
          form.append(k, String(v));
          console.log(`[post] field "${k}" = ${String(v).slice(0, 80)}`);
        }
      }
      const {
        data
      } = await this.http.post(url, form, {
        headers: {
          ...this.sign(),
          ...form.getHeaders()
        }
      });
      console.log("[post] ok");
      return data;
    } catch (e) {
      console.error("[post] failed:", e?.response?.data ?? e?.message);
      throw e;
    }
  }
  async poll(taskId, statusPath, base = null, interval = 3e3, timeout = 12e4) {
    const pollBase = base ?? this.API_BASE;
    console.log(`[poll] taskId=${taskId} path=${statusPath} base=${pollBase}`);
    try {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, interval));
        try {
          const {
            data
          } = await this.http.get(`${pollBase}${statusPath}${taskId}`, {
            headers: this.sign()
          });
          const {
            result: inner,
            task_id,
            status
          } = data ?? {};
          const {
            success,
            result,
            mess_error
          } = inner ?? {};
          console.log(`[poll] success=${success} result=${result ?? null}`);
          if (success === true || result) {
            console.log(`[poll] done -> ${result}`);
            return {
              result: result ?? null,
              task_id: task_id,
              status: status,
              mess_error: mess_error ?? null
            };
          }
          console.log("[poll] pending ...");
        } catch (e) {
          console.warn(`[poll] retry (${e?.response?.status ?? e?.message})`);
        }
      }
      throw Object.assign(new Error(`poll timeout after ${timeout}ms`), {
        taskId: taskId
      });
    } catch (e) {
      console.error("[poll] failed:", e?.message);
      throw e;
    }
  }
  findStyle(styles, id) {
    for (const cat of styles ?? []) {
      for (const item of cat?.item ?? []) {
        if (String(item?.id) === String(id)) return {
          ...item,
          cat_id: cat?.cat_id,
          cat_name: cat?.name
        };
      }
    }
    const msg = `style_id "${id}" not found`;
    console.error(`[find] ${msg}`);
    throw new Error(msg);
  }
  findCouple(couples, id) {
    for (const item of couples ?? []) {
      if (String(item?.id) === String(id)) return item;
    }
    const msg = `couple_id "${id}" not found`;
    console.error(`[find] ${msg}`);
    throw new Error(msg);
  }
  async generate({
    mode,
    ...p
  }) {
    console.log(`[gen] mode=${mode} params=${JSON.stringify(Object.keys(p))}`);
    try {
      this.chkMode(mode);
      this.chkInput(mode, p);
      switch (mode) {
        case "get_styles": {
          console.log("[gen] get_styles fetching ...");
          const r = await this.fetchJson(`${this.STUDIO_BASE}/data/tryon.json`);
          const categories = (r ?? []).map(cat => ({
            cat_id: cat?.cat_id,
            name: cat?.name,
            items: (cat?.item ?? []).map(i => ({
              id: i?.id,
              type: i?.type,
              thumb: `${this.TRYON_CDN}${i?.thumb}`
            }))
          }));
          console.log(`[gen] get_styles cats=${categories.length}`);
          return {
            categories: categories
          };
        }
        case "get_couples": {
          console.log("[gen] get_couples fetching ...");
          const r = await this.fetchJson(`${this.STUDIO_BASE}/data/couple.json`);
          const items = (r ?? []).map(i => ({
            id: i?.id,
            type: i?.type,
            thumb: `${this.COUPLE_CDN}${i?.thumb}`
          }));
          console.log(`[gen] get_couples items=${items.length}`);
          return {
            items: items
          };
        }
        case "get_style_item": {
          console.log(`[gen] get_style_item style_id=${p.style_id}`);
          const r = await this.fetchJson(`${this.STUDIO_BASE}/data/tryon.json`);
          const f = this.findStyle(r, p.style_id);
          return {
            ...f,
            thumb_url: `${this.TRYON_CDN}${f?.thumb}`,
            model_url: `${this.TRYON_CDN}${f?.model}`
          };
        }
        case "get_couple_item": {
          console.log(`[gen] get_couple_item couple_id=${p.couple_id}`);
          const r = await this.fetchJson(`${this.STUDIO_BASE}/data/couple.json`);
          const f = this.findCouple(r, p.couple_id);
          return {
            ...f,
            thumb_url: `${this.COUPLE_CDN}${f?.thumb}`
          };
        }
        case "get_category": {
          console.log(`[gen] get_category cat_id=${p.cat_id}`);
          const r = await this.fetchJson(`${this.CG_CDN}${p.cat_id}.json`);
          console.log(`[gen] get_category items=${Array.isArray(r) ? r.length : "obj"}`);
          return r;
        }
        case "get_init_app": {
          console.log("[gen] get_init_app fetching ...");
          const r = await this.fetchJson(`${this.STUDIO_BASE}/data/Home.v1.dev.json`);
          console.log("[gen] get_init_app ok");
          return r;
        }
        case "get_filters": {
          console.log("[gen] get_filters fetching ...");
          const r = await this.fetchJson(`${this.STUDIO_BASE}/data/Home.effect.test.json`);
          console.log("[gen] get_filters ok");
          return r;
        }
        case "tryon": {
          let model, prompt = p.prompt ?? "";
          if (p.style_id != null) {
            console.log(`[gen] tryon style_id=${p.style_id} fetching ...`);
            const styles = await this.fetchJson(`${this.STUDIO_BASE}/data/tryon.json`);
            const f = this.findStyle(styles, p.style_id);
            model = `${this.TRYON_CDN}${f?.model}`;
            prompt = p.prompt ?? f?.prompt?.trim() ?? "";
            console.log(`[gen] tryon model=${model}`);
          } else {
            if (!p.model) throw new Error("tryon requires model or style_id");
            console.log("[gen] tryon model from input");
            model = await this.imgBuf(p.model, "model");
          }
          const img = await this.imgBuf(p.image, "image");
          const res = await this.post(`${this.API_BASE}/app/tryon`, {
            image: img,
            model: model,
            prompt: prompt,
            width: p.width ?? 1024,
            height: p.height ?? 1360
          });
          const taskId = res?.result?.task_id ?? res?.task_id ?? null;
          console.log(`[gen] tryon taskId=${taskId}`);
          return taskId ? this.poll(taskId, "/status/") : res;
        }
        case "tryon_custom": {
          console.log("[gen] tryon_custom resolving images ...");
          const i1 = await this.imgBuf(p.image1, "image1");
          const i2 = await this.imgBuf(p.image2, "image2");
          const res = await this.post(`${this.API_BASE}/app/tryon/custom`, {
            image1: i1,
            image2: i2,
            prompt: p.prompt ?? "The person in photo 1 is wearing the outfit in photo 2.",
            width: p.width ?? 1024,
            height: p.height ?? 1360
          });
          const taskId = res?.result?.task_id ?? res?.task_id ?? null;
          console.log(`[gen] tryon_custom taskId=${taskId}`);
          return taskId ? this.poll(taskId, "/status/") : res;
        }
        case "ai_filter": {
          console.log("[gen] ai_filter resolving image ...");
          const img = await this.imgBuf(p.image, "image");
          const res = await this.post(`${this.API_BASE}/app/edit`, {
            image: img,
            prompt: p.prompt
          });
          const taskId = res?.result?.task_id ?? res?.task_id ?? null;
          console.log(`[gen] ai_filter taskId=${taskId}`);
          return taskId ? this.poll(taskId, "/status/") : res;
        }
        case "couple": {
          let prompt = p.prompt ?? "";
          if (p.couple_id != null) {
            console.log(`[gen] couple couple_id=${p.couple_id} fetching ...`);
            const couples = await this.fetchJson(`${this.STUDIO_BASE}/data/couple.json`);
            const f = this.findCouple(couples, p.couple_id);
            prompt = p.prompt ?? f?.prompt?.trim() ?? "";
          }
          console.log("[gen] couple resolving images ...");
          const i1 = await this.imgBuf(p.image1, "image1");
          const i2 = await this.imgBuf(p.image2, "image2");
          const res = await this.post(`${this.API_BASE}/app/multi`, {
            image1: i1,
            image2: i2,
            prompt: prompt,
            width: p.width ?? 2048,
            height: p.height ?? 3072
          });
          const taskId = res?.result?.task_id ?? res?.task_id ?? null;
          console.log(`[gen] couple taskId=${taskId}`);
          return taskId ? this.poll(taskId, "/status/") : res;
        }
        case "enhancer": {
          console.log("[gen] enhancer resolving source ...");
          const src = await this.imgBuf(p.source, "source");
          const res = await this.post(`${this.ENHANCER_BASE}/file/enhancer`, {
            source: src,
            scale: p.scale ?? 4
          });
          const taskId = res?.result?.task_id ?? res?.task_id ?? null;
          console.log(`[gen] enhancer taskId=${taskId}`);
          return taskId ? this.poll(taskId, "/status/", this.ENHANCER_BASE) : res;
        }
        case "remove_object": {
          console.log("[gen] remove_object resolving images ...");
          const src = await this.imgBuf(p.source, "source");
          const mask = await this.imgBuf(p.mask, "mask");
          const res = await this.post(`${this.ENHANCER_BASE}/removeobject`, {
            source: src,
            mask: mask
          });
          const taskId = res?.result?.task_id ?? res?.task_id ?? null;
          console.log(`[gen] remove_object taskId=${taskId}`);
          return taskId ? this.poll(taskId, "/status-rmo/", this.ENHANCER_BASE) : res;
        }
        case "face_animation": {
          console.log("[gen] face_animation resolving images ...");
          const src = await this.imgBuf(p.source, "source");
          const drv = await this.imgBuf(p.driving, "driving");
          const res = await this.post(`${this.ANI_BASE}/file/faceAnimation`, {
            source: src,
            driving: drv
          });
          const taskId = res?.result?.task_id ?? res?.task_id ?? null;
          console.log(`[gen] face_animation taskId=${taskId}`);
          return taskId ? this.poll(taskId, "/status/", this.ANI_BASE) : res;
        }
        case "faceswap": {
          console.log("[gen] faceswap resolving images ...");
          const src = await this.imgBuf(p.source, "source");
          const dst = await this.imgBuf(p.destination, "destination");
          const res = await this.post(`${this.API_BASE}/app/faceswap`, {
            source: src,
            destination: dst,
            option: p.option ?? "all"
          });
          const taskId = res?.result?.task_id ?? res?.task_id ?? null;
          console.log(`[gen] faceswap taskId=${taskId}`);
          return taskId ? this.poll(taskId, "/faceswap/status/") : res;
        }
        case "status": {
          console.log(`[gen] status task_id=${p.task_id} path=${p.status_path}`);
          try {
            await this.login();
            const {
              data
            } = await this.http.get(`${this.API_BASE}${p.status_path}${p.task_id}`, {
              headers: this.sign()
            });
            console.log("[gen] status ok");
            return data;
          } catch (e) {
            console.error("[gen] status failed:", e?.response?.data ?? e?.message);
            throw e;
          }
        }
        default:
          throw new Error(`unhandled mode "${mode}"`);
      }
    } catch (e) {
      console.error(`[gen] mode="${mode}" error:`, e?.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new Picify();
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