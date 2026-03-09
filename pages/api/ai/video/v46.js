import axios from "axios";
const pic = r => r ? {
  bytesBase64Encoded: r.b64,
  mimeType: r.mime
} : null;
class VeoClient {
  constructor() {
    this.http = axios.create({
      baseURL: "https://veo3-app1.up.railway.app",
      headers: {
        "X-API-Key": "a9f3e7b2c8d1f4a6e0b5c9d2f7a3e8b1c6d0f4a9e2b7c1d5f8a4e9b3c7d2f6a0",
        "Content-Type": "application/json"
      }
    });
  }
  _sniff(buf) {
    try {
      if (buf[0] === 255 && buf[1] === 216) return "image/jpeg";
      if (buf[0] === 137 && buf[1] === 80) return "image/png";
      if (buf[0] === 71 && buf[1] === 73) return "image/gif";
      if (buf[0] === 82 && buf[1] === 73 && buf[8] === 87) return "image/webp";
      return "image/png";
    } catch {
      return "image/png";
    }
  }
  async _b64(img) {
    try {
      if (!img) return null;
      if (Buffer.isBuffer(img)) return {
        b64: img.toString("base64"),
        mime: this._sniff(img)
      };
      if (img.startsWith("http")) {
        const {
          data,
          headers
        } = await axios.get(img, {
          responseType: "arraybuffer"
        });
        const buf = Buffer.from(data);
        const mime = headers["content-type"]?.split(";")[0].trim() || this._sniff(buf);
        return {
          b64: buf.toString("base64"),
          mime: mime
        };
      }
      const buf = Buffer.from(img, "base64");
      return {
        b64: img,
        mime: this._sniff(buf)
      };
    } catch (e) {
      console.error("[_b64] ERR", e.message);
      throw e;
    }
  }
  _type(img, lf) {
    return img || lf ? "IMAGE_TO_VIDEO" : "TEXT_TO_VIDEO";
  }
  async generate({
    prompt,
    image = null,
    lastFrame = null,
    ...rest
  } = {}) {
    try {
      const res = {};
      for (const [k, v] of [
          ["imgR", image],
          ["lfR", lastFrame]
        ]) res[k] = await this._b64(v);
      const {
        imgR,
        lfR
      } = res;
      const payload = {
        prompt: prompt || "Cyberpunk samurai walking in the rain",
        type: this._type(imgR, lfR),
        aspectRatio: "16:9",
        outputsPerPrompt: 1,
        durationSeconds: 4,
        modelName: "veo-3.0-fast-generate-preview",
        instances: null,
        parameters: null,
        ...rest,
        image: pic(imgR),
        lastFrame: pic(lfR)
      };
      console.log(`[gen] ${payload.type} | ${payload.modelName} | ${payload.aspectRatio} | ${payload.durationSeconds}s${imgR ? ` | ${imgR.mime}` : ""}`);
      const {
        data
      } = await this.http.post("/generate-video", payload);
      const opName = data?.operation?.name || data?.name;
      if (!opName) {
        console.error("[gen] operationName not found:", JSON.stringify(data));
        return {
          success: false,
          data: data
        };
      }
      const state = Buffer.from(JSON.stringify({
        operationName: opName,
        modelName: payload.modelName
      })).toString("base64");
      console.log("[gen] OK —", opName);
      return {
        success: true,
        state: state
      };
    } catch (e) {
      const detail = e?.response?.data ?? e.message;
      console.error("[gen] ERR", typeof detail === "object" ? JSON.stringify(detail) : detail);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async status({
    state
  }) {
    try {
      if (!state) throw new Error("state diperlukan");
      const payload = JSON.parse(Buffer.from(state, "base64").toString());
      const {
        data
      } = await this.http.post("/poll-operation", payload);
      const op = data?.operation ?? data;
      const done = !!(op?.done || data?.metadata?.status === "SUCCEEDED");
      const result = op?.response ?? op;
      console.log("[poll]", done ? `SELESAI — ${result?.videos?.length}` : "PROSES...");
      return {
        success: done,
        ...result
      };
    } catch (e) {
      const detail = e?.response?.data ?? e.message;
      console.error("[poll] ERR", typeof detail === "object" ? JSON.stringify(detail) : detail);
      return {
        success: false,
        error: e.message
      };
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
  const api = new VeoClient();
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
        if (!params.state) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'state' wajib diisi untuk action 'status'."
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