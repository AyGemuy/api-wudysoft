import axios from "axios";
import FormData from "form-data";
class AlpImg {
  constructor() {
    this._cli = axios.create({
      timeout: 6e4,
      headers: {
        "User-Agent": "okhttp/5.3.2",
        "Accept-Encoding": "gzip"
      }
    });
    this._sty = null;
    this._flat = null;
  }
  _err(msg, status = 400) {
    const error = new Error(msg);
    error.response = {
      data: {
        message: msg
      },
      status: status
    };
    return error;
  }
  async _buf(img, idx = 0) {
    try {
      console.log(`[${idx}] process img...`);
      if (Buffer.isBuffer(img)) return {
        buf: img,
        ext: "jpg"
      };
      if (typeof img === "string") {
        if (img.startsWith("http")) {
          console.log(`[${idx}] download ${img.slice(0, 60)}...`);
          const r = await axios.get(img, {
            responseType: "arraybuffer",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
              Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              Referer: new URL(img).origin
            }
          });
          return {
            buf: Buffer.from(r.data),
            ext: "jpg"
          };
        }
        let raw = img.includes(";base64,") ? img.split(";base64,").pop() : img;
        return {
          buf: Buffer.from(raw, "base64"),
          ext: "jpg"
        };
      }
      throw this._err(`unknown image type: ${typeof img}`);
    } catch (e) {
      console.error(`[${idx}] error:`, e.message);
      throw e.response?.data ? e : this._err(e.message);
    }
  }
  async _fetchData() {
    if (this._sty) return this._sty;
    try {
      console.log("[fetch] get portrait data...");
      const res = await this._cli.get("https://ai-photo-gen.kennakids.top/data_map.json");
      this._sty = res.data;
      const types = new Set();
      for (const cat of this._sty) {
        if (cat.items) {
          for (const it of cat.items) {
            if (it.type) types.add(it.type);
          }
        }
      }
      this._flat = Array.from(types);
      console.log(`[fetch] found ${this._flat.length} types, ${this._sty.length} categories`);
      return this._sty;
    } catch (e) {
      console.warn("[fetch] fallback to static list:", e.message);
      this._flat = ["anime1", "anime2", "anime3", "anime4", "anime5", "anime6", "anime7", "anime8", "cosplay1", "cosplay2", "cosplay3", "cosplay4", "cosplay5", "cosplay6", "cosplay7", "cosplay8", "dreamy1", "dreamy2", "dreamy3", "dreamy4", "dreamy5", "dreamy6", "dreamy7", "dreamy8", "fairytale1", "fairytale2", "fairytale3", "fairytale4", "fairytale5", "fairytale6", "fairytale7", "fairytale8", "fantasy1", "fantasy2", "fantasy3", "fantasy4", "fantasy5", "fantasy6", "fantasy7", "fantasy8", "portrait1", "portrait2", "portrait3", "portrait4", "portrait5", "portrait6", "portrait7", "portrait8", "steampunk1", "steampunk2", "steampunk3", "steampunk4", "steampunk5", "steampunk6", "steampunk7", "steampunk8", "vintage1", "vintage2", "vintage3", "vintage4", "vintage5", "vintage6", "vintage7", "vintage8", "xmas1", "xmas2", "xmas3", "xmas4", "xmas5", "xmas6", "xmas7", "xmas8", "3dcartoon1", "3dcartoon2", "3dcartoon3", "3dcartoon4", "3dcartoon5", "3dcartoon6", "3dcartoon7", "3dcartoon8", "3dcartoon9"];
      return [];
    }
  }
  async _styList() {
    if (!this._flat) await this._fetchData();
    return this._flat;
  }
  _ageOk(a) {
    const ok = ["kid", "child", "teenager", "young", "adult", "mature", "elderly"];
    if (!ok.includes(a)) throw this._err(`age_category must be one of: ${ok.join(", ")}`);
    return true;
  }
  async generate({
    type,
    image,
    ...rest
  }) {
    const start = Date.now();
    try {
      const valid = ["age", "enhance", "removal", "retouch", "portrait", "list_style", "style"];
      if (!valid.includes(type)) {
        throw this._err(`type must be one of: ${valid.join(", ")}`);
      }
      console.log(`[run] type=${type}`, rest);
      if (type === "list_style") {
        const flat = await this._styList();
        console.log(`[list_style] return ${flat.length} styles`);
        return {
          styles: flat,
          count: flat.length
        };
      }
      if (type === "style") {
        const data = await this._fetchData();
        const result = {
          total: this._flat.length,
          categories: data.map(cat => ({
            name: cat.name_category,
            id: cat.id_category,
            styles: cat.items?.map(i => i.type) || []
          }))
        };
        console.log(`[style] return ${result.categories.length} categories, total ${result.total} styles`);
        return result;
      }
      if (!image) {
        throw this._err(`image required for type '${type}'`);
      }
      const {
        buf,
        ext
      } = await this._buf(image, 0);
      console.log(`[run] image buffer ready (${buf.length} bytes)`);
      let url = "";
      const fd = new FormData();
      fd.append("file", buf, {
        filename: `upload_${Date.now()}.${ext}`,
        contentType: `image/${ext}`
      });
      let extraHeaders = {};
      switch (type) {
        case "age":
          url = "https://riot.alp-engine.com/api/v2/face_aging/generate-by-age-category";
          const gender = rest.gender ?? "male";
          let age = rest.age_category ?? rest.ageCategory ?? "young";
          this._ageOk(age);
          fd.append("gender", gender, {
            header: {
              "content-type": "text/plain; charset=utf-8"
            }
          });
          fd.append("age_category", age, {
            header: {
              "content-type": "text/plain; charset=utf-8"
            }
          });
          console.log(`[age] gender=${gender}, age=${age}`);
          break;
        case "enhance":
          url = "https://riot.alp-engine.com/api/v1/img/enhance";
          extraHeaders = {
            Host: "venom.alp-engine.com"
          };
          console.log(`[enhance] using Host: venom.alp-engine.com`);
          break;
        case "removal":
          url = "https://riot.alp-engine.com/api/v1/img/background-removal";
          extraHeaders = {
            Host: "venom.alp-engine.com"
          };
          console.log(`[removal] using Host: venom.alp-engine.com`);
          break;
        case "retouch":
          url = "https://venom.alp-engine.com/api/v1/img/face-retouching";
          break;
        case "portrait":
          url = "https://venom.alp-engine.com/api/v1/img/portrait";
          let ptype = rest.type ?? "anime1";
          let style = rest.style ?? "ntd_anime";
          const validTypes = await this._styList();
          if (!validTypes.includes(ptype)) {
            console.warn(`[portrait] unknown type "${ptype}", fallback to anime1`);
            ptype = "anime1";
          }
          fd.append("type", ptype, {
            header: {
              "content-type": "text/plain; charset=utf-8"
            }
          });
          fd.append("style", style, {
            header: {
              "content-type": "text/plain; charset=utf-8"
            }
          });
          console.log(`[portrait] type=${ptype}, style=${style}`);
          break;
      }
      console.log(`[run] POST ${url}`);
      const res = await this._cli.post(url, fd, {
        headers: {
          ...fd.getHeaders(),
          ...extraHeaders
        }
      });
      const dur = ((Date.now() - start) / 1e3).toFixed(2);
      console.log(`[success] done in ${dur}s, status=${res.status}`);
      const outUrl = res.data?.url ?? null;
      const proc = res.data?.processed_time ?? res.data?.processing_time ?? dur;
      console.log(`[result] url=${outUrl}, proc_time=${proc}s`);
      return res.data;
    } catch (err) {
      if (err.response?.data) {
        console.error(`[error] ${type} failed:`, err.response.data.message || err.message);
        throw err;
      }
      const msg = err.message ?? "unknown error";
      console.error(`[error] ${type} failed:`, msg);
      throw this._err(msg);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new AlpImg();
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