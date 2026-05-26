import axios from "axios";
import * as cheerio from "cheerio";
class FaresAPI {
  constructor() {
    this.baseURL = "https://fares.top";
    this.verbose = true;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Referer: "https://fares.top/",
        "Sec-CH-UA": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "Sec-CH-UA-Mobile": "?1",
        "Sec-CH-UA-Platform": '"Android"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
      }
    });
    this.client.interceptors.request.use(config => {
      this.log(`Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    }, error => {
      this.err("Request interceptor error:", error?.message || error);
      return Promise.reject(error);
    });
    this.client.interceptors.response.use(response => {
      this.log(`Response: ${response.status} ${response.config.url}`);
      return response;
    }, error => {
      this.err("Response error:", error?.message || error);
      return Promise.reject(error);
    });
    this.log("FaresAPI initialized (no cookies)");
  }
  log(...args) {
    if (this.verbose) console.log("[FaresAPI]", ...args);
  }
  err(...args) {
    if (this.verbose) console.error("[FaresAPI ERROR]", ...args);
  }
  imgUrl(appId) {
    return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
  }
  async detail({
    id
  }) {
    try {
      this.log(`detail id=${id}`);
      const res = await this.client.get("/api/games/lookup", {
        params: {
          id: id
        }
      });
      const data = res?.data ?? {};
      if (!data || Object.keys(data).length === 0) throw new Error("Empty detail response");
      const result = {
        ...data
      };
      if (result.description && typeof result.description === "string") {
        const $ = cheerio.load(result.description);
        result.descriptionText = $.text().trim();
        result.descriptionHtml = result.description;
      } else {
        result.descriptionText = result.description || "";
      }
      if (result.requirements && typeof result.requirements === "object") {
        for (const key in result.requirements) {
          if (typeof result.requirements[key] === "string") {
            const rawHtml = result.requirements[key];
            if (!result.requirementsHtml) result.requirementsHtml = {};
            result.requirementsHtml[key] = rawHtml;
            const $req = cheerio.load(rawHtml);
            $req("li").each((_, li) => {
              $req(li).prepend("\n- ");
            });
            $req("br").replaceWith("\n");
            result.requirements[key] = $req.text().replace(/\n+/g, "\n").trim();
          }
        }
      }
      result.image = result.image || this.imgUrl(id);
      this.log(`detail success: ${result.title || id}`);
      return result;
    } catch (err) {
      this.err(`detail(${id}) failed:`, err?.message || err);
      throw err;
    }
  }
  async search({
    type = "games",
    query,
    limit = 5,
    detail = true,
    down = true,
    info = true
  }) {
    try {
      const effLimit = limit > 0 ? limit : 5;
      this.log(`search type=${type} query="${query}" limit=${effLimit} detail=${detail} down=${down} info=${info}`);
      let endpoint = "/api/games/db-search";
      if (type !== "games") endpoint = `/api/${type}/search`;
      const res = await this.client.get(endpoint, {
        params: {
          q: query
        }
      });
      const raw = res?.data?.results ?? [];
      this.log(`got ${raw.length} raw results`);
      const limited = raw.slice(0, effLimit);
      const promises = limited.map(async item => {
        const gid = item?.game_id ?? item?.id ?? null;
        if (!gid) {
          this.err("search result missing id", item);
          return null;
        }
        let mergedData = {
          ...item,
          image: item?.image_url || this.imgUrl(gid)
        };
        if (detail) {
          try {
            const fullDetail = await this.detail({
              id: gid
            });
            mergedData = {
              ...mergedData,
              ...fullDetail
            };
          } catch (err) {
            this.err(`detail failed for ${gid}`);
            mergedData._detailFailed = true;
          }
        }
        if (down) {
          try {
            const downloadUrl = await this.downloadUrl({
              id: gid,
              maxRetries: 1
            });
            mergedData.downloadUrl = downloadUrl;
          } catch (err) {
            this.err(`downloadUrl failed for ${gid}`);
            mergedData._downloadFailed = true;
          }
        }
        if (info) {
          try {
            const steamInfoData = await this.steamInfo({
              gameId: gid
            });
            mergedData.steamInfo = steamInfoData;
          } catch (err) {
            this.err(`steamInfo failed for ${gid}`);
            mergedData._steamInfoFailed = true;
          }
        }
        return mergedData;
      });
      const results = (await Promise.all(promises)).filter(item => item !== null);
      this.log(`search returning ${results.length} items`);
      return results;
    } catch (err) {
      this.err(`search failed:`, err?.message || err);
      throw err;
    }
  }
  async steamInfo({
    gameId
  }) {
    try {
      this.log(`steamInfo gameId=${gameId}`);
      const res = await this.client.get("/api/games/steam-info", {
        params: {
          gameId: gameId
        }
      });
      const data = res?.data ?? {};
      this.log(`steamInfo success: ${data.name || gameId}`);
      return {
        ...data
      };
    } catch (err) {
      this.err(`steamInfo(${gameId}) failed:`, err?.message || err);
      return {};
    }
  }
  async downloadUrl({
    id,
    maxRetries = 2
  }) {
    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        this.log(`downloadUrl id=${id} attempt=${attempt + 1}`);
        const res = await this.client.get(`/api/games/${id}/download`);
        if (res.status === 200) {
          const url = res?.data?.downloadUrl ?? null;
          if (url) {
            this.log(`downloadUrl success for ${id}`);
            return url;
          }
          throw new Error("No downloadUrl in response");
        }
        if (res.status === 429) throw new Error("Too many requests. Please wait.");
        if (res.status === 404) throw new Error("Game not found");
        if (res.status >= 500 && attempt < maxRetries - 1) {
          this.log(`Server error ${res.status}, retrying...`);
          await this._delay(1500);
          continue;
        }
        const errMsg = res?.data?.error || `Server error: ${res.status}`;
        throw new Error(errMsg);
      } catch (err) {
        lastError = err;
        this.err(`downloadUrl attempt ${attempt + 1} failed:`, err?.message);
        if (attempt < maxRetries - 1) {
          await this._delay(1500);
          continue;
        }
        throw err;
      }
    }
    throw lastError || new Error("Failed to get download URL");
  }
  async _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new FaresAPI();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}