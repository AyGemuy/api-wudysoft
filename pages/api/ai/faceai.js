import axios from "axios";
import crypto from "crypto";
import NodeRSA from "node-rsa";
class FaceAI {
  constructor() {
    try {
      this.base = "https://faceai.art";
      this.ver = "83EmcUoQTUv50LhNx0VrdcK8rcGexcP35FcZDcpgWsAXEyO4xqL5shCY6sFIWB2Q";
      this.pub = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCwlO+boC6cwRo3UfXVBadaYwcX
0zKS2fuVNY2qZ0dgwb1NJ+/Q9FeAosL4ONiosD71on3PVYqRUlL5045mvH2K9i8b
AFVMEip7E6RMK6tKAAif7xzZrXnP1GZ5Rijtqdgwh+YmzTo39cuBCsZqK9oEoeQ3
r/myG9S+9cR5huTuFQIDAQAB
-----END PUBLIC KEY-----`;
      this.prefix = "aifaceswap";
      this.head = {
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${this.base}/ai-video-generator/`,
        origin: this.base,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "user-language": "undefined"
      };
      this.cfg = {
        modes: ["image", "video", "upscale", "enhance"],
        val: {
          ratios: ["1:1", "3:2", "2:3", "5:4", "4:5", "9:16", "16:9", "3:4", "4:3"],
          counts: [1],
          res: ["1K"],
          qual: ["low"],
          min: 1.1,
          max: 4
        },
        rules: {
          image: {
            req: ["prompt"]
          },
          video: {
            req: ["prompt"]
          },
          upscale: {
            req: ["image"]
          },
          enhance: {
            req: ["image"]
          }
        }
      };
      console.log("[FaceAI] Inisialisasi konfigurasi berhasil.");
    } catch (err) {
      console.error("[FaceAI Initializer Error]:", err.message);
    }
  }
  _rnd(len) {
    try {
      const t = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let n = "";
      for (let o = 0; o < len; o += 1) n += t.charAt(Math.floor(Math.random() * t.length));
      return n;
    } catch (err) {
      console.error("[FaceAI _rnd Error]:", err.message);
      return "";
    }
  }
  _fp() {
    try {
      return crypto.randomBytes(16).toString("hex");
    } catch (err) {
      console.error("[FaceAI _fp Error]:", err.message);
      return "";
    }
  }
  _uuid() {
    try {
      const hex = crypto.randomBytes(16).toString("hex");
      return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join("-");
    } catch (err) {
      console.error("[FaceAI _uuid Error]:", err.message);
      return "";
    }
  }
  _aes(txt, key) {
    try {
      const iv = Buffer.from(key, "utf8");
      const cipher = crypto.createCipheriv("aes-128-cbc", Buffer.from(key, "utf8"), iv);
      let enc = cipher.update(txt, "utf8", "base64");
      enc += cipher.final("base64");
      return enc;
    } catch (err) {
      console.error("[FaceAI _aes Error]:", err.message);
      return "";
    }
  }
  _rsa(txt) {
    try {
      const rsa = new NodeRSA(this.pub, "public", {
        encryptionScheme: "pkcs1"
      });
      return rsa.encrypt(txt, "base64");
    } catch (err) {
      console.error("[FaceAI _rsa Error]:", err.message);
      return "";
    }
  }
  _u(fp) {
    try {
      return {
        authorization: `Fingerprint ${fp}`,
        fp: fp,
        "x-fingerprint": fp,
        "x-guest-id": fp
      };
    } catch (err) {
      console.error("[FaceAI _u Error]:", err.message);
      return {};
    }
  }
  _hdrUpload(fp) {
    try {
      console.log("[FaceAI] Menghasilkan header enkripsi untuk unggahan media...");
      const uuid = this._uuid();
      const key = this._rnd(16);
      const guide = this._rsa(key);
      const sign = this._aes(`${this.prefix}:${uuid}:${guide}`, key);
      return {
        accept: "application/json, text/plain, */*",
        "x-guide": guide,
        "x-sign": sign,
        ...this._u(fp),
        ...this.head,
        "theme-version": this.ver,
        "X-code": String(Date.now())
      };
    } catch (err) {
      console.error("[FaceAI _hdrUpload Error]:", err.message);
      throw err;
    }
  }
  _hdrRequest(fp) {
    try {
      console.log("[FaceAI] Menghasilkan header enkripsi untuk pembuatan request task...");
      const key = this._rnd(16);
      const guide = this._rsa(key);
      const fp1 = this._aes(`${this.prefix}:${fp}`, key);
      return {
        accept: "application/json, text/plain, */*",
        "x-guide": guide,
        fp1: fp1,
        ...this._u(fp),
        ...this.head,
        "theme-version": this.ver,
        "X-code": String(Date.now())
      };
    } catch (err) {
      console.error("[FaceAI _hdrRequest Error]:", err.message);
      throw err;
    }
  }
  _hdrAitools(fp) {
    try {
      console.log("[FaceAI] Menghasilkan header enkripsi untuk pengecekan status...");
      const key = this._rnd(16);
      const guide = this._rsa(key);
      const fp1 = this._aes(`${this.prefix}:${fp}`, key);
      return {
        accept: "application/json, text/plain, */*",
        ...this._u(fp),
        fp1: fp1,
        "x-guide": guide,
        ...this.head,
        "theme-version": this.ver,
        "X-code": String(Date.now())
      };
    } catch (err) {
      console.error("[FaceAI _hdrAitools Error]:", err.message);
      throw err;
    }
  }
  _packState(fp, taskId = null) {
    const stateObj = {
      fp: fp
    };
    if (taskId) stateObj.task_id = taskId;
    return Buffer.from(JSON.stringify(stateObj)).toString("base64");
  }
  _state(st, type = "request") {
    try {
      if (st) {
        console.log(`[FaceAI] Memulihkan session state dari base64 token (Tipe: ${type})...`);
        const stateData = JSON.parse(Buffer.from(st, "base64").toString("utf8"));
        const fp = stateData.fp || this._fp();
        const taskId = stateData.task_id || null;
        let hdrs;
        if (type === "upload") hdrs = this._hdrUpload(fp);
        else if (type === "aitools") hdrs = this._hdrAitools(fp);
        else hdrs = this._hdrRequest(fp);
        return {
          hdrs: hdrs,
          fp: fp,
          taskId: taskId,
          rawState: st
        };
      }
      console.log(`[FaceAI] Session state kosong. Membuat sidik jari baru (Tipe: ${type})...`);
      const fp = this._fp();
      let hdrs;
      if (type === "upload") hdrs = this._hdrUpload(fp);
      else if (type === "aitools") hdrs = this._hdrAitools(fp);
      else hdrs = this._hdrRequest(fp);
      const rawState = this._packState(fp);
      return {
        hdrs: hdrs,
        fp: fp,
        taskId: null,
        rawState: rawState
      };
    } catch (err) {
      console.error("[FaceAI _state Warning]: Gagal memproses state, fallback ke instansiasi baru.", err.message);
      const fp = this._fp();
      const hdrs = this._hdrRequest(fp);
      const rawState = this._packState(fp);
      return {
        hdrs: hdrs,
        fp: fp,
        taskId: null,
        rawState: rawState
      };
    }
  }
  async _img(img) {
    try {
      console.log("[FaceAI] Mengonversi data masukan media ke binary stream...");
      if (Buffer.isBuffer(img)) return {
        buf: img,
        mime: "image/webp"
      };
      if (typeof img === "string") {
        if (img.startsWith("http")) {
          console.log(`[FaceAI] Mengunduh media remote URL: ${img}`);
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return {
            buf: Buffer.from(res.data),
            mime: res.headers["content-type"] || "image/webp"
          };
        }
        if (img.startsWith("data:")) {
          console.log("[FaceAI] Membaca data URI string...");
          const match = img.match(/^data:(.*?);base64,(.*)$/);
          return {
            buf: Buffer.from(match[2], "base64"),
            mime: match[1]
          };
        }
        console.log("[FaceAI] Mengubah plain base64 string ke buffer...");
        return {
          buf: Buffer.from(img, "base64"),
          mime: "image/webp"
        };
      }
      return {
        error: "Format media tidak valid atau tipe tidak didukung."
      };
    } catch (err) {
      console.error("[FaceAI _img Error]:", err.message);
      return {
        error: err.message
      };
    }
  }
  async _upl(imgs, hdrs) {
    try {
      console.log("[FaceAI] Menyiapkan unggahan berkas ke Cloudflare R2 Storage...");
      const urls = [];
      const arr = Array.isArray(imgs) ? imgs : [imgs];
      for (const itm of arr) {
        if (!itm) continue;
        const parsed = await this._img(itm);
        if (parsed.error) return {
          error: parsed.error
        };
        const {
          buf,
          mime
        } = parsed;
        const ext = mime.split("/")[1] || "webp";
        console.log(`[FaceAI] Meminta presigned URL untuk tipe konten [${mime}]...`);
        const urlRes = await axios.get(`${this.base}/api/r2_presigned_url`, {
          params: {
            content_type: mime,
            ext: ext,
            target: "temp"
          },
          headers: {
            accept: "*/*",
            authorization: hdrs["authorization"],
            fp: hdrs["fp"],
            "x-fingerprint": hdrs["x-fingerprint"],
            "x-guest-id": hdrs["x-guest-id"],
            ...this.head
          }
        });
        const pUrl = urlRes?.data?.data?.presigned_url;
        const fUrl = urlRes?.data?.data?.file_url;
        if (!pUrl) return {
          error: "Gagal memperoleh presigned URL dari API Endpoint."
        };
        console.log("[FaceAI] Mengirimkan binary payload langsung ke Cloudflare bucket storage via PUT...");
        await axios.put(pUrl, buf, {
          headers: {
            Accept: "*/*",
            "Accept-Language": "id-ID",
            "Cache-Control": "no-cache",
            "Content-Type": mime,
            Origin: this.base,
            Referer: `${this.base}/`,
            "User-Agent": this.head["user-agent"]
          }
        });
        const pathname = fUrl ? new URL(fUrl).pathname : "";
        console.log(`[FaceAI] Unggahan sukses. Path storage internal: ${pathname}`);
        urls.push(pathname);
      }
      return urls;
    } catch (err) {
      console.error("[FaceAI _upl Error]:", err?.response?.data || err.message);
      return {
        error: err.message
      };
    }
  }
  _val(params) {
    try {
      const v = this.cfg.val;
      if (params.aspect_ratio && !v.ratios.includes(params.aspect_ratio)) {
        return {
          code: "INVALID_RATIO",
          msg: `Aspect ratio tidak valid. Pilihan: ${v.ratios.join(", ")}`
        };
      }
      if (params.image_count && !v.counts.includes(Number(params.image_count))) {
        return {
          code: "UNSUPPORTED_COUNT",
          msg: `Image count tidak didukung di free tier. Hanya: ${v.counts.join(", ")}`
        };
      }
      if (params.resolution && !v.res.includes(String(params.resolution).toUpperCase())) {
        return {
          code: "UNSUPPORTED_RES",
          msg: `Resolution tidak didukung di free tier. Hanya: ${v.res.join(", ")}`
        };
      }
      if (params.quality && !v.qual.includes(String(params.quality).toLowerCase())) {
        return {
          code: "UNSUPPORTED_QUAL",
          msg: `Quality tidak didukung di free tier. Hanya: ${v.qual.join(", ")}`
        };
      }
      if (params.scale) {
        const sc = Number(params.scale);
        if (isNaN(sc) || sc < v.min || sc > v.max) {
          return {
            code: "INVALID_SCALE",
            msg: `Scale tidak valid. Range: ${v.min}x - ${v.max}x.`
          };
        }
      }
      return null;
    } catch (err) {
      console.error("[FaceAI _val Error]:", err.message);
      return {
        code: "VALIDATION_CRASH",
        msg: err.message
      };
    }
  }
  async generate({
    state,
    mode,
    prompt,
    image,
    scale = 2,
    ...rest
  }) {
    try {
      console.log(`\n[FaceAI] --- MEMULAI TASK GENERASI [Mode: ${mode || "N/A"}] ---`);
      const targetMode = mode ? String(mode).toLowerCase() : "";
      if (!targetMode || !this.cfg.modes.includes(targetMode)) {
        console.warn(`[FaceAI] Atribut mode '${mode}' ditolak.`);
        return {
          status: false,
          error: {
            code: "INVALID_MODE",
            msg: `Mode '${mode || "kosong"}' tidak valid. Silakan pilih dari list mode yang tersedia.`,
            available_modes: this.cfg.modes
          },
          state: state || ""
        };
      }
      const rules = this.cfg.rules[targetMode] || {};
      if (rules.req) {
        for (const key of rules.req) {
          if (key === "prompt" && !prompt) {
            return {
              status: false,
              error: {
                code: "REQUIRED_PROMPT",
                msg: `Parameter 'prompt' wajib untuk mode ${mode}.`
              },
              state: state || ""
            };
          }
          if (key === "image" && !image) {
            return {
              status: false,
              error: {
                code: "REQUIRED_IMAGE",
                msg: `Parameter 'image' wajib untuk mode ${mode}.`
              },
              state: state || ""
            };
          }
        }
      }
      const valErr = this._val({
        ...rest,
        scale: scale
      });
      if (valErr) {
        console.warn("[FaceAI] Parameter input tidak lolos skema validasi tier gratis.");
        return {
          status: false,
          error: valErr,
          state: state || ""
        };
      }
      const {
        hdrs,
        fp
      } = this._state(state, "request");
      let uploadedPaths = [];
      if (image) {
        console.log("[FaceAI] Terdeteksi input media. Menjalankan sub-proses unggah berkas...");
        const {
          hdrs: uploadHdrs
        } = this._state(state, "upload");
        const uplRes = await this._upl(image, uploadHdrs);
        if (uplRes.error) {
          console.error("[FaceAI] Sub-proses unggah media gagal.");
          return {
            status: false,
            error: {
              code: "UPLOAD_FAILED",
              msg: uplRes.error
            },
            state: this._packState(fp)
          };
        }
        uploadedPaths = uplRes;
      }
      let endpoint = "";
      let payload = {};
      switch (targetMode) {
        case "upscale":
          endpoint = `${this.base}/api/image/upscaler/create`;
          payload = {
            fn_name: "upscale-img",
            call_type: 1,
            input: {
              source_image: uploadedPaths[0] || "",
              scale: Number(scale)
            },
            request_from: 18,
            origin_from: "abe59b44eca9eb9b",
            ...rest
          };
          break;
        case "enhance":
          endpoint = `${this.base}/api/image/photo-enhancer/create`;
          payload = {
            fn_name: "ai-photo-enhancer",
            call_type: 1,
            input: {
              source_image: uploadedPaths[0] || "",
              scale: Number(scale)
            },
            request_from: 18,
            origin_from: "abe59b44eca9eb9b",
            ...rest
          };
          break;
        case "image":
          if (uploadedPaths.length > 0) {
            endpoint = `${this.base}/api/image/to-image/create`;
            payload = {
              fn_name: "ai-image-to-image",
              call_type: 1,
              input: {
                img_urls: uploadedPaths,
                prompt: prompt,
                style: rest.style || "realistic",
                strength: rest.strength || .65,
                aspect_ratio: rest.aspect_ratio || "9:16",
                resolution: rest.resolution || "1K"
              },
              request_from: 18,
              origin_from: "abe59b44eca9eb9b",
              ...rest
            };
          } else {
            endpoint = `${this.base}/api/image/generator/create`;
            payload = {
              fn_name: "ai-image-generator",
              call_type: 1,
              input: {
                prompt: prompt,
                style: rest.style || "realistic",
                aspect_ratio: rest.aspect_ratio || "9:16",
                quality: rest.quality || "low",
                resolution: rest.resolution || "1K",
                tool_slug: "",
                generate_mode: "",
                output_mode: "",
                oc_traits: null
              },
              request_from: 18,
              origin_from: "abe59b44eca9eb9b",
              ...rest
            };
          }
          break;
        case "video":
        default:
          const isI2V = uploadedPaths.length > 0;
          endpoint = `${this.base}/api/faceai/ai_video_generator/create`;
          payload = {
            generation_mode: isI2V ? "i2v" : "t2v",
            prompt: prompt,
            source_image: isI2V ? uploadedPaths[0] : "",
            aspect_ratio: rest.aspect_ratio || "16:9",
            task_type: rest.task_type || "ai_video_generator",
            ...rest
          };
          break;
      }
      console.log(`[FaceAI] Mengirimkan POST request ke endpoint: ${endpoint}`);
      const res = await axios.post(endpoint, payload, {
        headers: hdrs
      });
      console.log(`[FaceAI] Respons API diterima dengan kode status HTTP: ${res.status}`);
      const resData = res?.data?.data || res?.data || {};
      const extractedTaskId = resData.task_id || resData.id || null;
      const newState = this._packState(fp, extractedTaskId);
      return {
        status: res?.data?.code === 1e5 || res?.data?.msg === "success",
        result: resData,
        state: newState
      };
    } catch (err) {
      console.error("[FaceAI generate Fatal Error]:", err?.response?.data || err.message);
      return {
        status: false,
        error: {
          code: "FATAL_ERROR",
          msg: err?.response?.data || err.message
        },
        state: state || ""
      };
    }
  }
  async status({
    state,
    mode,
    task_id,
    image_to_image = false,
    ...rest
  }) {
    try {
      const targetMode = mode ? String(mode).toLowerCase() : "";
      if (!targetMode || !this.cfg.modes.includes(targetMode)) {
        return {
          status: false,
          error: {
            code: "INVALID_MODE",
            msg: `Mode '${mode || "kosong"}' tidak valid.`
          },
          state: state || ""
        };
      }
      const {
        hdrs,
        taskId: stateTaskId,
        rawState
      } = this._state(state, "aitools");
      const finalTaskId = task_id || stateTaskId;
      console.log(`[FaceAI] Mengecek progres status untuk Task ID: ${finalTaskId || "N/A"}`);
      if (!finalTaskId) return {
        status: false,
        error: {
          code: "REQUIRED_TASK_ID",
          msg: "Parameter 'task_id' wajib."
        },
        state: rawState
      };
      let endpoint = "";
      let payload = {};
      switch (targetMode) {
        case "upscale":
          endpoint = `${this.base}/api/image/upscaler/status`;
          payload = {
            task_id: finalTaskId,
            fn_name: "upscale-img",
            call_type: 1,
            consume_type: 0,
            request_from: 18,
            origin_from: "abe59b44eca9eb9b",
            ...rest
          };
          break;
        case "enhance":
          endpoint = `${this.base}/api/image/photo-enhancer/status`;
          payload = {
            task_id: finalTaskId,
            fn_name: "ai-photo-enhancer",
            call_type: 1,
            consume_type: 0,
            request_from: 18,
            origin_from: "abe59b44eca9eb9b",
            ...rest
          };
          break;
        case "image":
          if (image_to_image || rest.image || rest.source_image) {
            endpoint = `${this.base}/api/image/to-image/status`;
            payload = {
              task_id: finalTaskId,
              fn_name: "ai-image-to-image",
              call_type: 1,
              consume_type: 0,
              request_from: 18,
              origin_from: "abe59b44eca9eb9b",
              ...rest
            };
          } else {
            endpoint = `${this.base}/api/image/generator/status`;
            payload = {
              task_id: finalTaskId,
              fn_name: "ai-image-generator",
              call_type: 1,
              consume_type: 0,
              request_from: 18,
              origin_from: "abe59b44eca9eb9b",
              ...rest
            };
          }
          break;
        case "video":
        default:
          endpoint = `${this.base}/api/faceai/ai_video_generator/status`;
          payload = {
            task_id: finalTaskId,
            ...rest
          };
          break;
      }
      const res = await axios.post(endpoint, payload, {
        headers: hdrs
      });
      return {
        status: res?.data?.code === 1e5 || res?.data?.msg === "success",
        result: res?.data?.data || res?.data,
        state: rawState
      };
    } catch (err) {
      console.error("[FaceAI status Fatal Error]:", err?.response?.data || err.message);
      return {
        status: false,
        error: {
          code: "STATUS_ERROR",
          msg: err?.response?.data || err.message
        },
        state: state || ""
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["generate", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          generate: "/?action=generate&mode=image",
          status: "/?action=status&state=eyJxxxx"
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new FaceAI();
  try {
    let response;
    switch (action) {
      case "generate":
        response = await api.generate(params);
        break;
      case "status":
        if (!params.state) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'state' wajib diisi untuk action 'status'.",
            example: "/?action=status&state=eyJxxx"
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari server. Coba lagi nanti."
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}