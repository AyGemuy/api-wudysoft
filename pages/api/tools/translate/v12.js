import axios from "axios";
import WebSocket from "ws";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
const jar = new CookieJar();
const client = wrapper(axios.create({
  jar: jar
}));
class Translator {
  constructor() {
    this.cfg = {
      api: "https://api.machinetranslation.com/v1/translation",
      sio: "https://sio.machinetranslation.com/socket.io/",
      wss: "wss://sio.machinetranslation.com/socket.io/",
      key: "pDwCjq7CyeAmn1Z3osNunACg2U0SLIhwBTtsp1WqYFMf5UuSIvMBYGS4pt8OIsGMH",
      ua: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      engines: ["smart", "chat_gpt", "gemini", "claude", "amazon_nova", "mistral_ai", "grok_ai", "qwen"],
      timeout: 6e4
    };
    this.h = {
      Origin: "https://www.aitranslator.com",
      Referer: "https://www.aitranslator.com/",
      "User-Agent": this.cfg.ua,
      "api-key": this.cfg.key
    };
  }
  async translate({
    text,
    from = "en",
    to = "id",
    llm = "all"
  }) {
    try {
      console.log("[PROCESS] 1. Creating Translation Task...");
      const shareId = await this.getTask(text, from, to);
      if (!shareId) throw new Error("Failed to create Task ID");
      console.log("[PROCESS] 2. Synchronizing Session (SID)...");
      const sid = await this.getSid(shareId);
      if (!sid) throw new Error("Failed to synchronize Session");
      console.log(`[PROCESS] 3. Monitoring WSS (Mode: ${llm})...`);
      const wsResults = await this.wait(shareId, sid);
      console.log("[PROCESS] 4. Fetching & Merging Final Data...");
      const insight = await this.fetchAll(shareId);
      const merged = this.merge(insight.translations, wsResults);
      const result = this.filter(merged, llm);
      console.log("[SUCCESS] Translation process completed.");
      return result;
    } catch (e) {
      console.error("[FATAL ERROR]", e.message);
      return {
        error: true,
        message: e.message
      };
    }
  }
  async getTask(text, from, to) {
    try {
      const {
        data
      } = await client.post(`${this.cfg.api}/share-id`, {
        text: text,
        source_language_code: from,
        target_language_code: to,
        site_key: "ai_translator"
      }, {
        headers: this.h
      });
      console.log(`[LOG] Task ID: ${data.share_id}`);
      return data.share_id;
    } catch (e) {
      console.error("[ERR] Task creation failed:", e.response?.data || e.message);
      return null;
    }
  }
  async getSid(shareId) {
    try {
      const {
        data: handshake
      } = await client.get(this.cfg.sio, {
        params: {
          EIO: 4,
          transport: "polling",
          t: Date.now().toString(36)
        },
        headers: this.h
      });
      const sid = JSON.parse(handshake.substring(1)).sid;
      await client.post(this.cfg.sio, `40${JSON.stringify({
shareId: shareId
})}`, {
        params: {
          EIO: 4,
          transport: "polling",
          t: Date.now().toString(36),
          sid: sid
        },
        headers: {
          ...this.h,
          "Content-type": "text/plain;charset=UTF-8"
        }
      });
      return sid;
    } catch (e) {
      console.error("[ERR] SID synchronization failed:", e.message);
      return null;
    }
  }
  wait(shareId, sid) {
    return new Promise((resolve, reject) => {
      const url = `${this.cfg.wss}?EIO=4&transport=websocket&sid=${sid}`;
      const ws = new WebSocket(url, {
        headers: this.h
      });
      const wsData = [];
      const timer = setTimeout(() => {
        ws.terminate();
        reject(new Error("WebSocket Timeout"));
      }, this.cfg.timeout);
      ws.on("open", () => {
        console.log("[WS] Handshake 2probe...");
        ws.send("2probe");
      });
      ws.on("message", raw => {
        const m = raw.toString();
        if (m === "3probe") {
          ws.send("5");
          ws.send(`42${JSON.stringify([ "llm:translation:request", {
shareId: shareId,
llmList: this.cfg.engines
} ])}`);
        }
        if (m === "2") ws.send("3");
        if (m.startsWith("42")) {
          try {
            const [event, data] = JSON.parse(m.substring(2));
            if (event === "llm:translation:score") {
              console.log(`[PROGRESS] ${data.llm.padEnd(12)} | Score: ${data.score}`);
              wsData.push(data);
            }
            if (event === "smart:translation:response" && data.share_id === shareId) {
              clearTimeout(timer);
              ws.close();
              resolve(wsData);
            }
          } catch (e) {}
        }
      });
      ws.on("error", err => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }
  async fetchAll(shareId) {
    try {
      const {
        data
      } = await client.post(`${this.cfg.api}/insight/${shareId}`, {}, {
        headers: this.h
      });
      return data;
    } catch (e) {
      console.error("[ERR] Failed to fetch insight data:", e.message);
      return {
        translations: []
      };
    }
  }
  merge(insightList, wsList) {
    return insightList.map(item => {
      const wsMeta = wsList.find(w => w.llm === item.engine);
      return {
        ...item,
        ...wsMeta
      };
    });
  }
  filter(data, mode) {
    if (!data || data.length === 0) return null;
    if (mode === "all") return data;
    const target = data.find(t => t.engine === mode);
    if (target) return target;
    console.warn(`[WARN] Engine "${mode}" not found. Falling back to SMART.`);
    return data.find(t => t.engine === "smart") || data[0];
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Parameter 'text' diperlukan"
    });
  }
  const api = new Translator();
  try {
    const data = await api.translate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}