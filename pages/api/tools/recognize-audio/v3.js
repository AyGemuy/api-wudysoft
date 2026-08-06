import axios from "axios";
import crypto from "node:crypto";
import https from "node:https";
class VocunoClient {
  constructor() {
    this.agt = new https.Agent({
      rejectUnauthorized: false,
      ciphers: "ALL:@SECLEVEL=0",
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    });
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxdm9ldmN4eGlpYmh5eGhtb3RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNjA3MTIsImV4cCI6MjA2NzczNjcxMn0.svm9CJZBmUYU02ozG6G-zA-pre0sarsVHPpc2SayR0g";
    this.recognitionApi = axios.create({
      baseURL: "https://api-vjkui7paca-uc.a.run.app",
      httpsAgent: this.agt,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://vocuno.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://vocuno.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": this.ua,
        "x-vocuno-provider-id": "vocuno",
        "x-vocuno-provider-name": "Vocuno",
        "x-vocuno-studio-billing-mode": "unlimited",
        "x-vocuno-studio-processing-capable": "1",
        "x-vocuno-tool-id": "audio-recognition",
        "x-vocuno-tool-name": "Audio Recognition"
      }
    });
    this.supabaseApi = axios.create({
      baseURL: "https://yqvoevcxxiibhyxhmotr.supabase.co",
      httpsAgent: this.agt,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        apikey: this.apiKey,
        authorization: `Bearer ${this.apiKey}`,
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://musicmatcher.app",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://musicmatcher.app/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": this.ua,
        "x-client-info": "supabase-js-web/2.50.4"
      }
    });
  }
  _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  _snk(obj) {
    try {
      if (obj === null || typeof obj !== "object") return obj;
      if (Array.isArray(obj)) return obj.map(v => this._snk(v));
      const out = {};
      for (const key of Object.keys(obj)) {
        const sKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        out[sKey] = this._snk(obj[key]);
      }
      return out;
    } catch (e) {
      console.log(`[Process] Gagal format snake_case: ${e.message}`);
      return obj;
    }
  }
  _mime(buf) {
    try {
      if (buf.length >= 3 && buf[0] === 73 && buf[1] === 68 && buf[2] === 51) {
        return {
          mime: "audio/mpeg",
          ext: ".mp3"
        };
      }
      if (buf.length >= 2 && buf[0] === 255 && (buf[1] & 224) === 224) {
        return {
          mime: "audio/mpeg",
          ext: ".mp3"
        };
      }
      return {
        mime: "audio/wav",
        ext: ".wav"
      };
    } catch (e) {
      return {
        mime: "audio/wav",
        ext: ".wav"
      };
    }
  }
  async _aud(audio) {
    try {
      console.log("[Process] Membaca masukan audio...");
      if (Buffer.isBuffer(audio)) {
        return {
          status: true,
          result: audio
        };
      }
      if (typeof audio === "string") {
        if (/^https?:\/\//i.test(audio)) {
          console.log(`[Process] Mendownload berkas audio dari URL: ${audio}`);
          const res = await axios.get(audio, {
            responseType: "arraybuffer",
            httpsAgent: this.agt,
            headers: {
              "user-agent": this.ua
            }
          });
          return {
            status: true,
            result: Buffer.from(res.data)
          };
        }
        if (/^[A-Za-z0-9+/=]+$/i.test(audio)) {
          console.log("[Process] Audio terdeteksi berupa string Base64.");
          return {
            status: true,
            result: Buffer.from(audio, "base64")
          };
        }
      }
      return {
        status: false,
        result: {
          error: "Format input tidak didukung."
        }
      };
    } catch (e) {
      console.log(`[Process] Gagal memuat audio: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  async _up(buf, name, mime) {
    try {
      console.log("[Process] Mengunggah file audio ke penyimpanan Vocuno...");
      const url = `https://vocuno.com/api/runs/public-tool-upload?filename=${encodeURIComponent(name)}`;
      const res = await axios.post(url, buf, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "content-type": mime,
          origin: "https://vocuno.com",
          referer: "https://vocuno.com/audio-recognition",
          "user-agent": this.ua,
          "x-vocuno-provider-id": "vocuno",
          "x-vocuno-provider-name": "Vocuno",
          "x-vocuno-tool-id": "audio-recognition",
          "x-vocuno-tool-name": "Audio Recognition"
        },
        httpsAgent: this.agt
      });
      const upUrl = res.data?.data?.audioUrl || res.data?.data?.url || res.data?.url || res.data?.fileUrl;
      if (!upUrl) {
        return {
          status: false,
          result: {
            error: "Gagal mendapatkan URL publik dari server Vocuno."
          }
        };
      }
      console.log(`[Process] Unggahan berhasil. URL Publik: ${upUrl}`);
      return {
        status: true,
        result: {
          url: upUrl
        }
      };
    } catch (e) {
      console.log(`[Process] Gagal mengunggah berkas audio: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  async _id(audioUrl, originalName) {
    try {
      console.log("[Process] Mengirimkan permintaan identifikasi ke server Vocuno...");
      const body = {
        originalFilename: originalName,
        audioUrl: audioUrl
      };
      const res = await this.recognitionApi.post("/runs/public-audio-recognition", body);
      if (!res.data?.success) {
        return {
          status: false,
          result: {
            error: "Proses pencocokan di Vocuno gagal."
          }
        };
      }
      return {
        status: true,
        result: res.data
      };
    } catch (e) {
      console.log(`[Process] Gagal memproses identifikasi Vocuno: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  async _spotify(artist, track) {
    try {
      const body = {
        type: "spotify_search",
        artist: artist,
        track: track
      };
      const res = await this.supabaseApi.post("/functions/v1/music-search", body);
      return {
        status: true,
        result: res.data
      };
    } catch (e) {
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  async _deezer(artist, track) {
    try {
      const body = {
        artist: artist,
        track: track
      };
      const res = await this.supabaseApi.post("/functions/v1/deezer-search", body);
      return {
        status: true,
        result: res.data
      };
    } catch (e) {
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  async search({
    audio,
    spotify = true,
    deezer = true,
    ...rest
  }) {
    try {
      console.log("[Process] Memulai portal pencarian audio Vocuno...");
      const audRes = await this._aud(audio);
      if (!audRes.status) return {
        ...audRes
      };
      const buf = audRes.result;
      const detect = this._mime(buf);
      const rand = Math.floor(Math.random() * 1e6);
      const originalName = `audio_${Date.now()}_${rand}${detect.ext}`;
      console.log(`[Process] Menetapkan nama unggahan dinamis: ${originalName}`);
      const uploadRes = await this._up(buf, originalName, detect.mime);
      if (!uploadRes.status) return {
        ...uploadRes
      };
      const audioUrl = uploadRes.result.url;
      await this._delay(1e3);
      const matchRes = await this._id(audioUrl, originalName);
      if (!matchRes.status) return {
        ...matchRes
      };
      const match = matchRes.result.match;
      if (!match) {
        return {
          status: false,
          result: {
            error: "Lagu tidak berhasil diidentifikasi."
          }
        };
      }
      console.log(`[Process] Lagu cocok: ${match.title} - ${match.artist} (Skor: ${match.score}).`);
      let spotifyData = null;
      if (spotify && match.artist && match.title) {
        await this._delay(800);
        console.log("[Process] Mengambil data katalog lagu tambahan dari Spotify...");
        const spRes = await this._spotify(match.artist, match.title);
        if (spRes.status && spRes.result && !spRes.result.error) {
          spotifyData = spRes.result;
        } else {
          console.log(`[Process] Spotify gagal atau tidak menemukan trek: ${spRes.result?.error || "Kosong"}`);
        }
      }
      let deezerData = null;
      if (deezer && match.artist && match.title) {
        await this._delay(800);
        console.log("[Process] Mengambil data katalog lagu tambahan dari Deezer...");
        const dzRes = await this._deezer(match.artist, match.title);
        if (dzRes.status && dzRes.result && !dzRes.result.error) {
          deezerData = dzRes.result;
        } else {
          console.log(`[Process] Deezer gagal atau tidak menemukan trek: ${dzRes.result?.error || "Kosong"}`);
        }
      }
      const merged = {
        ...match,
        ...spotifyData ? {
          spotify: spotifyData
        } : {},
        ...deezerData ? {
          deezer: deezerData
        } : {},
        ...rest
      };
      const finalResult = this._snk(merged);
      return {
        status: true,
        result: {
          ...finalResult
        }
      };
    } catch (e) {
      console.log(`[Process] Gangguan pada proses pencarian Vocuno: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message || "Unknown error occurred"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.audio) {
    return res.status(400).json({
      error: "Parameter 'audio' diperlukan"
    });
  }
  const api = new VocunoClient();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}