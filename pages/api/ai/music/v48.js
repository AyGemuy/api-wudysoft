import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class MusicAI {
  constructor() {
    this.tok = null;
    this.firebaseKey = "AIzaSyCfzvRBcSo9CbWRhlFU5R0USs4uUvPBR6g";
    this.talkyBase = "https://bot.talkyrunner.com";
    this.firebaseAuthUrl = "https://www.googleapis.com/identitytoolkit/v3/relyingparty";
    this.deviceId = crypto.randomUUID();
    this.baseHeaders = {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "X-Android-Package": "com.ai.music.song.generator",
      "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81",
      "Accept-Language": "id-ID, en-US",
      "X-Client-Version": "Android/Fallback/X23002001/FirebaseCore-Android",
      "X-Firebase-GMPID": "1:547451706749:android:5cd9af37fc0831113d0014",
      "X-Firebase-Client": "H4sIAAAAAAAA_6tWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA"
    };
    this.talkyHeaders = {
      "User-Agent": "okhttp/4.10.0",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
      "package-name": "com.ai.music.song.generator",
      "x-device-id": this.deviceId
    };
  }
  log_proc(type, msg, obj = "") {
    try {
      const ts = new Date().toISOString();
      const prefix = `[TalkyMusic][${ts}][${type.toUpperCase()}]`;
      obj ? console.log(`${prefix} ${msg}`, JSON.stringify(obj, null, 2)) : console.log(`${prefix} ${msg}`);
    } catch (e) {
      console.log("[Logger Error]", e.message);
    }
  }
  wrap_res(resData) {
    try {
      const raw = resData?.data || resData;
      return {
        status: true,
        code: resData?.code || 200,
        msg: resData?.msg || "success",
        token: this.tok,
        device_id: this.deviceId,
        ...raw
      };
    } catch (err) {
      this.log_proc("error", "Gagal wrap response:", err.message);
      return {
        status: false,
        token: this.tok,
        device_id: this.deviceId,
        error: err.message,
        ...resData
      };
    }
  }
  async solve_file(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) return input;
      if (input instanceof Uint8Array) return Buffer.from(input);
      if (typeof input === "string") {
        if (input.startsWith("data:")) {
          const b64 = input.split(",")[1];
          if (!b64) {
            this.log_proc("error", "solve_file: Data URL tidak valid.");
            return null;
          }
          return Buffer.from(b64, "base64");
        }
        if (/^https?:\/\//i.test(input)) {
          const {
            data
          } = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(data);
        }
        return Buffer.from(input, "base64");
      }
      this.log_proc("error", `solve_file: Tipe input tidak dikenal — ${typeof input}`);
      return null;
    } catch (err) {
      this.log_proc("error", "Gagal memproses file pada solve_file:", err.message);
      return null;
    }
  }
  async get_token(t) {
    try {
      if (t || this.tok) {
        this.tok = t || this.tok;
        return this.tok;
      }
      this.log_proc("info", `Device ID: ${this.deviceId}`);
      this.log_proc("info", "Mendaftar user anonim ke Firebase Identity...");
      const res = await axios.post(`${this.firebaseAuthUrl}/signupNewUser?key=${this.firebaseKey}`, {
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: this.baseHeaders
      });
      this.tok = res.data?.idToken || null;
      this.log_proc("success", "Token Firebase berhasil didapat.");
      return this.tok;
    } catch (err) {
      this.log_proc("error", "Gagal dapat token Firebase:", err.response?.data || err.message);
      return null;
    }
  }
  async get_account_info(token) {
    try {
      const jwt = await this.get_token(token);
      if (!jwt) return {
        status: false,
        error: "Token tidak tersedia atau gagal dibuat."
      };
      this.log_proc("info", "Mengambil profil akun Firebase...");
      const res = await axios.post(`${this.firebaseAuthUrl}/getAccountInfo?key=${this.firebaseKey}`, {
        idToken: jwt
      }, {
        headers: this.baseHeaders
      });
      return this.wrap_res(res.data);
    } catch (err) {
      this.log_proc("error", "Gagal ambil info akun:", err.response?.data || err.message);
      return {
        status: false,
        error: err.response?.data || err.message
      };
    }
  }
  async credits(token) {
    try {
      const jwt = await this.get_token(token);
      if (!jwt) return {
        status: false,
        error: "Token tidak tersedia atau gagal dibuat."
      };
      this.log_proc("info", "Memeriksa saldo kredit...");
      const res = await axios.get(`${this.talkyBase}/users/me/credits/v2`, {
        headers: {
          ...this.talkyHeaders,
          Authorization: `Bearer ${jwt}`
        }
      });
      return this.wrap_res(res.data);
    } catch (err) {
      this.log_proc("error", "Gagal ambil saldo kredit:", err.response?.data || err.message);
      return {
        status: false,
        error: err.response?.data || err.message
      };
    }
  }
  async create({
    token,
    prompt,
    style = "POP",
    title = "ggcyy",
    model = "V4_5",
    customMode = false,
    instrumental = false,
    firebaseToken = "fz93-3T1T0W1g6gDu0Rban:APA91bGyE2Sp3h3...",
    ...rest
  } = {}) {
    try {
      const jwt = await this.get_token(token);
      if (!jwt) return {
        status: false,
        error: "Token tidak tersedia atau gagal dibuat."
      };
      this.log_proc("info", `Queue Suno track: ${title} [Model: ${model}]`);
      const payload = {
        model: model,
        prompt: prompt,
        customMode: customMode,
        instrumental: instrumental,
        firebaseToken: firebaseToken,
        style: style,
        title: title,
        negativeTags: rest.negativeTags || "",
        vocalGender: rest.vocalGender || null,
        styleWeight: rest.styleWeight || null,
        weirdnessConstraint: rest.weirdnessConstraint || null,
        audioWeight: rest.audioWeight || null,
        ...rest
      };
      const res = await axios.post(`${this.talkyBase}/suno/generate`, payload, {
        headers: {
          ...this.talkyHeaders,
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`
        }
      });
      this.log_proc("success", "Task Suno berhasil dibuat.");
      return this.wrap_res(res.data);
    } catch (err) {
      this.log_proc("error", "Gagal buat lagu Suno:", err.response?.data || err.message);
      return {
        status: false,
        error: err.response?.data || err.message
      };
    }
  }
  async status({
    token,
    task_id
  } = {}) {
    try {
      if (!task_id) return {
        status: false,
        error: "Parameter task_id wajib diisi."
      };
      const jwt = await this.get_token(token);
      if (!jwt) return {
        status: false,
        error: "Token tidak tersedia atau gagal dibuat."
      };
      this.log_proc("info", `Cek status Suno Task: ${task_id}`);
      const res = await axios.get(`${this.talkyBase}/suno/status?taskId=${task_id}`, {
        headers: {
          ...this.talkyHeaders,
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`
        }
      });
      return this.wrap_res(res.data);
    } catch (err) {
      this.log_proc("error", "Gagal cek status task:", err.response?.data || err.message);
      return {
        status: false,
        error: err.response?.data || err.message
      };
    }
  }
  async lyrics({
    token,
    prompt
  } = {}) {
    try {
      const jwt = await this.get_token(token);
      if (!jwt) return {
        status: false,
        error: "Token tidak tersedia atau gagal dibuat."
      };
      this.log_proc("info", "Generate lirik AI...");
      const res = await axios.post(`${this.talkyBase}/suno/lyrics`, {
        prompt: prompt
      }, {
        headers: {
          ...this.talkyHeaders,
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`
        }
      });
      return this.wrap_res(res.data);
    } catch (err) {
      this.log_proc("error", "Gagal buat lirik:", err.response?.data || err.message);
      return {
        status: false,
        error: err.response?.data || err.message
      };
    }
  }
  async video({
    token,
    prompt,
    style = "cinematic",
    file1,
    file2
  } = {}) {
    try {
      const jwt = await this.get_token(token);
      if (!jwt) return {
        status: false,
        error: "Token tidak tersedia atau gagal dibuat."
      };
      this.log_proc("info", "Membuat video (multipart)...");
      const buf1 = await this.solve_file(file1);
      const buf2 = await this.solve_file(file2);
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("style", style);
      if (buf1) form.append("file1", buf1, {
        filename: "video1.mp4"
      });
      if (buf2) form.append("file2", buf2, {
        filename: "video2.mp4"
      });
      const res = await axios.post(`${this.talkyBase}/video/generate`, form, {
        headers: {
          ...this.talkyHeaders,
          Authorization: `Bearer ${jwt}`,
          ...form.getHeaders()
        }
      });
      return this.wrap_res(res.data);
    } catch (err) {
      this.log_proc("error", "Gagal generate video:", err.response?.data || err.message);
      return {
        status: false,
        error: err.response?.data || err.message
      };
    }
  }
  async voice({
    token,
    type,
    audio,
    voice,
    pureAudio,
    coverAudio,
    name = "MyClone",
    modelName = "my_voice_model",
    ...rest
  } = {}) {
    try {
      const jwt = await this.get_token(token);
      if (!jwt) return {
        status: false,
        error: "Token tidak tersedia atau gagal dibuat."
      };
      const bufAudio = await this.solve_file(audio);
      const bufVoice = await this.solve_file(voice);
      const bufPureAudio = await this.solve_file(pureAudio);
      const bufCoverAudio = await this.solve_file(coverAudio);
      const form = new FormData();
      let endpoint = "";
      if (type === "clone") {
        endpoint = "/suno/voice-clone";
        this.log_proc("info", "Voice cloning...");
        if (bufAudio) form.append("audio", bufAudio, {
          filename: "audio.mp3"
        });
        form.append("name", name);
        form.append("action", "clone");
        form.append("model_name", rest.model_name || "V4_5");
        form.append("firebaseToken", rest.firebaseToken || "YOUR_FIREBASE_TOKEN");
      } else if (type === "train") {
        endpoint = "/suno/voice-train";
        this.log_proc("info", "Voice training...");
        form.append("firebaseToken", rest.firebaseToken || "YOUR_FIREBASE_TOKEN");
        if (bufAudio) form.append("audio", bufAudio, {
          filename: "audio.mp3"
        });
        if (bufVoice) form.append("voice", bufVoice, {
          filename: "voice.mp3"
        });
      } else if (type === "cover") {
        endpoint = "/suno/cover";
        this.log_proc("info", "Voice cover swap...");
        if (bufPureAudio) form.append("pureAudio", bufPureAudio, {
          filename: "audio.mp3"
        });
        if (bufCoverAudio) form.append("coverAudio", bufCoverAudio, {
          filename: "cover.mp3"
        });
        if (rest.instant) {
          form.append("modelName", modelName);
          form.append("instant", "true");
        }
      } else {
        return {
          status: false,
          error: `Tipe voice tidak valid: '${type}'. Gunakan: clone | train | cover`
        };
      }
      const res = await axios.post(`${this.talkyBase}${endpoint}`, form, {
        headers: {
          ...this.talkyHeaders,
          Authorization: `Bearer ${jwt}`,
          ...form.getHeaders()
        }
      });
      return this.wrap_res(res.data);
    } catch (err) {
      this.log_proc("error", `Gagal voice [${type}]:`, err.response?.data || err.message);
      return {
        status: false,
        error: err.response?.data || err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["account", "credits", "create", "status", "lyrics", "video", "voice"];
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
      case "account":
        response = await api.get_account_info(params.token);
        break;
      case "credits":
        response = await api.credits(params.token);
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
      case "lyrics":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'lyrics'."
          });
        }
        response = await api.lyrics(params);
        break;
      case "video":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'video'."
          });
        }
        response = await api.video(params);
        break;
      case "voice":
        if (!params.type) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'type' wajib diisi untuk action 'voice' (clone | train | cover)."
          });
        }
        if (params.type === "clone" && !params.audio) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'audio' wajib diisi untuk action 'voice' type 'clone'."
          });
        }
        if (params.type === "train" && (!params.audio || !params.voice)) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'audio' dan 'voice' wajib diisi untuk action 'voice' type 'train'."
          });
        }
        if (params.type === "cover" && !params.pureAudio && !params.coverAudio) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'pureAudio' atau 'coverAudio' wajib diisi untuk action 'voice' type 'cover'."
          });
        }
        response = await api.voice(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    if (response && response.status === false) {
      return res.status(500).json({
        status: false,
        action: action,
        message: "Terjadi kegagalan pada pemrosesan internal API.",
        error: response.error || "Unknown internal error"
      });
    }
    return res.status(200).json({
      ...response,
      status: true,
      action: action
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