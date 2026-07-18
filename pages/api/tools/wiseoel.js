import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class WiseoelClient {
  constructor() {
    this.cp = "com.cam001.selfie361";
    this.version = "9218";
    this.platform = "1";
    this.salt = "2kkzW0";
    this.baseUrl = "https://cpi.wiseoel.com";
    this.userId = this._uid();
    this._isReg = false;
  }
  _uid() {
    try {
      let id;
      let isMono = true;
      while (isMono) {
        id = crypto.randomBytes(8).toString("hex");
        if (new Set(id).size > 1) {
          isMono = false;
        }
      }
      return id;
    } catch (err) {
      console.log("[Log] Gagal memproses pembuatan user ID:", err.message);
      return null;
    }
  }
  async _reg() {
    try {
      console.log(`[Log] Mendaftarkan User ID ke userReport: ${this.userId}`);
      const url = `${this.baseUrl}/billing/property/userReport`;
      const params = {
        version: this.version,
        cp: this.cp,
        platform: this.platform,
        userId: this.userId,
        language: "in"
      };
      const data = {
        deviceInfo: "realme-RMX3890-realme-qcom-release-keys",
        systemInfo: "OS:15-sdk:15-incremental:U.R4T2.202605111623",
        uid: this.userId
      };
      const res = await axios.post(url, data, {
        params: params,
        headers: {
          "User-Agent": "okhttp/4.10.0",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json"
        }
      });
      console.log("[Log] Respon pendaftaran userReport:", res?.data);
      this._isReg = true;
      return res?.data || null;
    } catch (err) {
      console.log("[Log] Gagal melakukan pendaftaran userReport:", err.message);
      return null;
    }
  }
  _md5(str) {
    try {
      return crypto.createHash("md5").update(str, "utf8").digest("hex");
    } catch (err) {
      console.log("[Log] Gagal melakukan kalkulasi MD5:", err.message);
      return null;
    }
  }
  _sig(ts) {
    try {
      return this._md5(`${this.salt}${ts}`);
    } catch (err) {
      console.log("[Log] Gagal memproses signature:", err.message);
      return null;
    }
  }
  _hdr(ts, ext = {}) {
    try {
      return {
        "User-Agent": "okhttp/4.10.0",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        timestamp: String(ts),
        sign: this._sig(ts),
        userid: this.userId,
        cp: this.cp,
        version: this.version,
        platform: this.platform,
        ...ext
      };
    } catch (err) {
      console.log("[Log] Gagal menyusun struktur header:", err.message);
      return null;
    }
  }
  async _buf(img) {
    try {
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (img.startsWith("http")) {
          console.log("[Log] Mengunduh berkas gambar...");
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res?.data);
        }
        if (img.startsWith("data:")) {
          console.log("[Log] Mendekode base64 data URI...");
          const raw = img.split(",")[1] || img;
          return Buffer.from(raw, "base64");
        }
        console.log("[Log] Mendekode string base64 biasa...");
        return Buffer.from(img, "base64");
      }
      return null;
    } catch (err) {
      console.log("[Log] Gagal mengonversi gambar ke buffer:", err.message);
      return null;
    }
  }
  async _up(buffer) {
    try {
      if (!buffer) return null;
      console.log("[Log] Mengunggah gambar ke CDN...");
      const form = new FormData();
      const ts = Math.floor(Date.now() / 1e3);
      form.append("files", buffer, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });
      const url = `${this.baseUrl}/algo/v1/aiGenerate-aigc/multipleUpload?ifHttps=true`;
      const res = await axios.post(url, form, {
        headers: {
          ...form.getHeaders(),
          ...this._hdr(ts)
        }
      });
      const uploadedUrl = res?.data?.d?.[0] || null;
      console.log("[Log] Gambar berhasil diunggah:", uploadedUrl);
      return uploadedUrl;
    } catch (err) {
      console.log("[Log] Proses unggah gambar CDN gagal:", err.message);
      return null;
    }
  }
  async _tok(type = 4) {
    try {
      console.log("[Log] Mengambil token tugas...");
      const ts = Math.floor(Date.now() / 1e3);
      const url = `${this.baseUrl}/algo/v1/faceFusion/aigc/getTaskToken`;
      const res = await axios.post(url, {
        type: type
      }, {
        headers: this._hdr(ts)
      });
      const token = res?.data?.d?.taskToken?.[0] || null;
      console.log("[Log] Token diperoleh:", token);
      return token;
    } catch (err) {
      console.log("[Log] Gagal mendapatkan token tugas:", err.message);
      return null;
    }
  }
  async _poll(jobId, mode) {
    const limit = 30;
    const fallback = 3e3;
    console.log(`[Log] Melakukan cek berkala status tugas: ${jobId}`);
    for (let i = 0; i < limit; i++) {
      try {
        const ts = Math.floor(Date.now() / 1e3);
        const isSR = mode === "super-resolution";
        const url = isSR ? `${this.baseUrl}/algo/v1/faceFusion/aigc/querySuperResolution` : `${this.baseUrl}/algo/v1/faceFusion/queryAiStyleTask?ifWise=true`;
        const res = await axios.post(url, {
          jobId: jobId
        }, {
          headers: this._hdr(ts)
        });
        const data = res?.data?.d || {};
        const status = data?.jobStatus || "doing";
        console.log(`[Log] Cek #${i + 1}: Status pekerjaan "${status}"`);
        if (status === "success") {
          return data?.imageUrls?.[0] || data?.responseUrls?.[0] || null;
        }
        if (status === "failed" || data?.jobReason) {
          console.log("[Log] Proses dibatalkan oleh server:", data?.jobReason);
          return null;
        }
        const wait = (data?.waitTime || 2) * 1e3;
        await new Promise(r => setTimeout(r, wait || fallback));
      } catch (err) {
        console.log("[Log] Terjadi kendala saat melakukan polling:", err.message);
        return null;
      }
    }
    console.log("[Log] Polling dihentikan karena batas waktu tunggu terlampaui");
    return null;
  }
  async template({
    isSelfie = false,
    ...query
  } = {}) {
    try {
      if (!this._isReg) {
        await this._reg();
      }
      console.log("[Log] Menarik katalog template gaya...");
      const params = {
        version: this.version,
        cp: this.cp,
        platform: this.platform,
        ...query
      };
      const endpoint = isSelfie ? `${this.baseUrl}/common/selfie/getStyleTemplates` : `${this.baseUrl}/common/getStyleTemplatesNew`;
      const res = await axios.get(endpoint, {
        params: params,
        headers: {
          "User-Agent": "okhttp/4.10.0",
          "Accept-Encoding": "gzip"
        }
      });
      return res?.data?.d || null;
    } catch (err) {
      console.log("[Log] Pengambilan data template gagal:", err.message);
      return null;
    }
  }
  async generate({
    mode = "super-resolution",
    image,
    effect,
    prompt,
    ...rest
  } = {}) {
    try {
      const allowedModes = ["super-resolution", "ai-style"];
      if (!mode || typeof mode !== "string") {
        console.log('[Log] Validasi Gagal: Parameter "mode" harus diisi berupa string.');
        return null;
      }
      if (!allowedModes.includes(mode)) {
        console.log(`[Log] Validasi Gagal: Mode "${mode}" tidak valid. Pilihan mode yang tersedia: ${allowedModes.join(", ")}`);
        return null;
      }
      if (!image) {
        console.log(`[Log] Validasi Gagal: Parameter "image" wajib disertakan untuk mode "${mode}".`);
        return null;
      }
      if (mode === "ai-style") {
        if (effect !== undefined && isNaN(Number(effect))) {
          console.log('[Log] Validasi Gagal: Parameter "effect" harus berupa angka atau string angka.');
          return null;
        }
      }
      if (!this._isReg) {
        await this._reg();
      }
      console.log(`[Log] Memulai tugas generate mode: ${mode}`);
      console.log(`[Log] Menggunakan User ID: ${this.userId}`);
      const isUrl = typeof image === "string" && image.startsWith("http");
      const finalUrl = isUrl ? image : await this._up(await this._buf(image));
      if (!finalUrl) {
        console.log("[Log] Gagal memproses tautan final berkas gambar");
        return null;
      }
      const ts = Math.floor(Date.now() / 1e3);
      let jobId = "";
      switch (mode) {
        case "super-resolution": {
          const url = `${this.baseUrl}/algo/v1/faceFusion/aigc/createSuperResolution`;
          const payload = {
            imageUrls: [finalUrl],
            ...rest
          };
          const res = await axios.post(url, payload, {
            headers: this._hdr(ts)
          });
          jobId = res?.data?.d?.jobId || null;
          break;
        }
        case "ai-style": {
          const token = await this._tok(rest?.tokenType || 4);
          if (!token) {
            console.log("[Log] Token dibatalkan atau bernilai kosong");
            return null;
          }
          const url = `${this.baseUrl}/algo/v1/faceFusion/createAiStyleTask?ifWise=true`;
          const innerParams = {
            level: "1",
            controlNetId: "0",
            num: "1",
            width: "540",
            deNoising: "0.5",
            tag: "0",
            prompts: prompt || "",
            effectType: String(effect || "4921"),
            height: "960",
            ...rest?.innerParams ? JSON.parse(rest.innerParams) : {}
          };
          const styleParams = {
            style: "aiGenerate",
            params: JSON.stringify(innerParams),
            requestUrls: [{
              index: 0,
              imgUrl: finalUrl
            }],
            ...rest?.styleParams
          };
          const payload = {
            styleParams: styleParams,
            level: 0,
            token: token || "",
            width: 1080,
            ...rest
          };
          delete payload.innerParams;
          delete payload.tokenType;
          const res = await axios.post(url, payload, {
            headers: this._hdr(ts)
          });
          jobId = res?.data?.d?.jobId || null;
          break;
        }
        default:
          console.log(`[Log] Mode pemrosesan "${mode}" tidak terdaftar`);
          return null;
      }
      if (!jobId) {
        console.log("[Log] Identitas nomor tugas (jobId) kosong");
        return null;
      }
      console.log("[Log] Tugas berhasil didaftarkan, jobId:", jobId);
      const outputUrl = await this._poll(jobId, mode);
      if (!outputUrl) return null;
      return {
        jobId: jobId,
        url: outputUrl
      };
    } catch (err) {
      console.log("[Log] Terjadi kendala pada metode generate:", err.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["template", "generate"];
  if (!action) {
    return res.status(400).json({
      success: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          template: "/?action=template&isSelfie=false",
          generate: {
            endpoint: "/?action=generate",
            method: "POST",
            body: {
              mode: "ai-style",
              image: "URL_ATAU_BASE64_GAMBAR_WAJIB",
              effect: "4921",
              prompt: "Kucing lucu, 3D render"
            }
          }
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      success: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new WiseoelClient();
  try {
    let response;
    console.log(`[Next.js API] Executing action: '${action}'`);
    switch (action) {
      case "template":
        response = await api.template(params);
        break;
      case "generate":
        if (!params.image) {
          return res.status(400).json({
            success: false,
            error: "Parameter 'image' wajib diisi untuk memproses gambar."
          });
        }
        response = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Aksi tidak dikenali oleh sistem API."
        });
    }
    if (!response) {
      return res.status(502).json({
        success: false,
        error: "Koneksi ke server hulu API gagal atau data kosong."
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on action '${action}':`, error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan sistem internal pada API Next.js.",
      error: error.message || "Unknown Error Exception"
    });
  }
}