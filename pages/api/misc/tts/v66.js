import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
const BASE_URL = "https://voiceaimax.vn";
const CDN_BASE = "https://aimaxstudio1.pro.vn";
const RSA_KEY_B64 = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvgh6QH/MV/VA33G/Z0Hj0dj2yaZOLoCW8hLGE778E18qV2fZ4+Ys9u42snf7f98XPAskV34xmcTDCaQoYujMH9AUf7HWmSFO3wiEilpPiZdbeiLChcrZ7HJc/CJVo1QevU6i8cYcHu21E+lopjlymTv+yyhhL7sD8uyroCsVNtbAg71msRXJwLc1YrSrnC7K6mM/m98zQbqPGgKZAyrokNlefrmUa5no6wAzNuXxHSRQYWL6A+pqgVun3ltgXmn4iDes2RkqPQm5cHbtpvQD5VlE3eAfzD0BVEXfmWtXapKIEVAXDxVeHTBgYnXYDUocQX/MaRCBMTbd90o1hVc9kwIDAQAB";
const PEM = `-----BEGIN PUBLIC KEY-----\n${RSA_KEY_B64.match(/.{1,64}/g)?.join("\n") || ""}\n-----END PUBLIC KEY-----`;
const PUB_KEY = crypto.createPublicKey(PEM);
export class VoiceAiMax {
  constructor(cfg = {}) {
    this.baseUrl = cfg?.baseUrl || BASE_URL;
    this.cdnUrl = cfg?.cdnUrl || CDN_BASE;
    this.ua = cfg?.userAgent || "okhttp/4.12.0";
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 6e4,
      headers: {
        "User-Agent": this.ua,
        "Accept-Encoding": "gzip"
      }
    });
  }
  rnd() {
    return crypto.randomBytes(8).toString("hex");
  }
  slp(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  enc(deviceId) {
    const ts = Date.now();
    const payload = `${deviceId}_xox_hepham_xox_${ts}`;
    return crypto.publicEncrypt({
      key: PUB_KEY,
      padding: crypto.constants.RSA_PKCS1_PADDING
    }, Buffer.from(payload, "utf8")).toString("base64");
  }
  async chk(state) {
    const devId = state?.device_id || this.rnd();
    const token = this.enc(devId);
    let activeState = {
      device_id: devId,
      user_id_cipher: token,
      credit: state?.credit || 0,
      is_premium: state?.is_premium || false
    };
    if (!state?.device_id || state?.credit === undefined) {
      console.log(`[*] Inisialisasi state baru untuk device: ${devId}`);
      try {
        const {
          data
        } = await this.http.post("/mobile/api/v1/users/info", null, {
          params: {
            user_id: token
          }
        });
        activeState = {
          device_id: devId,
          user_id_cipher: this.enc(devId),
          credit: data?.credit ?? 0,
          is_premium: data?.is_premium ?? false
        };
        console.log(`[+] State siap. Saldo kredit: ${activeState.credit}`);
      } catch (err) {
        console.log(`[!] Gagal register info awal: ${err?.message || err}`);
      }
    }
    return activeState;
  }
  async getUserInfo({
    state
  }) {
    console.log("[*] Mengambil informasi akun user...");
    let currState = state;
    try {
      currState = await this.chk(state);
      const {
        data
      } = await this.http.post("/mobile/api/v1/users/info", null, {
        params: {
          user_id: this.enc(currState.device_id)
        }
      });
      currState.credit = data?.credit ?? currState.credit;
      currState.is_premium = data?.is_premium ?? currState.is_premium;
      return {
        status: true,
        result: {
          device_id: currState.device_id,
          credit: data?.credit ?? 0,
          is_premium: data?.is_premium ?? false,
          is_watch_voice_clone: data?.isWatchVoiceClone ?? false,
          lucky_count: data?.luckyCount ?? 0,
          is_shared: data?.isShared ?? false
        },
        state: currState
      };
    } catch (err) {
      console.log(`[!] getUserInfo gagal: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.response?.data || err?.message || "Gagal memuat info user."
        },
        state: currState
      };
    }
  }
  async searchVoices({
    state,
    query = "",
    language = "id",
    page = 0,
    limit = 100
  }) {
    console.log(`[*] Mencari suara: lang=${language}, query="${query}"...`);
    let currState = state;
    try {
      currState = await this.chk(state);
      const {
        data
      } = await this.http.get("/mobile/api/v1/voices", {
        params: {
          language: language || "id",
          page: Number(page) || 0,
          limit: Number(limit) || 100,
          user_id: this.enc(currState.device_id)
        }
      });
      let rawVoices = data?.voices || [];
      if (query?.trim()) {
        const q = query.toLowerCase();
        rawVoices = rawVoices.filter(v => v?.name?.toLowerCase()?.includes(q) || v?.description?.toLowerCase()?.includes(q) || v?.category?.toLowerCase()?.includes(q) || v?.use_case?.toLowerCase()?.includes(q));
      }
      const formattedVoices = rawVoices.map(v => ({
        voice_id: v?.voice_id || "",
        name: v?.name || "",
        name_vi: v?.name_vi || "",
        description: v?.description || "",
        gender: v?.gender || "",
        age: v?.age || "",
        accent: v?.accent || "",
        language: v?.language || "",
        category: v?.category || "",
        use_case: v?.use_case || "",
        descriptive: v?.descriptive || "",
        preview_url: v?.preview_url || "",
        provider: v?.provider || "",
        cloned_by_count: v?.cloned_by_count ?? 0,
        rate: v?.rate ?? 1,
        free_users_allowed: v?.free_users_allowed ?? true,
        created_at: v?.created_at || ""
      }));
      console.log(`[+] Ditemukan ${formattedVoices.length} suara.`);
      return {
        status: true,
        result: {
          voices: formattedVoices,
          total: data?.total ?? formattedVoices.length,
          page: data?.page ?? page,
          limit: data?.limit ?? limit,
          has_more: data?.has_more ?? false
        },
        state: currState
      };
    } catch (err) {
      console.log(`[!] searchVoices gagal: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.response?.data || err?.message || "Gagal mencari suara."
        },
        state: currState
      };
    }
  }
  async generateVoice({
    state,
    text,
    voice_id = "x5tvfc5X0Qh4cqmLpgrs",
    speed = 1,
    pitch = 0,
    vol = 1,
    model = "speech-2.8-hd",
    language = "Indonesian"
  }) {
    console.log(`[*] Generate Voice: voice_id=${voice_id}, text="${text?.slice?.(0, 30)}..."`);
    let currState = state;
    try {
      currState = await this.chk(state);
      const form = new FormData();
      const textPart = {
        contentType: "text/plain; charset=utf-8"
      };
      const reqCredit = Math.max(1, (text || "").length);
      form.append("voice_id", voice_id, textPart);
      form.append("credit", String(reqCredit), textPart);
      form.append("text", text || "", textPart);
      form.append("speed", String(speed || 1), textPart);
      form.append("pitch", String(pitch ?? 0), textPart);
      form.append("vol", String(vol || 1), textPart);
      form.append("model", model || "speech-2.8-hd", textPart);
      form.append("language", language || "Indonesian", textPart);
      form.append("user_id", this.enc(currState.device_id), textPart);
      console.log(`[*] Mengirim task generate (credit: ${reqCredit})...`);
      const {
        data: genRes
      } = await this.http.post("/mobile/api/v1/tts/generate", form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity
      });
      const jobId = genRes?.job_id;
      if (!jobId) throw new Error("Server tidak mengembalikan job_id.");
      console.log(`[+] Task diterima server. Job ID: ${jobId}`);
      let jobData = null;
      const startTime = Date.now();
      const timeoutMs = 18e4;
      while (Date.now() - startTime < timeoutMs) {
        await this.slp(3e3);
        const {
          data: pollRes
        } = await this.http.get(`/mobile/api/v1/tts/jobs/${jobId}`, {
          params: {
            user_id: this.enc(currState.device_id)
          }
        });
        console.log(`[*] Polling ${jobId}: ${pollRes?.status} (${pollRes?.chunks_success}/${pollRes?.chunks_total})`);
        if (pollRes?.status === "success") {
          jobData = pollRes;
          break;
        }
        if (pollRes?.status === "failed") {
          throw new Error(`Job gagal diproses: ${pollRes?.error_message || "Unknown server error"}`);
        }
      }
      if (!jobData?.audio_url) {
        throw new Error("Timeout menunggu penyelesaian generate audio dari server.");
      }
      const targetAudioUrl = jobData.audio_url.startsWith("http") ? jobData.audio_url : `${this.cdnUrl}${jobData.audio_url}`;
      console.log(`[+] Sukses! Audio URL: ${targetAudioUrl}`);
      return {
        status: true,
        result: {
          job_id: jobId,
          audio_url: targetAudioUrl,
          credit_used: jobData?.credit ?? reqCredit,
          chunks_total: jobData?.chunks_total ?? 1,
          chunks_success: jobData?.chunks_success ?? 1,
          voice_name: jobData?.voice_name || "",
          created_at: jobData?.created_at || new Date().toISOString()
        },
        state: currState
      };
    } catch (err) {
      console.log(`[!] generateVoice gagal: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.response?.data || err?.message || "Gagal memproses generate suara."
        },
        state: currState
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};
  const valid_actions = ["list", "search", "generate", "tts", "info"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          list: "/?action=list&language=id&page=0&limit=50",
          search: "/?action=search&q=Putra&language=id",
          generate: "/?action=generate&text=Halo+dunia&voice_id=x5tvfc5X0Qh4cqmLpgrs&speed=1.0",
          tts: "/?action=tts&text=Selamat+pagi&voice_id=RWiGLY9uXI70QL540WNd",
          info: "/?action=info"
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
  const api = new VoiceAiMax();
  try {
    let response;
    switch (action) {
      case "info":
        response = await api.getUserInfo(params);
        break;
      case "list":
        response = await api.searchVoices({
          language: params.language || params.lang || "id",
          page: params.page || 0,
          limit: params.limit || 100,
          ...params
        });
        break;
      case "search": {
        const query = params.q || params.query || params.name;
        if (!query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'q' (atau 'query') wajib diisi untuk search."
          });
        }
        response = await api.searchVoices({
          query: query,
          language: params.language || params.lang || "id",
          ...params
        });
        break;
      }
      case "tts":
      case "generate": {
        const text = params.text || params.prompt;
        if (!text) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' (atau 'prompt') wajib diisi untuk generate TTS."
          });
        }
        response = await api.generateVoice({
          text: text,
          voice_id: params.voice_id || params.voiceId,
          speed: params.speed ? Number(params.speed) : 1,
          pitch: params.pitch ? Number(params.pitch) : 0,
          vol: params.vol ? Number(params.vol) : 1,
          model: params.model || "speech-2.8-hd",
          language: params.language || "Indonesian",
          ...params
        });
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response || response?.status === false || !response?.result) {
      return res.status(502).json({
        status: false,
        action: action,
        error: response?.result?.error_message || "Server target tidak memberikan respon atau data kosong.",
        result: response?.result || null
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