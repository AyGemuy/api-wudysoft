import axios from 'axios';
import * as cheerio from 'cheerio';

class ScribdDownloader {
  constructor() {
    this.cookie = '';
    this.client = axios.create({
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0'
      }
    });
    this.client.interceptors.response.use(res => {
      for (const c of res.headers['set-cookie'] || []) {
        const [k, v] = c.split(';')[0].split('=');
        if (v && !this.cookie.includes(`${k}=`))
          this.cookie += (this.cookie ? '; ' : '') + `${k}=${v}`;
      }
      if (this.cookie) this.client.defaults.headers.common['Cookie'] = this.cookie;
      return res;
    });
  }

  async search(q) {
    try {
      const { data } = await this.client.get(`https://id.scribd.com/search?query=${encodeURIComponent(q)}`);
      const $ = cheerio.load(data);
      const results = [];

      $('[data-testid="search-results"] [class*="DocumentCell"], [data-e2e="search-results"] [class*="ScribdDocumentCell"]').each((_, el) => {
        const link = $(el).find('a[href*="/document/"]').first().attr('href');
        const title = $(el).find('[class*="title"]').first().text().trim();
        const author = $(el).find('[class*="author"]').first().text().trim().replace(/^Oleh|^By/i, '').trim() || null;
        const thumb = $(el).find('img').first().attr('src') || null;
        const pages = $(el).find('[class*="page"]').filter((_, e) => /\d+/.test($(e).text())).first().text().match(/\d+/)?.[0] || null;
        const docId = link?.match(/\/document\/(\d+)/)?.[1] || null;

        if (title) results.push({
          title, author,
          url: link ? (link.startsWith('http') ? link : `https://id.scribd.com${link}`) : null,
          docId, thumbnail: thumb, pages
        });
      });

      return { success: true, query: q, total: parseInt($('[class*="result"]').text().match(/\d+/)?.[0]) || results.length, results };
    } catch (e) {
      return { success: false, error: e.message, status: e.response?.status };
    }
  }

  async get(url) {
    try {
      const { data } = await this.client.get(url);
      const $ = cheerio.load(data);

      const docId = url.match(/\/document\/(\d+)/)?.[1];
      const title = $('meta[property="og:title"]').attr('content') || $('title').text().replace(/ \| PDF| \| Scribd/g, '').trim();
      const desc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
      const image = $('meta[property="og:image"]').attr('content');

      const authorEl = $('[data-e2e="publish-info"] a, .publisher-info a, [class*="uploader"] a').first();
      const author = authorEl.text().trim() || $('meta[name="author"]').attr('content') || 'unknown';
      const authorHref = authorEl.attr('href');
      const authorUrl = authorHref ? `https://id.scribd.com/${authorHref}` : `https://id.scribd.com/user/${author}`;

      const pages = parseInt(
        $('[data-e2e="metadata-page-count-wide"]').text().match(/\d+/)?.[0] ||
        $('[class*="pageCount"]').text().match(/\d+/)?.[0] ||
        $('.outer_page').length || 16
      );

      const views = $('[data-e2e="metadata-views-count-wide"]').text().match(/[\d,.KkMm]+/)?.[0] || '0';
      const ratingText = $('[data-e2e="metadata-upvote-rating"]').first().text().trim() || '100% (5)';
      const ratingPct = parseInt(ratingText.match(/(\d+)%/)?.[1] || 100);
      const ratingCnt = parseInt(ratingText.match(/\((\d+)\)/)?.[1] || 5);
      const upvotes = parseInt($('[data-e2e="doc-page-upvote-button"]').text().match(/\d+/)?.[0] || ratingPct);
      const downvotes = parseInt($('[data-e2e="doc-page-downvote-button"]').text().match(/\d+/)?.[0] || 0);

      let structuredData = null;
      try { structuredData = JSON.parse($('script[type="application/ld+json"]').html()); } catch {}

      const tags = [];
      $('[class*="tag"], [class*="Tag"]').each((_, el) => {
        const t = $(el).text().trim();
        if (t && !tags.includes(t) && t.length < 50) tags.push(t);
      });

      const cats = [];
      $('[class*="breadcrumb"] a, [class*="Breadcrumb"] a').each((_, el) => {
        const c = $(el).text().trim();
        if (c && !['Home','Beranda','Scribd'].includes(c)) cats.push(c);
      });

      const fmts = [];
      $('[data-e2e="download-format"], .download_option').each((_, el) => {
        const f = $(el).text().trim().match(/[A-Za-z0-9]+/)?.[0];
        if (f) fmts.push(f);
      });
      if (!fmts.length) fmts.push('PDF', 'TXT', 'DOCX');

      return {
        success: true,
        data: {
          id: docId, title, desc, url: url, image, pages, views,
          author: { name: author, url: authorUrl },
          ratings: { pct: ratingPct, count: ratingCnt, upvotes, downvotes, avg: structuredData?.aggregateRating?.ratingValue || 5 },
          tags: tags.length ? tags : ['Document'],
          cats: cats.length ? cats : ['Document'],
          lang: $('html').attr('lang') || 'id',
          download: {
            available: $('[data-e2e="doc-actions-download-button"]').length > 0 || $('a[href*="/download"]').length > 0,
            formats: fmts,
            needLogin: $('[data-e2e="download-requires-login"]').length > 0,
            needSub: $('[data-e2e="download-requires-subscription"]').length > 0
          },
          structuredData
        }
      };
    } catch (e) {
      return { success: false, error: e.message, status: e.response?.status };
    }
  }

  async download({ url, ...rest }) {
    if (url && /^https?:\/\/(www\.|id\.)?scribd\.com/.test(url)) return await this.get(url);
    return await this.search(url || rest.query || rest.q || '');
  }
}

export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new ScribdDownloader();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}