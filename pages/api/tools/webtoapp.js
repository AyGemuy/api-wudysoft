import axios from "axios";
class WebToApp {
  constructor() {
    this.client = axios.create({
      baseURL: "https://firestore.googleapis.com/v1/projects/web-maker-c378e/databases/(default)/documents",
      timeout: 6e4
    });
    this.defaultHeaders = {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip"
    };
    this.defaultData = {
      admobAppId: {
        stringValue: ""
      },
      allowFileDownloads: {
        booleanValue: true
      },
      apkUrl: {
        stringValue: ""
      },
      bannerAdId: {
        stringValue: ""
      },
      brandColor: {
        stringValue: "#FFFFFF"
      },
      bundleUrl: {
        nullValue: null
      },
      category: {
        stringValue: ""
      },
      darkModeEnabled: {
        booleanValue: false
      },
      description: {
        stringValue: ""
      },
      enableAds: {
        booleanValue: false
      },
      enableDesktopView: {
        booleanValue: false
      },
      enableOfflineCache: {
        booleanValue: false
      },
      errorMessage: {
        nullValue: null
      },
      fcmToken: {
        stringValue: ""
      },
      googleServicesUrl: {
        nullValue: null
      },
      guestId: {
        stringValue: ""
      },
      interstitialAdId: {
        stringValue: ""
      },
      paidApp: {
        booleanValue: false
      },
      showNoInternetAlert: {
        booleanValue: true
      },
      splashScreenUrl: {
        nullValue: null
      },
      status: {
        stringValue: "DRAFT"
      },
      urlValidationEnabled: {
        booleanValue: true
      }
    };
  }
  _enc(obj) {
    return Buffer.from(JSON.stringify(obj)).toString("base64");
  }
  _dec(b64) {
    try {
      if (!b64) return null;
      return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    } catch (err) {
      console.error("[ERROR] Failed to unpack state:", err.message);
      return null;
    }
  }
  _genPkg(name) {
    const clean = name ? name.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    return `com.${clean || "app" + Math.floor(Math.random() * 1e3)}`;
  }
  _genId() {
    return Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
  }
  _getHead(type, token = null) {
    switch (type) {
      case "base":
        return {
          ...this.defaultHeaders, "Content-Type": "application/json", "X-Android-Package": "com.webtoapp.converter", "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81", "Accept-Language": "en-, en-US", "X-Client-Version": "Android/Fallback/X24000001/FirebaseCore-Android", "X-Firebase-GMPID": "1:228665725056:android:614734cc83f2f64b769665", "X-Firebase-Client": "H4sIAAAAAAAA_6tWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA", "X-Firebase-AppCheck": "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ=="
        };
      case "storage":
        return {
          ...this.defaultHeaders,
            Authorization: `Firebase ${token}`, "X-Firebase-AppCheck": "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ==", "X-Firebase-Storage-Version": "Android/22.0.1", "X-Firebase-gmpid": "1:228665725056:android:614734cc83f2f64b769665"
        };
      case "firestore":
        return {
          "User-Agent": "grpc-java-okhttp/1.62.2", "Content-Type": "application/json",
          te: "trailers", "x-goog-api-client": "gl-java/ fire/26.0.2 grpc/", "google-cloud-resource-prefix": "projects/web-maker-c378e/databases/(default)", "x-goog-request-params": "projects/web-maker-c378e/databases/(default)", "x-firebase-client": "device-model/RE5C91L1 kotlin/2.0.21 android-min-sdk/26 fire-fcm/25.0.1 fire-core/22.0.1 device-name/RMX3890INT fire-fst/26.0.2 device-brand/realme fire-sessions/3.0.3 fire-abt/21.1.1 fire-analytics/23.0.0 fire-android/35 fire-cls/20.0.3 fire-app-check/19.0.1 fire-auth/24.0.1 android-installer/com.google.android.packageinstaller android-platform/ fire-installations/19.0.1 fire-rc/23.0.1 android-target-sdk/36 fire-gcs/22.0.1 fire-transport/19.0.0", "x-firebase-gmpid": "1:228665725056:android:614734cc83f2f64b769665", "grpc-accept-encoding": "gzip",
            authorization: `Bearer ${token}`, "x-firebase-appcheck": "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ=="
        };
      default:
        return this.defaultHeaders;
    }
  }
  async _parseIcon(icon) {
    try {
      if (!icon) return null;
      if (Buffer.isBuffer(icon)) return icon;
      if (typeof icon === "string") {
        if (icon.startsWith("data:")) return Buffer.from(icon.split(",")[1], "base64");
        if (icon.startsWith("http://") || icon.startsWith("https://")) {
          console.log(`[LOG] Downloading icon: ${icon}`);
          const res = await axios.get(icon, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
      }
      return null;
    } catch (err) {
      console.error("[ERROR] Parse icon failed:", err.message);
      return null;
    }
  }
  async _ensureAuth(ctx) {
    if (ctx.id_token && ctx.local_id) {
      console.log("[LOG] Re-using existing auth session.");
      return ctx;
    }
    try {
      console.log("[LOG] Authenticating anonymously...");
      const url = "https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=AIzaSyCuurXop0oaoAJ7dn5mo2wkjFKIujtCKM8";
      const res = await axios.post(url, {
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: this._getHead("base")
      });
      ctx.id_token = res.data.idToken;
      ctx.local_id = res.data.localId;
      return ctx;
    } catch (err) {
      console.error("[ERROR] Auth failed:", err.response?.data || err.message);
      return {
        error: "Auth failed",
        details: err.response?.data || err.message
      };
    }
  }
  async _upload(ctx, icon) {
    try {
      const fileBuffer = await this._parseIcon(icon);
      if (!fileBuffer) return {
        error: "Invalid or missing icon format."
      };
      const fileName = `app_icons/app_icon_${Date.now()}.png`;
      const initUrl = `https://firebasestorage.googleapis.com/v0/b/web-maker-c378e.firebasestorage.app/o?name=${encodeURIComponent(fileName)}&uploadType=resumable`;
      const initHeaders = {
        ...this._getHead("storage", ctx.id_token),
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "Content-Type": "application/json; charset=UTF-8"
      };
      const initRes = await axios.post(initUrl, {}, {
        headers: initHeaders
      });
      const uploadUrl = initRes.headers["x-goog-upload-url"] || initRes.headers.location;
      if (!uploadUrl) return {
        error: "Failed to get upload URL"
      };
      const uploadHeaders = {
        ...this._getHead("storage", ctx.id_token),
        "Content-Type": "application/octet-stream",
        "X-Goog-Upload-Command": "upload, finalize",
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Offset": "0"
      };
      const uploadRes = await axios.put(uploadUrl, fileBuffer, {
        headers: uploadHeaders
      });
      let token = uploadRes.data?.downloadTokens?.split(",")[0];
      if (!token) {
        const metaUrl = `https://firebasestorage.googleapis.com/v0/b/web-maker-c378e.firebasestorage.app/o/${encodeURIComponent(fileName)}`;
        const metaRes = await axios.get(metaUrl, {
          headers: this._getHead("storage", ctx.id_token)
        });
        token = metaRes.data.downloadTokens?.split(",")[0];
      }
      ctx.icon_url = `https://firebasestorage.googleapis.com/v0/b/web-maker-c378e.firebasestorage.app/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;
      return ctx;
    } catch (err) {
      return {
        error: "Upload failed",
        details: err.response?.data || err.message
      };
    }
  }
  async create({
    state: b64_state,
    ...rest
  } = {}) {
    try {
      if (!rest.url) {
        return {
          status: "FAILED",
          result: {
            error: 'Missing required field: "url" is mandatory for creation.'
          },
          state: b64_state
        };
      }
      let ctx = this._dec(b64_state) || {
        id_token: null,
        local_id: null,
        icon_url: null,
        doc_id: null
      };
      const {
        url,
        name,
        icon = "https://picsum.photos/200",
        color_1 = "#FFFFFF",
        color_2 = "#000000",
        orient = "Portrait",
        pkg,
        features = "",
        refresh = true,
        loader = true,
        fullscreen = true,
        nav_btn = true,
        ext_link = true,
        notify = true,
        app_id = null,
        ver = "1",
        ...override
      } = rest;
      const finalName = name || "App_" + Math.random().toString(36).substring(7);
      const finalPkg = pkg || this._genPkg(finalName);
      ctx.doc_id = app_id || ctx.doc_id || this._genId();
      ctx = await this._ensureAuth(ctx);
      if (ctx.error) return {
        status: "FAILED",
        result: ctx,
        state: this._enc(ctx)
      };
      ctx = await this._upload(ctx, icon);
      if (ctx.error) return {
        status: "FAILED",
        result: ctx,
        state: this._enc(ctx)
      };
      let fields = {
        ...this.defaultData,
        appIconUrl: {
          stringValue: ctx.icon_url
        },
        appName: {
          stringValue: finalName
        },
        appVersion: {
          stringValue: ver
        },
        createdAt: {
          integerValue: Date.now()
        },
        enableLoader: {
          booleanValue: loader
        },
        enablePullToRefresh: {
          booleanValue: refresh
        },
        enablePushNotifications: {
          booleanValue: notify
        },
        fullScreenMode: {
          booleanValue: fullscreen
        },
        id: {
          stringValue: ctx.doc_id
        },
        navigationButtons: {
          booleanValue: nav_btn
        },
        openExternalInBrowser: {
          booleanValue: ext_link
        },
        orientation: {
          stringValue: orient.toLowerCase()
        },
        packageName: {
          stringValue: finalPkg
        },
        primaryColor: {
          stringValue: color_1
        },
        processingStartedAt: {
          integerValue: Date.now()
        },
        secondaryColor: {
          stringValue: color_2
        },
        updatedAt: {
          integerValue: Date.now()
        },
        userId: {
          stringValue: ctx.local_id
        },
        websiteUrl: {
          stringValue: url
        }
      };
      if (features) fields.enableFeatured = {
        stringValue: features
      };
      fields = {
        ...fields,
        ...override
      };
      const updateMaskParams = Object.keys(fields).map(key => `updateMask.fieldPaths=${key}`).join("&");
      const pathUrl = `/apps/${ctx.doc_id}?${updateMaskParams}`;
      await this.client.patch(pathUrl, {
        fields: fields
      }, {
        headers: this._getHead("firestore", ctx.id_token)
      });
      return {
        status: "SUCCESS",
        result: {
          app_id: ctx.doc_id,
          pkg: finalPkg,
          icon_url: ctx.icon_url
        },
        state: this._enc(ctx)
      };
    } catch (err) {
      return {
        status: "FAILED",
        result: {
          error: err.message,
          details: err.response?.data || null
        },
        state: b64_state
      };
    }
  }
  async status({
    state: b64_state,
    ...rest
  } = {}) {
    try {
      if (!b64_state || !rest.app_id) {
        const missing = [];
        if (!b64_state) missing.push('"state"');
        if (!rest.app_id) missing.push('"app_id"');
        return {
          status: "FAILED",
          result: {
            error: `Validation Error: Both state and app_id are required. Missing: [${missing.join(", ")}]`
          },
          state: b64_state
        };
      }
      let ctx = this._dec(b64_state);
      const target_id = rest.app_id;
      ctx = await this._ensureAuth(ctx || {
        id_token: null,
        local_id: null
      });
      if (ctx.error) return {
        status: "FAILED",
        result: ctx,
        state: this._enc(ctx)
      };
      console.log(`[LOG] Fetching status for App ID: ${target_id}`);
      const pathUrl = `/apps/${target_id}`;
      const res = await this.client.get(pathUrl, {
        headers: this._getHead("firestore", ctx.id_token)
      });
      const fields = res.data.fields || {};
      const appStatus = fields.status?.stringValue || "UNKNOWN";
      const apkUrl = fields.apkUrl?.stringValue || "";
      return {
        status: "SUCCESS",
        result: {
          app_id: target_id,
          app_status: appStatus,
          apk_url: apkUrl
        },
        state: this._enc(ctx)
      };
    } catch (err) {
      return {
        status: "FAILED",
        result: {
          error: err.message,
          details: err.response?.data || null
        },
        state: b64_state
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
          create: "/?action=create&url=https://example.com&name=MyApp",
          status: "/?action=status&app_id=123xyz&state=ey..."
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
  const app = new WebToApp();
  try {
    let response;
    switch (action) {
      case "create":
        if (!params.url) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'url' wajib diisi untuk action 'create'.",
            example: "/?action=create&url=https://example.com"
          });
        }
        response = await app.create(params);
        break;
      case "status":
        if (!params.state || !params.app_id) {
          const missing = [];
          if (!params.state) missing.push("'state'");
          if (!params.app_id) missing.push("'app_id'");
          return res.status(400).json({
            status: false,
            error: `Parameter ${missing.join(" dan ")} wajib diisi untuk action 'status'.`,
            example: "/?action=status&app_id=xyz123&state=base64string..."
          });
        }
        response = await app.status(params);
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
        error: "Tidak ada respons dari modul WebToApp. Coba lagi nanti."
      });
    }
    if (response.status === "FAILED") {
      return res.status(400).json({
        success: false,
        action: action,
        ...response
      });
    }
    return res.status(200).json({
      success: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server api.",
      error: error.message || "Unknown Error"
    });
  }
}