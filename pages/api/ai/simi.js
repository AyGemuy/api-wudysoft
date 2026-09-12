import axios from "axios";
const BLAKE3 = {
  IV: [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225],
  MSG_PERMUTATION: [2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8],
  g(v, a, b, c, d, x, y) {
    v[a] = v[a] + v[b] + x >>> 0;
    v[d] = Math.rotateRight(v[d] ^ v[a], 16);
    v[c] = v[c] + v[d] >>> 0;
    v[b] = Math.rotateRight(v[b] ^ v[c], 12);
    v[a] = v[a] + v[b] + y >>> 0;
    v[d] = Math.rotateRight(v[d] ^ v[a], 8);
    v[c] = v[c] + v[d] >>> 0;
    v[b] = Math.rotateRight(v[b] ^ v[c], 7);
  },
  round(v, m) {
    BLAKE3.g(v, 0, 4, 8, 12, m[0], m[1]);
    BLAKE3.g(v, 1, 5, 9, 13, m[2], m[3]);
    BLAKE3.g(v, 2, 6, 10, 14, m[4], m[5]);
    BLAKE3.g(v, 3, 7, 11, 15, m[6], m[7]);
    BLAKE3.g(v, 0, 5, 10, 15, m[8], m[9]);
    BLAKE3.g(v, 1, 6, 11, 12, m[10], m[11]);
    BLAKE3.g(v, 2, 7, 8, 13, m[12], m[13]);
    BLAKE3.g(v, 3, 4, 9, 14, m[14], m[15]);
  },
  compress(cv, block, counter, blockLen, flags) {
    const v = [...cv, ...BLAKE3.IV.slice(0, 4), counter & 4294967295, counter / 4294967296 & 4294967295, blockLen, flags];
    let workingM = Array.from(new Uint32Array(Buffer.from(block).buffer, Buffer.from(block).byteOffset, 16));
    for (let i = 0; i < 7; i++) {
      BLAKE3.round(v, workingM);
      const newM = new Array(16);
      for (let j = 0; j < 16; j++) newM[j] = workingM[BLAKE3.MSG_PERMUTATION[j]];
      workingM = newM;
    }
    const out = new Uint32Array(8);
    for (let i = 0; i < 8; i++) out[i] = v[i] ^ v[i + 8];
    return out;
  },
  keyedHash(keyStr, msgStr) {
    const keyBytes = Buffer.alloc(32, 0);
    Buffer.from(keyStr).copy(keyBytes);
    const cv = new Uint32Array(keyBytes.buffer, keyBytes.byteOffset, 8);
    const msgBytes = Buffer.from(msgStr);
    const block = Buffer.alloc(64, 0);
    msgBytes.copy(block);
    const result = BLAKE3.compress(cv, block, 0, msgBytes.length, 27);
    return Buffer.from(result.buffer, result.byteOffset, 32).toString("hex");
  }
};
Math.rotateRight = (n, shift) => n >>> shift | n << 32 - shift;

