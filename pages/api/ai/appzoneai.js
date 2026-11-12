import axios from "axios";
import crypto from "crypto";
class AppZoneAI {
  constructor() {
    this.key = "az-chatai-key";
    this.base = "https://api.appzoneai.com/v1";
    this.uId = `$RCAnonymousID:${crypto.randomBytes(16).toString("hex")}`;
    this.hdrs = {
      "User-Agent": "okhttp/4.12.0",
      "Accept-Encoding": "gzip",
      authorization: `Bearer ${this.key}`,
      "x-app-version": "1.0.18",
      "x-user-id": this.uId,
      "x-package-name": "com.appzone.chatbotai",
      "x-platform-type": "android"
    };
  }
  async mdls() {
    console.log("[PROSES] Mengambil list model...");
    try {
      const res = await axios.request({
        method: "GET",
        url: `${this.base}/chat/models?t=${Date.now()}`,
        headers: this.hdrs
      });
      const list = res?.data?.models || [];
      const vMdls = list.filter(m => m?.is_pro === false);
      console.log(`[SUKSES] Ditemukan ${vMdls.length} model non-pro.`);
      return {
        status: true,
        result: vMdls
      };
    } catch (err) {
      console.error("[GAGAL] Gagal mengambil model:", err?.message || err);
      return {
        status: false,
        result: err?.message || "Error"
      };
    }
  }
  async chat({
    prompt,
    messages,
    model,
    media,
    ...rest
  }) {
    console.log("[PROSES] Memulai sesi chat...");
    try {
      const mRes = await this.mdls();
      const vMdls = mRes.status ? mRes.result : [];
      let tMdl = model || "gpt-5.4-mini";
      const hasMdl = vMdls.some(m => m.id === tMdl || m.aliases && m.aliases.includes(tMdl));
      if (!hasMdl) {
        const fb = vMdls[0]?.id || "gpt-5.4-mini";
        console.warn(`[VALIDASI] Model "${tMdl}" tidak valid/Pro. Dialihkan ke: "${fb}"`);
        tMdl = fb;
      }
      const fMsgs = messages ? [...messages] : [];
      const cnts = [];
      if (prompt) cnts.push({
        type: "text",
        text: prompt
      });
      if (media) {
        const mArr = Array.isArray(media) ? media : [media];
        for (const itm of mArr) {
          if (typeof itm === "string") {
            if (itm.startsWith("http://") || itm.startsWith("https://") || itm.startsWith("data:")) {
              cnts.push({
                type: "image_url",
                image_url: {
                  url: itm
                }
              });
            } else {
              cnts.push({
                type: "text",
                text: itm
              });
            }
          } else if (Buffer.isBuffer(itm)) {
            const b64 = itm.toString("base64");
            cnts.push({
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${b64}`
              }
            });
          }
        }
      }
      if (cnts.length > 0) {
        fMsgs.push({
          role: "user",
          content: cnts
        });
      }
      const pld = {
        model: tMdl,
        stream: true,
        messages: fMsgs,
        isSubscribed: false,
        web_search: false,
        reason: false,
        study_mode: false
      };
      const body = {
        ...pld,
        ...rest
      };
      const res = await axios.request({
        method: "POST",
        url: `${this.base}/chat/completions`,
        headers: {
          ...this.hdrs,
          "Content-Type": "application/json",
          Accept: "text/event-stream"
        },
        data: JSON.stringify(body),
        responseType: "stream"
      });
      if (body.stream) {
        return new Promise(resolve => {
          let txt = "";
          let buf = "";
          const chks = [];
          res.data.on("data", chunk => {
            buf += chunk.toString();
            const lns = buf.split("\n");
            buf = lns.pop() || "";
            for (const ln of lns) {
              const cln = ln.trim();
              if (!cln || cln === "data: [DONE]") continue;
              if (cln.startsWith("data: ")) {
                try {
                  const raw = cln.slice(6);
                  const prs = JSON.parse(raw);
                  if (prs?.type === "keepalive") continue;
                  chks.push(prs);
                  const ct = prs?.choices?.[0]?.delta?.content || "";
                  if (ct) txt += ct;
                } catch (e) {}
              }
            }
          });
          res.data.on("end", () => {
            console.log("\n[SUKSES] Stream selesai.");
            resolve({
              status: true,
              result: txt.trim(),
              chunks: chks
            });
          });
          res.data.on("error", err => {
            console.error("[GAGAL] Error saat streaming:", err.message);
            resolve({
              status: false,
              result: err.message,
              chunks: []
            });
          });
        });
      }
      console.log("[SUKSES] Respon non-stream berhasil didapatkan.");
      return {
        status: true,
        result: res?.data || "",
        chunks: []
      };
    } catch (err) {
      console.error("[GAGAL] Terjadi kesalahan pada chat:", err?.message || err);
      return {
        status: false,
        result: err?.message || "Error",
        chunks: []
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
  const api = new AppZoneAI();
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