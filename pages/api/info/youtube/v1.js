import axios from "axios";
class YouTube {
  constructor() {
    this.WEB_HDR = {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
      "accept-encoding": "gzip",
      "content-type": "application/json",
      origin: "https://www.youtube.com",
      referer: "https://www.youtube.com",
      "x-youtube-client-name": "1",
      "x-youtube-client-version": "2.20260320.01.00",
      "accept-language": "en-GB, en;q=0.9",
      cookie: "SOCS=CAE="
    };
    this.AND_HDR = {
      "user-agent": "com.google.android.youtube/21.03.36 (Linux; U; Android 15; GB) gzip",
      "accept-encoding": "gzip",
      "content-type": "application/json",
      "x-goog-api-format-version": "2",
      "accept-language": "en-GB, en;q=0.9"
    };
    this.WEB_CTX = {
      client: {
        hl: "en-GB",
        gl: "ID",
        clientName: "WEB",
        clientVersion: "2.20260320.01.00",
        originalUrl: "https://www.youtube.com",
        platform: "DESKTOP",
        utcOffsetMinutes: 0
      },
      request: {
        internalExperimentFlags: [],
        useSsl: true
      },
      user: {
        lockedSafetyMode: false
      }
    };
    this.AND_CTX = {
      client: {
        clientName: "ANDROID",
        clientVersion: "21.03.36",
        clientScreen: "WATCH",
        platform: "MOBILE",
        osName: "Android",
        osVersion: "16",
        androidSdkVersion: 36,
        hl: "en-GB",
        gl: "ID",
        utcOffsetMinutes: 0
      },
      request: {
        internalExperimentFlags: [],
        useSsl: true
      },
      user: {
        lockedSafetyMode: false
      }
    };
    this.DEF_VISITOR = "CgtWUzFHVUhJd0tNMCiGo_7NBjIKCgJJRBIEGgAgaDoMCAEgsND9_uCw5N9p";
    this.http = axios.create({
      timeout: 12e4
    });
  }
  log(level, ...a) {
    console[level]("[YT]", ...a);
  }
  vid_from(url) {
    try {
      this.log("log", "vid_from", url);
      const u = new URL(url);
      return u.searchParams.get("v") || u.pathname.split("/").pop() || null;
    } catch {
      return url?.length === 11 ? url : null;
    }
  }
  cpn() {
    return Math.random().toString(36).slice(2, 18).padEnd(16, "0");
  }
  fmt_thumb(thumbs = []) {
    return thumbs.at(-1)?.url || null;
  }
  parse_thumb(thumbs = []) {
    return thumbs.map(t => ({
      url: t.url,
      width: t.width || null,
      height: t.height || null
    }));
  }
  parse_text(obj) {
    return obj?.simpleText || obj?.runs?.map(r => r.text).join("") || null;
  }
  parse_search_item(item) {
    try {
      const r = item?.videoRenderer || item?.compactVideoRenderer || item?.reelItemRenderer;
      if (!r) return null;
      const video_id = r.videoId || r?.navigationEndpoint?.watchEndpoint?.videoId || r?.onTap?.watchEndpoint?.videoId || null;
      if (!video_id) return null;
      const channel_id = r?.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || r?.longBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || r?.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || null;
      return {
        video_id: video_id,
        title: this.parse_text(r.title),
        url: `https://www.youtube.com/watch?v=${video_id}`,
        thumbnail: this.fmt_thumb(r?.thumbnail?.thumbnails),
        thumbnails: this.parse_thumb(r?.thumbnail?.thumbnails),
        channel: this.parse_text(r.shortBylineText || r.longBylineText || r.ownerText),
        channel_id: channel_id,
        channel_url: channel_id ? `https://www.youtube.com/channel/${channel_id}` : null,
        duration: this.parse_text(r.lengthText),
        views: this.parse_text(r.shortViewCountText || r.viewCountText),
        published: r?.publishedTimeText?.simpleText || null,
        description: r?.descriptionSnippet?.runs?.map(x => x.text).join("") || null,
        badges: (r.badges || []).map(b => b?.metadataBadgeRenderer?.label).filter(Boolean)
      };
    } catch (err) {
      this.log("error", "parse_search_item", err.message);
      return null;
    }
  }
  parse_fmt(f) {
    try {
      return {
        itag: f.itag,
        url: f.url || null,
        mime_type: f.mimeType || null,
        quality: f.qualityLabel || f.quality || null,
        width: f.width || null,
        height: f.height || null,
        fps: f.fps || null,
        bitrate: f.bitrate || null,
        avg_bitrate: f.averageBitrate || null,
        audio_quality: f.audioQuality || null,
        audio_sample_rate: f.audioSampleRate ? parseInt(f.audioSampleRate) : null,
        audio_channels: f.audioChannels || null,
        loudness_db: f.loudnessDb || null,
        content_length: f.contentLength ? parseInt(f.contentLength) : null,
        duration_ms: f.approxDurationMs ? parseInt(f.approxDurationMs) : null,
        last_modified: f.lastModified || null,
        init_range: f.initRange || null,
        index_range: f.indexRange || null,
        has_video: !!f.width,
        has_audio: !!f.audioQuality
      };
    } catch (err) {
      this.log("error", "parse_fmt", err.message);
      return null;
    }
  }
  parse_formats(formats = [], adaptive = []) {
    try {
      this.log("log", "parse_formats", `muxed=${formats.length} adaptive=${adaptive.length}`);
      const muxed = formats.map(f => this.parse_fmt(f)).filter(Boolean);
      const video = adaptive.filter(f => f.mimeType?.startsWith("video")).map(f => this.parse_fmt(f)).filter(Boolean);
      const audio = adaptive.filter(f => f.mimeType?.startsWith("audio")).map(f => this.parse_fmt(f)).filter(Boolean);
      const best_of = arr => [...arr].sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0] || null;
      return {
        muxed: muxed,
        video: video,
        audio: audio,
        best: {
          muxed: best_of(muxed),
          video: best_of(video),
          audio: best_of(audio)
        }
      };
    } catch (err) {
      this.log("error", "parse_formats", err.message);
      return {
        muxed: [],
        video: [],
        audio: [],
        best: {
          muxed: null,
          video: null,
          audio: null
        }
      };
    }
  }
  parse_microformat(mf) {
    try {
      const r = mf?.playerMicroformatRenderer;
      if (!r) return null;
      this.log("log", "parse_microformat", r?.title?.simpleText);
      return {
        title: r?.title?.simpleText || null,
        description: r?.description?.simpleText || null,
        channel: r?.ownerChannelName || null,
        channel_id: r?.externalChannelId || null,
        channel_url: r?.ownerProfileUrl || null,
        category: r?.category || null,
        publish_date: r?.publishDate || null,
        upload_date: r?.uploadDate || null,
        view_count: r?.viewCount ? parseInt(r.viewCount) : null,
        like_count: r?.likeCount ? parseInt(r.likeCount) : null,
        length_seconds: r?.lengthSeconds ? parseInt(r.lengthSeconds) : null,
        is_unlisted: r?.isUnlisted ?? null,
        is_family_safe: r?.isFamilySafe ?? null,
        is_shorts_eligible: r?.isShortsEligible ?? null,
        has_ypc_metadata: r?.hasYpcMetadata ?? null,
        thumbnail: this.fmt_thumb(r?.thumbnail?.thumbnails),
        thumbnails: this.parse_thumb(r?.thumbnail?.thumbnails),
        embed_url: r?.embed?.iframeUrl || null,
        embed_width: r?.embed?.width || null,
        embed_height: r?.embed?.height || null,
        available_countries: r?.availableCountries || [],
        available_countries_count: (r?.availableCountries || []).length,
        canonical_url: r?.canonicalUrl || null
      };
    } catch (err) {
      this.log("error", "parse_microformat", err.message);
      return null;
    }
  }
  parse_captions(captions) {
    try {
      const tracks = captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
      const langs = captions?.playerCaptionsTracklistRenderer?.translationLanguages || [];
      this.log("log", "parse_captions", `tracks=${tracks.length} translation_langs=${langs.length}`);
      return {
        tracks: tracks.map(t => ({
          url: t.baseUrl,
          lang: t.languageCode,
          label: t.name?.runs?.[0]?.text || null,
          kind: t.kind || null,
          translatable: t.isTranslatable || false
        })),
        translation_langs: langs.map(l => ({
          code: l.languageCode,
          name: l.languageName?.runs?.[0]?.text || null
        }))
      };
    } catch (err) {
      this.log("error", "parse_captions", err.message);
      return {
        tracks: [],
        translation_langs: []
      };
    }
  }
  parse_video_details(vd) {
    try {
      if (!vd || !Object.keys(vd).length) return null;
      return {
        video_id: vd.videoId || null,
        title: vd.title || null,
        length_seconds: vd.lengthSeconds ? parseInt(vd.lengthSeconds) : null,
        keywords: vd.keywords || [],
        channel_id: vd.channelId || null,
        short_description: vd.shortDescription || null,
        view_count: vd.viewCount ? parseInt(vd.viewCount) : null,
        author: vd.author || null,
        is_private: vd.isPrivate || false,
        is_live_content: vd.isLiveContent || false,
        is_crawlable: vd.isCrawlable ?? null,
        is_owner_viewing: vd.isOwnerViewing || false,
        is_unplugged_corpus: vd.isUnpluggedCorpus || false,
        is_tvfilm_video: vd.isTvfilmVideo || false,
        allow_ratings: vd.allowRatings ?? null,
        thumbnail: this.fmt_thumb(vd?.thumbnail?.thumbnails),
        thumbnails: this.parse_thumb(vd?.thumbnail?.thumbnails)
      };
    } catch (err) {
      this.log("error", "parse_video_details", err.message);
      return null;
    }
  }
  parse_storyboard(sb) {
    try {
      const r = sb?.playerStoryboardSpecRenderer;
      if (!r) return null;
      return {
        spec: r.spec || null,
        recommended_level: r.recommendedLevel ?? null
      };
    } catch (err) {
      this.log("error", "parse_storyboard", err.message);
      return null;
    }
  }
  async search({
    query,
    params = "8AEB",
    visitor_data = null
  } = {}) {
    try {
      this.log("log", "search", query);
      const ctx = structuredClone(this.WEB_CTX);
      if (visitor_data) ctx.client.visitorData = visitor_data;
      const {
        data
      } = await this.http.post("https://charts.youtube.com/youtubei/v1/search?prettyPrint=false", {
        context: ctx,
        query: query,
        params: params
      }, {
        headers: this.WEB_HDR
      });
      this.log("log", "search response ok");
      const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || data?.contents?.sectionListRenderer?.contents || [];
      const items = [];
      for (const section of contents) {
        for (const item of section?.itemSectionRenderer?.contents || []) {
          const parsed = this.parse_search_item(item);
          if (parsed) items.push(parsed);
        }
      }
      const next_page = contents.find(c => c?.continuationItemRenderer)?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || null;
      this.log("log", "search done", `items=${items.length}`);
      return {
        ok: true,
        query: query,
        total: items.length,
        next_page: next_page,
        items: items
      };
    } catch (err) {
      this.log("error", "search", err?.response?.data || err.message);
      return {
        ok: false,
        error: err.message
      };
    }
  }
  async info({
    url
  } = {}) {
    try {
      this.log("log", "info", url);
      const video_id = this.vid_from(url);
      if (!video_id) throw new Error("invalid video id or url");
      const ctx = structuredClone(this.WEB_CTX);
      ctx.client.clientScreen = "WATCH";
      const {
        data
      } = await this.http.post("https://charts.youtube.com/youtubei/v1/player?prettyPrint=false&%24fields=microformat%2CvideoDetails.thumbnail.thumbnails%2CvideoDetails.videoId", {
        context: ctx,
        videoId: video_id,
        contentCheckOk: true,
        racyCheckOk: true
      }, {
        headers: this.WEB_HDR
      });
      this.log("log", "info response ok", video_id);
      const root = data?.videoDetails ? data : data?.playerResponse || data || {};
      const vd = root?.videoDetails || {};
      const microformat = this.parse_microformat(root?.microformat);
      const vid = vd.videoId || vd.externalVideoId || video_id;
      const thumbs_vd = vd?.thumbnail?.thumbnails || [];
      const thumbs_mf = root?.microformat?.playerMicroformatRenderer?.thumbnail?.thumbnails || [];
      const thumbs = thumbs_vd.length ? thumbs_vd : thumbs_mf;
      return {
        ok: true,
        video_id: vid,
        url: `https://www.youtube.com/watch?v=${vid}`,
        thumbnail: this.fmt_thumb(thumbs) || microformat?.thumbnail || null,
        thumbnails: this.parse_thumb(thumbs),
        microformat: microformat
      };
    } catch (err) {
      this.log("error", "info", err?.response?.data || err.message);
      return {
        ok: false,
        error: err.message
      };
    }
  }
  async visitor() {
    try {
      this.log("log", "visitor get");
      const {
        data
      } = await this.http.post("https://youtubei.googleapis.com/youtubei/v1/visitor_id?prettyPrint=false", {
        context: this.AND_CTX
      }, {
        headers: this.AND_HDR
      });
      const vd = data?.responseContext?.visitorData || null;
      this.log("log", "visitor ok", vd);
      return vd || this.DEF_VISITOR;
    } catch (err) {
      this.log("error", "visitor", err?.response?.data || err.message);
      return this.DEF_VISITOR;
    }
  }
  async download({
    url,
    visitor_data = null
  } = {}) {
    try {
      this.log("log", "download", url);
      const video_id = this.vid_from(url);
      if (!video_id) throw new Error("invalid video id or url");
      const vd_token = visitor_data || await this.visitor();
      const ctx = structuredClone(this.AND_CTX);
      ctx.client.visitorData = vd_token;
      const {
        data
      } = await this.http.post(`https://youtubei.googleapis.com/youtubei/v1/reel/reel_item_watch?prettyPrint=false&id=${video_id}&%24fields=playerResponse`, {
        context: ctx,
        playerRequest: {
          videoId: video_id,
          cpn: this.cpn(),
          contentCheckOk: true,
          racyCheckOk: true
        },
        disablePlayerResponse: false
      }, {
        headers: this.AND_HDR
      });
      this.log("log", "download response ok", video_id);
      const pr = data?.playerResponse || (data?.streamingData ? data : null) || data || {};
      const status = pr?.playabilityStatus?.status || null;
      if (status && status !== "OK") {
        this.log("warn", "download playability", status);
        return {
          ok: false,
          error: `playability: ${status}`,
          status: status
        };
      }
      const vd = pr?.videoDetails || {};
      const sd = pr?.streamingData || {};
      const microformat = this.parse_microformat(pr?.microformat);
      const video_details = this.parse_video_details(vd);
      const formats = this.parse_formats(sd?.formats || [], sd?.adaptiveFormats || []);
      const captions = this.parse_captions(pr?.captions);
      const storyboard = this.parse_storyboard(pr?.storyboards);
      this.log("log", "download get info", video_id);
      const info = await this.info({
        url: video_id
      });
      this.log("log", "download done", vd.title || video_id);
      return {
        ok: true,
        ...info.ok ? info : {},
        video_id: vd.videoId || video_id,
        title: vd.title || microformat?.title || null,
        url: `https://www.youtube.com/watch?v=${vd.videoId || video_id}`,
        channel: vd.author || microformat?.channel || null,
        channel_id: vd.channelId || microformat?.channel_id || null,
        channel_url: vd.channelId ? `https://www.youtube.com/channel/${vd.channelId}` : microformat?.channel_url || null,
        thumbnail: this.fmt_thumb(vd?.thumbnail?.thumbnails) || microformat?.thumbnail || null,
        thumbnails: this.parse_thumb(vd?.thumbnail?.thumbnails),
        view_count: vd.viewCount ? parseInt(vd.viewCount) : microformat?.view_count || null,
        like_count: microformat?.like_count || null,
        length_seconds: vd.lengthSeconds ? parseInt(vd.lengthSeconds) : microformat?.length_seconds || null,
        description: vd.shortDescription || microformat?.description || null,
        keywords: vd.keywords || [],
        category: microformat?.category || null,
        publish_date: microformat?.publish_date || null,
        upload_date: microformat?.upload_date || null,
        is_live: vd.isLiveContent || false,
        is_private: vd.isPrivate || false,
        is_crawlable: vd.isCrawlable ?? null,
        is_family_safe: microformat?.is_family_safe ?? null,
        is_unlisted: microformat?.is_unlisted ?? null,
        is_shorts_eligible: microformat?.is_shorts_eligible ?? null,
        embed_url: microformat?.embed_url || null,
        canonical_url: microformat?.canonical_url || null,
        available_countries_count: microformat?.available_countries_count || null,
        expires_in: sd.expiresInSeconds ? parseInt(sd.expiresInSeconds) : null,
        visitor_data: vd_token,
        video_details: video_details,
        microformat: microformat,
        formats: formats,
        captions: captions,
        storyboard: storyboard
      };
    } catch (err) {
      this.log("error", "download", err?.response?.data || err.message);
      return {
        ok: false,
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["search", "download"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=search&query=isekai"
      }
    });
  }
  const api = new YouTube();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'download'.",
            example: "https://www.youtube.com/watch?v=7HF1Sfos3v4"
          });
        }
        response = await api.download(params);
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