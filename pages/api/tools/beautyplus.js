import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import crypto from "crypto";

class PixocialClient {
  constructor() {
    this.key = "jluo54itjiydgddutdd576vw";
    this.secret = "wdxt0s2jgacgc6b1f6ta97z7vuvplbs4";
    this.beautyKey = "gfuqsdynoz6de0sk6ilw36g8";
    this.beautySecret = "ld4z4jw21k6vydy3aw2edm0uqvogzzy2";
    this.chars = "1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM-_+";

    this.labBase = "https://v2.lab.pixocial.com";
    this.apiBase = "https://api.lab.pixocial.com";
    this.effectsBase = "https://effects.pixocial.com";
    this.videoBase = "https://newbeee-api.beautyplus.com";
    this.gatewayBase = "https://sg.api.beautyplus.com";

    this.pollMs = 2500;
    this.pollMax = 30;
  }

  slp(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  sign(ts, nonce, key = this.key, secret = this.secret) {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(`app_key=${key}&timestamp=${ts}&nonce=${nonce}`, "utf-8");
    return encodeURIComponent(hmac.digest("base64").replace(/\n/g, ""));
  }

  getHeaders(key = this.key, secret = this.secret) {
    const ts = Math.floor(Date.now() / 1000);
    const nonce = Array.from(
      { length: 8 },
      () => this.chars[Math.floor(Math.random() * this.chars.length)]
    ).join("");

    return {
      "User-Agent": "Mozilla/5.0",
      "Content-Type": "application/json",
      "X-App-Key": key,
      "X-Nonce": nonce,
      "X-Timestamp": String(ts),
      "X-Sign": this.sign(ts, nonce, key, secret),
      "X-App-Id": "104",
      "X-Gid": "1040001"
    };
  }

  toMedia(img) {
    const str = String(img || "").trim();
    if (/^https?:\/\//i.test(str)) {
      return {
        media_data: str,
        media_profiles: { media_data_type: "url" }
      };
    }
    const cleanB64 = str.replace(/^data:image\/[^;]+;base64,/i, "");
    return {
      media_data: cleanB64,
      media_profiles: { media_data_type: "jpg" }
    };
  }

  async postJson(url, payload, key = this.key, secret = this.secret) {
    const res = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(key, secret),
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  isErr(data) {
    if (!data || typeof data !== "object") return true;
    if (data.code !== undefined && Number(data.code) !== 0 && data.code !== "0") return true;
    if (data.error_code !== undefined && Number(data.error_code) !== 0) return true;
    return false;
  }

  wrapRes(data) {
    if (this.isErr(data)) {
      return {
        status: false,
        result: {
          error: data?.msg || data?.message || data?.error || "Pixocial API error",
          code: data?.code ?? data?.error_code,
          detail: data
        }
      };
    }
    return {
      status: true,
      result: data
    };
  }

  async pollLab(msgId) {
    for (let i = 0; i < this.pollMax; i++) {
      await this.slp(this.pollMs);
      const res = await this.queryRaw(msgId);
      if (this.isErr(res)) return res;
      const d = res.data || res;
      if (
        (Array.isArray(d.media_info_list) && d.media_info_list.length > 0) ||
        d.status === "completed" ||
        d.status === 2
      ) {
        return res;
      }
      if (d.status === "failed" || d.status === -1) {
        return res;
      }
    }
    throw new Error("Polling timeout exceeded");
  }

  async queryRaw(msgId) {
    const res = await fetch(`${this.labBase}/v1/query?msg_id=${encodeURIComponent(msgId)}`, {
      headers: this.getHeaders()
    });
    return res.json();
  }

  async query({ msg_id, msgId, id } = {}) {
    try {
      const target = msg_id || msgId || id;
      if (!target) {
        return { status: false, result: { error: "Parameter 'msg_id' wajib diisi." } };
      }
      const data = await this.queryRaw(target);
      return this.wrapRes(data);
    } catch (e) {
      return { status: false, result: { error: e?.message || "failed_query" } };
    }
  }

  async enhance({ image, url, file, plus = false, width = 0, height = 0, wait = false } = {}) {
    try {
      const img = image || url || file;
      if (!img) {
        return { status: false, result: { error: "Parameter 'image' wajib diisi." } };
      }
      const isPlus = plus === true || plus === "true";
      const w = Number(width) || 0;
      const h = Number(height) || 0;

      const data = await this.postJson(`${this.labBase}/v3/bp/image_restoration_ai`, {
        parameter: isPlus
          ? { image_hd_plus: { scene: 3, width: w, height: h } }
          : { image_hd: { scene: 2, width: w, height: h } },
        media_info_list: [this.toMedia(img)]
      });

      const shouldWait = wait === true || wait === "true";
      const msgId = data?.data?.msg_id || data?.msg_id;
      if (shouldWait && !this.isErr(data) && msgId && !data?.media_info_list?.length) {
        const polled = await this.pollLab(msgId);
        return this.wrapRes(polled);
      }

      return this.wrapRes(data);
    } catch (e) {
      return { status: false, result: { error: e?.message || "failed_enhance" } };
    }
  }

  async colorize({ image, url, file, wait = false } = {}) {
    try {
      const img = image || url || file;
      if (!img) {
        return { status: false, result: { error: "Parameter 'image' wajib diisi." } };
      }

      const data = await this.postJson(`${this.labBase}/v1/bp/sd_colorization`, {
        parameter: { prompt: "", style: "colorization", rsp_media_type: "jpg" },
        media_info_list: [this.toMedia(img)]
      });

      const shouldWait = wait === true || wait === "true";
      const msgId = data?.data?.msg_id || data?.msg_id;
      if (shouldWait && !this.isErr(data) && msgId && !data?.media_info_list?.length) {
        const polled = await this.pollLab(msgId);
        return this.wrapRes(polled);
      }

      return this.wrapRes(data);
    } catch (e) {
      return { status: false, result: { error: e?.message || "failed_colorize" } };
    }
  }

  async cartoon({ image, url, file, style = "anime", wait = false } = {}) {
    try {
      const img = image || url || file;
      if (!img) {
        return { status: false, result: { error: "Parameter 'image' wajib diisi." } };
      }
      const styleName = String(style || "anime").trim();

      const data = await this.postJson(`${this.labBase}/v1/bp/sd_colorization`, {
        parameter: { prompt: `${styleName} style portrait`, style: styleName, rsp_media_type: "jpg" },
        media_info_list: [this.toMedia(img)]
      });

      const shouldWait = wait === true || wait === "true";
      const msgId = data?.data?.msg_id || data?.msg_id;
      if (shouldWait && !this.isErr(data) && msgId && !data?.media_info_list?.length) {
        const polled = await this.pollLab(msgId);
        return this.wrapRes(polled);
      }

      return this.wrapRes(data);
    } catch (e) {
      return { status: false, result: { error: e?.message || "failed_cartoon" } };
    }
  }

  async humanMask({ image, url, file, wait = false } = {}) {
    try {
      const img = image || url || file;
      if (!img) {
        return { status: false, result: { error: "Parameter 'image' wajib diisi." } };
      }

      const data = await this.postJson(`${this.apiBase}/v3/humanmask`, {
        parameter: { type: "human_mask" },
        media_info_list: [this.toMedia(img)]
      });

      const shouldWait = wait === true || wait === "true";
      const msgId = data?.data?.msg_id || data?.msg_id;
      if (shouldWait && !this.isErr(data) && msgId && !data?.media_info_list?.length) {
        const polled = await this.pollLab(msgId);
        return this.wrapRes(polled);
      }

      return this.wrapRes(data);
    } catch (e) {
      return { status: false, result: { error: e?.message || "failed_human_mask" } };
    }
  }

  async makeupTransfer({ image, style_image, styleImage, style = "natural", wait = false } = {}) {
    try {
      const refStyle = style_image || styleImage;
      if (!image || !refStyle) {
        return {
          status: false,
          result: { error: "Parameter 'image' dan 'style_image' wajib diisi." }
        };
      }

      const data = await this.postJson(`${this.labBase}/v1/bp/aimakeuptransfer`, {
        parameter: { style: String(style || "natural") },
        media_info_list: [this.toMedia(image), this.toMedia(refStyle)]
      });

      const shouldWait = wait === true || wait === "true";
      const msgId = data?.data?.msg_id || data?.msg_id;
      if (shouldWait && !this.isErr(data) && msgId && !data?.media_info_list?.length) {
        const polled = await this.pollLab(msgId);
        return this.wrapRes(polled);
      }

      return this.wrapRes(data);
    } catch (e) {
      return { status: false, result: { error: e?.message || "failed_makeup_transfer" } };
    }
  }

  async queryBeautyShapeRaw(taskId) {
    const res = await fetch(
      `${this.effectsBase}/api/v2/image/beauty-shape/tasks/${encodeURIComponent(taskId)}`,
      { headers: this.getHeaders(this.beautyKey, this.beautySecret) }
    );
    return res.json();
  }

  async beautyShape({ image_url, imageUrl, image, url, effects, wait = false } = {}) {
    try {
      const targetUrl = image_url || imageUrl || image || url;
      if (!targetUrl) {
        return { status: false, result: { error: "Parameter 'image_url' wajib diisi." } };
      }

      let parsedEffects = [{ type: "slim", value: 0.5 }];
      if (effects) {
        if (Array.isArray(effects)) {
          parsedEffects = effects;
        } else if (typeof effects === "string") {
          try {
            parsedEffects = JSON.parse(effects);
          } catch {
            return { status: false, result: { error: "Format parameter 'effects' harus JSON array yang valid." } };
          }
        }
      }

      const data = await this.postJson(
        `${this.effectsBase}/api/v2/image/beauty-shape/tasks`,
        { imageUrl: String(targetUrl), effects: parsedEffects, statisticName: "beauty_shape" },
        this.beautyKey,
        this.beautySecret
      );

      const shouldWait = wait === true || wait === "true";
      const taskId = data?.data?.taskId || data?.taskId || data?.data?.task_id || data?.task_id;
      if (shouldWait && !this.isErr(data) && taskId) {
        for (let i = 0; i < this.pollMax; i++) {
          await this.slp(this.pollMs);
          const polled = await this.queryBeautyShapeRaw(taskId);
          const st = polled?.data?.status || polled?.status;
          if (st === "completed" || st === "success" || st === 2 || polled?.data?.resultUrl) {
            return this.wrapRes(polled);
          }
          if (st === "failed" || st === "error" || st === -1) {
            return this.wrapRes(polled);
          }
        }
        throw new Error("Polling beautyShape timeout exceeded");
      }

      return this.wrapRes(data);
    } catch (e) {
      return { status: false, result: { error: e?.message || "failed_beauty_shape" } };
    }
  }

  async queryBeautyShape({ task_id, taskId, id } = {}) {
    try {
      const target = task_id || taskId || id;
      if (!target) {
        return { status: false, result: { error: "Parameter 'task_id' wajib diisi." } };
      }
      const data = await this.queryBeautyShapeRaw(target);
      return this.wrapRes(data);
    } catch (e) {
      return { status: false, result: { error: e?.message || "failed_query_beauty_shape" } };
    }
  }

  async queryVideoRaw(idList) {
    const ids = Array.isArray(idList) ? idList.join(",") : String(idList);
    const res = await fetch(
      `${this.videoBase}/api/v1/ai/history?type=11&module=2&msg_id=${encodeURIComponent(ids)}`,
      { headers: this.getHeaders() }
    );
    return res.json();
  }

  async repairVideo({ video_url, videoUrl, video, url, scene = 1, quality = 2, wait = false } = {}) {
    try {
      const targetUrl = video_url || videoUrl || video || url;
      if (!targetUrl) {
        return { status: false, result: { error: "Parameter 'video_url' wajib diisi." } };
      }

      const msgId = crypto.randomUUID();
      const data = await this.postJson(`${this.videoBase}/api/v1/ai/generatev2`, {
        type: 11,
        module: 2,
        parameter: {
          video_hd: { scene: Number(scene) || 1, quality: Number(quality) || 2 }
        },
        msg_id: msgId,
        urls: [String(targetUrl)]
      });

      const shouldWait = wait === true || wait === "true";
      if (shouldWait && !this.isErr(data)) {
        for (let i = 0; i < this.pollMax; i++) {
          await this.slp(this.pollMs);
          const polled = await this.queryVideoRaw(msgId);
          const item = Array.isArray(polled?.data) ? polled.data[0] : polled?.data;
          if (item && (item.status === 2 || item.status === "completed" || item.url || item.result_url)) {
            return this.wrapRes(polled);
          }
          if (item && (item.status === -1 || item.status === "failed")) {
            return this.wrapRes(polled);
          }
        }
        throw new Error("Polling repairVideo timeout exceeded");
      }

      return this.wrapRes({ msg_id: msgId, ...data });
    } catch (e) {
      return { status: false, result: { error: e?.message || "failed_repair_video" } };
    }
  }

  async queryVideo({ msg_id, id_list, idList, ids, id } = {}) {
    try {
      const target = id_list || idList || ids || msg_id || id;
      if (!target) {
        return { status: false, result: { error: "Parameter 'msg_id' (atau 'ids') wajib diisi." } };
      }
      const data = await this.queryVideoRaw(target);
      return this.wrapRes(data);
    } catch (e) {
      return { status: false, result: { error: e?.message || "failed_query_video" } };
    }
  }

  async getStatus({ soft_id, softId = 104, app_ver, appVer = "7.50.0" } = {}) {
    try {
      const sId = Number(soft_id ?? softId) || 104;
      const ver = String(app_ver || appVer || "7.50.0");
      const res = await fetch(
        `${this.gatewayBase}/extra/pre_verify.json?soft_id=${encodeURIComponent(sId)}&app_ver=${encodeURIComponent(ver)}`
      );
      const data = await res.json();
      if (data.code !== "0") {
        throw new Error(data.msg || "Service unavailable");
      }
      return {
        status: true,
        result: data.data
      };
    } catch (e) {
      return { status: false, result: { error: e?.message || "failed_status" } };
    }
  }
}

async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};

