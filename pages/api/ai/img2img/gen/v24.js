import axios from "axios";
import PROMPT from "@/configs/ai-prompt";
import apiConfig from "@/configs/apiConfig";
const BASE = "https://ai-photo-studio-2025.vercel.app";
const SB = "https://jyiykmipgvcfdbdxwhmh.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aXlrbWlwZ3ZjZmRiZHh3aG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODczOTMsImV4cCI6MjA4MDI2MzM5M30.7pc5i9LaoIkwrt2cV7MoQFJGfO7IR9bInLirWv-7Jrg";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36";
const MAIL = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
const wait = ms => new Promise(r => setTimeout(r, ms));
class AiPhotoStudio {
  constructor() {
    this.token = null;
    this.credits = null;
    this.email = null;
    this.ax = axios.create({
      headers: {
        "User-Agent": UA,
        "sec-ch-ua": '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        dnt: "1",
        "accept-language": "id,ms;q=0.9,en;q=0.8"
      }
    });
  }
  encState() {
    const raw = JSON.stringify({
      token: this.token,
      email: this.email,
      credits: this.credits
    });
    return Buffer.from(raw).toString("base64");
  }
  decState(state) {
    try {
      const raw = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
      this.token = raw?.token || null;
      this.email = raw?.email || null;
      this.credits = raw?.credits ?? null;
    } catch (e) {
      throw new Error("decState: " + e?.message);
    }
  }
  async mkMail() {
    try {
      console.log("Creating temp email...");
      const {
        data
      } = await axios.get(`${MAIL}?action=create`);
      if (!data?.email) throw new Error("No email returned");
      console.log("Email:", data.email);
      return data.email;
    } catch (e) {
      throw new Error("mkMail: " + e?.message);
    }
  }
  async getOtp(email, retry = 60, ms = 3e3) {
    for (let i = 0; i < retry; i++) {
      try {
        await wait(ms);
        console.log(`Inbox check [${i + 1}/${retry}]...`);
        const {
          data
        } = await axios.get(`${MAIL}?action=message&email=${encodeURIComponent(email)}`);
        for (const m of data?.data || []) {
          const txt = m?.text_content || m?.html_content || m?.body || "";
          const url = txt.match(/https:\/\/jyiykmipgvcfdbdxwhmh\.supabase\.co\/auth\/v1\/verify\?[^\s"<>]+/)?.[0];
          if (url) {
            console.log("Verify URL found");
            return url;
          }
          const tok = txt.match(/token=([a-f0-9]{40,})/)?.[1];
          if (tok) return `${SB}/auth/v1/verify?token=${tok}&type=signup&redirect_to=${BASE}`;
        }
        console.log("No OTP yet");
      } catch (e) {
        console.log("Inbox error:", e?.message);
      }
    }
    throw new Error("OTP timeout");
  }
  async verify(url) {
    try {
      console.log("Verifying OTP...");
      const res = await axios.get(url, {
        maxRedirects: 5,
        headers: {
          "User-Agent": UA
        },
        validateStatus: s => s < 500
      });
      const final = res?.request?.res?.responseUrl || res?.config?.url || "";
      const tok = final.match(/access_token=([^&]+)/)?.[1] || (typeof res.data === "string" ? res.data : "").match(/access_token=([^&"'\s]+)/)?.[1];
      if (tok) return decodeURIComponent(tok);
      throw new Error("Token not found");
    } catch (e) {
      const redir = e?.request?._redirectable?._currentUrl || e?.response?.headers?.location || "";
      const tok = redir.match(/access_token=([^&]+)/)?.[1];
      if (tok) return decodeURIComponent(tok);
      throw new Error("verify: " + e?.message);
    }
  }
  async sync() {
    try {
      console.log("Syncing session...");
      const {
        data
      } = await this.ax.post(`${BASE}/api/sync`, {
        email: this.email,
        fullName: this.email,
        avatarUrl: "",
        sessionId: this.token
      }, {
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${this.token}`,
          origin: BASE,
          referer: `${BASE}/`
        }
      });
      this.credits = data?.credits ?? this.credits;
      console.log("Credits:", this.credits);
    } catch (e) {
      throw new Error("sync: " + e?.message);
    }
  }
  async ensureToken(state) {
    if (state) {
      this.decState(state);
      console.log("Restored state, email:", this.email);
      await this.sync();
      return;
    }
    if (this.token) {
      await this.sync();
      return;
    }
    try {
      this.email = await this.mkMail();
      const pass = "Aps" + Math.random().toString(36).slice(2, 10) + "A1!";
      console.log("Signing up...");
      await this.ax.post(`${SB}/auth/v1/signup?redirect_to=https://localhost/`, {
        email: this.email,
        password: pass,
        data: {
          full_name: this.email
        },
        gotrue_meta_security: {},
        code_challenge: null,
        code_challenge_method: null
      }, {
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${ANON}`,
          apikey: ANON,
          "x-supabase-api-version": "2024-01-01",
          "x-client-info": "supabase-js-web/2.86.0",
          "x-requested-with": "app.vercel.aiphotostudio2025",
          origin: "https://localhost",
          referer: "https://localhost/"
        }
      });
      const verifyUrl = await this.getOtp(this.email);
      this.token = await this.verify(verifyUrl);
      if (!this.token) throw new Error("Empty token");
      await this.sync();
      console.log("Ready ✓");
    } catch (e) {
      throw new Error("ensureToken: " + e?.message);
    }
  }
  async toB64(img) {
    try {
      if (!img) return null;
      if (typeof img === "string" && img.startsWith("data:")) return img;
      if (typeof img === "string" && /^https?:\/\//.test(img)) {
        console.log("Fetching image URL...");
        const r = await axios.get(img, {
          responseType: "arraybuffer"
        });
        return `data:${r.headers?.["content-type"] || "image/jpeg"};base64,${Buffer.from(r.data).toString("base64")}`;
      }
      if (Buffer.isBuffer(img)) return `data:image/jpeg;base64,${img.toString("base64")}`;
      return img;
    } catch (e) {
      throw new Error("toB64: " + e?.message);
    }
  }
  async generate({
    state,
    prompt,
    image,
    ...rest
  }) {
    try {
      await this.ensureToken(state || null);
      if ((this.credits ?? 0) <= 0) throw new Error("No credits: " + this.credits);
      console.log("Converting image...");
      const img = await this.toB64(image);
      console.log("Generating:", prompt);
      const {
        data
      } = await this.ax.post(`${BASE}/api/generate`, {
        image: img ?? null,
        prompt: prompt || PROMPT.text,
        temperature: rest?.temperature ?? 1,
        ...rest
      }, {
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${this.token}`,
          origin: BASE,
          referer: `${BASE}/`
        }
      });
      const raw = data?.result || data?.image || null;
      if (!raw) throw new Error("No image in response");
      const match = raw.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new Error("Invalid data URI");
      const contentType = match[1];
      const buffer = Buffer.from(match[2], "base64");
      const newState = this.encState();
      console.log("Done: got image ✓", contentType, buffer.length, "bytes");
      return {
        buffer: buffer,
        contentType: contentType,
        state: newState
      };
    } catch (e) {
      throw new Error("generate: " + e?.message);
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
  const api = new AiPhotoStudio();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}