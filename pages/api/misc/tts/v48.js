import axios from "axios";
import crypto from "crypto";
class Voiser {
  constructor() {
    this.url = "https://app-tts.voiser.ai";
    this.lang = "en_US";
    this.client = axios.create({
      baseURL: this.url,
      headers: {
        "User-Agent": "Dart/3.5 (dart:io)",
        "Content-Type": "application/json; charset=utf-8",
        "X-Client-Platform": "android",
        "X-Request-Timestamp": Date.now().toString()
      }
    });
  }
  _rcId() {
    return `rc_${crypto.randomBytes(8).toString("hex")}`;
  }
  async _code(code) {
    if (code) return code;
    console.log("[Voiser] [DEBUG] Auto-Registering new member...");
    const auth = await this.reg();
    return auth.success ? auth.member_code : null;
  }
  async reg() {
    console.log("[Voiser] [POST] /members");
    try {
      const res = await this.client.post("/members", {
        mac: null,
        platform: "android",
        revenuecatId: this._rcId()
      });
      return {
        success: true,
        member_code: res.data.memberCode,
        ...res.data
      };
    } catch (err) {
      console.error("[Voiser] [ERROR] reg:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async filter({
    code = null
  }) {
    console.log("[Voiser] [GET] /tts-filters");
    try {
      const activeCode = await this._code(code);
      const res = await this.client.get("/tts-filters", {
        params: {
          lang: this.lang
        }
      });
      return {
        success: true,
        member_code: activeCode,
        ...res.data
      };
    } catch (err) {
      console.error("[Voiser] [ERROR] filter:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async voices({
    code = null,
    language = "en_US",
    gender = "",
    mood = "",
    limit = "5",
    page = 0
  }) {
    console.log("[Voiser] [POST] /tts-voices");
    try {
      const activeCode = await this._code(code);
      const res = await this.client.post("/tts-voices", {
        language: language,
        gender: gender,
        mood: mood,
        page: page,
        maxRecordCount: limit,
        lang: this.lang,
        isPopular: null,
        isNew: null
      });
      return {
        success: true,
        member_code: activeCode,
        ...res.data
      };
    } catch (err) {
      console.error("[Voiser] [ERROR] voices:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async detail({
    code = null,
    id = ""
  }) {
    console.log("[Voiser] [GET] /members");
    try {
      const activeCode = await this._code(code);
      const res = await this.client.get("/members", {
        params: {
          id: id || activeCode,
          lang: this.lang
        }
      });
      return {
        success: true,
        member_code: activeCode,
        ...res.data
      };
    } catch (err) {
      console.error("[Voiser] [ERROR] detail:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async create({
    code = null,
    text = "",
    voice_id = "125",
    pitch = 0,
    speed = 1,
    mood = "friendly",
    filter = false,
    voices = false,
    history = false
  }) {
    console.log("[Voiser] [POST] /tts");
    try {
      if (!text?.trim()) return {
        success: false,
        error: "Required parameter: text"
      };
      const activeCode = await this._code(code);
      const res = await this.client.post("/tts", {
        memberCode: activeCode,
        text: text,
        voiceId: voice_id,
        pitch: pitch,
        speed: speed,
        mood: mood,
        lang: this.lang
      });
      let result = {
        success: true,
        member_code: activeCode,
        ...res.data
      };
      if (filter) {
        console.log("[Voiser] [EXTRA] Fetching filter data...");
        const extraFilter = await this.filter({
          code: activeCode
        });
        if (extraFilter.success) result.filter_data = extraFilter;
      }
      if (voices) {
        console.log("[Voiser] [EXTRA] Fetching voices data...");
        const extraVoices = await this.voices({
          code: activeCode,
          mood: mood
        });
        if (extraVoices.success) result.voices_data = extraVoices;
      }
      if (history) {
        console.log("[Voiser] [EXTRA] Fetching history data...");
        const extraHistory = await this.history({
          code: activeCode
        });
        if (extraHistory.success) result.history_data = extraHistory;
      }
      return result;
    } catch (err) {
      console.error("[Voiser] [ERROR] create:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async history({
    code = null,
    page = 0
  }) {
    console.log("[Voiser] [GET] /tts");
    try {
      const activeCode = await this._code(code);
      const res = await this.client.get("/tts", {
        params: {
          lang: this.lang,
          page: page,
          memberCode: activeCode
        }
      });
      return {
        success: true,
        member_code: activeCode,
        ...res.data
      };
    } catch (err) {
      console.error("[Voiser] [ERROR] history:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["create", "voices", "filter", "history", "reg", "detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=create&text=Halo+dunia&filter=true&history=true"
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: "${action}".`,
      valid_actions: validActions
    });
  }
  const api = new Voiser();
  try {
    let response;
    switch (action) {
      case "create":
        if (!params.text) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' wajib diisi untuk action 'create'."
          });
        }
        response = await api.create(params);
        break;
      case "voices":
        response = await api.voices(params);
        break;
      case "filter":
        response = await api.filter(params);
        break;
      case "history":
        if (!params.code) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'code' wajib diisi untuk action 'history'."
          });
        }
        response = await api.history(params);
        break;
      case "reg":
        response = await api.reg();
        break;
      case "detail":
        if (!params.code) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'code' wajib diisi untuk action 'detail'."
          });
        }
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
    }
    if (response && response.success) {
      return res.status(200).json({
        status: true,
        action: action,
        ...response
      });
    } else {
      return res.status(400).json({
        status: false,
        action: action,
        error: response?.error || "Gagal memproses request ke Voiser API."
      });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}