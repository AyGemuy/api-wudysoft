import axios from "axios";
class FlacAPI {
  constructor() {
    this.cfg = {
      baseURL: "https://flac-tg-a67a86d7badb.herokuapp.com/api",
      timeout: 6e4,
      headers: {
        Accept: "*/*",
        "Accept-Language": "id-ID",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36"
      },
      services: ["tidal", "qobuz", "amazon", "deezer"],
      qualities: ["HI_RES_LOSSLESS", "LOSSLESS", "HIGH"],
      defaultLimit: 20
    };
    this.client = axios.create({
      baseURL: this.cfg.baseURL,
      timeout: this.cfg.timeout,
      headers: this.cfg.headers
    });
  }
  validate(params, required = []) {
    console.log(`[VALIDATE] Checking:`, Object.keys(params));
    const missing = required.filter(k => !params?.[k]);
    if (missing.length > 0) throw new Error(`Missing: ${missing.join(", ")}`);
    return true;
  }
  async search({
    q,
    source = "spotify",
    limit,
    ...rest
  }) {
    try {
      console.log(`[SEARCH] "${q}" from ${source}`);
      this.validate({
        q: q
      }, ["q"]);
      const trackLimit = limit || this.cfg.defaultLimit;
      const searchRes = await this.client.get("/search", {
        params: {
          q: q,
          source: source,
          track_limit: trackLimit,
          ...rest
        }
      });
      const tracks = searchRes?.data?.data?.tracks || [];
      console.log(`[SEARCH] Found ${tracks.length} tracks`);
      if (tracks.length === 0) {
        return {
          success: false,
          tracks: []
        };
      }
      const firstTrack = tracks[0];
      const spotifyId = firstTrack?.spotify_id || firstTrack?.id;
      let metadata = null;
      if (spotifyId) {
        try {
          console.log(`[SEARCH] Auto fetching metadata for first track`);
          const url = source === "deezer" ? `https://www.deezer.com/track/${spotifyId.replace("deezer:", "")}` : `https://open.spotify.com/track/${spotifyId}`;
          const metaRes = await this.client.get("/metadata", {
            params: {
              url: url
            }
          });
          metadata = metaRes?.data?.data || null;
          console.log(`[SEARCH] Metadata loaded for: ${metadata?.track?.name || "unknown"}`);
        } catch (error) {
          console.log(`[SEARCH] Metadata fetch skipped:`, error?.message);
        }
      }
      return {
        success: true,
        tracks: tracks,
        metadata: metadata,
        source: source,
        count: tracks.length
      };
    } catch (error) {
      console.error(`[SEARCH ERROR]`, error?.message);
      throw error;
    }
  }
  async download({
    track,
    url,
    service,
    quality,
    ...rest
  }) {
    try {
      console.log(`[DOWNLOAD] Starting...`);
      let trackData = null;
      let isrc = null;
      let deezerId = null;
      let spotifyId = null;
      if (url) {
        console.log(`[DOWNLOAD] Fetching metadata from URL`);
        this.validate({
          url: url
        }, ["url"]);
        const metaRes = await this.client.get("/metadata", {
          params: {
            url: url
          }
        });
        trackData = metaRes?.data?.data?.track;
        if (!trackData) throw new Error("Track not found from URL");
        isrc = trackData.isrc;
        spotifyId = trackData.spotify_id;
        deezerId = spotifyId?.startsWith("deezer:") ? spotifyId.replace("deezer:", "") : null;
        console.log(`[DOWNLOAD] Loaded: "${trackData.name}" by ${trackData.artists}`);
      } else if (track) {
        trackData = track;
        isrc = track.isrc;
        spotifyId = track.spotify_id || track.id;
        deezerId = spotifyId?.startsWith("deezer:") ? spotifyId.replace("deezer:", "") : null;
        console.log(`[DOWNLOAD] Using track: "${trackData.name || trackData.title}"`);
      } else {
        throw new Error("Provide track object or url");
      }
      console.log(`[DOWNLOAD] Checking availability...`);
      const availParams = {};
      if (spotifyId && !spotifyId.startsWith("deezer:")) availParams.spotify_id = spotifyId;
      if (isrc) availParams.isrc = isrc;
      if (deezerId) availParams.deezer_id = deezerId;
      const availRes = await this.client.get("/availability", {
        params: availParams
      });
      const availability = availRes?.data?.data || {};
      const availServices = this.cfg.services.filter(s => availability[s]);
      console.log(`[DOWNLOAD] Available: ${availServices.join(", ") || "none"}`);
      let selectedService = service || availServices[0] || "tidal";
      if (!availability[selectedService]) {
        selectedService = availServices[0] || "tidal";
        console.log(`[DOWNLOAD] Auto selected: ${selectedService}`);
      }
      const payload = {
        track_name: trackData.name || trackData.title,
        artist_name: trackData.artists || trackData.artist,
        album_name: trackData.album_name || trackData.album,
        album_artist: trackData.album_artist || trackData.artists || trackData.artist,
        cover_url: trackData.images || trackData.cover_url,
        spotify_id: spotifyId,
        isrc: isrc,
        service: selectedService,
        item_id: spotifyId,
        duration_ms: trackData.duration_ms,
        embed_lyrics: true,
        embed_max_quality_cover: true,
        quality: quality || this.cfg.qualities[0],
        ...rest
      };
      console.log(`[DOWNLOAD] Service: ${selectedService}, Quality: ${payload.quality}`);
      const downloadRes = await this.client.post("/download", payload);
      const result = downloadRes?.data?.data || {};
      console.log(`[DOWNLOAD] ${result?.success ? "SUCCESS" : "FAILED"}`);
      let fileURL = null;
      if (result?.file_path) {
        const fileName = result.file_path.split("/").pop();
        fileURL = `${this.cfg.baseURL}/files/${encodeURIComponent(fileName)}`;
        console.log(`[DOWNLOAD] File URL: ${fileURL}`);
      }
      return {
        success: result?.success || false,
        message: result?.message || "Download completed",
        file: {
          path: result?.file_path,
          url: fileURL,
          name: result?.file_path?.split("/")?.pop()
        },
        audio: {
          bitDepth: result?.actual_bit_depth,
          sampleRate: result?.actual_sample_rate,
          service: result?.service || selectedService
        },
        track: {
          name: payload.track_name,
          artist: payload.artist_name,
          album: payload.album_name
        },
        availability: availability,
        alreadyExists: result?.already_exists || false
      };
    } catch (error) {
      console.error(`[DOWNLOAD ERROR]`, error?.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi",
      actions: ["search", "download"]
    });
  }
  const api = new FlacAPI();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.q) {
          return res.status(400).json({
            error: "Parameter 'q' wajib diisi untuk action 'search'",
            example: {
              action: "search",
              q: "hello"
            }
          });
        }
        result = await api.search(params);
        break;
      case "download":
        if (!params.track || !params.url) {
          return res.status(400).json({
            error: "Parameter 'track' or 'url' wajib diisi untuk action 'download'",
            example: {
              action: "download",
              url: "https://"
            }
          });
        }
        result = await api.download(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["search", "download"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server",
      action: action
    });
  }
}