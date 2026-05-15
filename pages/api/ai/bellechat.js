import axios from "axios";
import crypto from "crypto";
class KeyDecryptor {
  constructor() {
    this.keyMap = new Map([
      ["f69233a998cf69e03366fa91eeffaee96", "userId"],
      ["fc8fd73559a1cf099c7b61dbd2a78a401", "username"],
      ["f1f4800a8804c462ce14db53f13c47019", "nickname"],
      ["fe1f1cdc8a165debea15cf83794aff5e5", "level"],
      ["f8bc5186fdecedcb4687e319306d9074f", "token"],
      ["f7e27b35a33df3d55ae0f72a3e47bb755", "vipLevel"],
      ["f10932d23f40aa521e1c78c035f2f9115", "isNewUser"],
      ["f6eb90fecb3466cd4e48f07a0ad4aaa6a", "isVip"],
      ["fe81ea7bb8a587b590829178f207b1b2b", "avatar"],
      ["fb3ad9f9a1994c4e164775d907ff86ce5", "vipExpiry"],
      ["ff2bc58ffbed367e30c0c979689fc4dcd", "isBan"],
      ["f2c8ca0090f5533306e82458210ae01e2", "sessionId"],
      ["fa5a8b44d434cb8cc29f0eb783aff76f1", "roleId"],
      ["fcad572368a5f145a89082e7b7d79a3e2", "name"],
      ["f2a492e321621761c550ff5342659100f", "status"],
      ["f34e4515c437de7ca6572f5fec7fc5cf1", "chatCount"],
      ["fb1a2526e6c2a02aa3f470da178c2317a", "fansCount"],
      ["fd4e7441ea93dbdab5cc1eb85bfde6257", "likeCount"],
      ["fd253ddb6fdd3064303be05327d1b9219", "createdAt"],
      ["f8b94b9761d7ecb5d91523e447b102a03", "lastMessage"],
      ["ff51c787e589ea3dbfa262a345f0cf4a7", "desc"],
      ["f395617a45af43349009324dc189edad6", "isPublic"],
      ["f86f82eb7c6ce2402b0220c1a4f5ee308", "updatedAt"],
      ["f6de238cccf06deae71b379996b56e572", "tags"],
      ["f0d5be444f54b88648795b91cf1ddbf7b", "isFollow"],
      ["ffb6c827c8e0dd99af114e7b6484b5dc0", "background"],
      ["ff82c6df1cb11621853a3d4f6526e7378", "voiceModel"],
      ["f77217dc3a8e11a6dd33164676b6a9330", "greetingAudio"],
      ["f0ae3aaebbc54f9fde0ed3ac0a3400875", "exampleQuestions"],
      ["f0bdfb61bc178db0354079583e9c679fb", "personality"],
      ["fa88c284a3fabb055f3d5020e5fd8dd0e", "scenario"],
      ["ffb7a467694e257a39340acb5ef36069a", "appearance"],
      ["f07bef421da916ceda9047fab806f5bab", "voiceId"],
      ["f1be3aa670e11441e2e7fa6db64b9b66d", "backgroundImage"],
      ["f93378a4adc631184a7359b0bb4fa2a14", "isCollected"],
      ["f3e57520a970c93fef423e99e1cb34298", "imageSetId"],
      ["fdeaea702d30e1a88908a39abb9c74f7d", "chatStyle"],
      ["fae798a7dc425a4b38c4a2b28d7514b69", "greetingDelay"],
      ["f4b669ab1491866686300107f2dcb933f", "isSystem"],
      ["f2eb22baf47e5ed87059b89b81879d826", "systemPrompt"],
      ["f11225ffe04c2385c0e7830793511a241", "temperature"],
      ["f886f6a3da07fffd4ae3d3d396632a47c", "maxTokens"],
      ["fab10b3950095e1dd693883deaed60465", "greeting"],
      ["f99d78ae53429d8056bfc398b8a8ee8f7", "voiceUrl"],
      ["f5b308525ac8f00a539dc3ab964412c64", "images"],
      ["fd41049bfb2c7f956550180c075116f1e", "chatId"],
      ["f1b30aa602256e27c9ce398617fe276f1", "unreadCount"],
      ["f613aa2c37cdaa5c214a11e61fa373698", "totalMessages"],
      ["f847f2cd907459ff19e1082c2d96fcbf4", "isEnded"],
      ["f93ec05ef86a3d512613d41a20d455045", "duration"],
      ["f600345f074c813156a56bf3425e9fe9f", "greetingText"],
      ["fa4b6e0d8bc6131fa7656ab943860af06", "score"],
      ["f461545d182c11e5438491f98810b831b", "list"],
      ["fcb3409bf60eb7c3938374d4195cf1a36", "total"],
      ["f373a9d90b4caa54855b8f8651350f94a", "categories"],
      ["fee8b4d5ec82db63a0074da4352337f42", "themes"],
      ["f79aaa470fdf5a6e70ab59259dd10c2b9", "imgFull"],
      ["f4e90314840a44c58213cb09867ec10e2", "imgThumb"],
      ["facc23eb271a6666368a4e64d4f8e41b2", "imageUrl"],
      ["f2ba61edf945ff4be4ce6f7f179fe264e", "imageOrder"],
      ["f893450231967e2f327634fbab5aa5962", "imageWidth"],
      ["fda2102dcf2c7748dba735021b2c7486d", "thumbUrl"],
      ["f0d165952aabeacac47e2dcb6e3f60f32", "blurThumb"],
      ["ff06fe1bd568aa0358776dbf623a13d4d", "isDefault"],
      ["fd1a734a9fb5f2a62ec2a8b23f3e2e2d5", "imageIndex"],
      ["f4ef710e79ae868488c64417260502d13", "isUnlocked"],
      ["fa6a3bde76db68064faea103f34dd537e", "primaryColor"],
      ["f31d7ef7469d9be257895fa1efdc01df3", "secondaryColor"],
      ["f2172953013a74373373c31dab7d187e2", "textColor"],
      ["f3060f9b25435d4b8b5d93e1be98374d7", "accentColor"],
      ["f21dcc644eab40e81d19b059fd2420d96", "buttonColor"],
      ["f495b85c119fdaa3c7223ddb910bd7151", "buttonTextColor"],
      ["f2d1b4f56c8d2a3b928cf599bf4653b63", "scenarioId"],
      ["f0f67357831e177c48b3d5b653087703d", "scenarioName"],
      ["f926e9cf126da74622a0353664d22fd8e", "scenarioTitle"],
      ["f3e858111e456076ca8b6d232ec2d3504", "scenarioDesc"],
      ["f7b07f565d1223edbaebe53338e34d673", "scenarioOrder"],
      ["f04c14eb8dacfaf8816ce936f3b581d04", "isActive"],
      ["f6c44938f07eed611de0b20a74ecfce8e", "signDay"],
      ["fa6c6d32c84a0331b7b7a4ba6e59fcac1", "reportStatus"],
      ["f8d9a0af6196991818cb970d8565ef873", "extraData"],
      ["f8ac051b2c7b778b6deb6465c335a4c53", "expPoints"],
      ["f9efe791e599a315705ede9164ee25a3e", "totalChats"],
      ["f3adc6e994a77f844c2456723396900a3", "totalDays"],
      ["f3b817670f54ba50ab3202944468eaf09", "achievements"],
      ["f92f51a30de52a167bff1fcbf91c26ffc", "shortDesc"],
      ["f357418315e57906c914ae2e7265e7c4e", "isFavorite"],
      ["ff6cd80db56eefbac4ddcd5b992e02c50", "voiceCount"],
      ["f9176457dfc1fe916e8b22dc7eb02cf8e", "collectionCount"],
      ["f59cb9eac50374174a76776fed321eb40", "scenarioList"],
      ["fe9fe2a7b3e415fdfb8cb576cca5b6241", "defaultScenario"],
      ["f63898920dac6511b4b11466bf49f5e58", "activeScenario"],
      ["fd65e8865736092463dab6e4dd835d726", "isPrivate"]
    ]);
  }
  decrypt(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(i => this.decrypt(i));
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      const nk = this.keyMap.get(k) || k;
      res[nk] = this.decrypt(v);
    }
    return res;
  }
}
class BelleChat {
  constructor() {
    this.baseURL = "https://b1.bellechati.com";
    this.deviceId = crypto.randomBytes(8).toString("hex");
    this.gaid = crypto.randomBytes(16).toString("hex").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
    this.fcmToken = `${crypto.randomBytes(8).toString("base64").replace(/[+/=]/g, "")}:APA91b${crypto.randomBytes(32).toString("base64").replace(/[+/=]/g, "")}`;
    this.ip = `182.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    this.vendor = ["realme", "samsung", "xiaomi", "oppo"][Math.floor(Math.random() * 4)];
    this.model = this.vendor === "realme" ? "RMX3890" : this.vendor === "samsung" ? "SM-G998B" : "M2101K9G";
    this.osVersion = "15";
    this._token = null;
    this._tokenExpiry = null;
    this.decryptor = new KeyDecryptor();
    const md5Hex = crypto.createHash("md5").update("1045").digest("hex");
    this.desKey = Buffer.from(md5Hex.substring(1, 9), "utf8");
    this.desIv = Buffer.from(md5Hex.substring(3, 11), "utf8");
    this.log = true;
  }
  _log(level, ...args) {
    if (this.log) console.log(`[${new Date().toISOString()}] [${level}]`, ...args);
  }
  _decrypt(enc) {
    if (!enc || typeof enc !== "string") return enc;
    try {
      const d = crypto.createDecipheriv("des-cbc", this.desKey, this.desIv);
      d.setAutoPadding(true);
      let dec = d.update(Buffer.from(enc, "base64"), null, "utf8");
      dec += d.final("utf8");
      return JSON.parse(dec);
    } catch (e) {
      this._log("warn", "Decrypt failed:", e.message);
      return enc;
    }
  }
  async _ensureAuth() {
    if (this._token && Date.now() < this._tokenExpiry) return this._token;
    return await this._auth();
  }
  async _req(method, url, data = null, isStream = false) {
    try {
      await this._ensureAuth();
      const headers = {
        "User-Agent": "okhttp/5.1.0",
        Accept: "application/json",
        "x-lang": "id",
        "x-app-id": "1045",
        "x-app-version": "6",
        "x-token": this._token,
        ...data && !(data instanceof URLSearchParams) && {
          "Content-Type": "application/json"
        }
      };
      this._log("info", `${method} ${url}`);
      const res = await axios({
        method: method,
        url: url.startsWith("http") ? url : this.baseURL + url,
        headers: headers,
        data: data,
        responseType: isStream ? "stream" : "json"
      });
      if (isStream) return res;
      if (res.data?.code !== 2e3) {
        throw new Error(res.data?.msg || `API error: ${res.data?.code}`);
      }
      const result = res.data.data ? this._decrypt(res.data.data) : res.data;
      this._log("debug", "Request successful");
      return {
        result: this.decryptor.decrypt(result),
        ok: true
      };
    } catch (error) {
      this._log("error", `Request failed: ${error.message}`);
      if (error.response?.status === 401) this._token = null;
      return {
        result: null,
        ok: false,
        error: error.message
      };
    }
  }
  async _auth() {
    try {
      const payload = {
        country: "id",
        device_id: this.deviceId,
        os: "android",
        gaid: this.gaid,
        os_version: this.osVersion,
        ip: this.ip,
        ip_asn: "Telkomsel",
        ip_country: "ID",
        first_install: Date.now(),
        language: "id",
        sim_country: "id",
        source: "com.google.android.packageinstaller",
        type: "guest",
        app_version_code: "6",
        vendor: this.vendor,
        model: this.model,
        app_id: "1045",
        fcm_token: this.fcmToken,
        attr_network: "",
        attr_campaign: "",
        referrer: "",
        is_vpn: "0",
        app_version: "1.0.5",
        timezone: "GMT+08:00"
      };
      const headers = {
        "User-Agent": "okhttp/5.1.0",
        Accept: "application/json",
        "x-lang": "id",
        "x-app-id": "1045",
        "x-app-version": "6",
        "Content-Type": "application/x-www-form-urlencoded"
      };
      const params = new URLSearchParams(payload).toString();
      this._log("info", `Authenticating device: ${this.deviceId}`);
      const res = await axios.post(`${this.baseURL}/authV2/login`, params, {
        headers: headers
      });
      if (res.data?.code !== 2e3) throw new Error(res.data?.msg || "Auth failed");
      const dec = this._decrypt(res.data.data);
      const readable = this.decryptor.decrypt(dec);
      this._token = readable.token || dec.f8bc5186fdecedcb4687e319306d9074f || Object.values(dec).find(v => typeof v === "string" && v.length > 50);
      this._tokenExpiry = Date.now() + 36e5;
      this._log("info", `Token obtained: ${this._token?.substring(0, 20)}...`);
      return this._token;
    } catch (error) {
      this._log("error", `Auth error: ${error.message}`);
      throw error;
    }
  }
  async search({
    query,
    page_number = 1,
    page_size = 20,
    ...rest
  } = {}) {
    try {
      const q = query || rest.query;
      if (!q) throw new Error("query is required");
      const url = `/v4/search?keyword=${encodeURIComponent(q)}&page_number=${page_number}&page_size=${page_size}`;
      return await this._req("GET", url);
    } catch (error) {
      this._log("error", "Search failed:", error.message);
      return {
        result: null,
        ok: false,
        error: error.message
      };
    }
  }
  async detail({
    role_id,
    ...rest
  } = {}) {
    try {
      const id = role_id || rest.role_id;
      if (!id) throw new Error("role_id is required");
      return await this._req("GET", `/v4/role_detail?role_id=${id}`);
    } catch (error) {
      this._log("error", "Detail failed:", error.message);
      return {
        result: null,
        ok: false,
        error: error.message
      };
    }
  }
  async start({
    role_id,
    scene_id = 0,
    page_number = 1,
    page_size = 20,
    ...rest
  } = {}) {
    try {
      const id = role_id || rest.role_id;
      if (!id) throw new Error("role_id is required");
      const url = `/chat/start?role_id=${id}&scene_id=${scene_id}&page_number=${page_number}&page_size=${page_size}`;
      return await this._req("GET", url);
    } catch (error) {
      this._log("error", "Start chat failed:", error.message);
      return {
        result: null,
        ok: false,
        error: error.message
      };
    }
  }
  async chat({
    prompt,
    role_id = 1001526,
    scene_id = 0,
    ...rest
  } = {}) {
    try {
      const msg = prompt || rest.prompt;
      const id = role_id || rest.role_id;
      if (!msg) throw new Error("prompt is required");
      if (!id) throw new Error("role_id is required");
      await this._ensureAuth();
      const headers = {
        "User-Agent": "okhttp/5.1.0",
        Accept: "application/json",
        "x-lang": "id",
        "x-app-id": "1045",
        "x-app-version": "6",
        "x-token": this._token,
        "Content-Type": "application/json"
      };
      this._log("info", `Chat with role ${id}: "${msg.substring(0, 50)}..."`);
      const res = await axios.post("https://b2.bellechati.com", {
        message: msg,
        scene_id: scene_id,
        role_id: id
      }, {
        headers: headers,
        responseType: "stream"
      });
      if (res.status !== 200) {
        throw new Error(`Stream endpoint returned ${res.status}`);
      }
      let full = "";
      await new Promise((resolve, reject) => {
        let buf = "";
        res.data.on("data", chunk => {
          buf += chunk.toString();
          const lines = buf.split("\n");
          buf = lines.pop();
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const obj = JSON.parse(line.slice(6));
                if (obj.type === "end") resolve();
                else if (obj.type === "error") reject(new Error(obj.message || "Stream error"));
                else if (obj.message) full += obj.message;
              } catch (e) {
                this._log("warn", "Parse SSE error:", e.message);
              }
            }
          }
        });
        res.data.on("error", reject);
        res.data.on("end", () => resolve());
      });
      this._log("info", `Chat completed, ${full.length} chars`);
      return {
        result: full,
        ok: true
      };
    } catch (error) {
      this._log("error", "Chat failed:", error.message);
      return {
        result: null,
        ok: false,
        error: error.message
      };
    }
  }
  async end({
    role_id,
    ...rest
  } = {}) {
    try {
      const id = role_id || rest.role_id;
      if (!id) throw new Error("role_id is required");
      return await this._req("GET", `/chat/end?role_id=${id}`);
    } catch (error) {
      this._log("error", "End chat failed:", error.message);
      return {
        result: null,
        ok: false,
        error: error.message
      };
    }
  }
  async list({
    page_number = 1,
    page_size = 20,
    ...rest
  } = {}) {
    try {
      const url = `/v3/chat_list?page_number=${page_number}&page_size=${page_size}`;
      return await this._req("GET", url);
    } catch (error) {
      this._log("error", "List chat failed:", error.message);
      return {
        result: null,
        ok: false,
        error: error.message
      };
    }
  }
  async info() {
    try {
      return await this._req("GET", "/user/info");
    } catch (error) {
      this._log("error", "Get info failed:", error.message);
      return {
        result: null,
        ok: false,
        error: error.message
      };
    }
  }
  async sign() {
    try {
      return await this._req("GET", "/v3/sign");
    } catch (error) {
      this._log("error", "Sign failed:", error.message);
      return {
        result: null,
        ok: false,
        error: error.message
      };
    }
  }
  async report(params = {}) {
    try {
      const defaultParams = {
        country: "id",
        attr_network: "Organic",
        app_version: "1.0.5",
        device_id: this.deviceId,
        os: "android",
        gaid: this.gaid,
        timezone: "GMT+08:00",
        os_version: this.osVersion,
        first_install: Date.now(),
        language: "id",
        sim_country: "id",
        source: "com.google.android.packageinstaller",
        referrer: "",
        is_vpn: "0",
        app_version_code: "6",
        vendor: this.vendor,
        fcm_token: this.fcmToken,
        attr_campaign: "",
        model: this.model,
        app_id: "1045"
      };
      const body = {
        ...defaultParams,
        ...params
      };
      const headers = {
        "User-Agent": "okhttp/5.1.0",
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      };
      const formData = new URLSearchParams(body).toString();
      const res = await axios.post(`${this.baseURL}/report/daily_first_open`, formData, {
        headers: headers
      });
      if (res.data?.code !== 2e3) throw new Error(res.data?.msg || "Report failed");
      return {
        result: res.data,
        ok: true
      };
    } catch (error) {
      this._log("error", "Report failed:", error.message);
      return {
        result: null,
        ok: false,
        error: error.message
      };
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
      supportedActions: ["search", "detail", "start", "end", "list", "chat"]
    });
  }
  const api = new BelleChat();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params?.query) {
          return res.status(400).json({
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        return res.status(200).json(response);
      case "detail":
        if (!params?.role_id) {
          return res.status(400).json({
            error: "Parameter 'role_id' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        return res.status(200).json(response);
      case "start":
        if (!params?.role_id) {
          return res.status(400).json({
            error: "Parameter 'role_id' wajib diisi untuk action 'start'."
          });
        }
        response = await api.start(params);
        return res.status(200).json(response);
      case "end":
        if (!params?.role_id) {
          return res.status(400).json({
            error: "Parameter 'role_id' wajib diisi untuk action 'end'."
          });
        }
        response = await api.end(params);
        return res.status(200).json(response);
      case "list":
        response = await api.list(params);
        return res.status(200).json(response);
      case "chat":
        if (!params?.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          supportedActions: ["search", "detail", "start", "end", "list", "chat"]
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