import axios from "axios";
class ShinigamiAPI {
  constructor() {
    this.api_base = "https://api.shngm.io";
    this.cmt_base = "https://commento.shngm.io";
    this.headers = {
      accept: "application/json",
      "accept-language": "id-ID,id;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://11.shinigami.asia",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://11.shinigami.asia/",
      "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
    };
  }
  _snk(str) {
    return String(str || "").replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2").toLowerCase();
  }
  _prs(val) {
    if (Array.isArray(val)) {
      return val.map(item => this._prs(item));
    }
    if (val && typeof val === "object") {
      const out = {};
      for (const [k, v] of Object.entries(val)) {
        out[this._snk(k)] = this._prs(v);
      }
      return out;
    }
    return val;
  }
  _res(data) {
    const is_ok = data ? true : false;
    return {
      status: is_ok ? "success" : "error",
      result: data || null
    };
  }
  async _req(url, params = {}) {
    try {
      console.log(`[REQ] ${url}`, params);
      const res = await axios.get(url, {
        headers: this.headers,
        params: params ? params : {},
        timeout: 15e3
      });
      console.log(`[RES] ${url} status=${res?.status}`);
      const raw_data = res?.data || null;
      return this._prs(raw_data);
    } catch (err) {
      console.log(`[ERR] ${url}: ${err?.message || err}`);
      return null;
    }
  }
  async top({
    filter,
    page,
    page_size,
    ...rest
  } = {}) {
    try {
      const f = filter ? filter : "daily";
      const p = page ? Number(page) : 1;
      const sz = page_size ? Number(page_size) : 10;
      console.log(`[PROCESS] top: filter=${f}, page=${p}`);
      const body = await this._req(`${this.api_base}/v1/manga/top`, {
        filter: f,
        page: p,
        page_size: sz,
        ...rest
      });
      return this._res(body);
    } catch (err) {
      console.log(`[ERR] top: ${err?.message || err}`);
      return this._res(null);
    }
  }
  async list({
    page,
    page_size,
    sort,
    sort_order,
    ...rest
  } = {}) {
    try {
      const p = page ? Number(page) : 1;
      const sz = page_size ? Number(page_size) : 24;
      const s = sort ? sort : "latest";
      const o = sort_order ? sort_order : "desc";
      console.log(`[PROCESS] list: page=${p}, sort=${s}_${o}`);
      const body = await this._req(`${this.api_base}/v1/manga/list`, {
        page: p,
        page_size: sz,
        sort: s,
        sort_order: o,
        ...rest
      });
      return this._res(body);
    } catch (err) {
      console.log(`[ERR] list: ${err?.message || err}`);
      return this._res(null);
    }
  }
  async search({
    q,
    page,
    page_size,
    ...rest
  } = {}) {
    try {
      const keyword = q ? String(q) : "";
      const p = page ? Number(page) : 1;
      const sz = page_size ? Number(page_size) : 24;
      console.log(`[PROCESS] search: q="${keyword}"`);
      const body = await this._req(`${this.api_base}/v1/manga/list`, {
        q: keyword,
        page: p,
        page_size: sz,
        ...rest
      });
      return this._res(body);
    } catch (err) {
      console.log(`[ERR] search: ${err?.message || err}`);
      return this._res(null);
    }
  }
  async detail({
    manga_id,
    ...rest
  } = {}) {
    try {
      if (!manga_id) throw new Error("Parameter 'manga_id' wajib diisi");
      console.log(`[PROCESS] detail: manga_id=${manga_id}`);
      const body = await this._req(`${this.api_base}/v1/manga/detail/${manga_id}`, {
        ...rest
      });
      return this._res(body);
    } catch (err) {
      console.log(`[ERR] detail: ${err?.message || err}`);
      return this._res(null);
    }
  }
  async chapters({
    manga_id,
    page,
    page_size,
    sort_by,
    sort_order,
    ...rest
  } = {}) {
    try {
      if (!manga_id) throw new Error("Parameter 'manga_id' wajib diisi");
      const p = page ? Number(page) : 1;
      const sz = page_size ? Number(page_size) : 24;
      const sb = sort_by ? sort_by : "chapter_number";
      const so = sort_order ? sort_order : "desc";
      console.log(`[PROCESS] chapters: manga_id=${manga_id}`);
      const body = await this._req(`${this.api_base}/v1/chapter/${manga_id}/list`, {
        page: p,
        page_size: sz,
        sort_by: sb,
        sort_order: so,
        ...rest
      });
      return this._res(body);
    } catch (err) {
      console.log(`[ERR] chapters: ${err?.message || err}`);
      return this._res(null);
    }
  }
  async read({
    chapter_id,
    ...rest
  } = {}) {
    try {
      if (!chapter_id) throw new Error("Parameter 'chapter_id' wajib diisi");
      console.log(`[PROCESS] read: chapter_id=${chapter_id}`);
      const body = await this._req(`${this.api_base}/v1/chapter/detail/${chapter_id}`, {
        ...rest
      });
      if (body?.data) {
        const d = body.data;
        const base = d?.base_url ? d.base_url : "https://assets.shngm.id";
        const path = d?.chapter?.path ? d.chapter.path : "";
        const files = Array.isArray(d?.chapter?.data) ? d.chapter.data : [];
        const images = files.map(f => `${base}${path}${f}`);
        body.data.images = images;
        body.data.total_images = images?.length || 0;
      }
      return this._res(body);
    } catch (err) {
      console.log(`[ERR] read: ${err?.message || err}`);
      return this._res(null);
    }
  }
  async announcements({
    page,
    page_size,
    ...rest
  } = {}) {
    try {
      const p = page ? Number(page) : 1;
      const sz = page_size ? Number(page_size) : 10;
      console.log(`[PROCESS] announcements: page=${p}`);
      const body = await this._req(`${this.api_base}/v1/announcement/list`, {
        page: p,
        page_size: sz,
        ...rest
      });
      return this._res(body);
    } catch (err) {
      console.log(`[ERR] announcements: ${err?.message || err}`);
      return this._res(null);
    }
  }
  async ann_detail({
    announcement_id,
    ...rest
  } = {}) {
    try {
      if (!announcement_id) throw new Error("Parameter 'announcement_id' wajib diisi");
      console.log(`[PROCESS] ann_detail: announcement_id=${announcement_id}`);
      const body = await this._req(`${this.api_base}/v1/announcement/detail/${announcement_id}`, {
        ...rest
      });
      return this._res(body);
    } catch (err) {
      console.log(`[ERR] ann_detail: ${err?.message || err}`);
      return this._res(null);
    }
  }
  async notices({
    manga_id,
    page,
    page_size,
    ...rest
  } = {}) {
    try {
      if (!manga_id) throw new Error("Parameter 'manga_id' wajib diisi");
      const p = page ? Number(page) : 1;
      const sz = page_size ? Number(page_size) : 3;
      console.log(`[PROCESS] notices: manga_id=${manga_id}`);
      const body = await this._req(`${this.api_base}/v1/notice/${manga_id}/list`, {
        page: p,
        page_size: sz,
        ...rest
      });
      return this._res(body);
    } catch (err) {
      console.log(`[ERR] notices: ${err?.message || err}`);
      return this._res(null);
    }
  }
  async reactions({
    manga_id,
    type,
    lang,
    ...rest
  } = {}) {
    try {
      if (!manga_id) throw new Error("Parameter 'manga_id' wajib diisi");
      const t = type ? type : "reaction0,reaction1,reaction2";
      const l = lang ? lang : "en";
      console.log(`[PROCESS] reactions: manga_id=${manga_id}`);
      const body = await this._req(`${this.cmt_base}/api/article`, {
        path: `series/${manga_id}`,
        type: t,
        lang: l,
        ...rest
      });
      return this._res(body);
    } catch (err) {
      console.log(`[ERR] reactions: ${err?.message || err}`);
      return this._res(null);
    }
  }
  async comments({
    manga_id,
    page,
    page_size,
    sort,
    lang,
    ...rest
  } = {}) {
    try {
      if (!manga_id) throw new Error("Parameter 'manga_id' wajib diisi");
      const p = page ? Number(page) : 1;
      const sz = page_size ? Number(page_size) : 10;
      const s = sort ? sort : "like_desc";
      const l = lang ? lang : "en";
      console.log(`[PROCESS] comments: manga_id=${manga_id}`);
      const body = await this._req(`${this.cmt_base}/api/comment`, {
        path: `series/${manga_id}`,
        page: p,
        pageSize: sz,
        sortBy: s,
        lang: l,
        ...rest
      });
      return this._res(body);
    } catch (err) {
      console.log(`[ERR] comments: ${err?.message || err}`);
      return this._res(null);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};
  const valid_actions = ["top", "list", "search", "detail", "chapters", "read", "announcements", "ann_detail", "notices", "reactions", "comments"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          top: "/?action=top&filter=daily&page=1&page_size=10",
          list: "/?action=list&page=1&page_size=24&sort=latest&sort_order=desc",
          search: "/?action=search&q=Player",
          detail: "/?action=detail&manga_id=b8a63a95-49da-40df-9003-5cf50c4604f5",
          chapters: "/?action=chapters&manga_id=b8a63a95-49da-40df-9003-5cf50c4604f5&page=1&page_size=24",
          read: "/?action=read&chapter_id=af44ce94-b9a5-4329-8636-82af77a894da",
          announcements: "/?action=announcements&page=1&page_size=10",
          ann_detail: "/?action=ann_detail&announcement_id=8dfa0456-9c8a-4f0e-a1de-5153a26e13e5",
          notices: "/?action=notices&manga_id=b8a63a95-49da-40df-9003-5cf50c4604f5",
          reactions: "/?action=reactions&manga_id=b8a63a95-49da-40df-9003-5cf50c4604f5",
          comments: "/?action=comments&manga_id=b8a63a95-49da-40df-9003-5cf50c4604f5&page=1&page_size=10"
        }
      }
    });
  }
  if (!valid_actions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: valid_actions
    });
  }
  const api = new ShinigamiAPI();
  try {
    let response;
    switch (action) {
      case "top":
        response = await api.top(params);
        break;
      case "list":
        response = await api.list(params);
        break;
      case "search":
        if (!params.q && !params.title && !params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'q' wajib diisi untuk search."
          });
        }
        response = await api.search({
          q: params.q || params.title || params.query,
          ...params
        });
        break;
      case "detail": {
        const manga_id = params.manga_id || params.id;
        if (!manga_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'manga_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.detail({
          manga_id: manga_id,
          ...params
        });
        break;
      }
      case "chapters": {
        const manga_id = params.manga_id || params.id;
        if (!manga_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'manga_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.chapters({
          manga_id: manga_id,
          ...params
        });
        break;
      }
      case "read": {
        const chapter_id = params.chapter_id || params.id;
        if (!chapter_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'chapter_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.read({
          chapter_id: chapter_id,
          ...params
        });
        break;
      }
      case "announcements":
        response = await api.announcements(params);
        break;
      case "ann_detail": {
        const announcement_id = params.announcement_id || params.id;
        if (!announcement_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'announcement_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.ann_detail({
          announcement_id: announcement_id,
          ...params
        });
        break;
      }
      case "notices": {
        const manga_id = params.manga_id || params.id;
        if (!manga_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'manga_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.notices({
          manga_id: manga_id,
          ...params
        });
        break;
      }
      case "reactions": {
        const manga_id = params.manga_id || params.id;
        if (!manga_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'manga_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.reactions({
          manga_id: manga_id,
          ...params
        });
        break;
      }
      case "comments": {
        const manga_id = params.manga_id || params.id;
        if (!manga_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'manga_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.comments({
          manga_id: manga_id,
          ...params
        });
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response || response?.status === "error" || !response?.result) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Server target tidak memberikan respon atau data kosong.",
        result: response?.result || null
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error?.message || "Unknown Error"
    });
  }
}