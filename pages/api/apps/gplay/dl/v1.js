import axios from "axios";
import * as cheerio from "cheerio";
import {
  execSync
} from "child_process";
class Mi9Downloader {
  constructor(options = {}) {
    this.base_url = options.base_url || "https://apkdownloader.pages.dev";
    this.token_api = options.token_api || "https://token.mi9.com/";
    this.data_api = options.data_api || "https://api.mi9.com/get";
    this.store_api = "https://play.google.com/store/apps/details";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      origin: this.base_url,
      referer: `${this.base_url}/`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua-platform": '"Android"',
      "sec-ch-ua-mobile": "?1"
    };
    this.valid_devices = ["phone", "tablet", "tv", "ydev"];
    this.valid_archs = ["arm64-v8a", "armeabi-v7a", "x86", "x86_64"];
    this.valid_sdks = ["default", "36", "35", "34", "33", "32", "31", "30", "29", "28", "27", "26", "25", "24", "23", "22", "21", "20", "19", "18", "17", "16", "15"];
    this.valid_langs = ["en", "id", "af", "am", "ar", "az", "be", "bg", "bn", "bs", "ca", "cs", "da", "de", "el", "es", "et", "eu", "fa", "fi", "fil", "fr", "gl", "gu", "he", "hi", "hr", "hu", "hy", "is", "it", "ja", "ka", "kk", "km", "kn", "ko", "ky", "lo", "lt", "lv", "mk", "ml", "mn", "mr", "ms", "my", "ne", "nl", "no", "pa", "pl", "pt-BR", "pt-PT", "ro", "ru", "si", "sk", "sl", "sq", "sr", "sv", "sw", "ta", "te", "th", "tr", "uk", "ur", "uz", "vi", "zh-CN", "zh-TW", "zu"];
    this.timeout = options.timeout || 3e4;
  }
  _log(msg, level = "INFO") {
    console.log(`[${level}] [Mi9-DL] ${msg}`);
  }
  _validate(input, allowedList, defaultValue) {
    return allowedList.includes(input) ? input : defaultValue;
  }
  _extractPackageId(str) {
    if (!str) return null;
    const regex = /id=([a-zA-Z0-9_.]+)/;
    const match = str.match(regex);
    return match ? match[1] : str.trim();
  }
  _curl({
    url,
    method = "GET",
    headers = {},
    body = null
  }) {
    const headerArgs = Object.entries({
      ...this.headers,
      ...headers
    }).map(([key, value]) => `-H '${key}: ${value}'`).join(" ");
    let command = `curl -s -X ${method} "${url}" ${headerArgs}`;
    if (method === "POST" && body) {
      const dataRaw = JSON.stringify(body).replace(/'/g, "'\\''");
      command += ` --data-raw '${dataRaw}'`;
    }
    try {
      return execSync(command, {
        encoding: "utf-8",
        maxBuffer: 15 * 1024 * 1024
      });
    } catch (error) {
      throw new Error(`Curl error: ${error.message}`);
    }
  }
  async _axios(url, options = {}) {
    const config = {
      url: url,
      method: options.method || "GET",
      headers: {
        ...this.headers,
        ...options.headers
      },
      timeout: this.timeout,
      ...options.data && {
        data: options.data
      },
      ...options.params && {
        params: options.params
      }
    };
    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      throw new Error(`Axios error: ${error.message}`);
    }
  }
  _parseSSE(rawText) {
    let lastEvent = null;
    const lines = rawText.split("\n");
    for (const line of lines) {
      if (line.startsWith("data:")) {
        try {
          const data = JSON.parse(line.slice(5).trim());
          if (data.html || data.progress === 100) {
            lastEvent = data;
          }
        } catch (e) {}
      }
    }
    return lastEvent;
  }
  async getDetail(input) {
    const pkg = this._extractPackageId(input);
    if (!pkg) {
      this._log("Invalid package ID or URL", "ERROR");
      return null;
    }
    const playUrl = `${this.store_api}?id=${pkg}&hl=id&gl=ID`;
    this._log(`Fetching detail for ${pkg} from ${playUrl}`);
    try {
      const html = await this._axios(playUrl, {
        headers: {
          "accept-language": "id-ID,id;q=0.9"
        }
      });
      const $ = cheerio.load(html);
      const title = $("h1 span.AfwdI").first().text().trim() || $("h1").first().text().trim();
      const devName = $(".Vbfug a span").first().text().trim() || $(".Vbfug span").first().text().trim();
      const devLink = "https://play.google.com" + ($(".Vbfug a").attr("href") || "");
      const devImg = null;
      const rating = $(".TT9eCd").first().text().trim() + " bintang";
      let totalReviews = $(".EHUI5b").first().text().trim() || $(".g1rdde:contains('ulasan')").first().text().trim() || "0";
      let installs = "Tidak diketahui";
      $(".wVqUob").each((i, el) => {
        if ($(el).find(".g1rdde").text().trim() === "Download") {
          installs = $(el).find(".ClM7O").text().trim();
          return false;
        }
      });
      const breakdown = {};
      $(".JzwBgb").each((i, el) => {
        const star = $(el).find(".Qjdn7d").text().trim();
        const countMatch = $(el).attr("aria-label")?.match(/([\d.]+)\s+ulasan/);
        const count = countMatch ? countMatch[1] : "0";
        if (star) breakdown[`star_${star}`] = count;
      });
      let category = "";
      $(".Uc6QCc .VfPpkd-vQzf8d").each((i, el) => {
        const txt = $(el).text().trim();
        if (txt && !txt.includes("#") && !txt.includes("gratis")) category = txt;
      });
      const contentRating = $('[itemprop="contentRating"] span').first().text().trim() || "Tidak tersedia";
      let privacyPolicy = $("a[href*='privacy-policy']").attr("href");
      if (!privacyPolicy) privacyPolicy = $("a[href*='privacy']").attr("href") || "https://policies.google.com/privacy";
      const isVerified = $(".VfPpkd-vQzf8d").text().includes("diverifikasi") || false;
      const updatedOn = $(".xg1aie").first().text().trim() || "Tidak tersedia";
      const description = $(".bARER").first().text().trim() || "Tidak ada deskripsi";
      let whatsNew = "";
      $("section").each((i, sec) => {
        if ($(sec).find("h2.XfZNbf:contains('Yang baru')").length) {
          whatsNew = $(sec).find("[itemprop='description']").first().text().trim() || $(sec).find(".SfzRHd div").first().text().trim();
          return false;
        }
      });
      if (!whatsNew) whatsNew = $(".reAt0").first().text().trim() || "Tidak ada informasi perubahan.";
      const screenshots = [];
      $(".Atcj9b img").each((i, img) => {
        let src = $(img).attr("srcset")?.split(" ")[0] || $(img).attr("src");
        if (src && !src.includes("data:image")) screenshots.push(src);
      });
      const latestReviews = [];
      $(".EGFGHd").slice(0, 5).each((i, rev) => {
        const $rev = $(rev);
        const userName = $rev.find(".X5PpBb").first().text().trim() || "Anonim";
        const userPic = $rev.find(".gSGphe img").first().attr("src") || null;
        let stars = 0;
        $rev.find(".iXRFPc .F7XJmb").each((j, starEl) => {
          if ($(starEl).find(".Z1Dz7b").length) stars++;
        });
        const date = $rev.find(".bp9Aid").first().text().trim() || "Tanggal tidak diketahui";
        const comment = $rev.find(".h3YV2d").first().text().trim() || "Tidak ada komentar";
        const likes = $rev.find(".AJTPZc").text().match(/\d+/)?.[0] || "0";
        latestReviews.push({
          user_name: userName,
          user_pic: userPic,
          rating: stars,
          date: date,
          comment: comment,
          likes: likes
        });
      });
      const hasInAppPurchases = $(".UIuSk:contains('Pembelian dalam aplikasi')").length > 0;
      const supportedDevices = [];
      if ($(".AqX8Cf").length) supportedDevices.push($(".vO0kpf .AqX8Cf").text().trim());
      let version = "Tidak tersedia";
      let requiresAndroid = "Tidak tersedia";
      let exactDownloads = "Tidak tersedia";
      let inAppPriceRange = "Tidak tersedia";
      let interactiveElements = "Tidak tersedia";
      let permissions = "Tidak tersedia";
      let releaseDate = "Tidak tersedia";
      let offeredBy = devName;
      const $dialog = $(".G1zzid");
      if ($dialog.length) {
        $dialog.find(".sMUprd").each((i, item) => {
          const label = $(item).find(".q078ud").text().trim();
          const value = $(item).find(".reAt0").text().trim();
          switch (label) {
            case "Versi":
              version = value;
              break;
            case "Perlu Android versi":
              requiresAndroid = value;
              break;
            case "Download":
              exactDownloads = value;
              break;
            case "Pembelian dalam aplikasi":
              inAppPriceRange = value;
              break;
            case "Elemen interaktif":
              interactiveElements = value;
              break;
            case "Izin":
              permissions = value;
              break;
            case "Dirilis tanggal":
              releaseDate = value;
              break;
            case "Ditawarkan oleh":
              offeredBy = value;
              break;
          }
        });
      }
      if (releaseDate === "Tidak tersedia") {
        const script = $('script[type="application/ld+json"]').html();
        if (script) {
          try {
            const json = JSON.parse(script);
            if (json.datePublished) releaseDate = json.datePublished;
          } catch (e) {}
        }
      }
      return {
        id: pkg,
        link: playUrl,
        title: title,
        developer: {
          name: devName,
          img: devImg,
          link: devLink
        },
        stats: {
          rating: rating,
          total_reviews: totalReviews,
          installs: installs,
          breakdown: breakdown,
          exact_downloads: exactDownloads
        },
        metadata: {
          category: category || "Tidak tersedia",
          content_rating: contentRating,
          released_on: releaseDate,
          privacy_policy: privacyPolicy,
          in_app_purchases: hasInAppPurchases,
          in_app_price_range: inAppPriceRange,
          version: version,
          requires_android: requiresAndroid,
          interactive_elements: interactiveElements,
          permissions: permissions,
          offered_by: offeredBy
        },
        is_verified: isVerified,
        updated_on: updatedOn,
        supported_devices: supportedDevices,
        description: description,
        whats_new: whatsNew,
        screenshots: screenshots,
        latest_reviews: latestReviews
      };
    } catch (err) {
      this._log(`Error in getDetail: ${err.message}`, "ERROR");
      return null;
    }
  }
  async download({
    query,
    device = "phone",
    arch = "arm64-v8a",
    sdk = "default",
    lang = "en"
  }) {
    const pkg = this._extractPackageId(query);
    if (!pkg) {
      return {
        error: true,
        message: "URL atau Package ID tidak valid"
      };
    }
    const playInfo = await this.getDetail(pkg);
    const conf = {
      package: pkg,
      device: this._validate(device, this.valid_devices, "phone"),
      arch: this._validate(arch, this.valid_archs, "arm64-v8a"),
      sdk: this._validate(sdk, this.valid_sdks, "default"),
      lang: this._validate(lang, this.valid_langs, "en"),
      vc: "",
      device_id: ""
    };
    try {
      this._log(`Meminta token untuk ${pkg}...`);
      const tokenRaw = this._curl({
        url: this.token_api,
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: {
          package: conf.package,
          device: conf.device,
          arch: conf.arch,
          vc: conf.vc,
          device_id: conf.device_id,
          sdk: conf.sdk
        }
      });
      const tokenData = JSON.parse(tokenRaw);
      if (!tokenData?.success) throw new Error("Gagal mendapatkan token dari Mi9");
      const dataPayload = Buffer.from(JSON.stringify({
        hl: conf.lang,
        package: conf.package,
        device: conf.device,
        arch: conf.arch,
        vc: conf.vc,
        device_id: conf.device_id,
        sdk: conf.sdk,
        timestamp: tokenData.timestamp
      })).toString("base64");
      this._log("Mengambil link download via SSE...");
      const sseUrl = `${this.data_api}?token=${tokenData.token}&data=${encodeURIComponent(dataPayload)}`;
      const sseRaw = this._curl({
        url: sseUrl,
        headers: {
          accept: "text/event-stream"
        }
      });
      const sseParsed = this._parseSSE(sseRaw);
      if (!sseParsed || !sseParsed.html) throw new Error("Tidak ada data download dalam response SSE");
      const apkInfo = this._parseApkInfo(sseParsed.html, conf);
      return {
        source: "Mi9",
        status: "success",
        download: apkInfo,
        detail: playInfo
      };
    } catch (err) {
      this._log(`Download error: ${err.message}`, "ERROR");
      return {
        error: true,
        message: err.message
      };
    }
  }
  _parseApkInfo(html, conf) {
    const $ = cheerio.load(html);
    const result = {
      id: conf.package,
      name: $("ul.apk_ad_info li._title a").first().text().trim() || "Tidak diketahui",
      version: $("ul.apk_ad_info span._version").text().trim() || "Tidak diketahui",
      icon: $(".apk_ad img").attr("src") || null,
      developer: "Tidak diketahui",
      update: "Tidak diketahui",
      android: "Tidak diketahui",
      files: []
    };
    $("ul.apk_ad_info li").each((i, el) => {
      const text = $(el).text();
      if (text.includes("Developer:")) result.developer = text.replace("Developer:", "").trim();
      if (text.includes("Update:")) result.update = text.replace("Update:", "").trim();
      if (text.includes("Android")) result.android = $(el).find("strong").text().trim();
    });
    $(".apk_files_item").each((i, el) => {
      const fileName = $(el).find("span.der_name").text().trim();
      const fileSize = $(el).find("span.der_size").text().trim();
      const downloadUrl = $(el).find("a").attr("href");
      if (downloadUrl) {
        result.files.push({
          name: fileName,
          size: fileSize,
          url: downloadUrl
        });
      }
    });
    return result;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan",
      example: "com.whatsapp"
    });
  }
  const api = new Mi9Downloader();
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