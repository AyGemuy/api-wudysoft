import axios from "axios";
import crypto from "crypto";
class TempMail {
  constructor() {
    this.domains = ["@gmail10p.com", "@oletters.com", "@oemails.com", "@oegmail.com", "@suiemail.com", "@voewo.com", "@yanemail.com"];
    this.baseUrl = "https://mail-server.1timetech.com/api/email";
    this.headers = {
      "User-Agent": "okhttp/4.9.2",
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "x-app-key": "f07bed4503msh719c2010df3389fp1d6048jsn411a41a84a3c",
      Connection: "Keep-Alive"
    };
  }
  _enc(obj) {
    try {
      const str = JSON.stringify(obj);
      return Buffer.from(str, "utf-8").toString("base64").split("").reverse().join("");
    } catch (e) {
      console.error("[LOG ERROR _enc]", e.message);
      return "";
    }
  }
  _dec(str) {
    try {
      const rev = String(str || "").split("").reverse().join("");
      return JSON.parse(Buffer.from(rev, "base64").toString("utf-8"));
    } catch (e) {
      console.error("[LOG ERROR _dec]", e.message);
      return {};
    }
  }
  _snake(obj) {
    try {
      if (Array.isArray(obj)) return obj.map(v => this._snake(v));
      if (obj !== null && typeof obj === "object") {
        return Object.keys(obj).reduce((acc, key) => {
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          acc[snakeKey] = this._snake(obj[key]);
          return acc;
        }, {});
      }
      return obj;
    } catch (e) {
      console.error("[LOG ERROR _snake]", e.message);
      return obj;
    }
  }
  _ai(min, max) {
    return min + crypto.randomInt(max - min + 1);
  }
  _asu() {
    const kon = "bdjklmnprst";
    const vok = "aiueo";
    return kon[this._ai(0, kon.length - 1)] + vok[this._ai(0, vok.length - 1)];
  }
  _an() {
    const suku = this._ai(2, 8);
    let nama = "";
    for (let i = 0; i < suku; i++) nama += this._asu();
    return nama.charAt(0).toUpperCase() + nama.slice(1);
  }
  async create({
    name,
    ...rest
  } = {}) {
    try {
      console.log("[PROSES] Memulai pembuatan email baru...");
      const fixName = name || this._an().toLowerCase() + this._ai(100, 1e3);
      const fixDomain = this.domains[this._ai(0, this.domains.length - 1)];
      const email = `${fixName}${fixDomain}`;
      console.log(`[PROSES] Mengirim request email target: ${email}`);
      const payload = this._enc({
        email: email,
        ...rest
      });
      const response = await axios.post(this.baseUrl, {
        data: payload
      }, {
        headers: this.headers
      });
      console.log("[PROSES] Menerima respons server, mendekripsi data...");
      const rawDecoded = this._dec(response.data?.data);
      const result = this._snake(rawDecoded);
      return {
        status: true,
        result: result
      };
    } catch (error) {
      console.error("[ERROR] Gagal pada fungsi async create:", error.message);
      return {
        status: false,
        result: error?.response?.data || error.message
      };
    }
  }
  async message({
    email,
    ...rest
  } = {}) {
    try {
      console.log(`[PROSES] Memulai pengecekan kotak masuk untuk: ${email}`);
      const safeEmail = (email || "").replace(/@/g, "_").replace(/\./g, "_");
      const params = this._enc({});
      const listUrl = `${this.baseUrl}/${safeEmail}/messages?params=${params}`;
      console.log("[PROSES] Mengambil list inbox...");
      const listRes = await axios.get(listUrl, {
        headers: this.headers
      });
      const messages = this._dec(listRes.data?.data || "[]");
      console.log(`[PROSES] Berhasil menemukan ${messages?.length || 0} pesan. Melakukan for-of detail...`);
      const fullMessages = [];
      for (const msg of messages) {
        const id = msg?.id;
        if (!id) continue;
        console.log(`[PROSES] Mengambil detail isi pesan ID: ${id}`);
        const detailUrl = `${this.baseUrl}/${safeEmail}/messages/${id}?params=${params}`;
        const detailRes = await axios.get(detailUrl, {
          headers: this.headers
        });
        const detailDecoded = this._dec(detailRes.data?.data);
        fullMessages.push(detailDecoded);
      }
      console.log("[PROSES] Seluruh detail pesan berhasil diambil, mengubah ke format snake_case...");
      const result = this._snake(fullMessages);
      return {
        status: true,
        result: result
      };
    } catch (error) {
      console.error("[ERROR] Gagal pada fungsi async message:", error.message);
      return {
        status: false,
        result: error?.response?.data || error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["domain", "create", "message"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: "/?action=create atau /?action=message&email=contoh@domain.com"
    });
  }
  const api = new TempMail();
  try {
    let response;
    switch (action) {
      case "create":
        response = await api.create(params);
        break;
      case "message":
        if (!params.email) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'email' wajib diisi untuk action 'message'."
          });
        }
        response = await api.message(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      action: action,
      status: true,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada target API.",
      error: error.message || "Unknown Error"
    });
  }
}