  const valid_actions = [
    "query",
    "enhance",
    "colorize",
    "cartoon",
    "human_mask",
    "makeup_transfer",
    "beauty_shape",
    "query_beauty_shape",
    "repair_video",
    "query_video",
    "status"
  ];

  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          query: "/?action=query&msg_id=MSG_ID",
          enhance: "/?action=enhance&image=https://.../photo.jpg&plus=true",
          colorize: "/?action=colorize&image=https://.../bw.jpg",
          cartoon: "/?action=cartoon&image=https://.../face.jpg&style=anime",
          human_mask: "/?action=human_mask&image=https://.../person.jpg",
          makeup_transfer: "/?action=makeup_transfer&image=https://.../face.jpg&style_image=https://.../style.jpg",
          beauty_shape: {
            url: "/?action=beauty_shape",
            body: {
              image_url: "https://.../body.jpg",
              effects: [{ type: "slim", value: 0.5 }]
            }
          },
          query_beauty_shape: "/?action=query_beauty_shape&task_id=TASK_ID",
          repair_video: "/?action=repair_video&video_url=https://.../video.mp4&scene=1&quality=2",
          query_video: "/?action=query_video&msg_id=MSG_ID",
          status: "/?action=status&soft_id=104&app_ver=7.50.0"
        }
      }
    });
  }

  if (!valid_actions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions
    });
  }

  const api = new PixocialClient();
  try {
    let response;
    switch (action) {
      case "query": {
        const msgId = params.msg_id || params.msgId || params.id;
        if (!msgId) {
          return res.status(400).json({ status: false, error: "Parameter 'msg_id' wajib diisi." });
        }
        response = await api.query(params);
        break;
      }
      case "enhance": {
        const image = params.image || params.url || params.file;
        if (!image) {
          return res.status(400).json({ status: false, error: "Parameter 'image' wajib diisi." });
        }
        response = await api.enhance(params);
        break;
      }
      case "colorize": {
        const image = params.image || params.url || params.file;
        if (!image) {
          return res.status(400).json({ status: false, error: "Parameter 'image' wajib diisi." });
        }
        response = await api.colorize(params);
        break;
      }
      case "cartoon": {
        const image = params.image || params.url || params.file;
        if (!image) {
          return res.status(400).json({ status: false, error: "Parameter 'image' wajib diisi." });
        }
        response = await api.cartoon(params);
        break;
      }
      case "human_mask": {
        const image = params.image || params.url || params.file;
        if (!image) {
          return res.status(400).json({ status: false, error: "Parameter 'image' wajib diisi." });
        }
        response = await api.humanMask(params);
        break;
      }
      case "makeup_transfer": {
        const styleImg = params.style_image || params.styleImage;
        if (!params.image || !styleImg) {
          return res.status(400).json({ status: false, error: "Parameter 'image' dan 'style_image' wajib diisi." });
        }
        response = await api.makeupTransfer(params);
        break;
      }
      case "beauty_shape": {
        const imgUrl = params.image_url || params.imageUrl || params.image || params.url;
        if (!imgUrl) {
          return res.status(400).json({ status: false, error: "Parameter 'image_url' wajib diisi." });
        }
        response = await api.beautyShape(params);
        break;
      }
      case "query_beauty_shape": {
        const taskId = params.task_id || params.taskId || params.id;
        if (!taskId) {
          return res.status(400).json({ status: false, error: "Parameter 'task_id' wajib diisi." });
        }
        response = await api.queryBeautyShape(params);
        break;
      }
      case "repair_video": {
        const vidUrl = params.video_url || params.videoUrl || params.video || params.url;
        if (!vidUrl) {
          return res.status(400).json({ status: false, error: "Parameter 'video_url' wajib diisi." });
        }
        response = await api.repairVideo(params);
        break;
      }
      case "query_video": {
        const msgId = params.id_list || params.idList || params.ids || params.msg_id || params.id;
        if (!msgId) {
          return res.status(400).json({ status: false, error: "Parameter 'msg_id' (atau 'ids') wajib diisi." });
        }
        response = await api.queryVideo(params);
        break;
      }
      case "status":
        response = await api.getStatus(params);
        break;
      default:
        return res.status(400).json({ status: false, error: "Action tidak dikenali." });
    }

    if (!response || response.status === false) {
      return res.status(502).json({
        status: false,
        action,
        error: response?.result?.error || "Gagal memproses request pada server Pixocial/BeautyPlus.",
        result: response?.result || null
      });
    }

    return res.status(200).json({
      action,
      ...response
    });
  } catch (error) {
    console.error(`[API HANDLER ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada Serverless Handler.",
      error: error?.message || "Unknown Error"
    });
  }
}

export default withApiLog(withRateLimit(handler));