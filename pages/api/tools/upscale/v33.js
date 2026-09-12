import axios from "axios";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  createHash,
  randomBytes
} from "crypto";
import apiConfig from "@/configs/apiConfig";
const API_MAIL = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
const API_BASE = "https://www.nightmare-ai.com";
const SUPABASE_URL = "https://hbwtvodxughhtbtdhypv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhid3R2b2R4dWdoaHRidGRoeXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU4NTE0NzksImV4cCI6MjAyMTQyNzQ3OX0.k16ga3u1nfoxfGHK898UYfgU4qXqq0hP_eNstDfK_tg";
const USER_AGENT = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";

function generatePkce() {
  const verifier = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(verifier).digest("base64");
  const challenge = hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return {
    verifier: verifier,
    challenge: challenge
  };
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class NightmareAI {
  constructor() {
    this.cfg = {
      modes: ["upscale", "restore", "ghibli"],
      scaleResolutions: ["x2", "x4", "2K", "4K"]
    };
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: API_BASE,
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "id-ID",
        Accept: "*/*"
      },
      timeout: 12e4,
      maxRedirects: 5,
      validateStatus: status => status >= 200 && status < 600
    }));
    this.authToken = null;
    this.userEmail = null;
    this.pkce = null;
    console.log("Klien NightmareAI diinisialisasi.");
  }
  vP({
    mode,
    size
  }) {
    console.log("Proses: Memvalidasi parameter input...");
    if (!this.cfg.modes?.includes(mode)) {
      throw new Error(`Mode tidak valid: ${mode}. Tersedia: ${this.cfg.modes?.join(", ") || "tidak ada"}`);
    }
    if (!this.cfg.scaleResolutions?.includes(size)) {
      throw new Error(`Ukuran (size) tidak valid: ${size}. Tersedia: ${this.cfg.scaleResolutions?.join(", ") || "tidak ada"}`);
    }
    console.log("Proses: Validasi parameter selesai.");
    return true;
  }
  async el() {
    console.log("Proses: Memeriksa atau memulai login...");
    if (this.authToken?.length > 10) {
      console.log("Proses: Token sudah tersedia, dilewati.");
      return this.authToken;
    }
    try {
      this.pkce = generatePkce();
      const mailRes = await this.client.get(`${API_MAIL}?action=create`);
      this.userEmail = mailRes.data?.email || null;
      if (!this.userEmail) throw new Error("Gagal mendapatkan email sementara.");
      console.log(`Proses: Email sementara: ${this.userEmail}`);
      await this.sO(this.userEmail, this.pkce.challenge);
      let confirmUrl = null;
      for (let i = 0; i < 60; i++) {
        await sleep(3e3);
        console.log(`Proses: Mencoba ambil OTP ke-${i + 1}...`);
        const otpRes = await this.cO(this.userEmail);
        const textContent = otpRes?.data?.[0]?.text_content || "";
        const match = textContent.match(/Confirm your mail\r\n\[(https:\/\/www\.nightmare-ai\.com\/\/confirm-signin\?confirm_url=[^\]]+)\]/);
        confirmUrl = match?.[1] || null;
        if (confirmUrl) {
          console.log("Proses: Link konfirmasi ditemukan.");
          break;
        }
        if (i === 14) throw new Error("Gagal mendapatkan link konfirmasi setelah 15 kali coba.");
      }
      await this.cU(confirmUrl, this.pkce.verifier);
      let authCookie = null;
      const nightmareCookies = await this.jar.getCookies(API_BASE);
      console.log(`Proses: Cookie di ${API_BASE}: ${nightmareCookies.length}`);
      authCookie = nightmareCookies.find(c => c.key === "sb-hbwtvodxughhtbtdhypv-auth-token");
      if (!authCookie) {
        const supabaseCookies = await this.jar.getCookies(SUPABASE_URL);
        console.log(`Proses: Cookie di ${SUPABASE_URL}: ${supabaseCookies.length}`);
        authCookie = supabaseCookies.find(c => c.key === "sb-hbwtvodxughhtbtdhypv-auth-token");
      }
      const base64Token = authCookie?.value?.replace(/^base64-/, "") || null;
      if (base64Token) {
        const tokenData = JSON.parse(Buffer.from(base64Token, "base64").toString("utf8"));
        this.authToken = tokenData?.access_token || null;
        if (!this.authToken) throw new Error("Gagal mendapatkan access token dari cookie.");
        console.log("Proses: Login Berhasil, Token didapatkan.");
        const sub = await this.cS(this.userEmail, this.authToken);
        console.log(`Proses: Status Langganan: ${sub?.service_limit > 2 ? "Paid" : "Free"}`);
        return this.authToken;
      } else {
        console.log("DEBUG: Cookie 'sb-hbwtvodxughhtbtdhypv-auth-token' tidak ditemukan.");
        const allNightmare = await this.jar.getCookies(API_BASE);
        const allSupabase = await this.jar.getCookies(SUPABASE_URL);
        console.log("DEBUG: Semua cookies nightmare-ai:", allNightmare.map(c => c.key).join(", "));
        console.log("DEBUG: Semua cookies supabase:", allSupabase.map(c => c.key).join(", "));
        throw new Error("Gagal mendapatkan cookie otorisasi.");
      }
    } catch (error) {
      console.error("ERROR (el): Gagal memastikan login.", error.message);
      this.authToken = null;
      throw error;
    }
  }
  async sO(email, challenge) {
    console.log("Proses: Mengirim OTP/Link Ajaib...");
    const headers = {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
      "content-type": "application/json;charset=UTF-8",
      origin: API_BASE,
      referer: `${API_BASE}/`,
      "x-client-info": "supabase-ssr/0.6.1 createBrowserClient",
      "x-supabase-api-version": "2024-01-01",
      Accept: "*/*"
    };
    const payload = {
      email: email,
      data: {},
      create_user: true,
      gotrue_meta_security: {},
      code_challenge: challenge,
      code_challenge_method: "s256"
    };
    try {
      await this.client.post(`${SUPABASE_URL}/auth/v1/otp?redirect_to=${encodeURIComponent(`${API_BASE}/api/auth/callback`)}`, payload, {
        headers: headers
      });
      console.log("Proses: Permintaan OTP terkirim.");
    } catch (error) {
      console.error("ERROR (sO): Gagal mengirim OTP.", error.message);
      throw error;
    }
  }
  async cO(email) {
    console.log("Proses: Memeriksa inbox...");
    try {
      const res = await this.client.get(`${API_MAIL}?action=message&email=${email}`);
      return res.data;
    } catch (error) {
      console.log("WARNING (cO): Gagal mengambil pesan, coba lagi...");
      return {
        data: []
      };
    }
  }
  async cU(url, verifier) {
    console.log("Proses: Mengkonfirmasi URL dan mengambil token...");
    try {
      const verifierCookie = `sb-hbwtvodxughhtbtdhypv-auth-token-code-verifier=base64-${Buffer.from(verifier).toString("base64")}; Path=/; HttpOnly; SameSite=Lax`;
      await this.jar.setCookie(verifierCookie, API_BASE);
      await this.jar.setCookie(verifierCookie, SUPABASE_URL);
      console.log("Proses: PKCE verifier cookie telah diset.");
      const urlObj = new URL(url);
      const supabaseVerifyUrl = urlObj.searchParams.get("confirm_url");
      if (!supabaseVerifyUrl) throw new Error("Gagal mengekstrak Supabase verify URL.");
      console.log(`Proses: Supabase Verify URL: ${supabaseVerifyUrl}`);
      const headers = {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9",
        Referer: API_BASE,
        "sec-fetch-site": "cross-site",
        "sec-fetch-mode": "navigate",
        "Upgrade-Insecure-Requests": "1"
      };
      console.log("Proses: Memanggil Supabase verify dengan redirect otomatis...");
      await this.client.get(supabaseVerifyUrl, {
        headers: headers,
        maxRedirects: 10
      });
      console.log("Proses: Konfirmasi selesai dengan sukses.");
    } catch (error) {
      console.log("WARNING (cU): Error saat konfirmasi, tapi cookie mungkin sudah terset:", error.message);
    }
  }
  async cS(email, token) {
    console.log("Proses: Memeriksa status langganan...");
    const headers = {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${token}`,
      accept: "application/vnd.pgrst.object+json",
      origin: API_BASE,
      referer: `${API_BASE}/`,
      "x-client-info": "supabase-ssr/0.6.1 createBrowserClient"
    };
    try {
      const encodedEmail = encodeURIComponent(email);
      const res = await this.client.get(`${SUPABASE_URL}/rest/v1/subscriptions?select=*&email=eq.${encodedEmail}`, {
        headers: headers
      });
      return res.data;
    } catch (error) {
      console.error("ERROR (cS): Gagal memeriksa langganan.", error.message);
      return null;
    }
  }
  async rI(image) {
    console.log("Proses: Menyelesaikan input gambar...");
    if (Buffer.isBuffer(image)) {
      return {
        buffer: image,
        mimeType: "image/jpeg"
      };
    }
    const imgStr = image?.toString() || "";
    if (imgStr.startsWith("data:")) {
      const parts = imgStr.split(",");
      const mimeType = parts[0].match(/:(.*?);/)?.[1] || "image/png";
      const buffer = Buffer.from(parts[1], "base64");
      return {
        buffer: buffer,
        mimeType: mimeType
      };
    } else if (imgStr.startsWith("http")) {
      console.log("Proses: Mengunduh gambar dari URL...");
      const res = await axios.get(imgStr, {
        responseType: "arraybuffer"
      });
      return {
        buffer: Buffer.from(res.data),
        mimeType: res.headers["content-type"] || "image/jpeg"
      };
    } else {
      throw new Error("Format gambar tidak didukung (URL/Base64/Buffer).");
    }
  }
  async uI(buffer, mimeType) {
    console.log("Proses: Mengunggah gambar ke R2...");
    await this.el();
    try {
      const form = new FormData();
      form.append("file", buffer, {
        filename: "blob",
        contentType: mimeType
      });
      const headers = {
        "Content-Type": `multipart/form-data; boundary=${form.getBoundary()}`,
        origin: API_BASE,
        referer: `${API_BASE}/ai-image-upscaler`
      };
      const res = await this.client.post("/api/uploadToR2", form, {
        headers: headers
      });
      const imageUrl = res.data?.data?.url || null;
      if (!imageUrl) throw new Error("URL gambar hasil upload tidak ditemukan.");
      console.log(`Proses: Upload berhasil: ${imageUrl}`);
      return imageUrl;
    } catch (error) {
      console.error("ERROR (uI): Gagal mengupload gambar.", error.message);
      throw error;
    }
  }
  async pI(imageUrl, params, aiType, scaleResolution) {
    console.log("Proses: Memproses gambar...");
    await this.el();
    try {
      const headers = {
        "Content-Type": "text/plain;charset=UTF-8",
        origin: API_BASE,
        referer: `${API_BASE}/ai-image-upscaler`
      };
      const payload = {
        email: this.userEmail,
        params: {
          image: imageUrl,
          ...params
        },
        aiType: aiType,
        scaleResolution: scaleResolution
      };
      const res = await this.client.post("/api/process-image", payload, {
        headers: headers
      });
      const data = res.data?.data;
      if (res.data?.code !== 0 || !data) throw new Error(res.data?.msg || "Gagal memproses gambar.");
      const resultUrl = data.upscaleRes?.[0] || null;
      return {
        result: resultUrl,
        limit: data.limit,
        service_count: data.service_count,
        needWatermark: data.needWatermark
      };
    } catch (error) {
      console.error("ERROR (pI): Gagal memproses gambar.", error.message);
      throw error;
    }
  }
  async generate({
    mode = "upscale",
    size = "x2",
    imageUrl: image,
    ...rest
  }) {
    let uploadUrl = null;
    try {
      if (!image) throw new Error('Parameter "image" wajib diisi.');
      this.vP({
        mode: mode,
        size: size
      });
      const {
        buffer,
        mimeType
      } = await this.rI(image);
      uploadUrl = await this.uI(buffer, mimeType);
      const scaleValue = rest.scale ? rest.scale : 3.103030303030303;
      const aiType = mode === "upscale" ? "upscaler" : mode;
      const scaleResolution = size;
      const processParams = {
        face_enhance: rest.face_enhance || false,
        scale: parseFloat(scaleValue),
        ...rest,
        image: uploadUrl
      };
      const processResult = await this.pI(uploadUrl, processParams, aiType, scaleResolution);
      return processResult;
    } catch (error) {
      console.error("ERROR (generate): Operasi gagal secara keseluruhan.", error.message);
      return {
        result: null,
        info: {
          error: error.message,
          uploadedUrl: uploadUrl || "N/A",
          requestMode: mode
        }
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
  const api = new NightmareAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}