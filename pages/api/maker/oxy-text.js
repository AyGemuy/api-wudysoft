import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
import https from "https";
class TextEffect {
  constructor() {
    this.targetHost = "";
    this.activeBase = "";
    this.cookie = "";
    this.maxRetry = 3;
    this.client = null;
  }
  initClient(url) {
    try {
      const urlObj = new URL(url);
      const originalHost = urlObj.hostname;
      this.targetHost = originalHost;
      if (originalHost.includes("textpro.me")) {
        console.log(`[init] Target: textpro.me -> Redirecting to Origin IP: 159.89.204.238`);
        this.activeBase = url.replace(originalHost, "159.89.204.238");
      } else {
        console.log(`[init] Target: ${originalHost} -> Direct Connection`);
        this.activeBase = url;
      }
      const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
      this.client = axios.create({
        timeout: 6e4,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
          servername: this.targetHost
        }),
        headers: {
          "User-Agent": USER_AGENT,
          Host: this.targetHost,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Connection: "keep-alive"
        }
      });
      console.log(`[init] Client initialized for ${this.targetHost}`);
    } catch (err) {
      console.error(`[init] Error: ${err.message}`);
      throw new Error("Gagal inisialisasi client: " + err.message);
    }
  }
  saveCookie(headers) {
    const sc = headers?.["set-cookie"];
    if (sc?.length) {
      this.cookie = sc.map(c => c.split(";")[0]).join("; ");
      console.log(`[cookie] Saved: ${this.cookie.slice(0, 30)}...`);
    }
  }
  async request(opts) {
    for (let i = 0; i < this.maxRetry; i++) {
      try {
        console.log(`[request] ${opts.method} ${opts.url} (Attempt ${i + 1})`);
        const res = await this.client.request({
          ...opts,
          headers: {
            ...this.cookie ? {
              cookie: this.cookie
            } : {},
            ...opts.headers ?? {}
          }
        });
        this.saveCookie(res.headers);
        return res.data;
      } catch (err) {
        const errorData = err.response?.data || err.message;
        console.error(`[request] Failed: ${err.message}`);
        if (i === this.maxRetry - 1) throw new Error(errorData);
        const delay = Math.pow(2, i) * 1e3;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  async fetchPage(url) {
    try {
      console.log(`[fetchPage] Loading ${url}`);
      const data = await this.request({
        method: "GET",
        url: url
      });
      const $ = cheerio.load(data);
      const res = {
        id: url.match(/(\d+)\.html/)?.[1] ?? null,
        token: $("input#token").first().val() ?? null,
        buildServer: $("input#build_server").first().val() ?? new URL(url).origin,
        buildServerId: $("input#build_server_id").first().val() ?? "1",
        inputs: []
      };
      $('input[name="text[]"]').each((i, el) => {
        res.inputs.push({
          index: i,
          value: $(el).val()
        });
      });
      console.log(`[fetchPage] Success! ID: ${res.id}, Token: ${res.token ? "Found" : "Not Found"}`);
      return res;
    } catch (err) {
      console.error(`[fetchPage] Error: ${err.message}`);
      throw err;
    }
  }
  async submitForm(url, pageData, userText) {
    try {
      console.log(`[submitForm] Submitting to get signature...`);
      const form = new FormData();
      const texts = Array.isArray(userText) ? userText : [userText];
      const finalTexts = pageData.inputs.map((_, i) => texts[i] || "");
      finalTexts.forEach(t => form.append("text[]", t));
      form.append("token", pageData.token ?? "");
      form.append("build_server", pageData.buildServer);
      form.append("build_server_id", pageData.buildServerId);
      form.append("create_effect", "Go");
      const data = await this.request({
        method: "POST",
        url: url,
        data: form,
        headers: {
          ...form.getHeaders()
        }
      });
      const $ = cheerio.load(data);
      const raw = $("#form_value").first().text()?.trim();
      if (!raw) {
        console.log("[submitForm] HTML Response Dump:", data.slice(0, 500));
        throw new Error("Gagal mendapatkan form_value (Signature)");
      }
      console.log(`[submitForm] Signature obtained.`);
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[submitForm] Error: ${err.message}`);
      throw err;
    }
  }
  async createImage(url, params) {
    try {
      console.log(`[createImage] Finalizing image creation...`);
      const payload = new URLSearchParams();
      const texts = Array.isArray(params.text) ? params.text : [params.text];
      payload.append("id", params.id ?? "");
      texts.forEach(t => payload.append("text[]", t));
      payload.append("token", params.token ?? "");
      payload.append("build_server", params.buildServer);
      payload.append("build_server_id", params.buildServerId);
      payload.append("create_effect", "Go");
      payload.append("sign", params.sign ?? "");
      const endpoint = `${new URL(url).origin}/effect/create-image`;
      const data = await this.request({
        method: "POST",
        url: endpoint,
        data: payload.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          Referer: url
        }
      });
      return typeof data === "string" ? JSON.parse(data) : data;
    } catch (err) {
      console.error(`[createImage] Error: ${err.message}`);
      throw err;
    }
  }
  async generate({
    text,
    url
  }) {
    try {
      console.log(`--- START GENERATE ---`);
      this.initClient(url);
      const page = await this.fetchPage(this.activeBase);
      const fv = await this.submitForm(this.activeBase, page, text);
      const result = await this.createImage(this.activeBase, {
        id: fv?.id ?? page?.id,
        token: fv?.token ?? page?.token,
        sign: fv?.sign,
        buildServer: fv?.build_server ?? page?.buildServer,
        buildServerId: fv?.build_server_id ?? page?.buildServerId,
        text: text
      });
      if (!result?.success) throw new Error(result?.info || "Server returned success:false");
      const imgUrl = `${fv?.build_server || page?.buildServer}${result.image || result.fullsize_image}`;
      console.log(`--- GENERATE SUCCESS: ${imgUrl} ---`);
      return {
        success: true,
        url: imgUrl,
        session: result.session_id
      };
    } catch (err) {
      console.error(`--- GENERATE FAILED ---`);
      console.error(`Error: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text || !params.url) {
    return res.status(400).json({
      error: "Parameter 'text' dan 'url' diperlukan"
    });
  }
  const api = new TextEffect();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}