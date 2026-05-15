import axios from "axios";
const DEF_BUILD = "4J7lPVMz1jKGEcG-AJqwl";
const DEF_API_KEY = "123f4c4e-6ce1-404d-8786-d17e46d65b5c";
const DEF_SESSION = "0636e5c8-e499-4710-ace2-f4b0dc98711a";
const DEF_REQ_ID = `_${Date.now()}`;
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const GQL_STREAMS = `
  query GetLivestream($category: String, $page: Int){
    getLivestreams(category: $category, page: $page){
      slug title image_url view_count playback_url room_identifier status
      scheduled_at live_at live_type
      category { name slug }
      creator { name username uuid }
    }
  }`;
const GQL_HEADLINE = `{
  getLivestreamHeadline{
    title slug image_url playback_url status live_at scheduled_at
    category { name slug }
    creator { name username uuid }
  }
}`;
const GQL_RELATED = `
  query getRelatedLivestream($slug: String!){
    getRelatedLivestream(slug: $slug){
      result{
        title image_url slug view_count scheduled_at live_at
        creator { name avatar username uuid }
        category { name slug }
      }
    }
  }`;
class IDN {
  constructor({
    apiKey = DEF_API_KEY,
    sessionId = DEF_SESSION,
    buildId = DEF_BUILD
  } = {}) {
    this.buildId = buildId;
    const base = {
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-mode": "cors",
      "user-agent": UA
    };
    this.web = axios.create({
      baseURL: "https://www.idn.app",
      headers: {
        ...base,
        "x-nextjs-data": "1",
        "sec-fetch-dest": "empty",
        "sec-fetch-site": "same-origin"
      }
    });
    this.api = axios.create({
      baseURL: "https://api.idn.app",
      headers: {
        ...base,
        accept: "application/json, text/plain, */*",
        origin: "https://www.idn.app",
        referer: "https://www.idn.app/",
        "sec-fetch-dest": "empty",
        "sec-fetch-site": "same-site",
        "session-id": sessionId,
        "x-api-key": apiKey,
        "x-request-id": DEF_REQ_ID
      }
    });
    this.mobile = axios.create({
      baseURL: "https://mobile-api.idn.app",
      headers: {
        ...base,
        accept: "application/json, text/plain, */*",
        origin: "https://www.idn.app",
        referer: "https://www.idn.app/",
        "sec-fetch-dest": "empty",
        "sec-fetch-site": "same-site",
        "x-api-key": "1ccc5bc4-8bb4-414c-b524-92d11a85a818",
        "x-request-id": DEF_REQ_ID
      }
    });
  }
  parse(query = "") {
    const urlMatch = query.match(/idn\.app\/([^/]+)(?:\/live\/([^/?#]+))?/);
    if (urlMatch) return {
      username: urlMatch[1] || null,
      slug: urlMatch[2] || null
    };
    if (/\-\d{15,}$/.test(query)) return {
      username: null,
      slug: query
    };
    return {
      username: query || null,
      slug: null
    };
  }
  async safe(label, fn) {
    try {
      console.log(`[fetch] ${label}`);
      const res = await fn();
      console.log(`[ok]    ${label}`);
      return res;
    } catch (err) {
      console.warn(`[skip]  ${label} =>`, err?.response?.data?.message || err?.message || err);
      return null;
    }
  }
  async fProfile(username) {
    const {
      data
    } = await this.web.get(`/_next/data/${this.buildId}/${username}.json`, {
      params: {
        username: username
      }
    });
    return data?.pageProps || null;
  }
  async fGql(query, variables = {}) {
    const {
      data
    } = await this.api.post("/graphql", {
      query: query,
      variables: variables
    });
    return data?.data || null;
  }
  async fStreams({
    category = "all",
    page = 1
  } = {}) {
    const res = await this.fGql(GQL_STREAMS, {
      category: category,
      page: page
    });
    return res?.getLivestreams || [];
  }
  async fHeadline() {
    const res = await this.fGql(GQL_HEADLINE);
    return res?.getLivestreamHeadline || [];
  }
  async fRelated(slug) {
    const res = await this.fGql(GQL_RELATED, {
      slug: slug
    });
    return res?.getRelatedLivestream?.result || [];
  }
  async fTopAll(uuid_streamer, type = "daily", n = 10) {
    const {
      data
    } = await this.api.get("/api/v1/gift/livestream/top-gifter/all", {
      params: {
        type: type,
        uuid_streamer: uuid_streamer,
        n: n
      }
    });
    return data?.data || [];
  }
  async fTopSlug(slug, n = 10) {
    const {
      data
    } = await this.api.get(`/api/v1/gift/livestream/${slug}/top-gifter`, {
      params: {
        n: n
      }
    });
    return data?.data || [];
  }
  async fLives(uuid) {
    const {
      data
    } = await this.mobile.get("/v3/profile/livestreams", {
      params: {
        uuid: uuid
      }
    });
    return data?.data || [];
  }
  async fPlus(n = 10) {
    const {
      data
    } = await this.api.get("/api/v4/livestreams", {
      params: {
        category: "idnliveplus",
        n: n
      }
    });
    return data?.data || [];
  }
  async fCategories(n = 10) {
    const {
      data
    } = await this.api.get("/api/v1/web/livestream/categories", {
      params: {
        has_live_room: true,
        n: n
      }
    });
    return data?.data || [];
  }
  async detailed({
    query,
    type = "daily",
    n = 10,
    category = "all",
    page = 1
  } = {}) {
    const {
      username,
      slug
    } = this.parse(query || "");
    console.log("[detailed] query =>", query, "| parsed =>", {
      username: username,
      slug: slug
    });
    const result = {};
    for (const [key, fn] of [
        ["categories", () => this.fCategories(n)],
        ["headline", () => this.fHeadline()],
        ["streams", () => this.fStreams({
          category: category,
          page: page
        })],
        ["plus", () => this.fPlus(n)]
      ]) {
      result[key] = await this.safe(key, fn);
    }
    if (username) {
      result.profile = await this.safe("profile", () => this.fProfile(username));
    }
    if (slug) {
      for (const [key, fn] of [
          ["topGifterSlug", () => this.fTopSlug(slug, n)],
          ["related", () => this.fRelated(slug)]
        ]) {
        result[key] = await this.safe(key, fn);
      }
    }
    const uuid = result.profile?.profile?.uuid;
    if (uuid) {
      for (const [key, fn] of [
          ["topGifterAll", () => this.fTopAll(uuid, type, n)],
          ["lives", () => this.fLives(uuid)]
        ]) {
        result[key] = await this.safe(key, fn);
      }
      const liveSlug = result.lives?.[0]?.slug;
      if (liveSlug && !slug) {
        console.log("[detailed] live slug =>", liveSlug);
        for (const [key, fn] of [
            ["topGifterSlug", () => this.fTopSlug(liveSlug, n)],
            ["related", () => this.fRelated(liveSlug)]
          ]) {
          result[key] = await this.safe(key, fn);
        }
      }
    }
    console.log("[detailed] selesai. keys =>", Object.keys(result).join(", "));
    return result;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Parameter 'query' diperlukan"
    });
  }
  const api = new IDN();
  try {
    const data = await api.detailed(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}