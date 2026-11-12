import axios from "axios";
class NSFWChecker {
  constructor(cfg = {}) {
    try {
      this.base = cfg?.base || "https://justbuildthings.com";
      this.blobApi = cfg?.blobApi || "https://blob.vercel-storage.com";
      this.modelsApi = cfg?.modelsApi || "https://gen.pollinations.ai/text/models";
      this.ua = cfg?.ua || "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";
      this.defModel = cfg?.model || "mistral";
      this.cache = {
        ts: 0,
        data: null
      };
      this.ttl = 3e5;
      this.fallbackModels = [{
        value: "mistral",
        label: "Mistral",
        vision: true
      }, {
        value: "nova",
        label: "Nova",
        vision: true
      }, {
        value: "nova-fast",
        label: "Nova",
        vision: false
      }, {
        value: "openai",
        label: "OpenAI",
        vision: true
      }, {
        value: "gemini-fast",
        label: "Gemini",
        vision: true
      }, {
        value: "openai-large",
        label: "OpenAI Large",
        vision: true
      }, {
        value: "evil",
        label: "Evil",
        vision: true
      }];
      console.log("[PROSES] NSFWChecker instance berhasil dimuat.");
    } catch (err) {
      console.log(`[ERROR constructor]: ${err?.message}`);
    }
  }
  hdr(custom = {}) {
    try {
      return {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        origin: this.base,
        pragma: "no-cache",
        referer: `${this.base}/ai-image-analysis/nsfw-detection`,
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": this.ua,
        ...custom || {}
      };
    } catch (err) {
      console.log(`[ERROR hdr]: ${err?.message}`);
      return custom || {};
    }
  }
  rnd(len = 11) {
    try {
      return Math.random().toString(36).substring(2, 2 + (len || 11));
    } catch (err) {
      console.log(`[ERROR rnd]: ${err?.message}`);
      return Date.now().toString(36);
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
        ext: isPng ? "png" : isJpg ? "jpg" : isWebp ? "webp" : "png",
        type: isPng ? "image/png" : isJpg ? "image/jpeg" : isWebp ? "image/webp" : "image/png"
      };
    } catch (err) {
      console.log(`[ERROR mime]: ${err?.message}`);
      return {
        ext: "png",
        type: "image/png"
      };
    }
  }
  chk(params) {
    try {
      console.log("[PROSES] Memvalidasi kelayakan parameter input...");
      if (!params || typeof params !== "object") {
        throw new Error("Parameter harus berupa Object.");
      }
      if (!params?.image) {
        throw new Error('Parameter "image" wajib diisi (URL, Base64 string, atau Buffer).');
      }
      if (typeof params?.image !== "string" && !Buffer.isBuffer(params?.image)) {
        throw new Error('Tipe data "image" tidak valid (harus string URL, Base64, atau Buffer).');
      }
      return true;
    } catch (err) {
      console.log(`[ERROR chk]: ${err?.message}`);
      throw err;
    }
  }
  async mdl() {
    try {
      const now = Date.now();
      if (this.cache?.data && now - (this.cache?.ts || 0) < this.ttl) {
        console.log("[PROSES] Menggunakan daftar model dari cache.");
        return this.cache.data;
      }
      console.log("[PROSES] Mengambil model terbaru dari server Pollinations...");
      const res = await axios.get(this.modelsApi, {
        timeout: 7e3
      });
      const rawList = Array.isArray(res?.data) ? res.data : [];
      const banned = new Set(["qwen-safety", "jev"]);
      const filtered = rawList.filter(m => {
        const isBanned = banned.has(m?.name) || (m?.aliases || []).some(a => banned.has(a));
        const isComm = m?.community === true;
        const price = typeof m?.pricing?.completionTextTokens === "string" ? parseFloat(m.pricing.completionTextTokens) : m?.pricing?.completionTextTokens || 0;
        const isCheap = !isFinite(price) || price < 4e-5;
        return !isComm && !isBanned && isCheap;
      });
      const models = filtered.map(m => ({
        value: m?.name || m?.id,
        label: (m?.title || m?.description || m?.name || "").split(" ")[0],
        vision: m?.vision === true || (m?.input_modalities || []).includes("image") || false,
        aliases: m?.aliases || []
      }));
      this.cache = {
        ts: now,
        data: models?.length ? models : this.fallbackModels
      };
      return this.cache.data;
    } catch (err) {
      console.log(`[PERINGATAN mdl]: Gagal fetch model (${err?.message}), menggunakan fallback internal.`);
      this.cache = {
        ts: Date.now(),
        data: this.fallbackModels
      };
      return this.fallbackModels;
    }
  }
  async val(targetModel) {
    try {
      console.log(`[PROSES] Memvalidasi kompatibilitas model: "${targetModel || this.defModel}"...`);
      const models = await this.mdl();
      const query = (targetModel || this.defModel || "mistral").toLowerCase().trim();
      const matched = models.find(m => {
        const valMatch = (m?.value || "").toLowerCase() === query;
        const lblMatch = (m?.label || "").toLowerCase() === query;
        const aliasMatch = (m?.aliases || []).some(a => a.toLowerCase() === query);
        return (valMatch || lblMatch || aliasMatch) && m?.vision === true;
      });
      if (matched) {
        console.log(`[PROSES] Model valid & support Vision: ${matched.value}`);
        return matched.value;
      }
      console.log(`[PERINGATAN val]: Model "${query}" tidak support vision/tidak terdaftar. Fallback ke "${this.defModel}".`);
      return this.defModel;
    } catch (err) {
      console.log(`[ERROR val]: ${err?.message}`);
      return this.defModel;
    }
  }
  async buf(input) {
    try {
      console.log("[PROSES] Memproses resolusi payload gambar...");
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        if (input.startsWith("http://") || input.startsWith("https://")) {
          console.log("[PROSES] Mengunduh gambar via HTTP...");
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res?.data);
        }
        if (input.includes("base64,")) {
          console.log("[PROSES] Mengekstrak data URI Base64...");
          return Buffer.from(input.split("base64,")[1], "base64");
        }
        console.log("[PROSES] Decode Base64 string ke Buffer...");
        return Buffer.from(input, "base64");
      }
      throw new Error("Payload gambar gagal diubah ke buffer.");
    } catch (err) {
      console.log(`[ERROR buf]: ${err?.message}`);
      throw err;
    }
  }
  async tok(pathname) {
    try {
      console.log("[PROSES] Meminta upload token...");
      const url = `${this.base}/api/upload-temp-image`;
      const body = {
        type: "blob.generate-client-token",
        payload: {
          pathname: pathname,
          clientPayload: null,
          multipart: false
        }
      };
      const res = await axios.post(url, body, {
        headers: this.hdr({
          "content-type": "application/json"
        })
      });
      const token = res?.data?.clientToken || null;
      if (!token) throw new Error("Token vercel blob tidak ditemukan dalam respon.");
      return token;
    } catch (err) {
      console.log(`[ERROR tok]: ${err?.message}`);
      throw err;
    }
  }
  async put(fileBuf, pathname, mimeType, clientToken) {
    try {
      console.log("[PROSES] Mengunggah buffer gambar ke blob storage...");
      const putUrl = `${this.blobApi}/${pathname}`;
      const res = await axios.put(putUrl, fileBuf, {
        headers: {
          authorization: `Bearer ${clientToken}`,
          "x-api-version": "7",
          "content-type": mimeType || "image/png"
        }
      });
      const blobUrl = res?.data?.url || null;
      if (!blobUrl) throw new Error("Upload gagal, tidak ada URL yang dikembalikan.");
      return blobUrl;
    } catch (err) {
      console.log(`[ERROR put]: ${err?.message}`);
      throw err;
    }
  }
  prs(rawText = "") {
    try {
      console.log("[PROSES] Mem-parsing hasil komputasi model...");
      let meta = null;
      try {
        const match = rawText?.match(/\{[\s\S]*"shareCard"[\s\S]*\}/);
        meta = match ? JSON.parse(match[0]) : null;
      } catch (subErr) {
        console.log(`[PERINGATAN prs]: Gagal parse shareCard (${subErr?.message})`);
        meta = null;
      }
      const card = meta?.shareCard || {};
      const textLower = (rawText || "").toLowerCase();
      const verdict = (card?.verdict || "").toLowerCase();
      const hero = (card?.hero || "").toLowerCase();
      const isViolent = textLower.includes("violence") && !textLower.includes("no violence");
      const isExplicit = textLower.includes("explicit material") || textLower.includes("nudity") || textLower.includes("sexual");
      const isUnsafe = hero.includes("unsettling") || hero.includes("unsafe") || verdict.includes("unsafe") || isViolent || isExplicit;
      const heroScore = typeof card?.heroScore === "number" ? card.heroScore : 10;
      const heroMax = typeof card?.heroMax === "number" ? card.heroMax : 10;
      const safeRatio = heroScore / (heroMax || 10);
      const rawConf = isUnsafe ? 1 - safeRatio + .3 : safeRatio;
      const confidence = Number(Math.min(Math.max(rawConf, .05), .99).toFixed(2));
      let labelName = "Safe";
      let labelId = 0;
      if (isUnsafe) {
        if (isExplicit) {
          labelName = "Explicit / Adult Content";
          labelId = 1;
        } else if (isViolent) {
          labelName = "Violence / Gore";
          labelId = 2;
        } else {
          labelName = "Disturbing / Sensitive";
          labelId = 3;
        }
      }
      return {
        isNsfw: isUnsafe,
        labelName: labelName,
        labelId: labelId,
        confidence: confidence,
        scores: {
          rawHeroScore: heroScore,
          rawHeroMax: heroMax,
          rawVerdict: card?.verdict || "No verdict details provided.",
          details: card?.rows || []
        }
      };
    } catch (err) {
      console.log(`[ERROR prs]: ${err?.message}`);
      return {
        isNsfw: false,
        labelName: "Uncertain",
        labelId: -1,
        confidence: 0,
        scores: {
          error: err?.message
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
      console.log("[PROSES] Inisialisasi proses pengecekan NSFW...");
      const imageBuf = await this.buf(image);
      const {
        ext,
        type
      } = this.mime(imageBuf);
      const pathname = `temp-images/${Date.now()}-${this.rnd(11)}.${ext}`;
      const selectedModel = await this.val(rest?.model);
      const token = await this.tok(pathname);
      const publicUrl = await this.put(imageBuf, pathname, type, token);
      console.log(`[PROSES] URL Gambar berhasil dibuat: ${publicUrl}`);
      const enhancedPrompt = prompt || "Analyze this image strictly for adult, sexual, explicit, graphic violence, or unsuitable content. " + "Identify whether it contains nudity, intimate exposure, or disturbing material. Provide explicit content ratings.";
      const payload = {
        image: publicUrl,
        images: [publicUrl],
        prompt: enhancedPrompt,
        notes: notes || "NSFW Verification",
        toolType: rest?.toolType || "general",
        toolId: rest?.toolId || "nsfw-detection",
        model: selectedModel,
        source: rest?.source || "enterprise"
      };
      let attempt = 0;
      const maxRetries = rest?.maxRetries || 3;
      let apiRes = null;
      while (attempt < maxRetries) {
        attempt++;
        try {
          console.log(`[PROSES] Eksekusi analisis AI (Model: ${selectedModel}, Percobaan ${attempt}/${maxRetries})...`);
          apiRes = await axios.post(`${this.base}/api/analyze-enterprise`, payload, {
            headers: this.hdr({
              "content-type": "application/json",
              cookie: "__client_uat=0; __client_uat_bCEXjCh6=0"
            })
          });
          if (apiRes?.data) break;
        } catch (pollErr) {
          console.log(`[PERINGATAN] Percobaan ke-${attempt} gagal: ${pollErr?.message}`);
          if (attempt >= maxRetries) throw pollErr;
          await this.slp(1500);
        }
      }
      const rawResult = typeof apiRes?.data === "string" ? apiRes.data : JSON.stringify(apiRes?.data);
      const parsed = this.prs(rawResult);
      const isNsfw = parsed?.isNsfw || false;
      const confidence = parsed?.confidence || 0;
      const labelName = parsed?.labelName || "Unknown";
      const labelId = parsed?.labelId || 0;
      const scores = parsed?.scores || {};
      console.log("[PROSES] Pemeriksaan tuntas.");
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
  const api = new NSFWChecker();
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