import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class NanoBanana {
  constructor() {
    this.base = "https://nanobananaprolabs.com";
    this.ax = axios.create({
      baseURL: this.base,
      timeout: 12e4,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: this.base,
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${this.base}/`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    this.cookie = "";
    if (this.cookie) this.ax.defaults.headers.cookie = this.cookie;
    this.pollInt = 3e3;
    this.maxPoll = 60;
  }
  log(m, d) {
    console.log(`[${new Date().toISOString()}] ${m}`, d || "");
  }
  async req(url, data, method = "POST") {
    try {
      this.log(`${method} ${url}`);
      const res = await this.ax({
        url: url,
        method: method,
        data: data
      });
      return res?.data || null;
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message;
      this.log("Error:", msg);
      throw new Error(msg);
    }
  }
  mime(filename) {
    const ext = (filename || "").split(".").pop()?.toLowerCase();
    const types = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      bmp: "image/bmp",
      mp4: "video/mp4",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      webm: "video/webm",
      mkv: "video/x-matroska"
    };
    return types[ext] || "application/octet-stream";
  }
  async upload(media, folder = "wavespeed/uploads") {
    try {
      let buffer, type, name;
      if (typeof media === "string") {
        if (media.startsWith("http")) {
          this.log("Download URL...");
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(res.data);
          type = res.headers["content-type"] || "image/jpeg";
          name = media.split("/").pop()?.split("?")[0] || "file.jpg";
        } else if (media.startsWith("data:")) {
          this.log("Convert base64...");
          const [meta, data] = media.split(",");
          type = meta.match(/:(.*?);/)?.[1] || "image/jpeg";
          buffer = Buffer.from(data, "base64");
          name = `file.${type.split("/")[1] || "jpg"}`;
        } else {
          throw new Error("Invalid string");
        }
      } else if (Buffer.isBuffer(media)) {
        buffer = media;
        type = "image/jpeg";
        name = "file.jpg";
      } else if (media?.buffer) {
        buffer = media.buffer;
        type = media.mimetype || this.mime(media.originalname || media.name);
        name = media.originalname || media.name || "file";
      } else {
        throw new Error("Unsupported type");
      }
      this.log("Presign...", {
        name: name,
        type: type,
        size: buffer.length
      });
      const presign = await this.req("/api/storage/presign", {
        filename: name,
        contentType: type,
        folder: folder
      });
      if (!presign?.uploadUrl) throw new Error("No uploadUrl");
      this.log("Upload R2...");
      await axios.put(presign.uploadUrl, buffer, {
        headers: {
          "Content-Type": type,
          "Content-Length": buffer.length
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      this.log("Upload OK:", presign.url);
      return presign.url;
    } catch (err) {
      this.log("Upload fail:", err?.message);
      throw err;
    }
  }
  async poll(taskId, endpoint) {
    this.log("Poll start:", taskId);
    for (let i = 0; i < this.maxPoll; i++) {
      try {
        const res = await this.req(endpoint, null, "GET");
        const data = res?.data || res;
        const status = data?.status || "pending";
        this.log(`Poll ${i + 1}/${this.maxPoll}:`, status);
        if (status === "done" || status === "completed") {
          return {
            success: true,
            taskId: taskId,
            urls: data?.output?.urls || data?.urls || [],
            credits: data?.creditsUsed || 0,
            metadata: data?.metadata || {}
          };
        }
        if (status === "failed") {
          return {
            success: false,
            error: data?.error || "Failed",
            taskId: taskId,
            urls: []
          };
        }
        await new Promise(r => setTimeout(r, this.pollInt));
      } catch (err) {
        this.log("Poll err:", err?.message);
        if (i === this.maxPoll - 1) throw err;
        await new Promise(r => setTimeout(r, this.pollInt));
      }
    }
    throw new Error("Timeout");
  }
  async generate(params) {
    try {
      const type = params.type || this.detectType(params);
      const {
        prompt,
        image,
        video,
        ...rest
      } = params;
      this.log("Generate:", {
        type: type,
        prompt: prompt?.slice?.(0, 50)
      });
      const config = this.getConfig(type);
      let payload = {
        prompt: prompt?.trim?.() || "",
        ...rest
      };
      if (config.needsImage && image) {
        const imgs = Array.isArray(image) ? image : [image];
        const urls = [];
        for (const img of imgs) {
          const url = await this.upload(img);
          urls.push(url);
        }
        if (config.multiImage) {
          payload[config.imageField] = urls;
        } else {
          payload[config.imageField] = urls[0];
        }
      }
      payload = this.buildPayload(type, payload);
      this.log("POST:", config.endpoint);
      const res = await this.req(config.endpoint, payload);
      const taskId = res?.taskId || res?.data?.taskId;
      if (!taskId) throw new Error("No taskId");
      this.log("Task:", taskId);
      const pollEp = config.pollEndpoint.replace("{taskId}", taskId);
      const result = await this.poll(taskId, pollEp);
      this.log("Done!", {
        ok: result?.success,
        n: result?.urls?.length
      });
      return result;
    } catch (err) {
      this.log("Gen fail:", err?.message);
      return {
        success: false,
        error: err?.message
      };
    }
  }
  detectType(params) {
    if (params.mode === "text-to-image") return "t2i";
    if (params.mode === "image-editing") return "i2i";
    if (params.mode === "text-to-video") return "t2v";
    if (params.mode === "image-to-video") return "i2v";
    const hasImage = !!(params.image || params.image_urls);
    const isVideo = params.video === true;
    if (isVideo) {
      return hasImage ? "i2v" : "t2v";
    } else {
      return hasImage ? "i2i" : "t2i";
    }
  }
  getConfig(type) {
    const configs = {
      t2i: {
        endpoint: "/api/ai/image/nano-banana/generate",
        pollEndpoint: "/api/ai/image/nano-banana/status/{taskId}",
        needsImage: false,
        imageField: null,
        multiImage: false
      },
      i2i: {
        endpoint: "/api/ai/image/nano-banana/generate",
        pollEndpoint: "/api/ai/image/nano-banana/status/{taskId}",
        needsImage: true,
        imageField: "image_urls",
        multiImage: true
      },
      t2v: {
        endpoint: "/api/ai/video/wavespeed/text-to-video",
        pollEndpoint: "/api/ai/video/wavespeed/text-to-video?taskId={taskId}",
        needsImage: false,
        imageField: null,
        multiImage: false
      },
      i2v: {
        endpoint: "/api/ai/video/wavespeed/image-to-video",
        pollEndpoint: "/api/ai/video/wavespeed/image-to-video?taskId={taskId}",
        needsImage: true,
        imageField: "image",
        multiImage: false
      }
    };
    return configs[type] || configs.t2i;
  }
  buildPayload(type, params) {
    const base = {
      prompt: params.prompt || "",
      negative_prompt: params.negative_prompt || params.negativePrompt,
      enable_prompt_expansion: params.enable_prompt_expansion ?? true,
      seed: params.seed ?? -1
    };
    switch (type) {
      case "t2i":
        return {
          mode: "text-to-image", ...base,
            num_images: params.num_images || 1,
            aspect_ratio: params.aspect_ratio || "1:1",
            output_format: params.output_format || "png",
            resolution: params.resolution || "2k",
            provider: "wavespeed"
        };
      case "i2i":
        return {
          mode: "image-editing", ...base,
            image_urls: params.image_urls || [],
            num_images: params.num_images || 1,
            aspect_ratio: params.aspect_ratio || "1:1",
            output_format: params.output_format || "png",
            resolution: params.resolution || "2k",
            strength: params.strength || .6,
            provider: "wavespeed"
        };
      case "t2v":
        return {
          ...base,
          size: params.size || "1280*720",
            duration: params.duration || 5,
            shot_type: params.shot_type || "single",
            audio: params.audio
        };
      case "i2v":
        return {
          ...base,
          image: params.image || "",
            model: params.model || "wan21",
            resolution: params.resolution || "720p",
            duration: params.duration || 5,
            shot_type: params.shot_type || "single",
            audio: params.audio
        };
      default:
        return base;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new NanoBanana();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}