import axios from "axios";
import FormData from "form-data";
class Stepfun {
  constructor() {
    this.base = "https://chat.stepfun.com";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
  }
  log(msg) {
    try {
      console.log(`[Stepfun] ${msg}`);
    } catch {
      return null;
    }
  }
  enc(obj) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch (err) {
      this.log(`Gagal encode base64: ${err?.message || err}`);
      return "";
    }
  }
  dec(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf8")) : null;
    } catch (err) {
      this.log(`Gagal decode base64: ${err?.message || err}`);
      return null;
    }
  }
  frame(obj) {
    try {
      const json = Buffer.from(JSON.stringify(obj || {}), "utf8");
      const head = Buffer.alloc(5);
      head.writeUInt8(0, 0);
      head.writeUInt32BE(json.length, 1);
      return Buffer.concat([head, json]);
    } catch (err) {
      this.log(`Gagal membuat frame data: ${err?.message || err}`);
      return Buffer.alloc(0);
    }
  }
  mime(buf) {
    try {
      if (!buf || buf.length < 4) return {
        type: "image/jpeg",
        ext: "jpg"
      };
      if (buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71) return {
        type: "image/png",
        ext: "png"
      };
      if (buf[0] === 255 && buf[1] === 216 && buf[2] === 255) return {
        type: "image/jpeg",
        ext: "jpg"
      };
      if (buf[0] === 71 && buf[1] === 73 && buf[2] === 70) return {
        type: "image/gif",
        ext: "gif"
      };
      if (buf[0] === 82 && buf[1] === 73 && buf[2] === 70 && buf[3] === 70) return {
        type: "image/webp",
        ext: "webp"
      };
      return {
        type: "image/jpeg",
        ext: "jpg"
      };
    } catch (err) {
      this.log(`Gagal deteksi mime type: ${err?.message || err}`);
      return {
        type: "image/jpeg",
        ext: "jpg"
      };
    }
  }
  async solve(item) {
    try {
      if (Buffer.isBuffer(item)) {
        const info = this.mime(item);
        return {
          buffer: item,
          mimeType: info.type,
          ext: info.ext
        };
      }
      if (typeof item === "string" && /^https?:\/\//i.test(item)) {
        this.log("Mengunduh media dari URL...");
        const res = await axios.get(item, {
          responseType: "arraybuffer"
        });
        const buf = Buffer.from(res?.data || []);
        const info = this.mime(buf);
        return {
          buffer: buf,
          mimeType: res?.headers?.["content-type"] || info.type,
          ext: info.ext
        };
      }
      if (typeof item === "string") {
        const b64Data = item.replace(/^data:image\/[a-z]+;base64,/, "");
        const buf = Buffer.from(b64Data, "base64");
        const info = this.mime(buf);
        return {
          buffer: buf,
          mimeType: info.type,
          ext: info.ext
        };
      }
      return null;
    } catch (err) {
      this.log(`Gagal menyelesaikan media: ${err?.message || err}`);
      return null;
    }
  }
  hdr(st) {
    try {
      const token = st?.accessToken && st?.refreshToken ? `${st.accessToken}...${st.refreshToken}` : "";
      const cookie = ["i18next=en", st?.deviceID ? `Oasis-Webid=${st.deviceID}` : "", token ? `Oasis-Token=${token}` : ""].filter(Boolean).join("; ");
      return {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en;q=0.8",
        "cache-control": "no-cache",
        canary: "false",
        "connect-protocol-version": "1",
        cookie: cookie,
        "oasis-appid": "10200",
        "oasis-language": "en",
        "oasis-platform": "web",
        "oasis-webid": st?.deviceID || "",
        origin: this.base,
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${this.base}/chats/new`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": this.ua
      };
    } catch (err) {
      this.log(`Gagal membuat header: ${err?.message || err}`);
      return {};
    }
  }
  async reg() {
    try {
      this.log("Mendaftarkan device baru...");
      const res = await axios.post(`${this.base}/passport/proto.api.passport.v1.PassportService/RegisterDevice`, {}, {
        headers: {
          accept: "*/*",
          "connect-protocol-version": "1",
          "content-type": "application/json",
          "oasis-appid": "10200",
          "oasis-language": "zh",
          "oasis-platform": "web",
          origin: this.base,
          referer: `${this.base}/`,
          "user-agent": this.ua
        }
      });
      const d = res?.data || {};
      return {
        accessToken: d?.accessToken?.raw || "",
        refreshToken: d?.refreshToken?.raw || "",
        deviceID: d?.device?.deviceID || "",
        oasisId: d?.registry?.oasisId || ""
      };
    } catch (err) {
      this.log(`Gagal register device: ${err?.message || err}`);
      return null;
    }
  }
  async ses(st) {
    try {
      this.log("Membuat chat session...");
      const res = await axios.post(`${this.base}/api/agent/capy.agent.v1.AgentService/CreateChatSession`, {}, {
        headers: {
          ...this.hdr(st),
          "content-type": "application/json"
        }
      });
      return res?.data?.chatSession?.chatSessionId || "";
    } catch (err) {
      this.log(`Gagal membuat session: ${err?.message || err}`);
      return "";
    }
  }
  async up(st, fileInfo) {
    try {
      this.log(`Mengunggah attachment media (${fileInfo?.mimeType || "unknown"})...`);
      const form = new FormData();
      const filename = `file_${Date.now()}.${fileInfo?.ext || "jpg"}`;
      form.append("file", fileInfo.buffer, {
        filename: filename,
        contentType: fileInfo?.mimeType || "image/jpeg"
      });
      form.append("scene_id", "image");
      form.append("mime_type", fileInfo?.mimeType || "image/jpeg");
      const res = await axios.post(`${this.base}/api/resource/image`, form, {
        headers: {
          ...this.hdr(st),
          ...form.getHeaders()
        }
      });
      const d = res?.data || {};
      return {
        resource: {
          image: {
            rid: d?.rid || "",
            url: d?.url || "",
            meta: d?.meta || {},
            mimeType: d?.mimeType || fileInfo.mimeType
          }
        },
        rid: d?.rid || ""
      };
    } catch (err) {
      this.log(`Gagal mengunggah media: ${err?.message || err}`);
      return null;
    }
  }
  async sug(st, messageId) {
    try {
      this.log("Mengambil rekomendasi prompt...");
      const res = await axios.post(`${this.base}/api/agent/capy.agent.v1.AgentService/GenSuggestions`, {
        messageId: messageId
      }, {
        headers: {
          ...this.hdr(st),
          "content-type": "application/json"
        }
      });
      return res?.data?.suggestions?.map(s => s?.prompt || s) || [];
    } catch (err) {
      this.log(`Gagal mendapatkan suggestion: ${err?.message || err}`);
      return [];
    }
  }
  parse(rawText) {
    try {
      const chunks = [];
      let textResult = "";
      let lastMsgId = "";
      let braceCount = 0;
      let inString = false;
      let escape = false;
      let startIndex = -1;
      for (let i = 0; i < (rawText?.length || 0); i++) {
        const char = rawText[i];
        if (char === '"' && !escape) inString = !inString;
        if (char === "\\" && inString) escape = !escape;
        else escape = false;
        if (!inString) {
          if (char === "{") {
            if (braceCount === 0) startIndex = i;
            braceCount++;
          } else if (char === "}") {
            braceCount--;
            if (braceCount === 0 && startIndex !== -1) {
              const jsonStr = rawText.slice(startIndex, i + 1);
              try {
                const obj = JSON.parse(jsonStr);
                chunks.push(obj);
                const event = obj?.data?.event;
                if (event) {
                  if (event?.textEvent?.text) {
                    textResult += event.textEvent.text;
                  }
                  if (event?.startEvent?.messageId) {
                    lastMsgId = event.startEvent.messageId;
                  }
                  if (event?.messageEvent?.message?.messageId) {
                    lastMsgId = event.messageEvent.message.messageId;
                  }
                }
              } catch {}
              startIndex = -1;
            }
          }
        }
      }
      return {
        textResult: textResult,
        chunks: chunks,
        lastMsgId: lastMsgId
      };
    } catch (err) {
      this.log(`Gagal parse stream: ${err?.message || err}`);
      return {
        textResult: "",
        chunks: [],
        lastMsgId: ""
      };
    }
  }
  async chat({
    state,
    prompt,
    media,
    ...rest
  }) {
    try {
      let st = this.dec(state) || {};
      if (!st?.accessToken || !st?.deviceID) {
        const regData = await this.reg();
        if (!regData) {
          return {
            status: false,
            result: null,
            chunks: [],
            suggest: [],
            state: state || null,
            error: "Gagal inisialisasi device registration"
          };
        }
        st = {
          ...st,
          ...regData
        };
      }
      if (!st?.chatSessionId) {
        st.chatSessionId = await this.ses(st);
        if (!st?.chatSessionId) {
          return {
            status: false,
            result: null,
            chunks: [],
            suggest: [],
            state: this.enc(st),
            error: "Gagal membuat sesi chat"
          };
        }
      }
      const attachments = [];
      const mediaList = media ? Array.isArray(media) ? media : [media] : [];
      for (const m of mediaList) {
        const solved = await this.solve(m);
        if (solved) {
          const upRes = await this.up(st, solved);
          if (upRes?.rid) attachments.push(upRes);
        }
      }
      const userQa = {
        content: prompt || ""
      };
      if (attachments.length > 0) {
        userQa.attachments = attachments;
      }
      const payload = {
        message: {
          chatSessionId: st.chatSessionId,
          content: {
            userMessage: {
              qa: userQa
            }
          }
        },
        config: {
          model: rest?.model ? rest.model : "step-auto",
          enableReasoning: rest?.enableReasoning !== undefined ? rest.enableReasoning : true,
          enableSearch: rest?.enableSearch !== undefined ? rest.enableSearch : true
        }
      };
      this.log("Mengirim pesan via ChatStream...");
      const framedBody = this.frame(payload);
      const res = await axios.post(`${this.base}/api/agent/capy.agent.v1.AgentService/ChatStream`, framedBody, {
        headers: {
          ...this.hdr(st),
          "content-type": "application/connect+json"
        },
        responseType: "text",
        transformResponse: [data => data]
      });
      this.log("Memproses respon streaming...");
      const {
        textResult,
        chunks,
        lastMsgId
      } = this.parse(res?.data || "");
      let suggest = [];
      if (lastMsgId) {
        suggest = await this.sug(st, lastMsgId);
      }
      return {
        status: true,
        result: textResult.trim(),
        chunks: chunks,
        suggest: suggest,
        state: this.enc(st)
      };
    } catch (err) {
      this.log(`Error pada chat: ${err?.message || err}`);
      return {
        status: false,
        result: null,
        chunks: [],
        suggest: [],
        state: state || null,
        error: err?.response?.data || err?.message || err
      };
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
  const api = new Stepfun();
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