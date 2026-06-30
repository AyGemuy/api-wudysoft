import * as cheerio from "cheerio";
import crypto from "crypto";
import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class APKPure {
  constructor() {
    this.name = "apkpure";
    this.web_base = "https://apkpure.com";
    this.api_base = "https://tapi.pureapk.com/v3";
    this.auth_key = "qNKrYmW8SSUqJ73k3P2yfMxRTo3sJTR";
    this.sign_secret = "d33cb23fd17fda8ea38be504929b77ef";
    this.timeout = 3e4;
    this.proxy_prefix = proxy;
    this.html_proxy_base = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v6?url=`;
    this.axiosInstance = axios.create({
      timeout: this.timeout,
      validateStatus: () => true
    });
  }
  _md5({
    str
  }) {
    try {
      return crypto.createHash("md5").update(str).digest("hex");
    } catch (err) {
      console.error(`[apkpure] Error _md5: ${err.message}`);
      return "";
    }
  }
  _hdrs() {
    try {
      const devUuid = crypto.randomUUID();
      const projectA = JSON.stringify({
        device_info: {
          abis: ["arm64-v8a", "armeabi-v7a"],
          android_id: this._md5({
            str: devUuid
          }).slice(0, 16),
          brand: "samsung",
          country: "United States",
          country_code: "US",
          imei: "",
          language: "en-US",
          manufacturer: "samsung",
          mode: "SM-G955F",
          os_ver: "34",
          os_ver_name: "14",
          platform: 1,
          product: "dream2lte",
          screen_height: 2888,
          screen_width: 1440
        },
        host_app_info: {
          build_no: "873",
          channel: "",
          md5: "",
          pkg_name: "com.apkpure.aegon",
          sdk_ver: "3.20.6309",
          version_code: 3206397,
          version_name: "3.20.6309"
        },
        net_info: {
          carrier_code: 0,
          ipv4: "",
          ipv6: "",
          mac_address: "",
          net_type: 1,
          use_vpn: false,
          wifi_bssid: "",
          wifi_ssid: ""
        },
        user_info: {
          auth_key: this.auth_key,
          country: "United States",
          country_code: "US",
          guid: "",
          language: "en-US",
          qimei: "",
          qimei_token: "",
          user_id: "",
          uuid: devUuid
        }
      }).replace(/[\s\n](?=(?:[^"]*"[^"]*")*[^"]*$)/g, "");
      const extInfo = JSON.stringify({
        ext_info: '{"gaid":"","oaid":""}',
        lbs_info: {
          accuracy: 0,
          city: "",
          city_code: 0,
          country: "",
          country_code: "",
          district: "",
          latitude: 0,
          longitude: 0,
          province: "",
          street: ""
        }
      }).replace(/[\s\n](?=(?:[^"]*"[^"]*")*[^"]*$)/g, "");
      return {
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 14; SM-G955F Build/AP2A.240805.005); APKPure/3.20.6309 (Aegon)",
        "Ual-Access-Businessid": "projecta",
        "Ual-Access-ProjectA": projectA,
        "Ual-Access-ExtInfo": extInfo,
        "Ual-Access-Sequence": crypto.randomUUID(),
        "Ual-Access-Signature": "",
        "Ual-Access-Nonce": "0",
        "Ual-Access-Timestamp": "0"
      };
    } catch (err) {
      console.error(`[apkpure] Error _hdrs: ${err.message}`);
      return {};
    }
  }
  _sign({
    headers,
    body
  }) {
    try {
      const ts = String(Date.now());
      const nonce = String(Math.floor(Math.random() * 9e7) + 1e7);
      const sig = this._md5({
        str: body + ts + this.sign_secret + nonce
      });
      headers["Ual-Access-Signature"] = sig;
      headers["Ual-Access-Nonce"] = nonce;
      headers["Ual-Access-Timestamp"] = ts;
      headers["Content-Type"] = "application/json; charset=utf-8";
    } catch (err) {
      console.error(`[apkpure] Error _sign: ${err.message}`);
    }
  }
  _webHeaders() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"
    };
  }
  async _request({
    url,
    method = "GET",
    headers = {},
    params = null,
    data = null,
    useFallbackProxy = false
  }) {
    try {
      console.log(`[REQ] ${method} -> ${url}`);
      const prefix = useFallbackProxy ? this.html_proxy_base : this.proxy_prefix;
      const targetUrl = `${prefix}${encodeURIComponent(url)}`;
      const config = {
        url: targetUrl,
        method: method,
        headers: headers
      };
      if (params) config.params = params;
      if (data) config.data = typeof data === "string" ? data : JSON.stringify(data);
      const res = await this.axiosInstance(config);
      let body = res.data;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch (_) {}
      }
      return body;
    } catch (err) {
      console.error(`[REQ-ERR] Gagal mengambil data dari ${url}: ${err.message}`);
      return null;
    }
  }
  _toSnakeCase(obj) {
    if (Array.isArray(obj)) {
      return obj.map(v => this._toSnakeCase(v));
    } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
      return Object.keys(obj).reduce((result, key) => {
        const snakeKey = key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
        result[snakeKey] = this._toSnakeCase(obj[key]);
        return result;
      }, {});
    }
    return obj;
  }
  extractMeta($) {
    const meta = {};
    $("meta").each((_, el) => {
      const name = $(el).attr("name") || $(el).attr("property");
      if (name) {
        meta[name] = $(el).attr("content");
      }
    });
    return meta;
  }
  async slug({
    pkg
  }) {
    try {
      console.log(`[PROCESS] Mendapatkan slug web untuk package: ${pkg}`);
      const data = await this._request({
        url: `${this.web_base}/r/${pkg}/versions`,
        method: "GET",
        headers: this._webHeaders(),
        useFallbackProxy: true
      });
      if (!data) return {
        status: false,
        result: null
      };
      const $ = cheerio.load(data);
      const canonical = $('link[rel="canonical"]').attr("href") || "";
      const match = canonical.match(/apkpure\.com\/([^/]+)/);
      const resSlug = match?.[1] ?? null;
      console.log(`[SUCCESS] Slug ditemukan: ${resSlug}`);
      return {
        status: !!resSlug,
        result: resSlug
      };
    } catch (err) {
      console.error(`[apkpure] Error slug: ${err.message}`);
      return {
        status: false,
        result: null
      };
    }
  }
  async search({
    query
  }) {
    try {
      console.log(`[PROCESS] Mencari aplikasi dengan query: "${query}" melalui API`);
      const headers = this._hdrs();
      this._sign({
        headers: headers,
        body: ""
      });
      const data = await this._request({
        url: `${this.api_base}/search_query_new`,
        method: "GET",
        headers: headers,
        params: {
          hl: "en-US",
          key: query,
          page: "1",
          search_type: "active_search"
        }
      });
      const results = [];
      const seen = new Set();
      for (const section of data?.data?.data ?? []) {
        for (const item of section?.data ?? []) {
          const ai = item?.app_info ?? {};
          const pkg = ai?.package_name ?? "";
          if (!pkg || seen.has(pkg)) continue;
          seen.add(pkg);
          results.push({
            source_name: this.name,
            ...this._toSnakeCase(ai)
          });
        }
      }
      if (results.length === 0) {
        console.log(`[FALLBACK] API search kosong. Mengalihkan ke HTML Web Fallback (Proxy Wudysoft)...`);
        const url = `${this.web_base}/id/search?q=${encodeURIComponent(query)}`;
        const htmlData = await this._request({
          url: url,
          method: "GET",
          headers: this._webHeaders(),
          useFallbackProxy: true
        });
        if (htmlData) {
          const $ = cheerio.load(htmlData);
          const htmlResults = $("#search-app-list .search-res li").map((_, el) => {
            const link = $(el).find("a.dd").attr("href") || "";
            const pkgMatch = link.match(/\/([^/]+)$/);
            const rawItem = {
              title: $(el).find(".p1").text().trim(),
              developer: $(el).find(".p2").text().trim(),
              rating: $(el).find(".star").text().trim(),
              link: link,
              thumb_url: $(el).find("img").attr("src"),
              package_name: pkgMatch ? pkgMatch[1] : ""
            };
            return {
              source_name: this.name,
              ...this._toSnakeCase(rawItem)
            };
          }).get();
          console.log(`[SUCCESS] Fallback fungsional via proxy wudysoft, ditemukan ${htmlResults.length} data.`);
          return {
            status: htmlResults.length > 0,
            result: htmlResults
          };
        }
      }
      console.log(`[SUCCESS] Search selesai, total data: ${results.length}`);
      return {
        status: results.length > 0,
        result: results
      };
    } catch (err) {
      console.error(`[apkpure] Error search: ${err.message}`);
      return {
        status: false,
        result: []
      };
    }
  }
  async info({
    pkg
  }) {
    try {
      console.log(`[PROCESS] Mengambil informasi ringkas aplikasi: ${pkg}`);
      const detailRes = await this.detail({
        pkg: pkg
      });
      if (!detailRes || !detailRes.status) return {
        status: false,
        result: null
      };
      return {
        status: true,
        result: {
          source_name: this.name,
          ...detailRes.result
        }
      };
    } catch (err) {
      console.error(`[apkpure] Error info: ${err.message}`);
      return {
        status: false,
        result: null
      };
    }
  }
  async dev_app({
    developer
  }) {
    try {
      console.log(`[PROCESS] Crawling daftar aplikasi pengembang: ${developer}`);
      const apps = [];
      const seen = new Set();
      let page = 1;
      while (true) {
        let url = `${this.web_base}/en/developer/${encodeURIComponent(developer)}`;
        if (page > 1) url += `?page=${page}`;
        const data = await this._request({
          url: url,
          method: "GET",
          headers: this._webHeaders(),
          useFallbackProxy: true
        });
        if (!data) break;
        const $ = cheerio.load(data);
        const pageApps = $("a[href]").map((_, el) => {
          const href = ($(el).attr("href") ?? "").replace(/^\/+|\/+$/g, "");
          const parts = href.split("/");
          if (parts.length >= 2 && parts.at(-1).includes(".")) {
            const pkg = parts.at(-1);
            if (seen.has(pkg)) return null;
            seen.add(pkg);
            const nameEl = $(el).find(".p1, .app-title, span").first();
            const name = (nameEl.length ? nameEl.text() : $(el).text()).trim();
            if (name && pkg) {
              const rawItem = {
                package_name: pkg,
                title: name,
                version_name: ""
              };
              return {
                source_name: this.name,
                ...this._toSnakeCase(rawItem)
              };
            }
          }
          return null;
        }).get().filter(Boolean);
        if (pageApps.length === 0) break;
        apps.push(...pageApps);
        const nextLink = $("a.nextpostslink[href], a[rel='next'][href]");
        if (!nextLink.length) break;
        page++;
      }
      console.log(`[SUCCESS] Selesai mengambil aplikasi developer. Total: ${apps.length}`);
      return {
        status: apps.length > 0,
        result: apps
      };
    } catch (err) {
      console.error(`[apkpure] Error devApps: ${err.message}`);
      return {
        status: false,
        result: []
      };
    }
  }
  async versions({
    pkg
  }) {
    try {
      console.log(`[PROCESS] Mencari list versi untuk: ${pkg}`);
      const slugRes = await this.slug({
        pkg: pkg
      });
      if (!slugRes || !slugRes.status) return {
        status: false,
        result: null
      };
      const data = await this._request({
        url: `${this.web_base}/${slugRes.result}/${pkg}/versions`,
        method: "GET",
        headers: this._webHeaders(),
        useFallbackProxy: true
      });
      if (!data) return {
        status: false,
        result: null
      };
      const $ = cheerio.load(data);
      const meta = this.extractMeta($);
      const seen = new Set();
      const variants = [];
      $(".ver-wrap li").each((_, el) => {
        const $el = $(el);
        const versionLinkEl = $el.find(".ver-item-n");
        if (!versionLinkEl.length) return;
        const rawVersionText = versionLinkEl.text().trim();
        const match = rawVersionText.match(/([\d]+\.[\d]+[\d.]*)/);
        const version = match ? match[1] : rawVersionText;
        if (seen.has(version)) return;
        seen.add(version);
        const size = $el.find(".ver-item-s").text().trim();
        const type = $el.find(".apk-type-tag").text().trim() || "APK";
        const date = $el.find(".update-on").text().trim();
        const link = $el.find(".ver_download_btn").attr("href") || versionLinkEl.attr("href") || "";
        variants.push({
          version: version,
          file_type: type.toLowerCase(),
          size: size,
          release_date: date,
          download_page_link: link
        });
      });
      const payload = {
        title: $(".box-block-title.ver-title .tit").text().trim() || "Old Versions Status",
        variants: variants,
        ...meta
      };
      console.log(`[SUCCESS] Ditemukan ${variants.length} data varian versi.`);
      return {
        status: variants.length > 0,
        result: payload
      };
    } catch (err) {
      console.error(`[apkpure] Error versions: ${err.message}`);
      return {
        status: false,
        result: null
      };
    }
  }
  async detail({
    pkg
  }) {
    try {
      console.log(`[PROCESS] Memanggil detail API untuk: ${pkg}`);
      const body = JSON.stringify({
        package_name: pkg,
        hl: "en-US"
      }).replace(/[\s\n](?=(?:[^"]*"[^"]*")*[^"]*$)/g, "");
      const headers = this._hdrs();
      this._sign({
        headers: headers,
        body: body
      });
      const data = await this._request({
        url: `${this.api_base}/get_app_detail`,
        method: "POST",
        headers: headers,
        data: body
      });
      const resDetail = data?.app_detail ?? null;
      return {
        status: !!resDetail,
        result: resDetail ? {
          ...this._toSnakeCase(resDetail)
        } : null
      };
    } catch (err) {
      console.error(`[apkpure] Error detail: ${err.message}`);
      return {
        status: false,
        result: null
      };
    }
  }
  async download({
    pkg,
    version = null
  }) {
    try {
      console.log(`[PROCESS] Menyiapkan tautan unduhan untuk ${pkg} ${version ? `versi ${version}` : "(Terbaru)"}`);
      if (version) return await this.download_web({
        pkg: pkg,
        version: version
      });
      const detailRes = await this.detail({
        pkg: pkg
      });
      if (!detailRes || !detailRes.status) throw new Error(`[apkpure] Package tidak ditemukan di API: ${pkg}`);
      const asset = detailRes.result?.asset ?? {};
      const dlUrl = asset?.url ?? "";
      if (!dlUrl) throw new Error(`[apkpure] Download URL tidak tersedia di API untuk: ${pkg}`);
      const ver = detailRes.result?.version_name || "latest";
      const fileType = (asset?.type ?? "APK").toLowerCase();
      const dlData = {
        file_path: `${pkg}-${ver}.${fileType}`,
        package_name: pkg,
        version_name: ver,
        file_type: fileType,
        download_url: dlUrl
      };
      return {
        status: true,
        result: {
          source_name: this.name,
          ...this._toSnakeCase(dlData)
        }
      };
    } catch (err) {
      console.error(`[apkpure] Error download: ${err.message}`);
      return {
        status: false,
        result: null
      };
    }
  }
  async download_web({
    pkg,
    version
  }) {
    try {
      console.log(`[PROCESS] Mengunduh alternatif via web scrap untuk versi spesifik: ${version}`);
      const slugRes = await this.slug({
        pkg: pkg
      });
      if (!slugRes || !slugRes.status) throw new Error(`[apkpure] Package tidak ditemukan di Web: ${pkg}`);
      const data = await this._request({
        url: `${this.web_base}/${slugRes.result}/${pkg}/download/${version}`,
        method: "GET",
        headers: this._webHeaders(),
        useFallbackProxy: true
      });
      if (!data) throw new Error(`[apkpure] Halaman versi tidak ditemukan: ${pkg} v${version}`);
      const $ = cheerio.load(data);
      let dlLink = $("a#download_link[href]").first();
      if (!dlLink.length) {
        dlLink = $("a.download-start-btn[href]").first();
      }
      if (!dlLink.length) throw new Error(`[apkpure] Elemen tombol download tidak terdeteksi: ${pkg} v${version}`);
      const dlUrl = dlLink.attr("href");
      const btnTextFirstLine = dlLink.find(".download-btn-text-first-line").text().trim().toLowerCase();
      const fullBtnText = dlLink.text().trim().toLowerCase();
      let fileType = "apk";
      if (btnTextFirstLine.includes("xapk") || fullBtnText.includes("xapk") || dlUrl.toLowerCase().includes("xapk")) {
        fileType = "xapk";
      }
      const dlWebData = {
        file_path: `${pkg}-${version}.${fileType}`,
        package_name: pkg,
        version_name: version,
        file_type: fileType,
        download_url: dlUrl
      };
      return {
        status: true,
        result: {
          source_name: this.name,
          ...this._toSnakeCase(dlWebData)
        }
      };
    } catch (err) {
      console.error(`[apkpure] Error download_web: ${err.message}`);
      return {
        status: false,
        result: null
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["slug", "search", "info", "versions", "dev_app", "detail", "download", "download_web"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          search: "/?action=search&query=whatsapp",
          info: "/?action=info&pkg=com.whatsapp",
          download: "/?action=download&pkg=com.whatsapp"
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
  const api = new APKPure();
  try {
    let response;
    switch (action) {
      case "slug":
        if (!params.pkg) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'pkg' wajib diisi untuk action 'slug'."
          });
        }
        response = await api.slug(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/?action=search&query=whatsapp"
          });
        }
        response = await api.search(params);
        break;
      case "info":
        if (!params.pkg) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'pkg' wajib diisi untuk action 'info'."
          });
        }
        response = await api.info(params);
        break;
      case "versions":
        if (!params.pkg) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'pkg' wajib diisi untuk action 'versions'."
          });
        }
        response = await api.versions(params);
        break;
      case "dev_app":
        if (!params.developer) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'developer' wajib diisi untuk action 'dev_app'."
          });
        }
        response = await api.dev_app(params);
        break;
      case "detail":
        if (!params.pkg) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'pkg' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "download":
        if (!params.pkg) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'pkg' wajib diisi untuk action 'download'."
          });
        }
        response = await api.download(params);
        break;
      case "download_web":
        if (!params.pkg || !params.version) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'pkg' dan 'version' wajib diisi untuk action 'download_web'."
          });
        }
        response = await api.download_web(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari server APKPure. Coba lagi nanti."
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}