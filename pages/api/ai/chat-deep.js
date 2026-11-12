import axios from "axios";
import FormData from "form-data";
import * as cheerio from "cheerio";
class DeepSeek {
  constructor() {
    this.base = "https://chat-deep.ai";
    this.ajax = this.base + "/wp-admin/admin-ajax.php";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.http = axios.create({
      baseURL: this.base,
      timeout: 3e4
    });
  }
  log(m, d) {
    console.log("--\x3e [DeepSeek] " + m, d || "");
  }
  async init() {
    try {
      this.log("Fetching handshake...");
      const res = await this.http.get("/deepseek-chat/", {
        headers: {
          "User-Agent": this.ua
        }
      });
      const $ = cheerio.load(res.data);
      const chat = $(".ds-chat");
      const session = {
        nonce: chat.attr("data-nonce"),
        model: chat.attr("data-model") || "default",
        cookies: {}
      };
      const sc = res.headers["set-cookie"];
      if (sc) {
        sc.forEach(function(c) {
          const p = c.split(";")[0].split("=");
          session.cookies[p[0].trim()] = p.slice(1).join("=").trim();
        });
      }
      return session;
    } catch (e) {
      throw new Error("Init failed: " + e.message);
    }
  }
  async chat(opts) {
    try {
      this.log("Processing chat...");
      var session = opts.state ? JSON.parse(Buffer.from(opts.state, "base64").toString()) : await this.init();
      const reqInt = this.http.interceptors.request.use(function(config) {
        config.headers = Object.assign({}, config.headers, {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          origin: "https://chat-deep.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://chat-deep.ai/deepseek-chat/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          Cookie: Object.entries(session.cookies).map(function(e) {
            return e[0] + "=" + e[1];
          }).join("; ")
        });
        return config;
      });
      const resInt = this.http.interceptors.response.use(function(res) {
        const sc = res.headers["set-cookie"];
        if (sc) {
          sc.forEach(function(c) {
            const p = c.split(";")[0].split("=");
            session.cookies[p[0].trim()] = p.slice(1).join("=").trim();
          });
        }
        return res;
      });
      const fd = new FormData();
      fd.append("action", "deepseek_chat");
      fd.append("message", opts.prompt);
      fd.append("model", opts.model || session.model);
      fd.append("nonce", opts.nonce || session.nonce);
      fd.append("save_conversation", "1");
      fd.append("session_only", "1");
      if (opts.conversation_id || session.conv_id) {
        fd.append("conversation_id", opts.conversation_id || session.conv_id);
      }
      const res = await this.http.post(this.ajax, fd, {
        headers: fd.getHeaders()
      });
      this.http.interceptors.request.eject(reqInt);
      this.http.interceptors.response.eject(resInt);
      const d = res.data.data || {};
      if (d.conversation_id) session.conv_id = d.conversation_id;
      return {
        result: d.response || "",
        html: d.formatted_html || "",
        state: Buffer.from(JSON.stringify(session)).toString("base64"),
        conversation_id: d.conversation_id,
        usage: d.usage || {},
        success: res.data.success || false
      };
    } catch (e) {
      this.log("Chat Error: " + e.message);
      throw e;
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
  const api = new DeepSeek();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}