import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class ChatGLM {
  constructor() {
    this.base = "https://chatglm.cn/chatglm";
    this.secret = "8a1317a7468aa3ad86e997d08f3f31cb";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.defaultAssistant = "65940acff94777010aa6b796";
  }
  log(msg) {
    try {
      console.log(`[ChatGLM] ${msg}`);
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
  uid() {
    try {
      return crypto.randomBytes(16).toString("hex");
    } catch (err) {
      this.log(`Gagal generate uid: ${err?.message || err}`);
      return String(Date.now()) + String(Math.floor(Math.random() * 1e6));
    }
  }
  sig() {
    try {
      const raw = Date.now().toString();
      const len = raw.length;
      const digits = raw.split("").map(x => Number(x));
      const sumExcept = digits.reduce((a, b) => a + b, 0) - digits[len - 2];
      const timestamp = raw.substring(0, len - 2) + String(sumExcept % 10) + raw.substring(len - 1, len);
      const xNonce = this.uid();
      const sign = crypto.createHash("md5").update(`${timestamp}-${xNonce}-${this.secret}`).digest("hex");
      return {
        timestamp: timestamp,
        xNonce: xNonce,
        sign: sign
      };
    } catch (err) {
      this.log(`Gagal membuat sign: ${err?.message || err}`);
      return {
        timestamp: Date.now().toString(),
        xNonce: this.uid(),
        sign: ""
      };
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
      if (typeof item === "string" && (item.startsWith("http://") || item.startsWith("https://"))) {
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
        const commaIndex = item.indexOf(",");
        const cleanB64 = commaIndex !== -1 ? item.slice(commaIndex + 1) : item;
        const buf = Buffer.from(cleanB64, "base64");
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
      const {
        timestamp,
        xNonce,
        sign
      } = this.sig();
      const token = st?.accessToken ? st.accessToken.startsWith("Bearer ") ? st.accessToken : `Bearer ${st.accessToken}` : "";
      return {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9,en;q=0.8",
        "app-name": "chatglm_h5",
        authorization: token,
        "cache-control": "no-cache",
        "content-type": "application/json",
        fr: "default",
        origin: "https://chatglm.cn",
        platform: "h5",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": this.ua,
        "x-app-fr": "default",
        "x-app-platform": "h5",
        "x-app-version": "0.0.1",
        "x-device-id": st?.deviceId || this.uid(),
        "x-lang": "zh",
        "x-nonce": xNonce,
        "x-request-id": this.uid(),
        "x-sign": sign,
        "x-timestamp": timestamp
      };
    } catch (err) {
      this.log(`Gagal membuat header: ${err?.message || err}`);
      return {};
    }
  }
  async reg() {
    try {
      this.log("Mengakses sesi guest token ChatGLM...");
      const deviceId = this.uid();
      const dummySt = {
        deviceId: deviceId,
        accessToken: ""
      };
      const headers = this.hdr(dummySt);
      const res = await axios.post(`${this.base}/user-api/guest/access`, {}, {
        headers: headers
      });
      const d = res?.data?.result || {};
      return {
        accessToken: d?.access_token || "",
        refreshToken: d?.refresh_token || "",
        userId: d?.user_id || "",
        deviceId: deviceId,
        isGuest: d?.is_guest !== undefined ? d.is_guest : true
      };
    } catch (err) {
      this.log(`Gagal mendapatkan guest token: ${err?.message || err}`);
      return null;
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
      const headers = {
        ...this.hdr(st),
        ...form.getHeaders()
      };
      const res = await axios.post(`${this.base}/backend-api/v1/image_upload`, form, {
        headers: headers
      });
      const d = res?.data?.result || {};
      return d?.image_url || d?.url || "";
    } catch (err) {
      this.log(`Gagal upload media: ${err?.message || err}`);
      return "";
    }
  }
  async info(st, assistant_id) {
    try {
      const id = assistant_id || this.defaultAssistant;
      const headers = this.hdr(st);
      const res = await axios.get(`${this.base}/backend-api/assistant/info?assistant_id=${id}`, {
        headers: headers
      });
      return res?.data?.result || null;
    } catch (err) {
      this.log(`Gagal mengambil info assistant: ${err?.message || err}`);
      return null;
    }
  }
  parse(rawText) {
    try {
      const chunks = [];
      const images = [];
      let lastText = "";
      let convId = "";
      let msgId = "";
      const lines = (rawText || "").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const colonIndex = trimmed.indexOf(":");
        const jsonStr = trimmed.slice(colonIndex + 1).trim();
        if (!jsonStr || jsonStr === "[DONE]" || jsonStr === "HEARTBEAT") continue;
        try {
          const payload = JSON.parse(jsonStr);
          if (payload) chunks.push(payload);
          if (payload?.conversation_id) convId = payload.conversation_id;
          if (payload?.id) msgId = payload.id;
          const parts = payload?.parts || [];
          for (const part of parts) {
            const contents = part?.content || [];
            for (const content of contents) {
              if (content?.type === "text" && content?.text !== undefined) {
                const currentText = content.text;
                if (currentText.length >= lastText.length) {
                  const delta = currentText.slice(lastText.length);
                  lastText = currentText;
                }
              }
              if (content?.type === "image" && Array.isArray(content?.image)) {
                for (const img of content.image) {
                  if (img?.image_url) images.push(img.image_url);
                }
              }
            }
          }
        } catch {}
      }
      return {
        textResult: lastText,
        chunks: chunks,
        images: images,
        convId: convId,
        msgId: msgId
      };
    } catch (err) {
      this.log(`Gagal parsing stream: ${err?.message || err}`);
      return {
        textResult: "",
        chunks: [],
        images: [],
        convId: "",
        msgId: ""
      };
    }
  }
  async search({
    state,
    query,
    page,
    pageSize,
    ...rest
  }) {
    try {
      let st = this.dec(state) || {};
      if (!st?.accessToken || !st?.deviceId) {
        const regData = await this.reg();
        if (!regData) {
          return {
            status: false,
            result: null,
            state: state || null,
            error: "Gagal inisialisasi akun guest"
          };
        }
        st = {
          ...st,
          ...regData
        };
      }
      const p = page ? page : 1;
      const size = pageSize ? pageSize : 20;
      const kw = query || "";
      this.log(`Mencari assistant dengan keyword: "${kw}"...`);
      const headers = this.hdr(st);
      const url = `${this.base}/feed-api/assistant/search_list?page=${p}&pageSize=${size}&keyword=${encodeURIComponent(kw)}`;
      const res = await axios.get(url, {
        headers: headers
      });
      const data = res?.data || {};
      return {
        status: data?.status === 0,
        result: data?.result?.list || [],
        total: data?.result?.total || 0,
        has_more: data?.result?.has_more || false,
        state: this.enc(st)
      };
    } catch (err) {
      this.log(`Gagal pencarian: ${err?.message || err}`);
      return {
        status: false,
        result: [],
        total: 0,
        has_more: false,
        state: state || null,
        error: err?.response?.data || err?.message || err
      };
    }
  }
  async chat({
    state,
    prompt,
    messages,
    media,
    assistant_id,
    ...rest
  }) {
    try {
      let st = this.dec(state) || {};
      if (!st?.accessToken || !st?.deviceId) {
        const regData = await this.reg();
        if (!regData) {
          return {
            status: false,
            result: null,
            chunks: [],
            images: [],
            suggest: [],
            state: state || null,
            error: "Gagal inisialisasi guest device"
          };
        }
        st = {
          ...st,
          ...regData
        };
      }
      const currentAssistant = assistant_id || st?.assistant_id || this.defaultAssistant;
      st.assistant_id = currentAssistant;
      if (!Array.isArray(st.history)) {
        st.history = [];
      }
      const userContent = [];
      if (prompt) {
        userContent.push({
          type: "text",
          text: prompt
        });
      }
      if (media) {
        const mediaList = Array.isArray(media) ? media : [media];
        for (const m of mediaList) {
          const solved = await this.solve(m);
          if (solved) {
            const uploadedUrl = await this.up(st, solved);
            if (uploadedUrl) {
              userContent.push({
                type: "image",
                image: [{
                  image_url: uploadedUrl
                }]
              });
            }
          }
        }
      }
      if (userContent.length > 0) {
        st.history.push({
          role: "user",
          content: userContent
        });
      }
      const sendMessages = Array.isArray(messages) && messages.length > 0 ? messages : st.history;
      const payload = {
        assistant_id: currentAssistant,
        conversation_id: st?.conversationId || "",
        meta_data: {
          mention_assistant_id: "",
          mention_assistant_name: "",
          mention_assistant_avatar: "",
          mention_conversation_id: "",
          is_test: false,
          input_question_type: "xxxx",
          channel: "",
          agent_id: "",
          is_greeting: false,
          chat_mode: rest?.chat_mode ? rest.chat_mode : "",
          selected_model: rest?.selected_model ? rest.selected_model : "",
          is_networking: rest?.is_networking !== undefined ? rest.is_networking : false,
          platform: "h5",
          tm: "h5",
          cogview: {
            aspect_ratio: rest?.aspect_ratio ? rest.aspect_ratio : "1:1",
            style: rest?.style ? rest.style : "none",
            resolution: rest?.resolution ? rest.resolution : "hd",
            scene: rest?.scene ? rest.scene : "none",
            chat_model: "",
            rm_label_watermark: false
          }
        },
        messages: sendMessages,
        is_cache: true
      };
      this.log("Mengirim chat stream ke ChatGLM...");
      const headers = {
        ...this.hdr(st),
        accept: "text/event-stream",
        "content-type": "application/json"
      };
      const res = await axios.post(`${this.base}/backend-api/assistant/stream`, payload, {
        headers: headers,
        responseType: "text",
        transformResponse: [data => data]
      });
      this.log("Memproses respon streaming SSE...");
      const {
        textResult,
        chunks,
        images,
        convId
      } = this.parse(res?.data || "");
      if (convId) {
        st.conversationId = convId;
      }
      if (textResult) {
        st.history.push({
          role: "assistant",
          content: [{
            type: "text",
            text: textResult
          }]
        });
      }
      return {
        status: true,
        result: textResult.trim(),
        chunks: chunks,
        images: images,
        conversation_id: st.conversationId || "",
        state: this.enc(st)
      };
    } catch (err) {
      this.log(`Error pada chat: ${err?.message || err}`);
      return {
        status: false,
        result: null,
        chunks: [],
        images: [],
        state: state || null,
        error: err?.response?.data || err?.message || err
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["chat", "search", "info", "register"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          chat: "/?action=chat&prompt=Halo+siapa+kamu",
          search: "/?action=search&query=coder",
          info: "/?action=info&assistant_id=65940acff94777010aa6b796",
          register: "/?action=register"
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
  const glm = new ChatGLM();
  try {
    let response;
    switch (action) {
      case "chat": {
        if (!params.prompt && !params.messages) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' atau 'messages' wajib diisi untuk melakukan chat."
          });
        }
        response = await glm.chat(params);
        break;
      }
      case "search": {
        response = await glm.search(params);
        break;
      }
      case "info": {
        const decodedState = glm.dec(params.state);
        const infoData = await glm.info(decodedState, params.assistant_id);
        if (!infoData) {
          return res.status(502).json({
            status: false,
            error: "Gagal mengambil data assistant info."
          });
        }
        response = {
          status: true,
          result: infoData.result,
          state: infoData.state
        };
        break;
      }
      case "register": {
        const guestData = await glm.reg();
        if (!guestData) {
          return res.status(502).json({
            status: false,
            error: "Gagal membuat sesi guest token."
          });
        }
        response = {
          status: true,
          result: guestData,
          state: glm.enc(guestData)
        };
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response || response.status === false && !response.error) {
      return res.status(502).json({
        status: false,
        error: "Server target tidak memberikan respon atau data kosong."
      });
    }
    return res.status(200).json({
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