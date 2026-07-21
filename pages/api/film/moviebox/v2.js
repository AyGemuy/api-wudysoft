import axios from "axios";
import crypto from "crypto";
class MovieBoxClient {
  constructor() {
    this.host_list = ["https://api6.aoneroom.com", "https://api5.aoneroom.com", "https://api4.aoneroom.com", "https://api4sg.aoneroom.com", "https://api3.aoneroom.com", "https://api6sg.aoneroom.com", "https://api.inmoviebox.com"];
    this.codes = new Set([403, 407, 429, 500, 502, 503, 504]);
    this.secret_key = "76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O";
    this.secret_key_alt = "Xqn2nnO41/L92o1iuXhSLHTbXvY4Z5ZZ62m8mSLA";
    this.hosts = this.host_list;
    this.timeout = 6e4;
    this.token = undefined;
    this.cli = this._gen_cli();
    this.activeHost = this.hosts[0];
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
  _md5(data) {
    try {
      return crypto.createHash("md5").update(data).digest("hex");
    } catch (err) {
      console.log(`[Error] Gagal memproses MD5: ${err.message}`);
      return err;
    }
  }
  _b64_dec(val) {
    try {
      const pad = (4 - val.length % 4) % 4;
      return Buffer.from(val + "=".repeat(pad), "base64");
    } catch (err) {
      console.log(`[Error] Gagal memproses dekode Base64: ${err.message}`);
      return err;
    }
  }
  _b64_enc(data) {
    try {
      return data.toString("base64");
    } catch (err) {
      console.log(`[Error] Gagal memproses enkode Base64: ${err.message}`);
      return err;
    }
  }
  _gen_tok(ts = Date.now()) {
    try {
      const strTs = String(ts);
      const rev = [...strTs].reverse().join("");
      const md5Val = this._md5(rev);
      if (md5Val instanceof Error) return md5Val;
      return `${strTs},${md5Val}`;
    } catch (err) {
      console.log(`[Error] Gagal membuat token klien: ${err.message}`);
      return err;
    }
  }
  _gen_cli() {
    try {
      console.log("[Process] Memulai pembuatan data identitas klien...");
      const androids = [{
        version: "9",
        build: "PQ3A.190605.03081104"
      }, {
        version: "10",
        build: "QP1A.191005.007.A3"
      }, {
        version: "11",
        build: "RP1A.200720.011"
      }, {
        version: "12",
        build: "S1B.220414.015"
      }, {
        version: "13",
        build: "TQ2A.230405.003"
      }];
      const devices = [{
        model: "23078RKD5C",
        brand: "Redmi"
      }, {
        model: "2201117TY",
        brand: "Redmi"
      }, {
        model: "2201117TG",
        brand: "Redmi"
      }, {
        model: "22101316G",
        brand: "Redmi"
      }];
      const verCodes = [50020042, 50020043, 50020044, 50020045];
      const android = androids[crypto.randomInt(androids.length)] || androids[0];
      const device = devices[crypto.randomInt(devices.length)] || devices[0];
      const verCode = verCodes[crypto.randomInt(verCodes.length)] || verCodes[0];
      const userAgent = `com.community.oneroom/${verCode} (Linux; U; Android ${android.version}; en_US; ${device.model}; Build/${android.build}; Cronet/135.0.7012.3)`;
      const clientInfo = JSON.stringify({
        package_name: "com.community.oneroom",
        version_name: "3.0.03.0529.03",
        version_code: verCode,
        os: "android",
        os_version: android.version,
        install_ch: "ps",
        device_id: crypto.randomBytes(16).toString("hex"),
        install_store: "ps",
        gaid: crypto.randomUUID(),
        brand: device.brand,
        model: device.model,
        system_language: "id",
        net: "NETWORK_WIFI",
        region: "ID",
        timezone: "Asia/Jakarta",
        sp_code: "40401",
        "X-Play-Mode": "2"
      });
      console.log("[Process] Identitas klien berhasil dibuat.");
      return {
        userAgent: userAgent,
        clientInfo: clientInfo
      };
    } catch (err) {
      console.log(`[Error] Gagal membuat data identitas klien: ${err.message}`);
      return err;
    }
  }
  _canon(method, accept, contentType, url, body, ts) {
    try {
      const parsed = new URL(url);
      const groups = new Map();
      for (const [key, value] of parsed.searchParams.entries()) {
        const existing = groups.get(key) || [];
        existing.push(value);
        groups.set(key, existing);
      }
      const parts = [];
      for (const key of [...groups.keys()].sort()) {
        for (const value of groups.get(key) || []) {
          parts.push(`${key}=${value}`);
        }
      }
      const query = parts.join("&");
      const canonicalUrl = query ? `${parsed.pathname}?${query}` : parsed.pathname;
      let bodyHash = "";
      let bodyLength = "";
      if (body !== undefined) {
        const bodyBytes = Buffer.from(body, "utf8");
        const md5Val = this._md5(bodyBytes.subarray(0, 102400));
        if (md5Val instanceof Error) return md5Val;
        bodyHash = md5Val;
        bodyLength = String(bodyBytes.length);
      }
      return [method.toUpperCase(), accept || "", contentType || "", bodyLength, String(ts), bodyHash, canonicalUrl].join("\n");
    } catch (err) {
      console.log(`[Error] Gagal menyusun canonical signature: ${err.message}`);
      return err;
    }
  }
  _sig(method, accept, contentType, url, body, useAlt = false, ts = Date.now()) {
    try {
      const canon = this._canon(method, accept, contentType, url, body, ts);
      if (canon instanceof Error) return canon;
      const secret = this._b64_dec(useAlt ? this.secret_key_alt : this.secret_key);
      if (secret instanceof Error) return secret;
      const sig = crypto.createHmac("md5", secret).update(canon, "utf8").digest();
      const b64Sig = this._b64_enc(sig);
      if (b64Sig instanceof Error) return b64Sig;
      return `${ts}|2|${b64Sig}`;
    } catch (err) {
      console.log(`[Error] Gagal membuat tanda tangan keamanan: ${err.message}`);
      return err;
    }
  }
  _hdrs({
    method,
    url,
    accept,
    contentType,
    body,
    includePlayMode,
    authToken,
    clientInfo,
    userAgent
  }) {
    try {
      const ts = Date.now();
      const reqAccept = accept || "application/json";
      const reqContentType = contentType || "application/json";
      const tokenVal = this._gen_tok(ts);
      if (tokenVal instanceof Error) return tokenVal;
      const sigVal = this._sig(method, reqAccept, reqContentType, url, body, false, ts);
      if (sigVal instanceof Error) return sigVal;
      const headers = {
        "User-Agent": userAgent,
        Accept: reqAccept,
        "Content-Type": reqContentType,
        Connection: "keep-alive",
        "X-Client-Token": tokenVal,
        "x-tr-signature": sigVal,
        "X-Client-Info": clientInfo,
        "X-Client-Status": "0"
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      if (includePlayMode) {
        headers["X-Play-Mode"] = "2";
      }
      return headers;
    } catch (err) {
      console.log(`[Error] Gagal mempersiapkan header: ${err.message}`);
      return err;
    }
  }
  _url(path, params) {
    try {
      const absPath = /^https?:\/\//i.test(path);
      const url = new URL(path, "https://moviebox.local");
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
      return absPath ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
    } catch (err) {
      console.log(`[Error] Gagal memformulasikan URL target: ${err.message}`);
      return err;
    }
  }
  async _req({
    method,
    path,
    data,
    params,
    headers,
    includePlayMode
  }) {
    const isHomePath = path === "/wefeed-mobile-bff/tab-operating";
    if (!this.token && !isHomePath) {
      console.log("[Process] Token belum tersedia. Menginisialisasi token melalui panggilan otomatis ke home()...");
      const initRes = await this.home();
      if (initRes instanceof Error) {
        console.log(`[Warning] Inisialisasi token via home() mengembalikan error: ${initRes.message}`);
      }
    }
    console.log(`[Process] Menyiapkan permintaan ${method ? method.toUpperCase() : "GET"} ke jalur: ${path}`);
    let lastErr = null;
    const reqMethod = method ? method.toUpperCase() : "GET";
    const reqData = data ? JSON.stringify(data) : undefined;
    for (const base of this.hosts) {
      try {
        const fullUrlVal = params ? this._url(`${base}${path}`, params) : `${base}${path}`;
        if (fullUrlVal instanceof Error) return fullUrlVal;
        console.log(`[Process] Menghubungi host: ${base}`);
        const hdrs = this._hdrs({
          method: reqMethod,
          url: fullUrlVal,
          body: reqData,
          authToken: this.token,
          clientInfo: this.cli.clientInfo,
          userAgent: this.cli.userAgent,
          includePlayMode: includePlayMode || false
        });
        if (hdrs instanceof Error) return hdrs;
        const response = await axios({
          method: reqMethod,
          url: fullUrlVal,
          data: reqMethod === "POST" ? reqData : undefined,
          headers: {
            ...hdrs,
            ...headers
          },
          timeout: this.timeout,
          validateStatus: () => true
        });
        console.log(`[Process] Status respon dari ${base}: ${response.status}`);
        const xUser = response.headers?.["x-user"];
        if (xUser) {
          try {
            const parsed = JSON.parse(xUser);
            if (parsed?.token) {
              this.token = parsed.token;
              console.log("[Process] Token pengguna berhasil diperbarui dari header respon.");
            }
          } catch (parseErr) {
            console.log(`[Process] Mengabaikan pembacaan x-user karena kesalahan format: ${parseErr.message}`);
          }
        }
        if (!this.codes.has(response.status)) {
          this.activeHost = base;
          if (response.status === 200 && response.data?.code === 0) {
            console.log("[Process] Respon sukses dari server berhasil diterima.");
            return this._snk(response.data?.data);
          }
          const serverError = new Error(`Kesalahan respon server: ${response.data?.code} - Msg: ${response.data?.message}`);
          console.log(`[Error] ${serverError.message}`);
          return serverError;
        }
      } catch (err) {
        console.log(`[Error] Gagal mengakses host ${base}: ${err.message}`);
        lastErr = err;
      }
    }
    const finalErr = new Error(`Seluruh host dalam daftar telah dicoba namun gagal mengakses ${path}`, {
      cause: lastErr
    });
    console.log(`[Error] ${finalErr.message}`);
    return finalErr;
  }
  async home({
    page,
    tab_id,
    ver
  } = {}) {
    try {
      console.log("[Process] Memulai pengambilan data beranda...");
      const params = {
        page: page || 1,
        tabId: tab_id || 0,
        version: ver || ""
      };
      return await this._req({
        method: "GET",
        path: "/wefeed-mobile-bff/tab-operating",
        params: params
      });
    } catch (err) {
      console.log(`[Error] Kesalahan pada metode home: ${err.message}`);
      return err;
    }
  }
  async search({
    query,
    type,
    page,
    per_page
  } = {}) {
    try {
      console.log(`[Process] Memulai pencarian kata kunci: "${query}"...`);
      const data = {
        keyword: query || "",
        page: page || 1,
        perPage: per_page || 20,
        subjectType: type || 0
      };
      return await this._req({
        method: "POST",
        path: "/wefeed-mobile-bff/subject-api/search",
        data: data
      });
    } catch (err) {
      console.log(`[Error] Kesalahan pada metode search: ${err.message}`);
      return err;
    }
  }
  async search_v2({
    query,
    type,
    tab_id,
    page,
    per_page
  } = {}) {
    try {
      console.log(`[Process] Memulai pencarian v2 kata kunci: "${query}"...`);
      const data = {
        keyword: query || "",
        page: page || 1,
        perPage: per_page || 20,
        subjectType: type || 0,
        tabId: tab_id || "All"
      };
      return await this._req({
        method: "POST",
        path: "/wefeed-mobile-bff/subject-api/search/v2",
        data: data
      });
    } catch (err) {
      console.log(`[Error] Kesalahan pada metode search_v2: ${err.message}`);
      return err;
    }
  }
  async detail({
    id,
    se
  } = {}) {
    try {
      console.log(`[Process] Mendapatkan detail konten ID: ${id}`);
      const params = {
        subjectId: id
      };
      const details = await this._req({
        method: "GET",
        path: "/wefeed-mobile-bff/subject-api/get",
        params: params
      });
      if (details instanceof Error) return details;
      if (se && details) {
        console.log(`[Process] Memperoleh season tambahan untuk ID: ${id}`);
        const seasons = await this.season({
          id: id
        });
        if (!(seasons instanceof Error)) {
          details.seasons = seasons;
        }
      }
      return details;
    } catch (err) {
      console.log(`[Error] Kesalahan pada metode detail: ${err.message}`);
      return err;
    }
  }
  async season({
    id
  } = {}) {
    try {
      console.log(`[Process] Memperoleh informasi season untuk ID: ${id}`);
      const params = {
        subjectId: id
      };
      return await this._req({
        method: "GET",
        path: "/wefeed-mobile-bff/subject-api/season-info",
        params: params
      });
    } catch (err) {
      console.log(`[Error] Kesalahan pada metode season: ${err.message}`);
      return err;
    }
  }
  async play_info({
    id,
    se,
    ep
  } = {}) {
    try {
      console.log(`[Process] Memperoleh informasi putar (Play Info) ID: ${id}`);
      const params = {
        subjectId: id
      };
      if (se !== undefined && se !== null) params.se = se;
      if (ep !== undefined && ep !== null) params.ep = ep;
      return await this._req({
        method: "GET",
        path: "/wefeed-mobile-bff/subject-api/play-info",
        params: params
      });
    } catch (err) {
      console.log(`[Error] Kesalahan pada metode play_info: ${err.message}`);
      return err;
    }
  }
  async resource({
    id,
    res,
    page,
    per_page,
    se,
    ep
  } = {}) {
    try {
      console.log(`[Process] Memperoleh resource media untuk ID: ${id}`);
      const params = {
        subjectId: id,
        resolution: res || 1080,
        page: page || 1,
        perPage: per_page || 20
      };
      if (se !== undefined && se !== null) params.se = se;
      if (ep !== undefined && ep !== null) params.ep = ep;
      return await this._req({
        method: "GET",
        path: "/wefeed-mobile-bff/subject-api/resource",
        params: params
      });
    } catch (err) {
      console.log(`[Error] Kesalahan pada metode resource: ${err.message}`);
      return err;
    }
  }
  async captions({
    id,
    res_id
  } = {}) {
    try {
      console.log(`[Process] Memperoleh eksternal caption untuk ID: ${id}`);
      const params = {
        subjectId: id,
        resourceId: res_id || ""
      };
      return await this._req({
        method: "GET",
        path: "/wefeed-mobile-bff/subject-api/get-ext-captions",
        params: params
      });
    } catch (err) {
      console.log(`[Error] Kesalahan pada metode captions: ${err.message}`);
      return err;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "search", "search_v2", "detail", "season", "play_info", "resource", "captions"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/?action=home&page=1&tab_id=0",
          search: "/?action=search&query=Spiderman&page=1",
          search_v2: "/?action=search_v2&query=Batman&tab_id=All",
          detail: "/?action=detail&id=5256667397997610368&se=1",
          season: "/?action=season&id=5256667397997610368",
          play_info: "/?action=play_info&id=5256667397997610368&se=1&ep=1",
          resource: "/?action=resource&id=5256667397997610368&res=1080&se=1&ep=1",
          captions: "/?action=captions&id=5256667397997610368&res_id=12345"
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
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk search."
          });
        }
        response = await api.search(params);
        break;
      case "search_v2":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk search_v2."
          });
        }
        response = await api.search_v2(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk detail."
          });
        }
        response = await api.detail(params);
        break;
      case "season":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk season."
          });
        }
        response = await api.season(params);
        break;
      case "play_info":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk play_info."
          });
        }
        response = await api.play_info(params);
        break;
      case "resource":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk resource."
          });
        }
        response = await api.resource(params);
        break;
      case "captions":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk captions."
          });
        }
        response = await api.captions(params);
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
        error: "Server tidak memberikan respon atau data kosong."
      });
    }
    if (response instanceof Error) {
      return res.status(422).json({
        status: false,
        action: action,
        error: response.message || "Terjadi kendala saat menghubungi API target."
      });
    }
    const responseData = Array.isArray(response) ? {
      data: response
    } : response;
    return res.status(200).json({
      action: action,
      ...responseData
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