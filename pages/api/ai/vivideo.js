import axios from "axios";
import apiConfig from "@/configs/apiConfig";
const FB_KEY = "AIzaSyD-G_qE6gjWRepHkaHWzb_uULrBDEYLvpk";
const MAIL = `https://${apiConfig.DOMAIN_URL}/api/mails/v27`;
const API = "https://api.vivideo.ai";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const H_FB = {
  "content-type": "application/json",
  "user-agent": UA
};
const H_API = {
  "content-type": "application/json",
  "user-agent": UA,
  origin: "https://app.vivideo.ai",
  referer: "https://app.vivideo.ai/"
};
const log = (...a) => console.log("[vivideo]", ...a);
const wait = ms => new Promise(r => setTimeout(r, ms));
async function b64(input) {
  try {
    if (Buffer.isBuffer(input)) {
      log("   b64: buffer input");
      return input.toString("base64");
    }
    if (typeof input === "string" && !input.startsWith("http")) {
      log("   b64: raw base64 input");
      return input;
    }
    log(`   b64: fetching url ${input.slice(0, 60)}...`);
    const res = await axios.get(input, {
      responseType: "arraybuffer"
    });
    log("   b64: url fetched ✓");
    return Buffer.from(res.data).toString("base64");
  } catch (e) {
    log("❌ b64 error:", e.message);
    throw e;
  }
}

function mime(b64str) {
  const sig = b64str.slice(0, 8);
  if (sig.startsWith("/9j/")) return "image/jpeg";
  if (sig.startsWith("iVBOR")) return "image/png";
  if (sig.startsWith("R0lGO")) return "image/gif";
  if (sig.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

function oobFrom(html) {
  const m = html?.match(/oobCode=([^&'"]+)/);
  return m?.[1] ?? null;
}
async function pollMail(email, token, iv = 3e3, max = 30) {
  for (let i = 0; i < max; i++) {
    try {
      log(`📬 poll mail (${i + 1}/${max})...`);
      const {
        data
      } = await axios.get(`${MAIL}?action=message&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
      if (data?.messages_list?.length) {
        log("   mail arrived ✓");
        return data;
      }
      log("   no mail yet, waiting...");
    } catch (e) {
      log("   poll mail error:", e.message, "— retrying...");
    }
    await wait(iv);
  }
  throw new Error("pollMail timeout — no message received");
}
class Vivideo {
  constructor() {
    this.idToken = null;
    this.fbUid = null;
    this.uid = null;
    this.email = null;
    this.mailState = null;
    this.oob = null;
  }
  async auth() {
    if (this.uid) {
      log("✅ auth: already authenticated");
      return this;
    }
    log("🔐 auth: starting full auth flow...");
    try {
      log("📧 mkMail: creating temp email...");
      const {
        data: mail
      } = await axios.get(`${MAIL}?action=create`);
      this.email = mail.email;
      this.mailState = mail.token;
      log(`   email: ${this.email} ✓`);
      log("📤 sendOob: sending firebase sign-in link...");
      await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FB_KEY}`, {
        requestType: "EMAIL_SIGNIN",
        email: this.email,
        clientType: "CLIENT_TYPE_WEB",
        continueUrl: "https://app.vivideo.ai/login",
        canHandleCodeInApp: true
      }, {
        headers: H_FB
      });
      log("   OOB sent ✓");
      log("📨 getOob: waiting for email...");
      const mailData = await pollMail(this.email, this.mailState);
      const html = mailData?.messages_list?.[0]?.body?.html ?? "";
      this.oob = oobFrom(html);
      if (!this.oob) throw new Error("getOob: oobCode not found in email");
      log(`   oobCode: ${this.oob.slice(0, 12)}... ✓`);
      log("🔑 signIn: exchanging oobCode for idToken...");
      const {
        data: sign
      } = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithEmailLink?key=${FB_KEY}`, {
        email: this.email,
        oobCode: this.oob
      }, {
        headers: H_FB
      });
      this.idToken = sign.idToken;
      this.fbUid = sign.localId;
      log(`   fbUid: ${this.fbUid} ✓`);
      log("👤 getUid: fetching vivideo user_id...");
      const {
        data: uidRes
      } = await axios.post(`${API}/get-user-id`, {
        user_email: this.email,
        firebase_uid: this.fbUid,
        platform: "web"
      }, {
        headers: H_API
      });
      this.uid = uidRes.user_id;
      if (!this.uid) throw new Error("getUid: no user_id in response");
      log(`   uid: ${this.uid} ✓`);
      log("✅ auth: complete");
      return this;
    } catch (e) {
      log("❌ auth failed:", e.message);
      throw e;
    }
  }
  async upImg(input) {
    log("📁 upImg: uploading image...");
    try {
      const raw = await b64(input);
      const type = mime(raw);
      const ext = type.split("/")[1] ?? "jpg";
      const name = `upload_${Date.now()}.${ext}`;
      log(`   mime: ${type}, file: ${name}`);
      log("   upImg: getting presigned S3 URL...");
      const {
        data: up
      } = await axios.post(`${API}/file-upload`, {
        user_id: this.uid,
        file_name: name,
        file_type: type
      }, {
        headers: H_API
      });
      if (!up.upload_url || !up.public_url) throw new Error("Missing upload URLs");
      log("   presigned URL obtained ✓");
      log("   upImg: PUT to S3...");
      await axios.put(up.upload_url, Buffer.from(raw, "base64"), {
        headers: {
          "content-type": type
        }
      });
      log("   S3 upload done ✓");
      log("   upImg: submitting to HeyGen...");
      const {
        data: asset
      } = await axios.post(`${API}/upload-heygen-asset`, {
        action: "submit",
        user_id: this.uid,
        s3_url: up.public_url,
        content_type: type
      }, {
        headers: H_API
      });
      if (!asset.asset_id) throw new Error("No asset_id returned");
      log(`   asset_id: ${asset.asset_id} ✓`);
      return asset.asset_id;
    } catch (e) {
      log("❌ upImg failed:", e.message);
      throw e;
    }
  }
  async generate({
    prompt,
    image,
    resolution = "720p",
    duration = 30,
    generate_audio = true
  }) {
    log("🚀 generate: start");
    try {
      await this.auth();
      let files = [];
      if (image) {
        const imgs = Array.isArray(image) ? image : [image];
        log(`🖼️  generate: processing ${imgs.length} image(s)...`);
        const ids = await Promise.all(imgs.map(img => this.upImg(img)));
        files = ids.map(id => ({
          asset_id: id
        }));
        log(`   ${files.length} asset(s) ready ✓`);
      }
      const orderType = files.length ? "image_to_video" : "text_to_video";
      log(`🎬 generate: creating ${orderType} order...`);
      const response = await axios.post(`${API}/create-order`, {
        user_id: this.uid,
        order_type: orderType,
        folder_id: this.uid,
        platform: "web",
        order_data: {
          prompt: prompt,
          resolution: resolution,
          generate_audio: generate_audio,
          video_provider: "heygen",
          duration: duration,
          ...files.length && {
            files: files
          }
        }
      }, {
        headers: H_API,
        timeout: 65e3
      });
      log("✅ generate: response asli (tanpa polling)");
      return response.data;
    } catch (e) {
      log("❌ generate failed:", e.message);
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
  const api = new Vivideo();
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