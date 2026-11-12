import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import qs from "qs";
const BASE = "https://mdnitems.com";
const URL_CEK = `${BASE}/cek-region`;
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36";
class GameChecker {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        "User-Agent": UA,
        "Accept-Language": "id,ms;q=0.9,en;q=0.8",
        DNT: "1"
      }
    }));
    this.token = null;
  }
  async init() {
    console.log("[init] Mengambil halaman & token CSRF...");
    try {
      const res = await this.client.get(URL_CEK, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Upgrade-Insecure-Requests": "1"
        }
      });
      const $ = cheerio.load(res.data);
      this.token = $('input[name="_token"]').val() || null;
      console.log("[init] Token:", this.token ?? "(tidak ditemukan)");
    } catch (e) {
      console.error("[init] Gagal:", e?.message || e);
      throw e;
    }
  }
  async check({
    uid,
    zone,
    ...rest
  }) {
    console.log(`[check] uid=${uid} zone=${zone}`);
    try {
      if (!this.token) await this.init();
      const payload = qs.stringify({
        _token: this.token,
        userid: uid,
        zone: zone,
        ...rest
      });
      console.log("[check] Mengirim request POST...");
      const res = await this.client.post(URL_CEK, payload, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          Origin: BASE,
          Referer: URL_CEK,
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
          "Cache-Control": "max-age=0",
          "sec-ch-ua": '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        },
        maxRedirects: 5
      });
      console.log("[check] Parsing hasil HTML...");
      const result = this.parse(res.data);
      console.log("[check] Hasil:", result);
      return result;
    } catch (e) {
      console.error("[check] Error:", e?.response?.status || e?.message || e);
      throw e;
    }
  }
  parse(html) {
    const $ = cheerio.load(html);
    const result = {};
    $(".table-custom tr").each((_, row) => {
      const k = $(row).find("th").text().trim();
      const v = $(row).find("td").text().trim();
      if (k && v) result[k.toLowerCase().replace(/\s+/g, "_")] = v;
    });
    return result;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.uid || !params.zone) {
    return res.status(400).json({
      error: "Parameter 'uid' dan 'zone' diperlukan"
    });
  }
  const api = new GameChecker();
  try {
    const data = await api.check(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}