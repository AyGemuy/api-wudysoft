import axios from "axios";
import crypto from "crypto";
class HiTube {
  constructor() {
    this.pub = "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDCAdf/EyIbLBxjGqmh7qLU6/CPCzru+75+82OSPZ+nf4BFvg88drpZ6KigNW0J8TNgxe6Yms1irCZNVDyu+RXsl4y/7c2KOHc4OGTzHB5fUMiMasFUvcEs2P70e6yA/sKHZfBLG1XPhlb84Ibs3nhD3W5e2SuC+4EuVkaqzN08LQIDAQAB";
    this.client = axios.create({
      timeout: 6e4,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://www.hitube.io",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.hitube.io/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  _sess() {
    try {
      const ch = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let str = "";
      for (let i = 0; i < 10; i++) {
        str += ch.charAt(Math.floor(Math.random() * ch.length));
      }
      return `hitube.io_${str}_${Date.now()}`;
    } catch (err) {
      return err;
    }
  }
  _enc(txt) {
    try {
      const key = `-----BEGIN PUBLIC KEY-----\n${this.pub}\n-----END PUBLIC KEY-----`;
      const buf = Buffer.from(txt);
      return crypto.publicEncrypt({
        key: key,
        padding: crypto.constants.RSA_PKCS1_PADDING
      }, buf).toString("base64");
    } catch (err) {
      return err;
    }
  }
  _route(url) {
    try {
      const tgt = url || "";
      if (/tiktok\.com/i.test(tgt)) return {
        base: "https://api.hitube.io",
        path: "/st-tik/tiktok/dl"
      };
      if (/instagram\.com/i.test(tgt)) return {
        base: "https://api.hitube.io",
        path: "/st-tik/ins/dl"
      };
      if (/facebook\.com|fb\.watch/i.test(tgt)) return {
        base: "https://api.hitube.io",
        path: "/st-tik-video/fb/dl"
      };
      if (/x\.com|twitter\.com/i.test(tgt)) return {
        base: "https://api.twikite.com",
        path: "/st-tik/x/dl2"
      };
      if (/pinterest\.com|pin\.it/i.test(tgt)) return {
        base: "https://api.pinpea.com",
        path: "/st-tik/pinterest/dl"
      };
      return null;
    } catch (err) {
      return err;
    }
  }
  _snake(obj, tk, suf) {
    try {
      if (Array.isArray(obj)) return obj.map(v => this._snake(v, tk, suf));
      if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((res, k) => {
          const sk = k.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2").toLowerCase();
          res[sk] = this._snake(obj[k], tk, suf);
          return res;
        }, {});
      }
      if (typeof obj === "string" && obj.startsWith("eyJ")) {
        return `${tk}${obj}${suf}`;
      }
      return obj;
    } catch (err) {
      return err;
    }
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`[PROSES] Inisiasi: ${url}`);
    try {
      const rt = this._route(url);
      if (!rt || rt instanceof Error) throw new Error("Platform tidak didukung.");
      console.log(`[PROSES] Target -> Base: ${rt.base} | Path: ${rt.path}`);
      const ss = rest.sessionid || this._sess();
      if (ss instanceof Error) throw ss;
      const qp = {
        url: url,
        sessionid: ss,
        ...rest
      };
      const ts = Date.now().toString();
      const sh = this._enc(ts);
      if (sh instanceof Error) throw sh;
      console.log("[PROSES] Sending request...");
      const res = await this.client.get(rt.path, {
        baseURL: rt.base,
        params: qp,
        headers: {
          "x-secure-message": sh
        }
      });
      const data = res?.data;
      const code = data?.code !== undefined ? data.code : null;
      if (code === 200 || data?.success === true) {
        const segment = rt.path.split("/")[1];
        const tk = `${rt.base}/${segment}/token/`;
        const suf = `?sessionid=${ss}&wh=www.hitube.io`;
        const fData = this._snake(data, tk, suf);
        if (fData instanceof Error) throw fData;
        return fData;
      } else {
        throw new Error(data?.msg || "Gagal ekstrak konten.");
      }
    } catch (err) {
      console.error(`[ERROR] Gagal: ${err?.message || err}`);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new HiTube();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}