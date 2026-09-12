import axios from "axios";
import FormData from "form-data";
import ApiKey from "@/configs/api-key";
const BASE = "https://api.openai.com/v1";
const MODELS = {
  "gpt-4o": {
    id: "gpt-4o",
    type: "text",
    endpoint: "/chat/completions"
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    type: "text",
    endpoint: "/chat/completions"
  },
  "o1-preview": {
    id: "o1-preview",
    type: "text",
    endpoint: "/chat/completions"
  },
  "o3-mini": {
    id: "o3-mini",
    type: "text",
    endpoint: "/chat/completions"
  },
  "gpt-image-1-mini": {
    id: "gpt-image-1-mini",
    type: "image",
    endpoint: "/images/generations",
    dats: {
      n: 1,
      size: "1024x1024",
      quality: "low"
    }
  },
  "dall-e-3": {
    id: "dall-e-3",
    type: "image",
    endpoint: "/images/generations",
    dats: {
      n: 1,
      size: "1024x1024",
      quality: "standard"
    }
  },
  "dall-e-2": {
    id: "dall-e-2",
    type: "image",
    endpoint: "/images/generations",
    dats: {
      n: 1,
      size: "1024x1024"
    }
  },
  "whisper-1": {
    id: "whisper-1",
    type: "audio_in",
    endpoint: "/audio/transcriptions"
  },
  "tts-1": {
    id: "tts-1",
    type: "audio_out",
    endpoint: "/audio/speech"
  },
  "tts-1-hd": {
    id: "tts-1-hd",
    type: "audio_out",
    endpoint: "/audio/speech"
  }
};
class OpenAIAPI {
  constructor() {
    this.keys = ApiKey.openai || [];
    this.http = axios.create({
      baseURL: BASE
    });
    this.baseHeaders = {
      "User-Agent": "UnityPlayer/6000.3.15f1 (UnityWebRequest/1.0, libcurl/8.10.1-DEV)",
      "Accept-Encoding": "deflate, gzip",
      "x-unity-version": "6000.3.15f1",
      Cookie: "__cf_bm=BYzViC4kLDZ2ifQJ55KSn1eI1SZVxinLNxK1aXE1QGE-1781528522.741208-1.0.1.1-_fELNqzkYcEyBFNlPpbY5hbTiZKOabehwe3b86y6_PLflfyyDD4kW5KKBT9yGlHNiUAtSd0ld4E9blMZfkBBaa4atqaczIZTzEYUQhKGlgoiYCGoOmML7gjIsG50zHCJ"
    };
  }
  async _parseFile(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (input.startsWith("data:")) {
          const base64Str = input.split(",")[1] || input;
          return Buffer.from(base64Str, "base64");
        }
        return Buffer.from(input, "base64");
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  models({
    type = ""
  } = {}) {
    const list = Object.entries(MODELS).map(([key, val]) => ({
      key: key,
      ...val
    }));
    return type ? list.filter(m => m.type === type) : list;
  }
  async generate({
    model = "gpt-image-1-mini",
    prompt = "",
    image = "",
    mask = "",
    audio = "",
    ...rest
  } = {}) {
    try {
      let meta = MODELS[model];
      if (!meta) {
        MODELS[model] = {
          id: model,
          type: "text",
          endpoint: "/chat/completions"
        };
        meta = MODELS[model];
      }
      let payload = {};
      let headers = {
        ...this.baseHeaders
      };
      let targetEndpoint = meta.endpoint;
      if (meta.type === "text") {
        headers["Content-Type"] = "application/json";
        payload = {
          model: meta.id,
          messages: [{
            role: "user",
            content: image ? [{
              type: "text",
              text: prompt || "Describe this image"
            }, {
              type: "image_url",
              image_url: {
                url: typeof image === "string" && image.startsWith("http") ? image : `data:image/jpeg;base64,${image}`
              }
            }] : prompt
          }],
          ...rest
        };
      } else if (meta.type === "image") {
        const imageInputs = Array.isArray(image) ? image : image ? [image] : [];
        const parsedImages = [];
        for (const img of imageInputs) {
          const buf = await this._parseFile(img);
          if (buf) parsedImages.push(buf);
        }
        if (parsedImages.length > 0) {
          targetEndpoint = "/images/edits";
          const form = new FormData();
          form.append("model", model === "gpt-image-1-mini" ? "gpt-image-1" : meta.id);
          form.append("prompt", prompt || "Edit this image");
          form.append("n", rest?.n !== undefined ? rest.n : 1);
          form.append("size", rest?.size || "1536x1024");
          form.append("quality", rest?.quality || "medium");
          parsedImages.forEach((imgBuffer, index) => {
            form.append("image[]", imgBuffer, {
              filename: `parent${index + 1}.png`,
              contentType: "image/png"
            });
          });
          const maskBuffer = await this._parseFile(mask);
          if (maskBuffer) {
            form.append("mask", maskBuffer, {
              filename: "mask.png",
              contentType: "image/png"
            });
          }
          Object.entries(rest).forEach(([k, v]) => {
            if (!["n", "size", "quality"].includes(k)) form.append(k, String(v));
          });
          payload = form;
          headers = {
            ...headers,
            ...form.getHeaders()
          };
        } else {
          headers["Content-Type"] = "application/json";
          const defaultDats = meta.dats || {
            n: 1,
            size: "1024x1024"
          };
          payload = {
            model: meta.id,
            prompt: prompt || "cute cat, in NO STYLE style, ADVANCED art",
            ...defaultDats,
            ...rest
          };
        }
      } else if (meta.type === "audio_out") {
        headers["Content-Type"] = "application/json";
        payload = {
          model: meta.id,
          input: prompt,
          voice: "alloy",
          ...rest
        };
      } else if (meta.type === "audio_in") {
        const audioBuffer = await this._parseFile(audio || prompt);
        if (!audioBuffer) {
          return {
            status: "error",
            message: "Input audio valid (URL/Base64/Buffer) diperlukan."
          };
        }
        const form = new FormData();
        form.append("model", meta.id);
        form.append("file", audioBuffer, {
          filename: "audio.mp3",
          contentType: "audio/mp3"
        });
        if (prompt) form.append("prompt", prompt);
        Object.entries(rest).forEach(([k, v]) => form.append(k, String(v)));
        payload = form;
        headers = {
          ...headers,
          ...form.getHeaders()
        };
      }
      let lastErr;
      for (let i = 0; i < this.keys.length; i++) {
        try {
          console.log(`[SUBMIT OpenAI] ${model} | endpoint=${targetEndpoint} | key_idx=${i}`);
          const currentHeaders = {
            ...headers,
            Authorization: this.keys[i].startsWith("Bearer ") ? this.keys[i] : `Bearer ${this.keys[i]}`
          };
          const config = {
            headers: currentHeaders
          };
          if (meta.type === "audio_out") config.responseType = "arraybuffer";
          const {
            data
          } = await this.http.post(targetEndpoint, payload, config);
          let finalResult = data;
          if (meta.type === "audio_out") {
            finalResult = {
              format: rest?.response_format || "mp3",
              audio: Buffer.from(data).toString("base64")
            };
          }
          return {
            status: "success",
            model: model,
            result: finalResult
          };
        } catch (e) {
          lastErr = e;
          const errMessage = e.response?.data instanceof Buffer ? JSON.parse(Buffer.from(e.response.data).toString()).error?.message : e.response?.data?.error?.message || e.message;
          console.warn(`[RETRY OpenAI] key_idx=${i} failed. Error: ${errMessage}`);
        }
      }
      throw lastErr;
    } catch (e) {
      const finalMsg = e.response?.data instanceof Buffer ? JSON.parse(Buffer.from(e.response.data).toString()).error?.message : e.response?.data?.error?.message || e.message;
      return {
        status: "error",
        message: finalMsg
      };
    }
  }
  async status({
    model = "gpt-4o-mini",
    task_id = ""
  } = {}) {
    return {
      status: "success",
      message: "OpenAI requests are processed synchronously. Result is already returned in 'generate' action.",
      task_id: task_id
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["models", "generate", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions
    });
  }
  const api = new OpenAIAPI();
  try {
    let response;
    switch (action) {
      case "models":
        response = await api.models(params);
        break;
      case "generate":
        if (!params.prompt && !params.audio && !params.image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt', 'audio', atau 'image' wajib diisi salah satu untuk melakukan action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
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
      message: "Terjadi kesalahan internal pada server OpenAI API.",
      error: error.message || "Unknown Error"
    });
  }
}