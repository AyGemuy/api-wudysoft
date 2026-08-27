import axios from "axios";
import * as cheerio from "cheerio";
class KwaiScraper {
  constructor() {
    try {
      this.base_url = "https://www.kwai.com";
      this.headers = {
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        cookie: "kpn=KWAI; apptype=41; sys=KWAI; client_type=3001; countryInfo=ID;"
      };
      console.log("[INIT] KwaiScraper instance berhasil diinisialisasi.");
    } catch (err) {
      console.error(`[INIT ERROR] ${err?.message || err}`);
    }
  }
  async req(target_url, opts = {}) {
    try {
      const final_url = target_url.startsWith("http") ? target_url : `${this.base_url}${target_url.startsWith("/") ? "" : "/"}${target_url}`;
      console.log(`[REQ] Fetching: ${final_url}`);
      const res = await axios.get(final_url, {
        headers: this.headers,
        timeout: opts?.timeout || 15e3,
        ...opts?.axios_config || {}
      });
      return res?.data || "";
    } catch (err) {
      console.error(`[REQ ERROR] Gagal request ke ${target_url}: ${err?.message || err}`);
      throw err;
    }
  }
  txt(str) {
    try {
      return (str || "").replace(/\s+/g, " ").trim();
    } catch (err) {
      console.error(`[TXT ERROR] ${err?.message || err}`);
      return "";
    }
  }
  tags(text) {
    try {
      const matches = (text || "").match(/#[\p{L}\p{N}_-]+/gu);
      return matches ? matches.map(t => t.trim()) : [];
    } catch (err) {
      console.error(`[TAGS ERROR] ${err?.message || err}`);
      return [];
    }
  }
  toSnakeCase(obj) {
    try {
      if (Array.isArray(obj)) {
        return obj.map(v => this.toSnakeCase(v));
      } else if (obj !== null && typeof obj === "object") {
        return Object.keys(obj).reduce((acc, key) => {
          const cleanKey = key.replace(/^@/, "");
          const snakeKey = cleanKey.replace(/([A-Z]+)/g, "_$1").replace(/^_/, "").toLowerCase();
          acc[snakeKey] = this.toSnakeCase(obj[key]);
          return acc;
        }, {});
      }
      return obj;
    } catch (err) {
      return obj;
    }
  }
  parseUrl(input) {
    try {
      const str = String(input || "").trim();
      const video_id = str.match(/video\/(\d+)/i)?.[1] || str.match(/(\d{15,})/)?.[1] || "";
      const username = str.match(/@([a-zA-Z0-9_.-]+)/)?.[1] || "";
      return {
        video_id: video_id,
        username: username
      };
    } catch (err) {
      console.error(`[PARSE_URL ERROR] ${err?.message || err}`);
      return {
        video_id: "",
        username: ""
      };
    }
  }
  parseFeed(html, $) {
    try {
      const _ = $ || cheerio.load(html || "");
      const rawHtml = typeof html === "string" ? html : $.html() || "";
      try {
        const jsonLdScripts = _('script[type="application/ld+json"]').map((_, el) => _(el).html() || "").get();
        for (const jsonStr of jsonLdScripts) {
          if (!jsonStr.includes("ItemList")) continue;
          const jsonData = JSON.parse(jsonStr);
          const rawItems = jsonData?.itemListElement || [];
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            return rawItems.map(item => {
              const videoUrl = item?.url || "";
              const videoId = videoUrl.split("/").pop() || null;
              const caption = item?.description === "..." ? "" : item?.description || item?.name || "";
              const interactions = item?.interactionStatistic || [];
              const watchStat = interactions.find(s => s?.interactionType?.["@type"]?.includes("WatchAction"));
              const likeStat = interactions.find(s => s?.interactionType?.["@type"]?.includes("LikeAction"));
              const shareStat = interactions.find(s => s?.interactionType?.["@type"]?.includes("ShareAction"));
              const converted = this.toSnakeCase(item);
              return {
                ...converted,
                video_id: videoId,
                url: videoUrl || null,
                caption: caption || null,
                hashtags: this.tags(caption || item?.name || ""),
                video_url: item?.contentUrl || null,
                thumbnail: item?.thumbnailUrl?.[0] || null,
                duration: item?.duration || null,
                dimensions: item?.width && item?.height ? {
                  width: item.width,
                  height: item.height
                } : null,
                transcript: item?.transcript || null,
                is_ai_generated: false,
                author: item?.creator?.mainEntity ? {
                  name: item.creator.mainEntity.name || null,
                  username: item.creator.mainEntity.alternateName || null,
                  url: item.creator.mainEntity.url || null,
                  avatar: item.creator.mainEntity.image || null,
                  bio: item.creator.mainEntity.description || null
                } : null,
                audio: item?.audio ? {
                  name: item.audio.name || null,
                  author: item.audio.author || null
                } : null,
                stats: {
                  views: String(watchStat?.userInteractionCount || "0"),
                  likes: String(likeStat?.userInteractionCount || "0"),
                  shares: String(shareStat?.userInteractionCount || "0"),
                  comments: String(item?.commentCount || "0")
                },
                uploaded_at: item?.uploadDate || null
              };
            });
          }
        }
      } catch (e) {
        console.warn(`[PARSE JSON-LD WARN] ${e?.message || e}`);
      }
      try {
        const rawMatches = rawHtml.match(/self\.__next_f\.push\(\[\s*\d+\s*,\s*("[\s\S]*?")\s*\]\)/g) || [];
        for (const fullScript of rawMatches) {
          if (!fullScript.includes('\\"feeds\\"') && !fullScript.includes('"feeds"')) continue;
          const jsonStringMatch = fullScript.match(/self\.__next_f\.push\(\[\s*\d+\s*,\s*("[\s\S]*")\s*\]\)/);
          if (!jsonStringMatch || !jsonStringMatch[1]) continue;
          let rawPayload = "";
          try {
            rawPayload = JSON.parse(jsonStringMatch[1]);
          } catch {
            rawPayload = jsonStringMatch[1];
          }
          const feedsIdx = rawPayload.indexOf('"feeds":[');
          if (feedsIdx === -1) continue;
          const startIdx = rawPayload.indexOf("[", feedsIdx);
          let openBrackets = 0;
          let endIdx = -1;
          for (let i = startIdx; i < rawPayload.length; i++) {
            if (rawPayload[i] === "[") openBrackets++;
            else if (rawPayload[i] === "]") {
              openBrackets--;
              if (openBrackets === 0) {
                endIdx = i + 1;
                break;
              }
            }
          }
          if (endIdx !== -1) {
            const feedsJsonStr = rawPayload.slice(startIdx, endIdx);
            const feedsData = JSON.parse(feedsJsonStr);
            if (Array.isArray(feedsData) && feedsData.length > 0) {
              return feedsData.map(f => {
                const photoId = f.photo_id_str || String(f.photo_id || "");
                const authorUsername = f.kwai_id || f.user_id_str || "";
                const videoUrl = f.main_mv_urls?.[0]?.url || f.transcode_manifest_info?.adaptationSet?.[0]?.representation?.[0]?.url || f.transcode_manifest_info?.adaptationSet?.[0]?.representation?.[1]?.url || null;
                const thumb = f.cover_first_frame_urls?.[0]?.url || f.cover_thumbnail_urls?.[0]?.url || null;
                const rawCaption = f.caption === "..." ? "" : f.caption || "";
                const transcript = f.transcript || f.transcription || f.photo_text || f.voice_text || null;
                const convertedFeed = this.toSnakeCase(f);
                return {
                  ...convertedFeed,
                  video_id: photoId || null,
                  url: photoId ? `${this.base_url}/@${authorUsername}/video/${photoId}` : null,
                  caption: rawCaption || null,
                  hashtags: this.tags(rawCaption),
                  is_ai_generated: Boolean(f.is_ai_generated || f.is_ai_content),
                  video_url: videoUrl,
                  thumbnail: thumb,
                  duration: f.ext_params?.video ? Math.round(f.ext_params.video / 1e3) : null,
                  dimensions: f.ext_params?.w && f.ext_params?.h ? {
                    width: f.ext_params.w,
                    height: f.ext_params.h
                  } : null,
                  transcript: transcript,
                  is_muted: false,
                  author: {
                    name: f.user_name || null,
                    username: authorUsername || null,
                    url: authorUsername ? `${this.base_url}/@${authorUsername}` : null,
                    avatar: f.headurls?.[0]?.url || null,
                    bio: f.user_text || null
                  },
                  audio: null,
                  stats: {
                    views: String(f.view_count || "0"),
                    likes: String(f.like_count || "0"),
                    shares: String(f.forward_count || "0"),
                    comments: String(f.comment_count || "0")
                  },
                  uploaded_at: f.time || null
                };
              });
            }
          }
        }
      } catch (e) {
        console.warn(`[PARSE RSC WARN] ${e?.message || e}`);
      }
      return _("article.VideoCard_video-card__pW8vI").map((idx, el) => {
        const card = _(el);
        const video_link = card.find('a[href*="/video/"]').first();
        const video_path = video_link.attr("href") || "";
        const video_id = video_path ? video_path.split("/").pop() : "";
        const full_video_url = video_path ? `${this.base_url}${video_path}` : null;
        const user_link = card.find(".UserInfo_user-info-container__p9jbY");
        const author_url = user_link.attr("href") || "";
        const author_name = this.txt(card.find(".UserInfo_name__tj_qg").text()) || user_link.attr("title") || null;
        const author_avatar = card.find(".UserInfo_avatar__6PLWc").attr("src") || null;
        const upload_time = this.txt(card.find(".UserInfo_time__dyUPY").text()) || null;
        const username = author_url ? author_url.replace(/^\/@?/, "") : null;
        const caption_elem = card.find(".Caption_caption-warp__We7AR");
        const raw_caption = this.txt(caption_elem.text()) || video_link.attr("title") || "";
        const caption = raw_caption === "..." ? "" : raw_caption;
        const tag_links = caption_elem.find('a[href*="/discover/"]').map((i, a) => this.txt(_(a).text())).get();
        const hashtags = tag_links.length > 0 ? tag_links : this.tags(caption);
        const ai_notice = card.find(".VideoCard_ai-notice__HB61f").text();
        const is_muted = card.find(".VideoCard_muted-warp__nqOMJ").length > 0;
        const video_elem = card.find("video").first();
        const video_src = video_elem.attr("src") || null;
        const video_poster = video_elem.attr("poster") || null;
        const actions = card.find(".VideoAction_item__swtY9").map((i, a) => this.txt(_(a).find(".VideoAction_num__gtavx").text())).get();
        const likes_count = actions?.[0] || "0";
        const comments_count = actions?.[1] || "0";
        return {
          video_id: video_id || null,
          url: full_video_url,
          caption: caption || null,
          hashtags: hashtags,
          is_ai_generated: Boolean(ai_notice),
          video_url: video_src,
          thumbnail: video_poster,
          duration: null,
          dimensions: null,
          transcript: null,
          is_muted: is_muted,
          author: {
            name: author_name,
            username: username,
            url: author_url ? `${this.base_url}${author_url}` : null,
            avatar: author_avatar,
            bio: null
          },
          audio: null,
          stats: {
            views: "0",
            likes: likes_count,
            shares: "0",
            comments: comments_count
          },
          uploaded_at: upload_time
        };
      }).get();
    } catch (err) {
      console.error(`[PARSE_FEED ERROR] ${err?.message || err}`);
      return [];
    }
  }
  async search({
    query,
    ...rest
  }) {
    try {
      console.log(`[SEARCH] Memulai pencarian query: "${query}"`);
      if (!query) throw new Error('Parameter "query" wajib diisi.');
      const target_url = `${this.base_url}/discover/${encodeURIComponent(query)}`;
      const html = await this.req(target_url, rest);
      const $ = cheerio.load(html);
      const input_query = $(".adm-input-element").val() || query;
      const meta_desc = $('meta[name="description"]').attr("content") || "";
      const items = this.parseFeed(html, $);
      console.log(`[SEARCH] Ditemukan ${items.length} hasil untuk "${input_query}".`);
      return {
        status: true,
        result: {
          query: input_query,
          description: meta_desc || null,
          total: items.length,
          items: items
        }
      };
    } catch (err) {
      console.error(`[SEARCH ERROR] ${err?.message || err}`);
      return {
        status: false,
        result: {
          message: err?.message || "Terjadi kesalahan saat mencari video.",
          items: []
        }
      };
    }
  }
  async home({
    ...rest
  } = {}) {
    try {
      console.log("[HOME] Mengambil feed home/discover...");
      const target_url = `${this.base_url}/discover`;
      const html = await this.req(target_url, rest);
      const $ = cheerio.load(html);
      const items = this.parseFeed(html, $);
      console.log(`[HOME] Ditemukan ${items.length} item.`);
      return {
        status: true,
        result: {
          total: items.length,
          items: items
        }
      };
    } catch (err) {
      console.error(`[HOME ERROR] ${err?.message || err}`);
      return {
        status: false,
        result: {
          message: err?.message || "Terjadi kesalahan saat memuat feed home.",
          items: []
        }
      };
    }
  }
  async profile({
    name,
    ...rest
  }) {
    try {
      const username = (name || "").replace(/^@/, "").trim();
      console.log(`[PROFILE] Mengambil profil: "${username}"`);
      if (!username) throw new Error('Parameter "name" wajib diisi.');
      const target_url = `${this.base_url}/@${username}`;
      const html = await this.req(target_url, rest);
      const _ = cheerio.load(html);
      const user_name = this.txt(_(".Nav_user-name__gP07a").text());
      const avatar = _(".UserBaseInfo_img__SsCTo img").attr("src") || "";
      const stats_items = _(".UserBaseInfo_item__UsnhV").map((idx, el) => this.txt(_(el).find(".UserBaseInfo_itemNumber__CnI9H").text())).get();
      const followers = stats_items?.[0] || "0";
      const following = stats_items?.[1] || "0";
      const likes = stats_items?.[2] || "0";
      const id_spans = _(".UserBaseInfo_idContent__Z4Q19 span").map((idx, el) => this.txt(_(el).text())).get();
      const user_id = id_spans?.[1] || username;
      const gender = id_spans?.[3] || null;
      const bio = this.txt(_(".UserBaseInfo_profile__CtHRb").text());
      const total_posts = this.txt(_(".PostList_tab-title__TZN8i div").first().text()) || "0";
      const playlists = _(".AlbumList_list__3C2lB a").map((idx, el) => {
        const item = _(el);
        const playlist_url = item.attr("href") || "";
        const playlist_id = playlist_url.split("/").pop() || "";
        const title = this.txt(item.find(".AlbumList_list-item-content__ZpKqt").text());
        const count = this.txt(item.find(".AlbumList_list-item-num__OnwCX").text());
        const thumb = item.find("img.AlbumList_list-item-img__l7sbR").attr("src") || "";
        return {
          playlist_id: playlist_id || null,
          title: title === "..." ? "" : title,
          url: playlist_url || null,
          thumbnail: thumb || null,
          video_count: count || "0"
        };
      }).get();
      const posts = _(".PostCard_profile-post-card__lNlQM").map((idx, el) => {
        const card = _(el);
        const link = card.find("a.PostCard_profile-post-card-link__EtObl").attr("href") || "";
        const video_id = link ? link.split("/").pop() : "";
        const thumb = card.find("img.PostCard_profile-post-card-img__uxSxk").attr("src") || "";
        const like_count = this.txt(card.find(".PostCard_count__L44ZT").text()) || "0";
        return {
          video_id: video_id || null,
          url: link ? `${this.base_url}${link}` : null,
          thumbnail: thumb || null,
          likes: like_count
        };
      }).get();
      console.log(`[PROFILE] Sukses memuat profil: ${user_name || username}`);
      return {
        status: true,
        result: {
          user_id: user_id,
          username: username,
          name: user_name || username,
          avatar: avatar || null,
          gender: gender,
          bio: bio || null,
          stats: {
            followers: followers,
            following: following,
            likes: likes,
            total_posts: total_posts
          },
          playlists: playlists,
          posts: posts
        }
      };
    } catch (err) {
      console.error(`[PROFILE ERROR] ${err?.message || err}`);
      return {
        status: false,
        result: {
          message: err?.message || "Terjadi kesalahan saat memuat profil."
        }
      };
    }
  }
  async detail({
    url,
    ...rest
  }) {
    try {
      console.log(`[DETAIL] Mengambil detail video: "${url}"`);
      if (!url) throw new Error('Parameter "url" wajib diisi.');
      let fetch_url = String(url).trim();
      if (!fetch_url.startsWith("http")) {
        if (fetch_url.startsWith("/")) {
          fetch_url = `${this.base_url}${fetch_url}`;
        } else if (fetch_url.startsWith("@")) {
          fetch_url = `${this.base_url}/${fetch_url}`;
        } else {
          fetch_url = `${this.base_url}/video/${fetch_url}`;
        }
      }
      const {
        video_id: parsed_id,
        username: parsed_user
      } = this.parseUrl(fetch_url);
      const html = await this.req(fetch_url, rest);
      const _ = cheerio.load(html);
      const preload_script = _("script#video-detail-preload").html() || _("script").text() || "";
      const script_video_match = preload_script.match(/_preloadWebFeedVideo\.src\s*=\s*['"]([^'"]+)['"]/);
      const script_video_url = script_video_match?.[1] || "";
      const main_slide = _(".swiper-slide-active").length ? _(".swiper-slide-active") : _(".swiper-slide").first();
      const web_feed_elem = main_slide.find('[id^="web-feed-"]');
      const web_feed_id = web_feed_elem.attr("id")?.replace("web-feed-", "");
      const container_id = main_slide.find(".video-player-container").attr("id");
      const resolved_id = web_feed_id || container_id || parsed_id || null;
      const video_elem = main_slide.find("video").first();
      const video_src = video_elem.attr("src") || script_video_url || _("video").first().attr("src") || null;
      const custom_poster = main_slide.find(".FeedItem_web-feed-feed-item-custom-poster__zhiid").attr("src");
      const poster = custom_poster || video_elem.attr("poster") || null;
      const author_name = this.txt(main_slide.find(".Description_feed-desc-author___L_D_, .video-info .author").first().text()) || parsed_user || null;
      const raw_desc = this.txt(main_slide.find(".Description_feed-desc-caption__Z_Ko5, .video-info .desc").first().text());
      const caption = raw_desc === "..." ? "" : raw_desc;
      const avatar = main_slide.find(".Actions_actions-author-avatar__ISdLI, .video-action .avatar img.head").attr("src") || null;
      const follow_text = this.txt(main_slide.find(".Actions_actions-author-follow-btn__6Ej7X, .video-action .follow").text()) || null;
      const ai_notice = main_slide.find(".Description_feed-desc-ai-notice__jTfwq, .VideoCard_ai-notice__HB61f").text();
      const is_muted = main_slide.find(".video-info .muted, .VideoCard_muted-warp__nqOMJ").length > 0;
      const action_numbers = main_slide.find(".Actions_actions-item-number__RQa9P, .video-action .common .number").map((idx, el) => this.txt(_(el).text())).get();
      const likes = action_numbers?.[0] || "0";
      const comments = action_numbers?.[1] || "0";
      const shares = action_numbers?.[2] || "0";
      const related_videos = _(".swiper-slide").not(".swiper-slide-active").map((idx, el) => {
        const slide = _(el);
        const rel_feed_elem = slide.find('[id^="web-feed-"]');
        const rel_id = rel_feed_elem.attr("id")?.replace("web-feed-", "") || slide.find(".video-player-container").attr("id");
        if (!rel_id) return null;
        const rel_video = slide.find("video");
        const rel_poster = slide.find(".FeedItem_web-feed-feed-item-custom-poster__zhiid").attr("src") || rel_video.attr("poster") || null;
        const rel_author = this.txt(slide.find(".Description_feed-desc-author___L_D_, .video-info .author").text()) || null;
        const rel_desc = this.txt(slide.find(".Description_feed-desc-caption__Z_Ko5, .video-info .desc").text());
        const rel_actions = slide.find(".Actions_actions-item-number__RQa9P, .video-action .common .number").map((i, a) => this.txt(_(a).text())).get();
        return {
          video_id: rel_id,
          url: `${this.base_url}/video/${rel_id}`,
          caption: rel_desc === "..." ? "" : rel_desc,
          hashtags: this.tags(rel_desc),
          video_url: rel_video.attr("src") || null,
          thumbnail: rel_poster,
          author: {
            name: rel_author,
            avatar: slide.find(".Actions_actions-author-avatar__ISdLI, .video-action .avatar img.head").attr("src") || null
          },
          stats: {
            likes: rel_actions?.[0] || "0",
            comments: rel_actions?.[1] || "0",
            shares: rel_actions?.[2] || "0"
          }
        };
      }).get().filter(Boolean);
      console.log(`[DETAIL] Sukses memuat video ID: ${resolved_id}`);
      return {
        status: true,
        result: {
          video_id: resolved_id,
          url: fetch_url,
          caption: caption || null,
          hashtags: this.tags(caption),
          is_ai_generated: Boolean(ai_notice),
          video_url: video_src,
          thumbnail: poster,
          is_muted: is_muted,
          author: {
            name: author_name,
            username: parsed_user || null,
            avatar: avatar,
            follow_text: follow_text
          },
          stats: {
            likes: likes,
            comments: comments,
            shares: shares
          },
          related_videos: related_videos
        }
      };
    } catch (err) {
      console.error(`[DETAIL ERROR] ${err?.message || err}`);
      return {
        status: false,
        result: {
          message: err?.message || "Terjadi kesalahan saat memuat detail video."
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["home", "search", "profile", "detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          home: "/?action=home",
          search: "/?action=search&query=Douyin",
          profile: "/?action=profile&name=snapdouyin",
          detail: "/?action=detail&url=https://www.kwai.com/@snapdouyin/video/5238680903365743246"
        }
      }
    });
  }
  const api = new KwaiScraper();
  try {
    let response;
    switch (action) {
      case "home":
        response = await api.home(params);
        break;
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/?action=search&query=Douyin"
          });
        }
        response = await api.search(params);
        break;
      case "profile":
        if (!params.name) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'name' (username) wajib diisi untuk action 'profile'.",
            example: "/?action=profile&name=snapdouyin"
          });
        }
        response = await api.profile(params);
        break;
      case "detail":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' (URL atau Video ID) wajib diisi untuk action 'detail'.",
            example: "https://www.kwai.com/@snapdouyin/video/5238680903365743246 atau ID: 5238680903365743246"
          });
        }
        response = await api.detail(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      status: response?.status ?? true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error?.message || "Unknown Error"
    });
  }
}