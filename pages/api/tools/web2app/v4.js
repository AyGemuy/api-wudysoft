import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class WebToApp {
  constructor() {
    this.client = axios.create({
      baseURL: "https://website-to-apk-backend.onrender.com",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://freeappmaker.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://freeappmaker.ai/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async _createMail() {
    try {
      const res = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      return res.data?.email || null;
    } catch (e) {
      console.log(`[Error] Gagal membuat email sementara: ${e.message}`);
      return null;
    }
  }
  async _otpMail(email) {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    let attempts = 0;
    const maxAttempts = 30;
    while (attempts < maxAttempts) {
      try {
        const res = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${encodeURIComponent(email)}`);
        const messages = res?.data?.data || [];
        for (const msg of messages) {
          const text = msg.text_content || "";
          const match = text.match(/\b\d{6}\b/);
          if (match) {
            return match[0];
          }
        }
      } catch (e) {
        console.log(`[Warn] Gagal mengecek inbox email sementara: ${e.message}`);
      }
      attempts++;
      await delay(3e3);
    }
    return null;
  }
  async rsc(src) {
    if (!src) return null;
    try {
      if (Buffer.isBuffer(src)) {
        return src.toString("base64");
      }
      if (typeof src === "string") {
        if (src.startsWith("http")) {
          const res = await axios.get(src, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data).toString("base64");
        }
        if (src.startsWith("data:")) {
          const parts = src.split(",");
          return parts[1] || parts[0];
        }
        return src;
      }
    } catch (e) {
      console.log(`[Warn] Resolusi aset gagal: ${e.message}`);
    }
    return null;
  }
  async requestOtp(email) {
    try {
      const res = await this.client.post("/api/request-otp", {
        email: email
      });
      return res.data;
    } catch (e) {
      return {
        ok: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async verifyOtp(email, code) {
    try {
      const res = await this.client.post("/api/verify-otp", {
        email: email,
        code: code
      });
      return res.data;
    } catch (e) {
      return {
        ok: false,
        error: e?.response?.data || e.message
      };
    }
  }
  async generate({
    url,
    ...rest
  }) {
    console.log("[Process] Memulai validasi parameter input...");
    if (!url) {
      return {
        status: false,
        result: {
          error: 'Parameter "url" wajib dikirim.'
        }
      };
    }
    try {
      let email = rest?.email;
      let otpToken = rest?.otp_token;
      if (!otpToken) {
        console.log("[Process] OTP Token tidak ditemukan. Membuat email sementara otomatis...");
        email = await this._createMail();
        if (!email) {
          return {
            status: false,
            result: {
              error: "Gagal membuat email sementara untuk pendaftaran."
            }
          };
        }
        console.log(`[Process] Email sementara berhasil dibuat: ${email}`);
        console.log(`[Process] Meminta pengiriman OTP ke: ${email}`);
        const otpRequest = await this.requestOtp(email);
        if (!otpRequest?.ok) {
          return {
            status: false,
            result: {
              error: "Gagal meminta OTP dari server backend.",
              detail: otpRequest
            }
          };
        }
        console.log("[Process] Menunggu email masuk untuk membaca kode OTP...");
        const code = await this._otpMail(email);
        if (!code) {
          return {
            status: false,
            result: {
              error: "Gagal menerima kode OTP pada inbox email sementara."
            }
          };
        }
        console.log(`[Process] Kode OTP berhasil didapatkan: ${code}`);
        console.log("[Process] Melakukan verifikasi OTP ke server backend...");
        const verifyRes = await this.verifyOtp(email, code);
        if (!verifyRes?.ok || !verifyRes?.token) {
          return {
            status: false,
            result: {
              error: "Gagal memverifikasi OTP.",
              detail: verifyRes
            }
          };
        }
        otpToken = verifyRes.token;
        console.log(`[Process] Verifikasi OTP berhasil. Token diperoleh.`);
      }
      console.log(`[Process] Melakukan analisis URL target: ${url}`);
      const siteInfoRes = await this.client.get("/api/site-info", {
        params: {
          url: url
        }
      });
      const info = siteInfoRes?.data || {};
      console.log("[Process] Memproses resolusi aset ikon dan splash ke Base64...");
      const iconB64 = await this.rsc(rest?.icon || null);
      const splashB64 = await this.rsc(rest?.splashIcon || rest?.splash || null);
      const onProgress = rest?.onProgress;
      delete rest.onProgress;
      const domain = info?.domain || "myapp";
      const cleanDomain = domain.replace(/[^a-zA-Z0-9]/g, "");
      const defaultPackage = `com.kcf.${cleanDomain}`;
      const defaults = {
        url: url,
        app_name: info?.title || "My Web App",
        depth: 1,
        package: defaultPackage,
        orientation: "both",
        icon: iconB64,
        splash: splashB64,
        email: email,
        otp_token: otpToken
      };
      const payload = {
        ...defaults,
        ...rest
      };
      delete payload.iconPath;
      delete payload.splashIcon;
      console.log("[Process] Mengirimkan data build (JSON) ke server...");
      const buildRes = await this.client.post("/api/build", payload);
      const buildData = buildRes?.data || {};
      const jobId = buildData?.job_id;
      if (!jobId) {
        return {
          status: false,
          result: buildData
        };
      }
      console.log(`[Process] Build berhasil dibuat (Job ID: ${jobId}). Memulai pelacakan otomatis...`);
      return await this.trackStatus(jobId, onProgress);
    } catch (e) {
      console.log(`[Error] Alur pendaftaran build gagal: ${e.message}`);
      return {
        status: false,
        result: {
          error: e?.response?.data || e.message
        }
      };
    }
  }
  async trackStatus(jobId, progressCallback) {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const maxAttempts = 60;
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        const statusRes = await this.client.get(`/api/status/${jobId}`);
        const statusData = statusRes?.data || {};
        if (typeof progressCallback === "function") {
          progressCallback(statusData);
        } else {
          const logs = statusData?.log || [];
          const lastLog = logs[logs.length - 1] || "Sedang memproses...";
          const percentage = statusData?.progress || 0;
          console.log(`[Progress - ${percentage}%] ${lastLog}`);
        }
        if (statusData?.status === "done" || statusData?.progress === 100) {
          console.log("[Process] Proses build selesai.");
          const downloadUrl = `https://website-to-apk-backend.onrender.com/api/download/${jobId}`;
          return {
            status: true,
            result: {
              ...statusData,
              download_url: downloadUrl
            }
          };
        }
      } catch (e) {
        console.log(`[Warn] Gagal mengambil update status: ${e.message}`);
      }
      attempt++;
      await delay(3e3);
    }
    return {
      status: false,
      result: {
        error: "Pelacakan progress dihentikan karena batas waktu habis (Timeout)."
      }
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new WebToApp();
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