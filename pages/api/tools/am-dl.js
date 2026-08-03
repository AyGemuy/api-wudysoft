import axios from "axios";
import crypto from "crypto";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class AlightDownloader {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.std_hd = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.google = axios.create({
      baseURL: "https://www.googleapis.com/identitytoolkit/v3/relyingparty",
      headers: {
        ...this.std_hd,
        "accept-encoding": "gzip",
        connection: "Keep-Alive",
        "content-type": "application/json",
        "user-agent": "Dalvik/2.1.0 (Linux; U; Android 10; SM-J700F Build/QQ3A.200805.001)",
        "x-android-cert": "ECA6BF91B8715A6F810ED0BBFC65B6CD578F52A8",
        "x-android-package": "com.alightcreative.motion",
        "x-client-version": "Android/Fallback/X23002001/FirebaseUI-Android",
        "x-firebase-appcheck": "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==",
        "x-firebase-client": "H4sIAAAAAAAAAKtWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA",
        "x-firebase-gmpid": "1:414370328124:android:f1394131c8b84de3",
        "x-firebase-locale": "in-ID, en-US"
      },
      params: {
        key: "AIzaSyDtG1AU22ErnQD60AzBAcaknySiz9_CEq0"
      }
    });
    this.alight = axios.create({
      baseURL: "https://us-central1-alight-creative.cloudfunctions.net",
      headers: {
        ...this.std_hd,
        "accept-encoding": "gzip",
        "content-type": "application/json; charset=utf-8",
        "firebase-instance-id-token": "fc6bqgfcTGu_ZBBe4tVPwV:APA91bFHrAkrm7xVzZDvQbuK51muxf72x391Zv7dgsAWikyQoaBrO60JlfEHotVWThR7ZL7h5xWCg8peCtVA09Eq41i0VXpgYmMBRBFZubgqvVnh42AYQjg",
        "user-agent": "okhttp/4.12.0",
        "x-firebase-appcheck": "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ=="
      }
    });
    this.ml_cli = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}`,
      headers: {
        ...this.std_hd
      }
    });
    this._itcp(this.google, "GOOGLE-AUTH");
    this._itcp(this.alight, "ALIGHT-API");
    this._itcp(this.ml_cli, "MAIL-API");
  }
  _itcp(client, name) {
    client.interceptors.request.use(config => {
      console.log(`[REQ] [${name}] ${config.method?.toUpperCase()} -> ${config.url}`);
      return config;
    }, error => {
      console.log(`[REQ-ERROR] [${name}] Gagal mengirim request:`, error?.message);
      return Promise.reject(error);
    });
    client.interceptors.response.use(response => {
      console.log(`[RES] [${name}] ${response.status} <- ${response.config?.url}`);
      return response;
    }, error => {
      console.log(`[RES-ERROR] [${name}] ${error.response?.status || "NET_ERR"} <- ${error.config?.url}:`, error.response?.data || error.message);
      return Promise.reject(error);
    });
  }
  async _slp(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  _gPw() {
    return crypto.randomBytes(12).toString("hex");
  }
  async _cMl() {
    try {
      const res = await this.ml_cli.get("/api/mails/v9?action=create");
      return res?.data?.email || null;
    } catch (err) {
      console.log("[ERROR] Gagal eksekusi _cMl:", err?.message);
      return null;
    }
  }
  async _chM(em) {
    try {
      const res = await this.ml_cli.get(`/api/mails/v9?action=message&email=${encodeURIComponent(em)}`);
      const data = res?.data?.data || [];
      for (const msg of data) {
        const html = msg?.html_content || "";
        if (html) {
          const $ = cheerio.load(html);
          const link = $('a[href*="alight-creative.firebaseapp.com/__/auth/links"]').attr("href");
          if (link) return link;
        }
      }
      return null;
    } catch (err) {
      console.log("[ERROR] Gagal eksekusi _chM:", err?.message);
      return null;
    }
  }
  async _amS(em) {
    try {
      await this.google.post("/createAuthUri", {
        identifier: em,
        continueUri: "http://localhost"
      });
      const {
        data
      } = await this.google.post("/getOobConfirmationCode", {
        requestType: 6,
        email: em,
        androidInstallApp: true,
        canHandleCodeInApp: true,
        continueUrl: "https://alightcreative.com?ui_sid=9448689949&ui_sd=0",
        iosBundleId: "com.alightcreative.motion",
        androidPackageName: "com.alightcreative.motion",
        androidMinimumVersion: "585",
        clientType: "CLIENT_TYPE_ANDROID"
      });
      return {
        success: true,
        data: data
      };
    } catch (err) {
      console.log("[ERROR] Gagal mengirim link autentikasi:", err?.message);
      return {
        success: false,
        message: err?.message
      };
    }
  }
  async _amV(em, lk) {
    try {
      if (!lk.includes("https://alight-creative.firebaseapp.com/__/auth/links")) {
        throw new Error("Tautan verifikasi tidak valid.");
      }
      const innerLink = new URL(lk).searchParams.get("link");
      const oobCode = new URL(innerLink).searchParams.get("oobCode");
      const {
        data
      } = await this.google.post("/emailLinkSignin", {
        email: em,
        oobCode: oobCode,
        clientType: "CLIENT_TYPE_ANDROID"
      });
      return {
        success: true,
        data: {
          token: data.idToken || data.id_token,
          refreshToken: data.refreshToken || data.refresh_token,
          localId: data.localId,
          isNewUser: data.isNewUser
        }
      };
    } catch (err) {
      console.log("[ERROR] Gagal memverifikasi link autentikasi:", err?.message);
      return {
        success: false,
        message: err?.message
      };
    }
  }
  _parseUrl(url) {
    const match = url.match(/\/u\/([^\/]+)\/p\/([^\/\?#]+)/);
    if (!match) {
      throw new Error("Format URL Alight Motion tidak valid.");
    }
    return {
      uid: match[1],
      pid: match[2]
    };
  }
  async _ensureToken() {
    if (!this.token) {
      console.log("[PROSES] Token kosong. Memulai pendaftaran akun sementara untuk autentikasi...");
      const email = await this._cMl();
      if (!email) throw new Error("Gagal membuat email sementara.");
      const sendStatus = await this._amS(email);
      if (!sendStatus?.success) throw new Error(sendStatus?.message || "Gagal menginisiasi pendaftaran.");
      console.log("[PROSES] Mencari tautan verifikasi di kotak masuk...");
      let verifiedLink = null;
      for (let poll = 1; poll <= 60; poll++) {
        await this._slp(3e3);
        console.log(`[POLLING] Mencari pesan ke-${poll}/60...`);
        const link = await this._chM(email);
        if (link) {
          verifiedLink = link;
          console.log("[PROSES] Link verifikasi berhasil didapatkan!");
          break;
        }
      }
      if (!verifiedLink) throw new Error("Waktu tunggu verifikasi habis (Timeout).");
      const verification = await this._amV(email, verifiedLink);
      if (!verification?.success) throw new Error(verification?.message || "Verifikasi gagal.");
      this.token = verification.data.token;
      this.refreshToken = verification.data.refreshToken;
      console.log("[SUKSES] Autentikasi berhasil diselesaikan.");
    }
    return this.token;
  }
  async getMetadata(url) {
    try {
      const {
        uid,
        pid
      } = this._parseUrl(url);
      const {
        data
      } = await this.alight.post("/getProjectMetadata", {
        data: {
          uid: uid,
          pid: pid,
          platform: "android",
          appBuild: 1028417,
          acctTestMode: "normal"
        }
      });
      return data.result;
    } catch (error) {
      throw new Error(`Gagal mengambil metadata: ${error.message}`);
    }
  }
  async download({
    url
  }) {
    try {
      const tokenToUse = await this._ensureToken();
      const {
        uid,
        pid
      } = this._parseUrl(url);
      const {
        data: requestData
      } = await this.alight.post("/requestProjectDownload", {
        data: {
          uid: uid,
          pid: pid,
          platform: "android",
          appBuild: 1028417,
          liteVersion: false,
          acctTestMode: "normal"
        }
      }, {
        headers: {
          authorization: `Bearer ${tokenToUse}`
        }
      });
      const downloadUri = requestData?.result?.downloadUri;
      if (!downloadUri) {
        throw new Error("DownloadUri tidak ditemukan dalam respons server.");
      }
      console.log(`[PROSES] Mengambil payload proyek dari Firebase Storage...`);
      const storageUrl = `https://firebasestorage.googleapis.com/v0/b/alight-creative.appspot.com/o/${encodeURIComponent(downloadUri)}?alt=media`;
      const {
        data: fileBuffer
      } = await axios.get(storageUrl, {
        headers: {
          ...this.std_hd,
          authorization: `Firebase ${tokenToUse}`
        },
        responseType: "arraybuffer"
      });
      return fileBuffer;
    } catch (error) {
      throw new Error(`Gagal memproses unduhan: ${error.message}`);
    }
  }
  async getAccountStatusAndLicenses(customToken, reqBody = {}) {
    try {
      const tokenToUse = customToken || await this._ensureToken();
      const {
        data
      } = await this.alight.post("/getAccountStatusAndLicenses", reqBody, {
        headers: {
          authorization: `Bearer ${tokenToUse}`
        }
      });
      if (!data.result) data.result = {};
      data.result.licenses = [{
        productId: "alightcreative.motion.1y_t60_1w",
        label: null,
        benefits: ["RemoveWatermark", "MemberEffects", "ProjectPackageSharing", "FutureMemberFeatures", "AdvancedEasing", "CameraObjects", "LayerParenting"],
        period: "1y",
        valid: true,
        expires: 1875685585e3,
        details: null,
        type: "subscription",
        autoRenewing: true,
        orderNumber: "190001608392013",
        linkStatus: "linked-current",
        store: "apple_app_store"
      }];
      return data;
    } catch (error) {
      throw new Error(`Gagal memproses getAccountStatusAndLicenses asli: ${error.message}`);
    }
  }
  async registerAppStorePurchase(customToken, reqBody = {}) {
    try {
      const tokenToUse = customToken || await this._ensureToken();
      const {
        data
      } = await this.alight.post("/registerAppStorePurchase", reqBody, {
        headers: {
          authorization: `Bearer ${tokenToUse}`
        }
      });
      if (!data.result) data.result = {};
      data.result.products = [{
        product_id: "alightcreative.motion.1y_t60_1w",
        quantity: 1,
        expires_date_ms: 1875685585e3,
        purchase_date_ms: 1686153541e3,
        cancellation_date_ms: null,
        original_purchase_date_ms: 1686153541e3,
        is_trial_period: false,
        token: "AC01.-NXL_JY5Nrc6OF23NPSX",
        original_transaction_id: "190001608392013"
      }];
      return data;
    } catch (error) {
      throw new Error(`Gagal memproses registerAppStorePurchase asli: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    token,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["metadata", "download", "license", "register_purchase"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          metadata: "/?action=metadata&url=https://alight.link/...",
          download: "/?action=download&url=https://alight.link/...",
          license: "/?action=license",
          register_purchase: "/?action=register_purchase"
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
  const api = new AlightDownloader();
  if (token) {
    api.token = token;
  }
  try {
    let response;
    switch (action) {
      case "metadata":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'metadata'."
          });
        }
        response = await api.getMetadata(params.url);
        break;
      case "download":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'download'."
          });
        }
        const fileBuffer = await api.download({
          url: params.url
        });
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", 'attachment; filename="project.am"');
        return res.status(200).send(Buffer.from(fileBuffer));
      case "license":
        response = await api.getAccountStatusAndLicenses(token, params);
        break;
      case "register_purchase":
        response = await api.registerAppStorePurchase(token, params);
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
        error: "Tidak ada respons dari server Alight. Coba lagi nanti."
      });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada pemrosesan server.",
      error: error.message || "Unknown Error"
    });
  }
}