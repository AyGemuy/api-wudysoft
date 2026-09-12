import axios from "axios";
import {
  randomBytes
} from "crypto";
class VolmaxClient {
  constructor() {
    try {
      console.log("[LOG] Inisialisasi VolmaxClient...");
      const baseURL = "https://weather.volmaxup.com";
      this.aid = randomBytes(8).toString("hex");
      this.token = null;
      this.api = axios.create({
        baseURL: baseURL,
        headers: {
          "User-Agent": `3002_${this.aid}`,
          Connection: "Keep-Alive",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          "cache-control": "no-cache"
        }
      });
      console.log(`[LOG] Client siap | AID: ${this.aid}`);
    } catch (err) {
      console.log("[LOG] Error Constructor:", err?.message || err);
      throw err;
    }
  }
  rnd(len = 8) {
    try {
      console.log("[LOG] Generate random AID...");
      return randomBytes(len).toString("hex");
    } catch (err) {
      console.log("[LOG] Error rnd():", err?.message || err);
      return "0666b2e8da418dfa";
    }
  }
  async tkn() {
    try {
      console.log("[LOG] Meminta token Azure...");
      const body = {
        password: "gMvCBUV9GAsbx8WFiHRuYhJipf+F5PaiiMyQ589Hyfk=",
        username: "0PvzVc/Z7IjwGo/l2ZDcQQ==",
        aid: this.aid,
        aver: 2,
        cVersion: 33,
        cVersionName: "1.1.9",
        campaign: "",
        channel: "XPhLUe0TezQKfrfQQucJcg==",
        installDays: 0,
        language: "id",
        local: "ID",
        productId: 3002
      };
      const res = await this.api.post("/computer/getAzureToken", body);
      this.token = res?.data || null;
      console.log("[LOG] Token didapatkan:", this.token);
      return this.token;
    } catch (err) {
      console.log("[LOG] Error tkn():", err?.response?.data || err?.message || err);
      throw err;
    }
  }
  async chat({
    prompt,
    messages,
    ...rest
  }) {
    try {
      console.log("[LOG] Memproses chat...");
      const activeToken = this.token ? this.token : await this.tkn();
      const msgList = Array.isArray(messages) ? messages : [];
      if (prompt) {
        console.log("[LOG] Auto-push prompt ke messages...");
        msgList.push({
          role: "user",
          content: prompt
        });
      }
      const defaultPayload = {
        gptVersion: "4.0",
        type: "3.5",
        aid: this.aid,
        aver: 2,
        cVersion: 33,
        cVersionName: "1.1.9",
        campaign: "",
        channel: "XPhLUe0TezQKfrfQQucJcg==",
        installDays: 0,
        language: "id",
        local: "ID",
        productId: 3002
      };
      const body = {
        ...defaultPayload,
        ...rest,
        token: rest.token || activeToken,
        messages: msgList
      };
      console.log("[LOG] Mengirim payload ke server...");
      const res = await this.api.post("/computer/getGpt3AzureResult", body);
      const chunks = res?.data?.result || null;
      const botMsg = chunks?.choices?.[0]?.message;
      if (botMsg) {
        console.log("[LOG] Auto-push respon bot ke messages...");
        msgList.push(botMsg);
      }
      console.log("[LOG] Respon berhasil diterima.");
      return {
        status: res?.data?.status || 200,
        result: botMsg?.content || "",
        chunks: chunks
      };
    } catch (err) {
      console.log("[LOG] Error chat():", err?.response?.data || err?.message || err);
      throw err;
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
  const api = new VolmaxClient();
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