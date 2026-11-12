import axios from "axios";
import * as cheerio from "cheerio";
const BASE = "https://konachan.net";
const HDR = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "id-ID,id;q=0.9,en;q=0.8",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
  referer: BASE
};
class Konachan {
  constructor(cookie = "") {
    this.http = axios.create({
      baseURL: BASE,
      headers: {
        ...HDR,
        ...cookie ? {
          cookie: cookie
        } : {}
      },
      timeout: 3e4
    });
  }
  async _req(url, params = {}) {
    console.log(`[req] ${url}`, params);
    const r = await this.http.get(url, {
      params: params
    });
    console.log(`[ok]  ${url} → ${r.status}`);
    return r.data;
  }
  _reg(html) {
    const m = html.match(/Post\.register_resp\((\{[\s\S]*?\})\);/);
    try {
      return m ? JSON.parse(m[1]) : null;
    } catch {
      return null;
    }
  }
  _posts(html) {
    const $ = cheerio.load(html);
    return $("#post-list-posts li[id^='p']").map((_, el) => {
      const em = $(el);
      const id = parseInt(em.attr("id")?.replace("p", "") || "0", 10);
      const img = em.find("img.preview");
      const alt = img.attr("alt") || img.attr("title") || "";
      const dim = em.find(".directlink-res").eq(0).text().trim();
      const dM = dim.match(/(\d+)\s*x\s*(\d+)/);
      const rM = alt.match(/Rating:\s*(\S+)/i);
      const sM = alt.match(/Score:\s*(\d+)/i);
      const tM = alt.match(/Tags:\s*(.+?)\s+User:/i);
      const uM = alt.match(/User:\s*(.+)/i);
      return {
        id: id,
        post_url: `${BASE}/post/show/${id}`,
        preview_url: img.attr("src") || null,
        file_url: em.find("a.directlink").attr("href") || null,
        width: dM ? parseInt(dM[1], 10) : null,
        height: dM ? parseInt(dM[2], 10) : null,
        rating: rM?.[1]?.toLowerCase() ?? null,
        score: sM ? parseInt(sM[1], 10) : null,
        tags: tM?.[1]?.trim().split(/\s+/) ?? [],
        author: uM?.[1]?.trim() ?? null
      };
    }).get();
  }
  async _detail(id) {
    console.log(`[detail] post #${id}`);
    try {
      const html = await this._req(`/post/show/${id}`);
      const reg = this._reg(html);
      const p = reg?.posts?.[0] ?? null;
      if (!p) return {
        id: id,
        post_url: `${BASE}/post/show/${id}`
      };
      return {
        ...p,
        tags: p.tags?.split(/\s+/) ?? [],
        tag_types: reg.tags ?? {},
        post_url: `${BASE}/post/show/${p.id}`,
        created_at: new Date(p.created_at * 1e3).toISOString()
      };
    } catch (e) {
      console.error(`[detail] #${id} error:`, e?.message ?? e);
      return {
        id: id,
        post_url: `${BASE}/post/show/${id}`,
        error: e?.message ?? String(e)
      };
    }
  }
  async _enrich(posts) {
    console.log(`[enrich] ${posts.length} posts…`);
    const out = [];
    for (const p of posts) {
      const d = await this._detail(p.id);
      out.push({
        ...p,
        ...d
      });
    }
    return out;
  }
  _suggestions(html) {
    const $ = cheerio.load(html);
    return $(".status-notice a").map((_, el) => ({
      text: $(el).text().trim(),
      tag: $(el).attr("href")?.replace("/post?tags=", "") ?? null
    })).get();
  }
  async list({
    tags = "",
    page = 1,
    limit = 5,
    detail = true,
    ...rest
  } = {}) {
    console.log(`[list] tags="${tags}" page=${page} limit=${limit}`);
    try {
      const html = await this._req("/post", {
        tags: tags,
        page: page,
        limit: limit,
        ...rest
      });
      const posts = this._posts(html);
      console.log(`[list] ${posts.length} posts found`);
      const result = detail ? await this._enrich(posts) : posts;
      return {
        ok: true,
        page: page,
        tags: tags,
        count: result.length,
        posts: result
      };
    } catch (e) {
      console.error("[list] error:", e?.message ?? e);
      return {
        ok: false,
        error: e?.message ?? String(e),
        posts: []
      };
    }
  }
  async random({
    tags = "",
    count = 1,
    detail = true,
    ...rest
  } = {}) {
    console.log(`[random] tags="${tags}" count=${count}`);
    try {
      const raw = [];
      for (let i = 0; i < count; i++) {
        const html = await this._req("/post", {
          tags: `${tags ? tags + " " : ""}order:random`,
          limit: 1,
          ...rest
        });
        const found = this._posts(html);
        if (found[0]) raw.push(found[0]);
      }
      console.log(`[random] ${raw.length} posts collected`);
      const result = detail ? await this._enrich(raw) : raw;
      return {
        ok: true,
        tags: tags,
        count: result.length,
        posts: result
      };
    } catch (e) {
      console.error("[random] error:", e?.message ?? e);
      return {
        ok: false,
        error: e?.message ?? String(e),
        posts: []
      };
    }
  }
  async search({
    tags = "",
    page = 1,
    limit = 5,
    detail = true,
    ...rest
  } = {}) {
    console.log(`[search] tags="${tags}" page=${page} limit=${limit}`);
    try {
      const html = await this._req("/post", {
        tags: tags,
        page: page,
        limit: limit,
        ...rest
      });
      const posts = this._posts(html);
      const suggestions = this._suggestions(html);
      console.log(`[search] ${posts.length} posts | ${suggestions.length} suggestions`);
      const result = detail ? await this._enrich(posts) : posts;
      return {
        ok: true,
        tags: tags,
        page: page,
        count: result.length,
        ...suggestions.length ? {
          suggestions: suggestions
        } : {},
        posts: result
      };
    } catch (e) {
      console.error("[search] error:", e?.message ?? e);
      return {
        ok: false,
        error: e?.message ?? String(e),
        posts: []
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["list", "random", "search"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          list: "/?action=list",
          random: "/?action=random",
          search: "/?action=search&tags=yu"
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
  const api = new Konachan();
  try {
    let response;
    switch (action) {
      case "list":
        response = await api.list(params);
        break;
      case "random":
        response = await api.random(params);
        break;
      case "search":
        if (!params.tags) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'tags' wajib diisi untuk action 'search'.",
            example: "/?action=search&tags=yu"
          });
        }
        response = await api.search(params);
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
        error: "Tidak ada respons dari server AnimeKill. Coba lagi nanti."
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