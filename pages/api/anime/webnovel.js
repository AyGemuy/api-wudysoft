import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-url";
const proxy = PROXY.url;
console.log("CORS proxy", proxy);
class Webnovel {
  constructor() {
    this.cookies = {};
    this.tk = "";
    this.proxy = proxy;
    this.base = "https://m.webnovel.com";
    this.api = axios.create({
      baseURL: this.proxy + this.base,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "webnovel-content-language": "in"
      }
    });
    this.api.interceptors.request.use(config => {
      const cookieStr = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
      config.headers["Cookie"] = cookieStr || "";
      return config;
    });
    this.api.interceptors.response.use(res => {
      const sc = res.headers["set-cookie"] || [];
      sc.forEach(c => {
        const [pair] = c.split(";");
        const [key, ...val] = pair.split("=");
        const k = key?.trim();
        const v = val.join("=")?.trim();
        if (k) {
          this.cookies[k] = v;
          if (k === "_csrfToken") this.tk = v;
        }
      });
      return res;
    });
  }
  async init({
    ...rest
  }) {
    console.log("[LOG] Handshaking with Webnovel...");
    try {
      await this.api.get("/id", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "upgrade-insecure-requests": "1"
        },
        ...rest
      });
      console.log(`[OK] Handshake Sukses. CSRF: ${this.tk || "Dihasilkan"}`);
      return true;
    } catch (e) {
      console.log(`[ERR] Handshake Gagal: ${e.message}`);
      return false;
    }
  }
  async req({
    url,
    method = "GET",
    params = {},
    data = {},
    ...rest
  }) {
    try {
      if (!this.tk) await this.init({});
      const query = {
        _csrfToken: this.tk,
        ...params
      };
      console.log(`[PROC] ${method} -> ${url}`);
      const res = await this.api({
        url: url,
        method: method,
        params: query,
        data: data,
        ...rest
      });
      const isHtml = typeof res.data === "string" && res.data.includes("<html");
      const result = isHtml ? cheerio.load(res.data) : res.data;
      console.log(`[DONE] ${url} | Status: ${res.status}`);
      return result;
    } catch (err) {
      console.log(`[FAIL] ${url} | ${err.response?.status || err.message}`);
      return null;
    }
  }
  async hot({
    ...rest
  }) {
    const res = await this.req({
      url: "/go/pcm/search/getHotSearch",
      ...rest
    });
    return (res?.data?.items || []).map(i => ({
      id: i.id || "",
      judul: i.name || "",
      namaEn: i.enName || "",
      tipe: i.type || 0
    }));
  }
  async rank({
    page = 1,
    rankId = "power_rank",
    ...rest
  }) {
    const res = await this.req({
      url: "/go/pcm/category/getRankList",
      params: {
        type: 1,
        listType: 3,
        rankId: rankId,
        novelType: 0,
        sex: 1,
        timeType: 3,
        bookType: 2,
        signStatus: 1,
        pageIndex: page,
        sourceType: 2
      },
      ...rest
    });
    return {
      isLast: res?.data?.last ?? true,
      page: res?.data?.pageIndex || 1,
      items: (res?.data?.bookItems || []).map(b => this.parse(b))
    };
  }
  async search({
    query = "",
    page = 1,
    ...rest
  }) {
    const res = await this.req({
      url: "/go/pcm/search/result",
      params: {
        orderBy: 2,
        keywords: query,
        type: "novel",
        pageIndex: page
      },
      ...rest
    });
    const info = res?.data?.bookInfo || {};
    return {
      total: info.total || 0,
      isLast: info.isLast === 1,
      items: (info.bookItems || []).map(b => this.parse(b))
    };
  }
  async detail({
    bid = "",
    ...rest
  }) {
    const res = await this.req({
      url: "/go/pcm/book/getBookDetail",
      params: {
        bookId: bid
      },
      ...rest
    });
    const b = res?.data?.bookInfo || {};
    const fans = res?.data?.bookFans || {};
    return {
      ...this.parse(b),
      subJudul: b.bookSubName || "",
      pembaca: b.pvNum || 0,
      voters: b.voters || 0,
      status: b.actionStatus === 30 ? "Ongoing" : "TAMAT",
      jumlahChapter: b.totalChapterNum || 0,
      firstChapId: b.firstChapterId || "",
      updateTerakhir: b.updateTime ? new Date(b.updateTime).toLocaleString("id-ID") : "",
      tags: (b.tagInfos || []).map(t => ({
        id: t.tagId,
        nama: t.tagName
      })),
      authorDetail: {
        id: b.authorId,
        name: b.authorName
      },
      rating: {
        total: b.totalScore || 0,
        reviews: b.reviewTotal || 0
      },
      fanCount: fans.totalFanNum || 0,
      genres: res?.data?.genreBookItems || []
    };
  }
  async chapter({
    bid = "",
    cid = "",
    ...rest
  }) {
    const res = await this.req({
      url: "/go/pcm/chapter/getContent",
      params: {
        bookId: bid,
        chapterId: cid,
        encryptType: 3
      },
      ...rest
    });
    const info = res?.data?.chapterInfo || {};
    const book = res?.data?.bookInfo || {};
    const content = (info.contents || []).map(c => c.content?.trim()).filter(Boolean).join("\n\n");
    return {
      bookName: book.bookName || "",
      chapterJudul: info.chapterName || "",
      chapterIndex: info.chapterIndex || 0,
      teks: content || "Konten tidak tersedia atau terkunci.",
      next: info.nextChapterId !== "-1" ? info.nextChapterId : null,
      prev: info.preChapterId !== "-1" ? info.preChapterId : null,
      isVip: info.vipStatus === 1,
      reviews: (info.chapterReviewItems || []).map(r => ({
        user: r.userName,
        teks: r.content,
        likes: r.likeNums
      }))
    };
  }
  parse(b) {
    return {
      id: b.bookId || "",
      judul: b.bookName || "",
      author: b.authorName || "",
      kategori: b.categoryName || "",
      skor: b.totalScore || 0,
      cover: b.bookId ? `https://book-pic.webnovel.com/bookcover/${b.bookId}` : "",
      deskripsi: b.description?.replace(/\r?\n/g, " ").trim() || "",
      tagSimple: (b.tagInfo || []).map(t => t.tagName) || []
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["hot", "rank", "search", "detail", "chapter"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          hot: "/webnovel?action=hot",
          rank: "/webnovel?action=rank&page=1&rankId=power_rank",
          search: "/webnovel?action=search&query=terlahir&page=1",
          detail: "/webnovel?action=detail&bid=33396219500746405",
          chapter: "/webnovel?action=chapter&bid=33396219500746405&cid=89724110933916535"
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
  const api = new Webnovel();
  try {
    let response;
    switch (action) {
      case "hot":
        response = await api.hot(params);
        break;
      case "rank":
        response = await api.rank(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk search."
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.bid) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'bid' wajib diisi."
          });
        }
        response = await api.detail(params);
        break;
      case "chapter":
        if (!params.bid && !params.cid) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'bid' dan 'cid' wajib diisi."
          });
        }
        response = await api.chapter(params);
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
    return res.status(200).json({
      status: true,
      action: action,
      result: response
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