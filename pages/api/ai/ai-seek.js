import crypto from "crypto";
import {
  v7 as uuidv7
} from "uuid";
import axios from "axios";
class AiSeek {
  constructor() {
    this.base = "https://ai-seek.thebetter.ai";
    this.auth_base = "https://saas.castbox.fm";
  }
  uid(bytes = 8) {
    return crypto.randomBytes(bytes).toString("hex");
  }
  hdr(token) {
    const dev_id = this.uid(8);
    return {
      "User-Agent": "okhttp/4.12.0",
      Accept: "text/event-stream",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "x-app-id": "ai-seek",
      "x-device-info": `appIdentifier=ai.chatbot.ask.chat.deep.seek.assistant.search.free;appVersion=2.9.4-26071777;deviceType=android;deviceCountry=ID;appCountry=id;local=id_ID;language=id;timezone=Asia/Makassar;brand=realme;model=RMX3890;androidId=${dev_id}`,
      "x-access-token": token || ""
    };
  }
  async gtok() {
    try {
      console.log("[LOG] Requesting provider auth token...");
      const res = await axios.post(`${this.auth_base}/auth/api/v1/tokens/provider/secret`, {
        secret: uuidv7()
      }, {
        headers: {
          "x-app-id": "ai-seek",
          "Content-Type": "application/json"
        }
      });
      return res?.data?.data?.token || null;
    } catch (err) {
      console.log("[LOG] Auth token generation failed:", err?.message || err);
      return null;
    }
  }
  async chk(token) {
    return token || await this.gtok() || "";
  }
  async tok(token, ext = "jpg") {
    try {
      console.log("[LOG] Requesting image upload token...");
      const active_tok = await this.chk(token);
      const res = await axios.get(`${this.base}/v4/token/generate_image_token`, {
        params: {
          count: 1,
          extension: ext
        },
        headers: this.hdr(active_tok)
      });
      return res?.data?.data || null;
    } catch (err) {
      console.log("[LOG] Image token generation failed:", err?.message || err);
      return null;
    }
  }
  async med(item, token) {
    try {
      console.log("[LOG] Resolving media item...");
      let buf = null;
      let ext = "jpg";
      let mime = "image/jpeg";
      if (Buffer.isBuffer(item)) {
        buf = item;
      } else if (typeof item === "string" && item.startsWith("http")) {
        console.log("[LOG] Fetching media from URL...");
        const res = await axios.get(item, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(res?.data);
        mime = res?.headers?.["content-type"] || mime;
        ext = mime.split("/")[1]?.split(";")[0] || ext;
      } else if (typeof item === "string") {
        console.log("[LOG] Decoding base64 media...");
        const b64 = item.includes("base64,") ? item.split("base64,")[1] : item;
        buf = Buffer.from(b64, "base64");
      }
      if (!buf) return null;
      const active_tok = await this.chk(token);
      const tok_data = await this.tok(active_tok, ext);
      if (!tok_data) return null;
      const s3_key = tok_data?.imageS3KeyList?.[0];
      const s3_url = `https://${tok_data?.S3bucket}.s3.amazonaws.com/${s3_key}`;
      console.log("[LOG] Uploading media to S3...");
      await axios.put(s3_url, buf, {
        headers: {
          "Content-Type": mime,
          "x-amz-security-token": tok_data?.sessionToken
        }
      });
      console.log("[LOG] Media uploaded successfully.");
      return s3_key || null;
    } catch (err) {
      console.log("[LOG] Media upload error:", err?.message || err);
      return null;
    }
  }
  async mdl(token) {
    try {
      console.log("[LOG] Fetching available models...");
      const active_tok = await this.chk(token);
      const res = await axios.get(`${this.base}/v4/chat/list_models`, {
        headers: this.hdr(active_tok)
      });
      const models = res?.data?.data?.models || [];
      return {
        status: true,
        result: models,
        chunks: [],
        token: active_tok || null,
        session: null
      };
    } catch (err) {
      console.log("[LOG] List models error:", err?.message || err);
      return {
        status: false,
        result: null,
        chunks: [],
        token: token || null,
        session: null
      };
    }
  }
  async chat({
    token,
    prompt,
    messages,
    media,
    session,
    ...rest
  }) {
    try {
      console.log("[LOG] Initiating chat session...");
      const active_tok = await this.chk(token);
      const active_sess = session || uuidv7();
      const user_msg_id = uuidv7();
      const ai_msg_id = uuidv7();
      const msg_list = messages || [];
      if (prompt) {
        msg_list.push({
          role: "user",
          content: prompt
        });
      }
      const s3_keys = [];
      if (media) {
        const media_items = Array.isArray(media) ? media : [media];
        for (const item of media_items) {
          const key = await this.med(item, active_tok);
          if (key) s3_keys.push(key);
        }
      }
      const req_model = rest?.model || "openai/gpt-5-mini";
      const models_res = await this.mdl(active_tok);
      const valid_models = models_res?.result?.map(m => m?.id) || [];
      let model_name = req_model;
      if (valid_models.length > 0 && !valid_models.includes(req_model)) {
        console.log(`[LOG] Model [${req_model}] invalid! Fallback to [${valid_models[0]}]`);
        model_name = valid_models[0];
      } else {
        console.log(`[LOG] Model [${model_name}] validated.`);
      }
      const is_pro = rest?.is_pro ?? false;
      const is_search = rest?.is_search ?? false;
      const payload = {
        sessionId: active_sess,
        userMessageId: user_msg_id,
        aiMessageId: ai_msg_id,
        model: model_name,
        text: prompt || msg_list[msg_list.length - 1]?.content || "",
        restrictedType: is_pro ? "PRO_USER" : "FREE_USER",
        sessionType: is_search ? "SEARCH" : "NORMAL",
        ...s3_keys.length > 0 ? {
          imageS3KeyList: s3_keys
        } : {}
      };
      console.log(`[LOG] Sending payload to [${model_name}]...`);
      const res = await axios.post(`${this.base}/v4/chat/send`, payload, {
        headers: this.hdr(active_tok),
        responseType: "stream"
      });
      const chunks = [];
      let full_res = "";
      await new Promise((resolve, reject) => {
        res.data.on("data", chunk => {
          const lines = chunk.toString().split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const raw_json = line.slice(6).trim();
              if (!raw_json) continue;
              try {
                const parsed = JSON.parse(raw_json);
                chunks.push(parsed);
                if (parsed?.content) {
                  full_res += parsed.content;
                }
              } catch (e) {}
            }
          }
        });
        res.data.on("end", resolve);
        res.data.on("error", reject);
      });
      if (full_res) {
        msg_list.push({
          role: "assistant",
          content: full_res
        });
      }
      console.log("[LOG] SSE Stream completed.");
      return {
        status: true,
        result: full_res,
        chunks: chunks,
        token: active_tok || null,
        session: active_sess
      };
    } catch (err) {
      console.log("[LOG] Chat error:", err?.response?.data || err?.message || err);
      return {
        status: false,
        result: null,
        chunks: [],
        token: token || null,
        session: session || null
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
  const api = new AiSeek();
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