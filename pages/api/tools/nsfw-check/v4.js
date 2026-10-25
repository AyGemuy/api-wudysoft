import axios from "axios";
class ImageDescriberNSFW {
  constructor(cfg = {}) {
    try {
      this.base = cfg?.base || "https://imagedescriber.online";
      this.actionId = cfg?.actionId || "dcc6171b0eec12fa20380b9479b278e9620952bd";
      this.fHeader = cfg?.fHeader || "42710acca3fb1b15d6485908252fad37";
      this.ua = cfg?.ua || "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";
      this.cookies = {
        NEXT_LOCALE: "en",
        __client_uat: "0"
      };
      console.log("[PROSES] ImageDescriberNSFW instance berhasil dimuat.");
    } catch (err) {
      console.log(`[ERROR constructor]: ${err?.message}`);
    }
  }
  sck(res) {
    try {
      const setCookies = res?.headers?.["set-cookie"] || [];
      const cookieArr = Array.isArray(setCookies) ? setCookies : [setCookies];
      let count = 0;
      for (const item of cookieArr) {
        if (!item || typeof item !== "string") continue;
        const [pair] = item.split(";");
        const [k, ...v] = pair.split("=");
        if (k && v?.length) {
          this.cookies[k.trim()] = v.join("=").trim();
          count++;
        }
      }
      if (count > 0) {
        console.log(`[PROSES] Berhasil meng-intercept ${count} cookie baru dari server.`);
      }
    } catch (err) {
      console.log(`[ERROR sck]: ${err?.message}`);
    }
  }
  gck() {
    try {
      return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    } catch (err) {
      console.log(`[ERROR gck]: ${err?.message}`);
      return "NEXT_LOCALE=en; __client_uat=0";
    }
  }
  async ses() {
    try {
      console.log("[PROSES] Melakukan handshake session awal untuk sinkronisasi cookie...");
      const res = await axios.get(`${this.base}/tools/chat-with-image-ai`, {
        headers: this.hdr(),
        timeout: 1e4
      });
      this.sck(res);
      const html = typeof res?.data === "string" ? res.data : "";
      const matchAction = html.match(/"actionId":"([a-f0-9]{40})"/i) || html.match(/\$ACTION_ID_([a-f0-9]{40})/i);
      if (matchAction?.[1]) {
        this.actionId = matchAction[1];
        console.log(`[PROSES] Auto-update actionId: ${this.actionId}`);
      }
      return true;
    } catch (err) {
      console.log(`[PERINGATAN ses]: Preflight gagal (${err?.message}), menggunakan cookie lokal.`);
      return false;
    }
  }
  hdr(custom = {}) {
    try {
      return {
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        origin: this.base,
        pragma: "no-cache",
        referer: `${this.base}/tools/chat-with-image-ai`,
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": this.ua,
        cookie: this.gck(),
        ...custom || {}
      };
    } catch (err) {
      console.log(`[ERROR hdr]: ${err?.message}`);
      return custom || {};
    }
  }
  rnd(len = 6) {
    try {
      return Math.floor(1e5 + Math.random() * 9e5).toString().substring(0, len || 6);
    } catch (err) {
      console.log(`[ERROR rnd]: ${err?.message}`);
      return "366063";
    }
  }
  slp(ms = 1e3) {
    try {
      return new Promise(res => setTimeout(res, ms || 1e3));
    } catch (err) {
      console.log(`[ERROR slp]: ${err?.message}`);
      return Promise.resolve();
    }
  }
  mime(buf) {
    try {
      const hex = buf?.slice(0, 4)?.toString("hex")?.toLowerCase() || "";
      const isPng = hex.startsWith("89504e47");
      const isJpg = hex.startsWith("ffd8");
      const isWebp = hex.startsWith("52494646");
      return {
        ext: isPng ? "png" : isJpg ? "jpeg" : isWebp ? "webp" : "jpeg",
        type: isPng ? "image/png" : isJpg ? "image/jpeg" : isWebp ? "image/webp" : "image/jpeg"
      };
    } catch (err) {
      console.log(`[ERROR mime]: ${err?.message}`);
      return {
        ext: "jpeg",
        type: "image/jpeg"
      };
    }
  }
  chk(params) {
    try {
      console.log("[PROSES] Memvalidasi parameter input...");
      if (!params || typeof params !== "object") {
        throw new Error("Parameter harus berupa Object.");
      }
      if (!params?.image) {
        throw new Error('Parameter "image" wajib diisi (URL, Base64 string, atau Buffer).');
      }
      if (typeof params?.image !== "string" && !Buffer.isBuffer(params?.image)) {
        throw new Error("Tipe format gambar tidak didukung.");
      }
      return true;
    } catch (err) {
      console.log(`[ERROR chk]: ${err?.message}`);
      throw err;
    }
  }
  async buf(input) {
    try {
      console.log("[PROSES] Memproses parsing input gambar...");
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          console.log("[PROSES] Mengunduh gambar remote via URL...");
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res?.data);
        }
        if (input.includes("base64,")) {
          console.log("[PROSES] Mengurai data URI Base64...");
          return Buffer.from(input.split("base64,")[1], "base64");
        }
        console.log("[PROSES] Mengurai raw Base64 string...");
        return Buffer.from(input, "base64");
      }
      throw new Error("Gagal mengekstrak binary gambar.");
    } catch (err) {
      console.log(`[ERROR buf]: ${err?.message}`);
      throw err;
    }
  }
  async r2(mimeType = "image/jpeg") {
    try {
      console.log("[PROSES] Mengambil Cloudflare R2 Presigned URL...");
      const url = `${this.base}/tools/chat-with-image-ai`;
      const res = await axios.post(url, JSON.stringify([mimeType]), {
        headers: this.hdr({
          accept: "text/x-component",
          "content-type": "text/plain;charset=UTF-8",
          "next-action": this.actionId,
          "next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22tools%22%2C%7B%22children%22%3A%5B%22chat-with-image-ai%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Ftools%2Fchat-with-image-ai%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%5D"
        })
      });
      this.sck(res);
      const raw = typeof res?.data === "string" ? res.data : JSON.stringify(res?.data);
      const targetLine = raw.split("\n").find(line => line.includes("preSignedUrl") && line.includes("publicGetUrl"));
      if (!targetLine) {
        throw new Error("Gagal mengekstrak respon JSON presigned URL.");
      }
      const jsonStr = targetLine.replace(/^\d+:/, "").trim();
      const parsed = JSON.parse(jsonStr);
      const preSignedUrl = parsed?.data?.preSignedUrl || null;
      const publicGetUrl = parsed?.data?.publicGetUrl || null;
      if (!preSignedUrl || !publicGetUrl) {
        throw new Error("Respon R2 Presign tidak lengkap.");
      }
      return {
        preSignedUrl: preSignedUrl,
        publicGetUrl: publicGetUrl
      };
    } catch (err) {
      console.log(`[ERROR r2]: ${err?.message}`);
      throw err;
    }
  }
  async put(preSignedUrl, fileBuf, mimeType) {
    try {
      console.log("[PROSES] Mengunggah file ke Cloudflare R2 Storage...");
      await axios.put(preSignedUrl, fileBuf, {
        headers: {
          "Content-Type": mimeType || "image/jpeg"
        }
      });
      return true;
    } catch (err) {
      console.log(`[ERROR put]: ${err?.message}`);
      throw err;
    }
  }
  sse(streamText = "") {
    try {
      console.log("[PROSES] Menggabungkan chunk teks Server-Sent Events (SSE)...");
      const lines = (streamText || "").split("\n");
      let combined = "";
      for (const line of lines) {
        if (line.startsWith("data:")) {
          const content = line.slice(5).trim();
          try {
            combined += JSON.parse(content);
          } catch {
            combined += content;
          }
        }
      }
      return combined.trim();
    } catch (err) {
      console.log(`[ERROR sse]: ${err?.message}`);
      return streamText || "";
    }
  }
  prs(rawText = "") {
    try {
      console.log("[PROSES] Menganalisis respon klasifikasi visual...");
      const textLower = (rawText || "").toLowerCase();
      const isBlockedBySafety = textLower.includes("error occurred while processing") || textLower.includes("safety policy") || textLower.includes("content policy") || textLower.includes("violat");
      if (isBlockedBySafety) {
        console.log("[PROSES] Terdeteksi penolakan filter moderasi AI (indikasi kuat NSFW/Inappropriate Content).");
        return {
          isNsfw: true,
          labelName: "NSFW / Moderation Policy Triggered",
          labelId: 1,
          confidence: .99,
          scores: {
            analysis: "Permintaan analisis ditolak oleh safety filter AI server. Gambar terindikasi mengandung materi eksplisit/NSFW yang melanggar kebijakan moderasi."
          }
        };
      }
      const hasSafeKeywords = textLower.includes("not nsfw") || textLower.includes("is not nsfw") || textLower.includes("safe for work") || textLower.includes("no elements related to nudity") || textLower.includes("no explicit");
      const hasNsfwKeywords = textLower.includes("is nsfw") || textLower.includes("contains nsfw") || textLower.includes("explicit content") || textLower.includes("nudity") || textLower.includes("pornographic") || textLower.includes("sexual") || textLower.includes("violence") || textLower.includes("gore");
      const isNsfw = hasNsfwKeywords && !hasSafeKeywords;
      let labelName = "Safe";
      let labelId = 0;
      let confidence = .95;
      if (isNsfw) {
        if (textLower.includes("nudity") || textLower.includes("sexual") || textLower.includes("porn")) {
          labelName = "Explicit / Adult Content";
          labelId = 1;
          confidence = .98;
        } else if (textLower.includes("violence") || textLower.includes("gore") || textLower.includes("blood")) {
          labelName = "Violence / Gore";
          labelId = 2;
          confidence = .92;
        } else {
          labelName = "Potentially Sensitive / NSFW";
          labelId = 3;
          confidence = .88;
        }
      } else {
        confidence = hasSafeKeywords ? .97 : .85;
      }
      return {
        isNsfw: isNsfw,
        labelName: labelName,
        labelId: labelId,
        confidence: confidence,
        scores: {
          analysis: rawText || "Tidak ada deskripsi visual lanjutan."
        }
      };
    } catch (err) {
      console.log(`[ERROR prs]: ${err?.message}`);
      return {
        isNsfw: true,
        labelName: "NSFW / Policy Triggered",
        labelId: 1,
        confidence: .95,
        scores: {
          analysis: err?.message
        }
      };
    }
  }
  async checkNSFW({
    image,
    prompt,
    notes,
    ...rest
  }) {
    try {
      this.chk({
        image: image,
        prompt: prompt,
        notes: notes,
        ...rest
      });
      await this.ses();
      console.log("[PROSES] Memulai pipeline NSFW via ImageDescriber...");
      const imageBuf = await this.buf(image);
      const {
        type
      } = this.mime(imageBuf);
      const {
        preSignedUrl,
        publicGetUrl
      } = await this.r2(type);
      await this.put(preSignedUrl, imageBuf, type);
      console.log(`[PROSES] Gambar berhasil diunggah ke R2: ${publicGetUrl}`);
      const enhancedPrompt = prompt || "Analyze this image strictly for NSFW elements. Explicitly determine if it contains nudity, sexual content, graphic violence, or gore. " + "Start your answer with whether it is NSFW or NOT NSFW, followed by an objective description.";
      const payload = {
        message: enhancedPrompt,
        image: publicGetUrl,
        history: rest?.history || [],
        lang: rest?.lang || "en"
      };
      let attempt = 0;
      const maxRetries = rest?.maxRetries || 3;
      let combinedText = "";
      while (attempt < maxRetries) {
        attempt++;
        try {
          console.log(`[PROSES] Mengirim permintaan analisis AI (Percobaan ${attempt}/${maxRetries})...`);
          const apiRes = await axios.post(`${this.base}/api/chat-with-image`, payload, {
            headers: this.hdr({
              "content-type": "application/json",
              accept: "*/*",
              f: this.fHeader
            }),
            responseType: "text"
          });
          this.sck(apiRes);
          combinedText = this.sse(apiRes?.data);
          if (combinedText) break;
        } catch (pollErr) {
          console.log(`[PERINGATAN] Percobaan ke-${attempt} gagal: ${pollErr?.message}`);
          if (attempt >= maxRetries) throw pollErr;
          await this.ses();
          await this.slp(2e3);
        }
      }
      const parsed = this.prs(combinedText);
      const isNsfw = parsed?.isNsfw || false;
      const confidence = parsed?.confidence || 0;
      const labelName = parsed?.labelName || "Safe";
      const labelId = parsed?.labelId || 0;
      const scores = parsed?.scores || {};
      console.log("[PROSES] Deteksi selesai.");
      return {
        success: true,
        code: 200,
        result: {
          isNsfw: isNsfw,
          labelName: labelName,
          labelId: labelId,
          confidence: confidence,
          percentage: (confidence * 100).toFixed(2) + "%",
          scores: scores,
          message: isNsfw ? "Gambar terdeteksi mengandung konten NSFW." : "Gambar tidak terdeteksi mengandung konten NSFW."
        }
      };
    } catch (err) {
      console.log(`[ERROR checkNSFW]: ${err?.message}`);
      const isNsfw = false;
      const confidence = 0;
      return {
        success: false,
        code: err?.response?.status || 500,
        result: {
          isNsfw: isNsfw,
          labelName: "Failed",
          labelId: -1,
          confidence: confidence,
          percentage: (confidence * 100).toFixed(2) + "%",
          scores: {
            error: err?.message
          },
          message: isNsfw ? "Gambar terdeteksi mengandung konten NSFW." : "Gambar tidak terdeteksi mengandung konten NSFW."
        }
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
  const api = new ImageDescriberNSFW();
  try {
    const data = await api.checkNSFW(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}