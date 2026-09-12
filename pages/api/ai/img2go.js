import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class Img2Go {
  constructor() {
    this.baseUrl = "https://dragon.img2go.com/api";
  }
  _uid() {
    try {
      return crypto.randomUUID?.() || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === "x" ? r : r & 3 | 8).toString(16);
      });
    } catch {
      return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
  }
  _hex(len = 16) {
    try {
      return crypto.randomBytes?.(Math.ceil(len / 2)).toString("hex").slice(0, len) || Math.random().toString(16).substring(2, 2 + len);
    } catch {
      return Math.random().toString(16).substring(2, 18);
    }
  }
  _slp(ms = 1e3) {
    return new Promise(res => setTimeout(res, ms));
  }
  _ext(name = "") {
    try {
      const i = name.lastIndexOf(".");
      if (i <= 0 || i === name.length - 1) return "jpg";
      return name.slice(i + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
    } catch {
      return "jpg";
    }
  }
  async _parseImg(input) {
    try {
      if (!input) return null;
      if (Buffer.isBuffer(input)) {
        return {
          buffer: input,
          mime: "image/jpeg",
          filename: `upload_${Date.now()}.jpg`,
          size: input.length
        };
      }
      if (typeof input === "string" && input.startsWith("data:")) {
        const match = input.match(/^data:([^;]+);base64,(.+)$/);
        const mime = match?.[1] || "image/jpeg";
        const ext = mime.split("/")[1]?.split(";")[0] || "jpg";
        const buffer = Buffer.from(match?.[2] || "", "base64");
        return {
          buffer: buffer,
          mime: mime,
          filename: `upload_${Date.now()}.${ext}`,
          size: buffer.length
        };
      }
      if (typeof input === "string" && /^https?:\/\//i.test(input)) {
        console.log("[Img2Go] Fetching input image from URL...");
        const res = await axios.get(input, {
          responseType: "arraybuffer"
        }).catch(() => null);
        if (!res?.data) return null;
        const mime = res.headers?.["content-type"]?.split(";")[0] || "image/jpeg";
        const ext = mime.split("/")[1] || "jpg";
        const buffer = Buffer.from(res.data);
        return {
          buffer: buffer,
          mime: mime,
          filename: input.split("/").pop()?.split("?")[0] || `upload_${Date.now()}.${ext}`,
          size: buffer.length
        };
      }
      if (typeof input === "string") {
        const buffer = Buffer.from(input.trim(), "base64");
        return {
          buffer: buffer,
          mime: "image/jpeg",
          filename: `upload_${Date.now()}.jpg`,
          size: buffer.length
        };
      }
      return null;
    } catch (e) {
      console.log("[Img2Go] Image parse error:", e?.message || e);
      return null;
    }
  }
  _cli() {
    try {
      const qgv = this._hex(16);
      const qgid = this._uid();
      const instance = axios.create({
        baseURL: this.baseUrl,
        timeout: 6e4,
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "cache-control": "no-cache, no-store, must-revalidate",
          pragma: "no-cache",
          origin: "https://www.img2go.com",
          referer: "https://www.img2go.com/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest",
          cookie: `QGV=${qgv}; QGID=${qgid}; x-open=${qgid}; qg_consent=true`
        }
      });
      instance.interceptors.response.use(res => res, err => Promise.reject(err?.response?.data || err));
      return {
        client: instance,
        session: {
          qgv: qgv,
          qgid: qgid,
          pwd: qgid
        }
      };
    } catch {
      return {
        client: axios.create({
          baseURL: this.baseUrl
        }),
        session: {}
      };
    }
  }
  async _initSess(cli, sess = {}) {
    try {
      console.log("[Img2Go] [Auth] Initializing guest session & credit bank...");
      await cli.get("/user/credit-bank").catch(() => null);
      const userRes = await cli.get("/user").catch(() => null);
      const downloadPwd = userRes?.data?.download_password || sess?.qgid;
      if (downloadPwd) {
        sess.pwd = downloadPwd;
        sess.qgid = downloadPwd;
        cli.defaults.headers["cookie"] = `QGV=${sess.qgv}; QGID=${downloadPwd}; x-open=${downloadPwd}; qg_consent=true`;
      }
      return true;
    } catch {
      return false;
    }
  }
  async _mkWf(cli, name = "Text To Image") {
    try {
      console.log(`[Img2Go] [Workflow] Creating workflow: "${name}"...`);
      const res = await cli.post("/workflows", {
        name: name
      });
      return res?.data?.hash || null;
    } catch (e) {
      console.log("[Img2Go] Failed to create workflow:", e?.message || e);
      return null;
    }
  }
  async _resNode(cli, satId, maxAttempts = 30) {
    try {
      console.log(`[Img2Go] [JobService] Resolving server node for SAT ID: ${satId}...`);
      for (let i = 0; i < maxAttempts; i++) {
        const res = await cli.get(`/jobs/${satId}?async=true`).catch(() => null);
        const job = res?.data;
        if (job && job.status?.code !== "init" && job.server && job.token && job.id) {
          return {
            realJobId: job.id,
            server: job.server,
            token: job.token,
            jobData: job
          };
        }
        await this._slp(1e3);
      }
      return null;
    } catch {
      return null;
    }
  }
  async _mkJob(cli, op, extra = {}) {
    try {
      const res = await cli.post("/jobs", {
        operation: op,
        async: true,
        ...extra
      });
      const satId = res?.data?.sat?.id_job || res?.data?.id;
      if (!satId) return null;
      return await this._resNode(cli, satId);
    } catch (e) {
      console.log("[Img2Go] Error creating job:", e?.message || e);
      return null;
    }
  }
  async _upFile(cli, srv, jobId, tok, buf, fname, mime) {
    try {
      const clean = srv.replace(/\/+$/, "");
      const url = `${clean}/upload-file/${jobId}`;
      const form = new FormData();
      form.append("file", buf, {
        filename: fname,
        contentType: mime
      });
      console.log(`[Img2Go] [UploadService] Uploading binary to: ${url}`);
      const res = await axios.post(url, form, {
        headers: {
          ...form.getHeaders(),
          "X-Oc-Token": tok,
          "X-Oc-Upload-Uuid": this._uid(),
          origin: "https://www.img2go.com",
          referer: "https://www.img2go.com/"
        },
        timeout: 12e4
      });
      const inId = res?.data?.id?.input;
      if (inId) await this._ptcIn(cli, jobId, inId);
      return {
        response: res?.data,
        inputId: inId
      };
    } catch (e) {
      console.log("[Img2Go] File upload error:", e?.message || e);
      return null;
    }
  }
  async _upPrompt(cli, srv, jobId, tok, text) {
    try {
      const clean = srv.replace(/\/+$/, "");
      const url = `${clean}/upload-base64/${jobId}`;
      const b64 = Buffer.from(text, "utf-8").toString("base64");
      console.log(`[Img2Go] [JobService] Uploading prompt text to: ${url}`);
      const res = await axios.post(url, {
        name: "prompt.txt",
        type: "prompt",
        content: b64,
        options: {
          type: "prompt"
        }
      }, {
        headers: {
          accept: "application/json, text/plain, */*",
          "content-type": "application/json",
          "X-Oc-Token": tok,
          "X-Oc-Upload-Uuid": this._uid(),
          origin: "https://www.img2go.com",
          referer: "https://www.img2go.com/"
        },
        timeout: 6e4
      });
      const inId = res?.data?.id?.input;
      if (inId) await this._ptcIn(cli, jobId, inId);
      return inId;
    } catch (e) {
      console.log("[Img2Go] Upload prompt error:", e?.message || e);
      return null;
    }
  }
  async _ptcIn(cli, jobId, inputId) {
    try {
      console.log(`[Img2Go] [JobService] Patching input ID: ${inputId}`);
      await cli.post(`/jobs/${jobId}/input/${inputId}/patch`, {
        parameters: {
          delete_after_use: true
        }
      });
      return true;
    } catch {
      return false;
    }
  }
  _getOutUrl(job) {
    try {
      if (!job) return null;
      const list = job.output || [];
      if (Array.isArray(list) && list.length > 0) {
        const item = list.find(o => o?.status === "enabled") || list[0];
        if (item?.uri) return item.uri;
        if (item?.download_uri) return item.download_uri;
        if (job.server && item?.id && item?.filename) {
          return `${job.server.replace(/\/+$/, "")}/download-file/${item.id}/${item.filename}`;
        }
        if (item?.id) {
          return `https://dragon.img2go.com/download-file/${job.id}/${item.id}`;
        }
      }
      return null;
    } catch {
      return null;
    }
  }
  _getWfUrl(wfData) {
    try {
      if (!wfData) return null;
      if (Array.isArray(wfData.latest_files) && wfData.latest_files.length > 0) {
        const f = wfData.latest_files[0];
        if (f?.uri || f?.display_uri) return f.uri || f.display_uri;
      }
      if (Array.isArray(wfData.workflow?.latest_files) && wfData.workflow.latest_files.length > 0) {
        const f = wfData.workflow.latest_files[0];
        if (f?.uri || f?.display_uri) return f.uri || f.display_uri;
      }
      const fg = wfData.workflow?.file_groups || wfData.file_groups || [];
      for (const g of fg) {
        const ver = g.versions || [];
        if (ver.length > 0) {
          const last = ver[ver.length - 1];
          if (last?.uri || last?.display_uri) return last.uri || last.display_uri;
        }
      }
      return null;
    } catch {
      return null;
    }
  }
  async _pollJob(cli, jobId, wfHash = null, maxAttempts = 120, intervalMs = 3e3) {
    try {
      console.log(`[Img2Go] [JobService] Polling completion for Real Job ID: ${jobId} (Interval: ${intervalMs}ms, Max: ${maxAttempts}x)...`);
      for (let att = 1; att <= maxAttempts; att++) {
        await this._slp(intervalMs);
        const res = await cli.get(`/jobs/${jobId}`).catch(() => null);
        const job = res?.data;
        if (!job) continue;
        const code = job?.status?.code;
        const count = job?.output?.length || 0;
        console.log(`[Img2Go] Status (${att}/${maxAttempts}): ${code || "unknown"} | Output count: ${count}`);
        const url = this._getOutUrl(job);
        if (url) {
          console.log(`[Img2Go] [Success] Output URI resolved: ${url}`);
          return {
            job: job,
            outputUrl: url
          };
        }
        if (code === "completed") {
          console.log("[Img2Go] [JobService] Job marked completed, syncing output CDN...");
          for (let r = 1; r <= 5; r++) {
            await this._slp(1e3);
            const rJob = (await cli.get(`/jobs/${jobId}`).catch(() => null))?.data;
            const rUrl = this._getOutUrl(rJob);
            if (rUrl) {
              console.log(`[Img2Go] [Success] Output resolved on sync retry #${r}: ${rUrl}`);
              return {
                job: rJob,
                outputUrl: rUrl
              };
            }
            if (wfHash) {
              const wf = (await cli.get(`/workflows/${wfHash}`).catch(() => null))?.data;
              const wUrl = this._getWfUrl(wf);
              if (wUrl) {
                console.log(`[Img2Go] [Success] Output resolved from workflow on retry #${r}: ${wUrl}`);
                return {
                  job: rJob || job,
                  outputUrl: wUrl
                };
              }
              const wfWs = (await cli.get(`/workflows/${wfHash}?context=workspace`).catch(() => null))?.data;
              const wsUrl = this._getWfUrl(wfWs);
              if (wsUrl) {
                console.log(`[Img2Go] [Success] Output resolved from workspace on retry #${r}: ${wsUrl}`);
                return {
                  job: rJob || job,
                  outputUrl: wsUrl
                };
              }
            }
          }
        }
        if (code === "failed" || code === "error") {
          const err = job?.errors?.length ? JSON.stringify(job.errors) : job?.status?.info || "Job execution failed";
          return {
            error: err
          };
        }
      }
      return {
        error: `Polling conversion timed out after ${maxAttempts} attempts (${maxAttempts * intervalMs / 1e3}s)`
      };
    } catch (e) {
      return {
        error: e?.message || "Error during polling"
      };
    }
  }
  async _upWfPipe(cli, wfHash, img) {
    try {
      console.log("[Img2Go] [WorkflowUploadService] Starting upload pipeline (mirror job)...");
      const mirror = await this._mkJob(cli, "com.img2go.system.initialupload", {
        conversion: [{
          target: "mirror",
          category: "mirror",
          options: {}
        }]
      });
      if (!mirror) return {
        error: "Failed to create mirror upload job"
      };
      await this._upFile(cli, mirror.server, mirror.realJobId, mirror.token, img.buffer, img.filename, img.mime);
      const pollRes = await this._pollJob(cli, mirror.realJobId, null, 40, 1e3);
      if (pollRes?.error) return {
        error: pollRes.error
      };
      const uri = pollRes.outputUrl || pollRes.job?.output?.[0]?.uri;
      if (!uri) return {
        error: "Mirror job completed but missing output URI"
      };
      console.log("[Img2Go] [WorkflowUploadService] Registering file in workflow...");
      const ext = this._ext(img.filename);
      const meta = pollRes.job?.input?.[0]?.metadata || {};
      const regRes = await cli.post(`/workflows/${wfHash}/upload`, {
        files: [{
          filename: img.filename,
          extension: ext,
          contentType: img.mime,
          size: img.size,
          uri: uri,
          metadata: {
            width: meta.image_width,
            height: meta.image_height,
            thumbnail_available: meta.thumbnail_available,
            original_filename: img.filename,
            original_content_type: img.mime,
            original_size: img.size
          }
        }]
      }).catch(() => null);
      let fId = null;
      const groups = regRes?.data?.file_groups || [];
      for (const g of groups) {
        const v = (g.versions || []).find(ver => ver.uri === uri);
        if (v?.file_id) {
          fId = v.file_id;
          break;
        }
      }
      if (!fId && groups[0]?.versions?.[0]?.file_id) {
        fId = groups[0].versions[0].file_id;
      }
      console.log(`[Img2Go] [WorkflowUploadService] Uploaded file registered with ID: ${fId}`);
      return {
        uploadedFileId: fId,
        primaryUri: uri
      };
    } catch (e) {
      return {
        error: `Workflow upload pipeline failed: ${e?.message || e}`
      };
    }
  }
  async _dlBuf(url, sess = {}) {
    try {
      console.log(`[Img2Go] Downloading binary from: ${url}`);
      const headers = {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        referer: "https://www.img2go.com/",
        origin: "https://www.img2go.com",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "image",
        "sec-fetch-mode": "no-cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        cookie: `QGV=${sess?.qgv}; QGID=${sess?.pwd || sess?.qgid}; x-open=${sess?.pwd || sess?.qgid}; qg_consent=true`
      };
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        headers: headers,
        timeout: 6e4
      });
      return {
        status: true,
        buffer: Buffer.from(res.data),
        contentType: res.headers?.["content-type"] || "image/jpeg"
      };
    } catch (e) {
      return {
        status: false,
        error: `Download image buffer failed: ${e?.message || e}`
      };
    }
  }
  async generate({
    prompt = "",
    image = null,
    ...rest
  } = {}) {
    try {
      console.log("[Img2Go] Starting generation request...");
      if (!prompt && !image) {
        return {
          status: false,
          error: "Parameter prompt atau image wajib disertakan."
        };
      }
      const {
        client,
        session
      } = this._cli();
      await this._initSess(client, session);
      const parsedImg = image ? await this._parseImg(image) : null;
      const isImg2Img = Boolean(parsedImg);
      console.log(`[Img2Go] Mode: ${isImg2Img ? "Image-to-Image (AI Edit)" : "Text-to-Image"}`);
      const wfName = isImg2Img ? "AI Edit" : "Text To Image";
      const wfHash = await this._mkWf(client, wfName);
      let inFiles = [];
      let srcUri = null;
      if (isImg2Img && parsedImg) {
        const up = await this._upWfPipe(client, wfHash, parsedImg);
        if (up?.error) {
          return {
            status: false,
            error: up.error
          };
        }
        if (up?.uploadedFileId) inFiles.push(up.uploadedFileId);
        srcUri = up?.primaryUri;
      }
      const aiOp = isImg2Img ? "com.img2go.aiedit" : "com.img2go.texttoimage";
      const aiPayload = {
        workflow_hash: wfHash,
        ...isImg2Img ? {
          input_file_ids: inFiles,
          app_behavior: "modify"
        } : {}
      };
      console.log(`[Img2Go] Creating AI Job for operation: ${aiOp}...`);
      const aiJob = await this._mkJob(client, aiOp, aiPayload);
      if (!aiJob?.realJobId) {
        return {
          status: false,
          error: "Failed to create AI conversion job"
        };
      }
      const realId = aiJob.realJobId;
      console.log(`[Img2Go] Real Job ID: ${realId} | Node: ${aiJob.server}`);
      if (isImg2Img && srcUri) {
        console.log("[Img2Go] [JobService] Linking reference image input to AI Job...");
        const inRes = await client.post(`/jobs/${realId}/input`, [{
          type: "remote",
          source: srcUri,
          filename: "reference_image.jpg",
          content_type: parsedImg.mime || "image/jpeg",
          options: {
            type: "reference_image"
          },
          parameters: {
            delete_after_use: true
          }
        }]).catch(() => null);
        const remoteId = inRes?.data?.[0]?.id;
        if (remoteId) await this._ptcIn(client, realId, remoteId);
      }
      if (prompt) {
        await this._upPrompt(client, aiJob.server, realId, aiJob.token, prompt);
      }
      await client.get(`/jobs/${realId}`).catch(() => null);
      console.log("[Img2Go] Starting AI Conversion options...");
      const convPayload = isImg2Img ? {
        target: "ai-image-edit",
        category: "operation",
        options: {
          allow_multiple_outputs: true,
          mode_fast: rest?.mode_fast !== undefined ? rest.mode_fast : true
        }
      } : {
        target: "ai-text-to-image",
        category: "operation",
        options: {
          allow_multiple_outputs: true,
          model: rest?.model || "3_zim",
          amount: rest?.amount || 1,
          mode_fast: rest?.mode_fast !== undefined ? rest.mode_fast : true,
          aspect_ratio: rest?.aspect_ratio || "1:1",
          prompt_weight: rest?.prompt_weight || 50,
          effects_weight: rest?.effects_weight || 50
        }
      };
      await client.post(`/jobs/${realId}/conversions`, convPayload).catch(() => null);
      const pollRes = await this._pollJob(client, realId, wfHash, rest?.maxAttempts || 120, rest?.pollInterval || 3e3);
      if (pollRes?.error || !pollRes?.outputUrl) {
        return {
          status: false,
          error: pollRes?.error || "AI generation failed or output not found"
        };
      }
      const dl = await this._dlBuf(pollRes.outputUrl, session);
      if (!dl?.status || !dl?.buffer) {
        return {
          status: false,
          error: dl?.error || "Failed to download generated image buffer"
        };
      }
      if (wfHash) client.get(`/workflows/${wfHash}`).catch(() => null);
      console.log(`[Img2Go] Completed successfully! Size: ${dl.buffer.length} bytes.`);
      return {
        status: true,
        buffer: dl.buffer,
        contentType: dl.contentType,
        url: pollRes.outputUrl
      };
    } catch (err) {
      console.log("[Img2Go] Error:", err?.message || err);
      return {
        status: false,
        error: err?.message || "Internal processing error"
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
  const api = new Img2Go();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.contentType);
    return res.status(200).send(result.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}