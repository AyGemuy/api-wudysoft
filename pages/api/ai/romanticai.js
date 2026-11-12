import axios from "axios";
import {
  WebSocket
} from "ws";
class RomanticAI {
  constructor() {
    try {
      this.baseUrl = "https://chat.romanticai.com";
      this.cookies = {};
      this.client = axios.create({
        baseURL: this.baseUrl,
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-authorization-version": "2",
          "x-user-agent": "web:1.0.0:null:null"
        }
      });
      this.client.interceptors.response.use(response => {
        try {
          const setCookieHeaders = response.headers["set-cookie"];
          if (setCookieHeaders) {
            setCookieHeaders.forEach(cookieStr => {
              const [cookie] = cookieStr.split(";");
              const [key, value] = cookie.split("=");
              if (key && value) {
                this.cookies[key.trim()] = value.trim();
              }
            });
          }
        } catch (err) {
          console.error("[Interceptor Error] Response:", err?.message);
        }
        return response;
      }, error => Promise.reject(error));
      this.client.interceptors.request.use(config => {
        try {
          const cookieString = Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
          if (cookieString) {
            config.headers["cookie"] = cookieString;
          }
          if (config.method.toLowerCase() === "get") {
            delete config.headers["content-type"];
            delete config.headers["Content-Type"];
          } else {
            config.headers["content-type"] = "application/json";
          }
        } catch (err) {
          console.error("[Interceptor Error] Request:", err?.message);
        }
        return config;
      }, error => Promise.reject(error));
    } catch (initErr) {
      console.error("[Constructor Error] Gagal menginisialisasi kelas:", initErr?.message);
    }
  }
  async req(method, path, data = null, token = null) {
    try {
      console.log(`[HTTP] Mengirim ${method.toUpperCase()} ke ${path}`);
      const headers = {};
      if (token) {
        headers["authorization"] = `Bearer ${token}`;
      }
      const res = await this.client({
        method: method,
        url: path,
        data: data,
        headers: headers
      });
      return res?.data || null;
    } catch (err) {
      console.error(`[HTTP Error] ${method.toUpperCase()} ${path} gagal:`, err?.response?.data || err?.message);
      throw err;
    }
  }
  async crd(accessToken) {
    try {
      console.log("[Kredit] Memulai pengecekan kredit dan auto klaim harian...");
      let balance = 0;
      try {
        const claimRes = await this.req("POST", "/api/v2/app/daily-reward", {
          has_subscribe: false
        }, accessToken);
        if (claimRes && claimRes.balance !== undefined) {
          balance = claimRes.balance;
          console.log(`[Kredit] Hadiah harian berhasil diklaim. Kredit saat ini: ${balance}`);
          return balance;
        }
      } catch (claimErr) {
        console.log("[Kredit] Klaim harian dilewati (kemungkinan sudah diklaim hari ini)");
      }
      const walletRes = await this.req("GET", "/api/v2/payments/wallet", null, accessToken);
      balance = walletRes?.balance !== undefined ? walletRes.balance : 0;
      console.log(`[Kredit] Kredit saat ini: ${balance}`);
      return balance;
    } catch (err) {
      console.error("[Kredit Error] Gagal memproses klaim/cek kredit:", err?.message);
      return 0;
    }
  }
  async auth(t) {
    try {
      let creds = null;
      if (t?.access_token || typeof t === "string" && t) {
        console.log("[Auth] Menggunakan token yang sudah ada");
        creds = typeof t === "string" ? {
          access_token: t,
          uuid: ""
        } : {
          ...t
        };
      } else {
        console.log("[Auth] Menjalankan flow login anonim...");
        const extId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const payload = {
          flow: "anon",
          client_parameters: {
            external_id: extId
          },
          flow_parameters: {}
        };
        const res = await this.req("POST", "/api/v2/user/login", payload);
        console.log("[Auth] Login anonim berhasil");
        creds = {
          access_token: res?.access_token || "",
          uuid: res?.uuid || ""
        };
      }
      const balance = await this.crd(creds.access_token);
      creds.balance = balance;
      return creds;
    } catch (err) {
      console.error("[Auth Error] Gagal melakukan autentikasi:", err?.message);
      throw err;
    }
  }
  async ws(uuid, timeout = 15e3) {
    return new Promise((resolve, reject) => {
      try {
        console.log("[WS] Menghubungkan ke WebSocket RomanticAI...");
        const url = "wss://chat.romanticai.com/ws/socket.io/?EIO=4&transport=websocket";
        const chunks = [];
        const cookieString = Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
        const wsClient = new WebSocket(url, {
          headers: {
            Origin: "https://chat.romanticai.com",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
            ...cookieString ? {
              Cookie: cookieString
            } : {}
          }
        });
        const timer = setTimeout(() => {
          try {
            console.log("[WS] Batas waktu tunggu balasan AI terlampaui");
            wsClient.terminate();
            reject(new Error("WS timeout waiting for reply"));
          } catch (timeoutErr) {
            reject(timeoutErr);
          }
        }, timeout);
        wsClient.on("open", () => {
          try {
            console.log("[WS] Koneksi terbuka, mengirim subskripsi...");
          } catch (openErr) {
            reject(openErr);
          }
        });
        wsClient.on("message", data => {
          try {
            const msg = data.toString();
            if (msg.startsWith("0")) {
              wsClient.send(`40/ai_reply,{"tokenId":"${uuid}"}`);
              wsClient.send(`40/user_status,{"tokenId":"${uuid}"}`);
            } else if (msg.startsWith("42/ai_reply,")) {
              console.log("[WS] Mendapatkan data balasan AI");
              const payloadStr = msg.substring("42/ai_reply,".length);
              const parsed = JSON.parse(payloadStr);
              chunks.push(parsed);
              if (parsed?.[0] === "message") {
                clearTimeout(timer);
                wsClient.close();
                resolve({
                  finalMessage: parsed[1],
                  chunks: chunks
                });
              }
            }
          } catch (e) {
            console.error("[WS Message Error] Gagal memproses pesan:", e?.message);
            clearTimeout(timer);
            try {
              wsClient.close();
            } catch (closeErr) {}
            reject(e);
          }
        });
        wsClient.on("error", err => {
          try {
            console.error("[WS Error]", err?.message);
            clearTimeout(timer);
            reject(err);
          } catch (errorErr) {
            reject(errorErr);
          }
        });
        wsClient.on("close", () => {
          try {
            console.log("[WS] Koneksi WebSocket ditutup");
          } catch (closeErr) {}
        });
      } catch (initErr) {
        reject(initErr);
      }
    });
  }
  async chat({
    token,
    prompt,
    messages,
    ...rest
  }) {
    try {
      console.log("[Proses] Memulai alur chat...");
      const creds = await this.auth(token);
      const botId = rest?.botId || rest?.chat_user_id || 5139831;
      if (!prompt && (!messages || messages.length === 0)) {
        throw new Error("Validasi gagal: prompt atau messages wajib disediakan");
      }
      console.log("[Proses] Mengambil informasi model dialog...");
      const modelInfo = await this.req("POST", `/api/v2/bot/${botId}/dialog`, {
        has_subscribe: false
      }, creds?.access_token);
      console.log("[Proses] Mengambil riwayat dialog...");
      const history = await this.req("GET", `/api/v2/dialog/${botId}/history?reverse=true&count=20`, null, creds?.access_token);
      const userMsg = prompt ? prompt : messages?.[messages.length - 1]?.data || "Hai";
      console.log(`[Proses] Mengirim pesan user: "${userMsg}"`);
      const sendRes = await this.req("POST", `/api/v2/dialog/${botId}/message`, {
        has_subscribe: false,
        messages: [{
          messageType: "text",
          data: userMsg
        }]
      }, creds?.access_token);
      let aiReply = null;
      let wsChunks = [];
      if (creds?.uuid) {
        try {
          const wsRes = await this.ws(creds.uuid);
          aiReply = wsRes?.finalMessage || null;
          wsChunks = wsRes?.chunks || [];
        } catch (wsErr) {
          console.log("[Proses] WS gagal atau timeout, beralih ke fallback history polling...");
          let attempts = 0;
          while (attempts < 5 && !aiReply) {
            await new Promise(r => setTimeout(r, 2e3));
            const currentHistory = await this.req("GET", `/api/v2/dialog/${botId}/history?reverse=true&count=5`, null, creds?.access_token);
            const lastMsg = currentHistory?.messages?.[0];
            if (lastMsg?.user?.type === "bot") {
              aiReply = lastMsg;
              wsChunks.push(["message", lastMsg]);
              break;
            }
            attempts++;
          }
        }
      } else {
        console.log("[Proses] UUID tidak ditemukan untuk WS, mengambil pesan terbaru dari riwayat...");
        const updatedHistory = await this.req("GET", `/api/v2/dialog/${botId}/history?reverse=true&count=5`, null, creds?.access_token);
        aiReply = updatedHistory?.messages?.[0];
        if (aiReply) {
          wsChunks.push(["message", aiReply]);
        }
      }
      const finalResult = {
        user_message: sendRes?.messages?.[0] || null,
        ai_reply: aiReply,
        model_info: modelInfo,
        history: history?.messages || [],
        chunks: wsChunks
      };
      return {
        status: "success",
        result: finalResult,
        token: creds
      };
    } catch (err) {
      console.error("[Chat Flow Error]", err?.message);
      return {
        status: "error",
        result: err?.message || "Proses chat gagal",
        token: token
      };
    }
  }
  async image({
    token,
    prompt,
    messages,
    ...rest
  }) {
    try {
      console.log("[Proses] Memulai pembuatan gambar...");
      const creds = await this.auth(token);
      const imagePrompt = prompt || (messages?.[0]?.data || "");
      if (!imagePrompt) {
        throw new Error("Validasi gagal: prompt diperlukan untuk membuat gambar");
      }
      const payload = {
        prompt: imagePrompt,
        is_public: rest?.is_public !== undefined ? rest.is_public : true,
        mode: rest?.mode || "REALISTIC",
        has_subscribe: rest?.has_subscribe || false,
        n_images: rest?.n_images || 4
      };
      const imagesResult = await this.req("POST", "/api/v3/photo-generation/text2img", payload, creds?.access_token);
      return {
        status: "success",
        result: imagesResult,
        token: creds
      };
    } catch (err) {
      console.error("[Image Flow Error]", err?.message);
      return {
        status: "error",
        result: err?.message || "Pembuatan gambar gagal",
        token: token
      };
    }
  }
  async traits({
    token,
    ...rest
  }) {
    try {
      console.log("[Proses] Memulai pembuatan gambar berdasarkan traits...");
      const creds = await this.auth(token);
      const gender = rest?.gender || "female";
      const mode = rest?.mode || "REALISTIC";
      const generationType = rest?.generation_type || "persona";
      const userTraits = rest?.traits || {};
      console.log("[Proses] Mengambil konfigurasi traits dari API...");
      const config = await this.req("GET", `/api/v3/photo-generation/config?gender=${gender}&mode=${mode}&generation_type=${generationType}`, null, creds?.access_token);
      if (!config) {
        throw new Error("Gagal mengambil konfigurasi traits dari API");
      }
      console.log("[Proses] Memvalidasi data traits inputan...");
      for (const [key, value] of Object.entries(userTraits)) {
        const configItem = config[key];
        if (!configItem) {
          throw new Error(`Validasi gagal: Kategori trait "${key}" tidak valid`);
        }
        if (!configItem.options?.includes(value)) {
          throw new Error(`Validasi gagal: Opsi "${value}" untuk trait "${key}" tidak valid. Pilihan yang tersedia: ${configItem.options.join(", ")}`);
        }
      }
      const finalTraits = {
        ...userTraits
      };
      for (const key of Object.keys(config)) {
        if (!finalTraits[key]) {
          finalTraits[key] = config[key]?.options?.[0] || "";
        }
      }
      const payload = {
        is_public: rest?.is_public !== undefined ? rest.is_public : true,
        traits: finalTraits,
        mode: mode,
        gender: gender,
        generation_type: generationType,
        has_subscribe: rest?.has_subscribe || false,
        n_images: rest?.n_images || 4
      };
      const imagesResult = await this.req("POST", "/api/v3/photo-generation/traits2img", payload, creds?.access_token);
      return {
        status: "success",
        result: imagesResult,
        token: creds
      };
    } catch (err) {
      console.error("[Traits Flow Error]", err?.message);
      return {
        status: "error",
        result: err?.message || "Proses traits gagal",
        token: token
      };
    }
  }
  async search({
    token,
    query,
    ...rest
  }) {
    try {
      console.log("[Proses] Menjalankan pencarian bot...");
      const creds = await this.auth(token);
      const searchQuery = query || "";
      if (!searchQuery) {
        throw new Error("Validasi gagal: query pencarian wajib disediakan");
      }
      const payload = {
        nickname: searchQuery,
        limit: rest?.limit || 20,
        offset: rest?.offset || 0
      };
      const searchResult = await this.req("POST", "/api/v2/bot/search", payload, creds?.access_token);
      return {
        status: "success",
        result: searchResult,
        token: creds
      };
    } catch (err) {
      console.error("[Search Flow Error]", err?.message);
      return {
        status: "error",
        result: err?.message || "Pencarian bot gagal",
        token: token
      };
    }
  }
  async category({
    token,
    ...rest
  }) {
    try {
      console.log("[Proses] Menjalankan pengambilan kategori bot...");
      const creds = await this.auth(token);
      const limit = rest?.limit || 20;
      const offset = rest?.offset || 0;
      const categoryResult = await this.req("GET", `/api/v2/bot/categories/priority-list?limit=${limit}&offset=${offset}`, null, creds?.access_token);
      return {
        status: "success",
        result: categoryResult,
        token: creds
      };
    } catch (err) {
      console.error("[Category Flow Error]", err?.message);
      return {
        status: "error",
        result: err?.message || "Pengambilan kategori gagal",
        token: token
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["chat", "image", "traits", "search", "category"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          chat: "/?action=chat&prompt=Halo+Ava&botId=5139831",
          image: "/?action=image&prompt=beautiful+girl",
          traits: "/?action=traits&traits[Hair Color]=Blonde&traits[Figure]=Slim",
          search: "/?action=search&query=Ava",
          category: "/?action=category&limit=5"
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
  const api = new RomanticAI();
  try {
    let response;
    switch (action) {
      case "chat":
        if (!params.prompt && (!params.messages || params.messages.length === 0)) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' atau array 'messages' wajib disediakan untuk action 'chat'.",
            example: "/?action=chat&prompt=Halo+Ava&botId=5139831"
          });
        }
        response = await api.chat(params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'image'.",
            example: "/?action=image&prompt=beautiful+girl"
          });
        }
        response = await api.image(params);
        break;
      case "traits":
        if (!params.traits || typeof params.traits !== "object") {
          return res.status(400).json({
            status: false,
            error: "Parameter 'traits' (objek opsi trait) wajib diisi untuk action 'traits'.",
            example: {
              action: "traits",
              traits: {
                "Hair Color": "Blonde",
                Figure: "Slim"
              }
            }
          });
        }
        response = await api.traits(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' (pencarian nama bot) wajib diisi untuk action 'search'.",
            example: "/?action=search&query=Ava"
          });
        }
        response = await api.search(params);
        break;
      case "category":
        response = await api.category(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari sistem target. Silakan coba kembali nanti."
      });
    }
    return res.status(200).json({
      status: response.status === "success",
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server api route atau website target.",
      error: error.message || "Unknown Error"
    });
  }
}