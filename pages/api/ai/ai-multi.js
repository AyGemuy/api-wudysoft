import axios from "axios";
class AiClient {
  constructor() {
    this.token = null;
    this.cfg = {
      openai: {
        prompt: "You MUST answer in the EXACT same language as the user question.\nFormatting rules:\n- No tables."
      },
      claude: {
        prompt: "You MUST answer in the EXACT same language as the user question.\nFormatting rules:\n- No tables."
      },
      deepseek: {
        prompt: "Never reply in Chinese unless requested.\nFormatting rules:\n- No tables."
      },
      grok: {
        prompt: "You MUST answer in the EXACT same language as the user question."
      },
      llama: {
        prompt: "You MUST answer in the EXACT same language as the user question."
      },
      perplexity: {
        prompt: "You MUST answer in the EXACT same language as the user question."
      },
      mistral: {
        prompt: "You MUST answer in the EXACT same language as the user question."
      },
      gemini: {
        prompt: "You MUST answer in the EXACT same language as the user question."
      }
    };
    this.url = "https://ai-multi-search-backend-321697147922.europe-west6.run.app/ask";
  }
  log(msg, type = "INFO") {
    console.log(`[${new Date().toISOString()}] [${type}] ${msg}`);
  }
  getModels() {
    return Object.keys(this.cfg);
  }
  async auth() {
    try {
      if (this.token) {
        this.log("Re-using existing cached token");
        return this.token;
      }
      this.log("Fetching new token from Identity Toolkit...");
      const apiKey = "AIzaSyA27E7jUV8osRY7NzwP2fZwGoTkp5gJhZw";
      const authUrl = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${apiKey}`;
      const res = await axios.post(authUrl, {
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: {
          "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
          "Content-Type": "application/json",
          "X-Android-Package": "com.lmtechstudio.aimultisearch",
          "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81"
        }
      });
      this.token = res.data?.idToken || null;
      this.log("Token successfully obtained and cached");
      return this.token;
    } catch (err) {
      this.log(`Auth failed: ${err.message}`, "ERROR");
      return null;
    }
  }
  async chat({
    token,
    prompt,
    model,
    ...rest
  }) {
    this.log("Starting chat process...");
    if (!prompt) {
      return {
        status: "error",
        message: "Missing required field: prompt"
      };
    }
    const selectedModel = model || "openai";
    if (!this.cfg[selectedModel]) {
      return {
        status: "error",
        message: `Model '${selectedModel}' is not available. Available: ${this.getModels().join(", ")}`
      };
    }
    try {
      const activeToken = token || await this.auth();
      if (!activeToken) {
        return {
          status: "error",
          message: "Authentication failed / Token missing"
        };
      }
      const template = this.cfg[selectedModel]?.prompt || "";
      const fullPrompt = `${template}\n\nUser question:\n${prompt}`;
      const plan = rest?.plan ? rest.plan : "ULTRA";
      const appVer = rest?.app_version ? rest.app_version : "1.3.3";
      this.log(`Sending request to backend using model: ${selectedModel}`);
      const response = await axios.post(this.url, {
        provider: selectedModel,
        prompt: fullPrompt,
        plan: plan,
        app_version: appVer
      }, {
        headers: {
          "User-Agent": "okhttp/4.12.0",
          "Content-Type": "application/json",
          authorization: `Bearer ${activeToken}`,
          "x-plan": plan,
          "x-app-version": appVer,
          "x-search-id": rest?.search_id || "568f958e-e94d-4d53-a5eb-20bd5f68a2e6",
          "x-search-expected": rest?.search_expected || "2",
          "x-feature": rest?.feature || "search",
          "x-insight-mode": rest?.insight_mode || ""
        }
      });
      this.log("Request successful");
      return {
        status: "success",
        ...response?.data,
        token: activeToken
      };
    } catch (err) {
      this.log(`Chat request failed: ${err.message}`, "ERROR");
      return {
        status: "error",
        message: err.response?.data || err.message
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
  const api = new AiClient();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}