import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class GochuAI {
  constructor() {
    try {
      this.b_url = "https://gochu.ai";
      this.m_url = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
      this.req = axios.create({
        baseURL: this.b_url,
        timeout: 6e4,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "cache-control": "no-cache",
          pragma: "no-cache",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this.req.interceptors.request.use(cfg => {
        console.log(`[HTTP REQ] ${cfg?.method?.toUpperCase()} -> ${cfg?.url}`);
        return cfg;
      }, err => {
        console.log(`[HTTP ERR REQ] ${err?.message}`);
        return Promise.reject(err);
      });
      this.req.interceptors.response.use(res => {
        console.log(`[HTTP RES] ${res?.status} <- ${res?.config?.url}`);
        return res;
      }, err => {
        console.log(`[HTTP ERR RES] ${err?.response?.status || err?.message}`);
        return Promise.reject(err);
      });
    } catch (err) {
      console.log(`[CONSTRUCTOR ERR] ${err?.message}`);
    }
  }
  async slp(ms = 1e3) {
    try {
      return await new Promise(r => setTimeout(r, ms));
    } catch (err) {
      console.log(`[SLEEP ERR] ${err?.message}`);
      return null;
    }
  }
  enc(obj = {}) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch (err) {
      console.log(`[ENCODE ERR] ${err?.message}`);
      return null;
    }
  }
  dec(str = "") {
    try {
      if (!str || typeof str !== "string") return null;
      return JSON.parse(Buffer.from(str, "base64").toString("utf-8"));
    } catch (err) {
      console.log(`[DECODE ERR] ${err?.message}`);
      return null;
    }
  }
  async med(input = null) {
    try {
      if (!input) return {
        base64: null,
        mime: null
      };
      if (Buffer.isBuffer(input)) {
        return {
          base64: input.toString("base64"),
          mime: "image/jpeg"
        };
      }
      if (typeof input === "string") {
        const trimmed = input.trim();
        if (/^data:([^;]+);base64,(.+)$/i.test(trimmed)) {
          const match = trimmed.match(/^data:([^;]+);base64,(.+)$/i);
          return {
            mime: match?.[1] || "image/jpeg",
            base64: match?.[2] || null
          };
        }
        if (/^https?:\/\//i.test(trimmed)) {
          console.log(`[MEDIA] Mengunduh asset media: ${trimmed}`);
          const res = await axios.get(trimmed, {
            responseType: "arraybuffer"
          });
          const mime = res?.headers?.["content-type"] || "image/jpeg";
          return {
            base64: Buffer.from(res?.data).toString("base64"),
            mime: mime
          };
        }
        return {
          base64: trimmed,
          mime: "image/jpeg"
        };
      }
    } catch (err) {
      console.log(`[MEDIA ERR] Gagal memproses media input: ${err?.message}`);
    }
    return {
      base64: null,
      mime: null
    };
  }
  prs_rsc(raw = "") {
    try {
      if (!raw || typeof raw !== "string") return [];
      const startIdx = raw.indexOf('{"@context"');
      if (startIdx !== -1) {
        let depth = 0;
        let endIdx = -1;
        for (let i = startIdx; i < raw.length; i++) {
          if (raw[i] === "{") depth++;
          else if (raw[i] === "}") {
            depth--;
            if (depth === 0) {
              endIdx = i + 1;
              break;
            }
          }
        }
        if (endIdx !== -1) {
          const jsonStr = raw.substring(startIdx, endIdx);
          const parsed = JSON.parse(jsonStr);
          if (parsed?.hasPart) {
            return (parsed?.hasPart || []).map(item => {
              const id = item?.url ? item.url.split("/").filter(Boolean).pop() : null;
              return {
                id: id ? parseInt(id, 10) || id : null,
                name: item?.name || null,
                description: item?.description || null,
                avatar_url: item?.image || null,
                url: item?.url || null
              };
            });
          }
        }
      }
    } catch (err) {
      console.log(`[RSC PARSE ERR] ${err?.message}`);
    }
    return [];
  }
  async chk_mail(email, max = 15) {
    try {
      console.log(`[MAIL] Memeriksa pesan masuk untuk: ${email}`);
      for (let i = 0; i < max; i++) {
        await this.slp(3e3);
        try {
          const res = await axios.get(`${this.m_url}?action=message&email=${encodeURIComponent(email)}`);
          const messages = res?.data?.data || [];
          if (messages.length > 0) {
            const content = messages[0]?.text_content || messages[0]?.html_content || "";
            const match = content.match(/https:\/\/gochu\.ai\/api\/auth\/magic-link\/verify\?token=[^\s"'>]+/i) || content.match(/https:\/\/gochu\.ai\/[^\s"'>]*token=[^\s"'>]+/i);
            if (match) {
              console.log(`[MAIL] Tautan verifikasi ditemukan!`);
              return match[0];
            }
          }
        } catch (err) {
          console.log(`[MAIL POLL ERR] Percobaan ${i + 1}: ${err?.message}`);
        }
      }
      throw new Error("Timeout: Link verifikasi tidak ditemukan.");
    } catch (err) {
      console.log(`[CHK MAIL ERR] ${err?.message}`);
      throw err;
    }
  }
  async gen_auth() {
    try {
      console.log("[AUTH] Memulai pendaftaran akun guest/baru...");
      const mailRes = await axios.get(`${this.m_url}?action=create`);
      const email = mailRes?.data?.email || mailRes?.data?.data?.email;
      if (!email) throw new Error("Gagal membuat email.");
      console.log(`[AUTH] Email dibuat: ${email}`);
      await this.req.post("/api/auth/magic-link/request", {
        email: email,
        referralCode: null
      }, {
        headers: {
          "content-type": "application/json",
          origin: this.b_url
        }
      });
      const verifyUrl = await this.chk_mail(email);
      console.log(`[AUTH] Memvalidasi magic link: ${verifyUrl}`);
      const verifyRes = await axios.get(verifyUrl, {
        maxRedirects: 0,
        validateStatus: s => s >= 200 && s < 400
      });
      const rawCookies = verifyRes?.headers?.["set-cookie"] || [];
      const cookieStr = rawCookies.map(c => c.split(";")[0]).join("; ");
      console.log(`[AUTH] Login berhasil, cookie diterima.`);
      const meRes = await this.req.get("/api/auth/me", {
        headers: {
          cookie: cookieStr
        }
      });
      const stateObj = {
        cookie: cookieStr,
        user: meRes?.data || null,
        created_at: Date.now()
      };
      return this.enc(stateObj);
    } catch (err) {
      console.log(`[GEN AUTH ERR] ${err?.message}`);
      throw err;
    }
  }
  async ens_auth(state = null) {
    try {
      if (state) {
        const decoded = this.dec(state);
        if (decoded?.cookie) {
          console.log("[AUTH] Menggunakan state sesi yang tersedia.");
          return {
            cookie: decoded.cookie,
            state: state
          };
        }
      }
      const newState = await this.gen_auth();
      const decoded = this.dec(newState);
      return {
        cookie: decoded?.cookie || "",
        state: newState
      };
    } catch (err) {
      console.log(`[ENS AUTH ERR] ${err?.message}`);
      throw err;
    }
  }
  async character({
    state = null,
    type = "anime",
    ...rest
  } = {}) {
    let activeState = state;
    try {
      console.log(`[CHARACTER] Mengambil daftar karakter tipe: ${type}`);
      const auth = await this.ens_auth(state);
      activeState = auth.state;
      const pathMap = {
        woman: "/explore",
        women: "/explore",
        man: "/explore/men",
        men: "/explore/men",
        anime: "/explore/anime"
      };
      const targetPath = pathMap[type?.toLowerCase()] || "/explore/anime";
      const res = await this.req.get(`${targetPath}?_rsc=g3047`, {
        headers: {
          cookie: auth.cookie,
          rsc: "1",
          referer: `${this.b_url}/explore`,
          ...rest?.headers
        }
      });
      let characters = this.prs_rsc(res?.data || "");
      if (!characters.length) {
        console.log("[CHARACTER] Parser RSC fallback ke Cheerio scraping HTML...");
        const htmlRes = await this.req.get(targetPath, {
          headers: {
            cookie: auth.cookie
          }
        });
        const _ = cheerio.load(htmlRes?.data || "");
        characters = _('script[type="application/ld+json"]').map((_, el) => {
          try {
            const json = JSON.parse(_(el).text() || "{}");
            return json?.hasPart || [];
          } catch {
            return [];
          }
        }).get().flat().map(c => ({
          id: c?.url ? parseInt(c.url.split("/").filter(Boolean).pop(), 10) || c.url.split("/").filter(Boolean).pop() : null,
          name: c?.name || null,
          description: c?.description || null,
          avatar_url: c?.image || null,
          url: c?.url || null
        }));
      }
      console.log(`[CHARACTER] Berhasil mengambil ${characters.length} karakter.`);
      return {
        status: true,
        result: characters,
        chunks: null,
        state: activeState
      };
    } catch (err) {
      console.log(`[CHARACTER ERR] ${err?.message}`);
      return {
        status: false,
        result: null,
        chunks: null,
        state: activeState || null,
        error: err?.response?.data || err?.message
      };
    }
  }
  async chat({
    state = null,
    prompt = "",
    char_id = "50",
    media = null,
    ...rest
  } = {}) {
    let activeState = state;
    try {
      console.log(`[CHAT] Mempersiapkan chat session untuk char_id: ${char_id}`);
      const auth = await this.ens_auth(state);
      activeState = auth.state;
      const sessRes = await this.req.post("/api/chat/session-from-character", {
        characterId: String(char_id),
        locale: rest?.locale || "en"
      }, {
        headers: {
          "content-type": "application/json",
          cookie: auth.cookie,
          origin: this.b_url,
          referer: `${this.b_url}/characters/${char_id}`
        }
      });
      const sessionId = sessRes?.data?.id;
      if (!sessionId) throw new Error("Gagal menginisialisasi sesi percakapan.");
      console.log(`[CHAT] Session ID dibuat: ${sessionId}`);
      const {
        base64: imgBase64,
        mime: imgMime
      } = await this.med(media);
      const payload = {
        messages: [{
          role: "user",
          content: prompt || "Hello"
        }],
        locale: rest?.locale || "en",
        ...imgBase64 ? {
          imageBase64: imgBase64,
          imageMimeType: imgMime
        } : {}
      };
      console.log(`[CHAT] Mengirim stream prompt...`);
      const streamRes = await this.req.post(`/api/chat/sessions/${sessionId}/stream`, payload, {
        headers: {
          "content-type": "application/json",
          cookie: auth.cookie,
          origin: this.b_url,
          referer: `${this.b_url}/chat/${sessionId}`
        },
        responseType: "text"
      });
      const chunks = [];
      let fullText = "";
      const lines = String(streamRes?.data || "").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data:")) {
          const jsonStr = trimmed.slice(5).trim();
          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              chunks.push(data);
              if (data?.token) {
                fullText += data.token;
              }
            } catch {}
          }
        }
      }
      console.log(`[CHAT] Respon selesai diterima.`);
      return {
        status: true,
        result: fullText.trim(),
        chunks: chunks,
        state: activeState
      };
    } catch (err) {
      console.log(`[CHAT ERR] ${err?.message}`);
      return {
        status: false,
        result: null,
        chunks: null,
        state: activeState || null,
        error: err?.response?.data || err?.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body || {};
  const validActions = ["character", "chat"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          character: "/?action=character&type=anime&state=YOUR_STATE_B64",
          character_women: "/?action=character&type=woman",
          character_men: "/?action=character&type=man",
          chat: "/?action=chat&prompt=Hello+there&char_id=50&state=YOUR_STATE_B64",
          chat_with_media: "/?action=chat&prompt=Describe+this&char_id=50&media=https://picsum.photos/300/300&state=YOUR_STATE_B64"
        }
      }
    });
  }
  const api = new GochuAI();
  try {
    let response;
    switch (action) {
      case "character":
      case "characters":
        response = await api.character(params);
        break;
      case "chat":
        if (!params.prompt && !params.media) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' atau 'media' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (response && response.status === false) {
      return res.status(500).json({
        status: false,
        action: action,
        error: response.error || response.result?.error || "Gagal memproses request internal API.",
        state: response.state || null
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
      action: action,
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}