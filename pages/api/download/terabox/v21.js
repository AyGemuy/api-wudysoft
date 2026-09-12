import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
class FlowVideo {
  constructor() {
    this.base = "https://flowvideoplayer.com";
    this.cookies = {};
    this.csrf = "";
    this.fp = this._gfp();
    this.secHeaders = this._gsh(this.fp);
    this.client = axios.create({
      baseURL: this.base,
      headers: {
        accept: "application/json",
        "accept-language": this.fp.lang || "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: this.base,
        pragma: "no-cache",
        priority: "u=1, i",
        referer: this.base + "/",
        "user-agent": this.fp.ua,
        ...this.secHeaders
      }
    });
    this.client.interceptors.response.use(res => {
      try {
        (res.headers["set-cookie"] || []).forEach(c => {
          const raw = c.split(";")[0] || "";
          const eq = raw.indexOf("=");
          if (eq !== -1) this.cookies[raw.substring(0, eq).trim()] = raw.substring(eq + 1).trim();
        });
      } catch (e) {
        console.log("[Error] Cookie interceptor:", e.message);
      }
      return res;
    }, err => Promise.reject(err));
    this.client.interceptors.request.use(config => {
      try {
        const cookieStr = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
        if (cookieStr) config.headers["cookie"] = cookieStr;
        if (this.csrf) config.headers["x-csrf-token"] = this.csrf;
      } catch (e) {
        console.log("[Error] Request interceptor:", e.message);
      }
      return config;
    }, err => Promise.reject(err));
  }
  _gfp() {
    try {
      const os = ["Win", "Mac", "And"][crypto.randomInt(0, 3)];
      const cpu = [4, 8, 12, 16][crypto.randomInt(0, 4)];
      const memory = [4, 8, 16, 32][crypto.randomInt(0, 4)];
      const lang = ["id-ID", "en-US"][crypto.randomInt(0, 2)];
      const backup_token = crypto.randomBytes(32).toString("hex");
      let ua = "",
        platform = "",
        vendor = "Google Inc.",
        webgl_vendor = "",
        webgl_renderer = "",
        touch = 0;
      if (os === "Win") {
        platform = "Win32";
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";
        webgl_vendor = "Google Inc. (NVIDIA)";
        webgl_renderer = `ANGLE (NVIDIA, NVIDIA GeForce RTX ${crypto.randomInt(30, 50)}60 Direct3D11 vs_5_0 ps_5_0)`;
        touch = crypto.randomInt(0, 2) * 10;
      } else if (os === "Mac") {
        platform = "MacIntel";
        vendor = "Apple Computer, Inc.";
        ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";
        webgl_vendor = "Apple Inc.";
        webgl_renderer = `ANGLE (Apple, Apple M${crypto.randomInt(1, 4)}, OpenGL ES 3.0)`;
      } else {
        platform = "Linux armv81";
        ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
        webgl_vendor = "Google Inc. (Qualcomm)";
        webgl_renderer = `ANGLE (Qualcomm, Adreno (TM) ${crypto.randomInt(610, 740)}, OpenGL ES 3.2)`;
        touch = crypto.randomInt(1, 11);
      }
      return {
        cpu: cpu,
        memory: memory,
        touch: touch,
        platform: platform,
        lang: lang,
        vendor: vendor,
        webgl_vendor: webgl_vendor,
        webgl_renderer: webgl_renderer,
        ua: ua,
        backup_token: backup_token
      };
    } catch (e) {
      console.log("[Error] Generate FP:", e.message);
      return {};
    }
  }
  _gsh(fp) {
    try {
      const isWin = fp.platform?.includes("Win");
      const isMac = fp.platform?.includes("Mac");
      return {
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Google Chrome";v="127"',
        "sec-ch-ua-mobile": isWin || isMac ? "?0" : "?1",
        "sec-ch-ua-platform": isWin ? '"Windows"' : isMac ? '"macOS"' : '"Android"'
      };
    } catch (e) {
      console.log("[Error] Generate Sec-Headers:", e.message);
      return {};
    }
  }
  _ext(html) {
    try {
      const $ = cheerio.load(html);
      return $("meta").map((_, el) => $(el).attr("name") === "csrf-token" ? $(el).attr("content") : null).get().find(v => v);
    } catch (e) {
      console.log("[Error] Ext CSRF:", e.message);
      return null;
    }
  }
  async _auto() {
    try {
      console.log("[Proses] Init session...");
      const res = await this.client.get("/");
      this.csrf = this._ext(res.data) || "";
      console.log(`[Proses] CSRF: ${this.csrf ? "Success" : "Failed"}`);
      console.log("[Proses] Init device...");
      const initRes = await this.client.post("/device/init", this.fp, {
        headers: {
          "x-requested-with": "XMLHttpRequest"
        }
      });
      console.log("[Proses] Device status:", initRes.data?.message || "Done");
      return initRes.data;
    } catch (e) {
      console.log("[Error] Auto init failed:", e.message);
      throw e;
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log("[Proses] Start download process...");
      if (!this.csrf) await this._auto();
      let target = url || rest.surl || "";
      if (target && !target.startsWith("http")) target = `https://www.terabox.app/wap/share/filelist?surl=${target}`;
      console.log(`[Proses] Searching: ${target}`);
      const searchRes = await this.client.post("/telegram/bot/search/video", {
        url: target
      }, {
        headers: {
          "x-requested-with": "XMLHttpRequest"
        }
      });
      console.log("[Proses] Completed.");
      return searchRes.data || {};
    } catch (e) {
      console.log("[Error] Download failed:", e.response?.data || e.message);
      throw e;
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
  const api = new FlowVideo();
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