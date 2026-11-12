import axios from "axios";
import crypto from "crypto";
class AlightDownloader {
  constructor() {
    this.token = "";
    this.refresh_token = "";
    this.local_id = "";
    this.iid_token = "";
    this.client = axios.create({
      timeout: 3e4
    });
    this.client.interceptors.request.use(config => {
      console.log(`[Request] ${config.method?.toUpperCase()} -> ${config.url}`);
      if (config.url?.includes("cloudfunctions.net")) {
        config.headers["User-Agent"] = "okhttp/4.12.0";
        config.headers["Accept-Encoding"] = "gzip";
        config.headers["Content-Type"] = "application/json";
        config.headers["authorization"] = `Bearer ${this.token || ""}`;
        config.headers["firebase-instance-id-token"] = this.iid_token || "";
        config.headers["x-firebase-appcheck"] = "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==";
      }
      return config;
    }, error => Promise.reject(error));
  }
  _rnd(len = 8) {
    return crypto.randomBytes(len).toString("hex");
  }
  _dev() {
    const part = this._rnd(8);
    return `${part}_com.alightcreative.motion`;
  }
  _iid() {
    const head = this._rnd(11);
    const body = this._rnd(64);
    return `${head}:APA91b${body}`;
  }
  _parseUrl(url) {
    const match = url.match(/\/u\/([^\/]+)\/p\/([^\/\?#]+)/);
    if (!match) {
      return {
        error: "Format URL Alight Motion tidak valid."
      };
    }
    return {
      uid: match[1],
      pid: match[2]
    };
  }
  _snk(obj) {
    if (Array.isArray(obj)) {
      return obj.map(v => this._snk(v));
    }
    if (obj !== null && typeof obj === "object") {
      return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        acc[snakeKey] = this._snk(obj[key]);
        return acc;
      }, {});
    }
    return obj;
  }
  _parseError(error) {
    const data = error?.response?.data;
    if (data instanceof ArrayBuffer || Buffer.isBuffer(data)) {
      try {
        const decoded = Buffer.from(data).toString("utf8");
        return JSON.parse(decoded);
      } catch {
        return Buffer.from(data).toString("utf8");
      }
    }
    return data || null;
  }
  _gHd(clientVersion = "Android/Fallback/X23002001/FirebaseUI-Android") {
    return {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "X-Android-Package": "com.alightcreative.motion",
      "X-Android-Cert": "ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8",
      "Accept-Language": "id-ID, en-US",
      "X-Client-Version": clientVersion,
      "X-Firebase-GMPID": "1:414370328124:android:f1394131c8b84de3",
      "X-Firebase-Client": "H4sIAAAAAAAA_6tWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA",
      "X-Firebase-AppCheck": "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ=="
    };
  }
  async _auth() {
    try {
      if (this.token) {
        console.log("[Auth] Sesi token aktif terdeteksi.");
        return {
          success: true
        };
      }
      this.iid_token = this.iid_token || this._iid();
      console.log("[Auth] Melakukan signupNewUser...");
      const urlSignup = "https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0";
      const signupRes = await this.client.post(urlSignup, {
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: this._gHd("Android/Fallback/X23002001/FirebaseUI-Android")
      });
      this.token = signupRes.data?.idToken || "";
      this.refresh_token = signupRes.data?.refreshToken || "";
      this.local_id = signupRes.data?.localId || "";
      console.log(`[Auth] Signup berhasil. Local ID: ${this.local_id}`);
      console.log("[Auth] Memverifikasi akun melalui getAccountInfo...");
      const urlGetAccount = "https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0";
      await this.client.post(urlGetAccount, {
        idToken: this.token
      }, {
        headers: this._gHd("Android/Fallback/X23002001/FirebaseUI-Android")
      });
      console.log("[Auth] Menetapkan properti devid perangkat...");
      const urlProp = "https://us-central1-alight-creative.cloudfunctions.net/setAccountProperty";
      const devid = this._dev();
      await this.client.post(urlProp, {
        data: {
          devid: devid
        }
      });
      console.log("[Auth] Menyetel informasi display name...");
      const urlSetAccount = "https://www.googleapis.com/identitytoolkit/v3/relyingparty/setAccountInfo?key=AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0";
      const displayName = `user_${this._rnd(4)}`;
      await this.client.post(urlSetAccount, {
        returnSecureToken: true,
        idToken: this.token,
        displayName: displayName
      }, {
        headers: this._gHd("Android/Fallback/X23002001/FirebaseCore-Android")
      });
      console.log("[Auth] Seluruh rangkaian otentikasi selesai.");
      return {
        success: true
      };
    } catch (error) {
      console.log("[Auth Error] Proses gagal:", error?.response?.data || error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  async _meta(uid, pid, platform, build) {
    const url = "https://us-central1-alight-creative.cloudfunctions.net/getProjectMetadata";
    return await this.client.post(url, {
      data: {
        uid: uid,
        pid: pid,
        platform: platform,
        appBuild: build,
        acctTestMode: "normal"
      }
    });
  }
  async _reqDown(uid, pid, platform, build) {
    const url = "https://us-central1-alight-creative.cloudfunctions.net/requestProjectDownload";
    return await this.client.post(url, {
      data: {
        uid: uid,
        pid: pid,
        platform: platform,
        appBuild: build,
        liteVersion: false,
        acctTestMode: "normal"
      }
    });
  }
  async download({
    url,
    direct,
    ...rest
  }) {
    try {
      console.log(`[Process] Memulai download dari url: ${url}`);
      const parsed = this._parseUrl(url);
      if (parsed.error) {
        console.log(`[Process Error] Validasi gagal: ${parsed.error}`);
        return {
          status: false,
          result: {
            error_message: parsed.error
          }
        };
      }
      const {
        uid,
        pid
      } = parsed;
      const platform = rest?.platform || "android";
      const appBuild = rest?.appBuild || rest?.app_build || 1028417;
      const isDirect = direct || false;
      const authResult = await this._auth();
      if (!authResult.success) {
        return {
          status: false,
          result: {
            error_message: `Otentikasi gagal: ${authResult.error}`
          }
        };
      }
      console.log("[Process] Mengunduh metadata proyek...");
      const metaRes = await this._meta(uid, pid, platform, appBuild);
      console.log("[Process] Mengirimkan permintaan downloadUri...");
      const downRes = await this._reqDown(uid, pid, platform, appBuild);
      const downloadPath = downRes.data?.result?.downloadUri || "";
      if (!downloadPath) {
        return {
          status: false,
          result: {
            error_message: "downloadUri tidak ditemukan di dalam respons server."
          }
        };
      }
      const responsePayload = {
        metadata: metaRes.data?.result?.info || {},
        download_status: metaRes.data?.result?.download || "allowed"
      };
      if (isDirect) {
        const encodedPath = encodeURIComponent(downloadPath);
        const firebaseStorageUrl = `https://firebasestorage.googleapis.com/v0/b/alight-creative.appspot.com/o/${encodedPath}?alt=media`;
        console.log(`[Process] Mengunduh biner berkas langsung dari Firebase Storage menggunakan downloadUri yang ter-encode...`);
        const firebaseHeaders = {
          "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
          Connection: "Keep-Alive",
          "Accept-Encoding": "gzip",
          Authorization: `Firebase ${this.token}`,
          "x-firebase-appcheck": "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==",
          "X-Firebase-Storage-Version": "Android/21.0.2",
          "x-firebase-gmpid": "1:414370328124:android:f1394131c8b84de3"
        };
        const fileRes = await this.client.get(firebaseStorageUrl, {
          headers: firebaseHeaders,
          responseType: "arraybuffer"
        });
        console.log("[Process] Mengonversi biner Firebase Storage ke base64...");
        const base64Data = Buffer.from(fileRes.data).toString("base64");
        responsePayload.base64 = base64Data;
      } else {
        console.log("[Process] Menyusun tautan unduhan CDN biasa...");
        responsePayload.download_url = `https://templates-cdn.alight-motion.bendingspoons.com/${downloadPath}`;
      }
      return {
        status: true,
        result: this._snk(responsePayload)
      };
    } catch (error) {
      console.log("[Process Error] Pengunduhan gagal:", error.message);
      return {
        status: false,
        result: {
          error_message: error.message,
          error_details: this._snk(this._parseError(error))
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
  const api = new AlightDownloader();
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