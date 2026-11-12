import axios from "axios";
class ZyraAI {
  constructor() {
    this.baseUrl = "https://firebasevertexai.googleapis.com/v1beta/projects/chatbot-v-e893f";
    this.imgUrl = "https://getimg-x4mrsuupda-uc.a.run.app/api-premium";
    this.chatUrl = null;
  }
  hdr(type = "chat") {
    return type === "chat" ? {
      "User-Agent": "ktor-client",
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "x-firebase-appcheck": "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==",
      "x-goog-api-key": "AIzaSyAYNGz4qJfVc4Y7v0ZEn3H6vrDtAb1h-Y8",
      "x-goog-api-client": "gl-kotlin/2.2.0-ai fire/17.10.0",
      "x-android-package": "gpt.text.ai.newchatbot",
      "x-android-cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81",
      "x-firebase-appid": "1:495591782981:android:65a53f6a2bc815cd25412c",
      "x-firebase-appversion": "13",
      "accept-charset": "UTF-8"
    } : {
      "User-Agent": "okhttp/4.12.0",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/x-www-form-urlencoded",
      "dzine-media-api": "E64FUZgN4AGZ8yZr"
    };
  }
  async med(input) {
    try {
      if (!input) return null;
      console.log("[LOG] Resolving media input...");
      let data = "",
        mimeType = "image/png";
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          console.log("[LOG] Fetching remote media URL...");
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          mimeType = res.headers?.["content-type"] || "image/png";
          data = Buffer.from(res.data).toString("base64");
        } else if (input.includes(";base64,")) {
          const parts = input.split(";base64,");
          mimeType = parts[0]?.slice(5) || "image/png";
          data = parts[1] || "";
        } else {
          data = input;
        }
      } else if (Buffer.isBuffer(input)) {
        data = input.toString("base64");
      } else if (typeof input === "object") {
        const raw = input?.data || input;
        data = Buffer.isBuffer(raw) ? raw.toString("base64") : raw || "";
        mimeType = input?.mimeType || input?.mime_type || "image/png";
      }
      return {
        inlineData: {
          mimeType: mimeType || "image/png",
          data: data || ""
        },
        thought: false
      };
    } catch (err) {
      console.log("[LOG] Failed resolving media:", err?.message || err);
      return null;
    }
  }
  prs(line) {
    try {
      const trimmed = line?.trim() || "";
      if (!trimmed.startsWith("data:")) return null;
      return JSON.parse(trimmed.slice(5));
    } catch {
      return null;
    }
  }
  async generate({
    mode = "chat",
    prompt = "",
    messages = [],
    media = null,
    ...rest
  } = {}) {
    try {
      console.log(`[LOG] Starting generation mode: ${mode}`);
      switch (mode) {
        case "image":
          return await this.image({
            prompt: prompt,
            ...rest
          });
        case "chat":
        default:
          return await this.chat({
            prompt: prompt,
            messages: messages,
            media: media,
            ...rest
          });
      }
    } catch (err) {
      console.log("[LOG] Error in generate:", err?.message || err);
      return {
        status: false,
        result: null
      };
    }
  }
  async chat({
    prompt = "",
    messages = [],
    media = null,
    ...rest
  } = {}) {
    try {
      console.log("[LOG] Preparing chat payload...");
      const model = rest?.model || "gemini-2.5-flash";
      this.chatUrl = rest?.chatUrl || `${this.baseUrl}/models/${model}:streamGenerateContent?alt=sse`;
      const formattedModel = model.includes("/") ? model : `projects/chatbot-v-e893f/models/${model}`;
      const contents = [];
      const msgList = Array.isArray(messages) ? messages : [];
      for (const msg of msgList) {
        if (msg?.role && msg?.parts) {
          contents.push(msg);
        } else if (msg?.text || msg?.content) {
          contents.push({
            role: msg?.role || "user",
            parts: [{
              text: msg?.text || msg?.content,
              thought: false
            }]
          });
        }
      }
      const userParts = [];
      if (prompt) {
        userParts.push({
          text: prompt,
          thought: false
        });
      }
      const mediaList = Array.isArray(media) ? media : media ? [media] : [];
      for (const item of mediaList) {
        const resMed = await this.med(item);
        if (resMed) userParts.push(resMed);
      }
      if (userParts.length > 0) {
        contents.push({
          role: "user",
          parts: userParts
        });
      }
      const payload = {
        model: formattedModel,
        contents: contents,
        tools: rest?.tools || [],
        ...rest
      };
      console.log(`[LOG] Executing chat HTTP stream to ${this.chatUrl}...`);
      const res = await axios.post(this.chatUrl, payload, {
        headers: this.hdr("chat"),
        responseType: "stream"
      });
      let fullText = "";
      const chunks = [];
      await new Promise((resolve, reject) => {
        res.data.on("data", chunk => {
          const lines = chunk.toString().split("\n");
          for (const line of lines) {
            const parsed = this.prs(line);
            if (parsed) {
              chunks.push(parsed);
              const textPart = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (textPart) fullText += textPart;
            }
          }
        });
        res.data.on("end", resolve);
        res.data.on("error", reject);
      });
      console.log("[LOG] Stream finished successfully.");
      const updatedHistory = [...contents, {
        role: "model",
        parts: [{
          text: fullText,
          thought: false
        }]
      }];
      return {
        status: true,
        result: fullText || "",
        chunks: chunks || [],
        history: updatedHistory || []
      };
    } catch (err) {
      console.log("[LOG] Chat execution error:", err?.message || err);
      return {
        status: false,
        result: null,
        chunks: [],
        history: messages || []
      };
    }
  }
  async image({
    prompt = "",
    width = 512,
    height = 512,
    steps = 20,
    ...rest
  } = {}) {
    try {
      console.log("[LOG] Preparing image payload...");
      const payloadObj = {
        prompt: prompt || "",
        width: width || 512,
        height: height || 512,
        num_inference_steps: steps || 20,
        ...rest
      };
      const params = new URLSearchParams();
      for (const [key, val] of Object.entries(payloadObj)) {
        if (val !== undefined && val !== null) {
          params.append(key, String(val));
        }
      }
      console.log("[LOG] Requesting image API...");
      const res = await axios.post(this.imgUrl, params.toString(), {
        headers: this.hdr("image")
      });
      console.log("[LOG] Image generated successfully.");
      return {
        status: true,
        result: res?.data || null
      };
    } catch (err) {
      console.log("[LOG] Image generation error:", err?.message || err);
      return {
        status: false,
        result: null
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
  const api = new ZyraAI();
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