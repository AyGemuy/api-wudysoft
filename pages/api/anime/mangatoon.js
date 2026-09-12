import axios from "axios";
import crypto from "crypto";
const MT = [161, 158, 189, 103, 2, 8, 54, 66, 27, 65, 108, 98, 114, 215, 107, 119, 96, 242, 19, 248, 230, 72, 218, 166, 239, 246, 252, 245, 137, 179, 243, 206, 197, 236, 9, 145, 249, 225, 0, 176, 28, 13, 250, 244, 35, 48, 57, 216, 16, 127, 220, 73, 21, 224, 124, 199, 228, 85, 191, 154, 162, 140, 160, 200, 234, 50, 113, 62, 5, 229, 178, 104, 133, 195, 86, 194, 11, 42, 134, 89, 193, 120, 4, 47, 152, 192, 126, 101, 63, 196, 208, 172, 38, 163, 150, 132, 240, 112, 117, 146, 255, 118, 141, 58, 110, 41, 81, 144, 188, 88, 32, 175, 46, 59, 167, 68, 93, 139, 227, 121, 251, 182, 180, 60, 94, 136, 156, 201, 147, 29, 78, 143, 40, 109, 185, 202, 138, 164, 130, 186, 170, 31, 45, 91, 18, 173, 100, 187, 254, 39, 97, 155, 74, 111, 223, 26, 203, 34, 67, 23, 237, 177, 207, 231, 20, 204, 159, 71, 125, 80, 174, 241, 221, 92, 84, 90, 168, 122, 153, 247, 77, 213, 64, 6, 184, 10, 116, 37, 149, 129, 99, 83, 115, 123, 128, 135, 33, 70, 238, 253, 214, 56, 76, 210, 226, 44, 51, 25, 82, 157, 53, 106, 131, 148, 151, 142, 198, 183, 169, 55, 212, 95, 43, 211, 36, 75, 209, 102, 14, 171, 190, 7, 12, 105, 181, 15, 24, 61, 17, 52, 87, 222, 30, 3, 233, 232, 22, 165, 219, 79, 217, 69, 1, 235, 205, 49];
const GT = [39, 197, 251, 159, 23, 170, 21, 209, 188, 18, 9, 13, 212, 105, 14, 200, 43, 100, 89, 161, 62, 27, 29, 19, 239, 134, 234, 109, 24, 112, 173, 133, 95, 32, 73, 91, 35, 107, 196, 125, 226, 113, 20, 94, 81, 143, 75, 44, 151, 220, 156, 246, 117, 41, 85, 240, 122, 187, 193, 15, 189, 175, 157, 211, 37, 26, 40, 178, 243, 6, 229, 179, 202, 233, 74, 114, 154, 204, 48, 165, 57, 127, 8, 207, 65, 61, 201, 206, 86, 195, 77, 22, 110, 181, 237, 254, 97, 160, 47, 138, 69, 221, 12, 140, 70, 191, 68, 255, 180, 5, 210, 245, 250, 56, 80, 249, 205, 144, 106, 174, 166, 121, 99, 244, 162, 194, 185, 82, 53, 84, 88, 230, 214, 64, 135, 228, 42, 58, 103, 52, 158, 218, 10, 124, 46, 167, 198, 208, 216, 222, 217, 153, 155, 59, 132, 223, 98, 142, 123, 152, 90, 199, 111, 129, 76, 146, 66, 118, 172, 71, 164, 1, 219, 247, 79, 36, 28, 4, 141, 72, 50, 137, 149, 120, 139, 236, 128, 227, 38, 115, 253, 241, 83, 203, 49, 213, 238, 232, 30, 186, 182, 184, 183, 176, 16, 148, 3, 92, 130, 0, 93, 34, 54, 25, 67, 150, 33, 102, 192, 168, 242, 2, 231, 87, 252, 55, 171, 177, 136, 248, 31, 96, 119, 163, 11, 45, 7, 60, 78, 131, 147, 104, 116, 215, 225, 190, 224, 126, 63, 169, 101, 235, 145, 51, 17, 108];
const log = (tag, ...args) => console.log(`[mangatoon:${tag}]`, ...args);
class Mangatoon {
  constructor() {
    this.domain = "https://sg.mangatoon.mobi";
    this.code = "66c10a61bd916c23f3b33810d3785d17";
    this.app = {
      type: "2",
      _preference: "girl",
      _webp: "false",
      _platform: "web",
      _v: "2.01.02",
      _language: "id",
      _token: "897aeecc13b29bebec65101f2d7b528a65",
      _udid: "da616065-0cb3-479f-8a27-fc19385d10d3"
    };
    this.http = axios.create({
      baseURL: this.domain,
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      timeout: 15e3
    });
    this.http.interceptors.response.use(r => r, e => {
      log("http:error", e.config?.url, e.response?.status ?? e.message);
      return Promise.resolve(null);
    });
  }
  decode(buf) {
    const bin = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    const a = bin.length % MT.length;
    let n = [...GT];
    if (a > 0) {
      n = Array(GT.length).fill(0);
      for (let i = 0; i < GT.length; i++) {
        let o = i + a;
        if (o >= GT.length) o -= GT.length;
        n[o] = GT[i];
      }
    }
    const s = Array(n.length).fill(0);
    for (let r = 0; r < n.length; r++) s[n[r]] = r;
    let o = "";
    for (let c = 0; c < bin.length; c++) o += String.fromCharCode(MT[s[bin[c]]]);
    return o;
  }
  sign(api, data) {
    let s = api;
    for (const k of Object.keys(data).sort()) s += `${k}=${data[k]}&`;
    return crypto.createHash("md5").update(s.slice(0, -1) + this.code).digest("hex");
  }
  async req(api, {
    p = {},
    post = null
  } = {}) {
    try {
      const q = {
        ...p,
        ...this.app,
        _: Math.floor(Date.now() / 1e3)
      };
      q.sign = this.sign(api, q);
      const cfg = {
        params: q
      };
      const r = post ? await this.http.post(api, post, cfg) : await this.http.get(api, cfg);
      if (!r) return null;
      log("req", api, "status:", r.data?.status);
      return r.data?.status === "success" ? r.data.data : null;
    } catch (e) {
      log("req:error", api, e.message);
      return null;
    }
  }
  async _fetchBin(url) {
    try {
      log("bin:fetch", url);
      const r = await this.http.get(url, {
        responseType: "arraybuffer",
        baseURL: ""
      });
      if (!r) return null;
      const buf = Buffer.from(r.data);
      log("bin:size", buf.length, "bytes");
      try {
        const j = JSON.parse(buf.toString("utf8"));
        log("bin:parse", "plain json");
        return j;
      } catch (_) {}
      const decoded = this.decode(buf);
      try {
        const j = JSON.parse(decoded);
        log("bin:parse", "decoded json");
        return j;
      } catch (_) {}
      const fixed = Buffer.from(decoded, "latin1").toString("utf8");
      const isClean = !fixed.includes("�");
      if (isClean) {
        try {
          const j = JSON.parse(fixed);
          log("bin:parse", "fixed json");
          return j;
        } catch (_) {}
        log("bin:parse", "fixed text, len:", fixed.length);
        return fixed;
      }
      log("bin:parse", "decoded text fallback, len:", decoded.length);
      return decoded;
    } catch (e) {
      log("bin:error", url, e.message);
      return null;
    }
  }
  async home({
    ...p
  } = {}) {
    try {
      return await this.req("/api/content/list", {
        p: p
      }) ?? [];
    } catch (e) {
      log("home:error", e.message);
      return [];
    }
  }
  async suggestions({
    suggestion_type = 0,
    ...p
  } = {}) {
    try {
      return await this.req("/api/homepage/suggestions", {
        p: {
          suggestion_type: suggestion_type,
          ...p
        }
      }) ?? [];
    } catch (e) {
      log("suggestions:error", e.message);
      return [];
    }
  }
  async detail({
    id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/content/detail", {
        p: {
          id: id,
          ...p
        }
      });
    } catch (e) {
      log("detail:error", e.message);
      return null;
    }
  }
  async episodes({
    id,
    contentType = 1,
    ...p
  } = {}) {
    try {
      return await this.req("/api/content/episodes", {
        p: {
          id: id,
          contentType: contentType,
          ...p
        }
      }) ?? [];
    } catch (e) {
      log("episodes:error", e.message);
      return [];
    }
  }
  async series({
    id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/content/seriesContents", {
        p: {
          id: id,
          ...p
        }
      }) ?? [];
    } catch (e) {
      log("series:error", e.message);
      return [];
    }
  }
  async share_text({
    content_id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/content/getContentShareText", {
        p: {
          content_id: content_id,
          ...p
        }
      });
    } catch (e) {
      log("share_text:error", e.message);
      return null;
    }
  }
  async dl_episodes({
    content_id,
    episode_ids,
    type = 1,
    ...p
  } = {}) {
    try {
      const body = {
        content_id: String(content_id),
        episode_ids: episode_ids,
        type: String(type)
      };
      return await this.req("/api/content/downloadEpisodes", {
        p: {
          content_id: content_id,
          ...p
        },
        post: body
      });
    } catch (e) {
      log("dl_episodes:error", e.message);
      return null;
    }
  }
  async autocomplete({
    word,
    ...p
  } = {}) {
    try {
      return await this.req("/api/search/autoCompleteV2", {
        p: {
          word: word,
          ...p
        }
      }) ?? [];
    } catch (e) {
      log("autocomplete:error", e.message);
      return [];
    }
  }
  async search({
    word,
    type = "",
    force_search_title = "",
    end_status = "",
    order = "",
    page = 1,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/mangatoon-api/search/list", {
        p: {
          word: word,
          type: type,
          force_search_title: force_search_title,
          end_status: end_status,
          order: order,
          page: page,
          ...p
        }
      }) ?? [];
    } catch (e) {
      log("search:error", e.message);
      return [];
    }
  }
  async search_authors({
    keyword,
    page = 1,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/mangatoon-api/search/authors", {
        p: {
          keyword: keyword,
          page: page,
          ...p
        }
      }) ?? [];
    } catch (e) {
      log("search_authors:error", e.message);
      return [];
    }
  }
  async search_topics({
    keyword,
    limit = 10,
    page = 1,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/community/search/topics", {
        p: {
          keyword: keyword,
          limit: limit,
          page: page,
          ...p
        }
      }) ?? [];
    } catch (e) {
      log("search_topics:error", e.message);
      return [];
    }
  }
  async search_posts({
    keyword,
    limit = 10,
    page = 1,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/community/search/posts", {
        p: {
          keyword: keyword,
          limit: limit,
          page: page,
          ...p
        }
      }) ?? [];
    } catch (e) {
      log("search_posts:error", e.message);
      return [];
    }
  }
  async rank_filters({
    page_source = 1,
    ...p
  } = {}) {
    try {
      return await this.req("/api/rankings/newFilters", {
        p: {
          page_source: page_source,
          ...p
        }
      }) ?? [];
    } catch (e) {
      log("rank_filters:error", e.message);
      return [];
    }
  }
  async rank_tags({
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/mangatoon-api/rank/topTags", {
        p: p
      }) ?? [];
    } catch (e) {
      log("rank_tags:error", e.message);
      return [];
    }
  }
  async ch({
    id,
    ...p
  } = {}) {
    try {
      const q = {
        id: id,
        ...p,
        ...this.app,
        _: Math.floor(Date.now() / 1e3)
      };
      q.sign = this.sign("/api/fictions/content", q);
      const r = await this.http.get("/api/fictions/content", {
        params: q
      });
      if (!r) {
        log("ch:error", "no response");
        return null;
      }
      log("ch:api", "status:", r.data?.status, "data type:", typeof r.data?.data);
      if (r.data?.status !== "success") {
        log("ch:error", "status not success");
        return null;
      }
      const full = {
        ...r.data
      };
      const binFields = Object.entries(full).filter(([, v]) => typeof v === "string" && v.endsWith(".bin"));
      await Promise.all(binFields.map(async ([key, url]) => {
        log("ch:bin", `field='${key}'`, url);
        full[key] = await this._fetchBin(url);
      }));
      return full;
    } catch (e) {
      log("ch:error", e.message);
      return null;
    }
  }
  async segment_infos({
    content_id,
    episode_id,
    segment_version = 0,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/mangatoon-api/fictionSegment/infos", {
        p: {
          content_id: content_id,
          episode_id: episode_id,
          segment_version: segment_version,
          ...p
        }
      }) ?? [];
    } catch (e) {
      log("segment_infos:error", e.message);
      return [];
    }
  }
  async dl_all({
    id,
    onProgress = null,
    concurrency = 3
  } = {}) {
    try {
      const eps = await this.episodes({
        id: id
      });
      if (!eps?.length) {
        log("dl_all:warn", "no episodes for id:", id);
        return [];
      }
      const out = Array(eps.length).fill(null);
      let done = 0;
      for (let i = 0; i < eps.length; i += concurrency) {
        await Promise.all(eps.slice(i, i + concurrency).map(async (ep, ci) => {
          const data = await this.ch({
            id: ep.id
          });
          out[i + ci] = {
            ep: ep,
            data: data
          };
          onProgress?.(++done, eps.length, ep);
        }));
      }
      return out;
    } catch (e) {
      log("dl_all:error", e.message);
      return [];
    }
  }
  async comments({
    content_id,
    episode_id = 0,
    type = 1,
    limit = 20,
    ...p
  } = {}) {
    try {
      return await this.req("/api/comments/index", {
        p: {
          content_id: content_id,
          episode_id: episode_id,
          type: type,
          limit: limit,
          ...p
        }
      }) ?? [];
    } catch (e) {
      log("comments:error", e.message);
      return [];
    }
  }
  async hot_topics({
    only_show_topic = 1,
    ...p
  } = {}) {
    try {
      return await this.req("/api/post/hotTopics", {
        p: {
          only_show_topic: only_show_topic,
          ...p
        }
      }) ?? [];
    } catch (e) {
      log("hot_topics:error", e.message);
      return [];
    }
  }
  async community_cats({
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/community/category/list", {
        p: p
      }) ?? [];
    } catch (e) {
      log("community_cats:error", e.message);
      return [];
    }
  }
  async community_topics({
    category_ids,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/community/category/categoryTopicList", {
        p: {
          category_ids: category_ids,
          ...p
        }
      }) ?? [];
    } catch (e) {
      log("community_topics:error", e.message);
      return [];
    }
  }
  async novel_char({
    character_id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/novel/fictions/characterInfo", {
        p: {
          character_id: character_id,
          ...p
        }
      });
    } catch (e) {
      log("novel_char:error", e.message);
      return null;
    }
  }
  async dialogue_char({
    character_id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/contributiondialogues/characterInfo", {
        p: {
          character_id: character_id,
          ...p
        }
      });
    } catch (e) {
      log("dialogue_char:error", e.message);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "suggestions", "detail", "episodes", "series", "share_text", "dl_episodes", "autocomplete", "search", "search_authors", "search_topics", "search_posts", "rank_filters", "rank_tags", "chapter", "segment_infos", "dl_all", "comments", "hot_topics", "community_cats", "community_topics", "novel_char", "dialogue_char"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/api?action=search&word=solo"
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: ${action}.`,
      valid_actions: validActions
    });
  }
  const api = new Mangatoon();
  const need = (...keys) => {
    for (const k of keys) {
      if (!params[k]) return res.status(400).json({
        status: false,
        error: `Parameter '${k}' wajib diisi.`
      });
    }
    return null;
  };
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "suggestions":
        response = await api.suggestions(params);
        break;
      case "detail":
        if (need("id")) return;
        response = await api.detail(params);
        break;
      case "episodes":
        if (need("id")) return;
        response = await api.episodes(params);
        break;
      case "series":
        if (need("id")) return;
        response = await api.series(params);
        break;
      case "share_text":
        if (need("content_id")) return;
        response = await api.share_text(params);
        break;
      case "dl_episodes":
        if (need("content_id", "episode_ids")) return;
        response = await api.dl_episodes(params);
        break;
      case "autocomplete":
        if (need("word")) return;
        response = await api.autocomplete(params);
        break;
      case "search":
        if (need("word")) return;
        response = await api.search(params);
        break;
      case "search_authors":
        if (need("keyword")) return;
        response = await api.search_authors(params);
        break;
      case "search_topics":
        if (need("keyword")) return;
        response = await api.search_topics(params);
        break;
      case "search_posts":
        if (need("keyword")) return;
        response = await api.search_posts(params);
        break;
      case "rank_filters":
        response = await api.rank_filters(params);
        break;
      case "rank_tags":
        response = await api.rank_tags(params);
        break;
      case "chapter":
        if (need("id")) return;
        response = await api.ch(params);
        break;
      case "segment_infos":
        if (need("content_id", "episode_id")) return;
        response = await api.segment_infos(params);
        break;
      case "dl_all":
        if (need("id")) return;
        response = await api.dl_all(params);
        break;
      case "comments":
        if (need("content_id")) return;
        response = await api.comments(params);
        break;
      case "hot_topics":
        response = await api.hot_topics(params);
        break;
      case "community_cats":
        response = await api.community_cats(params);
        break;
      case "community_topics":
        if (need("category_ids")) return;
        response = await api.community_topics(params);
        break;
      case "novel_char":
        if (need("character_id")) return;
        response = await api.novel_char(params);
        break;
      case "dialogue_char":
        if (need("character_id")) return;
        response = await api.dialogue_char(params);
        break;
    }
    if (response == null) {
      return res.status(404).json({
        status: false,
        message: "Data tidak ditemukan atau gagal fetch."
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      result: response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal.",
      error: error.message || "Unknown Error"
    });
  }
}