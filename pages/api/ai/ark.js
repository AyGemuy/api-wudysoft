import axios from "axios";
import crypto from "crypto";
const CONFIG = {
  baseAuth: "https://appcommon.coocent.com",
  baseAi: "https://ark.cn-beijing.volces.com",
  prodId: "aimusic",
  packId: "aimusicgenerator.aimusic.aisongs",
  ver: "1.0.15",
  salt: "Coocent@Appcommonaimusic",
  ua: "okhttp/4.12.0"
};
class AiMusic {
  constructor() {
    this.key = null;
    this.model = null;
    this.messages = [];
  }
  sign(ts) {
    try {
      const rawString = CONFIG.salt + ts;
      const hash = crypto.createHash("md5").update(rawString).digest("hex");
      console.log(`[AiMusic][SIGN] String: "${rawString}" -> Hash: "${hash}"`);
      return hash;
    } catch (e) {
      console.error("[AiMusic][SIGN][ERR] Gagal membuat signature:", e.message);
      throw e;
    }
  }
  async auth() {
    try {
      console.log("[AiMusic][AUTH] Memulai proses autentikasi...");
      const ts = Date.now().toString();
      const signature = this.sign(ts);
      const payload = {
        productid: CONFIG.prodId,
        packid: CONFIG.packId,
        version: CONFIG.ver,
        ts: ts,
        sign: signature
      };
      console.log("[AiMusic][AUTH][REQ] POST /common/getapi ->", JSON.stringify(payload));
      const res = await axios.post(`${CONFIG.baseAuth}/common/getapi`, payload, {
        headers: {
          "User-Agent": CONFIG.ua,
          "Content-Type": "application/json",
          Connection: "Keep-Alive"
        }
      });
      console.log(`[AiMusic][AUTH][RES] Status: ${res.status} ->`, JSON.stringify(res.data));
      if (!res.data?.data?.success) {
        throw new Error(`Respons auth menyatakan gagal: ${JSON.stringify(res.data?.head || res.data)}`);
      }
      this.key = res.data.data.apiKey;
      this.model = res.data.data.resourceId;
      console.log(`[AiMusic][AUTH][OK] Token didapatkan. Model Endpoint: ${this.model}`);
      return {
        key: this.key,
        model: this.model
      };
    } catch (e) {
      console.error("[AiMusic][AUTH][FATAL]", e.response ? `Status: ${e.response.status} | Data: ${JSON.stringify(e.response.data)}` : e.message);
      throw e;
    }
  }
  async chat({
    prompt,
    messages = [],
    ...rest
  } = {}) {
    try {
      console.log("[AiMusic][CHAT] Memulai request chat...");
      if (!this.key || !this.model) {
        console.log("[AiMusic][CHAT] Token kosong, memicu auth() terlebih dahulu.");
        await this.auth();
      }
      if (messages.length > 0) {
        console.log(`[AiMusic][CHAT] Sinkronisasi ${messages.length} riwayat pesan dari parameter.`);
        this.messages = messages;
      }
      if (prompt) {
        console.log(`[AiMusic][CHAT] Auto-push prompt baru: "${prompt.substring(0, 50)}..."`);
        this.messages.push({
          role: "user",
          content: prompt
        });
      }
      if (this.messages.length === 0) {
        throw new Error("Gagal memproses request: parameter 'prompt' ataupun 'messages' tidak boleh kosong.");
      }
      const payload = {
        max_tokens: 1024,
        temperature: .1,
        model: this.model,
        messages: this.messages,
        ...rest
      };
      console.log(`[AiMusic][CHAT][REQ] POST /api/v3/chat/completions (Model: ${this.model})`);
      const res = await axios.post(`${CONFIG.baseAi}/api/v3/chat/completions`, payload, {
        headers: {
          "User-Agent": CONFIG.ua,
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.key}`
        }
      });
      console.log(`[AiMusic][CHAT][RES] Status: ${res.status}`);
      const reply = res.data?.choices?.[0]?.message;
      if (reply) {
        console.log(`[AiMusic][CHAT] Auto-push balasan AI ke riwayat: "${reply.content.substring(0, 50)}..."`);
        this.messages.push(reply);
      }
      return res.data;
    } catch (e) {
      if (e.response?.status === 401) {
        console.warn("[AiMusic][CHAT][401] Token terdeteksi expired. Menghapus token purba dan mencoba ulang...");
        this.key = null;
        this.model = null;
        return this.chat({
          prompt: prompt,
          ...rest
        });
      }
      console.error("[AiMusic][CHAT][FATAL]", e.response ? `Status: ${e.response.status} | Data: ${JSON.stringify(e.response.data)}` : e.message);
      throw e;
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
  const api = new AiMusic();
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