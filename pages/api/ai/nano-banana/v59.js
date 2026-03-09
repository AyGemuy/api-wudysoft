import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class BananoAI {
  constructor() {
    this.baseUrl = "https://api.bananoai.store";
    this.token = null;
    this.credentials = {
      device_id: this.rnd(),
      device_name: `Node_${this.rnd()}`,
      uid: "",
      provider: "google",
      name: `User_${this.rnd()}`
    };
    this.api = axios.create({
      baseURL: this.baseUrl,
      timeout: 6e4,
      headers: {
        Accept: "application/json"
      }
    });
    console.log(`[BananoAI] Service Started: ${this.baseUrl}`);
  }
  rnd(n = 32) {
    return crypto.randomBytes(n).toString("hex");
  }
  async solveImg(input) {
    if (!input) return null;
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        const b64Match = input.match(/^(?:data:[^;]+;base64,)?([A-Za-z0-9+/=]+)$/);
        if (b64Match) return Buffer.from(b64Match[1], "base64");
        if (input.startsWith("http")) {
          console.log(`[BananoAI] Downloading image: ${input.substring(0, 40)}...`);
          const r = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(r.data);
        }
      }
      return null;
    } catch (e) {
      console.error(`[BananoAI] SolveImg Error: ${e.message}`);
      return null;
    }
  }
  async auth() {
    try {
      if (this.token) {
        this.api.defaults.headers["Authorization"] = `Bearer ${this.token}`;
        return this.token;
      }
      console.log("[BananoAI] Attempting Auto Login...");
      const res = await this.api.post("/user/login", {
        ...this.credentials,
        platform: "android",
        app_version: "1.0.0"
      });
      console.log(res.data);
      this.token = res?.data?.token;
      if (!this.token) throw new Error("No token received");
      this.api.defaults.headers["Authorization"] = `Bearer ${this.token}`;
      console.log("[BananoAI] Login Success");
      return this.token;
    } catch (e) {
      console.error(`[BananoAI] Auth Error: ${e.message}`);
      return null;
    }
  }
  async poll(orderCode, tries = 60, interval = 3e3) {
    console.log(`[BananoAI] Polling: ${orderCode}`);
    for (let i = 0; i < tries; i++) {
      try {
        const r = await this.api.get("/image/generate_result", {
          params: {
            order_code: orderCode
          }
        });
        const d = r?.data?.data || r?.data;
        console.log(`[BananoAI] Poll #${i + 1} status: ${d?.status}`);
        if (d?.status === 1) {
          console.log(r.data);
          return d;
        }
        if (d?.status === 2) throw new Error("Task failed on server");
      } catch (e) {
        console.error(`[BananoAI] Poll Error: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, interval));
    }
    throw new Error("Polling timeout");
  }
  async generate({
    prompt,
    image: portrait,
    clothes,
    camera,
    style,
    lighting,
    ratio,
    type
  }) {
    try {
      await this.auth();
      console.log(`[BananoAI] Generating: ${prompt?.substring(0, 20)}...`);
      const form = new FormData();
      form.append("prompt", prompt || "");
      form.append("camera", camera || "");
      form.append("style", style || "");
      form.append("lighting", lighting || "");
      form.append("type", type || "image");
      form.append("aspect_ratio", ratio || "3:4");
      const imgPortrait = await this.solveImg(portrait);
      const imgClothes = await this.solveImg(clothes);
      if (imgPortrait) form.append("image_portrait", imgPortrait, {
        filename: "p.jpg"
      });
      if (imgClothes) form.append("image_clothes", imgClothes, {
        filename: "c.jpg"
      });
      const res = await this.api.post("/image/generate_ai_studio", form, {
        headers: form.getHeaders()
      });
      console.log(res.data);
      const orderCode = res?.data?.data?.order_code;
      if (!orderCode) throw new Error("No order_code returned");
      return await this.poll(orderCode);
    } catch (e) {
      console.error(`[BananoAI] Generate Error: ${e?.response?.data?.message || e.message}`);
      return {
        status: "error",
        message: e.message
      };
    }
  }
  async template({
    page = 1,
    limit = 20
  } = {}) {
    try {
      await this.auth();
      console.log(`[BananoAI] Fetching templates: page=${page} limit=${limit}`);
      const r = await this.api.get("/template/template_pack", {
        params: {
          page: page,
          limit: limit,
          language: "en"
        }
      });
      console.log(r.data);
      const d = r?.data?.data || r?.data;
      return d;
    } catch (e) {
      console.error(`[BananoAI] Template Error: ${e.message}`);
      return [];
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["generate", "template"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=generate&prompt=one piece"
      }
    });
  }
  const api = new BananoAI();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "template":
        response = await api.template(params);
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