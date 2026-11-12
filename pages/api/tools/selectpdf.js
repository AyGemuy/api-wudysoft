import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
class SelectPdfImage {
  constructor() {
    this.baseUrl = "https://selectpdf.com/demo/convert-html-code-to-image.aspx";
    this.cookies = "";
    this.formats = ["png", "jpg", "bmp"];
    this.engines = ["Chromium", "WebKit", "WebKitRestricted"];
    this.defaults = {
      format: "png",
      width: "1024",
      height: "",
      engine: "Chromium"
    };
    this.client = axios.create({
      baseURL: "https://selectpdf.com",
      timeout: 3e4,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://selectpdf.com",
        pragma: "no-cache",
        priority: "u=0, i",
        referer: this.baseUrl,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.client.interceptors.request.use(cfg => {
      if (this.cookies) cfg.headers["cookie"] = this.cookies;
      return cfg;
    }, err => Promise.reject(err));
    this.client.interceptors.response.use(res => {
      const raw = res?.headers?.["set-cookie"];
      if (raw?.length) {
        const fresh = raw.map(c => c.split(";")[0]).join("; ");
        this.cookies = this.cookies ? `${this.cookies}; ${fresh}` : fresh;
      }
      return res;
    }, err => Promise.reject(err));
  }
  async init() {
    try {
      console.log("[SelectPdf] Mengambil session & token form via Cheerio...");
      const {
        data
      } = await this.client.get(this.baseUrl);
      const $ = cheerio.load(data || "");
      return {
        viewState: $('input[name="__VIEWSTATE"]').val() || "",
        viewStateGen: $('input[name="__VIEWSTATEGENERATOR"]').val() || "",
        eventVal: $('input[name="__EVENTVALIDATION"]').val() || ""
      };
    } catch (err) {
      console.error("[SelectPdf] Gagal inisialisasi:", err?.message || err);
      throw err;
    }
  }
  async generate({
    html = "<html><body><h1>Hello World</h1></body></html>",
    format = "png",
    width = "1024",
    height = "",
    engine = "Chromium",
    baseUrl = "",
    ...rest
  } = {}) {
    try {
      console.log("[SelectPdf] Memulai proses render HTML ke Gambar...");
      const selectedFormat = this.formats.includes(format?.toLowerCase()) ? format.toLowerCase() : this.defaults.format;
      const selectedEngine = this.engines.includes(engine) ? engine : this.defaults.engine;
      const tokens = await this.init();
      if (!tokens?.viewState) {
        throw new Error("Gagal mengekstrak __VIEWSTATE dari form HTML.");
      }
      console.log(`[SelectPdf] Mengirim payload (Format: ${selectedFormat}, Engine: ${selectedEngine}, Width: ${width || this.defaults.width}px)...`);
      const params = new URLSearchParams({
        __VIEWSTATE: tokens.viewState,
        __VIEWSTATEGENERATOR: tokens.viewStateGen,
        __EVENTVALIDATION: tokens.eventVal,
        ctl00$mainContent$TxtHtmlCode: html,
        ctl00$mainContent$TxtBaseUrl: baseUrl || "",
        ctl00$mainContent$DdlImageFormat: selectedFormat,
        ctl00$mainContent$TxtWidth: String(width || this.defaults.width),
        ctl00$mainContent$TxtHeight: String(height || this.defaults.height),
        ctl00$mainContent$DdlRenderingEngine: selectedEngine,
        ctl00$mainContent$BtnSubmit: "Convert To Image",
        spdfDownloadToken: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        ...rest
      });
      const res = await this.client.post(this.baseUrl, params.toString(), {
        responseType: "arraybuffer",
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      const contentType = res?.headers?.["content-type"] || `image/${selectedFormat === "jpg" ? "jpeg" : selectedFormat}`;
      const isImage = contentType.startsWith("image/");
      if (!isImage) {
        const errText = Buffer.from(res?.data || []).toString("utf-8");
        throw new Error(`Respon bukan gambar: ${errText.slice(0, 200)}...`);
      }
      console.log(`[SelectPdf] Berhasil dibuat (${contentType})`);
      return {
        status: true,
        buffer: Buffer.from(res?.data || []),
        contentType: contentType
      };
    } catch (err) {
      console.error("[SelectPdf Error]:", err?.message || err);
      return {
        status: false,
        buffer: null,
        contentType: null,
        error: err?.message || "Unknown Error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params?.html) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'html' diperlukan"
    });
  }
  const api = new SelectPdfImage();
  try {
    const result = await api.generate(params);
    if (!result?.status || !result?.buffer) {
      return res.status(500).json({
        status: false,
        error: result?.error || "Gagal mengonversi HTML ke gambar"
      });
    }
    res.setHeader("Content-Type", result.contentType || "image/png");
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error?.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      status: false,
      error: errorMessage
    });
  }
}