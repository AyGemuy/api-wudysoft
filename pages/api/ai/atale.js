import axios from "axios";
class AtaleAI {
  constructor() {
    try {
      this.jar = {
        NEXT_LOCALE: "en",
        NEXT_LOCALE_SOURCE: "auto"
      };
      this.token = "";
      this.user = null;
      this.cli = axios.create({
        baseURL: "https://atale.ai",
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          origin: "https://atale.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://atale.ai/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-language": "en",
          "x-platform": "web",
          "x-version": "999.0.0"
        }
      });
      this.cli.interceptors.request.use(cfg => {
        try {
          const c = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
          if (c) cfg.headers.cookie = c;
          if (this.token) cfg.headers["x-auth-token"] = this.token;
        } catch (e) {
          this._lg(`Req Interceptor Error: ${e?.message}`);
        }
        return cfg;
      });
      this.cli.interceptors.response.use(res => {
        try {
          const sc = res.headers?.["set-cookie"] || res.headers?.["Set-Cookie"];
          if (sc) {
            const arr = Array.isArray(sc) ? sc : [sc];
            arr.forEach(item => {
              const [kv] = item.split(";");
              const [k, ...v] = kv.split("=");
              if (k) this.jar[k.trim()] = v.join("=").trim();
            });
          }
        } catch (e) {
          this._lg(`Res Interceptor Error: ${e?.message}`);
        }
        return res;
      });
    } catch (err) {
      console.error("[Atale] Class Init Error:", err?.message);
    }
  }
  _lg(m) {
    try {
      console.log(`[Atale] ${m}`);
    } catch {
      return null;
    }
  }
  _sd(s) {
    try {
      return typeof s === "string" ? JSON.parse(Buffer.from(s, "base64").toString("utf-8")) : s || {};
    } catch {
      return {};
    }
  }
  _se(d) {
    try {
      return Buffer.from(JSON.stringify(d || {})).toString("base64");
    } catch {
      return "";
    }
  }
  async _ini() {
    try {
      this._lg("Creating guest session...");
      const resGuest = await this.cli.post("/api/auth/createGuest", {}, {
        headers: {
          "content-length": "0"
        }
      });
      const {
        guestKey,
        guestUid
      } = resGuest?.data?.data || {};
      if (!guestKey || !guestUid) {
        this._lg("Failed to obtain guest key/uid");
        return false;
      }
      this._lg("Logging in as guest...");
      const resLogin = await this.cli.post("/api/auth/loginByGuest", {
        guestUid: guestUid,
        guestKey: guestKey
      });
      const idToken = resLogin?.data?.data?.idToken || "";
      if (!idToken) {
        this._lg("Failed to obtain guest idToken");
        return false;
      }
      this.token = idToken;
      this._lg("Fetching guest account profile...");
      const resAcc = await this.cli.get("/api/auth/getAccount", {
        headers: {
          "x-no-handle": "true"
        }
      });
      this.user = resAcc?.data?.data || null;
      this._lg("Verifying adult access permissions...");
      await this.cli.get("/api/auth/adultAccess", {
        headers: {
          "x-no-handle": "true"
        }
      });
      this._lg("Attesting adult status (NSFW/Bot access)...");
      await this.cli.post("/api/auth/attestAdult", {
        confirmedAdult: true
      }, {
        headers: {
          "x-no-handle": "true"
        }
      });
      this._lg("Guest auth & adult attestation completed successfully");
      return true;
    } catch (e) {
      this._lg(`Init error: ${e?.message}`);
      return false;
    }
  }
  async _ens(st) {
    try {
      const parsed = this._sd(st);
      if (parsed?.jar) this.jar = {
        ...this.jar,
        ...parsed.jar
      };
      if (parsed?.token) this.token = parsed.token || this.token;
      if (parsed?.user) this.user = parsed.user || this.user;
      if (!this.token) {
        await this._ini();
      }
      return this._se({
        jar: this.jar,
        token: this.token,
        user: this.user
      });
    } catch (e) {
      this._lg(`Ensure state error: ${e?.message}`);
      return this._se({
        jar: this.jar,
        token: this.token,
        user: this.user
      });
    }
  }
  async home({
    state,
    ...rest
  } = {}) {
    try {
      this._lg("Fetching home bot list...");
      const curState = await this._ens(state);
      const params = {
        pageNo: rest?.pageNo || 1,
        pageSize: rest?.pageSize || 30,
        sortColumn: rest?.sortColumn || "popularity",
        sortType: rest?.sortType ?? false,
        categoryId: rest?.categoryId ?? 0,
        ...rest
      };
      const res = await this.cli.get("/api/bot", {
        params: params
      });
      const records = res?.data?.data?.records || [];
      return {
        status: res?.data?.code === "200" || res?.status === 200,
        result: records,
        state: curState
      };
    } catch (e) {
      this._lg(`Home error: ${e?.message}`);
      return {
        status: false,
        result: [],
        state: this._se({
          jar: this.jar,
          token: this.token,
          user: this.user
        })
      };
    }
  }
  async search({
    state,
    query,
    ...rest
  } = {}) {
    try {
      this._lg(`Searching bots for: "${query || ""}"...`);
      const curState = await this._ens(state);
      const params = {
        pageNo: rest?.pageNo || 1,
        pageSize: rest?.pageSize || 30,
        sortColumn: rest?.sortColumn || "popularity",
        sortType: rest?.sortType ?? false,
        keyword: query || "",
        ...rest
      };
      const res = await this.cli.get("/api/bot", {
        params: params
      });
      const data = res?.data?.data || {};
      const records = data?.records || [];
      const count = data?.total || records.length || 0;
      return {
        status: res?.data?.code === "200" || res?.status === 200,
        result: records,
        count: count,
        state: curState
      };
    } catch (e) {
      this._lg(`Search error: ${e?.message}`);
      return {
        status: false,
        result: [],
        count: 0,
        state: this._se({
          jar: this.jar,
          token: this.token,
          user: this.user
        })
      };
    }
  }
  async chat({
    state,
    prompt,
    ...rest
  } = {}) {
    try {
      this._lg("Preparing chat execution...");
      const curState = await this._ens(state);
      const botId = rest?.botId || 161594;
      let sessionId = rest?.sessionId || null;
      if (!sessionId) {
        this._lg(`Creating chat session for botId ${botId}...`);
        const resSess = await this.cli.post(`/api/msg/createSession?botId=${botId}`, {}, {
          headers: {
            "content-length": "0"
          }
        });
        sessionId = resSess?.data?.data?.id || resSess?.data?.data?.chatSessionId || null;
      }
      if (!sessionId) {
        this._lg("Session creation failed");
        return {
          status: false,
          result: null,
          chunks: [],
          state: curState
        };
      }
      this._lg("Fetching session history...");
      const resHist = await this.cli.post("/api/msg/getChatMessages", {
        chatSessionId: Number(sessionId),
        page: 1,
        size: 50
      });
      const records = resHist?.data?.data?.records || [];
      const conversationHistory = records.map(r => ({
        role: r?.sendUserType === 1 ? "assistant" : "user",
        content: r?.content || ""
      }));
      this._lg("Sending user message...");
      await this.cli.post("/api/msg/send", {
        sessionId: Number(sessionId),
        msg: prompt || ""
      });
      this._lg("Initiating SSE chat stream...");
      const streamRes = await this.cli.post("/chat-stream", {
        message: prompt || "",
        sessionId: String(sessionId),
        conversationHistory: conversationHistory,
        userToken: this.token,
        userLocale: rest?.userLocale || "en"
      }, {
        responseType: "stream"
      });
      return new Promise(resolve => {
        try {
          let result = "";
          const chunks = [];
          let bufferStr = "";
          streamRes.data.on("data", chunk => {
            try {
              bufferStr += chunk.toString("utf-8");
              const lines = bufferStr.split("\n");
              bufferStr = lines.pop() || "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                const dataIdx = trimmed.indexOf("data:");
                if (dataIdx === -1) continue;
                const rawData = trimmed.slice(dataIdx + 5).trim();
                if (!rawData) continue;
                try {
                  const json = JSON.parse(rawData);
                  chunks.push(json);
                  if (json?.type === "content" && typeof json?.content === "string") {
                    result += json.content;
                  }
                } catch {}
              }
            } catch (err) {
              this._lg(`Stream chunk error: ${err?.message}`);
            }
          });
          streamRes.data.on("end", async () => {
            try {
              if (bufferStr.trim()) {
                const dataIdx = bufferStr.indexOf("data:");
                if (dataIdx !== -1) {
                  const rawData = bufferStr.slice(dataIdx + 5).trim();
                  if (rawData) {
                    try {
                      const json = JSON.parse(rawData);
                      chunks.push(json);
                      if (json?.type === "content" && typeof json?.content === "string") {
                        result += json.content;
                      }
                    } catch {}
                  }
                }
              }
              this._lg("Stream end reached, sending callback...");
              await this.cli.post("/api/msg/callback", {
                sessionId: Number(sessionId),
                msg: result,
                generateType: "1"
              });
              resolve({
                status: true,
                result: result,
                chunks: chunks,
                state: this._se({
                  jar: this.jar,
                  token: this.token,
                  user: this.user
                })
              });
            } catch (err) {
              this._lg(`Callback warning: ${err?.message}`);
              resolve({
                status: true,
                result: result,
                chunks: chunks,
                state: this._se({
                  jar: this.jar,
                  token: this.token,
                  user: this.user
                })
              });
            }
          });
          streamRes.data.on("error", err => {
            this._lg(`Stream response error: ${err?.message}`);
            resolve({
              status: false,
              result: null,
              chunks: [],
              state: this._se({
                jar: this.jar,
                token: this.token,
                user: this.user
              })
            });
          });
        } catch (e) {
          this._lg(`Stream setup error: ${e?.message}`);
          resolve({
            status: false,
            result: null,
            chunks: [],
            state: this._se({
              jar: this.jar,
              token: this.token,
              user: this.user
            })
          });
        }
      });
    } catch (e) {
      this._lg(`Chat error: ${e?.message}`);
      return {
        status: false,
        result: null,
        chunks: [],
        state: this._se({
          jar: this.jar,
          token: this.token,
          user: this.user
        })
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "search", "chat"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/?action=home",
          search: "/?action=search&query=Aizawa",
          chat: "/?action=chat&prompt=Halo&botId=161594"
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
  const api = new AtaleAI();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/?action=search&query=Aizawa"
          });
        }
        response = await api.search(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'.",
            example: "/?action=chat&prompt=Halo&botId=161594"
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
        error: "Tidak ada respons dari server AtaleAI. Coba lagi nanti."
      });
    }
    if (response.status === false) {
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