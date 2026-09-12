import crypto from "crypto";
import axios from "axios";
class AIClient {
  constructor() {
    this.providers = {
      herai: {
        base: "https://api.herai.top",
        name: "her-android",
        ver: "2.3.5"
      },
      sayhichat: {
        base: "https://api.sayhichat.top",
        name: "sayhi-android",
        ver: "2.7.6"
      }
    };
    this.bot_ids = 10017242;
    this.ctx = null;
  }
  _autoPipe(provider, state) {
    try {
      if (state) return this._import(state);
      const availableProviders = Object.keys(this.providers);
      if (!provider) {
        return {
          status: false,
          result: `Parameter 'provider' wajib dipilih terlebih dahulu. Pilihan yang tersedia: [${availableProviders.join(", ")}]`
        };
      }
      const key = availableProviders.find(k => k.toLowerCase() === provider.toLowerCase() || this.providers[k].base.toLowerCase().includes(provider.toLowerCase()));
      if (!key) {
        return {
          status: false,
          result: `Provider atau BaseURL '${provider}' tidak dikenali. Pilihan valid yang tersedia saat ini: [${availableProviders.join(", ")}]`
        };
      }
      const config = this.providers[key];
      const dId = crypto.randomBytes(8).toString("hex");
      const brand = ["RMX", "SM", "CPH", "V", "POCO", "MI"][crypto.randomInt(0, 6)];
      const dModel = `${brand}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const sysVer = String(crypto.randomInt(13, 16));
      let secret = "";
      try {
        const parts = config.base.split(".");
        secret = "." + parts[1].slice(0, 4);
      } catch (_) {
        secret = "";
      }
      this.ctx = {
        provider: key,
        config: config,
        baseURL: config.base,
        secret: secret,
        guestName: `User_${crypto.randomBytes(4).toString("hex")}`,
        dId: dId,
        token: null,
        user: null,
        headers: {
          "User-Agent": "okhttp/4.12.0",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json;charset=utf-8",
          "d-id": dId,
          version: config.ver,
          "app-name": config.name,
          lang: "id",
          sim_country: "id",
          is_vpn: "1",
          d_model: dModel,
          sys_version: sysVer,
          timezone: "GMT+8"
        }
      };
      this._log("Init Pipeline", `Engine Auto-Ready via provider [${key.toUpperCase()}] | Secret Cloned: ${secret}`);
      return {
        status: true
      };
    } catch (error) {
      this._log("Pipeline Critical Error", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  _log(step, msg, detail = "") {
    try {
      const ts = new Date().toISOString();
      console.log(`[${ts}] [${this.ctx?.provider?.toUpperCase() || "OFFLINE"}] [${step}] ${msg}`, detail ? JSON.stringify(detail, null, 2) : "");
    } catch (e) {
      console.error("Logging failed:", e.message);
    }
  }
  _getKey() {
    const secretStr = this.ctx?.secret || "";
    return Buffer.concat([Buffer.alloc(3, 0), Buffer.from(secretStr), Buffer.alloc(13 - secretStr.length, 0)]);
  }
  _dec(b64Data) {
    try {
      let raw = b64Data;
      if (typeof b64Data === "object") raw = JSON.stringify(b64Data);
      if (typeof raw === "string" && raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
      let clean = raw.replace(/\s+/g, "");
      if (clean.startsWith("{")) {
        const parsed = JSON.parse(clean);
        clean = parsed.data || parsed.result || clean;
      }
      const key = this._getKey();
      let buf = Buffer.from(clean, "base64");
      const txt = buf.toString("utf8");
      if (/^[A-Za-z0-9+/=]+$/.test(txt) && txt.length > 20) buf = Buffer.from(txt, "base64");
      const decipher = crypto.createDecipheriv("aes-128-cbc", key, key);
      let decrypted = decipher.update(buf, "binary", "utf8") + decipher.final("utf8");
      const res = JSON.parse(decrypted);
      if (res.param && typeof res.param === "string") {
        try {
          res.param = JSON.parse(res.param);
        } catch (_) {}
      }
      return res;
    } catch (error) {
      this._log("Crypto Error", "Decryption failed", error.message);
      return {
        status: false,
        error: error.message
      };
    }
  }
  _enc(plainObj) {
    try {
      const key = this._getKey();
      const payloadCopy = {
        ...plainObj
      };
      if (payloadCopy.param && typeof payloadCopy.param === "object") {
        payloadCopy.param = JSON.stringify(payloadCopy.param);
      }
      const txt = JSON.stringify(payloadCopy);
      const cipher = crypto.createCipheriv("aes-128-cbc", key, key);
      let enc = cipher.update(txt, "utf8", "base64") + cipher.final("base64");
      return Buffer.from(enc).toString("base64");
    } catch (error) {
      this._log("Crypto Error", "Encryption failed", error.message);
      return null;
    }
  }
  _export() {
    try {
      if (!this.ctx) return null;
      const stateObj = {
        provider: this.ctx.provider,
        token: this.ctx.token,
        user: this.ctx.user,
        headers: this.ctx.headers,
        guestName: this.ctx.guestName,
        dId: this.ctx.dId
      };
      return Buffer.from(JSON.stringify(stateObj)).toString("base64");
    } catch (error) {
      this._log("Export Error", error.message);
      return null;
    }
  }
  _import(b64State) {
    try {
      if (!b64State) return {
        status: false
      };
      const dec = JSON.parse(Buffer.from(b64State, "base64").toString("utf8"));
      const pipe = this._autoPipe(dec.provider);
      if (!pipe.status) return pipe;
      this.ctx.token = dec.token;
      this.ctx.user = dec.user;
      this.ctx.headers = dec.headers;
      this.ctx.guestName = dec.guestName;
      this.ctx.dId = dec.dId;
      if (this.ctx.token) this.ctx.headers["access-token"] = this.ctx.token;
      this._log("State", "Session state imported successfully");
      return {
        status: true
      };
    } catch (error) {
      this._log("Import Error", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async _auth() {
    try {
      if (this.ctx.token) return;
      this._log("Auth", "Requesting login token");
      const params = {
        third_token: "",
        third_platform: "visitor",
        email: "",
        password: "",
        d_name: this.ctx.guestName,
        third_did: this.ctx.dId,
        sim_country: "id",
        is_vpn: 1,
        d_model: this.ctx.headers["d_model"],
        lang: "id",
        sys_version: this.ctx.headers["sys_version"],
        referrer: "",
        timezone: "GMT+8"
      };
      const resp = await this._post("/honey/u/login", params);
      const token = resp?.data?.token || resp?.token || resp?.data?.access_token;
      if (token) {
        this.ctx.token = token;
        this.ctx.headers["access-token"] = token;
        this.ctx.user = resp?.data?.user ?? resp?.data ?? resp;
      } else {
        this._log("Auth Warning", "Token assignment empty");
      }
    } catch (error) {
      this._log("Auth Error", error.message);
    }
  }
  async _post(endpoint, params = {}, isStream = false) {
    try {
      if (endpoint !== "/honey/u/login") await this._auth();
      const url = this.ctx.baseURL + endpoint;
      const headers = {
        ...this.ctx.headers
      };
      let rawBody = undefined;
      if (params && Object.keys(params).length > 0) {
        const payload = {
          header: {
            ...this.ctx.headers
          },
          param: params
        };
        if (this.ctx.token) payload.header["access-token"] = this.ctx.token;
        const encryptedData = this._enc(payload);
        if (!encryptedData) return {
          status: false,
          error: "Encryption bundle failed"
        };
        rawBody = JSON.stringify({
          data: encryptedData
        });
      }
      const response = await axios({
        method: "POST",
        url: url,
        headers: headers,
        data: rawBody,
        responseType: isStream ? "stream" : "text"
      });
      if (isStream) return response.data;
      return this._dec(response.data);
    } catch (error) {
      this._log("Network Post Error", error.message);
      return {
        status: false,
        error: error.message
      };
    }
  }
  async _get(endpoint, qs = {}, isStream = false) {
    try {
      await this._auth();
      const url = this.ctx.baseURL + endpoint;
      const headers = {
        ...this.ctx.headers
      };
      const response = await axios({
        method: "GET",
        url: url,
        headers: headers,
        params: qs,
        responseType: isStream ? "stream" : "text"
      });
      if (isStream) return response.data;
      return this._dec(response.data);
    } catch (error) {
      this._log("Network Get Error", error.message);
      return {
        status: false,
        error: error.message
      };
    }
  }
  async detail(bot_id) {
    try {
      this._log("Detail", `Fetching details for ${bot_id}`);
      const res = await this._post("/honey/bot/detail", {
        bot_id: bot_id
      });
      return {
        status: true,
        result: res?.data || res,
        state: this._export()
      };
    } catch (error) {
      return {
        status: false,
        result: error.message,
        state: this._export()
      };
    }
  }
  async setTts(bot_id, tts_model_id) {
    try {
      this._log("SetTTS", `Linking voice ${tts_model_id}`);
      const res = await this._post("/honey/voice/role/set_tts", {
        bot_id: bot_id,
        tts_model_id: tts_model_id
      });
      return {
        status: true,
        result: res?.data || res,
        state: this._export()
      };
    } catch (error) {
      return {
        status: false,
        result: error.message,
        state: this._export()
      };
    }
  }
  async getTts(bot_id, chat_id, tts_model_id) {
    try {
      this._log("GetTTS", `Generating audio file asset`);
      const res = await this._post("/honey/voice/chat_tts", {
        bot_id: bot_id,
        chat_id: chat_id,
        tts_model_id: tts_model_id,
        unit_price: .1,
        cost: 2,
        emotion_id: 0
      });
      return {
        status: true,
        result: res?.data || res,
        state: this._export()
      };
    } catch (error) {
      return {
        status: false,
        result: error.message,
        state: this._export()
      };
    }
  }
  async getImage(bot_id, scenario_id = 0) {
    try {
      this._log("GetImage", "Pulling background room mesh");
      const res = await this._post("/honey/bot/get_chat_image", {
        bot_id: bot_id,
        scenario_id: scenario_id
      });
      return {
        status: true,
        result: res?.data || res,
        state: this._export()
      };
    } catch (error) {
      return {
        status: false,
        result: error.message,
        state: this._export()
      };
    }
  }
  async search({
    provider,
    state,
    query,
    detail = false,
    page = 1,
    size = 10,
    ...rest
  }) {
    try {
      const pipe = this._autoPipe(provider, state);
      if (!this.ctx) return pipe;
      this._log("Search Flow", `Keyword query: "${query}"`);
      const params = {
        keyword: query,
        page: page,
        size: size,
        ...rest
      };
      const rawRes = await this._post("/honey/bot/search", params);
      let finalResult = rawRes?.data?.list ?? rawRes?.list ?? [];
      if (detail && finalResult.length > 0) {
        this._log("Search Flow", "Expanding profiles iteratively due to detail option flag");
        const detailedList = [];
        for (const item of finalResult) {
          const id = item.bot_id || item.id;
          if (id) {
            const info = await this.detail(id);
            if (info.status) detailedList.push(info.result);
          }
        }
        finalResult = detailedList;
      }
      return {
        status: true,
        result: finalResult,
        state: this._export()
      };
    } catch (error) {
      this._log("Search Critical Error", error.message);
      return {
        status: false,
        result: error.message,
        state: this._export()
      };
    }
  }
  async chat({
    provider,
    state,
    prompt,
    bot_id,
    scenario_id = 0,
    lang = "Indonesian",
    def_tts = 1083,
    ...rest
  }) {
    try {
      const pipe = this._autoPipe(provider, state);
      if (!this.ctx) return pipe;
      const targetBotId = bot_id || this.bot_ids;
      this._log("Chat Flow", `Initiating pipeline with bot_id: ${targetBotId}`);
      let botSpecs = null;
      try {
        this._log("Chat Flow", "Subprocess 1: Fetching bot specifications");
        const botDetail = await this.detail(targetBotId);
        if (botDetail.status) {
          botSpecs = botDetail.result;
        } else {
          this._log("Chat Flow", "Warning: detail bot gagal, lanjut dengan default");
        }
      } catch (e) {
        this._log("Chat Flow", "Error detail bot", e.message);
      }
      const activeTtsId = botSpecs?.tts_model_id || def_tts;
      try {
        this._log("Chat Flow", "Subprocess 2: Syncing voice signature");
        await this.setTts(targetBotId, activeTtsId);
      } catch (e) {
        this._log("Chat Flow", "Error setTts, lanjut tanpa sinkronisasi", e.message);
      }
      let textAccumulator = "";
      let targetChatId = null;
      let jsonChunks = [];
      let streamError = null;
      try {
        this._log("Chat Flow", "Subprocess 3: Executing stream handshake");
        const qs = {
          q: prompt,
          bot_id: targetBotId,
          lang: lang,
          is_stream: 1,
          scenario_id: scenario_id,
          ...rest
        };
        const stream = await this._get("/honey/bot/chat_new", qs, true);
        if (stream && typeof stream.on === "function") {
          await new Promise(resolve => {
            let chunkBuffer = "";
            stream.on("data", chunk => {
              chunkBuffer += chunk.toString("utf8");
              const lines = chunkBuffer.split("\n");
              chunkBuffer = lines.pop() || "";
              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const strPayload = line.slice(6).trim();
                  if (strPayload === "[DONE]") continue;
                  try {
                    const item = JSON.parse(strPayload);
                    jsonChunks.push(item);
                    const chunkText = item?.choices?.[0]?.delta?.content;
                    if (item?.choices?.[0]?.chat_id) targetChatId = item.choices[0].chat_id;
                    if (chunkText) textAccumulator += chunkText;
                  } catch (_) {}
                }
              }
            });
            stream.on("end", resolve);
            stream.on("error", err => {
              streamError = err.message;
              resolve();
            });
          });
        } else {
          streamError = "Stream connection output structure is invalid";
        }
      } catch (e) {
        streamError = e.message;
        this._log("Chat Flow", "Error pada stream chat", e.message);
      }
      let imageData = null;
      try {
        this._log("Chat Flow", "Subprocess 4: Resolving room background");
        const imgRes = await this.getImage(targetBotId, scenario_id);
        if (imgRes.status) imageData = imgRes.result;
      } catch (e) {
        this._log("Chat Flow", "Error getImage", e.message);
      }
      let voiceData = null;
      if (targetChatId) {
        try {
          this._log("Chat Flow", "Subprocess 5: Synthesizing voice audio");
          const voiceRes = await this.getTts(targetBotId, targetChatId, activeTtsId);
          if (voiceRes.status) voiceData = voiceRes.result;
        } catch (e) {
          this._log("Chat Flow", "Error getTts", e.message);
        }
      }
      const payloadBundle = {
        bot_id: targetBotId,
        chat_id: targetChatId,
        text: textAccumulator || (streamError ? `[Stream error: ${streamError}]` : ""),
        chunks: jsonChunks,
        image: imageData,
        voice: voiceData,
        bot_info: botSpecs,
        _partial_errors: {
          stream: streamError
        }
      };
      return {
        status: true,
        result: payloadBundle,
        state: this._export()
      };
    } catch (error) {
      this._log("Chat Flow ERROR", error.message);
      return {
        status: false,
        result: error.message,
        state: this._export()
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["search", "chat"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          search: "/?action=search&query=kim",
          chat: "/?action=chat&prompt=hai"
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
  const api = new AIClient();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari server. Coba lagi nanti."
      });
    }
    if (response.error) {
      return res.status(400).json({
        status: false,
        action: action,
        ...response
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}