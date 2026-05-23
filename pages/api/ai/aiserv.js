import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
const FB_KEY = "AIzaSyD7w2BvFDOoPofWuBWzDZGsRNG-3eX4CUc";
const FB_BASE = "https://www.googleapis.com/identitytoolkit/v3/relyingparty";
const API_BASE = "https://aiserv.org/api/v2";
const UA_DALVIK = "Dalvik/2.1.0 (Linux; U; Android 15; RMX3890 Build/AQ3A.240812.002)";
const UA_OKHTTP = "okhttp/4.12.0";
const FB_HDR = {
  "User-Agent": UA_DALVIK,
  Connection: "Keep-Alive",
  "Accept-Encoding": "gzip",
  "Content-Type": "application/json",
  "X-Android-Package": "com.appstation.chatgpt",
  "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81",
  "Accept-Language": "id-ID, en-US",
  "X-Client-Version": "Android/Fallback/X24000001/FirebaseCore-Android",
  "X-Firebase-GMPID": "1:470502623630:android:c94d34995c6e3af67abcdf",
  "X-Firebase-Client": "H4sIAAAAAAAA_6tWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA"
};
class AiServ {
  constructor() {
    this.token = null;
    this.uid = null;
    this._ready = false;
    this.fb = axios.create({
      baseURL: FB_BASE
    });
    this.api = axios.create({
      baseURL: API_BASE
    });
  }
  _rcid() {
    return crypto.randomBytes(16).toString("hex");
  }
  async _signup() {
    console.log("[signup] creating anonymous Firebase user...");
    try {
      const res = await this.fb.post(`/signupNewUser?key=${FB_KEY}`, {
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: FB_HDR
      });
      const token = res.data?.idToken;
      const uid = res.data?.localId;
      if (!token || !uid) throw new Error(`missing idToken/localId: ${JSON.stringify(res.data)}`);
      console.log("[signup] ✓ uid:", uid, "| token:", token.slice(0, 20) + "…");
      return {
        token: token,
        uid: uid
      };
    } catch (err) {
      const detail = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message;
      throw new Error(`[signup] FAILED: ${detail}`);
    }
  }
  async _verify(token) {
    console.log("[verify] checking account info...");
    try {
      const res = await this.fb.post(`/getAccountInfo?key=${FB_KEY}`, {
        idToken: token
      }, {
        headers: FB_HDR
      });
      const user = res.data?.users?.[0];
      if (!user) throw new Error(`no user in response: ${JSON.stringify(res.data)}`);
      console.log("[verify] ✓ uid:", user.localId, "| provider:", user.providerUserInfo?.[0]?.providerId ?? "anonymous");
      return user;
    } catch (err) {
      const detail = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message;
      throw new Error(`[verify] FAILED: ${detail}`);
    }
  }
  async _register(token) {
    console.log("[register] registering user at aiserv...");
    try {
      const res = await this.api.post("/user", {
        timezone: -480,
        language: "id",
        platform: "android",
        customerInfo: {
          nonSubscriptionTransactions: [],
          originalPurchaseDate: null,
          allPurchaseDatesMillis: {},
          managementURL: null,
          allPurchaseDates: {},
          originalAppUserId: `$RCAnonymousID:${this._rcid()}`,
          allExpirationDates: {},
          firstSeen: new Date().toISOString(),
          originalPurchaseDateMillis: null,
          allExpirationDatesMillis: {},
          requestDateMillis: Date.now(),
          latestExpirationDate: null,
          firstSeenMillis: Date.now(),
          allPurchasedProductIdentifiers: [],
          subscriptionsByProductIdentifier: {},
          requestDate: new Date().toISOString(),
          latestExpirationDateMillis: null,
          originalApplicationVersion: null,
          activeSubscriptions: [],
          entitlements: {
            active: {},
            verification: "NOT_REQUESTED",
            all: {}
          }
        }
      }, {
        headers: {
          "User-Agent": UA_OKHTTP,
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
          "x-platform": "android"
        }
      });
      const id = res.data?.id;
      if (!id) throw new Error(`no id in response: ${JSON.stringify(res.data)}`);
      console.log("[register] ✓ user id:", id, "| created:", res.data?.createdAt);
      return res.data;
    } catch (err) {
      const detail = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message;
      throw new Error(`[register] FAILED: ${detail}`);
    }
  }
  async _auth(providedToken = null) {
    if (providedToken) {
      console.log("[auth] using provided token:", providedToken.slice(0, 20) + "…");
      this.token = providedToken;
      this._ready = true;
      return;
    }
    if (this._ready) {
      console.log("[auth] already authenticated, skipping");
      return;
    }
    console.log("[auth] starting auto auth flow...");
    try {
      const {
        token,
        uid
      } = await this._signup();
      await this._verify(token);
      await this._register(token);
      this.token = token;
      this.uid = uid;
      this._ready = true;
      console.log("[auth] ✓ auth complete | uid:", uid);
    } catch (err) {
      console.error("[auth] ✗ FAILED:", err.message);
      throw err;
    }
  }
  async chat({
    token = null,
    prompt,
    model = "gpt-5-mini",
    isPro = false,
    mode = "text",
    history = [],
    ...rest
  }) {
    console.log("─".repeat(55));
    console.log("[chat] prompt:", prompt);
    console.log("[chat] model:", model, "| mode:", mode, "| isPro:", isPro);
    console.log("[chat] token provided:", token ? "yes" : "no (auto auth)");
    try {
      await this._auth(token);
      const messages = [...history, {
        role: "user",
        content: prompt
      }];
      console.log("[chat] messages count:", messages.length);
      const form = new FormData();
      form.append("mode", mode);
      form.append("isPro", String(isPro));
      form.append("model", model);
      messages.forEach((msg, i) => {
        form.append(`messages[${i}][role]`, msg.role);
        form.append(`messages[${i}][content]`, msg.content);
      });
      for (const [k, v] of Object.entries(rest)) {
        form.append(k, String(v));
        console.log("[chat] extra field:", k, "=", v);
      }
      console.log("[chat] sending request...");
      const res = await this.api.post("/chat/prompt", form, {
        headers: {
          "User-Agent": UA_OKHTTP,
          "Accept-Encoding": "gzip",
          authorization: `Bearer ${this.token}`,
          "x-platform": "android",
          ...form.getHeaders()
        }
      });
      const msg = res.data?.message || res.data;
      const limit = res.data?.limit;
      if (!msg) throw new Error(`no message in response: ${JSON.stringify(res.data)}`);
      console.log("[chat] ✓ reply:", msg.content);
      console.log("[chat] ✓ credits left:", limit?.left ?? "?", "/", limit?.full ?? "?");
      console.log("[chat] ✓ token (reusable):", this.token.slice(0, 20) + "…");
      console.log("─".repeat(55));
      return {
        token: this.token,
        result: msg,
        limit: limit
      };
    } catch (err) {
      const detail = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message;
      console.error("[chat] ✗ FAILED:", detail);
      console.log("─".repeat(55));
      throw new Error(`[chat] FAILED: ${detail}`);
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
  const api = new AiServ();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}