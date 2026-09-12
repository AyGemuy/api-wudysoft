import axios from "axios";
class TopUpNet {
  constructor() {
    this.baseUrl = "https://gobackend.topupnet.com";
    this.cookies = new Map();
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://topupnet.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://topupnet.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.client.interceptors.request.use(config => {
      try {
        const cookieStr = Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
        config.headers = config?.headers || {};
        if (cookieStr) config.headers["cookie"] = cookieStr;
      } catch (err) {
        console.log("[Warn Req Interceptor]:", err?.message || err);
      }
      return config;
    });
    this.client.interceptors.response.use(res => {
      try {
        const rawCookies = res?.headers?.["set-cookie"] || [];
        rawCookies.forEach(c => {
          const [pair] = (c || "").split(";");
          const [key, ...val] = (pair || "").split("=");
          if (key?.trim() && val?.length) {
            this.cookies.set(key.trim(), val.join("=").trim());
          }
        });
      } catch (err) {
        console.log("[Warn Res Interceptor]:", err?.message || err);
      }
      return res;
    });
  }
  _toSnake(str) {
    try {
      return (str || "").replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[-\s]+/g, "_").toLowerCase();
    } catch (err) {
      console.log("[Error _toSnake]:", err?.message || err);
      return str;
    }
  }
  _parse(val) {
    try {
      if (typeof val === "string") {
        const trimmed = val ? val.trim() : "";
        if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
          return this._fmt(JSON.parse(trimmed));
        }
        if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
          return `https://topupnet.com${trimmed}`;
        }
      }
      return val;
    } catch {
      return val;
    }
  }
  _fmt(data) {
    try {
      if (Array.isArray(data)) {
        return data.map(item => this._fmt(item));
      }
      if (data !== null && typeof data === "object") {
        const result = {};
        for (const [key, val] of Object.entries(data)) {
          const snakeKey = this._toSnake(key);
          result[snakeKey] = this._fmt(this._parse(val));
        }
        return result;
      }
      return this._parse(data);
    } catch (err) {
      console.log("[Error _fmt]:", err?.message || err);
      return data;
    }
  }
  async search({
    uid,
    ...rest
  }) {
    try {
      const targetUid = uid ? String(uid).trim() : "";
      if (!targetUid) throw new Error("UID wajib diisi");
      console.log(`[Process] Mengambil data player TopUpNet untuk UID: ${targetUid}`);
      const payload = {
        uid: targetUid,
        ...rest
      };
      const res = await this.client.post("/api/tools/get-player-info", payload);
      console.log("[Success] Data player berhasil diterima, memformat output...");
      return {
        status: true,
        result: this._fmt(res?.data || {})
      };
    } catch (err) {
      console.log("[Error Search]:", err?.response?.data || err?.message || err);
      return {
        status: false,
        result: err?.response?.data || err?.message || "Failed to fetch player info from TopUpNet"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.uid) {
    return res.status(400).json({
      error: "Parameter 'uid' diperlukan"
    });
  }
  const api = new TopUpNet();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}