import axios from "axios";
class AiClient {
  constructor() {
    this.api = axios.create({
      baseURL: "https://asia-southeast1-ai-life-app-5263a.cloudfunctions.net",
      timeout: 6e4
    });
    this.pollInterval = 3e3;
    this.validModes = ["gem-chat", "gem-gen", "gem-vis", "leo-gen"];
    console.log("[AiClient] Endpoint-aligned system ready.");
  }
  async run(args = {}) {
    const type = args.type || "gem-chat";
    if (!this.validModes.includes(type)) {
      console.error(`[AiClient] Error: Mode '${type}' tidak dikenali.`);
      return {
        result: null,
        error: `Invalid mode '${type}'. Available: ${this.validModes.join(", ")}`
      };
    }
    const {
      prompt = "",
        messages = [],
        image, ...rest
    } = args;
    console.log(`[AiClient] [PROSES] Menjalankan rute: [${type}]`);
    try {
      if (type === "gem-chat" || type === "gem-gen") {
        if (!prompt.trim() && messages.length === 0) {
          throw new Error(`Mode '${type}' memerlukan parameter 'prompt' atau 'messages'.`);
        }
        if (prompt.trim()) messages.push({
          role: "user",
          text: prompt
        });
        console.log(`[AiClient] Membangun system prompt untuk ${type}...`);
        let sys = rest.sysPrompt || this._cp();
        sys = sys.replace(/{AI_NAME}/g, rest.aiName || "AI Life").replace(/{DATE}/g, this._td()).replace(/{HOUR}/g, new Date().getHours());
        if (rest.longMemory && rest.longMemory !== "TIDAK ADA") {
          sys += `\n\nINGATAN JANGKA PANJANG: ${rest.longMemory}.`;
        }
        if (rest.location?.trim()) {
          sys += ` Lokasi: ${rest.location}.`;
        }
        if (this._aq(prompt)) {
          sys += `\n\n${this._ag()}`;
        }
        const contents = this._bc(messages);
        const endpoint = type === "gem-gen" ? "/geminiGenerate" : "/geminiChat";
        const payload = {
          systemInstruction: sys,
          contents: contents
        };
        if (type === "gem-chat") payload.tools = [{
          googleSearch: {}
        }];
        console.log(`[AiClient] Mengirim payload ke ${endpoint}...`);
        const {
          data
        } = await this.api.post(endpoint, payload);
        const reply = this._ex(data);
        const mood = reply.match(/\|\s*MOOD:\s*(\w+)/)?.[1] || null;
        const clean = reply.replace(/\|\s*MOOD:\s*\w+/, "").trim();
        messages.push({
          role: "assistant",
          text: clean
        });
        console.log(`[AiClient] Sukses menyelesaikan rute [${type}].`);
        return {
          result: clean,
          mood: mood,
          messages: messages
        };
      }
      if (type === "gem-vis") {
        const parts = [];
        if (image) {
          console.log("[AiClient] Memproses muatan gambar untuk Vision...");
          const imgs = Array.isArray(image) ? image : [image];
          for (const img of imgs) {
            const b64 = await this._b64(img);
            parts.push({
              inlineData: {
                mimeType: "image/jpeg",
                data: b64
              }
            });
          }
        }
        parts.push({
          text: prompt.trim() || "Analisis objek/konteks ini secara rinci."
        });
        messages.push({
          role: "user",
          parts: parts
        });
        const sys = this._vp().replace(/{AI_NAME}/g, rest.aiName || "AI Life").replace(/{DATE}/g, this._td());
        console.log("[AiClient] Mengirim payload multimodal ke /geminiVision...");
        const {
          data
        } = await this.api.post("/geminiVision", {
          systemInstruction: sys,
          contents: messages
        });
        const resText = this._ex(data);
        console.log("[AiClient] Sukses menyelesaikan rute [gem-vis].");
        return {
          result: resText,
          messages: messages
        };
      }
      if (type === "leo-gen") {
        const w = this._cl(rest.w || 1024);
        const h = this._cl(rest.h || 1024);
        const payload = {
          prompt: prompt,
          width: w,
          height: h
        };
        if (image) {
          console.log("[AiClient] Gambar terdeteksi pada leo-gen. Mengaktifkan Mode Image-to-Image (I2I)...");
          const singleImg = Array.isArray(image) ? image[0] : image;
          payload.image_base64 = await this._b64(singleImg);
        } else {
          console.log("[AiClient] Tanpa gambar referensi. Mengaktifkan Mode Text-to-Image (T2I)...");
          if (!prompt.trim()) throw new Error("Mode Text-to-Image 'leo-gen' membutuhkan parameter 'prompt'.");
        }
        console.log("[AiClient] 🚀 Mendaftarkan tugas render ke /leonardoGenerate...");
        const {
          data
        } = await this.api.post("/leonardoGenerate", payload);
        const id = data?.generationId;
        if (!id) throw new Error("Gagal memperoleh generationId dari Leonardo.");
        console.log(`[AiClient] 🧠 Antrean aktif (ID: ${id}). Menjalankan loop polling status...`);
        let finalUrl = null;
        for (let i = 0; i < 60; i++) {
          await this._dl(this.pollInterval);
          console.log(`[AiClient] Polling status server ke-${i + 1}/60...`);
          try {
            const res = await this.api.post("/leonardoStatus", {
              generationId: id
            });
            const status = res.data?.status;
            if (status === "COMPLETE") {
              finalUrl = res.data?.imageUrl;
              break;
            }
            if (status === "FAILED") throw new Error("Generasi gambar gagal di server pusat Leonardo.");
          } catch (e) {
            console.warn(`[AiClient] [Warning] Kendala polling: ${e.message}`);
          }
        }
        if (!finalUrl) throw new Error("Batas waktu tunggu habis (Timeout Polling 3 Menit).");
        console.log("[AiClient] Sukses menyelesaikan rute [leo-gen].");
        return {
          result: finalUrl,
          generationId: id
        };
      }
    } catch (err) {
      console.error(`[AiClient] [FATAL] Kegagalan pada rute [${type}]:`, err.message);
      return {
        result: null,
        error: err.message,
        messages: messages
      };
    }
  }
  async _b64(m) {
    try {
      if (!m) throw new Error("Data berkas kosong.");
      if (typeof m === "string" && /^[A-Za-z0-9+/=]+$/.test(m.slice(0, 100))) return m;
      if (typeof m === "string" && m.startsWith("http")) {
        const {
          data
        } = await axios.get(m, {
          responseType: "arraybuffer",
          timeout: 2e4
        });
        return Buffer.from(data).toString("base64");
      }
      if (Buffer.isBuffer(m) || m instanceof ArrayBuffer) {
        return Buffer.from(m).toString("base64");
      }
      throw new Error("Format tidak didukung.");
    } catch (e) {
      throw new Error(`Gagal konversi Base64: ${e.message}`);
    }
  }
  _cl(d) {
    return Math.floor(Math.min(1536, Math.max(512, d)) / 8) * 8;
  }
  _dl(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  _ex(d) {
    return d?.candidates?.[0]?.content?.parts?.map(p => p.text).join("")?.trim() || "";
  }
  _bc(h) {
    return h.map(m => {
      if (m.parts) return m;
      let r = m.role === "assistant" ? "model" : "user";
      let t = m.text || "";
      if (r === "model" && t.startsWith("✨ ")) t = t.slice(2);
      return {
        role: r,
        parts: [{
          text: t
        }]
      };
    });
  }
  _aq(m) {
    return this._ak().split(",").map(k => k.trim().toLowerCase()).some(k => m.toLowerCase().includes(k));
  }
  _td() {
    return new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }
  _cp() {
    return `Kamu adalah {AI_NAME}, asisten hangat. Tanggal: {DATE}. Jam: {HOUR}. Sisipkan | MOOD: [Happy/Sad/Angry/Productive/Tired/Calm] di akhir.`;
  }
  _vp() {
    return `Kamu adalah {AI_NAME}, ahli melihat gambar. Tanggal: {DATE}. Jawab dengan bahasa santai.`;
  }
  _ag() {
    return `PANDUAN APLIKASI: Chat, AI Skills, Missions. Energy: chat=10, gambar=50.`;
  }
  _ak() {
    return `cara, fitur, tombol, menu, bantuan, help, poin, energi`;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new AiClient();
  try {
    const data = await api.run(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}