import axios from "axios";
class Jawapos {
  constructor(pubId = "1") {
    this.pubId = pubId;
    this.cache = new Map();
    this.client = axios.create({
      baseURL: "https://api.jawapos.com/api-jp-graphql",
      headers: {
        accept: "application/graphql-response+json,application/json;q=0.9",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://www.jawapos.com",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
      },
      timeout: 6e4
    });
    const f = {
      article: `fragment article on Article {
        id article_id title slug description
        show_ads cover published_at
      }`,
      cat: `fragment cat on Category {
        id name slug description
        parent { id name slug }
        childrens { id name slug }
      }`,
      rep: `fragment rep on Reporter { id name slug avatar description }`,
      tag: `fragment tag on Tag { id name slug }`,
      pub: `fragment pub on Publisher { id name }`,
      menu: `fragment menu on MenuWithItems {
        menu_id menu_name
        items { id title type slug url text_color background_color newtab
          childrens { id title type slug url newtab }
        }
      }`
    };
    this.q = {
      search: `
        ${f.article} ${f.rep} ${f.cat} ${f.tag}
        query Search($keyword: String!, $page: Int, $limit: Int) {
          searchArticle(
            filter: { publisherId: "${this.pubId}", keyword: $keyword }
            first: $limit, page: $page
          ) {
            paginatorInfo { hasMorePages currentPage }
            data { ...article authors { ...rep } category { ...cat } tags { ...tag } }
          }
        }
      `,
      latest: `
        ${f.article} ${f.rep} ${f.cat} ${f.tag}
        query Latest($page: Int, $limit: Int) {
          articles(
            filter: { publisherId: "${this.pubId}" }
            first: $limit, page: $page
          ) {
            paginatorInfo { hasMorePages currentPage }
            data { ...article authors { ...rep } category { ...cat } tags { ...tag } }
          }
        }
      `,
      detailById: `
        fragment articleFull on Article {
          id article_id title slug description content
          show_ads cover published_at
        }
        ${f.cat} ${f.rep} ${f.tag}
        query DetailById($id: String!) {
          articles(filter: { publisherId: "${this.pubId}", article_id: $id }, first: 1) {
            data { ...articleFull category { ...cat } authors { ...rep } tags { ...tag } }
          }
        }
      `,
      detailBySlug: `
        fragment articleFull on Article {
          id article_id title slug description content
          show_ads cover published_at
        }
        ${f.cat} ${f.rep} ${f.tag}
        query DetailBySlug($slug: String!) {
          articles(filter: { publisherId: "${this.pubId}", slug: $slug }, first: 1) {
            data { ...articleFull category { ...cat } authors { ...rep } tags { ...tag } }
          }
        }
      `,
      category: `
        ${f.cat} ${f.article} ${f.rep} ${f.tag}
        query Category($slug: String!, $page: Int, $limit: Int) {
          categoryArticles(slug: $slug, publisherId: "${this.pubId}") {
            ...cat
            articles(first: $limit, page: $page) {
              paginatorInfo { hasMorePages currentPage }
              data { ...article authors { ...rep } category { ...cat } tags { ...tag } }
            }
          }
        }
      `,
      author: `
        ${f.rep} ${f.article} ${f.cat}
        query Author($slug: String!, $page: Int, $limit: Int) {
          reporter(filter: { slug: $slug, publisherId: "${this.pubId}" }) {
            ...rep
            articles(first: $limit, page: $page) {
              paginatorInfo { hasMorePages currentPage }
              data { ...article category { ...cat } tags { id name slug } }
            }
          }
        }
      `,
      menu: `
        ${f.pub} ${f.menu}
        query Menu {
          publisher(id: "${this.pubId}") {
            ...pub
            main_menu { ...menu }
            alternative_menu { ...menu }
          }
        }
      `
    };
  }
  async _gql(query, vars = {}) {
    const key = JSON.stringify({
      query: query,
      vars: vars
    });
    if (this.cache.has(key)) {
      const c = this.cache.get(key);
      if (Date.now() - c.timestamp < 3e5) return c.data;
    }
    const res = await this.client.post("", {
      query: query.trim(),
      variables: vars
    });
    if (res.data.errors) throw new Error(res.data.errors[0].message);
    this.cache.set(key, {
      data: res.data.data,
      timestamp: Date.now()
    });
    return res.data.data;
  }
  async _fetchNext(url) {
    const key = `next_${url}`;
    if (this.cache.has(key)) {
      const c = this.cache.get(key);
      if (Date.now() - c.timestamp < 3e5) return c.data;
    }
    try {
      const res = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        timeout: 6e4
      });
      const match = res.data.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
      if (!match) return null;
      const data = JSON.parse(match[1]);
      this.cache.set(key, {
        data: data,
        timestamp: Date.now()
      });
      return data;
    } catch {
      return null;
    }
  }
  async _fetchDetail(article) {
    try {
      const cat = article.category?.slug;
      const id = article.article_id || article.id;
      const slug = article.slug;
      const pp = await this.detail({
        cat: cat,
        id: id,
        slug: slug
      });
      return pp?.article ?? pp?.articles?.data?.[0] ?? article;
    } catch {
      return article;
    }
  }
  async search({
    query,
    page = 1,
    limit = 5,
    detail = false,
    ...rest
  } = {}) {
    if (!query) throw new Error("query required");
    const res = await this._gql(this.q.search, {
      keyword: query,
      page: Number(page),
      limit: Number(limit)
    });
    if (!detail) return res;
    const list = res?.searchArticle?.data ?? [];
    res.searchArticle.data = await Promise.all(list.map(a => this._fetchDetail(a)));
    return res;
  }
  async latest({
    page = 1,
    limit = 5,
    detail = false,
    ...rest
  } = {}) {
    const res = await this._gql(this.q.latest, {
      page: Number(page),
      limit: Number(limit)
    });
    if (!detail) return res;
    const list = res?.articles?.data ?? [];
    res.articles.data = await Promise.all(list.map(a => this._fetchDetail(a)));
    return res;
  }
  async detail({
    id,
    slug,
    cat,
    ...rest
  } = {}) {
    if (!id && !slug) throw new Error("id or slug required");
    const nextUrls = [cat && id && slug ? `https://www.jawapos.com/${cat}/${id}/${slug}` : null, cat && slug ? `https://www.jawapos.com/${cat}/${slug}` : null, id ? `https://www.jawapos.com/news/${id}` : null].filter(Boolean);
    for (const url of nextUrls) {
      const next = await this._fetchNext(url);
      const pp = next?.props?.pageProps;
      if (pp?.article?.content || pp?.detail?.content || pp?.initialArticle?.content) {
        return pp;
      }
    }
    if (id) return this._gql(this.q.detailById, {
      id: id
    });
    if (slug) return this._gql(this.q.detailBySlug, {
      slug: slug
    });
  }
  async category({
    slug,
    page = 1,
    limit = 10,
    ...rest
  } = {}) {
    if (!slug) throw new Error("category slug required");
    return this._gql(this.q.category, {
      slug: slug,
      page: Number(page),
      limit: Number(limit)
    });
  }
  async author({
    slug,
    page = 1,
    limit = 10,
    ...rest
  } = {}) {
    if (!slug) throw new Error("author slug required");
    return this._gql(this.q.author, {
      slug: slug,
      page: Number(page),
      limit: Number(limit)
    });
  }
  async menu() {
    return this._gql(this.q.menu);
  }
  clear() {
    this.cache.clear();
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["search", "latest", "detail", "category", "author", "menu"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new Jawapos();
  try {
    let response;
    switch (action) {
      case "menu":
        response = await api.menu();
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "latest":
        response = await api.latest(params);
        break;
      case "detail":
        if (!params.id || !params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' dan 'slug' wajib diisi untuk action 'detail'."
          });
        }
        response = await api.detail(params);
        break;
      case "category":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk action 'category'."
          });
        }
        response = await api.category(params);
        break;
      case "author":
        if (!params.slug) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'slug' wajib diisi untuk action 'author'."
          });
        }
        response = await api.author(params);
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