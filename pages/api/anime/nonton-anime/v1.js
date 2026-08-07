import axios from "axios";
import * as cheerio from "cheerio";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class NontonAnime {
  constructor(baseUrl = "https://s13.nontonanimeid.boats") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.proxyUrl = proxy;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "id,en-US;q=0.7,en;q=0.3"
    };
    this.lastNonce = null;
    this.lastAjaxUrl = null;
    this.lastUrl = null;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: this.headers
    });
  }
  _abs(u) {
    if (u.startsWith("http")) return u;
    const clean = u.startsWith("/") ? u.slice(1) : u;
    return `${this.baseUrl}/${clean}`;
  }
  async _get(u, params = {}, opt = {}) {
    try {
      let targetUrl = this._abs(u);
      if (Object.keys(params).length > 0) {
        const q = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (Array.isArray(v)) {
            v.forEach(val => q.append(`${k}[]`, val));
          } else {
            q.append(k, v);
          }
        }
        targetUrl = `${targetUrl}?${q.toString()}`;
      }
      this.lastUrl = targetUrl;
      const fUrl = `${this.proxyUrl}${targetUrl}`;
      const res = await this.axiosInstance.get(fUrl, {
        headers: {
          ...this.headers,
          Referer: this.baseUrl,
          ...opt.headers
        },
        ...opt
      });
      const $ = cheerio.load(res.data);
      this._exN($);
      return $;
    } catch (e) {
      throw e;
    }
  }
  async _pst(u, body, opt = {}) {
    try {
      const fUrl = `${this.proxyUrl}${this._abs(u)}`;
      const res = await this.axiosInstance.post(fUrl, body, {
        headers: {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          Origin: this.baseUrl,
          ...opt.headers
        },
        ...opt
      });
      return res.data;
    } catch (e) {
      throw e;
    }
  }
  _exN($) {
    const self = this;
    $("script").get().map(el => {
      const src = $(el).attr("src") || "";
      if (src.startsWith("data:text/javascript;base64,")) {
        try {
          const b64 = src.split("base64,")[1];
          const dec = Buffer.from(b64, "base64").toString("utf-8");
          const nonceMatch = dec.match(/"nonce"\s*:\s*"([^"]+)"/);
          const urlMatch = dec.match(/"url"\s*:\s*"([^"]+)"/);
          if (nonceMatch) self.lastNonce = nonceMatch[1];
          if (urlMatch) self.lastAjaxUrl = urlMatch[1].replace(/\\/g, "");
        } catch (e) {}
      }
    });
  }
  _pC($, cardEl) {
    const c = $(cardEl);
    const img = c.find("img");
    const tTag = c.find('[class*="title"]');
    let t = "";
    if (tTag.length > 0) {
      const span = tTag.find("span");
      t = span.length > 0 ? span.attr("data-title-default") || span.text().trim() : tTag.text().trim();
    } else if (img.length > 0) {
      t = img.attr("alt") || "";
    }
    const rTag = c.find(".rating, .kotakscore, .as-rating");
    let r = rTag.text().replace("⭐", "").trim();
    if (!r && rTag.hasClass("kotakscore")) {
      r = rTag.text().replace(/\n/g, "").trim();
    }
    return {
      title: t.trim(),
      link: c.attr("href") || "",
      image: img.attr("src") || img.attr("data-src") || "",
      rating: r,
      type: c.find(".type, .as-type").text().replace("📺", "").trim(),
      season: c.find(".season, .as-season").text().replace("📅", "").trim(),
      synopsis: c.find(".synopsis, .as-synopsis").text().trim(),
      genres: c.find(".genre-tag, .genre-pill, .as-genre-tag").get().map(el => $(el).text().trim())
    };
  }
  async home() {
    try {
      const $ = await this._get("");
      if (!$) return {
        status: false,
        result: null
      };
      const parseTab = tabId => {
        return $(`#${tabId} div.animeseries`).get().map(el => {
          const art = $(el);
          const a = art.find("a");
          const img = a.find("img");
          const tDiv = a.find("div.title");
          let t = "";
          if (tDiv.length > 0) {
            const span = tDiv.find("span");
            t = span.length > 0 ? span.attr("data-title-default") || span.text().trim() : tDiv.text().trim();
          }
          if (!t && img.length > 0) t = img.attr("alt") || "";
          return {
            title: t.trim(),
            link: a.attr("href") || "",
            image: img.attr("src") || "",
            score: a.find("span.kotakscore").text().replace(/\n/g, "").replace(/ /g, "").replace("⭐", "").trim()
          };
        });
      };
      const topRating = [];
      const sidebar = $("#sidebar_right").length > 0 ? $("#sidebar_right") : $("body");
      let topHeader = null;
      sidebar.find("h3, h2").get().map(el => {
        if ($(el).text().includes("Top Rating Anime")) topHeader = $(el);
      });
      if (topHeader) {
        const ul = $(topHeader).nextAll("ul.latestepisodes").first();
        if (ul.length > 0) {
          ul.find("li").get().map(el => {
            const li = $(el);
            const a = li.find("a");
            if (a.length > 0) {
              topRating.push({
                title: a.find("div.lefts").text().trim(),
                link: a.attr("href") || "",
                episodes_count: a.find("div.rights span.video").text().trim()
              });
            }
          });
        }
      }
      const popSummer = [];
      let summerHeader = null;
      sidebar.find("h3, h2").get().map(el => {
        if ($(el).text().includes("Series Popular Summer")) summerHeader = $(el);
      });
      if (summerHeader) {
        const kb = $(summerHeader).nextAll("div.kotakbatas").first();
        if (kb.length > 0) {
          kb.find("div.bor").get().map(el => {
            const a = $(el).find("a.popseries");
            if (a.length > 0) {
              const img = a.find("img");
              popSummer.push({
                title: (img.attr("alt") || "").trim(),
                link: a.attr("href") || "",
                image: img.attr("src") || ""
              });
            }
          });
        }
      }
      const epTerbaru = $("#postbaru article.animeseries").get().map(el => {
        const art = $(el);
        const a = art.find("a");
        if (a.length > 0) {
          const img = a.find("img");
          const tSpan = a.find("h3.title span");
          return {
            title: tSpan.length > 0 ? tSpan.attr("data-title-default") || tSpan.text().trim() : (img.attr("alt") || "").trim(),
            link: a.attr("href") || "",
            image: img.attr("src") || "",
            episode: a.find("span.types.episodes").text().trim(),
            status: a.find("span.types.status").text().trim()
          };
        }
      }).filter(Boolean);
      return {
        status: true,
        result: {
          episode_terbaru: epTerbaru,
          series_terbaru_movie: parseTab("tab-7"),
          series_terbaru_tv: parseTab("tab-8"),
          popular_series_semua: parseTab("tab-9"),
          popular_genre: parseTab("tab-10"),
          top_rating_anime: topRating,
          series_popular_summer: popSummer
        }
      };
    } catch (error) {
      return {
        status: false,
        result: error.message || error
      };
    }
  }
  async list({
    page = 1,
    ...filters
  } = {}) {
    try {
      const url = page > 1 ? `/anime/page/${page}/` : `/anime/`;
      const $ = await this._get(url, filters);
      if (!$) return {
        status: false,
        result: []
      };
      const grid = $("div.result");
      let res = [];
      if (grid.length > 0) {
        const cards = grid.find("a.as-anime-card");
        if (cards.length > 0) {
          res = cards.get().map(el => this._pC($, el));
        } else {
          res = grid.find("div.animeseries").get().map(el => {
            const a = $(el).find("a");
            return a.length > 0 ? this._pC($, a) : null;
          }).filter(Boolean);
        }
      }
      return {
        status: true,
        result: res
      };
    } catch (error) {
      return {
        status: false,
        result: error.message || error
      };
    }
  }
  async search({
    query = "",
    page = 1
  } = {}) {
    try {
      const url = page > 1 ? `/page/${page}/` : `/`;
      const $ = await this._get(url, {
        s: query
      });
      if (!$) return {
        status: false,
        result: []
      };
      const grid = $("div.result");
      let res = [];
      if (grid.length > 0) {
        const cards = grid.find("a.as-anime-card");
        if (cards.length > 0) {
          res = cards.get().map(el => this._pC($, el));
        } else {
          res = grid.find("div.animeseries").get().map(el => {
            const a = $(el).find("a");
            return a.length > 0 ? this._pC($, a) : null;
          }).filter(Boolean);
        }
      }
      return {
        status: true,
        result: res
      };
    } catch (error) {
      return {
        status: false,
        result: error.message || error
      };
    }
  }
  async ongoing({
    page = 1,
    sort = "date"
  } = {}) {
    try {
      const url = page > 1 ? `/ongoing-list/page/${page}/` : `/ongoing-list/`;
      const $ = await this._get(url, {
        sort: sort,
        mode: "sort"
      });
      if (!$) return {
        status: false,
        result: []
      };
      const grid = $("div.gacha-grid");
      let res = [];
      if (grid.length > 0) {
        res = grid.find("a.gacha-card").get().map(el => {
          const card = $(el);
          const img = card.find("img");
          const tTag = card.find("h3.title");
          const classes = card.attr("class") || "";
          const match = classes.match(/rarity-(\d+)/);
          return {
            title: tTag.length > 0 ? tTag.text().trim() : (img.attr("alt") || "").trim(),
            link: card.attr("href") || "",
            image: img.attr("src") || "",
            current_episode: card.find("span.current-ep").text().trim(),
            total_episodes: card.find("span.total-ep").text().trim(),
            rating: card.find("span.skor-angka").text().replace("(", "").replace(")", "").trim(),
            hot: card.find("div.hot-tag").length > 0,
            rarity: match ? match[1] : ""
          };
        });
      }
      return {
        status: true,
        result: res
      };
    } catch (error) {
      return {
        status: false,
        result: error.message || error
      };
    }
  }
  async popular({
    page = 1
  } = {}) {
    try {
      const url = page > 1 ? `/popular-series/page/${page}/` : `/popular-series/`;
      const $ = await this._get(url);
      if (!$) return {
        status: false,
        result: null
      };
      const tabs = {};
      const tabsNav = $("ul.tabs");
      if (tabsNav.length > 0) {
        tabsNav.find("li.tab-link").get().map(el => {
          const tabName = $(el).text().trim();
          const tabId = $(el).attr("data-tab");
          if (tabName && tabId) {
            const content = $(`#${tabId}`);
            tabs[tabName] = content.length > 0 ? content.find("div.animeseries").get().map(art => {
              const a = $(art).find("a");
              return a.length > 0 ? this._pC($, a) : null;
            }).filter(Boolean) : [];
          }
        });
      }
      const rank = [];
      const rankList = $("ul.rank");
      if (rankList.length > 0) {
        rankList.find("li").get().map(el => {
          const li = $(el);
          const a = li.find("a");
          if (a.length > 0) {
            const img = a.find("img");
            const mid = a.find("div.mid");
            let t = "";
            let syn = "";
            let gen = [];
            if (mid.length > 0) {
              const h2 = mid.find("h2");
              t = h2.length > 0 ? h2.text().trim() : (img.attr("alt") || "").trim();
              syn = mid.find("p").text().trim();
              const viw = mid.find("div.viewer");
              if (viw.length > 0) {
                gen = viw.text().replace("Genre :", "").split(",").map(g => g.trim()).filter(Boolean);
              }
            }
            rank.push({
              title: t,
              link: a.attr("href") || "",
              image: img.attr("src") || "",
              synopsis: syn,
              genres: gen
            });
          }
        });
      }
      return {
        status: true,
        result: {
          tabs: tabs,
          overall_rank: rank
        }
      };
    } catch (error) {
      return {
        status: false,
        result: error.message || error
      };
    }
  }
  async schedule() {
    try {
      const $ = await this._get("/jadwal-rilis/");
      if (!$) return {
        status: false,
        result: null
      };
      const libur = [];
      $("div.as-delay-announcements li").get().map(el => {
        libur.push($(el).text().trim());
      });
      const notes = [];
      $("div.as-important-notes li").get().map(el => {
        notes.push($(el).text().trim());
      });
      const upcoming = $("div.jr-upcoming-box div.jr-upcoming-item").get().map(el => {
        const item = $(el);
        return {
          title: item.find("span.jr-upcoming-title").text().trim(),
          image: item.find("img").attr("src") || "",
          episode_time: item.find("span.jr-upcoming-ep").text().trim(),
          time_left: item.find("div.jr-upcoming-time").text().trim()
        };
      });
      const cal = {};
      const days = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"];
      days.forEach(day => {
        const tab = $(`#${day}`);
        if (tab.length > 0) {
          cal[day] = {
            date_text: (tab.attr("data-date-text") || "").trim(),
            series: tab.find("a.as-anime-card").get().map(el => {
              const card = $(el);
              return {
                title: card.find("h3.as-anime-title").text().trim(),
                link: card.attr("href") || "",
                image: card.find("img").attr("src") || "",
                episode: card.find("span.jr-ep-text").text().trim(),
                type: card.find("span.jr-type-badge").text().trim(),
                time: card.find("span.time-text").text().replace("⏰", "").trim(),
                rating: card.find("span.rating-text").text().replace("⭐", "").trim(),
                members: card.find("span.members-text").text().replace("👤", "").trim(),
                genres: card.find("span.jr-genre-pill").get().map(g => $(g).text().trim())
              };
            })
          };
        }
      });
      return {
        status: true,
        result: {
          pengumuman_libur: libur,
          perlu_diperhatikan: notes,
          perkiraan_rilis_mendatang: upcoming,
          kalender_rilis: cal
        }
      };
    } catch (error) {
      return {
        status: false,
        result: error.message || error
      };
    }
  }
  async genres({
    sort = "az"
  } = {}) {
    try {
      const $ = await this._get("/genres/", {
        sort: sort,
        mode: "sort"
      });
      if (!$) return {
        status: false,
        result: []
      };
      const res = $("div.genre-grid-container a.genre-grid-card").get().map(el => {
        const card = $(el);
        const link = card.attr("href") || "";
        return {
          name: card.find("h3.genre-name").text().trim(),
          link: link,
          slug: link.replace(/\/$/, "").split("/").pop() || "",
          image: card.find("img").attr("src") || "",
          total_series: card.find('span[class*="count"]').text().trim(),
          ongoing_series: card.find('span[class*="ongoing"]').text().trim()
        };
      });
      return {
        status: true,
        result: res
      };
    } catch (error) {
      return {
        status: false,
        result: error.message || error
      };
    }
  }
  async detail({
    url = ""
  } = {}) {
    try {
      const targetUrl = url.startsWith("http") ? url : `/anime/${url}/`;
      const $ = await this._get(targetUrl);
      if (!$) return {
        status: false,
        result: null
      };
      const tH1 = $("h1.entry-title");
      let t = "";
      if (tH1.length > 0) {
        const span = tH1.find("span");
        t = span.length > 0 ? span.attr("data-title-default") || span.text().trim() : tH1.text().replace("Nonton", "").replace("Sub Indo", "").trim();
      }
      let poster = "";
      let score = "";
      let typeVal = "";
      let trailer = "";
      const ac = $("div.anime-card");
      if (ac.length > 0) {
        const side = ac.find("div.anime-card__sidebar");
        if (side.length > 0) {
          poster = side.find("img").attr("src") || "";
          const scDiv = side.find("div.anime-card__score");
          if (scDiv.length > 0) {
            score = scDiv.find("span.value").text().trim();
            typeVal = scDiv.find("span.type").text().trim();
          }
          trailer = side.find("a.trailerbutton").attr("href") || "";
        }
      }
      const details = {};
      const genres = [];
      let syn = "";
      if (ac.length > 0) {
        const main = ac.find("div.anime-card__main");
        if (main.length > 0) {
          main.find("ul.details-list li").get().map(el => {
            const li = $(el);
            const lbl = li.find("strong, span.detail-label");
            if (lbl.length > 0) {
              const labelText = lbl.text().replace(":", "").trim();
              details[labelText] = li.text().replace(lbl.text(), "").trim();
            }
          });
          main.find("div.anime-card__genres a").get().map(el => {
            genres.push({
              name: $(el).text().trim(),
              link: $(el).attr("href") || ""
            });
          });
          syn = main.find("div#tab-synopsis").text().trim();
        }
      }
      let status = "";
      let totalEpisodes = "";
      let duration = "";
      let season = "";
      let seasonLink = "";
      const qi = $("div.anime-card__quick-info");
      if (qi.length > 0) {
        status = qi.find('span[class*="status"]').text().trim();
        qi.find("span.info-item").get().map(el => {
          const txt = $(el).text();
          if (txt.toLowerCase().includes("episodes")) {
            totalEpisodes = txt.trim();
          } else if (txt.includes("min") || txt.includes("menit")) {
            duration = txt.trim();
          }
        });
        const sa = qi.find("span.season a");
        if (sa.length > 0) {
          season = sa.text().trim();
          seasonLink = sa.attr("href") || "";
        }
      }
      const episodes = [];
      const epSec = $("section.anime-card__episode-list-section");
      if (epSec.length > 0) {
        epSec.find("div.episode-list-items a.episode-item").get().map(el => {
          const a = $(el);
          episodes.push({
            title: a.find("span.ep-title").text().trim(),
            link: a.attr("href") || "",
            date: a.find("span.ep-date").text().trim()
          });
        });
      }
      const recommended = [];
      const relDiv = $("div.related");
      if (relDiv.length > 0) {
        relDiv.find("a.as-anime-card").get().map(el => {
          recommended.push(this._pC($, el));
        });
      }
      return {
        status: true,
        result: {
          title: t,
          poster: poster,
          score: score,
          type: typeVal,
          trailer: trailer,
          synopsis: syn,
          genres: genres,
          details: details,
          status: status,
          total_episodes: totalEpisodes,
          episode_duration: duration,
          season: season,
          season_link: seasonLink,
          episodes: episodes,
          recommended_series: recommended
        }
      };
    } catch (error) {
      return {
        status: false,
        result: error.message || error
      };
    }
  }
  async stream({
    url = ""
  } = {}) {
    try {
      const targetUrl = url.startsWith("http") ? url : `/${url}/`;
      const $ = await this._get(targetUrl);
      if (!$) return {
        status: false,
        result: null
      };
      const tH1 = $("h1.entry-title");
      const t = tH1.length > 0 ? tH1.text().trim() : "";
      let aTitle = "";
      let aLink = "";
      const bread = $("nav.breadcrumbs");
      if (bread.length > 0) {
        const links = bread.find("a").get().map(el => $(el)).filter(l => l.attr("href"));
        if (links.length >= 2) {
          const last = links[links.length - 1];
          aTitle = last.text().trim();
          aLink = last.attr("href") || "";
        }
      }
      let prev = null,
        next = null,
        allEps = null;
      const naveps = $("div.naveps");
      if (naveps.length > 0) {
        naveps.find("div.nvs").get().map(el => {
          const nvs = $(el);
          const a = nvs.find("a");
          if (a.length > 0) {
            const href = a.attr("href") || "";
            const lbl = a.text().toLowerCase();
            if (lbl.includes("prev")) prev = href;
            else if (lbl.includes("next")) next = href;
            else if (lbl.includes("all") || lbl.includes("episode")) allEps = href;
          } else if (nvs.hasClass("nvsc")) {
            const ac = nvs.find("a");
            if (ac.length > 0) allEps = ac.attr("href") || "";
          }
        });
      }
      let defVideo = "";
      const videoku = $("div#videoku");
      if (videoku.length > 0) {
        const iframe = videoku.find("iframe");
        if (iframe.length > 0) {
          defVideo = iframe.attr("src") || iframe.attr("data-src") || "";
        }
      }
      const servers = $("ul.player li.serverplayer").get().map(el => {
        const li = $(el);
        return {
          server_name: li.text().trim(),
          post_id: li.attr("data-post") || "",
          server_type: li.attr("data-type") || "",
          nume: li.attr("data-nume") || "",
          is_active: li.hasClass("on")
        };
      });
      const dldLinks = [];
      const dlArea = $("div#download_area");
      if (dlArea.length > 0) {
        const linker = dlArea.find("div#arealinker");
        if (linker.length > 0) {
          linker.find("div.listlink").get().map(el => {
            const list = $(el);
            const span = list.find("span");
            const fmt = span.length > 0 ? span.text().trim() : "Unknown";
            const lnks = list.find("a").get().map(aEl => {
              const a = $(aEl);
              return {
                label: a.text().trim(),
                url: a.attr("href") || ""
              };
            });
            dldLinks.push({
              format: fmt,
              links: lnks
            });
          });
        }
      }
      const epTerbaruSide = [];
      const side = $("#sidebar_right").length > 0 ? $("#sidebar_right") : $("body");
      let latestHeader = null;
      side.find("h3, h2").get().map(el => {
        if ($(el).text().includes("Episode Terbaru")) latestHeader = $(el);
      });
      if (latestHeader) {
        const ul = $(latestHeader).nextAll("ul.latestepisodes").first();
        if (ul.length > 0) {
          ul.find("li").get().map(el => {
            const li = $(el);
            const a = li.find("a");
            if (a.length > 0) {
              epTerbaruSide.push({
                title: a.find("div.lefts").text().trim(),
                link: a.attr("href") || "",
                episode: a.find("div.rights span.video").text().trim()
              });
            }
          });
        }
      }
      const popSummerSide = [];
      let sidePopHeader = null;
      side.find("h3, h2").get().map(el => {
        if ($(el).text().includes("Series Popular Summer")) sidePopHeader = $(el);
      });
      if (sidePopHeader) {
        const grid = $(sidePopHeader).nextAll("div.related").first();
        if (grid.length > 0) {
          grid.find("a.as-anime-card").get().map(el => {
            popSummerSide.push(this._pC($, el));
          });
        }
      }
      return {
        status: true,
        result: {
          title: t,
          anime_title: aTitle,
          anime_link: aLink,
          prev_episode_link: prev,
          next_episode_link: next,
          all_episodes_link: allEps,
          default_video_url: defVideo,
          video_servers: servers,
          download_links: dldLinks,
          episode_terbaru_sidebar: epTerbaruSide,
          series_popular_summer_sidebar: popSummerSide,
          nonce: this.lastNonce,
          ajax_url: this.lastAjaxUrl
        }
      };
    } catch (error) {
      return {
        status: false,
        result: error.message || error
      };
    }
  }
  async iframe({
    postId,
    post_id,
    nume,
    serverName,
    server_name,
    nonce = null,
    ajaxUrl = null,
    ajax_url = null
  } = {}) {
    try {
      const activePostId = postId || post_id;
      const activeServerName = serverName || server_name;
      const activeNonce = nonce || this.lastNonce;
      const activeAjaxUrl = ajaxUrl || ajax_url || this.lastAjaxUrl || "/wp-admin/admin-ajax.php";
      if (!activeNonce) {
        return {
          status: false,
          result: "Nonce is required. Call stream() first."
        };
      }
      const body = new URLSearchParams();
      body.append("action", "player_ajax");
      body.append("post", activePostId);
      body.append("nume", nume);
      body.append("serverName", activeServerName);
      body.append("nonce", activeNonce);
      const headers = {};
      if (this.lastUrl) {
        headers["Referer"] = this.lastUrl;
      }
      const res = await this._pst(activeAjaxUrl, body, {
        headers: headers
      });
      const $ = cheerio.load(res);
      const iframe = $("iframe");
      const src = iframe.length > 0 ? iframe.attr("src") || iframe.attr("data-src") || "" : "";
      return {
        status: true,
        result: src
      };
    } catch (error) {
      return {
        status: false,
        result: error.message || error
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "list", "search", "detail", "ongoing", "popular", "schedule", "genres", "stream", "iframe"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=search&query=naruto"
      }
    });
  }
  const api = new NontonAnime();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home();
        break;
      case "list":
        response = await api.list(params);
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
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'detail'.",
            example: "https://s13.nontonanimeid.boats/anime/judul-anime/"
          });
        }
        response = await api.detail(params);
        break;
      case "ongoing":
        response = await api.ongoing(params);
        break;
      case "popular":
        response = await api.popular(params);
        break;
      case "schedule":
        response = await api.schedule();
        break;
      case "genres":
        response = await api.genres(params);
        break;
      case "stream":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'stream'.",
            example: "https://s13.nontonanimeid.boats/episode/judul-episode-terbaru/"
          });
        }
        response = await api.stream(params);
        break;
      case "iframe":
        const activePostId = params.postId || params.post_id;
        const activeServerName = params.serverName || params.server_name;
        if (!activePostId || !params.nume || !activeServerName) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'postId' (atau 'post_id'), 'nume', dan 'serverName' (atau 'server_name') wajib diisi untuk action 'iframe'."
          });
        }
        response = await api.iframe(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
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