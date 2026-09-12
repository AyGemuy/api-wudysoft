import axios from "axios";
import FormData from "form-data";
class MentorChat {
  constructor() {
    this.log = function(step, info) {
      console.log(`[${step}]`, typeof info === "object" ? info?.status || info?.code || "" : info);
    };
    this.cfg = {
      chat: {
        req: ["prompt"],
        url: "https://mentorfunc-gjd5ayb5aggxcrae.uksouth-01.azurewebsites.net/api/CallOpenAI?code=6H82HQ6dYt2YbXaYx45-_G-kljq7hElUlcmhg5wtg9I-AzFu4UFGvA==",
        hdrs: {
          "User-Agent": "UnityPlayer/6000.3.15f1 (UnityWebRequest/1.0, libcurl/8.10.1-DEV)",
          "Accept-Encoding": "deflate, gzip",
          "Content-Type": "application/json",
          "s-header": "MzU1",
          "X-Unity-Version": "6000.3.15f1"
        },
        dats: {
          model: "gpt-5.4",
          temperature: .7,
          n: 1,
          stream: false,
          max_completion_tokens: 2048,
          presence_penalty: 0,
          frequency_penalty: 0
        }
      },
      rembg: {
        req: ["image"],
        url: "https://remove-background18.p.rapidapi.com/public/remove-background/file",
        hdrs: {
          "User-Agent": "UnityPlayer/6000.3.15f1 (UnityWebRequest/1.0, libcurl/8.10.1-DEV)",
          "Accept-Encoding": "deflate, gzip",
          "X-Unity-Version": "6000.3.15f1",
          "x-rapidapi-host": "remove-background18.p.rapidapi.com",
          "x-rapidapi-key": "3b671d0558msh9c7c75e99205a94p1ccb30jsn8c294b72973d"
        }
      },
      upscale: {
        req: ["image"],
        url: "https://us-central1-aiplatform.googleapis.com/v1/projects/mentorai-e5065/locations/us-central1/publishers/google/models/imagen-4.0-upscale-preview:predict",
        hdrs: {
          "User-Agent": "UnityPlayer/6000.3.15f1 (UnityWebRequest/1.0, libcurl/8.10.1-DEV)",
          "Accept-Encoding": "deflate, gzip",
          "Content-Type": "application/json",
          "X-Unity-Version": "6000.3.15f1",
          authorization: "Bearer ya29.c.c0AZ4bNpYdbp-Juz9rsIhkVYKhyhna61o0vyeXJBayf2AmlDOAEGRC4Z47HdF4nI1T6RyWMmdMNxkF-ntvT6ZdaVPADqdvAdMf5idyRj8-JLtq7edhbbT0cduhmMjBB2TWOmg965t733axdsYGQMwd3-xDtJKlE5Ii9Zlr_ePGHLGAJPuIUkSiNuTmd__zZ8xX3vwouMbLg4NDNtpr7ZdC29OuUcUhY3EzghYLsiPnBOstowaMfJzxt75d1mfUO7_wC_X-ADvA9_4hLdnnqW_ovA0lKNGrM7EIZoJPkDucVNajr6OemzWMu4U5SqN7M6w1vh9qsjwsDbw-FYhSvCNx0wfx7czXrZIL13cuN8fMSCKFF38BgO2f8d8AH385CsVSQryjk39bykJcypb3axQrqV-iw6bxsq5XolBrkjjsdVW7UM_cg2rrnZuBg65QFu_MavkyOYMY9wISnvi_U64ck4lc7l64RUuFpB6WF2Md7MljnaqM9MagjhWgkWYUSib5JtIOJF47Fge9bo4kRqFeIbcO52t7YpdB2o7uv40f_QqgOw8fc30kJSBZV6Q0xm8p52xxMhkflO6FcuOjas4Bh25cJ_y4OoJ-B_9qZI_qozoVt_xirpIoBxW2rrsrhecBn1r-FI6FSW1USI0F4oti4O1j4_68Oz2-biR9fU07iey0UUZ85Fd5O_nb9QbXam8zukVq5S7mJ4nktdQ04IwSfu4_XvmFf1pUweWs4c7jU293FonulRRrRphRSf4ksps1hpMqpJ004nbbyRXkagyBljxphjMkUIRkB8Vtf-Z5SU8fJXdu9FMRIVyfnvQ2sn3vgw_zhy8yxQso9XWbM8Iq7Ucvc_Y4S242yStn6mS5-7RFOOVrx9SRlndokr1hS64b6FUyu_ROr8Fb3U-9_4ywU-upby1heF28n0X-5pOXZVbqxb2yQ8BRViQMVJXinzjb5OrtJvMFrlz81trBsF09BsvXsqadIYvbOYzc9QBtojVoxOtsiryFRB_"
        },
        dats: {
          sampleCount: 1,
          mode: "upscale",
          upscaleConfig: {
            upscaleFactor: "x4"
          }
        }
      }
    };
  }
  gda() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  async _slv(imgInput) {
    try {
      if (!imgInput) return null;
      if (Buffer.isBuffer(imgInput)) return {
        type: "buffer",
        data: imgInput
      };
      if (typeof imgInput === "string") {
        if (imgInput.startsWith("http://") || imgInput.startsWith("https://")) {
          try {
            const res = await axios.get(imgInput, {
              responseType: "arraybuffer"
            });
            return {
              type: "buffer",
              data: Buffer.from(res.data)
            };
          } catch (e) {
            return {
              type: "url",
              data: imgInput
            };
          }
        }
        if (imgInput.startsWith("data:image")) {
          const b64 = imgInput.split(",")[1] || imgInput;
          return {
            type: "b64",
            data: b64
          };
        }
        return {
          type: "b64",
          data: imgInput
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  async generate({
    mode,
    prompt,
    messages,
    image,
    ...rest
  }) {
    try {
      this.log("INIT_PROCESS", mode || "chat");
      const availableModes = Object.keys(this.cfg);
      const md = mode || "chat";
      if (!availableModes.includes(md)) {
        return {
          success: false,
          error: `Mode "${md}" tidak valid.`
        };
      }
      let currentCfg = this.cfg[md];
      const missingInputs = currentCfg.req.filter(f => f === "prompt" ? !prompt : f === "image" ? !image : false);
      if (missingInputs.length > 0) {
        return {
          success: false,
          error: `Input wajib kurang: ${missingInputs.join(", ")}`
        };
      }
      const headers = {
        ...currentCfg.hdrs
      };
      switch (md) {
        case "chat": {
          const msgs = messages || [];
          if (msgs.length === 0) {
            msgs.push({
              content: `You are a ChatGPT, a large language model trained by OpenAI, based on the GPT-5.4 architecture. Knowledge cutoff: 2023-10  Current date: ${this.gda()}`,
              role: "system"
            });
          }
          const img = await this._slv(image);
          if (img) {
            const url = img.type === "b64" ? `data:image/*;base64,${img.data}` : img.data;
            msgs.push({
              role: "user",
              content: [{
                type: "text",
                text: prompt || "hy"
              }, {
                type: "image_url",
                image_url: {
                  url: url
                }
              }]
            });
          } else {
            msgs.push({
              role: "user",
              content: prompt || "hy"
            });
          }
          const payload = {
            ...currentCfg.dats,
            messages: msgs,
            ...rest
          };
          if (rest?.sHeader) headers["s-header"] = rest.sHeader;
          let finalUrl = currentCfg.url;
          if (rest?.code) {
            finalUrl = `${currentCfg.url.split("?code=")[0]}?code=${rest.code}`;
          }
          try {
            this.log("SEND_REQUEST_CHAT", "executed");
            const res = await axios.post(finalUrl, payload, {
              headers: headers
            });
            return res?.data || null;
          } catch (e) {
            return {
              success: false,
              error: e?.response?.data || e?.message
            };
          }
        }
        case "rembg": {
          const img = await this._slv(image);
          if (!img) return {
            success: false,
            error: "Gagal memproses gambar."
          };
          const form = new FormData();
          if (img.type === "buffer") {
            form.append("file", img.data, {
              filename: "image.png",
              contentType: "image/png"
            });
          } else {
            form.append("file", Buffer.from(img.data, "base64"), {
              filename: "image.png",
              contentType: "image/png"
            });
          }
          const rembgHeaders = {
            ...headers,
            ...form.getHeaders()
          };
          if (rest?.rapidApiHost) rembgHeaders["x-rapidapi-host"] = rest.rapidApiHost;
          if (rest?.rapidApiKey) rembgHeaders["x-rapidapi-key"] = rest.rapidApiKey;
          try {
            this.log("SEND_REQUEST_REMBG", "processing");
            const res = await axios.post(currentCfg.url, form, {
              headers: rembgHeaders
            });
            return res?.data || null;
          } catch (e) {
            return {
              success: false,
              error: e?.response?.data || e?.message
            };
          }
        }
        case "upscale": {
          const img = await this._slv(image);
          if (!img) return {
            success: false,
            error: "Input gambar untuk upscale wajib disertakan."
          };
          let b64 = "";
          if (img.type === "b64") b64 = img.data;
          if (img.type === "buffer") b64 = img.data.toString("base64");
          if (img.type === "url") return {
            success: false,
            error: "Rute ini membutuhkan image berupa base64 atau buffer."
          };
          const payload = {
            instances: [{
              prompt: prompt || "Upscale the image",
              image: {
                bytesBase64Encoded: b64
              }
            }],
            parameters: {
              ...currentCfg.dats,
              ...rest?.parameters
            }
          };
          if (rest?.auth) headers["authorization"] = rest.auth;
          try {
            this.log("SEND_REQUEST_UPSCALE", "direct_cfg_payload_route");
            const res = await axios.post(currentCfg.url, payload, {
              headers: headers
            });
            return res?.data || null;
          } catch (e) {
            return {
              success: false,
              error: e?.response?.data || e?.message
            };
          }
        }
      }
    } catch (e) {
      return {
        success: false,
        error: e?.response?.data || e?.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new MentorChat();
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