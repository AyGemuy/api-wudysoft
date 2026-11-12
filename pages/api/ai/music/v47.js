import axios from "axios";
import FormData from "form-data";
import https from "https";
class MusicAI {
  constructor() {
    this.tok = null;
    this.key = "AIzaSyA6fKF4OIl2SAu4W2MmsbEJwL2TU0f2Wqo";
    this.base = "https://musicai-v2.trippleapps.com";
    this.cdn = "https://pub-02e996af4d7f4839a45ee8d0f5b8af59.r2.dev";
    this.sslAgent = new https.Agent({
      rejectUnauthorized: false
    });
    this.baseHeaders = {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
      "X-Android-Package": "com.music.ai.song.aimusicgenerator.aisongmaker.imai",
      "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81",
      "Accept-Language": "id-, en-US",
      "X-Client-Version": "Android/Fallback/X23002001/FirebaseCore-Android",
      "X-Firebase-GMPID": "1:129555927067:android:2c82d74d1d3a4583fe28be",
      "X-Firebase-Client": "H4sIAAAAAAAA_6tWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA"
    };
  }
  log_proc(type, msg, obj = "") {
    try {
      const timestamp = new Date().toISOString();
      const prefix = `[MusicAI][${timestamp}][${type.toUpperCase()}]`;
      if (obj) {
        console.log(`${prefix} ${msg}`, JSON.stringify(obj, null, 2));
      } else {
        console.log(`${prefix} ${msg}`);
      }
    } catch (e) {
      console.log("[MusicAI Logger Error]", e.message);
    }
  }
  wrap_res(resData) {
    try {
      const raw = resData?.data || resData;
      const link = raw?.output_link ? raw.output_link.startsWith("http") ? raw.output_link : `${this.cdn}${raw.output_link}` : null;
      const {
        id,
        output_link,
        ...sisaRaw
      } = raw;
      return {
        status: raw?.status || null,
        task_id: id || raw?.task_id || null,
        token: this.tok,
        ...link && {
          output_link: link
        },
        ...sisaRaw
      };
    } catch (err) {
      this.log_proc("error", "Gagal memformat (wrap) data response:", err.message);
      return resData;
    }
  }
  async _resolveImage(imgInput) {
    try {
      if (!imgInput) return null;
      if (typeof imgInput === "object" && imgInput.data) {
        return {
          mime_type: imgInput.mime_type || "image/jpeg",
          data: imgInput.data.replace(/^data:image\/\w+;base64,/, "")
        };
      }
      if (typeof imgInput === "string") {
        if (imgInput.startsWith("http")) {
          this.log_proc("info", `Mengunduh gambar via URL: ${imgInput}`);
          const res = await axios.get(imgInput, {
            responseType: "arraybuffer"
          });
          const mime = res.headers["content-type"] || "image/jpeg";
          return {
            mime_type: mime,
            data: Buffer.from(res.data, "binary").toString("base64")
          };
        }
        return {
          mime_type: "image/jpeg",
          data: imgInput.replace(/^data:image\/\w+;base64,/, "")
        };
      }
      return null;
    } catch (err) {
      this.log_proc("error", "Gagal memproses parsing image:", err.message);
      return null;
    }
  }
  async get_token(t) {
    try {
      if (t || this.tok) {
        this.tok = t || this.tok;
        return this.tok;
      }
      this.log_proc("info", "Mengambil token baru via Firebase Identity Toolkit...");
      const res = await axios.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${this.key}`, {
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: {
          ...this.baseHeaders,
          "Content-Type": "application/json"
        }
      });
      this.tok = res.data?.idToken || null;
      this.log_proc("success", "Token baru berhasil didapatkan.");
      return this.tok;
    } catch (err) {
      const errMsg = err.response?.data || err.message;
      this.log_proc("error", "Gagal mendapatkan token auth:", errMsg);
      throw err;
    }
  }
  async chat({
    token,
    prompt,
    messages = [],
    image,
    ...rest
  } = {}) {
    this.log_proc("info", "Memulai proses chat (Multimodal Gemini)...");
    try {
      const jwt = await this.get_token(token);
      const currentParts = [];
      if (image) {
        this.log_proc("info", "Mendeteksi adanya lampiran gambar, memulai perulangan instansiasi...");
        const imageList = Array.isArray(image) ? image : [image];
        for (const imgItem of imageList) {
          const resolved = await this._resolveImage(imgItem);
          if (resolved) {
            currentParts.push({
              inline_data: {
                mime_type: resolved.mime_type,
                data: resolved.data
              }
            });
          }
        }
        this.log_proc("success", `Berhasil memproses ${currentParts.length} gambar ke inline_data.`);
      }
      if (prompt) {
        currentParts.push({
          text: prompt
        });
      }
      const contents = messages.map(m => ({
        role: m.role || "user",
        parts: Array.isArray(m.parts) ? m.parts : [{
          text: m.content || m.text || ""
        }]
      }));
      if (currentParts.length > 0) {
        contents.push({
          role: "user",
          parts: currentParts
        });
      }
      const body = {
        model: "projects/ai-music-534ff/locations/us-central1/publishers/google/models/gemini-2.5-flash",
        contents: contents,
        ...rest
      };
      this.log_proc("info", "Mengirim payload chat ke Firebase Vertex AI...");
      const res = await axios.post(`https://firebasevertexai.googleapis.com/v1beta/projects/ai-music-534ff/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`, body, {
        headers: {
          "User-Agent": "Ktor client",
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          "x-goog-api-key": this.key,
          "x-goog-api-client": "gl-kotlin/2.2.0 fire/16.0.2",
          authorization: `Firebase ${jwt}`,
          "accept-charset": "UTF-8"
        }
      });
      this.log_proc("success", "Proses chat Gemini selesai menerima data.");
      return this.wrap_res(res.data);
    } catch (err) {
      const errMsg = err.response?.data || err.message;
      this.log_proc("error", "Terjadi kendala pada method chat:", errMsg);
      throw err;
    }
  }
  async create({
    token,
    prompt = "Instrumental Track",
    ref_prompt = "A romantic song about first encounters with Random voice, style Tense and genre Hip-hop",
    steps = 64,
    cfg_strength = 4,
    fcm_token = "dMLOS2uqS7SK2CKnCvu5lV:APA91bH5B9uq8cmNRQp6EdJxBubgpdG0k2C7cCk9gBkY2krMPPfuStRYS76X3xZoi5sx5ckh5-qsscgqa4egqRxOKZpm5zF3G88aEA7eWi54ij8ryNynAOM",
    ...rest
  } = {}) {
    this.log_proc("info", "Memulai inisiasi pembuatan musik baru...");
    try {
      const jwt = await this.get_token(token);
      const form = new FormData();
      const payload = {
        lyrics_text: prompt,
        ref_prompt: ref_prompt,
        steps: String(steps),
        cfg_strength: String(cfg_strength),
        fcm_token: fcm_token,
        ...rest
      };
      Object.entries(payload).forEach(([key, val]) => {
        form.append(key, val);
      });
      this.log_proc("info", "Mengirimkan multipart form-data ke API Music Generation...");
      const res = await axios.post(`${this.base}/api/v1/music/generate`, form, {
        headers: {
          "User-Agent": "okhttp/5.0.0-alpha.3",
          Connection: "Keep-Alive",
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/multipart-formdata",
          Authorization: `Bearer ${jwt}`,
          ...form.getHeaders()
        }
      });
      this.log_proc("success", "Request pembuatan musik berhasil masuk antrean server.");
      return this.wrap_res(res.data);
    } catch (err) {
      const errMsg = err.response?.data || err.message;
      this.log_proc("error", "Terjadi kendala pada method create:", errMsg);
      throw err;
    }
  }
  async status({
    token,
    task_id,
    output = "url",
    ...rest
  } = {}) {
    try {
      const id = task_id || rest.uid || rest.id;
      if (!id) {
        const errParam = new Error("Parameter task_id tidak ditemukan atau kosong.");
        this.log_proc("error", errParam.message);
        throw errParam;
      }
      this.log_proc("info", `Memeriksa status pengerjaan task ID: ${id}`);
      const jwt = await this.get_token(token);
      const res = await axios.get(`${this.base}/api/v1/music/generate/${id}`, {
        httpsAgent: this.sslAgent,
        headers: {
          "User-Agent": "okhttp/5.0.0-alpha.3",
          Connection: "Keep-Alive",
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          Authorization: `Bearer ${jwt}`
        },
        ...rest
      });
      this.log_proc("success", "Data status task berhasil ditarik dari server API.");
      const finalResult = this.wrap_res(res.data);
      if (finalResult.status === "completed" && finalResult.output_link && output) {
        if (output === "url") {
          this.log_proc("info", "Mengembalikan hasil akhir berupa direct link R2.");
          return {
            status: finalResult.status,
            task_id: finalResult.task_id,
            token: finalResult.token,
            data: finalResult.output_link
          };
        }
        if (output === "base64") {
          this.log_proc("info", "Mengunduh binary mp3 langsung dari CDN R2 Cloudflare...");
          try {
            const audioRes = await axios.get(finalResult.output_link, {
              responseType: "arraybuffer",
              httpsAgent: this.sslAgent
            });
            this.log_proc("info", "Mengonversi data stream binary audio ke string base64...");
            const base64Data = Buffer.from(audioRes.data, "binary").toString("base64");
            this.log_proc("success", "Konversi file audio R2 ke base64 berhasil.");
            return {
              status: finalResult.status,
              task_id: finalResult.task_id,
              token: finalResult.token,
              data: `data:audio/mp3;base64,${base64Data}`
            };
          } catch (audioErr) {
            this.log_proc("error", `Gagal mengunduh/mengonversi audio dari R2 (${finalResult.output_link}):`, audioErr.message);
            return finalResult;
          }
        }
      }
      return finalResult;
    } catch (err) {
      const errMsg = err.response?.data || err.message;
      this.log_proc("error", "Terjadi kendala pada method status:", errMsg);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["chat", "create", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=create&prompt=A song for Christmas"
      }
    });
  }
  const api = new MusicAI();
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
        break;
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'create'."
          });
        }
        response = await api.create(params);
        break;
      case "status":
        if (!params.token) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'token' wajib diisi untuk action 'status'."
          });
        }
        if (!params.task_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
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
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}