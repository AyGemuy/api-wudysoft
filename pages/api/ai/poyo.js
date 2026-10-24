import axios from "axios";
import FormData from "form-data";
import ApiKey from "@/configs/api-key";

// ─── Blacklist global untuk key yang balas 401 ────────────────────────────────
// Module-level: persist selama instance function masih warm.
// Cold start = reset. Untuk persistensi sejati, gunakan Redis/DB.
const invalidKeys = new Set();

class PoyoAPI {
  constructor() {
    this.key = Array.isArray(ApiKey.poyo)
      ? ApiKey.poyo.filter(Boolean)
      : ApiKey.poyo
        ? [ApiKey.poyo]
        : [];
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

  /** Tandai key sebagai invalid (401) */
  markInvalid(key) {
    if (typeof key !== "string" || !key) return;
    if (!invalidKeys.has(key)) {
      invalidKeys.add(key);
      this.log(`Key di-blacklist (401): ${key.slice(0, 12)}...`);
    }
  }

  /** Hapus dari blacklist kalau ternyata key bisa sukses lagi */
  markRecovered(key) {
    if (typeof key !== "string" || !key) return;
    if (invalidKeys.has(key)) {
      invalidKeys.delete(key);
      this.log(`Key pulih dari blacklist: ${key.slice(0, 12)}...`);
    }
  }

  async check() {
    this.log("Memulai validasi API keys...");
    this.validKeys = [];

    const candidates = this.key.filter(k => k && !invalidKeys.has(k));
    if (candidates.length === 0) {
      this.log("Tidak ada kandidat key (semua sudah 401 / tidak tersedia).");
    }

    for (const token of candidates) {
      try {
        this.log(`Memeriksa token: ${token.slice(0, 12)}...`);
        const res = await axios.get(`${this.baseUrl}/api/user/balance`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const balance = res.data?.data?.credits_amount ?? 0;
        if (res.data?.code === 200 && balance > 0) {
          this.log(`Token aktif! Balance: ${balance}`);
          this.validKeys.push(token);
        } else {
          this.log(`Token dilewati: Balance habis/tidak valid (${balance})`);
        }
      } catch (err) {
        if (err.response?.status === 401) {
          this.markInvalid(token);
          continue;
        }
        this.log(`Error validasi token: ${err.message}`);
      }
    }

    this.isChecked = true;
    this.log(
      `Validasi selesai. Total key aktif: ${this.validKeys.length}, invalid: ${invalidKeys.size}`
    );
    return this.validKeys;
  }

  /**
   * Eksekusi request dengan auto-skip key 401.
   * - Custom key (dari user): dicoba sekali, 401 → blacklist & berhenti.
   * - Pool key: loop, 401 → blacklist & lanjut key berikutnya.
   * - Non-401 error: langsung return error (perilaku lama).
   */
  async _runWithKeys(customKey, requestFn) {
    // ── Custom key ──────────────────────────────────────────────────────────
    if (customKey && typeof customKey === "string" && customKey.trim()) {
      const token = customKey.trim();
      try {
        const resp = await requestFn(token);
        this.markRecovered(token);
        return resp;
      } catch (err) {
        if (err.response?.status === 401) this.markInvalid(token);
        return err.response?.data ?? { error: err.message };
      }
    }

    // ── Pool key ────────────────────────────────────────────────────────────
    if (!this.isChecked) {
      this.log("Menjalankan auto-check key sebelum eksekusi request...");
      await this.check();
    }

    // Prioritaskan validKeys; kalau habis di-blacklist, fallback ke pool penuh
    let base = this.validKeys.length > 0 ? this.validKeys : this.key;
    let keysToTry = base.filter(k => k && !invalidKeys.has(k));

    if (keysToTry.length === 0 && this.validKeys.length > 0) {
      // validKeys habis di-blacklist → fallback ke seluruh pool yang belum 401
      this.log("validKeys habis di-blacklist, fallback ke pool penuh...");
      keysToTry = this.key.filter(k => k && !invalidKeys.has(k));
    }

    if (keysToTry.length === 0) {
      return {
        error: "Semua API Key Poyo telah di-skip (401) atau tidak tersedia.",
        invalid_count: invalidKeys.size
      };
    }

    let lastErr;
    for (let i = 0; i < keysToTry.length; i++) {
      const token = keysToTry[i];
      try {
        this.log(`Eksekusi request | key_idx=${i} | token=${token.slice(0, 12)}...`);
        const resp = await requestFn(token);
        this.markRecovered(token);
        return resp;
      } catch (err) {
        lastErr = err;
        if (err.response?.status === 401) {
          this.markInvalid(token);
          this.log(`SKIP-401 key_idx=${i}, lanjut key berikutnya`);
          continue;
        }
        // Non-401: hentikan loop, kembalikan error seperti perilaku lama
        return err.response?.data ?? { error: err.message };
      }
    }

    return (
      lastErr?.response?.data ?? {
        error: lastErr?.message || "Semua key gagal (401)"
      }
    );
  }

  async toBuffer(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          const res = await axios.get(input, { responseType: "arraybuffer" });
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
    const { image, key, api_key } = args ?? {};
    if (!image) return { error: "Input image diperlukan" };

    const bufferData = await this.toBuffer(image);
    if (!bufferData) {
      return { error: "Gagal mengonversi gambar ke buffer murni." };
    }

    return this._runWithKeys(key || api_key, async (token) => {
      this.log("Memproses upload gambar (single)...");
      // FormData dibuat ulang per-attempt agar stream tidak terpakai ulang saat retry
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
      const responseData = res.data ?? {};
      return {
        ...(typeof responseData === "object" ? responseData : { data: responseData }),
        key_used: token
      };
    });
  }

  async create(args) {
    const { type, model, key, api_key, ...rest } = args ?? {};

    if (!type || !this.allowedTypes.includes(type)) {
      return {
        error: `Property 'type' wajib diisi. Pilihan: ${this.allowedTypes.join(", ")}`
      };
    }

    const selectedModel = model || this.defaultModels[type];

    let url = "";
    let payload = {};

    switch (type) {
      case "chat":
        if (!rest.messages || !Array.isArray(rest.messages) || rest.messages.length === 0) {
          return { error: "Property 'messages' (Array) wajib diisi untuk type chat." };
        }
        url = `${this.baseUrl}/v1/chat/completions`;
        payload = { model: selectedModel, ...rest };
        break;

      case "image":
      case "video":
      case "music":
        if (!rest.prompt) {
          return { error: `Property 'prompt' wajib diisi untuk type ${type}.` };
        }
        url = `${this.baseUrl}/api/generate/submit`;
        payload = { model: selectedModel, input: { ...rest } };
        if (rest.callback_url) {
          payload.callback_url = rest.callback_url;
          delete payload.input.callback_url;
        }
        break;

      default:
        return { error: "Type tidak dikenali" };
    }

    return this._runWithKeys(key || api_key, async (token) => {
      this.log(`Membuat task [${type}] - Model: ${selectedModel}`);
      const res = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      this.log("Task / Request berhasil disubmit.");
      const responseData = res.data ?? {};
      return {
        ...(typeof responseData === "object" ? responseData : { data: responseData }),
        key_used: token
      };
    });
  }

  async status(args) {
    const { type, task_id, key, api_key, ...rest } = args ?? {};

    if (!type || !this.allowedTypes.includes(type)) {
      return {
        error: `Property 'type' wajib diisi. Pilihan: ${this.allowedTypes.join(", ")}`
      };
    }

    const id = task_id || rest.id || "";
    if (!id) return { error: "Property 'task_id' wajib diisi." };

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

    return this._runWithKeys(key || api_key, async (token) => {
      this.log(`Memeriksa status task ID: ${id} [${type}]`);
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const responseData = res.data ?? {};
      return {
        ...(typeof responseData === "object" ? responseData : { data: responseData }),
        key_used: token
      };
    });
  }
}

export default async function handler(req, res) {
  const { action, ...params } = req.method === "GET" ? req.query : req.body;
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
        if (response.error) {
          return res.status(400).json({ status: false, ...response });
        }
        return res.status(200).json({ ...response });

      case "status":
        response = await api.status(params);
        if (response.error) {
          return res.status(400).json({ status: false, ...response });
        }
        return res.status(200).json({ ...response });

      case "upload":
        response = await api.upload(params);
        if (response.error) {
          return res.status(400).json({ status: false, ...response });
        }
        return res.status(200).json({ ...response });

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