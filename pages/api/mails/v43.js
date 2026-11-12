import axios from "axios";
class AiMail {
  constructor() {
    this.base = "https://tempmailbackend.projonmoit.ltd";
    this.ua = "AiMail/1.0.0 (Android; Dart/3.3)";
    this.client = axios.create({
      baseURL: this.base,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": this.ua
      }
    });
  }
  _snake(obj) {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => this._snake(item));
    }
    if (typeof obj === "object" && obj.constructor === Object) {
      const result = {};
      for (const key of Object.keys(obj)) {
        const snakeKey = key.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/@/g, "at_").toLowerCase();
        result[snakeKey] = this._snake(obj[key]);
      }
      return result;
    }
    return obj;
  }
  async _req({
    method,
    url,
    data = null,
    headers = {},
    expected = [200, 201]
  }) {
    try {
      const res = await this.client({
        method: method,
        url: url,
        data: data,
        headers: headers,
        validateStatus: () => true
      });
      if (!expected.includes(res.status)) {
        const msg = res.data?.message || res.data?.error || res.data?.detail || "Kesalahan respon API.";
        throw new Error(`API Error [${res.status}]: ${msg}`);
      }
      if (res.data?.success === false || res.data?.status === false) {
        const msg = res.data?.message || res.data?.error || "Operasi API tidak berhasil.";
        throw new Error(`API Error: ${msg}`);
      }
      return {
        status: true,
        result: res.data
      };
    } catch (e) {
      console.error(`[AiMail][ERR] Request '${url}' gagal:`, e.message);
      return {
        status: false,
        result: e.message
      };
    }
  }
  async domains() {
    console.log("[AiMail] Menjalankan 'domains' (auto filter free)...");
    try {
      const res = await this._req({
        method: "GET",
        url: "/public/domains"
      });
      if (!res.status) {
        return {
          status: false,
          result: res.result
        };
      }
      const list = Array.isArray(res.result) ? res.result : res.result?.domains || [];
      const freeDomains = list.filter(d => {
        const isFree = (d.type || "").toLowerCase() === "free";
        const isActive = d.is_active ?? d.isActive ?? true;
        return isFree && isActive;
      });
      return {
        status: true,
        result: this._snake(freeDomains)
      };
    } catch (e) {
      console.error("[AiMail][ERR] domains:", e.message);
      return {
        status: false,
        result: e.message
      };
    }
  }
  async create({
    email = "",
    address = "",
    name = "",
    username = "",
    domain = ""
  } = {}) {
    console.log("[AiMail] Menjalankan 'create'...");
    try {
      const customEmail = (email || address || "").trim();
      if (customEmail && customEmail.includes("@")) {
        console.log(`[AiMail] Email manual disetel: ${customEmail}`);
        return {
          status: true,
          result: this._snake({
            email: customEmail,
            address: customEmail
          })
        };
      }
      const user = (username || name || "").trim();
      if (user) {
        let dom = (domain || "").trim().replace(/^@+/, "");
        if (!dom) {
          console.log("[AiMail] Mengambil domain 'free' acak...");
          const domRes = await this.domains();
          const list = domRes.result || [];
          if (!domRes.status || list.length === 0) {
            throw new Error("Gagal mengambil daftar free domain untuk custom email.");
          }
          const random = list[Math.floor(Math.random() * list.length)];
          dom = random.name || random.domain || random;
        }
        const createdEmail = `${user}@${dom}`;
        console.log(`[AiMail] Custom email dibuat: ${createdEmail}`);
        return {
          status: true,
          result: this._snake({
            email: createdEmail,
            address: createdEmail
          })
        };
      }
      console.log("[AiMail] Melakukan generate mailbox otomatis...");
      const res = await this._req({
        method: "POST",
        url: "/public/mailboxes/generate",
        data: {}
      });
      if (!res.status) {
        return {
          status: false,
          result: res.result
        };
      }
      const addr = res.result?.address || null;
      if (!addr || typeof addr !== "string" || !addr.includes("@")) {
        throw new Error("Alamat email dari respons generate tidak valid.");
      }
      console.log(`[AiMail] Mailbox berhasil digenerate: ${addr}`);
      return {
        status: true,
        result: this._snake({
          ...res.result,
          email: addr
        })
      };
    } catch (e) {
      console.error("[AiMail][ERR] create:", e.message);
      return {
        status: false,
        result: e.message
      };
    }
  }
  async message({
    email = "",
    address = "",
    id = ""
  } = {}) {
    console.log("[AiMail] Menjalankan 'message'...");
    try {
      const targetEmail = (email || address || "").trim();
      if (!targetEmail) {
        throw new Error("Parameter 'email' wajib diisi.");
      }
      console.log(`[AiMail] Mengambil pesan untuk: ${targetEmail}`);
      const res = await this._req({
        method: "GET",
        url: `/public/messages/${encodeURIComponent(targetEmail)}`
      });
      if (!res.status) {
        return {
          status: false,
          result: res.result
        };
      }
      const raw = res.result;
      const list = Array.isArray(raw) ? raw : raw?.messages || raw?.["hydra:member"] || [];
      const msgId = (id || "").trim();
      if (msgId) {
        const found = list.find(m => m.id === msgId || m.message_id === msgId || m.messageId === msgId);
        if (found) {
          return {
            status: true,
            result: this._snake(found)
          };
        }
        throw new Error(`Pesan dengan ID '${msgId}' tidak ditemukan.`);
      }
      console.log(`[AiMail] Berhasil memuat ${list.length} pesan.`);
      return {
        status: true,
        result: this._snake(list)
      };
    } catch (e) {
      console.error("[AiMail][ERR] message:", e.message);
      return {
        status: false,
        result: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const valid = ["domains", "create", "message"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid
    });
  }
  const api = new AiMail();
  try {
    let response;
    switch (action) {
      case "domains":
        response = await api.domains();
        break;
      case "create":
        response = await api.create(params);
        break;
      case "message":
        response = await api.message(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}`,
          valid_actions: valid
        });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Gagal pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal.",
      error: error.message || "Unknown Error"
    });
  }
}