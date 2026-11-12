import axios from "axios";
class MagneumWaifu {
  constructor() {
    this.api = "https://api.github.com/repos/magneum/magneum/contents/db";
    this.raw = "https://raw.githubusercontent.com/magneum/magneum/main/db";
    this.hdr = {
      "User-Agent": "Magneum-Waifu-Client"
    };
  }
  async req(url, type = "json") {
    try {
      console.log(`[LOG] Requesting URL: ${url}`);
      const res = await axios.get(url, {
        responseType: type,
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
  async gModes() {
    try {
      console.log("[LOG] Mengambil list mode dari repositori...");
      const res = await this.req(this.api);
      const modes = res?.data?.filter(item => item?.type === "dir")?.map(dir => dir?.name) || [];
      return modes?.length ? modes : [];
    } catch (err) {
      console.error(`[LOG ERROR gModes] ${err?.message || "Gagal mengambil mode"}`);
      return [];
    }
  }
  async gTypes(mode) {
    try {
      console.log(`[LOG] Mengambil list type untuk mode: ${mode}...`);
      const res = await this.req(`${this.api}/${mode}`);
      const types = res?.data?.filter(item => item?.name?.endsWith(".json"))?.map(file => file?.name?.replace(".json", "")) || [];
      return types?.length ? types : [];
    } catch (err) {
      console.error(`[LOG ERROR gTypes] ${err?.message || "Gagal mengambil type"}`);
      return [];
    }
  }
  async waifu({
    mode,
    type,
    ...rest
  } = {}) {
    try {
      console.log("[LOG] Memulai validasi input...");
      const modes = await this.gModes();
      const selMode = mode ? mode.toLowerCase() : null;
      if (!selMode || !modes.includes(selMode)) {
        console.warn(`[LOG WARN] Mode "${selMode}" tidak valid atau belum diisi. Menampilkan list mode tersedia.`);
        return {
          status: false,
          result: modes,
          mode: selMode,
          type: null
        };
      }
      console.log(`[LOG] Mode valid: ${selMode}`);
      const types = await this.gTypes(selMode);
      const selType = type ? type.toLowerCase() : null;
      if (!selType || !types.includes(selType)) {
        console.warn(`[LOG WARN] Type "${selType}" tidak valid atau belum diisi. Menampilkan list type untuk mode "${selMode}".`);
        return {
          status: false,
          result: types,
          mode: selMode,
          type: selType
        };
      }
      console.log(`[LOG] Type valid: ${selType}`);
      const jsonUrl = `${this.raw}/${selMode}/${selType}.json`;
      console.log(`[LOG] Mengambil data dari: ${jsonUrl}`);
      const jsonRes = await this.req(jsonUrl);
      const urls = Array.isArray(jsonRes?.data) ? jsonRes.data : [];
      const pickedUrl = this.rnd(urls);
      if (!pickedUrl) {
        console.error("[LOG ERROR] File JSON kosong atau tidak ada URL");
        return {
          status: false,
          result: [],
          mode: selMode,
          type: selType
        };
      }
      console.log(`[LOG] Berhasil mendapatkan URL gambar acak: ${pickedUrl}`);
      return {
        status: true,
        result: pickedUrl,
        mode: selMode,
        type: selType
      };
    } catch (err) {
      console.error(`[LOG ERROR waifu] ${err?.message || "Terjadi kesalahan"}`);
      return {
        status: false,
        result: null,
        mode: mode ? mode.toLowerCase() : null,
        type: type ? type.toLowerCase() : null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new MagneumWaifu();
  try {
    const data = await api.waifu(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}