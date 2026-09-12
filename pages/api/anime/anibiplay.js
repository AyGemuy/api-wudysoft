import axios from "axios";
import * as cheerio from "cheerio";
class AnibiPlay {
  constructor() {
    this.baseUrl = "https://anibiplay.net";
    this.cookies = new Map();
    this.csrfToken = null;
    this.isInitialized = false;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 6e4,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Referer: "https://anibiplay.net/",
        Origin: "https://anibiplay.net",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "X-Requested-With": "XMLHttpRequest",
        "X-Inertia": "true",
        "X-Inertia-Version": "8258050747e86d3734ecdb2a3ec4aa41",
        Accept: "text/html, application/xhtml+xml, application/json"
      }
    });
    this.client.interceptors.request.use(async config => {
      try {
        if (!this.isInitialized && !config.skipInit) {
          await this.initSession();
        }
        if (this.cookies.size > 0) {
          config.headers["Cookie"] = Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
        }
        if (this.csrfToken) {
          config.headers["X-XSRF-TOKEN"] = this.csrfToken;
        }
        return config;
      } catch (err) {
        console.error(`[INTERCEPTOR REQUEST ERROR]: ${err.message}`);
        return config;
      }
    });
    this.client.interceptors.response.use(response => {
      try {
        const setCookie = response.headers["set-cookie"];
        if (setCookie && Array.isArray(setCookie)) {
          setCookie.forEach(cookieStr => {
            const [pair] = cookieStr.split(";");
            const [key, ...val] = pair.split("=");
            if (key && val.length) {
              const rawVal = val.join("=");
              this.cookies.set(key.trim(), rawVal.trim());
              if (key.trim() === "XSRF-TOKEN") {
                try {
                  this.csrfToken = decodeURIComponent(rawVal.trim());
                } catch {
                  this.csrfToken = rawVal.trim();
                }
              }
            }
          });
        }
      } catch (err) {
        console.error(`[INTERCEPTOR RESPONSE ERROR]: ${err.message}`);
      }
      return response;
    }, error => Promise.reject(error));
  }
  async initSession() {
    try {
      console.log("[LOG] Initializing session & CSRF handshake...");
      await this.client.get("/", {
        skipInit: true,
        headers: {
          "X-Inertia": undefined
        }
      });
      this.isInitialized = true;
      console.log("[LOG] Session handshake successful.");
    } catch (error) {
      console.warn(`[WARN] initSession failed: ${error.message}`);
      this.isInitialized = true;
    }
  }
  async req(url, method = "GET", data = null, customHeaders = {}) {
    try {
      console.log(`[LOG] Fetching: ${url} (${method})`);
      const config = {
        method: method,
        url: url,
        headers: {
          ...customHeaders
        }
      };
      if (method === "POST" && data) {
        config.data = data;
      }
      const response = await this.client(config);
      if (typeof response.data === "object") {
        return response.data;
      }
      try {
        return JSON.parse(response.data);
      } catch {
        const $ = cheerio.load(response.data);
        const inertiaAttr = $("#app").attr("data-page");
        if (inertiaAttr) {
          return JSON.parse(inertiaAttr);
        }
        return $;
      }
    } catch (error) {
      console.error(`[ERROR] req [${url}]: ${error.message}`);
      throw new Error(`Gagal memuat URL ${url}: ${error.message}`);
    }
  }
  async quickSearch({
    query
  }) {
    try {
      if (!query) throw new Error("Parameter 'query' wajib diisi.");
      const data = await this.req(`/api/search?q=${encodeURIComponent(query)}`, "GET", null, {
        "X-Inertia": undefined
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`[ERROR] quickSearch: ${error.message}`);
      throw error;
    }
  }
  async animeList({
    query = "",
    page = 1,
    sort = "latest"
  } = {}) {
    try {
      let endpoint = `/explore?page=${page}`;
      if (query) endpoint += `&search=${encodeURIComponent(query)}`;
      if (sort) endpoint += `&sort=${encodeURIComponent(sort)}`;
      const data = await this.req(endpoint);
      const props = data?.props || {};
      const animesData = props.animes || {};
      return {
        pagination: {
          current_page: animesData.current_page || page,
          last_page: animesData.last_page || 1,
          per_page: animesData.per_page || 24,
          total: animesData.total || 0,
          has_next_page: !!animesData.next_page_url,
          has_prev_page: !!animesData.prev_page_url
        },
        filters: props.filters || {},
        genres: props.genres || [],
        items: (animesData.data || []).map(item => ({
          id: item.id,
          anilist_id: item.anilist_id,
          title: item.title,
          slug: item.slug,
          synopsis: item.synopsis,
          status: item.status,
          poster: item.poster,
          type: item.type,
          episodes_count: item.episodes_count,
          rating: item.rating,
          release_year: item.release_year,
          studio: item.studio,
          views_count: item.views_count,
          genres: (item.genres || []).map(g => ({
            id: g.id,
            name: g.name,
            slug: g.slug,
            icon: g.icon || null
          }))
        }))
      };
    } catch (error) {
      console.error(`[ERROR] animeList: ${error.message}`);
      throw error;
    }
  }
  async animeDetail({
    slug
  }) {
    try {
      if (!slug) throw new Error("Parameter 'slug' wajib diisi.");
      const cleanSlug = slug.replace(/^\/anime\//, "").replace(/\/$/, "");
      const data = await this.req(`/anime/${cleanSlug}`);
      const props = data?.props || {};
      if (!props.anime) throw new Error("Data anime tidak ditemukan.");
      const anime = props.anime;
      return {
        id: anime.id,
        anilist_id: anime.anilist_id,
        title: anime.title,
        slug: anime.slug,
        synopsis: anime.synopsis,
        status: anime.status,
        poster: anime.poster,
        type: anime.type,
        episodes_count: anime.episodes_count,
        trailer_url: anime.trailer_url,
        rating: anime.rating,
        release_year: anime.release_year,
        studio: anime.studio,
        views_count: anime.views_count,
        is_featured: anime.is_featured,
        genres: (anime.genres || []).map(g => ({
          id: g.id,
          name: g.name,
          slug: g.slug,
          icon: g.icon || null
        })),
        episodes: (anime.episodes || []).map(ep => ({
          id: ep.id,
          title: ep.title,
          number: ep.number,
          video_url: ep.video_url,
          mirror_streams: ep.mirror_streams || [],
          download_urls: ep.download_urls || []
        }))
      };
    } catch (error) {
      console.error(`[ERROR] animeDetail: ${error.message}`);
      throw error;
    }
  }
  async animeStream({
    slug,
    episode
  }) {
    try {
      if (!slug || !episode) throw new Error("Parameter 'slug' dan 'episode' wajib diisi.");
      const cleanSlug = slug.replace(/^\/anime\//, "").replace(/\/$/, "");
      const data = await this.req(`/anime/${cleanSlug}/episode/${episode}`);
      const props = data?.props || {};
      if (!props.episode) throw new Error("Episode tidak ditemukan.");
      const currentEp = props.episode;
      return {
        anime: {
          id: props.anime?.id,
          title: props.anime?.title,
          slug: props.anime?.slug,
          poster: props.anime?.poster,
          total_episodes: props.anime?.episodes_count
        },
        current_episode: {
          id: currentEp.id,
          title: currentEp.title,
          number: currentEp.number,
          default_video_url: currentEp.video_url,
          mirror_streams: currentEp.mirror_streams || [],
          download_urls: currentEp.download_urls || []
        },
        episode_list: (props.allEpisodes || []).map(ep => ({
          id: ep.id,
          number: ep.number,
          title: ep.title,
          default_video_url: ep.video_url,
          mirror_streams: ep.mirror_streams || [],
          download_urls: ep.download_urls || []
        }))
      };
    } catch (error) {
      console.error(`[ERROR] animeStream: ${error.message}`);
      throw error;
    }
  }
  async mangaList({
    query = "",
    page = 1
  } = {}) {
    try {
      let endpoint = `/manga?page=${page}`;
      if (query) endpoint += `&search=${encodeURIComponent(query)}`;
      const data = await this.req(endpoint);
      const props = data?.props || {};
      const mangasData = props.mangas || {};
      return {
        pagination: {
          current_page: mangasData.current_page || page,
          last_page: mangasData.last_page || 1,
          per_page: mangasData.per_page || 24,
          total: mangasData.total || 0,
          has_next_page: !!mangasData.next_page_url,
          has_prev_page: !!mangasData.prev_page_url
        },
        filters: props.filters || {},
        genres: props.genres || [],
        items: (mangasData.data || []).map(item => ({
          id: item.id,
          title: item.title,
          slug: item.slug,
          synopsis: item.synopsis,
          status: item.status,
          poster: item.poster,
          type: item.type,
          author: item.author || "-",
          artist: item.artist || "-",
          rating: item.rating,
          release_year: item.release_year,
          views_count: item.views_count,
          source_url: item.source_url,
          genres: (item.genres || []).map(g => ({
            id: g.id,
            name: g.name,
            slug: g.slug,
            icon: g.icon || null
          })),
          last_chapter: item.last_chapter ? {
            id: item.last_chapter.id,
            title: item.last_chapter.title,
            slug: item.last_chapter.slug,
            chapter_number: item.last_chapter.chapter_number
          } : null
        }))
      };
    } catch (error) {
      console.error(`[ERROR] mangaList: ${error.message}`);
      throw error;
    }
  }
  async mangaDetail({
    slug
  }) {
    try {
      if (!slug) throw new Error("Parameter 'slug' wajib diisi.");
      const cleanSlug = slug.replace(/^\/manga\//, "").replace(/\/$/, "");
      const data = await this.req(`/manga/${cleanSlug}`);
      const props = data?.props || {};
      if (!props.manga) throw new Error("Data manga tidak ditemukan.");
      const manga = props.manga;
      return {
        id: manga.id,
        title: manga.title,
        slug: manga.slug,
        synopsis: manga.synopsis,
        status: manga.status,
        poster: manga.poster,
        type: manga.type,
        author: manga.author || "-",
        artist: manga.artist || "-",
        rating: manga.rating,
        release_year: manga.release_year,
        views_count: manga.views_count,
        rank: props.mangaRank || null,
        source_url: manga.source_url,
        genres: (manga.genres || []).map(g => ({
          id: g.id,
          name: g.name,
          slug: g.slug,
          icon: g.icon || null
        })),
        first_chapter: props.firstChapter || null,
        chapters_count: (manga.chapters || []).length,
        chapters: (manga.chapters || []).map(ch => ({
          id: ch.id,
          title: ch.title,
          slug: ch.slug,
          chapter_number: ch.chapter_number,
          views_count: ch.views_count,
          created_at: ch.created_at
        })),
        related_mangas: (props.relatedMangas || []).map(rel => ({
          id: rel.id,
          title: rel.title,
          slug: rel.slug,
          poster: rel.poster,
          type: rel.type,
          status: rel.status,
          last_chapter: rel.last_chapter ? rel.last_chapter.title : null
        }))
      };
    } catch (error) {
      console.error(`[ERROR] mangaDetail: ${error.message}`);
      throw error;
    }
  }
  async mangaRead({
    slug,
    chapter
  }) {
    try {
      if (!slug || !chapter) throw new Error("Parameter 'slug' dan 'chapter' wajib diisi.");
      const cleanSlug = slug.replace(/^\/manga\//, "").replace(/\/$/, "");
      const data = await this.req(`/manga/${cleanSlug}/chapter/${chapter}`);
      const props = data?.props || {};
      if (!props.chapter) throw new Error("Chapter manga tidak ditemukan.");
      return {
        manga: {
          id: props.manga?.id,
          title: props.manga?.title,
          slug: props.manga?.slug,
          poster: props.manga?.poster
        },
        chapter: {
          id: props.chapter.id,
          title: props.chapter.title,
          chapter_number: props.chapter.chapter_number,
          slug: props.chapter.slug,
          images_count: (props.chapter.images || []).length,
          images: (props.chapter.images || []).map(img => ({
            id: img.id,
            order: img.order,
            image_url: img.image_path
          }))
        },
        navigation: {
          prev_chapter: props.prev ? props.prev.chapter_number : null,
          next_chapter: props.next ? props.next.chapter_number : null
        },
        all_chapters: (props.chapters || []).map(c => ({
          id: c.id,
          title: c.title,
          chapter_number: c.chapter_number,
          slug: c.slug
        }))
      };
    } catch (error) {
      console.error(`[ERROR] mangaRead: ${error.message}`);
      throw error;
    }
  }
  async novelList({
    query = "",
    page = 1,
    sort = "latest_update"
  } = {}) {
    try {
      let endpoint = `/novel?page=${page}`;
      if (query) endpoint += `&search=${encodeURIComponent(query)}`;
      if (sort) endpoint += `&sort=${encodeURIComponent(sort)}`;
      const data = await this.req(endpoint);
      const props = data?.props || {};
      const novelsData = props.mangas || {};
      return {
        pagination: {
          current_page: novelsData.current_page || page,
          last_page: novelsData.last_page || 1,
          per_page: novelsData.per_page || 24,
          total: novelsData.total || 0,
          has_next_page: !!novelsData.next_page_url,
          has_prev_page: !!novelsData.prev_page_url
        },
        filters: props.filters || {},
        genres: props.genres || [],
        items: (novelsData.data || []).map(item => {
          const rawSynopsis = item.synopsis || "";
          const cleanSynopsis = cheerio.load(rawSynopsis).text().trim();
          return {
            id: item.id,
            title: item.title,
            slug: item.slug,
            synopsis: cleanSynopsis,
            synopsis_html: rawSynopsis,
            status: item.status,
            poster: item.poster,
            type: item.type,
            author: item.author || "-",
            artist: item.artist || "-",
            views_count: item.views_count,
            chapters_count: item.chapters_count || 0,
            source_url: item.source_url,
            genres: (item.genres || []).map(g => ({
              id: g.id,
              name: g.name,
              slug: g.slug,
              icon: g.icon || null
            })),
            last_chapter: item.last_chapter ? {
              id: item.last_chapter.id,
              title: item.last_chapter.title,
              slug: item.last_chapter.slug
            } : null
          };
        })
      };
    } catch (error) {
      console.error(`[ERROR] novelList: ${error.message}`);
      throw error;
    }
  }
  async novelDetail({
    slug
  }) {
    try {
      if (!slug) throw new Error("Parameter 'slug' wajib diisi.");
      const cleanSlug = slug.replace(/^\/novel\//, "").replace(/\/$/, "");
      const data = await this.req(`/novel/${cleanSlug}`);
      const props = data?.props || {};
      if (!props.manga) throw new Error("Data novel tidak ditemukan.");
      const novel = props.manga;
      const rawSynopsis = novel.synopsis || "";
      const cleanSynopsis = cheerio.load(rawSynopsis).text().trim();
      return {
        id: novel.id,
        title: novel.title,
        slug: novel.slug,
        synopsis: cleanSynopsis,
        synopsis_html: rawSynopsis,
        status: novel.status,
        poster: novel.poster,
        type: novel.type,
        author: novel.author || "-",
        artist: novel.artist || "-",
        views_count: novel.views_count,
        rank: props.mangaRank || null,
        source_url: novel.source_url,
        genres: (novel.genres || []).map(g => ({
          id: g.id,
          name: g.name,
          slug: g.slug,
          icon: g.icon || null
        })),
        first_chapter: props.firstChapter || null,
        chapters_count: (novel.chapters || []).length,
        chapters: (novel.chapters || []).map(ch => ({
          id: ch.id,
          title: ch.title,
          slug: ch.slug,
          position: ch.position,
          views_count: ch.views_count,
          created_at: ch.created_at
        })),
        related_novels: (props.relatedNovels || props.relatedMangas || []).map(rel => ({
          id: rel.id,
          title: rel.title,
          slug: rel.slug,
          poster: rel.poster,
          type: rel.type,
          status: rel.status,
          last_chapter: rel.last_chapter ? rel.last_chapter.title : null
        }))
      };
    } catch (error) {
      console.error(`[ERROR] novelDetail: ${error.message}`);
      throw error;
    }
  }
  async novelRead({
    slug,
    chapter
  }) {
    try {
      if (!slug || !chapter) throw new Error("Parameter 'slug' dan 'chapter' wajib diisi.");
      const cleanSlug = slug.replace(/^\/novel\//, "").replace(/\/$/, "");
      const cleanChapter = chapter.startsWith("chapter-") || chapter.startsWith("volume-") ? chapter : `chapter-${chapter}`;
      const data = await this.req(`/novel/${cleanSlug}/chapter/${cleanChapter}`);
      const props = data?.props || {};
      if (!props.chapter) throw new Error("Chapter novel tidak ditemukan.");
      const rawContent = props.chapter.content || "";
      const $ = cheerio.load(rawContent);
      const contentText = $("p").map((_, el) => $(el).text()?.trim()).get().filter(Boolean).join("\n\n");
      return {
        novel: {
          id: props.manga?.id,
          title: props.manga?.title,
          slug: props.manga?.slug,
          poster: props.manga?.poster
        },
        chapter: {
          id: props.chapter.id,
          title: props.chapter.title,
          slug: props.chapter.slug,
          content_text: contentText,
          content_html: rawContent
        },
        navigation: {
          prev_chapter: props.prev ? props.prev.slug : null,
          next_chapter: props.next ? props.next.slug : null
        },
        all_chapters: (props.chapters || []).map(c => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          position: c.position
        }))
      };
    } catch (error) {
      console.error(`[ERROR] novelRead: ${error.message}`);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["quick_search", "anime_list", "anime_detail", "anime_stream", "manga_list", "manga_detail", "manga_read", "novel_list", "novel_detail", "novel_read"];
  if (!action) {
    return res.status(400).json({
      status: false,
      result: {
        error: "Parameter 'action' wajib diisi.",
        available_actions: validActions,
        usage: {
          method: "GET / POST",
          examples: ["/?action=quick_search&query=One", "/?action=anime_list&page=1&query=One", "/?action=anime_detail&slug=shimoneta-to-iu-gainen-ga-sonzai-shinai-taikutsu-na-sekai", "/?action=anime_stream&slug=shimoneta-to-iu-gainen-ga-sonzai-shinai-taikutsu-na-sekai&episode=1", "/?action=manga_list&page=1&query=Shi", "/?action=manga_detail&slug=shijou-saikyou-no-mahou-kenshi-f-rank-boukensha-ni-tensei-surushijou-saikyou-no-mahou-kenshi-f-rank-boukensha-ni-tensei-suru", "/?action=manga_read&slug=shijou-saikyou-no-mahou-kenshi-f-rank-boukensha-ni-tensei-surushijou-saikyou-no-mahou-kenshi-f-rank-boukensha-ni-tensei-suru&chapter=148", "/?action=novel_list&page=1&query=Bin", "/?action=novel_detail&slug=master-pedang-dengan-bintang", "/?action=novel_read&slug=master-pedang-dengan-bintang&chapter=chapter-281"]
        }
      }
    });
  }
  const api = new AnibiPlay();
  try {
    let resultData;
    switch (action) {
      case "quick_search":
        resultData = await api.quickSearch(params);
        break;
      case "anime_list":
        resultData = await api.animeList(params);
        break;
      case "anime_detail":
        resultData = await api.animeDetail(params);
        break;
      case "anime_stream":
        resultData = await api.animeStream(params);
        break;
      case "manga_list":
        resultData = await api.mangaList(params);
        break;
      case "manga_detail":
        resultData = await api.mangaDetail(params);
        break;
      case "manga_read":
        resultData = await api.mangaRead(params);
        break;
      case "novel_list":
        resultData = await api.novelList(params);
        break;
      case "novel_detail":
        resultData = await api.novelDetail(params);
        break;
      case "novel_read":
        resultData = await api.novelRead(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          result: {
            error: `Action '${action}' tidak valid.`,
            valid_actions: validActions
          }
        });
    }
    return res.status(200).json({
      status: true,
      result: resultData
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Action '${action}':`, error);
    return res.status(500).json({
      status: false,
      result: {
        message: "Terjadi kesalahan pada parser AnibiPlay.",
        error: error.message || "Unknown Error"
      }
    });
  }
}