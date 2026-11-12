import axios from "axios";
import * as cheerio from "cheerio";
class FreeFireJornal {
  constructor() {
    this.baseUrl = "https://freefirejornal.com";
    this.cookies = new Map();
    this.cachedNonce = null;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9,id;q=0.8",
        "cache-control": "no-cache",
        origin: this.baseUrl,
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${this.baseUrl}/en/free-fire-rank/`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.client.interceptors.request.use(config => {
      try {
        const cookieStr = Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
        config.headers = config?.headers || {};
        if (cookieStr) config.headers["cookie"] = cookieStr;
      } catch (err) {
        console.log("[Warn Req Interceptor]:", err?.message || err);
      }
      return config;
    });
    this.client.interceptors.response.use(res => {
      try {
        const rawCookies = res?.headers?.["set-cookie"] || [];
        rawCookies.forEach(c => {
          const [pair] = (c || "").split(";");
          const [key, ...val] = (pair || "").split("=");
          if (key?.trim() && val?.length) {
            this.cookies.set(key.trim(), val.join("=").trim());
          }
        });
      } catch (err) {
        console.log("[Warn Res Interceptor]:", err?.message || err);
      }
      return res;
    });
  }
  _toSnake(str) {
    try {
      return (str || "").replace(/[?¿!¡]/g, "").replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[-\s/()|:.]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
    } catch (err) {
      console.log("[Error _toSnake]:", err?.message || err);
      return str;
    }
  }
  _clean(str) {
    try {
      return (str || "").replace(/^[?¿!¡\s]+|[?¿!¡\s]+$/g, "").replace(/\s+/g, " ").trim();
    } catch {
      return str;
    }
  }
  _parse(val) {
    try {
      if (typeof val === "string") {
        const trimmed = val ? val.trim() : "";
        if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
          return this._fmt(JSON.parse(trimmed));
        }
        if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
          return `${this.baseUrl}${trimmed}`;
        }
      }
      return val;
    } catch {
      return val;
    }
  }
  _fmt(data) {
    try {
      if (Array.isArray(data)) {
        return data.map(item => this._fmt(item));
      }
      if (data !== null && typeof data === "object") {
        const result = {};
        for (const [key, val] of Object.entries(data)) {
          const snakeKey = this._toSnake(key);
          result[snakeKey] = this._fmt(this._parse(val));
        }
        return result;
      }
      return this._parse(data);
    } catch (err) {
      console.log("[Error _fmt]:", err?.message || err);
      return data;
    }
  }
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  _parseHtml(html) {
    try {
      const $ = cheerio.load(html || "");
      const facts = {};
      $(".jgff-profile-facts > div").map((_, el) => ({
        label: this._toSnake($(el).find("span").text().trim()),
        val: $(el).find("strong").text().trim()
      })).get().forEach(({
        label,
        val
      }) => {
        if (label) facts[label] = val;
      });
      const overview = {};
      $(".jgff-overview-grid .jgff-overview-stat").map((_, el) => ({
        label: this._toSnake($(el).find("span:not(.jgff-overview-icon)").text().trim()),
        val: $(el).find("strong").text().trim()
      })).get().forEach(({
        label,
        val
      }) => {
        if (label) overview[label] = val;
      });
      const ranks = {};
      $(".jgff-ranks-grid .jgff-rank-card").map((_, el) => {
        const modeClass = $(el).attr("class") || "";
        const modeKey = modeClass.includes("jgff-rank-br") ? "br_ranked" : modeClass.includes("jgff-rank-cs") ? "clash_squad" : "general";
        const details = {};
        $(el).find("dl > div").map((_, item) => ({
          k: this._toSnake($(item).find("dt").text().trim()),
          v: $(item).find("dd").text().trim()
        })).get().forEach(({
          k,
          v
        }) => {
          if (k) details[k] = v;
        });
        return {
          modeKey: modeKey,
          data: {
            medal_image: this._parse($(el).find(".jgff-rank-medal").attr("src")),
            current_rank: $(el).find(".jgff-rank-heading strong").text().trim() || null,
            ...details
          }
        };
      }).get().forEach(({
        modeKey,
        data
      }) => {
        if (modeKey) ranks[modeKey] = data;
      });
      const items = $(".jgff-items-grid .jgff-item-card").map((_, el) => ({
        category: $(el).find(".jgff-item-category").text().trim() || null,
        name: $(el).find("h3").text().trim() || null,
        image: this._parse($(el).find("img").attr("src")),
        url: this._parse($(el).find("a").attr("href")),
        meta: $(el).find(".jgff-item-meta span").map((__, m) => $(m).text().trim()).get()
      })).get().filter(it => it.name || it.image);
      const radarRaw = $("canvas.jgff-radar").attr("data-radar");
      const radarData = radarRaw ? this._parse(radarRaw) : null;
      const statistics = {};
      $(".jgff-mode-grid .jgff-mode-card").map((_, el) => {
        const mode = this._toSnake($(el).find("header > span").text().trim());
        const totalMatches = $(el).find("header > strong").text().trim();
        const highlights = {};
        $(el).find(".jgff-mode-highlights > div").map((_, h) => ({
          k: this._toSnake($(h).find("span").text().trim()),
          v: $(h).find("strong").text().trim(),
          sub: $(h).find("small").text().trim() || null
        })).get().forEach(({
          k,
          v,
          sub
        }) => {
          if (k) highlights[k] = {
            value: v,
            sub: sub
          };
        });
        const statList = {};
        $(el).find("dl.jgff-stat-list > div").map((_, s) => ({
          k: this._toSnake($(s).find("dt").text().trim()),
          v: $(s).find("dd").text().trim()
        })).get().forEach(({
          k,
          v
        }) => {
          if (k) statList[k] = v;
        });
        return {
          mode: mode,
          data: {
            total_matches: totalMatches,
            highlights: highlights,
            stats: statList
          }
        };
      }).get().forEach(({
        mode,
        data
      }) => {
        if (mode) statistics[mode] = data;
      });
      const accountDetails = {};
      $(".jgff-account-details-grid .jgff-detail").map((_, el) => ({
        k: this._toSnake($(el).find("span").text().trim()),
        v: $(el).find("strong").text().trim()
      })).get().forEach(({
        k,
        v
      }) => {
        if (k) accountDetails[k] = v;
      });
      const socialDetails = {};
      $('.jgff-section[aria-labelledby="jgff-clan-title"] .jgff-detail').map((_, el) => ({
        k: this._toSnake($(el).find("span").text().trim()),
        v: $(el).find("strong").text().trim()
      })).get().forEach(({
        k,
        v
      }) => {
        if (k) socialDetails[k] = v;
      });
      const primeDetails = {};
      $(".jgff-prime-section .jgff-summary-card").map((_, el) => ({
        k: this._toSnake($(el).find("span").text().trim()),
        v: $(el).find("strong").text().trim()
      })).get().forEach(({
        k,
        v
      }) => {
        if (k) primeDetails[k] = v;
      });
      const extraIndicators = {};
      $('.jgff-section[aria-labelledby="jgff-extra-title"] .jgff-detail').map((_, el) => ({
        k: this._toSnake($(el).find("span").text().trim()),
        v: $(el).find("strong").text().trim()
      })).get().forEach(({
        k,
        v
      }) => {
        if (k) extraIndicators[k] = v;
      });
      const flags = $(".jgff-flags > span").map((_, el) => ({
        status: $(el).text().trim(),
        is_positive: $(el).hasClass("is-positive")
      })).get();
      const relatedProfiles = $(".jgff-related-grid .jgff-related-card").map((_, el) => ({
        name: $(el).find(".jgff-related-title-link").text().trim(),
        avatar: this._parse($(el).find("img.jgff-related-avatar").attr("src")),
        region: $(el).find(".jgff-related-region").text().trim(),
        url: this._parse($(el).find(".jgff-related-title-link").attr("href")),
        reasons: $(el).find(".jgff-related-reasons span").map((__, r) => $(r).text().trim()).get(),
        stats: $(el).find(".jgff-related-stats span").map((__, s) => $(s).text().trim()).get()
      })).get();
      return {
        nickname: $(".jgff-profile-identity h2").text().trim() || null,
        level: $(".jgff-level-badge").text().replace(/Level\s*/i, "").trim() || null,
        avatar: this._parse($(".jgff-avatar").attr("src")),
        cover: this._parse($(".jgff-profile-cover img").attr("src")),
        lead: $("p.jgff-lead").text().trim() || null,
        facts: facts,
        overview: overview,
        ranks: ranks,
        equipped_items: items,
        radar_chart: radarData,
        match_statistics: statistics,
        account_details: accountDetails,
        social_details: socialDetails,
        prime_details: primeDetails,
        extra_indicators: extraIndicators,
        account_flags: flags,
        related_profiles: relatedProfiles
      };
    } catch (err) {
      console.log("[Error _parseHtml]:", err?.message || err);
      return {};
    }
  }
  async _init() {
    try {
      console.log("[Process] Menginisialisasi session & mengambil nonce Free Fire Jornal...");
      const res = await this.client.get("/en/free-fire-rank/");
      if (typeof res?.data === "string") {
        const nonceMatch = res.data.match(/"nonce"\s*:\s*"([a-f0-9]+)"/i) || res.data.match(/nonce=([a-f0-9]+)/i) || res.data.match(/data-nonce="([a-f0-9]+)"/i);
        if (nonceMatch?.[1]) {
          this.cachedNonce = nonceMatch[1];
        }
      }
      console.log(`[Success] Session disinkronkan, nonce: ${this.cachedNonce || "default"}`);
    } catch (err) {
      console.log("[Warn _init]:", err?.response?.status || err?.message || err);
    }
  }
  async search({
    uid,
    mode = "br",
    language = "en",
    ...rest
  }) {
    try {
      const targetUid = uid ? String(uid).trim() : "";
      if (!targetUid) throw new Error("UID wajib diisi");
      if (this.cookies.size === 0 || !this.cachedNonce) {
        await this._init();
      }
      const nonce = this.cachedNonce || "d7a9afbd86";
      console.log(`[Process] Memulai pencarian (pff_start) untuk UID: ${targetUid}`);
      const startPayload = new URLSearchParams({
        action: "pff_start",
        nonce: nonce,
        player_id: targetUid,
        language: language || "en",
        mode: mode || "br",
        ...rest
      });
      const startRes = await this.client.post("/wp-admin/admin-ajax.php", startPayload.toString(), {
        headers: {
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
      });
      const startData = startRes?.data?.data || {};
      const token = startData?.token || "";
      const delaySec = Number(startData?.delay) || 5;
      if (!token) {
        throw new Error(startRes?.data?.data || "Gagal memperoleh token start verifikasi");
      }
      console.log(`[Process] Menunggu delay verifikasi antrian: ${delaySec} detik...`);
      await this._sleep(delaySec * 1e3);
      console.log("[Process] Mengirim request verifikasi akhir (pff_finish)...");
      const finishPayload = new URLSearchParams({
        action: "pff_finish",
        nonce: nonce,
        token: token
      });
      const finishRes = await this.client.post("/wp-admin/admin-ajax.php", finishPayload.toString(), {
        headers: {
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
      });
      const apiResult = finishRes?.data?.data || {};
      let htmlDetails = null;
      const profileUrl = apiResult?.profile_url || `/en/perfil-jogador-freefire/${targetUid}/`;
      try {
        console.log(`[Process] Mengambil detail halaman HTML profil dari: ${profileUrl}`);
        const htmlRes = await this.client.get(profileUrl, {
          headers: {
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "upgrade-insecure-requests": "1"
          }
        });
        if (typeof htmlRes?.data === "string") {
          htmlDetails = this._parseHtml(htmlRes.data);
        }
      } catch (e) {
        console.log("[Warn Detail HTML]:", e?.message || e);
      }
      const combinedResult = {
        api_data: apiResult,
        profile_details: htmlDetails || null
      };
      console.log("[Success] Data player Free Fire Jornal berhasil diterima dan diformat");
      return {
        status: true,
        result: this._fmt(combinedResult)
      };
    } catch (err) {
      console.log("[Error Search]:", err?.response?.data || err?.message || err);
      return {
        status: false,
        result: err?.response?.data || err?.message || "Failed to check player info from Free Fire Jornal"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.uid) {
    return res.status(400).json({
      error: "Parameter 'uid' diperlukan"
    });
  }
  const api = new FreeFireJornal();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}