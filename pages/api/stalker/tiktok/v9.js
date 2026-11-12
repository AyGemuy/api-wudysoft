import axios from "axios";
const K = new Uint32Array([1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298]);
const W = new Uint32Array(64);
class TikMatrixFinder {
  constructor(cfg = {}) {
    this.base = cfg.base || "https://finder.tikmatrix.com";
    this.jar = cfg.cookie || "";
    this.ua = cfg.ua || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";
  }
  toSnake(data) {
    if (Array.isArray(data)) return data.map(item => this.toSnake(item));
    if (data !== null && typeof data === "object") {
      return Object.entries(data).reduce((acc, [key, val]) => {
        const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        acc[snakeKey] = this.toSnake(val);
        return acc;
      }, {});
    }
    return data;
  }
  h0(str) {
    const n = str.length;
    W.fill(0, 0, 16);
    for (let i = 0; i < n; i++) W[i >> 2] |= str.charCodeAt(i) << 24 - (i & 3) * 8;
    W[n >> 2] |= 128 << 24 - (n & 3) * 8;
    W[15] = n * 8;
    for (let i = 16; i < 64; i++) {
      const a = W[i - 15],
        b = W[i - 2];
      const s0 = (a >>> 7 | a << 25) ^ (a >>> 18 | a << 14) ^ a >>> 3;
      const s1 = (b >>> 17 | b << 15) ^ (b >>> 19 | b << 13) ^ b >>> 10;
      W[i] = W[i - 16] + s0 + W[i - 7] + s1 | 0;
    }
    let a = 1779033703,
      b = 3144134277,
      c = 1013904242,
      d = 2773480762;
    let e = 1359893119,
      f = 2600822924,
      g = 528734635,
      h = 1541459225;
    for (let i = 0; i < 64; i++) {
      const S1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
      const t1 = h + S1 + (e & f ^ ~e & g) + K[i] + W[i] | 0;
      const S0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
      const t2 = S0 + (a & b ^ a & c ^ b & c) | 0;
      h = g;
      g = f;
      f = e;
      e = d + t1 | 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 | 0;
    }
    return a + 1779033703 >>> 0;
  }
  pow(seed, bits) {
    const shift = 32 - bits;
    const prefix = `${seed}:`;
    let c = 0;
    while (c < Number.MAX_SAFE_INTEGER) {
      if (this.h0(prefix + c) >>> shift === 0) return c;
      c++;
    }
    return -1;
  }
  hdr(add = {}) {
    return {
      accept: "*/*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      cookie: this.jar || "",
      origin: "https://user.tikmatrix.com",
      pragma: "no-cache",
      referer: "https://user.tikmatrix.com/",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": this.ua,
      ...add
    };
  }
  async pass() {
    try {
      console.log("[TikMatrix] Mendapatkan challenge dari server...");
      const chRes = await axios.get(`${this.base}/api/challenge`, {
        headers: this.hdr()
      });
      const seed = chRes?.data?.data?.seed || chRes?.data?.seed;
      const diff = chRes?.data?.data?.difficulty || chRes?.data?.difficulty || 16;
      const chId = chRes?.data?.data?.challenge || chRes?.data?.challenge;
      console.log(`[TikMatrix] Menyelesaikan PoW: Difficulty ${diff}...`);
      const counter = this.pow(seed, diff);
      console.log(`[TikMatrix] PoW berhasil dipecahkan! Counter: ${counter}`);
      console.log("[TikMatrix] Menukar counter ke pass token...");
      const passRes = await axios.post(`${this.base}/api/pass`, {
        challenge: chId,
        counter: counter
      }, {
        headers: this.hdr({
          "content-type": "application/json"
        }),
        validateStatus: () => true
      });
      const setCookies = passRes?.headers?.["set-cookie"];
      if (setCookies?.length) {
        const newCookies = setCookies.map(c => c.split(";")[0]).join("; ");
        this.jar = this.jar ? `${this.jar}; ${newCookies}` : newCookies;
        console.log("[TikMatrix] Cookie fx_pass berhasil diperbarui.");
      }
      return true;
    } catch (err) {
      console.log("[TikMatrix] Gagal menyelesaikan pass challenge:", err?.message || err);
      return false;
    }
  }
  async req(path, opt = {}) {
    const url = `${this.base}/api${path}`;
    const cfg = {
      method: opt.method ? opt.method : "GET",
      url: url,
      headers: this.hdr(opt.headers || {}),
      data: opt.data ? opt.data : undefined,
      validateStatus: () => true
    };
    let res = await axios(cfg);
    if (res?.status === 401) {
      console.log("[TikMatrix] Terkena 401 Unauthorized. Mengaktifkan PoW bypass...");
      const ok = await this.pass();
      if (ok) {
        console.log("[TikMatrix] Mengirim ulang request awal...");
        cfg.headers = this.hdr(opt.headers || {});
        res = await axios(cfg);
      }
    }
    return res;
  }
  async search({
    username,
    ...rest
  }) {
    console.log(`[TikMatrix] Memulai pencarian username: @${username || "unknown"}`);
    try {
      const cleanUser = username ? encodeURIComponent(username.replace(/^@/, "")) : "";
      if (!cleanUser) {
        return {
          status: false,
          result: {
            error_message: "username parameter is required"
          }
        };
      }
      const res = await this.req(`/users/${cleanUser}`, {
        ...rest
      });
      console.log(`[TikMatrix] Response status: ${res?.status}`);
      const body = res?.data;
      const isSuccess = res?.status === 200 && (body?.success ?? true);
      if (isSuccess && body?.data) {
        console.log("[TikMatrix] Berhasil mendapatkan detail profile.");
        return {
          status: true,
          result: this.toSnake({
            http_code: res?.status || 200,
            user_data: body?.data || null,
            ...rest
          })
        };
      }
      console.log("[TikMatrix] Profil tidak ditemukan atau gagal diproses.");
      return {
        status: false,
        result: this.toSnake({
          http_code: res?.status || 404,
          error_message: body?.message || "user not found or request failed"
        })
      };
    } catch (err) {
      console.log("[TikMatrix] Terjadi error pada sistem:", err?.message || err);
      return {
        status: false,
        result: {
          error_message: err?.message || "internal client error"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.username) {
    return res.status(400).json({
      error: "Parameter 'username' diperlukan"
    });
  }
  const api = new TikMatrixFinder();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}