import axios from "axios";
class NyckelNSFW {
  constructor(cfg = {}) {
    try {
      this.base = cfg?.base || "https://www.nyckel.com";
      this.funcId = cfg?.funcId || "o2f0jzcdyut2qxhu";
      this.ua = cfg?.ua || "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";
      this.cookies = {};
      console.log("[PROSES] NyckelNSFW instance berhasil dimuat.");
    } catch (err) {
      console.log(`[ERROR constructor]: ${err?.message}`);
    }
  }
  sck(res) {
    try {
      const setCookies = res?.headers?.["set-cookie"] || [];
      const cookieArr = Array.isArray(setCookies) ? setCookies : [setCookies];
      let count = 0;
      for (const item of cookieArr) {
        if (!item || typeof item !== "string") continue;
        const [pair] = item.split(";");
        const [k, ...v] = pair.split("=");
        if (k && v?.length) {
          this.cookies[k.trim()] = v.join("=").trim();
          count++;
        }
      }
      if (count > 0) {
        console.log(`[PROSES] Meng-intercept ${count} cookie baru dari Nyckel.`);
      }
    } catch (err) {
      console.log(`[ERROR sck]: ${err?.message}`);
    }
  }
  gck() {
    try {
      return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    } catch (err) {
      console.log(`[ERROR gck]: ${err?.message}`);
      return "";
    }
  }
  async ses() {
    try {
      console.log("[PROSES] Memulai handshake session awal ke Nyckel...");
      const res = await axios.get(`${this.base}/pretrained-classifiers/nsfw-identifier/`, {
        headers: this.hdr(),
        timeout: 1e4
      });
      this.sck(res);
      return true;
    } catch (err) {
      console.log(`[PERINGATAN ses]: Preflight gagal (${err?.message}), melanjutkan proses.`);
      return false;
    }
  }
  hdr(custom = {}) {
    try {
      return {
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        origin: this.base,
        pragma: "no-cache",
        referer: `${this.base}/pretrained-classifiers/nsfw-identifier/`,
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": this.ua,
        "x-requested-with": "XMLHttpRequest",
        cookie: this.gck(),
        ...custom || {}
      };
    } catch (err) {
      console.log(`[ERROR hdr]: ${err?.message}`);
      return custom || {};
    }
  }
  rnd(len = 16) {
    try {
      return Math.random().toString(36).substring(2, 2 + (len || 16));
    } catch (err) {
      console.log(`[ERROR rnd]: ${err?.message}`);
      return Date.now().toString(36);
    }
  }
  slp(ms = 1e3) {
    try {
      return new Promise(res => setTimeout(res, ms || 1e3));
    } catch (err) {
      console.log(`[ERROR slp]: ${err?.message}`);
      return Promise.resolve();
    }
  }
  mime(buf) {
    try {
      const hex = buf?.slice(0, 4)?.toString("hex")?.toLowerCase() || "";
      const isPng = hex.startsWith("89504e47");
      const isJpg = hex.startsWith("ffd8");
      const isWebp = hex.startsWith("52494646");
      return {
        ext: isPng ? "png" : isJpg ? "jpeg" : isWebp ? "webp" : "jpeg",
        type: isPng ? "image/png" : isJpg ? "image/jpeg" : isWebp ? "image/webp" : "image/jpeg"
      };
    } catch (err) {
      console.log(`[ERROR mime]: ${err?.message}`);
      return {
        ext: "jpeg",
        type: "image/jpeg"
      };
    }
  }
  chk(params) {
    try {
      console.log("[PROSES] Memvalidasi parameter input...");
      if (!params || typeof params !== "object") {
        throw new Error("Parameter harus berupa Object.");
      }
      if (!params?.image) {
        throw new Error('Parameter "image" wajib diisi (URL, Base64 string, atau Buffer).');
      }
      if (typeof params?.image !== "string" && !Buffer.isBuffer(params?.image)) {
        throw new Error("Tipe format gambar tidak didukung.");
      }
      return true;
    } catch (err) {
      console.log(`[ERROR chk]: ${err?.message}`);
      throw err;
    }
  }
  async buf(input) {
    try {
      console.log("[PROSES] Menyelesaikan konversi format input gambar...");
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          console.log("[PROSES] Mengunduh gambar remote via URL...");
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res?.data);
        }
        if (input.includes("base64,")) {
          console.log("[PROSES] Membaca data URI Base64...");
          return Buffer.from(input.split("base64,")[1], "base64");
        }
        console.log("[PROSES] Membaca raw Base64 string...");
        return Buffer.from(input, "base64");
      }
      throw new Error("Gagal mengonversi input gambar ke buffer.");
    } catch (err) {
      console.log(`[ERROR buf]: ${err?.message}`);
      throw err;
    }
  }
  bld(fileBuf, filename, mimeType) {
    try {
      console.log("[PROSES] Membangun payload multipart form-data...");
      const boundary = `----WebKitFormBoundary${this.rnd(16)}`;
      const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename || "blob"}"\r\nContent-Type: ${mimeType || "image/jpeg"}\r\n\r\n`);
      const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
      const body = Buffer.concat([head, fileBuf, tail]);
      return {
        body: body,
        contentType: `multipart/form-data; boundary=${boundary}`
      };
    } catch (err) {
      console.log(`[ERROR bld]: ${err?.message}`);
      throw err;
    }
  }
  prs(data = {}) {
    try {
      console.log("[PROSES] Mem-parsing hasil prediksi model Nyckel...");
      const label = (data?.labelName || "").toLowerCase().trim();
      const rawConfidence = typeof data?.confidence === "number" ? data.confidence : 0;
      const confidence = Number(rawConfidence.toFixed(4));
      const isExplicit = label.includes("porn") && !label.includes("not");
      const isNsfw = isExplicit || label.includes("nsfw") || label.includes("suggestive");
      let labelName = "Safe";
      let labelId = data?.labelId || "label_safe";
      if (isNsfw) {
        labelName = data?.labelName || "Porn / NSFW";
      } else {
        labelName = data?.labelName || "Not Porn";
      }
      return {
        isNsfw: isNsfw,
        labelName: labelName,
        labelId: labelId,
        confidence: confidence,
        scores: {
          rawResponse: data
        }
      };
    } catch (err) {
      console.log(`[ERROR prs]: ${err?.message}`);
      return {
        isNsfw: false,
        labelName: "Unknown",
        labelId: "error",
        confidence: 0,
        scores: {
          error: err?.message
        }
      };
    }
  }
  async checkNSFW({
    image,
    prompt,
    notes,
    ...rest
  }) {
    try {
      this.chk({
        image: image,
        prompt: prompt,
        notes: notes,
        ...rest
      });
      await this.ses();
      console.log("[PROSES] Memulai pipeline NSFW via Nyckel Classifier...");
      const imageBuf = await this.buf(image);
      const {
        ext,
        type
      } = this.mime(imageBuf);
      const fileName = `blob_${Date.now()}.${ext}`;
      const {
        body,
        contentType
      } = this.bld(imageBuf, fileName, type);
      const functionId = rest?.funcId || this.funcId;
      const invokeUrl = `${this.base}/v1/functions/${functionId}/invoke`;
      let attempt = 0;
      const maxRetries = rest?.maxRetries || 3;
      let apiRes = null;
      while (attempt < maxRetries) {
        attempt++;
        try {
          console.log(`[PROSES] Mengirim gambar ke Nyckel Function [${functionId}] (Percobaan ${attempt}/${maxRetries})...`);
          apiRes = await axios.post(invokeUrl, body, {
            headers: this.hdr({
              "content-type": contentType
            })
          });
          this.sck(apiRes);
          if (apiRes?.data) break;
        } catch (pollErr) {
          console.log(`[PERINGATAN] Percobaan ke-${attempt} gagal: ${pollErr?.message}`);
          if (attempt >= maxRetries) throw pollErr;
          await this.ses();
          await this.slp(1500);
        }
      }
      const parsed = this.prs(apiRes?.data || {});
      const isNsfw = parsed?.isNsfw || false;
      const confidence = parsed?.confidence || 0;
      const labelName = parsed?.labelName || "Safe";
      const labelId = parsed?.labelId || "unknown";
      const scores = parsed?.scores || {};
      console.log("[PROSES] Analisis Nyckel selesai.");
      return {
        success: true,
        code: 200,
        result: {
          isNsfw: isNsfw,
          labelName: labelName,
          labelId: labelId,
          confidence: confidence,
          percentage: (confidence * 100).toFixed(2) + "%",
          scores: scores,
          message: isNsfw ? "Gambar terdeteksi mengandung konten NSFW." : "Gambar tidak terdeteksi mengandung konten NSFW."
        }
      };
    } catch (err) {
      console.log(`[ERROR checkNSFW]: ${err?.message}`);
      const isNsfw = false;
      const confidence = 0;
      return {
        success: false,
        code: err?.response?.status || 500,
        result: {
          isNsfw: isNsfw,
          labelName: "Failed",
          labelId: -1,
          confidence: confidence,
          percentage: (confidence * 100).toFixed(2) + "%",
          scores: {
            error: err?.message
          },
          message: isNsfw ? "Gambar terdeteksi mengandung konten NSFW." : "Gambar tidak terdeteksi mengandung konten NSFW."
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new NyckelNSFW();
  try {
    const data = await api.checkNSFW(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}