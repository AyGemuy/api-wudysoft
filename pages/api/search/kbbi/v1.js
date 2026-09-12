import axios from "axios";
import * as cheerio from "cheerio";
class KbbiScraper {
  constructor() {
    try {
      this.cookies = "";
      this.client = axios.create({
        baseURL: "https://kbbi.web.id",
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://kbbi.web.id/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest"
        },
        timeout: 6e4
      });
      this.client.interceptors.request.use(config => {
        try {
          console.log("[Process] Menyiapkan request header...");
          if (this.cookies) {
            config.headers["Cookie"] = this.cookies;
            console.log("[Process] Cookie disematkan pada request");
          }
          return config;
        } catch (err) {
          console.log(`[Process] Gagal menyematkan cookie: ${err?.message || err}`);
          return config;
        }
      }, error => {
        try {
          console.log("[Process] Error terdeteksi pada request interceptor");
          return Promise.reject(error);
        } catch (err) {
          return Promise.reject(error);
        }
      });
      this.client.interceptors.response.use(response => {
        try {
          console.log("[Process] Memproses response interceptor...");
          const setCookie = response.headers?.["set-cookie"];
          if (setCookie) {
            this.cookies = setCookie.map(c => c.split(";")[0]).join("; ");
            console.log("[Process] Cookie disimpan untuk request berikutnya");
          }
          return response;
        } catch (err) {
          console.log(`[Process] Gagal menyimpan cookie dari response: ${err?.message || err}`);
          return response;
        }
      }, error => {
        try {
          console.log("[Process] Error terdeteksi pada response interceptor");
          return Promise.reject(error);
        } catch (err) {
          return Promise.reject(error);
        }
      });
    } catch (error) {
      console.log(`[Process] Gagal menginisialisasi instansi kelas: ${error?.message || error}`);
    }
  }
  rnd() {
    try {
      console.log("[Process] Menghasilkan kode random untuk endpoint AJAX...");
      const randomStr = Math.random().toString(36).substring(2, 7);
      return randomStr || "abcde";
    } catch (error) {
      console.log(`[Process] Gagal membuat kode random: ${error?.message || error}`);
      return "abcde";
    }
  }
  async req(path) {
    try {
      console.log(`[Process] Mengirim request HTTP GET AJAX ke path: ${path}`);
      const response = await this.client.get(path, {
        headers: {
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      return response?.data || null;
    } catch (error) {
      console.log(`[Process] Error pada HTTP request ke path ${path}: ${error?.message || error}`);
      throw error;
    }
  }
  prs(html) {
    try {
      console.log("[Process] Mengurai (parsing) fragmen HTML hasil AJAX...");
      const $ = cheerio.load(html || "");
      const plainText = $.text()?.trim() || "";
      const wordClass = $("em").first().text()?.trim() || "";
      const boldTerms = $("b").map((_, element) => $(element).text()?.trim()).get().filter(Boolean) || [];
      return {
        html_konten: html,
        teks_polos: plainText,
        kelas_kata: wordClass,
        istilah_tebal: boldTerms
      };
    } catch (error) {
      console.log(`[Process] Gagal mengurai elemen HTML: ${error?.message || error}`);
      return null;
    }
  }
  async search({
    query,
    ...rest
  }) {
    console.log("[Process] Memulai pencarian kata...");
    try {
      const targetQuery = query ? query.trim() : "enteng";
      const formattedQuery = targetQuery.replace(/\s+atau\s+/gi, "-atau-");
      const encodedQuery = encodeURIComponent(formattedQuery);
      const randValue = this.rnd();
      const ajaxPath = `/${encodedQuery}/ajax_${randValue}`;
      const responseData = await this.req(ajaxPath);
      const rawItem = responseData?.[0] || null;
      if (!rawItem || !rawItem.d) {
        console.log(`[Process] Hasil pencarian untuk kata "${targetQuery}" kosong`);
        return {
          status: false,
          result: {
            kata_kunci: targetQuery,
            pesan: "Kata tidak ditemukan di dalam database KBBI"
          }
        };
      }
      const parsedData = this.prs(rawItem.d);
      if (!parsedData) {
        console.log("[Process] Gagal memperoleh data hasil penguraian HTML");
        return {
          status: false,
          result: {
            kata_kunci: targetQuery,
            pesan: "Terjadi kegagalan saat membaca respon dari server"
          }
        };
      }
      console.log("[Process] Seluruh proses pencarian selesai dijalankan");
      return {
        status: true,
        result: {
          kata_kunci: targetQuery,
          kata_asli: rawItem.w || targetQuery,
          tipe_entri: rawItem.x || 0,
          html_definisi: parsedData.html_konten,
          teks_definisi: parsedData.teks_polos,
          kelas_kata: parsedData.kelas_kata,
          istilah_terkait: parsedData.istilah_tebal
        }
      };
    } catch (error) {
      console.log(`[Process] Error pada metode search: ${error?.message || error}`);
      return {
        status: false,
        result: {
          pesan_error: error?.message || "Gagal memproses pencarian karena gangguan teknis"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new KbbiScraper();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}