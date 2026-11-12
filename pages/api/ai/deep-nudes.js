import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class DeepNudes {
  constructor() {
    try {
      this.cookies = {};
      this.baseHeaders = {
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      };
      this.client = axios.create({
        headers: this.baseHeaders
      });
      this.client.interceptors.response.use(response => {
        try {
          const url = response.config?.url || "";
          if (url.includes("deep-nudes.com")) {
            const setCookie = response.headers["set-cookie"];
            if (setCookie) {
              setCookie.forEach(cookieStr => {
                const part = cookieStr.split(";")[0]?.split("=") || [];
                if (part.length === 2) {
                  const key = part[0].trim();
                  const val = part[1].trim();
                  this.cookies[key] = val;
                  console.log(`[Cookie Tersimpan] ${key}`);
                }
              });
            }
          }
        } catch (err) {
          console.log(`[Error Interceptor Response] ${err.message}`);
        }
        return response;
      }, error => Promise.reject(error));
      this.client.interceptors.request.use(config => {
        try {
          const url = config.url || "";
          if (url.includes("deep-nudes.com")) {
            const cookieHeader = Object.entries(this.cookies).map(([key, val]) => `${key}=${val}`).join("; ");
            if (cookieHeader) {
              config.headers["cookie"] = cookieHeader;
            }
          }
        } catch (err) {
          console.log(`[Error Interceptor Request] ${err.message}`);
        }
        return config;
      }, error => Promise.reject(error));
    } catch (err) {
      console.log(`[Error Inisialisasi] ${err.message}`);
    }
  }
  async b64(img) {
    try {
      if (Buffer.isBuffer(img)) {
        return `data:image/jpeg;base64,${img.toString("base64")}`;
      }
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          console.log(`[Proses] Mengunduh gambar dari URL: ${img}`);
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          const mime = res.headers["content-type"] || "image/jpeg";
          const data64 = Buffer.from(res.data).toString("base64");
          return `data:${mime};base64,${data64}`;
        }
        if (img.startsWith("data:image")) {
          return img;
        }
        return `data:image/jpeg;base64,${img}`;
      }
      throw new Error("Format gambar tidak didukung");
    } catch (err) {
      console.log(`[Error] Gagal memproses gambar: ${err.message}`);
      throw err;
    }
  }
  async mail() {
    try {
      console.log("[Proses] Membuat email sementara...");
      const res = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      const email = res.data?.email || null;
      console.log(`[Proses] Email berhasil dibuat: ${email}`);
      return email;
    } catch (err) {
      console.log(`[Error] Gagal membuat email: ${err.message}`);
      throw err;
    }
  }
  async send(email) {
    try {
      console.log(`[Proses] Mengirim magic link ke ${email}...`);
      await this.client.post(`${proxy}https://api.deep-nudes.com/auth/magic-link`, {
        email: email
      }, {
        headers: {
          ...this.baseHeaders,
          accept: "*/*",
          "content-type": "application/json",
          origin: "https://app.deep-nudes.com",
          priority: "u=1, i",
          referer: "https://app.deep-nudes.com/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      console.log("[Proses] Magic link berhasil dikirim.");
      return true;
    } catch (err) {
      console.log(`[Error] Gagal mengirim magic link: ${err.message}`);
      throw err;
    }
  }
  async poll(email) {
    try {
      console.log(`[Proses] Memulai pemantauan inbox untuk ${email}...`);
      const limit = 30;
      const delay = 3e3;
      for (let i = 1; i <= limit; i++) {
        try {
          const res = await this.client.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
          const list = res.data?.data || [];
          if (list.length > 0) {
            const content = list[0]?.text_content || "";
            const match = content.match(/token=([a-zA-Z0-9\-_.]+)/);
            if (match && match[1]) {
              console.log(`[Proses] Token ditemukan pada percobaan ke-${i}: ${match[1]}`);
              return match[1];
            }
          }
        } catch (pollErr) {
          console.log(`[Warning] Gagal membaca inbox pada percobaan ke-${i}: ${pollErr.message}`);
        }
        console.log(`[Proses] Mencoba kembali (${i}/${limit}) dalam 3 detik...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      throw new Error("Batas maksimum percobaan pemantauan inbox tercapai.");
    } catch (err) {
      console.log(`[Error] Pemantauan inbox gagal: ${err.message}`);
      throw err;
    }
  }
  async login(token) {
    try {
      console.log("[Proses] Memproses masuk menggunakan token...");
      await this.client.get(`${proxy}https://api.deep-nudes.com/auth/magic-login?token=${token}`, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400,
        headers: {
          ...this.baseHeaders,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          priority: "u=0, i",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        }
      });
      console.log("[Proses] Login berhasil diselesaikan.");
      return true;
    } catch (err) {
      console.log(`[Error] Proses login gagal: ${err.message}`);
      throw err;
    }
  }
  async me() {
    try {
      console.log("[Proses] Mengambil profil akun aktif...");
      const res = await this.client.get(`${proxy}https://api.deep-nudes.com/users/me`, {
        headers: {
          ...this.baseHeaders,
          accept: "*/*",
          origin: "https://app.deep-nudes.com",
          priority: "u=1, i",
          referer: "https://app.deep-nudes.com/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      console.log(`[Proses] Akun: ${res.data?.email || "N/A"} | Saldo: ${res.data?.balance ?? 0}`);
      return res.data;
    } catch (err) {
      console.log(`[Error] Gagal memuat profil akun: ${err.message}`);
      throw err;
    }
  }
  async generate({
    image,
    ...rest
  }) {
    try {
      const hasAuth = this.cookies?.accessToken || null;
      if (!hasAuth) {
        console.log("[Proses] Sesi otentikasi tidak ditemukan. Menjalankan Auto Auth...");
        const email = await this.mail();
        await this.send(email);
        const token = await this.poll(email);
        await this.login(token);
        await this.me();
      } else {
        console.log("[Proses] Sesi otentikasi aktif ditemukan.");
      }
      console.log("[Proses] Menyiapkan pemrosesan gambar untuk generasi...");
      const imgBase64 = await this.b64(image);
      const payload = {
        image: imgBase64,
        type: rest.type || "WOMAN",
        mask: rest.mask !== undefined ? rest.mask : null
      };
      console.log("[Proses] Mengirim request generasi gambar...");
      const res = await this.client.post(`${proxy}https://api.deep-nudes.com/generation`, payload, {
        headers: {
          ...this.baseHeaders,
          accept: "*/*",
          "content-type": "application/json",
          origin: "https://app.deep-nudes.com",
          priority: "u=1, i",
          referer: "https://app.deep-nudes.com/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      const rawResponse = res.data;
      if (!rawResponse) {
        throw new Error("Server mengembalikan respons kosong.");
      }
      const base64Clean = rawResponse.includes("base64,") ? rawResponse.split("base64,")[1] : rawResponse;
      const buffer = Buffer.from(base64Clean, "base64");
      console.log("[Proses] Proses generasi gambar selesai.");
      return {
        status: true,
        buffer: buffer,
        contentType: "image/jpeg"
      };
    } catch (err) {
      console.log(`[Error] Gagal pada tahap generasi: ${err.message}`);
      return {
        status: false,
        buffer: null,
        contentType: null
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
  const api = new DeepNudes();
  try {
    const data = await api.generate(params);
    res.setHeader("Content-Type", data.contentType || "image/png");
    return res.status(200).send(data.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}