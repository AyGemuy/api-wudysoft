import axios from "axios";
import crypto from "crypto";
import WebSocket from "ws";
class VoiceRankings {
  constructor() {
    this.sessionId = this.genSession();
    this.baseUrl = "https://voicerankings.com/api/v1/voice";
    this.wsUrl = "wss://ws.summ.me/";
    this.defaultVoiceId = "b373f0a4-d5c0-44eb-a048-e58f47be238f";
    this.defaultSpeakerId = "Leda--xh723";
    this.defaultService = "gemini-2-5-flash-tts";
  }
  genSession() {
    const raw = crypto.randomBytes(48).toString("base64url");
    console.log("[Session] Generated:", raw);
    return raw;
  }
  uuid() {
    return crypto.randomUUID();
  }
  headers(refUuid = null) {
    return {
      accept: "application/json",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      cookie: `sessionId=${this.sessionId}`,
      origin: "https://voicerankings.com",
      pragma: "no-cache",
      referer: `https://voicerankings.com/voice/gemini-2-5-flash-tts/female/Leda--xh723?snippet=${refUuid || this.uuid()}`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async search({
    query,
    ...rest
  }) {
    if (!query) throw new Error("Parameter 'query' is required.");
    try {
      console.log("[Search] Querying:", query);
      const params = new URLSearchParams({
        search: query,
        ...rest
      });
      const res = await axios.get(`${this.baseUrl}/search?${params}`, {
        headers: this.headers()
      });
      console.log("[Search] Done, total:", res.data?.voices?.length ?? 0);
      return res.data;
    } catch (e) {
      console.error("[Search Error]", e?.response?.data || e.message);
      return {
        voices: []
      };
    }
  }
  async generate({
    text,
    ...rest
  }) {
    const jobId = this.uuid();
    const snippetId = this.uuid();
    const targetText = text || "Hello World";
    const serviceName = rest.service || this.defaultService;
    const voiceId = rest.voice || this.defaultVoiceId;
    const speakerId = rest.speaker || this.defaultSpeakerId;
    const gender = rest.gender || "female";
    console.log(`[Init] JobId: ${jobId}`);
    console.log(`[Init] Session: ${this.sessionId}`);
    console.log(`[WS] Connecting...`);
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl, {
        headers: {
          origin: "https://voicerankings.com",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "accept-language": "id-ID",
          pragma: "no-cache",
          "cache-control": "no-cache"
        }
      });
      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error("Timeout waiting for audio generation"));
      }, 3e4);
      ws.on("open", () => console.log("[WS] Connected."));
      ws.on("error", e => {
        clearTimeout(timeout);
        reject(e);
      });
      ws.on("message", async raw => {
        try {
          const msg = JSON.parse(raw.toString());
          console.log("[WS] Message:", JSON.stringify(msg));
          if (msg?.action === "Your Connection ID") {
            const connectionId = msg?.connectionId;
            console.log(`[WS] ConnectionId: ${connectionId}`);
            const payload = {
              action: "start",
              jobId: jobId,
              connectionId: connectionId,
              text: targetText,
              serviceName: serviceName,
              voice_id: voiceId,
              voice_instructions: rest.instructions ?? "",
              gender: gender,
              speaker_id: speakerId,
              languageCode: rest.languageCode || "en-US",
              voice_speed: rest.speed ?? 1,
              voice_snippet_shared: true,
              includeAudioTimestamps: true,
              createSnippet: true,
              directory: "snippets",
              fileName: `snippet-${snippetId}.mp3`
            };
            try {
              console.log("[HTTP] Sending speech request...");
              const res = await axios.post(`${this.baseUrl}/speech`, payload, {
                headers: this.headers(snippetId)
              });
              const status = res?.data?.status || "unknown";
              console.log("[HTTP] Status:", status);
              if (status !== "processing") throw new Error("API rejected request: " + status);
            } catch (e) {
              ws.close();
              clearTimeout(timeout);
              reject(e);
            }
          }
          if (msg?.action === "ttsCompleted" && msg?.jobId === jobId) {
            console.log("[WS] TTS Complete! URL:", msg?.data?.finalAudioUrl);
            ws.close();
            clearTimeout(timeout);
            resolve({
              status: "success",
              ...msg.data
            });
          }
        } catch (e) {
          console.error("[WS] Parse error:", e.message);
        }
      });
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new VoiceRankings();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Paramenter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            error: "Paramenter 'text' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'search', 'generate'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}