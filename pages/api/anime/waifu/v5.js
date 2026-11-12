import axios from "axios";
class BoredAnime {
  constructor(baseURL) {
    this.base = baseURL ? baseURL : "https://content.boredhumans.com";
    this.max = 1e4;
  }
  chk(val) {
    const n = Number(val);
    return !isNaN(n) && n >= 1 && n <= this.max ? n : null;
  }
  rnd(prev) {
    let num;
    do {
      num = Math.floor(Math.random() * this.max) + 1;
    } while (prev && num === Number(prev));
    return num;
  }
  url(num) {
    return `${this.base}/anime_images_${num}.jpg`;
  }
  async generate({
    id,
    number,
    previous,
    all,
    ...rest
  } = {}) {
    const isAll = all === true || all === "true" ? true : false;
    const reqNum = id || number;
    const targetNum = reqNum ? this.chk(reqNum) : this.rnd(previous);
    try {
      console.log("[LOG] Inisialisasi BoredAnime Generator...");
      if (reqNum && !targetNum) {
        console.log(`[LOG ERROR] Nomor '${reqNum}' tidak valid.`);
        return {
          status: false,
          error: `Parameter 'id' atau 'number' harus berada dalam rentang 1 sampai ${this.max}`
        };
      }
      const imgUrl = this.url(targetNum);
      console.log(`[LOG] Target Anime ID #${targetNum}: ${imgUrl}`);
      if (isAll) {
        console.log("[LOG] Mode JSON aktif (all: true), mengirim detail metadata...");
        return {
          status: true,
          result: {
            id: targetNum,
            url: imgUrl,
            max: this.max
          }
        };
      }
      console.log("[LOG] Mengunduh binary gambar...");
      const res = await axios.get(imgUrl, {
        params: rest || {},
        responseType: "arraybuffer",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
        }
      });
      console.log("[LOG] Gambar binary berhasil diunduh.");
      return {
        status: res?.status === 200 ? true : false,
        buffer: res?.data ? Buffer.from(res.data) : null,
        contentType: res?.headers?.["content-type"] || "image/jpeg"
      };
    } catch (err) {
      console.log(`[LOG ERROR] ${err?.message || "Gagal memproses gambar anime"}`);
      return {
        status: false,
        error: err?.response?.data || err?.message || "Request failed"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new BoredAnime();
  try {
    const data = await api.generate(params);
    if (!data?.status) {
      return res.status(400).json(data);
    }
    if (data?.buffer) {
      res.setHeader("Content-Type", data?.contentType || "image/jpeg");
      return res.status(200).send(data.buffer);
    }
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error?.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}