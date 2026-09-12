import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class WebToApp {
  constructor() {
    this.cookies = [];
    this.client = axios.create({
      baseURL: "https://api.nativine.com",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://nativine.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://nativine.com/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.client.interceptors.request.use(config => {
      if (this.cookies.length > 0) {
        config.headers["cookie"] = this.cookies.join("; ");
      }
      return config;
    }, err => Promise.reject(err));
    this.client.interceptors.response.use(res => {
      const setCookies = res.headers["set-cookie"];
      if (setCookies) {
        setCookies.forEach(cookieStr => {
          const cookie = cookieStr.split(";")[0];
          if (!this.cookies.includes(cookie)) {
            this.cookies.push(cookie);
          }
        });
      }
      return res;
    }, err => Promise.reject(err));
  }
  snk(obj) {
    if (Array.isArray(obj)) return obj.map(v => this.snk(v));
    if (obj !== null && typeof obj === "object") {
      return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        acc[snakeKey] = this.snk(obj[key]);
        return acc;
      }, {});
    }
    return obj;
  }
  rnd() {
    const salt = crypto.randomBytes(4).toString("hex");
    return `user_${salt}@mail.com`;
  }
  async rsc(src) {
    if (!src) return null;
    try {
      if (Buffer.isBuffer(src)) return src;
      if (typeof src === "string") {
        if (src.startsWith("http")) {
          const res = await axios.get(src, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (src.startsWith("data:")) {
          const raw = src.split(",")[1] || src;
          return Buffer.from(raw, "base64");
        }
        return Buffer.from(src, "base64");
      }
    } catch (e) {
      console.log(`[Warn] Resolusi aset gagal: ${e.message}`);
    }
    return null;
  }
  bldForm(payload, iconBuf, splashBuf) {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      form.append(k, String(v ?? ""));
    });
    if (iconBuf) {
      form.append("icon", iconBuf, {
        filename: "icon.jpg"
      });
    }
    if (splashBuf) {
      form.append("splashIcon", splashBuf, {
        filename: "splash.png"
      });
    }
    return form;
  }
  async generate({
    url,
    ...rest
  }) {
    console.log("[Process] Memulai validasi parameter input...");
    if (!url) {
      return {
        status: false,
        result: {
          error: 'Parameter "url" wajib dikirim.'
        }
      };
    }
    try {
      console.log(`[Process] Melakukan analisis URL target: ${url}`);
      const analyzeRes = await this.client.post("/api/analyze-url", {
        url: url
      });
      const info = analyzeRes?.data || {};
      console.log("[Process] Memproses resolusi aset ikon dan splash...");
      const iconBuf = await this.rsc(rest?.icon || null);
      const splashBuf = await this.rsc(rest?.splashIcon || null);
      const onProgress = rest?.onProgress;
      delete rest.onProgress;
      const defaults = {
        isPro: "true",
        email: this.rnd(),
        appName: info?.appName || "Google App",
        packageName: info?.packageName || "com.g.myapp",
        appUrl: info?.url || url,
        brandColor: "#635BFF",
        brandColorDark: "#0A2540",
        brandColorLight: "#7A73FF",
        splashBackgroundColor: "#FFFFFF",
        versionCode: "1",
        versionName: "1.0.0",
        enablePullToRefresh: "true",
        enableProgressBar: "false",
        deepLinkScheme: "myapp",
        enableAdMob: "false",
        adMobAppId: "ca-app-pub-3940256099942544~3347511713",
        bannerAdId: "ca-app-pub-3940256099942544/6300978111",
        interstitialAdId: "ca-app-pub-3940256099942544/1033173712",
        rewardedAdId: "ca-app-pub-3940256099942544/5224354917",
        appOpenAdId: "ca-app-pub-3940256099942544/3419835294",
        enableCamera: "true",
        enableMicrophone: "true",
        enableLocation: "false",
        enableStorage: "true",
        useCustomKeystore: "false",
        keystorePassword: "",
        keystoreAlias: "",
        keyPassword: "",
        userAgent: "",
        customCSS: "",
        customJS: "",
        supportedDomains: "",
        enableUniversalLinks: "false",
        openExternalBrowser: "false",
        enableOneSignal: "false",
        oneSignalAppId: "",
        enableScanner: "false",
        scannerTitle: "Scan Barcode",
        enableDocScan: "false",
        locationWebhookUrl: "",
        enableSecurity: "false",
        securityAction: "crash",
        enableBottomNav: "false",
        enableHeader: "false",
        enableFloatingBtn: "false",
        enableBiometrics: "false",
        biometricsAutoAuthOnLaunch: "false",
        biometricsAllowFallback: "true",
        biometricsAllowedDomains: "[]",
        enableInAppUpdates: "false",
        enableInAppReviews: "false",
        enableHapticFeedback: "false",
        enableLocalDatastore: "false",
        enableContactsAccess: "false",
        enablePrintSupport: "false",
        enableOAuthSupport: "false",
        googleSignInWebClientId: "",
        googleSignInCallbackName: "",
        iconPath: "null",
        biometricsLockedPaths: "[]",
        screenshotBlockerLockedPaths: "[]",
        target: "apk",
        draftId: `draft_${Date.now()}`
      };
      const payload = {
        ...defaults,
        ...rest
      };
      delete payload.icon;
      delete payload.splashIcon;
      console.log("[Process] Mengirimkan data build ke server...");
      const form = this.bldForm(payload, iconBuf, splashBuf);
      const buildRes = await this.client.post("/api/build", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      const buildData = buildRes?.data || {};
      const buildId = buildData?.buildId;
      if (!buildId) {
        return {
          status: false,
          result: this.snk(buildData)
        };
      }
      console.log(`[Process] Build berhasil dibuat (ID: ${buildId}). Memulai pelacakan otomatis...`);
      return await this.trackStream(buildId, onProgress);
    } catch (e) {
      console.log(`[Error] Alur pendaftaran build gagal: ${e.message}`);
      return {
        status: false,
        result: {
          error: e?.response?.data || e.message
        }
      };
    }
  }
  async trackStream(buildId, progressCallback) {
    try {
      const streamRes = await this.client.get(`/api/build-stream/${buildId}`, {
        responseType: "stream",
        headers: {
          accept: "text/event-stream"
        }
      });
      return new Promise((resolve, reject) => {
        let chunkBuffer = "";
        streamRes.data.on("data", chunk => {
          chunkBuffer += chunk.toString();
          const lines = chunkBuffer.split("\n");
          chunkBuffer = lines.pop() || "";
          lines.forEach(line => {
            const rawLine = line.trim();
            if (rawLine.startsWith("data:")) {
              try {
                const rawJson = rawLine.substring(5).trim();
                const parsed = JSON.parse(rawJson);
                const snakedResult = this.snk(parsed);
                if (typeof progressCallback === "function") {
                  progressCallback(snakedResult);
                } else {
                  const stepName = snakedResult?.step || "Mengonfigurasi...";
                  const percentage = snakedResult?.progress || 0;
                  console.log(`[Stream Progress - ${percentage}%] ${stepName}`);
                }
                if (snakedResult?.status === "completed" || snakedResult?.apk_path) {
                  console.log("[Process] Penerimaan update stream selesai.");
                  resolve({
                    status: true,
                    result: snakedResult
                  });
                }
              } catch (e) {}
            }
          });
        });
        streamRes.data.on("end", () => {
          resolve({
            status: true,
            result: {
              message: "Koneksi stream berakhir."
            }
          });
        });
        streamRes.data.on("error", err => {
          reject(err);
        });
      });
    } catch (e) {
      console.log(`[Error] Gagal membuka track stream: ${e.message}`);
      return {
        status: false,
        result: {
          error: e.message
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
  const api = new WebToApp();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}