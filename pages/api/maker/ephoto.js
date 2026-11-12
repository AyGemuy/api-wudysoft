import axios from "axios";
import FormData from "form-data";
import qs from "qs";
import * as cheerio from "cheerio";
class Ephoto {
  constructor() {
    this.cfg = {
      base: "https://en.ephoto360.com",
      api: "https://en.ephoto360.com/effect/create-image",
      headers: {
        nav: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin"
        },
        ajax: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json, text/javascript, */*; q=0.01",
          "X-Requested-With": "XMLHttpRequest",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin"
        }
      },
      qs: {
        arrayFormat: "brackets"
      }
    };
  }
  log(msg) {
    console.log(`[Ephoto] ${msg}`);
  }
  mergeCookie(old, headers) {
    const fresh = headers?.["set-cookie"]?.map(c => c.split(";")[0]).join("; ") || "";
    return old ? `${old}; ${fresh}` : fresh;
  }
  async search({
    query,
    ...rest
  }) {
    try {
      this.log(`Searching: ${query}`);
      const {
        data
      } = await axios.get(`${this.cfg.base}/index/search`, {
        params: {
          q: query,
          ...rest
        },
        paramsSerializer: p => qs.stringify(p, this.cfg.qs),
        headers: this.cfg.headers.nav
      });
      const $ = cheerio.load(data);
      const results = [];
      $(".div-effect a").each((_, el) => {
        const href = $(el).attr("href");
        const title = $(el).find(".title-effect-home").text()?.trim() || "";
        const img = $(el).find("img").attr("src") || "";
        if (href) {
          results.push({
            title: title,
            url: href.startsWith("http") ? href : `${this.cfg.base}${href}`,
            thumb: img.startsWith("http") ? img : `${this.cfg.base}${img}`
          });
        }
      });
      this.log(`Found ${results.length} results`);
      return {
        success: true,
        data: results
      };
    } catch (e) {
      this.log(`Search failed: ${e.message}`);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async check({
    url,
    ...rest
  }) {
    try {
      this.log(`Checking: ${url}`);
      const {
        data
      } = await axios.get(url, {
        headers: this.cfg.headers.nav,
        ...rest
      });
      const $ = cheerio.load(data);
      const form = $("form.ajax-submit");
      const inputs = {
        text: [],
        image: [],
        hidden: {}
      };
      form.find('input[name="text[]"]').each((i, el) => {
        const label = $(el).closest(".item-content").find("label").text()?.trim() || `Text ${i + 1}`;
        const ph = $(el).attr("placeholder") || "";
        inputs.text.push({
          label: label,
          placeholder: ph,
          required: label.includes("*")
        });
      });
      form.find('input[name="image[]"]').each((i, el) => {
        const label = $(el).closest(".item-content").find(".choose_file_button").text()?.trim() || `Image ${i + 1}`;
        inputs.image.push({
          label: label,
          required: true
        });
      });
      form.find('input[type="hidden"]').each((_, el) => {
        const name = $(el).attr("name");
        const val = $(el).attr("value");
        if (name && !name.includes("[]")) inputs.hidden[name] = val;
      });
      this.log(`Form analyzed: ${inputs.text.length} text, ${inputs.image.length} image`);
      return {
        success: true,
        inputs: inputs
      };
    } catch (e) {
      this.log(`Check failed: ${e.message}`);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async session(url, form) {
    try {
      this.log("Getting session...");
      const {
        data,
        headers
      } = await axios.get(url, {
        headers: this.cfg.headers.nav
      });
      let cookie = this.mergeCookie("", headers);
      const $ = cheerio.load(data);
      const token = $('input[name="token"]').val();
      const server = $('input[name="build_server"]').val();
      const serverId = $('input[name="build_server_id"]').val();
      if (!token) throw new Error("Token not found");
      const payload = {
        submit: "GO",
        token: token,
        build_server: server,
        build_server_id: serverId,
        text: form.text || [],
        image: form.image || []
      };
      const res = await axios.post(url, qs.stringify(payload, this.cfg.qs), {
        headers: {
          ...this.cfg.headers.nav,
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: url,
          Cookie: cookie
        }
      });
      cookie = this.mergeCookie(cookie, res.headers);
      const $2 = cheerio.load(res.data);
      const raw = $2("#form_value_input").val();
      if (!raw) throw new Error("Session expired or rate limited");
      const sess = JSON.parse(raw);
      this.log("Session obtained");
      return {
        ...sess,
        cookie: cookie,
        referer: url
      };
    } catch (e) {
      throw new Error(`Session: ${e.message}`);
    }
  }
  async process(sess, form) {
    try {
      this.log("Processing...");
      const hasImage = form.image?.length > 0;
      if (hasImage) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(sess)) {
          if (k === "cookie" || k === "referer") continue;
          if (Array.isArray(v)) {
            for (const item of v) fd.append(`${k}[]`, item);
          } else {
            fd.append(k, v);
          }
        }
        fd.append("autocomplete", "");
        for (const val of form.text || []) fd.append("text[]", val);
        for (const img of form.image || []) {
          if (!img) continue;
          if (typeof img === "string") {
            if (img.startsWith("http")) {
              const {
                data
              } = await axios.get(img, {
                responseType: "arraybuffer"
              });
              fd.append("image[]", Buffer.from(data), {
                filename: "img.jpg"
              });
            } else if (img.startsWith("data:")) {
              const b64 = img.split(",")[1];
              const buf = Buffer.from(b64, "base64");
              fd.append("image[]", buf, {
                filename: "img.jpg"
              });
            } else {
              const buf = Buffer.from(img, "base64");
              fd.append("image[]", buf, {
                filename: "img.jpg"
              });
            }
          } else if (Buffer.isBuffer(img)) {
            fd.append("image[]", img, {
              filename: "img.jpg"
            });
          }
        }
        const {
          data
        } = await axios.post(this.cfg.api, fd, {
          headers: {
            ...fd.getHeaders(),
            "User-Agent": this.cfg.headers.ajax["User-Agent"],
            Accept: this.cfg.headers.ajax["Accept"],
            "X-Requested-With": this.cfg.headers.ajax["X-Requested-With"],
            Referer: sess.referer,
            Cookie: sess.cookie
          }
        });
        if (data?.success) {
          const img = `${sess.build_server || ""}${data.image || ""}`;
          this.log("Success!");
          return {
            success: true,
            image: img,
            data: data
          };
        }
        throw new Error(data?.message || "Processing failed");
      } else {
        const payload = {};
        for (const [k, v] of Object.entries(sess)) {
          if (k !== "cookie" && k !== "referer") payload[k] = v;
        }
        payload.autocomplete = "";
        payload.text = form.text || [];
        const {
          data
        } = await axios.post(this.cfg.api, qs.stringify(payload, this.cfg.qs), {
          headers: {
            ...this.cfg.headers.ajax,
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Referer: sess.referer,
            Cookie: sess.cookie
          }
        });
        if (data?.success) {
          const img = `${sess.build_server || ""}${data.image || ""}`;
          this.log("Success!");
          return {
            success: true,
            image: img,
            data: data
          };
        }
        throw new Error(data?.message || "Processing failed");
      }
    } catch (e) {
      throw new Error(`Process: ${e.message}`);
    }
  }
  async create({
    url = "https://en.ephoto360.com/create-pornhub-style-logos-online-free-549.html",
    text = ["Porn", "Hub"],
    image,
    ...rest
  }) {
    try {
      const txt = Array.isArray(text) ? text : text ? [text] : [];
      const img = Array.isArray(image) ? image : image ? [image] : [];
      if (!txt.length && !img.length) {
        throw new Error("Text or image required");
      }
      const sess = await this.session(url, {
        text: txt,
        image: img
      });
      const result = await this.process(sess, {
        text: txt,
        image: img
      });
      return result;
    } catch (e) {
      this.log(`Create failed: ${e.message}`);
      return {
        success: false,
        error: e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const availableActions = ["search", "check", "create"];
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi.",
      actions: availableActions
    });
  }
  const api = new Ephoto();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: "Param 'query' is required"
          });
        }
        response = await api.search(params);
        break;
      case "check":
        if (!params.url) {
          return res.status(400).json({
            error: "Param 'url' is required"
          });
        }
        response = await api.check(params);
        break;
      case "create":
        if (!params.url) {
          return res.status(400).json({
            error: "Param 'url' is required"
          });
        }
        response = await api.create(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}.`,
          valid_actions: availableActions
        });
    }
    return res.status(200).json(response);
  } catch (err) {
    console.error(`[FATAL] ${action}:`, err.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}