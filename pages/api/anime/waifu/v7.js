import axios from "axios";
class MaldonadoWaifu {
  constructor() {
    this.url = "https://fmaldonado6.github.io/files/waifus.json";
    this.hdr = {
      "User-Agent": "Maldonado-Waifu-Client"
    };
  }
  async req(url) {
    try {
      console.log(`[LOG] Requesting URL: ${url}`);
      const res = await axios.get(url, {
        headers: this.hdr
      });
      return res ? res : null;
    } catch (err) {
      console.error(`[LOG ERROR req] ${err?.message || "Gagal melakukan request"}`);
      return null;
    }
  }
  rnd(arr) {
    try {
      return arr?.length ? arr[Math.floor(Math.random() * arr.length)] : null;
    } catch (err) {
      console.error(`[LOG ERROR rnd] ${err?.message || "Gagal mengambil item acak"}`);
      return null;
    }
  }
  async gData() {
    try {
      console.log("[LOG] Mengambil list data waifus.json...");
      const res = await this.req(this.url);
      const data = Array.isArray(res?.data) ? res.data : [];
      return data?.length ? data : [];
    } catch (err) {
      console.error(`[LOG ERROR gData] ${err?.message || "Gagal memuat database waifu"}`);
      return [];
    }
  }
  async waifu() {
    try {
      console.log("[LOG] Memulai proses fetch random waifu...");
      const list = await this.gData();
      if (!list?.length) {
        console.error("[LOG ERROR] List waifu kosong atau server tidak dapat diakses");
        return {
          status: false,
          result: null
        };
      }
      const picked = this.rnd(list);
      if (!picked) {
        console.error("[LOG ERROR] Gagal memilih waifu secara acak");
        return {
          status: false,
          result: null
        };
      }
      console.log(`[LOG] Berhasil mendapatkan waifu: ${picked?.title || "Unknown"}`);
      return {
        status: true,
        result: picked
      };
    } catch (err) {
      console.error(`[LOG ERROR waifu] ${err?.message || "Terjadi kesalahan sistem"}`);
      return {
        status: false,
        result: null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new MaldonadoWaifu();
  try {
    const data = await api.waifu();
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}