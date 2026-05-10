import axios from "axios";
import crypto from "crypto";
const CFG = {
  baseURL: "https://rhwrxjwopakjvhffdded.supabase.co",
  apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJod3J4andvcGFranZoZmZkZGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjgzNzAsImV4cCI6MjA4NTYwNDM3MH0.eogxbn8OUUESGZ1SW3x25r8tGAYI8bASBm2-U1irii0",
  ua: "okhttp/4.12.0",
  device_id: crypto.randomBytes(16).toString("hex")
};
class Cartoona {
  constructor() {
    this.http = axios.create({
      baseURL: CFG.baseURL,
      headers: {
        "User-Agent": CFG.ua,
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "x-client-info": "supabase-js-react-native/2.93.3",
        "content-profile": "public",
        apikey: CFG.apiKey,
        authorization: `Bearer ${CFG.apiKey}`
      }
    });
    this.id = null;
    this.bal = 0;
    this.auth = false;
  }
  log(lvl, msg, ...a) {
    const icon = {
      INFO: "🔹",
      SUCCESS: "✅",
      WARN: "⚠️",
      ERROR: "❌"
    } [lvl] || "▪️";
    console.log(`[${new Date().toLocaleTimeString()}] ${icon} ${msg}`, ...a);
  }
  async reg() {
    if (this.auth && this.id) return this.id;
    try {
      const r = await this.http.post("/rest/v1/rpc/register_device", {
        p_device_identifier: CFG.device_id,
        p_platform: "android",
        p_app_version: "1.0.4 (20)",
        p_language: "id"
      });
      this.id = r?.data;
      this.auth = true;
      this.log("SUCCESS", `Device registered: ${this.id}`);
      return this.id;
    } catch (e) {
      this.log("ERROR", "Registration failed", e?.response?.data || e.message);
      throw e;
    }
  }
  async get_bal() {
    if (!this.id) await this.reg();
    try {
      const r = await this.http.post("/rest/v1/rpc/fetch_balance_v2", {
        p_device_id: this.id
      });
      this.bal = r?.data ?? 0;
      return this.bal;
    } catch (e) {
      return this.bal;
    }
  }
  async top_up(target = 200) {
    await this.get_bal();
    while (this.bal < target) {
      this.log("INFO", `Saldo: ${this.bal}/${target}. Topping up...`);
      try {
        const r = await this.http.post("/functions/v1/reward-credits", {
          device_id: this.id
        });
        const added = r?.data?.credits_added ?? r?.data?.added ?? 0;
        if (added > 0) {
          this.bal += added;
        } else {
          this.bal += 100;
          break;
        }
      } catch (e) {
        this.bal += 100;
        break;
      }
    }
    return this.bal;
  }
  async ded(amount) {
    try {
      await this.http.post("/rest/v1/rpc/deduct_credits_v2", {
        p_device_id: this.id,
        p_amount: amount
      });
      this.bal = Math.max(0, this.bal - amount);
      this.log("INFO", `Deducted: ${amount}`);
    } catch (e) {}
  }
  async enc_img(img) {
    try {
      if (typeof img === "string" && img.startsWith("data:")) return img;
      if (typeof img === "string" && img.startsWith("http")) {
        const r = await axios.get(img, {
          responseType: "arraybuffer"
        });
        const b64 = Buffer.from(r.data).toString("base64");
        return `data:${r.headers["content-type"] || "image/jpeg"};base64,${b64}`;
      }
      if (Buffer.isBuffer(img)) return `data:image/jpeg;base64,${img.toString("base64")}`;
      throw new Error("Format salah");
    } catch (err) {
      throw new Error(`Encoding fail: ${err.message}`);
    }
  }
  async styles({
    lang = "id",
    select = "*",
    active = true,
    ...rest
  }) {
    try {
      this.log("INFO", `Fetching styles (lang: ${lang})...`);
      const r = await this.http.get("/rest/v1/styles", {
        params: {
          select: `${select},style_translations!left(title,description)`,
          is_active: `eq.${active}`,
          "style_translations.lang": `eq.${lang}`,
          order: "priority.asc",
          ...rest
        }
      });
      return r?.data ?? [];
    } catch (e) {
      this.log("ERROR", "Gagal mengambil styles");
      return [];
    }
  }
  async generate({
    image,
    style_id = "b0000000-0007-0002-0000-000000000001",
    ver = "anime",
    cost = 200,
    target_bal = 200,
    auto_deduct = true,
    ...rest
  } = {}) {
    try {
      await this.reg();
      await this.top_up(target_bal);
      const encoded = await this.enc_img(image);
      const endpoint = {
        v3: "generate-anime-v3",
        v4: "generate-anime-v4",
        anime: "generate-anime"
      } [ver.toLowerCase()] || "generate-anime-v4";
      this.log("INFO", `Using endpoint: ${endpoint}`);
      const r = await this.http.post(`/functions/v1/${endpoint}`, {
        image_data: encoded,
        device_id: this.id,
        style_id: style_id,
        ...rest
      });
      const img_url = r?.data?.images?.[0]?.url ?? r?.data?.url;
      if (!img_url) throw new Error("API return empty image URL");
      if (auto_deduct) await this.ded(cost);
      this.log("SUCCESS", `Generation successful (${ver})`);
      return {
        success: true,
        result: img_url,
        version: ver,
        credits: this.bal
      };
    } catch (err) {
      this.log("ERROR", `Fail: ${err.message}`);
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
  const validActions = ["styles", "generate"];
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
  const api = new Cartoona();
  try {
    let response;
    switch (action) {
      case "styles":
        response = await api.styles(params);
        break;
      case "generate":
        if (!params.image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'image' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari server AnimeKill. Coba lagi nanti."
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
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}