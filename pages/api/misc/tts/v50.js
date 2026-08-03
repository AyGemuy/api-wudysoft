import axios from "axios";
import FormData from "form-data";

function toSnakeCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  } else if (obj !== null && typeof obj === "object" && obj.constructor === Object) {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}
class AiConvert {
  constructor() {
    this.clientVoices = axios.create({
      baseURL: "https://aiconvert.online/api",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "*/*",
        Referer: "https://aiconvert.online/text-to-speech",
        "Accept-Language": "id-ID"
      }
    });
    this.clientTts = axios.create({
      baseURL: "https://pint2.aiarabai.com/api",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "*/*",
        Origin: "https://aiconvert.online",
        Referer: "https://aiconvert.online/",
        "Accept-Language": "id-ID"
      }
    });
  }
  async voiceList() {
    console.log("[AiConvert] [GET] /tts-voices");
    try {
      const res = await this.clientVoices.get("/tts-voices");
      return {
        success: true,
        ...toSnakeCase(res.data)
      };
    } catch (err) {
      console.error("[AiConvert] [ERROR] voiceList:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async create({
    text = "",
    voice = "en-US-AvaMultilingualNeural",
    rate = "0",
    pitch = "0"
  }) {
    console.log("[AiConvert] [POST] /tts");
    try {
      if (!text?.trim()) {
        return {
          success: false,
          error: "Required parameter: text"
        };
      }
      const form = new FormData();
      form.append("text", text);
      form.append("voice", voice);
      form.append("rate", String(rate));
      form.append("pitch", String(pitch));
      const res = await this.clientTts.post("/tts", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      const data = toSnakeCase(res.data);
      if (data.status === "QUEUED" && data.task_id) {
        console.log(`[AiConvert] Task queued. ID: ${data.task_id}. Polling status...`);
        return await this._pollStatus(data.task_id);
      }
      return {
        success: false,
        error: "Failed to queue TTS task",
        details: data
      };
    } catch (err) {
      console.error("[AiConvert] [ERROR] create:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async _pollStatus(taskId, maxAttempts = 30, interval = 1e3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await this.clientTts.get(`/status/${taskId}`);
        const data = toSnakeCase(res.data);
        if (data.status === "SUCCESS") {
          return {
            success: true,
            content_type: data.content_type || "audio/mpeg",
            buffer: Buffer.from(data.result_b64, "base64")
          };
        }
        if (data.status === "FAILED") {
          return {
            success: false,
            error: "TTS Generation failed on remote server"
          };
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (err) {
        console.error(`[AiConvert] [POLL ERROR] Attempt ${attempt}:`, err.message);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    return {
      success: false,
      error: "Polling timeout reached before task completed"
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["create", "voice_list"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=create&text=Halo+dunia"
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
  const api = new AiConvert();
  try {
    switch (action) {
      case "create": {
        if (!params.text) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' wajib diisi untuk action 'create'."
          });
        }
        const audioResult = await api.create(params);
        if (audioResult && audioResult.success) {
          res.setHeader("Content-Type", audioResult.content_type);
          res.setHeader("Content-Disposition", 'inline; filename="generated_audio.mp3"');
          return res.status(200).send(audioResult.buffer);
        } else {
          return res.status(400).json({
            status: false,
            action: action,
            error: audioResult?.error || "Gagal memproses request TTS."
          });
        }
      }
      case "voice_list": {
        const response = await api.voiceList();
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
            error: response?.error || "Gagal mengambil daftar suara."
          });
        }
      }
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