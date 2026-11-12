import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import apiConfig from "@/configs/apiConfig";
class NanoBanana {
  constructor() {
    this.base = "https://nanabananapro.com";
    this.jar = new CookieJar();
    this.http = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true
    }));
    this.isAuthed = false;
    this.credits = 0;
    this.hdrs = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en;q=0.8",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async _parse(src) {
    try {
      if (!src) return null;
      let buf, mime = "image/jpeg";
      if (Buffer.isBuffer(src)) {
        buf = src;
      } else if (typeof src === "string" && src.startsWith("http")) {
        console.log(`[PARSE] Mengunduh berkas remote: ${src.substring(0, 40)}...`);
        const r = await axios.get(src, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(r.data);
        mime = r.headers["content-type"] || mime;
      } else if (typeof src === "string" && src.includes("base64,")) {
        const p = src.split("base64,");
        mime = p[0].match(/data:(.*?);/)?.[1] || mime;
        buf = Buffer.from(p[1], "base64");
      } else if (typeof src === "string") {
        buf = Buffer.from(src, "base64");
      }
      const ext = mime.split("/")?.[1] || "jpg";
      const filename = `upload_${crypto.randomBytes(8).toString("hex")}.${ext}`;
      return buf ? {
        buf: buf,
        mime: mime,
        filename: filename
      } : null;
    } catch (e) {
      console.error("[ERR_PARSE]", e.message);
      return null;
    }
  }
  async _cMail() {
    try {
      console.log("[EMAIL] Request pembuatan email temp baru...");
      const r = await this.http.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      return r.data?.email || null;
    } catch (e) {
      console.error("[ERR_CMAIL]", e.message);
      return null;
    }
  }
  async _waitOtp(email) {
    try {
      console.log(`[EMAIL] Memantau inbox masuk untuk: ${email}...`);
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const r = await this.http.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        const text = r.data?.data?.[0]?.text_content || "";
        const match = text.match(/https:\/\/nanabananapro\.com\/api\/auth\/verify-email\?token=[^\s]+/);
        if (match?.[0]) {
          console.log("[EMAIL] Link verifikasi berhasil didapatkan.");
          return match[0];
        }
      }
      return null;
    } catch (e) {
      console.error("[ERR_OTP]", e.message);
      return null;
    }
  }
  async _getUserIdFromCookie() {
    try {
      const cookies = await this.jar.getCookies(this.base);
      const dataCookie = cookies.find(c => c.key.includes("session_data"));
      if (!dataCookie) return null;
      const decoded = Buffer.from(decodeURIComponent(dataCookie.value), "base64").toString("utf8");
      const parsed = JSON.parse(decoded);
      return parsed?.session?.user?.id || parsed?.session?.session?.userId || null;
    } catch {
      return null;
    }
  }
  async _identifyUser(userId) {
    try {
      const sessionId = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
      console.log(`[ANALYTICS] Mengirimkan data identitas -> User: ${userId}`);
      const r = await this.http.post(`${this.base}/api/analytics/identify`, {
        session_id: sessionId,
        user_id: userId
      }, {
        headers: {
          ...this.hdrs,
          "content-type": "application/json",
          origin: this.base,
          referer: `${this.base}/`
        }
      });
      return r.data?.success || false;
    } catch (e) {
      console.error("[ERR_IDENTIFY]", e.message);
      return false;
    }
  }
  async _checkCredits() {
    try {
      console.log("[CREDIT] Menarik data kuota sisa credit via Server Action...");
      const r = await this.http.post(`${this.base}/`, "[]", {
        headers: {
          ...this.hdrs,
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": "7fd149d65e323bd91f6ee3a0513ff3091436f2d87b",
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22(marketing)%22%2C%7B%22children%22%3A%5B%22(home)%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D",
          origin: this.base,
          referer: `${this.base}/`
        }
      });
      const rawText = r.data || "";
      const match = rawText.match(/"credits":\s*(\d+)/);
      if (match?.[1]) {
        this.credits = parseInt(match[1], 10);
        console.log(`[CREDIT] Berhasil mendapatkan hak akses! Balance saat ini: [${this.credits} Credits]`);
        return this.credits;
      }
      return 0;
    } catch (e) {
      console.error("[ERR_CREDIT]", e.message);
      return 0;
    }
  }
  async initAccount() {
    try {
      const email = await this._cMail();
      if (!email) throw new Error("Gagal mendapatkan email penguji.");
      const name = crypto.randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
      const password = crypto.randomBytes(12).toString("base64");
      console.log(`[AUTH] Mendaftarkan email: ${email}`);
      console.log(`[AUTH] Kredensial -> Name: [${name}] | Pass: [${password}]`);
      await this.http.post(`${this.base}/api/auth/sign-up/email`, {
        email: email,
        password: password,
        name: name,
        callbackURL: `${this.base}/?newUser=1&method=email`
      }, {
        headers: {
          ...this.hdrs,
          origin: this.base,
          referer: `${this.base}/auth/register`
        }
      });
      const link = await this._waitOtp(email);
      if (!link) throw new Error("Link konfirmasi tidak ditemukan atau expired.");
      console.log("[AUTH] Mengeksekusi verifikasi token pendaftaran...");
      await this.http.get(link, {
        headers: this.hdrs,
        maxRedirects: 5,
        validateStatus: status => status >= 200 && status < 400
      });
      let userId = await this._getUserIdFromCookie();
      if (!userId) {
        console.log("[AUTH] Sesi belum stabil. Memicu fallback re-login...");
        await this.http.post(`${this.base}/api/auth/sign-in/email`, {
          email: email,
          password: password,
          callbackURL: this.base
        }, {
          headers: {
            ...this.hdrs,
            origin: this.base,
            referer: this.base
          }
        });
        userId = await this._getUserIdFromCookie();
      }
      if (!userId) throw new Error("Gagal mendapatkan User ID dari session data.");
      await this._identifyUser(userId);
      await this._checkCredits();
      this.isAuthed = true;
      return true;
    } catch (e) {
      console.error("[ERR_INIT]", e.message);
      this.isAuthed = false;
      return false;
    }
  }
  async _upFile(fileSrc) {
    try {
      const p = await this._parse(fileSrc);
      if (!p) return null;
      console.log(`[UPLOAD] Mentransmisikan file form-data -> ${p.filename}`);
      const form = new FormData();
      form.append("file", p.buf, {
        filename: p.filename,
        contentType: p.mime
      });
      form.append("folder", "ai/image/refs");
      const r = await this.http.post(`${this.base}/api/storage/upload`, form, {
        headers: {
          ...this.hdrs,
          ...form.getHeaders(),
          origin: this.base,
          referer: this.base
        }
      });
      return r.data?.data?.url || null;
    } catch (e) {
      console.error("[ERR_UPLOAD]", e.message);
      return null;
    }
  }
  async generate({
    prompt,
    image,
    ...rest
  }) {
    try {
      if (!this.isAuthed || this.credits <= 0) {
        console.log("[ENGINE] Sesi habis atau kredit kosong. Mempersiapkan akun baru...");
        const authSuccess = await this.initAccount();
        if (!authSuccess) throw new Error("Proses otomatisasi pembuatan session token gagal.");
      }
      console.log("[ENGINE] Menyiapkan parameter tugas visual...");
      const urls = [];
      if (image) {
        const arr = Array.isArray(image) ? image : [image];
        console.log(`[ENGINE] Mendeteksi ${arr.length} berkas input gambar referensi.`);
        for (const singleImg of arr) {
          const upUrl = await this._upFile(singleImg);
          if (upUrl) urls.push(upUrl);
        }
      }
      const body = {
        prompt: prompt,
        modelKey: rest?.modelKey || "gpt-image-2",
        imageUrls: urls,
        aspectRatio: rest?.aspectRatio || "1:1",
        ...rest
      };
      console.log("[ENGINE] Mengirimkan antrean rendering gambar...");
      const req = await this.http.post(`${this.base}/api/ai/image/submit`, body, {
        headers: {
          ...this.hdrs,
          origin: this.base,
          referer: this.base
        }
      });
      const reqId = req.data?.requestId || req.data?.data?.requestId;
      if (!reqId) throw new Error(`Submit ditolak: ${JSON.stringify(req.data)}`);
      this.credits = Math.max(0, this.credits - 1);
      let cycle = 0;
      const maxCycles = 60;
      console.log(`[POLL] Memulai monitoring pemrosesan untuk Request ID: ${reqId}`);
      while (cycle < maxCycles) {
        cycle++;
        await new Promise(r => setTimeout(r, 3e3));
        const check = await this.http.get(`${this.base}/api/ai/image/result?requestId=${reqId}`, {
          headers: {
            ...this.hdrs,
            referer: `${this.base}/mycreations`
          }
        });
        const status = check.data?.status || "failed";
        console.log(`[POLL] Siklus ${cycle}/${maxCycles} -> Status Respon: [${status}]`);
        if (status === "succeeded" || check.data?.imageUrl) {
          return {
            success: true,
            imageUrl: check.data.imageUrl,
            data: check.data
          };
        }
        if (status === "failed") {
          return {
            success: false,
            error: check.data?.error || "Rendering dihentikan oleh engine.",
            data: check.data
          };
        }
      }
      return {
        success: false,
        error: "Proses pelacakan terhenti karena timeout."
      };
    } catch (e) {
      console.error("[ERR_GENERATION]", e.message);
      if (e.response?.status === 401) this.isAuthed = false;
      return {
        success: false,
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new NanoBanana();
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