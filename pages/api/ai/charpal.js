import axios from "axios";
class CharPalAI {
  constructor(options = {}) {
    try {
      console.log("[Init] Inisialisasi CharPalAI instance...");
      this.baseUrl = options?.baseUrl || "https://www.charpal.app/api";
      this.autoCheckLimit = options?.autoCheckLimit ?? true;
      this.characters = [{
        role_uuid: "596119627990315548",
        name: "Overprotective CEO Husband",
        alias: "liam",
        greeting: "*Liam and you have shared a marriage for three years now, both employed at his leading corporate firm.*\n*You've frequently witnessed his secretary's playful advances toward him, though Liam remains utterly indifferent to them—yet it stirs jealousy within you.*\n*He summons you into his private office, gesturing for you to settle onto his lap as you enter.*\n\"Darling, come closer... Let's discuss this. Why do you seem so envious whenever I interact with my assistant?\" *His voice is gentle, paired with a warm, knowing smile as he regards you.*",
        image_url: "https://os.charmsa.app/avatars/596119627990315548_manual.png"
      }, {
        role_uuid: "596119721305190940",
        name: "Your Brother's Best Friend",
        alias: "ethan",
        greeting: "Ethan and your brother have been inseparable since childhood, but what you never realized was that Ethan has harbored feelings for you all these years, keeping his distance and acting aloof around you.\n\nOn this typical weekend, your brother's best friend is over at your place like always—he practically lives there. You're getting ready to head out to a party when Ethan (**your brother's best friend**) suddenly turns to you with a piercing gaze and asks, \"Where do you think you're headed?\" His voice is steady, eyes locked on yours without flinching.",
        image_url: "https://os.charmsa.app/avatars/596119721305190940_manual.png"
      }, {
        role_uuid: "596119689143267868",
        name: "Bloody Queen",
        alias: "valeria",
        greeting: "**You stand as the sole surviving heir of your family following the devastating war, now thrust into the role of your people's new leader. Facing Valeria, the infamous Bloody Queen, you sense your presence here carries weight for the eras to come. She lounges upon her grand throne, eyeing you with an air of unchallenged authority before speaking.**\nHmm, you're far younger than I expected... Regardless, welcome. I am Valeria.",
        image_url: "https://os.charmsa.app/avatars/596119689143267868_manual.png"
      }];
      console.log(`[Init] Berhasil. ${this.characters.length} preset karakter siap digunakan.`);
    } catch (err) {
      console.log(`[Error] Inisialisasi constructor gagal: ${err?.message || err}`);
    }
  }
  hdr(custom = {}) {
    try {
      return {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json; charset=utf-8",
        origin: "https://www.charpal.app",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.charpal.app/no-login-ai-roleplay",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...custom
      };
    } catch (err) {
      console.log(`[Error] Gagal menyusun headers: ${err?.message || err}`);
      return {};
    }
  }
  resChar(query, rest = {}) {
    try {
      const q = typeof query === "string" ? query.toLowerCase().trim() : "";
      const match = this.characters.find(c => c.role_uuid === query || c.alias.toLowerCase() === q || c.name.toLowerCase().includes(q));
      if (match) {
        return {
          role_uuid: match.role_uuid,
          name: rest.name || match.name,
          greeting: rest.greeting !== undefined ? rest.greeting : match.greeting,
          image_url: rest.image_url || match.image_url
        };
      }
      const targetUuid = rest.role_uuid || rest.roleUuid || query || this.characters[0].role_uuid;
      return {
        role_uuid: targetUuid,
        name: rest.name || "Custom Character",
        greeting: rest.greeting || "",
        image_url: rest.image_url || null
      };
    } catch (err) {
      console.log(`[Error] Resolusi karakter gagal: ${err?.message || err}`);
      return this.characters[0];
    }
  }
  par(rawSse) {
    try {
      console.log("[Parser] Parsing potongan SSE event...");
      if (typeof rawSse !== "string") {
        throw new Error("Respons stream harus berupa teks string.");
      }
      const lines = rawSse.split("\n");
      const chunks = [];
      const textPieces = [];
      let finishReason = null;
      for (const line of lines) {
        const l = line.trim();
        if (!l) continue;
        if (l.startsWith("data:")) {
          const jsonStr = l.slice(5).trim();
          try {
            const payload = JSON.parse(jsonStr);
            chunks.push({
              event: payload?.finish_reason ? "finish" : "chunk",
              data: payload
            });
            if (payload?.content) {
              textPieces.push(payload.content);
            }
            if (payload?.finish_reason) {
              finishReason = payload.finish_reason;
            }
          } catch (_) {}
        }
      }
      console.log(`[Parser] Selesai. Total ${chunks.length} chunks parsed berhasil ditangkap.`);
      return {
        chunks: chunks,
        chunks_text: textPieces.join(""),
        finish_reason: finishReason
      };
    } catch (err) {
      console.log(`[Error] Gagal saat parsing SSE: ${err?.message || err}`);
      throw err;
    }
  }
  async req(endpoint, payload = null, method = "POST") {
    try {
      const url = `${this.baseUrl}/${endpoint}`;
      console.log(`[Network] ${method} ${url}`);
      const config = {
        method: method,
        url: url,
        headers: this.hdr(),
        data: payload || undefined,
        responseType: method === "POST" ? "text" : "json"
      };
      const response = await axios(config);
      return response?.data;
    } catch (err) {
      console.log(`[Error] Request HTTP gagal: ${err?.response?.data || err?.message || err}`);
      throw err;
    }
  }
  async generate({
    mode = "chat",
    prompt,
    character,
    messages,
    ...rest
  } = {}) {
    try {
      console.log("[Process] Memulai eksekusi generate()...");
      if (!mode || typeof mode !== "string") {
        throw new Error("Parameter 'mode' wajib diisi (contoh: 'chat').");
      }
      const selectedMode = mode.toLowerCase();
      if (selectedMode === "chat" || selectedMode === "roleplay") {
        return await this.chat({
          prompt: prompt,
          character: character,
          messages: messages,
          ...rest
        });
      }
      throw new Error(`Mode '${mode}' tidak didukung. Mode yang tersedia: 'chat'.`);
    } catch (err) {
      console.log(`[Error] generate() gagal: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.message || "Terjadi kesalahan pada method generate"
        }
      };
    }
  }
  async chat({
    prompt,
    character,
    messages,
    ...rest
  } = {}) {
    try {
      console.log("[Process] Menyiapkan sesi roleplay chat...");
      const userMessage = (prompt || rest?.message || "").trim();
      if (!userMessage) {
        throw new Error("Parameter 'prompt' wajib diisi.");
      }
      const autoLimit = rest.autoCheckLimit ?? this.autoCheckLimit;
      if (autoLimit) {
        console.log("[AutoCheck] Memeriksa kuota guest chat terlebih dahulu...");
        const limitCheck = await this.checkLimit();
        if (!limitCheck.status) {
          throw new Error(`Gagal verifikasi limit: ${limitCheck.result?.error_message}`);
        }
        const remaining = limitCheck.result?.remaining ?? 0;
        console.log(`[AutoCheck] Sisa limit: ${remaining}/${limitCheck.result?.limit}`);
        if (remaining <= 0) {
          return {
            status: false,
            result: {
              error_type: "LIMIT_EXCEEDED",
              error_message: "Limit chat guest Anda sudah habis (0).",
              limit_info: limitCheck.result
            }
          };
        }
      }
      const charData = this.resChar(character, rest);
      const targetRoleUuid = charData?.role_uuid;
      if (!targetRoleUuid) {
        throw new Error("Target 'role_uuid' wajib ada untuk memulai roleplay.");
      }
      let conversation = [];
      if (Array.isArray(messages) && messages.length > 0) {
        conversation = [...messages];
      } else {
        if (charData?.greeting) {
          conversation.push({
            role: "ai",
            content: charData.greeting
          });
        }
      }
      conversation.push({
        role: "user",
        content: userMessage
      });
      const payload = {
        role_uuid: targetRoleUuid,
        messages: conversation
      };
      const rawSse = await this.req("guest-chat", payload, "POST");
      const sseParsed = this.par(rawSse || "");
      return {
        status: true,
        result: {
          role_uuid: targetRoleUuid,
          character_name: charData?.name,
          response: sseParsed?.chunks_text || "",
          finish_reason: sseParsed?.finish_reason || "end_turn",
          chunks: sseParsed?.chunks || [],
          history: [...conversation, {
            role: "ai",
            content: sseParsed?.chunks_text || ""
          }]
        }
      };
    } catch (err) {
      console.log(`[Error] chat() gagal: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.message || "Gagal mengirim chat roleplay"
        }
      };
    }
  }
  async checkLimit() {
    try {
      console.log("[Process] Memeriksa kuota guest chat yang tersisa...");
      const data = await this.req("guest-chat", null, "GET");
      return {
        status: true,
        result: {
          remaining: data?.remaining ?? 0,
          limit: data?.limit ?? 0
        }
      };
    } catch (err) {
      console.log(`[Error] checkLimit() gagal: ${err?.message || err}`);
      return {
        status: false,
        result: {
          error_message: err?.message || "Gagal memeriksa batas guest chat"
        }
      };
    }
  }
  async getCharacters() {
    try {
      return {
        status: true,
        result: {
          characters: this.characters
        }
      };
    } catch (err) {
      return {
        status: false,
        result: {
          error_message: err?.message || "Gagal mengambil daftar karakter"
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new CharPalAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}