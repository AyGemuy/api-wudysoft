import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class CreenAI {
  constructor() {
    this.defaults = {
      baseURL: "https://www.creen.ai",
      platform: "web",
      language: "id",
      version: "999.0.0",
      userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      cookie: "NEXT_LOCALE=id;"
    };
    this.baseURL = this.defaults.baseURL;
    this.lang = this.defaults.language;
    this.ver = this.defaults.version;
    this.on401 = () => {};
    this.finger = crypto.randomBytes(16).toString("hex");
    this._store = {
      token: null,
      uid: null,
      key: null,
      lang: this.lang
    };
    this._ensuring = null;
    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: 6e4
    });
  }
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async _ensure_token() {
    console.log("[ENSURE AUTH] Memeriksa ketersediaan token & profil...");
    try {
      if (this._store.token) return;
      if (this._ensuring) return this._ensuring;
      this._ensuring = (async () => {
        try {
          console.log("[ENSURE AUTH] Jalur pipa sekuensial otomatis dimulai...");
          if (!this._store.uid || !this._store.key) {
            await this.guest();
          }
          await this.guest_login();
          await this.account();
          console.log("[ENSURE AUTH] Seluruh rangkaian otentikasi awal sukses dilakukan.");
        } catch (err) {
          console.error("[ENSURE AUTH FATAL]", err.message);
        } finally {
          this._ensuring = null;
        }
      })();
      return this._ensuring;
    } catch (err) {
      console.error("[ENSURE AUTH TRAPPED]", err.message);
    }
  }
  async _resolve_file(input) {
    console.log("[RESOLVER] Memproses input file...");
    try {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (input.startsWith("data:") || /^[A-Za-z0-9+/=]+$/.test(input.replace(/^data:image\/[a-z]+;base64,/, ""))) {
          const cleanB64 = input.replace(/^data:image\/[a-z]+;base64,/, "");
          return Buffer.from(cleanB64, "base64");
        }
      }
      return null;
    } catch (err) {
      console.error("[RESOLVER ERR]", err.message);
      return null;
    }
  }
  _hdrs(customHeaders = {}) {
    try {
      const headers = {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        cookie: this.defaults.cookie,
        origin: this.baseURL,
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${this.baseURL}/id`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": this.defaults.userAgent,
        "x-finger": this.finger,
        "x-language": this._store.lang,
        "x-platform": this.defaults.platform,
        "x-version": this.ver,
        ...customHeaders
      };
      if (this._store.token) headers["x-auth-token"] = this._store.token;
      return headers;
    } catch (err) {
      console.error("[HDRS BUILDER ERR]", err.message);
      return customHeaders;
    }
  }
  async _req(method, url, {
    token = null,
    params = {},
    data = {},
    headers = {},
    skipAuth = false
  } = {}) {
    console.log(`[CORE REQ] Mulai: ${method.toUpperCase()} ${url}`);
    try {
      if (token) this._store.token = token;
      if (!skipAuth && !url.includes("/api/auth/")) {
        await this._ensure_token();
      }
      const finalHeaders = this._hdrs(headers);
      let requestData = data;
      if (data instanceof FormData) {
        Object.assign(finalHeaders, data.getHeaders());
      } else if (typeof data === "object" && Object.keys(data).length > 0) {
        requestData = {
          ...data
        };
        Object.keys(requestData).forEach(k => requestData[k] === undefined && delete requestData[k]);
      } else if (method.toLowerCase() === "post" && Object.keys(data).length === 0) {
        requestData = "";
        finalHeaders["content-length"] = "0";
      }
      const cleanParams = {
        ...params
      };
      Object.keys(cleanParams).forEach(k => cleanParams[k] === undefined && delete cleanParams[k]);
      const res = await this.http.request({
        method: method,
        url: url,
        params: Object.keys(cleanParams).length ? cleanParams : undefined,
        data: requestData,
        headers: finalHeaders
      });
      console.log(`[CORE REQ] Selesai: ${method.toUpperCase()} ${url} -> HTTP: ${res.status}`);
      const outerCode = res.data?.code;
      const innerCode = res.data?.data?.code;
      if (outerCode && outerCode !== "200" || innerCode === -1) {
        const code = innerCode !== undefined ? innerCode : outerCode;
        const msg = res.data?.data?.msg || res.data?.msg || "API Business Error";
        console.error(`[BIZ ERR LOG] Endpoint: ${url} | Code: ${code} | Msg: ${msg}`);
        if (code === "401" || code === 401) {
          this._store.token = null;
          this.on401();
        }
        return {
          status: "error",
          message: `[${code}] ${msg}`,
          result: null
        };
      }
      return {
        status: outerCode || String(res.status),
        result: res.data?.data !== undefined ? res.data.data : null,
        token: this._store.token
      };
    } catch (err) {
      const res = err.response;
      if (res && (res.status === 401 || res.data?.code === "401")) {
        this._store.token = null;
        this.on401();
      }
      console.error(`[CORE REQ FATAL] Gagal mengeksekusi ${method.toUpperCase()} ${url}:`, err.message);
      return {
        status: "error",
        message: err.message,
        result: null
      };
    }
  }
  async guest({
    token = null,
    ...rest
  } = {}) {
    console.log("[API CALL] Menjalankan fungsi guest()");
    try {
      const res = await this._req("post", "/api/auth/createGuest", {
        token: token,
        skipAuth: true,
        ...rest
      });
      if (res.status !== "error" && res.result?.guestUid && res.result?.guestKey) {
        this._store.uid = res.result.guestUid;
        this._store.key = res.result.guestKey;
      }
      return res;
    } catch (err) {
      console.error("[API CALL ERR] guest() gagal:", err.message);
      return {
        status: "error",
        message: err.message,
        result: null
      };
    }
  }
  async guest_login({
    token = null,
    guestUid = null,
    guestKey = null,
    ...rest
  } = {}) {
    console.log("[API CALL] Menjalankan fungsi guest_login()");
    try {
      const uid = guestUid || this._store.uid;
      const key = guestKey || this._store.key;
      if (!uid || !key) return {
        status: "error",
        message: "Kredensial guest tidak ditemukan di memori.",
        result: null
      };
      const res = await this._req("post", "/api/auth/loginByGuest", {
        token: token,
        data: {
          guestUid: uid,
          guestKey: key
        },
        headers: {
          "content-type": "application/json"
        },
        skipAuth: true,
        ...rest
      });
      if (res.status !== "error" && res.result?.idToken) {
        this._store.token = res.result.idToken;
        res.token = res.result.idToken;
      }
      return res;
    } catch (err) {
      console.error("[API CALL ERR] guest_login() gagal:", err.message);
      return {
        status: "error",
        message: err.message,
        result: null
      };
    }
  }
  async account({
    token = null,
    ...rest
  } = {}) {
    console.log("[API CALL] Menjalankan fungsi account()");
    try {
      return await this._req("get", "/api/auth/getAccount", {
        token: token,
        ...rest
      });
    } catch (err) {
      console.error("[API CALL ERR] account() gagal:", err.message);
      return {
        status: "error",
        message: err.message,
        result: null
      };
    }
  }
  async upload({
    token = null,
    file = null,
    filename = "image.jpg",
    ...rest
  } = {}) {
    console.log("[API CALL] Menjalankan fungsi upload() dengan Multipart Form");
    if (!file) return {
      status: "error",
      message: 'Parameter "file" wajib diisi untuk mengunggah.',
      result: null
    };
    try {
      const buffer = await this._resolve_file(file);
      if (!buffer) return {
        status: "error",
        message: "Gagal memproses file berkas menjadi buffer.",
        result: null
      };
      const form = new FormData();
      form.append("file", buffer, {
        filename: filename,
        contentType: "image/jpeg"
      });
      return await this._req("post", "/api/upload/uploadTempFile", {
        token: token,
        data: form,
        ...rest
      });
    } catch (err) {
      console.error("[API CALL ERR] upload() gagal:", err.message);
      return {
        status: "error",
        message: err.message,
        result: null
      };
    }
  }
  async models({
    token = null,
    type = "image",
    ...rest
  } = {}) {
    console.log(`[API CALL] Mengambil list model untuk tipe: ${type}`);
    if (!type) return {
      status: "error",
      message: 'Parameter "type" wajib diisi.',
      result: null
    };
    try {
      let endpoint = "";
      switch (type.toLowerCase()) {
        case "video":
          endpoint = "/api/aiVideo/models";
          break;
        case "image":
        default:
          endpoint = "/api/aiImage/models";
          break;
      }
      return await this._req("get", endpoint, {
        token: token,
        ...rest
      });
    } catch (err) {
      console.error(`[API CALL ERR] models(${type}) gagal:`, err.message);
      return {
        status: "error",
        message: err.message,
        result: null
      };
    }
  }
  async create({
    token = null,
    type = "image",
    modelId = 14,
    prompt = "",
    images = null,
    resolution = "1K",
    quality = "low",
    number = 1,
    permission = 1,
    projectId = null,
    mode = "1",
    aspectRatio = "16:9",
    length = 6,
    enableAudio = false,
    poll = false,
    pollInterval = 5e3,
    ...rest
  } = {}) {
    console.log(`[API CALL] Memulai pipa otomasi pembuatan media berbasis AI [Tipe: ${type.toUpperCase()}]`);
    if (!type) return {
      status: "error",
      message: 'Parameter "type" wajib diisi (image/video).',
      result: null
    };
    if (!prompt) return {
      status: "error",
      message: 'Parameter "prompt" wajib diisi.',
      result: null
    };
    try {
      const uploadedUrls = [];
      const targets = [];
      if (images) {
        if (Array.isArray(images)) targets.push(...images);
        else targets.push(images);
      }
      for (const media of targets) {
        console.log(`[PIPELINE] Memulai pengunggahan berkas prapra-proses...`);
        const uploadRes = await this.upload({
          token: token,
          file: media
        });
        if (uploadRes && uploadRes.status !== "error" && uploadRes.result) {
          uploadedUrls.push(uploadRes.result);
          console.log(`[PIPELINE] Berkas terunggah. URL Presigned: ${uploadRes.result}`);
        }
      }
      let endpoint = "";
      let payload = {};
      switch (type.toLowerCase()) {
        case "video":
          endpoint = "/api/aiVideo/create/v2";
          payload = {
            modelId: modelId,
            mode: mode,
            images: uploadedUrls,
            prompt: prompt,
            resolution: resolution,
            length: length,
            aspectRatio: aspectRatio,
            permission: permission,
            enableAudio: enableAudio,
            projectId: projectId,
            number: number,
            ...rest
          };
          break;
        case "image":
        default:
          endpoint = "/api/aiImage/create/v2";
          payload = {
            modelId: modelId,
            baseImage: uploadedUrls[0] || "",
            imageUrls: uploadedUrls.slice(1),
            prompt: prompt,
            resolution: resolution,
            quality: quality,
            aspectRatio: aspectRatio,
            number: number,
            permission: permission,
            projectId: projectId,
            ...rest
          };
          break;
      }
      const creationRes = await this._req("post", endpoint, {
        token: token,
        data: payload,
        headers: {
          "content-type": "application/json"
        }
      });
      if (poll && creationRes.status !== "error") {
        console.log("[AUTO POLLING] Parameter `poll: true` aktif. Mengalihkan alur kontrol...");
        return await this.status({
          token: token,
          type: type,
          task_id: creationRes,
          poll: true,
          pollInterval: pollInterval
        });
      }
      return creationRes;
    } catch (err) {
      console.error("[API CALL ERR] create() pipa kegagalan:", err.message);
      return {
        status: "error",
        message: err.message,
        result: null
      };
    }
  }
  async status({
    token = null,
    type = "image",
    task_id = null,
    poll = false,
    pollInterval = 5e3,
    ...rest
  } = {}) {
    console.log(`[API CALL] Memeriksa status task untuk: ${type}`);
    if (!type) return {
      status: "error",
      message: 'Parameter "type" wajib diisi.',
      result: null
    };
    if (!task_id) return {
      status: "error",
      message: 'Parameter "task_id" wajib disediakan.',
      result: null
    };
    try {
      let ids = [];
      switch (type.toLowerCase()) {
        case "video":
          if (typeof task_id === "string" || typeof task_id === "number") {
            ids.push(task_id);
          } else if (Array.isArray(task_id)) {
            ids = [...task_id];
          } else if (typeof task_id === "object") {
            const dataList = task_id.result?.result?.dataList || task_id.result?.dataList || task_id.result;
            if (Array.isArray(dataList)) {
              ids = dataList.map(item => item.jobId).filter(Boolean);
            } else if (task_id.result?.jobId) {
              ids.push(task_id.result.jobId);
            } else if (typeof task_id.result === "string") {
              ids.push(task_id.result);
            }
          }
          break;
        case "image":
        default:
          if (typeof task_id === "string" || typeof task_id === "number") {
            ids.push(task_id);
          } else if (Array.isArray(task_id)) {
            ids = [...task_id];
          } else if (typeof task_id === "object") {
            const dataList = task_id.result?.result?.dataList || task_id.result?.dataList || task_id.result;
            if (Array.isArray(dataList)) {
              ids = dataList.map(item => item.id).filter(Boolean);
            } else if (task_id.result?.id) {
              ids.push(task_id.result.id);
            } else if (typeof task_id.result === "string") {
              ids.push(task_id.result);
            }
          }
          break;
      }
      if (ids.length === 0) {
        return {
          status: "error",
          message: "Gagal mengekstrak ID atau parameter task_id tidak valid.",
          result: null
        };
      }
      let endpoint = "";
      let payload = {};
      switch (type.toLowerCase()) {
        case "video":
          endpoint = "/api/aiVideo/checkJobStatus";
          payload = {
            scene: rest.scene || "6",
            jobIds: ids
          };
          break;
        case "image":
        default:
          endpoint = "/api/aiImage/getListTaskStatus";
          payload = {
            resultIds: ids
          };
          break;
      }
      if (poll) {
        let isComplete = false;
        let attempts = 0;
        while (!isComplete) {
          attempts++;
          console.log(`[POLLING RUN] Percobaan ke-${attempts}. Mengecek progres pengerjaan server...`);
          const currentStatus = await this._req("post", endpoint, {
            token: token,
            data: payload,
            headers: {
              "content-type": "application/json"
            }
          });
          if (currentStatus.status === "error") return currentStatus;
          const records = currentStatus.result?.result?.dataList || currentStatus.result?.dataList || currentStatus.result || [];
          const statusList = Array.isArray(records) ? records : [records];
          if (type.toLowerCase() === "video") {
            isComplete = statusList.every(job => String(job.status) === "2" || String(job.status) === "3" || job.videoUrl);
          } else {
            isComplete = statusList.every(task => String(task.status) === "2" || String(task.status) === "3" || task.images && task.images.length > 0);
          }
          if (isComplete) {
            console.log(`[POLLING COMPLETE] Seluruh antrean tugas telah selesai diproses pada iterasi ke-${attempts}!`);
            return currentStatus;
          }
          console.log(`[POLLING ALIVE] Media masih diproses. Menunggu ${pollInterval / 1e3} detik...`);
          await this._sleep(pollInterval);
        }
      }
      return await this._req("post", endpoint, {
        token: token,
        data: payload,
        headers: {
          "content-type": "application/json"
        }
      });
    } catch (err) {
      console.error(`[API CALL ERR] status(${type}) gagal:`, err.message);
      return {
        status: "error",
        message: err.message,
        result: null
      };
    }
  }
  async categories({
    token = null,
    isTrending = true,
    pageNo = 1,
    pageSize = 20,
    ...rest
  } = {}) {
    console.log("[API CALL] Menjalankan fungsi categories() explore");
    try {
      return await this._req("get", "/api/aiExplore/categories/page", {
        token: token,
        params: {
          isTrending: isTrending,
          pageNo: pageNo,
          pageSize: pageSize,
          ...rest
        }
      });
    } catch (err) {
      console.error("[API CALL ERR] categories() gagal:", err.message);
      return {
        status: "error",
        message: err.message,
        result: null
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["create", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          create: "/?action=create&type=image",
          status: "/?action=status&token=eyJxxx"
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
  const api = new CreenAI();
  try {
    let response;
    switch (action) {
      case "create":
        response = await api.create(params);
        break;
      case "status":
        if (!params.token) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'token' wajib diisi untuk action 'status'.",
            example: "/?action=status&token=eyJxxx"
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari server AnimeKill. Coba lagi nanti."
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