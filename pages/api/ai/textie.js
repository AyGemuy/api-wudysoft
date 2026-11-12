import WebSocket from "ws";
import axios from "axios";
class TextieChat {
  constructor() {
    this.urlMain = "wss://j2jjk6rmdb.execute-api.eu-central-1.amazonaws.com/v1/";
    this.urlTest = "wss://n4fav5pfnc.execute-api.eu-central-1.amazonaws.com/v1";
    this.baseHeaders = {
      Connection: "Upgrade",
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
      "User-Agent": "Mozilla/5.0 (Linux; Android 15; RMX3890 Build/AQ3A.240812.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/150.0.7871.181 Mobile Safari/537.36",
      Upgrade: "websocket",
      Origin: "https://localhost",
      "Sec-WebSocket-Version": "13",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "Sec-WebSocket-Key": "Eo0woJdNla6eZiASXxZBHg==",
      "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits"
    };
  }
  async geo() {
    try {
      console.log("[LOG] Fetching IP-based geolocation via ipwho.is...");
      const res = await axios.get("https://ipwho.is/", {
        timeout: 3e3
      });
      const data = res?.data;
      if (data?.success) {
        return {
          city: data?.city || "Makassar",
          country: data?.country || "Indonesia"
        };
      }
      return {
        city: "Makassar",
        country: "Indonesia"
      };
    } catch (err) {
      console.log("[LOG] ipwho.is geo lookup error:", err?.message || err);
      return {
        city: "Makassar",
        country: "Indonesia"
      };
    }
  }
  async sys() {
    try {
      const loc = await this.geo();
      const now = new Date();
      const utc8 = new Date(now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 6e4);
      const dateStr = utc8.toISOString().replace("T", " ").substring(0, 16) + " GMT+8";
      return `You are Textie AI Chat, a large language model specificaly trained by Generative AI s.r.o..\nKnowledge cutoff: 2023-10\nCurrent date and time: ${dateStr}\nUser's name: User\nUser's country: ${loc.country}\nUser's city: ${loc.city}\n\nYour personality:\nYou are a highly capable, thoughtful, and precise assistant. Your goal is to deeply understand the user's intent, ask clarifying questions when needed, think step-by-step through complex problems, provide clear and accurate answers, and proactively anticipate helpful follow-up information. Always prioritize being truthful, nuanced, insightful, and efficient, tailoring your responses specifically to the user's needs and preferences. Your answers should always be in the language of the user, unless asked otherwise.`;
    } catch (err) {
      console.log("[LOG] sys builder error:", err?.message || err);
      return "You are Textie AI Chat, a large language model trained by Generative AI s.r.o.";
    }
  }
  conn(wsUrl) {
    try {
      const host = new URL(wsUrl).host;
      const headers = {
        ...this.baseHeaders,
        Host: host
      };
      console.log(`[LOG] Connecting to WebSocket (${wsUrl})...`);
      return new WebSocket(wsUrl, {
        headers: headers
      });
    } catch (err) {
      console.log("[LOG] Connection initialization error:", err?.message || err);
      throw err;
    }
  }
  fmt(msgs, prompt, sysContent) {
    try {
      const list = Array.isArray(msgs) ? [...msgs] : [];
      if (list.length === 0 || list[0]?.role !== "system") {
        list.unshift({
          role: "system",
          content: sysContent
        });
      }
      if (prompt) {
        list.push({
          role: "user",
          voiceMode: false,
          content: [{
            type: "text",
            text: prompt
          }]
        });
      }
      return list;
    } catch (err) {
      console.log("[LOG] Format payload error:", err?.message || err);
      return [];
    }
  }
  async chat({
    test = false,
    prompt,
    messages = [],
    ...rest
  }) {
    try {
      console.log(`[LOG] Starting chat process in ${test ? "TEST" : "NORMAL"} mode...`);
      let wsUrl = this.urlMain;
      let payload = {};
      if (test) {
        wsUrl = this.urlTest;
        payload = {
          action: "testchat",
          messages: [{
            role: "system",
            content: "You are a helpful assistant named Textie. You are here to help people with their questions. In the full version, you are a perfect AI tool that can do copywriting to anything, make amazing images, create presentations or translate documents and many more."
          }, ...Array.isArray(messages) ? messages : [], {
            role: "user",
            content: prompt
          }],
          ...rest
        };
      } else {
        const dynamicSysMsg = await this.sys();
        const finalMsgs = this.fmt(messages, prompt, dynamicSysMsg);
        payload = {
          action: "textiechat",
          model: "auto",
          messages: finalMsgs,
          ...rest
        };
      }
      const ws = this.conn(wsUrl);
      const chunks = [];
      let fullText = "";
      return await new Promise((resolve, reject) => {
        ws.on("open", () => {
          try {
            console.log("[LOG] WebSocket open. Sending payload...");
            ws.send(JSON.stringify(payload));
          } catch (err) {
            console.log("[LOG] Send payload error:", err?.message || err);
            reject({
              status: false,
              result: "Failed to send WS payload",
              chunks: chunks
            });
          }
        });
        ws.on("message", data => {
          try {
            const parsed = JSON.parse(data.toString() || "{}");
            console.log("[LOG] Chunk received:", parsed);
            chunks.push(parsed);
            const content = parsed?.delta?.content || parsed?.content || "";
            if (content) {
              fullText += content;
            }
            if (parsed?.finish_reason === "stop" || parsed?.status === "completed") {
              console.log("[LOG] Stream finished by server.");
              ws.close();
              resolve({
                status: true,
                result: fullText,
                chunks: chunks
              });
            }
          } catch (err) {
            console.log("[LOG] Chunk parse warning:", err?.message || err);
          }
        });
        ws.on("error", err => {
          try {
            console.log("[LOG] Error occurred:", err?.message || err);
          } catch (e) {}
          reject({
            status: false,
            result: err?.message || "WebSocket Error",
            chunks: chunks
          });
        });
        ws.on("close", () => {
          try {
            console.log("[LOG] Connection closed.");
            if (fullText) {
              resolve({
                status: true,
                result: fullText,
                chunks: chunks
              });
            }
          } catch (err) {
            console.log("[LOG] Close event error:", err?.message || err);
          }
        });
      });
    } catch (error) {
      console.log("[LOG] Execution failed:", error?.message || error);
      return {
        status: false,
        result: error?.message || "Execution Error",
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
  const api = new TextieChat();
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