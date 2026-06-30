import axios from "axios";
import crypto from "crypto";
class ScribdApi {
  constructor() {
    this.base = "https://api.scribd.com/api/v2";
    this.key = "ihr2yogfjjezmbzvqpd7u1zrcxwnv3";
    this.hmac = "sec-sh0uygjxosgv2ww17ubkheje5x";
    this.suffix = "zS7-CPyMM?@hcvePFLN4a4=bH!g^Zvsk";
    this.machine_uuid = crypto.randomBytes(8).toString("hex");
    this.uuid = crypto.randomUUID();
    this.def_params = {
      api_key: this.key,
      app_version: "16.14",
      brand: "scribd",
      client_version: "92",
      device_type: "phone",
      locale: "en",
      machine_uuid: this.machine_uuid,
      platform_version: "35",
      uuid: this.uuid
    };
  }
  _snake(obj) {
    if (Array.isArray(obj)) {
      return obj.map(v => this._snake(v));
    } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
      return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        acc[snakeKey] = this._snake(obj[key]);
        return acc;
      }, {});
    }
    return obj;
  }
  async sig({
    path,
    params
  }) {
    try {
      const {
        api_sig,
        ...rest
      } = params;
      const sign_params = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value === null || value === undefined) continue;
        if (Array.isArray(value)) {
          sign_params[key] = value.join("");
        } else {
          sign_params[key] = String(value);
        }
      }
      const sorted_keys = Object.keys(sign_params).sort();
      const clean_path = path.replace(/^\//, "");
      const path_for_sign = `/api/v2/${clean_path}`;
      const param_str = sorted_keys.map(k => k + sign_params[k]).join("");
      const base = `${path_for_sign}/${param_str}${this.suffix}`;
      const hex = crypto.createHmac("sha1", this.hmac).update(base).digest("hex");
      return Buffer.from(hex, "utf8").toString("base64");
    } catch (err) {
      console.error(`[SIG ERROR] Gagal kalkulasi sign untuk ${path}:`, err.message);
      return null;
    }
  }
  async req({
    path,
    params = {},
    headers = {},
    method = "GET",
    responseType = "json",
    returnFullResponse = false
  }) {
    try {
      console.log(`[* PROCESS] Requesting: ${path}`);
      const all_params = {
        ...this.def_params,
        ...params
      };
      const signature = await this.sig({
        path: path,
        params: all_params
      });
      if (!signature) return {
        success: false,
        error: "signature_generation_failed"
      };
      const query_obj = {
        ...all_params,
        api_sig: signature
      };
      const pairs = [];
      for (const [k, v] of Object.entries(query_obj)) {
        if (Array.isArray(v)) {
          for (const item of v) {
            pairs.push(`${encodeURIComponent(k)}[]=${encodeURIComponent(item)}`);
          }
        } else {
          pairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
        }
      }
      const clean_path = path.replace(/^\//, "");
      const full_url = `${this.base}/${clean_path}${pairs.length ? "?" + pairs.join("&") : ""}`;
      const config = {
        method: method,
        url: full_url,
        responseType: responseType,
        headers: {
          "User-Agent": "okhttp/5.3.2",
          "Accept-Encoding": "gzip",
          "x-api-start": `t=${Date.now()}`,
          ...headers
        }
      };
      const res = await axios.request(config);
      console.log(`[+ SUCCESS] ${path} selesai diproses.`);
      if (returnFullResponse) {
        return res;
      }
      if (responseType === "json" && res.data) {
        return this._snake(res.data);
      }
      return res.data;
    } catch (err) {
      console.error(`[- REQ ERROR] Gagal memproses request ke ${path}:`, err.response?.data || err.message);
      return {
        success: false,
        error: "request_failed",
        message: err.message
      };
    }
  }
  async account_info({
    ...rest
  } = {}) {
    try {
      const params = {
        appstore_country_code: "ID",
        device_manufacturer: "realme",
        device_model: "RMX3890",
        distribution_channel: "googleplay",
        google_play_enabled: "true",
        platform: "mobile_android",
        ...rest
      };
      return await this.req({
        path: "users/account_info",
        params: params
      });
    } catch (err) {
      console.error("[API ERROR] Gagal di fungsi account_info:", err.message);
      return {
        success: false,
        error: "account_info_failed",
        message: err.message
      };
    }
  }
  async user_profile({
    id,
    ...rest
  } = {}) {
    try {
      if (!id) return {
        success: false,
        error: "missing_required_input",
        field: "id"
      };
      const params = {
        user_id: id,
        return_core_types: "true",
        ...rest
      };
      return await this.req({
        path: "users/profile",
        params: params
      });
    } catch (err) {
      console.error(`[API ERROR] Gagal di fungsi user_profile untuk ID: ${id}:`, err.message);
      return {
        success: false,
        error: "user_profile_failed",
        message: err.message
      };
    }
  }
  async home_struct({
    ...rest
  } = {}) {
    try {
      return await this.req({
        path: "home/structure",
        params: rest
      });
    } catch (err) {
      console.error("[API ERROR] Gagal di fungsi home_struct:", err.message);
      return {
        success: false,
        error: "home_struct_failed",
        message: err.message
      };
    }
  }
  async camp_home({
    ...rest
  } = {}) {
    try {
      const params = {
        return_core_types: "true",
        ...rest
      };
      return await this.req({
        path: "campaign/home",
        params: params
      });
    } catch (err) {
      console.error("[API ERROR] Gagal di fungsi camp_home:", err.message);
      return {
        success: false,
        error: "camp_home_failed",
        message: err.message
      };
    }
  }
  async home_v2({
    ...rest
  } = {}) {
    try {
      const params = {
        content_type: "mixed",
        distribution_channel: "googleplay",
        return_core_types: "true",
        ...rest
      };
      return await this.req({
        path: "home/v2",
        params: params
      });
    } catch (err) {
      console.error("[API ERROR] Gagal di fungsi home_v2:", err.message);
      return {
        success: false,
        error: "home_v2_failed",
        message: err.message
      };
    }
  }
  async disc_interest({
    id,
    ...rest
  } = {}) {
    try {
      if (!id) return {
        success: false,
        error: "missing_required_input",
        field: "id"
      };
      const params = {
        content_type: "document",
        interest_id: id,
        return_core_types: "true",
        ...rest
      };
      return await this.req({
        path: "discover/interest",
        params: params
      });
    } catch (err) {
      console.error(`[API ERROR] Gagal di fungsi disc_interest untuk ID: ${id}:`, err.message);
      return {
        success: false,
        error: "disc_interest_failed",
        message: err.message
      };
    }
  }
  async disc_view({
    ...rest
  } = {}) {
    try {
      const params = {
        return_core_types: "true",
        ...rest
      };
      return await this.req({
        path: "discover/overview",
        params: params
      });
    } catch (err) {
      console.error("[API ERROR] Gagal di fungsi disc_view:", err.message);
      return {
        success: false,
        error: "disc_view_failed",
        message: err.message
      };
    }
  }
  async search_dynamic({
    query,
    page = 1,
    extras,
    filters = {},
    ...rest
  } = {}) {
    try {
      if (!query) return {
        success: false,
        error: "missing_required_input",
        field: "query"
      };
      const default_extras = extras ?? ["type", "default_background_color", "interests", "reads_count", "series_collection", "current_user_review", "short_description", "global_reading_speed_wpm", "released_at", "contribution_counts"];
      const params = {
        query: query,
        page: page,
        content_type: "documents",
        extras: default_extras,
        filters: typeof filters === "string" ? filters : JSON.stringify(filters),
        ...rest
      };
      return await this.req({
        path: "search_v2/search_dynamic",
        params: params
      });
    } catch (err) {
      console.error(`[API ERROR] Gagal di fungsi search_dynamic untuk query: ${query}:`, err.message);
      return {
        success: false,
        error: "search_dynamic_failed",
        message: err.message
      };
    }
  }
  async query_suggest({
    query,
    headers = {},
    ...rest
  } = {}) {
    try {
      if (!query) return {
        success: false,
        error: "missing_required_input",
        field: "query"
      };
      const default_headers = {
        "if-modified-since": "Sun, 28 Jun 2026 12:23:20 GMT",
        ...headers
      };
      return await this.req({
        path: "search_v2/query_suggestions",
        params: {
          query: query,
          ...rest
        },
        headers: default_headers
      });
    } catch (err) {
      console.error(`[API ERROR] Gagal di fungsi query_suggest untuk query: ${query}:`, err.message);
      return {
        success: false,
        error: "query_suggest_failed",
        message: err.message
      };
    }
  }
  async struct_search({
    ...rest
  } = {}) {
    try {
      return await this.req({
        path: "search_v2/structure_dynamic",
        params: rest
      });
    } catch (err) {
      console.error("[API ERROR] Gagal di fungsi struct_search:", err.message);
      return {
        success: false,
        error: "struct_search_failed",
        message: err.message
      };
    }
  }
  async doc_info({
    doc_id,
    extras,
    ...rest
  } = {}) {
    try {
      if (!doc_id) return {
        success: false,
        error: "missing_required_input",
        field: "doc_id"
      };
      const default_extras = extras ?? ["block_count", "created_at", "description", "reads_count", "released_at", "updated_at", "is_private", "authors.about", "publisher.about", "interests", "current_user_review", "reviews_count", "top_user_reviews", "full_description", "contributions", "contributions.user", "contributions.user.default_background_color", "chapters", "editions", "series_collection", "series_collection.num_issues_in_series", "series_collection.num_volumes_in_series", "next_document_in_series", "rtl", "canonical_document", "position_in_series", "whole_document", "chapter_document", "chapter_documents", "progress", "short_description", "global_reading_speed_wpm", "summary", "summary_canonical_id", "summary.concrete_documents.summary_canonical_id", "summary.concrete_documents.progress"];
      const params = {
        document_ids: doc_id,
        supports_html: "true",
        extras: default_extras,
        ...rest
      };
      return await this.req({
        path: "documents/info",
        params: params
      });
    } catch (err) {
      console.error(`[API ERROR] Gagal di fungsi doc_info untuk ID: ${doc_id}:`, err.message);
      return {
        success: false,
        error: "doc_info_failed",
        message: err.message
      };
    }
  }
  async doc_access({
    id,
    ...rest
  } = {}) {
    try {
      if (!id) return {
        success: false,
        error: "missing_required_input",
        field: "id"
      };
      const params = {
        document_ids: Array.isArray(id) ? id.join(",") : id,
        ...rest
      };
      return await this.req({
        path: "documents/access",
        params: params
      });
    } catch (err) {
      console.error("[API ERROR] Gagal di fungsi doc_access:", err.message);
      return {
        success: false,
        error: "doc_access_failed",
        message: err.message
      };
    }
  }
  async doc_related({
    doc_id,
    ...rest
  } = {}) {
    try {
      if (!doc_id) return {
        success: false,
        error: "missing_required_input",
        field: "doc_id"
      };
      const params = {
        document_id: doc_id,
        return_core_types: "true",
        ...rest
      };
      return await this.req({
        path: "documents/related_modules",
        params: params
      });
    } catch (err) {
      console.error("[API ERROR] Gagal di fungsi doc_related:", err.message);
      return {
        success: false,
        error: "doc_related_failed",
        message: err.message
      };
    }
  }
  async doc_token({
    doc_id,
    ...rest
  } = {}) {
    try {
      if (!doc_id) return {
        success: false,
        error: "missing_required_input",
        field: "doc_id"
      };
      const params = {
        document_id: doc_id,
        ...rest
      };
      return await this.req({
        path: "documents/access_token",
        params: params
      });
    } catch (err) {
      console.error("[API ERROR] Gagal di fungsi doc_token:", err.message);
      return {
        success: false,
        error: "doc_token_failed",
        message: err.message
      };
    }
  }
  async doc_download({
    doc_id,
    ...rest
  } = {}) {
    try {
      if (!doc_id) return {
        success: false,
        error: "missing_required_input",
        field: "doc_id"
      };
      const tk = await this.doc_token({
        doc_id: doc_id,
        ...rest
      });
      const token = tk?.result?.token;
      if (!token) return {
        success: false,
        error: "access_token_missing_or_failed"
      };
      return await this.req({
        path: "documents/download",
        params: {
          document_id: doc_id,
          token: token,
          ...rest
        },
        responseType: "arraybuffer",
        returnFullResponse: true
      });
    } catch (err) {
      console.error(`[API ERROR] Gagal mengunduh dokumen ID: ${doc_id}:`, err.message);
      return {
        success: false,
        error: "doc_download_failed",
        message: err.message
      };
    }
  }
  async doc_reviews({
    id,
    page = "1",
    supports_html = "true",
    ...rest
  } = {}) {
    try {
      if (!id) return {
        success: false,
        error: "missing_required_input",
        field: "id"
      };
      const params = {
        document_id: id,
        page: page,
        supports_html: supports_html,
        ...rest
      };
      return await this.req({
        path: "reviews",
        params: params
      });
    } catch (err) {
      console.error("[API ERROR] Gagal di fungsi doc_reviews:", err.message);
      return {
        success: false,
        error: "doc_reviews_failed",
        message: err.message
      };
    }
  }
  async view_log({
    id,
    duration,
    ...rest
  } = {}) {
    try {
      if (!id || !duration) return {
        success: false,
        error: "missing_required_input",
        fields: ["id", "duration"]
      };
      return await this.req({
        path: "users/document_view",
        params: {
          doc_id: id,
          duration: duration,
          ...rest
        },
        method: "POST"
      });
    } catch (err) {
      console.error("[API ERROR] Gagal di fungsi view_log:", err.message);
      return {
        success: false,
        error: "view_log_failed",
        message: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "home_struct", "camp_home", "disc_interest", "disc_view", "account", "profile", "search", "suggest", "struct_search", "detail", "access", "related", "token", "reviews", "view_log", "download"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new ScribdApi();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home_v2(params);
        break;
      case "home_struct":
        response = await api.home_struct(params);
        break;
      case "camp_home":
        response = await api.camp_home(params);
        break;
      case "disc_interest":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' (interest_id) wajib diisi."
          });
        }
        response = await api.disc_interest(params);
        break;
      case "disc_view":
        response = await api.disc_view(params);
        break;
      case "account":
        response = await api.account_info(params);
        break;
      case "profile":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' (user_id) wajib diisi."
          });
        }
        response = await api.user_profile({
          id: params.id,
          ...params
        });
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi."
          });
        }
        if (params.extras && typeof params.extras === "string") {
          params.extras = params.extras.split(",");
        }
        response = await api.search_dynamic(params);
        break;
      case "suggest":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi."
          });
        }
        response = await api.query_suggest(params);
        break;
      case "struct_search":
        response = await api.struct_search(params);
        break;
      case "detail":
        if (!params.doc_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'doc_id' wajib diisi."
          });
        }
        if (params.extras && typeof params.extras === "string") {
          params.extras = params.extras.split(",");
        }
        response = await api.doc_info(params);
        break;
      case "access":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' (document_id) wajib diisi."
          });
        }
        response = await api.doc_access(params);
        break;
      case "related":
        if (!params.doc_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'doc_id' wajib diisi."
          });
        }
        response = await api.doc_related(params);
        break;
      case "token":
        if (!params.doc_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'doc_id' wajib diisi."
          });
        }
        response = await api.doc_token(params);
        break;
      case "reviews":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' (document_id) wajib diisi."
          });
        }
        response = await api.doc_reviews(params);
        break;
      case "view_log":
        if (!params.id || !params.duration) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' dan 'duration' wajib diisi."
          });
        }
        response = await api.view_log(params);
        break;
      case "download":
        if (!params.doc_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'doc_id' wajib diisi."
          });
        }
        const downloadRes = await api.doc_download(params);
        if (!downloadRes || downloadRes.success === false || !downloadRes.data) {
          return res.status(502).json({
            status: false,
            error: "Gagal mendapatkan data unduhan atau token salah.",
            details: downloadRes
          });
        }
        const contentType = downloadRes.headers["content-type"] || "application/octet-stream";
        const contentDisposition = downloadRes.headers["content-disposition"] || `attachment; filename=scribd_${params.doc_id}`;
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", contentDisposition);
        return res.status(200).send(Buffer.from(downloadRes.data));
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
    if (response.success === false) {
      return res.status(400).json({
        status: false,
        action: action,
        ...response
      });
    }
    return res.status(200).json({
      status: true,
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