import axios from "axios";
class MusicGen {
  constructor() {
    this.base = "https://musicgenerator-plqy.onrender.com";
    this.client = axios.create({
      baseURL: this.base,
      headers: {
        "User-Agent": "okhttp/4.12.0",
        "Accept-Encoding": "gzip"
      }
    });
  }
  log(msg, data = "") {
    console.log(`[MusicGen] ${msg}`, data);
  }
  err(op, msg) {
    console.error(`[Error] ${op} gagal:`, msg);
    return {
      status: "failed",
      error: msg
    };
  }
  async create({
    prompt,
    ...rest
  } = {}) {
    if (!prompt) {
      return this.err("create", 'Parameter "prompt" wajib diisi.');
    }
    this.log("Memulai pembuatan musik...", prompt);
    try {
      const payload = {
        duration: 20,
        model_version: "pphu/musicgen-small",
        ...rest,
        prompt: prompt
      };
      const res = await this.client.post("/generate", payload);
      this.log("Respon dapat:", res.data);
      return {
        status: res.data?.status ? res.data.status : "unknown",
        task_id: res.data?.predictionId ? res.data.predictionId : null
      };
    } catch (e) {
      return this.err("create", e.message);
    }
  }
  async status({
    task_id,
    ...rest
  } = {}) {
    if (!task_id) {
      return this.err("status", 'Parameter "task_id" wajib diisi.');
    }
    this.log(`Memeriksa status task: ${task_id}`);
    try {
      const res = await this.client.get(`/status/${task_id}`, rest);
      this.log("Respon status:", res.data);
      const audio = res.data?.audioURL ? res.data.audioURL : null;
      return {
        status: res.data?.status ? res.data.status : "unknown",
        result: audio || res.data
      };
    } catch (e) {
      return this.err("status", e.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["create", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=create&prompt=test"
      }
    });
  }
  const api = new MusicGen();
  try {
    let response;
    switch (action) {
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