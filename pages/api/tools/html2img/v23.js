import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
const BASE = "https://converthub.com";
const LW_URL = `${BASE}/livewire/update`;
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
class HtmlToImg {
  constructor() {
    this.jar = new CookieJar();
    this.http = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        "user-agent": UA,
        "accept-language": "id-ID",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        origin: BASE,
        referer: `${BASE}/html-to-png`
      }
    }));
    this.token = null;
    this.snap = null;
    this.compId = null;
  }
  log(msg, data) {
    console.log(`[CH] ${msg}`, data ?? "");
  }
  err(msg) {
    return {
      ok: false,
      data: null,
      error: msg
    };
  }
  _xsrf() {
    try {
      const cookies = this.jar.getCookiesSync(BASE);
      const tokenCookie = cookies.find(function(c) {
        return c.key === "XSRF-TOKEN";
      });
      const val = tokenCookie ? tokenCookie.value : "";
      return decodeURIComponent(val);
    } catch (e) {
      this.log("_xsrf err:", e?.message);
      return "";
    }
  }
  _lwHdr() {
    try {
      return {
        "content-type": "application/json",
        accept: "*/*",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "x-livewire": "",
        "x-xsrf-token": this._xsrf()
      };
    } catch (e) {
      this.log("_lwHdr err:", e?.message);
      return {};
    }
  }
  _snapStr() {
    try {
      return typeof this.snap === "string" ? this.snap : JSON.stringify(this.snap ?? {});
    } catch (e) {
      this.log("_snapStr err:", e?.message);
      return "{}";
    }
  }
  _snapData() {
    try {
      return JSON.parse(this._snapStr())?.data ?? {};
    } catch (e) {
      this.log("_snapData err:", e?.message);
      return {};
    }
  }
  _dig(comp, name) {
    try {
      const dispatches = comp?.effects?.dispatches || [];
      const found = dispatches.find(function(d) {
        return d.name === name;
      });
      return found ?? null;
    } catch (e) {
      this.log("_dig err:", e?.message);
      return null;
    }
  }
  _toBuf(html) {
    try {
      if (Buffer.isBuffer(html)) return html;
      if (typeof html === "string") return Buffer.from(html, "utf8");
      return null;
    } catch (e) {
      this.log("_toBuf err:", e?.message);
      return null;
    }
  }
  _wait(ms) {
    return new Promise(function(r) {
      setTimeout(r, ms);
    });
  }
  async init() {
    try {
      this.log("Fetching page...");
      const res = await this.http.get(`${BASE}/html-to-png`);
      const $ = cheerio.load(res.data);
      this.token = $('input[name="_token"]').attr("value") || $('meta[name="csrf-token"]').attr("content");
      const el = $("[wire\\:snapshot]").first();
      this.compId = el.attr("wire:id") ?? null;
      this.snap = el.attr("wire:snapshot") ?? null;
      this.log("Token:", this.token);
      this.log("CompID:", this.compId);
      this.log("Snap ok:", !!this.snap);
      return {
        ok: true,
        data: {
          token: this.token,
          compId: this.compId
        }
      };
    } catch (e) {
      this.log("init err:", e?.message);
      return this.err(e?.message);
    }
  }
  async lw(method, params = []) {
    try {
      this.log(`lw → ${method}`, params);
      const res = await this.http.post(LW_URL, {
        _token: this.token,
        components: [{
          snapshot: this._snapStr(),
          updates: {},
          calls: [{
            path: "",
            method: method,
            params: params
          }]
        }]
      }, {
        headers: this._lwHdr()
      });
      const comp = res.data?.components?.[0];
      if (comp?.snapshot) this.snap = comp.snapshot;
      return {
        ok: true,
        data: comp
      };
    } catch (e) {
      this.log(`lw(${method}) err:`, e?.message);
      return this.err(e?.message);
    }
  }
  async chk(fileName, fileSize) {
    try {
      this.log("Validating...", {
        fileName: fileName,
        fileSize: fileSize
      });
      const res = await this.lw("validateFileAndGetFormats", [fileName, fileSize]);
      if (!res.ok) return this.err(res.error);
      const result = res.data?.effects?.returns?.[0];
      this.log("Valid result:", result);
      return {
        ok: true,
        data: result
      };
    } catch (e) {
      this.log("chk err:", e?.message);
      return this.err(e?.message);
    }
  }
  async startUp(fileName, fileSize) {
    try {
      this.log("Start upload...");
      const res = await this.lw("_startUpload", ["file", [{
        name: fileName,
        size: fileSize,
        type: "text/html"
      }], false]);
      if (!res.ok) return this.err(res.error);
      const url = this._dig(res.data, "upload:generatedSignedUrl")?.params?.url;
      this.log("Signed URL:", url);
      return url ? {
        ok: true,
        data: url
      } : this.err("No signed URL");
    } catch (e) {
      this.log("startUp err:", e?.message);
      return this.err(e?.message);
    }
  }
  async put(signedUrl, fileName, buf) {
    try {
      this.log("Uploading...", fileName);
      const form = new FormData();
      form.append("files[]", buf, {
        filename: fileName,
        contentType: "text/html"
      });
      const res = await this.http.post(signedUrl, form, {
        headers: {
          ...form.getHeaders(),
          accept: "application/json",
          "x-csrf-token": this.token,
          "x-xsrf-token": this._xsrf()
        }
      });
      const tmp = res.data?.paths?.[0];
      this.log("Tmp path:", tmp);
      return tmp ? {
        ok: true,
        data: tmp
      } : this.err("No tmp path");
    } catch (e) {
      this.log("put err:", e?.message);
      return this.err(e?.message);
    }
  }
  async fin(tmpPath) {
    try {
      this.log("Finish upload...", tmpPath);
      const res = await this.lw("_finishUpload", ["file", [tmpPath], false, false]);
      if (!res.ok) return this.err(res.error);
      const state = this._dig(res.data, "fileConversionInitialized")?.params?.[0];
      this.log("Finish state:", state);
      return {
        ok: true,
        data: state
      };
    } catch (e) {
      this.log("fin err:", e?.message);
      return this.err(e?.message);
    }
  }
  async run() {
    try {
      this.log("Running conversion...");
      const res = await this.lw("convert", []);
      if (!res.ok) return this.err(res.error);
      const dispatches = res.data?.effects?.dispatches ?? [];
      const completed = !!dispatches.find(function(d) {
        return d.name === "conversionCompleted";
      });
      const withUrl = dispatches.filter(function(d) {
        return d.name === "fileConversionInitialized";
      }).find(function(d) {
        return d.params?.[0]?.downloadUrl;
      });
      const url = withUrl?.params?.[0]?.downloadUrl || this._snapData()?.downloadUrl || null;
      this.log("run() completed:", completed, "| URL:", url);
      return {
        ok: true,
        data: {
          url: url,
          completed: completed
        }
      };
    } catch (e) {
      this.log("run err:", e?.message);
      return this.err(e?.message);
    }
  }
  async getUrl() {
    try {
      this.log("getDownloadUrl...");
      const res = await this.lw("getDownloadUrl", []);
      if (!res.ok) return this.err(res.error);
      const url = res.data?.effects?.returns?.[0] || this._snapData()?.downloadUrl || null;
      this.log("getUrl result:", url);
      return {
        ok: true,
        data: url
      };
    } catch (e) {
      this.log("getUrl err:", e?.message);
      return this.err(e?.message);
    }
  }
  async poll(retries = 30, delay = 3e3) {
    try {
      for (let i = 1; i <= retries; i++) {
        this.log(`poll ${i}/${retries}...`);
        const res = await this.getUrl();
        if (res.ok && res.data) return {
          ok: true,
          data: res.data
        };
        if (i < retries) await this._wait(delay);
      }
      return this.err("Poll timeout, no download URL");
    } catch (e) {
      this.log("poll err:", e?.message);
      return this.err(e?.message);
    }
  }
  async execute_run({
    html,
    fileName = "file.html",
    outputFormat = "png"
  }) {
    try {
      const buf = this._toBuf(html);
      if (!buf) return this.err("Invalid html input");
      const size = buf.length;
      const name = fileName.endsWith(".html") ? fileName : `${fileName}.html`;
      const initRes = await this.init();
      if (!initRes.ok) return this.err(`init: ${initRes.error}`);
      const chkRes = await this.chk(name, size);
      if (!chkRes.ok) return this.err(`chk: ${chkRes.error}`);
      if (!chkRes.data?.valid) return this.err(chkRes.data?.error ?? "Validation failed");
      const snap = JSON.parse(this._snapStr());
      snap.data.outputFormat = outputFormat || snap.data.defaultToFormat || "png";
      this.snap = JSON.stringify(snap);
      const supRes = await this.startUp(name, size);
      if (!supRes.ok) return this.err(`startUp: ${supRes.error}`);
      const putRes = await this.put(supRes.data, name, buf);
      if (!putRes.ok) return this.err(`put: ${putRes.error}`);
      const finRes = await this.fin(putRes.data);
      if (!finRes.ok) return this.err(`fin: ${finRes.error}`);
      const runRes = await this.run();
      if (!runRes.ok) return this.err(`run: ${runRes.error}`);
      const {
        url: runUrl,
        completed
      } = runRes.data;
      let dlUrl = runUrl;
      if (!dlUrl) {
        this.log("URL not in run(), polling...");
        const pollRes = completed ? await this.getUrl() : await this.poll(30, 3e3);
        if (!pollRes.ok) return this.err(`poll: ${pollRes.error}`);
        dlUrl = pollRes.data;
      }
      if (!dlUrl) return this.err("No download URL after polling");
      this.log("Done!", dlUrl);
      return {
        url: dlUrl,
        fileName: name,
        outputFormat: outputFormat
      };
    } catch (e) {
      this.log("convert err:", e?.message);
      return this.err(e?.message);
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.html) {
      return res.status(400).json({
        error: "Missing 'html' parameter"
      });
    }
    const converter = new HtmlToImg();
    const result = await converter.execute_run(params);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}