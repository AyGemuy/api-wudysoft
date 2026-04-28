import axios from "axios";
import * as cheerio from "cheerio";
class BudgetQuiz {
  constructor() {
    this.baseUrl = "https://sirup.inaproc.id/sirup/caripaketctr/search";
    this.detailUrl = "https://sirup.inaproc.id/sirup/rup/detailPaketPenyedia2020";
    this.headers = {
      accept: "application/json, text/javascript, */*; q=0.01",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://sirup.inaproc.id/sirup/caripaketctr/index",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest",
      cookie: "PLAY_SESSION=7ed948c1fd4dffdb7ea70727a7e6c6cbe33b0826-___TS=1777297299148&tahunAnggaranPilihan=2026&menu=cariPaket2"
    };
    this.keywords = ["Pembangunan", "Pengadaan", "Rehabilitasi", "Pemeliharaan", "Renovasi"];
  }
  _idr(number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(number);
  }
  _opt(correct_pagu) {
    const options = [correct_pagu];
    while (options.length < 4) {
      const multiplier = Math.random() * (2 - .5) + .5;
      const fake_pagu = Math.round(correct_pagu * multiplier / 1e3) * 1e3;
      if (!options.includes(fake_pagu)) options.push(fake_pagu);
    }
    return options.sort(() => Math.random() - .5);
  }
  async generate() {
    try {
      const random_keyword = this.keywords[Math.floor(Math.random() * this.keywords.length)];
      const search_params = {
        tahunAnggaran: "2026",
        jenisPengadaan: "",
        metodePengadaan: "",
        minPagu: "",
        maxPagu: "",
        bulan: "",
        lokasi: "",
        kldi: "",
        pdn: "",
        ukm: "",
        draw: "1",
        "columns[0][data]": "",
        "columns[0][name]": "",
        "columns[0][searchable]": "false",
        "columns[0][orderable]": "false",
        "columns[0][search][value]": "",
        "columns[0][search][regex]": "false",
        "columns[1][data]": "paket",
        "columns[1][name]": "",
        "columns[1][searchable]": "true",
        "columns[1][orderable]": "true",
        "columns[1][search][value]": "",
        "columns[1][search][regex]": "false",
        "columns[2][data]": "pagu",
        "columns[2][name]": "",
        "columns[2][searchable]": "true",
        "columns[2][orderable]": "true",
        "columns[2][search][value]": "",
        "columns[2][search][regex]": "false",
        "columns[3][data]": "jenisPengadaan",
        "columns[4][data]": "isPDN",
        "columns[5][data]": "isUMK",
        "columns[6][data]": "metode",
        "columns[7][data]": "pemilihan",
        "columns[8][data]": "kldi",
        "columns[9][data]": "satuanKerja",
        "columns[10][data]": "lokasi",
        "columns[11][data]": "id",
        "order[0][column]": "5",
        "order[0][dir]": "DESC",
        start: "0",
        length: "25",
        "search[value]": random_keyword,
        "search[regex]": "false",
        _: Date.now()
      };
      const {
        data: searchResult
      } = await axios.get(this.baseUrl, {
        headers: this.headers,
        params: search_params
      });
      if (!searchResult.data || searchResult.data.length === 0) throw new Error("Data tidak ditemukan.");
      const paket = searchResult.data[Math.floor(Math.random() * searchResult.data.length)];
      const {
        data: html
      } = await axios.get(this.detailUrl, {
        headers: {
          ...this.headers,
          accept: "text/html"
        },
        params: {
          idPaket: paket.id
        }
      });
      const $ = cheerio.load(html);
      const getVal = label => $(`.label-left:contains("${label}")`).next().text().trim();
      const choices = this._opt(paket.pagu);
      return {
        status: 200,
        creator: "SIRUP-Budget-Quiz",
        question: `Berapakah total pagu anggaran untuk paket pekerjaan berikut?\n\n` + `📦 Paket: ${paket.paket}\n` + `🏢 Satker: ${paket.satuanKerja}\n` + `📍 Lokasi: ${paket.lokasi}\n` + `📏 Volume: ${getVal("Volume Pekerjaan") || "-"}`,
        options: choices.map(p => this._idr(p)),
        answer: this._idr(paket.pagu),
        hint: {
          message: `Dikelola oleh ${paket.kldi} dengan metode ${paket.metode}.`,
          uraian: getVal("Uraian Pekerjaan")?.substring(0, 200) || "-"
        },
        details: {
          ...paket,
          kodeRUP: getVal("Kode RUP"),
          tanggalUmumkan: getVal("Tanggal Umumkan Paket")
        }
      };
    } catch (error) {
      return {
        status: 500,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new BudgetQuiz();
  try {
    const data = await api.generate();
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}