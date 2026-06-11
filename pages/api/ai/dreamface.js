import axios from "axios";
import crypto from "crypto";
const RATIO = {
  "4:3": {
    width: 1440,
    height: 1080
  },
  "3:4": {
    width: 1080,
    height: 1440
  },
  "1:1": {
    width: 1024,
    height: 1024
  },
  "16:9": {
    width: 1440,
    height: 810
  },
  "9:16": {
    width: 810,
    height: 1440
  }
};
const sleep = ms => new Promise(res => setTimeout(res, ms));
class DreamFace {
  constructor(userId = null) {
    this.userId = userId || this.h16(8);
    this.hdrs = {
      "User-Agent": `Mozilla/5.0 (Linux; Android 15; RMX3890 Build/AQ3A.240812.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/148.0.7778.215 Mobile Safari/537.36 userId/${this.userId} DreamFace/6.28.0`,
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "sec-ch-ua-platform": '"Android"',
      "sec-ch-ua": '"Chromium";v="148", "Android WebView";v="148", "Not/A)Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      origin: "https://cloudf.dreamfaceapp.com",
      "x-requested-with": "com.dreamapp.dubhe",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      referer: "https://cloudf.dreamfaceapp.com/m/imgGenerator.html",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      priority: "u=1, i",
      Cookie: `userid=${this.userId}; userid=${this.userId}`,
      "user-id": this.userId,
      "platform-type": "ANDROID",
      "app-version": "6.28.0",
      "system-version": "15",
      "app-type": "dreamface_free",
      language: "id"
    };
    this.api = axios.create({
      baseURL: "https://cloudf.dreamfaceapp.com",
      headers: this.hdrs,
      timeout: 6e4
    });
  }
  md5(s) {
    return crypto.createHash("md5").update(s).digest("hex");
  }
  h16(n) {
    return crypto.randomBytes(n).toString("hex");
  }
  uuid() {
    const h = crypto.randomBytes(16).toString("hex");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(12, 15)}-${(parseInt(h[15], 16) & 3 | 8).toString(16)}${h.slice(16, 19)}-${h.slice(19, 31)}`;
  }
  sign(body) {
    try {
      const ts = body.timestamp || Date.now().toString();
      return this.md5(`app_type=dreamface_free&app_version=6.28.0&timestamp=${ts}&user_id=${this.userId}`);
    } catch (e) {
      console.error("[Sign Error]", e.message);
      return this.md5(Date.now().toString());
    }
  }
  base(extra = {}) {
    const ts = Date.now();
    return {
      user_id: this.userId,
      country_code: "id",
      timestamp: ts,
      platform_type: "ANDROID",
      app_version: "6.28.0",
      app_type: "dreamface_free",
      language: "id",
      token: this.md5(`${this.userId}${ts}dreamface_free`),
      ...extra
    };
  }
  async post(url, body) {
    try {
      console.log(`[POST] -> ${url}`);
      const signature = this.sign(body);
      const headers = {
        ...this.hdrs,
        "x-signature": signature
      };
      const res = await this.api.post(url, body, {
        headers: headers
      });
      console.log(`[POST OK] -> Status: ${res.status}`);
      return res.data;
    } catch (e) {
      console.error(`[POST ERR] -> ${url}:`, e.message);
      if (e.response) console.error("[POST ERR DETAILS]:", JSON.stringify(e.response.data));
      throw e;
    }
  }
  async poll(taskId) {
    try {
      const pld = this.base({
        animate_id_list: [taskId]
      });
      const res = await this.post("/df-server/reface/animate_image_list_poll", pld);
      const list = res?.data?.animate_image_list || [];
      return list.find(i => i.animate_id === taskId) || null;
    } catch (e) {
      console.error(`[Poll Error] ID ${taskId}:`, e.message);
      return null;
    }
  }
  async track(taskId, delayMs = 3e3, timeoutMs = 12e4) {
    try {
      console.log(`[Tracking] ID: ${taskId}`);
      const limit = Date.now() + timeoutMs;
      while (Date.now() < limit) {
        await sleep(delayMs);
        const data = await this.poll(taskId);
        if (!data) continue;
        console.log(`[Tracking] State: ${data.state}`);
        if (["success", "done", "finish"].includes(data.state.toLowerCase())) {
          return data;
        }
        if (["fail", "failed", "timeout", "error"].includes(data.state.toLowerCase())) {
          throw new Error(`Server error: ${JSON.stringify(data)}`);
        }
      }
      throw new Error("Timeout");
    } catch (e) {
      console.error("[Tracking Error]:", e.message);
      throw e;
    }
  }
  async create({
    prompt,
    ratio = "4:3",
    tpl = "APP-FLUX-T2I",
    ...rest
  }) {
    try {
      if (!prompt) throw new Error("Parameter 'prompt' wajib diisi!");
      const dims = RATIO[ratio] || RATIO["4:3"];
      const taskId = this.uuid();
      const payload = this.base({
        template_id: tpl,
        play_types: ["TEXT_TO_IMAGE"],
        photo_info_list: [{}],
        ext: {
          sing_title: prompt,
          singer: "Text to image"
        },
        ext_params: {
          hit_ab: false,
          free_strategy: "dream_image",
          client_free_strategy: "others",
          free_count: 1,
          default_free_strategy: true
        },
        ai_gen_image_info: {
          type: "text2image",
          prompts: [{
            content: prompt,
            type: "text",
            language: "en"
          }],
          ...dims,
          ratio: ratio
        },
        pt_infos: [],
        cur_task_id: taskId,
        ...rest
      });
      const res = await this.post("/df-server/face_v5/animate_image_v5", payload);
      if (res.status_code !== "THS12140000000") {
        throw new Error(`Gagal mengirim tugas T2I: ${res.status_msg}`);
      }
      const targetId = res.data.animate_image_id || taskId;
      return await this.track(targetId);
    } catch (e) {
      console.error("[Generation Failed]:", e.message);
      return {
        error: true,
        msg: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new DreamFace();
  try {
    const data = await api.create(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}