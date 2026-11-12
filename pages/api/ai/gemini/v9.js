import axios from "axios";
import crypto from "crypto";
const CFG = {
  BASE: "https://gemini.fluxta.io",
  GPK: "gpk_42df7b7b914d2af65d82a4b0f15f4e1a1b831da758b45b5baa7350a5fb98b0e5",
  SEC: "DPar3Dtp1cTe9ieYJtRavFyZtTse372Wli7wVL5+ydE=",
  SALT: [66, 31, 167, 99, 92, 157, 46, 212, 137, 55, 188],
  SHF: [1, 3, 5, 7]
};
class PixEngine {
  constructor() {
    this.http = axios.create({
      baseURL: CFG.BASE
    });
    this.token = null;
  }
  obf(id) {
    const buf = Buffer.from(id, "utf8");
    const out = Buffer.alloc(buf.length);
    for (let i = 0; i < buf.length; i++) {
      const s = CFG.SALT[i % CFG.SALT.length];
      const h = CFG.SHF[i % CFG.SHF.length];
      let c = buf[i] ^ s;
      c = (c << h | c >>> 8 - h) & 255;
      out[i] = c ^ 90;
    }
    return out.toString("base64");
  }
  der(nonce) {
    const sec = Buffer.from(CFG.SEC, "base64");
    const gpk = Buffer.from(CFG.GPK, "utf8");
    const ikm = Buffer.concat([sec, nonce]);
    const prk = crypto.createHmac("sha256", ikm).update(gpk).digest();
    return crypto.createHmac("sha256", prk).update(Buffer.from([1])).digest();
  }
  enc(data) {
    const n = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const k = this.der(n);
    const cipher = crypto.createCipheriv("aes-256-gcm", k, iv);
    const body = JSON.stringify(data);
    const res = Buffer.concat([cipher.update(body, "utf8"), cipher.final()]);
    return Buffer.from(JSON.stringify({
      nonce: n.toString("base64"),
      iv: iv.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
      ciphertext: res.toString("base64"),
      timestamp: Date.now()
    })).toString("base64");
  }
  dec(raw) {
    const d = JSON.parse(Buffer.from(raw, "base64").toString());
    const k = this.der(Buffer.from(d.nonce, "base64"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", k, Buffer.from(d.iv, "base64"));
    decipher.setAuthTag(Buffer.from(d.authTag, "base64"));
    let res = decipher.update(Buffer.from(d.ciphertext, "base64"), null, "utf8");
    return JSON.parse(res + decipher.final("utf8"));
  }
  async auth() {
    try {
      console.log("[Process] Authenticating...");
      const id = crypto.randomBytes(8).toString("hex");
      const oid = this.obf(id);
      const {
        data: chal
      } = await this.http.post("/auth/client/challenge", {
        androidId: oid
      });
      const {
        data: ver
      } = await this.http.post("/auth/client/verify", {
        androidId: oid,
        challenge: chal?.challenge
      });
      this.token = ver?.accessToken || null;
      console.log("[Process] Token acquired.");
      return this.token;
    } catch (e) {
      console.error("[Error Auth]", e?.response?.data || e.message);
      throw e;
    }
  }
  async _resolveMedia(item) {
    if (Buffer.isBuffer(item)) {
      return {
        inlineData: {
          data: item.toString("base64"),
          mimeType: "image/jpeg"
        }
      };
    }
    if (typeof item === "string") {
      if (item.startsWith("http")) {
        const response = await axios.get(item, {
          responseType: "arraybuffer"
        });
        const mime = response.headers["content-type"] || "image/jpeg";
        return {
          inlineData: {
            data: Buffer.from(response.data).toString("base64"),
            mimeType: mime
          }
        };
      }
      if (item.startsWith("data:")) {
        const [meta, data] = item.split(",");
        const mime = meta.split(":")[1].split(";")[0];
        return {
          inlineData: {
            data: data,
            mimeType: mime
          }
        };
      }
      return {
        inlineData: {
          data: item,
          mimeType: "image/jpeg"
        }
      };
    }
    return null;
  }
  async chat({
    prompt,
    messages = [],
    media = [],
    endpoint = "/models/gemini-2.0-flash:generateContent",
    temperature = .3,
    ...rest
  }) {
    try {
      if (!this.token) await this.auth();
      console.log("[Process] Preparing chat payload...");
      if (prompt) {
        messages.push({
          role: "user",
          parts: [{
            text: prompt
          }]
        });
      }
      if (media.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === "user") {
          for (const m of media) {
            const resolved = await this._resolveMedia(m);
            if (resolved) lastMsg.parts.push(resolved);
          }
        }
      }
      const payload = {
        contents: messages,
        generationConfig: {
          temperature: rest?.temp || temperature,
          ...rest
        }
      };
      console.log("[Process] Sending encrypted message to:", endpoint);
      const {
        data: res
      } = await this.http.post("/gemini/v2/proxy-message", {
        endpoint: endpoint,
        encryptedPayload: this.enc(payload)
      }, {
        headers: {
          "X-API-Key": CFG.GPK,
          Authorization: `Bearer ${this.token}`
        }
      });
      const result = this.dec(res?.encryptedPayload);
      console.log("[Process] Success.");
      return result;
    } catch (e) {
      console.error("[Error Chat]", e?.response?.data || e.message);
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
  const api = new PixEngine();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}