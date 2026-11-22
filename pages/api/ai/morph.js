import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import axios from "axios";
import crypto from "crypto";

const RSA_PUB_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo+yvc35R8VPsfy1ScmQa
p+vVg/IYTcZCiJP5iiIo0HFLBrfDhwZ30wpvQ8lpezTN3exdZU3edIspp+weCgif
bjFEyI7/Ecce7GTYXZyLncBrjzvO6IohPnaz/hx7+Uy6eNw8DNk15sxcJrQeSOUL
tOWJJ8dJ2IbR1eRIp0PXwJeXqdfoT52WzT/FaNzwh7sWmt4Zl8cw9o9JvdTqdU3W
sCsdqsOXWIgyP/UIFWM+uu7P1xJ/DY40nMokHlG+fDdiT0us5Vu4LNUt3Er8OOZy
nnOESSQUocSvpb9UOcK5SurLCjWsk0RnQY2RBQluBnC9isJK5RC9FyK/5ezjmaQ1
hQIDAQAB
-----END PUBLIC KEY-----`;

let cachedMorphTemplates = null;
let cachedVideoTemplates = null;

class SnapAI {
  constructor() {
    this.tkKey = Buffer.from("kpqLnvKWkZnwy1#3");
    this.tkIv = Buffer.from("LnvKW-Zn2f#3kpq@");
    this.bucket = "stn2_hs_us";
    this.baseApi = "https://ai.hardstonepte.ltd";
    this.gcsBase = "https://hardstonepte.ltd/hs-us/";
    this.userAgent = "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36";
    this.pollUrlMax = 25;
    this.pollUrlMs = 2000;
    this.pollVideoMax = 40;
    this.pollVideoMs = 3000;
  }

  slp(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  b64e(obj) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch {
      return "";
    }
  }

  b64d(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf-8")) : {};
    } catch {
      return {};
    }
  }

  ctx(state) {
    const d = this.b64d(state);
    return {
      android_id: d?.android_id || crypto.randomBytes(8).toString("hex"),
      score_ready: Boolean(d?.score_ready)
    };
  }

  calc_token(uuidStr) {
    const combined = Buffer.concat([
      Buffer.from(uuidStr),
      Buffer.from("META-INF/CERT.RSA")
    ]);
    const md5Hex = crypto.createHash("md5").update(combined).digest("hex");
    const cipher = crypto.createCipheriv("aes-128-cbc", this.tkKey, this.tkIv);
    const enc = Buffer.concat([
      cipher.update(Buffer.from(md5Hex, "utf8")),
      cipher.final()
    ]);
    return enc.toString("hex");
  }

  encrypt_payload(bodyStr) {
    const l = crypto.randomBytes(16).toString("hex");
    const k = Buffer.from(l.slice(0, 16), "utf8");
    const iv = Buffer.from(l.slice(16, 32), "utf8");

    const cipher = crypto.createCipheriv("aes-128-cbc", k, iv);
    const encData = Buffer.concat([
      cipher.update(Buffer.from(bodyStr, "utf8")),
      cipher.final()
    ]);

    const ki = crypto.publicEncrypt(
      {
        key: RSA_PUB_KEY,
        padding: crypto.constants.RSA_PKCS1_PADDING
      },
      Buffer.from(l, "utf8")
    );

    return {
      payload: {
        rv: 1,
        ki: ki.toString("base64"),
        data: encData.toString("base64")
      },
      l
    };
  }

  decrypt_payload(b64Data, l) {
    const k = Buffer.from(l.slice(0, 16), "utf8");
    const iv = Buffer.from(l.slice(16, 32), "utf8");
    const decipher = crypto.createDecipheriv("aes-128-cbc", k, iv);
    const dec = Buffer.concat([
      decipher.update(Buffer.from(b64Data, "base64")),
      decipher.final()
    ]);
    return dec.toString("utf8");
  }

  get_date_gmt8() {
    const now = new Date(Date.now() + 8 * 3600 * 1000);
    return now.toISOString().slice(0, 10);
  }

  async res_img(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === "string") {
        const str = input.trim();
        if (/^https?:\/\//i.test(str)) {
          console.log(`[IMAGE] Mengunduh gambar dari URL: ${str}`);
          const res = await axios.get(str, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        console.log("[IMAGE] Decode gambar base64...");
        const clean = str.replace(/^data:image\/[^;]+;base64,/i, "");
        return Buffer.from(clean, "base64");
      }
      return null;
    } catch (e) {
      console.error(`[IMAGE ERROR] Gagal memproses gambar: ${e?.message}`);
      return null;
    }
  }

  async upload_image(imageInput, prefix = "snap_img2img/upload/") {
    const fileBytes = await this.res_img(imageInput);
    if (!fileBytes || fileBytes.length === 0) {
      throw new Error("Format gambar tidak valid (gunakan URL, Base64, atau Buffer).");
    }

    const dateStr = this.get_date_gmt8();
    const fileUuid = crypto.randomUUID() + "_0";
    const objectName = `${prefix}${dateStr}/${fileUuid}.jpg`;
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${this.bucket}/o?name=${encodeURIComponent(objectName)}`;

    console.log(`[UPLOAD] Uploading gambar (${fileBytes.length} bytes) -> ${objectName}`);
    const res = await axios({
      method: "post",
      url: uploadUrl,
      headers: {
        "Content-Type": "image/jpeg"
      },
      data: fileBytes,
      validateStatus: () => true
    });

    if (res.status < 200 || res.status >= 300) {
      const errText = typeof res.data === "string" ? res.data : JSON.stringify(res.data || {});
      throw new Error(`Gagal upload gambar (${res.status}): ${errText}`);
    }

    return objectName;
  }

  async post_api(endpoint, bodyObj) {
    const reqUuid = crypto.randomUUID();
    const token = this.calc_token(reqUuid);
    const ts = Date.now().toString();
    const { payload, l } = this.encrypt_payload(JSON.stringify(bodyObj));

    console.log(`[HTTP] POST -> ${endpoint}`);
    const res = await axios({
      method: "post",
      url: `${this.baseApi}${endpoint}`,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "--v2-time": ts,
        uid: reqUuid,
        token,
        "User-Agent": this.userAgent
      },
      data: payload,
      validateStatus: () => true
    });

    const jsonResp = typeof res.data === "string" ? (() => {
      try {
        return JSON.parse(res.data);
      } catch {
        return null;
      }
    })() : res.data;

    if (!jsonResp || typeof jsonResp !== "object") {
      throw new Error(`Invalid server response (${res.status}): ${String(res.data || "")}`);
    }

    if (jsonResp.status && String(jsonResp.status) !== "200") {
      throw new Error(
        jsonResp.message ||
        jsonResp.error ||
        `Server status ${jsonResp.status}`
      );
    }

    if (typeof jsonResp.data === "string" && jsonResp.data.length > 0) {
      const decStr = this.decrypt_payload(jsonResp.data, l);
      try {
        return JSON.parse(decStr);
      } catch {
        return decStr;
      }
    }

    return jsonResp.data || jsonResp;
  }

  async ensure_score(c) {
    if (c.score_ready) return c;

    console.log(`[SCORE] Inisialisasi score user (${c.android_id})...`);
    const reqUuid = crypto.randomUUID();
    const queryBody = {
      android_id: c.android_id,
      buy_score: 0,
      free_score: 0,
      reset_time: 0,
      version: 136100
    };
    const { payload } = this.encrypt_payload(JSON.stringify(queryBody));

    await axios({
      method: "post",
      url: `${this.baseApi}/snap/score/query/v3/`,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "--v2-time": Date.now().toString(),
        uid: reqUuid,
        token: this.calc_token(reqUuid),
        "User-Agent": this.userAgent
      },
      data: payload,
      validateStatus: () => true
    });

    const handleUuid = crypto.randomUUID();
    const handleBody = {
      android_id: c.android_id,
      action: 3,
      action_share_score: 50,
      version: 136100
    };
    const encHandle = this.encrypt_payload(JSON.stringify(handleBody));

    await axios({
      method: "post",
      url: `${this.baseApi}/snap/score/handle/v3/`,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "--v2-time": Date.now().toString(),
        uid: handleUuid,
        token: this.calc_token(handleUuid),
        "User-Agent": this.userAgent
      },
      data: encHandle.payload,
      validateStatus: () => true
    });

    c.score_ready = true;
    return c;
  }

  async poll_url_ready(fullUrl, maxRetries = this.pollUrlMax, delayMs = this.pollUrlMs) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await axios.head(fullUrl, {
          validateStatus: () => true
        });
        if (res.status === 200) return true;
      } catch {}
      await this.slp(delayMs);
    }
    return false;
  }

  async fetch_morph_templates(forceRefresh = false) {
    if (cachedMorphTemplates && !forceRefresh) return cachedMorphTemplates;

    const res = await axios.get("https://hardstonepte.ltd/snapAi/avatar/home_config.json");
    const data = res.data || {};
    const list = [];
    const seen = new Set();

    for (const cat of data.category || []) {
      const categoryTitle = cat.titleMap?.en?.title || cat.categoryType || "Styles";
      for (const item of cat.items || []) {
        const id = item.style_id;
        const name = item.style_name || id;
        if (id && !seen.has(id)) {
          seen.add(id);
          list.push({
            style: name,
            style_id: id,
            category: categoryTitle,
            cover: item.collectionZipURL ? `https://hardstonepte.ltd/${item.collectionZipURL}` : null
          });
        }
      }
    }

    cachedMorphTemplates = list;
    return list;
  }

  async fetch_video_templates(forceRefresh = false) {
    if (cachedVideoTemplates && !forceRefresh) return cachedVideoTemplates;

    const res = await axios.get("https://hardstonepte.ltd/snapAi/video/video_config.json");
    const data = res.data || {};
    const list = [];
    const seen = new Set();

    for (const cat of data.category || []) {
      const categoryTitle = cat.titleMap?.en?.title || "Video Styles";
      for (const item of cat.items || []) {
        const name = item.styleName;
        if (name && !seen.has(name)) {
          seen.add(name);
          list.push({
            style: name,
            category: categoryTitle,
            cover: item.coverUrl ? `https://hardstonepte.ltd/${item.coverUrl}` : null,
            prompt: item.titleMap?.en?.prompt || null
          });
        }
      }
    }

    cachedVideoTemplates = list;
    return list;
  }

  async resolve_morph_style(input) {
    if (!input) {
      throw new Error("Style/template morph wajib diisi. Gunakan action 'list_morph' untuk melihat daftar.");
    }

    const templates = await this.fetch_morph_templates();
    const clean = String(input).trim();
    const lower = clean.toLowerCase();

    const exactName = templates.find((t) => t.style && t.style.toLowerCase() === lower);
    if (exactName) return exactName;

    const exactId = templates.find((t) => t.style_id && t.style_id.toLowerCase() === lower);
    if (exactId) return exactId;

    const partial = templates.find(
      (t) =>
        (t.style && t.style.toLowerCase().includes(lower)) ||
        (t.style_id && t.style_id.toLowerCase().includes(lower))
    );
    if (partial) return partial;

    throw new Error(`Style morph '${clean}' tidak ditemukan. Gunakan action 'list_morph' untuk melihat daftar.`);
  }

  async resolve_video_style(input) {
    if (!input) {
      throw new Error("Style video wajib diisi. Gunakan action 'list_video' untuk melihat daftar.");
    }

    const templates = await this.fetch_video_templates();
    const clean = String(input).trim();
    const lower = clean.toLowerCase();

    const exact = templates.find((t) => t.style && t.style.toLowerCase() === lower);
    if (exact) return exact;

    const partial = templates.find((t) => t.style && t.style.toLowerCase().includes(lower));
    if (partial) return partial;

    throw new Error(`Style video '${clean}' tidak ditemukan. Gunakan action 'list_video' untuk melihat daftar.`);
  }

  async reg_dev({ state, force = false } = {}) {
    let c = null;
    try {
      const shouldForce = force === true || force === "true";
      c = this.ctx(shouldForce ? null : state);
      await this.ensure_score(c);
      const b64 = this.b64e(c);
      return {
        status: true,
        result: {
          android_id: c.android_id,
          score_ready: c.score_ready
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_reg_dev"
        },
        state: b64,
        State: b64
      };
    }
  }

  async list_morph({ state, search = "", category = "", refresh = false } = {}) {
    let c = null;
    try {
      c = this.ctx(state);
      const b64 = this.b64e(c);
      let templates = await this.fetch_morph_templates(refresh === true || refresh === "true");

      if (category) {
        const catQ = String(category).trim().toLowerCase();
        templates = templates.filter((t) => t.category && t.category.toLowerCase().includes(catQ));
      }
      if (search) {
        const q = String(search).trim().toLowerCase();
        templates = templates.filter(
          (t) =>
            (t.style && t.style.toLowerCase().includes(q)) ||
            (t.style_id && t.style_id.toLowerCase().includes(q)) ||
            (t.category && t.category.toLowerCase().includes(q))
        );
      }

      return {
        status: true,
        result: {
          total: templates.length,
          templates
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_list_morph"
        },
        state: b64,
        State: b64
      };
    }
  }

  async list_video({ state, search = "", category = "", refresh = false } = {}) {
    let c = null;
    try {
      c = this.ctx(state);
      const b64 = this.b64e(c);
      let templates = await this.fetch_video_templates(refresh === true || refresh === "true");

      if (category) {
        const catQ = String(category).trim().toLowerCase();
        templates = templates.filter((t) => t.category && t.category.toLowerCase().includes(catQ));
      }
      if (search) {
        const q = String(search).trim().toLowerCase();
        templates = templates.filter(
          (t) =>
            (t.style && t.style.toLowerCase().includes(q)) ||
            (t.category && t.category.toLowerCase().includes(q)) ||
            (t.prompt && t.prompt.toLowerCase().includes(q))
        );
      }

      return {
        status: true,
        result: {
          total: templates.length,
          templates
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_list_video"
        },
        state: b64,
        State: b64
      };
    }
  }

  async morph({ state, style, style_id, template, image, img, url, file, strength = "30", bs = "4", ratio = "", wait = true } = {}) {
    let c = null;
    try {
      c = this.ctx(state);
      const b64 = this.b64e(c);
      const styleInput = style || style_id || template;
      const imageInput = image || img || url || file;

      if (!styleInput || !imageInput) {
        return {
          status: false,
          result: {
            error: "Parameter 'style' dan 'image' wajib diisi."
          },
          state: b64,
          State: b64
        };
      }

      const matched = await this.resolve_morph_style(styleInput);
      const imageName = await this.upload_image(imageInput, "snap_img2img/upload/");

      const body = {
        image_name: imageName,
        nb: this.bucket,
        style_id: matched.style_id,
        strength: String(strength || "30"),
        bs: String(bs || "4"),
        ratio: String(ratio || ""),
        is_first: "1"
      };

      const data = await this.post_api("/snap/img2img/v2/", body);
      const rawUrls = (data.image_url || []).map((u) => `${this.gcsBase}${u}`);
      const uniqueUrls = Array.from(new Set(rawUrls));

      const shouldWait = wait !== false && wait !== "false";
      if (shouldWait && uniqueUrls.length > 0) {
        await this.poll_url_ready(uniqueUrls[0]);
      }

      const result = {
        style: matched.style,
        style_id: matched.style_id,
        task_id: data.task_id,
        url: uniqueUrls[0] || null
      };
      if (uniqueUrls.length > 1) {
        result.variations = uniqueUrls;
      }

      return {
        status: true,
        result,
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_morph"
        },
        state: b64,
        State: b64
      };
    }
  }

  async enhance({ state, image, img, url, file, is_inavatar = false, wait = true } = {}) {
    let c = null;
    try {
      c = this.ctx(state);
      const b64 = this.b64e(c);
      const imageInput = image || img || url || file;

      if (!imageInput) {
        return {
          status: false,
          result: {
            error: "Parameter 'image' wajib diisi."
          },
          state: b64,
          State: b64
        };
      }

      const imageName = await this.upload_image(imageInput, "snap_single_enhance/upload/");
      const body = {
        image_name: imageName,
        nb: this.bucket,
        is_inavatar: is_inavatar === true || is_inavatar === "true"
      };

      const data = await this.post_api("/snap/single/enhance/v2/", body);
      const fullUrl = data.image_url ? `${this.gcsBase}${data.image_url}` : null;

      const shouldWait = wait !== false && wait !== "false";
      if (shouldWait && fullUrl) {
        await this.poll_url_ready(fullUrl);
      }

      return {
        status: true,
        result: {
          task_id: data.task_id,
          url: fullUrl
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_enhance"
        },
        state: b64,
        State: b64
      };
    }
  }

  async retake({ state, style = "Smile", image, img, url, file, bs = 4, wait = true } = {}) {
    let c = null;
    try {
      c = this.ctx(state);
      const b64 = this.b64e(c);
      const imageInput = image || img || url || file;

      if (!imageInput) {
        return {
          status: false,
          result: {
            error: "Parameter 'image' wajib diisi."
          },
          state: b64,
          State: b64
        };
      }

      const styleName = style ? String(style).trim() : "Smile";
      const imageName = await this.upload_image(imageInput, "snap_retake/upload/");
      const body = {
        image_name: imageName,
        nb: this.bucket,
        style_name: styleName,
        bs: Number(bs) || 4
      };

      const data = await this.post_api("/snap/klein/retake/v2/", body);
      const rawUrls = (data.image_url || []).map((u) => `${this.gcsBase}${u}`);
      const uniqueUrls = Array.from(new Set(rawUrls));

      const shouldWait = wait !== false && wait !== "false";
      if (shouldWait && uniqueUrls.length > 0) {
        await this.poll_url_ready(uniqueUrls[0]);
      }

      const taskId = Array.isArray(data.task_id) ? data.task_id[0] : data.task_id;
      const result = {
        style: styleName,
        task_id: taskId,
        url: uniqueUrls[0] || null
      };
      if (uniqueUrls.length > 1) {
        result.variations = uniqueUrls;
      }

      return {
        status: true,
        result,
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_retake"
        },
        state: b64,
        State: b64
      };
    }
  }

  async edit({ state, prompt, image, img, url, file, style = "Native Sketch", wait = true } = {}) {
    let c = null;
    try {
      c = this.ctx(state);
      const b64 = this.b64e(c);
      const imageInput = image || img || url || file;

      if (!prompt || !imageInput) {
        return {
          status: false,
          result: {
            error: "Parameter 'prompt' dan 'image' wajib diisi."
          },
          state: b64,
          State: b64
        };
      }

      const styleName = style ? String(style).trim() : "Native Sketch";
      const imageName = await this.upload_image(imageInput, "snap_img2img/upload/");
      const body = {
        image_name: imageName,
        nb: this.bucket,
        style_name: styleName,
        prompt: String(prompt)
      };

      const data = await this.post_api("/snap/chat/edit/v2/", body);
      const fullUrl = data.image_url ? `${this.gcsBase}${data.image_url}` : null;

      const shouldWait = wait !== false && wait !== "false";
      if (shouldWait && fullUrl) {
        await this.poll_url_ready(fullUrl);
      }

      return {
        status: true,
        result: {
          prompt: String(prompt),
          style: styleName,
          task_id: data.task_id,
          url: fullUrl
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_edit"
        },
        state: b64,
        State: b64
      };
    }
  }

  async video({ state, style, template, image, img, url, file, gender = "female", wait = true } = {}) {
    let c = null;
    try {
      c = this.ctx(state);
      const styleInput = style || template;
      const imageInput = image || img || url || file;

      if (!styleInput || !imageInput) {
        const b64 = this.b64e(c);
        return {
          status: false,
          result: {
            error: "Parameter 'style' dan 'image' wajib diisi."
          },
          state: b64,
          State: b64
        };
      }

      const matched = await this.resolve_video_style(styleInput);
      const styleName = matched.style;
      const imageName = await this.upload_image(imageInput, "snap_img2img/upload/");

      await this.ensure_score(c);
      const b64 = this.b64e(c);

      const body = {
        android_id: c.android_id,
        score_cost: 0,
        image_name: imageName,
        is_free: "1",
        buy_token: "is_free",
        product_id: "is_free",
        style_name: styleName,
        gender: gender || "female",
        nb: this.bucket
      };

      const genResp = await this.post_api("/snap/video_generation/v3/", body);
      const taskId = genResp.task_id;
      if (!taskId) {
        throw new Error(genResp.message || "No task_id returned from video generation");
      }

      const shouldWait = wait !== false && wait !== "false";
      if (!shouldWait) {
        return {
          status: true,
          result: {
            style: styleName,
            task_id: taskId,
            status: "queued",
            url: null
          },
          state: b64,
          State: b64
        };
      }

      let videoUrl = null;
      for (let i = 0; i < this.pollVideoMax; i++) {
        await this.slp(this.pollVideoMs);
        try {
          const pollResp = await this.post_api("/snap/query/video_generation/v2/", {
            task_id: taskId
          });
          const respObj = pollResp.Resp || pollResp;
          if (respObj.url) {
            videoUrl = respObj.url;
            break;
          }
          if (pollResp.status === "Success" || pollResp.status === "Finished") {
            videoUrl = respObj.url || pollResp.download_url || null;
            break;
          }
        } catch {}
      }

      return {
        status: true,
        result: {
          style: styleName,
          task_id: taskId,
          url: videoUrl
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_video"
        },
        state: b64,
        State: b64
      };
    }
  }

  async chk_video({ state, task_id, id } = {}) {
    let c = null;
    try {
      c = this.ctx(state);
      const b64 = this.b64e(c);
      const targetId = task_id || id;
      if (!targetId) {
        return {
          status: false,
          result: {
            error: "Parameter 'task_id' wajib diisi."
          },
          state: b64,
          State: b64
        };
      }

      const pollResp = await this.post_api("/snap/query/video_generation/v2/", {
        task_id: String(targetId)
      });
      const respObj = pollResp.Resp || pollResp;
      const videoUrl = respObj.url || pollResp.download_url || null;

      return {
        status: true,
        result: {
          task_id: String(targetId),
          status: pollResp.status || (videoUrl ? "Success" : "Processing"),
          url: videoUrl
        },
        state: b64,
        State: b64
      };
    } catch (e) {
      const b64 = this.b64e(c || this.ctx(state));
      return {
        status: false,
        result: {
          error: e?.message || "failed_chk_video"
        },
        state: b64,
        State: b64
      };
    }
  }
}

