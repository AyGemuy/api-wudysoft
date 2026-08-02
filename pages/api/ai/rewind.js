import axios from "axios";
class RewindClient {
  constructor() {
    try {
      console.log("[RewindClient] Starting initialization process...");
      this.token = "";
      this.cookies = this._prs("");
      this.client = axios.create({
        baseURL: "https://api.rewind.ai",
        headers: {
          accept: "application/json",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://rewind.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://rewind.ai/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this._itc();
      console.log("[RewindClient] Initialization finished successfully.");
    } catch (err) {
      console.error(`[RewindClient] Error inside constructor: ${err.message}`);
    }
  }
  _prs(cookieStr) {
    try {
      console.log("[RewindClient] Parsing raw cookie string...");
      const cookies = {};
      if (!cookieStr) {
        console.log("[RewindClient] Cookie string is empty.");
        return cookies;
      }
      const items = cookieStr.split(";");
      for (const item of items) {
        const parts = item.split("=");
        if (parts.length >= 2) {
          cookies[parts[0].trim()] = parts.slice(1).join("=").trim();
        }
      }
      return cookies;
    } catch (err) {
      console.error(`[RewindClient] Failed to parse cookies: ${err.message}`);
      return {};
    }
  }
  _str(cookieObj) {
    try {
      console.log("[RewindClient] Stringifying cookie object...");
      const target = cookieObj || {};
      return Object.entries(target).map(([k, v]) => `${k}=${v}`).join("; ");
    } catch (err) {
      console.error(`[RewindClient] Failed to stringify cookies: ${err.message}`);
      return "";
    }
  }
  _snk(val) {
    try {
      if (Array.isArray(val)) {
        return val.map(item => this._snk(item));
      }
      if (val !== null && typeof val === "object") {
        const res = {};
        for (const k of Object.keys(val)) {
          const sk = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          res[sk] = this._snk(val[k]);
        }
        return res;
      }
      return val;
    } catch (err) {
      console.error(`[RewindClient] Failed during snake_case conversion: ${err.message}`);
      return val;
    }
  }
  _itc() {
    try {
      console.log("[RewindClient] Setting up Axios interceptors...");
      this.client.interceptors.request.use(config => {
        try {
          console.log(`[Interceptor] Configuring headers for request to: ${config.url}`);
          if (this.token) {
            this.cookies["anon_token"] = this.token;
            config.headers["Authorization"] = `Bearer ${this.token}`;
          }
          const serialized = this._str(this.cookies);
          if (serialized) {
            config.headers["cookie"] = serialized;
          }
          return config;
        } catch (innerErr) {
          console.error(`[Interceptor] Request modification failed: ${innerErr.message}`);
          return config;
        }
      }, error => {
        console.error(`[Interceptor] Request failure: ${error.message}`);
        return Promise.reject(error);
      });
      this.client.interceptors.response.use(response => {
        try {
          console.log(`[Interceptor] Inspecting response from: ${response.config?.url}`);
          const xAnonToken = response.headers?.["x-anon-token"];
          if (xAnonToken) {
            console.log("[Interceptor] Retrieved x-anon-token. Updating token...");
            this.token = xAnonToken;
            this.cookies["anon_token"] = xAnonToken;
          }
          const setCookie = response.headers?.["set-cookie"];
          if (setCookie) {
            console.log("[Interceptor] Set-Cookie detected. Processing...");
            const rawCookies = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;
            this.cookies = {
              ...this.cookies,
              ...this._prs(rawCookies)
            };
          }
          return response;
        } catch (innerErr) {
          console.error(`[Interceptor] Response processing failed: ${innerErr.message}`);
          return response;
        }
      }, error => {
        console.error(`[Interceptor] Response received error status: ${error.message}`);
        return Promise.reject(error);
      });
    } catch (err) {
      console.error(`[RewindClient] Failed to complete interceptors configuration: ${err.message}`);
    }
  }
  async _req(config) {
    try {
      console.log(`[RewindClient] Initiating API HTTP request: ${config.method || "GET"} ${config.url}`);
      const res = await this.client(config);
      return {
        status: true,
        result: this._snk(res.data) || {},
        models: null
      };
    } catch (err) {
      console.error(`[RewindClient] HTTP request encountered error: ${err.message}`);
      return {
        status: false,
        result: this._snk(err.response?.data) || {
          error: err.message
        },
        models: null
      };
    }
  }
  async me() {
    try {
      console.log("[RewindClient] Dispatching request for user session details...");
      return await this._req({
        url: "/v1/users/me",
        method: "GET"
      });
    } catch (err) {
      console.error(`[RewindClient] me() exception: ${err.message}`);
      return {
        status: false,
        result: {
          error: err.message
        },
        models: null
      };
    }
  }
  async listModels() {
    try {
      console.log("[RewindClient] Dispatching request for list of models...");
      const res = await this._req({
        url: "/v1/models",
        method: "GET"
      });
      if (res.status) {
        res.models = res.result?.models || [];
      }
      return res;
    } catch (err) {
      console.error(`[RewindClient] listModels() exception: ${err.message}`);
      return {
        status: false,
        result: {
          error: err.message
        },
        models: []
      };
    }
  }
  async chat({
    prompt,
    messages,
    model,
    ...rest
  }) {
    try {
      console.log("[RewindClient] Entering chat procedure...");
      if (!this.token) {
        console.log("[RewindClient] No active session token found. Registering temporary guest session...");
        const authCheck = await this.me();
        if (!authCheck.status || !this.token) {
          console.error("[RewindClient] Guest session generation aborted/failed.");
          return {
            status: false,
            result: {
              error: "Failed to establish guest authorization on Rewind.ai."
            },
            models: []
          };
        }
        console.log("[RewindClient] Guest token successfully generated and cached.");
      }
      const selectedModel = model ? model : "qwen/qwen-2.5-7b-instruct";
      console.log(`[RewindClient] Running validation check for model: ${selectedModel}`);
      const modelListRes = await this.listModels();
      const availableModels = modelListRes.result?.models || [];
      if (availableModels.length > 0) {
        const isValid = availableModels.some(m => m.id === selectedModel);
        if (!isValid) {
          console.warn(`[RewindClient] Selected model ${selectedModel} is not officially found in API list.`);
          return {
            status: false,
            result: {
              error: `Model "${selectedModel}" is unavailable on Rewind.ai.`
            },
            models: availableModels
          };
        }
        console.log("[RewindClient] Model ID successfully verified.");
      }
      const msgs = messages ? [...messages] : [];
      if (prompt) {
        console.log("[RewindClient] Formatting and auto-pushing user prompt...");
        msgs.push({
          role: "user",
          content: prompt
        });
      }
      if (msgs.length === 0) {
        console.warn("[RewindClient] Attempted to run chat with empty messages payload.");
        return {
          status: false,
          result: {
            error: "Payload validation failed: No prompt or messages array was specified."
          },
          models: availableModels
        };
      }
      const payload = {
        messages: msgs,
        model: selectedModel,
        stream: rest?.stream || false,
        ...rest
      };
      console.log("[RewindClient] Dispatching request payload to chat completions...");
      const chatRes = await this._req({
        url: "/v1/chat/completions/",
        method: "POST",
        data: payload
      });
      return {
        status: chatRes.status,
        result: chatRes.result,
        models: availableModels
      };
    } catch (err) {
      console.error(`[RewindClient] chat() exception: ${err.message}`);
      return {
        status: false,
        result: {
          error: err.message
        },
        models: []
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
  const api = new RewindClient();
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