import axios from "axios";
const UA = "okhttp/5.3.2";
const FBASE = "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyB8XaGLKyMR1t8jT_NSMhsVi0acvtGL0Vk";
const STS = "https://airbrush.com/core-api/v1/upload/sts";
const PUTU = "https://object.pixocial.com/pixbizstorage-temp/";
const PKEY = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1UFKuWoaZLOSpHr81wwv\nphUO51oKeQiJ41A4ccaQz/QOEXzypl8uXGN/5isVJlW7Px1DPogY/jd5wro7h7nJ\n7LVdowOyD7OTDScCW6A1T1ri1toNt/mROXNcbNAUtmNj1ZyR3g5ylJQNNDZgiN4u\niU6AxIs6xeQ57LQAL394NoEN1VdobRTfW2YQzHOhHqRDgt3w2hvtBLTj9PQEJf/8\nhz6hS2G8qXQO1aKcdj89u4w3TiHH/kHzyLWflLbIyQaDC9XdcVhgiXHBM5pm0xEY\ndMnqJFEOvL383ex0BNQSLK8tkNxyNbyOTyBDhMpipcQfaR62lAi7lpmSPtyVGS9m\nXwIDAQAB\n-----END PUBLIC KEY-----";
const MODES = {
  anime: {
    styles: ["dreamAnime", "cartoon", "dreamScape", "hikari", "animeChefdom", "furrytale", "americana", "clay", "clayCut", "sulsul", "toon", "crayon", "animeYummy", "colorPencil", "crayonPaws", "pixelWorld", "petPastles", "chalk", "threeDAvatar", "steveWorld", "webtoon", "cleanLine", "sketchLine", "sketchAuto", "ghibby"],
    creat: (src, style) => ({
      url: "https://airbrush.com/core-api/v1/anime/create",
      body: {
        styleName: style || "dreamAnime",
        source: src
      }
    }),
    query: tid => ({
      url: `https://airbrush.com/core-api/v1/anime/query/${tid}`
    }),
    result: d => d?.effectUrl,
    done: d => d?.status === "success",
    pending: d => d?.status === "pending"
  },
  cartoon: {
    styles: ["cartoon", "toon", "color-pencil", "cleanLine", "animeYummy", "anime-chefdom", "pixel-world", "dreamAnime"],
    creat: (src, style) => ({
      url: "https://airbrush.com/core-api/v1/cartoon/create",
      body: {
        styleName: style || "cartoon",
        source: src
      }
    }),
    query: tid => ({
      url: `https://airbrush.com/core-api/v1/cartoon/query/${tid}`
    }),
    result: d => d?.effectUrl,
    done: d => d?.status === "success",
    pending: d => d?.status === "pending"
  },
  filter: {
    styles: ["Bratzy", "Pixie", "sulsul", "Americana", "Steve World", "Hikari", "Comic HoloCard", "cartoon", "anime-yummy", "3d-avatar", "clay", "dream-anime", "3d-toon", "Dream Scape", "webtoon", "crayon", "Anime Chefdom", "clean-line", "Color Pencil", "Pixel World"],
    creat: (src, style) => ({
      url: "https://airbrush.com/core-api/v1/ai-filter/task",
      body: {
        sourceUrl: src,
        styleId: style || "anime-yummy"
      }
    }),
    query: tid => ({
      url: `https://airbrush.com/core-api/v1/ai-filter/query-sse/${tid}`,
      sse: true
    }),
    result: d => d?.resultUrl,
    done: d => d?.status === "success" || !!d?.resultUrl,
    pending: d => d?.status === "pending" || d?.status === "processing"
  },
  toy: {
    styles: ["default"],
    creat: src => ({
      url: "https://airbrush.com/core-api/v1/three-d-toy/task",
      body: {
        sourceUrl: src
      }
    }),
    query: tid => ({
      url: `https://airbrush.com/core-api/v1/three-d-toy/task/${tid}`
    }),
    result: d => d?.url,
    done: d => d?.status === "success" || !!d?.url,
    pending: d => d?.status === "pending" || d?.status === "processing"
  },
  restore: {
    styles: ["default"],
    creat: src => ({
      url: "https://airbrush.com/core-api/v1/image-restore/restore",
      body: {
        sourceUrl: src
      }
    }),
    query: tid => ({
      url: `https://airbrush.com/core-api/v1/image-restore/query-sse/${tid}`,
      sse: true
    }),
    result: d => d?.restoreUrl,
    done: d => d?.status === "success" || !!d?.restoreUrl,
    pending: d => d?.status === "pending" || d?.status === "processing"
  },
  upscale: {
    styles: ["HD", "AI_HD", "Portrait", "Object", "Scenery", "Pets", "Text"],
    creat: (src, style, extra = {}) => ({
      url: "https://airbrush.com/core-api/v1/image-upscaler/task",
      body: {
        sourceUrl: src,
        scene: style || "AI_HD",
        ratio: extra?.ratio ?? 1
      }
    }),
    query: tid => ({
      url: `https://airbrush.com/core-api/v1/image-upscaler/query-sse/${tid}`,
      sse: true
    }),
    result: d => d?.effectUrl,
    done: d => d?.status === "success" || !!d?.effectUrl,
    pending: d => d?.status === "pending" || d?.status === "processing"
  },
  enhance: {
    styles: ["AI_HD", "AI_ULTRA_HD", "Portrait", "Object", "Scenery", "Pets", "Text"],
    creat: (src, style) => ({
      url: "https://airbrush.com/core-api/v2/img-enhancer/task",
      body: {
        sourceUrl: src,
        scene: style || "AI_HD",
        ratio: 1
      }
    }),
    query: tid => ({
      url: `https://airbrush.com/core-api/v2/img-enhancer/query-sse/${tid}`,
      sse: true
    }),
    result: d => d?.effectUrl,
    done: d => d?.status === "success" || !!d?.effectUrl,
    pending: d => d?.status === "pending" || d?.status === "processing"
  },
  clothes: {
    styles: ["top-mauve", "top-satin-pink", "top-glitz", "top-butterfly", "top-aqua-flare", "top-pearl-heart", "top-glamour"],
    creat: (src, style) => ({
      url: "https://airbrush.com/core-api/v1/clothes-changer/task",
      body: {
        sourceUrl: src,
        styleName: style || "top-butterfly"
      }
    }),
    query: tid => ({
      url: `https://airbrush.com/core-api/v1/clothes-changer/query-sse/${tid}`,
      sse: true
    }),
    result: d => d?.resultUrl,
    done: d => d?.status === "success" || !!d?.resultUrl,
    pending: d => d?.status === "pending" || d?.status === "processing"
  },
  remove: {
    styles: ["default"],
    creat: src => ({
      url: "https://airbrush.com/core-api/v1/image-rmbg",
      body: {
        sourceUrl: src
      }
    }),
    query: tid => ({
      url: `https://airbrush.com/core-api/v1/image-rmbg/query-sse/${tid}`,
      sse: true
    }),
    result: d => d?.resultUrl,
    done: d => d?.status === "success" || !!d?.resultUrl,
    pending: d => d?.status === "pending" || d?.status === "processing"
  }
};
const hdr = (tok, extra = {}) => ({
  "User-Agent": UA,
  "x-anonymous-uid": tok,
  "Content-Type": "application/json",
  "x-tenant": "ab",
  ...extra
});
const wait = ms => new Promise(r => setTimeout(r, ms));
class Airbrush {
  constructor() {
    this.tok = null;
  }
  async _auth() {
    if (this.tok) return this.tok;
    console.log("[auth] requesting firebase token...");
    try {
      const {
        data
      } = await axios.post(FBASE, {
        returnSecureToken: true
      }, {
        headers: {
          "User-Agent": UA
        }
      });
      this.tok = data?.idToken || null;
      console.log("[auth] token ok:", this.tok?.slice(0, 30) + "...");
      return this.tok;
    } catch (e) {
      console.error("[auth] error:", e?.message);
      throw e;
    }
  }
  async _buf(image) {
    console.log("[buf] resolving image input...");
    try {
      if (Buffer.isBuffer(image)) {
        console.log("[buf] Buffer ok");
        return image;
      }
      if (typeof image === "string") {
        if (/^https?:\/\//.test(image)) {
          console.log("[buf] fetching url:", image);
          const {
            data
          } = await axios.get(image, {
            responseType: "arraybuffer"
          });
          return Buffer.from(data);
        }
        console.log("[buf] decoding base64");
        return Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      throw new Error("unsupported image type");
    } catch (e) {
      console.error("[buf] error:", e?.message);
      throw e;
    }
  }
  async _sts(tok) {
    console.log("[sts] fetching session token...");
    try {
      const {
        data
      } = await axios.post(STS, {
        publicKey: PKEY
      }, {
        headers: hdr(tok)
      });
      console.log("[sts] ok");
      return data?.client?.sessionToken;
    } catch (e) {
      console.error("[sts] error:", e?.message);
      throw e;
    }
  }
  async _put(buf, st) {
    const fname = `airbrush_${Date.now()}.jpg`;
    const url = `${PUTU}${fname}?x-id=PutObject`;
    console.log("[put] uploading:", fname);
    try {
      const {
        status
      } = await axios.put(url, buf, {
        headers: {
          "User-Agent": UA,
          "content-type": "image/jpeg",
          "x-amz-security-token": st
        }
      });
      const src = `${PUTU}${fname}`;
      console.log("[put] status:", status, "->", src);
      return status === 200 ? src : null;
    } catch (e) {
      console.error("[put] error:", e?.message);
      throw e;
    }
  }
  async _creat(tok, src, mode, style) {
    const {
      url,
      body
    } = MODES[mode].creat(src, style);
    console.log("[creat] mode:", mode, "| style:", style || "-");
    try {
      const {
        data
      } = await axios.post(url, body, {
        headers: hdr(tok)
      });
      const tid = typeof data === "string" ? data.trim() : data?.taskId || data?.id;
      console.log("[creat] taskId:", tid);
      return tid;
    } catch (e) {
      console.error("[creat] error:", e?.message);
      throw e;
    }
  }
  async _pollSSE(tok, url, tries = 60, ms = 3e3) {
    for (let i = 0; i < tries; i++) {
      await wait(ms);
      console.log(`[sse] attempt ${i + 1}/${tries}`);
      try {
        const res = await axios.get(url, {
          headers: {
            ...hdr(tok),
            Accept: "text/event-stream",
            "access-token": ""
          },
          responseType: "text",
          timeout: 6e4
        });
        const lines = String(res?.data || "").split("\n");
        const dlines = lines.filter(l => l.startsWith("data:"));
        for (const line of dlines.reverse()) {
          try {
            const txt = line.replace(/^data:\s*/, "").trim();
            if (!txt || txt === "[DONE]") continue;
            const data = JSON.parse(txt);
            console.log("[sse] parsed:", data?.status || JSON.stringify(data).slice(0, 80));
            return data;
          } catch {
            continue;
          }
        }
        console.log("[sse] no parseable data line yet, retry...");
      } catch (e) {
        console.error("[sse] error:", e?.message);
        throw e;
      }
    }
    throw new Error("sse poll timeout");
  }
  async _poll(tok, tid, mode, tries = 60, ms = 3e3) {
    const cfg = MODES[mode];
    const {
      url,
      sse
    } = cfg.query(tid);
    console.log(`[poll] mode:${mode} taskId:${tid}`);
    for (let i = 0; i < tries; i++) {
      await wait(ms);
      try {
        let data;
        if (sse) {
          data = await this._pollSSE(tok, url, 1, 0);
        } else {
          const res = await axios.get(url, {
            headers: hdr(tok)
          });
          data = res?.data;
        }
        const {
          status,
          ...info
        } = data || {};
        console.log(`[poll] #${i + 1} status:`, status);
        if (cfg.done(data)) return {
          result: cfg.result(data),
          status: status,
          ...info
        };
        if (!cfg.pending(data)) throw new Error(`unexpected status: ${status}`);
      } catch (e) {
        console.error("[poll] error:", e?.message);
        throw e;
      }
    }
    throw new Error("poll timeout");
  }
  async generate({
    token,
    image,
    mode = "anime",
    style,
    ...rest
  }) {
    const cfg = MODES[mode];
    if (!cfg) throw new Error(`unknown mode: ${mode} | available: ${Object.keys(MODES).join(", ")}`);
    console.log("[generate] mode:", mode, "| style:", style || "default");
    try {
      const tok = token || await this._auth();
      const buf = await this._buf(image);
      const st = await this._sts(tok);
      const src = await this._put(buf, st);
      if (!src) throw new Error("upload failed");
      const tid = await this._creat(tok, src, mode, style);
      if (!tid) throw new Error("task creation failed");
      const out = await this._poll(tok, tid, mode);
      console.log("[generate] done:", out?.result);
      return {
        ...out,
        styles: cfg.styles,
        mode: mode
      };
    } catch (e) {
      console.error("[generate] fatal:", e?.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new Airbrush();
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