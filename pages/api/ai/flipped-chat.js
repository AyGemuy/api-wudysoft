import axios from "axios";
import WebSocket from "ws";
import CryptoJS from "crypto-js";
import xml2js from "xml2js";
class FlippedChat {
  constructor() {
    this.userId = null;
    this.xmppPwd = null;
    this.token = null;
    this.botId = "200669482277761206";
    this.key = "QnQDFfOwIk85SYE6kNtsHVPLCzvP8Y9K";
    this.base = "https://api.flipped.chat";
    this.wsUrl = "wss://im.flipped.chat/ws";
    this.xmlParser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false
    });
  }
  _log(m) {
    console.log(`[${new Date().toISOString()}] ${m}`);
  }
  _hdrs(hasToken = true) {
    const h = {
      accept: "*/*",
      "content-type": "application/json",
      "x-app-code": "1",
      "x-app-name": "Flipped",
      "x-language": "id",
      "x-platform": "5",
      "x-version": "1.9.4",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
    };
    if (hasToken && this.token) h["x-token"] = this.token;
    return h;
  }
  _dec(enc) {
    try {
      if (!enc) return null;
      const k = CryptoJS.enc.Utf8.parse(this.key);
      const iv = CryptoJS.enc.Utf8.parse(this.key.slice(0, 16));
      const bytes = CryptoJS.AES.decrypt(enc, k, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (e) {
      this._log(`Decrypt error: ${e.message}`);
      return null;
    }
  }
  _loadState(stateB64) {
    try {
      const json = Buffer.from(stateB64, "base64").toString();
      const state = JSON.parse(json);
      this.userId = state.userId || null;
      this.xmppPwd = state.xmppPwd || null;
      this.token = state.token || null;
      this.botId = state.botId || null;
      this._log(`State loaded: userId=${this.userId}, botId=${this.botId}`);
      return true;
    } catch (err) {
      this._log(`Load state error: ${err.message}`);
      return false;
    }
  }
  _saveState() {
    const state = {
      userId: this.userId,
      xmppPwd: this.xmppPwd,
      token: this.token,
      botId: this.botId
    };
    const json = JSON.stringify(state);
    return Buffer.from(json).toString("base64");
  }
  async _auth() {
    try {
      this._log("Anonymous verify...");
      const anon = await axios.post(`${this.base}/web/anonymous/verify`, {
        operationId: `flipped_web_${Date.now()}`
      }, {
        headers: this._hdrs(false)
      });
      const anonData = this._dec(anon.data.d);
      const tmpUid = anonData?.data?.userId;
      if (!tmpUid) throw new Error("No anonymous UID");
      this._log(`Anon UID: ${tmpUid}`);
      this._log("Web verify...");
      const payload = {
        authChannel: 0,
        appKey: tmpUid,
        platform: 5,
        deviceLanguage: "id",
        referer: "https://www.google.com/",
        timeZoneOffset: 8,
        userId: tmpUid,
        detailedPlatform: 11
      };
      const ver = await axios.post(`${this.base}/web/verify`, payload, {
        headers: this._hdrs(false)
      });
      const verData = this._dec(ver.data.d);
      if (verData?.errCode !== 0) throw new Error(verData?.errMsg || "Verify failed");
      this.userId = verData?.data?.user?.userId;
      this.xmppPwd = verData?.data?.user?.xmppPassword;
      this.token = ver?.headers?.["x-token"] || "";
      if (!this.userId) throw new Error("Auth gagal, userId kosong");
      this._log(`Auth sukses! UserID: ${this.userId}`);
    } catch (err) {
      this._log(`Auth fatal: ${err.message}`);
      throw err;
    }
  }
  async _ensureAuth() {
    if (!this.userId) await this._auth();
  }
  async search({
    state,
    query,
    offset = 0,
    pageSize = 20,
    ...rest
  }) {
    if (state) this._loadState(state);
    try {
      await this._ensureAuth();
      this._log(`Cari: ${query}`);
      const url = `${this.base}/character/search/v4?operationId=flipped_web_${Date.now()}&offset=${offset}&pageSize=${pageSize}&search=${encodeURIComponent(query)}`;
      const res = await axios.post(url, rest, {
        headers: this._hdrs()
      });
      const dec = this._dec(res.data.d) ?? {
        errCode: -1,
        errMsg: "Decrypt gagal"
      };
      return {
        ...dec,
        state: this._saveState()
      };
    } catch (err) {
      this._log(`Search error: ${err.message}`);
      return {
        errCode: 500,
        errMsg: err.message,
        state: this._saveState()
      };
    }
  }
  async chat({
    state,
    prompt,
    botId = this.botId,
    ...rest
  }) {
    if (state) this._loadState(state);
    if (botId) this.botId = botId;
    try {
      await this._ensureAuth();
      const targetBot = botId || this.botId;
      if (!targetBot) throw new Error("Belum set karakter, berikan botId atau set via state");
      this._log(`Chat ke ${targetBot}: "${prompt.slice(0, 50)}..."`);
      const msgId = Math.random().toString(36).substring(2, 15);
      const sendTime = Date.now() * 1e3;
      return new Promise(resolve => {
        const ws = new WebSocket(this.wsUrl, "xmpp");
        let resolved = false;
        let step = "init";
        const chunks = [];
        const timeout = setTimeout(() => {
          if (!resolved) {
            ws.close();
            resolve({
              status: "error",
              result: null,
              chunks: chunks,
              token: this.token,
              state: this._saveState(),
              message: "WebSocket timeout 30s"
            });
          }
        }, 3e4);
        ws.on("open", () => {
          this._log("WS open, kirim open stream");
          ws.send('<open xmlns="urn:ietf:params:xml:ns:xmpp-framing" xml:lang="en" to="chat.iher.ai" version="1.0"/>');
          step = "open_sent";
        });
        ws.on("message", async data => {
          const raw = data.toString();
          chunks.push(raw);
          this._log(`WS recv: ${raw.slice(0, 200)}`);
          if ((raw.includes("<stream:features") || raw.includes("<mechanisms")) && step === "open_sent") {
            this._log("Mengirim auth PLAIN...");
            const authB64 = Buffer.from(`\x00${this.userId}\x00${this.xmppPwd}`).toString("base64");
            ws.send(`<auth xmlns="urn:ietf:params:xml:ns:xmpp-sasl" mechanism="PLAIN">${authB64}</auth>`);
            step = "auth_sent";
            return;
          }
          if (raw.includes("<success") && step === "auth_sent") {
            this._log("Auth success, kirim open stream kedua");
            ws.send('<open xmlns="urn:ietf:params:xml:ns:xmpp-framing" xml:lang="en" to="chat.iher.ai" version="1.0"/>');
            step = "second_open";
            return;
          }
          if ((raw.includes("<stream:features") || raw.includes("<bind")) && step === "second_open") {
            this._log("Mengirim bind resource");
            ws.send(`<iq id="b1" type="set"><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"><resource>Flipped_Web</resource></bind></iq>`);
            step = "bind_sent";
            return;
          }
          if (raw.includes("<jid") && step === "bind_sent") {
            this._log("Bind success, mengirim carbons, presence, sm");
            ws.send('<iq id="c1" type="set"><enable xmlns="urn:xmpp:carbons:2"/></iq>');
            ws.send("<presence/>");
            ws.send('<enable xmlns="urn:xmpp:sm:3" resume="true"/>');
            ws.send('<r xmlns="urn:xmpp:sm:3"/>');
            const payload = {
              user_id: this.userId,
              bot_id: targetBot,
              client_msg_id: msgId,
              msg_from: 100,
              sender_platform_id: 5,
              session_type: 1,
              content_type: 101,
              content: prompt,
              send_time: sendTime,
              ex: JSON.stringify({
                analyticsParam: {
                  sessionId: `${this.userId}-${targetBot}-${Date.now()}`,
                  sessionType: "Normal",
                  chatTimes: 0
                }
              }),
              ...rest
            };
            this._log("Mengirim pesan chat...");
            ws.send(`<message to="${targetBot}@chat.iher.ai" type="chat" id="${msgId}"><body>${JSON.stringify(payload)}</body></message>`);
            ws.send('<r xmlns="urn:xmpp:sm:3"/>');
            step = "msg_sent";
            return;
          }
          if (step === "msg_sent") {
            let xml;
            try {
              xml = await this.xmlParser.parseStringPromise(raw);
            } catch (e) {}
            if (xml?.message?.body) {
              try {
                const json = JSON.parse(xml.message.body);
                if (json.content_type !== 114 && json.content) {
                  this._log("Menerima balasan bot");
                  let fullResult = json;
                  try {
                    const inner = JSON.parse(json.content);
                    fullResult = {
                      ...json,
                      ...inner
                    };
                  } catch (e) {}
                  resolved = true;
                  clearTimeout(timeout);
                  ws.close();
                  resolve({
                    status: "success",
                    result: fullResult,
                    chunks: chunks,
                    token: this.token,
                    state: this._saveState()
                  });
                }
              } catch (e) {}
            }
          }
        });
        ws.on("error", err => {
          this._log(`WS error: ${err.message}`);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve({
              status: "error",
              result: null,
              chunks: chunks,
              token: this.token,
              state: this._saveState(),
              message: err.message
            });
          }
        });
        ws.on("close", (code, reason) => {
          this._log(`WS close: ${code} ${reason || ""}`);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve({
              status: "error",
              result: null,
              chunks: chunks,
              token: this.token,
              state: this._saveState(),
              message: `WS closed: ${code}`
            });
          }
        });
      });
    } catch (err) {
      this._log(`Chat error: ${err.message}`);
      return {
        status: "error",
        result: null,
        chunks: [],
        token: this.token,
        state: this._saveState(),
        message: err.message
      };
    }
  }
  setChar(botId) {
    this.botId = botId;
    this._log(`Karakter diset: ${botId}`);
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
      available_actions: validActions
    });
  }
  const api = new FlippedChat();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi salah satu untuk melakukan action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi salah satu untuk melakukan action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
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
      message: "Terjadi kesalahan internal pada server OpenAI API.",
      error: error.message || "Unknown Error"
    });
  }
}