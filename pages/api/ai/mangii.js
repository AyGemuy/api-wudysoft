import axios from "axios";
import crypto from "crypto";
class Mangii {
  constructor() {
    this.key = "AIzaSyBZrg2KyT70KAzIwzDYfL04nseIvBx-liQ";
    this.apiKey = "aVn070L9vNHZHgY";
    this.baseUrl = "https://us-central1-mangii-app.cloudfunctions.net";
    this.authUrl = "https://www.googleapis.com/identitytoolkit/v3/relyingparty";
    this.ua = `Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/${crypto.randomBytes(4).toString("hex").toUpperCase()})`;
    this.token = null;
    this.localId = null;
    this.uuid = crypto.randomUUID();
  }
  async req(method, path, data = null, isAuth = false) {
    try {
      const url = isAuth ? `${this.authUrl}/${path}?key=${this.key}` : `${this.baseUrl}/${path}`;
      const headers = {
        "User-Agent": this.ua,
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip",
        "X-Client-Version": "Android/Fallback/X24000001/FirebaseCore-Android",
        ...this.token && !isAuth ? {
          authorization: `Bearer ${this.token}`
        } : {},
        ...!isAuth ? {
          "x-api-key": this.apiKey,
          "x-api-version": "2"
        } : {}
      };
      const res = await axios({
        method: method,
        url: url,
        data: data,
        headers: headers
      });
      return res?.data || {};
    } catch (e) {
      const msg = e?.response?.data?.error?.message || e?.message || "Unknown Error";
      console.log(`[ERR] ${path} -> ${msg}`);
      throw new Error(msg);
    }
  }
  async sign() {
    try {
      console.log("[LOG] Auth: Signing up...");
      const body = {
        clientType: "CLIENT_TYPE_ANDROID"
      };
      const res = await this.req("POST", "signupNewUser", body, true);
      this.token = res?.idToken || null;
      this.localId = res?.localId;
      console.log(`[OK] Signed in as: ${this.localId}`);
      if (this.token) await this.info();
      return res;
    } catch (e) {
      console.log("[FAIL] Auth failed");
      throw e;
    }
  }
  async info() {
    try {
      await this.req("POST", "getAccountInfo", {
        idToken: this.token
      }, true);
      console.log(`[OK] Account Verified`);
    } catch (e) {
      console.log("[WARN] Verify failed");
    }
  }
  async ensure() {
    if (!this.token) await this.sign();
    return this.token;
  }
  async fcm() {
    try {
      console.log("[LOG] Registering FCM...");
      const body = {
        token: this.token,
        platform: "android",
        appVersion: "2.0",
        timezone: "Asia/Makassar"
      };
      await this.req("POST", "registerFcmToken", body);
      console.log(`[OK] FCM Registered`);
    } catch (e) {}
  }
  async generate({
    prompt,
    ...rest
  }) {
    console.log(`\n[PROCESS] Starting generation flow for: "${prompt?.substring(0, 15)}..."`);
    try {
      await this.ensure();
      await this.fcm();
      const safePrompt = prompt || "Random Manga Scene";
      const storyId = rest?.storyId || null;
      console.log(`[LOG] Generating Image... (StoryID: ${storyId || "New"})`);
      const body = {
        prompt: safePrompt,
        storyId: storyId,
        title: rest?.title || null,
        visibility: rest?.visibility || "public",
        ...rest
      };
      const res = await this.req("POST", "createOrContinueMangaStory", body);
      const panel = res?.data?.panel;
      const story = res?.data?.story;
      if (panel?.imageUrl) {
        console.log(`[SUCCESS] Panel ID: ${panel.id}`);
        console.log(`[INFO] Story ShortID: ${story?.shortId}`);
        console.log(`[URL] ${panel.imageUrl}`);
      }
      return res?.data;
    } catch (e) {
      console.error(`[FATAL] Error: ${e.message}`);
      return null;
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
  const api = new Mangii();
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