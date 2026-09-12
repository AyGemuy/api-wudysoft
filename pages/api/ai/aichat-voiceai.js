import axios from "axios";
class PhotoReadyAI {
  constructor() {
    this.url = "https://api.photoready.ai/chat/v1/completions";
    this.headers = {
      "User-Agent": "okhttp/5.3.2",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json"
    };
    this.sys = {
      content: "You are Chatbot Assistant from AI Chat — an intelligent, friendly, and helpful in-app companion. Your main goal is to assist users with their questions, guide them to useful tools, and provide natural, human-like conversations. When responding, sound conversational, concise, and emotionally engaging — professional yet approachable. Never mention that you are an AI model; instead, act as a built-in smart assistant. If a question is unrelated to the app, still provide accurate and helpful information. ",
      role: "system"
    };
    this.hist = [];
  }
  fmt(prompt, msgs) {
    try {
      console.log("[LOG] Menyiapkan dan memformat riwayat pesan...");
      let list = Array.isArray(msgs) && msgs?.length > 0 ? [...msgs] : [...this.hist];
      const hasSys = list?.[0]?.role === "system" ? true : false;
      list = hasSys ? list : [this.sys, ...list];
      if (prompt) {
        console.log("[LOG] Menambahkan prompt ke daftar pesan...");
        list.push({
          role: "user",
          content: prompt
        });
      }
      return list;
    } catch (err) {
      console.error("[LOG ERROR fmt]:", err?.message || "Gagal memformat pesan");
      return [this.sys, {
        role: "user",
        content: prompt || ""
      }];
    }
  }
  async req(body) {
    try {
      console.log("[LOG] Mengirim HTTP POST request ke server...");
      const res = await axios({
        method: "POST",
        url: this.url,
        headers: this.headers,
        data: body
      });
      console.log("[LOG] Respons data berhasil didapatkan.");
      return res?.data || null;
    } catch (err) {
      console.error("[LOG ERROR req]:", err?.response?.data || err?.message || "Request gagal");
      return {
        status: "error",
        message: err?.response?.data || err?.message || "Gagal menghubungi server"
      };
    }
  }
  async chat({
    prompt,
    messages,
    ...rest
  } = {}) {
    try {
      console.log("[LOG] Memulai eksekusi chat...");
      const msgList = this.fmt(prompt, messages);
      const payload = {
        messages: msgList,
        model: rest?.model ? rest.model : "meta-llama/llama-3.1-8b-instruct",
        streaming: rest?.streaming ? true : false,
        ...rest
      };
      const result = await this.req(payload);
      if (result?.status === "error") {
        console.log("[LOG] Eksekusi dihentikan karena error pada request.");
        return result;
      }
      const assistantMsg = result?.data?.message || result?.message || null;
      if (assistantMsg) {
        console.log("[LOG] Menyimpan riwayat obrolan...");
        this.hist = [...msgList, assistantMsg];
      }
      console.log("[LOG] Proses chat selesai.");
      return result;
    } catch (err) {
      console.error("[LOG ERROR chat]:", err?.message || "Terjadi kesalahan internal");
      return {
        status: "error",
        message: err?.message || "Terjadi kesalahan pada alur chat"
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
  const api = new PhotoReadyAI();
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