import axios from "axios";
import crypto from "node:crypto";
class FastDL {
  constructor() {
    this.storage = [{
      host: "fastdl.app",
      key: "792525efde6d921d6055a5d62dcebd39c8b5364e99fa87c5adf0e89391266d9c",
      ts: {
        _ts: 1773148641059,
        _tsc: 0,
        _sv: 2
      }
    }];
  }
  sig(data, key) {
    console.log("[LOG] Signing...");
    const t = Date.now();
    const s = crypto.createHmac("sha256", Buffer.from(key, "hex")).update(data + t).digest("hex");
    return {
      t: t,
      s: s
    };
  }
  async download({
    url,
    host
  }) {
    try {
      const selectedHost = host || this.storage[0]?.host || "";
      const config = this.storage.find(i => i.host === selectedHost) || this.storage[0];
      const val = url || "";
      const isU = val.startsWith("https://") || false;
      const api = `https://api-wh.${config.host}/api/${isU ? "convert" : "v1/instagram/userInfo"}`;
      console.log(`[LOG] Request to ${config.host}: ${val}`);
      const h = {
        Origin: `https://${config.host}`,
        Referer: `https://${config.host}/`
      };
      let b, opt = {
        headers: h
      };
      if (isU) {
        const {
          t,
          s
        } = this.sig(val, config.key);
        b = new URLSearchParams({
          sf_url: val,
          ts: String(t),
          ...config.ts,
          _s: s
        }).toString();
        opt.headers["Content-Type"] = "application/x-www-form-urlencoded";
      } else {
        const p = {
          username: val
        };
        const {
          t,
          s
        } = this.sig(JSON.stringify(p), config.key);
        b = {
          ...p,
          ts: t,
          ...config.ts,
          _s: s
        };
      }
      const res = await axios.post(api, b, opt);
      return res?.data || {
        status: false,
        msg: "Empty"
      };
    } catch (e) {
      console.error("[ERR]", e?.response?.data || e.message || "Error");
      return null;
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
  const api = new FastDL();
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