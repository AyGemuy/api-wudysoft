import axios from "axios";
import {
  randomBytes
} from "crypto";
const FB_KEY = "AIzaSyCZDQRdKwrvb5zB4Ay6nfqeOwdV1U8ibQY";
const API = "https://vidgenprod-production.up.railway.app/api";
const FB = "https://www.googleapis.com/identitytoolkit/v3/relyingparty";
const FB_HDR = {
  "Content-Type": "application/json",
  "X-Android-Package": "com.vhsstd.videoai",
  "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81",
  "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)"
};
class VidGen {
  constructor() {
    this.token = null;
    this.http = axios.create({
      baseURL: API
    });
  }
  rndCred() {
    const hex = n => randomBytes(n).toString("hex");
    const email = `${hex(4)}.${hex(3)}@${hex(3)}.com`;
    const pass = hex(8) + "A1!";
    return {
      email: email,
      pass: pass
    };
  }
  async sign() {
    const {
      email,
      pass
    } = this.rndCred();
    const body = {
      email: email,
      password: pass,
      returnSecureToken: true,
      clientType: "CLIENT_TYPE_ANDROID"
    };
    try {
      console.log("[sign] signup:", email);
      await axios.post(`${FB}/signupNewUser?key=${FB_KEY}`, body, {
        headers: FB_HDR
      });
      console.log("[sign] verifyPassword...");
      const {
        data: login
      } = await axios.post(`${FB}/verifyPassword?key=${FB_KEY}`, body, {
        headers: FB_HDR
      });
      const token = login?.idToken;
      console.log("[sign] token ok, uid:", login?.localId);
      console.log("[sign] getAccountInfo...");
      const {
        data: info
      } = await axios.post(`${FB}/getAccountInfo?key=${FB_KEY}`, {
        idToken: token
      }, {
        headers: FB_HDR
      });
      console.log("[sign] email:", info?.users?.[0]?.email);
      console.log("[sign] init backend me...");
      const {
        data: me
      } = await this.http.get("/users/me", {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      console.log("[sign] credits:", me?.data?.credits);
      return token;
    } catch (e) {
      console.error("[sign] error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async claim(token) {
    console.log("[claim] checking in...");
    try {
      const {
        data
      } = await this.http.post("/users/daily-checkin", {}, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const info = data?.data;
      console.log("[claim]", info?.alreadyClaimed ? "already claimed" : `+${info?.creditsGranted} credits`, "| total:", info?.credits);
      return info;
    } catch (e) {
      console.error("[claim] error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async me(token) {
    try {
      const {
        data
      } = await this.http.get("/users/me", {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      return data?.data;
    } catch (e) {
      console.error("[me] error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async bal(token) {
    try {
      const {
        data
      } = await this.http.get("/users/balance", {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      console.log("[bal] credits:", data?.data?.credits);
      return data?.data;
    } catch (e) {
      console.error("[bal] error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async auth() {
    if (this.token) {
      console.log("[auth] reusing token");
      return this.token;
    }
    const token = await this.sign();
    await this.claim(token);
    this.token = token;
    return token;
  }
  async solve(img) {
    if (Buffer.isBuffer(img)) {
      console.log("[solve] buffer detected");
      return {
        base64: img.toString("base64"),
        mimeType: "image/jpeg"
      };
    }
    if (typeof img === "string" && img.startsWith("data:")) {
      const [meta, b64] = img.split(",");
      const mimeType = meta.match(/:(.*?);/)?.[1] || "image/jpeg";
      return {
        base64: b64,
        mimeType: mimeType
      };
    }
    if (typeof img === "string" && /^https?:\/\//.test(img)) {
      console.log("[solve] fetching url:", img.slice(0, 60));
      const res = await axios.get(img, {
        responseType: "arraybuffer"
      });
      const mimeType = res.headers?.["content-type"]?.split(";")[0] || "image/jpeg";
      return {
        base64: Buffer.from(res.data).toString("base64"),
        mimeType: mimeType
      };
    }
    if (typeof img === "string") {
      return {
        base64: img,
        mimeType: "image/jpeg"
      };
    }
    throw new Error("[solve] unsupported image type");
  }
  async upload(img, token) {
    console.log("[upload] uploading image...");
    try {
      const {
        base64,
        mimeType
      } = await this.solve(img);
      const {
        data
      } = await this.http.post("/upload/image", {
        base64: base64,
        mimeType: mimeType
      }, {
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      console.log("[upload] done:", data?.data?.imageUrl?.slice(0, 60));
      return data?.data?.imageUrl;
    } catch (e) {
      console.error("[upload] error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async generate({
    token,
    prompt,
    image,
    ...rest
  }) {
    try {
      token = token || await this.auth();
      let imageUrl = null;
      let mode = "text_to_video";
      let cost = rest.clientEstimatedCost || 12;
      if (image) {
        mode = "image_to_video";
        cost = rest.clientEstimatedCost || 15;
        const imgs = Array.isArray(image) ? image : [image];
        for (const img of imgs) {
          imageUrl = await this.upload(img, token);
        }
      }
      const body = {
        prompt: prompt,
        mode: mode,
        count: rest.count || 1,
        duration: rest.duration || 12,
        ratio: rest.ratio || "auto",
        resolution: rest.resolution || "480p",
        clientEstimatedCost: cost,
        ...imageUrl && {
          imageUrl: imageUrl
        },
        ...rest
      };
      console.log("[generate] submitting:", mode, "|", prompt);
      const {
        data
      } = await this.http.post("/video/generate", body, {
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const result = data?.data;
      console.log("[generate] taskId:", result?.taskId, "| credits left:", result?.creditsRemaining);
      return result;
    } catch (e) {
      console.error("[generate] error:", e?.response?.data || e.message);
      throw e;
    }
  }
  async status({
    token,
    taskId,
    ...rest
  }) {
    try {
      token = token || this.token;
      console.log("[status] checking:", taskId);
      const {
        data
      } = await this.http.get(`/video/status/${taskId}`, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      const result = data?.data;
      console.log("[status]", result?.status, result?.videoUrl ? "| url ready" : "");
      return result;
    } catch (e) {
      console.error("[status] error:", e?.response?.data || e.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["generate", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=generate&prompt=isekai"
      }
    });
  }
  const api = new VidGen();
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
      case "status":
        if (!params.token || !params.taskId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'token' dan 'taskId' wajib diisi untuk action 'status'."
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
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}