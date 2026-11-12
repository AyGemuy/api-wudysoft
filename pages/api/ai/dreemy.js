import axios from "axios";
import FormData from "form-data";
class DreemyAI {
  constructor() {
    this.base = "https://www.dreemy.ai";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      origin: this.base,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "x-language": "id",
      "x-platform": "web",
      "x-version": "999.0.0"
    };
  }
  decode_state(b64) {
    const fallback = {
      token: null,
      finger: null
    };
    if (!b64 || typeof b64 !== "string") return fallback;
    try {
      const str = Buffer.from(b64, "base64").toString("utf8");
      return JSON.parse(str) || fallback;
    } catch (e) {
      return fallback;
    }
  }
  encode_state(obj) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch (e) {
      return "";
    }
  }
  gen_finger() {
    try {
      const rand = () => Math.random().toString(16).slice(2);
      const components = {
        userAgent: this.headers["user-agent"],
        language: "id-ID",
        colorDepth: 24,
        deviceMemory: 4,
        hardwareConcurrency: 8,
        screenResolution: [1920, 1080],
        timezone: "Asia/Makassar",
        platform: "Linux armv81",
        vendor: "Google Inc.",
        timestamp: Date.now(),
        random: rand()
      };
      const str = Object.keys(components).sort().map(k => `${k}:${JSON.stringify(components[k])}`).join("|");
      return this.murmur(str);
    } catch (e) {
      console.error("[ERROR] gen_finger:", e?.message);
      return this.gen_random();
    }
  }
  gen_random() {
    const hex = () => Math.floor(Math.random() * 16).toString(16);
    return Array(32).fill(0).map(hex).join("");
  }
  murmur(str, seed = 0) {
    const buf = Buffer.from(str, "utf8");
    let h1 = seed;
    const c1 = 3432918353;
    const c2 = 461845907;
    for (let i = 0; i < buf.length - 3; i += 4) {
      let k1 = buf[i] | buf[i + 1] << 8 | buf[i + 2] << 16 | buf[i + 3] << 24;
      k1 = Math.imul(k1, c1);
      k1 = k1 << 15 | k1 >>> 17;
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
      h1 = h1 << 13 | h1 >>> 19;
      h1 = Math.imul(h1, 5) + 3864292196;
    }
    h1 ^= buf.length;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 2246822507);
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 3266489909);
    h1 ^= h1 >>> 16;
    return (h1 >>> 0).toString(16).padStart(8, "0") + this.gen_random().slice(0, 24);
  }
  get_headers(stateObj = {}) {
    return {
      ...this.headers,
      "x-finger": stateObj.finger || this.gen_finger(),
      ...stateObj.token ? {
        "x-auth-token": stateObj.token
      } : {}
    };
  }
  async ensure_auth(stateObj = {}) {
    try {
      stateObj.finger = stateObj.finger || this.gen_finger();
      if (stateObj.token) {
        return {
          status: true,
          result: stateObj.token
        };
      }
      console.log("[AUTH] Menginisialisasi otentikasi akun guest...");
      const headers = this.get_headers(stateObj);
      const guestRes = await axios.post(`${this.base}/api/auth/createGuest`, {}, {
        headers: {
          ...headers,
          "content-length": "0"
        }
      });
      const {
        guestUid,
        guestKey
      } = guestRes?.data?.data || {};
      if (!guestUid || !guestKey) {
        return {
          status: false,
          result: "Gagal memperoleh kredensial guest"
        };
      }
      console.log("[AUTH] Mengakses info akun...");
      await axios.get(`${this.base}/api/auth/getAccount`, {
        headers: {
          ...headers,
          "x-no-handle": "true"
        }
      });
      console.log("[AUTH] Melakukan login guest...");
      const loginRes = await axios.post(`${this.base}/api/auth/loginByGuest`, {
        guestUid: guestUid,
        guestKey: guestKey
      }, {
        headers: {
          ...headers,
          "content-type": "application/json"
        }
      });
      stateObj.token = loginRes?.data?.data?.token || loginRes?.data?.data?.idToken || null;
      console.log("[AUTH] Otentikasi berhasil diselesaikan");
      return {
        status: true,
        result: stateObj.token
      };
    } catch (e) {
      console.error("[ERROR] ensure_auth:", e?.response?.data || e?.message);
      return {
        status: false,
        result: e?.response?.data || e?.message
      };
    }
  }
  async upload_file(media, state = "") {
    const stateObj = this.decode_state(state);
    try {
      const auth = await this.ensure_auth(stateObj);
      if (!auth.status) {
        return {
          status: false,
          result: auth.result,
          state: this.encode_state(stateObj)
        };
      }
      console.log("[UPLOAD] Memproses media...");
      let buffer;
      if (Buffer.isBuffer(media)) {
        buffer = media;
      } else if (typeof media === "string" && media.startsWith("http")) {
        const res = await axios.get(media, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(res.data);
      } else if (typeof media === "string" && media.startsWith("data:")) {
        buffer = Buffer.from(media.split(",")[1], "base64");
      } else {
        buffer = Buffer.from(media, "base64");
      }
      const form = new FormData();
      form.append("file", buffer, {
        filename: "image.png",
        contentType: "image/png"
      });
      const res = await axios.post(`${this.base}/api/upload/uploadTempFile`, form, {
        headers: {
          ...this.get_headers(stateObj),
          ...form.getHeaders()
        }
      });
      const url = res?.data?.data || null;
      console.log("[UPLOAD] Media berhasil diunggah:", url);
      return {
        status: true,
        result: url,
        state: this.encode_state(stateObj)
      };
    } catch (e) {
      console.error("[ERROR] upload_file:", e?.response?.data || e?.message);
      return {
        status: false,
        result: e?.response?.data || e?.message,
        state: this.encode_state(stateObj)
      };
    }
  }
  async generate({
    state = "",
    mode = "image",
    prompt,
    image,
    ...rest
  }) {
    const stateObj = this.decode_state(state);
    try {
      const type = String(mode || "").toLowerCase();
      if (type !== "image" && type !== "video") {
        return {
          status: false,
          result: "Invalid mode. Gunakan 'image' atau 'video'",
          state: this.encode_state(stateObj)
        };
      }
      const auth = await this.ensure_auth(stateObj);
      if (!auth.status) {
        return {
          status: false,
          result: auth.result,
          state: this.encode_state(stateObj)
        };
      }
      let uploadedUrls = [];
      if (image) {
        const images = Array.isArray(image) ? image : [image];
        for (const img of images) {
          const currentState = this.encode_state(stateObj);
          const uploadRes = await this.upload_file(img, currentState);
          if (uploadRes.status && uploadRes.result) {
            uploadedUrls.push(uploadRes.result);
            Object.assign(stateObj, this.decode_state(uploadRes.state));
          }
        }
      }
      let result;
      switch (type) {
        case "image": {
          console.log("[GENERATE] Membuat tugas pembuatan gambar...");
          const payload = {
            imageUrls: uploadedUrls,
            prompt: prompt || "Cute girl",
            resolution: rest.resolution || "2K",
            number: rest.number || 1,
            modelId: rest.modelId || 2,
            permission: rest.permission || "1",
            resourceId: rest.resourceId || 64,
            resourceType: rest.resourceType || "3",
            ...rest
          };
          const res = await axios.post(`${this.base}/api/aiImage/create/v2`, payload, {
            headers: {
              ...this.get_headers(stateObj),
              "content-type": "application/json"
            }
          });
          result = res?.data?.data || res?.data;
          break;
        }
        case "video": {
          console.log("[GENERATE] Membuat tugas pembuatan video...");
          const payload = {
            baseImage: uploadedUrls[0] || "",
            extraImage: rest.extraImage || "",
            prompt: prompt || "",
            resolution: rest.resolution || "480p",
            length: rest.length || 5,
            permission: rest.permission || "2",
            ...rest
          };
          const res = await axios.post(`${this.base}/api/aiVideo/createAiVideo`, payload, {
            headers: {
              ...this.get_headers(stateObj),
              "content-type": "application/json"
            }
          });
          result = res?.data?.data || res?.data;
          break;
        }
      }
      return {
        status: true,
        result: result,
        state: this.encode_state(stateObj)
      };
    } catch (e) {
      console.error("[ERROR] generate:", e?.response?.data || e?.message);
      return {
        status: false,
        result: e?.response?.data || e?.message,
        state: this.encode_state(stateObj)
      };
    }
  }
  async status({
    state = "",
    mode = "image",
    ...rest
  }) {
    const stateObj = this.decode_state(state);
    try {
      const type = String(mode || "").toLowerCase();
      if (type !== "image" && type !== "video") {
        return {
          status: false,
          result: "Invalid mode. Gunakan 'image' atau 'video'",
          state: this.encode_state(stateObj)
        };
      }
      const auth = await this.ensure_auth(stateObj);
      if (!auth.status) {
        return {
          status: false,
          result: auth.result,
          state: this.encode_state(stateObj)
        };
      }
      let result;
      switch (type) {
        case "image": {
          console.log("[STATUS] Memeriksa status pembuatan gambar...");
          const ids = rest.id || rest.ids || rest.resultIds || [];
          const payload = {
            resultIds: Array.isArray(ids) ? ids : [ids]
          };
          const res = await axios.post(`${this.base}/api/aiImage/getListTaskStatus`, payload, {
            headers: {
              ...this.get_headers(stateObj),
              "content-type": "application/json"
            }
          });
          result = res?.data?.data || res?.data;
          break;
        }
        case "video": {
          console.log("[STATUS] Memeriksa status pembuatan video...");
          const ids = rest.id || rest.ids || rest.jobIds || [];
          const payload = {
            scene: rest.scene || "2",
            jobIds: Array.isArray(ids) ? ids : [ids]
          };
          const res = await axios.post(`${this.base}/api/aiVideo/checkJobStatus`, payload, {
            headers: {
              ...this.get_headers(stateObj),
              "content-type": "application/json"
            }
          });
          result = res?.data?.data || res?.data;
          break;
        }
      }
      return {
        status: true,
        result: result,
        state: this.encode_state(stateObj)
      };
    } catch (e) {
      console.error("[ERROR] status:", e?.response?.data || e?.message);
      return {
        status: false,
        result: e?.response?.data || e?.message,
        state: this.encode_state(stateObj)
      };
    }
  }
  async search_models({
    state = "",
    keyword = "",
    page_no = 1,
    page_size = 30,
    sort_column = "popularity",
    sort_type = "desc",
    category = ""
  }) {
    const stateObj = this.decode_state(state);
    try {
      const auth = await this.ensure_auth(stateObj);
      if (!auth.status) {
        return {
          status: false,
          result: auth.result,
          state: this.encode_state(stateObj)
        };
      }
      console.log("[SEARCH] Mencari model berdasarkan parameter...");
      const params = {
        pageNo: page_no,
        pageSize: page_size,
        sortColumn: sort_column,
        sortType: sort_type
      };
      if (keyword) params.keyword = keyword;
      if (category) params.category = category;
      const res = await axios.get(`${this.base}/api/aiModel/list`, {
        params: params,
        headers: this.get_headers(stateObj)
      });
      return {
        status: true,
        result: res?.data?.data || res?.data,
        state: this.encode_state(stateObj)
      };
    } catch (e) {
      console.error("[ERROR] search_models:", e?.response?.data || e?.message);
      return {
        status: false,
        result: e?.response?.data || e?.message,
        state: this.encode_state(stateObj)
      };
    }
  }
  async get_my_videos({
    state = "",
    page_no = 1,
    page_size = 20,
    scene = "2"
  }) {
    const stateObj = this.decode_state(state);
    try {
      const auth = await this.ensure_auth(stateObj);
      if (!auth.status) {
        return {
          status: false,
          result: auth.result,
          state: this.encode_state(stateObj)
        };
      }
      console.log("[MY VIDEOS] Mengambil daftar pembuatan video pengguna...");
      const payload = {
        pageNo: page_no,
        pageSize: page_size,
        scene: scene
      };
      const res = await axios.post(`${this.base}/api/aiVideo/myAiVideos`, payload, {
        headers: {
          ...this.get_headers(stateObj),
          "content-type": "application/json"
        }
      });
      return {
        status: true,
        result: res?.data?.data || res?.data,
        state: this.encode_state(stateObj)
      };
    } catch (e) {
      console.error("[ERROR] get_my_videos:", e?.response?.data || e?.message);
      return {
        status: false,
        result: e?.response?.data || e?.message,
        state: this.encode_state(stateObj)
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["generate", "status", "search", "videos"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          generate: "/?action=generate&mode=image&prompt=Cute girl",
          status: "/?action=status&mode=image&id=2968532",
          search: "/?action=search&keyword=Spicy",
          videos: "/?action=videos"
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
  const api = new DreemyAI();
  try {
    let response;
    switch (action) {
      case "generate":
        response = await api.generate({
          state: params.state,
          mode: params.mode || "image",
          prompt: params.prompt,
          image: params.image,
          ...params
        });
        break;
      case "status": {
        const id = params.id || params.ids || params.resultIds || params.jobIds;
        if (!id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' (atau 'resultIds'/'jobIds') wajib diisi untuk action 'status'."
          });
        }
        response = await api.status({
          state: params.state,
          mode: params.mode || "image",
          id: id,
          ...params
        });
        break;
      }
      case "search":
        response = await api.search_models({
          state: params.state,
          keyword: params.keyword || params.word || "",
          page_no: params.page_no || params.page,
          page_size: params.page_size,
          sort_column: params.sort_column,
          sort_type: params.sort_type,
          category: params.category,
          ...params
        });
        break;
      case "videos":
        response = await api.get_my_videos({
          state: params.state,
          page_no: params.page_no || params.page,
          page_size: params.page_size,
          scene: params.scene,
          ...params
        });
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak menerima respons yang valid dari server target."
      });
    }
    return res.status(response.status ? 200 : 400).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target API.",
      error: error.message || "Unknown Error"
    });
  }
}