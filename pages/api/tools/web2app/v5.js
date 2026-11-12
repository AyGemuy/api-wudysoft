import axios from "axios";
import crypto from "crypto";
class WebToApp {
  constructor() {
    this.baseUrl = "https://back-r0oe.onrender.com";
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
        Referer: "https://www.web2appify.com/",
        "Accept-Language": "id-ID",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  rndEmail() {
    const salt = crypto.randomBytes(4).toString("hex");
    return `user_${salt}@mail.com`;
  }
  async generate({
    url,
    app_name,
    owner_name = "",
    email,
    phone_number = ""
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
    const payload = {
      url: url,
      "app-name": app_name || "wudysoft",
      "owner-name": owner_name,
      "contact-email": email || this.rndEmail(),
      "phone-number": phone_number
    };
    try {
      console.log(`[Process] Mengirimkan permintaan build ke Web2Appify untuk: ${url}`);
      const res = await this.client.post("/api/download-apk", payload);
      let resData = res?.data || {};
      if (typeof resData === "object" && resData !== null) {
        Object.keys(resData).forEach(key => {
          if (typeof resData[key] === "string") {
            const val = resData[key].trim();
            if (val.startsWith("/") && !val.startsWith("//")) {
              resData[`full_${key}`] = `${this.baseUrl}${val}`;
            } else if (val.endsWith(".apk") && !val.startsWith("http")) {
              resData[`full_${key}`] = `${this.baseUrl}/${val}`;
            }
          }
        });
        const potentialPath = resData.link || resData.path || resData.download || resData.url;
        if (potentialPath && typeof potentialPath === "string" && !potentialPath.startsWith("http")) {
          const cleanPath = potentialPath.startsWith("/") ? potentialPath : `/${potentialPath}`;
          resData.download_url = `${this.baseUrl}${cleanPath}`;
        }
      }
      return {
        status: true,
        result: resData
      };
    } catch (e) {
      console.log(`[Error] Gagal memproses permintaan build: ${e.message}`);
      return {
        status: false,
        result: {
          error: e?.response?.data || e.message
        }
      };
    }
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