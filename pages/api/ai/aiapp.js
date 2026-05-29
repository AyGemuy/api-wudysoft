import axios from "axios";
const FB_KEY = "AIzaSyB7JuY4pytLXJln8aiamCp5ARs9u-LpQzU";
const FB_SIGNUP_URL = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${FB_KEY}`;
const FB_REFRESH_URL = `https://securetoken.googleapis.com/v1/token?key=${FB_KEY}`;
const AIAPP_BASE = "https://api.aiapp.ai/api";
const STORAGE_BASE = "https://firebasestorage.googleapis.com/v0/b/ai-app-ai-prod.appspot.com/o";
const UA = "okhttp/4.12.0";
const UA_DALVIK = "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)";
const PKG = "ai.app.ai";
const CERT = "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81";
const GMPID = "1:784973900488:android:118ecd41d563e281dd53fd";
const APPCHECK = "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==";
const DEFAULT_USER_ID = "0b2a8aa6978eba427427c12734f8185e";
const IMG = {
  dev: 1,
  schnell: 2,
  seed4: 3,
  ideo3: 4,
  kontext: 5,
  pro: 6,
  hunyuan: 7,
  gptimg: 8,
  dalle3: 9,
  banana: 10,
  qwen: 11,
  auto: 12,
  zturbo: 13
};
const PIPELINE = {
  1: "flux_dev",
  2: "flux_schnell",
  3: "seedream_v4_0",
  4: "ideogram_v3",
  5: "flux_kontext_pro",
  6: "flux_pro_v1_1",
  7: "hunyuan_image_v3",
  8: "gpt_image_1",
  9: "gpt_image_1",
  10: "nano_banana",
  11: "qwen_image",
  12: "auto",
  13: "z_image_turbo"
};
const MODEL_MAP = [{
  key: 0,
  value: "mpwyUrxHu4Xa47BP5lPEgwk/NcaFFlnhBk3SA745INc="
}, {
  key: 2,
  value: "utq91e3b3StjmuMJGullm0fDoieGv2EhMsvPdq2jc34="
}, {
  key: 3,
  value: "FIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQogrY="
}, {
  key: 4,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQoaaa="
}, {
  key: 5,
  value: "nIjaUTDhbb/r4IxrhYKBUzRLrshrJldlVgKL8EQobbb="
}, {
  key: 6,
  value: "nIjaUTDhcc/r4IxrhYKBUzRLrshrJldlVgKL8EQoccc="
}, {
  key: 7,
  value: "nIjaUTDhdd/r4IxrhYKBUzRLrshrJldlVgKL8EQoddd="
}, {
  key: 8,
  value: "nIjaUTDhee/r4IxrhYKBUzRLrshrJldlVgKL8EQoeee="
}, {
  key: 9,
  value: "nIjaUTDhff/r4IxrhYKBUzRLrshrJldlVgKL8EQofff="
}, {
  key: 10,
  value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQoggg="
}, {
  key: 11,
  value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQohhh="
}, {
  key: 12,
  value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQojjj="
}, {
  key: 13,
  value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQokkk="
}, {
  key: 14,
  value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQolll="
}, {
  key: 15,
  value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQommm="
}, {
  key: 16,
  value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQonnn="
}, {
  key: 17,
  value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQoppp="
}, {
  key: 18,
  value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQorrr="
}, {
  key: 19,
  value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQosss="
}, {
  key: 20,
  value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQottt="
}, {
  key: 21,
  value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQouuu="
}, {
  key: 22,
  value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQovvv="
}, {
  key: 23,
  value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQoyyy="
}, {
  key: 24,
  value: "nIjaUTDhgg/r4IxrhYKBUzRLrshrJldlVgKL8EQozzz="
}, {
  key: 25,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozaa="
}, {
  key: 26,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozab="
}, {
  key: 27,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozac="
}, {
  key: 28,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozad="
}, {
  key: 29,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozae="
}, {
  key: 30,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozaf="
}, {
  key: 31,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozag="
}, {
  key: 32,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozah="
}, {
  key: 33,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozai="
}, {
  key: 34,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozaj="
}, {
  key: 35,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozak="
}, {
  key: 36,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozal="
}, {
  key: 37,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozam="
}, {
  key: 38,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozan="
}, {
  key: 39,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozao="
}, {
  key: 40,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozap="
}, {
  key: 41,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozaq="
}, {
  key: 42,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozar="
}, {
  key: 43,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozas="
}, {
  key: 44,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozat="
}, {
  key: 45,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozau="
}, {
  key: 46,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozav="
}, {
  key: 47,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozaw="
}, {
  key: 48,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozax="
}, {
  key: 49,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozay="
}, {
  key: 50,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozaz="
}, {
  key: 51,
  value: "nIjaUTDhgL/r4IxrhYKBUzRLrshrJldlVgKL8EQozba="
}];
const FB_HDR = {
  "User-Agent": UA_DALVIK,
  Connection: "Keep-Alive",
  "Accept-Encoding": "gzip",
  "Content-Type": "application/json",
  "X-Android-Package": PKG,
  "X-Android-Cert": CERT,
  "Accept-Language": "id-ID, en-US",
  "X-Client-Version": "Android/Fallback/X24000001/FirebaseCore-Android",
  "X-Firebase-GMPID": GMPID,
  "X-Firebase-Client": "H4sIAAAAAAAA_6tWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA",
  "X-Firebase-AppCheck": APPCHECK
};
const FB_STORAGE_HDR = {
  "User-Agent": UA_DALVIK,
  Connection: "Keep-Alive",
  "Accept-Encoding": "gzip",
  "x-firebase-appcheck": APPCHECK,
  "X-Firebase-Storage-Version": "Android/22.0.1",
  "x-firebase-gmpid": GMPID
};
const randHex = n => Array.from({
  length: n
}, () => Math.floor(Math.random() * 16).toString(16)).join("");
const randAlnum = n => {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({
    length: n
  }, () => c[Math.floor(Math.random() * c.length)]).join("");
};
async function resolveImg(src) {
  if (Buffer.isBuffer(src)) return {
    b64: src.toString("base64"),
    mime: "image/jpeg"
  };
  if (typeof src === "string") {
    if (src.startsWith("data:")) {
      const [meta, b64] = src.split(",");
      return {
        b64: b64,
        mime: meta.replace("data:", "").replace(";base64", "")
      };
    }
    if (src.startsWith("http")) {
      console.log("[img] downloading", src);
      const {
        data
      } = await axios.get(src, {
        responseType: "arraybuffer"
      });
      return {
        b64: Buffer.from(data).toString("base64"),
        mime: "image/jpeg"
      };
    }
    return {
      b64: src,
      mime: "image/jpeg"
    };
  }
  throw new Error("unsupported image type");
}
class AiAppAI {
  constructor() {
    this.token = null;
    this.refresh = null;
    this.exp = 0;
    this.uid = null;
    this.userId = DEFAULT_USER_ID;
  }
  _setTok({
    idToken,
    refreshToken,
    localId,
    expiresIn
  }) {
    this.token = idToken;
    this.refresh = refreshToken ?? this.refresh;
    this.uid = localId ?? this.uid;
    this.exp = Date.now() + (Number(expiresIn) - 60) * 1e3;
  }
  async _signup() {
    console.log("[auth] Firebase anonymous signup…");
    const {
      data
    } = await axios.post(FB_SIGNUP_URL, {
      clientType: "CLIENT_TYPE_ANDROID"
    }, {
      headers: FB_HDR
    });
    this._setTok(data);
    console.log("[auth] signup ok  uid =", this.uid, " expires_in =", data.expiresIn);
  }
  async _refreshTok() {
    console.log("[auth] refreshing token…");
    try {
      const {
        data
      } = await axios.post(FB_REFRESH_URL, {
        grantType: "refresh_token",
        refreshToken: this.refresh
      }, {
        headers: FB_HDR
      });
      this._setTok({
        idToken: data.id_token,
        refreshToken: data.refresh_token,
        localId: data.user_id,
        expiresIn: data.expires_in
      });
      console.log("[auth] refresh ok");
    } catch {
      await this._signup();
    }
  }
  async _ensureAuth() {
    if (!this.token) return this._signup();
    if (Date.now() >= this.exp) return this._refreshTok();
  }
  _hdr(extra = {}) {
    return {
      "User-Agent": UA,
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "cache-control": "no-cache",
      "x-requested-with": "XMLHttpRequest",
      x_pr: "false",
      x_platform: "android",
      x_dev: "false",
      x_user_id: this.userId,
      x_token: this.token ?? "",
      ...extra
    };
  }
  async register(fcmToken = "") {
    await this._ensureAuth();
    console.log("[register] userId =", this.userId);
    try {
      const {
        data
      } = await axios.post(`${AIAPP_BASE}/v3/users/${this.userId}`, {
        fcmToken: fcmToken,
        model: MODEL_MAP
      }, {
        headers: this._hdr()
      });
      console.log("[register] ok  isPremium =", data?.data?.isPremium, " totalCredit =", data?.data?.totalCredit);
      return data;
    } catch (e) {
      console.error("[register] error", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async tokenCount(content, model = 2) {
    await this._ensureAuth();
    try {
      const {
        data
      } = await axios.post(`${AIAPP_BASE}/token-count`, {
        content: content,
        id: model,
        model: 3
      }, {
        headers: this._hdr()
      });
      console.log("[token-count] token =", data?.token);
      return data?.token ?? 0;
    } catch (e) {
      console.error("[token-count] error", e?.response?.data ?? e.message);
      return 0;
    }
  }
  async _uploadImg(b64, mime = "image/jpeg", prefix = "vision") {
    const ts = Date.now();
    const ext = mime.split("/")[1] ?? "jpg";
    const uid = this.uid ?? this.userId;
    const name = prefix === "vision" ? `vision/${uid}/${ts}/vision-image-input-${randAlnum(8)}.${ext}` : `image-generation/${uid}/${ts}/result.${ext}`;
    const encoded = encodeURIComponent(name);
    const initUrl = `${STORAGE_BASE}?name=${encoded}&uploadType=resumable&upload_protocol=resumable`;
    const buf = Buffer.from(b64, "base64");
    const sHdr = {
      ...FB_STORAGE_HDR,
      Authorization: `Firebase ${this.token}`
    };
    console.log("[upload] initiating…", name);
    const init = await axios.post(initUrl, null, {
      headers: {
        ...sHdr,
        "Content-Type": mime,
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Header-Content-Length": buf.length,
        "X-Goog-Upload-Header-Content-Type": mime
      }
    }).catch(e => {
      console.error("[upload] init error", e?.response?.data ?? e.message);
      throw e;
    });
    const uploadUrl = init.headers["x-goog-upload-url"] ?? init.headers["location"] ?? initUrl;
    console.log("[upload] uploading", buf.length, "bytes…");
    const result = await axios.post(uploadUrl, buf, {
      headers: {
        ...sHdr,
        "Content-Type": "application/octet-stream",
        "X-Goog-Upload-Command": "upload, finalize",
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Offset": "0"
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    }).catch(e => {
      console.error("[upload] finalize error", e?.response?.data ?? e.message);
      throw e;
    });
    const storageName = result?.data?.name ?? name;
    console.log("[upload] ok  name =", storageName);
    return storageName;
  }
  async chat({
    prompt,
    image = null,
    model = 2,
    chatId,
    fcmToken = "",
    ...rest
  }) {
    await this._ensureAuth();
    await this.register(fcmToken);
    const tc = await this.tokenCount(prompt, model);
    console.log("[chat] token-count =", tc);
    chatId = chatId ?? randAlnum(20);
    console.log("[chat] model =", model, " chatId =", chatId);
    const contentParts = [{
      type: "text",
      text: prompt
    }];
    if (image != null) {
      console.log("[chat] uploading vision image…");
      const {
        b64,
        mime
      } = await resolveImg(image);
      const storagePath = await this._uploadImg(b64, mime, "vision");
      contentParts.push({
        type: "image",
        fileUrl: `/${storagePath}`,
        mimeType: mime
      });
    }
    const body = {
      messages: [{
        role: "user",
        content: contentParts
      }],
      modelMap: MODEL_MAP,
      ...rest
    };
    const headers = this._hdr({
      Accept: "text/event-stream",
      x_stream: "false",
      x_model: String(model),
      x_token_count: String(tc),
      x_chat_id: chatId
    });
    console.log("[chat] sending…");
    try {
      const {
        data
      } = await axios.post(`${AIAPP_BASE}/chat`, body, {
        headers: headers
      });
      const reply = data ?? "";
      console.log("[chat] done =", reply);
      return reply;
    } catch (e) {
      console.error("[chat] error", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async generate({
    prompt,
    image = null,
    modelId = IMG.schnell,
    style = 0,
    ...rest
  }) {
    await this._ensureAuth();
    const pipeline = PIPELINE[modelId] ?? "flux_schnell";
    const uid = this.uid ?? this.userId;
    const storagePath = rest.url ?? `image-generation/${uid}/${Date.now()}/result.jpeg`;
    let imageBase64 = null;
    if (image) {
      const {
        b64
      } = await resolveImg(image);
      imageBase64 = b64;
    }
    console.log("[generate] pipeline =", pipeline, " prompt =", prompt);
    let raw;
    try {
      const {
        data
      } = await axios.post(`${AIAPP_BASE}/image-generator`, {
        pipeline: pipeline,
        prompt: prompt,
        url: storagePath,
        ...imageBase64 ? {
          image: imageBase64
        } : {},
        ...rest
      }, {
        headers: this._hdr({
          x_model: String(modelId),
          x_style: String(style),
          x_source: "2",
          x_edit_source: "1"
        })
      });
      raw = data;
    } catch (e) {
      const err = e?.response?.data ?? e.message;
      console.error("[generate] error:", err);
      return {
        ok: false,
        error: err
      };
    }
    const rawUrl = raw?.url ?? raw?.data?.url ?? raw?.image_url ?? storagePath;
    const imgUrl = rawUrl.startsWith("http") ? rawUrl : `${STORAGE_BASE}/${encodeURIComponent(rawUrl)}?alt=media`;
    console.log("[generate] ok  url =", imgUrl);
    const dl = await this._downloadImg(imgUrl);
    if (!dl.ok) return {
      ok: false,
      error: dl.error
    };
    return {
      ok: true,
      url: imgUrl,
      buffer: dl.buffer,
      contentType: dl.contentType,
      raw: raw
    };
  }
  async _downloadImg(storageUrl) {
    await this._ensureAuth();
    const url = storageUrl.includes("?alt=media") ? storageUrl : `${storageUrl}?alt=media`;
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        headers: {
          ...FB_STORAGE_HDR,
          Authorization: `Firebase ${this.token}`
        }
      });
      const buffer = Buffer.from(res.data);
      const contentType = res.headers["content-type"] ?? "image/jpeg";
      console.log("[download] ok", buffer.length, "bytes |", contentType);
      return {
        ok: true,
        buffer: buffer,
        contentType: contentType
      };
    } catch (e) {
      const err = e?.response?.data ?? e.message;
      console.error("[download] error:", err);
      return {
        ok: false,
        error: err
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["chat", "generate"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new AiAppAI();
  try {
    let response;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        return res.status(200).json({
          status: true,
          action: action,
          ...response
        });
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        if (!response || !response.buffer) {
          return res.status(502).json({
            status: false,
            error: "Gagal menghasilkan gambar atau buffer kosong."
          });
        }
        res.setHeader("Content-Type", response.contentType || "image/png");
        return res.status(200).send(response.buffer);
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal server.",
      error: error.message || "Unknown Error"
    });
  }
}
