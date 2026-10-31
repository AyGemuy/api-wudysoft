import axios from "axios";
import crypto from "node:crypto";
class Prelulu {
  constructor(opts = {}) {
    this.base = "https://prelulu.ai/api";
    this.locale = opts?.locale || "id";
    this.ua = opts?.user_agent || "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";
    this.cookie = opts?.cookie || "";
  }
  hdr(extra = {}) {
    const headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://prelulu.ai",
      pragma: "no-cache",
      referer: "https://prelulu.ai/id",
      "sec-ch-ua": '"Not;A=Brand";v="99", "Chromium";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": this.ua,
      "x-keepsake-analytics": "allowed",
      "x-prelulu-locale": this.locale,
      ...extra
    };
    if (this.cookie) {
      headers["cookie"] = this.cookie;
    }
    return headers;
  }
  res(ok, data) {
    return {
      status: Boolean(ok),
      result: data
    };
  }
  async characters({
    page = 1,
    page_size = 50,
    pageSize,
    ...rest
  } = {}) {
    try {
      const p = Number(page) || 1;
      const ps = Number(pageSize || page_size) || 50;
      const url = `${this.base}/characters`;
      const response = await axios.get(url, {
        params: {
          page: p,
          pageSize: ps,
          ...rest
        },
        headers: this.hdr()
      });
      return this.res(true, response.data);
    } catch (err) {
      return this.res(false, {
        error: err?.response?.data || err?.message || "Gagal memuat characters"
      });
    }
  }
  async search({
    query,
    ...rest
  } = {}) {
    try {
      if (!query || !String(query).trim()) {
        throw new Error('Parameter "query" wajib diisi.');
      }
      const q = String(query).toLowerCase().trim();
      const pageSize = 500;
      const url = `${this.base}/characters`;
      const firstPageResp = await axios.get(url, {
        params: {
          page: 1,
          pageSize: pageSize,
          ...rest
        },
        headers: this.hdr()
      });
      const data = firstPageResp.data;
      let allItems = Array.isArray(data?.items) ? [...data.items] : [];
      const totalPages = Number(data?.totalPages) || 1;
      if (totalPages > 1) {
        const requests = [];
        for (let p = 2; p <= totalPages; p++) {
          requests.push(axios.get(url, {
            params: {
              page: p,
              pageSize: pageSize,
              ...rest
            },
            headers: this.hdr()
          }).catch(() => null));
        }
        const responses = await Promise.all(requests);
        for (const r of responses) {
          if (r?.data?.items && Array.isArray(r.data.items)) {
            allItems.push(...r.data.items);
          }
        }
      }
      const matchedItems = allItems.filter(item => {
        const name = (item.name || "").toLowerCase();
        const handle = (item.handle || "").toLowerCase();
        const slug = (item.slug || "").toLowerCase();
        const intro = (item.intro || "").toLowerCase();
        const tags = Array.isArray(item.tags) ? item.tags.join(" ").toLowerCase() : "";
        const genres = Array.isArray(item.genres) ? item.genres.join(" ").toLowerCase() : "";
        return name.includes(q) || handle.includes(q) || slug.includes(q) || intro.includes(q) || tags.includes(q) || genres.includes(q);
      });
      return this.res(true, {
        total_searched: allItems.length,
        total_found: matchedItems.length,
        items: matchedItems
      });
    } catch (err) {
      return this.res(false, {
        error: err?.response?.data || err?.message || "Gagal mencari character"
      });
    }
  }
  async chat({
    character_id,
    id,
    prompt,
    text,
    messages,
    input_id,
    request_id,
    ...rest
  } = {}) {
    try {
      const charId = character_id || id;
      const inputPrompt = prompt || text;
      if (!charId) throw new Error('Parameter "character_id" (atau "id") wajib diisi.');
      if (!inputPrompt) throw new Error('Parameter "prompt" (atau "text") wajib diisi.');
      let activeMessages = [];
      if (Array.isArray(messages)) {
        activeMessages = [...messages];
      } else if (typeof messages === "string") {
        try {
          activeMessages = JSON.parse(messages);
        } catch (_) {
          activeMessages = [];
        }
      }
      activeMessages.push({
        role: "user",
        content: String(inputPrompt)
      });
      const timestamp = Math.floor(Date.now() / 1e3);
      const payload = {
        characterId: charId,
        inputId: input_id || crypto.randomUUID(),
        messages: activeMessages,
        chatGoogle: {
          protocol: "server_v1",
          enabled: true,
          target: {
            surface: "web",
            clientId: `${Math.floor(Math.random() * 9e9) + 1e9}.${timestamp}`,
            sessionId: timestamp
          }
        },
        requestId: request_id || crypto.randomUUID(),
        ...rest
      };
      const url = `${this.base}/character-chat`;
      const response = await axios.post(url, payload, {
        headers: this.hdr({
          referer: `https://prelulu.ai/character/${charId.replace(/^prelulu-/, "")}`
        })
      });
      const rawText = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
      let reply = rawText;
      let meta = null;
      if (rawText.includes("␞␞META␞␞")) {
        const parts = rawText.split("␞␞META␞␞");
        reply = (parts[0] || "").trim();
        try {
          meta = JSON.parse(parts[1]?.trim() || "{}");
        } catch (_) {
          meta = parts[1]?.trim() || null;
        }
      }
      if (reply) {
        activeMessages.push({
          role: "assistant",
          content: reply
        });
      }
      return this.res(true, {
        reply: reply,
        meta: meta,
        messages: activeMessages
      });
    } catch (err) {
      return this.res(false, {
        error: err?.response?.data || err?.message || "Gagal mengirim chat ke Prelulu"
      });
    }
  }
}
export default async function handler(req, res) {
  try {
    const queryParams = req.method === "GET" ? req.query : req.body;
    const {
      action,
      ...params
    } = queryParams || {};
    const validActions = ["characters", "search", "chat"];
    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: validActions,
        usage: {
          examples: ["/?action=characters&page=1&page_size=50", "/?action=search&query=vampire", "/?action=chat&character_id=prelulu-dante-8dc7b0&prompt=Halo"]
        }
      });
    }
    if (!validActions.includes(action)) {
      return res.status(400).json({
        status: false,
        error: `Action tidak valid: "${action}".`,
        valid_actions: validActions
      });
    }
    const api = new Prelulu({
      locale: params.locale,
      user_agent: params.user_agent,
      cookie: params.cookie
    });
    let response;
    switch (action) {
      case "characters": {
        response = await api.characters(params);
        break;
      }
      case "search": {
        const query = params.query || params.q;
        if (!query || !String(query).trim()) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search({
          query: query,
          ...params
        });
        break;
      }
      case "chat": {
        const charId = params.character_id || params.id;
        const prompt = params.prompt || params.text;
        if (!charId || !String(charId).trim()) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'character_id' (atau 'id') wajib diisi untuk action 'chat'."
          });
        }
        if (!prompt || !String(prompt).trim()) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' (atau 'text') wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat({
          character_id: charId,
          prompt: prompt,
          ...params
        });
        break;
      }
    }
    if (response && response.status) {
      return res.status(200).json({
        status: true,
        action: action,
        result: response.result
      });
    } else {
      return res.status(400).json({
        status: false,
        action: action,
        error: response?.result?.error || "Gagal memproses request Prelulu."
      });
    }
  } catch (error) {
    console.error("[FATAL ERROR] Handler Prelulu:", error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error?.message || "Unknown Error"
    });
  }
}