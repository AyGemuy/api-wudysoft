import axios from "axios";
import FormData from "form-data";
import crypto from "node:crypto";
import AdmZip from "adm-zip";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class PokeCutAI {
  constructor() {
    try {
      this.dom = "www.pokecut.com";
      this.cid = "POKECUT.w.2cbb93c29b7e12fb00afa116aef1ddc7";
      this.did = this._devId();
      this.ver = "3.0.0";
      this.plt = "5";
      this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
      this.jar = {};
      this.baseKey = null;
      this.reqKey = null;
      this.authToken = null;
      this.ossToken = null;
      this.userBenefit = null;
      this._initPromise = null;
      this.http = axios.create({
        baseURL: `${proxy}https://appinference-distribute.frigidpine.com`,
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          clientid: this.cid,
          clientversion: this.ver,
          deviceid: this.did,
          origin: `https://${this.dom}`,
          platform: this.plt,
          pragma: "no-cache",
          priority: "u=1, i",
          referer: `https://${this.dom}/`,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": this.ua
        }
      });
      this.http.interceptors.request.use((cfg = {}) => {
        try {
          const c = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
          if (c && cfg.headers) cfg.headers["cookie"] = c;
          if (this.authToken && cfg.headers) cfg.headers["x-auth-token"] = this.authToken;
          return cfg;
        } catch {
          return cfg;
        }
      });
      this.http.interceptors.response.use((res = {}) => {
        try {
          const h = res?.headers?.["set-cookie"] || [];
          (Array.isArray(h) ? h : [h]).forEach(c => {
            const [p] = (c || "").split(";");
            const [k, v] = (p || "").split("=");
            if (k?.trim()) this.jar[k.trim()] = v?.trim() || "";
          });
          const authToken = res?.headers?.["x-auth-token"] || res?.headers?.["token"] || res?.headers?.["authorization"];
          if (authToken) this.authToken = authToken;
          return res;
        } catch {
          return res;
        }
      });
    } catch (e) {
      console.error("[!] Constructor init error:", e?.message || e);
    }
  }
  _devId() {
    try {
      let r = "";
      for (let e = 0; e < 32; e++) {
        const t = 16 * Math.random() | 0;
        if (8 === e || 12 === e || 16 === e || 20 === e) r += "-";
        r += (12 === e ? 4 : 16 === e ? 3 & t | 8 : t).toString(16);
      }
      return r;
    } catch (e) {
      console.error("[!] Device ID generator error:", e?.message || e);
      return crypto.randomUUID();
    }
  }
  _pbkdf(p = "", s = "") {
    try {
      return crypto.pbkdf2Sync(p, s, 4096, 32, "sha512");
    } catch (e) {
      console.error("[!] Crypto PBKDF2 error:", e?.message || e);
      return null;
    }
  }
  _dec(d = "", k = this.reqKey) {
    try {
      if (!d || !k) return null;
      const cipherBuf = Buffer.from(d, "base64");
      const keyBuf = Buffer.isBuffer(k) ? k : Buffer.from(k, "hex");
      const decipher = crypto.createDecipheriv("aes-256-ecb", keyBuf, null);
      decipher.setAutoPadding(true);
      return Buffer.concat([decipher.update(cipherBuf), decipher.final()]).toString("utf-8");
    } catch (e) {
      console.error("[!] Crypto Decrypt ECB error:", e?.message || e);
      return null;
    }
  }
  _enc(d = "", k = this.reqKey) {
    try {
      if (!k) return null;
      const str = typeof d === "object" ? JSON.stringify(d) : String(d);
      const keyBuf = Buffer.isBuffer(k) ? k : Buffer.from(k, "hex");
      const cipher = crypto.createCipheriv("aes-256-ecb", keyBuf, null);
      cipher.setAutoPadding(true);
      return Buffer.concat([cipher.update(Buffer.from(str, "utf-8")), cipher.final()]).toString("base64");
    } catch (e) {
      console.error("[!] Crypto Encrypt ECB error:", e?.message || e);
      return null;
    }
  }
  _decFa(d = "", pass = "") {
    try {
      if (!d || !pass) return null;
      const raw = Buffer.from(d, "base64");
      if (raw.length < 16 || raw.subarray(0, 8).toString("utf-8") !== "Salted__") return null;
      const salt = raw.subarray(8, 16);
      const ciphertext = raw.subarray(16);
      let keyIv = Buffer.alloc(0);
      let prev = Buffer.alloc(0);
      while (keyIv.length < 48) {
        prev = crypto.createHash("md5").update(Buffer.concat([prev, Buffer.from(pass, "utf-8"), salt])).digest();
        keyIv = Buffer.concat([keyIv, prev]);
      }
      const key = keyIv.subarray(0, 32);
      const iv = keyIv.subarray(32, 48);
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      decipher.setAutoPadding(true);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf-8");
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (e) {
      console.error("[!] Crypto Decrypt Fa error:", e?.message || e);
      return null;
    }
  }
  _decShuffle(d = "") {
    try {
      const len = d.length;
      let seed = 42 >>> 0;
      const rng = () => {
        seed = (1664525 * seed + 1013904223) % 2 ** 32;
        return seed >>> 0;
      };
      const order = Array.from(Array(len).keys());
      for (let a = len - 1; a > 0; a--) {
        const e = rng() % (a + 1);
        [order[a], order[e]] = [order[e], order[a]];
      }
      const out = new Array(len);
      order.forEach((pos, idx) => {
        out[pos] = d[idx];
      });
      const rawStr = Buffer.from(out.join(""), "base64").toString("utf-8");
      return JSON.parse(rawStr);
    } catch (e) {
      console.error("[!] Decode shuffle error:", e?.message || e);
      return null;
    }
  }
  _invertBuf(buf = null) {
    try {
      if (!buf) return null;
      const inverted = Buffer.allocUnsafe(buf.length);
      for (let i = 0; i < buf.length; i++) {
        inverted[i] = ~buf[i];
      }
      return inverted;
    } catch (e) {
      console.error("[!] Bit-inversion buffer error:", e?.message || e);
      return buf;
    }
  }
  _zipWrap(buf = null, filename = "image.png") {
    try {
      if (!buf) return null;
      if (buf.length >= 2 && buf[0] === 80 && buf[1] === 75) return buf;
      const zip = new AdmZip();
      zip.addFile(filename, buf);
      return zip.toBuffer();
    } catch (e) {
      console.error("[!] ZIP wrap buffer error:", e?.message || e);
      return buf;
    }
  }
  _extractZip(buf = null) {
    try {
      if (!buf) return null;
      const zip = new AdmZip(buf);
      const entries = zip.getEntries();
      if (!entries || entries.length === 0) return null;
      const imgEntry = entries.find(e => !e.isDirectory && /\.(png|jpe?g|webp)$/i.test(e.entryName)) || entries.find(e => !e.isDirectory);
      if (!imgEntry) return null;
      const buffer = imgEntry.getData();
      const ext = imgEntry.entryName.split(".").pop().toLowerCase();
      const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      return {
        buffer: buffer,
        contentType: contentType
      };
    } catch (e) {
      console.error("[!] Zip extraction error:", e?.message || e);
      return null;
    }
  }
  async _init() {
    try {
      if (this.reqKey && this.authToken && this.ossToken && this.userBenefit) {
        return {
          status: true,
          key: this.reqKey,
          token: this.authToken,
          ossToken: this.ossToken,
          benefit: this.userBenefit
        };
      }
      if (this._initPromise) return await this._initPromise;
      this._initPromise = (async () => {
        try {
          console.log(`[*] Inisialisasi Device ID: ${this.did}`);
          console.log("[*] Menurunkan cryptographic keys dari Pokecut...");
          const rKesab = await axios.get(`https://${this.dom}/api/sa/kesab`, {
            headers: {
              "user-agent": this.ua,
              referer: `https://${this.dom}/`
            }
          });
          const dKey = this._pbkdf(this.dom, this.dom);
          this.baseKey = this._dec(rKesab?.data, dKey);
          if (!this.baseKey) return {
            status: false,
            error: "Gagal mendekripsi baseKey"
          };
          const rAf = await axios.get(`https://${this.dom}/api/sa/af`, {
            headers: {
              "user-agent": this.ua,
              referer: `https://${this.dom}/`
            }
          });
          const afKey = this._pbkdf(this.baseKey, this.cid);
          const appConf = JSON.parse(this._dec(rAf?.data, afKey) || "{}");
          const secretAS = this._decFa(appConf?.AS, this.baseKey);
          const secretStr = typeof secretAS === "string" ? secretAS : JSON.stringify(secretAS || {});
          this.reqKey = this._pbkdf(secretStr, this.did);
          if (!this.reqKey) return {
            status: false,
            error: "Gagal generate request key"
          };
          this.authToken = crypto.createHash("md5").update(`${this.baseKey}${this.did}`).digest("hex");
          const rawOssToken = appConf?.OSS_TOKEN ? this._decFa(appConf.OSS_TOKEN, this.baseKey) : null;
          this.ossToken = typeof rawOssToken === "string" ? rawOssToken : rawOssToken?.token;
          if (!this.ossToken) {
            return {
              status: false,
              error: "Gagal mendekripsi OSS Token dari server config"
            };
          }
          console.log(`[✓] Auth Token Generated : ${this.authToken}`);
          console.log(`[✓] OSS Token Generated  : ${this.ossToken}`);
          console.log("[*] Mengambil informasi benefit & credit kuota...");
          const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
          const fd = new FormData();
          fd.append("data", JSON.stringify({
            dateStr: dateStr || "20260830"
          }));
          const creditRes = await this.http.post("/pokecut/api/031c42463dcde77a15ff47a027a3d5b8/1E91GtH795Lv0qXG", fd, {
            headers: {
              ...fd.getHeaders()
            }
          });
          const rawData = creditRes?.data?.data;
          this.userBenefit = this._decShuffle(rawData) || creditRes?.data || {};
          console.log("================================================================");
          console.log("📊 USER ACCOUNT & CREDIT STATUS");
          console.log("----------------------------------------------------------------");
          console.log(`💳 Total Credits  : ${this.userBenefit?.creditsSum ?? 0}`);
          console.log(`👑 VIP Type       : ${this.userBenefit?.vipType === 0 ? "Free User" : "VIP Member"}`);
          console.log(`🌍 Country ISO    : ${this.userBenefit?.countryIso ?? "ID"}`);
          console.log(`📦 Credits Detail : ${JSON.stringify(this.userBenefit?.creditsInfo ?? [])}`);
          console.log("================================================================");
          return {
            status: true,
            key: this.reqKey,
            token: this.authToken,
            ossToken: this.ossToken,
            benefit: this.userBenefit
          };
        } catch (e) {
          console.error("[!] Kesalahan handshake keys:", e?.message || e);
          return {
            status: false,
            error: e?.message || String(e)
          };
        } finally {
          this._initPromise = null;
        }
      })();
      return await this._initPromise;
    } catch (e) {
      console.error("[!] Init runtime exception:", e?.message || e);
      return {
        status: false,
        error: e?.message || String(e)
      };
    }
  }
  _validateParams({
    isI2I = false,
    model = "",
    ratio = "1:1",
    width = 0,
    height = 0
  }) {
    try {
      const allowedRatios = ["1:1", "3:4", "4:3", "9:16", "16:9", "2:3", "3:2", "4:5", "9:21"];
      const targetRatio = allowedRatios.includes(ratio) ? ratio : "1:1";
      const ratioTable = {
        "1:1": {
          width: 1536,
          height: 1536
        },
        "2:3": {
          width: 1248,
          height: 1872
        },
        "3:2": {
          width: 1872,
          height: 1248
        },
        "3:4": {
          width: 1296,
          height: 1728
        },
        "4:3": {
          width: 1728,
          height: 1296
        },
        "9:16": {
          width: 1152,
          height: 2048
        },
        "16:9": {
          width: 2048,
          height: 1152
        },
        "4:5": {
          width: 1792,
          height: 2304
        },
        "9:21": {
          width: 864,
          height: 2016
        }
      };
      const finalWidth = width || ratioTable[targetRatio]?.width || 1872;
      const finalHeight = height || ratioTable[targetRatio]?.height || 1248;
      let styleId = isI2I ? "pkweb_comfyui_aireplace" : "pkweb_comfyui_t2i_zimage";
      let taskScene = isI2I ? "fireRed_image_to_image" : "z_image_text_to_image";
      let resourceCode = isI2I ? "fireRed_image_to_image" : "z_image_text_to_image";
      if (model) {
        const m = model.toLowerCase();
        if (m.includes("sd")) {
          styleId = "anything_none";
          taskScene = isI2I ? "imgToimg_sd" : "textToimg_sd";
          resourceCode = isI2I ? "imgToimg_sd" : "textToimg_sd";
        }
      }
      return {
        styleId: styleId,
        taskScene: taskScene,
        resourceCode: resourceCode,
        ratio: targetRatio,
        width: finalWidth,
        height: finalHeight
      };
    } catch (e) {
      console.error("[!] Validate parameters error:", e?.message || e);
      return {
        styleId: isI2I ? "pkweb_comfyui_aireplace" : "pkweb_comfyui_t2i_zimage",
        taskScene: isI2I ? "fireRed_image_to_image" : "z_image_text_to_image",
        resourceCode: isI2I ? "fireRed_image_to_image" : "z_image_text_to_image",
        ratio: "1:1",
        width: 1872,
        height: 1248
      };
    }
  }
  async _toBuf(img = null) {
    try {
      if (!img) return null;
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (/^https?:\/\//i.test(img)) {
          console.log("[*] Mengunduh gambar dari URL...");
          const r = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return Buffer.from(r?.data || []);
        }
        if (/^data:image\/[a-z]+;base64,/i.test(img)) {
          return Buffer.from(img.replace(/^data:image\/[a-z]+;base64,/, ""), "base64");
        }
        return Buffer.from(img, "base64");
      }
      return null;
    } catch (e) {
      console.error("[!] Format gambar tidak valid:", e?.message || e);
      return null;
    }
  }
  async _postForm(url = "", payload = {}, enc = true) {
    try {
      const initStatus = await this._init();
      if (!initStatus?.status) return {
        status: false,
        error: initStatus?.error
      };
      const body = enc ? this._enc(payload, this.reqKey) : JSON.stringify(payload);
      const fd = new FormData();
      fd.append("data", body);
      const res = await this.http.post(url, fd, {
        headers: {
          ...fd.getHeaders()
        }
      });
      const raw = res?.data?.data;
      if (!raw) return res?.data || {
        status: false,
        error: "Empty response data"
      };
      if (enc) {
        const out = this._dec(raw, this.reqKey);
        try {
          return JSON.parse(out);
        } catch {
          return out;
        }
      }
      return res?.data;
    } catch (e) {
      console.error(`[!] Request helper gagal [${url}]:`, e?.response?.data || e?.message);
      return {
        status: false,
        error: e?.response?.data || e?.message || String(e)
      };
    }
  }
  async _up(buf = null) {
    try {
      if (!buf) return {
        status: false,
        error: "Buffer file kosong"
      };
      console.log("[*] Mengambil daftar host upload OSS...");
      const hostRes = await this._postForm("/pokecut/api/7eef1564e8fa0a07f4ed2c419a25d05b/864ndi98O1XBhnZ9", {
        ts: Date.now()
      });
      const hosts = Object.keys(hostRes?.hosts || {});
      const host = hosts[Math.floor(Math.random() * (hosts.length || 1))] || "https://appinference-upload4.frigidpine.com";
      const zipPayload = this._zipWrap(buf, "image.png");
      console.log(`[*] Bit-inverting payload zip dan mengunggah ke ${host}...`);
      const invertedPayload = this._invertBuf(zipPayload);
      const fd = new FormData();
      fd.append("file", invertedPayload, {
        filename: `inverted_newFile${Date.now()}.zip`,
        contentType: "application/zip"
      });
      fd.append("data", JSON.stringify({
        func: "aiImageToImage",
        fileType: "zip",
        subDir: "pokecutweb"
      }));
      const res = await axios.post(`${host}/2774b330f97eee4da7120eee503d1d61/00j8678Hzc422UqX`, fd, {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          origin: `https://${this.dom}`,
          pragma: "no-cache",
          priority: "u=1, i",
          referer: `https://${this.dom}/`,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": this.ua,
          "x-auth-token": this.ossToken,
          ...fd.getHeaders()
        }
      });
      const fileUrl = res?.data?.data?.fileUrl;
      if (!fileUrl) {
        console.error("[!] Response OSS:", res?.data);
        return {
          status: false,
          error: res?.data?.msg || "File upload URL tidak ditemukan"
        };
      }
      console.log("[✓] File berhasil diunggah:", fileUrl);
      return {
        status: true,
        fileUrl: fileUrl
      };
    } catch (e) {
      console.error("[!] Gagal mengunggah file form-data:", e?.response?.data || e?.message);
      return {
        status: false,
        error: e?.response?.data || e?.message || String(e)
      };
    }
  }
  async _dl(fileUrl = "") {
    try {
      if (!fileUrl) return {
        status: false,
        error: "Download URL file kosong"
      };
      console.log(`[*] Mengunduh binary hasil dari proxy Pokecut...`);
      const cookieHeader = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
      const res = await axios.get(`https://${this.dom}/api/download`, {
        params: {
          fileUrl: fileUrl
        },
        responseType: "arraybuffer",
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          cookie: cookieHeader || `DID=${this.did}; isIos=false`,
          pragma: "no-cache",
          priority: "u=1, i",
          referer: `https://${this.dom}/id/create/edit`,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": this.ua
        }
      });
      let buffer = Buffer.from(res?.data || []);
      let contentType = res?.headers?.["content-type"] || "application/octet-stream";
      if (buffer.length >= 2 && !(buffer[0] === 80 && buffer[1] === 75)) {
        const reinverted = this._invertBuf(buffer);
        if (reinverted[0] === 80 && reinverted[1] === 75) buffer = reinverted;
      }
      if (buffer.length >= 2 && buffer[0] === 80 && buffer[1] === 75) {
        console.log("[*] Mengekstraksi gambar dari payload ZIP via adm-zip...");
        const extracted = this._extractZip(buffer);
        if (extracted) {
          buffer = extracted.buffer;
          contentType = extracted.contentType;
        }
      }
      console.log(`[✓] Binary gambar berhasil disiapkan (${buffer.length} bytes, ${contentType})`);
      return {
        status: true,
        buffer: buffer,
        contentType: contentType
      };
    } catch (e) {
      console.error("[!] Gagal mengunduh binary output:", e?.response?.data || e?.message);
      return {
        status: false,
        error: e?.response?.data || e?.message || String(e)
      };
    }
  }
  async _poll(taskId = "", max = 60, interval = 3e3) {
    try {
      if (!taskId) return {
        status: false,
        error: "Task ID tidak boleh kosong"
      };
      console.log(`[*] Polling antrean task ID: ${taskId}`);
      for (let i = 1; i <= max; i++) {
        await new Promise(r => setTimeout(r, interval));
        try {
          const res = await this._postForm("/pokecut/api/59ea7e08d1498771c74f89b7c5933f55/4ec7d714debe7ed7", {
            taskId: taskId
          });
          const rData = res?.result?.data || res?.data;
          const rUrl = rData?.resultUrl;
          console.log(`[*] Polling #${i}/${max} - Status: ${res?.result?.msg || res?.msg || "Processing"}`);
          if (rUrl) {
            console.log("[✓] Task selesai! URL Hasil didapatkan.");
            return {
              status: true,
              data: rData,
              fileUrl: rUrl
            };
          }
        } catch (e) {
          console.warn(`[!] Polling retry ke #${i}: ${e?.message || e}`);
        }
      }
      return {
        status: false,
        error: `Polling timeout setelah ${max * (interval / 1e3)} detik.`
      };
    } catch (e) {
      console.error("[!] Kesalahan loop polling:", e?.message || e);
      return {
        status: false,
        error: e?.message || String(e)
      };
    }
  }
  async generate({
    prompt = "",
    image = null,
    ratio = "1:1",
    model = "",
    width = 0,
    height = 0,
    ...rest
  } = {}) {
    try {
      console.log("[*] Menyiapkan parameter generate...");
      const initRes = await this._init();
      if (!initRes?.status) return {
        status: false,
        error: initRes?.error
      };
      let imgUrl = null;
      const isI2I = Boolean(image);
      if (isI2I) {
        const buf = await this._toBuf(image);
        if (!buf) return {
          status: false,
          error: "Gagal memproses input gambar ke buffer"
        };
        const upRes = await this._up(buf);
        if (!upRes?.status) return {
          status: false,
          error: upRes?.error
        };
        imgUrl = upRes.fileUrl;
        console.log("[*] Eksekusi audit preprocess image URL...");
        await this._postForm("/pokecut/api/77fd6944761fa67b5205990383398f24/vB3Fse37k861v51a", {
          imgUrl: imgUrl
        });
      }
      const validated = this._validateParams({
        isI2I: isI2I,
        model: rest.model || model,
        ratio: rest.ratio || ratio,
        width: rest.width || width,
        height: rest.height || height
      });
      console.log(`[*] Mode Engine: ${validated.taskScene} | Style: ${validated.styleId} | Resolusi: ${validated.width}x${validated.height} (${validated.ratio})`);
      console.log("[*] Autentikasi channel permission...");
      await this._postForm("/pokecut/api/d8acdbb2cd7d1d95562f3ed58b1ca72f/3h3fB5MuyTDizAV4", {
        funcType: rest.funcType || "ComfyTextArt",
        styleId: validated.styleId
      });
      const encPrompt = Buffer.from(prompt || "").toString("base64");
      let taskPayload = {};
      if (isI2I) {
        taskPayload = {
          styleId: validated.styleId,
          prompt: encPrompt,
          width: validated.width,
          height: validated.height,
          predictedPresetRatio: validated.ratio,
          taskScene: validated.taskScene,
          resourceCode: validated.resourceCode,
          imgUrl: imgUrl || "",
          ...rest
        };
      } else {
        taskPayload = {
          styleId: validated.styleId,
          imgUrl: "",
          prompt: encPrompt,
          extraParams: rest.extraParams || JSON.stringify({
            "68:width": validated.width,
            "68:height": validated.height
          }),
          taskScene: validated.taskScene,
          resourceCode: validated.resourceCode,
          ...rest
        };
      }
      console.log(`[*] Mendaftarkan pipeline task generation (${isI2I ? "I2I" : "T2I"})...`);
      const res = await this._postForm("/pokecut/api/59ea7e08d1498771c74f89b7c5933f55/695ad9b325baed31", taskPayload);
      const taskId = res?.taskId;
      if (!taskId) {
        return {
          status: false,
          error: `Gagal membuat task: ${JSON.stringify(res)}`
        };
      }
      console.log(`[✓] Task berhasil didaftarkan: ${taskId}`);
      const pollRes = await this._poll(taskId, rest.maxPoll || 60, rest.pollInterval || 3e3);
      if (!pollRes?.status) return {
        status: false,
        error: pollRes?.error
      };
      return await this._dl(pollRes.fileUrl);
    } catch (e) {
      console.error("[!] Eksekusi generate gagal:", e?.message || e);
      return {
        status: false,
        error: e?.message || String(e)
      };
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
  const api = new PokeCutAI();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}