import axios from "axios";
class NetDl {
  constructor() {
    this.hdrs = {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "id-ID",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      Origin: "https://get-from.net",
      Referer: "https://get-from.net/",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "ngsw-bypass": "true",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"'
    };
  }
  async req(targetUrl) {
    console.log(`[PROSES] Menginisialisasi request untuk: ${targetUrl}`);
    try {
      const res = await axios.post("https://api.get-from.net/api/requests", {
        url: targetUrl,
        curl: "/en/youtube-video-downloader"
      }, {
        headers: {
          ...this.hdrs,
          "Content-Type": "application/json"
        }
      });
      console.log("[SUKSES] Request inisiasi berhasil mendapatkan data items");
      return res?.data || null;
    } catch (err) {
      console.error(`[ERROR] Gagal inisiasi: ${err?.message || err}`);
      return null;
    }
  }
  async download(options) {
    if (!options?.url) {
      console.error('[ERROR] Parameter "url" wajib diisi.');
      return {
        success: false,
        message: 'Parameter "url" wajib diisi (required).'
      };
    }
    const {
      url,
      quality,
      ...rest
    } = options;
    const targetUrl = url;
    const targetQuality = quality || "640x272";
    console.log(`[PROSES] Memulai pencarian media. Target: ${targetUrl}, Kualitas Dicari: ${targetQuality}`);
    try {
      const initData = await this.req(targetUrl);
      const firstItem = initData?.items?.[0] || null;
      const guidId = firstItem?.guidId || null;
      const quality_list = firstItem?.medias || [];
      if (!guidId) {
        console.error("[ERROR] guidId tidak ditemukan dari respon server.");
        return {
          success: false,
          message: "guidId tidak ditemukan dari respon server."
        };
      }
      console.log(`[PROSES] guidId Didapatkan: ${guidId}. Memvalidasi ketersediaan kualitas...`);
      const matchedFormat = quality_list.find(item => {
        const itemQuality = item?.quality || "";
        return itemQuality.toLowerCase().includes(targetQuality.toLowerCase());
      });
      if (!matchedFormat) {
        console.error(`[ERROR] Kualitas "${targetQuality}" tidak valid atau tidak tersedia.`);
        const available_quality = quality_list.map(item => {
          const rawQuality = item?.quality || "";
          return rawQuality.toLowerCase().replace(/\s+/g, "_");
        });
        return {
          success: false,
          message: `Kualitas "${targetQuality}" tidak ditemukan. Silakan pilih salah satu dari list kualitas yang tersedia.`,
          available_quality: available_quality
        };
      }
      const fmtId = matchedFormat.formatId || "134";
      console.log(`[SUKSES] Kualitas cocok ditemukan (${matchedFormat.quality}). Format ID: ${fmtId}`);
      console.log(`[PROSES] Mengambil detail download stream dari endpoint social untuk guidId: ${guidId}...`);
      const res = await axios.get(`https://api.get-from.net/api/requests/social/${guidId}`, {
        params: {
          formatId: fmtId
        },
        headers: this.hdrs
      });
      console.log("[SUKSES] Data download berhasil didapatkan");
      return res?.data || {
        status: false,
        msg: "No data"
      };
    } catch (err) {
      console.error(`[ERROR] Proses download gagal: ${err?.response?.data?.message || err?.message}`);
      return {
        success: false,
        message: err?.message || err
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
  const api = new NetDl();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}