import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import PROMPT from "@/configs/ai-prompt";
import SpoofHead from "@/lib/spoof-head";
class Gempix {
  constructor() {
    this.cfg = {
      base: {
        api: "https://gempix2img.org",
        mail: `https://${apiConfig.DOMAIN_URL}/api/mails/v22`,
        cdn: "https://file.gempix2img.org"
      },
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://gempix2img.org",
        referer: "https://gempix2img.org/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        priority: "u=1, i",
        ...SpoofHead()
      },
      endpoints: {
        auth: {
          csrf: "/api/auth/csrf",
          send: "/api/auth/send-code",
          cb: "/api/auth/callback/email-code?",
          session: "/api/auth/session",
          user: "/api/get-user-info"
        },
        upload: "/api/upload",
        models: {
          nano: {
            submit: "/api/nano-banana/kie/submit",
            status: "/api/nano-banana/status/"
          },
          sora: {
            submit: "/api/sora2/submit",
            status: "/api/sora2/status/"
          },
          veo: {
            submit: "/api/veo3/submit",
            status: "/api/veo3/status/"
          }
        }
      },
      defaults: {
        poll_max: 60,
        poll_ms: 3e3,
        model: "nano",
        prompt: PROMPT.text
      }
    };
    this.jar = new CookieJar();
    this.api = wrapper(axios.create({
      jar: this.jar,
      baseURL: this.cfg.base.api,
      headers: this.cfg.headers
    }));
  }
  log(msg, ...args) {
    console.log(`[Gempix] ${msg}`, ...args);
  }
  async sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  load(str) {
    try {
      const json = JSON.parse(Buffer.from(str, "base64").toString());
      this.jar.deserializeSync(json);
    } catch (e) {}
  }
  save() {
    try {
      return Buffer.from(JSON.stringify(this.jar.toJSON())).toString("base64");
    } catch {
      return null;
    }
  }
  check() {
    return this.jar.getCookiesSync(this.cfg.base.api).some(c => c.key.includes("session-token"));
  }
  async req(method, url, data = null, headers = {}) {
    try {
      return await this.api({
        method: method,
        url: url,
        data: data,
        headers: headers
      });
    } catch (e) {
      throw e?.response?.data || e;
    }
  }
  async login() {
    try {
      this.log("Auto-Auth initiated...");
      const mailUrl = `${this.cfg.base.mail}?action=create`;
      const {
        data: mailData
      } = await axios.get(mailUrl);
      const {
        email,
        id: mailId
      } = mailData || {};
      if (!email) throw new Error("Mail gen failed");
      this.log(`Mail: ${email}`);
      const csrf = (await this.req("GET", this.cfg.endpoints.auth.csrf))?.data?.csrfToken;
      await this.req("POST", this.cfg.endpoints.auth.send, {
        email: email
      });
      this.log("Waiting OTP...");
      let code = null;
      for (let i = 0; i < 20; i++) {
        await this.sleep(3e3);
        const {
          data: inbox
        } = await axios.get(`${this.cfg.base.mail}?action=inbox&id=${mailId}`);
        const msg = inbox?.messages?.[0];
        if (msg?.subject?.match(/(\d{6})/)) {
          code = msg.subject.match(/(\d{6})/)[1];
          break;
        }
      }
      if (!code) throw new Error("OTP timeout");
      const params = new URLSearchParams({
        email: email,
        code: code,
        csrfToken: csrf,
        redirect: "false",
        callbackUrl: `${this.cfg.base.api}/`
      });
      await this.req("POST", this.cfg.endpoints.auth.cb, params.toString(), {
        "content-type": "application/x-www-form-urlencoded",
        "x-auth-return-redirect": "1"
      });
      await this.req("GET", this.cfg.endpoints.auth.session);
      const user = await this.req("POST", this.cfg.endpoints.auth.user, {});
      this.log("Login OK:", user?.data?.data?.email);
      return {
        user: user?.data?.data,
        session: this.save()
      };
    } catch (e) {
      this.log("Login Fail:", e.message);
      throw e;
    }
  }
  async upload(input) {
    try {
      let buf, mime, ext, name;
      if (Buffer.isBuffer(input)) {
        buf = input;
        mime = "image/png";
        ext = "png";
      } else if (typeof input === "string") {
        if (input.startsWith("http")) {
          const r = await axios.get(input, {
            responseType: "arraybuffer"
          });
          buf = Buffer.from(r.data);
          mime = r.headers["content-type"] || "image/jpeg";
          ext = mime.split("/")[1];
        } else if (input.startsWith("data:")) {
          const m = input.match(/^data:(.*?);base64,(.*)$/);
          mime = m[1];
          buf = Buffer.from(m[2], "base64");
          ext = mime.split("/")[1];
        }
      }
      if (!buf) throw new Error("Invalid image input");
      name = `${crypto.randomUUID()}.${ext}`;
      const qs = `filename=${name}&contentType=${encodeURIComponent(mime)}&fileSize=${buf.length}`;
      const {
        data: sign
      } = await this.req("GET", `${this.cfg.endpoints.upload}?${qs}`);
      if (!sign.success) throw new Error("Presign fail");
      await axios.put(sign.uploadUrl, buf, {
        headers: {
          "Content-Type": mime
        }
      });
      return sign.publicUrl;
    } catch (e) {
      this.log("Upload error", e.message);
      throw e;
    }
  }
  async generate({
    session,
    model,
    prompt,
    image,
    poll = true,
    ...rest
  }) {
    if (session) this.load(session);
    if (!this.check()) await this.login();
    try {
      const mKey = Object.keys(this.cfg.endpoints.models).find(k => model?.toLowerCase().includes(k)) || this.cfg.defaults.model;
      const mCfg = this.cfg.endpoints.models[mKey];
      const pText = prompt || this.cfg.defaults.prompt;
      this.log(`Mode: ${mKey.toUpperCase()}`);
      const urls = [];
      if (image) {
        const list = Array.isArray(image) ? image : [image];
        for (const item of list) urls.push(await this.upload(item));
      }
      let payload = {};
      if (mKey === "nano") {
        payload = {
          type: urls.length ? "image-to-image" : "text-to-image",
          prompt: pText,
          image_urls: urls,
          num_images: 1,
          image_size: "auto",
          output_format: "png",
          ...rest
        };
      } else if (mKey === "sora") {
        payload = {
          model: "sora2",
          type: urls.length ? "image-to-video" : "text-to-video",
          prompt: pText,
          image_urls: urls,
          aspect_ratio: "landscape",
          n_frames: "10",
          ...rest
        };
      } else if (mKey === "veo") {
        payload = {
          model: rest.fast ? "veo3_fast" : "veo3_fast",
          type: urls.length ? "image-to-video" : "text-to-video",
          prompt: pText,
          image_urls: urls,
          aspect_ratio: "16:9",
          enable_translation: true,
          generation_type: "FIRST_AND_LAST_FRAMES_2_VIDEO",
          ...rest
        };
      }
      const res = await this.req("POST", mCfg.submit, payload);
      const taskId = res?.data?.task_id || res?.data?.data?.task_id || res?.data?.task?.task_id;
      if (!taskId) throw new Error(res?.data?.message || "No Task ID");
      this.log(`ID: ${taskId}`);
      if (poll) return await this.wait(taskId, mKey);
      return {
        success: true,
        task_id: taskId,
        session: this.save(),
        model: mKey
      };
    } catch (e) {
      this.log("Gen Error:", e.message);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async status({
    session,
    task_id,
    mode
  }) {
    if (session) this.load(session);
    try {
      const mKey = Object.keys(this.cfg.endpoints.models).find(k => mode?.toLowerCase().includes(k)) || "nano";
      const url = `${this.cfg.endpoints.models[mKey].status}${task_id}`;
      return (await this.req("GET", url))?.data;
    } catch {
      return {
        success: false
      };
    }
  }
  async wait(id, mode) {
    this.log(`Polling ${id}...`);
    const {
      poll_max,
      poll_ms
    } = this.cfg.defaults;
    for (let i = 0; i < poll_max; i++) {
      await this.sleep(poll_ms);
      const res = await this.status({
        task_id: id,
        mode: mode
      });
      const st = res.status || res.task?.status;
      if (["completed", "success"].includes(st)) {
        this.log("Done!");
        return this.wrap(res, mode);
      }
      if (st === "failed") return {
        success: false,
        error: "Failed"
      };
      process.stdout.write(".");
    }
    return {
      success: false,
      error: "Timeout"
    };
  }
  wrap(d, mode) {
    const r = d.result || d.task?.result || {};
    let media = [];
    if (r.images) media = r.images.map(x => x.url);
    else if (r.result_urls) media = r.result_urls;
    else if (d.task?.video_720p_url) media = [d.task.video_720p_url];
    return {
      success: true,
      model: mode,
      type: mode === "nano" ? "image" : "video",
      media: media,
      cost: d.credits_used || d.task?.credits_used,
      session: this.save()
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi",
      actions: ["generate", "status"]
    });
  }
  const api = new Gempix();
  try {
    let result;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'",
            example: {
              action: "generate",
              prompt: "xxxxxx"
            }
          });
        }
        result = await api.generate(params);
        break;
      case "status":
        if (!params.session || !params.task_id || !params.model) {
          return res.status(400).json({
            error: "Parameter 'session' wajib diisi untuk action 'status'",
            example: {
              action: "status",
              session: "xxxxxx",
              task_id: "xxxxxx",
              model: "xxxxxx"
            }
          });
        }
        result = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}`,
          valid_actions: ["generate", "status"]
        });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[API ERROR] Action '${action}':`, e?.message);
    return res.status(500).json({
      status: false,
      error: e?.message || "Terjadi kesalahan internal pada server",
      action: action
    });
  }
}