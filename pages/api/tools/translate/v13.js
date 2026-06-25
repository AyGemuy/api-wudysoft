import axios from "axios";
import FormData from "form-data";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class AnythingTranslate {
  constructor() {
    this.landing = "https://anythingtranslate.com/translator/";
    this.base = "";
    this.nonce = "";
    this.models = [];
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://anythingtranslate.com",
        pragma: "no-cache",
        referer: this.landing,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      },
      timeout: 3e4
    }));
  }
  _log(act, msg) {
    console.log(`[AnythingTranslate] [${act}] ${msg}`);
  }
  async _init() {
    try {
      this._log("Init", "Scanning landing page for configuration & models...");
      const res = await this.client.get(this.landing);
      const $ = cheerio.load(res.data);
      this.nonce = $("#master_translator_nonce").val() || "";
      const formAction = $(".comment-form").attr("action");
      this.base = formAction ? formAction.replace("wp-comments-post.php", "wp-admin/admin-ajax.php") : "https://anythingtranslate.com/wp-admin/admin-ajax.php";
      this.models = $("#mt-model-select option").get().map(el => $(el).val()).filter(Boolean);
      this._log("Init", `Base URL: ${this.base}`);
      this._log("Init", `Nonce Token: ${this.nonce || "Failed"}`);
      this._log("Init", `Available Models: [ ${this.models.join(", ")} ]`);
      return !!this.nonce;
    } catch (e) {
      this._log("Init Error", e.message);
      this.base = this.base || "https://anythingtranslate.com/wp-admin/admin-ajax.php";
      this.models = this.models.length ? this.models : ["newest", "legacy"];
      return false;
    }
  }
  async _img(item) {
    try {
      if (Buffer.isBuffer(item)) {
        return {
          value: item,
          options: {
            filename: `img_${Date.now()}.jpg`,
            contentType: "image/jpeg"
          }
        };
      }
      if (typeof item === "string") {
        if (item.startsWith("http")) {
          this._log("Image", "Downloading URL...");
          const res = await axios.get(item, {
            responseType: "arraybuffer"
          });
          return {
            value: res.data,
            options: {
              filename: item.split("/").pop() || "file.jpg",
              contentType: res.headers["content-type"] || "image/jpeg"
            }
          };
        }
        if (item.includes("base64,")) {
          const parts = item.split("base64,");
          const mime = parts[0]?.match(/:(.*?);/)?.[1] || "image/jpeg";
          const ext = mime.split("/")[1] || "jpg";
          return {
            value: Buffer.from(parts[1], "base64"),
            options: {
              filename: `b64_${Date.now()}.${ext}`,
              contentType: mime
            }
          };
        }
        if (/^[A-Za-z0-9+/=]+$/.test(item)) {
          return {
            value: Buffer.from(item, "base64"),
            options: {
              filename: `b64_${Date.now()}.jpg`,
              contentType: "image/jpeg"
            }
          };
        }
      }
      return null;
    } catch (e) {
      this._log("Image Error", e.message);
      return null;
    }
  }
  async chat({
    source,
    target,
    image,
    nonce,
    model,
    ...rest
  }) {
    if ((!this.nonce || !this.base || !this.models.length) && !nonce) {
      await this._init();
    }
    this._log("Translate", "Preparing request data...");
    const payload = {
      action: "do_master_translation",
      master_translator_nonce: nonce || this.nonce || "9d8da34226",
      to_translate: source || "Hai",
      translation_style: target || "To indonesia",
      translation_model: this.models.includes(model) ? model : "newest",
      is_language_swapped: "0",
      ...rest
    };
    try {
      const form = new FormData();
      Object.entries(payload).forEach(([key, val]) => {
        form.append(key, String(val));
      });
      const fileData = image ? await this._img(image) : null;
      if (fileData) {
        form.append("image_to_translate", fileData.value, fileData.options);
        this._log("Image", `Appended file: ${fileData.options.filename}`);
      } else {
        if (!rest?.image_to_translate) form.append("image_to_translate", "undefined");
      }
      this._log("HTTP", `Sending request using model [${payload.translation_model}] to: ${this.base}`);
      const response = await this.client.post(this.base, form, {
        headers: form.getHeaders()
      });
      const resData = response?.data || {};
      this._log("Success", `Response status: ${resData?.success || false}`);
      return {
        status: resData?.success || false,
        result: resData?.data || resData
      };
    } catch (err) {
      this._log("Error", err?.response?.data || err?.message);
      return {
        status: false,
        result: err?.response?.data || err?.message || "Terjadi kesalahan sistem"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.source) {
    return res.status(400).json({
      error: "Parameter 'source' diperlukan"
    });
  }
  const api = new AnythingTranslate();
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