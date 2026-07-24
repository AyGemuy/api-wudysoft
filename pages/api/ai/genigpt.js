import axios from "axios";
import crypto from "crypto";
class GeniGPTClient {
  constructor() {
    try {
      console.log("[GeniGPT] Menginisialisasi instansi client...");
      this.apiKey = "AIzaSyA8e87ARbJeNm9VSuSljsjmlhF3RNr7l_A";
      this.storageBucket = "genibot2.appspot.com";
      this.authUrl = "https://www.googleapis.com/identitytoolkit/v3/relyingparty";
      this.t2iUrl = "https://us-central1-genibot2.cloudfunctions.net/gptfmiddle-web";
      this.editUrl = "https://reimagine-edit-645559567947.us-central1.run.app/";
      this.deviceId = null;
      this.browserFp = null;
      this.idToken = null;
      this.placeholderLength = null;
      this.client = axios.create({
        timeout: 6e5,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          origin: "https://genigpt.net",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://genigpt.net/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-client-data": "CLjxygE="
        }
      });
      console.log("[GeniGPT] Instansi client berhasil diinisialisasi.");
    } catch (err) {
      console.error("[GeniGPT] Gagal mengonstruksi instansi client:", err?.message);
    }
  }
  _rnd(len) {
    try {
      console.log(`[GeniGPT] Menghasilkan byte acak sepanjang: ${len}`);
      return crypto.randomBytes(len).toString("hex");
    } catch (err) {
      console.error("[GeniGPT] Gagal menghasilkan byte acak:", err?.message);
      return null;
    }
  }
  _canvasHash(seed) {
    try {
      console.log("[GeniGPT] Menyusun tiruan hash canvas toDataURL...");
      const hash = crypto.createHash("sha256").update(seed).digest("base64");
      const fakeDataUrl = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAYAAAA5Z6ggAAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH5gYQCg8bA2k4DwAA${hash}IENDuEfg==`;
      return fakeDataUrl.slice(-50);
    } catch (err) {
      console.error("[GeniGPT] Gagal menyusun hash canvas:", err?.message);
      return "IDBAhMCQjWlLy9BAi0Bf4LYazll8skkIcAAAAASUVORK5CYII=";
    }
  }
  _fp() {
    try {
      console.log("[GeniGPT] Merumuskan spesifikasi browser fingerprint dinamis...");
      const seed = this.deviceId ? this.deviceId : this._rnd(16);
      if (!seed) return null;
      const hash = crypto.createHash("md5").update(seed).digest();
      const w = 1024 + hash[0] % 12 * 160;
      const h = 768 + hash[1] % 8 * 120;
      const screen = `${w}x${h}x24`;
      const lang = hash[2] % 2 === 0 ? "id-ID" : hash[2] % 3 === 0 ? "en-GB" : "en-US";
      let timezone = "UTC";
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Jakarta";
      } catch (e) {
        timezone = hash[3] % 2 === 0 ? "Asia/Jakarta" : "Asia/Makassar";
      }
      let platform = "Win32";
      const platVal = hash[4] % 4;
      if (platVal === 1) platform = "MacIntel";
      if (platVal === 2) platform = "Linux x86_64";
      if (platVal === 3) platform = "Linux armv81";
      const coresVal = hash[5] % 5;
      const cores = coresVal === 0 ? 2 : coresVal === 1 ? 4 : coresVal === 2 ? 8 : coresVal === 3 ? 12 : 16;
      const memVal = hash[6] % 4;
      const memory = memVal === 0 ? 4 : memVal === 1 ? 8 : memVal === 2 ? 16 : 32;
      const touch = hash[7] % 2 === 0 ? 0 : 5;
      const canvas = this._canvasHash(seed);
      const computedFp = {
        screen: screen,
        timezone: timezone,
        lang: lang,
        platform: platform,
        cores: cores,
        memory: memory,
        touch: touch,
        canvas: canvas
      };
      console.log("[GeniGPT] Spesifikasi fingerprint berhasil dirumuskan:", JSON.stringify(computedFp));
      return computedFp;
    } catch (err) {
      console.error("[GeniGPT] Gagal merumuskan browser fingerprint:", err?.message);
      return null;
    }
  }
  _gnState() {
    try {
      console.log("[GeniGPT] Mengompilasi parameter state ke Base64...");
      const stateObj = {
        device_id: this.deviceId,
        browser_fp: this.browserFp,
        id_token: this.idToken
      };
      return Buffer.from(JSON.stringify(stateObj)).toString("base64");
    } catch (err) {
      console.error("[GeniGPT] Gagal mengompilasi data state:", err?.message);
      return "";
    }
  }
  _ldState(stateStr) {
    try {
      if (!stateStr) {
        console.log("[GeniGPT] Tidak ada state yang diberikan untuk dipulihkan.");
        return;
      }
      console.log("[GeniGPT] Mengurai string Base64 state...");
      const decoded = JSON.parse(Buffer.from(stateStr, "base64").toString("utf-8"));
      this.deviceId = decoded?.device_id ? decoded.device_id : this.deviceId;
      this.browserFp = decoded?.browser_fp ? decoded.browser_fp : this.browserFp;
      this.idToken = decoded?.id_token ? decoded.id_token : this.idToken;
      console.log("[GeniGPT] Pemulihan state berhasil diselesaikan.");
    } catch (err) {
      console.error("[GeniGPT] Gagal mengurai data state:", err?.message);
    }
  }
  async _buf(img) {
    try {
      if (Buffer.isBuffer(img)) {
        console.log("[GeniGPT] Sumber gambar dideteksi sebagai Buffer.");
        return img;
      }
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          console.log(`[GeniGPT] Mengunduh data gambar dari tautan URL: ${img}...`);
          const response = await this.client.get(img, {
            responseType: "arraybuffer"
          });
          return Buffer.from(response.data);
        }
        if (img.startsWith("data:")) {
          console.log("[GeniGPT] Mengurai data skema URI Base64...");
          const base64Str = img.split(",")[1];
          return Buffer.from(base64Str, "base64");
        }
        console.log("[GeniGPT] Sumber berupa string raw Base64. Mengonversi ke Buffer...");
        return Buffer.from(img, "base64");
      }
      console.error("[GeniGPT] Format masukan gambar tidak dikenali.");
      return null;
    } catch (err) {
      console.error("[GeniGPT] Gagal memproses data gambar ke Buffer:", err?.message);
      return null;
    }
  }
  async _sgn() {
    try {
      console.log("[GeniGPT] Melakukan registrasi akun anonim...");
      const url = `${this.authUrl}/signupNewUser?key=${this.apiKey}`;
      const res = await this.client.post(url, {
        returnSecureToken: true
      }, {
        headers: {
          "content-type": "application/json",
          "x-client-version": "Chrome/JsCore/8.10.1/FirebaseCore-web"
        }
      });
      this.idToken = res?.data?.idToken ? res.data.idToken : null;
      console.log("[GeniGPT] Registrasi akun anonim berhasil.");
      return this.idToken;
    } catch (err) {
      console.error("[GeniGPT] Gagal registrasi akun anonim:", err?.message);
      return null;
    }
  }
  async _up(imageBuffer, token) {
    try {
      if (!imageBuffer) return null;
      console.log("[GeniGPT] Menyiapkan payload multipart/related untuk pengunggahan...");
      const timestamp = Date.now();
      const randomHex = this._rnd(8);
      if (!randomHex) return null;
      const filename = `uploads/edit_${timestamp}_${randomHex}.png`;
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${this.storageBucket}/o?name=${encodeURIComponent(filename)}`;
      const boundary = "70942810068625685160473379763943";
      const meta = JSON.stringify({
        name: filename,
        contentType: "image/jpeg"
      });
      const header = `--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: image/jpeg\r\n\r\n`;
      const footer = `\r\n--${boundary}--`;
      const payload = Buffer.concat([Buffer.from(header, "utf-8"), imageBuffer, Buffer.from(footer, "utf-8")]);
      const headers = {
        authorization: `Firebase ${token}`,
        "content-type": `multipart/related; boundary=${boundary}`,
        "x-firebase-storage-version": "webjs/8.10.1",
        "x-goog-upload-protocol": "multipart"
      };
      console.log("[GeniGPT] Mengirimkan berkas gambar ke cloud bucket...");
      const response = await this.client.post(uploadUrl, payload, {
        headers: headers
      });
      const dlToken = response?.data?.downloadTokens ? response.data.downloadTokens : "";
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${this.storageBucket}/o/${encodeURIComponent(filename)}?alt=media&token=${dlToken}`;
      console.log(`[GeniGPT] Pengunggahan berhasil. Tautan unggah: ${publicUrl}`);
      return publicUrl;
    } catch (err) {
      console.error("[GeniGPT] Gagal melakukan proses upload ke cloud:", err?.message);
      return null;
    }
  }
  async _getPhLen() {
    try {
      console.log("[GeniGPT] Mendapatkan ukuran byte gambar tunggu (wait30sec.png)...");
      const res = await this.client.head(`https://storage.googleapis.com/${this.storageBucket}/wait30sec.png`);
      this.placeholderLength = parseInt(res?.headers?.["content-length"] || "0", 10);
      console.log(`[GeniGPT] Ukuran gambar tunggu didapatkan: ${this.placeholderLength}B`);
    } catch (err) {
      console.warn("[GeniGPT] Gagal memuat ukuran gambar tunggu via HEAD. Menggunakan ukuran default.");
      this.placeholderLength = 4361;
    }
    return this.placeholderLength;
  }
  async _pol(targetUrl) {
    try {
      console.log("[GeniGPT] Memulai pemantauan status ketersediaan hasil gambar...");
      const placeholderSize = this.placeholderLength ? this.placeholderLength : await this._getPhLen();
      let attempt = 0;
      const maxAttempts = 60;
      const delay = 3e3;
      while (attempt < maxAttempts) {
        try {
          const queryUrl = `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}cb=${Date.now()}`;
          const headRes = await this.client.head(queryUrl);
          const activeSize = parseInt(headRes?.headers?.["content-length"] || "0", 10);
          console.log(`[GeniGPT] Polling ke-${attempt + 1}/${maxAttempts} - Ukuran berkas: ${activeSize}B (Placeholder: ${placeholderSize}B)`);
          if (activeSize > 0 && activeSize !== placeholderSize) {
            const completedUrl = `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
            console.log(`[GeniGPT] Hasil akhir gambar terkonfirmasi siap: ${completedUrl}`);
            return completedUrl;
          }
        } catch (err) {
          console.log(`[GeniGPT] Polling ke-${attempt + 1}/${maxAttempts} - Gambar masih diproses oleh server...`);
        }
        attempt++;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      console.warn("[GeniGPT] Batas waktu polling habis. Mengembalikan alamat url mentah.");
      return targetUrl;
    } catch (err) {
      console.error("[GeniGPT] Terjadi kesalahan kritis saat melakukan polling:", err?.message);
      return targetUrl;
    }
  }
  async generate({
    state,
    prompt,
    image,
    ...rest
  }) {
    try {
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        console.error("[GeniGPT] Validasi gagal: Prompt kosong.");
        return {
          status: "error",
          result: {
            error_message: 'Validasi Gagal: Parameter "prompt" wajib diisi dengan teks string.'
          },
          state: this._gnState()
        };
      }
      console.log("[GeniGPT] Memulai eksekusi alur pembuatan gambar...");
      if (state) {
        this._ldState(state);
      }
      const rawHex = this._rnd(8);
      if (!rawHex) {
        return {
          status: "error",
          result: {
            error_message: "Gagal menginisialisasi device ID."
          },
          state: this._gnState()
        };
      }
      this.deviceId = this.deviceId ? this.deviceId : `web_${rawHex}${Date.now().toString(36)}`;
      this.browserFp = this.browserFp ? this.browserFp : this._fp();
      if (!this.idToken) {
        await this._sgn();
      }
      if (!this.idToken) {
        return {
          status: "error",
          result: {
            error_message: "Gagal melakukan otentikasi sesi anonim."
          },
          state: this._gnState()
        };
      }
      let link = "";
      let rawResponse = null;
      if (image) {
        console.log("[GeniGPT] Rute Operasi Terdeteksi: Edit Gambar (Image-to-Image)");
        const uploadedUrls = [];
        const imageList = Array.isArray(image) ? image : [image];
        for (const imgItem of imageList) {
          console.log("[GeniGPT] Mengirimkan entri berkas antrean...");
          const mediaBuffer = await this._buf(imgItem);
          if (!mediaBuffer) {
            return {
              status: "error",
              result: {
                error_message: "Gagal mengonversi item gambar masukan."
              },
              state: this._gnState()
            };
          }
          const publicUrl = await this._up(mediaBuffer, this.idToken);
          if (!publicUrl) {
            return {
              status: "error",
              result: {
                error_message: "Gagal mengunggah item gambar antrean ke cloud bucket."
              },
              state: this._gnState()
            };
          }
          uploadedUrls.push(publicUrl);
        }
        const payload = {
          mode: "edit",
          user_prompt: prompt.trim(),
          image_urls: uploadedUrls,
          source: "edit",
          device_id: this.deviceId,
          browser_fp: this.browserFp,
          ...rest
        };
        const response = await this.client.post(this.editUrl, payload, {
          headers: {
            "content-type": "application/json"
          }
        });
        rawResponse = response?.data;
        link = rawResponse?.link ? rawResponse.link : "";
      } else {
        console.log("[GeniGPT] Rute Operasi Terdeteksi: Pembuatan Gambar Baru (Text-to-Image)");
        const payload = {
          user_prompt: prompt.trim(),
          device_id: this.deviceId,
          browser_fp: this.browserFp,
          ...rest
        };
        const response = await this.client.post(this.t2iUrl, payload, {
          headers: {
            "content-type": "application/json"
          }
        });
        rawResponse = response?.data;
        link = rawResponse?.link ? rawResponse.link : "";
      }
      const finalUrl = link ? await this._pol(link) : "";
      console.log("[GeniGPT] Seluruh tahapan berhasil diselesaikan.");
      return {
        status: "success",
        result: {
          image_url: finalUrl,
          message: rawResponse?.message || "Proses selesai",
          request_id: rawResponse?.request_id || null,
          user_status: {
            is_pro: rawResponse?.userStatus?.isPro || false,
            remaining_usages: rawResponse?.userStatus?.remainingUsages || null,
            remaining_credits: rawResponse?.userStatus?.remainingCredits || null
          }
        },
        state: this._gnState()
      };
    } catch (err) {
      console.error("[GeniGPT] Kegagalan kritis pada alur eksekusi generator:", err?.message);
      return {
        status: "error",
        result: {
          error_message: err?.response?.data?.error || err?.message
        },
        state: this._gnState()
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
  const api = new GeniGPTClient();
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