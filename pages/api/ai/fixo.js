import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class EaseUS {
  constructor() {
    try {
      this.deviceId = crypto.randomBytes(8).toString("hex");
      this.salt = "e84yr70o0a5n08f5";
      this.client = axios.create({
        timeout: 6e4,
        headers: {
          "User-Agent": "My App",
          "Accept-Encoding": "gzip"
        }
      });
      console.log(`[Init] Service initialized. Device ID: ${this.deviceId}`);
    } catch (err) {
      console.log(`[Init Error] Failed initialization: ${err?.message}`);
    }
  }
  _val(prompt, image) {
    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return {
        status: "error",
        error_message: "Validation failed: 'prompt' is required and must be a non-empty string."
      };
    }
    if (image !== undefined && image !== null) {
      if (typeof image === "string" && image.trim() === "") {
        return {
          status: "error",
          error_message: "Validation failed: 'image' is provided but cannot be an empty string."
        };
      }
    }
    console.log("[Validation] Mandatory input parameter checks passed.");
    return {
      status: "success"
    };
  }
  _fmt(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this._fmt(item));
    }
    if (obj !== null && typeof obj === "object") {
      const formattedObj = {};
      for (const key of Object.keys(obj)) {
        const snakeKey = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2").replace(/[\s\-]+/g, "_").toLowerCase();
        let value = obj[key];
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
              value = JSON.parse(trimmed);
            } catch (err) {}
          }
        }
        formattedObj[snakeKey] = this._fmt(value);
      }
      return formattedObj;
    }
    return obj;
  }
  _rnd(l) {
    try {
      return crypto.randomBytes(Math.ceil(l / 2)).toString("hex").slice(0, l);
    } catch (err) {
      console.log(`[Error] Random string generation failed: ${err?.message}`);
      throw err;
    }
  }
  _hsh(data) {
    try {
      const map = {
        timestamp: data?.timestamp,
        web_app_key: data?.web_app_key,
        nonce: data?.nonce,
        key: this.salt || "e84yr70o0a5n08f5"
      };
      const sortedKeys = Object.keys(map).sort();
      let rawString = "";
      for (const k of sortedKeys) {
        rawString += `${k}=${map[k]}`;
      }
      return crypto.createHash("sha1").update(rawString, "utf8").digest("hex");
    } catch (err) {
      console.log(`[Error] Signature computation failed: ${err?.message}`);
      throw err;
    }
  }
  async _req(cfg) {
    try {
      console.log(`[Request] ${cfg?.method || "GET"} -> ${cfg?.url || ""}`);
      const res = await this.client.request(cfg);
      return res?.data || null;
    } catch (err) {
      console.log(`[Request Error] Failed: ${err?.message}`);
      if (err?.response?.data) {
        console.log(`[Response Error Data] ${JSON.stringify(err.response.data)}`);
      }
      throw err;
    }
  }
  async _res(img) {
    try {
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (img.startsWith("http")) {
          const response = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return Buffer.from(response?.data);
        }
        const cleanBase = img.includes(",") ? img.split(",")[1] : img;
        return Buffer.from(cleanBase, "base64");
      }
      return null;
    } catch (err) {
      console.log(`[Error] Image resolution failed: ${err?.message}`);
      throw err;
    }
  }
  async _mail() {
    try {
      console.log("[Process] Generating fresh mailbox destination...");
      const res = await this._req({
        method: "GET",
        url: `https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`
      });
      return res?.email || null;
    } catch (err) {
      console.log(`[Error] Mail registration failed: ${err?.message}`);
      throw err;
    }
  }
  async _send(email, overrides) {
    try {
      console.log(`[Process] Requesting verification OTP transmission to: ${email}`);
      const ts = Math.floor(Date.now() / 1e3).toString();
      const payload = {
        email: email,
        type: "user_register",
        timestamp: ts,
        web_app_key: "fixo_android_app",
        nonce: this._rnd(20),
        ...overrides
      };
      payload.sign = this._hsh(payload);
      await this._req({
        method: "POST",
        url: "https://accounts.easeus.com/account-api/api/auth/send-email-code",
        headers: {
          "Content-Type": "application/json",
          version: "3.3.0",
          deviceid: this.deviceId,
          "device-type": "android"
        },
        data: payload
      });
    } catch (err) {
      console.log(`[Error] Code request failed: ${err?.message}`);
      throw err;
    }
  }
  async _otp(email) {
    try {
      console.log("[Process] Polling verification inbox for validation token (3000/15)...");
      let code = null;
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const inbox = await this._req({
          method: "GET",
          url: `https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`
        });
        const messages = inbox?.data || [];
        if (messages.length > 0) {
          const content = messages[0]?.text_content || messages[0]?.html_content || "";
          const match = content.match(/\b\d{4}\b/);
          code = match ? match[0] : null;
          if (code) {
            console.log(`[Success] Retrieved OTP target code: ${code}`);
            break;
          }
        }
      }
      if (!code) throw new Error("Verification OTP polling operation timed out.");
      return code;
    } catch (err) {
      console.log(`[Error] Verification OTP polling failed: ${err?.message}`);
      throw err;
    }
  }
  async _reg(email, code, overrides) {
    try {
      console.log("[Process] Executing register payload pipeline...");
      const ts = Math.floor(Date.now() / 1e3).toString();
      const pass = `${this._rnd(8)}A1!`;
      const payload = {
        email: email,
        email_code: code,
        password: pass,
        register_from: "android",
        register_country: "",
        register_product_name: "",
        register_url: "",
        timestamp: ts,
        web_app_key: "fixo_android_app",
        nonce: this._rnd(20),
        ...overrides
      };
      payload.sign = this._hsh(payload);
      const res = await this._req({
        method: "POST",
        url: "https://accounts.easeus.com/account-api/v2/auth/register",
        headers: {
          "User-Agent": "okhttp/4.12.0",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          authorization: "Bearer",
          site: "www.easeus.com",
          "o-e": "",
          lang: "id",
          "client-type": "android",
          "client-name": "fixo_android_app",
          "product-code": "888",
          "device-identifier": this.deviceId
        },
        data: payload
      });
      return res?.data?.token || null;
    } catch (err) {
      console.log(`[Error] Register payload pipeline failure: ${err?.message}`);
      throw err;
    }
  }
  async _sgn(token) {
    try {
      console.log("[Process] Completing background login handshake...");
      await this._req({
        method: "POST",
        url: "https://repair.easeus.com/fixo-api/v2/user/app_signin",
        headers: {
          version: "3.3.0",
          deviceid: this.deviceId,
          "device-type": "android",
          authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.log(`[Error] Login handshake rejected: ${err?.message}`);
      throw err;
    }
  }
  async _bnf(token) {
    try {
      console.log("[Process] Executing signup allocation reward claims...");
      const res = await this._req({
        method: "POST",
        url: "https://repair.easeus.com/fixo-api/v2/user/app_benefit",
        headers: {
          version: "3.3.0",
          deviceid: this.deviceId,
          "device-type": "android",
          authorization: `Bearer ${token}`
        }
      });
      console.log(`[Success] Reward allocation mapped. User credits: ${res?.data?.credits || 0}`);
    } catch (err) {
      console.log(`[Error] Reward allocation failed: ${err?.message}`);
      throw err;
    }
  }
  async _up(token, buffers) {
    try {
      console.log("[Process] Processing S3 direct upload queue sequence...");
      const downloadUrls = [];
      for (const buf of buffers) {
        const md5 = crypto.createHash("md5").update(buf).digest("hex");
        const filename = `dev/${this.deviceId}/${Date.now()}-${this._rnd(4)}.jpg`;
        const res = await this._req({
          method: "POST",
          url: "https://repair.easeus.com/fixo-api/v2/ai_image/query_upload_urls",
          headers: {
            "Content-Type": "application/json",
            version: "3.3.0",
            deviceid: this.deviceId,
            "device-type": "android",
            authorization: `Bearer ${token}`
          },
          data: {
            params: [{
              key: filename,
              value: md5
            }]
          }
        });
        const uploadNode = res?.data?.[0];
        if (uploadNode?.upload_url) {
          console.log(`[Process] Uploading binary chunk directly to S3 bucket: ${filename}`);
          await this._req({
            method: "PUT",
            url: uploadNode.upload_url,
            headers: {
              "Content-Type": "image/jpeg"
            },
            data: buf
          });
          downloadUrls.push(uploadNode.download_url);
        }
      }
      return downloadUrls;
    } catch (err) {
      console.log(`[Error] S3 direct upload failed: ${err?.message}`);
      throw err;
    }
  }
  async _tsk(token, urls, prompt, aspect, overrides) {
    try {
      console.log("[Process] Constructing task payload attributes...");
      const mode = urls && urls.length > 0 ? "i2i" : "t2i";
      let endpoint = "";
      let payload = {};
      switch (mode) {
        case "i2i":
          endpoint = "https://repair.easeus.com/fixo-api/v2/ai_image/create";
          payload = {
            type: overrides?.type,
            urls: urls || [],
            prompt: prompt,
            aspect: aspect,
            file_name: overrides?.file_name || "",
            file_size: overrides?.file_size || 0,
            prompt_plugins: overrides?.prompt_plugins || [],
            ...overrides
          };
          break;
        case "t2i":
          endpoint = "https://repair.easeus.com/fixo-api/v2/ai_image/createv2";
          payload = {
            model_id: overrides?.model_id || overrides?.type,
            type: overrides?.type,
            urls: [],
            preset_template: overrides?.preset_template || "",
            prompt: prompt,
            prompt_plugins: overrides?.prompt_plugins || [],
            aspect: aspect,
            resolution: overrides?.resolution || "1K",
            duration: overrides?.duration || 0,
            file_name: overrides?.file_name || "",
            file_size: overrides?.file_size || 0,
            ...overrides
          };
          break;
      }
      const res = await this._req({
        method: "POST",
        url: endpoint,
        headers: {
          "Content-Type": "application/json",
          version: "3.3.0",
          deviceid: this.deviceId,
          "device-type": "android",
          authorization: `Bearer ${token}`
        },
        data: payload
      });
      return res?.data?.id || null;
    } catch (err) {
      console.log(`[Error] Task parameters insertion failed: ${err?.message}`);
      throw err;
    }
  }
  async _str(token, id) {
    try {
      console.log(`[Process] Starting background generation execution for target ID: ${id}`);
      await this._req({
        method: "POST",
        url: "https://repair.easeus.com/fixo-api/v2/ai_image/start",
        headers: {
          "Content-Type": "application/json",
          version: "3.3.0",
          deviceid: this.deviceId,
          "device-type": "android",
          authorization: `Bearer ${token}`
        },
        data: {
          task_id: id
        }
      });
    } catch (err) {
      console.log(`[Error] Generation execution trigger failed: ${err?.message}`);
      throw err;
    }
  }
  async _pol(token, id) {
    try {
      console.log("[Process] Entering progress checking loop (3000/60)...");
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const res = await this._req({
          method: "POST",
          url: "https://repair.easeus.com/fixo-api/v2/ai_image/query",
          headers: {
            "Content-Type": "application/json",
            version: "3.3.0",
            deviceid: this.deviceId,
            "device-type": "android",
            authorization: `Bearer ${token}`
          },
          data: {
            taskids: [id]
          }
        });
        const node = res?.data?.[0] || {};
        const state = node.status || "Unknown";
        console.log(`[Process] Progress tracking... Iteration ${i + 1}/60 - status: "${state}"`);
        if (state === "Completed" || state === "SUCCESSED") {
          return {
            task_id: node.id || id,
            download_url: node.download_url || "",
            preview_url: node.preview_url || "",
            status: "completed"
          };
        }
        if (state === "Failed" || node.error_reason) {
          throw new Error(`Execution error returned from engine: ${node.error_reason || "Unknown error"}`);
        }
      }
      throw new Error("Task execution tracing reached retry limit (timeout).");
    } catch (err) {
      console.log(`[Error] Active task polling failed: ${err?.message}`);
      throw err;
    }
  }
  async config({
    token
  }) {
    try {
      console.log("[Process] Fetching application config endpoints...");
      const authHeader = token ? `Bearer ${token}` : "";
      const mainpage = await this._req({
        method: "POST",
        url: "https://repair.easeus.com/fixo-api/v2/user/app_mainpage_config",
        headers: {
          version: "3.3.0",
          deviceid: this.deviceId,
          "device-type": "android"
        }
      });
      const app = token ? await this._req({
        method: "POST",
        url: "https://repair.easeus.com/fixo-api/v1/config/app_config",
        headers: {
          version: "3.3.0",
          deviceid: this.deviceId,
          "device-type": "android",
          authorization: authHeader
        }
      }) : null;
      const inspiration = token ? await this._req({
        method: "POST",
        url: "https://repair.easeus.com/fixo-api/v2/user/app_inspiration_config",
        headers: {
          version: "3.3.0",
          deviceid: this.deviceId,
          "device-type": "android",
          authorization: authHeader
        }
      }) : null;
      const aggregatedResult = {
        mainpage_config: mainpage?.data || null,
        app_config: app?.data || null,
        inspiration_config: inspiration?.data || null
      };
      return {
        status: "success",
        result: this._fmt(aggregatedResult)
      };
    } catch (err) {
      console.log(`[Error] Fetching configuration failed: ${err?.message}`);
      return {
        status: "error",
        result: {
          error_message: err?.message || "Failed to retrieve configuration data."
        }
      };
    }
  }
  async generate({
    prompt,
    image,
    type,
    ...rest
  }) {
    try {
      console.log("[Start] Initiating automation execution chain...");
      const validation = this._val(prompt, image);
      if (validation.status === "error") {
        return {
          status: "error",
          result: {
            error_message: validation.error_message
          }
        };
      }
      const isI2I = !!image;
      const defaultType = isI2I ? 100094 : 200001;
      const finalType = type || defaultType;
      const targetAspect = rest?.aspect ? rest.aspect : "16:9";
      const emailAddr = await this._mail();
      if (!emailAddr) throw new Error("Mailbox address generated as null or empty.");
      await this._send(emailAddr, rest?.send_overrides || {});
      const code = await this._otp(emailAddr);
      const authToken = await this._reg(emailAddr, code, rest?.register_overrides || {});
      if (!authToken) throw new Error("Authorization token generated as null or empty.");
      await this._sgn(authToken);
      await this._bnf(authToken);
      let contentUrls = [];
      if (image) {
        const imagePayloads = Array.isArray(image) ? image : [image];
        const resolvedBuffers = [];
        for (const img of imagePayloads) {
          const buf = await this._res(img);
          if (buf) resolvedBuffers.push(buf);
        }
        if (resolvedBuffers.length > 0) {
          contentUrls = await this._up(authToken, resolvedBuffers);
        }
      }
      const taskId = await this._tsk(authToken, contentUrls, prompt, targetAspect, {
        type: finalType,
        ...rest?.task_overrides
      });
      if (!taskId) throw new Error("Task registration returned null ID value.");
      await this._str(authToken, taskId);
      const finalState = await this._pol(authToken, taskId);
      console.log("[Success] Automation execution chain completed.");
      const payloadResult = {
        task_id: finalState.task_id,
        download_url: finalState.download_url,
        preview_url: finalState.preview_url,
        prompt_text: prompt,
        aspect_ratio: targetAspect,
        generation_type: contentUrls.length > 0 ? "i2i" : "t2i"
      };
      return {
        status: "success",
        result: this._fmt(payloadResult)
      };
    } catch (err) {
      console.log(`[Critical Error] Automation process terminated: ${err.message}`);
      return {
        status: "error",
        result: {
          error_message: err.message || "Unknown processing error."
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["config", "generate"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          config: "/?action=config",
          generate: "/?action=generate&prompt=martial-peak"
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new EaseUS();
  try {
    let response;
    switch (action) {
      case "config":
        response = await api.config(params);
        break;
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk melakukan generate."
          });
        }
        response = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        error: "Server target tidak memberikan respon atau data kosong."
      });
    }
    if (response.status === false) {
      return res.status(422).json({
        action: action,
        ...response
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error.message || "Unknown Error"
    });
  }
}