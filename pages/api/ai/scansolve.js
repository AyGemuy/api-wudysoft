import axios from "axios";
class ScanSolve {
  constructor() {
    this.base = "https://scansolve-a8a0754403fb.herokuapp.com";
    this.api = "/api";
    this.img = "/api/images";
    this.modes = ["tutor", "answer", "explain", "lesson", "image"];
  }
  async _req(endpoint, body) {
    console.log(`[PROCESS] Sending request to: ${endpoint}`);
    console.log(`[PAYLOAD]`, JSON.stringify(body));
    try {
      const res = await axios.post(this.base + endpoint, body, {
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "User-Agent": "okhttp/4.9.3",
          "Accept-Encoding": "gzip",
          Connection: "keep-alive"
        }
      });
      console.log(`[SUCCESS] Response status: ${res.status}`);
      return res;
    } catch (err) {
      console.error(`[ERROR] Request failed on ${endpoint}:`, err.message);
      if (err.response) {
        console.error(`[ERROR DATA]`, err.response.data);
        return {
          success: false,
          error: `Server returned error: ${err.response.status} - ${JSON.stringify(err.response.data)}`
        };
      }
      return {
        success: false,
        error: err.message
      };
    }
  }
  _solve(imageInput) {
    if (!imageInput) return null;
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(imageInput)) {
      return `data:image/jpeg;base64,${imageInput.toString("base64")}`;
    }
    if (typeof imageInput === "string") {
      if (imageInput.startsWith("data:image/") || imageInput.startsWith("data:application/")) {
        return imageInput;
      }
      if (/^[A-Za-z0-9+/=]+$/.test(imageInput.trim()) && imageInput.length > 100) {
        return `data:image/jpeg;base64,${imageInput.trim()}`;
      }
      return imageInput.trim();
    }
    return null;
  }
  async generate({
    mode,
    prompt,
    messages = [],
    model,
    image,
    ...rest
  }) {
    if (!mode) {
      return {
        success: false,
        error: `[VALIDATION ERROR] Properti "mode" wajib diisi. Pilih dari: ${this.modes.join(", ")}`
      };
    }
    if (!this.modes.includes(mode)) {
      return {
        success: false,
        error: `[VALIDATION ERROR] Mode "${mode}" tidak tersedia. Pilih dari: ${this.modes.join(", ")}`
      };
    }
    if (mode === "image" && (!prompt || typeof prompt !== "string" || !prompt.trim())) {
      return {
        success: false,
        error: '[VALIDATION ERROR] Mode "image" wajib menyertakan properti "prompt" berupa string.'
      };
    }
    if (mode !== "image" && (!prompt && (!messages || messages.length === 0) && !image)) {
      return {
        success: false,
        error: '[VALIDATION ERROR] Mode teks membutuhkan setidaknya "prompt", "messages", atau "image".'
      };
    }
    try {
      let endpoint = this.api;
      let payload = {};
      const parsedImage = this._solve(image);
      let userContent = prompt || "";
      if (parsedImage && mode !== "image") {
        userContent = [];
        if (prompt) {
          userContent.push({
            type: "text",
            text: prompt
          });
        }
        userContent.push({
          type: "image_url",
          image_url: {
            url: parsedImage
          }
        });
      }
      switch (mode) {
        case "tutor": {
          const systemContent = `You are a tutor that always responds in the Socratic style. 
            You *never* give the student the answer, but always try to ask 
            just the right question to help them learn to think for 
            themselves. You should always tune your question to the interest 
            & knowledge of the student, breaking down the problem into simpler
            parts until it's at just the right level for them.`;
          payload = {
            model: model || "gpt-4o-mini",
            messages: [{
              role: "system",
              content: systemContent
            }, ...messages, ...userContent ? [{
              role: "user",
              content: userContent
            }] : []],
            temperature: 0,
            max_tokens: 1e3,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
          };
          break;
        }
        case "answer": {
          const systemContent = `You are ScanSolve, a large language model trained by ScanSolve Team. Please provide the correct answer for each question and aim for maximum accuracy. Make the correct answer bold and clear.`;
          payload = {
            model: model || "gpt-4o-mini",
            messages: [{
              role: "system",
              content: systemContent
            }, ...messages, ...userContent ? [{
              role: "user",
              content: userContent
            }] : []],
            temperature: 0,
            max_tokens: 1e3,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
          };
          break;
        }
        case "explain": {
          const systemContent = `You are ScanSolve, a large language model trained by ScanSolve Team. Please provide 
            a detailed explanation for the answer, assuming that the answer has already 
            been generated. Aim for maximum accuracy and clarity by taking the user through 
            each step to arrive at the solution. Additionally, strive to make the explanation as 
            detailed and simple as possible to help the user understand the concept better. 
            If possible, provide accurate sources to back up the explanation.`;
          let explainUserContent = userContent;
          if (typeof userContent === "string" && prompt) {
            explainUserContent = `This is the question: ${prompt}`;
          } else if (Array.isArray(userContent)) {
            explainUserContent = userContent.map(item => item.type === "text" ? {
              type: "text",
              text: `This is the question: ${item.text}`
            } : item);
          }
          payload = {
            model: model || "gpt-4o-mini",
            messages: [{
              role: "system",
              content: systemContent
            }, ...messages, ...explainUserContent ? [{
              role: "user",
              content: explainUserContent
            }] : []],
            temperature: 0,
            max_tokens: 1e3,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
          };
          break;
        }
        case "lesson": {
          const systemContent = `Break down ${prompt || "the concept"} into smaller, easier-to-understand parts. Use analogies and 
            real-life examples to simplify the concept and make it more relatable and your 
            response should be very short as I don't want to get bored.`;
          payload = {
            model: model || "gpt-3.5-turbo",
            messages: [{
              role: "system",
              content: systemContent
            }, ...messages, ...userContent ? [{
              role: "user",
              content: userContent
            }] : []],
            temperature: 0,
            max_tokens: 1e3,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
          };
          break;
        }
        case "image": {
          endpoint = this.img;
          payload = {
            prompt: prompt,
            model: model || "gpt-image-2"
          };
          break;
        }
      }
      const finalPayload = {
        ...payload,
        ...rest
      };
      if (parsedImage && mode !== "image" && !rest.model) {
        finalPayload.model = "gpt-4o-mini";
      }
      const res = await this._req(endpoint, finalPayload);
      if (res.success === false) {
        return res;
      }
      return res.data;
    } catch (error) {
      console.error(`[METHOD ERROR] Error di generate(${mode}):`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new ScanSolve();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}