function parseSSE(raw) {
  if (typeof raw !== "string") return raw;
  let last = null;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "ok") continue;
    try {
      last = JSON.parse(payload);
    } catch {}
  }
  return last;
}
class SimSimi {
  constructor() {
    this.rtoken = "AMf-vBw4rugf0IxtWUiV2EjHGsblvtOpXVGyfGSwBhPUeIUcQWNGatozwrzcTOOVs2pJ-GfaQdNNPjj3L9d6TfUjx6gWWn4wIDuDosrAbT4B_i_Yoqe1hHkgqkpZwxwzqM61tc6u2K41L4UjxAPx2gY6TAhBjOSAIrY-dwY07aYxB78CZcgrXZJ3GEsX99AWUl-9DnFwxaKzZbqzcetLNaehNASnNlPKhztdjwoQtcVSPH4WOxNbIAEHMigg6C8MAy9rJiZ0vjACaaT2s3S-Z6FdnwVk7MAvR8nmRJNei5FCmdyaQqHeSUOI0ccHHGO7kSw2lF5BpqBKVRAAG6cfKsV5ZBDdFsbCAGGCteil3_ZXVR2BVG9RyRMJHp4mx9OhxX8q0x4IQZF6tjLrgxW8Pna-qEcU1wxGqAK9bzIG2ro9vdO4hCpNBZv5zpC5seKymSVZwU4Ce_y5";
    this.fbKey = "AIzaSyBa0FW_3yQoMbSLc_9Zq03mXrUXxycPU3E";
    this.token = null;
    this.fuid = null;
    this.uid = 0;
    this.sig = "";
    this.fbHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://simsimi.com",
      referer: "https://simsimi.com/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-client-data": "CLjxygE=",
      "x-client-version": "Chrome/JsCore/11.10.0/FirebaseCore-web",
      "x-firebase-client": "eyJ2ZXJzaW9uIjoyLCJoZWFydGJlYXRzIjpbeyJhZ2VudCI6ImZpcmUtY29yZS8wLjEzLjIgZmlyZS1jb3JlLWVzbTIwMTcvMC4xMy4yIGZpcmUtanMvIGZpcmUtanMtYWxsLWFwcC8xMS4xMC4wIGZpcmUtYXV0aC8xLjEwLjggZmlyZS1hdXRoLWVzbTIwMTcvMS4xMC44IiwiZGF0ZXMiOlsiMjAyNi0wMy0wNCJdfV19",
      "x-firebase-gmpid": "1:906249600665:web:f6b53f237bd2e778378208"
    };
    this.api = axios.create({
      baseURL: "https://kube-appserver.simsimi.com:30443",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://simsimi.com",
        referer: "https://simsimi.com/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-client-platform": "web"
      }
    });
  }
  log(m) {
    console.log(`[SimSimi] [${new Date().toLocaleTimeString()}] ${m}`);
  }
  async refreshToken() {
    this.log("STEP 1: securetoken refresh…");
    try {
      const {
        data
      } = await axios.post(`https://securetoken.googleapis.com/v1/token?key=${this.fbKey}`, `grant_type=refresh_token&refresh_token=${this.rt}`, {
        headers: this.fbHeaders
      });
      this.token = data?.access_token ?? null;
      this.fuid = data?.user_id ?? null;
      this.log(`  token: ${this.token?.slice(0, 30)}…  fuid: ${this.fuid}`);
    } catch (e) {
      this.log(`  Refresh Error: ${e.message}`);
      throw e;
    }
  }
  async login() {
    this.log("STEP 2: /user/login…");
    try {
      const {
        data
      } = await this.api.post("/user/login", {
        av: "9.1.3",
        cc: "KR",
        lc: "id",
        logUID: "0",
        os: "a",
        reg_now_days: 0,
        tz: "Asia/Makassar",
        uid: 0,
        fuid: this.fuid,
        type: "a",
        version: "9.1.3",
        timezone: "Asia/Seoul"
      });
      this.uid = data?.uid ?? 0;
      this.sig = BLAKE3.keyedHash((this.fuid ?? "").slice(0, 10).padEnd(32, "0"), this.uid.toString());
      this.log(`  uid: ${this.uid}  sig: ${this.sig}`);
      this.api.defaults.headers.common["authorization"] = `Bearer ${this.token}`;
      this.api.defaults.headers.common["x-signature"] = this.sig;
    } catch (e) {
      this.log(`  Login Error: ${e.message}`);
      throw e;
    }
  }
  async claim() {
    this.log("STEP 3: Checking free points claim…");
    const base = {
      uid: this.uid,
      av: "9.2.6",
      os: "a",
      lc: "id",
      cc: "KR",
      tz: "Asia/Makassar",
      logUID: this.uid.toString(),
      reg_now_days: 0
    };
    try {
      const {
        data: cd
      } = await this.api.post("/boost_chat/free_point_cooldown", base);
      if (cd && cd.remaining_seconds > 0) {
        this.log(`  Cooldown active: ${cd.remaining_seconds}s remaining. Skipping claim.`);
        return;
      }
      if (cd?.is_claimable === true || (cd?.claimable_point ?? 0) > 0) {
        const {
          data
        } = await this.api.post("/boost_chat/claim_free_point", base);
        this.log(`  Claim Successful! Balance: ${data?.freePoint ?? "?"}`);
      } else {
        this.log("  Nothing to claim right now.");
      }
    } catch (e) {
      const status = e.response?.status || "???";
      const msg = e.response?.data?.message || e.message;
      this.log(`  Claim Error [${status}]: ${msg}`);
    }
  }
  async chat({
    token,
    prompt,
    charId = 9075,
    ...rest
  }) {
    try {
      this.rt = token || this.rtoken;
      if (!this.token) await this.refreshToken();
      if (!this.uid) await this.login();
      await this.claim();
      this.log(`STEP 4: chat → "${prompt}"`);
      const {
        data
      } = await this.api.post("/ai_character/send_chat_message/stream", {
        av: "9.2.6",
        cc: "KR",
        lc: "id",
        logUID: this.uid.toString(),
        os: "a",
        reg_now_days: 0,
        tz: "Asia/Makassar",
        uid: this.uid,
        character_id: charId,
        message: prompt,
        is_live_chat: false,
        cv: "",
        ...rest
      }, {
        headers: {
          accept: "*/*"
        }
      });
      const parsed = parseSSE(data);
      this.log(`  Reply: ${parsed?.content ?? "(no content)"}`);
      return parsed;
    } catch (e) {
      if (e.response?.status === 401) {
        this.log("  Token expired – re-authenticating…");
        try {
          await this.refreshToken();
          await this.login();
          return this.chat({
            prompt: prompt,
            charId: charId,
            ...rest
          });
        } catch (retryError) {
          this.log(`  Re-auth failed: ${retryError.message}`);
          return null;
        }
      }
      this.log(`  Chat Error [${e.response?.status}]: ${JSON.stringify(e.response?.data ?? e.message)}`);
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
  const api = new SimSimi();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}