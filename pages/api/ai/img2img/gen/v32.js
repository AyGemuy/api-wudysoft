import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import {
  EventSource
} from "eventsource";
import PROMPT from "@/configs/ai-prompt";
class QwenManipulator {
  constructor() {
    this.host = "https://prithivmlmods-qwen-image-edit-object-manipulator.hf.space";
    this.client = axios.create({
      baseURL: this.host,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: this.host,
        pragma: "no-cache",
        referer: `${this.host}/`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      timeout: 6e4
    });
  }
  _log(act, msg) {
    console.log(`[QwenManipulator] [${act}] ${msg}`);
  }
  _hash() {
    return crypto.randomBytes(6).toString("hex");
  }
  async _img(item) {
    try {
      if (Buffer.isBuffer(item)) {
        return {
          value: item,
          name: `img_${Date.now()}.jpg`
        };
      }
      if (typeof item === "string") {
        if (item.startsWith("http")) {
          this._log("Image", "Downloading URL...");
          const res = await axios.get(item, {
            responseType: "arraybuffer"
          });
          return {
            value: res.data,
            name: item.split("/").pop() || "file.jpg"
          };
        }
        if (item.includes("base64,")) {
          const parts = item.split("base64,");
          return {
            value: Buffer.from(parts[1], "base64"),
            name: `b64_${Date.now()}.jpg`
          };
        }
        if (/^[A-Za-z0-9+/=]+$/.test(item)) {
          return {
            value: Buffer.from(item, "base64"),
            name: `b64_${Date.now()}.jpg`
          };
        }
      }
      return null;
    } catch (e) {
      this._log("Image Error", e.message);
      return null;
    }
  }
  async generate({
    prompt = PROMPT.text,
    image,
    ...rest
  }) {
    this._log("Queue", "Starting process...");
    const sessionHash = rest?.session_hash || this._hash();
    const uploadId = rest?.upload_id || this._hash();
    let es = null;
    try {
      const fileData = await this._img(image);
      if (!fileData) throw new Error("Invalid image source pattern");
      const form = new FormData();
      form.append("files", fileData.value, fileData.name);
      this._log("Upload", `Uploading image: ${fileData.name}`);
      const uploadRes = await this.client.post(`/gradio_api/upload?upload_id=${uploadId}`, form, {
        headers: form.getHeaders()
      });
      const remotePath = (Array.isArray(uploadRes?.data) ? uploadRes.data.find(p => typeof p === "string") : null) || "";
      if (!remotePath) throw new Error("Upload failed to retrieve tmp path");
      this._log("Upload", `File stored at: ${remotePath}`);
      this._log("Queue", "Joining task configuration pipeline...");
      const payload = {
        data: [
          [{
            image: {
              path: remotePath,
              url: `${this.host}/gradio_api/file=${remotePath}`,
              orig_name: fileData.name,
              size: fileData.value.length,
              mime_type: "image/jpeg",
              meta: {
                _type: "gradio.FileData"
              }
            },
            caption: null
          }], prompt || "Add hat", rest?.manipulation_type || "Qwen-Image-Edit-2511-Object-Adder", rest?.seed || 0, rest?.enhance || true, rest?.steps || 1, rest?.cfg || 4
        ],
        fn_index: rest?.fn_index || 1,
        trigger_id: rest?.trigger_id || 8,
        session_hash: sessionHash,
        ...rest?.override
      };
      await this.client.post("/gradio_api/queue/join?", payload, {
        headers: {
          "x-gradio-user": "app",
          "content-type": "application/json"
        }
      });
      this._log("Stream", `Listening for process results [Session: ${sessionHash}]`);
      const streamResult = await new Promise((resolve, reject) => {
        es = new EventSource(`${this.host}/gradio_api/queue/data?session_hash=${sessionHash}`, {
          headers: this.client.defaults.headers
        });
        es.onmessage = event => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed?.msg === "process_completed") {
              es.close();
              resolve(parsed);
            }
          } catch (_) {}
        };
        es.onerror = err => {
          es.close();
          reject(err);
        };
      });
      const responseDataArray = streamResult?.output?.data || [];
      const outputData = responseDataArray.find(item => item && (item.url || item.path)) || {};
      const status = streamResult?.success || false;
      return {
        status: status,
        result: outputData?.url || null,
        info: {
          path: outputData?.path || null,
          duration: streamResult?.output?.duration || null,
          session_hash: sessionHash
        }
      };
    } catch (err) {
      if (es) es.close();
      this._log("Error", err?.response?.data || err?.message);
      return {
        status: false,
        result: err?.response?.data || err?.message || "Terjadi kesalahan sistem",
        info: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new QwenManipulator();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}