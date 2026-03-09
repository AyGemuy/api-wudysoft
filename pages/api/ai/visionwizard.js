import axios from "axios";
import crypto from "crypto";
class VisionClient {
  constructor() {
    this.apiKey = "AIzaSyAwI1Ga6kweGpiIKiqeGtfV-QbbRIJbRFM";
    this.projectId = "visionwizard-chatbot";
    this.idToken = null;
    this.userId = null;
    this.chatId = crypto.randomUUID();
    this.messages = [];
    this.config = {
      llm: "gpt-4o-mini-2024-07-18",
      chat_type: "regular",
      temperature: .7,
      max_tokens: 700,
      system_prompt: "Assistant is AI Search and Chat Assistant, a large language model trained by Vision Wizard."
    };
  }
  toFirestoreMsg(role, content) {
    return {
      mapValue: {
        fields: {
          id: {
            stringValue: crypto.randomUUID()
          },
          role: {
            stringValue: role
          },
          content: {
            stringValue: content
          },
          createdAt: {
            timestampValue: new Date().toISOString()
          },
          feedback: {
            nullValue: null
          }
        }
      }
    };
  }
  async authenticate() {
    try {
      console.log("[*] Authenticating (Anonymous Sign-In)...");
      const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.apiKey}`;
      const authRes = await axios.post(authUrl, {
        returnSecureToken: true
      });
      this.idToken = authRes.data.idToken;
      this.userId = authRes.data.localId;
      console.log(`[+] Auth Success. UID: ${this.userId}`);
      console.log(`[*] Initializing Chat Session: ${this.chatId}`);
      const chatUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/users/${this.userId}/chats/${this.chatId}`;
      await axios.patch(chatUrl, {
        fields: {
          name: {
            stringValue: "Vision Chat Session"
          },
          status: {
            stringValue: "initial"
          },
          updated_at: {
            timestampValue: new Date().toISOString()
          },
          llm: {
            stringValue: this.config.llm
          },
          chat_type: {
            stringValue: this.config.chat_type
          },
          messages: {
            arrayValue: {
              values: []
            }
          }
        }
      }, {
        headers: {
          Authorization: `Bearer ${this.idToken}`
        }
      });
      console.log("[+] Chat Document Created.");
      return true;
    } catch (error) {
      console.error("[!] Auth/Init Error:", error.response?.data || error.message);
      throw error;
    }
  }
  async chat({
    model,
    prompt,
    messages,
    ...rest
  }) {
    try {
      if (!this.idToken) await this.authenticate();
      if (Array.isArray(messages)) {
        console.log(`[*] Injecting ${messages.length} messages into history.`);
        this.messages = [...this.messages, ...messages.map(m => m.mapValue ? m : this.toFirestoreMsg(m.role, m.content))];
      }
      const activeModel = model || this.config.llm;
      const settings = {
        ...this.config,
        ...rest
      };
      const backendParams = JSON.stringify({
        input_moderation: false,
        output_moderation: false,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        top_p: 1,
        system_prompt: settings.system_prompt
      });
      if (prompt) {
        console.log(`[User]: ${prompt}`);
        this.messages.push(this.toFirestoreMsg("user", prompt));
      }
      const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/users/${this.userId}/chats/${this.chatId}`;
      const params = `?updateMask.fieldPaths=status&updateMask.fieldPaths=updated_at&updateMask.fieldPaths=backend_parameters&updateMask.fieldPaths=messages&updateMask.fieldPaths=llm`;
      console.log(`[*] Sending request to AI (${activeModel})...`);
      await axios.patch(url + params, {
        fields: {
          status: {
            stringValue: "waiting"
          },
          llm: {
            stringValue: activeModel
          },
          updated_at: {
            timestampValue: new Date().toISOString()
          },
          backend_parameters: {
            stringValue: backendParams
          },
          messages: {
            arrayValue: {
              values: this.messages
            }
          }
        }
      }, {
        headers: {
          Authorization: `Bearer ${this.idToken}`
        }
      });
      const result = await this.waitForReply();
      return {
        result: result,
        history: this.messages,
        info: {
          chatId: this.chatId,
          userId: this.userId,
          model: activeModel,
          status: "success"
        }
      };
    } catch (error) {
      console.error("[!] Chat Error:", error.response?.data || error.message);
      return {
        result: null,
        error: error.message,
        history: this.messages,
        info: {
          status: "failed"
        }
      };
    }
  }
  async waitForReply() {
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/users/${this.userId}/chats/${this.chatId}`;
    console.log("[*] Waiting for AI response...");
    for (let i = 0; i < 60; i++) {
      try {
        const res = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${this.idToken}`
          }
        });
        const fields = res.data.fields;
        const status = fields.status?.stringValue;
        const serverMsgs = fields.messages?.arrayValue?.values || [];
        if (status === "failed") throw new Error("Server-side model error.");
        if (serverMsgs.length > this.messages.length) {
          const last = serverMsgs[serverMsgs.length - 1].mapValue.fields;
          if (last.role.stringValue === "assistant") {
            console.log(`[AI]: ${last.content.stringValue}`);
            this.messages = serverMsgs;
            return last.content.stringValue;
          }
        }
      } catch (e) {
        if (e.message.includes("model error")) throw e;
      }
      await new Promise(r => setTimeout(r, 3e3));
    }
    throw new Error("Polling timeout: AI response taking too long.");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new VisionClient();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}