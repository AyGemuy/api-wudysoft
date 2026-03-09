import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
const BASE = "https://kevinstoree.id";
const URL_PAGE = `${BASE}/cek-region`;
const URL_LW = `${BASE}/livewire/message/cek-region-component`;
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
class GameChecker {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        "User-Agent": UA
      }
    }));
    this.csrf = null;
    this.fp = null;
    this.memo = null;
  }
  async init() {
    console.log("[KevinStore] Ambil halaman & fingerprint...");
    try {
      const {
        data
      } = await this.client.get(URL_PAGE, {
        headers: {
          Accept: "text/html",
          Referer: BASE
        }
      });
      const $ = cheerio.load(data);
      this.csrf = $('meta[name="csrf-token"]').attr("content") ?? $('input[name="_token"]').val() ?? null;
      const wireEl = $("[wire\\:initial-data]").first();
      if (wireEl.length) {
        const raw = JSON.parse(wireEl.attr("wire:initial-data"));
        this.fp = raw?.fingerprint ?? null;
        this.memo = raw?.serverMemo ?? null;
      }
      console.log("[KevinStore] CSRF:", this.csrf ?? "(tidak ditemukan)");
      console.log("[KevinStore] Fingerprint ID:", this.fp?.id ?? "(tidak ditemukan)");
    } catch (e) {
      console.error("[KevinStore] Gagal init:", e?.message);
      throw e;
    }
  }
  buildPayload(uid, zone) {
    const fp = this.fp ?? {
      id: "ByYCGaygbFtJuVuGx1YS",
      name: "cek-region-component",
      locale: "id",
      path: "cek-region",
      method: "GET",
      v: "acj"
    };
    const memo = this.memo ?? {
      children: [],
      errors: [],
      htmlHash: "46709cd2",
      data: {
        user_id: null,
        zone_id: null,
        result: null,
        error: null,
        raw_debug: null,
        checked_at: null
      },
      dataMeta: [],
      checksum: "5092e6537b2c28da89769fa75b7eb09958daf1ec4fe54b95f2c989ea38bb3eb9"
    };
    return {
      fingerprint: fp,
      serverMemo: memo,
      updates: [{
        type: "syncInput",
        payload: {
          id: "pwx8f",
          name: "zone_id",
          value: zone
        }
      }, {
        type: "syncInput",
        payload: {
          id: "2g78h",
          name: "user_id",
          value: uid
        }
      }, {
        type: "callMethod",
        payload: {
          id: "4gtjj",
          method: "check",
          params: []
        }
      }]
    };
  }
  parse(data) {
    return data?.serverMemo?.data?.result ?? {};
  }
  async check({
    uid,
    zone
  }) {
    console.log(`[KevinStore] Check uid=${uid} zone=${zone}`);
    try {
      if (!this.csrf) await this.init();
      const payload = this.buildPayload(uid, zone);
      console.log("[KevinStore] Kirim Livewire request...");
      const {
        data
      } = await this.client.post(URL_LW, payload, {
        headers: {
          Accept: "text/html, application/xhtml+xml",
          "Accept-Language": "id-ID",
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
          Origin: BASE,
          Referer: URL_PAGE,
          Pragma: "no-cache",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-csrf-token": this.csrf ?? "",
          "x-livewire": "true"
        }
      });
      const parsed = this.parse(data);
      console.log("[KevinStore] Hasil:", parsed);
      return {
        ...parsed
      };
    } catch (e) {
      console.error("[KevinStore] Error:", e?.response?.status ?? e?.message);
      console.error("[KevinStore] Response:", e?.response?.data ?? null);
      throw e;
    }
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