import axios from "axios";
import crypto from "crypto";
import zlib from "zlib";
import sizeOf from "image-size";
class MuseLabAI {
  constructor() {
    try {
      this.base = "https://api.muselab.tech";
      this.upBase = "https://2bo94eto5d.execute-api.us-east-1.amazonaws.com";
      this.key = Buffer.from("c08af10685984c7f", "utf8");
      this.app = "muselab-android";
      this.ver = "1.5.0";
      this.verCode = "90";
      this.country = "ID";
      this.region = "us-east-1";
      this.service = "execute-api";
      this.awsKey = "AKIAWRHZ36DOELMYTGOR";
      this.awsSecret = "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";
      this.modelsCache = null;
    } catch (e) {
      this.modelsCache = null;
    }
  }
  log(msg, data = null) {
    try {
      console.log(`[MuseLabAI] ${msg}`, data ? JSON.stringify(data) : "");
    } catch (e) {}
  }
  getRatio(buffer) {
    try {
      if (!buffer || !Buffer.isBuffer(buffer)) return "576:1280";
      const dim = sizeOf(buffer);
      if (dim?.width && dim?.height) {
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(dim.width, dim.height);
        const rw = dim.width / divisor;
        const rh = dim.height / divisor;
        if (rw <= 20 && rh <= 20) return `${rw}:${rh}`;
        return `${dim.width}:${dim.height}`;
      }
      return "576:1280";
    } catch (e) {
      return "576:1280";
    }
  }
  sha256(data) {
    try {
      return crypto.createHash("sha256").update(data || "").digest("hex");
    } catch (e) {
      return "";
    }
  }
  hmac(key, data) {
    try {
      return crypto.createHmac("sha256", key).update(data).digest();
    } catch (e) {
      return Buffer.alloc(0);
    }
  }
  awsSign(method, fullUrl, payload = null, headers = {}) {
    try {
      const urlObj = new URL(fullUrl);
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
      const dateStamp = amzDate.substring(0, 8);
      const host = urlObj.host;
      const canonicalUri = urlObj.pathname || "/";
      const searchParams = new URLSearchParams(urlObj.search);
      const sortedKeys = Array.from(searchParams.keys()).sort();
      const canonicalQuerystring = sortedKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(searchParams.get(k))}`).join("&");
      const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
      const signedHeaders = "host;x-amz-date";
      let payloadHash = "";
      if (Buffer.isBuffer(payload)) {
        payloadHash = this.sha256(payload);
      } else if (typeof payload === "object" && payload !== null) {
        payloadHash = this.sha256(JSON.stringify(payload));
      } else if (typeof payload === "string") {
        payloadHash = this.sha256(payload);
      } else {
        payloadHash = this.sha256("");
      }
      const canonicalRequest = [method.toUpperCase(), canonicalUri, canonicalQuerystring, canonicalHeaders, signedHeaders, payloadHash].join("\n");
      const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`;
      const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, this.sha256(canonicalRequest)].join("\n");
      const kDate = this.hmac(`AWS4${this.awsSecret}`, dateStamp);
      const kRegion = this.hmac(kDate, this.region);
      const kService = this.hmac(kRegion, this.service);
      const kSigning = this.hmac(kService, "aws4_request");
      const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");
      const authHeader = `AWS4-HMAC-SHA256 Credential=${this.awsKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
      return {
        ...headers,
        host: host,
        "x-amz-date": amzDate,
        authorization: authHeader
      };
    } catch (e) {
      return headers;
    }
  }
  enc(val) {
    try {
      const raw = typeof val === "object" ? JSON.stringify(val) : String(val);
      const iv = crypto.randomBytes(16);
      const cip = crypto.createCipheriv("aes-128-cbc", this.key, iv);
      cip.setAutoPadding(true);
      const encBuf = Buffer.concat([cip.update(Buffer.from(raw, "utf8")), cip.final()]);
      return Buffer.concat([iv, encBuf]).toString("base64");
    } catch (e) {
      return null;
    }
  }
  dec(b64) {
    try {
      if (!b64 || typeof b64 !== "string") return null;
      const buf = Buffer.from(b64, "base64");
      if (buf.length <= 16) return null;
      const iv = buf.subarray(0, 16);
      const cipData = buf.subarray(16);
      const dec = crypto.createDecipheriv("aes-128-cbc", this.key, iv);
      dec.setAutoPadding(true);
      let decBuf = Buffer.concat([dec.update(cipData), dec.final()]);
      if (decBuf.length >= 2 && decBuf[0] === 31 && decBuf[1] === 139) {
        try {
          decBuf = zlib.gunzipSync(decBuf);
        } catch {
          try {
            decBuf = zlib.unzipSync(decBuf);
          } catch {}
        }
      }
      const str = decBuf.toString("utf8");
      try {
        return JSON.parse(str);
      } catch {
        return str;
      }
    } catch (e) {
      return null;
    }
  }
  rndId(len = 20) {
    try {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let res = "";
      for (let i = 0; i < len; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return res;
    } catch (e) {
      return "EX2REZQxoVDs8Xfz58VO";
    }
  }
  hdrs(userId, extra = {}) {
    try {
      return {
        "User-Agent": `Muselab/${this.ver} (${this.verCode})`,
        "Accept-Encoding": "gzip",
        app_platform: "Android",
        "atlasv-origin": this.app,
        "origin-info-country": this.country.toLowerCase(),
        "atlasv-id": userId ? this.enc(userId) : undefined,
        ...extra || {}
      };
    } catch (e) {
      return {};
    }
  }
  pack(obj) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch (e) {
      return null;
    }
  }
  unpack(str) {
    try {
      if (!str || typeof str !== "string") return null;
      return JSON.parse(Buffer.from(str, "base64").toString("utf8"));
    } catch (e) {
      return null;
    }
  }
  async rslv(media) {
    try {
      if (!media) return null;
      if (Buffer.isBuffer(media)) return media;
      if (typeof media === "string") {
        if (media.startsWith("http://") || media.startsWith("https://")) {
          this.log("Mengunduh file media dari URL...");
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res?.data);
        }
        const b64 = media.includes("base64,") ? media.split("base64,")[1] : media;
        return Buffer.from(b64, "base64");
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  async upld(buffer, ext = "jpg") {
    try {
      if (!buffer) return null;
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const url = `${this.upBase}/v1/ml/public/s3/upload?app_name=${this.app}&file_name=${fileName}&path=aishared`;
      this.log(`Mengunggah gambar ke storage S3: ${fileName}...`);
      const baseHeaders = {
        "Content-Type": "application/octet-stream",
        "User-Agent": `${this.app}/${this.ver} (${this.verCode})`,
        "Accept-Encoding": "gzip",
        app_platform: "Android",
        "atlasv-origin": this.app
      };
      const signedHeaders = this.awsSign("POST", url, buffer, baseHeaders);
      const res = await axios.post(url, buffer, {
        headers: signedHeaders
      }).catch(err => {
        this.log(`Upload Error: ${JSON.stringify(err?.response?.data || err?.message)}`);
        return null;
      });
      return res?.data?.data || null;
    } catch (e) {
      return null;
    }
  }
  async getCfg(userId) {
    try {
      if (this.modelsCache) return this.modelsCache;
      this.log("Mengambil konfigurasi AI resmi server...");
      const url = `${this.base}/material/api/v2/app/config`;
      const signedHeaders = this.awsSign("GET", url, null, this.hdrs(userId));
      const res = await axios.get(url, {
        headers: signedHeaders
      }).catch(() => null);
      const decData = this.dec(res?.data?.data);
      if (decData?.service_model_infos) {
        this.modelsCache = decData.service_model_infos;
        return this.modelsCache;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  async valModel(userId, serviceType, modelType, extraParams = {}) {
    try {
      const configs = await this.getCfg(userId) || [];
      const svc = configs.find(s => (s?.ai_name || "").toLowerCase() === (serviceType || "").toLowerCase()) || configs.find(s => (s?.ai_name || "").toLowerCase() === "aigeneral");
      const resolvedService = svc?.ai_name || serviceType || "aiGeneral";
      const modelList = svc?.ai_model_infos || [];
      let modelInfo = modelList.find(m => (m?.model_type || "").toLowerCase() === (modelType || "").toLowerCase()) || modelList.find(m => (m?.free_model_type || "").toLowerCase() === (modelType || "").toLowerCase());
      if (!modelInfo && modelList.length > 0) {
        modelInfo = modelList[0];
      }
      const resolvedModel = modelInfo?.model_type || modelInfo?.free_model_type || modelType || "boogui2i";
      let requiredCost = modelInfo?.default_credits ?? svc?.default_credits ?? 0;
      if (modelInfo?.credits_group && Array.isArray(modelInfo.credits_group)) {
        const reqDur = Number(extraParams?.duration) || 4;
        const reqRes = String(extraParams?.resolution || "540p").toLowerCase();
        const matchedTier = modelInfo.credits_group.find(g => g.duration === reqDur && String(g.resolution).toLowerCase() === reqRes) || modelInfo.credits_group[0];
        if (matchedTier) {
          requiredCost = matchedTier.credits;
          extraParams.duration = String(matchedTier.duration);
          extraParams.resolution = matchedTier.resolution;
        }
      }
      return {
        serviceType: resolvedService,
        modelType: resolvedModel,
        requiredCost: requiredCost,
        extraParams: extraParams
      };
    } catch (e) {
      return {
        serviceType: serviceType || "aiGeneral",
        modelType: modelType || "boogui2i",
        requiredCost: 0,
        extraParams: extraParams
      };
    }
  }
  async ensureAuth(stateStr) {
    try {
      let state = stateStr ? this.unpack(stateStr) : null;
      const userId = state?.userId || crypto.randomUUID();
      const atUid = state?.atUid || this.rndId(20);
      let codeId = state?.codeId || null;
      let availablePoints = state?.points ?? 0;
      const hitId = this.enc(crypto.randomUUID());
      if (!codeId) {
        this.log("Melakukan check-in reward harian...");
        const rewardUrl = `${this.base}/aibase-prod/v1/base/pvgbnf/points/reward?app_name=${this.app}`;
        const rewardBody = {
          app_name: this.app,
          code_type: "checkin",
          hit_id: hitId,
          is_paid: false,
          user_ids: [this.enc(userId)]
        };
        const signedRewardHdrs = this.awsSign("POST", rewardUrl, rewardBody, this.hdrs(userId, {
          "Content-Type": "application/json"
        }));
        await axios.post(rewardUrl, rewardBody, {
          headers: signedRewardHdrs
        }).catch(() => null);
      }
      this.log("Mengambil info saldo koin & voucher akun...");
      const infoUrl = `${this.base}/aibase-prod/v1/base/pvgbnf/info/get?app_name=${this.app}`;
      const infoBody = {
        app_name: this.app,
        data: [this.enc(userId)],
        grant_daily_point: false,
        hit_id: hitId
      };
      const signedInfoHdrs = this.awsSign("POST", infoUrl, infoBody, this.hdrs(userId, {
        "Content-Type": "application/json"
      }));
      const infoRes = await axios.post(infoUrl, infoBody, {
        headers: signedInfoHdrs
      }).catch(() => null);
      const decWin = this.dec(infoRes?.data?.data_win);
      if (Array.isArray(decWin) && decWin.length > 0) {
        codeId = decWin[0]?.code_id || codeId;
        availablePoints = decWin.reduce((acc, cur) => acc + (cur?.points || 0), 0);
      } else {
        codeId = codeId || `16type-checkin-${this.app}-${atUid}`;
        availablePoints = availablePoints || 30;
      }
      state = {
        userId: userId,
        atUid: atUid,
        codeId: codeId,
        points: availablePoints
      };
      return state;
    } catch (e) {
      return null;
    }
  }
  async generate({
    state,
    prompt,
    image,
    ...rest
  } = {}) {
    try {
      if (!prompt) return {
        status: "error",
        message: 'Parameter "prompt" wajib diisi.'
      };
      if (!image) return {
        status: "error",
        message: 'Parameter "image" wajib diisi.'
      };
      const session = await this.ensureAuth(state);
      if (!session) return {
        status: "error",
        message: "Gagal mengautentikasi sesi profil pengguna."
      };
      const imageBuffer = await this.rslv(image);
      if (!imageBuffer) return {
        status: "error",
        message: "Format media tidak valid atau gagal diunduh."
      };
      const autoAspectRatio = this.getRatio(imageBuffer);
      const targetAspectRatio = rest?.aspect_ratio || autoAspectRatio;
      const val = await this.valModel(session.userId, rest?.service_type, rest?.model_type, {
        aspect_ratio: targetAspectRatio,
        duration: rest?.duration,
        resolution: rest?.resolution,
        add_audio: rest?.add_audio || "0",
        ...rest?.extra_params || {}
      });
      this.log(`Pengecekan Koin: Saldo ${session.points} | Biaya ${val.requiredCost} | Ratio: ${targetAspectRatio}`);
      if (session.points < val.requiredCost) {
        return {
          status: "error",
          message: `Koin tidak mencukupi. Dibutuhkan: ${val.requiredCost}, Tersedia: ${session.points}`
        };
      }
      const uploadedKey = await this.upld(imageBuffer);
      if (!uploadedKey) return {
        status: "error",
        message: "Gagal mengunggah gambar ke penyimpanan cloud."
      };
      const clientTaskId = crypto.randomUUID();
      const innerPayloadEnc = this.enc({
        user_ids: [session.userId],
        code_ids: [session.codeId],
        at_uid: session.atUid,
        client_task_id: clientTaskId,
        cost_point: val.requiredCost,
        batch_cost_point: val.requiredCost
      });
      if (!innerPayloadEnc) return {
        status: "error",
        message: "Gagal mengenkripsi payload task."
      };
      const body = {
        image_urls: [`${this.app}/aishared/${uploadedKey}`],
        prompt: prompt,
        service_type: val.serviceType,
        service_mode: rest?.service_mode || "default",
        model_type: val.modelType,
        free_by_ad: rest?.free_by_ad ?? 0,
        extra_params: {
          function_type: rest?.function_type || (val.serviceType === "videogen" ? "live_photo" : "chat_edit"),
          post_check: "true",
          group_task_id: rest?.group_task_id || crypto.randomUUID(),
          is_vip: "0",
          at_template_unique_id: rest?.at_template_unique_id || rest?.unique_id || rest?.uniqueId || "",
          at_template_id: String(rest?.at_template_id || rest?.template_id || rest?.id || ""),
          at_template_title: rest?.at_template_title || "",
          pre_anime_check: "true",
          ...val.extraParams
        },
        data: innerPayloadEnc,
        origin_info: {
          app_name: this.app,
          app_version: this.verCode,
          country: this.country.toLowerCase(),
          version: this.ver
        },
        ...rest
      };
      this.log(`Mengirim task generate AI (${val.serviceType}/${val.modelType})...`);
      const runUrl = `${this.base}/aiplatform/v1/ai/mixco/imitation/run?app_name=${this.app}&path=aishared`;
      const signedHeaders = this.awsSign("POST", runUrl, body, this.hdrs(session.userId, {
        "Content-Type": "application/json"
      }));
      const res = await axios.post(runUrl, body, {
        headers: signedHeaders
      }).catch(err => err?.response || null);
      const taskData = res?.data?.data;
      if (!taskData?.task_id) {
        return {
          status: "error",
          message: res?.data?.message || "Server menolak pembentukan task AI."
        };
      }
      session.points = Math.max(0, session.points - val.requiredCost);
      return {
        status: "success",
        task_id: taskData.task_id,
        service_type: val.serviceType,
        model_type: val.modelType,
        aspect_ratio: targetAspectRatio,
        cost_point: val.requiredCost,
        remaining_points: session.points,
        state: this.pack(session)
      };
    } catch (e) {
      return {
        status: "error",
        message: e?.message || "Terjadi kegagalan saat request generate."
      };
    }
  }
  async imageToImage({
    state,
    prompt,
    image,
    ...rest
  } = {}) {
    try {
      return await this.generate({
        state: state,
        prompt: prompt,
        image: image,
        service_type: rest?.service_type || "aiGeneral",
        model_type: rest?.model_type || "boogui2i",
        function_type: rest?.function_type || "chat_edit",
        ...rest
      });
    } catch (e) {
      return {
        status: "error",
        message: e?.message || "Gagal generate image to image."
      };
    }
  }
  async imageToVideo({
    state,
    prompt,
    image,
    duration = "4",
    resolution = "540p",
    add_audio = "0",
    ...rest
  } = {}) {
    try {
      return await this.generate({
        state: state,
        prompt: prompt || "animate image",
        image: image,
        service_type: rest?.service_type || "videogen",
        model_type: rest?.model_type || "atvcfi",
        function_type: rest?.function_type || "live_photo",
        duration: String(duration),
        resolution: String(resolution),
        add_audio: String(add_audio),
        ...rest
      });
    } catch (e) {
      return {
        status: "error",
        message: e?.message || "Gagal generate image to video."
      };
    }
  }
  async templateToImage({
    state,
    template_id,
    id,
    unique_id,
    uniqueId,
    image,
    prompt,
    ...rest
  } = {}) {
    try {
      const templateId = template_id || id;
      const uId = unique_id || uniqueId;
      if (!templateId && !uId) return {
        status: "error",
        message: 'Parameter "template_id" atau "unique_id" wajib diisi.'
      };
      if (!image) return {
        status: "error",
        message: 'Parameter "image" wajib diisi.'
      };
      const detailRes = await this.templateDetail({
        state: state,
        id: templateId,
        uniqueId: uId,
        ...rest
      });
      if (detailRes.status !== "success") return detailRes;
      const tpl = detailRes.template;
      const archive = tpl?.freeArchive || tpl?.normalArchive || {};
      return await this.generate({
        state: detailRes.state,
        image: image,
        prompt: archive?.prompt || prompt || "",
        service_type: tpl?.templateType || archive?.extraParams?.service_type || "aiGeneral",
        model_type: archive?.modelType || "boogui2i",
        function_type: "template",
        at_template_id: String(tpl?.id || templateId || ""),
        at_template_unique_id: tpl?.uniqueId || uId || "",
        at_template_title: rest?.at_template_title || "",
        ...rest
      });
    } catch (e) {
      return {
        status: "error",
        message: e?.message || "Gagal generate template to image."
      };
    }
  }
  async claim({
    state,
    code_type = "checkin",
    ...rest
  } = {}) {
    try {
      const session = await this.ensureAuth(state);
      if (!session) return {
        status: "error",
        message: "Sesi akun tidak valid."
      };
      const targetTypes = code_type === "all" ? ["checkin", "daily", "template_use", "feature_use", "ad_watch"] : [code_type || "checkin"];
      let totalClaimed = 0;
      const claimResults = [];
      for (const type of targetTypes) {
        this.log(`Mengklaim poin reward: ${type}...`);
        const hitId = this.enc(crypto.randomUUID());
        const rewardUrl = `${this.base}/aibase-prod/v1/base/pvgbnf/points/reward?app_name=${this.app}`;
        const rewardBody = {
          app_name: this.app,
          code_type: type,
          hit_id: hitId,
          is_paid: false,
          user_ids: [this.enc(session.userId)],
          ...rest
        };
        const signedHdrs = this.awsSign("POST", rewardUrl, rewardBody, this.hdrs(session.userId, {
          "Content-Type": "application/json"
        }));
        const res = await axios.post(rewardUrl, rewardBody, {
          headers: signedHdrs
        }).catch(err => err?.response || null);
        const data = res?.data || {};
        const pts = data?.points || 0;
        totalClaimed += pts;
        claimResults.push({
          code_type: type,
          points: pts,
          msg: data?.msg || (data?.data_status === "ok" ? "ok" : "already_claimed_or_limit")
        });
      }
      const hitId = this.enc(crypto.randomUUID());
      const infoUrl = `${this.base}/aibase-prod/v1/base/pvgbnf/info/get?app_name=${this.app}`;
      const infoBody = {
        app_name: this.app,
        data: [this.enc(session.userId)],
        grant_daily_point: false,
        hit_id: hitId
      };
      const signedInfoHdrs = this.awsSign("POST", infoUrl, infoBody, this.hdrs(session.userId, {
        "Content-Type": "application/json"
      }));
      const infoRes = await axios.post(infoUrl, infoBody, {
        headers: signedInfoHdrs
      }).catch(() => null);
      const decWin = this.dec(infoRes?.data?.data_win);
      if (Array.isArray(decWin) && decWin.length > 0) {
        session.codeId = decWin[0]?.code_id || session.codeId;
        session.points = decWin.reduce((acc, cur) => acc + (cur?.points || 0), 0);
      } else {
        session.points += totalClaimed;
      }
      return {
        status: "success",
        total_claimed: totalClaimed,
        current_points: session.points,
        claims: claimResults,
        reward_status: infoRes?.data?.reward_status || null,
        state: this.pack(session)
      };
    } catch (e) {
      return {
        status: "error",
        message: e?.message || "Gagal melakukan klaim reward poin."
      };
    }
  }
  async status({
    state,
    task_id,
    taskId,
    id,
    service_type,
    serviceType,
    ...rest
  } = {}) {
    try {
      const targetTaskId = task_id || taskId || id;
      if (!targetTaskId) return {
        status: "error",
        message: 'Parameter "task_id" wajib diisi.'
      };
      const session = await this.ensureAuth(state);
      if (!session) return {
        status: "error",
        message: "Sesi state tidak valid."
      };
      const resolvedServiceType = service_type || serviceType || "aiGeneral";
      this.log(`Mengecek status task: ${targetTaskId}...`);
      const body = {
        task_id: targetTaskId,
        service_type: resolvedServiceType,
        origin_info: {
          app_name: this.app,
          app_version: this.verCode,
          country: this.country.toLowerCase(),
          version: this.ver
        },
        ...rest
      };
      const resUrl = `${this.base}/aiplatform/v1/ai/mixco/imitation/res`;
      const extraHdrs = {
        "Content-Type": "application/json",
        "normal-atuid": session.atUid,
        "job-start-time": "0",
        "estimated-jobs-in-queue": "0"
      };
      const signedHeaders = this.awsSign("POST", resUrl, body, this.hdrs(session.userId, extraHdrs));
      const res = await axios.post(resUrl, body, {
        headers: signedHeaders
      }).catch(err => err?.response || null);
      const data = res?.data || {};
      const isCompleted = data?.status === "completed" || data?.data_status === "completed";
      return {
        status: isCompleted ? "completed" : data?.status || "processing",
        task_id: targetTaskId,
        images: data?.image_urls || [],
        videos: data?.video_urls || [],
        audios: data?.audio_urls || [],
        texts: data?.texts || [],
        state: this.pack(session)
      };
    } catch (e) {
      return {
        status: "error",
        message: e?.message || "Gagal memeriksa status task."
      };
    }
  }
  async templates({
    state,
    pageIndex = 1,
    pageSize = 100,
    contentType = "mixed",
    templateVersion = "2.0",
    ...rest
  } = {}) {
    try {
      const session = await this.ensureAuth(state);
      const userId = session?.userId || crypto.randomUUID();
      this.log(`Mengambil daftar template (Page: ${pageIndex}, Size: ${pageSize})...`);
      const q = new URLSearchParams();
      q.append("contentType", contentType);
      q.append("countryCode", this.country);
      q.append("pageIndex", String(pageIndex));
      q.append("pageSize", String(pageSize));
      q.append("templateVersion", templateVersion);
      const url = `${this.base}/material/api/v2/app/module?${q.toString()}`;
      const signedHeaders = this.awsSign("GET", url, null, this.hdrs(userId, {
        "User-Agent": "okhttp/4.12.0"
      }));
      const res = await axios.get(url, {
        headers: signedHeaders
      }).catch(err => err?.response || null);
      const decData = this.dec(res?.data?.data) || res?.data?.data || res?.data || [];
      return {
        status: "success",
        data: decData,
        state: this.pack(session)
      };
    } catch (e) {
      return {
        status: "error",
        message: e?.message || "Gagal memuat daftar template."
      };
    }
  }
  async templateDetail({
    state,
    id,
    uniqueId,
    unique_id,
    templateVersion = "2.0",
    ...rest
  } = {}) {
    try {
      const uId = uniqueId || unique_id;
      if (!id && !uId) return {
        status: "error",
        message: 'Parameter "id" atau "uniqueId" wajib diisi.'
      };
      const session = await this.ensureAuth(state);
      const userId = session?.userId || crypto.randomUUID();
      this.log(`Mengambil detail template: ${uId || id}...`);
      const q = new URLSearchParams();
      if (id) q.append("id", String(id));
      q.append("templateVersion", templateVersion);
      if (uId) q.append("uniqueId", String(uId));
      const url = `${this.base}/material/api/v2/app/template/detail?${q.toString()}`;
      const signedHeaders = this.awsSign("GET", url, null, this.hdrs(userId, {
        "User-Agent": "okhttp/4.12.0"
      }));
      const res = await axios.get(url, {
        headers: signedHeaders
      }).catch(err => err?.response || null);
      const decData = this.dec(res?.data?.data);
      if (!decData) {
        return {
          status: "error",
          message: res?.data?.msg || "Gagal mendeskripsikan response detail template."
        };
      }
      return {
        status: "success",
        template: decData,
        state: this.pack(session)
      };
    } catch (e) {
      return {
        status: "error",
        message: e?.message || "Gagal memuat detail template."
      };
    }
  }
  async profile({
    state,
    ...rest
  } = {}) {
    try {
      const session = await this.ensureAuth(state);
      if (!session) {
        return {
          status: "error",
          message: "Gagal memuat atau menginisialisasi sesi profil pengguna."
        };
      }
      return {
        status: "success",
        user_id: session.userId,
        at_uid: session.atUid,
        code_id: session.codeId,
        available_points: session.points,
        state: this.pack(session)
      };
    } catch (e) {
      return {
        status: "error",
        message: e?.message || "Gagal memuat data profil pengguna."
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body || {};
  const validActions = ["generate", "image_to_image", "image_to_video", "template_to_image", "claim", "status", "templates", "template_detail", "profile"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          generate: "/api/muselab?action=generate&prompt=add+hat&image=https://example.com/img.jpg",
          image_to_image: "/api/muselab?action=image_to_image&prompt=add+cute+cat+hat&image=https://example.com/img.jpg",
          image_to_video: "/api/muselab?action=image_to_video&prompt=flying+in+the+sky&image=https://example.com/img.jpg&duration=4&resolution=540p&add_audio=1",
          template_to_image: "/api/muselab?action=template_to_image&unique_id=AIG_N1231_Sunny_Boy&image=https://example.com/img.jpg",
          claim: "/api/muselab?action=claim&code_type=all&state=YOUR_STATE_BASE64",
          status: "/api/muselab?action=status&task_id=boogui2i2edfe9dd-xxxx&state=YOUR_STATE_BASE64",
          templates: "/api/muselab?action=templates&pageIndex=1&pageSize=20",
          template_detail: "/api/muselab?action=template_detail&uniqueId=AIG_N1231_Sunny_Boy",
          profile: "/api/muselab?action=profile&state=YOUR_STATE_BASE64"
        }
      }
    });
  }
  const api = new MuseLabAI();
  try {
    let response;
    switch (action) {
      case "generate":
        response = await api.generate(params);
        break;
      case "image_to_image":
        response = await api.imageToImage(params);
        break;
      case "image_to_video":
        response = await api.imageToVideo(params);
        break;
      case "template_to_image":
        response = await api.templateToImage(params);
        break;
      case "claim":
        response = await api.claim(params);
        break;
      case "status":
        response = await api.status(params);
        break;
      case "templates":
        response = await api.templates(params);
        break;
      case "template_detail":
        response = await api.templateDetail(params);
        break;
      case "profile":
        response = await api.profile(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (response && response.status === "error") {
      return res.status(400).json({
        status: false,
        action: action,
        error: response.message || "Gagal memproses request internal API.",
        state: response.state || null
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      action: action,
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}