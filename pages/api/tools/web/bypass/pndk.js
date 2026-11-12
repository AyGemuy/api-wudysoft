import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class Bypasser {
  constructor() {
    this.timeout = 3e4;
    this.verbose = true;
    this.jar = new CookieJar();
    this.finalUrl = null;
    this.http = wrapper(axios.create({
      timeout: this.timeout,
      maxRedirects: 5,
      jar: this.jar,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    }));
    this.http.interceptors.response.use(res => {
      this.finalUrl = res.request?.res?.responseUrl || res.config?.url;
      return res;
    }, err => Promise.reject(err));
  }
  log(m, type = "INFO") {
    if (this.verbose) {
      console.log(`[${new Date().toLocaleTimeString()}] [${type}] ${m}`);
    }
  }
  dec(url) {
    try {
      if (!url) return null;
      const urlObj = new URL(url);
      const sid = urlObj.searchParams.get("shortid");
      if (!sid) return null;
      const decoded = Buffer.from(sid, "base64").toString("utf8");
      return decoded.startsWith("http") ? decoded : null;
    } catch (e) {
      return null;
    }
  }
  ext(data) {
    try {
      if (!data) return null;
      const m = data.serverMemo?.data;
      if (m) {
        const keys = ["redirectLink", "redirectLink2", "randomLink", "link", "nextLink"];
        for (const k of keys)
          if (m[k]?.startsWith("http")) return m[k];
      }
      const emits = data.effects?.emits || [];
      for (const e of emits) {
        if ((e.event === "setLink" || e.event === "redirect") && e.params?.[0]) return e.params[0];
      }
    } catch (e) {}
    return null;
  }
  async run(url) {
    try {
      this.log(`Fetching: ${url}`);
      const {
        data: html
      } = await this.http.get(url);
      const $ = cheerio.load(html);
      const wire = $("[wire\\:initial-data]").first();
      if (!wire.length) return {
        type: "done",
        data: this.finalUrl || url
      };
      let state = JSON.parse(wire.attr("wire:initial-data"));
      const origin = new URL(this.finalUrl || url).origin;
      const cookies = await this.jar.getCookies(this.finalUrl || url);
      const xsrf = cookies.find(c => c.key === "XSRF-TOKEN")?.value;
      for (let p = 0; p < 6; p++) {
        const phase = state.serverMemo?.data?.phase || p + 1;
        const ev = phase >= 3 ? "getData" : "changePhase";
        this.log(`Step: ${phase} | Event: ${ev}`);
        const {
          data: lw
        } = await this.http.post(`${origin}/livewire/message/pages.show`, {
          fingerprint: state.fingerprint,
          serverMemo: state.serverMemo,
          checksum: state.checksum,
          updates: [{
            type: "fireEvent",
            payload: {
              id: state.fingerprint.id,
              event: ev,
              params: []
            }
          }]
        }, {
          headers: {
            "X-Livewire": "true",
            "X-XSRF-TOKEN": decodeURIComponent(xsrf || ""),
            Referer: this.finalUrl || url,
            "Content-Type": "application/json"
          }
        });
        state.serverMemo = lw.serverMemo || state.serverMemo;
        state.checksum = lw.checksum || state.checksum;
        const found = this.ext(lw);
        if (found) return {
          type: "next",
          data: found
        };
        if (!lw.effects?.html) break;
        await new Promise(r => setTimeout(r, 1e3));
      }
      return {
        type: "done",
        data: this.finalUrl || url
      };
    } catch (e) {
      this.log(`Run Error: ${e.message}`, "ERR");
      return {
        type: "done",
        data: url
      };
    }
  }
  async solve({
    url
  }) {
    const startTime = Date.now();
    let curr = url;
    const startDomain = new URL(url).hostname;
    let loopCount = 0;
    let method = "unknown";
    try {
      for (let i = 0; i < 10; i++) {
        loopCount++;
        this.log(`--- Loop ${loopCount} ---`);
        const decoded = this.dec(curr);
        if (decoded) {
          curr = decoded;
          this.log(`Decoded: ${curr}`, "DECODE");
          const currentDomain = new URL(curr).hostname;
          if (currentDomain !== startDomain) {
            method = "decoded";
            return {
              result: curr,
              status: {
                success: true,
                method: method,
                loops: loopCount,
                duration: `${Date.now() - startTime}ms`,
                error: null
              }
            };
          }
        }
        const res = await this.run(curr);
        if (res.type === "done") {
          const lastDec = this.dec(res.data);
          const final = lastDec || res.data;
          method = lastDec ? "decoded" : "livewire";
          return {
            result: final,
            status: {
              success: true,
              method: method,
              loops: loopCount,
              duration: `${Date.now() - startTime}ms`,
              error: null
            }
          };
        }
        curr = res.data;
        await new Promise(r => setTimeout(r, 1e3));
      }
    } catch (e) {
      return {
        result: curr,
        status: {
          success: false,
          method: "error",
          loops: loopCount,
          duration: `${Date.now() - startTime}ms`,
          error: e.message
        }
      };
    }
    return {
      result: curr,
      status: {
        success: false,
        method: "timeout",
        loops: loopCount,
        duration: `${Date.now() - startTime}ms`,
        error: "Max loops reached"
      }
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      success: false,
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new Bypasser();
  try {
    const data = await api.solve(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan saat memproses URL"
    });
  }
}