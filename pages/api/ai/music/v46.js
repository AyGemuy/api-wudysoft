import axios from "axios";
class MusicGen {
  constructor() {
    this.base = "https://api.acedata.cloud";
    this.client = axios.create({
      baseURL: this.base,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer e603e0381e034a3cb4e50d9c67fe4664"
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
    action = "generate",
    prompt,
    ...rest
  } = {}) {
    if (!prompt) {
      return this.err("create", 'Parameter "prompt" wajib diisi.');
    }
    this.log("Memulai pembuatan musik via Acedata...", prompt);
    try {
      const payload = {
        model: "chirp-v4",
        action: action,
        prompt: prompt,
        custom: false,
        instrumental: false,
        async: true,
        ...rest
      };
      const res = await this.client.post("/suno/audios", payload);
      this.log("Respon Acedata (Create):", res.data);
      return {
        status: res.data?.task_id ? "success" : "failed",
        task_id: res.data?.task_id || null
      };
    } catch (e) {
      return this.err("create", e.response?.data?.message || e.message);
    }
  }
  async status({
    task_id,
    ...rest
  } = {}) {
    if (!task_id) {
      return this.err("status", 'Parameter "task_id" wajib diisi.');
    }
    this.log(`Memeriksa status task Acedata: ${task_id}`);
    try {
      const payload = {
        id: task_id,
        action: "retrieve",
        ...rest
      };
      const res = await this.client.post("/suno/tasks", payload);
      this.log("Respon Acedata (Status):", res.data);
      return {
        status: res.data?.status || "success",
        result: res.data
      };
    } catch (e) {
      return this.err("status", e.response?.data?.message || e.message);
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
        example: "/?action=create&prompt=A song for Christmas"
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