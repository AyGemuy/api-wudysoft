import axios from "axios";
import crypto from "crypto";
class AiClient {
  constructor() {
    this.http = axios.create({
      baseURL: "https://aichatproai-backend-268388849316.us-central1.run.app",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    });
    this.fbKey = "AIzaSyAEBA-9NjAh2kRzC3jkel8GDjB1ZghxNkE";
  }
  async _auth() {
    console.log("[AiClient] Generating token...");
    try {
      const id = crypto.randomBytes(8).toString("hex");
      const res = await axios.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${this.fbKey}`, {
        email: `ai_${id}@aiprochat.fallback`,
        password: crypto.randomBytes(16).toString("base64"),
        returnSecureToken: true
      }, {
        headers: {
          "Content-Type": "application/json",
          "X-Android-Package": "com.aiprochat.chat",
          "X-Android-Cert": "61ED377E85D386A8DFEE6B864BD85B0BFAA5AF81",
          "X-Client-Version": "Android/Fallback/X24000001/FirebaseCore-Android",
          "X-Firebase-GMPID": "1:268388849316:android:d26595c50de17d8996f831",
          "X-Firebase-Client": "H4sIAAAAAAAA_6tWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA",
          "X-Firebase-AppCheck": "eyJlcnJvciI6IlVOS05PV05fRVJST1IifQ=="
        }
      });
      return res.data.idToken;
    } catch (err) {
      throw new Error(`Auth failed: ${err.message}`);
    }
  }
  async chat({
    token,
    prompt,
    ...rest
  }) {
    console.log("[AiClient] Chat processing...");
    let activeToken = token || await this._auth();
    const chunks = [];
    let result = "";
    let status = "success";
    try {
      await this._sse("/v1/chat/stream", {
        message: prompt,
        ...rest
      }, {
        Authorization: `Bearer ${activeToken}`
      }, event => {
        chunks.push(event);
        if (event.data?.message) result = event.data.message;
        else if (event.data?.token) result = event.data.token;
      });
    } catch (err) {
      console.error("[AiClient] Chat Error:", err.message);
      status = "error";
      result = result || err.message;
    }
    return {
      status: status,
      result: result,
      chunks: chunks,
      token: activeToken
    };
  }
  async get(path, hdrs = {}) {
    try {
      return (await this.http.get(path, {
        headers: hdrs
      })).data;
    } catch (err) {
      this._err(err);
    }
  }
  async post(path, body, hdrs = {}) {
    try {
      return (await this.http.post(path, body, {
        headers: hdrs
      })).data;
    } catch (err) {
      this._err(err);
    }
  }
  async _sse(path, body, hdrs = {}, onEvent) {
    try {
      const res = await this.http.post(path, body, {
        headers: {
          ...hdrs,
          Accept: "text/event-stream"
        },
        responseType: "stream"
      });
      let buf = "";
      for await (const chunk of res.data) {
        buf += chunk.toString();
        const parts = buf.split("\n\n");
        for (let i = 0; i < parts.length - 1; i++) {
          let event = "message",
            data = null;
          const lines = parts[i].split("\n");
          for (let j = 0; j < lines.length; j++) {
            const line = lines[j];
            if (line.slice(0, 6) === "event:") event = line.slice(6).trim();
            if (line.slice(0, 5) === "data:") data = line.slice(5).trim();
          }
          if (data) {
            try {
              data = JSON.parse(data);
            } catch (e) {}
            onEvent({
              event: event,
              data: data
            });
          }
        }
        buf = parts[parts.length - 1];
      }
      if (buf.trim()) {
        let event = "message",
          data = null;
        const lines = buf.split("\n");
        for (let j = 0; j < lines.length; j++) {
          const line = lines[j];
          if (line.slice(0, 6) === "event:") event = line.slice(6).trim();
          if (line.slice(0, 5) === "data:") data = line.slice(5).trim();
        }
        if (data) {
          try {
            data = JSON.parse(data);
          } catch (e) {}
          onEvent({
            event: event,
            data: data
          });
        }
      }
    } catch (err) {
      throw new Error(err.message);
    }
  }
  _err(err) {
    const msg = err.response?.data ? err.response.data.error?.message || err.response.data.message || JSON.stringify(err.response.data) : err.message;
    throw new Error(msg);
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
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}