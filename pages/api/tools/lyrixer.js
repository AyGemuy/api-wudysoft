import axios from "axios";
import FormData from "form-data";
import {
  randomUUID
} from "crypto";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class Lyrixer {
  constructor() {
    this.base = "https://lyrixer.com/api";
    this.anon = randomUUID();
    this.jar = new CookieJar();
    this.ax = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      timeout: 6e4,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://lyrixer.com",
        pragma: "no-cache",
        referer: "https://lyrixer.com/id",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    }));
  }
  async toBuffer(media) {
    try {
      if (Buffer.isBuffer(media)) return media;
      if (media?.startsWith?.("data:")) {
        const b64 = media.split(",")[1] || media;
        return Buffer.from(b64, "base64");
      }
      if (media?.startsWith?.("http")) {
        const {
          data
        } = await this.ax.get(media, {
          responseType: "arraybuffer"
        });
        return Buffer.from(data);
      }
      return Buffer.from(media);
    } catch (e) {
      console.log("[toBuffer]", e?.message || e);
      throw e;
    }
  }
  async up(audio, name = "audio.mp3", lang = "auto-detect", size = "big") {
    try {
      console.log("[upload] start");
      const buf = await this.toBuffer(audio);
      const form = new FormData();
      form.append("file", buf, name);
      form.append("originalFileName", name);
      form.append("targetLang", lang);
      form.append("modelSize", size);
      form.append("anonymousId", this.anon);
      const {
        data
      } = await this.ax.post(`${this.base}/upload`, form, {
        headers: {
          ...form.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      console.log("[upload] jobId:", data?.jobId);
      return data?.jobId;
    } catch (e) {
      console.log("[upload]", e?.response?.data || e?.message || e);
      throw e;
    }
  }
  async poll(id) {
    try {
      console.log("[poll] check:", id);
      const {
        data
      } = await this.ax.get(`${this.base}/jobs/${id}`);
      return data;
    } catch (e) {
      console.log("[poll]", e?.response?.data || e?.message || e);
      throw e;
    }
  }
  async wait(id, max = 60, delay = 3e3) {
    try {
      for (let i = 0; i < max; i++) {
        const res = await this.poll(id);
        console.log(`[wait] ${i + 1}/${max}`, res?.status || "unknown");
        if (res?.status === "completed") return res;
        if (res?.status === "failed") throw new Error("job failed");
        await new Promise(r => setTimeout(r, delay));
      }
      throw new Error("timeout");
    } catch (e) {
      console.log("[wait]", e?.message || e);
      throw e;
    }
  }
  async res(url, name, lang = "auto-detect") {
    try {
      console.log("[resolve] start");
      const fname = `lyrics_${name}`;
      const {
        data
      } = await this.ax.post(`${this.base}/upload/resolve`, {
        targetLang: lang,
        uploadFileName: name,
        filename: fname,
        lyricsUrl: url,
        anonymousId: this.anon
      }, {
        headers: {
          "content-type": "application/json"
        }
      });
      console.log("[resolve] done");
      return data;
    } catch (e) {
      console.log("[resolve]", e?.response?.data || e?.message || e);
      throw e;
    }
  }
  async generate({
    audio,
    name,
    lang,
    size,
    ...rest
  }) {
    try {
      const fname = name || rest?.filename || "audio.mp3";
      const tlang = lang || rest?.targetLang || "auto-detect";
      const msize = size || rest?.modelSize || "big";
      const job = await this.up(audio, fname, tlang, msize);
      const wres = await this.wait(job);
      const result = await this.res(wres?.lyrics_url, fname, tlang);
      return {
        ...wres,
        ...result
      };
    } catch (e) {
      console.log("[generate]", e?.message || e);
      throw e;
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
  const api = new Lyrixer();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}