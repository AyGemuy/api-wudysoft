import axios from "axios";
import crypto from "crypto";
class NovelHub {
  constructor() {
    this.API_BASE = "https://sapi.aoneroom.com";
    this.PACKAGE_NAME = "com.community.short.tv";
    this.DEFAULT_SIGNATURE = "1782760706916|2|inVAdcp3lMU74XFPVhB/Cw==";
    this.DEFAULT_CLIENT_TOKEN = "1782760706919,677b8d3e31597630df3585914dc9cc0e";
    this.SECRET_CANDIDATES = ["76iRl07s0xSN9jqmEWAt79EBJZulIQIsV64FZr2O"];
    this.currentDeviceId = this._dev();
    this.currentGaid = this._gaid();
    this.authToken = null;
  }
  _dev() {
    return crypto.randomBytes(16).toString("hex");
  }
  _gaid() {
    const hex = crypto.randomBytes(16).toString("hex");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }
  _md5(data) {
    return crypto.createHash("md5").update(data, "utf8").digest("hex");
  }
  _tok() {
    const ts = Date.now().toString();
    const h1 = this._md5(ts);
    const h2 = this._md5(h1);
    return `${ts},${h2}`;
  }
  _sig(method, accept, contentType, url, body, timestamp, secret) {
    let bodyMd5 = "";
    if (body && body.length > 0) {
      const truncated = body.length > 102400 ? body.substring(0, 102400) : body;
      bodyMd5 = this._md5(truncated);
    }
    let pathAndQuery = "";
    try {
      const parsed = new URL(url);
      pathAndQuery = parsed.pathname + (parsed.search || "");
    } catch {
      pathAndQuery = url;
    }
    const contentLength = body ? body.length.toString() : "0";
    const signStr = `${method}\n${accept || ""}\n${contentType || ""}\n${contentLength}\n${timestamp}\n${bodyMd5}\n${pathAndQuery}`;
    let key;
    try {
      const decoded = Buffer.from(secret, "base64");
      key = decoded.length > 0 ? decoded.toString("utf8") : secret;
    } catch {
      key = secret;
    }
    const hmac = crypto.createHmac("md5", key);
    hmac.update(signStr, "utf8");
    return `${timestamp}|2|${hmac.digest("base64")}`;
  }
  _tsig(method, accept, contentType, url, body) {
    const timestamp = Date.now().toString();
    for (const secret of this.SECRET_CANDIDATES) {
      try {
        return this._sig(method, accept, contentType, url, body, timestamp, secret);
      } catch {
        continue;
      }
    }
    return this._sig(method, accept, contentType, url, body, timestamp, this.SECRET_CANDIDATES[0]);
  }
  _err(msg) {
    return {
      status: false,
      result: msg,
      token: this.authToken
    };
  }
  async _fetch() {
    if (this.authToken) {
      console.log("🔄 [Auth] Reusing existing auth token...");
      return {
        status: true,
        token: this.authToken
      };
    }
    console.log("🔹 [Auth] Fetching new token from /app/config...");
    try {
      const params = new URLSearchParams({
        keys: "subtitle_search_opensub,subtitle_language,business_guide_config,psLinkAppsLayoutStyle,sa_dauupupup_config,sa_flutter_init_immediately_2,downloadForegroundServiceV3,sa_contact_us_config,re_download_report_number,sb_new_trending_local,prefer_select_on,is_exoplayer,keyBackgroundReportOff,lowMemoryValue,most_trending_btn,download_error_opt_off,player_async,downloadRangeSize,multithreadingDownload,aggr_search_enable,downloadOkhttp,sa_book_guide_enable,sa_home_guide_enable,keyAliveOff,point_config,clientLogsRetrieve,app_center_switch,play_mode,shorts_tab_in_for_you,vipFissionOn",
        version: ""
      });
      const url = `${this.API_BASE}/wefeed-short-bff/app/config?${params.toString()}`;
      const headers = {
        "User-Agent": "com.community.short.tv/2047 (Linux; U; Android 15; id_ID; RMX3890; Build/AQ3A.240812.002; Cronet/149.0.7827.48)",
        "x-idle-data": "1",
        "x-client-info": JSON.stringify({
          package_name: this.PACKAGE_NAME,
          version_name: "2.0.26.0326.official.03",
          version_code: 2047,
          os: "android",
          os_version: "15",
          device_id: this.currentDeviceId,
          install_store: "gp",
          gaid: this.currentGaid,
          brand: "realme",
          model: "RMX3890",
          system_language: "id",
          net: "NETWORK_4G",
          region: "ID",
          timezone: "Asia/Makassar",
          sp_code: "51010",
          "X-Idle-Data": "1"
        }),
        "x-client-status": "0",
        "x-tr-signature": this.DEFAULT_SIGNATURE,
        "x-client-token": this.DEFAULT_CLIENT_TOKEN,
        priority: "u=1, i"
      };
      const response = await axios.get(url, {
        headers: headers
      });
      const xUser = response.headers["x-user"];
      if (xUser) {
        const user = JSON.parse(xUser);
        if (user.token) {
          this.authToken = user.token;
          console.log("✅ [Auth] New token acquired from x-user header");
          return {
            status: true,
            token: this.authToken
          };
        }
      }
      const token = response.data?.data?.token || response.data?.token;
      if (token) {
        this.authToken = token;
        console.log("✅ [Auth] New token acquired from response body");
        return {
          status: true,
          token: this.authToken
        };
      }
      return this._err("Token properties missing in response");
    } catch (error) {
      console.error("❌ [Auth] _fetch failed:", error.message);
      return this._err(error.message);
    }
  }
  async _cli() {
    try {
      const authRes = await this._fetch();
      if (!authRes.status) return authRes;
      const client = axios.create({
        baseURL: this.API_BASE,
        timeout: 15e3,
        headers: {
          "User-Agent": "com.community.short.tv/2047 (Linux; U; Android 15; id_ID; RMX3890; Build/AQ3A.240812.002; Cronet/149.0.7827.48)",
          "x-idle-data": "1",
          "x-client-info": JSON.stringify({
            package_name: this.PACKAGE_NAME,
            version_name: "2.0.26.0326.official.03",
            version_code: 2047,
            os: "android",
            os_version: "15",
            device_id: this._dev(),
            install_store: "gp",
            gaid: this._gaid(),
            brand: "realme",
            model: "RMX3890",
            system_language: "id",
            net: "NETWORK_4G",
            region: "ID",
            timezone: "Asia/Makassar",
            sp_code: "51010",
            "X-Idle-Data": "1"
          }),
          "x-client-status": "1",
          priority: "u=1, i",
          "Content-Type": "application/json",
          authorization: `Bearer ${this.authToken}`
        }
      });
      return {
        status: true,
        client: client
      };
    } catch (error) {
      console.error("❌ [Client] _cli failed:", error.message);
      return this._err(error.message);
    }
  }
  async _req(method, path, params = {}, data = null, extraHeaders = {}) {
    try {
      const clientRes = await this._cli();
      if (!clientRes.status) return clientRes;
      const client = clientRes.client;
      const url = `${this.API_BASE}${path}`;
      const query = new URLSearchParams(params).toString();
      const fullUrl = query ? `${url}?${query}` : url;
      const bodyStr = data ? JSON.stringify(data) : "";
      const signature = this._tsig(method, "*/*", "application/json", fullUrl, bodyStr);
      const clientToken = this._tok();
      const headers = {
        "x-tr-signature": signature,
        "x-client-token": clientToken,
        ...extraHeaders
      };
      const config = {
        method: method,
        url: path,
        headers: {
          ...client.defaults.headers.common,
          ...headers
        },
        ...method === "GET" ? {
          params: params
        } : {
          data: data
        }
      };
      console.log(`🚀 [Request] Sending ${method} to ${path}...`);
      const response = await client.request(config);
      return {
        status: true,
        result: response.data?.data || response.data,
        token: this.authToken
      };
    } catch (error) {
      console.error(`❌ [Request] ${method} ${path} failed:`, error.message);
      return this._err(error.message);
    }
  }
  async download(args = {}) {
    try {
      const {
        novel_id,
        ...rest
      } = args;
      if (!novel_id) return this._err("Missing required parameter: novel_id");
      return await this._req("GET", "/wefeed-short-bff/content/download", {
        novelId: novel_id,
        ...rest
      });
    } catch (err) {
      console.error("❌ [API] download method error:", err.message);
      return this._err(err.message);
    }
  }
  async chap_list(args = {}) {
    try {
      const {
        novel_id,
        ...rest
      } = args;
      if (!novel_id) return this._err("Missing required parameter: novel_id");
      return await this._req("GET", "/wefeed-short-bff/content/chapter-list", {
        novelId: novel_id,
        ...rest
      });
    } catch (err) {
      console.error("❌ [API] chap_list method error:", err.message);
      return this._err(err.message);
    }
  }
  async chap_detail(args = {}) {
    try {
      const {
        chapter_id,
        ...rest
      } = args;
      if (!chapter_id) return this._err("Missing required parameter: chapter_id");
      return await this._req("GET", "/wefeed-short-bff/content/chapter-detail", {
        chapterId: chapter_id,
        ...rest
      });
    } catch (err) {
      console.error("❌ [API] chap_detail method error:", err.message);
      return this._err(err.message);
    }
  }
  async novel_detail(args = {}) {
    try {
      const {
        novel_id,
        novel_type = 2,
        ...rest
      } = args;
      if (!novel_id) return this._err("Missing required parameter: novel_id");
      return await this._req("GET", "/wefeed-short-bff/content/novel-detail", {
        novelId: novel_id,
        novelType: novel_type,
        ...rest
      });
    } catch (err) {
      console.error("❌ [API] novel_detail method error:", err.message);
      return this._err(err.message);
    }
  }
  async group_list(args = {}) {
    try {
      const {
        page_name,
        op_conf_id,
        ...rest
      } = args;
      if (!page_name) return this._err("Missing required parameter: page_name");
      return await this._req("GET", "/wefeed-short-bff/operation/group-content-list", {
        pageName: page_name,
        opConfId: op_conf_id,
        ...rest
      });
    } catch (err) {
      console.error("❌ [API] group_list method error:", err.message);
      return this._err(err.message);
    }
  }
  async trending(args = {}) {
    try {
      const {
        page = 1,
          per_page = 8, ...rest
      } = args;
      const data = {
        deepLink: "",
        immersiveRecType: 0,
        latest_events: [],
        page: String(page),
        perPage: per_page,
        postId: "",
        sessionId: this._tok().split(",")[0],
        tabId: 0,
        userPrefer: "",
        ...rest
      };
      return await this._req("POST", "/wefeed-short-bff/shorts/most-trending", {}, data);
    } catch (err) {
      console.error("❌ [API] trending method error:", err.message);
      return this._err(err.message);
    }
  }
  async push_list(args = {}) {
    try {
      const {
        ...rest
      } = args;
      return await this._req("GET", "/wefeed-short-bff/message/push/local/list", {
        ...rest
      });
    } catch (err) {
      console.error("❌ [API] push_list method error:", err.message);
      return this._err(err.message);
    }
  }
  async for_you(args = {}) {
    try {
      const {
        novel_id,
        limit = 15,
        page_num = 1,
        ...rest
      } = args;
      if (!novel_id) return this._err("Missing required parameter: novel_id");
      return await this._req("GET", "/wefeed-short-bff/content/for-you", {
        novelId: novel_id,
        recFrom: 2,
        limit: limit,
        lastId: "",
        tabId: 0,
        pageNum: page_num,
        novelType: 2,
        ...rest
      });
    } catch (err) {
      console.error("❌ [API] for_you method error:", err.message);
      return this._err(err.message);
    }
  }
  async search(args = {}) {
    try {
      const {
        keyword,
        novel_type = 0,
        page = 1,
        per_page = 10,
        ...rest
      } = args;
      if (!keyword) return this._err("Missing required parameter: keyword");
      return await this._req("GET", "/wefeed-short-bff/content/search", {
        keyword: keyword,
        novelType: novel_type,
        page: page,
        perPage: per_page,
        ...rest
      });
    } catch (err) {
      console.error("❌ [API] search method error:", err.message);
      return this._err(err.message);
    }
  }
  async search_suggest(args = {}) {
    try {
      const {
        keyword,
        per_page = 10,
        ...rest
      } = args;
      if (!keyword) return this._err("Missing required parameter: keyword");
      return await this._req("GET", "/wefeed-short-bff/content/search-suggest", {
        keyword: keyword,
        perPage: per_page,
        ...rest
      });
    } catch (err) {
      console.error("❌ [API] search_suggest method error:", err.message);
      return this._err(err.message);
    }
  }
  async home_tab(args = {}) {
    try {
      const {
        tab_id = 6, ...rest
      } = args;
      return await this._req("GET", "/wefeed-short-bff/home/tab-page", {
        tabId: tab_id,
        version: "",
        ...rest
      });
    } catch (err) {
      console.error("❌ [API] home_tab method error:", err.message);
      return this._err(err.message);
    }
  }
  async reel(args = {}) {
    try {
      const {
        page = 1,
          per_page = 5, ...rest
      } = args;
      const data = {
        deepLink: "",
        immersiveRecType: 1,
        latest_events: [],
        page: String(page),
        perPage: per_page,
        postId: "0",
        sessionId: this._tok().split(",")[0],
        tabId: 0,
        userPrefer: "",
        ...rest
      };
      return await this._req("POST", "/wefeed-short-bff/shorts/reel", {}, data, {
        "x-client-token": this._tok()
      });
    } catch (err) {
      console.error("❌ [API] reel method error:", err.message);
      return this._err(err.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["download", "chap_list", "chap_detail", "novel_detail", "group_list", "trending", "push_list", "for_you", "search", "search_suggest", "home_tab", "reel"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          download: "/novelhub?action=download&novel_id=123",
          chap_list: "/novelhub?action=chap_list&novel_id=123",
          chap_detail: "/novelhub?action=chap_detail&chapter_id=456",
          novel_detail: "/novelhub?action=novel_detail&novel_id=123",
          group_list: "/novelhub?action=group_list&page_name=home",
          trending: "/novelhub?action=trending&page=1&per_page=8",
          push_list: "/novelhub?action=push_list",
          for_you: "/novelhub?action=for_you&novel_id=123",
          search: "/novelhub?action=search&keyword=romance",
          search_suggest: "/novelhub?action=search_suggest&keyword=rom",
          home_tab: "/novelhub?action=home_tab&tab_id=6",
          reel: "/novelhub?action=reel&page=1"
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new NovelHub();
  try {
    let response;
    switch (action) {
      case "download":
        if (!params.novel_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'novel_id' wajib diisi untuk download."
          });
        }
        response = await api.download(params);
        break;
      case "chap_list":
        if (!params.novel_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'novel_id' wajib diisi untuk chap_list."
          });
        }
        response = await api.chap_list(params);
        break;
      case "chap_detail":
        if (!params.chapter_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'chapter_id' wajib diisi untuk chap_detail."
          });
        }
        response = await api.chap_detail(params);
        break;
      case "novel_detail":
        if (!params.novel_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'novel_id' wajib diisi untuk novel_detail."
          });
        }
        response = await api.novel_detail(params);
        break;
      case "group_list":
        if (!params.page_name) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'page_name' wajib diisi untuk group_list."
          });
        }
        response = await api.group_list(params);
        break;
      case "trending":
        response = await api.trending(params);
        break;
      case "push_list":
        response = await api.push_list(params);
        break;
      case "for_you":
        if (!params.novel_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'novel_id' wajib diisi untuk for_you."
          });
        }
        response = await api.for_you(params);
        break;
      case "search":
        if (!params.keyword) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'keyword' wajib diisi untuk search."
          });
        }
        response = await api.search(params);
        break;
      case "search_suggest":
        if (!params.keyword) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'keyword' wajib diisi untuk search_suggest."
          });
        }
        response = await api.search_suggest(params);
        break;
      case "home_tab":
        response = await api.home_tab(params);
        break;
      case "reel":
        response = await api.reel(params);
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
    if (response.status === false) {
      return res.status(422).json({
        action: action,
        ...response
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