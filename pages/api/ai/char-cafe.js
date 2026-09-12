import axios from "axios";
import crypto from "crypto";
class CharacterCafe {
  constructor() {
    this.SUB = "https://ugniwrzkmybhjpfsffqa.supabase.co/rest/v1";
    this.CAFE = "https://www.character.cafe/api";
    this.KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnbml3cnprbXliaGpwZnNmZnFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzYxMDI2MjIsImV4cCI6MTk5MTY3ODYyMn0.75cUEKuj3glbvBgBxsZ5k2yRQAMAfE9bZX6tQSjohLQ";
    this.shdr = {
      "User-Agent": "okhttp/4.11.0",
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "x-client-info": "supabase-js-react-native/2.49.4",
      "accept-profile": "public",
      apikey: this.KEY,
      authorization: `Bearer ${this.KEY}`
    };
  }
  enc(obj) {
    return Buffer.from(JSON.stringify(obj)).toString("base64");
  }
  dec(b64) {
    try {
      return b64 ? JSON.parse(Buffer.from(b64, "base64").toString("utf8")) : {};
    } catch {
      return {};
    }
  }
  async search({
    query
  }) {
    try {
      const fields = "id,name,profile_picture,intro,tags,is_public,created_at,greeting,background,background_image";
      const q = encodeURIComponent(query.trim());
      const url = `${this.SUB}/characters?select=${fields}&name=ilike.%25${q}%25&is_public=neq.false&order=created_at.desc&limit=20`;
      const {
        data
      } = await axios.get(url, {
        headers: this.shdr
      });
      const mapped = (data || []).map(char => ({
        ...char,
        state: this.enc({
          uid: null,
          cid: null,
          char: {
            id: char.id,
            name: char.name,
            bg: char.background,
            greet: char.greeting
          }
        })
      }));
      return {
        status: true,
        result: mapped,
        total: mapped.length
      };
    } catch (e) {
      return {
        status: false,
        result: e.response?.data || e.message,
        total: 0
      };
    }
  }
  async chat({
    state,
    prompt,
    ...rest
  }) {
    try {
      const s = this.dec(state);
      const char = s.char || {};
      const uid = s.uid || `user_3Es${crypto.randomBytes(12).toString("hex")}`;
      const cid = s.cid || rest.conversationId || null;
      const basePayload = {
        content: prompt,
        userId: uid,
        conversationId: cid,
        characterId: Number(rest.characterId || char.id),
        characterName: rest.characterName || char.name,
        background: rest.background || char.bg,
        greeting: rest.greeting || char.greet,
        modelType: "standard",
        parentId: null,
        persona: null
      };
      const payload = {
        ...basePayload,
        ...rest
      };
      if (payload.characterId) payload.characterId = Number(payload.characterId);
      const {
        data
      } = await axios.post(`${this.CAFE}/chat_v2/send`, payload, {
        headers: {
          "User-Agent": "okhttp/4.11.0",
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      });
      const currentCid = data?.conversationId || cid;
      return {
        status: true,
        ...data?.botMessage,
        state: this.enc({
          uid: uid,
          cid: currentCid,
          char: char
        })
      };
    } catch (e) {
      return {
        status: false,
        error: e.response?.data || e.message,
        state: state || null
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["chat", "search"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=search&query=Yu"
      }
    });
  }
  const api = new CharacterCafe();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      action: action,
      status: true,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}