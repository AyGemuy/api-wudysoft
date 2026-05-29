import axios from "axios";
import FormData from "form-data";
import apiConfig from "@/configs/apiConfig";
const BASE = "https://app-server-azure.phygital.plus";
const MAIL = `https://${apiConfig.DOMAIN_URL}/api/mails/v26`;
const MODE_HINTS = {
  t2i: ["nano banana", "nano", "banana", "gemini image api", "gemini image", "gemini"],
  i2i: ["nano banana", "nano", "banana", "gemini image api", "gemini image", "gemini"],
  t2v: ["sora api", "sora", "minimax", "hailuo"],
  i2v: ["sora api", "sora", "minimax", "hailuo"]
};
class Phygital {
  constructor() {
    this.s = null;
    this._nc = null;
  }
  _dec(b64) {
    try {
      return JSON.parse(Buffer.from(b64, "base64").toString());
    } catch {
      return null;
    }
  }
  _enc(obj) {
    return Buffer.from(JSON.stringify(obj)).toString("base64");
  }
  _ax(extra = {}) {
    const inst = axios.create({
      baseURL: BASE,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://app.phygital.plus",
        referer: "https://app.phygital.plus/",
        rid: "anti-csrf",
        "st-auth-mode": "header",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        ...this.s?.token ? {
          authorization: `Bearer ${this.s.token}`
        } : {},
        ...extra
      }
    });
    inst.interceptors.response.use(res => {
      const cookie = res.headers["set-cookie"];
      const token = res.headers["st-access-token"];
      if (cookie || token) {
        this.s = {
          ...this.s || {},
          ...cookie ? {
            cookies: cookie
          } : {},
          ...token ? {
            token: token
          } : {}
        };
        console.log(`[ax] captured: ${[ token && "token", cookie && "cookie" ].filter(Boolean).join(" ")}`);
      }
      return res;
    });
    return inst;
  }
  async _mail() {
    console.log("[mail] create...");
    const res = await axios.get(MAIL, {
      params: {
        action: "create"
      }
    });
    console.log(`[mail] ${res.data.emailAddress}`);
    return res.data;
  }
  async _inbox(st, tries = 20, ms = 3e3) {
    console.log("[inbox] waiting...");
    for (let i = 0; i < tries; i++) {
      await new Promise(r => setTimeout(r, ms));
      try {
        const res = await axios.get(MAIL, {
          params: {
            action: "message",
            state: st
          }
        });
        if (res.data?.subject) {
          console.log(`[inbox] got: ${res.data.subject}`);
          return res.data;
        }
      } catch {}
      console.log(`[inbox] ${i + 1}/${tries}...`);
    }
    throw new Error("inbox timeout");
  }
  _vtok(msg) {
    const src = (msg.text || "") + (msg.html?.[0] || "");
    return src.match(/token=([A-Za-z0-9_-]{20,})/)?.[1] || null;
  }
  async _auth() {
    console.log("[auth] start");
    try {
      const mail = await this._mail();
      const email = mail.emailAddress;
      const pass = email + "1";
      this.s = {
        ...this.s || {},
        email: email,
        mailState: mail.state
      };
      console.log("[auth] check_email");
      await this._ax().post("/api/v2/front/check_email", {
        email: email
      }).catch(() => {});
      console.log("[auth] signup");
      const up = await this._ax({
        rid: "thirdpartyemailpassword",
        "fdi-version": "1.17"
      }).post("/auth/signup", {
        formFields: [{
          id: "email",
          value: email
        }, {
          id: "password",
          value: pass
        }]
      }).catch(() => null);
      if (!up || up.data?.status !== "OK") {
        console.log("[auth] signup failed → signin");
        await this._ax({
          rid: "thirdpartyemailpassword",
          "fdi-version": "1.17"
        }).post("/auth/signin", {
          formFields: [{
            id: "email",
            value: email
          }, {
            id: "password",
            value: pass
          }]
        });
      }
      console.log(`[auth] token: ${this.s?.token?.slice(0, 30)}...`);
      console.log("[auth] request verify token");
      await this._ax({
        rid: "emailverification",
        "fdi-version": "1.17"
      }).post("/auth/user/email/verify/token", {});
      const msg = await this._inbox(mail.state);
      const vtok = this._vtok(msg);
      if (!vtok) throw new Error("verify token not found");
      console.log("[auth] verify token OK");
      console.log("[auth] verify email");
      await this._ax({
        rid: "emailverification",
        "fdi-version": "1.17"
      }).post("/auth/user/email/verify", {
        method: "token",
        token: vtok
      });
      console.log("[auth] questionnaire");
      await this._ax().post("/api/v2/front/questionnaire-answers", {
        questionnaire_version: 2,
        answers: [{
          level: 0,
          question: "name",
          answers: ["User"]
        }, {
          level: 0,
          question: "country",
          answers: ["Indonesia"]
        }, {
          level: 0,
          question: "position",
          answers: ["founder"]
        }, {
          level: 1,
          question: "company_size",
          answers: ["just_me"]
        }, {
          level: 2,
          question: "product_usage_selection",
          answers: ["animate_image", "restyle_image"]
        }, {
          level: 3,
          question: "ai_confident_selection",
          answers: ["many_tools"]
        }, {
          level: 4,
          question: "referral_source_selection",
          answers: ["ai_library"]
        }]
      }).catch(e => console.log(`[auth] questionnaire skip: ${e.message}`));
      console.log("[auth] done");
    } catch (e) {
      console.error(`[auth] error: ${e.message}`);
      throw e;
    }
  }
  async _ensure(state) {
    try {
      if (state) {
        const dec = this._dec(state);
        if (dec?.token) {
          this.s = dec;
          console.log("[ensure] reuse state");
          return;
        }
      }
      if (this.s?.token) {
        console.log("[ensure] already authed");
        return;
      }
      await this._auth();
    } catch (e) {
      console.error(`[ensure] error: ${e.message}`);
      throw e;
    }
  }
  async _imgbuf(src) {
    if (Buffer.isBuffer(src)) return src;
    if (typeof src === "string") {
      if (/^https?:\/\//.test(src)) {
        console.log(`[img] fetch ${src.slice(0, 60)}...`);
        const r = await axios.get(src, {
          responseType: "arraybuffer"
        });
        return Buffer.from(r.data);
      }
      return Buffer.from(src.replace(/^data:[^;]+;base64,/, ""), "base64");
    }
    throw new Error("image must be url, base64, or Buffer");
  }
  async _upload(buf, name = "img.jpg") {
    console.log(`[upload] ${name} ${buf.length}b`);
    try {
      const fd = new FormData();
      fd.append("fileobject", buf, {
        filename: name,
        contentType: "image/jpeg"
      });
      fd.append("Content-Type", "multipart/form-data");
      fd.append("is_temporary", "true");
      const res = await this._ax({
        ...fd.getHeaders()
      }).post("/api/v2/storage-object/storage-object", fd);
      const id = res.data?.file_obj_id;
      console.log(`[upload] id: ${id}`);
      return id;
    } catch (e) {
      console.error(`[upload] error: ${e.message}`);
      throw e;
    }
  }
  async credits({
    state
  } = {}) {
    try {
      await this._ensure(state);
      const res = await this._ax().get("/api/v2/front/online_credits");
      const d = res.data;
      const out = {
        balance: d.credits_balance,
        isInfinity: d.is_infinity,
        expiration: d.expiration_date,
        breakdowns: d.credits_balance_breakdowns ?? [],
        state: this._enc(this.s)
      };
      console.log(`[credits] balance:${out.balance} infinity:${out.isInfinity} exp:${out.expiration}`);
      return out;
    } catch (e) {
      console.error(`[credits] error: ${e.message}`);
      throw e;
    }
  }
  async _chkCredits(cost) {
    try {
      const res = await this._ax().get("/api/v2/front/online_credits");
      const d = res.data;
      if (d.is_infinity) {
        console.log("[credits] ∞ unlimited");
        return;
      }
      const bal = d.credits_balance ?? 0;
      console.log(`[credits] balance:${bal} needed:${cost}`);
      if (bal < cost) throw new Error(`Insufficient credits: have ${bal}, need ${cost}`);
    } catch (e) {
      if (e.message.startsWith("Insufficient")) throw e;
      console.warn(`[credits] check failed (skip): ${e.message}`);
    }
  }
  async _nodes() {
    if (this._nc) return this._nc;
    try {
      console.log("[nodes] fetching...");
      const res = await this._ax().get("/api/v2/nodes/");
      this._nc = Array.isArray(res.data) ? res.data : [];
      console.log(`[nodes] ${this._nc.length} entries`);
      return this._nc;
    } catch (e) {
      console.error(`[nodes] fetch error: ${e.message}`);
      throw e;
    }
  }
  _norm(entry) {
    const d = entry?.node?.nodeDefinition ?? {};
    return {
      id: d.id,
      name: d.name,
      global: d.id_global,
      version: d.version,
      avgTime: d.averageTimeInSeconds,
      avail: entry.isAvailable ?? false,
      visible: entry.isVisible,
      price: entry.default_price,
      inputs: d.inputs ?? [],
      params: d.params ?? [],
      outputs: d.outputs ?? []
    };
  }
  async _node(id) {
    const raw = await this._nodes();
    const entry = raw.find(e => e?.node?.nodeDefinition?.id === id);
    return entry ? this._norm(entry) : null;
  }
  async _resolveNode(mode) {
    const raw = await this._nodes();
    const hints = MODE_HINTS[mode] ?? [];
    for (const hint of hints) {
      const entry = raw.find(e => {
        const def = e?.node?.nodeDefinition;
        return e.isAvailable && def?.name?.toLowerCase().includes(hint);
      });
      if (entry) {
        const n = this._norm(entry);
        console.log(`[nodes] resolved ${mode} → [${n.id}] ${n.name}`);
        return n;
      }
    }
    throw new Error(`No available node found for mode "${mode}". Hints: ${hints.join(", ")}`);
  }
  async models({
    state,
    onlyAvailable = false
  } = {}) {
    try {
      await this._ensure(state);
      const raw = await this._nodes();
      const all = raw.map(e => this._norm(e));
      const out = {
        result: onlyAvailable ? all.filter(n => n.avail) : all,
        state: this._enc(this.s)
      };
      return out;
    } catch (e) {
      console.error(`[models] error: ${e.message}`);
      throw e;
    }
  }
  async hints({
    state,
    limit = 999,
    offset = 0
  } = {}) {
    try {
      await this._ensure(state);
      console.log(`[hints] fetching limit:${limit} offset:${offset}...`);
      const res = await this._ax().get("/api/airtable/hints", {
        params: {
          limit: limit,
          offset: offset
        }
      });
      const records = res.data?.records ?? [];
      const prompts = records.map(r => r.fields?.Prompt).filter(Boolean);
      console.log(`[hints] ${prompts.length} prompts received`);
      const out = {
        result: prompts,
        state: this._enc(this.s)
      };
      return out;
    } catch (e) {
      console.error(`[hints] error: ${e.message}`);
      throw e;
    }
  }
  async _validate(nodeId, inputs, params) {
    let node;
    try {
      node = await this._node(nodeId);
    } catch {
      return;
    }
    if (!node) {
      console.warn(`[val] node ${nodeId} not in catalog, skip`);
      return;
    }
    if (!node.avail) throw new Error(`Node "${node.name}" (id:${nodeId}) is unavailable`);
    for (const s of node.inputs) {
      if (s.optional === true) continue;
      const sub = inputs.find(i => i.name === s.name);
      const val = sub?.value;
      if (s.dataType === "array" && Array.isArray(val) && val.length === 0) continue;
      const empty = val === undefined || val === null || val === "" || Array.isArray(val) && val.length === 0;
      if (empty) throw new Error(`Required input "${s.name}" (${s.dataType}) missing for node "${node.name}" (id:${nodeId})`);
    }
    for (const s of node.params) {
      if (s.dataType !== "enum") continue;
      const raw = s.options?.values;
      if (!Array.isArray(raw) || !raw.length) continue;
      const valid = raw.map(v => typeof v === "object" ? v.value : v);
      const sub = params.find(p => p.name === s.name);
      if (!sub) continue;
      if (!valid.includes(String(sub.value))) throw new Error(`Invalid "${sub.value}" for param "${s.name}" on "${node.name}". Valid: ${valid.join(", ")}`);
    }
    console.log(`[val] ✓ "${node.name}" (id:${nodeId})`);
  }
  async _poll(taskId, tries = 60, ms = 3e3) {
    console.log(`[poll] task ${taskId}`);
    for (let i = 0; i < tries; i++) {
      try {
        await new Promise(r => setTimeout(r, ms));
        const res = await this._ax().get(`/api/v2/tasks/queue-position/${taskId}`);
        const d = res.data;
        const pos = d.position >= 0 ? `pos:${d.position}` : "proc";
        console.log(`[poll] ${i + 1}/${tries} ${d.status} ${pos}`);
        if (d.status === "done") return d;
        if (d.status === "failed" || d.status === "error") throw new Error(`task ${d.status}: ${d.error_message || ""}`);
      } catch (e) {
        if (e.message.startsWith("task ")) throw e;
        console.error(`[poll] req error: ${e.message}`);
      }
    }
    throw new Error("poll timeout");
  }
  async _links(ids) {
    if (!ids?.length) return [];
    try {
      const res = await this._ax().post("/api/v2/storage-object/storage-object/download-links", {
        link_ids: ids
      });
      return res.data?.links || [];
    } catch (e) {
      console.error(`[links] error: ${e.message}`);
      return [];
    }
  }
  async generate({
    state,
    prompt,
    image,
    video = false,
    nodeId: nidOvr,
    ...rest
  } = {}) {
    console.log("[gen] start");
    try {
      if (!prompt) throw new Error("prompt required");
      await this._ensure(state);
      const imgIds = [];
      if (image) {
        const list = Array.isArray(image) ? image : [image];
        for (const src of list) {
          const buf = await this._imgbuf(src);
          imgIds.push(await this._upload(buf, `img_${imgIds.length}.jpg`));
        }
      }
      const hasImg = imgIds.length > 0;
      const mode = video ? hasImg ? "i2v" : "t2v" : hasImg ? "i2i" : "t2i";
      const outType = video ? "video" : "image";
      console.log(`[gen] mode:${mode}`);
      const nodeInfo = nidOvr ? await this._node(nidOvr) : await this._resolveNode(mode);
      if (!nodeInfo) throw new Error(`Node id ${nidOvr} not found in catalog`);
      const nodeId = nodeInfo.id;
      console.log(`[gen] node:[${nodeId}] ${nodeInfo.name}`);
      const paramDefaults = {};
      for (const p of nodeInfo.params) paramDefaults[p.name] = p.value;
      const params = nodeInfo.params.map(p => {
        let val;
        if (p.name === "model_name") val = rest.model ?? paramDefaults.model_name;
        else if (p.name === "model_version") val = rest.model ?? paramDefaults.model_version;
        else if (p.name === "model") val = rest.model ?? paramDefaults.model;
        else if (p.name === "ratio") val = rest.ratio ?? paramDefaults.ratio;
        else if (p.name === "resolution") val = rest.resolution ?? paramDefaults.resolution;
        else if (p.name === "duration") val = rest.duration ?? paramDefaults.duration;
        else if (p.name === "prompt_optimizer") val = rest.promptOptimizer ?? paramDefaults.prompt_optimizer;
        else if (p.name === "aspect_ratio") val = rest.ratio ?? paramDefaults.aspect_ratio;
        else if (p.name === "seconds") val = rest.duration ?? paramDefaults.seconds;
        else val = paramDefaults[p.name];
        return {
          name: p.name,
          type: p.dataType,
          value: val,
          meta: {}
        };
      });
      let imgSlot = 0;
      const inputs = nodeInfo.inputs.map(inp => {
        const dt = inp.dataType;
        let val;
        let isModified;
        if (dt === "text") {
          val = prompt;
          isModified = true;
        } else if (dt === "image") {
          val = hasImg && imgSlot === 0 ? imgIds[0] : "";
          isModified = hasImg && imgSlot === 0;
          imgSlot++;
        } else if (dt === "array") {
          val = hasImg ? imgIds : [];
          isModified = hasImg;
        } else {
          val = "";
          isModified = false;
        }
        return {
          name: inp.name,
          type: dt,
          optional: inp.optional ?? null,
          isModified: isModified,
          value: val,
          meta: dt === "array" ? {
            dimensions: []
          } : {}
        };
      });
      console.log("[node] ──────────────────────────────────────");
      console.log(`[node] id      : ${nodeInfo.id}`);
      console.log(`[node] name    : ${nodeInfo.name}`);
      console.log(`[node] price   : ${nodeInfo.price} credits`);
      console.log(`[node] avgTime : ~${nodeInfo.avgTime}s`);
      console.log(`[node] inputs  :`);
      for (const inp of nodeInfo.inputs) {
        const opt = inp.optional ? " (optional)" : " (required)";
        console.log(`[node]   ${inp.name} [${inp.dataType}]${opt}`);
      }
      console.log(`[node] params  :`);
      for (const p of nodeInfo.params) {
        const vals = p.options?.values?.map(v => typeof v === "object" ? v.value : v).join(", ") ?? "";
        console.log(`[node]   ${p.name} [${p.dataType}] default:${p.value}${vals ? `  options:[${vals}]` : ""}`);
      }
      console.log("[node] ──────────────────────────────────────");
      await this._validate(nodeId, inputs, params);
      await this._chkCredits(nodeInfo.price ?? 0);
      const payload = {
        id: nodeId,
        inputs: inputs,
        params: params,
        outputs: [{
          name: outType,
          type: "array",
          value: ""
        }]
      };
      console.log("[payload] ───────────────────────────────────");
      console.log(JSON.stringify(payload, null, 2));
      console.log("[payload] ───────────────────────────────────");
      console.log("[gen] submit task");
      const taskRes = await this._ax().post("/api/v2/tasks/", payload);
      const taskId = taskRes.data?.task_id;
      if (!taskId) throw new Error(`no task_id: ${JSON.stringify(taskRes.data)}`);
      console.log(`[gen] task_id: ${taskId}`);
      const result = await this._poll(taskId);
      const outIds = result.outputs?.find(o => o.name === outType)?.id ?? [];
      console.log(`[gen] output ids: [${outIds}]`);
      const links = await this._links(outIds);
      console.log(`[gen] ${links.length} link(s) ready`);
      return {
        state: this._enc(this.s),
        result: result,
        links: links
      };
    } catch (e) {
      console.error(`[gen] error: ${e.message}`);
      throw e;
    }
  }
}
const validActions = ["credits", "models", "generate"];
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  if (action === "generate" && !params.prompt) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
    });
  }
  const api = new Phygital();
  try {
    let response;
    switch (action) {
      case "credits":
        response = await api.credits(params);
        break;
      case "models":
        response = await api.models(params);
        break;
      case "generate":
        response = await api.generate(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari server Phygital. Coba lagi nanti."
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
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}