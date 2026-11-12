import axios from "axios";
const API_KEY = "AIzaSyBxKrGul3jgna-EpYYBf4nInHsuZHs2dnY";
const URL_API = "https://us-central1-aichatbot-223a8.cloudfunctions.net/openAiStream";
class ChatBotx {
  async auth() {
    try {
      const res = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
        returnSecureToken: true
      });
      return res.data.idToken;
    } catch (err) {
      throw new Error(`Auth Gagal: ${err.response?.data?.error?.message || err.message}`);
    }
  }
  async chat({
    token,
    prompt,
    messages = [],
    ...rest
  }) {
    let activeToken = token;
    if (!activeToken) {
      console.log("Mencoba masuk Guest via REST API...");
      activeToken = await this.auth();
      console.log("Login sukses via API!\n");
    }
    if (prompt) {
      messages.push({
        role: "user",
        content: prompt
      });
    }
    const payload = {
      model: "gpt-4",
      buildNumber: "102",
      task: "general_chat",
      messages: messages,
      ...rest
    };
    const chunks = [];
    try {
      const res = await axios({
        method: "post",
        url: URL_API,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`
        },
        data: payload,
        responseType: "stream"
      });
      return new Promise(resolve => {
        let buffer = "";
        let isDone = false;
        res.data.on("data", chunk => {
          if (isDone) return;
          buffer += chunk.toString();
          let lines = buffer.split("\n");
          buffer = lines.pop();
          for (const line of lines) {
            const cleanLine = line.trimStart();
            if (!cleanLine || !cleanLine.startsWith("data:")) continue;
            if (cleanLine.includes("[DONE]")) {
              console.log("\n\n[Stream Selesai]");
              isDone = true;
              res.data.destroy();
              resolve({
                status: "success",
                result: chunks.join(""),
                token: activeToken,
                chunks: chunks
              });
              return;
            }
            const rawData = cleanLine.substring(5).trim();
            try {
              const parsed = JSON.parse(rawData);
              if (typeof parsed === "object" && parsed !== null) {
                const txt = parsed.choices?.[0]?.delta?.content || "";
                if (txt) {
                  process.stdout.write(txt);
                  chunks.push(txt);
                }
              } else if (typeof parsed === "string") {
                process.stdout.write(parsed);
                chunks.push(parsed);
              }
            } catch (e) {
              process.stdout.write(rawData);
              chunks.push(rawData);
            }
          }
        });
        res.data.on("end", () => {
          if (!isDone) {
            resolve({
              status: "success",
              result: chunks.join(""),
              token: activeToken,
              chunks: chunks
            });
          }
        });
      });
    } catch (err) {
      return {
        status: "error",
        result: err.message,
        token: activeToken,
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
  const api = new ChatBotx();
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