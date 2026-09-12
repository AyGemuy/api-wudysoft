import axios from "axios";
class IDN {
  constructor() {
    this.def_build = "4J7lPVMz1jKGEcG-AJqwl";
    this.def_api_key = "123f4c4e-6ce1-404d-8786-d17e46d65b5c";
    this.def_session = "0636e5c8-e499-4710-ace2-f4b0dc98711a";
    this.def_req_id = `_${Date.now()}`;
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.base_gumlet_api = "https://api-gumlet.idn.app";
    this.base_idntimes_web = "https://www.idntimes.com";
    this.ua_scraping = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    this.gql_streams = `
      query GetLivestream($category: String, $page: Int){
        getLivestreams(category: $category, page: $page){
          slug title image_url view_count playback_url room_identifier status
          scheduled_at live_at live_type
          category { name slug }
          creator { name username uuid }
        }
      }`;
    this.gql_headline = `{
      getLivestreamHeadline{
        title slug image_url playback_url status live_at scheduled_at
        category { name slug }
        creator { name username uuid }
      }
    }`;
    this.gql_related = `
      query getRelatedLivestream($slug: String!){
        getRelatedLivestream(slug: $slug){
          result{
            title image_url slug view_count scheduled_at live_at
            creator { name avatar username uuid }
            category { name slug }
          }
        }
      }`;
    this.build_id = this.def_build;
    const final_api_key = this.def_api_key;
    const final_session_id = this.def_session;
    const base_headers = {
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-mode": "cors",
      "user-agent": this.ua
    };
    this.web = axios.create({
      baseURL: "https://www.idn.app",
      headers: {
        ...base_headers,
        "x-nextjs-data": "1",
        "sec-fetch-dest": "empty",
        "sec-fetch-site": "same-origin"
      }
    });
    this.api = axios.create({
      baseURL: "https://api.idn.app",
      headers: {
        ...base_headers,
        accept: "application/json, text/plain, */*",
        origin: "https://www.idn.app",
        referer: "https://www.idn.app/",
        "sec-fetch-dest": "empty",
        "sec-fetch-site": "same-site",
        "session-id": final_session_id,
        "x-api-key": final_api_key,
        "x-request-id": this.def_req_id
      }
    });
    this.mobile = axios.create({
      baseURL: "https://mobile-api.idn.app",
      headers: {
        ...base_headers,
        accept: "application/json, text/plain, */*",
        origin: "https://www.idn.app",
        referer: "https://www.idn.app/",
        "sec-fetch-dest": "empty",
        "sec-fetch-site": "same-site",
        "x-api-key": "1ccc5bc4-8bb4-414c-b524-92d11a85a818",
        "x-request-id": this.def_req_id
      }
    });
    this.gumlet = axios.create({
      baseURL: this.base_gumlet_api,
      headers: {
        "User-Agent": "okhttp/4.9.3",
        Accept: "application/json"
      }
    });
    this.scraper = axios.create({
      baseURL: this.base_idntimes_web,
      headers: {
        "User-Agent": this.ua_scraping,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
  }
  parse_query(query = "") {
    try {
      console.log("[start] parse_query");
      const url_match = query.match(/idn\.app\/([^/]+)(?:\/live\/([^/?#]+))?/);
      if (url_match) {
        const result = {
          username: url_match[1] || null,
          slug: url_match[2] || null
        };
        console.log("[ok] parse_query");
        return result;
      }
      if (/\-\d{15,}$/.test(query)) {
        console.log("[ok] parse_query");
        return {
          username: null,
          slug: query
        };
      }
      console.log("[ok] parse_query");
      return {
        username: query || null,
        slug: null
      };
    } catch (err) {
      console.error("[error] parse_query =>", err.message || err);
      return {
        username: null,
        slug: null
      };
    }
  }
  async safe_execute(label, fn) {
    try {
      console.log(`[start] [safe_execute] ${label}`);
      const res = await fn();
      console.log(`[ok]    [safe_execute] ${label}`);
      return res;
    } catch (err) {
      console.warn(`[skip]  [safe_execute] ${label} =>`, err?.response?.data?.message || err?.message || err);
      return null;
    }
  }
  extract_html_articles(html) {
    try {
      console.log("[start] extract_html_articles");
      const out = [];
      const matched = html.matchAll(/<h[23][^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gs);
      for (const m of matched) {
        const t = m[2].replace(/<[^>]+>/g, "").trim();
        const u = m[1].startsWith("http") ? m[1] : `${this.base_idntimes_web}${m[1]}`;
        if (t && t.length > 10 && !out.find(x => x.url === u)) {
          out.push({
            title: t,
            url: u
          });
        }
      }
      if (!out.length) {
        const fallback = html.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gs);
        for (const m of fallback) {
          const t = m[1].replace(/<[^>]+>/g, "").trim();
          if (t && t.length > 15) out.push({
            title: t
          });
        }
      }
      console.log(`[ok] extract_html_articles, found: ${out.length} items`);
      return out;
    } catch (err) {
      console.error("[error] extract_html_articles =>", err.message || err);
      return [];
    }
  }
  async search_it({
    q,
    ...rest
  } = {}) {
    if (!q) throw new Error('Parameter "q" (keyword) is required for search_it');
    try {
      console.log(`[start] search_it query: ${q}`);
      const {
        data: html
      } = await this.scraper.get("/search", {
        params: {
          q: q
        },
        ...rest
      });
      const extracted = this.extract_html_articles(html);
      console.log("[ok] search_it");
      return extracted;
    } catch (err) {
      console.error("[error] search_it =>", err.message || err);
      return [];
    }
  }
  async get_live_cats({
    ...rest
  } = {}) {
    try {
      console.log("[start] get_live_cats");
      const {
        data
      } = await this.gumlet.get("/api/v3/livestream/categories", {
        ...rest
      });
      console.log("[ok] get_live_cats");
      return data?.data || [];
    } catch (err) {
      console.error("[error] get_live_cats =>", err.message || err);
      return [];
    }
  }
  async get_streams({
    ...rest
  } = {}) {
    try {
      console.log("[start] get_streams");
      const {
        data
      } = await this.gumlet.get("/api/v4/livestreams", {
        ...rest
      });
      console.log("[ok] get_streams");
      return data?.data || [];
    } catch (err) {
      console.error("[error] get_streams =>", err.message || err);
      return [];
    }
  }
  async stream_detail({
    slug,
    ...rest
  } = {}) {
    if (!slug) throw new Error('Parameter "slug" is required for stream_detail');
    try {
      console.log(`[start] stream_detail slug: ${slug}`);
      const {
        data
      } = await this.gumlet.get(`/api/v4/livestream/${slug}`, {
        ...rest
      });
      console.log("[ok] stream_detail");
      return data?.data || null;
    } catch (err) {
      console.error("[error] stream_detail =>", err.message || err);
      return null;
    }
  }
  async read_article({
    slug,
    ...rest
  } = {}) {
    if (!slug) throw new Error('Parameter "slug" is required for read_article');
    try {
      console.log(`[start] read_article path/url: ${slug}`);
      const is_full_url = slug.startsWith("http");
      const target_url = is_full_url ? slug : `/${slug}`;
      const {
        data: html
      } = is_full_url ? await axios.get(slug, {
        headers: {
          "User-Agent": this.ua_scraping,
          Accept: "text/html"
        },
        ...rest
      }) : await this.scraper.get(target_url, {
        ...rest
      });
      const res = {
        url: is_full_url ? slug : `${this.base_idntimes_web}${target_url}`,
        title: null,
        body: []
      };
      const h1 = html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gs);
      for (const m of h1) {
        const t = m[1].replace(/<[^>]+>/g, "").trim();
        if (t && t.length > 10) {
          res.title = t;
          break;
        }
      }
      const paras = html.matchAll(/<p[^>]*>(.*?)<\/p>/gs);
      for (const m of paras) {
        const t = m[1].replace(/<[^>]+>/g, "").trim();
        if (t && t.length > 30) res.body.push(t);
      }
      console.log("[ok] read_article");
      return res;
    } catch (err) {
      console.error("[error] read_article =>", err.message || err);
      return {
        url: slug,
        title: null,
        body: []
      };
    }
  }
  async get_news({
    cat = "news/indonesia",
    ...rest
  } = {}) {
    try {
      console.log(`[start] get_news category: ${cat}`);
      const path = cat === "tekno" ? "tech" : cat;
      const {
        data: html
      } = await this.scraper.get(`/${path}`, {
        ...rest
      });
      const extracted = this.extract_html_articles(html);
      console.log("[ok] get_news");
      return extracted;
    } catch (err) {
      console.error("[error] get_news =>", err.message || err);
      return [];
    }
  }
  async f_profile({
    username,
    ...rest
  } = {}) {
    if (!username) throw new Error('Parameter "username" is required for f_profile');
    try {
      console.log(`[start] f_profile for ${username}`);
      const {
        data
      } = await this.web.get(`/_next/data/${this.build_id}/${username}.json`, {
        params: {
          username: username
        },
        ...rest
      });
      console.log("[ok] f_profile");
      return data?.pageProps || null;
    } catch (err) {
      console.error("[error] f_profile =>", err.message || err);
      return null;
    }
  }
  async f_gql({
    query,
    variables = {},
    ...rest
  } = {}) {
    if (!query) throw new Error('Parameter "query" (GraphQL) is required for f_gql');
    try {
      console.log("[start] f_gql");
      const {
        data
      } = await this.api.post("/graphql", {
        query: query,
        variables: variables
      }, {
        ...rest
      });
      console.log("[ok] f_gql");
      return data?.data || null;
    } catch (err) {
      console.error("[error] f_gql =>", err.message || err);
      return null;
    }
  }
  async f_streams({
    category = "all",
    page = 1,
    ...rest
  } = {}) {
    try {
      console.log("[start] f_streams");
      const res = await this.f_gql({
        query: this.gql_streams,
        variables: {
          category: category,
          page: page
        },
        ...rest
      });
      console.log("[ok] f_streams");
      return res?.getLivestreams || [];
    } catch (err) {
      console.error("[error] f_streams =>", err.message || err);
      return [];
    }
  }
  async f_headline({
    ...rest
  } = {}) {
    try {
      console.log("[start] f_headline");
      const res = await this.f_gql({
        query: this.gql_headline,
        ...rest
      });
      console.log("[ok] f_headline");
      return res?.getLivestreamHeadline || [];
    } catch (err) {
      console.error("[error] f_headline =>", err.message || err);
      return [];
    }
  }
  async f_related({
    slug,
    ...rest
  } = {}) {
    if (!slug) throw new Error('Parameter "slug" is required for f_related');
    try {
      console.log(`[start] f_related for ${slug}`);
      const res = await this.f_gql({
        query: this.gql_related,
        variables: {
          slug: slug
        },
        ...rest
      });
      console.log("[ok] f_related");
      return res?.getRelatedLivestream?.result || [];
    } catch (err) {
      console.error("[error] f_related =>", err.message || err);
      return [];
    }
  }
  async f_top_all({
    uuidStreamer,
    type = "daily",
    n = 10,
    ...rest
  } = {}) {
    if (!uuidStreamer) throw new Error('Parameter "uuidStreamer" is required for f_top_all');
    try {
      console.log(`[start] f_top_all for ${uuidStreamer}`);
      const {
        data
      } = await this.api.get("/api/v1/gift/livestream/top-gifter/all", {
        params: {
          type: type,
          uuid_streamer: uuidStreamer,
          n: n
        },
        ...rest
      });
      console.log("[ok] f_top_all");
      return data?.data || [];
    } catch (err) {
      console.error("[error] f_top_all =>", err.message || err);
      return [];
    }
  }
  async f_top_slug({
    slug,
    n = 10,
    ...rest
  } = {}) {
    if (!slug) throw new Error('Parameter "slug" is required for f_top_slug');
    try {
      console.log(`[start] f_top_slug for ${slug}`);
      const {
        data
      } = await this.api.get(`/api/v1/gift/livestream/${slug}/top-gifter`, {
        params: {
          n: n
        },
        ...rest
      });
      console.log("[ok] f_top_slug");
      return data?.data || [];
    } catch (err) {
      console.error("[error] f_top_slug =>", err.message || err);
      return [];
    }
  }
  async f_lives({
    uuid,
    ...rest
  } = {}) {
    if (!uuid) throw new Error('Parameter "uuid" is required for f_lives');
    try {
      console.log(`[start] f_lives for ${uuid}`);
      const {
        data
      } = await this.mobile.get("/v3/profile/livestreams", {
        params: {
          uuid: uuid
        },
        ...rest
      });
      console.log("[ok] f_lives");
      return data?.data || [];
    } catch (err) {
      console.error("[error] f_lives =>", err.message || err);
      return [];
    }
  }
  async f_plus({
    n = 10,
    ...rest
  } = {}) {
    try {
      console.log("[start] f_plus");
      const {
        data
      } = await this.api.get("/api/v4/livestreams", {
        params: {
          category: "idnliveplus",
          n: n
        },
        ...rest
      });
      console.log("[ok] f_plus");
      return data?.data || [];
    } catch (err) {
      console.error("[error] f_plus =>", err.message || err);
      return [];
    }
  }
  async f_categories({
    n = 10,
    ...rest
  } = {}) {
    try {
      console.log("[start] f_categories");
      const {
        data
      } = await this.api.get("/api/v1/web/livestream/categories", {
        params: {
          has_live_room: true,
          n: n
        },
        ...rest
      });
      console.log("[ok] f_categories");
      return data?.data || [];
    } catch (err) {
      console.error("[error] f_categories =>", err.message || err);
      return [];
    }
  }
  async detailed({
    query,
    type = "daily",
    n = 10,
    category = "all",
    page = 1,
    ...rest
  } = {}) {
    if (!query) throw new Error('Parameter "query" is required for detailed');
    try {
      console.log("[start] detailed processing");
      const {
        username,
        slug
      } = this.parse_query(query);
      console.log("[detailed] query =>", query, "| parsed =>", {
        username: username,
        slug: slug
      });
      const result = {};
      for (const [key, fn] of [
          ["categories", () => this.f_categories({
            n: n,
            ...rest
          })],
          ["headline", () => this.f_headline({
            ...rest
          })],
          ["streams", () => this.f_streams({
            category: category,
            page: page,
            ...rest
          })],
          ["plus", () => this.f_plus({
            n: n,
            ...rest
          })]
        ]) {
        result[key] = await this.safe_execute(key, fn);
      }
      if (username) {
        result.profile = await this.safe_execute("profile", () => this.f_profile({
          username: username,
          ...rest
        }));
      }
      if (slug) {
        for (const [key, fn] of [
            ["topGifterSlug", () => this.f_top_slug({
              slug: slug,
              n: n,
              ...rest
            })],
            ["related", () => this.f_related({
              slug: slug,
              ...rest
            })]
          ]) {
          result[key] = await this.safe_execute(key, fn);
        }
      }
      const uuid = result.profile?.profile?.uuid;
      if (uuid) {
        for (const [key, fn] of [
            ["topGifterAll", () => this.f_top_all({
              uuidStreamer: uuid,
              type: type,
              n: n,
              ...rest
            })],
            ["lives", () => this.f_lives({
              uuid: uuid,
              ...rest
            })]
          ]) {
          result[key] = await this.safe_execute(key, fn);
        }
        const live_slug = result.lives?.[0]?.slug;
        if (live_slug && !slug) {
          console.log("[detailed] live slug =>", live_slug);
          for (const [key, fn] of [
              ["topGifterSlug", () => this.f_top_slug({
                slug: live_slug,
                n: n,
                ...rest
              })],
              ["related", () => this.f_related({
                slug: live_slug,
                ...rest
              })]
            ]) {
            result[key] = await this.safe_execute(key, fn);
          }
        }
      }
      console.log("[ok] detailed selesai. keys =>", Object.keys(result).join(", "));
      return result;
    } catch (err) {
      console.error("[error] detailed =>", err.message || err);
      return {};
    }
  }
  async search({
    type,
    keyword,
    page = 1,
    ...rest
  } = {}) {
    if (!type || !keyword) throw new Error('Parameters "type" and "keyword" are required for search');
    try {
      console.log("[start] search");
      const res = await this.safe_execute("search", async () => {
        const {
          data
        } = await this.mobile.get("/v3/search", {
          params: {
            type: type,
            keyword: keyword,
            page: page
          },
          ...rest
        });
        return data?.data || [];
      });
      console.log("[ok] search");
      return res;
    } catch (err) {
      console.error("[error] search =>", err.message || err);
      return [];
    }
  }
  async rec_article({
    ...rest
  } = {}) {
    try {
      console.log("[start] rec_article");
      const res = await this.safe_execute("rec_article", async () => {
        const {
          data
        } = await this.mobile.get("/v3/recommendation-article", {
          ...rest
        });
        return data?.data || [];
      });
      console.log("[ok] rec_article");
      return res;
    } catch (err) {
      console.error("[error] rec_article =>", err.message || err);
      return [];
    }
  }
  async rec_quiz({
    ...rest
  } = {}) {
    try {
      console.log("[start] rec_quiz");
      const res = await this.safe_execute("rec_quiz", async () => {
        const {
          data
        } = await this.mobile.get("/v3.1/quiz/recommendation", {
          ...rest
        });
        return data?.data || [];
      });
      console.log("[ok] rec_quiz");
      return res;
    } catch (err) {
      console.error("[error] rec_quiz =>", err.message || err);
      return [];
    }
  }
  async search_country({
    country,
    page = 1,
    ...rest
  } = {}) {
    if (!country) throw new Error('Parameter "country" is required for search_country');
    try {
      console.log("[start] search_country");
      const res = await this.safe_execute("search_country", async () => {
        const {
          data
        } = await this.mobile.get("/v3/idn-account/search/country", {
          params: {
            country: country,
            page: page
          },
          ...rest
        });
        return data?.data || null;
      });
      console.log("[ok] search_country");
      return res;
    } catch (err) {
      console.error("[error] search_country =>", err.message || err);
      return null;
    }
  }
  async search_province({
    province,
    countrySlug,
    page = 1,
    ...rest
  } = {}) {
    if (!province || !countrySlug) throw new Error('Parameters "province" and "countrySlug" are required for search_province');
    try {
      console.log("[start] search_province");
      const res = await this.safe_execute("search_province", async () => {
        const {
          data
        } = await this.mobile.get("/v3/idn-account/search/province", {
          params: {
            province: province,
            country_slug: countrySlug,
            page: page
          },
          ...rest
        });
        return data?.data || null;
      });
      console.log("[ok] search_province");
      return res;
    } catch (err) {
      console.error("[error] search_province =>", err.message || err);
      return null;
    }
  }
  async search_city({
    city,
    provinceSlug,
    page = 1,
    ...rest
  } = {}) {
    if (!city || !provinceSlug) throw new Error('Parameters "city" and "provinceSlug" are required for search_city');
    try {
      console.log("[start] search_city");
      const res = await this.safe_execute("search_city", async () => {
        const {
          data
        } = await this.mobile.get("/v3/idn-account/search/city", {
          params: {
            city: city,
            province_slug: provinceSlug,
            page: page
          },
          ...rest
        });
        return data?.data || null;
      });
      console.log("[ok] search_city");
      return res;
    } catch (err) {
      console.error("[error] search_city =>", err.message || err);
      return null;
    }
  }
  async live_categories({
    hasLiveRooms = true,
    ...rest
  } = {}) {
    try {
      console.log("[start] live_categories");
      const res = await this.safe_execute("live_categories", async () => {
        const {
          data
        } = await this.mobile.get("/v3/livestream/categories", {
          params: {
            has_live_room: hasLiveRooms
          },
          ...rest
        });
        return data?.data || [];
      });
      console.log("[ok] live_categories");
      return res;
    } catch (err) {
      console.error("[error] live_categories =>", err.message || err);
      return [];
    }
  }
  async create_room({
    title,
    category,
    scheduledAt,
    cover,
    ...rest
  } = {}) {
    if (!title || !category) throw new Error('Parameters "title" and "category" are required for create_room');
    try {
      console.log("[start] create_room");
      const res = await this.safe_execute("create_room", async () => {
        const payload = {
          title: title,
          category: category,
          scheduled_at: scheduledAt,
          cover: cover
        };
        const {
          data
        } = await this.mobile.post("/v3/livestream", payload, {
          ...rest
        });
        return data?.data || null;
      });
      console.log("[ok] create_room");
      return res;
    } catch (err) {
      console.error("[error] create_room =>", err.message || err);
      return null;
    }
  }
  async end_live({
    slug,
    duration,
    ...rest
  } = {}) {
    if (!slug) throw new Error('Parameter "slug" is required for end_live');
    try {
      console.log("[start] end_live");
      const res = await this.safe_execute("end_live", async () => {
        const {
          data
        } = await this.mobile.post(`/v3/livestream/${slug}/end`, null, {
          params: {
            live_duration: duration
          },
          ...rest
        });
        return data;
      });
      console.log("[ok] end_live");
      return res;
    } catch (err) {
      console.error("[error] end_live =>", err.message || err);
      return null;
    }
  }
  async live_room({
    slug,
    ...rest
  } = {}) {
    if (!slug) throw new Error('Parameter "slug" is required for live_room');
    try {
      console.log("[start] live_room");
      const res = await this.safe_execute("live_room", async () => {
        const {
          data
        } = await this.mobile.get(`/v3.1/livestream/${slug}`, {
          ...rest
        });
        return data?.data || null;
      });
      console.log("[ok] live_room");
      return res;
    } catch (err) {
      console.error("[error] live_room =>", err.message || err);
      return null;
    }
  }
  async live_stat({
    slug,
    ...rest
  } = {}) {
    if (!slug) throw new Error('Parameter "slug" is required for live_stat');
    try {
      console.log("[start] live_stat");
      const res = await this.safe_execute("live_stat", async () => {
        const {
          data
        } = await this.mobile.get(`/v3/livestream/${slug}/statistic`, {
          ...rest
        });
        return data?.data || null;
      });
      console.log("[ok] live_stat");
      return res;
    } catch (err) {
      console.error("[error] live_stat =>", err.message || err);
      return null;
    }
  }
  async live_rooms({
    category = "all",
    page = 1,
    ...rest
  } = {}) {
    try {
      console.log("[start] live_rooms");
      const res = await this.safe_execute("live_rooms", async () => {
        const {
          data
        } = await this.mobile.get("/v3/livestreams", {
          params: {
            category: category,
            page: page
          },
          ...rest
        });
        return data?.data || [];
      });
      console.log("[ok] live_rooms");
      return res;
    } catch (err) {
      console.error("[error] live_rooms =>", err.message || err);
      return [];
    }
  }
  async refresh_entity({
    ...rest
  } = {}) {
    try {
      console.log("[start] refresh_entity");
      const res = await this.safe_execute("refresh_entity", async () => {
        const {
          data
        } = await this.mobile.post("/v3/entity/refresh", null, {
          ...rest
        });
        return data?.data || null;
      });
      console.log("[ok] refresh_entity");
      return res;
    } catch (err) {
      console.error("[error] refresh_entity =>", err.message || err);
      return null;
    }
  }
  async scheduled_lives({
    ...rest
  } = {}) {
    try {
      console.log("[start] scheduled_lives");
      const res = await this.safe_execute("scheduled_lives", async () => {
        const {
          data
        } = await this.mobile.get("/v3/livestream/scheduled-live", {
          ...rest
        });
        return data?.data || [];
      });
      console.log("[ok] scheduled_lives");
      return res;
    } catch (err) {
      console.error("[error] scheduled_lives =>", err.message || err);
      return [];
    }
  }
  async share_live({
    slug,
    platformShare,
    ...rest
  } = {}) {
    if (!slug || !platformShare) throw new Error('Parameters "slug" and "platformShare" are required for share_live');
    try {
      console.log("[start] share_live");
      const res = await this.safe_execute("share_live", async () => {
        const {
          data
        } = await this.mobile.post(`/v3/livestream/${slug}/share`, null, {
          params: {
            platform_share: platformShare
          },
          ...rest
        });
        return data;
      });
      console.log("[ok] share_live");
      return res;
    } catch (err) {
      console.error("[error] share_live =>", err.message || err);
      return null;
    }
  }
  async start_live({
    slug,
    ...rest
  } = {}) {
    if (!slug) throw new Error('Parameter "slug" is required for start_live');
    try {
      console.log("[start] start_live");
      const res = await this.safe_execute("start_live", async () => {
        const {
          data
        } = await this.mobile.post(`/v3/livestream/${slug}/start`, null, {
          ...rest
        });
        return data;
      });
      console.log("[ok] start_live");
      return res;
    } catch (err) {
      console.error("[error] start_live =>", err.message || err);
      return null;
    }
  }
  async streamer_entity({
    ...rest
  } = {}) {
    try {
      console.log("[start] streamer_entity");
      const res = await this.safe_execute("streamer_entity", async () => {
        const {
          data
        } = await this.mobile.get("/v3/entity", {
          ...rest
        });
        return data?.data || null;
      });
      console.log("[ok] streamer_entity");
      return res;
    } catch (err) {
      console.error("[error] streamer_entity =>", err.message || err);
      return null;
    }
  }
  async toggle_reminder({
    slug,
    ...rest
  } = {}) {
    if (!slug) throw new Error('Parameter "slug" is required for toggle_reminder');
    try {
      console.log("[start] toggle_reminder");
      const res = await this.safe_execute("toggle_reminder", async () => {
        const {
          data
        } = await this.mobile.post(`/v3/livestream/${slug}/notification`, null, {
          ...rest
        });
        return data?.data || null;
      });
      console.log("[ok] toggle_reminder");
      return res;
    } catch (err) {
      console.error("[error] toggle_reminder =>", err.message || err);
      return null;
    }
  }
  async delete_live({
    slug,
    ...rest
  } = {}) {
    if (!slug) throw new Error('Parameter "slug" is required for delete_live');
    try {
      console.log("[start] delete_live");
      const res = await this.safe_execute("delete_live", async () => {
        const {
          data
        } = await this.mobile.delete(`/v3/livestream/${slug}`, {
          ...rest
        });
        return data;
      });
      console.log("[ok] delete_live");
      return res;
    } catch (err) {
      console.error("[error] delete_live =>", err.message || err);
      return null;
    }
  }
  async articles_legacy({
    section,
    page = 1,
    ...rest
  } = {}) {
    if (!section) throw new Error('Parameter "section" is required for articles_legacy');
    try {
      console.log("[start] articles_legacy");
      const res = await this.safe_execute("articles_legacy", async () => {
        const {
          data
        } = await this.mobile.get(`/v3/home/article/${section}`, {
          params: {
            page: page
          },
          ...rest
        });
        return data?.data || [];
      });
      console.log("[ok] articles_legacy");
      return res;
    } catch (err) {
      console.error("[error] articles_legacy =>", err.message || err);
      return [];
    }
  }
  async articles({
    section,
    page = 1,
    type = null,
    slug = null,
    ...rest
  } = {}) {
    if (!section) throw new Error('Parameter "section" is required for articles');
    try {
      console.log("[start] articles");
      const res = await this.safe_execute("articles", async () => {
        const {
          data
        } = await this.mobile.get(`/v3.1/home/article/${section}`, {
          params: {
            page: page,
            type: type,
            slug: slug
          },
          ...rest
        });
        return data?.data || [];
      });
      console.log("[ok] articles");
      return res;
    } catch (err) {
      console.error("[error] articles =>", err.message || err);
      return [];
    }
  }
  async quizzes({
    page = 1,
    ...rest
  } = {}) {
    try {
      console.log("[start] quizzes");
      const res = await this.safe_execute("quizzes", async () => {
        const {
          data
        } = await this.mobile.get("/v3/home/quiz/latest", {
          params: {
            page: page
          },
          ...rest
        });
        return data?.data || [];
      });
      console.log("[ok] quizzes");
      return res;
    } catch (err) {
      console.error("[error] quizzes =>", err.message || err);
      return [];
    }
  }
  async highlights({
    ...rest
  } = {}) {
    try {
      console.log("[start] highlights");
      const res = await this.safe_execute("highlights", async () => {
        const {
          data
        } = await this.mobile.get("/v3/home/highlight-menu", {
          ...rest
        });
        return data?.data || [];
      });
      console.log("[ok] highlights");
      return res;
    } catch (err) {
      console.error("[error] highlights =>", err.message || err);
      return [];
    }
  }
  async topics({
    sortBy = null,
    ...rest
  } = {}) {
    try {
      console.log("[start] topics");
      const res = await this.safe_execute("topics", async () => {
        const {
          data
        } = await this.mobile.get("/v3/categories", {
          params: {
            sort_by: sortBy
          },
          ...rest
        });
        return data?.data || [];
      });
      console.log("[ok] topics");
      return res;
    } catch (err) {
      console.error("[error] topics =>", err.message || err);
      return [];
    }
  }
  async save_topic({
    ...rest
  } = {}) {
    try {
      console.log("[start] save_topic");
      const res = await this.safe_execute("save_topic", async () => {
        const {
          data
        } = await this.mobile.get("/v3/saveTopic", {
          ...rest
        });
        return data?.data || null;
      });
      console.log("[ok] save_topic");
      return res;
    } catch (err) {
      console.error("[error] save_topic =>", err.message || err);
      return null;
    }
  }
  async article({
    slug,
    ...rest
  } = {}) {
    if (!slug) throw new Error('Parameter "slug" is required for article');
    try {
      console.log("[start] article");
      const res = await this.safe_execute("article", async () => {
        const {
          data
        } = await this.mobile.get(`/v3/article/${slug}`, {
          ...rest
        });
        return data?.data || null;
      });
      console.log("[ok] article");
      return res;
    } catch (err) {
      console.error("[error] article =>", err.message || err);
      return null;
    }
  }
  async inc_view({
    slug,
    ...rest
  } = {}) {
    if (!slug) throw new Error('Parameter "slug" is required for inc_view');
    try {
      console.log("[start] inc_view");
      const res = await this.safe_execute("inc_view", async () => {
        const {
          data
        } = await this.mobile.post(`/v3/article/${slug}/view`, null, {
          ...rest
        });
        return data?.data || null;
      });
      console.log("[ok] inc_view");
      return res;
    } catch (err) {
      console.error("[error] inc_view =>", err.message || err);
      return null;
    }
  }
  async inc_share({
    slug,
    ...rest
  } = {}) {
    if (!slug) throw new Error('Parameter "slug" is required for inc_share');
    try {
      console.log("[start] inc_share");
      const res = await this.safe_execute("inc_share", async () => {
        const {
          data
        } = await this.mobile.post(`/v3/article/${slug}/share`, null, {
          ...rest
        });
        return data?.data || null;
      });
      console.log("[ok] inc_share");
      return res;
    } catch (err) {
      console.error("[error] inc_share =>", err.message || err);
      return null;
    }
  }
  async non_crawled_article({
    slugArticle,
    ...rest
  } = {}) {
    if (!slugArticle) throw new Error('Parameter "slugArticle" is required for non_crawled_article');
    try {
      console.log("[start] non_crawled_article");
      const res = await this.safe_execute("non_crawled_article", async () => {
        const {
          data
        } = await this.mobile.get(`/v3/idntimes/article/${slugArticle}`, {
          ...rest
        });
        return data?.data || null;
      });
      console.log("[ok] non_crawled_article");
      return res;
    } catch (err) {
      console.error("[error] non_crawled_article =>", err.message || err);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["get_streams", "stream_detail", "search_it", "get_news", "f_profile", "f_streams", "f_headline", "f_related", "f_top_all", "f_top_slug", "f_lives", "f_plus", "f_categories", "detailed", "search", "rec_article", "rec_quiz", "search_country", "search_province", "search_city", "live_categories", "create_room", "end_live", "live_room", "live_stat", "live_rooms", "refresh_entity", "scheduled_lives", "share_live", "start_live", "streamer_entity", "toggle_reminder", "delete_live", "articles_legacy", "articles", "quizzes", "highlights", "topics", "save_topic", "article", "inc_view", "inc_share", "non_crawled_article"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          get_streams: "/idn?action=get_streams",
          stream_detail: "/idn?action=stream_detail&slug=example",
          search_it: "/idn?action=search_it&q=keyword"
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
  const idn = new IDN();
  try {
    let response;
    switch (action) {
      case "get_streams":
        response = await idn.get_streams(params);
        break;
      case "stream_detail":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk stream_detail."
          });
        }
        response = await idn.stream_detail(params);
        break;
      case "search_it":
        if (!params.q) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'q' wajib diisi untuk search_it."
          });
        }
        response = await idn.search_it(params);
        break;
      case "get_news":
        response = await idn.get_news(params);
        break;
      case "f_profile":
        if (!params.username) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'username' wajib diisi untuk f_profile."
          });
        }
        response = await idn.f_profile(params);
        break;
      case "f_streams":
        response = await idn.f_streams(params);
        break;
      case "f_headline":
        response = await idn.f_headline(params);
        break;
      case "f_related":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk f_related."
          });
        }
        response = await idn.f_related(params);
        break;
      case "f_top_all":
        if (!params.uuidStreamer) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'uuidStreamer' wajib diisi untuk f_top_all."
          });
        }
        response = await idn.f_top_all(params);
        break;
      case "f_top_slug":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk f_top_slug."
          });
        }
        response = await idn.f_top_slug(params);
        break;
      case "f_lives":
        if (!params.uuid) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'uuid' wajib diisi untuk f_lives."
          });
        }
        response = await idn.f_lives(params);
        break;
      case "f_plus":
        response = await idn.f_plus(params);
        break;
      case "f_categories":
        response = await idn.f_categories(params);
        break;
      case "detailed":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk detailed."
          });
        }
        response = await idn.detailed(params);
        break;
      case "search":
        if (!params.type || !params.keyword) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'type' dan 'keyword' wajib diisi untuk search."
          });
        }
        response = await idn.search(params);
        break;
      case "rec_article":
        response = await idn.rec_article(params);
        break;
      case "rec_quiz":
        response = await idn.rec_quiz(params);
        break;
      case "search_country":
        if (!params.country) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'country' wajib diisi untuk search_country."
          });
        }
        response = await idn.search_country(params);
        break;
      case "search_province":
        if (!params.province || !params.countrySlug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'province' dan 'countrySlug' wajib diisi untuk search_province."
          });
        }
        response = await idn.search_province(params);
        break;
      case "search_city":
        if (!params.city || !params.provinceSlug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'city' dan 'provinceSlug' wajib diisi untuk search_city."
          });
        }
        response = await idn.search_city(params);
        break;
      case "live_categories":
        response = await idn.live_categories(params);
        break;
      case "create_room":
        if (!params.title || !params.category) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'title' dan 'category' wajib diisi untuk create_room."
          });
        }
        response = await idn.create_room(params);
        break;
      case "end_live":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk end_live."
          });
        }
        response = await idn.end_live(params);
        break;
      case "live_room":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk live_room."
          });
        }
        response = await idn.live_room(params);
        break;
      case "live_stat":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk live_stat."
          });
        }
        response = await idn.live_stat(params);
        break;
      case "live_rooms":
        response = await idn.live_rooms(params);
        break;
      case "refresh_entity":
        response = await idn.refresh_entity(params);
        break;
      case "scheduled_lives":
        response = await idn.scheduled_lives(params);
        break;
      case "share_live":
        if (!params.slug || !params.platformShare) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' dan 'platformShare' wajib diisi untuk share_live."
          });
        }
        response = await idn.share_live(params);
        break;
      case "start_live":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk start_live."
          });
        }
        response = await idn.start_live(params);
        break;
      case "streamer_entity":
        response = await idn.streamer_entity(params);
        break;
      case "toggle_reminder":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk toggle_reminder."
          });
        }
        response = await idn.toggle_reminder(params);
        break;
      case "delete_live":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk delete_live."
          });
        }
        response = await idn.delete_live(params);
        break;
      case "articles_legacy":
        if (!params.section) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'section' wajib diisi untuk articles_legacy."
          });
        }
        response = await idn.articles_legacy(params);
        break;
      case "articles":
        if (!params.section) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'section' wajib diisi untuk articles."
          });
        }
        response = await idn.articles(params);
        break;
      case "quizzes":
        response = await idn.quizzes(params);
        break;
      case "highlights":
        response = await idn.highlights(params);
        break;
      case "topics":
        response = await idn.topics(params);
        break;
      case "save_topic":
        response = await idn.save_topic(params);
        break;
      case "article":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk article."
          });
        }
        response = await idn.article(params);
        break;
      case "inc_view":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk inc_view."
          });
        }
        response = await idn.inc_view(params);
        break;
      case "inc_share":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk inc_share."
          });
        }
        response = await idn.inc_share(params);
        break;
      case "non_crawled_article":
        if (!params.slugArticle) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slugArticle' wajib diisi untuk non_crawled_article."
          });
        }
        response = await idn.non_crawled_article(params);
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
    if (response.status === false) {
      return res.status(422).json({
        action: action,
        ...response
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
      error: error.message || "Unknown Error"
    });
  }
}