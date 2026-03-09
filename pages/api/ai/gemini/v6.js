import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class JazeAI {
  constructor() {
    this.cfg = {
      chatURL: "https://ai.jaze.top/api/chat",
      imageURL: "https://ai.jaze.top/api/image",
      uploadURL: `https://${apiConfig.DOMAIN_URL}/api/tools/upload`,
      model: "gemini-2.5-flash",
      provider: "google",
      search: false,
      type: "chat",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        authorization: "",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://ai.jaze.top",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://ai.jaze.top/c/9d54f152-68a6-4461-8744-ca3168357046",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      models: [{
        id: "gemini-2.5-flash",
        name: "gemini-2.5-flash",
        provider: "google",
        type: "chat",
        input: ["image", "search"],
        tag: ["new"]
      }, {
        id: "gemini-2.5-pro",
        name: "gemini-2.5-pro",
        provider: "google",
        type: "chat",
        input: ["image", "search"],
        tag: ["new"]
      }, {
        id: "@cf/ibm-granite/granite-4.0-h-micro",
        name: "granite-4.0-h-micro",
        provider: "workers-ai",
        type: "chat",
        tag: []
      }, {
        id: "@cf/meta/llama-4-scout-17b-16e-instruct",
        name: "llama-4-scout",
        provider: "workers-ai",
        type: "chat",
        tag: ["17b"]
      }, {
        id: "@cf/mistralai/mistral-small-3.1-24b-instruct",
        name: "mistral-small-3.1",
        provider: "workers-ai",
        type: "chat",
        tag: ["24b"]
      }, {
        id: "@cf/qwen/qwq-32b",
        name: "qwq",
        provider: "workers-ai",
        type: "chat",
        tag: ["32b"]
      }, {
        id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
        name: "deepseek-r1-distill-qwen",
        provider: "workers-ai",
        type: "chat",
        tag: ["32b"]
      }, {
        id: "@cf/bytedance/stable-diffusion-xl-lightning",
        name: "stable-diffusion-xl-lightning",
        provider: "workers-ai",
        type: "image"
      }, {
        id: "@cf/black-forest-labs/flux-1-schnell",
        name: "flux-1-schnell",
        provider: "workers-ai",
        type: "image"
      }, {
        id: "@cf/leonardo/lucid-origin",
        name: "lucid-origin",
        provider: "workers-ai",
        type: "image"
      }, {
        id: "@cf/lykon/dreamshaper-8-lcm",
        name: "dreamshaper-8-lcm",
        provider: "workers-ai",
        type: "image"
      }]
    };
    this.messages = [];
    console.log("[init] Config:", {
      model: this.cfg.model,
      type: this.cfg.type
    });
  }
  info(modelId) {
    try {
      console.log("[info] Model:", modelId);
      const model = this.cfg.models?.find(m => m?.id === modelId) || null;
      return model;
    } catch (error) {
      console.error("[info] Error:", error?.message || error);
      return null;
    }
  }
  byProvider(provider) {
    try {
      console.log("[byProvider]:", provider);
      return this.cfg.models?.filter(m => m?.provider === provider) || [];
    } catch (error) {
      console.error("[byProvider] Error:", error?.message || error);
      return [];
    }
  }
  byType(type) {
    try {
      console.log("[byType]:", type);
      return this.cfg.models?.filter(m => m?.type === type) || [];
    } catch (error) {
      console.error("[byType] Error:", error?.message || error);
      return [];
    }
  }
  detect(modelId) {
    try {
      console.log("[detect]:", modelId);
      const model = this.info(modelId);
      return model?.provider || this.cfg.provider;
    } catch (error) {
      console.error("[detect] Error:", error?.message || error);
      return this.cfg.provider;
    }
  }
  set(modelId) {
    try {
      console.log("[set]:", modelId);
      const model = this.info(modelId);
      if (!model) {
        console.warn("[set] Not found");
        return false;
      }
      this.cfg.model = modelId;
      this.cfg.provider = this.detect(modelId);
      this.cfg.type = model?.type || "chat";
      console.log("[set] Success");
      return true;
    } catch (error) {
      console.error("[set] Error:", error?.message || error);
      return false;
    }
  }
  async b64(input) {
    try {
      console.log("[b64] Processing...");
      if (Buffer.isBuffer(input)) {
        console.log("[b64] Buffer");
        return input.toString("base64");
      }
      if (typeof input === "string" && input?.startsWith("http")) {
        console.log("[b64] URL");
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res?.data)?.toString("base64") || "";
      }
      console.log("[b64] Base64");
      return input;
    } catch (error) {
      console.error("[b64] Error:", error?.message || error);
      throw error;
    }
  }
  async upload(buffer) {
    try {
      console.log("[upload] Uploading to wudysoft...");
      const form = new FormData();
      form.append("file", buffer, {
        filename: `image_${Date.now()}.png`
      });
      const res = await axios.post(this.cfg.uploadURL, form, {
        headers: {
          ...form.getHeaders()
        }
      });
      console.log("[upload] Success");
      return res?.data || null;
    } catch (error) {
      console.error("[upload] Error:", error?.message || error);
      throw error;
    }
  }
  async img({
    prompt,
    model,
    ...rest
  }) {
    try {
      console.log("[img] Start...");
      const selectedModel = model || this.cfg.model;
      const modelInfo = this.info(selectedModel);
      if (modelInfo?.type !== "image") {
        console.warn("[img] Not image model");
        return {
          result: null,
          error: "Not an image model"
        };
      }
      const payload = {
        prompt: prompt,
        model: selectedModel,
        ...rest
      };
      console.log("[img] Generating...");
      const res = await axios.post(this.cfg.imageURL, payload, {
        headers: {
          ...this.cfg.headers,
          referer: "https://ai.jaze.top/image"
        },
        responseType: "arraybuffer"
      });
      console.log("[img] Uploading...");
      const buffer = Buffer.from(res?.data);
      const result = await this.upload(buffer);
      console.log("[img] Done");
      return {
        model: selectedModel,
        ...result
      };
    } catch (error) {
      console.error("[img] Error:", error?.message || error);
      throw error;
    }
  }
  async chat({
    prompt,
    image,
    messages,
    model,
    provider,
    ...rest
  }) {
    try {
      console.log("[chat] Start...");
      this.messages = messages || this.messages || [];
      const parts = [];
      if (image) {
        console.log("[chat] Processing image...");
        const images = Array.isArray(image) ? image : [image];
        for (const img of images) {
          const base64 = await this.b64(img);
          parts.push({
            type: "file",
            filename: `image_${Date.now()}.jpg`,
            mediaType: "image/jpeg",
            url: `data:image/jpeg;base64,${base64}`
          });
          console.log("[chat] Image added");
        }
      }
      if (prompt) {
        parts.push({
          type: "text",
          text: prompt
        });
        console.log("[chat] Prompt added");
      }
      this.messages.push({
        id: Math.random().toString(36).substring(2, 15),
        role: "user",
        parts: parts
      });
      const selectedModel = model || this.cfg.model;
      const selectedProvider = provider || this.detect(selectedModel);
      const payload = {
        messages: this.messages,
        model: selectedModel,
        provider: selectedProvider,
        search: rest?.search ?? this.cfg.search,
        ...rest
      };
      console.log("[chat] Model:", selectedModel, "Provider:", selectedProvider);
      console.log("[chat] Requesting...");
      const res = await axios.post(this.cfg.chatURL, payload, {
        headers: this.cfg.headers,
        responseType: "text"
      });
      console.log("[chat] Parsing...");
      const result = res?.data?.split("\n")?.filter(line => line?.trim()?.startsWith("data:"))?.map(line => line?.slice(5)?.trim())?.filter(data => data && data !== "[DONE]")?.map(data => {
        try {
          return JSON.parse(data);
        } catch {
          return null;
        }
      })?.filter(Boolean) || [];
      const text = result?.filter(item => item?.type === "text-delta")?.map(item => item?.delta || "")?.join("") || "";
      console.log("[chat] Done");
      return {
        result: text,
        messages: this.messages,
        model: selectedModel,
        provider: selectedProvider
      };
    } catch (error) {
      console.error("[chat] Error:", error?.message || error);
      throw error;
    }
  }
  async generate({
    type,
    ...opts
  }) {
    try {
      console.log("[exec] Type:", type || this.cfg.type);
      const execType = type || this.cfg.type;
      if (execType === "image") {
        return await this.img(opts);
      }
      return await this.chat(opts);
    } catch (error) {
      console.error("[exec] Error:", error?.message || error);
      throw error;
    }
  }
  reset() {
    try {
      console.log("[reset] Clearing...");
      this.messages = [];
      return true;
    } catch (error) {
      console.error("[reset] Error:", error?.message || error);
      return false;
    }
  }
  get() {
    try {
      console.log("[get] Config");
      return {
        ...this.cfg
      };
    } catch (error) {
      console.error("[get] Error:", error?.message || error);
      return {};
    }
  }
  update(newCfg = {}) {
    try {
      console.log("[update] Config...");
      this.cfg = {
        ...this.cfg,
        ...newCfg,
        headers: {
          ...this.cfg.headers,
          ...newCfg?.headers
        }
      };
      return true;
    } catch (error) {
      console.error("[update] Error:", error?.message || error);
      return false;
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
  const api = new JazeAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}