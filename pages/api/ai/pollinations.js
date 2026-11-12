import axios from "axios";
import qs from "qs";
import FormData from "form-data";
class PolliNations {
  constructor() {
    this.keys = ["sk_HKIJFyshGDbq5jrUVUVRRtSqnEg6zeDx", "plln_sk_GNq6hFXGtrbMXCJDKsgNpEYE25VHL0Fm"];
    this.keyIndex = 0;
    this.freeImageKeys = ["6d207e02198a847aa98d0a2a901485a5"];
    this.freeImageKeyIndex = 0;
    this.uploaderConfig = {
      url: "https://freeimage.host/api/1/upload",
      headers: {
        "User-Agent": "okhttp/4.9.2",
        Accept: "application/json"
      }
    };
    this.clients = {
      text: axios.create({
        baseURL: "https://text.pollinations.ai",
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          "Content-Type": "application/json",
          Accept: "*/*"
        }
      }),
      image: axios.create({
        baseURL: "https://image.pollinations.ai",
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          Accept: "*/*"
        }
      }),
      gen: axios.create({
        baseURL: "https://gen.pollinations.ai",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "image/*,*/*;q=0.8",
          "Accept-Encoding": "gzip",
          "cache-control": "no-cache"
        }
      })
    };
  }
  nextKey() {
    const key = this.keys[this.keyIndex];
    this.keyIndex = (this.keyIndex + 1) % this.keys.length;
    return key;
  }
  nextFreeImageKey() {
    const key = this.freeImageKeys[this.freeImageKeyIndex];
    this.freeImageKeyIndex = (this.freeImageKeyIndex + 1) % this.freeImageKeys.length;
    return key;
  }
  authHeader(key) {
    return {
      authorization: `Bearer ${key}`
    };
  }
  err(message) {
    return {
      error: true,
      message: message
    };
  }
  async run({
    mode,
    ...params
  }) {
    console.log(`\n[PolliNations] Mode: ${mode?.toUpperCase()}`);
    if (!mode) return this.err("mode required: chat | image | audio");
    switch (mode.toLowerCase()) {
      case "chat":
        return await this.chat(params);
      case "image":
        return await this.image(params);
      case "audio":
        return await this.audio(params);
      default:
        return this.err(`Invalid mode: ${mode}`);
    }
  }
  async chat({
    messages = [],
    prompt,
    media = null,
    model = "openai",
    temperature = .7,
    seed,
    jsonMode = false
  }) {
    console.log("[Chat] Starting...");
    try {
      if (!prompt && messages.length === 0) return this.err("Provide 'prompt' or 'messages'.");
      const finalMessages = [...messages];
      const userContent = [];
      if (prompt) {
        userContent.push({
          type: "text",
          text: prompt
        });
      }
      if (media) {
        console.log("[Chat] Resolving media...");
        const imageUrl = await this.resolveMedia(media);
        if (imageUrl?.error) return imageUrl;
        userContent.push({
          type: "image_url",
          image_url: {
            url: imageUrl
          }
        });
        console.log(`[Chat] Media resolved: ${imageUrl}`);
      }
      if (userContent.length > 0) finalMessages.push({
        role: "user",
        content: userContent
      });
      const key = this.nextKey();
      const payload = {
        model: model,
        messages: finalMessages,
        temperature: temperature,
        stream: false,
        jsonMode: jsonMode,
        ...seed && {
          seed: seed
        }
      };
      const res = await this.clients.text.post("/openai", payload, {
        headers: this.authHeader(key)
      });
      return res.data;
    } catch (error) {
      console.error("[Chat] Failed:", error.response?.data || error.message);
      return this.err(`Chat Error: ${error.message}`);
    }
  }
  async image({
    prompt,
    image = null,
    model,
    width,
    height,
    seed,
    nologo = true,
    enhance = true,
    safe = true
  }) {
    console.log("[Image] Starting...");
    if (!prompt) return this.err("prompt required.");
    const isI2I = image !== null && image !== undefined;
    if (isI2I) {
      return await this._i2i({
        prompt: prompt,
        image: image,
        model: model || "p-image-edit",
        width: width || 1080,
        height: height || 1920,
        safe: safe
      });
    } else {
      return await this._t2i({
        prompt: prompt,
        model: model || "flux",
        width: width || 1024,
        height: height || 1024,
        seed: seed,
        nologo: nologo,
        enhance: enhance,
        safe: safe
      });
    }
  }
  async _t2i(params) {
    try {
      const key = this.nextKey();
      const resolvedSeed = params.seed || Math.floor(Math.random() * 1e9);
      const q = qs.stringify({
        ...params,
        seed: resolvedSeed
      });
      const res = await this.clients.image.get(`/prompt/${encodeURIComponent(params.prompt)}?${q}`, {
        responseType: "arraybuffer",
        headers: this.authHeader(key)
      });
      return {
        type: "buffer",
        mime: "image/jpeg",
        data: Buffer.from(res.data)
      };
    } catch (error) {
      return this.err(`T2I Error: ${error.message}`);
    }
  }
  async _i2i(params) {
    try {
      const imageUrl = await this.resolveMedia(params.image);
      if (imageUrl?.error) return imageUrl;
      const key = this.nextKey();
      const q = qs.stringify({
        ...params,
        image: imageUrl
      });
      const res = await this.clients.gen.get(`/image/${encodeURIComponent(params.prompt)}?${q}`, {
        responseType: "arraybuffer",
        headers: this.authHeader(key)
      });
      return {
        type: "buffer",
        mime: "image/jpeg",
        data: Buffer.from(res.data)
      };
    } catch (error) {
      return this.err(`I2I Error: ${error.message}`);
    }
  }
  async audio({
    prompt,
    model = "openai-audio",
    voice = "alloy"
  }) {
    try {
      if (!prompt) return this.err("prompt required.");
      const key = this.nextKey();
      const q = qs.stringify({
        model: model,
        voice: voice
      });
      const res = await this.clients.gen.get(`/text/${encodeURIComponent(prompt)}?${q}`, {
        responseType: "arraybuffer",
        headers: this.authHeader(key)
      });
      return {
        type: "buffer",
        mime: "audio/mpeg",
        data: Buffer.from(res.data)
      };
    } catch (error) {
      return this.err(`Audio Error: ${error.message}`);
    }
  }
  async resolveMedia(media) {
    try {
      if (typeof media === "string" && /^https?:\/\//.test(media)) return media;
      let buf;
      if (Buffer.isBuffer(media)) {
        buf = media;
      } else if (typeof media === "string") {
        buf = Buffer.from(media.replace(/^data:image\/\w+;base64,/, ""), "base64");
      } else {
        return this.err("Media must be Buffer, base64, or URL.");
      }
      return await this.uploadToFreeImage(buf);
    } catch (error) {
      return this.err(`ResolveMedia Error: ${error.message}`);
    }
  }
  async uploadToFreeImage(buffer) {
    console.log(`[FreeImage] Uploading (${buffer.length} bytes)...`);
    try {
      const key = this.nextFreeImageKey();
      const form = new FormData();
      form.append("source", buffer, {
        filename: "upload.jpg"
      });
      form.append("action", "upload");
      const {
        data
      } = await axios.post(this.uploaderConfig.url, form, {
        params: {
          key: key,
          format: "json"
        },
        headers: {
          ...this.uploaderConfig.headers,
          ...form.getHeaders()
        }
      });
      if (data?.status_code !== 200) return this.err("FreeImage upload failed");
      console.log(`[FreeImage] Upload success: ${data.image.url}`);
      return data.image.url;
    } catch (error) {
      console.error("[FreeImage] Failed:", error.response?.data || error.message);
      return this.err(`FreeImage Error: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new PolliNations();
  try {
    const result = await api.run(params);
    if (result.type === "buffer") {
      res.setHeader("Content-Type", result.mime);
      return res.status(200).send(result.data);
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}