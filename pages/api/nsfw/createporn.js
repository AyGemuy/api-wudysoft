import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class CreatePorn {
  constructor() {
    try {
      const headers = {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        origin: "https://www.createporn.com",
        pragma: "no-cache",
        referer: "https://www.createporn.com/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-origin": "https://www.createporn.com"
      };
      this.webCli = axios.create({
        baseURL: `${proxy}https://www.createporn.com`,
        headers: headers
      });
      this.cli = axios.create({
        baseURL: `${proxy}https://api.createporn.com`,
        headers: headers
      });
    } catch (err) {
      console.error("[ERR] Constructor error:", err?.message || err);
      return;
    }
  }
  snk(o) {
    try {
      if (Array.isArray(o)) {
        return o.map(i => this.snk(i));
      }
      if (o && typeof o === "object") {
        return Object.keys(o).reduce((a, k) => {
          try {
            const nk = k.replace(/([A-Z])/g, "_$1").toLowerCase();
            a[nk] = this.snk(o[k]);
          } catch (e) {
            console.error("[ERR] Key conversion error:", e?.message || e);
          }
          return a;
        }, {});
      }
      return o;
    } catch (err) {
      console.error("[ERR] snk helper error:", err?.message || err);
      return o;
    }
  }
  async req(url, params = {}) {
    try {
      console.log(`[LOG] Fetching API: ${url}`);
      const res = await this.cli.get(url, {
        params: params || {}
      });
      return res?.data || null;
    } catch (err) {
      console.error(`[ERR] HTTP Request failed (${url}):`, err?.response?.status || err?.message || err);
      return null;
    }
  }
  async reqHtml(path) {
    try {
      console.log(`[LOG] Fetching Web HTML: ${path}`);
      const res = await this.webCli.get(path);
      return res?.data || null;
    } catch (err) {
      console.error(`[ERR] HTML Request failed (${path}):`, err?.response?.status || err?.message || err);
      return null;
    }
  }
  _pushData($) {
    try {
      return $("script").map((_, el) => $(el).html() || "").get().filter(text => text.includes("self.__next_f.push")).flatMap(text => {
        const items = [];
        const regex = /self\.__next_f\.push\(\s*(\[[\s\S]*?\])\s*\)/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
          try {
            const parsedArray = JSON.parse(match[1]);
            const pushId = parsedArray[0];
            const rawString = parsedArray[1];
            let chunkKey = null;
            let contentString = rawString;
            const colonIndex = rawString.indexOf(":");
            if (colonIndex !== -1) {
              chunkKey = rawString.substring(0, colonIndex);
              contentString = rawString.substring(colonIndex + 1);
            }
            let parsedData = contentString;
            try {
              parsedData = JSON.parse(contentString);
            } catch (e) {}
            items.push({
              push_id: pushId,
              chunk_key: chunkKey,
              data: parsedData,
              raw: rawString
            });
          } catch (e) {
            items.push({
              raw: match[1]
            });
          }
        }
        return items;
      });
    } catch (err) {
      console.error("[ERR] _pushData error:", err?.message || err);
      return [];
    }
  }
  _parseData(scriptPushList = []) {
    try {
      for (const item of scriptPushList) {
        const raw = typeof item.data === "string" ? item.data : JSON.stringify(item.data || {});
        if (raw.includes('"action"') && raw.includes('"post"')) {
          const match = raw.match(/"post"\s*:\s*(\{[\s\S]*?\})\s*,\s*"tagStringProp"/);
          if (match && match[1]) {
            return JSON.parse(match[1]);
          }
        }
      }
    } catch (err) {
      console.error("[ERR] _parseData error:", err?.message || err);
    }
    return null;
  }
  async home({
    locale,
    type,
    cursor,
    ...rest
  } = {}) {
    try {
      console.log("[LOG] Executing Home endpoints...");
      const loc = locale || "en-US";
      const t = type || "hot";
      const tasks = [{
        key: "gif_models",
        url: "/generate/model/gif/list",
        params: {
          locale: loc,
          ...rest || {}
        }
      }, {
        key: "models",
        url: "/generate/model/list",
        params: {
          ...rest || {}
        }
      }, {
        key: "gifs",
        url: "/post/gifs",
        params: {
          type: t,
          include: "userLikes",
          ...rest || {}
        }
      }, {
        key: "feed",
        url: "/post/feed",
        params: {
          include: "userLikes",
          type: t,
          ...cursor ? {
            cursor: cursor
          } : {},
          ...rest || {}
        }
      }];
      const res = {};
      for (const tsk of tasks) {
        try {
          const data = await this.req(tsk.url, tsk.params);
          res[tsk.key] = data ? this.snk(data) : null;
        } catch (err) {
          console.error(`[ERR] Skipping task "${tsk.key}":`, err?.message || err);
          res[tsk.key] = null;
        }
      }
      return res;
    } catch (err) {
      console.error("[ERR] Home method error:", err?.message || err);
      return {};
    }
  }
  async search({
    query,
    q,
    limit,
    sort,
    include,
    ...rest
  } = {}) {
    try {
      console.log("[LOG] Executing Search endpoint...");
      const searchQuery = query || q;
      if (!searchQuery) {
        console.error('[ERR] Search validation failed: "query" is required');
        return {
          error: 'Parameter "query" is required'
        };
      }
      const payload = {
        limit: limit || 20,
        include: include || "userLikes",
        searchQuery: searchQuery,
        sort: sort || "hot",
        ...rest || {}
      };
      const data = await this.req("/post/search", payload);
      return {
        search: data ? this.snk(data) : null
      };
    } catch (err) {
      console.error("[ERR] Search method error:", err?.message || err);
      return {
        search: null
      };
    }
  }
  async detail({
    id,
    locale,
    ...rest
  } = {}) {
    try {
      console.log(`[LOG] Executing Detail endpoints for ID: ${id}`);
      if (!id) {
        console.error('[ERR] Detail validation failed: "id" is required');
        return {
          error: 'Parameter "id" is required'
        };
      }
      const params = {
        ...rest || {}
      };
      const res = {};
      const tasks = [{
        key: "username",
        url: `/post/username/${id}`,
        params: params
      }, {
        key: "view",
        url: `/post/view/${id}`,
        params: params
      }, {
        key: "likes",
        url: `/post/likes/${id}`,
        params: params
      }, {
        key: "related",
        url: `/post/related/${id}`,
        params: params
      }, {
        key: "upscale",
        url: `/upscale/${id}`,
        params: params
      }];
      for (const tsk of tasks) {
        try {
          const data = await this.req(tsk.url, tsk.params);
          res[tsk.key] = data ? this.snk(data) : null;
        } catch (err) {
          console.error(`[ERR] Skipping detail task "${tsk.key}":`, err?.message || err);
          res[tsk.key] = null;
        }
      }
      const html = await this.reqHtml(`/post/${id}`);
      if (html) {
        const $ = cheerio.load(html);
        const metaTags = $("meta").map((_, el) => {
          const attribs = $(el).attr() || {};
          return {
            ...attribs
          };
        }).get();
        const scriptPushData = this._pushData($);
        const extractedPost = this._parseData(scriptPushData);
        res.meta = metaTags;
        res.script_push = this.snk(scriptPushData);
        if (extractedPost) {
          res.extracted_post = this.snk(extractedPost);
        }
      } else {
        res.meta = [];
        res.script_push = [];
        res.extracted_post = null;
      }
      return res;
    } catch (err) {
      console.error("[ERR] Detail method error:", err?.message || err);
      return {};
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "search", "detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/?action=home",
          search: "/?action=search&query=cosplay",
          detail: "/?action=detail&id=6a60303940c098220cb74424"
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
  const api = new CreatePorn();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "search":
        if (!params.query && !params.q) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' atau 'q' wajib diisi untuk action 'search'.",
            example: "/?action=search&query=cosplay"
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk action 'detail'.",
            example: "/?action=detail&id=6a60303940c098220cb74424"
          });
        }
        response = await api.detail(params);
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
        error: "Tidak ada respons dari server CreatePorn. Coba lagi nanti."
      });
    }
    if (response.status === false || response.error) {
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
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}