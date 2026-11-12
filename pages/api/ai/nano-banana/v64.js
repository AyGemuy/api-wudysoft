import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import {
  randomBytes
} from "crypto";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
const log = (t, ...a) => console.log(`[ZImage][${t}]`, ...a);
const mkDeviceId = () => randomBytes(32).toString("hex");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE_API = "https://api.z-image.io";
const BASE_WEB = "https://z-image.io";
const MAIL_API = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
const A_GEN = "e58872d6bbaae79b0644b1e4084fbd1fbba5b4c4";
const A_POLL = "c48b5ee8073cd4a711ef05eb639885130869c152";
const A_FLUX = "20dc6f5f12a0c348d828c8b4e9f4f9d18be2c994";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const HDR = {
  "accept-language": "id-ID",
  "cache-control": "no-cache",
  pragma: "no-cache",
  origin: BASE_WEB,
  referer: `${BASE_WEB}/`,
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "user-agent": UA,
  ...SpoofHead()
};
const MODELS = {
  "z-image-lite": {
    type: "seedream",
    path: "z-image-lite",
    txt: {
      id: "z-image-lite-txt",
      requiresImage: false,
      costPerImage: 1,
      maxImages: {
        min: 1,
        max: 1
      },
      sizes: ["1:1", "4:3", "3:4", "16:9", "9:16"],
      defSize: "1:1",
      resolutions: [],
      defRes: "1K",
      formats: ["png", "jpeg"],
      defFmt: "png"
    },
    img: {
      id: "z-image-lite-img",
      requiresImage: true,
      costPerImage: 4,
      maxImages: {
        min: 1,
        max: 1
      },
      sizes: ["square", "portrait_16_9", "landscape_16_9"],
      defSize: "square",
      resolutions: [],
      defRes: "1K",
      formats: ["png"],
      defFmt: "png",
      refLimit: 1
    }
  },
  "nano-banana": {
    type: "seedream",
    path: "nano-banana",
    txt: {
      id: "nano-banana-txt",
      requiresImage: false,
      costPerImage: 5,
      maxImages: {
        min: 1,
        max: 4
      },
      sizes: null,
      defSize: "square_hd",
      resolutions: null,
      defRes: "2K",
      formats: null,
      defFmt: "png"
    },
    img: {
      id: "nano-banana-img",
      requiresImage: true,
      costPerImage: 5,
      maxImages: {
        min: 1,
        max: 4
      },
      sizes: null,
      defSize: "square_hd",
      resolutions: null,
      defRes: "1K",
      formats: null,
      defFmt: "png",
      refLimit: 10
    }
  },
  "nano-banana-2": {
    type: "seedream",
    path: "nano-banana-2",
    txt: {
      id: "nano-banana-2-txt",
      requiresImage: false,
      costPerImage: 7,
      maxImages: {
        min: 1,
        max: 1
      },
      sizes: ["1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9", "auto"],
      defSize: "auto",
      resolutions: ["1K", "2K", "4K"],
      defRes: "1K",
      formats: ["jpg", "png"],
      defFmt: "jpg"
    },
    img: {
      id: "nano-banana-2-img",
      requiresImage: true,
      costPerImage: 7,
      maxImages: {
        min: 1,
        max: 1
      },
      sizes: ["1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9", "auto"],
      defSize: "auto",
      resolutions: ["1K", "2K", "4K"],
      defRes: "1K",
      formats: ["jpg", "png"],
      defFmt: "jpg",
      refLimit: 14,
      maxRefSizeMB: 30
    }
  },
  "nano-banana-pro": {
    type: "seedream",
    path: "nano-banana-pro",
    txt: {
      id: "nano-banana-pro-txt",
      requiresImage: false,
      costPerImage: 6,
      maxImages: {
        min: 1,
        max: 1
      },
      sizes: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
      defSize: "1:1",
      resolutions: null,
      defRes: "2K",
      formats: ["png", "jpg"],
      defFmt: "png"
    },
    img: {
      id: "nano-banana-pro-img",
      requiresImage: true,
      costPerImage: 6,
      maxImages: {
        min: 1,
        max: 1
      },
      sizes: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
      defSize: "1:1",
      resolutions: null,
      defRes: "1K",
      formats: ["png", "jpg"],
      defFmt: "png",
      refLimit: 8
    }
  },
  "flux2-klein": {
    type: "flux",
    path: "Flux2-Klein",
    txt: {
      id: "flux2-klein",
      requiresImage: false,
      sizes: ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9"],
      defSize: "1:1",
      resolutions: null,
      defRes: null,
      formats: ["png", "jpg", "webp"],
      defFmt: "png",
      defQuality: 90
    },
    img: {
      id: "flux2-klein",
      requiresImage: true,
      sizes: ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9"],
      defSize: "1:1",
      resolutions: null,
      defRes: null,
      formats: ["png", "jpg", "webp"],
      defFmt: "png",
      defQuality: 90
    }
  },
  "gpt-image-1.5": {
    type: "gpt",
    path: "gpt-image-1.5",
    txt: {
      id: "nano-banana-pro-txt",
      requiresImage: false,
      costPerImage: 6,
      maxImages: {
        min: 1,
        max: 1
      },
      sizes: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
      defSize: "1:1",
      resolutions: null,
      defRes: "2K",
      formats: ["png", "jpg"],
      defFmt: "png"
    },
    img: {
      id: "nano-banana-pro-img",
      requiresImage: true,
      costPerImage: 6,
      maxImages: {
        min: 1,
        max: 1
      },
      sizes: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
      defSize: "1:1",
      resolutions: null,
      defRes: "1K",
      formats: ["png", "jpg"],
      defFmt: "png",
      refLimit: 8
    }
  }
};
const ALL_RATIOS = ["square_hd", "square", "landscape_16_9", "landscape_4_3", "landscape_3_2", "landscape_21_9", "portrait_16_9", "portrait_4_3", "portrait_3_2", "1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9", "auto"];

