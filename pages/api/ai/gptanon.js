import axios from "axios";
import crypto from "crypto";
class GptAnon {
  constructor() {
    this.base = "https://gptanon.com";
    this.to = 6e4;
    this.ck = {};
    this.mdls = [];
    this.cfgFreeId = null;
    this.sessionId = null;
    this.init = false;
    this.did = this._uuid();
    this.sid = this._uuid();
    this.wid = this._uuid();
    const phPayload = encodeURIComponent(JSON.stringify({
      $device_id: this.did,
      distinct_id: this.did,
      $sesid: [Date.now(), this.sid, Date.now()],
      $epp: true,
      $initial_person_info: {
        r: "$direct",
        u: "https://gptanon.com/"
      },
      $user_state: "anonymous"
    }));
    this.ck["ph_phc_oiDt6uXiBiEA2aT43SMzMAFE9D4gMVkRP3BtvYRsmHqe_posthog"] = phPayload;
    this.http = axios.create({
      baseURL: this.base,
      timeout: this.to,
      validateStatus: () => true
    });
    this.http.interceptors.request.use(req => {
      const cookieStr = Object.entries(this.ck).map(([k, v]) => `${k}=${v}`).join("; ");
      if (cookieStr) req.headers["cookie"] = cookieStr;
      return req;
    });
    this.http.interceptors.response.use(res => {
      const rawCookies = res?.headers?.["set-cookie"];
      if (rawCookies && Array.isArray(rawCookies)) {
        rawCookies.forEach(item => {
          const [pair] = item.split(";");
          const [k, ...v] = (pair || "").split("=");
          if (k) this.ck[k.trim()] = v.join("=").trim();
        });
      }
      return res;
    });
  }
  _uuid() {
    try {
      return crypto.randomUUID();
    } catch {
      return "01a02822-" + Math.random().toString(16).slice(2, 6) + "-71ad-84dc-" + Math.random().toString(16).slice(2, 14);
    }
  }
  _hdr(opt = {}) {
    return {
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
      ...opt?.extra || {}
    };
  }
  _encState() {
    try {
      const obj = {
        sessionId: this.sessionId,
        ck: this.ck,
        did: this.did,
        sid: this.sid,
        wid: this.wid
      };
      return Buffer.from(JSON.stringify(obj)).toString("base64");
    } catch (err) {
      console.log("[GptAnon] Gagal encode state:", err?.message);
      return null;
    }
  }
  _decState(b64) {
    try {
      if (!b64 || typeof b64 !== "string") return;
      console.log("[GptAnon] Memulihkan state sesi dari Base64...");
      const parsed = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
      if (parsed?.sessionId) this.sessionId = parsed.sessionId;
      if (parsed?.ck) this.ck = {
        ...this.ck,
        ...parsed.ck
      };
      if (parsed?.did) this.did = parsed.did;
      if (parsed?.sid) this.sid = parsed.sid;
      if (parsed?.wid) this.wid = parsed.wid;
      this.init = true;
      console.log("[GptAnon] State sesi berhasil dipulihkan. SessionId:", this.sessionId);
    } catch (err) {
      console.log("[GptAnon] Gagal decode state:", err?.message);
    }
  }
  async _readStream(stream) {
    try {
      if (!stream || typeof stream.on !== "function") return stream;
      return await new Promise(resolve => {
        let data = "";
        stream.on("data", chunk => {
          data += chunk.toString();
        });
        stream.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
        stream.on("error", () => resolve(data));
      });
    } catch {
      return null;
    }
  }
  async _media(mediaInput) {
    try {
      if (!mediaInput) return null;
      console.log("[GptAnon] Memproses attachment media...");
      const items = Array.isArray(mediaInput) ? mediaInput : [mediaInput];
      const attachments = [];
      for (const item of items) {
        let dataUrl = "";
        let mime = "image/jpeg";
        let size = 0;
        if (Buffer.isBuffer(item)) {
          size = item.length;
          dataUrl = `data:${mime};base64,${item.toString("base64")}`;
        } else if (typeof item === "string") {
          if (/^https?:\/\//i.test(item)) {
            console.log("[GptAnon] Mengunduh media dari URL...");
            const res = await axios.get(item, {
              responseType: "arraybuffer",
              timeout: 15e3
            });
            mime = res?.headers?.["content-type"] || "image/jpeg";
            const buf = Buffer.from(res?.data || "");
            size = buf.length;
            dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
          } else if (item.startsWith("data:")) {
            dataUrl = item;
            const mimeMatch = item.match(/^data:([^;]+);base64,/);
            mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
            const rawB64 = item.split(";base64,")[1] || "";
            size = Buffer.byteLength(rawB64, "base64");
          } else {
            dataUrl = `data:${mime};base64,${item}`;
            size = Buffer.byteLength(item, "base64");
          }
        }
        if (dataUrl) {
          attachments.push({
            id: this._uuid(),
            name: `file_${Date.now()}.${mime.split("/")[1] || "jpg"}`,
            type: mime,
            size: size,
            url: dataUrl
          });
        }
      }
      return attachments.length > 0 ? attachments : null;
    } catch (err) {
      console.log("[GptAnon] Gagal memproses media:", err?.message);
      return null;
    }
  }
  async _init() {
    try {
      if (this.init) return true;
      console.log("[GptAnon] Menginisialisasi session awal & cookie...");
      await this.http.get("/", {
        headers: this._hdr({
          extra: {
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1"
          }
        })
      });
      await this.http.post("/api/track/visit", null, {
        headers: this._hdr({
          extra: {
            accept: "*/*",
            "content-length": "0",
            origin: "https://gptanon.com",
            referer: "https://gptanon.com/",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
          }
        })
      });
      this.init = true;
      console.log("[GptAnon] Inisialisasi session berhasil.");
      return true;
    } catch (err) {
      console.log("[GptAnon] Gagal inisialisasi session:", err?.message);
      return false;
    }
  }
  async _fetchFree() {
    try {
      if (this.mdls?.length > 0) return this.mdls;
      console.log("[GptAnon] Mengambil model FREE...");
      const [resCfg, resList] = await Promise.all([this.http.get("/api/config/free-model", {
        headers: this._hdr({
          extra: {
            accept: "*/*",
            referer: "https://gptanon.com/chat",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
          }
        })
      }), this.http.get("/api/models", {
        headers: this._hdr({
          extra: {
            accept: "*/*",
            referer: "https://gptanon.com/chat",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-posthog-distinct-id": this.did,
            "x-posthog-session-id": this.sid,
            "x-posthog-window-id": this.wid
          }
        })
      })]);
      this.cfgFreeId = resCfg?.data?.freeModelId || "google/gemma-4-31b-it";
      const allModels = Array.isArray(resList?.data) ? resList.data : [];
      const filtered = allModels.filter(m => m?.isActive && (m?.isFree === true || m?.modelId === this.cfgFreeId));
      this.mdls = filtered.length > 0 ? filtered : [{
        modelId: this.cfgFreeId,
        name: this.cfgFreeId,
        isFree: true
      }];
      console.log(`[GptAnon] Berhasil memuat model FREE:`, this.mdls.map(m => m.modelId));
      return this.mdls;
    } catch (err) {
      console.log("[GptAnon] Gagal memuat model:", err?.message);
      return [{
        modelId: "google/gemma-4-31b-it",
        name: "Google: Gemma 4 31B",
        isFree: true
      }];
    }
  }
  async _val(selectedModel) {
    try {
      console.log("[GptAnon] Memvalidasi model:", selectedModel || "default");
      const freeList = await this._fetchFree();
      if (selectedModel) {
        const found = freeList.find(m => m?.modelId === selectedModel || m?.name?.toLowerCase() === selectedModel.toLowerCase());
        if (found) return found.modelId;
        console.log(`[GptAnon] Model "${selectedModel}" tidak masuk list free. Dialihkan ke default.`);
      }
      const def = freeList.find(m => m?.modelId === this.cfgFreeId) || freeList[0];
      return def?.modelId ? def.modelId : "google/gemma-4-31b-it";
    } catch (err) {
      console.log("[GptAnon] Gagal validasi model:", err?.message);
      return "google/gemma-4-31b-it";
    }
  }
  _msg(prompt, messages) {
    try {
      let history = Array.isArray(messages) ? [...messages] : [];
      if (prompt) {
        history.push({
          role: "user",
          content: String(prompt)
        });
      }
      if (!history.length) return null;
      const lastMsg = history[history.length - 1]?.content;
      const text = typeof lastMsg === "string" ? lastMsg : JSON.stringify(lastMsg);
      return {
        text: text,
        history: history
      };
    } catch (err) {
      console.log("[GptAnon] Gagal format messages:", err?.message);
      return null;
    }
  }
  async chat({
    state,
    prompt,
    messages,
    media,
    model,
    ...rest
  }) {
    try {
      console.log("[GptAnon] Memulai request chat...");
      if (state) {
        this._decState(state);
      }
      const attachments = await this._media(media);
      const msgData = this._msg(prompt, messages);
      let finalMessage = msgData?.text?.trim() || "";
      if (!finalMessage && attachments?.length > 0) {
        finalMessage = "What do you see in this image?";
      }
      if (!finalMessage && !attachments) {
        console.log("[GptAnon] Validasi gagal: prompt, messages, atau media wajib diisi.");
        return {
          status: false,
          result: null,
          chunks: [],
          state: this._encState(),
          error: 'Input required: "prompt", "messages", or "media" must be provided.'
        };
      }
      await this._init();
      const validModel = await this._val(model);
      console.log("[GptAnon] Menggunakan model:", validModel);
      const payload = {
        message: finalMessage,
        modelIds: [validModel],
        deepSearchEnabled: rest?.deepSearchEnabled ? true : false,
        attachments: attachments ? attachments : undefined,
        ...this.sessionId ? {
          sessionId: this.sessionId
        } : {},
        ...rest
      };
      const streamHeaders = this._hdr({
        extra: {
          accept: "*/*",
          "content-type": "application/json",
          origin: "https://gptanon.com",
          priority: "u=1, i",
          referer: "https://gptanon.com/chat",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-posthog-distinct-id": this.did,
          "x-posthog-session-id": this.sid,
          "x-posthog-window-id": this.wid
        }
      });
      console.log("[GptAnon] Mengirim pesan ke stream endpoint...");
      const res = await this.http.post("/api/chat/stream", payload, {
        responseType: "stream",
        headers: streamHeaders
      });
      if (res?.status < 200 || res?.status >= 300) {
        const errPayload = await this._readStream(res?.data);
        console.log(`[GptAnon] Stream HTTP Error (${res?.status}):`, errPayload);
        return {
          status: false,
          result: null,
          chunks: [],
          state: this._encState(),
          error: errPayload || `HTTP ${res?.status}`
        };
      }
      console.log("[GptAnon] Membaca stream respon...");
      const chunks = [];
      let completeText = "";
      let collectedTokens = "";
      const streamResult = await new Promise(resolve => {
        let buffer = "";
        res?.data?.on("data", chunk => {
          try {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const rawJson = line.slice(6).trim();
                if (!rawJson || rawJson === "[DONE]") continue;
                const parsed = JSON.parse(rawJson);
                chunks.push(parsed);
                if (parsed?.type === "session" && parsed?.sessionId) {
                  this.sessionId = parsed.sessionId;
                } else if (parsed?.type === "token" && parsed?.token) {
                  collectedTokens += parsed.token;
                } else if (parsed?.type === "complete" && parsed?.content) {
                  completeText = parsed.content;
                }
              }
            }
          } catch {}
        });
        res?.data?.on("end", () => {
          const finalResult = completeText || collectedTokens;
          resolve({
            ok: true,
            result: finalResult
          });
        });
        res?.data?.on("error", err => {
          console.log("[GptAnon] Stream error:", err?.message);
          resolve({
            ok: false,
            error: err?.message
          });
        });
      });
      const isOk = streamResult?.ok ? true : false;
      const currentState = this._encState();
      console.log("[GptAnon] Selesai memproses stream. Total chunks:", chunks.length);
      return {
        status: isOk,
        result: streamResult?.result || null,
        chunks: chunks,
        state: currentState
      };
    } catch (err) {
      console.log("[GptAnon] Error saat eksekusi chat:", err?.message);
      return {
        status: false,
        result: null,
        chunks: [],
        state: this._encState(),
        error: err?.message
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
  const api = new GptAnon();
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