import axios from "axios";
class SaveTheVideo {
  constructor() {
    this.api = "https://api.v02.savethevideo.com";
    this.audioFmts = ["best", "mp3", "m4a", "aac", "flac", "wav", "opus", "vorbis"];
    this.videoFmts = ["mp4", "webm", "avi", "mov", "mkv", "flv"];
    this.cbrQualities = ["320", "256", "192", "128", "96", "64", "32"];
    this.vbrQualities = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    this.http = axios.create({
      baseURL: this.api,
      headers: {
        accept: "application/json",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://www.savethevideo.com",
        pragma: "no-cache",
        referer: "https://www.savethevideo.com/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async _slp(ms = 3e3) {
    try {
      await new Promise(resolve => setTimeout(resolve, ms));
      return null;
    } catch (err) {
      console.error(`[Error _slp] ${err?.message || err}`);
      return null;
    }
  }
  _val(fmt = "mp3", q = "5") {
    try {
      const f = fmt?.toLowerCase() || "mp3";
      const isAudio = this.audioFmts.includes(f);
      const isVideo = this.videoFmts.includes(f);
      if (!isAudio && !isVideo) {
        console.log(`[Warn] Format "${f}" tidak terdaftar di convert, default ke "mp3"`);
        return {
          format: "mp3",
          quality: "5"
        };
      }
      let quality = String(q || "5");
      if (f === "opus" && this.vbrQualities.includes(quality)) {
        quality = "128";
      }
      const isCbrOrVbr = this.cbrQualities.includes(quality) || this.vbrQualities.includes(quality);
      return {
        format: f,
        quality: isAudio && isCbrOrVbr ? quality : isAudio ? "5" : null
      };
    } catch (err) {
      console.error(`[Error _val] ${err?.message || err}`);
      return {
        format: "mp3",
        quality: "5"
      };
    }
  }
  async _task(payload) {
    try {
      console.log(`[Process] Request task: type=${payload?.type || "info"}`);
      const res = await this.http.post("/tasks", payload);
      return res?.data || {
        error: "Empty response data"
      };
    } catch (err) {
      const errRes = err?.response?.data || {
        error: err?.message || "Gagal membuat task"
      };
      console.error(`[Error _task]`, errRes);
      return errRes;
    }
  }
  async _poll(href, intv = 3e3, max = 60) {
    try {
      if (!href) return {
        error: "Path href polling tidak valid"
      };
      console.log(`[Process] Memulai polling: ${href}`);
      let count = 0;
      while (count < max) {
        count++;
        const res = await this.http.get(href);
        const data = res?.data || {};
        const state = data?.state;
        console.log(`[Polling ${count}/${max}] [${data?.type || "task"}] State: ${state || "unknown"}`);
        if (state === "completed") {
          console.log(`[Process] Task ${data?.type || ""} [${data?.id || href}] selesai.`);
          return data;
        }
        if (state === "failed") {
          console.error(`[Error _poll] Task gagal`, data?.error);
          return data;
        }
        await this._slp(intv);
      }
      const timeoutMsg = `Polling timeout setelah ${max * (intv / 1e3)} detik`;
      console.error(`[Error _poll] ${timeoutMsg}`);
      return {
        error: timeoutMsg
      };
    } catch (err) {
      const errRes = err?.response?.data || {
        error: err?.message || "Error saat polling"
      };
      console.error(`[Error _poll]`, errRes);
      return errRes;
    }
  }
  async _exec(payload) {
    try {
      const init = await this._task(payload);
      if (init?.error || init?.state === "failed") return init;
      if (init?.state === "completed") return init;
      const href = init?.href || (init?.id ? `/tasks/${init.id}` : null);
      if (!href) return init;
      return await this._poll(href, 3e3, 60);
    } catch (err) {
      console.error(`[Error _exec] ${err?.message || err}`);
      return {
        error: err?.message || "Eksekusi task gagal"
      };
    }
  }
  async download({
    url,
    info = true,
    download = false,
    convert = false,
    format,
    quality = "5",
    ...rest
  } = {}) {
    try {
      if (!url) {
        console.error('[Error download] Parameter "url" tidak boleh kosong');
        return {
          status: false,
          result: {
            error: 'Parameter "url" dibutuhkan'
          }
        };
      }
      const activeTypes = [];
      if (info) activeTypes.push("info");
      if (download) activeTypes.push("download");
      if (convert) activeTypes.push("convert");
      if (activeTypes.length === 0) activeTypes.push("info");
      console.log(`[Process] Menjalankan task berurutan untuk: ${url} -> [${activeTypes.join(", ")}]`);
      const result = {};
      for (const type of activeTypes) {
        let payload = {
          type: type,
          url: url,
          ...rest
        };
        if (type === "convert") {
          const valRes = this._val(format || "mp3", quality);
          payload.format = valRes?.format || "mp3";
          if (valRes?.quality) payload.quality = valRes.quality;
        } else if (type === "download") {
          payload.format = format || "best";
        }
        const taskRes = await this._exec(payload);
        result[type] = taskRes?.result !== undefined ? taskRes.result : taskRes;
      }
      return {
        status: true,
        result: result
      };
    } catch (err) {
      console.error(`[Error download] ${err?.message || err}`);
      return {
        status: false,
        result: {
          error: err?.message || "Download gagal"
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
  const api = new SaveTheVideo();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}