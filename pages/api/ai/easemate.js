import axios from "axios";
import crypto from "crypto";
const WASM_URL = "https://www.easemate.ai/_wasm/chat_generator.wasm?v=1778839543951";
class EasemateAI {
  constructor() {
    this.base = "https://api.easemate.ai";
    this.uuid = crypto.randomBytes(16).toString("hex");
    this.identityId = "";
    this.wasm = null;
    this.wasmU8 = null;
    this.wasmDV = null;
    this.wasmLen = 0;
    this.decoder = new TextDecoder("utf-8", {
      ignoreBOM: true,
      fatal: true
    });
    this.encoder = new TextEncoder();
    this._initFakeEnvironment();
  }
  _initFakeEnvironment() {
    const appData = {
      visitorId: this.uuid,
      identityId: "",
      browserLang: "id-ID",
      iResult: {
        os: {
          name: "Linux"
        },
        browser: {
          name: "Chrome"
        },
        device: {
          type: "desktop"
        }
      }
    };
    const localStorageData = {
      "app-main": JSON.stringify(appData)
    };
    const fakeLocalStorage = {
      getItem(key) {
        return localStorageData[key] || null;
      },
      setItem(key, value) {
        localStorageData[key] = String(value);
      }
    };
    const fakeLocation = {
      origin: "https://www.easemate.ai"
    };
    this.FakeWindow = class FakeWindow {};
    this.fakeWindow = new this.FakeWindow();
    this.fakeWindow.location = fakeLocation;
    this.fakeWindow.localStorage = fakeLocalStorage;
  }
  getHdr(sign, timestamp) {
    const hdr = {
      accept: "application/json",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "client-name": "chatpdf",
      "client-type": "web",
      "content-type": "application/json;charset=UTF-8",
      "device-identifier": this.uuid,
      "device-platform": "Linux,Chrome",
      "device-type": "web",
      "device-uuid": this.uuid,
      lang: "id",
      language: "id-ID",
      origin: "https://www.easemate.ai",
      pragma: "no-cache",
      "product-code": "888",
      referer: "https://www.easemate.ai/",
      site: "www.easemate.ai",
      sign: sign,
      timestamp: timestamp,
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
    };
    if (this.identityId) hdr["identity-id"] = this.identityId;
    return hdr;
  }
  getU8() {
    if (!this.wasmU8 || this.wasmU8.byteLength === 0) {
      this.wasmU8 = new Uint8Array(this.wasm.memory.buffer);
    }
    return this.wasmU8;
  }
  getDV() {
    if (!this.wasmDV || this.wasmDV.buffer.detached === true || this.wasmDV.buffer.detached === undefined && this.wasmDV.buffer !== this.wasm.memory.buffer) {
      this.wasmDV = new DataView(this.wasm.memory.buffer);
    }
    return this.wasmDV;
  }
  readStr(ptr, len) {
    ptr >>>= 0;
    return this.decoder.decode(this.getU8().subarray(ptr, ptr + len));
  }
  passStr(txt, malloc, realloc) {
    if (realloc === undefined) {
      const buf = this.encoder.encode(txt);
      const ptr = malloc(buf.length, 1) >>> 0;
      this.getU8().subarray(ptr, ptr + buf.length).set(buf);
      this.wasmLen = buf.length;
      return ptr;
    }
    let len = txt.length;
    let ptr = malloc(len, 1) >>> 0;
    const mem = this.getU8();
    let off = 0;
    for (; off < len; off++) {
      const code = txt.charCodeAt(off);
      if (code > 127) break;
      mem[ptr + off] = code;
    }
    if (off !== len) {
      if (off !== 0) txt = txt.slice(off);
      ptr = realloc(ptr, len, len = off + txt.length * 3, 1) >>> 0;
      const view = this.getU8().subarray(ptr + off, ptr + len);
      const ret = this.encoder.encodeInto(txt, view);
      off += ret.written || 0;
      ptr = realloc(ptr, len, off, 1) >>> 0;
    }
    this.wasmLen = off;
    return ptr;
  }
  addRef(val) {
    const idx = this.wasm.__externref_table_alloc();
    this.wasm.__wbindgen_export_2.set(idx, val);
    return idx;
  }
  handleErr(fn, args) {
    try {
      return fn.apply(null, args);
    } catch (e) {
      const idx = this.addRef(e);
      this.wasm.__wbindgen_exn_store(idx);
    }
  }
  isNull(v) {
    return v == null;
  }
  createImports() {
    const fakeWindow = this.fakeWindow;
    const FakeWindow = this.FakeWindow;
    const imp = {
      wbg: {}
    };
    imp.wbg.__wbg_call_13410aac570ffff7 = (...a) => this.handleErr((fn, self) => fn.call(self), a);
    imp.wbg.__wbg_getItem_9fc74b31b896f95a = (...a) => this.handleErr((retPtr, storage, keyPtr, keyLen) => {
      const key = this.readStr(keyPtr, keyLen);
      const val = storage.getItem(key);
      const ptr = this.isNull(val) ? 0 : this.passStr(val, this.wasm.__wbindgen_malloc, this.wasm.__wbindgen_realloc);
      const len = this.wasmLen;
      this.getDV().setInt32(retPtr + 4, len, true);
      this.getDV().setInt32(retPtr + 0, ptr, true);
    }, a);
    imp.wbg.__wbg_instanceof_Window_12d20d558ef92592 = v => {
      try {
        return v instanceof FakeWindow;
      } catch {
        return false;
      }
    };
    imp.wbg.__wbg_localStorage_9330af8bf39365ba = (...a) => this.handleErr(v => {
      const ls = v.localStorage;
      return this.isNull(ls) ? 0 : this.addRef(ls);
    }, a);
    imp.wbg.__wbg_location_92d89c32ae076cab = v => v.location;
    imp.wbg.__wbg_log_6c7b5f4f00b8ce3f = () => {};
    imp.wbg.__wbg_newnoargs_254190557c45b4ec = (ptr, len) => new Function(this.readStr(ptr, len));
    imp.wbg.__wbg_origin_00892013881c6e2b = (...a) => this.handleErr((retPtr, v) => {
      const origin = v.origin;
      const ptr = this.passStr(origin, this.wasm.__wbindgen_malloc, this.wasm.__wbindgen_realloc);
      const len = this.wasmLen;
      this.getDV().setInt32(retPtr + 4, len, true);
      this.getDV().setInt32(retPtr + 0, ptr, true);
    }, a);
    imp.wbg.__wbg_static_accessor_GLOBAL_8921f820c2ce3f12 = () => this.addRef(fakeWindow);
    imp.wbg.__wbg_static_accessor_GLOBAL_THIS_f0a4409105898184 = () => this.addRef(fakeWindow);
    imp.wbg.__wbg_static_accessor_SELF_995b214ae681ff99 = () => this.addRef(fakeWindow);
    imp.wbg.__wbg_static_accessor_WINDOW_cde3890479c675ea = () => this.addRef(fakeWindow);
    imp.wbg.__wbg_stringify_b98c93d0a190446a = (...a) => this.handleErr(v => JSON.stringify(v), a);
    imp.wbg.__wbg_wbindgenisnull_f3037694abe4d97a = v => v === null;
    imp.wbg.__wbg_wbindgenisobject_307a53c6bd97fbf8 = v => typeof v === "object" && v !== null;
    imp.wbg.__wbg_wbindgenisstring_d4fa939789f003b0 = v => typeof v === "string";
    imp.wbg.__wbg_wbindgenisundefined_c4b71d073b92f3c5 = v => v === undefined;
    imp.wbg.__wbg_wbindgenstringget_0f16a6ddddef376f = (retPtr, v) => {
      const txt = typeof v === "string" ? v : undefined;
      let ptr = 0,
        len = 0;
      if (!this.isNull(txt)) {
        ptr = this.passStr(txt, this.wasm.__wbindgen_malloc, this.wasm.__wbindgen_realloc);
        len = this.wasmLen;
      }
      this.getDV().setInt32(retPtr + 4, len, true);
      this.getDV().setInt32(retPtr + 0, ptr, true);
    };
    imp.wbg.__wbg_wbindgenthrow_451ec1a8469d7eb6 = (ptr, len) => {
      throw new Error(this.readStr(ptr, len));
    };
    imp.wbg.__wbindgen_cast_2241b6af4c4b2941 = (ptr, len) => this.readStr(ptr, len);
    imp.wbg.__wbindgen_init_externref_table = () => {
      const tbl = this.wasm.__wbindgen_export_2;
      const off = tbl.grow(4);
      tbl.set(0, undefined);
      tbl.set(off + 0, undefined);
      tbl.set(off + 1, null);
      tbl.set(off + 2, true);
      tbl.set(off + 3, false);
    };
    return imp;
  }
  async initWasm() {
    if (this.wasm) return;
    console.log("[initWasm] Loading...");
    try {
      const {
        data
      } = await axios.get(WASM_URL, {
        responseType: "arraybuffer"
      });
      const buf = Buffer.from(data);
      const imp = this.createImports();
      const {
        instance
      } = await WebAssembly.instantiate(buf, imp);
      this.wasm = instance.exports;
      this.wasmU8 = null;
      this.wasmDV = null;
      if (this.wasm.__wbindgen_start) this.wasm.__wbindgen_start();
      console.log("[initWasm] Ready");
    } catch (e) {
      console.error("[initWasm] Error:", e?.message || e);
      throw e;
    }
  }
  getTS() {
    return (BigInt(Date.now()) * 1000000n + BigInt(crypto.randomInt(1e5, 999999))).toString();
  }
  async getSign(body) {
    await this.initWasm();
    const ts = this.getTS();
    const tsPtr = this.passStr(ts, this.wasm.__wbindgen_malloc, this.wasm.__wbindgen_realloc);
    const tsLen = this.wasmLen;
    const res = this.wasm.get_signs(body, tsPtr, tsLen);
    const ptr = res[0];
    const len = res[1];
    const txt = this.readStr(ptr, len);
    this.wasm.__wbindgen_free(ptr, len, 1);
    return JSON.parse(txt);
  }
  async ensureIdentity() {
    if (this.identityId) return;
    console.log("[ensureIdentity] Getting identity...");
    try {
      const body = {};
      const {
        sign,
        timestamp
      } = await this.getSign(body);
      const {
        data
      } = await axios.post(`${this.base}/api2/task/identity_id`, body, {
        headers: this.getHdr(sign, timestamp)
      });
      this.identityId = data?.data?.identity_id || "";
      console.log("[ensureIdentity] Identity:", this.identityId);
    } catch (e) {
      console.error("[ensureIdentity] Error:", e?.message || e);
    }
  }
  async uploadImg(buf) {
    console.log("[uploadImg] ── START ─────────────────────────────────");
    console.log("[uploadImg] Buffer size:", buf?.length ?? 0, "bytes");
    let ext;
    try {
      ext = this.detectExt(buf) || "jpg";
      console.log("[uploadImg] [1/3] Detected ext:", ext);
    } catch (e) {
      console.error("[uploadImg] [1/3] detectExt failed:", e?.message || e);
      throw e;
    }
    let uploadUrl, downloadUrl, s3Key;
    try {
      const hash = crypto.createHash("md5").update(buf).digest("hex");
      s3Key = `pro/${this.uuid}/${hash}_${Date.now()}.${ext}`;
      const val = crypto.createHash("md5").update(s3Key).digest("hex");
      console.log("[uploadImg] [2/3] s3Key:", s3Key);
      const body = {
        key: s3Key,
        value: val
      };
      const {
        sign,
        timestamp
      } = await this.getSign(body);
      console.log("[uploadImg] [2/3] sign:", sign, "| ts:", timestamp);
      const {
        data
      } = await axios.post(`${this.base}/api2/task/query_upload_url`, body, {
        headers: this.getHdr(sign, timestamp)
      });
      console.log("[uploadImg] [2/3] raw response:", JSON.stringify(data));
      uploadUrl = data?.data?.upload_url || "";
      downloadUrl = data?.data?.download_url || "";
      if (!uploadUrl) throw new Error("upload_url missing in response");
      console.log("[uploadImg] [2/3] uploadUrl:", uploadUrl);
      console.log("[uploadImg] [2/3] downloadUrl:", downloadUrl);
    } catch (e) {
      console.error("[uploadImg] [2/3] query_upload_url failed:", e?.response?.data ?? e?.message ?? e);
      throw e;
    }
    try {
      console.log("[uploadImg] [3/3] PUT", buf?.length, "bytes → Content-Type: image/" + ext);
      const putResp = await axios.put(uploadUrl, buf, {
        headers: {
          "Content-Type": `image/${ext}`
        }
      });
      console.log("[uploadImg] [3/3] PUT status:", putResp.status);
    } catch (e) {
      console.error("[uploadImg] [3/3] PUT failed:", e?.response?.status, e?.message || e);
      throw e;
    }
    const result = {
      s3_name: s3Key,
      s3_url: downloadUrl,
      size: buf?.length || 0,
      origin_name: `image_${Date.now()}.${ext}`
    };
    console.log("[uploadImg] ── DONE ──", JSON.stringify(result));
    return result;
  }
  detectExt(buf) {
    if (buf[0] === 255 && buf[1] === 216) return "jpg";
    if (buf[0] === 137 && buf[1] === 80) return "png";
    if (buf[0] === 71 && buf[1] === 73) return "gif";
    return "jpg";
  }
  async checkPerm() {
    console.log("[checkPerm] ── START ────────────────────────────────");
    let perm;
    try {
      console.log("[checkPerm] [1/1] Signing body + POST query_permission...");
      const body = {};
      const {
        sign,
        timestamp
      } = await this.getSign(body);
      console.log("[checkPerm] [1/1] sign:", sign, "| ts:", timestamp);
      const {
        data
      } = await axios.post(`${this.base}/api2/task/query_permission`, body, {
        headers: this.getHdr(sign, timestamp)
      });
      console.log("[checkPerm] [1/1] raw response:", JSON.stringify(data));
      perm = data?.data || {};
      console.log("[checkPerm] [1/1] img quota remaining:", perm.generate_universal_image_total ?? "n/a");
    } catch (e) {
      console.error("[checkPerm] [1/1] query_permission failed:", e?.response?.data ?? e?.message ?? e);
      throw e;
    }
    console.log("[checkPerm] ── DONE ──");
    return perm;
  }
  async createTask(prompt, imgData, opts = {}) {
    console.log("[createTask] ── START ───────────────────────────────");
    console.log("[createTask] prompt:", prompt);
    console.log("[createTask] opts  :", JSON.stringify(opts));
    console.log("[createTask] imgData provided:", !!imgData);
    let taskId, taskType;
    try {
      const params = {
        prompt: prompt,
        file_type: opts.fileType || "png",
        aspectRatio: opts.aspectRatio || "16:9",
        quality: opts.quality || "1K"
      };
      const body = {
        model_id: opts.modelId || 10224,
        operation_info: {
          id: 419,
          operation: "IMAGE_GENERATION"
        },
        object_info: imgData ? [{
          img_info: imgData
        }] : [{
          img_info: {
            s3_name: "",
            s3_url: "",
            size: 0,
            origin_name: ""
          }
        }],
        parameters: JSON.stringify(params)
      };
      console.log("[createTask] [1/1] body:", JSON.stringify(body));
      const {
        sign,
        timestamp
      } = await this.getSign(body);
      console.log("[createTask] [1/1] sign:", sign, "| ts:", timestamp);
      const {
        data
      } = await axios.post(`${this.base}/api2/async/create_generate_image`, body, {
        headers: this.getHdr(sign, timestamp)
      });
      console.log("[createTask] [1/1] raw response:", JSON.stringify(data));
      taskId = data?.data?.taskId || "";
      taskType = data?.data?.task_type || opts.modelId || 10224;
      if (!taskId) throw new Error("taskId missing in response");
      console.log("[createTask] [1/1] taskId:", taskId, "| taskType:", taskType);
    } catch (e) {
      console.error("[createTask] [1/1] create_generate_image failed:", e?.response?.data ?? e?.message ?? e);
      throw e;
    }
    console.log("[createTask] ── DONE ──");
    return {
      taskId: taskId,
      taskType: taskType
    };
  }
  async pollTask(taskId, taskType) {
    try {
      const body = {
        taskId: taskId,
        task_type: taskType
      };
      const {
        sign,
        timestamp
      } = await this.getSign(body);
      const {
        data
      } = await axios.post(`${this.base}/api2/async/query_generate_image`, body, {
        headers: this.getHdr(sign, timestamp)
      });
      const res = data?.data || {};
      console.log("[pollTask] status:", res.status ?? "?", "| msg:", res.msg || "-");
      return res;
    } catch (e) {
      console.error("[pollTask] query_generate_image failed:", e?.response?.data ?? e?.message ?? e);
      throw e;
    }
  }
  async waitTask(taskId, taskType, max = 60, delay = 3e3) {
    console.log("[waitTask] taskId:", taskId, "| taskType:", taskType, "| maxAttempts:", max, "| delay:", delay, "ms");
    for (let i = 0; i < max; i++) {
      let res;
      try {
        console.log(`[waitTask] Poll #${i + 1}/${max}...`);
        res = await this.pollTask(taskId, taskType);
      } catch (e) {
        console.error(`[waitTask] Poll #${i + 1} threw:`, e?.message || e);
        throw e;
      }
      if (res?.status === "SUCCESS" && res?.url) {
        console.log("[waitTask] ── DONE ── url:", res.url);
        return res;
      }
      if (res?.status === "FAILED" || res?.status === "FAILURE") {
        const msg = res?.msg || "Task failed";
        console.error("[waitTask] Task failed:", msg);
        throw new Error(msg);
      }
      console.log(`[waitTask] Not ready yet, sleeping ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
    throw new Error(`[waitTask] Timeout after ${max} polls`);
  }
  async toBuf(input) {
    console.log("[toBuf] type:", typeof input, Buffer.isBuffer(input) ? "(Buffer)" : "");
    if (Buffer.isBuffer(input)) {
      console.log("[toBuf] Already a Buffer, size:", input.length);
      return input;
    }
    if (typeof input === "string") {
      if (input.startsWith("data:")) {
        console.log("[toBuf] Decoding base64 data-URI...");
        return Buffer.from(input.split(",")[1] || "", "base64");
      }
      if (input.startsWith("http")) {
        console.log("[toBuf] Fetching URL:", input);
        try {
          const {
            data
          } = await axios.get(input, {
            responseType: "arraybuffer"
          });
          const buf = Buffer.from(data);
          console.log("[toBuf] Fetched", buf.length, "bytes");
          return buf;
        } catch (e) {
          console.error("[toBuf] HTTP fetch failed:", e?.response?.status, e?.message || e);
          throw e;
        }
      }
      console.log("[toBuf] Decoding plain base64 string...");
      return Buffer.from(input, "base64");
    }
    throw new Error("[toBuf] Unsupported input type: " + typeof input);
  }
  async generate_img({
    prompt,
    image,
    ...opts
  }) {
    const startTime = Date.now();
    console.log("[generate] ── START ─────────────────────────────────");
    console.log("[generate] prompt:", prompt);
    console.log("[generate] image provided:", !!image);
    console.log("[generate] opts:", JSON.stringify(opts));
    try {
      console.log("[generate] [0/5] Ensuring identity...");
      await this.ensureIdentity();
      console.log("[generate] [0/5] identityId:", this.identityId);
    } catch (e) {
      console.error("[generate] [0/5] ensureIdentity failed:", e?.message || e);
      throw e;
    }
    let perm;
    try {
      console.log("[generate] [1/5] Checking permissions...");
      perm = await this.checkPerm();
      console.log("[generate] [1/5] perm:", JSON.stringify(perm));
    } catch (e) {
      console.error("[generate] [1/5] checkPerm failed:", e?.message || e);
      throw e;
    }
    let buf = null;
    if (image) {
      try {
        console.log("[generate] [2/5] Converting image input to Buffer...");
        buf = await this.toBuf(image);
        console.log("[generate] [2/5] Buffer size:", buf.length, "bytes");
      } catch (e) {
        console.error("[generate] [2/5] toBuf failed:", e?.message || e);
        throw e;
      }
    } else {
      console.log("[generate] [2/5] No reference image — text-to-image mode");
    }
    let imgData = null;
    if (buf) {
      try {
        console.log("[generate] [3/5] Uploading reference image...");
        imgData = await this.uploadImg(buf);
        console.log("[generate] [3/5] imgData:", JSON.stringify(imgData));
      } catch (e) {
        console.error("[generate] [3/5] uploadImg failed:", e?.message || e);
        throw e;
      }
    } else {
      console.log("[generate] [3/5] Skipping upload (no image)");
    }
    let taskId, taskType;
    try {
      console.log("[generate] [4/5] Creating task...");
      ({
        taskId,
        taskType
      } = await this.createTask(prompt, imgData, opts));
      console.log("[generate] [4/5] taskId:", taskId, "| taskType:", taskType);
    } catch (e) {
      console.error("[generate] [4/5] createTask failed:", e?.message || e);
      throw e;
    }
    let raw;
    try {
      console.log("[generate] [5/6] Waiting for task completion...");
      raw = await this.waitTask(taskId, taskType);
      console.log("[generate] [5/6] raw result:", JSON.stringify(raw));
    } catch (e) {
      console.error("[generate] [5/6] waitTask failed:", e?.message || e);
      throw e;
    }
    let signedUrl = raw.url || "";
    if (signedUrl) {
      try {
        console.log("[generate] [6/6] Signing result URL...");
        const urlWithFilename = signedUrl.includes("?") ? signedUrl : `${signedUrl}?filename=${signedUrl.split("/").pop()}`;
        signedUrl = await this.signUrl(urlWithFilename);
        console.log("[generate] [6/6] signedUrl:", signedUrl);
      } catch (e) {
        console.warn("[generate] [6/6] signUrl failed (using unsigned url):", e?.message || e);
        signedUrl = raw.url || "";
      }
    } else {
      console.log("[generate] [6/6] No URL to sign");
    }
    const elapsed = Date.now() - startTime;
    const result = {
      ok: true,
      prompt: prompt,
      modelId: opts.modelId || 10224,
      mode: image ? "image-to-image" : "text-to-image",
      taskId: raw.taskId || taskId,
      recordId: raw.recordId ?? null,
      status: raw.status,
      url: raw.url || "",
      signedUrl: signedUrl,
      thumbnailUrl: raw.thumbnail_url || "",
      elapsed: elapsed
    };
    console.log("[generate] ── RESULT ────────────────────────────────");
    console.log("[generate] url       :", result.url);
    console.log("[generate] signedUrl :", result.signedUrl);
    console.log("[generate] elapsed   :", elapsed, "ms");
    return result;
  }
  async signUrl(url) {
    console.log("[signUrl] ── START ──────────────────────────────────");
    console.log("[signUrl] input url:", url);
    let signedUrl;
    try {
      const body = {
        key: url
      };
      console.log("[signUrl] [1/1] body:", JSON.stringify(body));
      const {
        sign,
        timestamp
      } = await this.getSign(body);
      console.log("[signUrl] [1/1] sign:", sign, "| ts:", timestamp);
      const {
        data
      } = await axios.post(`${this.base}/api2/task/url_sign`, body, {
        headers: this.getHdr(sign, timestamp)
      });
      console.log("[signUrl] [1/1] raw response:", JSON.stringify(data));
      signedUrl = data?.data?.url || "";
      if (!signedUrl) throw new Error("signed url missing in response");
      console.log("[signUrl] ── DONE ── signedUrl:", signedUrl);
    } catch (e) {
      console.error("[signUrl] [1/1] url_sign failed:", e?.response?.data ?? e?.message ?? e);
      throw e;
    }
    return signedUrl;
  }
  async models({} = {}) {
    console.log("[models] Fetching model list...");
    try {
      await this.ensureIdentity();
      const body = {};
      const {
        sign,
        timestamp
      } = await this.getSign(body);
      const {
        data
      } = await axios.post(`${this.base}/api2/task/query_config`, body, {
        headers: this.getHdr(sign, timestamp)
      });
      const models = data?.data?.models || [];
      console.log("[models] Found:", models.length);
      return {
        ok: true,
        models: models,
        count: models.length
      };
    } catch (e) {
      console.error("[models] Error:", e?.response?.data || e?.message || e);
      throw e;
    }
  }
  async chat({
    prompt,
    modelId = 3,
    sessionId,
    webSearch = false,
    isThinking = false,
    onChunk
  } = {}) {
    const startTime = Date.now();
    console.log("[chat] ── START ──────────────────────────────────────");
    console.log("[chat] prompt    :", prompt);
    console.log("[chat] modelId   :", modelId);
    console.log("[chat] sessionId :", sessionId ?? "(new)");
    console.log("[chat] webSearch :", webSearch, "| isThinking:", isThinking);
    try {
      console.log("[chat] [0/3] Ensuring identity...");
      await this.ensureIdentity();
      console.log("[chat] [0/3] identityId:", this.identityId);
    } catch (e) {
      console.error("[chat] [0/3] ensureIdentity failed:", e?.message || e);
      throw e;
    }
    if (!sessionId) {
      try {
        console.log("[chat] [1/3] Creating session (model_id:", modelId, ")...");
        const sessionBody = {
          model_id: modelId
        };
        const {
          sign: s1,
          timestamp: t1
        } = await this.getSign(sessionBody);
        console.log("[chat] [1/3] sign obtained:", s1, "| ts:", t1);
        const {
          data: sessionResp
        } = await axios.post(`${this.base}/api2/task/create_pure_session`, sessionBody, {
          headers: this.getHdr(s1, t1)
        });
        console.log("[chat] [1/3] raw response:", JSON.stringify(sessionResp));
        sessionId = sessionResp?.data?.session_id;
        if (!sessionId) throw new Error("session_id missing in response");
        console.log("[chat] [1/3] session_id:", sessionId);
      } catch (e) {
        console.error("[chat] [1/3] create_pure_session failed:", e?.response?.data ?? e?.message ?? e);
        throw e;
      }
    } else {
      console.log("[chat] [1/3] Reusing existing sessionId:", sessionId);
    }
    let streamResponse;
    try {
      console.log("[chat] [2/3] Signing stream body...");
      const streamBody = {
        model_id: modelId,
        session_id: sessionId,
        operation_info: {
          operation: prompt,
          id: 1e4
        },
        parameters: JSON.stringify({
          webSearch: webSearch,
          isThinking: isThinking
        })
      };
      console.log("[chat] [2/3] streamBody:", JSON.stringify(streamBody));
      const {
        sign: s2,
        timestamp: t2
      } = await this.getSign(streamBody);
      console.log("[chat] [2/3] sign:", s2, "| ts:", t2);
      const streamHeaders = {
        ...this.getHdr(s2, t2),
        accept: "text/event-stream, text/event-stream"
      };
      console.log("[chat] [2/3] POST /api2/stream/exec_operation ...");
      streamResponse = await axios.post(`${this.base}/api2/stream/exec_operation`, streamBody, {
        headers: streamHeaders,
        responseType: "stream"
      });
      console.log("[chat] [2/3] HTTP status:", streamResponse.status);
    } catch (e) {
      console.error("[chat] [2/3] exec_operation request failed:", e?.response?.data ?? e?.message ?? e);
      throw e;
    }
    console.log("[chat] [3/3] Reading SSE stream...");
    const result = await new Promise((resolve, reject) => {
      let buffer = "";
      let fullText = "";
      const chunks = [];
      streamResponse.data.on("data", chunk => {
        try {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            let envelope;
            try {
              envelope = JSON.parse(trimmed.slice(5).trim());
            } catch (parseErr) {
              console.warn("[chat] [3/3] JSON parse failed (envelope):", trimmed);
              continue;
            }
            if (envelope.code !== 200) {
              console.warn("[chat] [3/3] Non-200 code in chunk:", envelope.code, envelope.message);
              continue;
            }
            let inner;
            try {
              inner = JSON.parse(envelope.data);
            } catch (parseErr) {
              console.warn("[chat] [3/3] JSON parse failed (inner data):", envelope.data);
              continue;
            }
            const token = inner.answer ?? "";
            if (token) {
              fullText += token;
              chunks.push(token);
              console.log("[chat] [3/3] token:", JSON.stringify(token));
              if (typeof onChunk === "function") {
                try {
                  onChunk(token);
                } catch (cbErr) {
                  console.warn("[chat] [3/3] onChunk callback error:", cbErr?.message || cbErr);
                }
              }
            }
          }
        } catch (dataErr) {
          console.error("[chat] [3/3] data handler error:", dataErr?.message || dataErr);
        }
      });
      streamResponse.data.on("end", () => {
        const elapsed = Date.now() - startTime;
        console.log("[chat] [3/3] Stream ended. tokens:", chunks.length, "| elapsed:", elapsed, "ms");
        console.log("[chat] ── RESULT ─────────────────────────────────────");
        console.log("[chat] fullText:", fullText);
        resolve({
          ok: true,
          modelId: modelId,
          sessionId: sessionId,
          text: fullText,
          chunks: chunks,
          chunkCount: chunks.length,
          elapsed: elapsed
        });
      });
      streamResponse.data.on("error", err => {
        console.error("[chat] [3/3] Stream error:", err?.message || err);
        reject(err);
      });
    });
    return result;
  }
  async generate({
    prompt,
    image,
    modelId = 10041,
    fileType = "png",
    aspectRatio = "Auto",
    quality = "1K",
    ...opts
  } = {}) {
    console.log("[image] ── START ─────────────────────────────────────");
    console.log("[image] prompt      :", prompt);
    console.log("[image] image input :", image ? "(provided)" : "(none — text-to-image)");
    console.log("[image] modelId     :", modelId);
    console.log("[image] fileType    :", fileType, "| aspectRatio:", aspectRatio, "| quality:", quality);
    let result;
    try {
      result = await this.generate_img({
        prompt: prompt,
        image: image,
        modelId: modelId,
        fileType: fileType,
        aspectRatio: aspectRatio,
        quality: quality,
        ...opts
      });
    } catch (e) {
      console.error("[image] generate failed:", e?.message || e);
      throw e;
    }
    console.log("[image] ── RESULT ───────────────────────────────────");
    console.log("[image] ok          :", result.ok);
    console.log("[image] url         :", result.url);
    console.log("[image] thumbnailUrl:", result.thumbnailUrl);
    console.log("[image] elapsed     :", result.elapsed, "ms");
    return result;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["models", "chat", "generate"];
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
  const api = new EasemateAI();
  try {
    let response;
    switch (action) {
      case "models":
        response = await api.models(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
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
        error: "Tidak ada respons dari server AnimeKill. Coba lagi nanti."
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
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}