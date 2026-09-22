import axios from "axios";
class TeraDownloader {
  constructor() {
    this.base_url = "https://apiwala.teradownloader.pro";
    this.client = axios.create({
      baseURL: this.base_url,
      timeout: 6e4,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/json",
        origin: "https://teradownloader.pro",
        referer: "https://teradownloader.pro/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="140"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    });
    this.init();
  }
  init() {
    this.client.interceptors.request.use(config => {
      console.log(`[REQ] -> ${config?.method?.toUpperCase()} ${config?.baseURL}${config?.url}`);
      return config;
    }, error => {
      console.log(`[REQ_ERR] -> ${error?.message}`);
      return Promise.reject(error);
    });
    this.client.interceptors.response.use(response => {
      console.log(`[RES] -> Status: ${response?.status}`);
      return response;
    }, error => {
      console.log(`[RES_ERR] -> Status: ${error?.response?.status || "NO_RES"} - ${error?.message}`);
      return Promise.reject(error);
    });
  }
  dpPrs(val) {
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          return this.dpPrs(JSON.parse(trimmed));
        } catch {
          return val;
        }
      }
      return val;
    }
    if (Array.isArray(val)) {
      return val.map(item => this.dpPrs(item));
    }
    if (val && typeof val === "object") {
      const res = {};
      for (const [k, v] of Object.entries(val)) {
        res[k] = this.dpPrs(v);
      }
      return res;
    }
    return val;
  }
  toSnk(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.toSnk(item));
    }
    if (data && typeof data === "object") {
      const res = {};
      for (const [key, val] of Object.entries(data)) {
        const snk_key = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2").toLowerCase();
        res[snk_key] = this.toSnk(val);
      }
      return res;
    }
    return data;
  }
  async download({
    link,
    url = null,
    dir_path = "",
    page = 1,
    ...rest
  }) {
    console.log("[PROCESS] Initializing TeraBox download request...");
    try {
      const target_link = link || url;
      if (!target_link) {
        throw new Error('Parameter "link" or "url" is required.');
      }
      const payload = {
        link: target_link,
        dir_path: dir_path || "",
        page: Number(page) || 1,
        ...rest
      };
      console.log(`[PROCESS] Fetching file info for: ${target_link} (Page: ${payload.page})...`);
      const response = await this.client.post("/web/api/terabox", payload);
      console.log("[PROCESS] Deep parsing and formatting response to snake_case...");
      const parsed_data = this.dpPrs(response?.data);
      const formatted_result = this.toSnk(parsed_data);
      const is_success = formatted_result?.success !== undefined ? Boolean(formatted_result?.success) : true;
      const file_list = Array.isArray(formatted_result?.data) ? formatted_result.data : [];
      console.log(`[PROCESS] Successfully retrieved ${file_list.length} file(s).`);
      return {
        status: is_success,
        result: {
          total_files: file_list.length,
          files: file_list,
          raw_data: formatted_result
        }
      };
    } catch (error) {
      console.log(`[PROCESS_ERR] -> ${error?.message}`);
      return {
        status: false,
        result: {
          error_message: error?.response?.data?.message || error?.response?.data || error?.message || "Unknown error occurred"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new TeraDownloader();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}