import axios from "axios";
import crypto from "crypto";
class NsfwAiChat {
  constructor() {
    try {
      this._cdn = "https://sp.nsfwaichat.com/storage/v1/object/public/bot-avatars/";
      this.visitor_id = null;
      this.token = null;
      this._hex = "012345efabcd6789";
      this.client = axios.create({
        baseURL: "https://api.nsfwaichat.com",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Type": "application/json",
          Origin: "https://nsfwaichat.com",
          Pragma: "no-cache",
          Referer: "https://nsfwaichat.com/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-site",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        }
      });
      this._l("Client initialized");
    } catch (e) {
      this._l("Init err:", e?.message || e);
    }
  }
  _l(...a) {
    try {
      console.log("[NsfwAiChat]", ...a);
    } catch (e) {}
  }
  _u() {
    try {
      return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
    } catch (e) {
      this._l("UUID err:", e?.message || e);
      return String(Date.now());
    }
  }
  _obscure(id) {
    if (!id) return "";
    let result = "";
    for (let i = 0; i < id.length; i++) {
      const char = id[i];
      if (char === "-") {
        result += char;
        continue;
      }
      const idx = this._hex.indexOf(char);
      if (idx === -1) {
        result += char;
        continue;
      }
      const newIndex = (idx + i + 1 + 6) % 16;
      result += this._hex[newIndex];
    }
    return result;
  }
  _f(s = false, r = null, c = [], vid = null) {
    try {
      return {
        status: Boolean(s),
        result: r || null,
        chunks: Array.isArray(c) ? c : [],
        visitor_id: vid || this.visitor_id || null
      };
    } catch (e) {
      this._l("Fmt err:", e?.message || e);
      return {
        status: false,
        result: null,
        chunks: [],
        visitor_id: null
      };
    }
  }
  _p(pic) {
    try {
      if (!pic) return "";
      return pic.startsWith("http") ? pic : `${this._cdn}${pic}`;
    } catch (e) {
      this._l("Pic err:", e?.message || e);
      return pic || "";
    }
  }
  async _e(e) {
    try {
      if (e?.response?.data && typeof e.response.data.on === "function") {
        const chunks = [];
        for await (const chunk of e.response.data) {
          chunks.push(chunk);
        }
        const raw = Buffer.concat(chunks).toString("utf8");
        try {
          return JSON.parse(raw);
        } catch {
          return raw || e?.message || "Request failed";
        }
      }
      return e?.response?.data || e?.message || "Request failed";
    } catch {
      return e?.message || "Request failed";
    }
  }
  async _s(vid = null) {
    try {
      if (vid) {
        this.visitor_id = vid;
        return this.visitor_id;
      }
      if (this.visitor_id) {
        return this.visitor_id;
      }
      this._l("Auto creating visitor_id...");
      const res = await this._session();
      return res?.visitor_id || this.visitor_id;
    } catch (e) {
      this._l("Auto vid err:", e?.message || e);
      return null;
    }
  }
  async _session({
    visitor_id,
    first_page = "sfw-popular",
    ...rest
  } = {}) {
    try {
      const activeVid = visitor_id || this.visitor_id;
      if (activeVid) {
        this.visitor_id = activeVid;
        return this._f(true, {
          visitor_id: activeVid
        }, [], activeVid);
      }
      this._l("Creating visitor_id...");
      const targetVid = this._u();
      const {
        data
      } = await this.client.post("/visitor/create", {
        visitorId: targetVid,
        firstPage: first_page,
        ...rest
      });
      this.visitor_id = data?.visitorId || targetVid;
      this._l("Visitor ID ready:", this.visitor_id);
      return this._f(true, {
        visitorId: this.visitor_id,
        quotaCount: data?.quotaCount || 0,
        usedCount: data?.usedCount || 0
      }, [], this.visitor_id);
    } catch (e) {
      const err = await this._e(e);
      this._l("Create visitor_id err:", err);
      return this._f(false, {
        error: err
      });
    }
  }
  async search({
    query = "",
    page = 1,
    mode = "all",
    sort = "latest",
    visitor_id,
    ...rest
  } = {}) {
    try {
      await this._s(visitor_id);
      this._l(`Searching: "${query}"...`);
      const {
        data
      } = await this.client.get("/characters/new", {
        params: {
          page: page || 1,
          search: query,
          mode: mode || "all",
          sort: sort || "latest",
          ...rest
        }
      });
      const list = (data?.data || []).map(item => ({
        ...item,
        avatar_url: this._p(item?.avatar)
      }));
      Object.assign(list, {
        total: data?.total || 0,
        size: data?.size || 0,
        page: data?.page || 1
      });
      return this._f(true, list, [], this.visitor_id);
    } catch (e) {
      const err = await this._e(e);
      this._l("Search err:", err);
      return this._f(false, {
        error: err
      });
    }
  }
  async detail({
    id = "41ed7314-35e6-4ca4-9939-c706b9bca516",
    visitor_id,
    ...rest
  } = {}) {
    try {
      await this._s(visitor_id);
      this._l(`Fetching detail: ${id}...`);
      if (!id) return this._f(false, {
        error: "id parameter is required"
      });
      const {
        data
      } = await this.client.get(`/characters/${id}`, {
        params: rest
      });
      const bot = {
        ...data,
        avatar_url: this._p(data?.avatar)
      };
      return this._f(true, bot, [], this.visitor_id);
    } catch (e) {
      const err = await this._e(e);
      this._l("Detail err:", err);
      return this._f(false, {
        error: err
      });
    }
  }
  async chat({
    prompt = "",
    messages = [],
    id = "41ed7314-35e6-4ca4-9939-c706b9bca516",
    visitor_id,
    ...rest
  } = {}) {
    try {
      this._l("Preparing chat...");
      const hasPrompt = typeof prompt === "string" && prompt.trim().length > 0;
      const hasMessages = Array.isArray(messages) && messages.length > 0;
      if (!hasPrompt && !hasMessages) {
        return this._f(false, {
          error: "prompt or messages parameter is required"
        });
      }
      let vid = await this._s(visitor_id) || this._u();
      let botDetail = null;
      if (id) {
        const detRes = await this.detail({
          id: id,
          visitor_id: vid
        });
        botDetail = detRes?.status ? detRes?.result : null;
      }
      let history = Array.isArray(messages) ? [...messages] : [];
      if (botDetail && history.length === 0) {
        const name = botDetail?.name || "";
        const personality = botDetail?.personality || "";
        const scenario = botDetail?.scenario || "";
        const exampleDialogs = botDetail?.example_dialogs || "";
        let sysPrompt = `XXYYI{{*prompt*}}XXYYI. {{char}}'s name: ${name}. {{char}} calls {{user}} by {{user}} or any name introduced by {{user}}.`;
        if (personality) sysPrompt += ` {{char}}'s personality: ${personality}.`;
        if (scenario) sysPrompt += ` Scenario of the roleplay: ${scenario}.`;
        if (exampleDialogs) sysPrompt += ` Example conversations between {{char}} and {{user}}: ${exampleDialogs}.`;
        history.push({
          role: "system",
          content: sysPrompt
        });
        if (botDetail?.first_message) {
          history.push({
            role: "assistant",
            content: botDetail.first_message
          });
        }
      }
      if (hasPrompt && (history.length === 0 || history[history.length - 1]?.role !== "user")) {
        history.push({
          role: "user",
          content: prompt
        });
      }
      const payload = {
        messages: history,
        visitorId: vid,
        vccid: this._obscure(id),
        messageLength: history.length,
        ...rest
      };
      this._l("Sending stream...");
      const authHeader = this.token ? `Bearer ${this.token}` : "Bearer undefined";
      const response = await this.client.post("/chat/completions/visitor", payload, {
        headers: {
          Accept: "*/*",
          Authorization: authHeader,
          "Content-Type": "application/json"
        },
        responseType: "stream"
      });
      const chunks = [];
      let fullText = "";
      let buffer = "";
      await new Promise((resolve, reject) => {
        response.data.on("data", chunk => {
          try {
            buffer += chunk.toString("utf8");
            let lineIndex;
            while ((lineIndex = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, lineIndex).trim();
              buffer = buffer.slice(lineIndex + 1);
              if (line.startsWith("data: ")) {
                const raw = line.slice(6).trim();
                if (raw === "[DONE]") continue;
                const cleanRaw = raw.split("#K**XX&&YY**K#")[0];
                const parsed = JSON.parse(cleanRaw);
                chunks.push(parsed);
                const delta = parsed?.choices?.[0]?.delta?.content || "";
                if (delta) fullText += delta;
              }
            }
          } catch (e) {}
        });
        response.data.on("end", () => resolve());
        response.data.on("error", e => reject(e));
      });
      if (fullText) history.push({
        role: "assistant",
        content: fullText
      });
      const result = {
        text: fullText,
        bot_detail: botDetail,
        messages: history
      };
      return this._f(true, result, chunks, vid);
    } catch (e) {
      const err = await this._e(e);
      this._l("Chat err:", err);
      return this._f(false, {
        error: err
      });
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["search", "detail", "chat"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          search: "/?action=search&query=Duck&page=1",
          detail: "/?action=detail&id=41ed7314-35e6-4ca4-9939-c706b9bca516",
          chat: "/?action=chat&id=41ed7314-35e6-4ca4-9939-c706b9bca516&prompt=Hello"
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
  const scraper = new NsfwAiChat();
  try {
    let response;
    switch (action) {
      case "search":
        response = await scraper.search(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk detail."
          });
        }
        response = await scraper.detail(params);
        break;
      case "chat":
        if (!params.prompt && !params.messages) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' atau 'messages' wajib diisi untuk chat."
          });
        }
        response = await scraper.chat(params);
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
    return res.status(200).json({
      status: true,
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