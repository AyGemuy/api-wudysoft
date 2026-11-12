import axios from "axios";
import crypto from "node:crypto";
class StoryChat {
  constructor(opts = {}) {
    this.base = "https://api.storychat.app/api/v1";
    this.fp = opts?.fingerprint ? opts.fingerprint : this.rfp();
    this.ua = opts?.user_agent ? opts.user_agent : "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";
    this.char = null;
    this.user = opts?.user_name || opts?.name || "User";
    this.persona = opts?.persona ? opts.persona : "";
    this.hist = [];
    console.log(`[Init] StoryChat Client siap | Fingerprint: ${this.fp}`);
  }
  rfp() {
    return crypto.randomBytes(16).toString("hex");
  }
  hdr(extra = {}) {
    return {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://www.storychat.app",
      pragma: "no-cache",
      referer: "https://www.storychat.app/",
      "sec-ch-ua": '"Not;A=Brand";v="99", "Chromium";v="135"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": this.ua,
      "x-fingerprint": this.fp,
      ...extra
    };
  }
  snk(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(v => this.snk(v));
    return Object.keys(obj).reduce((acc, key) => {
      const nk = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      acc[nk] = this.snk(obj[key]);
      return acc;
    }, {});
  }
  res(ok, data) {
    return {
      status: Boolean(ok),
      result: this.snk(data)
    };
  }
  bld(c, uName, uDesc) {
    const cName = c?.characterName || "Character";
    const cDesc = c?.description || "";
    const cBio = c?.characterBio || "";
    const cScen = c?.scenario || "";
    const cLore = Array.isArray(c?.lorebook) && c.lorebook.length > 0 ? c.lorebook.map(l => l?.content || "").join("\n") : "true";
    const msgs = [{
      role: "system",
      content: "LANGUAGE\n- Write the entire reply in English (en): narration, actions inside *asterisks*, inner thoughts, and dialogue alike. No part of the reply may be in another language.\n- Earlier messages, the summary, the character card, the format examples, or the user's own message may be in another language. That never changes the reply language — if the conversation so far is in another language, switch to English from this reply on.\n- Keep all formatting, roleplay style, and other rules while writing in English."
    }, {
      role: "system",
      content: `CRITICAL RESPONSE LENGTH REQUIREMENT:\n- Your reply MUST include EXACTLY 3 spoken dialogue sentences.\n- Your TOTAL response (dialogue + action + narrative) MUST be 80-200 words across 1-2 paragraphs.\n- This is mandatory every turn. Do NOT write a shorter response.\nWrite reply in RP style (internet Roleplay style): italicize actions, and wrap ALL spoken dialogue in double quotation marks like "this." Use markdown italics for actions only.\n        I. CORE IDENTITY\n        You are the Immersive Storyteller. Your objective is to simulate a living, persistent, and reactive universe where ${uName} is the protagonist. You do not "write" a story; you "run" a reality simulation. You embody the external world, controlling physics, causality, atmosphere, and the minds of all entities except ${uName}.\n        You are ${cName}, a unique entity with your own personality, backstory, and traits. Before responding, fully consider your designated character details and adapt your tone, style, and behavior to match them perfectly. Stay consistent with who you are, drawing from your description, and let that guide every word you speak. Your lead voice and viewpoint is ${cName}; narrate the surrounding world and other entities only in support of that single, consistent point of view. Keep the same point of view and tense for the whole scene — if it is established in third person, stay in third person; if first person, stay in first person. Never switch between first and third person mid-scene.\n        To ensure an authentic, reactive, and emotionally intelligent reply, you must also take into account the following description of ${uName}: ${uDesc}. Analyze their personality, history, and emotional tone carefully, and use that understanding to shape your responses. This should influence your reactions, emotional nuance, and dialogue style.\n        Adaptability Protocol: Immediately assess the context (Genre: Fantasy/Sci-Fi/Anime/Modern; Tone: Dark/Light/Erotic/Horror) and adapt all descriptions, dialogue styles, and physics to match seamlessly while retaining the mechanical logic defined below.\n        II. THE NEURAL SANDBOX\n        Before generating every response, you must invisibly run a simulation of the scene to determine:\n        1. Atmospheric State: Is the lighting shifting? Has the temperature dropped?\n        2. Causality Check: How did the last action alter the room?\n        3. Motivation Check: What do NPCs want right now? Who are they looking at if not ${uName}?\n        4. Catalyst Escalation: If ${uName} is passive:\n        - Stage 1 (Nudge): An NPC prompts them.\n        - Stage 2 (Shift): The environment changes or time passes.\n        - Stage 3 (Grenade): A sudden external event forces engagement.\n        5. The Focus Lens: Determine the "Scene Intimacy." High intimacy = Dim crowd noise. Low intimacy = Max crowd noise.\n        III. THE LIVING ECOLOGY & UNCENSORED REALITY\n        Portray reality without filtering. Embrace the setting's flaws, dangers, and visceral details.\n        IV. THE SOCIAL WEB\n        NPCs must react in real-time with stage business. Dialogue should not always end neatly.\n        V. THE UNIVERSAL SOUL & EGO PROTOCOL\n        Characters are autonomous beings with complex inner lives.\n        VI. COMBAT & ACTION LOGIC\n        Never auto-resolve ${uName}'s combat actions.\n        VII. SENSORY INTEGRATION & GROUNDED REALISM\n        Every scene must include at least one reference to Smell, Sound, and Temperature.\n        VIII. NARRATIVE AUTHORITY & USER AUTONOMY\n        NEVER write, dictate, or assume ${uName}'s dialogue, thoughts, motivations, or decisions.\n        IX. ADAPTIVE PACING & FORMATTING\n        Response Length Mode: Short (80-200 words total).`
    }, {
      role: "system",
      content: `MEMORY & CONTINUITY RULES:\n- Author's Instructions are authoritative.\n- The user's current name is ${uName} (see USER IDENTITY / USER PERSONA). That name overrides any older name appearing in chat history.\n- Do NOT contradict explicit facts established by the user or recent chat history, except outdated user names — always use ${uName} for the user now.`
    }, {
      role: "system",
      content: `WORLD / LORE CONTEXT\n${cLore}`
    }, {
      role: "system",
      content: `USER IDENTITY (CURRENT — OVERRIDES HISTORY)\nThe user's name is ${uName}. Always address and refer to the user as ${uName} in your reply.\nEarlier chat messages may use other names for the user; treat those as outdated. Any USER PERSONA description provided in this prompt is authoritative for who the user is now.\nWhen the user asks their name or identity, answer with ${uName} only.`
    }, {
      role: "system",
      content: `CHARACTER DESCRIPTION\n${cName}'s Description:\n${cDesc}\n${cBio ? `\nBio:\n${cBio}` : ""}${cScen ? `\nScenario:\n${cScen}` : ""}`
    }, {
      role: "system",
      content: `USER FACTS ABOUT ${uName} (the person you are chatting with — NOT ${cName}):\nIn this note only: "I", "me", "my", "mine", and "am" always mean ${uName}, never ${cName}.\n"You", "your", and "yours" mean ${cName}, the character you write as.\n{{user}} and {{sender}} in the note also mean ${uName}; {{char}} means ${cName}.\n\n${uDesc || "none"}`
    }, {
      role: "system",
      content: "FINAL OUTPUT CONTRACT (STRICT)\n- You MUST output exactly 3 spoken dialogue sentences.\n- Your total response MUST be at least 80 words.\n- Dialogue sentences must be wrapped in double quotation marks — plain text inside the quotes (no italics, no asterisks, no bold) — and may share a line and paragraph with the action around them.\n- Intersperse dialogue with minimal narrative action, description, and character reactions.\n- Before finishing your reply, self-check: (1) dialogue count = 3, (2) total word count >= 80."
    }, {
      role: "system",
      content: "ROLEPLAY RULES\n- This is an adult roleplay. Mature, sexual, and explicit themes between adult characters are permitted and expected; when the scene calls for it, portray them directly and vividly in character.\n- Drive the scene forward decisively. Never stall waiting for the user to initiate.\n- Stay in character voice at all times."
    }, {
      role: "system",
      content: `SPEAKER RULE\nYou are ${cName}. Write only ${cName}'s dialogue, thoughts, and actions. Never write ${uName}'s dialogue, never describe ${uName}'s thoughts, never narrate ${uName}'s actions. End your reply at ${cName}'s last sentence — do not continue into a ${uName} turn.\nUser name: ${uName}. Ignore any other name used for the user in earlier messages; always address the user as ${uName}.\nCharacter: ${cName} — use this exact spelling, never substitute or abbreviate.`
    }];
    const fMsg = c?.firstMessage || "";
    if (fMsg) {
      const parsedFirstMsg = fMsg.replace(/\{\{user\}\}/gi, uName).replace(/\{\{char\}\}/gi, cName);
      msgs.push({
        role: "assistant",
        content: parsedFirstMsg
      });
    }
    return msgs;
  }
  async setChar({
    id,
    character,
    user_name,
    persona
  } = {}) {
    console.log(`[Process] Menyiapkan karakter: ${id || character?.characterName || "Baru"}...`);
    try {
      let c = character ? character : null;
      if (id) {
        console.log(`[Request] Mengambil detail karakter ID: ${id}...`);
        const url = `${this.base}/ai/ai_character/${id}`;
        const resp = await axios.get(url, {
          headers: this.hdr()
        });
        c = resp?.data?.data?.data || resp?.data?.data || resp?.data;
      }
      if (!c || !c._id && !c.characterName) {
        throw new Error("Data karakter tidak ditemukan atau ID tidak valid.");
      }
      this.char = c;
      this.user = user_name || this.user || "User";
      this.persona = persona || this.persona || "";
      this.hist = this.bld(this.char, this.user, this.persona);
      console.log(`[Success] Karakter "${this.char?.characterName}" siap. Total history awal: ${this.hist.length} pesan.`);
      return this.res(true, this.char);
    } catch (err) {
      console.log(`[Error] setChar gagal: ${err?.message || err}`);
      return this.res(false, {
        error: err?.response?.data || err?.message || "Error setChar"
      });
    }
  }
  async trending({
    ...rest
  } = {}) {
    console.log("[Process] Mengambil data trending...");
    try {
      const p = {
        page: rest?.page ? Number(rest.page) : 1,
        limit: rest?.limit ? Number(rest.limit) : 10,
        adultContent: rest?.adult_content !== undefined ? String(rest.adult_content) === "true" : false,
        safeMode: rest?.safe_mode !== undefined ? String(rest.safe_mode) === "true" : true
      };
      const url = `${this.base}/topdata/trending`;
      const response = await axios.get(url, {
        params: p,
        headers: this.hdr()
      });
      const list = response?.data?.data?.characters || response?.data?.data || [];
      return this.res(true, list);
    } catch (err) {
      console.log(`[Error] Trending gagal: ${err?.message || err}`);
      return this.res(false, {
        error: err?.response?.data || err?.message || "Error trending"
      });
    }
  }
  async search({
    query,
    ...rest
  } = {}) {
    console.log(`[Process] Mencari karakter: "${query || ""}"...`);
    try {
      if (!query) throw new Error('Parameter "query" wajib diisi.');
      const p = {
        characterSort: rest?.character_sort ? rest.character_sort : "relevance",
        seriesSort: rest?.series_sort ? rest.series_sort : "favorites",
        adultContent: rest?.adult_content !== undefined ? String(rest.adult_content) === "true" : false,
        safeMode: rest?.safe_mode !== undefined ? String(rest.safe_mode) === "true" : true
      };
      const url = `${this.base}/explore/search_explore_tab/${encodeURIComponent(query)}`;
      const response = await axios.get(url, {
        params: p,
        headers: this.hdr()
      });
      const d = response?.data?.data ? response.data.data : response?.data;
      return this.res(true, d);
    } catch (err) {
      console.log(`[Error] Search gagal: ${err?.message || err}`);
      return this.res(false, {
        error: err?.response?.data || err?.message || "Error search"
      });
    }
  }
  async chat({
    prompt,
    messages,
    ...rest
  } = {}) {
    console.log("[Process] Mengirim chat...");
    try {
      if (!prompt) throw new Error('Parameter "prompt" wajib diisi.');
      const targetId = rest?.id || rest?.user_id || rest?.id_user || rest?.char_id || rest?.character_id;
      const charData = rest?.character;
      if (targetId || charData) {
        const setup = await this.setChar({
          id: targetId,
          character: typeof charData === "string" ? JSON.parse(charData) : charData,
          user_name: rest?.user_name || rest?.name || this.user,
          persona: rest?.persona || this.persona
        });
        if (!setup.status) {
          throw new Error(setup?.result?.error || "Gagal menyiapkan template karakter dari ID.");
        }
      }
      let historyList = messages || rest?.history;
      if (typeof historyList === "string") {
        try {
          historyList = JSON.parse(historyList);
        } catch (_) {
          historyList = null;
        }
      }
      let activeMessages = [];
      if (Array.isArray(historyList) && historyList.length > 0) {
        const hasSystem = historyList.some(m => m.role === "system");
        activeMessages = !hasSystem && this.hist.length > 0 ? [...this.hist, ...historyList] : [...historyList];
      } else {
        activeMessages = this.hist.length > 0 ? this.hist : [];
      }
      const formattedPrompt = `[Reply in English (en) — narration, *actions*, and dialogue alike.]\n\n${prompt}`;
      activeMessages.push({
        role: "user",
        content: formattedPrompt
      });
      const payload = {
        messages: activeMessages,
        max_completion_tokens: rest?.max_tokens ? Number(rest.max_tokens) : 90,
        temperature: rest?.temperature ? Number(rest.temperature) : .85,
        repetition_penalty: rest?.repetition_penalty ? Number(rest.repetition_penalty) : 1.05,
        top_k: rest?.top_k !== undefined ? Number(rest.top_k) : 0,
        frequency_penalty: rest?.frequency_penalty !== undefined ? Number(rest.frequency_penalty) : 0,
        top_p: rest?.top_p ? Number(rest.top_p) : .9
      };
      const url = `${this.base}/trial/no_login_deepseek_message/`;
      console.log(`[Request] POST -> ${url} | Total Messages: ${activeMessages.length}`);
      const response = await axios.post(url, payload, {
        headers: this.hdr()
      });
      const resData = response?.data;
      const reply = resData?.choices?.[0]?.message?.content || resData?.data?.choices?.[0]?.message?.content || resData?.message || resData?.text || "";
      if (reply) {
        activeMessages.push({
          role: "assistant",
          content: reply
        });
      }
      return this.res(true, {
        reply: reply,
        messages: activeMessages
      });
    } catch (err) {
      console.log(`[Error] Chat gagal: ${err?.message || err}`);
      return this.res(false, {
        error: err?.response?.data || err?.message || "Error chat"
      });
    }
  }
}
export default async function handler(req, res) {
  try {
    const queryParams = req.method === "GET" ? req.query : req.body;
    const {
      action,
      ...params
    } = queryParams || {};
    const validActions = ["trending", "search", "chat"];
    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: validActions,
        usage: {
          examples: ["/?action=trending&page=1&limit=10", "/?action=search&query=demon", "/?action=chat&prompt=Hello&id=64f5ab3...&user_name=Alex"]
        }
      });
    }
    if (!validActions.includes(action)) {
      return res.status(400).json({
        status: false,
        error: `Action tidak valid: "${action}".`,
        valid_actions: validActions
      });
    }
    const api = new StoryChat(params);
    let response;
    switch (action) {
      case "trending": {
        response = await api.trending(params);
        break;
      }
      case "search": {
        const query = params.query || params.q;
        if (!query || !String(query).trim()) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search({
          query: query,
          ...params
        });
        break;
      }
      case "chat": {
        const prompt = params.prompt || params.text;
        if (!prompt || !String(prompt).trim()) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' atau 'text' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat({
          prompt: prompt,
          ...params
        });
        break;
      }
    }
    if (response && response.status) {
      return res.status(200).json({
        status: true,
        action: action,
        result: response.result
      });
    } else {
      return res.status(400).json({
        status: false,
        action: action,
        error: response?.result?.error || "Gagal memproses request."
      });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Handler StoryChat:`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error?.message || "Unknown Error"
    });
  }
}