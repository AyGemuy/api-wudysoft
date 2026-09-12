import axios from "axios";
import crypto from "crypto";
class ImageToImageAI {
  constructor() {
    try {
      this.appId = "ai_image_to_image";
      this.appSecret = "NHGNy5YFz7HeFb";
      this.rsaPublicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDa2oPxMZe71V4dw2r8rHWt59gH
W5INRmlhepe6GUanrHykqKdlIB4kcJiu8dHC/FJeppOXVoKz82pvwZCmSUrF/1yr
rnmUDjqUefDu8myjhcbio6CnG5TtQfwN2pz3g6yHkLgp8cFfyPSWwyOCMMMsTU9s
snOjvdDb4wiZI8x3UwIDAQAB
-----END PUBLIC KEY-----`;
      this.ratios = {
        "1:1": "1:1",
        square: "1:1",
        "9:16": "9:16",
        portrait: "9:16",
        "16:9": "16:9",
        landscape: "16:9",
        "3:4": "3:4",
        "4:3": "4:3",
        default: "default"
      };
      this.models = {
        basic: "basic",
        "basic-v2": "basic-v2",
        pro: "pro",
        creative: "creative"
      };
      this.client = axios.create({
        baseURL: "https://api.image-to-image.ai",
        headers: {
          accept: "application/json",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://image-to-image.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://image-to-image.ai/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        },
        timeout: 12e4
      });
    } catch (err) {
      console.error(`[ImageToImageAI] Error pada constructor: ${err?.message}`);
    }
  }
  _resolveSession(state) {
    try {
      if (state && typeof state === "string") {
        try {
          const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
          if (decoded.uid) {
            return {
              uid: decoded.uid,
              rawState: state
            };
          }
        } catch (parseErr) {
          console.warn(`[ImageToImageAI] State parse warning: ${parseErr?.message}`);
        }
      }
      const uid = crypto.randomUUID();
      const rawState = Buffer.from(JSON.stringify({
        uid: uid
      })).toString("base64");
      return {
        uid: uid,
        rawState: rawState
      };
    } catch (err) {
      console.error(`[ImageToImageAI] Error pada _resolveSession: ${err?.message}`);
      const uid = crypto.randomUUID();
      return {
        uid: uid,
        rawState: ""
      };
    }
  }
  _randomString(len = 16) {
    try {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      const bytes = crypto.randomBytes(len);
      for (let i = 0; i < len; i++) {
        result += chars[bytes[i] % chars.length];
      }
      return result;
    } catch (err) {
      console.error(`[ImageToImageAI] Error pada _randomString: ${err?.message}`);
      return "aB1cD2eF3gH4iJ5k";
    }
  }
  _rsaEncrypt(text) {
    try {
      const buffer = Buffer.from(text, "utf-8");
      const encrypted = crypto.publicEncrypt({
        key: this.rsaPublicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
      }, buffer);
      return encrypted.toString("base64");
    } catch (err) {
      console.error(`[ImageToImageAI] Error pada _rsaEncrypt: ${err?.message}`);
      return "";
    }
  }
  _aesEncrypt(plainText, keyStr, ivStr) {
    try {
      const key = Buffer.from(keyStr, "utf-8");
      const iv = Buffer.from(ivStr, "utf-8");
      const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
      let encrypted = cipher.update(plainText, "utf-8", "base64");
      encrypted += cipher.final("base64");
      return encrypted;
    } catch (err) {
      console.error(`[ImageToImageAI] Error pada _aesEncrypt: ${err?.message}`);
      return "";
    }
  }
  _generateSignatureParams(uid) {
    try {
      const appId = this.appId;
      const appSecret = this.appSecret;
      const t = Math.floor(Date.now() / 1e3);
      const nonce = crypto.randomUUID();
      const secretRaw = this._randomString(16);
      const secretKey = this._rsaEncrypt(secretRaw);
      const signPlain = `${appId}:${appSecret}:${t}:${nonce}:${secretKey}`;
      const sign = this._aesEncrypt(signPlain, secretRaw, secretRaw);
      return {
        app_id: appId,
        t: t.toString(),
        nonce: nonce,
        sign: sign,
        secret_key: secretKey,
        uid: uid,
        guest_id: uid
      };
    } catch (err) {
      console.error(`[ImageToImageAI] Error pada _generateSignatureParams: ${err?.message}`);
      return {};
    }
  }
  async _resolveToBuffer(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) {
        return input;
      }
      if (typeof input === "string") {
        const trimmed = input.trim();
        if (trimmed.startsWith("data:")) {
          const base64Data = trimmed.split(",")[1];
          return Buffer.from(base64Data, "base64");
        }
        if (/^https?:\/\//i.test(trimmed)) {
          const res = await axios.get(trimmed, {
            responseType: "arraybuffer",
            timeout: 2e4
          });
          return Buffer.from(res.data);
        }
        return Buffer.from(trimmed, "base64");
      }
      return null;
    } catch (err) {
      console.error(`[ImageToImageAI] Error pada _resolveToBuffer: ${err?.message}`);
      return null;
    }
  }
  async _uploadImageToOSS(imageBuffer, uid) {
    try {
      console.log("[ImageToImageAI] Mengunggah input image ke OSS server...");
      const filename = `${Date.now()}.jpg`;
      const hash = crypto.randomBytes(11).toString("hex");
      const sigParams = this._generateSignatureParams(uid);
      const signRes = await this.client.post("/api/oss/v1/upload-sign", {
        filename: filename,
        hash: hash
      }, {
        params: sigParams
      });
      const ossData = signRes?.data?.data;
      if (!ossData?.url || !ossData?.object_name) {
        throw new Error(signRes?.data?.msg || "Gagal mendapatkan signed upload URL.");
      }
      await axios.put(ossData.url, imageBuffer, {
        headers: {
          "Content-Type": "image/jpeg"
        },
        timeout: 6e4
      });
      const cdnUrl = `https://cdn.image-to-image.ai/${ossData.object_name}`;
      console.log(`[ImageToImageAI] Upload OSS sukses: ${cdnUrl}`);
      return cdnUrl;
    } catch (err) {
      console.error(`[ImageToImageAI] Error pada _uploadImageToOSS: ${err?.message}`);
      throw err;
    }
  }
  _valModel(m) {
    try {
      if (!m) return "basic-v2";
      const clean = m.toString().toLowerCase().trim();
      return this.models[clean] || m;
    } catch (err) {
      console.error(`[ImageToImageAI] Error pada _valModel: ${err?.message}`);
      return "basic-v2";
    }
  }
  _valRatio(r) {
    try {
      if (!r) return "1:1";
      const clean = r.toString().toLowerCase().trim();
      return this.ratios[clean] || "1:1";
    } catch (err) {
      console.error(`[ImageToImageAI] Error pada _valRatio: ${err?.message}`);
      return "1:1";
    }
  }
  async _pollResult(checkEndpoint, jobId, uid, maxRetries = 60, interval = 3e3) {
    try {
      console.log(`[ImageToImageAI] Polling task (Job ID: ${jobId})...`);
      for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, interval));
        const sigParams = this._generateSignatureParams(uid);
        const res = await this.client.get(checkEndpoint, {
          params: {
            job_id: jobId,
            ...sigParams
          }
        });
        const data = res?.data;
        if (data?.code === 200 && data?.data?.generate_url) {
          const urls = Array.isArray(data.data.generate_url) ? data.data.generate_url : [data.data.generate_url];
          if (urls.length > 0 && urls[0]) {
            return {
              status: true,
              data: data.data
            };
          }
        }
        console.log(`[ImageToImageAI] Polling ke-${i + 1}: status [${data?.msg || "processing"}]`);
      }
      return {
        status: false,
        error: "Polling timeout: Waktu pembuatan gambar habis."
      };
    } catch (err) {
      console.error(`[ImageToImageAI] Error pada _pollResult: ${err?.message}`);
      return {
        status: false,
        error: err?.message || "Terjadi kesalahan saat polling status task."
      };
    }
  }
  async generate({
    state,
    prompt,
    image,
    init_image,
    base64img,
    ratio,
    aspect_ratio,
    model,
    model_type,
    ...rest
  }) {
    try {
      console.log("[ImageToImageAI] Memeriksa input parameter...");
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        console.error("[ImageToImageAI] Validasi gagal: prompt kosong.");
        return {
          status: false,
          result: 'Field "prompt" wajib diisi dan berupa string tidak kosong.'
        };
      }
      const session = this._resolveSession(state);
      const cleanPrompt = prompt.trim();
      const rawImage = image || init_image || base64img || rest?.imageUrl;
      const isImg2Img = Boolean(rawImage);
      const sigParams = this._generateSignatureParams(session.uid);
      let endpointCreate = "";
      let endpointCheck = "";
      let payload = {};
      if (isImg2Img) {
        const imgBuffer = await this._resolveToBuffer(rawImage);
        if (!imgBuffer) {
          return {
            status: false,
            result: "Gagal memproses input gambar image-to-image."
          };
        }
        const uploadedUrl = await this._uploadImageToOSS(imgBuffer, session.uid);
        endpointCreate = "/api/v1/img-to-img/create";
        endpointCheck = "/api/v1/img-to-img/check";
        payload = {
          prompt: cleanPrompt,
          origin_url: [uploadedUrl],
          model_type: this._valModel(model_type || model || "basic-v2"),
          aspect_ratio: this._valRatio(aspect_ratio || ratio || "default"),
          disable_safety_checker: rest?.disable_safety_checker ?? true,
          ...rest
        };
      } else {
        endpointCreate = "/api/v1/text-to-img/create";
        endpointCheck = "/api/v1/text-to-img/check";
        payload = {
          prompt: cleanPrompt,
          aspect_ratio: this._valRatio(aspect_ratio || ratio || "1:1"),
          disable_safety_checker: rest?.disable_safety_checker ?? true,
          ...rest
        };
      }
      console.log(`[ImageToImageAI] Membuat task generate [Mode: ${isImg2Img ? "I2I" : "T2I"} | Ratio: ${payload.aspect_ratio}]...`);
      const createRes = await this.client.post(endpointCreate, payload, {
        params: sigParams
      });
      const resData = createRes?.data;
      if (resData?.code !== 200 || !resData?.data?.job_id) {
        return {
          status: false,
          result: resData?.msg || "Gagal membuat job antrean generate."
        };
      }
      const jobId = resData.data.job_id;
      const pollRes = await this._pollResult(endpointCheck, jobId, session.uid);
      if (!pollRes.status) {
        return {
          status: false,
          result: pollRes.error
        };
      }
      console.log("[ImageToImageAI] Proses generate selesai.");
      return {
        status: true,
        result: {
          ...pollRes.data,
          state: session.rawState
        }
      };
    } catch (err) {
      const errData = err?.response?.data;
      const errMsg = errData?.msg || errData?.message || err?.message || "Terjadi kesalahan internal pada request.";
      console.error(`[ImageToImageAI] Error koneksi/server: ${typeof errMsg === "object" ? JSON.stringify(errMsg) : errMsg}`);
      return {
        status: false,
        result: errData || errMsg
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params?.prompt) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'prompt' diperlukan"
      });
    }
    const api = new ImageToImageAI();
    const data = await api.generate(params);
    return res.status(data.status ? 200 : 500).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      status: false,
      error: errorMessage
    });
  }
}