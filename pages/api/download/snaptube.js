import axios from "axios";
class SnaptubeAPI {
  constructor() {
    this.DEFAULT_PARAMS = {
      v: "7.61.0.76150310",
      vc: "76150310",
      u: "f6d6ae86e0dad767cd7a7476530d2d76",
      ch: "tube_sssgram",
      last_ch: "tube_sssgram",
      pn: "com.snaptube.premium",
      lang: "en",
      region: "ID",
      networkCountryIso: "ID",
      locale: "en_",
      apiVersion: "12",
      installDays: "0",
      lastInstallDays: "0",
      installTs: "1782601166",
      random_id: "86",
      ytb: "true",
      bucket: "16",
      os: "35",
      gaid: "168ed1a3-2af6-4727-a996-d7fac30e63ed",
      cpu_abi: "arm64-v8a_armeabi-v7a_armeabi",
      install_vc: "76150310"
    };
    this.yt = axios.create({
      baseURL: "https://www.youtube.com",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 15; RMX3890; Wandoujia 7.61.0.76150310.76150310) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.133 Mobile Safari/535.19",
        Cookie: "GPS=1; PREF=f6=40000000&tz=Asia.Makassar&f4=4000000; __Secure-YNID=19.YT=pKJa7CmppLD3QPryZqbhj0G6hhvpgc-KRlEvIkoyuO416X0cz21807dBdl2CCIj668TkkEMTWmK4sk6vSs29rpGpTIxJwU24mjrD1A5QZBBE-nWEUTU58Zvn5Q6AaPnkpW0rHy-ZvKmVYoWjBJK3qYT5SJEMtmvTl2mnUuwha8qLxrHEucIcYl067GsEbh8ZSgMUa1m-k6Fs7x1RelCPii4GWWXgm4L3vdPksyBNk198DFHIaEGSK0K1_phJgtXcGu_Z2gBt0STSL9sIaXsueTJxMnIoTodVXx-Fpdrmfhfwa9cE7_5wDt_2ZIMYNQKdXUnCLkqVjXlsKJcfK4M1bg; YSC=v3I7hagW9Kk; VISITOR_INFO1_LIVE=Fy5uuP6uRJM; VISITOR_PRIVACY_METADATA=CgJJRBIEGgAgOQ%3D%3D; __Secure-ROLLOUT_TOKEN=CMn25pHovbT3MxDWrvzrwqiVAxjnxc7twqiVAw%3D%3D; GOOGLE_ABUSE_EXEMPTION=ID=2579fce59b1dd7c2:TM=1782601173:C=>:IP=182.1.166.245-:S=JYf-u_8XLVY240g2gaz2WA"
      }
    });
    this.tj = axios.create({
      baseURL: "https://api.thejeu.com",
      headers: {
        "User-Agent": "okhttp/4.10.0",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        net: "MOBILE",
        "plugin-version": "ad_infomobi/1.0.147 video_search_engine/1.4.60 site_extractor/2.24.452 ffmpeg/6.0.7 youtube-data-adapter/1.1.98",
        "x-requested-with-version": "7.61.0.76150310.76150310"
      }
    });
    this.FORMATS = {
      audio: [{
        label: "fast_128k",
        codec: "M4A_128K",
        ext: "m4a",
        searchId: 19
      }, {
        label: "70k",
        codec: "MP3_70K",
        ext: "mp3",
        searchId: 20
      }, {
        label: "classic_128k",
        codec: "MP3_128K",
        ext: "mp3",
        searchId: 21
      }, {
        label: "160k",
        codec: "MP3_160K",
        ext: "mp3",
        searchId: 22
      }, {
        label: "320k",
        codec: "MP3_MOCK_320K_WITH_WEBM_160",
        ext: "mp3",
        searchId: 23
      }],
      video: [{
        label: "144p",
        codec: "MP4_144P_MUX",
        ext: "mp4",
        searchId: 24
      }, {
        label: "240p",
        codec: "MP4_240P_MUX",
        ext: "mp4",
        searchId: 25
      }, {
        label: "360p",
        codec: "MP4_360P_MUX",
        ext: "mp4",
        searchId: 29
      }, {
        label: "480p",
        codec: "MP4_480P_MUX",
        ext: "mp4",
        searchId: 26
      }, {
        label: "720p",
        codec: "MP4_720P_MUX",
        ext: "mp4",
        searchId: 28
      }, {
        label: "1080p",
        codec: "MP4_1080P",
        ext: "mp4",
        searchId: 27
      }]
    };
  }
  _buildHead(method, url, extraParams = {}, data = null) {
    return {
      method: method,
      url: url,
      params: {
        ...this.DEFAULT_PARAMS,
        ...extraParams
      },
      ...data && {
        data: typeof data === "string" ? data : JSON.stringify(data)
      }
    };
  }
  _id(label) {
    return [...this.FORMATS.audio, ...this.FORMATS.video].find(f => f.label === label)?.searchId || null;
  }
  _labels() {
    return [...this.FORMATS.audio, ...this.FORMATS.video].map(f => f.label);
  }
  _url(urlString) {
    try {
      if (!urlString) return {
        status: false,
        result: "URL string required"
      };
      const match = urlString.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      if (!match) return {
        status: false,
        result: "Video ID tidak ditemukan"
      };
      const url = new URL(urlString.includes("://") ? urlString : `https://${urlString}`);
      const list = url.searchParams.get("list");
      return {
        status: true,
        result: `https://m.youtube.com/watch?v=${match[1]}${list ? `&list=${list}` : ""}`
      };
    } catch (err) {
      return {
        status: false,
        result: err.message
      };
    }
  }
  async search({
    query,
    ...rest
  } = {}) {
    console.log("[Process] Starting search...");
    try {
      if (!query) return {
        status: false,
        result: "Query required"
      };
      const config = {
        method: "GET",
        url: "/results",
        params: {
          pbj: "1",
          search_query: query
        },
        ...rest
      };
      config.headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.92 Safari/537.36",
        "x-youtube-client-version": "2.20260626.01.00",
        "accept-language": "en",
        "x-youtube-client-name": "1",
        "x-youtube-page-label": "youtube.desktop.web_20260626_01_RC00",
        "x-youtube-page-cl": "938414520",
        ...rest?.headers
      };
      const response = await this.yt.request(config);
      console.log("[Success] Search completed successfully");
      return {
        status: true,
        result: response.data
      };
    } catch (error) {
      console.error("[Error] Search failed:", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async batch({
    items,
    ...rest
  } = {}) {
    console.log("[Process] Fetching batch info...");
    try {
      if (!items || !Array.isArray(items)) return {
        status: false,
        result: "Items array required"
      };
      const baseConfig = this._buildHead("POST", "/ms-ops-app-server/v3/songs/batch-info", {}, items);
      const response = await this.tj.request({
        ...baseConfig,
        ...rest
      });
      console.log("[Success] Batch info fetched successfully");
      return {
        status: true,
        result: response.data
      };
    } catch (error) {
      console.error("[Error] Batch info failed:", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async lyrics({
    id,
    ...rest
  } = {}) {
    console.log("[Process] Fetching lyrics...");
    try {
      if (!id) return {
        status: false,
        result: "ID required"
      };
      const ids = Array.isArray(id) ? id : [id];
      const payload = ids.map(ytId => ({
        youtubeId: ytId
      }));
      const baseConfig = this._buildHead("POST", "/st-music-app-server/v1/lyrics/batch", {
        lyric_scope: "ALL"
      }, payload);
      const response = await this.tj.request({
        ...baseConfig,
        ...rest
      });
      console.log("[Success] Lyrics fetched successfully");
      return {
        status: true,
        result: response.data
      };
    } catch (error) {
      console.error("[Error] Lyrics failed:", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async subtitles({
    id,
    lang = "en",
    ...rest
  } = {}) {
    console.log("[Process] Fetching YouTube subtitles...");
    try {
      if (!id) return {
        status: false,
        result: "Video ID required"
      };
      const config = {
        method: "GET",
        url: "/api/timedtext",
        params: {
          v: id,
          caps: "asr",
          opi: "112496729",
          xoaf: "5",
          xowf: "1",
          hl: lang,
          kind: "asr",
          lang: lang,
          fmt: "srt",
          key: "yt8"
        },
        ...rest
      };
      const response = await this.yt.request(config);
      console.log("[Success] Subtitles fetched successfully");
      return {
        status: true,
        result: response.data
      };
    } catch (error) {
      console.error("[Error] Subtitles failed:", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  async download({
    url,
    lyrics = false,
    subtitle = false,
    format = "fast_128k",
    ...rest
  } = {}) {
    console.log("[Process] Initiating download process...");
    try {
      if (!url) return {
        status: false,
        result: "URL required"
      };
      const searchId = this._id(format);
      if (!searchId) {
        const available = this._labels().join(", ");
        return {
          status: false,
          result: `Format tidak dikenal: ${format}. Pilihan tersedia: [${available}]`
        };
      }
      const formatRes = this._url(url);
      if (!formatRes.status) return formatRes;
      const formattedUrl = formatRes.result;
      const batchResult = await this.batch({
        items: [{
          duration: 0,
          searchId: searchId,
          url: formattedUrl
        }],
        ...rest
      });
      if (!batchResult.status || !batchResult.result?.[0]?.data) {
        return {
          status: false,
          result: "Gagal mendapatkan data video dari batch server"
        };
      }
      const videoData = batchResult.result[0].data;
      const youtubeId = videoData.youtubeId || "";
      let lyricsData = {};
      let subtitleData = "";
      if (lyrics && youtubeId) {
        const lyricResult = await this.lyrics({
          id: youtubeId,
          ...rest
        });
        if (lyricResult.status && lyricResult.result?.[0]) {
          lyricsData = lyricResult.result[0];
        }
      }
      if (subtitle && youtubeId) {
        const subtitleResult = await this.subtitles({
          id: youtubeId,
          ...rest
        });
        if (subtitleResult.status && subtitleResult.result) {
          subtitleData = subtitleResult.result;
        }
      }
      console.log("[Success] Download processing completed");
      return {
        status: true,
        result: {
          id: youtubeId,
          title: videoData.songName || "",
          album: videoData.album?.albumName || "",
          artist: videoData.artists?.map(a => a.artistName).join(", ") || "",
          playUrl: videoData.playUrl || formattedUrl,
          format: format,
          ext: [...this.FORMATS.audio, ...this.FORMATS.video].find(f => f.label === format)?.ext || "",
          backgrounds: videoData.backgrounds || [],
          lyrics: lyricsData,
          subtitles: subtitleData
        }
      };
    } catch (error) {
      console.error("[Error] Download process failed:", error.message);
      return {
        status: false,
        result: error.message
      };
    }
  }
  formats() {
    return this.FORMATS;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["search", "batch", "lyrics", "subtitles", "download", "formats"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          search: "/snaptube?action=search&query=adele hello",
          batch: "/snaptube?action=batch",
          lyrics: "/snaptube?action=lyrics&id=YQHsXMglC9A",
          subtitles: "/snaptube?action=subtitles&id=YQHsXMglC9A&lang=en",
          download: "/snaptube?action=download&url=https://m.youtube.com/watch?v=YQHsXMglC9A&format=720p&lyrics=true&subtitle=true",
          formats: "/snaptube?action=formats"
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
  const api = new SnaptubeAPI();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk search."
          });
        }
        response = await api.search(params);
        break;
      case "batch":
        if (!params.items) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'items' wajib diisi untuk batch."
          });
        }
        const batchItems = typeof params.items === "string" ? JSON.parse(params.items) : params.items;
        response = await api.batch({
          items: batchItems
        });
        break;
      case "lyrics":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk lyrics."
          });
        }
        response = await api.lyrics(params);
        break;
      case "subtitles":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk subtitles."
          });
        }
        response = await api.subtitles(params);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk download."
          });
        }
        response = await api.download({
          url: params.url,
          format: params.format || "fast_128k",
          lyrics: params.lyrics === "true" || params.lyrics === true,
          subtitle: params.subtitle === "true" || params.subtitle === true
        });
        break;
      case "formats":
        response = {
          status: true,
          result: api.formats()
        };
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
    if (!response.status) {
      return res.status(422).json({
        status: false,
        error: response.result || "Gagal memproses permintaan pada endpoint target."
      });
    }
    return res.status(200).json({
      status: true,
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