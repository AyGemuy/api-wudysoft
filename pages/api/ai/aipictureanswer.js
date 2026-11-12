import axios from "axios";
class AiPictureAnswer {
  constructor() {
    this.baseUrl = "https://aipictureanswer.com";
    this.defaultHeaders = {
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      origin: this.baseUrl,
      pragma: "no-cache",
      referer: `${this.baseUrl}/`,
      "sec-ch-ua": '"Chromium";v="135", "Not-A.Brand";v="8"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  async getSession() {
    try {
      const res = await axios.get(this.baseUrl, {
        headers: {
          ...this.defaultHeaders,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate"
        },
        timeout: 15e3
      });
      const html = res.data || "";
      const setCookie = res.headers["set-cookie"] || [];
      const cookies = setCookie.map(c => c.split(";")[0]).join("; ");
      const metaMatch = html.match(/<meta\s+name=["']csrf-token["']\s+content=["'](.*?)["']/i);
      let csrfToken = metaMatch ? metaMatch[1] : null;
      if (!csrfToken) {
        const xsrfMatch = cookies.match(/XSRF-TOKEN=([^;]+)/);
        if (xsrfMatch) {
          csrfToken = decodeURIComponent(xsrfMatch[1]);
        }
      }
      if (!csrfToken) {
        throw new Error("Gagal mengekstrak CSRF token dari halaman.");
      }
      return {
        cookies: cookies,
        csrfToken: csrfToken
      };
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Gagal menginisialisasi session & CSRF";
      console.error("[ERROR:getSession]", msg);
      throw new Error(`[getSession] ${msg}`);
    }
  }
  async formatToDataUri(input) {
    try {
      if (!input || typeof input !== "string") {
        throw new Error("Input 'image' wajib diisi berupa URL string atau Base64.");
      }
      const trimmed = input.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        console.log(`[LOG] Mengunduh gambar dari URL: ${trimmed}...`);
        const res = await axios.get(trimmed, {
          responseType: "arraybuffer",
          timeout: 2e4
        });
        const mime = res.headers["content-type"] || "image/jpeg";
        const base64 = Buffer.from(res.data).toString("base64");
        return `data:${mime};base64,${base64}`;
      }
      if (trimmed.startsWith("data:image/")) {
        return trimmed;
      }
      return `data:image/jpeg;base64,${trimmed}`;
    } catch (err) {
      const msg = err?.message || "Gagal memproses format gambar";
      console.error("[ERROR:formatToDataUri]", msg);
      throw new Error(`[formatToDataUri] ${msg}`);
    }
  }
  async solve({
    image
  }) {
    try {
      console.log("[LOG] Memvalidasi dan menyiapkan gambar...");
      const imageDataUri = await this.formatToDataUri(image);
      console.log("[LOG] Mengambil sesi dan CSRF token baru...");
      const {
        cookies,
        csrfToken
      } = await this.getSession();
      console.log("[LOG] Mengirim gambar ke API Solve...");
      const res = await axios.post(`${this.baseUrl}/api/solve`, {
        image: imageDataUri
      }, {
        headers: {
          ...this.defaultHeaders,
          accept: "application/json",
          "content-type": "application/json",
          cookie: cookies,
          "x-csrf-token": csrfToken
        },
        timeout: 45e3
      });
      const data = res?.data;
      if (!data?.success) {
        throw new Error(data?.message || "Respons dari server menandakan kegagalan.");
      }
      return {
        status: true,
        solution: data.data?.solution || "",
        shareUrl: data.data?.share_url || null,
        plan: data.plan || "guest",
        freeRemaining: data.free_remaining ?? null
      };
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Proses solve gagal dijalankan";
      console.error("[ERROR:solve]", msg);
      return {
        status: false,
        error: msg
      };
    }
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params?.image) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'image' diperlukan (URL gambar atau teks Base64)."
      });
    }
    const solver = new AiPictureAnswer();
    const result = await solver.solve(params);
    if (!result?.status) {
      return res.status(500).json({
        status: false,
        error: result?.error || "Gagal mendapatkan penyelesaian soal."
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    const errorMsg = error?.message || "Terjadi kesalahan internal pada server.";
    console.error("[ERROR:handler]", errorMsg);
    return res.status(500).json({
      status: false,
      error: errorMsg
    });
  }
}