import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
class EmojiGen {
  constructor(st = "") {
    try {
      console.log("[PROSES] Inisialisasi class...");
      this.tk = st ? Buffer.from(st, "base64").toString("utf-8") : "";
      this.ck = "";
      this.ax = axios.create({
        baseURL: "https://emoji.design/api",
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://emoji.design",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://emoji.design/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Linux"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
        }
      });
      this.mx = axios.create({
        baseURL: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`,
        headers: {
          "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
        }
      });
      this.ax.interceptors.response.use(res => {
        try {
          const sc = res.headers?.["set-cookie"];
          if (sc?.length > 0) {
            const incoming = sc.map(c => c.split(";")[0]).join("; ");
            this.ck = this.ck ? `${this.ck}; ${incoming}` : incoming;
          }
        } catch (e) {
          this.log(`Error intercept cookie: ${e.message}`);
        }
        return res;
      }, err => Promise.reject(err));
    } catch (err) {
      console.log(`[PROSES] Error constructor: ${err.message}`);
    }
  }
  log(m) {
    try {
      console.log(`[PROSES] ${m}`);
    } catch (err) {}
  }
  async wait(ms) {
    try {
      return new Promise(r => setTimeout(r, ms));
    } catch (err) {
      this.log(`Error wait: ${err.message}`);
    }
  }
  _randPw() {
    try {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
      return Array.from({
        length: 12
      }, () => chars[Math.floor(Math.random() * chars.length)]).join("") + "Aa1!";
    } catch (err) {
      return "AyBemuy24!";
    }
  }
  async _validateStyle(slug) {
    try {
      this.log(`Memvalidasi ketersediaan style: ${slug}...`);
      const res = await this.ax.get("/styles");
      const styles = res.data?.data?.styles || [];
      const isValid = styles.some(s => s.slug === slug);
      if (!isValid) {
        const availableSlugs = styles.map(s => s.slug).join(", ");
        throw new Error(`Style "${slug}" tidak tersedia! Pilihan yang valid: [${availableSlugs}]`);
      }
      this.log(`Style "${slug}" valid dan siap diproses.`);
    } catch (err) {
      this.log(`[Peringatan Validasi] ${err.message}`);
      if (err.message.includes("tidak tersedia")) throw err;
    }
  }
  async login(email, password) {
    try {
      this.log("Mengambil CSRF token untuk proses sign-in...");
      const rCsrf = await this.ax.get("/auth/csrf");
      const csrfToken = rCsrf.data?.csrfToken || "";
      if (!csrfToken) throw new Error("Gagal mendapatkan CSRF Token");
      this.log(`Melakukan proses autentikasi session untuk ${email}...`);
      this.ax.defaults.headers["cookie"] = this.ck;
      const params = new URLSearchParams();
      params.append("email", email);
      params.append("password", password);
      params.append("redirect", "false");
      params.append("csrfToken", csrfToken);
      params.append("callbackUrl", "https://emoji.design/");
      params.append("json", "true");
      await this.ax.post("/auth/callback/credentials", params, {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      });
      this.tk = `${email}:${password}`;
      this.log("Auto login berhasil diselesaikan.");
    } catch (err) {
      this.log(`Error login session: ${err.message}`);
      throw err;
    }
  }
  async auth() {
    try {
      if (this.tk && this.tk.includes(":")) {
        this.log("Sesi kredensial ditemukan, memicu alur auto login...");
        const [email, password] = this.tk.split(":");
        await this.login(email, password);
        return;
      }
      this.log("Membuat email baru...");
      const rMail = await this.mx.get("", {
        params: {
          action: "create"
        }
      });
      const em = rMail.data?.email || "";
      if (!em) throw new Error("Gagal buat email");
      this.log(`Email aktif: ${em}`);
      this.log("Validasi email...");
      await this.ax.post("/auth/check-email", {
        email: em
      });
      this.log("Mengirim kode OTP...");
      await this.ax.post("/passport/send-code", {
        email: em,
        type: 1
      });
      let code = "";
      this.log("Polling OTP inbox...");
      for (let i = 0; i < 30; i++) {
        await this.wait(3e3);
        const rCheck = await this.mx.get("", {
          params: {
            action: "message",
            email: em
          }
        });
        const text = rCheck.data?.data?.[0]?.text_content || "";
        const match = text.match(/code is:\s*(\d+)/);
        if (match?.[1]) {
          code = match[1];
          break;
        }
      }
      if (!code) throw new Error("OTP tidak didapatkan");
      this.log(`OTP didapat: ${code}`);
      const pw = this._randPw();
      this.log(`Mendaftarkan akun dengan password acak...`);
      await this.ax.post("/auth/register", {
        email: em,
        password: pw,
        confirmPassword: pw,
        code: code
      });
      this.log("Registrasi sukses.");
      await this.login(em, pw);
    } catch (err) {
      this.log(`Error auth: ${err.message}`);
      throw err;
    }
  }
  get() {
    try {
      return this.tk ? Buffer.from(this.tk).toString("base64") : "";
    } catch (err) {
      this.log(`Error get state: ${err.message}`);
      return "";
    }
  }
  async up(b64Data) {
    try {
      this.log("Mengunggah hasil ke CDN via modul form-data...");
      const cleanB64 = b64Data.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(cleanB64, "base64");
      const fd = new FormData();
      fd.append("file", buffer, {
        filename: "emoji.png",
        contentType: "image/png"
      });
      const res = await axios.post("https://temp.ws.pho.to/upload.php", fd, {
        headers: {
          ...fd.getHeaders()
        }
      });
      this.log("Upload CDN Sukses!");
      return res.data;
    } catch (err) {
      this.log(`Error upload CDN: ${err.message}`);
      throw err;
    }
  }
  async generate({
    state,
    image,
    ...rest
  }) {
    try {
      const targetSlug = rest.styleSlug || "ghibli-style";
      if (state) this.tk = Buffer.from(state, "base64").toString("utf-8");
      await this.auth();
      this.ax.defaults.headers["cookie"] = this.ck;
      await this._validateStyle(targetSlug);
      let b64 = "";
      if (typeof image === "string") {
        if (image.startsWith("http")) {
          this.log("Mengunduh image dari URL...");
          const rImg = await axios.get(image, {
            responseType: "arraybuffer"
          });
          b64 = `data:image/jpeg;base64,${Buffer.from(rImg.data).toString("base64")}`;
        } else {
          b64 = image.startsWith("data:image") ? image : `data:image/jpeg;base64,${image}`;
        }
      } else if (Buffer.isBuffer(image)) {
        b64 = `data:image/jpeg;base64,${image.toString("base64")}`;
      }
      const body = {
        styleSlug: targetSlug,
        mode: rest.mode || "PHOTO",
        language: rest.language || "en",
        includeText: rest.includeText ?? false,
        sourceImageBase64: b64,
        presetSlug: rest.presetSlug || "",
        ...rest
      };
      this.log("Submit task emoji...");
      const rGen = await this.ax.post("/generate", body);
      const id = rGen.data?.data?.jobId || "";
      if (!id) throw new Error("Job ID tidak ditemukan");
      this.log(`Task dibuat dengan ID: ${id}`);
      this.log("Memulai polling status...");
      while (true) {
        await this.wait(3e3);
        const rPoll = await this.ax.get(`/generate/${id}`);
        const stat = rPoll.data?.data?.status || "PENDING";
        this.log(`Status task: ${stat}`);
        if (stat === "COMPLETED") {
          this.log("Task selesai diproses server!");
          const result = rPoll.data?.data?.resultBase64 || rPoll.data;
          const cdnData = await this.up(result);
          return {
            result: cdnData,
            state: this.get()
          };
        }
        if (stat === "FAILED") throw new Error("Task gagal diproses server");
      }
    } catch (err) {
      this.log(`Error generate: ${err.message}`);
      throw err;
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
  const api = new EmojiGen();
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