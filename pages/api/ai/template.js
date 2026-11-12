import axios from "axios";
import crypto from "crypto";
import * as cheerio from "cheerio";
class TemplateNetAI {
  constructor() {
    this.baseUrl = "https://ai-tool-service.template.net";
    this.modes = ["chat", "image"];
    this.defaultHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://www.template.net",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.template.net/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: this.defaultHeaders
    });
  }
  async _getM() {
    try {
      console.log("[Process] Fetching available models...");
      const res = await this.client.get("/limitation/models", {
        headers: {
          ...this.defaultHeaders,
          accept: "*/*"
        }
      });
      return res?.data?.result || [];
    } catch (err) {
      console.log("[Error] Failed to fetch models:", err?.message);
      return [];
    }
  }
  async _upI(img) {
    try {
      console.log("[Process] Preparing image upload...");
      let buf;
      let contentType = "image/jpeg";
      if (Buffer.isBuffer(img)) {
        buf = img;
      } else if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          console.log("[Process] Downloading image from URL...");
          const download = await axios.get(img, {
            responseType: "arraybuffer"
          });
          buf = Buffer.from(download.data);
          contentType = download.headers["content-type"] || contentType;
        } else if (img.startsWith("data:image/")) {
          console.log("[Process] Parsing base64 image data URI...");
          const mime = img.match(/data:(.*?);base64,/);
          contentType = mime ? mime[1] : contentType;
          buf = Buffer.from(img.split(";base64,").pop(), "base64");
        } else {
          console.log("[Process] Decoding plain base64 string...");
          buf = Buffer.from(img, "base64");
        }
      }
      if (!buf) {
        return {
          error_message: "invalid_image_format"
        };
      }
      const ext = contentType.split("/").pop() || "jpeg";
      const rand = crypto.randomBytes(8).toString("hex");
      console.log(`[Process] Requesting presigned URL for: ${rand}`);
      const presignRes = await axios.get(`https://msapi.template.net/image/upload/pre-signed-for-guest?nameFile=${rand}`, {
        headers: {
          ...this.defaultHeaders,
          accept: "*/*",
          "content-type": contentType
        }
      });
      const uploadUrl = presignRes?.data?.url;
      if (!uploadUrl) {
        return {
          error_message: "failed_to_get_presigned_url"
        };
      }
      console.log("[Process] Uploading image payload to S3...");
      await axios.put(uploadUrl, buf, {
        headers: {
          "Content-Type": contentType,
          "x-amz-acl": "public-read"
        }
      });
      const cleanUrl = uploadUrl.split("?")[0];
      console.log(`[Process] Image successfully uploaded: ${cleanUrl}`);
      return {
        url: cleanUrl
      };
    } catch (err) {
      console.log("[Error] Image upload execution failed:", err?.message);
      return {
        error_message: err?.message
      };
    }
  }
  async _pol(jobId) {
    try {
      console.log(`[Process] Starting polling sequence for job ID: ${jobId}`);
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        const res = await this.client.get(`/api/v2/image-generation/status/${jobId}`, {
          headers: {
            ...this.defaultHeaders,
            "content-type": undefined
          }
        });
        const status = res?.data?.status;
        console.log(`[Process] Polling status (Attempt ${i + 1}): ${status}`);
        if (status === "completed") {
          return res?.data?.data?.urls || [];
        }
        if (status === "failed") {
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 3e3));
      }
      return null;
    } catch (err) {
      console.log("[Error] Polling operation encountered an issue:", err?.message);
      return null;
    }
  }
  async _sse(stream) {
    try {
      return new Promise(resolve => {
        let buffer = "";
        let html = "";
        stream.on("data", chunk => {
          try {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (line.startsWith("data:")) {
                const val = line.slice(5).trim();
                if (val) {
                  html += val;
                }
              }
            }
          } catch (chunkErr) {
            console.log("[Error] Failed parsing stream chunk:", chunkErr?.message);
          }
        });
        stream.on("end", () => {
          try {
            if (buffer.startsWith("data:")) {
              html += buffer.slice(5).trim();
            }
          } catch (endErr) {
            console.log("[Error] Stream end parsing failed:", endErr?.message);
          }
          resolve(html);
        });
        stream.on("error", err => {
          console.log("[Error] Stream interpretation interrupted:", err?.message);
          resolve(html);
        });
      });
    } catch (err) {
      console.log("[Error] SSE wrapper encountered a failure:", err?.message);
      return "";
    }
  }
  async generate({
    mode,
    prompt,
    messages,
    image,
    model,
    ...rest
  }) {
    try {
      console.log("[Process] Initializing validation parameters...");
      const activeMode = mode || "chat";
      if (!this.modes.includes(activeMode)) {
        console.log(`[Error] Mode selection rejected: "${activeMode}"`);
        return {
          status: "error",
          error_message: `Invalid mode: "${activeMode}". Approved values: ${this.modes.join(", ")}`
        };
      }
      const modelsList = await this._getM();
      const textModels = modelsList.filter(m => m.type === "text").map(m => m.value);
      const imageModels = modelsList.filter(m => m.type === "image" || m.type === "video").map(m => m.value);
      const defaultTextModel = "gpt-4o-mini";
      const defaultImageModel = "gemini-3.1-flash-lite-image";
      let selectedModel = model;
      if (activeMode === "chat") {
        if (!selectedModel || !textModels.includes(selectedModel)) {
          console.log(`[Warning] Selected model "${selectedModel}" unavailable. Substituting: ${defaultTextModel}`);
          selectedModel = defaultTextModel;
        }
      } else if (activeMode === "image") {
        if (!selectedModel || !imageModels.includes(selectedModel)) {
          console.log(`[Warning] Selected model "${selectedModel}" unavailable. Substituting: ${defaultImageModel}`);
          selectedModel = defaultImageModel;
        }
      }
      const uploadedUrls = [];
      if (image) {
        const imageList = Array.isArray(image) ? image : [image];
        for (const imgItem of imageList) {
          const uploadRes = await this._upI(imgItem);
          if (uploadRes?.url) {
            uploadedUrls.push(uploadRes.url);
          }
        }
      }
      const formattedModels = modelsList.map(m => ({
        name: m.name,
        value: m.value,
        type: m.type
      }));
      let outputResult;
      switch (activeMode) {
        case "chat": {
          const conversationHistory = [];
          const msgList = messages || [];
          for (const msg of msgList) {
            conversationHistory.push({
              role: msg.role || "user",
              content: msg.content || ""
            });
          }
          const payload = {
            prompt: prompt || "Hai",
            conversationHistory: conversationHistory,
            stream: true,
            developerMessages: true,
            responseFormat: rest?.responseFormat || "html",
            isWebSearch: rest?.isWebSearch || false,
            conversationId: rest?.conversationId || crypto.randomBytes(11).toString("hex"),
            editorType: rest?.editorType || "",
            countryCode: rest?.countryCode || "ID",
            fromPage: rest?.fromPage || "/ai-image-generator",
            askBrandIfMissing: rest?.askBrandIfMissing ?? true,
            fileUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
            ...rest
          };
          console.log(`[Process] Executing conversational pipeline using: ${selectedModel}`);
          const response = await this.client.post("/api/v4/chat-content", payload, {
            responseType: "stream",
            headers: {
              Referer: "https://www.template.net/",
              "User-Agent": this.defaultHeaders["user-agent"],
              "Content-Type": "application/json"
            }
          });
          const rawHtml = await this._sse(response.data);
          const $ = cheerio.load(rawHtml || "");
          const plainText = $.text().trim();
          outputResult = {
            status: "success",
            result: {
              text: plainText,
              html: rawHtml,
              available_models: formattedModels,
              conversation_id: payload.conversationId,
              model_used: selectedModel
            }
          };
          break;
        }
        case "image": {
          const payload = {
            prompt: prompt || "Generate an image",
            model: selectedModel,
            aspect_ratio: rest?.aspect_ratio ?? "16:9",
            sampleCount: rest?.sampleCount || 1,
            from: rest?.from || "/ai-image-generator__ai-image-generator",
            countryCode: rest?.countryCode || "ID",
            ...rest
          };
          if (uploadedUrls.length > 0) {
            payload.image_urls = uploadedUrls;
            payload.imageRefSize = uploadedUrls[0];
            payload.from = rest?.from || "/ai-photo-editor__ai-photo-editor";
            payload.aspect_ratio = rest?.aspect_ratio ?? "";
          }
          console.log(`[Process] Initiating image creation sequence using: ${selectedModel}`);
          const res = await this.client.post("/api/v2/image-generate-by-model", payload, {
            headers: this.defaultHeaders
          });
          if (!res?.data?.success || !res?.data?.jobId) {
            outputResult = {
              status: "error",
              error_message: "Service rejected generation payload or queue is full."
            };
            break;
          }
          const jobId = res.data.jobId;
          const resultUrls = await this._pol(jobId);
          if (!resultUrls) {
            outputResult = {
              status: "error",
              error_message: "Job status polling exceeded maximum threshold limit."
            };
            break;
          }
          outputResult = {
            status: "success",
            result: {
              urls: resultUrls,
              available_models: formattedModels,
              job_id: jobId,
              model_used: selectedModel
            }
          };
          break;
        }
        default: {
          outputResult = {
            status: "error",
            error_message: `Unhandled mode encountered: ${activeMode}`
          };
          break;
        }
      }
      return outputResult;
    } catch (err) {
      console.log("[Error] Processing exception encountered:", err?.message);
      return {
        status: "error",
        error_message: err?.message || "Execution error"
      };
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
  const api = new TemplateNetAI();
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