function mkHttp(jar) {
  return wrapper(axios.create({
    jar: jar,
    withCredentials: true
  }));
}

function encodeState(jar, user, deviceId) {
  try {
    return Buffer.from(JSON.stringify({
      cookies: jar.serializeSync(),
      user: user,
      deviceId: deviceId
    })).toString("base64");
  } catch (e) {
    log("state", "encode err:", e.message);
    return null;
  }
}

function decodeState(b64) {
  try {
    const obj = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    return {
      jar: CookieJar.deserializeSync(obj.cookies),
      user: obj.user || null,
      deviceId: obj.deviceId || null
    };
  } catch (e) {
    log("state", "decode err:", e.message);
    return null;
  }
}
async function resolveImg(img) {
  try {
    if (!img) return null;
    if (Buffer.isBuffer(img)) return img;
    if (typeof img === "string") {
      if (!img.startsWith("http") && img.length > 64) return Buffer.from(img.replace(/\s/g, ""), "base64");
      if (img.startsWith("http")) {
        log("img", "fetch:", img.slice(0, 70));
        const r = await axios.get(img, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: new URL(img).origin
          }
        });
        return Buffer.from(r.data);
      }
    }
    return null;
  } catch (e) {
    log("error", "resolveImg:", e.message);
    throw e;
  }
}

function guessMime(buf) {
  if (!buf || buf.length < 4) return "image/jpeg";
  if (buf[0] === 137 && buf[1] === 80) return "image/png";
  if (buf[0] === 255 && buf[1] === 216) return "image/jpeg";
  if (buf[0] === 71 && buf[1] === 73) return "image/gif";
  if (buf[0] === 82 && buf[1] === 73) return "image/webp";
  return "image/jpeg";
}

function extOf(mime) {
  return {
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp"
  } [mime] || "jpg";
}

function treeModel(path) {
  const page = `__PAGE__?{"model":"${path}","locale":"en"}`;
  const anch = `/${path}?model=${path}#generator`;
  return encodeURIComponent(JSON.stringify(["", {
    children: [
      ["locale", "en", "d"], {
        children: [path, {
          children: [page, {}, anch, "refresh"]
        }]
      }
    ]
  }]));
}

