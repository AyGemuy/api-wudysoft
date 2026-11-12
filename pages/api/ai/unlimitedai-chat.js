import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
class UnlimitedAI {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      timeout: 6e4
    }));
    this.baseUrl = "https://app.unlimitedai.chat";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      origin: this.baseUrl,
      referer: `${this.baseUrl}/id`
    };
  }
  generateUUID() {
    return crypto.randomUUID();
  }
  getTimestamp() {
    return new Date().toISOString();
  }
  async chat({
    prompt,
    messages = [],
    model = "chat-model-reasoning",
    chatId,
    ...rest
  }) {
    console.log("[UnlimitedAI] Mempersiapkan payload...");
    const activeChatId = chatId || this.generateUUID();
    let payloadMessages;
    if (messages?.length) {
      payloadMessages = messages.map(msg => ({
        id: msg.id || this.generateUUID(),
        role: msg.role || "user",
        content: msg.content || "",
        parts: msg.parts || [{
          type: "text",
          text: msg.content || ""
        }],
        createdAt: msg.createdAt || this.getTimestamp()
      }));
    } else {
      const userContent = prompt || "Halo";
      payloadMessages = [{
        id: this.generateUUID(),
        role: "user",
        content: userContent,
        parts: [{
          type: "text",
          text: userContent
        }],
        createdAt: this.getTimestamp()
      }, {
        id: this.generateUUID(),
        role: "assistant",
        content: "",
        parts: [{
          type: "text",
          text: ""
        }],
        createdAt: this.getTimestamp()
      }];
    }
    try {
      console.log(`[UnlimitedAI] Mengirim ${payloadMessages.length} pesan ke ID: ${activeChatId}`);
      const payload = {
        chatId: activeChatId,
        messages: payloadMessages,
        selectedChatModel: model,
        selectedCharacter: rest.selectedCharacter || null,
        selectedStory: rest.selectedStory || null,
        locale: "id"
      };
      const response = await this.client.post(`${this.baseUrl}/api/chat`, payload, {
        headers: {
          ...this.headers,
          "content-type": "application/json"
        },
        responseType: "text"
      });
      console.log("[UnlimitedAI] Parsing respons stream per baris...");
      const parsedData = this.parseStream(response.data);
      return {
        chat_id: activeChatId,
        model: model,
        result: {
          text: parsedData.text || "Tidak ada teks respons.",
          ...parsedData
        },
        info: {
          status: response.status,
          message_count: payloadMessages.length,
          raw_chunks_length: parsedData.chunks?.length || 0
        }
      };
    } catch (error) {
      console.error("[UnlimitedAI] Gangguan pada proses chat:", error?.message);
      return {
        chat_id: activeChatId,
        result: null,
        error: error?.response?.data || error?.message
      };
    }
  }
  parseStream(rawData) {
    const lines = rawData.split("\n");
    let fullText = "";
    const chunks = [];
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      try {
        const content = JSON.parse(trimmedLine);
        if (content?.delta) {
          fullText += content.delta;
          chunks.push(content);
        }
      } catch {}
    }
    return {
      text: fullText,
      chunks: chunks
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new UnlimitedAI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}