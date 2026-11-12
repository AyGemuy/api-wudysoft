import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class MConverter {
  constructor() {
    this.jar = new CookieJar();
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      origin: "https://mconverter.eu",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-model": '"RMX3890"',
      "sec-ch-ua-platform": '"Android"',
      "sec-ch-ua-platform-version": '"15.0.0"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: this.headers
    }));
    this.sources = [];
    this.initialized = false;
  }
  async _init() {
    console.log("[Process] Init session...");
    try {
      const res = await this.client.get("https://mconverter.eu/", {
        headers: {
          ...this.headers,
          "upgrade-insecure-requests": "1",
          referer: "https://mconverter.eu/convert/jpg/"
        }
      });
      const $ = cheerio.load(res.data || "");
      const scriptContents = $("script").map((_, em) => {
        const html = $(em).html() || "";
        const match = html.match(/SUPPORTED_SOURCES_ALL\s*=\s*(\[[^\]]+\])/);
        return match ? match[1] : null;
      }).get().filter(val => val !== null);
      if (scriptContents.length > 0) {
        try {
          this.sources = JSON.parse(scriptContents[0]);
        } catch (e) {}
      }
      if (!this.sources || this.sources.length === 0) {
        const htmlSources = $("a.format-list-item").map((_, el) => {
          const path = $(el).attr("href") || "";
          return path.split("/").filter(Boolean).pop();
        }).get();
        this.sources = [...new Set(htmlSources)];
      }
      if (!this.sources || this.sources.length === 0) {
        console.log("[Error] Gagal memuat format asal.");
        return false;
      }
      this.initialized = true;
      console.log(`[Process] Sukses memuat ${this.sources.length} format.`);
      return true;
    } catch (err) {
      console.error("[Error] Init session gagal:", err?.message || err);
      return false;
    }
  }
  async _tgt(from) {
    try {
      if (!this.initialized) {
        const initOk = await this._init();
        if (!initOk) return [];
      }
      console.log(`[Process] Get targets for: ${from}`);
      const fd = new FormData();
      fd.append("formats", from);
      const res = await this.client.post(`${proxy}https://mconverter.eu/cf_nocache/ajax/get_targets.php`, fd, {
        headers: {
          ...this.headers,
          ...fd.getHeaders(),
          referer: `https://mconverter.eu/convert/${from}/`
        }
      });
      return res.data?.formats || [];
    } catch (err) {
      console.error("[Error] Get targets gagal:", err?.message || err);
      return [];
    }
  }
  async _buf(media) {
    try {
      if (Buffer.isBuffer(media)) {
        return {
          buffer: media,
          mime: "application/octet-stream"
        };
      }
      if (typeof media === "string") {
        if (media.startsWith("http://") || media.startsWith("https://")) {
          console.log("[Process] Download media URL...");
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          });
          return {
            buffer: Buffer.from(res.data),
            mime: res.headers["content-type"] || "application/octet-stream"
          };
        }
        if (media.startsWith("data:")) {
          const match = media.match(/^data:([^;]+);base64,/);
          const mime = match ? match[1] : "application/octet-stream";
          const base64Data = media.split(",")[1] || media;
          return {
            buffer: Buffer.from(base64Data, "base64"),
            mime: mime
          };
        }
        const base64Pattern = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/;
        if (base64Pattern.test(media)) {
          return {
            buffer: Buffer.from(media, "base64"),
            mime: "application/octet-stream"
          };
        }
        return {
          buffer: Buffer.from(media, "utf-8"),
          mime: "text/plain"
        };
      }
      return null;
    } catch (err) {
      console.error("[Error] Parse media gagal:", err?.message || err);
      return null;
    }
  }
  async _btc(batchToken, sourceFormat) {
    try {
      const fd = new FormData();
      fd.append("has_pending_uploads", "0");
      await this.client.post(`${proxy}https://mconverter.eu/cf_nocache/ajax/update_batch.php?token=${batchToken}`, fd, {
        headers: {
          ...this.headers,
          ...fd.getHeaders(),
          referer: `https://mconverter.eu/convert/${sourceFormat}/`
        }
      });
      return true;
    } catch (err) {
      console.error("[Error] Update batch gagal:", err?.message || err);
      return false;
    }
  }
  async _chk(token, sourceFormat) {
    try {
      const res = await this.client.get(`${proxy}https://mconverter.eu/cf_nocache/ajax/check_progress.php?token=${token}`, {
        headers: {
          ...this.headers,
          referer: `https://mconverter.eu/convert/${sourceFormat}/`
        }
      });
      return res.data || {};
    } catch (err) {
      console.error("[Error] Poll progress gagal:", err?.message || err);
      return {};
    }
  }
  async _info(token, sourceFormat, targetFormat) {
    const url = `https://mconverter.eu/cf_nocache/ajax/download.php?token=${token}&file_idx=1&no_idx_in_name=1&orig_names=false`;
    try {
      const res = await this.client.head(url, {
        headers: {
          ...this.headers,
          referer: `https://mconverter.eu/convert/${sourceFormat}/`
        }
      });
      const contentType = res.headers["content-type"] || "application/octet-stream";
      const size = parseInt(res.headers["content-length"] || "0", 10);
      const cd = res.headers["content-disposition"] || "";
      let fileName = null;
      const matchStar = cd.match(/filename\*=UTF-8''([^;\s]+)/i);
      const matchReg = cd.match(/filename="?([^";\n]+)"?/i);
      if (matchStar && matchStar[1]) {
        fileName = decodeURIComponent(matchStar[1]);
      } else if (matchReg && matchReg[1]) {
        fileName = matchReg[1];
      }
      if (fileName) {
        fileName = fileName.replace(/_MConverter\.eu_/g, "");
      } else {
        fileName = `converted_${token.substring(0, 6)}.${targetFormat}`;
      }
      const extension = fileName.split(".").pop() || targetFormat;
      return {
        url: url,
        content_type: contentType,
        size: size,
        file_name: fileName,
        extension: extension.toLowerCase()
      };
    } catch (err) {
      console.error("[Error] Get info gagal:", err?.message || err);
      return {
        url: url,
        content_type: "application/octet-stream",
        size: 0,
        file_name: `converted_${token.substring(0, 6)}.${targetFormat}`,
        extension: targetFormat.toLowerCase()
      };
    }
  }
  async generate({
    media,
    source = "jpg",
    target = "png",
    ...rest
  }) {
    console.log(`[Process] Convert: ${source} -> ${target}`);
    try {
      if (!this.initialized) {
        const initOk = await this._init();
        if (!initOk) {
          return {
            status: "failed",
            msg: "Gagal menginisialisasi session cookie.",
            available_list: [],
            url: null,
            content_type: null,
            size: null,
            file_name: null,
            extension: null
          };
        }
      }
      const sourceFormat = source?.toLowerCase() || "jpg";
      const targetFormat = target?.toLowerCase() || "png";
      const lowerSources = this.sources.map(s => s.toLowerCase());
      if (!lowerSources.includes(sourceFormat)) {
        return {
          status: "failed",
          msg: `Format asal "${sourceFormat}" tidak didukung.`,
          available_list: this.sources,
          url: null,
          content_type: null,
          size: null,
          file_name: null,
          extension: null
        };
      }
      const targets = await this._tgt(sourceFormat);
      const targetNames = targets.map(t => t?.name?.toLowerCase());
      if (!targetNames.includes(targetFormat)) {
        return {
          status: "failed",
          msg: `Format tujuan "${targetFormat}" tidak didukung untuk tipe "${sourceFormat}".`,
          available_list: targetNames,
          url: null,
          content_type: null,
          size: null,
          file_name: null,
          extension: null
        };
      }
      const mediaResult = await this._buf(media);
      if (!mediaResult) {
        return {
          status: "failed",
          msg: "Media kosong atau gagal diolah.",
          available_list: [],
          url: null,
          content_type: null,
          size: null,
          file_name: null,
          extension: null
        };
      }
      const buffer = mediaResult.buffer;
      const totalSize = buffer.length;
      const sourceMime = rest.mime || mediaResult.mime;
      const filename = rest.filename || `${Math.random().toString(36).substring(2)}.${sourceFormat}`;
      console.log("[Process] Uploading chunk 1...");
      const chunk1 = buffer.subarray(0, 1);
      const fd1 = new FormData();
      fd1.append("file", chunk1, {
        filename: "blob"
      });
      const uploadUrl = `${proxy}https://mconverter.eu/cf_nocache/ajax/upload.php?target_format=${targetFormat}&total_size=${totalSize}&source_mime=${encodeURIComponent(sourceMime)}&filename=${encodeURIComponent(filename)}&abd=false&captcha=undefined`;
      const upRes1 = await this.client.post(uploadUrl, fd1, {
        headers: {
          ...this.headers,
          ...fd1.getHeaders(),
          referer: `https://mconverter.eu/convert/${sourceFormat}/`
        }
      });
      const batchToken = upRes1.data?.batch_token;
      const token = upRes1.data?.token;
      if (!token || !batchToken) {
        return {
          status: "failed",
          msg: "Gagal menginisialisasi unggahan ke server.",
          available_list: [],
          url: null,
          content_type: null,
          size: null,
          file_name: null,
          extension: null
        };
      }
      await this._btc(batchToken, sourceFormat);
      console.log("[Process] Uploading chunk 2...");
      const chunk2 = buffer.subarray(1);
      const fd2 = new FormData();
      fd2.append("file", chunk2, {
        filename: "blob"
      });
      await this.client.post(`${proxy}https://mconverter.eu/cf_nocache/ajax/upload.php?token=${token}&start_byte=1`, fd2, {
        headers: {
          ...this.headers,
          ...fd2.getHeaders(),
          referer: `https://mconverter.eu/convert/${sourceFormat}/`
        }
      });
      let attempts = 0;
      const maxAttempts = 60;
      const pollInterval = 3e3;
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`[Process] Polling status (${attempts}/${maxAttempts})...`);
        const progress = await this._chk(token, sourceFormat);
        const status = progress?.conversion_data?.status || "converting";
        if (status === "finished") {
          console.log("[Process] Success");
          const fileInfo = await this._info(token, sourceFormat, targetFormat);
          return {
            status: "finished",
            url: fileInfo.url,
            content_type: fileInfo.content_type,
            size: fileInfo.size,
            file_name: fileInfo.file_name,
            extension: fileInfo.extension
          };
        }
        if (status === "failed" || status === "error") {
          return {
            status: "failed",
            msg: "Proses konversi pada server mconverter gagal.",
            available_list: [],
            url: null,
            content_type: null,
            size: null,
            file_name: null,
            extension: null
          };
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
      return {
        status: "failed",
        msg: "Waktu tunggu pemantauan status (polling) habis.",
        available_list: [],
        url: null,
        content_type: null,
        size: null,
        file_name: null,
        extension: null
      };
    } catch (err) {
      return {
        status: "failed",
        msg: err?.message || "Terjadi kesalahan sistem internal.",
        available_list: [],
        url: null,
        content_type: null,
        size: null,
        file_name: null,
        extension: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.media) {
    return res.status(400).json({
      error: "Parameter 'media' diperlukan"
    });
  }
  const api = new MConverter();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}