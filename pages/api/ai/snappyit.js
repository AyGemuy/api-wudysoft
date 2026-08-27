import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class SnappyitAI {
  constructor() {
    try {
      this.token = null;
      this.profile = null;
      this.clientId = "ybBTDTVjRfJYjd71bsxPWu5Yiup26csU";
      this.apiBase = "https://api.snappyit.ai";
      this.authBase = "https://auth.snappyit.ai";
      this.mailBase = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
      this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
      this.fp = this._genFp() || crypto.randomBytes(16).toString("hex");
      this.http = axios.create({
        timeout: 3e4
      });
    } catch (err) {
      console.log(`[ERR] Inisialisasi constructor: ${err?.message || err}`);
    }
  }
  _rnd(min, max) {
    try {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    } catch (err) {
      return min;
    }
  }
  _rndF(min, max, dec = 14) {
    try {
      return parseFloat((Math.random() * (max - min) + min).toFixed(dec));
    } catch (err) {
      return min;
    }
  }
  _pick(arr) {
    try {
      return Array.isArray(arr) && arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;
    } catch (err) {
      return null;
    }
  }
  _mmM(t, n) {
    try {
      const e = t[0] >>> 16,
        o = 65535 & t[0],
        i = t[1] >>> 16,
        r = 65535 & t[1];
      const a = n[0] >>> 16,
        c = 65535 & n[0],
        s = n[1] >>> 16;
      let u = 0,
        l = 0,
        d = 0,
        m = 0;
      m += r + (65535 & n[1]);
      d += m >>> 16;
      m &= 65535;
      d += i + s;
      l += d >>> 16;
      d &= 65535;
      l += o + c;
      u += l >>> 16;
      l &= 65535;
      u += e + a;
      u &= 65535;
      t[0] = u << 16 | l;
      t[1] = d << 16 | m;
    } catch (err) {
      return null;
    }
  }
  _mmF(t, n) {
    try {
      const e = t[0] >>> 16,
        o = 65535 & t[0],
        i = t[1] >>> 16,
        r = 65535 & t[1];
      const a = n[0] >>> 16,
        c = 65535 & n[0],
        s = n[1] >>> 16,
        u = 65535 & n[1];
      let l = 0,
        d = 0,
        m = 0,
        f = 0;
      f += r * u;
      m += f >>> 16;
      f &= 65535;
      m += i * u;
      d += m >>> 16;
      m &= 65535;
      m += r * s;
      d += m >>> 16;
      m &= 65535;
      d += o * u;
      l += d >>> 16;
      d &= 65535;
      d += i * s;
      l += d >>> 16;
      d &= 65535;
      d += r * c;
      l += d >>> 16;
      d &= 65535;
      l += e * u + o * s + i * c + r * a;
      l &= 65535;
      t[0] = l << 16 | d;
      t[1] = m << 16 | f;
    } catch (err) {
      return null;
    }
  }
  _mmP(t, n) {
    try {
      const e = t[0];
      n %= 64;
      if (n === 32) {
        t[0] = t[1];
        t[1] = e;
      } else if (n < 32) {
        t[0] = e << n | t[1] >>> 32 - n;
        t[1] = t[1] << n | e >>> 32 - n;
      } else {
        n -= 32;
        t[0] = t[1] << n | e >>> 32 - n;
        t[1] = e << n | t[1] >>> 32 - n;
      }
    } catch (err) {
      return null;
    }
  }
  _mmH(t, n) {
    try {
      n %= 64;
      if (n !== 0) {
        if (n < 32) {
          t[0] = t[1] >>> 32 - n;
          t[1] = t[1] << n;
        } else {
          t[0] = t[1] << n - 32;
          t[1] = 0;
        }
      }
    } catch (err) {
      return null;
    }
  }
  _mmY(t, n) {
    try {
      t[0] ^= n[0];
      t[1] ^= n[1];
    } catch (err) {
      return null;
    }
  }
  _mmG(t) {
    try {
      const b = [4283543511, 3981806797],
        v = [3301882366, 444984403];
      const n = [0, t[0] >>> 1];
      this._mmY(t, n);
      this._mmF(t, b);
      n[1] = t[0] >>> 1;
      this._mmY(t, n);
      this._mmF(t, v);
      n[1] = t[0] >>> 1;
      this._mmY(t, n);
    } catch (err) {
      return null;
    }
  }
  _murmur3(t, seed = 0) {
    try {
      const e = Buffer.from(t || "", "utf8");
      const o = [0, e.length];
      const i = o[1] % 16;
      const r = o[1] - i;
      const a = [0, seed];
      const c = [0, seed];
      const s = [0, 0];
      const u = [0, 0];
      const w = [2277735313, 289559509],
        L = [1291169091, 658871167];
      const k = [0, 5],
        V = [0, 1390208809],
        S = [0, 944331445];
      let l;
      for (l = 0; l < r; l += 16) {
        s[0] = e[l + 4] | e[l + 5] << 8 | e[l + 6] << 16 | e[l + 7] << 24;
        s[1] = e[l] | e[l + 1] << 8 | e[l + 2] << 16 | e[l + 3] << 24;
        u[0] = e[l + 12] | e[l + 13] << 8 | e[l + 14] << 16 | e[l + 15] << 24;
        u[1] = e[l + 8] | e[l + 9] << 8 | e[l + 10] << 16 | e[l + 11] << 24;
        this._mmF(s, w);
        this._mmP(s, 31);
        this._mmF(s, L);
        this._mmY(a, s);
        this._mmP(a, 27);
        this._mmM(a, c);
        this._mmF(a, k);
        this._mmM(a, V);
        this._mmF(u, L);
        this._mmP(u, 33);
        this._mmF(u, w);
        this._mmY(c, u);
        this._mmP(c, 31);
        this._mmM(c, a);
        this._mmF(c, k);
        this._mmM(c, S);
      }
      s[0] = 0;
      s[1] = 0;
      u[0] = 0;
      u[1] = 0;
      const d = [0, 0];
      switch (i) {
        case 15:
          d[1] = e[l + 14];
          this._mmH(d, 48);
          this._mmY(u, d);
        case 14:
          d[1] = e[l + 13];
          this._mmH(d, 40);
          this._mmY(u, d);
        case 13:
          d[1] = e[l + 12];
          this._mmH(d, 32);
          this._mmY(u, d);
        case 12:
          d[1] = e[l + 11];
          this._mmH(d, 24);
          this._mmY(u, d);
        case 11:
          d[1] = e[l + 10];
          this._mmH(d, 16);
          this._mmY(u, d);
        case 10:
          d[1] = e[l + 9];
          this._mmH(d, 8);
          this._mmY(u, d);
        case 9:
          d[1] = e[l + 8];
          this._mmY(u, d);
          this._mmF(u, L);
          this._mmP(u, 33);
          this._mmF(u, w);
          this._mmY(c, u);
        case 8:
          d[1] = e[l + 7];
          this._mmH(d, 56);
          this._mmY(s, d);
        case 7:
          d[1] = e[l + 6];
          this._mmH(d, 48);
          this._mmY(s, d);
        case 6:
          d[1] = e[l + 5];
          this._mmH(d, 40);
          this._mmY(s, d);
        case 5:
          d[1] = e[l + 4];
          this._mmH(d, 32);
          this._mmY(s, d);
        case 4:
          d[1] = e[l + 3];
          this._mmH(d, 24);
          this._mmY(s, d);
        case 3:
          d[1] = e[l + 2];
          this._mmH(d, 16);
          this._mmY(s, d);
        case 2:
          d[1] = e[l + 1];
          this._mmH(d, 8);
          this._mmY(s, d);
        case 1:
          d[1] = e[l];
          this._mmY(s, d);
          this._mmF(s, w);
          this._mmP(s, 31);
          this._mmF(s, L);
          this._mmY(a, s);
      }
      this._mmY(a, o);
      this._mmY(c, o);
      this._mmM(a, c);
      this._mmM(c, a);
      this._mmG(a);
      this._mmG(c);
      this._mmM(a, c);
      this._mmM(c, a);
      return ("00000000" + (a[0] >>> 0).toString(16)).slice(-8) + ("00000000" + (a[1] >>> 0).toString(16)).slice(-8) + ("00000000" + (c[0] >>> 0).toString(16)).slice(-8) + ("00000000" + (c[1] >>> 0).toString(16)).slice(-8);
    } catch (err) {
      return crypto.randomBytes(16).toString("hex");
    }
  }
  _genFp() {
    try {
      const gpuVendors = [{
        vendor: "ARM",
        renderer: `Mali-G${this._pick([ 52, 57, 68, 72, 76, 77, 78, 710, 715 ]) || 78}`
      }, {
        vendor: "Qualcomm",
        renderer: `Adreno (TM) ${this._pick([ 610, 618, 620, 640, 660, 730, 740 ]) || 660}`
      }, {
        vendor: "Imagination Technologies",
        renderer: "PowerVR Rogue GE8320"
      }];
      const selectedGpu = this._pick(gpuVendors) || gpuVendors[0];
      const screenRes = this._pick([
        [915, 412],
        [892, 412],
        [864, 412],
        [926, 428],
        [844, 390],
        [800, 360],
        [882, 393],
        [960, 540],
        [1080, 2400]
      ]) || [864, 412];
      const rawEntropy = {
        architecture: this._pick([127, 255]) || 255,
        audio: this._rndF(30, 130, 14),
        colorDepth: this._pick([24, 30, 32]) || 24,
        colorGamut: this._pick(["srgb", "p3", "rec2020"]) || "srgb",
        contrast: this._pick([-1, 0, 1]) ?? 0,
        cpuClass: "unsupported",
        deviceMemory: this._pick([4, 6, 8, 12, 16]) || 8,
        fonts: this._pick([
          ["sans-serif", "monospace"],
          ["sans-serif", "serif"],
          ["sans-serif", "monospace", "serif"],
          ["sans-serif-thin", "Roboto", "sans-serif"]
        ]) || ["sans-serif", "monospace"],
        hardwareConcurrency: this._pick([4, 6, 8, 12, 16]) || 8,
        hdr: Math.random() > .8,
        languages: this._pick([
          [
            ["id-ID", "id", "en-US", "en"]
          ],
          [
            ["id-ID", "id"]
          ],
          [
            ["en-US", "en", "id-ID", "id"]
          ],
          [
            ["en-US", "en"]
          ]
        ]) || [
          ["id-ID", "id", "en-US", "en"]
        ],
        osCpu: "unsupported",
        platform: this._pick(["Linux armv8l", "Linux aarch64", "Linux armv7l"]) || "Linux armv8l",
        reducedMotion: Math.random() > .9,
        reducedTransparency: Math.random() > .9,
        screenFrame: this._pick([
          [0, 0, 0, 0],
          [0, 0, 24, 0],
          [0, 0, 48, 0]
        ]) || [0, 0, 0, 0],
        screenResolution: screenRes,
        timezone: this._pick(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Bangkok", "Asia/Singapore"]) || "Asia/Jakarta",
        vendor: "Google Inc.",
        webGlBasics: {
          renderer: "WebKit WebGL",
          rendererUnmasked: selectedGpu.renderer,
          shadingLanguageVersion: "WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)",
          vendor: "WebKit",
          vendorUnmasked: selectedGpu.vendor,
          version: this._pick(["WebGL 1.0 (OpenGL ES 2.0 Chromium)", "WebGL 2.0 (OpenGL ES 3.0 Chromium)"]) || "WebGL 1.0 (OpenGL ES 2.0 Chromium)"
        }
      };
      let compStr = "";
      for (const k of Object.keys(rawEntropy).sort()) {
        const val = JSON.stringify(rawEntropy[k]);
        compStr += `${compStr ? "|" : ""}${k.replace(/([:|\\])/g, "\\$1")}:${val}`;
      }
      return this._murmur3(compStr);
    } catch (err) {
      return crypto.randomBytes(16).toString("hex");
    }
  }
  _sleep(ms) {
    try {
      return new Promise(res => setTimeout(res, ms));
    } catch (err) {
      return Promise.resolve();
    }
  }
  _bldHdr(token = null, isAuth = false) {
    try {
      if (isAuth) {
        return {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://snappyit.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://snappyit.ai/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": this.ua
        };
      }
      return {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Content-Type": "application/json",
        Origin: "https://snappyit.ai",
        Pragma: "no-cache",
        Referer: "https://snappyit.ai/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        "User-Agent": this.ua,
        "X-Device-Fingerprint": this.fp || this._genFp(),
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        ...token ? {
          Authorization: `Bearer ${token}`
        } : {}
      };
    } catch (err) {
      return {};
    }
  }
  async _getProfile(token) {
    try {
      console.log("[LOG] Mengambil profile dan balance akun...");
      const res = await this.http.get(`${this.apiBase}/profile/info`, {
        headers: this._bldHdr(token)
      });
      const profile = res?.data?.data || res?.data || {};
      const email = profile?.email || profile?.name || "-";
      const balance = profile?.balance ?? 0;
      const available = profile?.availableBalance ?? balance;
      const hasSub = Boolean(profile?.hasMonthlyOrYearlySub);
      console.log(`[LOG] Profil Akun -> Email: ${email} | Saldo Tersedia: ${available} | Saldo Total: ${balance}`);
      this.profile = {
        id: profile?.id || null,
        email: email,
        balance: balance,
        available_balance: available,
        has_paid: Boolean(profile?.hasPaid),
        has_subscription: hasSub,
        created_at: profile?.createdAt || null
      };
      return this.profile;
    } catch (err) {
      console.log(`[ERR] Gagal mengambil profile: ${err?.message || err}`);
      return null;
    }
  }
  async _parseImg(image) {
    try {
      console.log("[LOG] Memvalidasi dan menyiapkan buffer gambar...");
      let buf = null;
      let mime = "image/jpeg";
      if (Buffer.isBuffer(image)) {
        buf = image;
      } else if (typeof image === "string") {
        if (/^https?:\/\//i.test(image)) {
          console.log(`[LOG] Mengunduh gambar dari URL: ${image}`);
          const res = await axios.get(image, {
            responseType: "arraybuffer",
            timeout: 2e4
          });
          buf = Buffer.from(res.data);
          mime = res.headers?.["content-type"] || "image/jpeg";
        } else if (image.startsWith("data:")) {
          const match = image.match(/^data:([^;]+);base64,(.+)$/);
          mime = match?.[1] || "image/jpeg";
          buf = Buffer.from(match?.[2] || "", "base64");
        } else {
          buf = Buffer.from(image, "base64");
        }
      }
      if (!buf || buf.length === 0) {
        console.log("[ERR] Buffer gambar kosong atau format salah");
        return null;
      }
      const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
      const fileName = `${Date.now()}_${crypto.randomBytes(8).toString("hex")}_processed.${ext}`;
      return {
        buffer: buf,
        mime_type: mime,
        file_name: fileName,
        file_length: buf.length
      };
    } catch (err) {
      console.log(`[ERR] Gagal parsing gambar: ${err?.message || err}`);
      return null;
    }
  }
  async _getMail() {
    try {
      console.log("[LOG] Membuat email sementara di wudysoft...");
      const res = await this.http.get(`${this.mailBase}?action=create`);
      const email = res?.data?.email || res?.data?.data?.email;
      if (!email) {
        console.log("[ERR] Respon email kosong");
        return null;
      }
      console.log(`[LOG] Email sementara didapatkan: ${email}`);
      return email;
    } catch (err) {
      console.log(`[ERR] Gagal membuat email: ${err?.message || err}`);
      return null;
    }
  }
  async _getOtp(email) {
    try {
      console.log(`[LOG] Menunggu pesan OTP masuk untuk ${email}...`);
      for (let i = 0; i < 20; i++) {
        await this._sleep(3e3);
        const res = await this.http.get(`${this.mailBase}?action=message&email=${encodeURIComponent(email)}`);
        const messages = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
        for (const msg of messages) {
          const content = msg?.text_content || msg?.html_content || msg?.subject || "";
          const match = content.match(/\b\d{6}\b/);
          if (match) {
            console.log(`[LOG] Kode OTP ditemukan: ${match[0]}`);
            return match[0];
          }
        }
      }
      console.log("[ERR] Timeout saat menunggu kode verifikasi OTP");
      return null;
    } catch (err) {
      console.log(`[ERR] Gagal mendapatkan OTP: ${err?.message || err}`);
      return null;
    }
  }
  async _reqAuth() {
    try {
      console.log(`[LOG] Menginisialisasi session Auth0 (Fingerprint: ${this.fp})...`);
      const email = await this._getMail();
      if (!email) return null;
      console.log("[LOG] Mengirim passwordless OTP start request...");
      await this.http.post(`${this.authBase}/passwordless/start`, {
        client_id: this.clientId,
        connection: "email",
        send: "code",
        email: email
      }, {
        headers: this._bldHdr(null, true)
      });
      const otp = await this._getOtp(email);
      if (!otp) return null;
      console.log("[LOG] Menukarkan OTP dengan OAuth Bearer Token...");
      const res = await this.http.post(`${this.authBase}/oauth/token`, {
        grant_type: "http://auth0.com/oauth/grant-type/passwordless/otp",
        client_id: this.clientId,
        username: email,
        otp: otp,
        realm: "email",
        audience: "https://api.snappyit.ai",
        scope: "openid profile email"
      }, {
        headers: this._bldHdr(null, true)
      });
      const accessToken = res?.data?.access_token;
      if (!accessToken) {
        console.log("[ERR] Token access tidak ada di dalam payload auth");
        return null;
      }
      this.token = accessToken;
      console.log("[LOG] Bearer token berhasil diperoleh.");
      await this._getProfile(accessToken);
      return accessToken;
    } catch (err) {
      console.log(`[ERR] Proses registrasi/autentikasi gagal: ${err?.message || err}`);
      return null;
    }
  }
  async _ensureTok(token = null) {
    try {
      if (token) {
        this.token = token;
        return token;
      }
      if (this.token) {
        return this.token;
      }
      return await this._reqAuth();
    } catch (err) {
      console.log(`[ERR] Gagal memastikan token: ${err?.message || err}`);
      return null;
    }
  }
  async _uplImg(imgObj, token) {
    try {
      console.log("[LOG] Mengambil Presigned Cloudflare R2 Upload URL...");
      const genUrl = `${this.apiBase}/upload/generate/url?fileName=${encodeURIComponent(imgObj.file_name)}&contentType=${encodeURIComponent(imgObj.mime_type)}&fileLength=${imgObj.file_length}&needsNormalization=false`;
      const genRes = await this.http.get(genUrl, {
        headers: this._bldHdr(token)
      });
      const upUrl = genRes?.data?.data?.url || genRes?.data?.url || genRes?.data?.data?.uploadUrl;
      const key = genRes?.data?.data?.key || genRes?.data?.key || imgObj.file_name;
      if (!upUrl) {
        console.log("[ERR] Gagal mendapatkan upload presigned URL dari backend");
        return null;
      }
      console.log(`[LOG] Mengunggah binary file (${imgObj.file_length} bytes) via HTTP PUT...`);
      await axios.put(upUrl, imgObj.buffer, {
        headers: {
          Accept: "*/*",
          "Accept-Language": "id-ID",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Length": String(imgObj.file_length),
          "Content-Type": imgObj.mime_type,
          Origin: "https://snappyit.ai",
          Pragma: "no-cache",
          Referer: "https://snappyit.ai/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "cross-site",
          "User-Agent": this.ua,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        },
        timeout: 6e4
      });
      console.log(`[LOG] Upload tuntas. Resource Key: ${key}`);
      return key;
    } catch (err) {
      console.log(`[ERR] Gagal mengunggah file gambar: ${err?.message || err}`);
      return null;
    }
  }
  async _pollRes(recordIds, token, maxRetries = 60, delay = 3e3) {
    try {
      console.log(`[LOG] Menjalankan polling task (IDs: ${JSON.stringify(recordIds)}) max ${maxRetries}x dengan jeda ${delay}ms...`);
      const bodyPayload = {
        recordIds: recordIds
      };
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await this._sleep(delay);
        const res = await this.http.post(`${this.apiBase}/undress/submit/result`, bodyPayload, {
          headers: this._bldHdr(token)
        });
        const data = res?.data?.data || res?.data || {};
        const records = Array.isArray(data?.records) ? data.records : [];
        const isDone = records.length > 0 && records.every(r => r?.status === 2);
        const completedUrls = records.filter(r => r?.status === 2).map(r => r?.url).filter(Boolean);
        console.log(`[LOG] Status Polling [${attempt}/${maxRetries}] => status: ${isDone ? "2 (Completed)" : records[0]?.status ?? 1} | urls: ${completedUrls.length}/${records.length}`);
        if (isDone && completedUrls.length > 0) {
          console.log(`[LOG] Proses render AI berhasil diselesaikan! Output URL: ${completedUrls[0]}`);
          return {
            url: completedUrls[0] || null,
            urls: completedUrls,
            records: records.map(r => ({
              id: r?.id,
              url: r?.url,
              status: r?.status,
              like: r?.like ?? 0,
              failure_code: r?.failureCode ?? 0,
              create_at: r?.createAt,
              setting: r?.setting ? {
                image_count: r.setting.imageCount || "1",
                undress_vibe: r.setting.undressVibe || "soft"
              } : null
            })),
            original_image: {
              key: data?.originalImage?.key || null,
              url: data?.originalImage?.url || null
            }
          };
        }
        const failed = records.find(r => r?.failureCode && r.failureCode !== 0);
        if (failed) {
          console.log(`[ERR] Task gagal diproses dengan failureCode: ${failed.failureCode}`);
          return null;
        }
      }
      console.log("[ERR] Polling melebihi batas waktu (timeout)");
      return null;
    } catch (err) {
      console.log(`[ERR] Polling hasil gagal: ${err?.message || err}`);
      return null;
    }
  }
  async generate({
    token = null,
    image = null,
    count = "1",
    vibe = "soft",
    ...rest
  } = {}) {
    try {
      console.log("[LOG] Menerima request eksekusi AI chat/undress...");
      if (!image) {
        return {
          status: false,
          result: {
            error_message: "Parameter image wajib disertakan (URL / Base64 / Buffer)."
          },
          token: token || this.token || null
        };
      }
      const activeToken = await this._ensureTok(token);
      if (!activeToken) {
        return {
          status: false,
          result: {
            error_message: "Gagal mendapatkan token autentikasi"
          },
          token: null
        };
      }
      const parsedImg = await this._parseImg(image);
      if (!parsedImg) {
        return {
          status: false,
          result: {
            error_message: "Format gambar tidak valid atau gagal diunduh"
          },
          token: activeToken
        };
      }
      const imageKey = await this._uplImg(parsedImg, activeToken);
      if (!imageKey) {
        return {
          status: false,
          result: {
            error_message: "Gagal mengunggah gambar ke storage Cloudflare R2"
          },
          token: activeToken
        };
      }
      console.log("[LOG] Mengirim task submission ke /undress/submit...");
      const payload = {
        key: imageKey
      };
      const submitRes = await this.http.post(`${this.apiBase}/undress/submit`, payload, {
        headers: this._bldHdr(activeToken)
      });
      const hist = submitRes?.data?.data?.history || submitRes?.data?.history || {};
      const recs = Array.isArray(hist?.records) ? hist.records : [];
      const recordIds = recs.map(r => r?.id).filter(Boolean);
      if (!recordIds.length && hist?.id) {
        recordIds.push(hist.id);
      }
      if (!recordIds.length) {
        return {
          status: false,
          result: {
            error_message: "Tidak ada record ID yang dikembalikan setelah submit task"
          },
          token: activeToken
        };
      }
      const pollResult = await this._pollRes(recordIds, activeToken, 60, 3e3);
      if (!pollResult) {
        return {
          status: false,
          result: {
            error_message: "Gagal saat polling hasil render atau mencapai batas timeout"
          },
          token: activeToken
        };
      }
      return {
        status: true,
        result: {
          url: pollResult?.url || pollResult?.urls?.[0] || null,
          urls: pollResult?.urls || [],
          history_id: hist?.id || null,
          key: hist?.key || imageKey,
          setting: hist?.setting ? {
            image_count: hist.setting.imageCount || count,
            undress_vibe: hist.setting.undressVibe || vibe
          } : {
            image_count: count,
            undress_vibe: vibe
          },
          records: pollResult?.records || [],
          original_image: pollResult?.original_image || {
            key: hist?.key || imageKey,
            url: hist?.url || null
          },
          user_profile: this.profile || null
        },
        token: activeToken
      };
    } catch (err) {
      console.log(`[ERR] Eksekusi method chat gagal: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.response?.data?.message || err?.response?.data?.error_msg || err?.message || "Unknown error"
        },
        token: this.token || token || null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new SnappyitAI();
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