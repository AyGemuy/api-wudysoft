import axios from "axios";
import crypto from "crypto";
const MT = [161, 158, 189, 103, 2, 8, 54, 66, 27, 65, 108, 98, 114, 215, 107, 119, 96, 242, 19, 248, 230, 72, 218, 166, 239, 246, 252, 245, 137, 179, 243, 206, 197, 236, 9, 145, 249, 225, 0, 176, 28, 13, 250, 244, 35, 48, 57, 216, 16, 127, 220, 73, 21, 224, 124, 199, 228, 85, 191, 154, 162, 140, 160, 200, 234, 50, 113, 62, 5, 229, 178, 104, 133, 195, 86, 194, 11, 42, 134, 89, 193, 120, 4, 47, 152, 192, 126, 101, 63, 196, 208, 172, 38, 163, 150, 132, 240, 112, 117, 146, 255, 118, 141, 58, 110, 41, 81, 144, 188, 88, 32, 175, 46, 59, 167, 68, 93, 139, 227, 121, 251, 182, 180, 60, 94, 136, 156, 201, 147, 29, 78, 143, 40, 109, 185, 202, 138, 164, 130, 186, 170, 31, 45, 91, 18, 173, 100, 187, 254, 39, 97, 155, 74, 111, 223, 26, 203, 34, 67, 23, 237, 177, 207, 231, 20, 204, 159, 71, 125, 80, 174, 241, 221, 92, 84, 90, 168, 122, 153, 247, 77, 213, 64, 6, 184, 10, 116, 37, 149, 129, 99, 83, 115, 123, 128, 135, 33, 70, 238, 253, 214, 56, 76, 210, 226, 44, 51, 25, 82, 157, 53, 106, 131, 148, 151, 142, 198, 183, 169, 55, 212, 95, 43, 211, 36, 75, 209, 102, 14, 171, 190, 7, 12, 105, 181, 15, 24, 61, 17, 52, 87, 222, 30, 3, 233, 232, 22, 165, 219, 79, 217, 69, 1, 235, 205, 49];
const GT = [39, 197, 251, 159, 23, 170, 21, 209, 188, 18, 9, 13, 212, 105, 14, 200, 43, 100, 89, 161, 62, 27, 29, 19, 239, 134, 234, 109, 24, 112, 173, 133, 95, 32, 73, 91, 35, 107, 196, 125, 226, 113, 20, 94, 81, 143, 75, 44, 151, 220, 156, 246, 117, 41, 85, 240, 122, 187, 193, 15, 189, 175, 157, 211, 37, 26, 40, 178, 243, 6, 229, 179, 202, 233, 74, 114, 154, 204, 48, 165, 57, 127, 8, 207, 65, 61, 201, 206, 86, 195, 77, 22, 110, 181, 237, 254, 97, 160, 47, 138, 69, 221, 12, 140, 70, 191, 68, 255, 180, 5, 210, 245, 250, 56, 80, 249, 205, 144, 106, 174, 166, 121, 99, 244, 162, 194, 185, 82, 53, 84, 88, 230, 214, 64, 135, 228, 42, 58, 103, 52, 158, 218, 10, 124, 46, 167, 198, 208, 216, 222, 217, 153, 155, 59, 132, 223, 98, 142, 123, 152, 90, 199, 111, 129, 76, 146, 66, 118, 172, 71, 164, 1, 219, 247, 79, 36, 28, 4, 141, 72, 50, 137, 149, 120, 139, 236, 128, 227, 38, 115, 253, 241, 83, 203, 49, 213, 238, 232, 30, 186, 182, 184, 183, 176, 16, 148, 3, 92, 130, 0, 93, 34, 54, 25, 67, 150, 33, 102, 192, 168, 242, 2, 231, 87, 252, 55, 171, 177, 136, 248, 31, 96, 119, 163, 11, 45, 7, 60, 78, 131, 147, 104, 116, 215, 225, 190, 224, 126, 63, 169, 101, 235, 145, 51, 17, 108];
class Mangatoon {
  constructor() {
    this.domain = "https://sg.mangatoon.mobi";
    this.code = "66c10a61bd916c23f3b33810d3785d17";
    this.app = {
      type: "2",
      _preference: "girl",
      _webp: "false",
      _platform: "web",
      _v: "2.01.02",
      _language: "id",
      _token: "897aeecc13b29bebec65101f2d7b528a65",
      _udid: "da616065-0cb3-479f-8a27-fc19385d10d3"
    };
  }
  decode(buf) {
    const bin = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    const a = bin.length % MT.length;
    let n = [...GT];
    if (a > 0) {
      n = Array(GT.length).fill(0);
      for (let i = 0; i < GT.length; i++) {
        let o = i + a;
        if (o >= GT.length) o -= GT.length;
        n[o] = GT[i];
      }
    }
    const s = Array(n.length).fill(0);
    for (let r = 0; r < n.length; r++) s[n[r]] = r;
    let o = "";
    for (let c = 0; c < bin.length; c++) o += String.fromCharCode(MT[s[bin[c]]]);
    return o;
  }
  parse(buf) {
    const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    try {
      return JSON.parse(b.toString("utf8"));
    } catch (_) {}
    try {
      return JSON.parse(this.decode(b));
    } catch (_) {}
    return null;
  }
  sign(api, data) {
    let s = api;
    for (const k of Object.keys(data).sort()) s += `${k}=${data[k]}&`;
    return crypto.createHash("md5").update(s.slice(0, -1) + this.code).digest("hex");
  }
  async req(api, {
    p = {},
    post = null
  } = {}) {
    const q = {
      ...p,
      ...this.app,
      _: Math.floor(Date.now() / 1e3)
    };
    q.sign = this.sign(api, q);
    const cfg = {
      params: q,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    };
    try {
      const r = post ? await axios.post(this.domain + api, post, cfg) : await axios.get(this.domain + api, cfg);
      return r.data?.status === "success" ? r.data.data : null;
    } catch (e) {
      return null;
    }
  }
  async home({
    ...p
  } = {}) {
    try {
      return await this.req("/api/content/list", {
        p: p
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async banners({
    banner_type = 0,
    ...p
  } = {}) {
    try {
      return await this.req("/api/homepage/banners", {
        p: {
          banner_type: banner_type,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async icons({
    icon_type = 0,
    ...p
  } = {}) {
    try {
      return await this.req("/api/homepage/icons", {
        p: {
          icon_type: icon_type,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async suggestions({
    suggestion_type = 0,
    ...p
  } = {}) {
    try {
      return await this.req("/api/homepage/suggestions", {
        p: {
          suggestion_type: suggestion_type,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async detail({
    id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/content/detail", {
        p: {
          id: id,
          ...p
        }
      });
    } catch (e) {
      return null;
    }
  }
  async episodes({
    id,
    contentType = 1,
    ...p
  } = {}) {
    try {
      return await this.req("/api/content/episodes", {
        p: {
          id: id,
          contentType: contentType,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async extend({
    content_id,
    placement = "detail",
    ...p
  } = {}) {
    try {
      return await this.req("/api/content/extend", {
        p: {
          content_id: content_id,
          placement: placement,
          ...p
        }
      });
    } catch (e) {
      return null;
    }
  }
  async series({
    id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/content/seriesContents", {
        p: {
          id: id,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async share_text({
    content_id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/content/getContentShareText", {
        p: {
          content_id: content_id,
          ...p
        }
      });
    } catch (e) {
      return null;
    }
  }
  async update_info({
    items = {},
    ...p
  } = {}) {
    try {
      return await this.req("/api/content/getContentUpdateInfo", {
        p: p,
        post: items
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async dl_episodes({
    content_id,
    episode_ids,
    type = 1,
    ...p
  } = {}) {
    try {
      const body = {
        content_id: String(content_id),
        episode_ids: episode_ids,
        type: String(type)
      };
      return await this.req("/api/content/downloadEpisodes", {
        p: {
          content_id: content_id,
          ...p
        },
        post: body
      });
    } catch (e) {
      return null;
    }
  }
  async report_title({
    title,
    ...p
  } = {}) {
    try {
      return await this.req("/api/content/reportContentTitle", {
        p: p,
        post: {
          title: title,
          ...p
        }
      });
    } catch (e) {
      return null;
    }
  }
  async autocomplete({
    word,
    ...p
  } = {}) {
    try {
      return await this.req("/api/search/autoCompleteV2", {
        p: {
          word: word,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async search_tab({
    from = "",
    content_type = "",
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/mangatoon-api/search/tab", {
        p: {
          from: from,
          content_type: content_type,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async search({
    word,
    type = "",
    force_search_title = "",
    end_status = "",
    order = "",
    page = 1,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/mangatoon-api/search/list", {
        p: {
          word: word,
          type: type,
          force_search_title: force_search_title,
          end_status: end_status,
          order: order,
          page: page,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async search_authors({
    keyword,
    page = 1,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/mangatoon-api/search/authors", {
        p: {
          keyword: keyword,
          page: page,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async search_topics({
    keyword,
    limit = 10,
    page = 1,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/community/search/topics", {
        p: {
          keyword: keyword,
          limit: limit,
          page: page,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async search_posts({
    keyword,
    limit = 10,
    page = 1,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/community/search/posts", {
        p: {
          keyword: keyword,
          limit: limit,
          page: page,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async rank_list({
    ...p
  } = {}) {
    try {
      return await this.req("/api/rankings/newContentRankingList", {
        p: p
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async rank_filters({
    page_source = 1,
    ...p
  } = {}) {
    try {
      return await this.req("/api/rankings/newFilters", {
        p: {
          page_source: page_source,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async rank_tags({
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/mangatoon-api/rank/topTags", {
        p: p
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async ch({
    id,
    ...p
  } = {}) {
    try {
      const r = await axios.get(this.domain + "/api/fictions/content", {
        params: {
          id: id,
          ...p,
          ...this.app,
          _: Math.floor(Date.now() / 1e3),
          sign: this.sign("/api/fictions/content", {
            id: id,
            ...p,
            ...this.app,
            _: Math.floor(Date.now() / 1e3)
          })
        },
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });
      const d = r.data?.status === "success" ? r.data.data : null;
      if (!d) return null;
      if (typeof d === "object") return d;
      const file = await axios.get(d, {
        responseType: "arraybuffer"
      });
      return this.parse(Buffer.from(file.data));
    } catch (e) {
      return null;
    }
  }
  async segment_infos({
    content_id,
    episode_id,
    segment_version = 0,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/mangatoon-api/fictionSegment/infos", {
        p: {
          content_id: content_id,
          episode_id: episode_id,
          segment_version: segment_version,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async dl_all({
    id,
    onProgress = null,
    concurrency = 3
  } = {}) {
    try {
      const eps = await this.episodes({
        id: id
      });
      if (!eps.length) return [];
      const out = Array(eps.length).fill(null);
      let done = 0;
      for (let i = 0; i < eps.length; i += concurrency) {
        await Promise.all(eps.slice(i, i + concurrency).map(async (ep, ci) => {
          out[i + ci] = {
            ep: ep,
            data: await this.ch({
              id: ep.id
            })
          };
          onProgress?.(++done, eps.length, ep);
        }));
      }
      return out;
    } catch (e) {
      return [];
    }
  }
  async video_play({
    episode_id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/video/play", {
        p: {
          episode_id: episode_id,
          ...p
        }
      });
    } catch (e) {
      return null;
    }
  }
  async audio_list({
    id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/audio/getAudioList", {
        p: {
          id: id,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async audio_detail({
    audio_id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/audio/creationCenter/audioDetail", {
        p: {
          audio_id: audio_id,
          ...p
        }
      });
    } catch (e) {
      return null;
    }
  }
  async comments({
    content_id,
    episode_id = 0,
    type = 1,
    limit = 20,
    ...p
  } = {}) {
    try {
      return await this.req("/api/comments/index", {
        p: {
          content_id: content_id,
          episode_id: episode_id,
          type: type,
          limit: limit,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async score_comments({
    id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/comments/getScoreComment", {
        p: {
          id: id,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async hot_topics({
    only_show_topic = 1,
    ...p
  } = {}) {
    try {
      return await this.req("/api/post/hotTopics", {
        p: {
          only_show_topic: only_show_topic,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async community_cats({
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/community/category/list", {
        p: p
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async community_topics({
    category_ids,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/community/category/categoryTopicList", {
        p: {
          category_ids: category_ids,
          ...p
        }
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async user_follows({
    ...p
  } = {}) {
    try {
      return await this.req("/api/topic/getUserFollowsV2", {
        p: p
      }) ?? [];
    } catch (e) {
      return [];
    }
  }
  async zone_info({
    id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/mangatoon-api/contentZone/info", {
        p: {
          id: id,
          ...p
        }
      });
    } catch (e) {
      return null;
    }
  }
  async zone_collection({
    id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/mangatoon-api/contentZone/collectionInfo", {
        p: {
          id: id,
          ...p
        }
      });
    } catch (e) {
      return null;
    }
  }
  async contribute_info({
    content_type = 2,
    ...p
  } = {}) {
    try {
      return await this.req("/api/contribution/getContributeInfo", {
        p: {
          content_type: content_type,
          ...p
        }
      });
    } catch (e) {
      return null;
    }
  }
  async novel_char({
    character_id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/novel/fictions/characterInfo", {
        p: {
          character_id: character_id,
          ...p
        }
      });
    } catch (e) {
      return null;
    }
  }
  async dialogue_char({
    character_id,
    ...p
  } = {}) {
    try {
      return await this.req("/api/contributiondialogues/characterInfo", {
        p: {
          character_id: character_id,
          ...p
        }
      });
    } catch (e) {
      return null;
    }
  }
  async reward_info({
    ...p
  } = {}) {
    try {
      return await this.req("/api/v2/mangatoon-api/reward/info", {
        p: p
      });
    } catch (e) {
      return null;
    }
  }
}
const REQUIRED = {
  detail: ["id"],
  episodes: ["id"],
  extend: ["content_id"],
  series: ["id"],
  share_text: ["content_id"],
  update_info: ["items"],
  dl_episodes: ["content_id", "episode_ids"],
  report_title: ["title"],
  autocomplete: ["word"],
  search: ["word"],
  search_authors: ["keyword"],
  search_topics: ["keyword"],
  search_posts: ["keyword"],
  ch: ["id"],
  segment_infos: ["content_id", "episode_id"],
  dl_all: ["id"],
  video_play: ["episode_id"],
  audio_list: ["id"],
  audio_detail: ["audio_id"],
  comments: ["content_id"],
  score_comments: ["id"],
  community_topics: ["category_ids"],
  zone_info: ["id"],
  zone_collection: ["id"],
  novel_char: ["character_id"],
  dialogue_char: ["character_id"]
};
const VALID_ACTIONS = ["home", "banners", "icons", "suggestions", "detail", "episodes", "extend", "series", "share_text", "update_info", "dl_episodes", "report_title", "autocomplete", "search_tab", "search", "search_authors", "search_topics", "search_posts", "rank_list", "rank_filters", "rank_tags", "ch", "segment_infos", "dl_all", "video_play", "audio_list", "audio_detail", "comments", "score_comments", "hot_topics", "community_cats", "community_topics", "user_follows", "zone_info", "zone_collection", "contribute_info", "novel_char", "dialogue_char", "reward_info"];
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      valid_actions: VALID_ACTIONS,
      usage: {
        method: "GET / POST",
        example: "/?action=search&word=dragon"
      }
    });
  }
  if (!VALID_ACTIONS.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: VALID_ACTIONS
    });
  }
  const missing = (REQUIRED[action] || []).filter(k => params[k] === undefined || params[k] === "");
  if (missing.length) {
    return res.status(400).json({
      status: false,
      error: `Parameter wajib untuk action '${action}': ${missing.join(", ")}`
    });
  }
  const api = new Mangatoon();
  try {
    let data;
    switch (action) {
      case "home":
        data = await api.home(params);
        break;
      case "banners":
        data = await api.banners(params);
        break;
      case "icons":
        data = await api.icons(params);
        break;
      case "suggestions":
        data = await api.suggestions(params);
        break;
      case "detail":
        data = await api.detail(params);
        break;
      case "episodes":
        data = await api.episodes(params);
        break;
      case "extend":
        data = await api.extend(params);
        break;
      case "series":
        data = await api.series(params);
        break;
      case "share_text":
        data = await api.share_text(params);
        break;
      case "update_info":
        data = await api.update_info(params);
        break;
      case "dl_episodes":
        data = await api.dl_episodes(params);
        break;
      case "report_title":
        data = await api.report_title(params);
        break;
      case "autocomplete":
        data = await api.autocomplete(params);
        break;
      case "search_tab":
        data = await api.search_tab(params);
        break;
      case "search":
        data = await api.search(params);
        break;
      case "search_authors":
        data = await api.search_authors(params);
        break;
      case "search_topics":
        data = await api.search_topics(params);
        break;
      case "search_posts":
        data = await api.search_posts(params);
        break;
      case "rank_list":
        data = await api.rank_list(params);
        break;
      case "rank_filters":
        data = await api.rank_filters(params);
        break;
      case "rank_tags":
        data = await api.rank_tags(params);
        break;
      case "ch":
        data = await api.ch(params);
        break;
      case "segment_infos":
        data = await api.segment_infos(params);
        break;
      case "dl_all":
        data = await api.dl_all(params);
        break;
      case "video_play":
        data = await api.video_play(params);
        break;
      case "audio_list":
        data = await api.audio_list(params);
        break;
      case "audio_detail":
        data = await api.audio_detail(params);
        break;
      case "comments":
        data = await api.comments(params);
        break;
      case "score_comments":
        data = await api.score_comments(params);
        break;
      case "hot_topics":
        data = await api.hot_topics(params);
        break;
      case "community_cats":
        data = await api.community_cats(params);
        break;
      case "community_topics":
        data = await api.community_topics(params);
        break;
      case "user_follows":
        data = await api.user_follows(params);
        break;
      case "zone_info":
        data = await api.zone_info(params);
        break;
      case "zone_collection":
        data = await api.zone_collection(params);
        break;
      case "contribute_info":
        data = await api.contribute_info(params);
        break;
      case "novel_char":
        data = await api.novel_char(params);
        break;
      case "dialogue_char":
        data = await api.dialogue_char(params);
        break;
      case "reward_info":
        data = await api.reward_info(params);
        break;
    }
    return res.status(200).json({
      status: true,
      action: action,
      result: data
    });
  } catch (error) {
    console.error(`[mangatoon] action='${action}':`, error);
    return res.status(500).json({
      status: false,
      error: error.message || "Unknown Error"
    });
  }
}