import axios from "axios";
import * as cheerio from "cheerio";
class Likee {
  constructor() {
    this.base = "https://likee.video";
    this.apiFlow = "https://api.like-video.com/likee-activity-flow-api";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";
  }
  hdr(opt = {}) {
    try {
      return {
        "user-agent": opt?.ua ? opt.ua : this.ua,
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        origin: this.base,
        referer: `${this.base}/`,
        "cache-control": "no-cache",
        pragma: "no-cache",
        ...opt
      };
    } catch (err) {
      console.log(`[hdr] Error headers: ${err?.message || err}`);
      return {};
    }
  }
  snk(obj) {
    try {
      if (Array.isArray(obj)) {
        const arr = obj.map(item => this.snk(item)).filter(v => v !== null && v !== undefined && v !== "");
        return arr.length > 0 ? arr : null;
      }
      if (obj !== null && typeof obj === "object") {
        const cleaned = {};
        for (const [key, val] of Object.entries(obj)) {
          const k = key.replace(/([a-z\d])([A-Z])/g, "$1_$2").replace(/[-\s.:]+/g, "_").toLowerCase();
          const v = this.snk(val);
          const isEmptyObj = v !== null && typeof v === "object" && Object.keys(v).length === 0;
          const isEmptyStr = typeof v === "string" && v.trim() === "";
          if (v !== null && v !== undefined && !isEmptyStr && !isEmptyObj) {
            cleaned[k] = v;
          }
        }
        return Object.keys(cleaned).length > 0 ? cleaned : null;
      }
      return obj;
    } catch (err) {
      console.log(`[snk] Error snake_case: ${err?.message || err}`);
      return obj;
    }
  }
  dur(val) {
    try {
      if (!val) return null;
      if (typeof val === "number") return val;
      const match = String(val).match(/(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
      const hours = parseInt(match?.[1] || "0", 10);
      const mins = parseInt(match?.[2] || "0", 10);
      const secs = parseInt(match?.[3] || "0", 10);
      const total = hours * 3600 + mins * 60 + secs;
      return total > 0 ? total : null;
    } catch {
      return null;
    }
  }
  chr(html) {
    console.log("[chr] Parsing struktur HTML dengan Cheerio...");
    try {
      const _ = cheerio.load(html || "");
      const metas = _("meta").map((idx, el) => {
        const prop = _(el).attr("property") || _(el).attr("name") || _(el).attr("itemprop") || "";
        const cont = _(el).attr("content") || "";
        return prop.trim() && cont.trim() ? {
          [prop.trim()]: cont
        } : null;
      }).get().filter(Boolean).reduce((acc, cur) => Object.assign(acc, cur), {});
      const canonicalUrl = _('link[rel="canonical"]').attr("href") || null;
      const scripts = _("script").map((idx, el) => _(el).html() || "").get();
      const target = scripts.find(s => s && s.includes("window.data ="));
      let winData = null;
      if (target) {
        const match = target.match(/window\.data\s*=\s*(\{[\s\S]*?\});/);
        try {
          winData = match?.[1] ? JSON.parse(match[1]) : null;
        } catch (e) {
          console.log(`[chr] Gagal parse JSON window.data: ${e?.message}`);
        }
      }
      return {
        metas: metas,
        winData: winData,
        canonicalUrl: canonicalUrl
      };
    } catch (err) {
      console.log(`[chr] Error Cheerio: ${err?.message || err}`);
      return {
        metas: {},
        winData: null,
        canonicalUrl: null
      };
    }
  }
  async pst(url, data = {}, opt = {}) {
    console.log(`[pst] POST ke: ${url}`);
    try {
      const headers = this.hdr({
        "content-type": "application/json",
        ...opt?.headers
      });
      const res = await axios.post(url, data, {
        headers: headers,
        timeout: opt?.timeout ? opt.timeout : 15e3
      });
      return res?.data || null;
    } catch (err) {
      console.log(`[pst] Error POST: ${err?.message || err}`);
      throw err;
    }
  }
  async get(url, params = {}, opt = {}) {
    console.log(`[get] GET ke: ${url}`);
    try {
      const res = await axios.get(url, {
        params: params,
        headers: this.hdr(opt?.headers),
        timeout: opt?.timeout ? opt.timeout : 15e3,
        maxRedirects: 5
      });
      return res?.data || null;
    } catch (err) {
      console.log(`[get] Error GET: ${err?.message || err}`);
      throw err;
    }
  }
  async download({
    url,
    ...rest
  }) {
    console.log("[download] Memulai alur download video...");
    console.log(`[download] URL target: ${url}`);
    try {
      if (!url) {
        throw new Error('Parameter "url" harus disediakan');
      }
      console.log("[download] Mengambil HTML halaman target...");
      const html = await this.get(url, {}, rest);
      const {
        metas,
        winData,
        canonicalUrl
      } = this.chr(html);
      const postId = winData?.post_id || metas?.["al:ios:url"]?.match(/postid=(\d+)/)?.[1] || url?.match(/\/(\d+)/)?.[1] || null;
      const posterUid = winData?.poster_uid || metas?.["al:ios:url"]?.match(/postuid=(\d+)/)?.[1] || null;
      let recData = null;
      if (postId && posterUid) {
        console.log(`[download] Mengambil data recommend & creator stream via API Flow...`);
        try {
          const recRes = await this.pst(`${this.apiFlow}/share/video/getRecommendVideo`, JSON.stringify({
            shareUid: "0",
            poster_uid: String(posterUid),
            post_id: String(postId),
            lang: winData?.lang ? winData.lang : "id",
            abType: 3
          }), rest);
          if (recRes?.code === 0 && recRes?.data) {
            recData = recRes.data;
          }
        } catch (apiErr) {
          console.log(`[download] API Flow getRecommendVideo skip: ${apiErr?.message}`);
        }
      }
      console.log("[download] Memformat data lengkap dan bersih...");
      const mapItem = item => ({
        post_id: item?.post_id || null,
        title: item?.msg_text || null,
        cover_url: item?.image ? item.image.replace(/_wmk_sdk=1/g, "") : null,
        like_count: typeof item?.like_count === "number" ? item.like_count : parseInt(item?.like_count || "0", 10),
        deeplink: item?.deeplink || null,
        author: {
          nickname: item?.nick_name || null,
          avatar_url: item?.uid_avatar || null,
          is_owner: item?.owner === 1
        }
      });
      const hotVideos = Array.isArray(recData?.hot) ? recData.hot.map(mapItem) : null;
      const recommendVideos = Array.isArray(recData?.recommend) ? recData.recommend.map(mapItem) : null;
      const durationSeconds = this.dur(winData?.ISO8601_duration || winData?.iso8601_duration);
      const width = parseInt(winData?.video_width || metas?.["og:video:width"] || "0", 10) || null;
      const height = parseInt(winData?.video_height || metas?.["og:video:height"] || "0", 10) || null;
      const fullDetail = {
        post_id: String(winData?.post_id || postId || ""),
        title: winData?.msg_text || metas?.["og:description"] || null,
        media: {
          video_url: (winData?.video_url || metas?.["og:video"] || "").replace(/_wmk_sdk=1/g, "") || null,
          video_watermark_url: winData?.video_water_url || metas?.["og:video:secure_url"] || null,
          cover_url: (winData?.image1 || winData?.image2 || metas?.["og:image"] || "").replace(/_wmk_sdk=1/g, "") || null,
          cover_hd: winData?.image2 || null,
          duration: durationSeconds,
          width: width,
          height: height,
          is_portrait: width && height ? height > width : true
        },
        author: {
          user_id: String(winData?.poster_uid || posterUid || ""),
          username: winData?.likeeId || winData?.like_id || winData?.user_name || null,
          nickname: winData?.nick_name || metas?.["og:title"] || null,
          avatar_url: winData?.data1 || winData?.uid_avatar || null,
          total_video_count: parseInt(winData?.video_count || recData?.userVideoCount || "0", 10) || null,
          profile_url: winData?.personUrl || null
        },
        statistics: {
          views_count: winData?.share_text2?.split(" ")?.[0] || metas?.["description"]?.split(" ")?.[0] || null,
          like_count: parseInt(winData?.like_count || "0", 10) || null,
          comment_count: parseInt(winData?.comment_count || "0", 10) || null,
          share_count: parseInt(winData?.share_count || "0", 10) || null,
          download_count: parseInt(winData?.download_count || "0", 10) || null
        },
        music_info: {
          music_id: String(winData?.sound_id || winData?.music_id || ""),
          music_name: winData?.music_name || winData?.musicName || null,
          music_author: winData?.musicOwnerName || winData?.music_owner_name || null
        },
        urls: {
          canonical_url: canonicalUrl || winData?.personVideoUrl || null,
          deeplink: winData?.deeplink || metas?.["al:ios:url"] || null
        },
        location: {
          country: winData?.post_country || winData?.countryCode || null,
          language: winData?.lang || null
        },
        related: {
          creator_hot_videos: hotVideos,
          recommend_videos: recommendVideos
        },
        created_at: winData?.uploadDate || null
      };
      const finalResult = this.snk(fullDetail);
      console.log("[download] Data berhasil diekstraksi secara lengkap dan bersih.");
      return {
        status: true,
        result: finalResult
      };
    } catch (err) {
      console.log(`[download] Error total: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.message || "Gagal memproses download",
          error_details: err?.response?.data || null
        }
      };
    }
  }
  async getRecommendVideo({
    postId,
    posterUid,
    lang = "id",
    ...rest
  }) {
    console.log(`[getRecommendVideo] Memanggil rekomendasi untuk postId: ${postId}...`);
    try {
      if (!postId) {
        throw new Error('Parameter "postId" harus disediakan');
      }
      const payload = {
        shareUid: "0",
        poster_uid: String(posterUid || ""),
        post_id: String(postId || ""),
        lang: lang ? lang : "id",
        abType: 3
      };
      const res = await this.pst(`${this.apiFlow}/share/video/getRecommendVideo`, JSON.stringify(payload), rest);
      return {
        status: true,
        result: this.snk(res?.data || {})
      };
    } catch (err) {
      console.log(`[getRecommendVideo] Error: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.message || "Gagal mengambil data rekomendasi",
          error_details: err?.response?.data || null
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new Likee();
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