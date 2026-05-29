import axios from "axios";
import FormData from "form-data";
import ApiKey from "@/configs/api-key";
class PoyoAPI {
  constructor() {
    this.key = ApiKey.poyo;
    this.baseUrl = "https://api.poyo.ai";
    this.validKeys = [];
    this.isChecked = false;
    this.allowedTypes = ["chat", "image", "video", "music"];
    this.defaultModels = {
      chat: "gpt-5.2",
      image: "gpt-image-1.5",
      video: "sora-2",
      music: "generate-music"
    };
  }
  log(msg, data = "") {
    console.log(`[PoyoAPI-Log] ${msg}`, data);
  }
  async check() {
    this.log("Memulai validasi API keys...");
    this.validKeys = [];
    for (const token of this.key) {
      try {
        this.log(`Memeriksa token: ${token.slice(0, 12)}...`);
        const res = await axios.get(`${this.baseUrl}/api/user/balance`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const balance = res.data?.data?.credits_amount ?? 0;
        if (res.data?.code === 200 && balance > 0) {
          this.log(`Token aktif! Balance: ${balance}`);
          this.validKeys.push(token);
        } else {
          this.log(`Token dilewati: Balance habis/tidak valid (${balance})`);
        }
      } catch (err) {
        this.log(`Error validasi token: ${err.message}`);
      }
    }
    this.isChecked = true;
    this.log(`Validasi selesai. Total key aktif: ${this.validKeys.length}`);
    return this.validKeys;
  }
  async getTk() {
    if (!this.isChecked) {
      this.log("Menjalankan auto-check key sebelum eksekusi request...");
      await this.check();
    }
    const targetList = this.validKeys.length > 0 ? this.validKeys : this.key;
    if (targetList.length === 0) {
      this.log("Error: Tidak ada API Key yang tersedia");
      return null;
    }
    return targetList[Math.floor(Math.random() * targetList.length)];
  }
  async toBuffer(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (input.startsWith("data:image")) {
          const base64Str = input.split(",")[1] || input;
          return Buffer.from(base64Str, "base64");
        }
        return Buffer.from(input, "base64");
      }
    } catch (err) {
      this.log(`Gagal konversi input ke Buffer: ${err.message}`);
    }
    return null;
  }
  async upload(args) {
    try {
      const {
        image
      } = args ?? {};
      if (!image) return {
        error: "Input image diperlukan"
      };
      const token = await this.getTk();
      if (!token) return {
        error: "Tidak ada API Key yang tersedia"
      };
      this.log("Memproses upload gambar (single)...");
      const bufferData = await this.toBuffer(image);
      if (!bufferData) return {
        error: "Gagal mengonversi gambar ke buffer murni."
      };
      const form = new FormData();
      form.append("file", bufferData, {
        filename: "upload.jpg",
        contentType: "image/jpeg"
      });
      form.append("fileName", "upload.jpg");
      const res = await axios.post(`${this.baseUrl}/api/common/upload`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...form.getHeaders()
        }
      });
      this.log("Upload selesai.");
      return res.data ?? {};
    } catch (err) {
      this.log(`Error di upload(): ${err.response?.data?.message || err.message}`);
      return err.response?.data ?? {
        error: err.message
      };
    }
  }
  async create(args) {
    try {
      const {
        type,
        model,
        ...rest
      } = args ?? {};
      if (!type || !this.allowedTypes.includes(type)) {
        return {
          error: `Property 'type' wajib diisi. Pilihan: ${this.allowedTypes.join(", ")}`
        };
      }
      const selectedModel = model || this.defaultModels[type];
      const token = await this.getTk();
      if (!token) return {
        error: "Tidak ada API Key yang tersedia"
      };
      this.log(`Membuat task [${type}] - Model: ${selectedModel}`);
      let url = "";
      let payload = {};
      switch (type) {
        case "chat":
          if (!rest.messages || !Array.isArray(rest.messages) || rest.messages.length === 0) {
            return {
              error: "Property 'messages' (Array) wajib diisi untuk type chat."
            };
          }
          url = `${this.baseUrl}/v1/chat/completions`;
          payload = {
            model: selectedModel,
            ...rest
          };
          break;
        case "image":
        case "video":
        case "music":
          if (!rest.prompt) {
            return {
              error: `Property 'prompt' wajib diisi untuk type ${type}.`
            };
          }
          url = `${this.baseUrl}/api/generate/submit`;
          payload = {
            model: selectedModel,
            input: {
              ...rest
            }
          };
          if (rest.callback_url) {
            payload.callback_url = rest.callback_url;
            delete payload.input.callback_url;
          }
          break;
        default:
          return {
            error: "Type tidak dikenali"
          };
      }
      const res = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      this.log("Task / Request berhasil disubmit.");
      return res.data ?? {};
    } catch (err) {
      this.log(`Error di create(): ${err.response?.data || err.message}`);
      return err.response?.data ?? {
        error: err.message
      };
    }
  }
  async status(args) {
    try {
      const {
        type,
        task_id,
        ...rest
      } = args ?? {};
      if (!type || !this.allowedTypes.includes(type)) {
        return {
          error: `Property 'type' wajib diisi. Pilihan: ${this.allowedTypes.join(", ")}`
        };
      }
      const id = task_id || rest.id || "";
      if (!id) return {
        error: "Property 'task_id' wajib diisi."
      };
      const token = await this.getTk();
      if (!token) return {
        error: "Tidak ada API Key yang tersedia"
      };
      this.log(`Memeriksa status task ID: ${id} [${type}]`);
      let url = "";
      switch (type) {
        case "music":
          url = `${this.baseUrl}/api/generate/detail/music?task_id=${id}`;
          break;
        case "chat":
          return {
            error: "Type chat tidak mendukung pengecekan status task id (Direct Response)."
          };
        case "image":
        case "video":
        default:
          url = `${this.baseUrl}/api/generate/status/${id}`;
          break;
      }
      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return res.data ?? {};
    } catch (err) {
      this.log(`Error di status(): ${err.response?.data || err.message}`);
      return err.response?.data ?? {
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
  const validActions = ["create", "status", "upload"];
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
  const api = new PoyoAPI();
  try {
    let response;
    switch (action) {
      case "create":
        response = await api.create(params);
        if (response.error) return res.status(400).json({
          status: false,
          ...response
        });
        return res.status(200).json({
          ...response
        });
      case "status":
        response = await api.status(params);
        if (response.error) return res.status(400).json({
          status: false,
          ...response
        });
        return res.status(200).json({
          ...response
        });
      case "upload":
        response = await api.upload(params);
        if (response.error) return res.status(400).json({
          status: false,
          ...response
        });
        return res.status(200).json({
          ...response
        });
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