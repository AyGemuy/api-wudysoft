import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import PROMPT from "@/configs/ai-prompt";
import SpoofHead from "@/lib/spoof-head";
class KazeAI {
  constructor(cfg = {}) {
    this.key = "AIzaSyC3hx8Nwe1KldaC3rvbTvPAT4mzPI5-rPI";
    this.baseAuth = "https://identitytoolkit.googleapis.com/v1/accounts";
    this.baseComm = "https://kaze-ai-comm-srv-898747634367.us-central1.run.app/comm_api";
    this.basePython = "https://kaze-ai-python-898747634367.us-central1.run.app";
    this.token = cfg.token || null;
    this.user = null;
    this.deviceId = this.genId();
    this.refreshToken = cfg.refreshToken || null;
    this.jar = new CookieJar();
    this.http = wrapper(axios.create({
      jar: this.jar
    }));
    this.VALID_MODES = ["edit", "generate", "remove", "upscale", "restore", "chat", "video"];
  }
  genId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  getHeaders(extra = {}) {
    const auth = this.token ? {
      authorization: `Bearer ${this.token}`
    } : {};
    return {
      accept: "*/*",
      "accept-language": "id-ID",
      origin: "https://kaze.ai",
      priority: "u=1, i",
      referer: "https://kaze.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-device-id": this.deviceId,
      "content-type": "application/json",
      ...SpoofHead(),
      ...auth,
      ...extra
    };
  }
  getFirebaseAuthHeaders(contentType = "application/json") {
    const commonHeaders = this.getHeaders({
      "content-type": contentType
    });
    delete commonHeaders.authorization;
    return {
      ...commonHeaders,
      "x-client-version": "Chrome/JsCore/10.14.1/FirebaseCore-web",
      "x-firebase-gmpid": "1:898747634367:web:07905bf6473a588fe96c0a",
      ...contentType === "application/x-www-form-urlencoded" && {
        "x-firebase-client": "eyJ2ZXJzaW9uIjoyLCJoZWFydGJlYXRzIjpbeyJhZ2VudCI6ImZpcmUtY29yZS8wLjEwLjEzIGZpcmUtY29yZS1lc20yMDE3LzAuMTAuMTMgZmlyZS1qcy8gZmlyZS1hdXRoLzEuNy45IGZpcmUtYXV0aC1lc20yMDE3LzEuNy45IGZpcmUtanMtYWxsLWFwcC8xMC4xNC4xIiwiZGF0ZXMiOlsiMjAyNi0wMi0wNSJdfV19"
      }
    };
  }
  async signup() {
    console.log("📝 Registering new account...");
    try {
      const {
        data
      } = await this.http.post(`${this.baseAuth}:signUp?key=${this.key}`, {
        returnSecureToken: true
      }, {
        headers: this.getFirebaseAuthHeaders("application/json")
      });
      this.token = data?.idToken;
      this.refreshToken = data?.refreshToken;
      this.userId = data?.localId;
      console.log("✅ Registered");
      return data;
    } catch (e) {
      console.error("❌ Register failed:", e.response?.data || e.message);
      throw e;
    }
  }
  async refresh() {
    console.log("🔄 Refreshing current token...");
    try {
      const {
        data
      } = await axios.post(`https://securetoken.googleapis.com/v1/token?key=${this.key}`, new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken
      }).toString(), {
        headers: this.getFirebaseAuthHeaders("application/x-www-form-urlencoded")
      });
      this.token = data?.id_token || data?.access_token;
      this.refreshToken = data?.refresh_token || this.refreshToken;
      this.userId = data?.user_id;
      console.log("✅ Refreshed");
      return {
        token: this.token,
        refreshToken: this.refreshToken
      };
    } catch (e) {
      console.error("❌ Refresh failed:", e.response?.data || e.message);
      throw e;
    }
  }
  async lookup() {
    try {
      await this.http.post(`${this.baseAuth}:lookup?key=${this.key}`, {
        idToken: this.token
      }, {
        headers: this.getFirebaseAuthHeaders("application/json")
      });
    } catch (e) {
      throw e;
    }
  }
  async registerUser() {
    try {
      const {
        data
      } = await this.http.post(`${this.basePython}/api/users/v2/me`, {
        invite_code: null
      }, {
        headers: this.getHeaders()
      });
      this.user = data;
      return data;
    } catch (e) {
      throw e;
    }
  }
  checkQuota(data) {
    const available = data?.user_credits_info?.additional_credit_package?.available_credits || 0;
    return {
      available: available,
      hasQuota: available > 0
    };
  }
  async ensureToken() {
    if (this.token && this.user && this.checkQuota(this.user).hasQuota) return;
    console.log("🔄 [Relingparty] Mencari akun dengan kuota tersedia...");
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        if (this.refreshToken) {
          await this.refresh();
        } else {
          this.deviceId = this.genId();
          this.jar.removeAllCookiesSync();
          await this.signup();
        }
        await this.lookup();
        const userData = await this.registerUser();
        const quota = this.checkQuota(userData);
        if (quota.hasQuota) {
          console.log(`✅ [Relingparty] Akun ditemukan! Sisa kredit: ${quota.available}`);
          this.user = userData;
          break;
        } else {
          console.log(`⚠️ [Relingparty] Kuota habis (${quota.available}). Mencoba mendaftar akun baru...`);
          this.refreshToken = null;
          this.token = null;
          this.user = null;
        }
      } catch (e) {
        console.log(`❌ [Relingparty] Error pada percobaan ${attempt}. Mencoba mendaftar akun baru...`);
        this.refreshToken = null;
        this.token = null;
        this.user = null;
        await new Promise(r => setTimeout(r, 1e3));
        if (attempt > 5) throw new Error("Timeout: Gagal mendapatkan akun berkuota setelah beberapa percobaan.");
      }
    }
  }
  async upload(imageOrImages) {
    await this.ensureToken();
    console.log("📤 [Upload] Mengunggah file ke server...");
    const images = Array.isArray(imageOrImages) ? imageOrImages : [imageOrImages];
    const uploadList = images.map(() => ({
      extension: "jpg",
      content_type: "image/jpeg"
    }));
    const {
      data: urlData
    } = await this.http.post(`${this.baseComm}/file/v1/batch_get_upload_url`, {
      upload_list: uploadList
    }, {
      headers: this.getHeaders()
    });
    const uploadResults = urlData?.upload_result || [];
    if (uploadResults.length !== images.length) {
      throw new Error("Gagal mendapatkan URL upload yang cukup.");
    }
    const fileIds = [];
    for (let i = 0; i < images.length; i++) {
      const {
        upload_url,
        file_id
      } = uploadResults[i];
      const img = images[i];
      let buf;
      if (Buffer.isBuffer(img)) buf = img;
      else if (img.startsWith("http")) {
        const {
          data
        } = await axios.get(img, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(data);
      } else {
        buf = Buffer.from(img.split(",")[1] || img, "base64");
      }
      await axios.put(upload_url, buf, {
        headers: {
          "content-type": "image/jpeg"
        }
      });
      fileIds.push(file_id);
    }
    console.log(`✅ [Upload] Berhasil. File ID:`, fileIds);
    return fileIds;
  }
  async executeTaskRequest(url, payload) {
    try {
      await this.ensureToken();
      console.log("🚀 [Task] Mengirim request task...");
      const {
        data
      } = await this.http.post(`${this.basePython}/api${url}`, payload, {
        headers: this.getHeaders()
      });
      return data?.task_ids || [];
    } catch (e) {
      if (e?.response?.data?.error?.code === "BUSINESS_QUOTA_EXCEEDED" || e?.response?.status === 429) {
        console.warn("⚠️ [Task] Kuota habis di tengah jalan. Memulai relingparty...");
        this.token = null;
        this.user = null;
        return await this.executeTaskRequest(url, payload);
      }
      throw e;
    }
  }
  async wait(ids) {
    console.log("⏳ [Poll] Menunggu hasil task...");
    const start = Date.now();
    while (Date.now() - start < 6e4) {
      try {
        const {
          data
        } = await this.http.post(`${this.basePython}/api/toolkit/v1/get_task_result`, {
          task_ids: ids
        }, {
          headers: this.getHeaders()
        });
        const done = data?.tasks?.filter(t => t?.task_status === "success");
        if (done?.length === ids.length) {
          console.log("✅ [Poll] Task selesai!");
          return done.map(t => ({
            id: t?.task_id,
            status: t?.task_status,
            ...t.task_result?.[0] || {},
            ...t
          }));
        }
        const failed = data?.tasks?.find(t => t?.task_status === "failed");
        if (failed) throw new Error(`Task gagal di server: ${failed.task_status_msg || "Unknown"}`);
        await new Promise(r => setTimeout(r, 3e3));
      } catch (e) {
        throw e;
      }
    }
    throw new Error("Timeout: Waktu tunggu habis.");
  }
  async generate({
    mode = "edit",
    imageUrl = null,
    prompt = PROMPT.text,
    count = 1,
    colorization = true,
    type = "image",
    ...rest
  }) {
    if (!this.VALID_MODES.includes(mode)) {
      throw new Error(`Mode '${mode}' tidak valid. Mode yang tersedia: ${this.VALID_MODES.join(", ")}`);
    }
    try {
      const images = imageUrl ? Array.isArray(imageUrl) ? imageUrl : [imageUrl] : [];
      let fileIds = [];
      if (images.length > 0) {
        fileIds = await this.upload(images);
      } else if (mode === "edit" || mode === "generate" || mode === "chat") {
        if (type !== "video") throw new Error("Parameter 'imageUrl' wajib diisi untuk mode ini.");
      }
      let url, payload;
      console.log(`🛠️ [Setup] Menyiapkan mode: ${mode.toUpperCase()}`);
      const fileList = fileIds.map(fid => ({
        image_file: {
          file_id: fid,
          width: rest.width || 1024,
          height: rest.height || 1024
        }
      }));
      switch (mode) {
        case "edit":
        case "generate":
        case "chat":
          type = rest.type || "image";
          url = type === "video" ? "/toolkit/v1/chat_edit_video" : "/toolkit/v2/chat_edit";
          payload = {
            file_list: fileList,
            prompt: prompt,
            is_template_prompt: !!rest.template,
            image_count: type === "video" ? 1 : count,
            generate_type: type,
            is_re_edit: false,
            tag_prompt_list: [{
              type: "text",
              content: prompt
            }],
            ...rest
          };
          if (type === "video") {
            payload.duration = rest.duration || 5;
            payload.resolution = rest.resolution || "770p";
            if (rest.videoTemplate) {
              payload.video_template_detail = rest.videoTemplate;
            }
          }
          break;
        case "remove":
          url = `/toolkit/v1/batch_background_removal`;
          payload = {
            file_list: fileList.map(f => ({
              ...f,
              image_file: {
                ...f.image_file,
                width: 0,
                height: 0
              }
            })),
            sub_module: "png_maker"
          };
          break;
        case "upscale":
          url = `/toolkit/v1/batch_upscale`;
          payload = {
            file_list: fileList.map(f => ({
              ...f,
              image_file: {
                ...f.image_file,
                width: 0,
                height: 0
              }
            }))
          };
          break;
        case "restore":
          url = `/toolkit/v1/batch_restoration`;
          payload = {
            file_list: fileList,
            ai_colorization: colorization
          };
          break;
      }
      const taskIds = await this.executeTaskRequest(url, payload);
      const results = await this.wait(taskIds);
      return {
        status: true,
        mode: mode,
        result: results.length === 1 ? results[0] : results
      };
    } catch (e) {
      console.error(`❌ [Error] Proses gagal:`, e.message);
      return {
        status: false,
        error: "PROCESS_FAILED",
        message: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl && (params.mode === "remove" || params.mode === "upscale" || params.mode === "restore")) {
    return res.status(400).json({
      error: `Parameter 'imageUrl' diperlukan untuk mode ${params.mode}`
    });
  }
  const api = new KazeAI({
    refreshToken: params.refreshToken
  });
  try {
    const data = await api.generate(params);
    const code = data.status ? 200 : 400;
    if (data.status) {
      data.credentials = {
        token: api.token,
        refreshToken: api.refreshToken,
        deviceId: api.deviceId,
        userId: api.userId
      };
    }
    return res.status(code).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}