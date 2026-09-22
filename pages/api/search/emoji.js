import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
class EmojiService {
  constructor() {
    this.emojipediaGqlUrl = "https://emojipedia.org/api/graphql";
    this.emojipediaBaseUrl = "https://emojipedia.org";
    this.hashes = {
      popularEmojis: "0d18c3b8b3cd553567caa7aeff5901116f74523f",
      emojiTopTagsV1: "2e78907684ab881e0b822d2a1ccf18439021eac6",
      UpcomingEventsV1: "26ff8d5aead12c7da3f748127f4cd6468683fea3"
    };
    this.http = axios.create({
      timeout: 15e3,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
      }
    });
  }
  vld(val, fieldName) {
    if (val === undefined || val === null || typeof val === "string" && val.trim() === "") {
      throw new Error(`Field '${fieldName}' wajib diisi.`);
    }
  }
  toSnk(d) {
    try {
      if (Array.isArray(d)) {
        return d.map(v => this.toSnk(v));
      }
      if (d !== null && typeof d === "object") {
        return Object.keys(d).reduce((acc, k) => {
          const snk = k.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
          acc[snk] = this.toSnk(d[k]);
          return acc;
        }, {});
      }
      return d;
    } catch (_) {
      return d;
    }
  }
  genHash(opName, vars = {}) {
    try {
      if (this.hashes?.[opName]) return this.hashes[opName];
      const raw = JSON.stringify({
        operationName: opName,
        variables: vars
      });
      return crypto.createHash("sha1").update(raw).digest("hex");
    } catch (_) {
      return "";
    }
  }
  async reqGql(url, opName, query, vars = {}, extraHeaders = {}) {
    try {
      this.vld(url, "url");
      this.vld(opName, "opName");
      this.vld(query, "query");
      const hash = this.genHash(opName, vars);
      const body = {
        operationName: opName,
        query: query,
        variables: vars
      };
      const headers = {
        "content-type": "application/json",
        origin: this.emojipediaBaseUrl,
        "x-client": "emojipedia.org",
        "x-query-hash": hash,
        ...extraHeaders
      };
      const res = await this.http.post(url, body, {
        headers: headers
      });
      if (res?.data?.errors?.length) {
        const err = new Error(res.data.errors[0]?.message || "GraphQL Query Error");
        err.errors = res.data.errors;
        throw err;
      }
      return res?.data?.data || res?.data;
    } catch (err) {
      throw err;
    }
  }
  toHex(emoji) {
    try {
      return Array.from(emoji || "").map(c => c.codePointAt(0)?.toString(16)).filter(Boolean).join("-");
    } catch (_) {
      return "";
    }
  }
  async getEmojiData({
    type = "emojipedia",
    query,
    detail,
    url,
    target,
    ...rest
  }) {
    const selectedType = (type || rest?.provider || "emojipedia").toLowerCase().trim();
    try {
      this.vld(selectedType, "type");
      let resData = null;
      switch (selectedType) {
        case "emojipedia":
          resData = await this.emojiPedia({
            emoji: query || rest?.emoji,
            ...rest
          });
          break;
        case "emojigraph":
          resData = await this.handleEmojiGraph({
            query: query,
            detail: detail,
            url: url,
            ...rest
          });
          break;
        case "emojigg":
          resData = await this.emojiGG({
            query: query,
            ...rest
          });
          break;
        case "emojiall":
          resData = await this.emojiAll({
            query: query,
            ...rest
          });
          break;
        case "notoemoji":
          resData = await this.notoEmoji({
            query: query,
            ...rest
          });
          break;
        case "kitchen":
        case "mashup":
          resData = await this.emojiKitchen({
            emoji1: query,
            emoji2: target,
            ...rest
          });
          break;
        default:
          throw new Error(`Tipe '${selectedType}' tidak valid. Pilihan: 'emojipedia', 'emojigraph', 'emojigg', 'emojiall', 'notoemoji', 'mashup'.`);
      }
      return resData;
    } catch (err) {
      return {
        status: false,
        result: null,
        error: err?.message || "Gagal memproses data emoji"
      };
    }
  }
  async emojiPedia({
    emoji,
    ...rest
  }) {
    const target = emoji || rest?.query || "";
    try {
      this.vld(target, "emoji");
      const slugRes = await this.http.get(`${this.emojipediaBaseUrl}/${encodeURIComponent(target)}`, {
        maxRedirects: 5,
        validateStatus: s => s >= 200 && s < 400
      });
      const finalUrl = slugRes?.request?.res?.responseUrl || slugRes?.config?.url || "";
      const pathname = new URL(finalUrl).pathname;
      const cleanSlug = pathname.replace(/^\/+/, "").split("/")[0] || target;
      const queryGql = `
        fragment vendorAndPlatformResource on VendorAndPlatform {
          slug
          title
          description
          items {
            date
            slug
            title
            image {
              source
              description
              useOriginalImage
            }
          }
        }
        fragment emojiResource on Emoji {
          id
          title
          code
          slug
          currentCldrName
          description
        }
        fragment emojiDetailsResource on Emoji {
          ...emojiResource
          vendorsAndPlatforms {
            ...vendorAndPlatformResource
          }
        }
        query emojiV1($slug: Slug!, $lang: Language) {
          emoji_v1(slug: $slug, lang: $lang) {
            ...emojiDetailsResource
          }
        }
      `;
      const data = await this.reqGql(this.emojipediaGqlUrl, "emojiV1", queryGql, {
        slug: cleanSlug,
        lang: "EN"
      });
      const emojiInfo = data?.emoji_v1 || {};
      const vendors = (emojiInfo?.vendorsAndPlatforms || []).map(v => {
        const firstItem = v?.items?.[0] || {};
        const imgSrc = firstItem?.image?.source ? `https://em-content.zobj.net/${firstItem.image.source}` : null;
        return {
          name: v?.title || v?.slug || null,
          description: v?.description || firstItem?.title || null,
          image: imgSrc
        };
      });
      return {
        status: true,
        result: this.toSnk({
          title: emojiInfo?.title || null,
          code: emojiInfo?.code || null,
          slug: emojiInfo?.slug || cleanSlug,
          current_cldr_name: emojiInfo?.currentCldrName || null,
          description: emojiInfo?.description || null,
          vendors: vendors
        })
      };
    } catch (err) {
      return {
        status: false,
        result: null,
        error: err?.message || "Gagal mengambil data dari Emojipedia GraphQL"
      };
    }
  }
  async search({
    emoji,
    ...rest
  }) {
    const target = emoji || rest?.query || "";
    try {
      this.vld(target, "emoji");
      const count = rest?.count ? rest.count : 50;
      const lang = rest?.lang ? rest.lang.toUpperCase() : "EN";
      const queryGql = `
        query popularEmojis($count: Int, $lang: Language) {
          mostPopular_v1(count: $count, lang: $lang) {
            emoji {
              ...popularEmojisResource
            }
            showMoreSlug
          }
        }
        fragment popularEmojisResource on Emoji {
          title
          code
          slug
          description
          currentCldrName
          socialImage {
            source
          }
        }
      `;
      const data = await this.reqGql(this.emojipediaGqlUrl, "popularEmojis", queryGql, {
        count: count,
        lang: lang
      });
      const list = data?.mostPopular_v1?.emoji || [];
      const qLower = target.toLowerCase();
      let matched = list.filter(item => item?.code === target || item?.slug?.toLowerCase()?.includes(qLower) || item?.title?.toLowerCase()?.includes(qLower) || item?.currentCldrName?.toLowerCase()?.includes(qLower));
      if (matched.length === 0) {
        const detail = await this.emojiPedia({
          emoji: target
        });
        matched = detail?.status && detail?.result?.title ? [detail.result] : list;
      }
      return {
        status: true,
        result: this.toSnk({
          query: target,
          total_found: matched.length,
          items: matched
        })
      };
    } catch (err) {
      return {
        status: false,
        result: null,
        error: err?.message || "Gagal melakukan search emoji"
      };
    }
  }
  async emojiKitchen({
    emoji1,
    emoji2,
    ...rest
  }) {
    const e1 = emoji1 || rest?.query || "";
    const e2 = emoji2 || rest?.target || "";
    try {
      this.vld(e1, "emoji1");
      this.vld(e2, "emoji2");
      const hex1 = this.toHex(e1);
      const hex2 = this.toHex(e2);
      const comboUrl = `https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u${hex1}/u${hex1}_u${hex2}.png`;
      return {
        status: true,
        result: this.toSnk({
          emoji_left: e1,
          emoji_right: e2,
          codepoint_left: hex1,
          codepoint_right: hex2,
          mashup_url: comboUrl
        })
      };
    } catch (err) {
      return {
        status: false,
        result: null,
        error: err?.message || "Gagal membuat mashup Emoji Kitchen"
      };
    }
  }
  async notoEmoji({
    query,
    ...rest
  }) {
    try {
      this.vld(query, "query");
      const char = Array.from(query)[0];
      if (!char) throw new Error("Query emoji tidak valid.");
      const key = char.codePointAt(0)?.toString(16) || "";
      const notoKey = key.toLowerCase().replace(/^([^-]+)-fe0f\b/i, (_, v) => v).replace(/-fe0f$/i, "").replace(/-/g, "_");
      return {
        status: true,
        result: this.toSnk({
          emoji: query,
          codepoint_hex: notoKey,
          image_url: `https://fonts.gstatic.com/s/e/notoemoji/latest/${notoKey}/512.png`
        })
      };
    } catch (err) {
      return {
        status: false,
        result: null,
        error: err?.message || "Gagal membuat URL NotoEmoji"
      };
    }
  }
  async emojiGG({
    query,
    ...rest
  }) {
    try {
      this.vld(query, "query");
      const q = query.toLowerCase().trim().replace(/\s+/g, "_");
      const res = await this.http.get("https://emoji.gg/api/");
      const data = Array.isArray(res?.data) ? res.data : [];
      const filtered = data.filter(s => s?.title === q || s?.title?.toLowerCase()?.includes(q));
      return {
        status: true,
        result: this.toSnk(filtered.length ? filtered : null)
      };
    } catch (err) {
      return {
        status: false,
        result: null,
        error: err?.message || "Gagal mengambil data dari Emoji.gg"
      };
    }
  }
  async emojiAll({
    query,
    ...rest
  }) {
    try {
      this.vld(query, "query");
      const res = await this.http.get(`https://www.emojiall.com/id/emoji/${encodeURIComponent(query)}`);
      const $ = cheerio.load(res?.data || "");
      const emojiChar = $(".emoji_card_list.pages").eq(0).find(".emoji_font.line").first().text().trim() || null;
      const description = $(".emoji_card_list.pages").eq(0).find(".emoji_card_content").first().text().trim() || null;
      const vendors = $(".emoji_card_list.pages").eq(3).find("ul.row.no-gutters li").toArray().map(el => {
        const $el = $(el);
        const imgSrc = $el.find("img").attr("data-src") || $el.find("img").attr("src");
        return {
          name: $el.find("figcaption").text().trim() || null,
          image: imgSrc ? imgSrc.startsWith("http") ? imgSrc : `https://emojiall.com${imgSrc.replace(/\/60\//, "/240/")}` : null
        };
      }).filter(item => item.name && item.image);
      return {
        status: true,
        result: this.toSnk({
          emoji: emojiChar,
          description: description,
          vendors: vendors
        })
      };
    } catch (err) {
      return {
        status: false,
        result: null,
        error: err?.message || "Gagal mengambil data dari EmojiAll"
      };
    }
  }
  async handleEmojiGraph({
    query,
    detail,
    url,
    ...rest
  }) {
    try {
      if (url) return await this.emojiGraph({
        url: url,
        ...rest
      });
      if (query) {
        this.vld(query, "query");
        return await this.emojiGraph({
          url: `https://emojigraph.org/search/?q=${encodeURIComponent(query)}`,
          ...rest
        });
      }
      throw new Error("EmojiGraph memerlukan parameter 'url' atau 'query'.");
    } catch (err) {
      return {
        status: false,
        result: null,
        error: err?.message || "Parameter tidak valid untuk EmojiGraph"
      };
    }
  }
  async emojiGraph({
    url,
    ...rest
  }) {
    try {
      this.vld(url, "url");
      const res = await this.http.get(url);
      const $ = cheerio.load(res?.data || "");
      const items = $(".emoji__title").get().map(el => {
        const elm = $(el);
        const vendors = elm.siblings(".emoji__div__tablet").find(".block__emoji").get().map(vEl => {
          const em = $(vEl);
          const vLink = em.find("a")?.attr("href");
          const vImg = em.find("img")?.attr("data-src") || em.find("img")?.attr("src");
          return {
            name: em.find("a").text().trim() || null,
            link: vLink ? vLink.startsWith("http") ? vLink : `https://emojigraph.org${vLink}` : null,
            image: vImg ? vImg.startsWith("http") ? vImg : `https://emojigraph.org${vImg}` : null
          };
        });
        return {
          name: elm.find(".emoji").text().trim() || elm.text().trim() || null,
          link: elm.siblings(".emoji__copy").find(".emoji").text().trim() || null,
          description: elm.siblings("p").text().trim() || null,
          vendors: vendors
        };
      });
      return {
        status: true,
        result: this.toSnk(items)
      };
    } catch (err) {
      return {
        status: false,
        result: null,
        error: err?.message || "Gagal mengambil data dari EmojiGraph"
      };
    }
  }
  async topTags({
    limit = 50,
    ...rest
  } = {}) {
    try {
      const query = `
        query emojiTopTagsV1($limit: Int!) {
          emoji_topTags_v1(limit: $limit)
        }
      `;
      const data = await this.reqGql(this.emojipediaGqlUrl, "emojiTopTagsV1", query, {
        limit: limit,
        ...rest
      });
      return {
        status: true,
        result: this.toSnk(data?.emoji_topTags_v1 || data || [])
      };
    } catch (err) {
      return {
        status: false,
        result: null,
        error: err?.message || "Gagal mengambil Top Tags"
      };
    }
  }
  async upcomingEvents({
    count = 4,
    lang = "EN",
    ...rest
  } = {}) {
    try {
      const query = `
        query UpcomingEventsV1($count: Int, $lang: Language) {
          upcomingEvents_v1(count: $count, lang: $lang) {
            events {
              ...upcomingEventsResource
            }
            showMoreSlug
          }
        }
        fragment upcomingEventsResource on StaticContent {
          slug
          pageTitle
          image
        }
      `;
      const data = await this.reqGql(this.emojipediaGqlUrl, "UpcomingEventsV1", query, {
        count: count,
        lang: lang,
        ...rest
      });
      return {
        status: true,
        result: this.toSnk(data?.upcomingEvents_v1 || data || {})
      };
    } catch (err) {
      return {
        status: false,
        result: null,
        error: err?.message || "Gagal mengambil Upcoming Events"
      };
    }
  }
  async footer({
    lang = "EN",
    ...rest
  } = {}) {
    try {
      const query = `
        query footer($lang: Language) {
          footer_v1(lang: $lang) {
            ...footerResource
          }
        }
        fragment footerItemResource on FooterItem {
          slug
          title
        }
        fragment footerSectionResource on FooterSection {
          category
          items {
            ...footerItemResource
          }
        }
        fragment footerResource on Footer {
          sections {
            ...footerSectionResource
          }
          content {
            zedgeSlogan
            trademark
            copyright
          }
        }
      `;
      const data = await this.reqGql(this.emojipediaGqlUrl, "footer", query, {
        lang: lang,
        ...rest
      });
      return {
        status: true,
        result: this.toSnk(data?.footer_v1 || data || {})
      };
    } catch (err) {
      return {
        status: false,
        result: null,
        error: err?.message || "Gagal mengambil Footer"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req?.method === "GET" ? req?.query || {} : req?.body || {};
  const query = params?.query || params?.emoji;
  const action = (params?.action || params?.type || "").toLowerCase().trim();
  if (!["toptags", "top_tags", "events", "upcoming_events", "footer"].includes(action) && !query && !params?.url) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'query' atau 'emoji' diperlukan."
    });
  }
  const api = new EmojiService();
  try {
    let data;
    switch (action) {
      case "toptags":
      case "top_tags":
        data = await api.topTags(params);
        break;
      case "events":
      case "upcoming_events":
        data = await api.upcomingEvents(params);
        break;
      case "footer":
        data = await api.footer(params);
        break;
      case "search":
        data = await api.search({
          emoji: query,
          ...params
        });
        break;
      case "kitchen":
      case "mashup":
        if (!params?.target && !params?.emoji2) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'target' atau 'emoji2' diperlukan untuk mashup Emoji Kitchen."
          });
        }
        data = await api.emojiKitchen({
          emoji1: query,
          emoji2: params?.target || params?.emoji2,
          ...params
        });
        break;
      default:
        data = await api.getEmojiData({
          type: params?.type || "emojipedia",
          query: query,
          target: params?.target || params?.emoji2,
          url: params?.url,
          ...params
        });
        break;
    }
    if (data?.status === false) {
      return res.status(400).json(data);
    }
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error?.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      status: false,
      error: errorMessage
    });
  }
}