function treePath(path) {
  const page = `__PAGE__?{"locale":"en"}`;
  const anch = `/${path}`;
  return encodeURIComponent(JSON.stringify(["", {
    children: [
      ["locale", "en", "d"], {
        children: [path, {
          children: [page, {}, anch, "refresh"]
        }]
      }
    ]
  }]));
}
class NanoBanana {
  constructor(state) {
    if (state) {
      const dec = decodeState(state);
      if (dec) {
        this.jar = dec.jar;
        this.user = dec.user;
        this.deviceId = dec.deviceId || mkDeviceId();
        log("state", "restored");
      } else {
        this.jar = new CookieJar();
        this.user = null;
        this.deviceId = mkDeviceId();
        log("state", "invalid, fresh");
      }
    } else {
      this.jar = new CookieJar();
      this.user = null;
      this.deviceId = mkDeviceId();
    }
    this.http = mkHttp(this.jar);
    log("init", "deviceId:", this.deviceId);
  }
  getState() {
    return encodeState(this.jar, this.user, this.deviceId);
  }
  async createMail() {
    try {
      log("mail", "creating...");
      const r = await this.http.get(`${MAIL_API}?action=create`);
      log("mail", "email:", r.data?.email);
      return r.data?.email;
    } catch (e) {
      log("error", "createMail:", e.message);
      throw e;
    }
  }
  async waitOtp(email, timeout = 6e4) {
    try {
      log("otp", "waiting for:", email);
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        await sleep(3e3);
        try {
          const r = await this.http.get(`${MAIL_API}?action=message&email=${email}`);
          for (const m of r.data?.data || []) {
            const txt = m.text_content || "";
            const j = txt.match(/"code"\s*:\s*"(\d{4,8})"/);
            if (j) {
              log("otp", "code:", j[1]);
              return j[1];
            }
            const raw = txt.match(/\b(\d{6})\b/);
            if (raw) {
              log("otp", "code:", raw[1]);
              return raw[1];
            }
          }
        } catch (e) {
          log("otp", "poll err:", e.message);
        }
      }
      throw new Error("otp timeout");
    } catch (e) {
      log("error", "waitOtp:", e.message);
      throw e;
    }
  }
  async login() {
    try {
      const email = await this.createMail();
      const hdr = {
        ...HDR,
        "content-type": "application/json",
        "sec-fetch-site": "same-site"
      };
      log("auth", "otp request, deviceId:", this.deviceId);
      await this.http.post(`${BASE_API}/api/auth/otp/request`, {
        email: email,
        deviceId: this.deviceId
      }, {
        headers: hdr
      });
      const code = await this.waitOtp(email);
      log("auth", "otp verify...");
      await this.http.post(`${BASE_API}/api/auth/otp/verify`, {
        email: email,
        code: code,
        redirectTo: `${BASE_WEB}/?auth=success`
      }, {
        headers: hdr
      });
      log("auth", "session...");
      const sess = await this.http.get(`${BASE_API}/api/auth/session`, {
        headers: {
          ...HDR,
          "cache-control": "no-store",
          "sec-fetch-site": "same-site"
        }
      });
      this.user = sess.data?.data?.user || null;
      log("auth", "ok:", this.user?.email);
      return this.user;
    } catch (e) {
      log("error", "login:", e.message);
      throw e;
    }
  }
  async ensureSession() {
    if (this.user) {
      log("auth", "session:", this.user.email);
      return;
    }
    log("auth", "no session, login...");
    await this.login();
  }
  async presign(files) {
    try {
      log("upload", `presign ${files.length}...`);
      const r = await this.http.post(`${BASE_API}/api/images/presigned-url`, {
        files: files.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size
        }))
      }, {
        headers: {
          ...HDR,
          "content-type": "application/json",
          "sec-fetch-site": "same-site"
        }
      });
      return r.data?.uploads || [];
    } catch (e) {
      log("error", "presign:", e.message);
      throw e;
    }
  }
  async putUpload(url, buf, mime) {
    try {
      await axios.put(url, buf, {
        headers: {
          "content-type": mime,
          "x-amz-checksum-crc32": "AAAAAA=="
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 6e4
      });
      log("upload", "PUT ok");
    } catch (e) {
      log("error", "putUpload:", e.message);
      throw e;
    }
  }
  async uploadImages(images) {
    try {
      const arr = Array.isArray(images) ? images : [images];
      log("upload", `resolve ${arr.length}...`);
      const resolved = [];
      for (const img of arr) {
        const buf = await resolveImg(img);
        if (!buf) continue;
        const mime = guessMime(buf);
        resolved.push({
          buf: buf,
          mime: mime,
          name: `ref-${Date.now()}-${resolved.length}.${extOf(mime)}`,
          type: mime,
          size: buf.length
        });
      }
      if (!resolved.length) return [];
      const uploads = await this.presign(resolved);
      const urls = [];
      for (let i = 0; i < resolved.length; i++) {
        const up = uploads[i];
        if (!up) continue;
        await this.putUpload(up.url, resolved[i].buf, resolved[i].mime);
        log("upload", `[${i}]`, up.publicUrl);
        urls.push(up.publicUrl);
      }
      return urls;
    } catch (e) {
      log("error", "uploadImages:", e.message);
      throw e;
    }
  }
  parseAction(raw) {
    for (const line of raw.split("\n")) {
      const m = line.match(/^\d+:(\{.+)$/s);
      if (!m) continue;
      try {
        return JSON.parse(m[1]);
      } catch {}
    }
    return null;
  }
  async sub(payload, urlPath, tree, action) {
    try {
      const url = `${BASE_WEB}/${urlPath}`;
      log("sub", url);
      const res = await this.http.post(url, JSON.stringify([payload]), {
        headers: {
          ...HDR,
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": action,
          "next-router-state-tree": tree,
          referer: url,
          "sec-fetch-site": "same-origin"
        },
        responseType: "text"
      });
      const d = this.parseAction(res.data);
      log("sub", "taskId:", d?.taskId, "cost:", d?.costCredits);
      return d?.taskId || null;
    } catch (e) {
      log("error", "sub:", e.message);
      throw e;
    }
  }
  async subFlux(slug, payload, path) {
    try {
      const url = `${BASE_WEB}/${path}`;
      log("subFlux", url, "slug:", slug);
      const res = await this.http.post(url, JSON.stringify([slug, payload]), {
        headers: {
          ...HDR,
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": A_FLUX,
          "next-router-state-tree": treePath(path),
          referer: url,
          "sec-fetch-site": "same-origin"
        },
        responseType: "text"
      });
      const d = this.parseAction(res.data);
      log("subFlux", "taskId:", d?.taskId, "cost:", d?.costCredits);
      return d?.taskId || null;
    } catch (e) {
      log("error", "subFlux:", e.message);
      throw e;
    }
  }
  async poll(taskId, urlPath, tree, max = 60, ms = 3e3) {
    try {
      const url = `${BASE_WEB}/${urlPath}`;
      log("poll", `taskId=${taskId} max=${max}x/${ms}ms`);
      const hdrs = {
        ...HDR,
        accept: "text/x-component",
        "content-type": "text/plain;charset=UTF-8",
        "next-action": A_POLL,
        "next-router-state-tree": tree,
        referer: url,
        "sec-fetch-site": "same-origin"
      };
      for (let i = 0; i < max; i++) {
        await sleep(ms);
        log("poll", `#${i + 1}...`);
        try {
          const res = await this.http.post(url, JSON.stringify([taskId]), {
            headers: hdrs,
            responseType: "text"
          });
          const d = this.parseAction(res.data);
          if (!d) {
            log("poll", "no data");
            continue;
          }
          log("poll", "status:", d.status);
          if (d.status === "completed") {
            const urls = d.data?.urls || [];
            if (!urls.length) throw new Error("completed but no urls");
            log("poll", "done:", urls.length);
            return urls;
          }
          if (d.status === "failed") throw new Error("task failed: " + (d.error || "unknown"));
        } catch (e) {
          if (e.message.startsWith("task failed") || e.message.startsWith("completed")) throw e;
          log("poll", "err:", e.message);
        }
      }
      throw new Error("poll timeout");
    } catch (e) {
      log("error", "poll:", e.message);
      throw e;
    }
  }
  async generate({
    state,
    prompt,
    model = "nano-banana-2",
    ratio,
    image,
    resolution,
    outputFormat,
    maxImages = 1,
    googleSearch = false,
    negativePrompt,
    outputQuality,
    ...rest
  }) {
    try {
      log("gen", `model=${model} prompt="${(prompt || "").slice(0, 50)}"`);
      if (state) {
        const dec = decodeState(state);
        if (dec) {
          this.jar = dec.jar;
          this.user = dec.user;
          this.deviceId = dec.deviceId || this.deviceId;
          this.http = mkHttp(this.jar);
          log("state", "applied");
        }
      }
      const mc = MODELS[model];
      if (!mc) throw new Error(`invalid model "${model}". available: ${Object.keys(MODELS).join(", ")}`);
      const i2i = !!image;
      const vc = mc[i2i ? "img" : "txt"];
      log("gen", `type=${mc.type} mode=${i2i ? "i2i" : "t2i"} id=${vc.id}`);
      const szList = vc.sizes || ALL_RATIOS;
      const sz = ratio || vc.defSize;
      if (!szList.includes(sz)) throw new Error(`invalid ratio "${sz}". available: ${szList.join(", ")}`);
      const resList = vc.resolutions;
      const imgRes = resolution || vc.defRes;
      if (resList?.length && !resList.includes(imgRes)) throw new Error(`invalid resolution "${imgRes}". available: ${resList.join(", ")}`);
      const fmtList = vc.formats;
      const fmt = outputFormat || vc.defFmt;
      if (fmtList?.length && !fmtList.includes(fmt)) throw new Error(`invalid format "${fmt}". available: ${fmtList.join(", ")}`);
      await this.ensureSession();
      let imgUrls;
      if (i2i) {
        log("gen", "upload images...");
        imgUrls = await this.uploadImages(image);
        if (!imgUrls.length) throw new Error("upload returned no urls");
      }
      const path = mc.path;
      let taskId, urls;
      if (mc.type === "flux") {
        const payload = {
          prompt: prompt || "",
          ...negativePrompt !== undefined ? {
            negativePrompt: negativePrompt
          } : {},
          ...imgUrls ? {
            imageUrls: imgUrls
          } : {},
          aspectRatio: sz,
          outputFormat: fmt,
          outputQuality: outputQuality ?? vc.defQuality ?? 90,
          ...rest
        };
        taskId = await this.subFlux(vc.id, payload, path);
        if (!taskId) throw new Error("no taskId returned");
        urls = await this.poll(taskId, path, treePath(path));
      } else {
        const useModel = mc.type === "seedream";
        const urlPath = useModel ? `${path}?model=${path}` : path;
        const tree = useModel ? treeModel(path) : treePath(path);
        const payload = {
          modelId: vc.id,
          prompt: prompt || "",
          imageSize: sz,
          ...imgRes ? {
            imageResolution: imgRes
          } : {},
          maxImages: maxImages,
          ...imgUrls ? {
            imageUrls: imgUrls
          } : {},
          outputFormat: fmt,
          ...model.includes("nano-banana-2") ? {
            googleSearch: googleSearch
          } : {},
          ...rest
        };
        taskId = await this.sub(payload, urlPath, tree, A_GEN);
        if (!taskId) throw new Error("no taskId returned");
        urls = await this.poll(taskId, urlPath, tree);
      }
      const st = this.getState();
      log("gen", "done, urls:", urls.length);
      return {
        result: urls,
        state: st
      };
    } catch (e) {
      log("error", "generate:", e.message);
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