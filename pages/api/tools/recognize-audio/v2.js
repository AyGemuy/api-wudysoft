import axios from "axios";
import crypto from "crypto";
import https from "https";
class DescribeMusic {
  constructor() {
    this.sUrl = "https://fsmgroeytsburlgmoxcj.supabase.co/rest/v1";
    this.cUrl = "https://us-central1-describe-music.cloudfunctions.net";
    this.key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWdyb2V5dHNidXJsZ21veGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzUwMjQsImV4cCI6MjA3MzUxMTAyNH0.z6T4B5HtUuLoQD-hmSNJEWCmoXCM0_pNoy5MlaC49ok";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.agt = new https.Agent({
      rejectUnauthorized: false,
      ciphers: "ALL:@SECLEVEL=0",
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    });
    this.bHeaders = {
      accept: "application/json",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://describemusic.net",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://describemusic.net/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": this.ua
    };
    this.supabaseApi = axios.create({
      baseURL: this.sUrl,
      httpsAgent: this.agt,
      headers: {
        "accept-language": "id-ID",
        apikey: this.key,
        authorization: `Bearer ${this.key}`,
        "cache-control": "no-cache",
        origin: "https://describemusic.net",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://describemusic.net/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": this.ua,
        "x-client-info": "describe-music-web"
      }
    });
    this.cfApi = axios.create({
      baseURL: this.cUrl,
      httpsAgent: this.agt,
      headers: this.bHeaders
    });
  }
  _fp() {
    try {
      console.log("[Process] Menghitung fingerprint perangkat secara acak...");
      const gpu = crypto.randomBytes(8).toString("hex");
      const cores = (crypto.randomInt(2, 5) * 2).toString();
      const memory = (crypto.randomInt(1, 5) * 2).toString();
      const platform = "Linux aarch64|8|" + crypto.randomInt(0, 2);
      const vendor = crypto.randomUUID();
      const timezone = "Asia/Jakarta:" + (crypto.randomInt(0, 2) ? "420" : "480");
      const touch = crypto.randomInt(0, 2).toString();
      const userAgentHash = crypto.randomBytes(8).toString("hex");
      const comp = [gpu, cores, memory, platform, userAgentHash, vendor, timezone, touch].join("|") + "|describe-music-salt-2025-x9k2m8n4p7q1";
      const fp = crypto.createHash("sha256").update(comp).digest("hex");
      console.log(`[Process] Fingerprint acak yang valid berhasil dibuat: ${fp}`);
      return {
        status: true,
        result: fp
      };
    } catch (e) {
      console.log(`[Process] Gagal menghitung fingerprint acak: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
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
      console.log("[Process] Membaca input audio...");
      if (Buffer.isBuffer(audio)) return {
        status: true,
        result: audio
      };
      if (typeof audio === "string") {
        if (/^https?:\/\//i.test(audio)) {
          console.log(`[Process] Mengunduh audio eksternal: ${audio}`);
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
          console.log("[Process] Mendekode Base64...");
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
  async _log(fp) {
    try {
      console.log("[Process] Membaca detail kredit dari Supabase...");
      const path = `/device_fingerprints?select=trial_credits%2Ccredits_used&fingerprint_hash=eq.${fp}&deleted_at=is.null&user_id=is.null`;
      const res = await this.supabaseApi.get(path, {
        headers: {
          accept: "application/vnd.pgrst.object+json",
          "accept-profile": "public"
        },
        validateStatus: status => status >= 200 && status < 300 || status === 406
      });
      if (res.status === 406) {
        console.log("[Process] Perangkat baru terdeteksi. Sisa kredit trial bawaan: 100 / 100.");
        return {
          status: true,
          result: {
            total: 100,
            used: 0,
            remaining: 100
          }
        };
      }
      const data = res.data || {
        trial_credits: 100,
        credits_used: 0
      };
      const tot = data.trial_credits ?? 100;
      const usd = data.credits_used ?? 0;
      const rem = tot - usd;
      console.log(`[Process] Sisa kredit trial: ${rem} / ${tot} (Terpakai: ${usd}).`);
      return {
        status: true,
        result: {
          total: tot,
          used: usd,
          remaining: rem
        }
      };
    } catch (e) {
      if (e.response?.status === 406) {
        console.log("[Process] Perangkat baru terdeteksi (406). Sisa kredit trial bawaan: 100 / 100.");
        return {
          status: true,
          result: {
            total: 100,
            used: 0,
            remaining: 100
          }
        };
      }
      console.log(`[Process] Gagal membaca sisa kredit: ${e.message}`);
      return {
        status: true,
        result: {
          total: 100,
          used: 0,
          remaining: 100
        }
      };
    }
  }
  async _chk(fp, req = 1) {
    try {
      console.log("[Process] Memvalidasi kredit trial perangkat...");
      const body = {
        fingerprint_hash_param: fp,
        required_credits: req
      };
      const res = await this.supabaseApi.post("/rpc/check_trial_credits", body, {
        headers: {
          accept: "*/*",
          "content-profile": "public"
        }
      });
      return {
        status: true,
        result: res.data
      };
    } catch (e) {
      console.log(`[Process] Gagal validasi kredit: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  async _url(fp, name, mime) {
    try {
      console.log("[Process] Meminta URL GCS bertanda tangan...");
      const res = await this.cfApi.post("/generateUploadUrl", {
        fileName: name,
        contentType: mime
      }, {
        headers: {
          "x-device-fingerprint": fp
        }
      });
      return {
        status: true,
        result: {
          ...res.data?.data
        }
      };
    } catch (e) {
      console.log(`[Process] Gagal meminta URL unggah: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  async _up(url, buf, mime) {
    try {
      console.log("[Process] Mengunggah aliran audio ke Cloud Storage...");
      await axios.put(url, buf, {
        headers: {
          "content-type": mime
        },
        httpsAgent: this.agt
      });
      return {
        status: true,
        result: {
          success: true
        }
      };
    } catch (e) {
      console.log(`[Process] Gagal mengunggah audio: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
        }
      };
    }
  }
  async _id(url, name, fp, mode, dur) {
    try {
      const body = {
        fileUrl: url,
        fileName: name,
        options: {
          audioDuration: dur,
          mode: mode
        }
      };
      const res = await this.cfApi.post("/identifyAudio", body, {
        headers: {
          "x-device-fingerprint": fp
        }
      });
      return {
        status: true,
        result: {
          ...res.data?.data
        }
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
  async _an(url, name, fp, opt = {}) {
    try {
      const res = await this.cfApi.post("/analyzeAudioFromUrl", {
        fileUrl: url,
        fileName: name,
        options: opt
      }, {
        headers: {
          "x-device-fingerprint": fp
        }
      });
      return {
        status: true,
        result: {
          ...res.data?.data
        }
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
    identify = true,
    analyze = false,
    mode = "song-finder",
    duration = 30,
    fingerprint = null,
    options = {},
    ...rest
  }) {
    try {
      console.log("[Process] Memulai portal pencarian DescribeMusic...");
      const fpRes = fingerprint && /^[a-f0-9]{64}$/i.test(fingerprint) ? {
        status: true,
        result: fingerprint
      } : this._fp();
      if (!fpRes.status) return {
        ...fpRes
      };
      const afp = fpRes.result;
      await this._log(afp);
      const credRes = await this._chk(afp, 1);
      if (credRes.status && credRes.result === true) {
        console.log("[Process] Pengecekan saldo kredit berhasil dilalui.");
      } else {
        console.log("[Process] Pengecekan kredit dilewati (Bypass Credit aktif).");
      }
      const bufRes = await this._aud(audio);
      if (!bufRes.status) return {
        ...bufRes
      };
      const buf = bufRes.result;
      const detect = this._mime(buf);
      const rand = Math.floor(Math.random() * 1e6);
      const name = `audio_search_${Date.now()}_${rand}${detect.ext}`;
      console.log(`[Process] Menetapkan nama unggahan dinamis: ${name} (${detect.mime})`);
      const upRes = await this._url(afp, name, detect.mime);
      if (!upRes.status) return {
        ...upRes
      };
      const {
        uploadUrl,
        downloadUrl
      } = {
        ...upRes.result
      };
      const upExec = await this._up(uploadUrl, buf, detect.mime);
      if (!upExec.status) return {
        ...upExec
      };
      const out = {};
      if (identify) {
        console.log("[Process] Mengeksekusi identifikasi lagu...");
        const res = await this._id(downloadUrl, name, afp, mode, duration);
        out.identification = res.status ? res.result : {
          error: res.result?.error || "Gagal"
        };
      }
      if (analyze) {
        console.log("[Process] Mengeksekusi analisis audio mendalam...");
        const finalOptions = {
          includeStructure: true,
          includeSimilarity: true,
          detailedAnalysis: true,
          generateTags: true,
          audioDuration: duration,
          analysisMode: "standard",
          mode: "describe",
          taskId: crypto.randomUUID(),
          ...options
        };
        const res = await this._an(downloadUrl, name, afp, finalOptions);
        out.analysis = res.status ? res.result : {
          error: res.result?.error || "Gagal"
        };
      }
      if (identify && !analyze) {
        const single = this._snk({
          ...out.identification,
          ...rest
        });
        return {
          status: true,
          result: {
            ...single
          }
        };
      }
      const final = this._snk({
        ...out,
        ...rest
      });
      return {
        status: true,
        result: {
          ...final
        }
      };
    } catch (e) {
      console.log(`[Process] Gangguan pemrosesan sekuensial: ${e.message}`);
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
  const api = new DescribeMusic();
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