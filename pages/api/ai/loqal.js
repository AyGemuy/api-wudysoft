import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class LoqalClient {
  constructor() {
    this.base_url = "https://crypto-watchlist-7q72.onrender.com";
    this.access_token = "canIHaveAccessPleaseNoSpacesAllowed1010";
    this.app_version = "3.6.0";
    this.app_build = "86";
    this.platform = "android";
    this.default_headers = {
      "User-Agent": "okhttp/4.12.0",
      "Accept-Encoding": "gzip",
      "x-access-token": this.access_token,
      "x-app-version": this.app_version,
      "x-app-build-version": this.app_build
    };
    this.http = axios.create({
      timeout: 0
    });
    this.http.interceptors.request.use(cfg => {
      cfg.headers = cfg?.headers || {};
      return cfg;
    }, err => Promise.reject(err));
    this.http.interceptors.response.use(res => res, err => Promise.reject(err));
  }
  b64Enc(data) {
    try {
      return Buffer.from(JSON.stringify(data || {})).toString("base64");
    } catch (e) {
      console.log(`[b64Enc Error] ${e?.message || e}`);
      return null;
    }
  }
  b64Dec(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf8")) : null;
    } catch (e) {
      console.log(`[b64Dec Error] ${e?.message || e}`);
      return null;
    }
  }
  genSubId() {
    try {
      const hex = crypto.randomUUID().replace(/-/g, "");
      return `$RCAnonymousID:${hex}`;
    } catch (e) {
      console.log(`[genSubId Error] ${e?.message || e}`);
      return `$RCAnonymousID:1c9a963653ef4f559939f1bf5c799204`;
    }
  }
  async parseBuf(input) {
    try {
      if (Buffer.isBuffer(input)) {
        return {
          buf: input,
          filename: `${crypto.randomUUID()}.png`,
          mime: "image/png"
        };
      }
      if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          console.log(`[Media] Mengunduh media dari URL: ${input}`);
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          const mime = res?.headers?.["content-type"] || "image/png";
          return {
            buf: Buffer.from(res?.data || []),
            filename: `${crypto.randomUUID()}.png`,
            mime: mime
          };
        }
        if (input.startsWith("data:")) {
          const parts = input.split(",");
          const mimeMatch = parts?.[0]?.match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : "image/png";
          return {
            buf: Buffer.from(parts?.[1] || "", "base64"),
            filename: `${crypto.randomUUID()}.png`,
            mime: mime
          };
        }
        return {
          buf: Buffer.from(input, "base64"),
          filename: `${crypto.randomUUID()}.png`,
          mime: "image/png"
        };
      }
      return null;
    } catch (e) {
      console.log(`[parseBuf Error] ${e?.message || e}`);
      return null;
    }
  }
  async upMedia(mediaItem, subscriberId) {
    try {
      const parsed = await this.parseBuf(mediaItem);
      if (!parsed?.buf) {
        console.log("[Media] Resolusi payload media gagal");
        return null;
      }
      const generatedFileId = `file:///data/user/0/com.loqal.labs.ai.chat/files/chat-images/${crypto.randomUUID()}.png`;
      const metadataStr = JSON.stringify({
        platform: this.platform,
        version: this.app_version,
        subscriberId: subscriberId,
        isSubscribed: "false"
      });
      console.log(`[Media] Mengunggah file ke Loqal Intake (fileId: ${generatedFileId})...`);
      const form = new FormData();
      form.append("file", parsed.buf, {
        filename: parsed.filename,
        contentType: parsed.mime
      });
      form.append("fileId", generatedFileId);
      form.append("metadata", metadataStr);
      const res = await this.http.post(`${this.base_url}/assistance/file-upload`, form, {
        headers: {
          ...this.default_headers,
          ...form.getHeaders()
        }
      });
      console.log("[Media] File berhasil diunggah");
      return res?.data?.fileId || generatedFileId;
    } catch (e) {
      console.log(`[upMedia Error] ${e?.response?.data || e?.message || e}`);
      return null;
    }
  }
  async chat({
    state,
    prompt,
    media,
    ...rest
  } = {}) {
    try {
      if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
        console.log("[Validation] Parameter prompt wajib diisi.");
        return {
          status: false,
          result: {
            error: "prompt is required and must be a non-empty string"
          },
          state: state || null
        };
      }
      console.log("[Loqal] Memproses percakapan bantuan AI...");
      let session = this.b64Dec(state);
      if (!session?.subscriber_id) {
        console.log("[Loqal] State baru diinisialisasi...");
        session = {
          subscriber_id: this.genSubId(),
          history: []
        };
      } else {
        console.log(`[Loqal] Menggunakan sesi: ${session.subscriber_id}`);
        session.history = Array.isArray(session?.history) ? session.history : [];
      }
      let attachedFileId = null;
      const mediaList = media ? Array.isArray(media) ? media : [media] : [];
      for (const item of mediaList) {
        const uploadedId = await this.upMedia(item, session.subscriber_id);
        if (uploadedId) {
          attachedFileId = uploadedId;
          break;
        }
      }
      const promptPayload = {
        text: prompt.trim()
      };
      if (attachedFileId) {
        promptPayload.fileId = attachedFileId;
      }
      const payload = {
        prompt: promptPayload,
        history: session.history,
        metadata: {
          platform: this.platform,
          version: this.app_version,
          subscriberId: session.subscriber_id,
          isSubscribed: rest?.is_subscribed || "false"
        }
      };
      console.log("[Loqal] Mengirim request ke /assistance/v2...");
      const res = await this.http.post(`${this.base_url}/assistance/v2`, payload, {
        headers: {
          ...this.default_headers,
          "Content-Type": "application/json"
        }
      });
      const replyData = res?.data;
      if (!replyData?.text) {
        return {
          status: false,
          result: replyData || {
            error: "Tidak mendapatkan respon teks dari server"
          },
          state: this.b64Enc(session)
        };
      }
      session.history.push({
        text: prompt.trim(),
        isUser: true
      });
      session.history.push({
        text: replyData.text,
        isUser: false
      });
      console.log("[Loqal] Respon percakapan berhasil diterima.");
      return {
        status: true,
        result: replyData,
        state: this.b64Enc(session)
      };
    } catch (err) {
      console.log(`[chat Error] ${err?.response?.data || err?.message || err}`);
      return {
        status: false,
        result: err?.response?.data || {
          error: err?.message || "Internal chat error"
        },
        state: state || null
      };
    }
  }
  async generate(params) {
    return this.chat(params);
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};
  const valid_actions = ["chat", "generate", "init"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          chat: "/?action=chat&prompt=Halo (POST: { prompt, state, media })",
          generate: "/?action=generate&prompt=Analisa+gambar+ini (POST: { prompt, media })",
          init: "/?action=init (Inisialisasi sesi baru)"
        }
      }
    });
  }
  if (!valid_actions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: valid_actions
    });
  }
  const api = new LoqalClient();
  try {
    let response;
    switch (action) {
      case "chat":
      case "generate": {
        if (!params?.prompt || typeof params.prompt !== "string" || params.prompt.trim() === "") {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi string non-kosong."
          });
        }
        response = await api.chat({
          state: params?.state,
          prompt: params?.prompt,
          media: params?.media,
          ...params
        });
        break;
      }
      case "init": {
        const subscriberId = api.genSubId();
        const emptySession = {
          subscriber_id: subscriberId,
          history: []
        };
        response = {
          status: true,
          result: {
            subscriber_id: subscriberId,
            message: "Sesi baru berhasil dibuat."
          },
          state: api.b64Enc(emptySession)
        };
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response || !response.status) {
      return res.status(502).json({
        status: false,
        action: action,
        error: response?.result?.error || "Gagal memproses permintaan ke server target.",
        result: response?.result || null,
        state: response?.state || null
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error?.message || "Unknown Error"
    });
  }
}