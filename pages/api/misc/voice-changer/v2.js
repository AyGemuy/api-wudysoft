import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";
class EaseUsVoice {
  constructor() {
    this.cookies = {};
    this.deviceUuid = crypto.randomBytes(16).toString("hex");
    this.baseHeaders = {
      "accept-language": "en",
      "device-platform": "WEB",
      "device-type": "WEB",
      "product-code": "TE-TES-TEST-WEB",
      "product-version-code": "1.0.0",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
      site: "voicechanger.easeus.com",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
      authorization: ";",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "access-control-allow-origin": "*"
    };
    this.client = axios.create({
      baseURL: "https://voicechanger.easeus.com",
      withCredentials: true,
      headers: {
        ...this.baseHeaders,
        referer: "https://voicechanger.easeus.com/ai-voice"
      }
    });
    this.client.interceptors.request.use(config => {
      try {
        const cookieStr = Object.entries(this.cookies).map(([key, val]) => `${key}=${val}`).join("; ");
        config.headers["cookie"] = cookieStr || undefined;
        config.headers["device-uuid"] = this.deviceUuid;
        const timestamp = Math.floor(Date.now() / 1e3).toString();
        config.headers["timestamp"] = timestamp;
        const bodyData = config.method === "post" && config.data ? config.data : null;
        config.headers["sign"] = this._gen_sign(bodyData, timestamp);
      } catch (err) {
        console.error("[Interceptor Error] Gagal menyusun konfigurasi request:", err?.message);
      }
      return config;
    }, error => Promise.reject(error));
    this.client.interceptors.response.use(response => {
      try {
        const setCookies = response?.headers?.["set-cookie"];
        if (setCookies) {
          setCookies.forEach(cookie => {
            const rawPart = cookie.split(";")[0] || "";
            const eqIndex = rawPart.indexOf("=");
            if (eqIndex !== -1) {
              const key = rawPart.substring(0, eqIndex).trim();
              const val = rawPart.substring(eqIndex + 1).trim();
              this.cookies[key] = val;
            }
          });
        }
      } catch (err) {
        console.error("[Interceptor Error] Gagal memproses cookie response:", err?.message);
      }
      return response;
    }, error => Promise.reject(error));
  }
  _gen_sign(body, timestamp) {
    try {
      const secret = "CoverSongApi";
      let queryString = "";
      let parsedBody = body;
      if (typeof body === "string") {
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          parsedBody = null;
        }
      }
      if (parsedBody && typeof parsedBody === "object" && Object.keys(parsedBody).length > 0) {
        const i = {};
        const sortedKeys = Object.keys(parsedBody).sort();
        sortedKeys.forEach(k => {
          const v = parsedBody[k];
          if (Array.isArray(v)) {
            i[k] = [...v].sort();
          } else if (typeof v === "object" && v !== null) {
            i[k] = JSON.stringify(v);
          } else {
            i[k] = v;
          }
        });
        i.appKey = "OM";
        i.timestamp = timestamp;
        const keys = Object.keys(i);
        const pairs = [];
        keys.forEach(e => {
          const t = i[e];
          if (typeof t === "object" && t !== null && !Array.isArray(t)) {
            pairs.push(`${e}=${JSON.stringify(t)}`);
          } else if (Array.isArray(t)) {
            const mapped = t.map(val => `${e}=${val}`).join("&");
            pairs.push(mapped);
          } else {
            pairs.push(`${e}=${t}`);
          }
        });
        queryString = pairs.join("&");
      } else {
        queryString = `&appKey=OM&timestamp=${timestamp}`;
      }
      const rawString = `${secret}${queryString}${secret}`;
      return crypto.createHash("md5").update(rawString).digest("hex");
    } catch (err) {
      console.error("[Error] Gagal melakukan kalkulasi signature:", err?.message);
      return "d41d8cd98f00b204e9800998ecf8427e";
    }
  }
  async _auto_detect_audio(input, rest) {
    try {
      if (!input) return null;
      let buffer = null;
      let fileType = "audio/mpeg";
      let filename = "input_audio.mp3";
      if (Buffer.isBuffer(input)) {
        console.log("[Process] Format audio terdeteksi: Buffer mentah");
        buffer = input;
      } else if (typeof input === "string") {
        const trimmed = input.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
          console.log("[Process] Format audio terdeteksi: URL. Mengunduh konten...");
          const urlParsed = new URL(trimmed);
          const pathFilename = urlParsed.pathname.split("/").pop() || "";
          if (pathFilename && pathFilename.includes(".")) {
            filename = pathFilename;
            const ext = pathFilename.split(".").pop().toLowerCase();
            fileType = ext === "wav" ? "audio/wav" : ext === "ogg" ? "audio/ogg" : "audio/mpeg";
          }
          const res = await axios.get(trimmed, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(res?.data);
        } else if (trimmed.startsWith("data:")) {
          console.log("[Process] Format audio terdeteksi: Base64 Data URI. Mengurai...");
          const matches = trimmed.match(/^data:([^;]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            fileType = matches[1];
            const ext = fileType.split("/")[1] || "mp3";
            filename = `upload_${Date.now()}.${ext}`;
            buffer = Buffer.from(matches[2], "base64");
          } else {
            const base64Data = trimmed.split(";base64,").pop() || "";
            buffer = Buffer.from(base64Data, "base64");
          }
        } else {
          const isBase64 = /^[A-Za-z0-9+/=]+$/.test(trimmed);
          if (isBase64) {
            console.log("[Process] Format audio terdeteksi: Raw Base64 string. Melakukan decoding...");
            buffer = Buffer.from(trimmed, "base64");
          }
        }
      }
      if (!buffer) return null;
      return {
        buffer: buffer,
        file_type: rest?.file_type || fileType,
        filename: rest?.filename || filename
      };
    } catch (err) {
      console.error("[Error] Deteksi otomatis data audio gagal:", err?.message);
      return null;
    }
  }
  _gen_key(filename) {
    try {
      const ext = filename?.split(".").pop() || "mp3";
      const randHex = crypto.randomBytes(16).toString("hex");
      return `pro/null/${randHex}_${Date.now()}.${ext}`;
    } catch (err) {
      console.error("[Error] Gagal membuat key unik S3:", err?.message);
      return `pro/null/default_${Date.now()}.mp3`;
    }
  }
  async _get_pg() {
    try {
      console.log("[Process] Menginisialisasi sesi awal dan mengambil cookie pendaratan...");
      await this.client.get("/ai-voice", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        }
      });
      console.log("[Process] Sinkronisasi sesi awal selesai.");
      return true;
    } catch (err) {
      console.error("[Error] Gagal mendapatkan cookie pendaratan awal:", err?.message);
      return false;
    }
  }
  async _get_up_url(key, extra) {
    try {
      console.log("[Process] Mengirim permintaan upload URL S3...");
      const payload = {
        key: key,
        ...extra
      };
      const res = await this.client.post("/ai-song-cover-api/common/get_upload_url", payload, {
        headers: {
          accept: "application/json",
          "content-type": "application/json;charset=UTF-8",
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          origin: "https://voicechanger.easeus.com",
          referer: "https://voicechanger.easeus.com/ai-voice/satoru-gojo"
        }
      });
      return res?.data?.data?.upload_url || null;
    } catch (err) {
      console.error("[Error] Gagal mendapatkan upload URL S3:", err?.message);
      return null;
    }
  }
  async _up_s3(uploadUrl, buffer, fileType) {
    try {
      console.log("[Process] Mengunggah file stream ke S3...");
      await axios.put(uploadUrl, buffer, {
        headers: {
          "content-type": fileType || "audio/mpeg",
          "cache-control": "no-cache"
        }
      });
      return true;
    } catch (err) {
      console.error("[Error] Transaksi upload ke S3 gagal:", err?.message);
      return false;
    }
  }
  async _sub_task(key, filename, toneId, extra) {
    try {
      console.log("[Process] Mendaftarkan berkas ke antrean konversi...");
      const payload = {
        key: key,
        origin_file_name: filename,
        tone_id: String(toneId),
        query_source: "multimedia",
        ...extra
      };
      const res = await this.client.post("/ai-song-cover-api/changer/file", payload, {
        headers: {
          accept: "application/json",
          "content-type": "application/json;charset=UTF-8",
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          origin: "https://voicechanger.easeus.com",
          referer: "https://voicechanger.easeus.com/ai-voice/satoru-gojo"
        }
      });
      return res?.data?.data?.task_id || null;
    } catch (err) {
      console.error("[Error] Gagal mendaftarkan antrean:", err?.message);
      return null;
    }
  }
  async _poll_task(taskId, maxAttempts = 60, intervalMs = 3e3) {
    try {
      console.log(`[Process] Memulai pencarian status berkas ID: ${taskId}`);
      const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`[Process] Melakukan verifikasi progres (${attempt}/${maxAttempts})...`);
        const res = await this.client.get(`/ai-song-cover-api/changer/query/${taskId}`, {
          headers: {
            accept: "application/json",
            priority: "u=1, i",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            referer: "https://voicechanger.easeus.com/ai-voice/satoru-gojo"
          }
        });
        const taskData = res?.data?.data;
        const state = taskData?.state;
        const progress = taskData?.process;
        if (state === 2 || progress === 100) {
          return {
            output_url: taskData?.cover_song_result_wav_url || null,
            progress: progress,
            state: state
          };
        }
        await sleep(intervalMs);
      }
      return null;
    } catch (err) {
      console.error("[Error] Polling status berkas mengalami kegagalan:", err?.message);
      return null;
    }
  }
  async voice_list({
    page,
    ...rest
  }) {
    try {
      console.log("[Process] Membaca index direktori berkas suara...");
      if (Object.keys(this.cookies).length === 0) {
        await this._get_pg();
      }
      const targetPage = Number(page || 1);
      const url = targetPage > 1 ? `/ai-voice/page/${targetPage}` : "/ai-voice";
      const res = await this.client.get(url, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          priority: "u=0, i",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        }
      });
      const $ = cheerio.load(res?.data || "");
      const voices = $("#__NEXT_DATA__").map((i, el) => {
        try {
          const parsed = JSON.parse($(el).html() || "{}");
          const pageProps = parsed?.props?.pageProps || {};
          const list = Object.values(pageProps).filter(Array.isArray).flat();
          return list.map(item => ({
            tone_name: item?.toneName || "",
            tone_id: String(item?.toneID || ""),
            tone_image: item?.toneImage || "",
            tone_file: item?.toneFile || "",
            path: item?.path || "",
            author_name: item?.authorName || ""
          }));
        } catch (e) {
          return [];
        }
      }).get();
      console.log(`[Process] Berhasil mendapatkan ${voices.length} variasi suara`);
      return {
        status: "success",
        result: {
          voices: voices
        }
      };
    } catch (err) {
      console.error("[Error] Pengambilan data voice_list gagal:", err?.message);
      return {
        status: "error",
        result: {
          success: false,
          error_message: err?.message || "Gagal terhubung ke direktori library"
        }
      };
    }
  }
  async generate({
    voice = "132",
    ...rest
  }) {
    try {
      console.log("[Process] Executing generation flow sequence...");
      if (Object.keys(this.cookies).length === 0) {
        await this._get_pg();
      }
      const targetVoiceId = String(voice || rest?.voice_id || rest?.tone_id || "");
      const audioInput = rest?.audio;
      if (!targetVoiceId) {
        return {
          status: "error",
          result: {
            success: false,
            error_message: "Required voice identifier (voice/voice_id/tone_id) is missing."
          }
        };
      }
      console.log(`[Process] Target voice selected: tone_id="${targetVoiceId}"`);
      const resolvedAudio = await this._auto_detect_audio(audioInput, rest);
      if (!resolvedAudio) {
        return {
          status: "error",
          result: {
            success: false,
            error_message: "Argument conversion to stream binary buffer and metadata resolution failed"
          }
        };
      }
      const {
        buffer: audioBuffer,
        file_type: fileType,
        filename
      } = resolvedAudio;
      console.log(`[Process] Audio resolved: filename="${filename}" (${fileType})`);
      const key = this._gen_key(filename);
      const uploadUrl = await this._get_up_url(key, rest);
      if (!uploadUrl) {
        return {
          status: "error",
          result: {
            success: false,
            error_message: "Failed to request target signing reference"
          }
        };
      }
      const uploadStatus = await this._up_s3(uploadUrl, audioBuffer, fileType);
      if (!uploadStatus) {
        return {
          status: "error",
          result: {
            success: false,
            error_message: "AWS S3 bucket target upload failed"
          }
        };
      }
      const taskId = await this._sub_task(key, filename, targetVoiceId, rest);
      if (!taskId) {
        return {
          status: "error",
          result: {
            success: false,
            error_message: "Pipeline queue creation request rejected"
          }
        };
      }
      const pollResult = await this._poll_task(taskId, rest?.max_attempts || 60, rest?.interval || 3e3);
      if (!pollResult?.output_url) {
        return {
          status: "error",
          result: {
            success: false,
            task_id: taskId,
            error_message: "Polling execution expired or returned void parameters"
          }
        };
      }
      console.log("[Process] Core generation pipeline execution finished");
      return {
        status: "success",
        result: {
          success: true,
          task_id: taskId,
          output_url: pollResult.output_url,
          final_progress: pollResult.progress,
          final_state: pollResult.state
        }
      };
    } catch (err) {
      console.error("[Process] Error captured inside core execution pipeline:", err?.message || err);
      return {
        status: "error",
        result: {
          success: false,
          error_message: err?.message || "Processing runtime exception"
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
  const validActions = ["list", "generate"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          list: "/api/voice-changer?action=list&page=1",
          generate: {
            method: "POST",
            payload: {
              action: "generate",
              voice: "150",
              audio: "https://example.com/audio.mp3",
              filename: "audio.mp3",
              file_type: "audio/mpeg"
            }
          }
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
  const api = new EaseUsVoice();
  try {
    let response;
    switch (action) {
      case "list":
        const listParams = {
          page: params.page ? parseInt(params.page, 10) : 1
        };
        response = await api.voice_list(listParams);
        break;
      case "generate":
        const targetVoice = params.voice || params.voice_id || params.tone_id;
        const audioInput = params.audio || params.url || params.file;
        if (!targetVoice) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'voice' (tone_id atau nama suara) wajib diisi untuk melakukan generasi."
          });
        }
        if (!audioInput) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'audio' (Buffer, Base64, atau URL) wajib diisi untuk melakukan generasi."
          });
        }
        const generateParams = {
          voice: targetVoice,
          audio: audioInput,
          ...params
        };
        response = await api.generate(generateParams);
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
    if (response.status === "error" || response.status === false) {
      return res.status(422).json({
        action: action,
        ...response
      });
    }
    return res.status(200).json({
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