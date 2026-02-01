import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import WebSocket from "ws";
class ImageXLab {
  constructor() {
    this.base = "https://app.imagexlab.com/api/v1";
    this.ws = "wss://app.imagexlab.com/api/v1/ws";
    this.deviceId = crypto.randomBytes(8).toString("hex");
    this.headers = {
      "User-Agent": "ktor-client",
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "Accept-Language": "en",
      "Accept-Charset": "UTF-8"
    };
  }
  log(msg, data = null) {
    console.log(`[ImageXLab] ${msg}`, data || "");
  }
  async req(method, url, data = null, headers = {}) {
    try {
      this.log(`${method} ${url}`);
      const res = await axios({
        method: method,
        url: url,
        data: data,
        headers: {
          ...this.headers,
          ...headers
        }
      });
      return res?.data || res;
    } catch (err) {
      this.log("Error", err?.response?.data || err?.message);
      throw err;
    }
  }
  async templates({
    category = null
  } = {}) {
    const url = category ? `${this.base}/dynamic-items/${category}` : `${this.base}/dynamic-items/main-categories`;
    const result = await this.req("GET", url);
    this.log("Templates fetched", result?.length || "N/A");
    return {
      result: result
    };
  }
  async buf(input) {
    if (!input) return null;
    if (Buffer.isBuffer(input)) return input;
    if (typeof input === "string") {
      if (input.startsWith("data:")) {
        const b64 = input.split(",")[1] || input;
        return Buffer.from(b64, "base64");
      }
      if (input.startsWith("http")) {
        this.log("Fetching image from URL");
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      return Buffer.from(input, "base64");
    }
    return null;
  }
  poll(taskId) {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(`${this.ws}?device_id=${this.deviceId}`);
      const timeout = setTimeout(() => {
        client?.close();
        reject(new Error("Polling timeout"));
      }, 3e5);
      client.on("open", () => this.log("WebSocket connected"));
      client.on("message", raw => {
        try {
          const msg = JSON.parse(raw.toString());
          this.log("WS Message", msg?.type);
          if (msg?.type === "ping") {
            this.log("Sending PONG");
            client.send(JSON.stringify({
              type: "pong"
            }));
            return;
          }
          if (msg?.type === "task_update" && msg?.data?.task_id === taskId) {
            const data = msg.data;
            if (data.status === "completed") {
              clearTimeout(timeout);
              client?.close();
              resolve(data);
            } else if (data.status === "failed" || data.status === "error") {
              clearTimeout(timeout);
              client?.close();
              reject(new Error(data.message || "Generation failed"));
            } else {
              this.log(`Status: ${data.status}`, data.progress ? `${data.progress}%` : "");
            }
          }
        } catch (err) {
          this.log("Parse error", err?.message);
        }
      });
      client.on("error", err => {
        clearTimeout(timeout);
        reject(err);
      });
      client.on("close", () => this.log("WebSocket closed"));
    });
  }
  async generate({
    id = "e05df397-43d4-4587-af70-a97ec20220dd",
    image,
    images = null,
    size = 3,
    mode = "pulid",
    prompt = null,
    seed = null,
    aspectRatio = null,
    area = null,
    beast = null,
    gender = null,
    age = null
  } = {}) {
    try {
      const form = new FormData();
      form.append("device_id", this.deviceId);
      form.append("dynamic_item_id", id);
      if (mode === "pulid") {
        const imgBuf = await this.buf(image);
        if (!imgBuf) throw new Error("Invalid image input");
        form.append("face_image", imgBuf, {
          filename: "face_image.jpg",
          contentType: "image/*"
        });
        form.append("image_size_type", String(size));
        if (gender) form.append("gender", gender);
        if (age) form.append("age", age);
        if (images?.length) {
          for (let i = 0; i < images.length; i++) {
            const buf = await this.buf(images[i]);
            if (buf) {
              form.append(`additional_face_image_${i + 1}`, buf, {
                filename: `additional_face_${i + 1}.jpg`,
                contentType: "image/*"
              });
            }
          }
        }
      } else if (mode === "vidu") {
        const imgArray = Array.isArray(image) ? image : [image];
        for (let i = 0; i < imgArray.length; i++) {
          const buf = await this.buf(imgArray[i]);
          if (buf) {
            form.append("images", buf, {
              filename: `image_${i + 1}.jpg`,
              contentType: "image/*"
            });
          }
        }
        if (prompt) form.append("user_prompt_override", prompt);
        if (seed !== null) form.append("seed_override", String(seed));
        if (aspectRatio) form.append("aspect_ratio", aspectRatio);
        if (area) form.append("area", area);
        if (beast) form.append("beast", beast);
      }
      const endpoint = mode === "vidu" ? `${this.base}/vidu/generate` : `${this.base}/pulid/generate`;
      this.log("Generating", {
        mode: mode,
        template: id,
        size: size
      });
      const gen = await this.req("POST", endpoint, form, form.getHeaders());
      if (!gen?.success) throw new Error(gen?.message || "Generation failed");
      this.log("Task created", gen?.task_id);
      this.log("Polling task...");
      const result = await this.poll(gen.task_id);
      this.log("Generation completed", result?.output_url);
      return {
        result: result
      };
    } catch (err) {
      this.log("Generate error", err?.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi",
      actions: ["templates", "generate"]
    });
  }
  const api = new ImageXLab();
  try {
    let result;
    switch (action) {
      case "templates":
        result = await api.templates(params);
        break;
      case "generate":
        if (!params.image) {
          return res.status(400).json({
            error: "Parameter 'image' wajib diisi untuk action 'generate'",
            example: {
              action: "generate",
              image: "https://example.com/image.jpg",
              id: "5e10610f-9ab7-4f44-8f52-ddcc8b6d20bd"
            }
          });
        }
        result = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["templates", "generate"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server",
      action: action
    });
  }
}