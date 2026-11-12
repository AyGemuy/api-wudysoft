import axios from "axios";
class MovieBoxClient {
  constructor() {
    this.baseUrl = "https://h5-api.aoneroom.com/wefeed-h5api-bff";
    this.token = undefined;
  }
  _hdrs(themoviebox) {
    const host = themoviebox ? "themoviebox.xyz" : "videodownloader.site";
    const headers = {
      accept: "application/json",
      "accept-language": "id-ID",
      authorization: `Bearer ${this.token || ""}`,
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: `https://${host}`,
      pragma: "no-cache",
      priority: "u=1, i",
      referer: `https://${host}/`,
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-client-info": JSON.stringify({
        timezone: "Asia/Makassar"
      }),
      "x-request-lang": "id"
    };
    if (!themoviebox) {
      headers["x-site-domain"] = "";
    }
    return headers;
  }
  _cml(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this._cml(item));
    } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
      return Object.keys(obj).reduce((acc, key) => {
        const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
        acc[camelKey] = this._cml(obj[key]);
        return acc;
      }, {});
    }
    return obj;
  }
  _snk(obj) {
    try {
      if (typeof obj === "string" && (obj.startsWith("{") || obj.startsWith("["))) {
        try {
          obj = JSON.parse(obj);
        } catch (_) {}
      }
      if (Array.isArray(obj)) return obj.map(item => this._snk(item));
      if (obj && obj.constructor === Object) {
        return Object.keys(obj).reduce((acc, key) => {
          const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
          acc[snakeKey] = this._snk(obj[key]);
          return acc;
        }, {});
      }
      return obj;
    } catch (err) {
      console.log(`[Error] Gagal: ${err.message}`);
      return obj;
    }
  }
  async request(config) {
    const method = config.method?.toUpperCase() || "GET";
    const isHomeRequest = config.url.endsWith("/home");
    if (!this.token && !isHomeRequest) {
      console.log("[MovieBoxClient] Token belum tersedia. Menginisialisasi via home() secara otomatis...");
      const initResult = await this.home();
      if (initResult instanceof Error) {
        console.warn(`[MovieBoxClient] Gagal mendapatkan token otomatis: ${initResult.message}`);
      }
    }
    if (this.token && config.headers && config.headers["authorization"]) {
      config.headers["authorization"] = `Bearer ${this.token}`;
    }
    console.log(`[MovieBoxClient] Memulai request ${method} ke: ${config.url}`);
    try {
      const response = await axios(config);
      console.log(`[MovieBoxClient] Sukses. Status: ${response?.status}`);
      const xUserHeader = response?.headers?.["x-user"];
      if (xUserHeader) {
        try {
          const parsedUser = JSON.parse(xUserHeader);
          if (parsedUser?.token) {
            this.token = parsedUser.token;
            console.log("[MovieBoxClient] Token diperbarui dari header respon x-user.");
          }
        } catch (parseErr) {
          console.warn(`[MovieBoxClient] Gagal memparsing header x-user: ${parseErr.message}`);
        }
      }
      return this._snk(response?.data);
    } catch (error) {
      console.error(`[MovieBoxClient] Error saat request ke ${config.url}: ${error?.message || "Error tidak dikenal"}`);
      return error;
    }
  }
  async home({
    host,
    ...rest
  } = {}) {
    try {
      console.log("[MovieBoxClient] Memproses home");
      const h = host ? host : "themoviebox.xyz";
      const params = this._cml({
        host: h,
        ...rest
      });
      return await this.request({
        method: "get",
        url: `${this.baseUrl}/home`,
        params: params,
        headers: this._hdrs(true)
      });
    } catch (err) {
      console.error(`[MovieBoxClient] Gagal di home: ${err?.message}`);
      return err;
    }
  }
  async search_subj({
    keyword,
    page,
    per_page,
    subject_type,
    themoviebox,
    ...rest
  } = {}) {
    try {
      console.log("[MovieBoxClient] Memproses search_subj");
      if (!keyword) {
        console.error('[MovieBoxClient] Parameter "keyword" wajib diisi.');
        return new Error('Parameter "keyword" wajib diisi.');
      }
      const p = page ? page : 1;
      const pp = per_page !== undefined ? per_page : 0;
      const st = subject_type !== undefined ? subject_type : 0;
      const tmb = themoviebox !== undefined ? themoviebox : true;
      const data = this._cml({
        keyword: keyword,
        page: p,
        per_page: pp,
        subject_type: st,
        ...rest
      });
      const headers = this._hdrs(tmb);
      if (!tmb) {
        headers["x-source"] = "downloader";
      }
      return await this.request({
        method: "post",
        url: `${this.baseUrl}/subject/search`,
        data: data,
        headers: headers
      });
    } catch (err) {
      console.error(`[MovieBoxClient] Gagal di search_subj: ${err?.message}`);
      return err;
    }
  }
  async tabs({
    ...rest
  } = {}) {
    try {
      console.log("[MovieBoxClient] Memproses tabs");
      const params = this._cml({
        ...rest
      });
      return await this.request({
        method: "get",
        url: `${this.baseUrl}/tab/get-bottom-tab-list`,
        params: params,
        headers: this._hdrs(true)
      });
    } catch (err) {
      console.error(`[MovieBoxClient] Gagal di tabs: ${err?.message}`);
      return err;
    }
  }
  async everyone_search({
    ...rest
  } = {}) {
    try {
      console.log("[MovieBoxClient] Memproses everyone_search");
      const params = this._cml({
        ...rest
      });
      return await this.request({
        method: "get",
        url: `${this.baseUrl}/subject/everyone-search`,
        params: params,
        headers: this._hdrs(true)
      });
    } catch (err) {
      console.error(`[MovieBoxClient] Gagal di everyone_search: ${err?.message}`);
      return err;
    }
  }
  async trending({
    tab_id,
    page,
    per_page,
    ...rest
  } = {}) {
    try {
      console.log("[MovieBoxClient] Memproses trending");
      const p = page ? page : 1;
      const pp = per_page ? per_page : 18;
      const params = this._cml({
        tab_id: tab_id || undefined,
        page: p,
        per_page: pp,
        ...rest
      });
      return await this.request({
        method: "get",
        url: `${this.baseUrl}/subject/trending`,
        params: params,
        headers: this._hdrs(true)
      });
    } catch (err) {
      console.error(`[MovieBoxClient] Gagal di trending: ${err?.message}`);
      return err;
    }
  }
  async detail_rec({
    subject_id,
    page,
    per_page,
    ...rest
  } = {}) {
    try {
      console.log("[MovieBoxClient] Memproses detail_rec");
      if (!subject_id) {
        console.error('[MovieBoxClient] Parameter "subject_id" wajib diisi.');
        return new Error('Parameter "subject_id" wajib diisi.');
      }
      const p = page ? page : 1;
      const pp = per_page ? per_page : 12;
      const params = this._cml({
        subject_id: subject_id,
        page: p,
        per_page: pp,
        ...rest
      });
      return await this.request({
        method: "get",
        url: `${this.baseUrl}/subject/detail-rec`,
        params: params,
        headers: this._hdrs(true)
      });
    } catch (err) {
      console.error(`[MovieBoxClient] Gagal di detail_rec: ${err?.message}`);
      return err;
    }
  }
  async detail({
    detail_path,
    themoviebox,
    ...rest
  } = {}) {
    try {
      console.log("[MovieBoxClient] Memproses detail");
      if (!detail_path) {
        console.error('[MovieBoxClient] Parameter "detail_path" wajib diisi.');
        return new Error('Parameter "detail_path" wajib diisi.');
      }
      const tmb = themoviebox !== undefined ? themoviebox : true;
      const params = this._cml({
        detail_path: detail_path,
        ...rest
      });
      const headers = this._hdrs(tmb);
      if (tmb) {
        delete headers["authorization"];
        delete headers["x-request-lang"];
      }
      return await this.request({
        method: "get",
        url: `${this.baseUrl}/detail`,
        params: params,
        headers: headers
      });
    } catch (err) {
      console.error(`[MovieBoxClient] Gagal di detail: ${err?.message}`);
      return err;
    }
  }
  async play({
    subject_id,
    se,
    ep,
    detail_path,
    stream_sign_type,
    ...rest
  } = {}) {
    try {
      console.log("[MovieBoxClient] Memproses play");
      if (!subject_id) {
        console.error('[MovieBoxClient] Parameter "subject_id" wajib diisi.');
        return new Error('Parameter "subject_id" wajib diisi.');
      }
      if (!detail_path) {
        console.error('[MovieBoxClient] Parameter "detail_path" wajib diisi.');
        return new Error('Parameter "detail_path" wajib diisi.');
      }
      const s = se !== undefined ? se : 0;
      const e = ep !== undefined ? ep : 0;
      const sst = stream_sign_type !== undefined ? stream_sign_type : 1;
      const params = this._cml({
        subject_id: subject_id,
        se: s,
        ep: e,
        detail_path: detail_path,
        stream_sign_type: sst,
        ...rest
      });
      const playBaseUrl = "https://themoviebox.xyz/wefeed-h5api-bff";
      const headers = this._hdrs(true);
      headers["sec-fetch-site"] = "same-origin";
      headers["x-source"] = "";
      delete headers["authorization"];
      delete headers["x-request-lang"];
      return await this.request({
        method: "get",
        url: `${playBaseUrl}/subject/play`,
        params: params,
        headers: headers
      });
    } catch (err) {
      console.error(`[MovieBoxClient] Gagal di play: ${err?.message}`);
      return err;
    }
  }
  async caption({
    format,
    id,
    subject_id,
    detail_path,
    ...rest
  } = {}) {
    try {
      console.log("[MovieBoxClient] Memproses caption");
      if (!id) {
        console.error('[MovieBoxClient] Parameter "id" wajib diisi.');
        return new Error('Parameter "id" wajib diisi.');
      }
      if (!subject_id) {
        console.error('[MovieBoxClient] Parameter "subject_id" wajib diisi.');
        return new Error('Parameter "subject_id" wajib diisi.');
      }
      if (!detail_path) {
        console.error('[MovieBoxClient] Parameter "detail_path" wajib diisi.');
        return new Error('Parameter "detail_path" wajib diisi.');
      }
      const f = format ? format : "MP4";
      const params = this._cml({
        format: f,
        id: id,
        subject_id: subject_id,
        detail_path: detail_path,
        ...rest
      });
      const headers = this._hdrs(true);
      delete headers["authorization"];
      delete headers["x-request-lang"];
      return await this.request({
        method: "get",
        url: `${this.baseUrl}/subject/caption`,
        params: params,
        headers: headers
      });
    } catch (err) {
      console.error(`[MovieBoxClient] Gagal di caption: ${err?.message}`);
      return err;
    }
  }
  async download({
    subject_id,
    se,
    ep,
    detail_path,
    themoviebox,
    ...rest
  } = {}) {
    try {
      console.log("[MovieBoxClient] Memproses download");
      if (!subject_id) {
        console.error('[MovieBoxClient] Parameter "subject_id" wajib diisi.');
        return new Error('Parameter "subject_id" wajib diisi.');
      }
      if (!detail_path) {
        console.error('[MovieBoxClient] Parameter "detail_path" wajib diisi.');
        return new Error('Parameter "detail_path" wajib diisi.');
      }
      const s = se !== undefined ? se : 0;
      const e = ep !== undefined ? ep : 0;
      const params = this._cml({
        subject_id: subject_id,
        se: s,
        ep: e,
        detail_path: detail_path,
        ...rest
      });
      const tmb = themoviebox !== undefined ? themoviebox : false;
      return await this.request({
        method: "get",
        url: `${this.baseUrl}/subject/download`,
        params: params,
        headers: this._hdrs(tmb)
      });
    } catch (err) {
      console.error(`[MovieBoxClient] Gagal di download: ${err?.message}`);
      return err;
    }
  }
  async tab_op({
    tab_id,
    host,
    ...rest
  } = {}) {
    try {
      console.log("[MovieBoxClient] Memproses tab_op");
      if (!tab_id) {
        console.error('[MovieBoxClient] Parameter "tab_id" wajib diisi.');
        return new Error('Parameter "tab_id" wajib diisi.');
      }
      const h = host ? host : "themoviebox.xyz";
      const params = this._cml({
        tab_id: tab_id,
        host: h,
        ...rest
      });
      return await this.request({
        method: "get",
        url: `${this.baseUrl}/tab-operating`,
        params: params,
        headers: this._hdrs(true)
      });
    } catch (err) {
      console.error(`[MovieBoxClient] Gagal di tab_op: ${err?.message}`);
      return err;
    }
  }
  async ranking({
    id,
    page,
    per_page,
    ...rest
  } = {}) {
    try {
      console.log("[MovieBoxClient] Memproses ranking");
      if (!id) {
        console.error('[MovieBoxClient] Parameter "id" wajib diisi.');
        return new Error('Parameter "id" wajib diisi.');
      }
      const p = page ? page : 1;
      const pp = per_page ? per_page : 12;
      const params = this._cml({
        id: id,
        page: p,
        per_page: pp,
        ...rest
      });
      return await this.request({
        method: "get",
        url: `${this.baseUrl}/ranking-list/content`,
        params: params,
        headers: this._hdrs(true)
      });
    } catch (err) {
      console.error(`[MovieBoxClient] Gagal di ranking: ${err?.message}`);
      return err;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "search_subj", "tabs", "everyone_search", "trending", "detail_rec", "detail", "play", "caption", "download", "tab_op", "ranking"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/api/wefeed?action=home&host=themoviebox.xyz",
          search_subj: "/api/wefeed?action=search_subj&keyword=Safa",
          tabs: "/api/wefeed?action=tabs",
          everyone_search: "/api/wefeed?action=everyone_search",
          trending: "/api/wefeed?action=trending&page=1&per_page=18",
          detail_rec: "/api/wefeed?action=detail_rec&subject_id=5256667397997610368",
          detail: "/api/wefeed?action=detail&detail_path=naam-e-wafa-video-song-creature-3d-farhan-saeed-tulsi-kumar-bipasha-basu-4SmqUnJAjg6",
          play: "/api/wefeed?action=play&subject_id=5256667397997610368&detail_path=naam-e-wafa-video-song-creature-3d-farhan-saeed-tulsi-kumar-bipasha-basu-4SmqUnJAjg6",
          caption: "/api/wefeed?action=caption&id=3094939576859852896&subject_id=5256667397997610368&detail_path=naam-e-wafa-video-song-creature-3d-farhan-saeed-tulsi-kumar-bipasha-basu-4SmqUnJAjg6",
          download: "/api/wefeed?action=download&subject_id=5256667397997610368&detail_path=naam-e-wafa-video-song-creature-3d-farhan-saeed-tulsi-kumar-bipasha-basu-4SmqUnJAjg6",
          tab_op: "/api/wefeed?action=tab_op&tab_id=ONEROOM_MOVIE",
          ranking: "/api/wefeed?action=ranking&id=872031290915189720"
        }
      }
    });
  }
  const found_action = validActions.includes(action);
  if (!found_action) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new MovieBoxClient();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "search_subj":
        if (!params.keyword) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'keyword' wajib diisi untuk search_subj."
          });
        }
        response = await api.search_subj(params);
        break;
      case "tabs":
        response = await api.tabs(params);
        break;
      case "everyone_search":
        response = await api.everyone_search(params);
        break;
      case "trending":
        response = await api.trending(params);
        break;
      case "detail_rec":
        if (!params.subject_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'subject_id' wajib diisi untuk detail_rec."
          });
        }
        response = await api.detail_rec(params);
        break;
      case "detail":
        if (!params.detail_path) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'detail_path' wajib diisi untuk detail."
          });
        }
        response = await api.detail(params);
        break;
      case "play":
        if (!params.subject_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'subject_id' wajib diisi untuk play."
          });
        }
        if (!params.detail_path) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'detail_path' wajib diisi untuk play."
          });
        }
        response = await api.play(params);
        break;
      case "caption":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk caption."
          });
        }
        if (!params.subject_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'subject_id' wajib diisi untuk caption."
          });
        }
        if (!params.detail_path) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'detail_path' wajib diisi untuk caption."
          });
        }
        response = await api.caption(params);
        break;
      case "download":
        if (!params.subject_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'subject_id' wajib diisi untuk download."
          });
        }
        if (!params.detail_path) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'detail_path' wajib diisi untuk download."
          });
        }
        response = await api.download(params);
        break;
      case "tab_op":
        if (!params.tab_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'tab_id' wajib diisi untuk tab_op."
          });
        }
        response = await api.tab_op(params);
        break;
      case "ranking":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk ranking."
          });
        }
        response = await api.ranking(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        error: "Server target tidak memberikan respon atau data kosong."
      });
    }
    if (response instanceof Error) {
      return res.status(422).json({
        status: false,
        action: action,
        error: response.message || "Terjadi kendala saat menghubungi API target."
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error.message || "Unknown Error"
    });
  }
}