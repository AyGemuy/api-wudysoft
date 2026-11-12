import axios from "axios";
class PixivClient {
  constructor() {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip",
      "upgrade-insecure-requests": "1",
      "cache-control": "max-age=0",
      host: "www.pixiv.net"
    };
    this.config = null;
    this.lang = "zh";
    this.body = null;
  }
  async call({
    method,
    url,
    headers = {},
    params = {},
    data = {}
  }) {
    try {
      console.log(`[Proses] HTTP Request [${method}] -> ${url}`);
      let res = await axios({
        method: method,
        url: url,
        headers: {
          ...this.headers,
          ...headers
        },
        params: params,
        data: data,
        validateStatus: () => true
      });
      this.body = res.data;
      return this;
    } catch (error) {
      console.error(`[Error] Request Gagal ke ${url}:`, error.message);
      throw error;
    }
  }
  async ugoira({
    id
  }) {
    try {
      console.log(`[Proses] Mengambil metadata ugoira ID: ${id}`);
      return await this.call({
        method: "GET",
        url: `https://www.pixiv.net/ajax/illust/${id}/ugoira_meta`
      });
    } catch (error) {
      console.error(`[Error] Gagal mengambil ugoira ID ${id}:`, error.message);
    }
  }
  async rank({
    date = null,
    mode = "daily",
    content = null,
    p = 1
  }) {
    try {
      console.log(`[Proses] Mengambil data rank. Mode: ${mode}, Halaman: ${p}`);
      let params = {
        mode: mode,
        p: p,
        format: "json",
        ...date && {
          date: date
        },
        ...content && {
          content: content
        }
      };
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/ranking.php",
        params: params
      });
    } catch (error) {
      console.error("[Error] Gagal mengambil data rank:", error.message);
    }
  }
  async rank_new({
    date = null,
    mode = "daily",
    type = "all",
    p = 1,
    lang = "zh"
  }) {
    try {
      console.log(`[Proses] Mengambil data rank_new. Mode: ${mode}, Halaman: ${p}`);
      let customHeaders = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1"
      };
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax/ranking/illust",
        headers: customHeaders,
        params: {
          date: date,
          mode: mode,
          type: type,
          page: p,
          lang: lang
        }
      });
    } catch (error) {
      console.error("[Error] Gagal mengambil data rank_new:", error.message);
    }
  }
  async rank_ajax({
    date = null,
    mode_rank = "daily",
    content_rank = "all",
    p = 1
  }) {
    try {
      console.log(`[Proses] Mengambil data rank_ajax. Mode: ${mode_rank}, Halaman: ${p}`);
      let params = {
        mode: "ranking",
        mode_rank: mode_rank,
        content_rank: content_rank,
        p: p,
        ...date && {
          date: date
        }
      };
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax_api/ajax_api.php",
        params: params
      });
    } catch (error) {
      console.error("[Error] Gagal mengambil data rank_ajax:", error.message);
    }
  }
  async detail({
    id,
    ref = null,
    lang = "zh"
  }) {
    try {
      console.log(`[Proses] Mengambil detail ilustrasi ID: ${id}`);
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax/illust/details",
        params: {
          illust_id: id,
          lang: lang,
          ...ref && {
            ref: ref
          }
        }
      });
    } catch (error) {
      console.error(`[Error] Gagal mengambil detail ID ${id}:`, error.message);
    }
  }
  async detail_many({
    ids
  }) {
    try {
      console.log("[Proses] Mengambil detail untuk banyak ID sekaligus");
      let idsStr = Array.isArray(ids) ? ids.join(",") : ids;
      return await this.call({
        method: "GET",
        url: `https://www.pixiv.net/touch/ajax/illust/details/many?illust_ids[]=${encodeURIComponent(idsStr)}`
      });
    } catch (error) {
      console.error("[Error] Gagal mengambil banyak detail:", error.message);
    }
  }
  async comments_root({
    id,
    limit = 3,
    offset = 0,
    lang = "zh"
  }) {
    try {
      console.log(`[Proses] Mengambil akar komentar ilustrasi ID: ${id}`);
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/ajax/illusts/comments/roots",
        params: {
          illust_id: id,
          limit: limit,
          offset: offset,
          lang: lang
        }
      });
    } catch (error) {
      console.error(`[Error] Gagal mengambil akar komentar ID ${id}:`, error.message);
    }
  }
  async comment_touch({
    id,
    page = 1,
    lang = "zh"
  }) {
    try {
      console.log(`[Proses] Mengambil komentar touch ilustrasi ID: ${id}, Halaman: ${page}`);
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax/comment/illust",
        params: {
          work_id: id,
          page: page,
          lang: lang
        }
      });
    } catch (error) {
      console.error(`[Error] Gagal mengambil komentar touch ID ${id}:`, error.message);
    }
  }
  async popular({
    type = null,
    p = 1,
    mode = "popular_illust",
    lang = "zh"
  }) {
    try {
      console.log(`[Proses] Mengambil karya populer. Halaman: ${p}`);
      let params = {
        mode: mode,
        P: p,
        lang: lang,
        ...type && {
          type: type
        }
      };
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax_api/ajax_api.php",
        params: params
      });
    } catch (error) {
      console.error("[Error] Gagal mengambil karya populer:", error.message);
    }
  }
  async recommend_id({
    mode = "all",
    lang = "zh"
  }) {
    try {
      console.log("[Proses] Mengambil rekomendasi ID ilustrasi");
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax/recommender/illust",
        params: {
          mode: mode,
          lang: lang
        }
      });
    } catch (error) {
      console.error("[Error] Gagal mengambil rekomendasi ID:", error.message);
    }
  }
  async search({
    word,
    data = {}
  }) {
    try {
      console.log(`[Proses] Mencari ilustrasi touch dengan kata kunci: ${word}`);
      let params = {
        word: word,
        mode: data.mode || "safe",
        s_mode: data.s_mode || "s_tag",
        include_meta: data.include_meta || 0,
        order: data.order || "date_d",
        type: data.type || null,
        p: data.p || 1,
        wlt: data.wlt || null,
        wgt: data.wgt || null,
        hlt: data.hlt || null,
        hgt: data.hgt || null,
        ratio: data.ratio || null,
        scd: data.scd || null,
        ecd: data.ecd || null,
        blt: data.blt || null,
        bgt: data.bgt || null,
        tool: data.tool || null,
        lang: data.lang || "zh"
      };
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax/search/illusts",
        params: params
      });
    } catch (error) {
      console.error(`[Error] Gagal melakukan pencarian touch untuk kata "${word}":`, error.message);
    }
  }
  async search_pc({
    word,
    data = {}
  }) {
    try {
      console.log(`[Proses] Mencari ilustrasi PC dengan kata kunci: ${word}`);
      let params = {
        word: word,
        mode: data.mode || "all",
        s_mode: data.s_mode || "s_tag",
        order: data.order || "date_d",
        type: data.type || "all",
        p: data.p || 1,
        lang: data.lang || "zh"
      };
      return await this.call({
        method: "GET",
        url: `https://www.pixiv.net/ajax/search/artworks/${encodeURIComponent(word)}`,
        params: params
      });
    } catch (error) {
      console.error(`[Error] Gagal melakukan pencarian PC untuk kata "${word}":`, error.message);
    }
  }
  async tags({
    word
  }) {
    try {
      console.log(`[Proses] Mengambil tag untuk artwork: ${word}`);
      return await this.call({
        method: "GET",
        url: `https://www.pixiv.net/ajax/search/tags/${encodeURIComponent(word)}`
      });
    } catch (error) {
      console.error(`[Error] Gagal mengambil tag "${word}":`, error.message);
    }
  }
  async user_home({
    id,
    lang = "zh"
  }) {
    try {
      console.log(`[Proses] Mengambil halaman utama pengguna ID: ${id}`);
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax/user/home",
        params: {
          id: id,
          lang: lang
        }
      });
    } catch (error) {
      console.error(`[Error] Gagal memuat home pengguna ID ${id}:`, error.message);
    }
  }
  async user_detail({
    id,
    lang = "zh"
  }) {
    try {
      console.log(`[Proses] Mengambil rincian detail pengguna ID: ${id}`);
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax/user/details",
        params: {
          id: id,
          lang: lang
        }
      });
    } catch (error) {
      console.error(`[Error] Gagal memuat detail pengguna ID ${id}:`, error.message);
    }
  }
  async user_illusts({
    id,
    type = null,
    p = 1,
    lang = "zh"
  }) {
    try {
      console.log(`[Proses] Mengambil ilustrasi milik pengguna ID: ${id}, Halaman: ${p}`);
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax/user/illusts",
        params: {
          id: id,
          type: type,
          p: p,
          lang: lang
        }
      });
    } catch (error) {
      console.error(`[Error] Gagal memuat daftar ilustrasi pengguna ID ${id}:`, error.message);
    }
  }
  async user_bookmarks({
    id,
    type = "illust",
    p = 1,
    lang = "zh"
  }) {
    try {
      console.log(`[Proses] Mengambil bookmark milik pengguna ID: ${id}, Halaman: ${p}`);
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax/user/bookmarks",
        params: {
          id: id,
          type: type,
          p: p,
          lang: lang
        }
      });
    } catch (error) {
      console.error(`[Error] Gagal memuat bookmark pengguna ID ${id}:`, error.message);
    }
  }
  async user_info({
    id,
    full = 1
  }) {
    try {
      console.log(`[Proses] Mengambil info lengkap pengguna PC ID: ${id}`);
      return await this.call({
        method: "GET",
        url: `https://www.pixiv.net/ajax/user/${id}`,
        params: {
          full: full
        }
      });
    } catch (error) {
      console.error(`[Error] Gagal memuat info lengkap pengguna PC ID ${id}:`, error.message);
    }
  }
  async user_illust_bookmarks({
    id,
    tag = null,
    offset = 0,
    limit = 4,
    rest = "show"
  }) {
    try {
      console.log(`[Proses] Mengambil bookmark ilustrasi pengguna PC ID: ${id}`);
      return await this.call({
        method: "GET",
        url: `https://www.ajax/user/${id}/illusts/bookmarks`,
        params: {
          tag: tag,
          offset: offset,
          limit: limit,
          rest: rest
        }
      });
    } catch (error) {
      console.error(`[Error] Gagal memuat bookmark ilustrasi PC pengguna ID ${id}:`, error.message);
    }
  }
  async user_bookmark_tags({
    id
  }) {
    try {
      console.log(`[Proses] Mengambil tag bookmark pengguna ID: ${id}`);
      return await this.call({
        method: "GET",
        url: `https://www.pixiv.net/ajax/user/${id}/illusts/bookmark/tags`
      });
    } catch (error) {
      console.error(`[Error] Gagal memuat tag bookmark pengguna ID ${id}:`, error.message);
    }
  }
  async user_latest({
    id
  }) {
    try {
      console.log(`[Proses] Mengambil karya terbaru pengguna ID: ${id}`);
      return await this.call({
        method: "GET",
        url: `https://www.pixiv.net/ajax/user/${id}/works/latest`
      });
    } catch (error) {
      console.error(`[Error] Gagal memuat karya terbaru pengguna ID ${id}:`, error.message);
    }
  }
  async history({
    type = "illust",
    p = 1,
    lang = "zh"
  }) {
    try {
      console.log(`[Proses] Mengambil riwayat aktivitas. Halaman: ${p}`);
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax/history",
        params: {
          type: type,
          p: p,
          lang: lang
        }
      });
    } catch (error) {
      console.error("[Error] Gagal memuat data riwayat:", error.message);
    }
  }
  async add_bookmark({
    id,
    mode = "add_bookmark_illust",
    restrict = 0,
    tag = null,
    comment = null
  }) {
    try {
      console.log(`[Proses] Menambahkan bookmark untuk ID: ${id}`);
      let data = {
        id: id,
        mode: mode,
        restrict: restrict,
        tag: tag,
        comment: comment,
        tt: this.config ? this.config["pixiv.context.postKey"] : ""
      };
      return await this.call({
        method: "POST",
        url: "https://www.pixiv.net/touch/ajax_api/ajax_api.php",
        data: data
      });
    } catch (error) {
      console.error(`[Error] Gagal menambahkan bookmark untuk ID ${id}:`, error.message);
    }
  }
  async del_bookmark({
    id,
    mode = "delete_bookmark_illust",
    restrict = 0,
    tag = null,
    comment = null
  }) {
    try {
      console.log(`[Proses] Menghapus bookmark untuk ID: ${id}`);
      let data = {
        id: id,
        mode: mode,
        restrict: restrict,
        tag: tag,
        comment: comment,
        tt: this.config ? this.config["pixiv.context.postKey"] : ""
      };
      return await this.call({
        method: "POST",
        url: "https://www.pixiv.net/touch/ajax_api/ajax_api.php",
        data: data
      });
    } catch (error) {
      console.error(`[Error] Gagal menghapus bookmark untuk ID ${id}:`, error.message);
    }
  }
  async user_status({
    lang = "zh"
  }) {
    try {
      console.log("[Proses] Mengambil status mandiri pengguna...");
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax/user/self/status",
        params: {
          lang: lang
        }
      });
    } catch (error) {
      console.error("[Error] Gagal memuat status mandiri user:", error.message);
    }
  }
  async user_settings() {
    try {
      console.log("[Proses] Mengambil info pengaturan pengguna...");
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax/settings"
      });
    } catch (error) {
      console.error("[Error] Gagal memuat pengaturan user:", error.message);
    }
  }
  async set_restrict({
    restrict = 0,
    mode = "set_user_x_restrict"
  }) {
    try {
      console.log(`[Proses] Mengubah pembatasan konten ke: ${restrict}`);
      let data = {
        user_x_restrict: restrict,
        mode: mode,
        tt: this.config ? this.config["pixiv.context.postKey"] : ""
      };
      return await this.call({
        method: "POST",
        url: "https://www.pixiv.net/touch/ajax_api/ajax_api.php",
        data: data
      });
    } catch (error) {
      console.error("[Error] Gagal mengatur pembatasan konten:", error.message);
    }
  }
  async set_lang({
    lang = "zh_tw"
  }) {
    try {
      console.log(`[Proses] Mengubah pengaturan bahasa ke: ${lang}`);
      let data = {
        code: lang,
        tt: this.config ? this.config["pixiv.context.postKey"] : ""
      };
      return await this.call({
        method: "POST",
        url: "https://www.pixiv.net/touch/ajax/settings/language",
        data: data
      });
    } catch (error) {
      console.error("[Error] Gagal mengubah bahasa:", error.message);
    }
  }
  async set_ads({
    hide = 0,
    mode = "set_ads_status"
  }) {
    try {
      console.log(`[Proses] Mengubah status penyembunyian iklan ke: ${hide}`);
      let data = {
        ads_hide: hide,
        mode: mode,
        tt: this.config ? this.config["pixiv.context.postKey"] : ""
      };
      return await this.call({
        method: "POST",
        url: "https://www.pixiv.net/touch/ajax_api/ajax_api.php",
        data: data
      });
    } catch (error) {
      console.error("[Error] Gagal mengatur status iklan:", error.message);
    }
  }
  async tag_correlation({
    keyword
  }) {
    try {
      console.log(`[Proses] Mencari korelasi tag untuk kata kunci: ${keyword}`);
      let params = {
        keyword: keyword,
        tt: this.config ? this.config["pixiv.context.postKey"] : ""
      };
      let headers = {
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        referer: `https://www.pixiv.net/tags/${encodeURIComponent(keyword)}/artworks`
      };
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/rpc/cps.php",
        headers: headers,
        params: params
      });
    } catch (error) {
      console.error(`[Error] Gagal mencari korelasi tag untuk "${keyword}":`, error.message);
    }
  }
  async recommend_init({
    id,
    limit = 18
  }) {
    try {
      console.log(`[Proses] Inisialisasi rekomendasi karya untuk ID: ${id}`);
      let params = {
        limit: limit,
        tt: this.config ? this.config["pixiv.context.postKey"] : ""
      };
      return await this.call({
        method: "GET",
        url: `https://www.pixiv.net/ajax/illust/${id}/recommend/init`,
        params: params
      });
    } catch (error) {
      console.error(`[Error] Gagal memuat rekomendasi awal ID ${id}:`, error.message);
    }
  }
  async user_profile_top({
    id
  }) {
    try {
      console.log(`[Proses] Mengambil data profil atas pengguna ID: ${id}`);
      let params = {
        tt: this.config ? this.config["pixiv.context.postKey"] : ""
      };
      return await this.call({
        method: "GET",
        url: `https://www.pixiv.net/ajax/user/${id}/profile/top`,
        params: params
      });
    } catch (error) {
      console.error(`[Error] Gagal memuat profil atas pengguna ID ${id}:`, error.message);
    }
  }
  async user_profile_all({
    id
  }) {
    try {
      console.log(`[Proses] Mengambil profil lengkap pengguna ID: ${id}`);
      return await this.call({
        method: "GET",
        url: `https://www.pixiv.net/ajax/user/${id}/profile/all`,
        params: {
          lang: this.lang
        }
      });
    } catch (error) {
      console.error(`[Error] Gagal memuat profil lengkap pengguna ID ${id}:`, error.message);
    }
  }
  async popular_r18({
    type = null,
    p = 1
  }) {
    try {
      console.log(`[Proses] Mengambil ilustrasi populer kategori R18 hlm: ${p}`);
      let params = {
        p: p,
        ...type && {
          type: type
        }
      };
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax_api/ajax_api.php",
        params: params
      });
    } catch (error) {
      console.error("[Error] Gagal memuat popular R18:", error.message);
    }
  }
  async index_top({
    mode = "all",
    lang = "zh"
  }) {
    try {
      console.log("[Proses] Mengambil data ilustrasi teratas beranda (index_top)...");
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/ajax/top/illust",
        params: {
          mode: mode,
          lang: lang
        }
      });
    } catch (error) {
      console.error("[Error] Gagal memuat index_top:", error.message);
    }
  }
  async tags_frequent({
    ids
  }) {
    try {
      console.log("[Proses] Mengambil tag yang sering muncul untuk kumpulan ID");
      let idsStr = Array.isArray(ids) ? ids.map(id => `ids[]=${id}`).join("&") : `ids[]=${ids}`;
      return await this.call({
        method: "GET",
        url: `https://www.pixiv.net/ajax/tags/frequent/illust?${idsStr}`
      });
    } catch (error) {
      console.error("[Error] Gagal mengambil tag frequent:", error.message);
    }
  }
  async user_profile_illusts({
    id,
    ids,
    work_category = "illustManga",
    is_first_page = 1
  }) {
    try {
      console.log(`[Proses] Mengambil data ilustrasi profil pengguna ID: ${id}`);
      let idsStr = Array.isArray(ids) ? ids.map(i => `ids[]=${i}`).join("&") : `ids[]=${ids}`;
      return await this.call({
        method: "GET",
        url: `https://www.pixiv.net/ajax/user/${id}/profile/illusts?${idsStr}&work_category=${work_category}&is_first_page=${is_first_page}`
      });
    } catch (error) {
      console.error(`[Error] Gagal memuat karya ilustrasi profil user ID ${id}:`, error.message);
    }
  }
  async user_illusts_tag({
    id,
    tag,
    offset = 0,
    limit = 48
  }) {
    try {
      console.log(`[Proses] Mengambil karya pengguna ID ${id} berdasarkan tag: ${tag}`);
      let params = {
        tag: tag,
        offset: offset,
        limit: limit,
        tt: this.config ? this.config["pixiv.context.postKey"] : ""
      };
      return await this.call({
        method: "GET",
        url: `https://www.pixiv.net/ajax/user/${id}/illusts/tag`,
        params: params
      });
    } catch (error) {
      console.error(`[Error] Gagal memuat karya pengguna ID ${id} berdasarkan tag:`, error.message);
    }
  }
  async recommend_users({
    ids,
    user_num = 30,
    work_num = 5
  }) {
    try {
      console.log("[Proses] Mengambil rekomendasi daftar pengguna...");
      let params = {
        mode: "get_recommend_users_and_works_by_user_ids",
        user_num: user_num,
        work_num: work_num,
        user_ids: Array.isArray(ids) ? ids.join(",") : ids
      };
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/rpc/index.php",
        params: params
      });
    } catch (error) {
      console.error("[Error] Gagal memuat rekomendasi user:", error.message);
    }
  }
  async recommend_illust_list({
    ids,
    exclude_muted_illusts = 1
  }) {
    try {
      console.log("[Proses] Mengambil daftar ilustrasi yang direkomendasikan PC...");
      let params = {
        page: "discover",
        exclude_muted_illusts: exclude_muted_illusts,
        illust_ids: Array.isArray(ids) ? ids.join(",") : ids
      };
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/rpc/illust_list.php",
        params: params
      });
    } catch (error) {
      console.error("[Error] Gagal memuat daftar rekomendasi ilustrasi:", error.message);
    }
  }
  async illust_new_pc({
    lastId = 0,
    limit = 20,
    type = "illust",
    r18 = false
  }) {
    try {
      console.log("[Proses] Mengambil data ilustrasi terbaru versi PC...");
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/ajax/illust/new",
        params: {
          lastId: lastId,
          limit: limit,
          type: type,
          r18: r18
        }
      });
    } catch (error) {
      console.error("[Error] Gagal memuat data ilustrasi terbaru PC:", error.message);
    }
  }
  async user_history({
    type = "illust",
    offset = 0
  }) {
    try {
      console.log("[Proses] Mengambil data riwayat jelajah pengguna versi PC...");
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/ajax/history",
        params: {
          type: type,
          offset: offset
        }
      });
    } catch (error) {
      console.error("[Error] Gagal memuat riwayat PC user:", error.message);
    }
  }
  async get_user_profile({
    ids,
    illust_num = 3,
    novel_num = 3
  }) {
    try {
      console.log("[Proses] Mengambil data profil ringkas dari kumpulan ID user...");
      let params = {
        user_ids: Array.isArray(ids) ? ids.join(",") : ids,
        illust_num: illust_num,
        novel_num: novel_num
      };
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/rpc/get_profile.php",
        params: params
      });
    } catch (error) {
      console.error("[Error] Gagal memuat data rpc profil pengguna:", error.message);
    }
  }
  async user_extra() {
    try {
      console.log("[Proses] Mengambil data ekstra pengguna saat ini...");
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/ajax/user/extra"
      });
    } catch (error) {
      console.error("[Error] Gagal mengambil data user extra:", error.message);
    }
  }
  async illust_bookmarks({
    id,
    p = 1
  }) {
    try {
      console.log(`[Proses] Mendapatkan daftar user yang melakukan bookmark pada ilustrasi ID: ${id}`);
      let customHeaders = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1"
      };
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/touch/ajax_api/ajax_api.php",
        headers: customHeaders,
        params: {
          mode: "illust_bookmarks",
          id: id,
          p: p
        }
      });
    } catch (error) {
      console.error(`[Error] Gagal memuat bookmark ilustrasi user pada ID ${id}:`, error.message);
    }
  }
  async tag_stories({
    tag,
    lang = "zh"
  }) {
    try {
      console.log(`[Proses] Mengambil data tag_stories untuk tag: ${tag}`);
      return await this.call({
        method: "GET",
        url: "https://www.pixiv.net/ajax/stories/tag_stories",
        params: {
          tag: tag,
          lang: lang
        }
      });
    } catch (error) {
      console.error(`[Error] Gagal mengambil data cerita tag "${tag}":`, error.message);
    }
  }
  async contest({
    name,
    order = "date",
    p = 1
  }) {
    try {
      console.log(`[Proses] Mengambil entri kontes bernama: ${name}, Halaman: ${p}`);
      return await this.call({
        method: "GET",
        url: `https://www.pixiv.net/ajax/contest/${name}/entries`,
        params: {
          order: order,
          p: p
        }
      });
    } catch (error) {
      console.error(`[Error] Gagal memuat entri kontes "${name}":`, error.message);
    }
  }
  async unify_config() {
    try {
      console.log("[Proses] Memperoleh unify_config via web...");
      let r = await this.call({
        method: "GET",
        url: "https://www.pixiv.net/stacc/?mode=unify"
      });
      let match = String(r.body).match(/id="init-config-input"[^>]*value="([^"]*)"/);
      return JSON.parse(match ? match[1] : "{}");
    } catch (error) {
      console.error("[Error] Gagal memproses unify_config:", error.message);
      return {};
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["ugoira", "rank", "rank_new", "rank_ajax", "detail", "detail_many", "comments_root", "comment_touch", "popular", "recommend_id", "search", "search_pc", "tags", "user_home", "user_detail", "user_illusts", "user_bookmarks", "user_info", "user_illust_bookmarks", "user_bookmark_tags", "user_latest", "history", "add_bookmark", "del_bookmark", "user_status", "user_settings", "set_restrict", "set_lang", "set_ads", "tag_correlation", "recommend_init", "user_profile_top", "user_profile_all", "popular_r18", "index_top", "tags_frequent", "user_profile_illusts", "user_illusts_tag", "recommend_users", "recommend_illust_list", "illust_new_pc", "user_history", "get_user_profile", "user_extra", "illust_bookmarks", "tag_stories", "contest"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          search: "/?action=search&word=vocaloid",
          detail: "/?action=detail&id=112233",
          rank: "/?action=rank&mode=weekly",
          user_info: "/?action=user_info&id=445566"
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
  const api = new PixivClient();
  try {
    let resultInstance;
    switch (action) {
      case "recommend_id":
        resultInstance = await api.recommend_id(params);
        break;
      case "history":
        resultInstance = await api.history(params);
        break;
      case "user_status":
        resultInstance = await api.user_status(params);
        break;
      case "user_settings":
        resultInstance = await api.user_settings();
        break;
      case "index_top":
        resultInstance = await api.index_top(params);
        break;
      case "illust_new_pc":
        resultInstance = await api.illust_new_pc(params);
        break;
      case "user_history":
        resultInstance = await api.user_history(params);
        break;
      case "user_extra":
        resultInstance = await api.user_extra();
        break;
      case "search":
        if (!params.word) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'word' wajib diisi untuk action 'search'.",
            example: "/?action=search&word=vocaloid"
          });
        }
        resultInstance = await api.search(params.word, params);
        break;
      case "search_pc":
        if (!params.word) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'word' wajib diisi untuk action 'search_pc'.",
            example: "/?action=search_pc&word=vocaloid"
          });
        }
        resultInstance = await api.search_pc(params.word, params);
        break;
      case "tags":
        if (!params.word) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'word' wajib diisi untuk action 'tags'.",
            example: "/?action=tags&word=vocaloid"
          });
        }
        resultInstance = await api.tags({
          word: params.word
        });
        break;
      case "tag_correlation":
        if (!params.keyword) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'keyword' wajib diisi untuk action 'tag_correlation'.",
            example: "/?action=tag_correlation&keyword=vocaloid"
          });
        }
        resultInstance = await api.tag_correlation({
          keyword: params.keyword
        });
        break;
      case "tag_stories":
        if (!params.tag) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'tag' wajib diisi untuk action 'tag_stories'.",
            example: "/?action=tag_stories&tag=vocaloid"
          });
        }
        resultInstance = await api.tag_stories(params);
        break;
      case "ugoira":
      case "detail":
      case "comments_root":
      case "comment_touch":
      case "recommend_init":
      case "illust_bookmarks":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: `Parameter 'id' (illust ID) wajib diisi untuk action '${action}'.`,
            example: `/?action=${action}&id=112233`
          });
        }
        resultInstance = await api[action](params);
        break;
      case "user_home":
      case "user_detail":
      case "user_illusts":
      case "user_bookmarks":
      case "user_info":
      case "user_illust_bookmarks":
      case "user_bookmark_tags":
      case "user_latest":
      case "user_profile_top":
      case "user_profile_all":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: `Parameter 'id' (user ID) wajib diisi untuk action '${action}'.`,
            example: `/?action=${action}&id=445566`
          });
        }
        resultInstance = await api[action](params);
        break;
      case "detail_many":
      case "tags_frequent":
      case "recommend_users":
      case "recommend_illust_list":
      case "get_user_profile":
        if (!params.ids) {
          return res.status(400).json({
            status: false,
            error: `Parameter 'ids' wajib diisi untuk action '${action}'.`,
            example: `/?action=${action}&ids=112233,445566`
          });
        }
        resultInstance = await api[action](params);
        break;
      case "user_profile_illusts":
        if (!params.id || !params.ids) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' dan 'ids' wajib diisi untuk action 'user_profile_illusts'.",
            example: "/?action=user_profile_illusts&id=445566&ids=112233"
          });
        }
        resultInstance = await api.user_profile_illusts(params);
        break;
      case "user_illusts_tag":
        if (!params.id || !params.tag) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' dan 'tag' wajib diisi untuk action 'user_illusts_tag'.",
            example: "/?action=user_illusts_tag&id=445566&tag=vocaloid"
          });
        }
        resultInstance = await api.user_illusts_tag(params);
        break;
      case "rank":
      case "rank_new":
      case "rank_ajax":
      case "popular":
      case "popular_r18":
        resultInstance = await api[action](params);
        break;
      case "add_bookmark":
      case "del_bookmark":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: `Parameter 'id' wajib diisi untuk action '${action}'.`,
            example: `/?action=${action}&id=112233`
          });
        }
        resultInstance = await api[action](params);
        break;
      case "set_restrict":
        resultInstance = await api.set_restrict(params);
        break;
      case "set_lang":
        resultInstance = await api.set_lang(params);
        break;
      case "set_ads":
        resultInstance = await api.set_ads(params);
        break;
      case "contest":
        if (!params.name) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'name' kontes wajib diisi untuk action 'contest'.",
            example: "/?action=contest&name=pixiv_contest"
          });
        }
        resultInstance = await api.contest(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!resultInstance || !resultInstance.body) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari server Pixiv. Coba lagi nanti."
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      result: resultInstance.body || resultInstance
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