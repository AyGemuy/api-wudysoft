import axios from "axios";
import crypto from "crypto";
class ChatGPTClient {
  constructor() {
    this.ua = "ChatGPT/1.2027.000 (Android 15; RMX3834; build 2700000)";
    this.pkg = "com.openai.chatgpt";
  }
  _pc(arr) {
    try {
      return Object.fromEntries((arr || []).map(c => c.split(";")[0].split("=").map(s => s.trim())));
    } catch (err) {
      console.error("[EROR] Cookie parse fail:", err.message);
      return {};
    }
  }
  _cln(text) {
    try {
      if (!text) return "";
      let res = "";
      let i = 0;
      while (i < text.length) {
        const start = text.indexOf("", i);
        if (start === -1) {
          res += text.slice(i);
          break;
        }
        res += text.slice(i, start);
        const end = text.indexOf("", start);
        if (end === -1) {
          i = start + 1;
          continue;
        }
        const content = text.slice(start + 1, end);
        if (content.startsWith("entity")) {
          try {
            const arr = JSON.parse(content.split("")[1] || "[]");
            res += arr[1] || arr[0] || "";
          } catch {}
        }
        i = end + 1;
      }
      return res.trim();
    } catch (err) {
      console.error("[EROR] Clean tags fail:", err.message);
      return text || "";
    }
  }
  _head(isAuth, aa) {
    try {
      const hdrs = {
        "User-Agent": this.ua,
        "OAI-Package-Name": this.pkg,
        "OAI-Client-Type": "android",
        "OAI-Device-Id": aa.deviceId,
        "Accept-Language": "id-ID,in;q=0.9",
        "X-Device-Tier": "upper_mid",
        "X-OpenAI-Target-Path": isAuth ? "/backend-api/f/conversation" : "/backend-anon/f/conversation",
        "ChatGPT-Account-Id": isAuth ? aa.accountId || "default" : "default",
        "ChatGPT-Residency-Region": "no_constraint",
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Cookie: aa.cookie,
        "X-Sentinel-Payload": JSON.stringify({
          bot_token: {
            failure_reason: "-2: Standard Integrity API error (-2): The Play Store app is either not installed or not the official version.",
            failure_detail: "[qdb0.j(SourceFile:9), g4n.a(SourceFile:85)]"
          }
        })
      };
      if (isAuth) {
        hdrs["Authorization"] = aa.authorization || `Bearer ${aa.token}`;
      }
      return hdrs;
    } catch (err) {
      console.error("[EROR] Build headers fail:", err.message);
      throw err;
    }
  }
  async _ses() {
    try {
      const devId = crypto.randomUUID();
      const res = await axios.post("https://android.chat.openai.com/backend-anon/sentinel/chat-requirements", {}, {
        headers: {
          "User-Agent": this.ua,
          "OAI-Package-Name": this.pkg,
          "OAI-Client-Type": "android",
          "OAI-Device-Id": devId,
          "Accept-Language": "id-ID,in;q=0.9",
          "X-Device-Tier": "upper_mid",
          "X-OpenAI-Target-Path": "/backend-anon/sentinel/chat-requirements",
          "ChatGPT-Account-Id": "default",
          "ChatGPT-Residency-Region": "no_constraint",
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      });
      const cookies = this._pc(res.headers["set-cookie"]);
      const cStr = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
      let oaiSc = cookies["oai-sc"] || (res.data?.token ? `0${res.data.token}` : null);
      const cookie = oaiSc && !cStr.includes("oai-sc") ? `oai-sc=${oaiSc}; ${cStr}` : cStr;
      return {
        cookie: cookie,
        deviceId: devId,
        parentMessageId: crypto.randomUUID()
      };
    } catch (err) {
      console.error("[EROR] Sentinel Handshake fail:", err?.message);
      throw err;
    }
  }
  async chat({
    state,
    prompt,
    messages,
    auth = null,
    chatId = null,
    ...rest
  }) {
    try {
      let ds = {};
      if (state && typeof state === "string") {
        try {
          ds = JSON.parse(Buffer.from(state, "base64").toString("utf-8")) || {};
        } catch (e) {}
      }
      let aa = auth || ds.auth || await this._ses();
      let cid = chatId || ds.chatId || null;
      aa.deviceId = aa.deviceId || crypto.randomUUID();
      aa.parentMessageId = aa.parentMessageId || crypto.randomUUID();
      const isAuth = !!(aa.authorization || aa.token);
      const bUrl = isAuth ? "https://android.chat.openai.com/backend-api" : "https://android.chat.openai.com/backend-anon";
      const curId = crypto.randomUUID();
      const pId = aa.parentMessageId;
      const hdrs = this._head(isAuth, aa);
      const msgs = Array.isArray(messages) ? [...messages] : [];
      if (prompt) {
        msgs.push({
          id: curId,
          author: {
            role: "user"
          },
          content: {
            content_type: "text",
            parts: [prompt]
          },
          status: "finished_successfully",
          recipient: "all"
        });
      }
      const bdy = {
        action: "next",
        messages: msgs,
        model: "auto",
        history_and_training_disabled: false,
        fork_from_shared_post: false,
        enable_message_followups: true,
        force_use_sse: true,
        force_use_search: null,
        force_paragen: false,
        supported_encodings: ["v1"],
        supports_buffering: true,
        timezone: "Asia/Makassar",
        timezone_offset_min: -480,
        system_hints: [],
        is_onboarding_conversation: false,
        no_auth_ad_preferences: {
          personalization_enabled: true,
          history_enabled: true
        },
        client_prepare_state: "none",
        stream: true,
        ...rest
      };
      if (cid) {
        bdy.conversation_id = cid;
        bdy.parent_message_id = pId;
      }
      const rStream = await axios.post(`${bUrl}/f/conversation`, bdy, {
        headers: hdrs,
        responseType: "stream"
      });
      return new Promise((resolve, reject) => {
        let txt = "",
          buf = "",
          lPath = null,
          lOp = null,
          fCid = cid,
          camId = null;
        const chks = [];
        rStream.data.on("data", chunk => {
          try {
            buf += chunk.toString();
            const lines = buf.split("\n");
            buf = lines.pop() || "";
            for (const line of lines) {
              const trm = line.trim();
              if (!trm || trm === "data: [DONE]") continue;
              if (trm.startsWith("data: ")) {
                try {
                  const data = JSON.parse(trm.substring(6));
                  chks.push(data);
                  if (data?.conversation_id) fCid = data.conversation_id;
                  const p = data?.p !== undefined ? data.p : lPath;
                  const o = data?.o !== undefined ? data.o : lOp;
                  if (data?.p !== undefined) lPath = data.p;
                  if (data?.o !== undefined) lOp = data.o;
                  if (o === "add" && data?.v?.message) {
                    if (data.v.message.author?.role === "assistant") {
                      camId = data.v.message.id;
                      const parts = data.v.message.content?.parts;
                      if (parts?.[0]) txt = parts[0];
                    }
                  } else if (o === "patch" && Array.isArray(data?.v)) {
                    for (const op of data.v) {
                      if (op?.o === "append" && op?.p?.startsWith("/message/content/parts/")) {
                        txt += op.v;
                      }
                    }
                  } else if (o === "append" && p?.startsWith("/message/content/parts/") && typeof data?.v === "string") {
                    txt += data.v;
                  }
                } catch (e) {}
              }
            }
          } catch (e) {}
        });
        rStream.data.on("end", () => {
          try {
            if (camId) aa.parentMessageId = camId;
            const nextState = Buffer.from(JSON.stringify({
              auth: aa,
              chatId: fCid
            })).toString("base64");
            resolve({
              status: true,
              result: {
                response: this._cln(txt),
                chatId: fCid,
                chunks: chks
              },
              state: nextState
            });
          } catch (endErr) {
            reject(endErr);
          }
        });
        rStream.data.on("error", err => reject(err));
      });
    } catch (err) {
      throw err;
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
  const api = new ChatGPTClient();
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