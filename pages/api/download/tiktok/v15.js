import axios from "axios";
import crypto from "crypto";
class SnapTik {
  constructor(cfg = {}) {
    this.base = cfg.base_url || "https://snaptik.app";
    this.jar = new Map();
    const headers = {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...cfg.headers || {}
    };
    this.cli = axios.create({
      baseURL: this.base,
      headers: headers,
      maxRedirects: 5
    });
    this.cli.interceptors.request.use(req => {
      const cookies = Array.from(this.jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
      if (cookies) req.headers["cookie"] = cookies;
      return req;
    });
    this.cli.interceptors.response.use(res => {
      const setCookie = res.headers["set-cookie"];
      if (setCookie) {
        setCookie.forEach(cookie => {
          const [pair] = cookie.split(";");
          const [key, ...val] = pair.split("=");
          if (key) this.jar.set(key.trim(), val.join("=").trim());
        });
      }
      return res;
    });
  }
  _r(s, r = null) {
    return {
      status: Boolean(s),
      result: r
    };
  }
  _l(m) {
    console.log(`[SnapTik] ${m}`);
  }
  _sc(obj) {
    try {
      if (Array.isArray(obj)) return obj.map(i => this._sc(i));
      if (obj !== null && typeof obj === "object") {
        return Object.keys(obj).reduce((acc, k) => {
          const sk = k.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
          acc[sk] = this._sc(obj[k]);
          return acc;
        }, {});
      }
      return obj;
    } catch (err) {
      this._l(`SnakeCase error: ${err.message}`);
      return obj;
    }
  }
  _key() {
    try {
      const l = String.fromCharCode(115, 110, 52, 112);
      const s = [..."s0j^"].map(c => String.fromCharCode(c.charCodeAt(0) + 1)).join("");
      const n = Buffer.from("djNyMQ==", "base64").toString();
      return l + s + n + "fy20" + String.fromCharCode(50, 54);
    } catch (err) {
      this._l(`Key generation error: ${err.message}`);
      throw err;
    }
  }
  _math(t) {
    try {
      const m = {
        b: () => (t.a ^ t.b) >> t.s & 255,
        r: () => t.n.reduce((h, f) => h + f, 0) * 2 + 1,
        c: () => t.w.charCodeAt(t.i) * t.m,
        m: () => (t.a + t.b) % 100 * t.c,
        n: () => t.a * t.b + t.b * t.c + t.c * t.a - t.a
      };
      if (!m[t.t]) throw new Error("Unknown challenge");
      return m[t.t]();
    } catch (err) {
      this._l(`Math challenge error: ${err.message}`);
      throw err;
    }
  }
  async _dec(id, dat) {
    try {
      const buf = Buffer.from(dat, "base64");
      const key = crypto.createHash("sha256").update(`${this._key()}:${id}`).digest();
      const dec = crypto.createDecipheriv("aes-256-cbc", key, buf.subarray(0, 16));
      return Buffer.concat([dec.update(buf.subarray(16)), dec.final()]).toString();
    } catch (err) {
      this._l(`Decryption error: ${err.message}`);
      throw err;
    }
  }
  async _sol(id, p) {
    try {
      const {
        _e: exp,
        _h: hash,
        ...rest
      } = JSON.parse(await this._dec(id, p));
      return `${id}:${this._math(rest)}:${exp}:${hash}`;
    } catch (err) {
      this._l(`Solution solver error: ${err.message}`);
      throw err;
    }
  }
  async _init() {
    try {
      this._l("Initializing session from root page...");
      const res = await this.cli.get("/", {
        headers: {
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        }
      });
      const redirectPath = res.request?.res?.responseUrl || "/";
      this._l(`Session established. Path: ${redirectPath}`);
      return redirectPath;
    } catch (err) {
      this._l(`Warning: Root initialization failed (${err.message}), using default /`);
      return "/";
    }
  }
  async _o(url) {
    try {
      this._l("Fetching TikTok oEmbed data...");
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const {
        data
      } = await axios.get(oembedUrl, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          origin: this.base,
          referer: `${this.base}/`,
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      return data || {};
    } catch (err) {
      this._l(`Warning: Failed to fetch oEmbed details (${err.message})`);
      return {};
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      this._l("Starting extraction process...");
      const targetUrl = url || rest?.link || "";
      if (!targetUrl) {
        this._l("Error: Missing target URL parameter.");
        return this._r(false, {
          error: "Parameter url wajib diisi"
        });
      }
      const currentPath = await this._init();
      this._l("Requesting API token...");
      const {
        data: tokRes
      } = await this.cli.post("/api/token", {}, {
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          origin: this.base,
          referer: `${this.base}${currentPath}`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      const tokenId = tokRes?.id || "";
      const payload = tokRes?.p || "";
      if (!tokenId || !payload) {
        this._l("Failed to acquire API token/payload.");
        return this._r(false, {
          error: "Gagal mendapatkan token verifikasi"
        });
      }
      this._l(`Auto-solving challenge for token ID: ${tokenId}`);
      const verifyToken = await this._sol(tokenId, payload);
      this._l(`Extracting media from URL: ${targetUrl}`);
      const {
        data: extRes
      } = await this.cli.get("/api/extract", {
        params: {
          url: targetUrl,
          ...rest
        },
        headers: {
          accept: "*/*",
          referer: `${this.base}${currentPath}`,
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
          "x-verify": verifyToken
        }
      });
      const d = extRes?.data || extRes;
      if (!d || !d.id && !d.downloadUrl) {
        this._l("Failed to extract media data.");
        return this._r(false, {
          error: extRes?.error || "Gagal mengekstrak data media"
        });
      }
      let directHdUrl = "";
      let hdToken = d?.hdToken || d?.token || "";
      if (!hdToken && d?.hdDownloadUrl) {
        const tokenMatch = d.hdDownloadUrl.match(/[?&]token=([^&]+)/);
        if (tokenMatch) {
          hdToken = tokenMatch[1];
        }
      }
      if (hdToken) {
        this._l(`HD token found: ${hdToken}. Requesting direct HD download link...`);
        try {
          const {
            data: hdRes
          } = await this.cli.get("/api/hd", {
            params: {
              token: hdToken
            },
            headers: {
              accept: "*/*",
              referer: `${this.base}${currentPath}`,
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "same-origin",
              "x-requested-with": "XMLHttpRequest",
              "x-verify": verifyToken
            }
          });
          if (hdRes && !hdRes.error && hdRes.url) {
            this._l("Direct HD download link successfully fetched!");
            directHdUrl = hdRes.url;
          } else {
            this._l(`Failed to fetch HD link: ${hdRes?.error || "Unknown error"}`);
          }
        } catch (hdErr) {
          this._l(`Warning: Unable to resolve direct HD link (${hdErr.message})`);
        }
      }
      const data = await this._o(targetUrl);
      const parsedResult = this._sc({
        ...d,
        ...data,
        hdDownloadUrl: d?.hdDownloadUrl ? d.hdDownloadUrl.startsWith("http") ? d.hdDownloadUrl : `${this.base}${d.hdDownloadUrl}` : "",
        directHdUrl: directHdUrl
      });
      this._l("Extraction successfully completed!");
      return this._r(true, parsedResult);
    } catch (err) {
      this._l(`Execution error: ${err?.message || err}`);
      return this._r(false, {
        error: err?.response?.data?.error || err?.response?.data?.message || err?.message || "Terjadi kesalahan internal server"
      });
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
  const api = new SnapTik();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}