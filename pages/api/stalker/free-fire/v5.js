import axios from "axios";
import * as cheerio from "cheerio";
class FreeFireMania {
  constructor() {
    this.baseUrl = "https://www.freefiremania.com.br";
    this.cookies = new Map();
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,id;q=0.8",
        "cache-control": "no-cache",
        origin: this.baseUrl,
        pragma: "no-cache",
        priority: "u=0, i",
        referer: `${this.baseUrl}/free-fire-player-profile.html`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
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
  _parseHtml(html) {
    try {
      const $ = cheerio.load(html || "");
      $(".perfil-info-dot").remove();
      const guildPanel = $('.perfil-api-panel:contains("Guild"), .perfil-api-panel:contains("Guilda")');
      const guildLink = guildPanel.find('a[href*="guilda-ff"]');
      const guildText = guildPanel.text();
      const guildId = guildLink.attr("href")?.match(/guilda-ff\/(\d+)/)?.[1] || guildText.match(/(?:Guild ID|ID da Guilda)[:\s]+(\d+)/i)?.[1] || null;
      const guildLvl = guildText.match(/(?:Level|N[ií]vel)[:\s]+(\d+)/i)?.[1] || null;
      const guildMems = guildText.match(/(?:Members|Membros)[:\s]+(\d+)/i)?.[1] || null;
      const isNoGuild = /(?:No guild|Sem guilda)/i.test(guildText);
      const basicInfo = {};
      $(".perfil-api-grid > div").map((_, el) => {
        const rawKey = $(el).find("strong").clone().children().remove().end().text();
        const rawVal = $(el).find("span").clone().children(".perfil-verified-inline").remove().end().text();
        return {
          key: this._toSnake(this._clean(rawKey)),
          val: this._clean(rawVal)
        };
      }).get().forEach(({
        key,
        val
      }) => {
        if (key) basicInfo[key] = val;
      });
      const ranks = {};
      $(".perfil-patente-wrap .perfil-patente-card").map((_, el) => ({
        mode: this._toSnake($(el).find(".perfil-patente-mode").text().trim()),
        info: {
          name: $(el).find(".perfil-patente-name").text().trim() || null,
          points: $(el).find(".perfil-patente-pts").text().trim() || null,
          next_tier_info: $(el).find(".perfil-patente-faltam").text().trim() || null,
          stars: $(el).find(".perfil-patente-stars em").text().trim() || null,
          image: this._parse($(el).find(".perfil-patente-img").attr("src"))
        }
      })).get().forEach(({
        mode,
        info
      }) => {
        if (mode) ranks[mode] = info;
      });
      const statistics = {};
      $(".perfil-stats-wrap .perfil-stats-card").map((_, el) => {
        const mode = this._toSnake($(el).find(".perfil-stats-mode").text().trim());
        const stats = {};
        $(el).find(".perfil-stats-grid .perfil-stats-item").map((_, item) => ({
          label: this._toSnake($(item).find(".perfil-stats-label").text().trim()),
          val: $(item).find(".perfil-stats-value").text().trim()
        })).get().forEach(({
          label,
          val
        }) => {
          if (label) stats[label] = val;
        });
        return {
          mode: mode,
          stats: stats
        };
      }).get().forEach(({
        mode,
        stats
      }) => {
        if (mode) statistics[mode] = stats;
      });
      const rawUid = $(".perfil-api-id").text().trim();
      const cleanUid = rawUid.replace(/^(?:UID|ID)[:\s]*/i, "").trim();
      return {
        nickname: $("#perfil-jogador-title").text().trim() || null,
        uid: cleanUid || null,
        prime_level: $(".perfil-prime-badge").text().trim() || null,
        level: $(".perfil-api-level").text().replace(/^(?:Level|N[ií]vel)\s*/i, "").trim() || null,
        avatar: this._parse($(".perfil-container .avatar").attr("src")),
        banner: this._parse($(".perfil-container .banner-fundo").attr("src")),
        bio: $("#bioContent").attr("data-original-bio") || $("#bioContent").text().trim() || "",
        account_age: $(".alert.alert-warning p").text().trim() || null,
        summary: $("p.lead").text().trim() || null,
        chips: $(".perfil-chips .perfil-chip").map((_, el) => $(el).text().trim()).get().filter(Boolean),
        basic_info: basicInfo,
        guild: {
          name: isNoGuild ? "No guild" : guildLink.text().trim() || null,
          id: guildId,
          level: guildLvl,
          members: guildMems
        },
        skins: $("#skinContent .skin-card, #skinContent a.skin-card, .skin-preview-items a").map((_, el) => ({
          name: $(el).attr("title")?.trim() || $(el).find("small").text().trim() || $(el).find("img").attr("alt")?.trim() || null,
          image: this._parse($(el).find("img").attr("src")),
          url: this._parse($(el).attr("href"))
        })).get().filter(item => item.name || item.image),
        ranks: ranks,
        loadout: $(".perfil-equip-wrap .perfil-equip-card, .perfil-equip-wrap a.perfil-equip-card, .perfil-equip-wrap div.perfil-equip-card").map((_, el) => ({
          slot: $(el).find(".perfil-equip-slot").text().trim() || null,
          name: $(el).find(".perfil-equip-name").text().trim() || null,
          sub: $(el).find(".perfil-equip-sub").text().trim() || null,
          image: this._parse($(el).find(".perfil-equip-img").attr("src")),
          url: this._parse($(el).attr("href"))
        })).get().filter(item => item.slot || item.name),
        passes_info: {
          season_tag: $(".perfil-pass-head .perfil-pass-tag").map((_, el) => $(el).text().trim()).get().filter(Boolean),
          badges: $(".perfil-pass-grid .perfil-pass-badge").map((_, el) => ({
            title: $(el).attr("title")?.trim() || null,
            count: $(el).find("span").text().trim() || "",
            image: this._parse($(el).find("img").attr("src")),
            is_owned: !$(el).hasClass("not-owned"),
            is_current_pass: $(el).hasClass("is-pass")
          })).get().filter(item => item.title || item.count || item.image)
        },
        wishlist: $(".perfil-wishlist-grid .perfil-wishlist-card").map((_, el) => ({
          name: $(el).find("span").text().trim() || $(el).attr("title")?.trim() || null,
          since: $(el).find(".perfil-wishlist-since").text().replace(/^(?:Wished since|Desejado desde)\s*/i, "").trim() || null,
          image: this._parse($(el).find("img").attr("src")),
          url: this._parse($(el).attr("href"))
        })).get().filter(item => item.name || item.image),
        statistics: statistics,
        form_token: $("#ffToken").val() || $("#ffToken").attr("value") || null
      };
    } catch (err) {
      console.log("[Error _parseHtml]:", err?.message || err);
      return {};
    }
  }
  async _init() {
    try {
      console.log("[Process] Menginisialisasi session & cookie Free Fire Mania...");
      await this.client.get("/free-fire-player-profile.html");
      console.log("[Success] Session & cookie berhasil disinkronkan");
    } catch (err) {
      console.log("[Warn _init]:", err?.response?.status || err?.message || err);
    }
  }
  async search({
    uid,
    region = "BR",
    ...rest
  }) {
    try {
      const targetUid = uid ? String(uid).trim() : "";
      if (!targetUid) throw new Error("UID wajib diisi");
      if (this.cookies.size === 0) {
        await this._init();
      }
      console.log(`[Process] Memeriksa ID Player Free Fire Mania: ${targetUid} (Region: ${region})`);
      const params = new URLSearchParams({
        id: targetUid,
        region: region || "BR",
        ...rest
      });
      const res = await this.client.post("/paginas/perfil-free-fire-check-id.php", params.toString(), {
        headers: {
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
      });
      const apiData = res?.data || {};
      let fullProfile = null;
      const profilePath = apiData?.profileUrl || `/profile/${targetUid}.html`;
      try {
        console.log(`[Process] Mengambil & memparsing detail lengkap HTML dari: ${profilePath}`);
        const htmlRes = await this.client.get(profilePath);
        if (typeof htmlRes?.data === "string") {
          fullProfile = this._parseHtml(htmlRes.data);
        }
      } catch (e) {
        console.log("[Warn Detail HTML]:", e?.message || e);
      }
      const combinedResult = {
        ...apiData,
        profile_details: fullProfile || null
      };
      console.log("[Success] Data player berhasil diterima dan diformat lengkap");
      return {
        status: true,
        result: this._fmt(combinedResult)
      };
    } catch (err) {
      console.log("[Error Search]:", err?.response?.data || err?.message || err);
      return {
        status: false,
        result: err?.response?.data || err?.message || "Failed to check Free Fire Mania player profile"
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
  const api = new FreeFireMania();
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