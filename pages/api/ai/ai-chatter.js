import axios from "axios";
class OpenAiClient {
  constructor() {
    try {
      console.log("[LOG] Inisialisasi OpenAiClient...");
      const baseURL = "https://us-central1-chatbot-7fcff.cloudfunctions.net";
      const token = "fI46C-gSQSi7IsRcNXmXsO:APA91bHuJjttolaYFT5CdkgIzzJSp5mdHM92Koy-e2b4pae8pvzWq7KVmlyoYpYzK8GhxbF8rcqeqsJRnO41KOZkLlPJAwLILuJ8_4vqkjqGeRGe8c51Qg4";
      const appCheck = "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==";
      this.modes = ["chat", "image"];
      this.models = {
        chat: ["gpt-4o-mini", "gpt-4o", "gpt-4", "o1", "gpt-5-chat-latest", "gpt-5.2"],
        image: ["gpt-image-1"]
      };
      this.api = axios.create({
        baseURL: baseURL,
        headers: {
          "User-Agent": "okhttp/3.14.9",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          "firebase-instance-id-token": token,
          "x-firebase-appcheck": appCheck
        }
      });
      console.log("[LOG] Client berhasil dibuat.");
    } catch (err) {
      console.log("[LOG] Error Constructor:", err?.message || err);
      return {
        status: 500,
        error: err?.message || err
      };
    }
  }
  vld(mode, model) {
    try {
      console.log(`[LOG] Memvalidasi mode '${mode}' dan model '${model}'...`);
      if (!this.modes.includes(mode)) {
        return {
          valid: false,
          message: `Mode '${mode}' tidak valid. Mode yang tersedia: ${this.modes.join(", ")}`
        };
      }
      const validModels = this.models[mode] || [];
      if (model && !validModels.includes(model)) {
        return {
          valid: false,
          message: `Model '${model}' tidak valid untuk mode '${mode}'. Model yang tersedia: ${validModels.join(", ")}`
        };
      }
      return {
        valid: true
      };
    } catch (err) {
      console.log("[LOG] Error Validasi:", err?.message || err);
      return {
        valid: false,
        message: err?.message || err
      };
    }
  }
  async cht({
    prompt,
    messages,
    model,
    ...rest
  }) {
    try {
      console.log("[LOG] Eksekusi mode chat...");
      const msgList = Array.isArray(messages) ? messages : [];
      if (msgList.length === 0) {
        msgList.push({
          role: "system",
          content: "You are a intelligent AI assistant. Your purpose is to assist users with accurate, respectful, and appropriate responses. Under no circumstances should you generate or engage with adult-related content, including explicit language, sexual topics. If a request violates this guideline, politely decline and redirect the conversation to a neutral, helpful topic. Focus on providing clear, concise, and constructive answers to user queries."
        });
      }
      if (prompt) {
        console.log("[LOG] Auto-push user prompt ke messages...");
        msgList.push({
          role: "user",
          content: prompt
        });
      }
      const defaultPayload = {
        temperature: 1,
        messages: msgList,
        model: model
      };
      const payload = {
        data: {
          ...defaultPayload,
          ...rest,
          messages: msgList,
          model: model
        }
      };
      console.log("[LOG] Mengirim data ke /openAIChat...");
      const res = await this.api.post("/openAIChat", payload);
      const botMsg = res?.data?.result?.choices?.[0]?.message;
      if (botMsg) {
        console.log("[LOG] Auto-push respon assistant ke messages...");
        msgList.push(botMsg);
      }
      console.log("[LOG] Respon chat berhasil diterima!");
      return {
        status: res?.status || 200,
        result: botMsg?.content || ""
      };
    } catch (err) {
      console.log("[LOG] Error cht():", err?.response?.data || err?.message || err);
      return {
        status: err?.response?.status || 500,
        result: err?.response?.data || err?.message || "Error occurred"
      };
    }
  }
  async img({
    prompt,
    model,
    ...rest
  }) {
    try {
      console.log("[LOG] Eksekusi mode image...");
      if (!prompt) {
        return {
          status: 400,
          buffer: null,
          contentType: null,
          error: "Prompt wajib diisi untuk mode image."
        };
      }
      const defaultPayload = {
        size: "1024x1024",
        model: model,
        prompt: prompt,
        n: 1
      };
      const payload = {
        data: {
          ...defaultPayload,
          ...rest,
          prompt: prompt,
          model: model
        }
      };
      console.log("[LOG] Mengirim data ke /imagine...");
      const res = await this.api.post("/imagine", payload);
      const rawResult = res?.data?.result;
      const b64Data = rawResult?.data?.[0]?.b64_json || "";
      const format = rawResult?.output_format || "png";
      const buffer = Buffer.from(b64Data, "base64");
      const contentType = `image/${format}`;
      console.log("[LOG] Respon image berhasil diterima dan di-buffer!");
      return {
        status: res?.status || 200,
        buffer: buffer,
        contentType: contentType
      };
    } catch (err) {
      console.log("[LOG] Error img():", err?.response?.data || err?.message || err);
      return {
        status: err?.response?.status || 500,
        buffer: null,
        contentType: null
      };
    }
  }
  async generate({
    mode = "chat",
    prompt,
    messages,
    model,
    ...rest
  }) {
    try {
      console.log(`[LOG] Memproses generate() | Mode: ${mode}`);
      const selectedModel = model ? model : mode === "chat" ? "gpt-4o-mini" : "gpt-image-1";
      const check = this.vld(mode, selectedModel);
      if (!check.valid) {
        console.log("[LOG] Validasi gagal:", check.message);
        return {
          status: 400,
          result: check.message,
          buffer: null,
          contentType: null
        };
      }
      let res = null;
      switch (mode) {
        case "chat":
          res = await this.cht({
            prompt: prompt,
            messages: messages,
            model: selectedModel,
            ...rest
          });
          break;
        case "image":
          res = await this.img({
            prompt: prompt,
            model: selectedModel,
            ...rest
          });
          break;
        default:
          res = {
            status: 400,
            result: `Mode '${mode}' tidak didukung.`,
            buffer: null,
            contentType: null
          };
          break;
      }
      return res;
    } catch (err) {
      console.log("[LOG] Error generate():", err?.response?.data || err?.message || err);
      return {
        status: err?.response?.status || 500,
        result: err?.response?.data || err?.message || "Internal Server Error",
        buffer: null,
        contentType: null
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
  const api = new OpenAiClient();
  try {
    const data = await api.generate(params);
    if (data?.buffer) {
      res.setHeader("Content-Type", data.contentType || "image/png");
      return res.status(data?.status || 200).send(data.buffer);
    }
    return res.status(data?.status || 200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}