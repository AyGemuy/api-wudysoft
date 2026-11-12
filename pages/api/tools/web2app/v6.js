import axios from "axios";
import FormData from "form-data";
class WebToApp {
  constructor() {
    this.base = "https://webtooapk.com";
    this.http = axios.create({
      baseURL: this.base,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: this.base,
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${this.base}/`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async rsc(src) {
    if (!src) return null;
    try {
      if (Buffer.isBuffer(src)) return src;
      if (typeof src === "string") {
        if (src.startsWith("http")) {
          console.log(`[Process] Mendownload aset dari URL: ${src}`);
          const res = await axios.get(src, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (src.startsWith("data:")) {
          const parts = src.split(",");
          return Buffer.from(parts[1] || parts[0], "base64");
        }
        return Buffer.from(src, "base64");
      }
    } catch (e) {
      console.log(`[Warn] Resolusi aset gagal: ${e.message}`);
    }
    return null;
  }
  bld(fields, files) {
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => {
      form.append(k, String(v ?? ""));
    });
    Object.entries(files).forEach(([k, file]) => {
      if (file?.buffer) {
        form.append(k, file.buffer, {
          filename: file.filename || "file.png",
          contentType: file.contentType || "image/png"
        });
      } else {
        form.append(k, Buffer.alloc(0), {
          filename: "",
          contentType: file?.contentType || "application/octet-stream"
        });
      }
    });
    return form;
  }
  async create({
    url,
    name,
    icon,
    pkg_name,
    ...rest
  }) {
    console.log("[Process] Memulai inisialisasi parameter build...");
    if (!url) {
      throw new Error('Parameter "url" wajib disertakan.');
    }
    try {
      const appIconBuf = await this.rsc(icon || rest?.app_icon || null);
      const splashIconBuf = await this.rsc(rest?.splash_icon || rest?.splash || null);
      const googleServicesBuf = await this.rsc(rest?.google_services_json || null);
      const firebaseServiceBuf = await this.rsc(rest?.firebase_service_account || null);
      const defaults = {
        website_url: url,
        app_name: name || rest?.app_name || "My App",
        package_name: pkg_name || rest?.package_name || `com.${(name || rest?.app_name || "myapp").toLowerCase().replace(/[^a-z0-9]/g, "")}.app`,
        version: "1.0.0",
        version_code: "1",
        orientation: "both",
        fullscreen: "no",
        min_sdk: "21",
        status_bar_color: "#4f46e5",
        privacy_policy_url: "",
        app_category: "tools",
        app_description: "",
        splash_color: "#6366f1",
        splash_duration: "2",
        loading_bar_color: "#6366f1",
        custom_user_agent: "",
        text_size: "NORMAL",
        rate_app_launches: "5",
        offline_page_html: "",
        js_injection: "",
        css_injection: "",
        loading_style: "linear",
        url_scheme: "",
        app_links_domain: "",
        fab_action: "whatsapp",
        fab_value: "",
        fab_color: "#25d366",
        fab_icon: "chat",
        "toolbar_label[]": "",
        "toolbar_url[]": "",
        enable_splash: "on",
        back_button: "on",
        file_downloads: "on",
        pull_to_refresh: "on",
        zoom_controls: "on",
        external_links_browser: "on",
        hardware_acceleration: "on",
        third_party_cookies: "on",
        file_upload_camera: "on",
        "drawer_icon[]": "home",
        "drawer_label[]": "",
        "drawer_url[]": "",
        "bnav_icon[]": "home",
        "bnav_label[]": "",
        "bnav_url[]": "",
        update_check_url: "",
        admob_app_id: "",
        admob_banner_id: "",
        admob_interstitial_id: "",
        admob_interstitial_interval: "3",
        push_notifications: "on"
      };
      const fields = {
        ...defaults,
        ...rest
      };
      const fileKeys = ["icon", "app_icon", "splash", "splash_icon", "google_services_json", "firebase_service_account"];
      fileKeys.forEach(key => delete fields[key]);
      const files = {
        app_icon: appIconBuf ? {
          buffer: appIconBuf,
          filename: "app_icon.png",
          contentType: "image/png"
        } : null,
        splash_icon: splashIconBuf ? {
          buffer: splashIconBuf,
          filename: "splash_icon.png",
          contentType: "image/png"
        } : null,
        google_services_json: googleServicesBuf ? {
          buffer: googleServicesBuf,
          filename: "google-services.json",
          contentType: "application/json"
        } : {
          contentType: "application/octet-stream"
        },
        firebase_service_account: firebaseServiceBuf ? {
          buffer: firebaseServiceBuf,
          filename: "firebase_service_account.json",
          contentType: "application/json"
        } : {
          contentType: "application/octet-stream"
        }
      };
      console.log("[Process] Mengemas payload form-data...");
      const form = this.bld(fields, files);
      console.log("[Process] Mengirimkan permintaan pembuatan APK...");
      const res = await this.http.post("/generate.php", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      return res?.data || {};
    } catch (e) {
      console.log(`[Error] Proses registrasi build gagal: ${e.message}`);
      throw e;
    }
  }
  async status({
    id,
    ...rest
  }) {
    if (!id) {
      throw new Error('Parameter "id" (build_id) wajib disertakan.');
    }
    try {
      console.log(`[Process] Memeriksa status build ID: ${id}`);
      const res = await this.http.get("/api.php", {
        params: {
          action: rest?.action || "github_status",
          build_id: id
        }
      });
      return res?.data || {};
    } catch (e) {
      console.log(`[Error] Pemeriksaan status build gagal: ${e.message}`);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["create", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          create: "/api/webtoapk?action=create&url=https://s.id&name=SidApp",
          status: "/api/webtoapk?action=status&id=6a648f8ae3985_1784975242"
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
  const api = new WebToApp();
  try {
    let response;
    switch (action) {
      case "create":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk melakukan inisiasi build APK."
          });
        }
        response = await api.create(params);
        break;
      case "status":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' (build_id) wajib diisi untuk memeriksa status build."
          });
        }
        response = await api.status(params);
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
    if (response.success === false) {
      return res.status(422).json({
        action: action,
        status: false,
        ...response
      });
    }
    return res.status(200).json({
      action: action,
      status: true,
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