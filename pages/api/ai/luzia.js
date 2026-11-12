import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class LuziaClient {
  constructor(opts = {}) {
    try {
      this.baseUrl = opts?.baseUrl || "https://luzia-api.thewordlab.net/api/v4.0";
      this.apiKey = opts?.apiKey || "fXuk7lHv2WaTMbVNqu@vXEDtHfz&IJ0SW";
      this.orgId = opts?.orgId || "a7bd74a8-7247-42c3-ab3e-fe1015cd2849";
      this.lang = opts?.lang || "id-ID";
      this.country = opts?.country || "ID";
      this.ua = opts?.ua || "RE5C91L1/RMX3890 Android/15 LuziaApp/5.49.0";
    } catch (err) {
      console.log(`[Init] Constructor initialization error: ${err?.message}`);
    }
  }
  async fmtErr(err) {
    try {
      if (!err) return "Unknown error";
      const resp = err.response;
      if (resp?.data) {
        let data = resp.data;
        if (typeof data?.pipe === "function" || typeof data?.on === "function") {
          data = await new Promise(resolve => {
            let body = "";
            data.setEncoding?.("utf-8");
            data.on("data", chunk => {
              body += chunk;
            });
            data.on("end", () => resolve(body));
            data.on("error", () => resolve(null));
          });
        }
        if (Buffer.isBuffer(data)) {
          data = data.toString("utf-8");
        }
        if (typeof data === "string") {
          try {
            return JSON.parse(data);
          } catch {
            return data.trim() || `${err.message || "HTTP Error"} (Status ${resp.status})`;
          }
        }
        if (typeof data === "object" && data !== null) {
          try {
            JSON.stringify(data);
            return data;
          } catch {
            return err.message || `Error status ${resp.status}`;
          }
        }
      }
      return err.message || "Unknown error";
    } catch {
      return err?.message || "Unknown error";
    }
  }
  uid() {
    try {
      return crypto.randomUUID();
    } catch (err) {
      console.log(`[Util] Fallback UUID generation: ${err?.message}`);
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".split("x").join("a");
    }
  }
  enc(obj) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch (err) {
      console.log(`[State] Encode error: ${err?.message}`);
      return null;
    }
  }
  dec(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf-8")) : null;
    } catch (err) {
      console.log(`[State] Decode error: ${err?.message}`);
      return null;
    }
  }
  toJson(str) {
    try {
      if (!str || typeof str !== "string") return null;
      let s = str.trim();
      if (s.startsWith("```")) {
        const firstLineEnd = s.indexOf("\n");
        const lastLineStart = s.lastIndexOf("```");
        s = firstLineEnd !== -1 && lastLineStart > firstLineEnd ? s.slice(firstLineEnd + 1, lastLineStart).trim() : s;
      }
      return s.startsWith("{") || s.startsWith("[") ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }
  toSnake(str) {
    try {
      if (typeof str !== "string") return str;
      let out = "";
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        out += c >= "A" && c <= "Z" ? (i > 0 ? "_" : "") + c.toLowerCase() : c;
      }
      return out;
    } catch {
      return str;
    }
  }
  snk(val) {
    try {
      if (Array.isArray(val)) return val.map(v => this.snk(v));
      if (val !== null && typeof val === "object") {
        const res = {};
        for (const [k, v] of Object.entries(val)) {
          res[this.toSnake(k)] = this.snk(v);
        }
        return res;
      }
      return val;
    } catch {
      return val;
    }
  }
  hdrs(token, devKey, adId, customHeaders = {}) {
    try {
      const h = {
        "User-Agent": this.ua,
        "Accept-Encoding": "gzip",
        "x-api-key": this.apiKey,
        "x-organization-id": this.orgId,
        "accept-language": this.lang,
        "x-country-code": this.country,
        "x-correlation-id": this.uid()
      };
      if (token) h["authorization"] = `Bearer ${token}`;
      if (devKey) h["x-device-key"] = devKey;
      if (adId) h["x-ad-id"] = adId;
      return {
        ...h,
        ...customHeaders || {}
      };
    } catch (err) {
      console.log(`[Headers] Build headers error: ${err?.message}`);
      return customHeaders || {};
    }
  }
  async buf(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) {
        return {
          data: input,
          mime: "image/jpeg",
          name: `file_${Date.now()}.jpg`
        };
      }
      if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          console.log("[Media] Fetching remote buffer...");
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          const mime = res?.headers?.["content-type"] || "image/jpeg";
          return {
            data: Buffer.from(res?.data),
            mime: mime,
            name: `file_${Date.now()}.jpg`
          };
        }
        if (input.startsWith("data:")) {
          const colonIdx = input.indexOf(":");
          const semiIdx = input.indexOf(";");
          const commaIdx = input.indexOf(",");
          const mime = semiIdx > colonIdx ? input.slice(colonIdx + 1, semiIdx) : "image/jpeg";
          const b64 = commaIdx !== -1 ? input.slice(commaIdx + 1) : input;
          return {
            data: Buffer.from(b64, "base64"),
            mime: mime,
            name: `file_${Date.now()}.jpg`
          };
        }
        return {
          data: Buffer.from(input, "base64"),
          mime: "image/jpeg",
          name: `file_${Date.now()}.jpg`
        };
      }
      return null;
    } catch (err) {
      console.log(`[Media] Buffer resolution error: ${err?.message}`);
      return null;
    }
  }
  async guest(s, extraHeaders = {}) {
    try {
      console.log("[Auth] Authenticating guest session...");
      const devKey = s?.device_key || this.uid();
      const adId = s?.ad_id || this.uid();
      const res = await axios.post(`${this.baseUrl}/auth/guest`, {}, {
        headers: this.hdrs(null, devKey, adId, extraHeaders)
      });
      return {
        token: res?.data?.token,
        refresh_token: res?.data?.refreshToken,
        user_id: res?.data?.userId,
        device_key: devKey,
        ad_id: adId
      };
    } catch (err) {
      const errDetail = await this.fmtErr(err);
      console.log(`[Auth] Guest authentication failed: ${typeof errDetail === "object" ? JSON.stringify(errDetail) : errDetail}`);
      throw new Error(typeof errDetail === "string" ? errDetail : JSON.stringify(errDetail));
    }
  }
  async up(item, s, tid, pid, extraHeaders = {}) {
    try {
      console.log("[Upload] Uploading media attachment...");
      const solved = await this.buf(item);
      if (!solved?.data) return null;
      const fd = new FormData();
      fd.append("source", "chat");
      fd.append("threadId", tid);
      fd.append("personalityId", pid);
      fd.append("files", solved.data, {
        filename: solved.name,
        contentType: solved.mime
      });
      const h = {
        ...this.hdrs(s?.token, s?.device_key, s?.ad_id, extraHeaders),
        ...fd.getHeaders()
      };
      const res = await axios.post(`${this.baseUrl}/attachments/upload`, fd, {
        headers: h
      });
      return res?.data?.attachmentId || null;
    } catch (err) {
      console.log(`[Upload] Upload failed: ${err?.message}`);
      return null;
    }
  }
  async chars({
    state,
    style = "3d",
    hidden = true,
    ...rest
  } = {}) {
    console.log("[Personality] Fetching popular characters list...");
    try {
      let curr = this.dec(state) || {};
      if (!curr?.token) {
        const auth = await this.guest(curr, rest?.headers);
        curr = {
          ...curr,
          ...auth
        };
      }
      const h = this.hdrs(curr?.token, curr?.device_key, curr?.ad_id, rest?.headers);
      const res = await axios.get(`${this.baseUrl}/personalities/popular?includeHidden=${hidden ? "true" : "false"}&assetStyle=${style}`, {
        headers: h
      });
      return {
        status: true,
        result: this.snk(res?.data?.data || res?.data || []),
        state: this.enc(curr)
      };
    } catch (err) {
      const errDetail = await this.fmtErr(err);
      console.log(`[Personality] Fetch list failed: ${typeof errDetail === "object" ? JSON.stringify(errDetail) : errDetail}`);
      return {
        status: false,
        result: {
          error: errDetail
        },
        state: state || null
      };
    }
  }
  async char(id, {
    state,
    style = "3d",
    ...rest
  } = {}) {
    console.log(`[Personality] Fetching character detail for '${id}'...`);
    try {
      let curr = this.dec(state) || {};
      if (!curr?.token) {
        const auth = await this.guest(curr, rest?.headers);
        curr = {
          ...curr,
          ...auth
        };
      }
      const h = this.hdrs(curr?.token, curr?.device_key, curr?.ad_id, rest?.headers);
      const res = await axios.get(`${this.baseUrl}/personalities/${id}?assetStyle=${style}`, {
        headers: h
      });
      return {
        status: true,
        result: this.snk(res?.data || {}),
        state: this.enc(curr)
      };
    } catch (err) {
      const errDetail = await this.fmtErr(err);
      console.log(`[Personality] Fetch detail failed: ${typeof errDetail === "object" ? JSON.stringify(errDetail) : errDetail}`);
      return {
        status: false,
        result: {
          error: errDetail
        },
        state: state || null
      };
    }
  }
  async parseStream(stream, onChunk) {
    try {
      return await new Promise((resolve, reject) => {
        let buffer = "";
        const res = {
          deltas: [],
          events: {},
          enrichments: {},
          raw_chunks: []
        };
        stream.on("data", chunk => {
          try {
            buffer += chunk.toString("utf-8");
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            let curEvent = "message";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              const colonIdx = trimmed.indexOf(":");
              if (colonIdx === -1) continue;
              const field = trimmed.slice(0, colonIdx).trim();
              const value = trimmed.slice(colonIdx + 1).trim();
              if (field === "event") {
                curEvent = value;
                continue;
              }
              if (field === "data") {
                const parsed = this.toJson(value) || value;
                res.raw_chunks.push({
                  event: curEvent,
                  data: parsed
                });
                (res.events[curEvent] = res.events[curEvent] || []).push(parsed);
                parsed?.delta && (res.deltas.push(parsed.delta), onChunk?.(parsed.delta));
                parsed?.kind && (res.enrichments[parsed.kind] = parsed?.data || parsed);
              }
            }
          } catch (streamDataErr) {
            console.log(`[Stream Parser] Data chunk error: ${streamDataErr?.message}`);
          }
        });
        stream.on("end", () => resolve(res));
        stream.on("error", err => reject(err));
      });
    } catch (err) {
      console.log(`[Stream Parser] Parse error: ${err?.message}`);
      throw err;
    }
  }
  async chat({
    state,
    prompt,
    messages,
    media,
    personality,
    character,
    personalityId,
    ...rest
  }) {
    console.log("[Chat] Initiating message execution...");
    try {
      let curr = this.dec(state) || {};
      if (!curr?.token) {
        const auth = await this.guest(curr, rest?.headers);
        curr = {
          ...curr,
          ...auth
        };
      }
      const pid = character || personality || personalityId || rest?.personalityId || curr?.personality_id || "LuzIA";
      const isSwitch = curr?.personality_id && curr.personality_id !== pid;
      const tid = rest?.threadId || (isSwitch ? this.uid() : curr?.thread_id || this.uid());
      const ctx = isSwitch && !rest?.context ? [] : Array.isArray(rest?.context) ? rest.context : Array.isArray(curr?.context) ? curr.context : [];
      let queryText = prompt || "";
      if (!queryText && Array.isArray(messages) && messages.length > 0) {
        for (const msg of messages) {
          if (msg?.role === "user" || !msg?.role) {
            queryText = msg?.content || queryText;
          }
        }
      }
      queryText = queryText || rest?.content || "";
      const mediaList = [];
      if (media) {
        if (Array.isArray(media)) {
          for (const item of media) mediaList.push(item);
        } else {
          mediaList.push(media);
        }
      }
      if (Array.isArray(messages)) {
        for (const msg of messages) {
          if (msg?.media) {
            if (Array.isArray(msg.media)) {
              for (const m of msg.media) mediaList.push(m);
            } else {
              mediaList.push(msg.media);
            }
          }
        }
      }
      const attachIds = Array.isArray(rest?.attachmentIds) ? [...rest.attachmentIds] : [];
      for (const item of mediaList) {
        const upId = await this.up(item, curr, tid, pid, rest?.headers);
        if (upId) attachIds.push(upId);
      }
      const {
        headers: customHeaders,
        onStream,
        axiosConfig,
        personalityId: _p,
        personality: _per,
        character: _char,
        threadId: _t,
        context: _c,
        attachmentIds: _a,
        content: _cnt,
        ...remainingRest
      } = rest || {};
      const body = {
        content: queryText,
        personalityId: pid,
        context: ctx,
        attachmentIds: attachIds,
        threadId: tid,
        isWebSearch: rest?.isWebSearch !== undefined ? String(rest.isWebSearch) : "false",
        reasoning: rest?.reasoning !== undefined ? String(rest.reasoning) : "false",
        threadMessageId: rest?.threadMessageId || this.uid(),
        a2uiClientCapabilities: rest?.a2uiClientCapabilities || {
          supportedCatalogIds: ["luzia.rich-responses.v1", "luzia.rich-responses.v2"]
        },
        ...remainingRest
      };
      console.log(`[Stream] Sending request to endpoint (Char: ${pid}, Thread: ${tid})...`);
      const h = this.hdrs(curr?.token, curr?.device_key, curr?.ad_id, customHeaders);
      h["Content-Type"] = "application/json";
      const res = await axios.post(`${this.baseUrl}/stream`, body, {
        headers: h,
        responseType: "stream",
        ...axiosConfig || {}
      });
      console.log("[Stream] Parsing streaming events...");
      const streamData = await this.parseStream(res?.data, onStream);
      const doneData = streamData?.events?.done?.[0] || streamData?.events?.message?.[0] || {};
      const fullContent = doneData?.content || streamData?.deltas?.join("") || "";
      const mdImg = fullContent.includes("![image](") ? {
        url: fullContent.split("![image](")?.[1]?.split(")")?.[0]
      } : null;
      const streamMerged = {
        content: fullContent,
        ...doneData,
        ...streamData?.enrichments,
        image: streamData?.enrichments?.image?.url ? streamData.enrichments.image : doneData?.image?.url ? doneData.image : mdImg,
        chunks: streamData?.deltas || [],
        raw_chunks: streamData?.raw_chunks || [],
        json: this.toJson(fullContent)
      };
      ctx.push({
        prompt: queryText,
        completion: fullContent,
        attachmentIds: attachIds
      });
      const nextStateObj = {
        ...curr,
        thread_id: tid,
        personality_id: pid,
        context: ctx.slice(-10)
      };
      const newState = this.enc(nextStateObj);
      console.log("[Chat] Stream sequence finished.");
      return {
        status: true,
        result: this.snk(streamMerged),
        state: newState
      };
    } catch (err) {
      const errDetail = await this.fmtErr(err);
      console.log(`[Error] Chat failed: ${typeof errDetail === "object" ? JSON.stringify(errDetail) : errDetail}`);
      return {
        status: false,
        result: {
          error: errDetail
        },
        state: state || null
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};
  const valid_actions = ["chat", "characters", "character", "guest", "upload"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          chat: "/?action=chat&prompt=Halo!&character=LuzIA",
          chat_image: "/?action=chat&prompt=Buat gambar kucing lucu&character=LuzIA",
          characters: "/?action=characters&style=3d&hidden=true",
          character: "/?action=character&id=professor",
          guest: "/?action=guest",
          upload: "/?action=upload&media=https://example.com/image.jpg"
        }
      }
    });
  }
  if (!valid_actions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: valid_actions
    });
  }
  const api = new LuziaClient();
  try {
    let response;
    switch (action) {
      case "chat": {
        const prompt = params.prompt || params.q || params.message || params.content;
        const messages = params.messages;
        const media = params.media || params.file || params.image;
        if (!prompt && (!Array.isArray(messages) || messages.length === 0) && !media) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt', 'messages', atau 'media' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat({
          prompt: prompt,
          messages: messages,
          media: media,
          state: params.state,
          character: params.character || params.personality || params.personality_id,
          isWebSearch: params.is_web_search || params.isWebSearch,
          reasoning: params.reasoning,
          threadId: params.thread_id || params.threadId,
          ...params
        });
        break;
      }
      case "characters": {
        response = await api.chars({
          state: params.state,
          style: params.style || "3d",
          hidden: params.hidden !== "false",
          ...params
        });
        break;
      }
      case "character": {
        const id = params.id || params.personality_id || params.character;
        if (!id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' (atau 'personality_id' / 'character') wajib diisi."
          });
        }
        response = await api.char(id, {
          state: params.state,
          style: params.style || "3d",
          ...params
        });
        break;
      }
      case "guest": {
        try {
          const authData = await api.guest(params);
          response = {
            status: true,
            result: authData,
            state: api.enc(authData)
          };
        } catch (authErr) {
          response = {
            status: false,
            result: {
              error: authErr?.message || "Gagal autentikasi guest"
            }
          };
        }
        break;
      }
      case "upload": {
        const mediaItem = params.media || params.file || params.image;
        if (!mediaItem) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'media' (berisi URL, Base64, atau Buffer) wajib diisi."
          });
        }
        let currState = api.dec(params.state) || {};
        if (!currState?.token) {
          const guestAuth = await api.guest(currState);
          currState = {
            ...currState,
            ...guestAuth
          };
        }
        const tid = params.thread_id || params.threadId || currState?.thread_id || api.uid();
        const pid = params.character || params.personality || currState?.personality_id || "LuzIA";
        const attachmentId = await api.up(mediaItem, currState, tid, pid);
        if (!attachmentId) {
          return res.status(502).json({
            status: false,
            error: "Gagal mengunggah media ke server target."
          });
        }
        response = {
          status: true,
          result: {
            attachment_id: attachmentId,
            thread_id: tid,
            personality_id: pid
          },
          state: api.enc({
            ...currState,
            thread_id: tid,
            personality_id: pid
          })
        };
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response || response?.status === false || !response?.result) {
      return res.status(502).json({
        status: false,
        action: action,
        error: response?.result?.error || "Server target tidak memberikan respon atau data kosong.",
        result: response?.result || null
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
      error: error?.message || "Unknown Error"
    });
  }
}