async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};

  const valid_actions = [
    "reg_dev",
    "list_morph",
    "list_video",
    "morph",
    "video",
    "chk_video",
    "edit",
    "retake",
    "enhance"
  ];

  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          reg_dev: "/?action=reg_dev",
          list_morph: "/?action=list_morph&search=anime",
          list_video: "/?action=list_video&search=hug",
          morph: {
            url: "/?action=morph",
            body: {
              style: "Anime",
              image: "https://.../photo.jpg atau base64"
            }
          },
          video: {
            url: "/?action=video",
            body: {
              style: "Kiss",
              image: "https://.../photo.jpg atau base64",
              gender: "female",
              wait: true
            }
          },
          chk_video: "/?action=chk_video&task_id=TASK_ID",
          edit: {
            url: "/?action=edit",
            body: {
              prompt: "Change background to cyberpunk city",
              image: "https://.../photo.jpg atau base64",
              style: "Native Sketch"
            }
          },
          retake: {
            url: "/?action=retake",
            body: {
              style: "Smile",
              image: "https://.../photo.jpg atau base64"
            }
          },
          enhance: {
            url: "/?action=enhance",
            body: {
              image: "https://.../photo.jpg atau base64"
            }
          }
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

  const api = new SnapAI();
  try {
    let response;
    switch (action) {
      case "reg_dev":
        response = await api.reg_dev(params);
        break;
      case "list_morph":
        response = await api.list_morph(params);
        break;
      case "list_video":
        response = await api.list_video(params);
        break;
      case "morph": {
        const style = params.style || params.style_id || params.template;
        const image = params.image || params.img || params.url || params.file;
        if (!style || !image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'style' dan 'image' (URL/Base64/Buffer) wajib diisi."
          });
        }
        response = await api.morph(params);
        break;
      }
      case "video": {
        const style = params.style || params.template;
        const image = params.image || params.img || params.url || params.file;
        if (!style || !image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'style' dan 'image' (URL/Base64/Buffer) wajib diisi."
          });
        }
        response = await api.video(params);
        break;
      }
      case "chk_video": {
        const task_id = params.task_id || params.id;
        if (!task_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'task_id' (atau 'id') wajib diisi."
          });
        }
        response = await api.chk_video(params);
        break;
      }
      case "edit": {
        const prompt = params.prompt;
        const image = params.image || params.img || params.url || params.file;
        if (!prompt || !image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' dan 'image' (URL/Base64/Buffer) wajib diisi."
          });
        }
        response = await api.edit(params);
        break;
      }
      case "retake": {
        const image = params.image || params.img || params.url || params.file;
        if (!image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'image' (URL/Base64/Buffer) wajib diisi."
          });
        }
        response = await api.retake(params);
        break;
      }
      case "enhance": {
        const image = params.image || params.img || params.url || params.file;
        if (!image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'image' (URL/Base64/Buffer) wajib diisi."
          });
        }
        response = await api.enhance(params);
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }

    if (!response || response?.status === false) {
      return res.status(502).json({
        status: false,
        action,
        error: response?.result?.error || "Gagal memproses request pada server SnapAI.",
        result: response?.result || null,
        state: response?.state || null
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