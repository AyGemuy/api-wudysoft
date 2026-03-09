import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
const VALID_TEMPLATES = ["photo-to-ghibli-anime", "photo-to-cubism", "photo-to-rick-and-morty", "photo-to-gta", "photo-to-sims", "photo-to-south-park-character", "photo-to-claymation"];
class PhotosStyle {
  constructor() {
    this.cookies = {};
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      origin: "https://www.photosstyle.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.photosstyle.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.setCookie("GUEST_ID", crypto.randomUUID());
    this.setCookie("user_fingerprint", crypto.randomUUID());
  }
  log(msg) {
    console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
  }
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  setCookie(key, value) {
    if (key && value) this.cookies[key] = value;
  }
  parseCookies(headers) {
    const setCookieHeader = headers?.["set-cookie"];
    if (setCookieHeader) {
      const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
      for (const cookieStr of cookies) {
        try {
          const mainPart = cookieStr?.split(";")?.[0];
          const [key, ...valParts] = mainPart?.split("=") || [];
          const val = valParts?.join("=");
          if (key && val) this.cookies[key.trim()] = val.trim();
        } catch (e) {}
      }
    }
  }
  getCookieHeader() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  async req(url, options = {}) {
    try {
      const response = await axios({
        method: options.method || "GET",
        url: url,
        data: options.data,
        headers: {
          ...this.baseHeaders,
          ...options.headers,
          cookie: this.getCookieHeader()
        },
        responseType: options.responseType || "json",
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      this.parseCookies(response.headers);
      return response;
    } catch (e) {
      if (e?.response?.headers) this.parseCookies(e.response.headers);
      throw e;
    }
  }
  async toBuffer(input) {
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (/^data:image\/\w+;base64,/.test(input) || /^[A-Za-z0-9+/=]+$/.test(input)) {
          return Buffer.from(input.replace(/^data:image\/\w+;base64,/, ""), "base64");
        }
      }
      throw new Error("Format gambar tidak valid.");
    } catch (e) {
      throw new Error(`Gagal konversi gambar: ${e.message}`);
    }
  }
  validateTemplate(id) {
    if (!id) return VALID_TEMPLATES[0];
    if (!VALID_TEMPLATES.includes(id)) {
      throw new Error(`Template '${id}' invalid. Valid: ${VALID_TEMPLATES.join(", ")}`);
    }
    return id;
  }
  async upload(buffer) {
    const form = new FormData();
    const filename = `${crypto.randomBytes(8).toString("hex")}.jpg`;
    form.append("file", buffer, {
      filename: filename,
      contentType: "image/jpeg"
    });
    const {
      data
    } = await this.req("https://www.photosstyle.com/api/upload", {
      method: "POST",
      data: form,
      headers: form.getHeaders()
    });
    const url = data?.url || data?.data?.url;
    if (!url) throw new Error("Upload gagal, tidak mendapatkan URL.");
    return url;
  }
  async poll(taskId) {
    const maxAttempts = 60;
    for (let i = 1; i <= maxAttempts; i++) {
      await this.sleep(3e3);
      try {
        const {
          data
        } = await this.req(`https://www.photosstyle.com/api/generation/task?taskId=${taskId}`);
        const status = data?.data?.status;
        this.log(`Polling [${i}/${maxAttempts}]: ${status}`);
        if (status === "succeeded") return data?.data;
        if (status === "failed" || status === "error") throw new Error("Generation status: Failed.");
      } catch (e) {
        if (i === maxAttempts) throw e;
      }
    }
    throw new Error("Polling timeout.");
  }
  async generate({
    template,
    imageUrl,
    ...rest
  }) {
    try {
      this.log("=== START ===");
      const validTemplate = this.validateTemplate(template);
      const inputs = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      this.log(`Memproses ${inputs.length} gambar...`);
      const presignUrls = [];
      for (const [index, img] of inputs.entries()) {
        try {
          this.log(`[Img ${index + 1}] Converting to buffer...`);
          const buf = await this.toBuffer(img);
          this.log(`[Img ${index + 1}] Uploading...`);
          const url = await this.upload(buf);
          presignUrls.push(url);
          this.log(`[Img ${index + 1}] Upload OK: ${url.slice(0, 30)}...`);
        } catch (err) {
          this.log(`[Img ${index + 1}] Error: ${err.message}`);
        }
      }
      if (!presignUrls.length) throw new Error("Tidak ada gambar yang berhasil diupload.");
      const payload = {
        urls: presignUrls,
        templateId: validTemplate,
        aspectRatio: rest.aspectRatio || "2:3",
        category: rest.category || validTemplate,
        credit: rest.credit || "1",
        utm_source: null
      };
      this.log(`Sending task for template: ${validTemplate}`);
      const {
        data: chatData
      } = await this.req("https://www.photosstyle.com/api/generation/chat", {
        method: "POST",
        data: payload,
        headers: {
          "content-type": "application/json"
        }
      });
      const taskId = chatData?.data?.id;
      if (!taskId) throw new Error("Gagal mendapatkan Task ID.");
      this.log(`Task ID: ${taskId}`);
      const finalResult = await this.poll(taskId);
      this.log("=== SUCCESS ===");
      return {
        status: true,
        template: validTemplate,
        processed_count: presignUrls.length,
        ...finalResult
      };
    } catch (error) {
      this.log(`!!! ERROR: ${error.message}`);
      return {
        status: false,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "Parameter 'imageUrl' diperlukan"
    });
  }
  const api = new PhotosStyle();
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