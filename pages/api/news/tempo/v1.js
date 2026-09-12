import axios from "axios";
const URL_TM = "https://api-tm.tempo.co";
const URL_API = "https://api.tempo.co";
const HDR = {
  "User-Agent": "okhttp/5.1.0",
  "Accept-Encoding": "gzip",
  "app-tempo-id": "dLYTQBGfsAEdtyRYrxr4",
  "x-platform-token": "2f93b9ae-797f-44a9-aade-982ee942c143",
  "x-platform-application": "android"
};
class TempoApi {
  constructor() {
    this.token = "";
    this.tm = axios.create({
      baseURL: URL_TM,
      headers: HDR
    });
    this.api = axios.create({
      baseURL: URL_API,
      headers: HDR
    });
  }
  _cache() {
    return {
      "cache-control": "no-cache"
    };
  }
  async _ensure() {
    try {
      console.log("[ensure_token] cek token...");
      if (this.token) {
        console.log("[ensure_token] token sudah ada, skip fetch");
        return;
      }
      console.log("[ensure_token] token kosong, fetch sekarang...");
      await this._token();
    } catch (e) {
      console.error("[ensure_token] error:", e?.message);
    }
  }
  async _token() {
    try {
      console.log("[get_token] GET /v6/token/guest");
      const res = await this.tm.get("/v6/token/guest", {
        params: {
          json: 1
        },
        headers: {
          "cache-control": "no-cache",
          "token-guest-tempo": ""
        }
      });
      console.log("[get_token] response status:", res?.status);
      this.token = res?.data?.token_guest || "";
      console.log("[get_token] token set:", this.token ? "✓" : "✗ (kosong)");
    } catch (e) {
      console.error("[get_token] gagal:", e?.response?.status || e?.message);
    }
  }
  async _req({
    client = this.api,
    method = "GET",
    url,
    params,
    headers = {},
    data
  } = {}) {
    try {
      console.log(`[_req] ensure token sebelum request...`);
      await this._ensure();
      console.log(`[_req] ${method} ${url}`, params ? JSON.stringify(params) : "");
      const res = await client.request({
        method: method,
        url: url,
        params: params,
        data: data,
        headers: {
          "token-guest-tempo": this.token || "",
          ...headers
        }
      });
      console.log(`[_req] selesai ${url} → status ${res?.status}`);
      return res?.data ?? null;
    } catch (e) {
      console.error(`[_req] error ${url} →`, e?.response?.status || e?.message);
      return null;
    }
  }
  async home() {
    try {
      console.log("[home] mulai fetch single-brand...");
      const data = await this._req({
        url: "/v3/tempoco/home/single-brand"
      });
      console.log("[home] selesai, data:", data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[home] error:", e?.message);
      return null;
    }
  }
  async kanal_topbar() {
    try {
      console.log("[kanal_topbar] mulai fetch...");
      const data = await this._req({
        url: "/v3/master-topik/teco",
        params: {
          navbar: 1
        }
      });
      console.log("[kanal_topbar] selesai, data:", data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[kanal_topbar] error:", e?.message);
      return null;
    }
  }
  async kanal_home({
    type = "tempoco"
  } = {}) {
    try {
      console.log(`[kanal_home] mulai fetch type=${type}...`);
      const data = await this._req({
        url: `/v3/master-topik/${type}`
      });
      console.log(`[kanal_home] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[kanal_home] error:", e?.message);
      return null;
    }
  }
  async kanal({
    kanal = "nasional"
  } = {}) {
    try {
      console.log(`[kanal] mulai fetch kanal=${kanal}...`);
      const data = await this._req({
        url: `/v3/kanal/${kanal}`
      });
      console.log(`[kanal] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[kanal] error:", e?.message);
      return null;
    }
  }
  async kanal_sub({
    kanal_name = "nasional",
    sub_kanal = "hukum"
  } = {}) {
    try {
      console.log(`[kanal_sub] mulai fetch ${kanal_name}/${sub_kanal}...`);
      const data = await this._req({
        url: `/v3/kanal/${kanal_name}/${sub_kanal}`
      });
      console.log(`[kanal_sub] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[kanal_sub] error:", e?.message);
      return null;
    }
  }
  async subkanal({
    sub_kanal = "hukum"
  } = {}) {
    try {
      console.log(`[subkanal] mulai fetch sub_kanal=${sub_kanal}...`);
      const data = await this._req({
        url: `/v3/subkanal/${sub_kanal}`
      });
      console.log(`[subkanal] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[subkanal] error:", e?.message);
      return null;
    }
  }
  async kanal_menu({
    name = "nasional"
  } = {}) {
    try {
      console.log(`[kanal_menu] mulai fetch name=${name}...`);
      const data = await this._req({
        url: `/v3/kanal/menu/${name}`
      });
      console.log(`[kanal_menu] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[kanal_menu] error:", e?.message);
      return null;
    }
  }
  async indeks({
    kanal = "nasional",
    date = "2026-02-26",
    page = 1
  } = {}) {
    try {
      console.log(`[indeks] mulai fetch ${date}/${kanal} page=${page}...`);
      const data = await this._req({
        url: `/v3/indeks/${date}/${kanal}`,
        params: {
          page: page
        }
      });
      console.log(`[indeks] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[indeks] error:", e?.message);
      return null;
    }
  }
  async populer({
    tipe = "6jam",
    kanal = ""
  } = {}) {
    try {
      console.log(`[populer] mulai fetch tipe=${tipe} kanal=${kanal || "-"}...`);
      const data = await this._req({
        url: "/v3/terpopuler",
        params: {
          tipe: tipe,
          ...kanal ? {
            kanal: kanal
          } : {}
        }
      });
      console.log(`[populer] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[populer] error:", e?.message);
      return null;
    }
  }
  async cari({
    q = "kpk",
    kanal = ""
  } = {}) {
    try {
      console.log(`[cari] mulai fetch q=${q} kanal=${kanal || "-"}...`);
      const data = await this._req({
        url: "/v3/search",
        params: {
          q: q,
          ...kanal ? {
            kanal: kanal
          } : {}
        }
      });
      console.log(`[cari] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[cari] error:", e?.message);
      return null;
    }
  }
  async tag({
    tag = "kpk"
  } = {}) {
    try {
      console.log(`[tag] mulai fetch tag=${tag}...`);
      const data = await this._req({
        url: `/v3/tag/${tag}`
      });
      console.log(`[tag] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[tag] error:", e?.message);
      return null;
    }
  }
  async artikel({
    id = "1947946",
    page = "artikel"
  } = {}) {
    try {
      console.log(`[artikel] mulai fetch id=${id} page=${page}...`);
      const data = await this._req({
        url: `/v3/detail/artikel/${id}`,
        params: {
          page: page
        },
        headers: this._cache()
      });
      console.log(`[artikel] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[artikel] error:", e?.message);
      return null;
    }
  }
  async foto({
    id = "1"
  } = {}) {
    try {
      console.log(`[foto] mulai fetch id=${id}...`);
      const data = await this._req({
        url: `/v3/detail/foto/${id}`,
        headers: this._cache()
      });
      console.log(`[foto] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[foto] error:", e?.message);
      return null;
    }
  }
  async video({
    id = "1"
  } = {}) {
    try {
      console.log(`[video] mulai fetch id=${id}...`);
      const data = await this._req({
        url: `/v3/detail/video/${id}`,
        headers: this._cache()
      });
      console.log(`[video] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[video] error:", e?.message);
      return null;
    }
  }
  async foto_list() {
    try {
      console.log("[foto_list] mulai fetch...");
      const data = await this._req({
        url: "/v3/kanal/foto",
        headers: this._cache()
      });
      console.log("[foto_list] selesai, data:", data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[foto_list] error:", e?.message);
      return null;
    }
  }
  async video_list() {
    try {
      console.log("[video_list] mulai fetch...");
      const data = await this._req({
        url: "/v3/kanal/video",
        headers: this._cache()
      });
      console.log("[video_list] selesai, data:", data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[video_list] error:", e?.message);
      return null;
    }
  }
  async podcast_list() {
    try {
      console.log("[podcast_list] mulai fetch...");
      const data = await this._req({
        url: "/v3/podcast",
        headers: this._cache()
      });
      console.log("[podcast_list] selesai, data:", data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[podcast_list] error:", e?.message);
      return null;
    }
  }
  async podcast({
    id = "1"
  } = {}) {
    try {
      console.log(`[podcast] mulai fetch id=${id}...`);
      const data = await this._req({
        url: `/v3/podcast/${id}`,
        headers: this._cache()
      });
      console.log(`[podcast] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[podcast] error:", e?.message);
      return null;
    }
  }
  async manfaat() {
    try {
      console.log("[manfaat] mulai fetch...");
      const data = await this._req({
        url: "/v3/manfaat-berlangganan"
      });
      console.log("[manfaat] selesai, data:", data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[manfaat] error:", e?.message);
      return null;
    }
  }
  async paket() {
    try {
      console.log("[paket] mulai fetch...");
      const data = await this._req({
        url: "/v3/list_subscription_v2"
      });
      console.log("[paket] selesai, data:", data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[paket] error:", e?.message);
      return null;
    }
  }
  async reporter({
    tipe_penulis = "reporter",
    tipe_berita = "artikel",
    id_penulis = "1",
    page = 1
  } = {}) {
    try {
      console.log(`[reporter] mulai fetch ${tipe_penulis}/${tipe_berita}/${id_penulis} page=${page}...`);
      const data = await this._req({
        url: `/v3/${tipe_penulis}/${tipe_berita}/${id_penulis}`,
        params: {
          page: page
        }
      });
      console.log(`[reporter] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[reporter] error:", e?.message);
      return null;
    }
  }
  async plus_home() {
    try {
      console.log("[plus_home] mulai fetch...");
      const data = await this._req({
        client: this.tm,
        url: "/v6/tempo-plus/home"
      });
      console.log("[plus_home] selesai, data:", data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[plus_home] error:", e?.message);
      return null;
    }
  }
  async koran_home() {
    try {
      console.log("[koran_home] mulai fetch...");
      const data = await this._req({
        client: this.tm,
        url: "/v6/koran/edisi-home-v2",
        headers: this._cache()
      });
      console.log("[koran_home] selesai, data:", data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[koran_home] error:", e?.message);
      return null;
    }
  }
  async koran_rubrik({
    id_edition = "1",
    kanal = "nasional"
  } = {}) {
    try {
      console.log(`[koran_rubrik] mulai fetch ${id_edition}/${kanal}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/koran/edisi/${id_edition}/rubrik/${kanal}`
      });
      console.log(`[koran_rubrik] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[koran_rubrik] error:", e?.message);
      return null;
    }
  }
  async koran_detail({
    id_edition = "1"
  } = {}) {
    try {
      console.log(`[koran_detail] mulai fetch id_edition=${id_edition}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/koran/edisi-sb/${id_edition}`
      });
      console.log(`[koran_detail] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[koran_detail] error:", e?.message);
      return null;
    }
  }
  async majalah() {
    try {
      console.log("[majalah] mulai fetch...");
      const data = await this._req({
        client: this.tm,
        url: "/v6/majalah/detail"
      });
      console.log("[majalah] selesai, data:", data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[majalah] error:", e?.message);
      return null;
    }
  }
  async edisi_latest({
    type = "koran"
  } = {}) {
    try {
      console.log(`[edisi_latest] mulai fetch type=${type}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/${type}/edisi/latest`
      });
      console.log(`[edisi_latest] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[edisi_latest] error:", e?.message);
      return null;
    }
  }
  async edisi_list({
    type = "koran"
  } = {}) {
    try {
      console.log(`[edisi_list] mulai fetch type=${type}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/${type}/edisi`
      });
      console.log(`[edisi_list] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[edisi_list] error:", e?.message);
      return null;
    }
  }
  async edisi_by_date({
    type = "koran",
    month = "02",
    year = "2026"
  } = {}) {
    try {
      console.log(`[edisi_by_date] mulai fetch ${type} m=${month} y=${year}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/${type}/edisi/find`,
        params: {
          m: month,
          y: year
        },
        headers: this._cache()
      });
      console.log(`[edisi_by_date] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[edisi_by_date] error:", e?.message);
      return null;
    }
  }
  async edisi_home({
    edition = "koran"
  } = {}) {
    try {
      console.log(`[edisi_home] mulai fetch edition=${edition}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/${edition}/edisi-home`,
        headers: this._cache()
      });
      console.log(`[edisi_home] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[edisi_home] error:", e?.message);
      return null;
    }
  }
  async edisi_home2({
    edition = "koran"
  } = {}) {
    try {
      console.log(`[edisi_home2] mulai fetch edition=${edition}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/${edition}/edisi-home-v2`,
        headers: this._cache()
      });
      console.log(`[edisi_home2] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[edisi_home2] error:", e?.message);
      return null;
    }
  }
  async edisi_detail({
    type = "koran",
    id_edition = "1"
  } = {}) {
    try {
      console.log(`[edisi_detail] mulai fetch ${type}/${id_edition}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/${type}/edisi/${id_edition}`,
        headers: this._cache()
      });
      console.log(`[edisi_detail] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[edisi_detail] error:", e?.message);
      return null;
    }
  }
  async edisi_detail2({
    type = "koran",
    id_edition = "1"
  } = {}) {
    try {
      console.log(`[edisi_detail2] mulai fetch ${type}/${id_edition}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/${type}/edisi-v2/${id_edition}`,
        headers: this._cache()
      });
      console.log(`[edisi_detail2] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[edisi_detail2] error:", e?.message);
      return null;
    }
  }
  async edisi_rubrik({
    type = "koran",
    id_edition = "1",
    rubrik = "nasional"
  } = {}) {
    try {
      console.log(`[edisi_rubrik] mulai fetch ${type}/${id_edition}/${rubrik}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/${type}/edisi/${id_edition}/rubrik/${rubrik}`,
        headers: this._cache()
      });
      console.log(`[edisi_rubrik] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[edisi_rubrik] error:", e?.message);
      return null;
    }
  }
  async edisi_rubrik_related({
    type = "koran",
    alias_rubrik = "nasional",
    id_edition = "1"
  } = {}) {
    try {
      console.log(`[edisi_rubrik_related] mulai fetch ${type}/${alias_rubrik}/${id_edition}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/${type}/rubrik/${alias_rubrik}/${id_edition}`,
        headers: this._cache()
      });
      console.log(`[edisi_rubrik_related] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[edisi_rubrik_related] error:", e?.message);
      return null;
    }
  }
  async edisi_kanal({
    edition = "koran",
    kanal = "nasional"
  } = {}) {
    try {
      console.log(`[edisi_kanal] mulai fetch ${edition}/${kanal}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/${edition}/rubrik/${kanal}`,
        headers: this._cache()
      });
      console.log(`[edisi_kanal] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[edisi_kanal] error:", e?.message);
      return null;
    }
  }
  async edisi_artikel({
    type = "koran",
    id_article = "1"
  } = {}) {
    try {
      console.log(`[edisi_artikel] mulai fetch ${type}/${id_article}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/${type}/article/${id_article}`,
        headers: this._cache()
      });
      console.log(`[edisi_artikel] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[edisi_artikel] error:", e?.message);
      return null;
    }
  }
  async edisi_tag({
    type = "koran",
    tag = "kpk"
  } = {}) {
    try {
      console.log(`[edisi_tag] mulai fetch ${type}/${tag}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/${type}/tag/${tag}`
      });
      console.log(`[edisi_tag] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[edisi_tag] error:", e?.message);
      return null;
    }
  }
  async edisi_cari({
    type = "koran",
    q = "kpk"
  } = {}) {
    try {
      console.log(`[edisi_cari] mulai fetch ${type} q=${q}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/${type}/keyword`,
        params: {
          q: q
        },
        headers: this._cache()
      });
      console.log(`[edisi_cari] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[edisi_cari] error:", e?.message);
      return null;
    }
  }
  async edisi_editor({
    type = "koran",
    name = "redaksi"
  } = {}) {
    try {
      console.log(`[edisi_editor] mulai fetch ${type}/${name}...`);
      const data = await this._req({
        client: this.tm,
        url: `/v6/${type}/penulis/${name}`
      });
      console.log(`[edisi_editor] selesai, data:`, data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[edisi_editor] error:", e?.message);
      return null;
    }
  }
  async privasi() {
    try {
      console.log("[privasi] mulai fetch...");
      const data = await this._req({
        client: this.tm,
        url: "/v6/privasi"
      });
      console.log("[privasi] selesai, data:", data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[privasi] error:", e?.message);
      return null;
    }
  }
  async syarat() {
    try {
      console.log("[syarat] mulai fetch...");
      const data = await this._req({
        client: this.tm,
        url: "/v6/syarat-ketentuan"
      });
      console.log("[syarat] selesai, data:", data ? "✓" : "null");
      return data;
    } catch (e) {
      console.error("[syarat] error:", e?.message);
      return null;
    }
  }
}
const VALID_ACTIONS = ["home", "kanal_topbar", "kanal_home", "kanal", "kanal_sub", "subkanal", "kanal_menu", "indeks", "populer", "cari", "tag", "artikel", "foto", "video", "foto_list", "video_list", "podcast_list", "podcast", "manfaat", "paket", "reporter", "plus_home", "koran_home", "koran_rubrik", "koran_detail", "majalah", "edisi_latest", "edisi_list", "edisi_by_date", "edisi_home", "edisi_home2", "edisi_detail", "edisi_detail2", "edisi_rubrik", "edisi_rubrik_related", "edisi_kanal", "edisi_artikel", "edisi_tag", "edisi_cari", "edisi_editor", "privasi", "syarat"];
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: VALID_ACTIONS,
      usage: {
        method: "GET / POST",
        example: "/api/news/tempo/v1?action=cari&q=kpk"
      }
    });
  }
  if (!VALID_ACTIONS.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: VALID_ACTIONS
    });
  }
  const t = new TempoApi();
  try {
    let data;
    switch (action) {
      case "home":
        data = await t.home();
        break;
      case "kanal_topbar":
        data = await t.kanal_topbar();
        break;
      case "foto_list":
        data = await t.foto_list();
        break;
      case "video_list":
        data = await t.video_list();
        break;
      case "podcast_list":
        data = await t.podcast_list();
        break;
      case "manfaat":
        data = await t.manfaat();
        break;
      case "paket":
        data = await t.paket();
        break;
      case "plus_home":
        data = await t.plus_home();
        break;
      case "koran_home":
        data = await t.koran_home();
        break;
      case "majalah":
        data = await t.majalah();
        break;
      case "privasi":
        data = await t.privasi();
        break;
      case "syarat":
        data = await t.syarat();
        break;
      case "kanal_home":
        data = await t.kanal_home(params);
        break;
      case "kanal":
        data = await t.kanal(params);
        break;
      case "kanal_menu":
        data = await t.kanal_menu(params);
        break;
      case "indeks":
        data = await t.indeks(params);
        break;
      case "populer":
        data = await t.populer(params);
        break;
      case "reporter":
        data = await t.reporter(params);
        break;
      case "edisi_latest":
        data = await t.edisi_latest(params);
        break;
      case "edisi_list":
        data = await t.edisi_list(params);
        break;
      case "edisi_home":
        data = await t.edisi_home(params);
        break;
      case "edisi_home2":
        data = await t.edisi_home2(params);
        break;
      case "edisi_tag":
        data = await t.edisi_tag(params);
        break;
      case "edisi_editor":
        data = await t.edisi_editor(params);
        break;
      case "cari":
        if (!params.q) return res.status(400).json({
          status: false,
          error: "Parameter 'q' wajib diisi untuk action 'cari'.",
          example: "/api/news/tempo/v1?action=cari&q=kpk&kanal=pemilu"
        });
        data = await t.cari(params);
        break;
      case "edisi_cari":
        if (!params.q) return res.status(400).json({
          status: false,
          error: "Parameter 'q' wajib diisi untuk action 'edisi_cari'.",
          example: "/api/news/tempo/v1?action=edisi_cari&type=koran&q=kpk"
        });
        data = await t.edisi_cari(params);
        break;
      case "tag":
        if (!params.tag) return res.status(400).json({
          status: false,
          error: "Parameter 'tag' wajib diisi untuk action 'tag'.",
          example: "/api/news/tempo/v1?action=tag&tag=kpk"
        });
        data = await t.tag(params);
        break;
      case "edisi_tag":
        if (!params.tag) return res.status(400).json({
          status: false,
          error: "Parameter 'tag' wajib diisi untuk action 'edisi_tag'.",
          example: "/api/news/tempo/v1?action=edisi_tag&type=koran&tag=kpk"
        });
        data = await t.edisi_tag(params);
        break;
      case "artikel":
        if (!params.id) return res.status(400).json({
          status: false,
          error: "Parameter 'id' wajib diisi untuk action 'artikel'.",
          example: "/api/news/tempo/v1?action=artikel&id=1947946&page=artikel"
        });
        data = await t.artikel(params);
        break;
      case "foto":
        if (!params.id) return res.status(400).json({
          status: false,
          error: "Parameter 'id' wajib diisi untuk action 'foto'.",
          example: "/api/news/tempo/v1?action=foto&id=1"
        });
        data = await t.foto(params);
        break;
      case "video":
        if (!params.id) return res.status(400).json({
          status: false,
          error: "Parameter 'id' wajib diisi untuk action 'video'.",
          example: "/api/news/tempo/v1?action=video&id=1"
        });
        data = await t.video(params);
        break;
      case "podcast":
        if (!params.id) return res.status(400).json({
          status: false,
          error: "Parameter 'id' wajib diisi untuk action 'podcast'.",
          example: "/api/news/tempo/v1?action=podcast&id=1"
        });
        data = await t.podcast(params);
        break;
      case "kanal_sub":
        if (!params.kanal_name || !params.sub_kanal) return res.status(400).json({
          status: false,
          error: "Parameter 'kanal_name' dan 'sub_kanal' wajib diisi untuk action 'kanal_sub'.",
          example: "/api/news/tempo/v1?action=kanal_sub&kanal_name=nasional&sub_kanal=hukum"
        });
        data = await t.kanal_sub(params);
        break;
      case "subkanal":
        if (!params.sub_kanal) return res.status(400).json({
          status: false,
          error: "Parameter 'sub_kanal' wajib diisi untuk action 'subkanal'.",
          example: "/api/news/tempo/v1?action=subkanal&sub_kanal=hukum"
        });
        data = await t.subkanal(params);
        break;
      case "koran_rubrik":
        if (!params.id_edition) return res.status(400).json({
          status: false,
          error: "Parameter 'id_edition' wajib diisi untuk action 'koran_rubrik'.",
          example: "/api/news/tempo/v1?action=koran_rubrik&id_edition=1&kanal=nasional"
        });
        data = await t.koran_rubrik(params);
        break;
      case "koran_detail":
        if (!params.id_edition) return res.status(400).json({
          status: false,
          error: "Parameter 'id_edition' wajib diisi untuk action 'koran_detail'.",
          example: "/api/news/tempo/v1?action=koran_detail&id_edition=1"
        });
        data = await t.koran_detail(params);
        break;
      case "edisi_detail":
        if (!params.type || !params.id_edition) return res.status(400).json({
          status: false,
          error: "Parameter 'type' dan 'id_edition' wajib diisi untuk action 'edisi_detail'.",
          example: "/api/news/tempo/v1?action=edisi_detail&type=koran&id_edition=1"
        });
        data = await t.edisi_detail(params);
        break;
      case "edisi_detail2":
        if (!params.type || !params.id_edition) return res.status(400).json({
          status: false,
          error: "Parameter 'type' dan 'id_edition' wajib diisi untuk action 'edisi_detail2'.",
          example: "/api/news/tempo/v1?action=edisi_detail2&type=koran&id_edition=1"
        });
        data = await t.edisi_detail2(params);
        break;
      case "edisi_rubrik":
        if (!params.type || !params.id_edition || !params.rubrik) return res.status(400).json({
          status: false,
          error: "Parameter 'type', 'id_edition', dan 'rubrik' wajib diisi untuk action 'edisi_rubrik'.",
          example: "/api/news/tempo/v1?action=edisi_rubrik&type=koran&id_edition=1&rubrik=nasional"
        });
        data = await t.edisi_rubrik(params);
        break;
      case "edisi_rubrik_related":
        if (!params.type || !params.alias_rubrik || !params.id_edition) return res.status(400).json({
          status: false,
          error: "Parameter 'type', 'alias_rubrik', dan 'id_edition' wajib diisi untuk action 'edisi_rubrik_related'.",
          example: "/api/news/tempo/v1?action=edisi_rubrik_related&type=koran&alias_rubrik=nasional&id_edition=1"
        });
        data = await t.edisi_rubrik_related(params);
        break;
      case "edisi_kanal":
        if (!params.edition || !params.kanal) return res.status(400).json({
          status: false,
          error: "Parameter 'edition' dan 'kanal' wajib diisi untuk action 'edisi_kanal'.",
          example: "/api/news/tempo/v1?action=edisi_kanal&edition=koran&kanal=nasional"
        });
        data = await t.edisi_kanal(params);
        break;
      case "edisi_artikel":
        if (!params.type || !params.id_article) return res.status(400).json({
          status: false,
          error: "Parameter 'type' dan 'id_article' wajib diisi untuk action 'edisi_artikel'.",
          example: "/api/news/tempo/v1?action=edisi_artikel&type=koran&id_article=1"
        });
        data = await t.edisi_artikel(params);
        break;
      case "edisi_by_date":
        if (!params.type || !params.month || !params.year) return res.status(400).json({
          status: false,
          error: "Parameter 'type', 'month', dan 'year' wajib diisi untuk action 'edisi_by_date'.",
          example: "/api/news/tempo/v1?action=edisi_by_date&type=koran&month=02&year=2026"
        });
        data = await t.edisi_by_date(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: VALID_ACTIONS
        });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...data
    });
  } catch (error) {
    console.error(`[FATAL] action='${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error?.message || "Unknown Error"
    });
  }
}