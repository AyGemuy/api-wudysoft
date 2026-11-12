import axios from "axios";
import CryptoJS from "crypto-js";
const API_KEY = "rtbEmoZco90ivweeskCcdjRk9Pda5UgxIoixlzSLJzpzuEnaQL8nnDpKLqrt";

function genToken(deviceId) {
  const combined = deviceId + API_KEY;
  return CryptoJS.SHA256(combined).toString();
}
class ChatEvo {
  constructor() {
    this.deviceId = `android_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    this.base = "https://api.chatevo.app";
    this.axios = axios.create({
      baseURL: this.base
    });
    this.token = genToken(this.deviceId);
    this.ready = false;
  }
  lg(...args) {
    console.log("[CE]", ...args);
  }
  async ens() {
    if (this.ready) return;
    await this.reg();
    await this.clm();
    this.ready = true;
  }
  async reg() {
    this.lg("reg", this.deviceId);
    try {
      await this.axios.post("/users", {
        deviceId: this.deviceId
      }, {
        headers: {
          "User-Agent": "okhttp/4.12.0",
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      });
      this.lg("reg ok");
    } catch (e) {
      this.lg("reg fail", e?.response?.data || e.message);
      throw e;
    }
  }
  async clm() {
    this.lg("claim day 1");
    const headers = {
      Accept: "application/json",
      "x-custom-auth": this.deviceId,
      "x-custom-token": this.token
    };
    const body = {
      method: "addPointInUSer",
      add_point: 5,
      type_earn: "daily_checkin_7day",
      day_number: 1,
      reward_ref: ""
    };
    try {
      const res = await this.axios.post("/daily-checkins/add-point", body, {
        headers: headers
      });
      this.lg("claimed", res?.data?.status);
    } catch (e) {
      this.lg("claim skip/err", e?.response?.data || e.message);
    }
  }
  async up(img) {
    this.lg("upload");
    let buffer, mime;
    if (typeof img === "string") {
      if (img.startsWith("http")) {
        const resp = await axios.get(img, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(resp.data);
        mime = resp.headers["content-type"] || "image/jpeg";
      } else if (img.startsWith("data:")) {
        const [header, b64] = img.split(",");
        mime = header.match(/:(.*?);/)[1];
        buffer = Buffer.from(b64, "base64");
      } else {
        buffer = Buffer.from(img, "base64");
        mime = "image/png";
      }
    } else if (Buffer.isBuffer(img)) {
      buffer = img;
      mime = "image/png";
    } else {
      throw new Error("Unsupported image input");
    }
    const fileName = `upload_${Date.now()}.${mime.split("/")[1] || "png"}`;
    const fileSize = buffer.length;
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-custom-auth": this.deviceId,
      "x-custom-token": this.token
    };
    const reqBody = {
      fileName: fileName,
      fileSize: fileSize,
      fieldName: "file",
      nodeId: "0",
      appId: "ai_image"
    };
    const urlRes = await this.axios.post("/media/upload", reqBody, {
      headers: headers
    });
    const uploadUrl = urlRes?.data?.uploadUrl;
    if (!uploadUrl) throw new Error("No uploadUrl");
    await axios.put(uploadUrl, buffer, {
      headers: {
        "Content-Type": mime
      }
    });
    const mediaId = urlRes?.data?.mediaId ?? urlRes?.data?.id;
    if (!mediaId) throw new Error("No mediaId");
    this.lg("uploaded ->", mediaId);
    return mediaId;
  }
  async gmUrl(mediaId) {
    const headers = {
      Accept: "application/json",
      "x-custom-auth": this.deviceId,
      "x-custom-token": this.token
    };
    const res = await this.axios.get(`/media/${mediaId}/url`, {
      headers: headers
    });
    return res?.data;
  }
  async models({
    mode,
    ...rest
  } = {}) {
    await this.ens();
    this.lg("get models", mode || "any");
    const headers = {
      Accept: "application/json",
      "x-custom-auth": this.deviceId,
      "x-custom-token": this.token
    };
    const res = await this.axios.get("/models", {
      headers: headers,
      params: rest
    });
    let list = res?.data ?? [];
    if (mode) list = list.filter(m => m?.type === mode);
    return list;
  }
  async generate({
    mode = "image",
    prompt,
    image,
    ...rest
  } = {}) {
    await this.ens();
    this.lg(`gen ${mode}: ${prompt?.slice(0, 50)}...`);
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-custom-auth": this.deviceId,
      "x-custom-token": this.token
    };
    try {
      switch (mode) {
        case "chat": {
          let cid = rest.conversationId;
          if (!cid) {
            const create = {
              title: rest.title || "Chat",
              modelId: rest.modelId || 1,
              systemPrompt: rest.systemPrompt || "",
              settings: rest.settings || {}
            };
            const conv = await this.axios.post("/conversations", create, {
              headers: headers
            });
            cid = conv?.data?.id;
            if (!cid) throw new Error("Conv creation failed");
          }
          const msgBody = {
            message: prompt,
            model: rest.model || "openai/gpt-5-mini",
            mediaIds: rest.mediaIds || null
          };
          const resp = await this.axios.post(`/chat/conversation/${cid}/chat`, msgBody, {
            headers: headers
          });
          return resp?.data ?? {};
        }
        case "image": {
          if (!prompt) throw new Error("Prompt required");
          let mediaIds = [];
          if (image) {
            const images = Array.isArray(image) ? image : [image];
            for (const img of images) {
              try {
                const id = await this.up(img);
                mediaIds.push(id);
              } catch (err) {
                this.lg("skip image upload error", err.message);
              }
            }
          }
          let endpoint, body;
          if (image && mediaIds.length > 0) {
            endpoint = "/ai-images/image-to-image";
            body = {
              customPrompt: prompt,
              promptId: rest.promptId ?? 0,
              mediaIds: mediaIds
            };
          } else {
            endpoint = "/ai-images/text-to-image";
            body = {
              prompt: prompt,
              styleId: rest.styleId ?? 1
            };
          }
          const resp = await this.axios.post(endpoint, body, {
            headers: headers
          });
          const mediaId = resp?.data?.data?.mediaId;
          if (!mediaId) throw new Error("No mediaId");
          return await this.gmUrl(mediaId);
        }
        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
    } catch (e) {
      this.lg("gen error", e?.response?.data || e.message);
      throw e;
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
      error: "Parameter 'action' wajib diisi.",
      supportedActions: ["models", "generate"]
    });
  }
  const api = new ChatEvo();
  try {
    let response;
    switch (action) {
      case "models":
        response = await api.models(params);
        return res.status(200).json(response);
      case "generate":
        if (!params?.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          supportedActions: ["models", "generate"]
        });
    }
  } catch (error) {
    console.error(`[FATAL] Action '${action}' error:`, error?.message);
    if (error?.response?.data) {
      console.error("API Response:", error.response.data);
    }
    return res.status(500).json({
      success: false,
      error: error?.message || "Terjadi kesalahan internal pada server.",
      action: action
    });
  }
}