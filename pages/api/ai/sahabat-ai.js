import axios from "axios";
import crypto from "crypto";
const BASE = "https://api-sahabat-ai.ioh.co.id";
const ORIGIN = "https://chat.sahabat-ai.com";
const SK = "SAHABATAI";
const AV = "1.1.0";
const RC = "PWA";
const RL = "ID";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const DM = "Linux armv81";
const DMK = "Chrome";
const OS = "Linux armv81";
const OSV = "127.0.0.0";
const SEC_HDR = {
  "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "cross-site"
};
const DID = crypto.randomUUID().replace(/-/g, "").toUpperCase();

function avM(a) {
  let n = "";
  for (let i = 1; i < a.length; i += 2) n += a[i];
  return n;
}

function bj9(body, salt) {
  return crypto.createHash("sha512").update(JSON.stringify(body) + salt, "utf8").digest("hex");
}

function sign(body) {
  const rt = crypto.randomUUID().replace(/-/g, "").toUpperCase();
  const salt = avM((RC + rt).toLowerCase());
  const rs = bj9(body, salt);
  return {
    rt: rt,
    rs: rs
  };
}

function buildHeaders(token, csrf, body, extra = {}) {
  const {
    rt,
    rs
  } = sign(body);
  return {
    "User-Agent": UA,
    Accept: "*/*",
    "Accept-Language": "id-ID",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    Origin: ORIGIN,
    Pragma: "no-cache",
    Referer: `${ORIGIN}/`,
    "content-type": "application/json",
    ...SEC_HDR,
    "x-av": AV,
    "x-cf": csrf ?? "",
    "x-did": DID,
    "x-dm": DM,
    "x-dmk": DMK,
    "x-os": OS,
    "x-osv": OSV,
    "x-rc": RC,
    "x-rl": RL,
    "x-rs": rs,
    "x-rt": rt,
    "x-sk": SK,
    ...token ? {
      AUTHORIZATION: `Bearer ${token}`
    } : {},
    ...extra
  };
}
class SahabatAI {
  constructor() {
    this.token = null;
    this.csrf = null;
    this.accessKey = null;
    this.exp = 0;
  }
  _h(body = {}, extra = {}) {
    return buildHeaders(this.token, this.csrf, body, extra);
  }
  async getToken() {
    console.log("[token] getting anonymous token…  x-did =", DID);
    const body = {};
    try {
      const {
        data
      } = await axios.post(`${BASE}/api/v1/token/get`, body, {
        headers: this._h(body)
      });
      this.token = data?.data?.token ?? null;
      this.csrf = data?.data?.csrf ?? null;
      if (this.token) {
        try {
          const pay = JSON.parse(Buffer.from(this.token.split(".")[1], "base64url").toString());
          this.exp = (pay.exp ?? 0) * 1e3;
          this.accessKey = pay.accesskey ?? null;
          console.log("[token] ok  usertype =", pay.usertype, " customerid =", pay.customerid, " exp =", new Date(this.exp).toISOString());
        } catch {}
      }
      return data;
    } catch (e) {
      console.error("[token] error", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async _auth() {
    if (!this.token || Date.now() >= this.exp - 6e4) await this.getToken();
  }
  async getCategories() {
    await this._auth();
    const body = {};
    try {
      const {
        data
      } = await axios.post(`${BASE}/api/v1/config/agentcategorycontent`, body, {
        headers: this._h(body)
      });
      console.log("[categories] ok  count =", data?.data?.length);
      return data;
    } catch (e) {
      console.error("[categories] error", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async getAgents() {
    await this._auth();
    const body = {};
    try {
      const {
        data
      } = await axios.post(`${BASE}/api/v1/config/getagents`, body, {
        headers: this._h(body)
      });
      console.log("[agents] ok  count =", data?.data?.length);
      return data;
    } catch (e) {
      console.error("[agents] error", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async pushToken(fcmToken = "") {
    await this._auth();
    const body = {
      token: fcmToken
    };
    try {
      const {
        data
      } = await axios.post(`${BASE}/api/v1/notification/pushtoken`, body, {
        headers: this._h(body)
      });
      console.log("[push] ok  device_id =", data?.data?.device_id);
      return data;
    } catch (e) {
      console.error("[push] error", e?.response?.data ?? e.message);
      throw e;
    }
  }
  async chat({
    prompt,
    conversationId = null,
    messageId = null,
    agentId = null,
    modelId = "0",
    files = [],
    isRetry = false
  }) {
    await this._auth();
    console.log("[chat] prompt =", prompt, " agentId =", agentId);
    const body = {
      query: prompt,
      conversation_id: conversationId ?? null,
      message_id: messageId ?? null,
      isretry: isRetry,
      agentid: agentId ?? null,
      modelid: String(modelId),
      files: files
    };
    const headers = this._h(body, {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "content-type": "application/json"
    });
    console.log("[chat] x-rt =", headers["x-rt"]);
    try {
      const {
        data: stream
      } = await axios.post(`${BASE}/api/v1/chat/conversation`, body, {
        headers: headers,
        responseType: "stream"
      });
      let text = "";
      let outConvId = conversationId ?? "";
      let outMsgId = messageId ?? "";
      let sources = [];
      let chunks = [];
      let buf = "";
      let curEvent = "";
      await new Promise((resolve, reject) => {
        stream.on("data", chunk => {
          buf += chunk.toString();
          const lines = buf.split("\n");
          buf = lines.pop();
          for (const raw of lines) {
            const line = raw.trim();
            if (!line) continue;
            if (line.startsWith("event:")) {
              curEvent = line.slice(6).trim();
              continue;
            }
            if (line.startsWith("data:")) {
              const payload = line.slice(5).trim();
              if (!payload) continue;
              try {
                const json = JSON.parse(payload);
                chunks.push(json);
                if (json?.type === "message_ids") {
                  outConvId = json?.conversation_id ?? outConvId;
                  outMsgId = json?.message_id ?? outMsgId;
                }
                switch (curEvent) {
                  case "content_block_delta": {
                    const delta = json?.delta?.text ?? "";
                    if (delta) {
                      text += delta;
                      process.stdout.write(delta);
                    }
                    break;
                  }
                  case "message":
                    outConvId = json?.conversation_id ?? outConvId;
                    outMsgId = json?.message_id ?? outMsgId;
                    break;
                  case "sources":
                    if (Array.isArray(json)) sources = json;
                    break;
                  case "error":
                    console.error("[chat] server error:", json);
                    break;
                }
              } catch {}
            }
          }
        });
        stream.on("end", () => {
          process.stdout.write("\n");
          resolve();
        });
        stream.on("error", reject);
      });
      console.log("[chat] done  chars =", text.length, " convId =", outConvId);
      return {
        text: text,
        conversationId: outConvId,
        messageId: outMsgId,
        sources: sources,
        chunks: chunks
      };
    } catch (e) {
      console.error("[chat] error", JSON.stringify(e?.response?.data ?? e.message));
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
  const api = new SahabatAI();
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