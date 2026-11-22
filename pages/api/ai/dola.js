import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import axios from "axios";
import crypto from "crypto";

class DolaClient {
  constructor() {
    this.APP_ID = 489823;
    this.APP_NAME = "nova_ai";
    this.PACKAGE_NAME = "com.larus.wolf";
    this.VERSION_NAME = "15.9.0";
    this.VERSION_CODE = 15090030;
    this.USER_AGENT = "com.larus.wolf/15090030 (Linux; U; Android 14; en_US; Pixel 7; Build/UQ1A.240205.004)";
    this.API_BASE = "https://api-normal-i18n.dola.com";
    this.DEVICE_REGISTER_URL = "https://ichannel-i18n.ciciai.com/service/2/device_register/";
    this.DEFAULT_BOT_ID = "7241547611541340167";
    this.REQUEST_TIMEOUT = 180000;
    this.LIMIT_CODES = new Set([710022021, 710022020, 710022013, 710012001]);
    this.VALID_MODES = ["chat"];

    this.device = null;
    this.botId = null;
    this.secUserId = null;
    this.tourAbParam = null;
    this.conversation = null;
    this.replies = 0;
    this.init = false;
  }

  log(label, msg) {
    console.log("[" + label + "] " + msg);
  }

  warn(label, msg) {
    console.warn("⚠️  [" + label + "] " + msg);
  }

  err(label, e) {
    console.error("❌ [" + label + "]", e && e.message ? e.message : e);
  }

  errRes(message, extra) {
    extra = extra || {};
    return Object.assign({
      ok: false,
      error: message,
      result: null
    }, extra);
  }

  okRes(data) {
    return Object.assign({
      ok: true
    }, data);
  }

  randHex(len) {
    return crypto.randomBytes(len).toString("hex");
  }

  makeId(tag) {
    return `${tag}-${Date.now()}-${this.randHex(4)}`;
  }

  makeErr(msg, code, data) {
    const err = new Error(msg);
    if (code !== undefined) err.code = code;
    if (data !== undefined) err.data = data;
    return err;
  }

  isDeviceValid(dev) {
    return Boolean(
      dev &&
      /^\d+$/.test(String(dev.device_id || "")) &&
      /^\d+$/.test(String(dev.install_id || "")) &&
      dev.ssid
    );
  }

  extractBigId(raw, data, key) {
    const strVal = data?.[`${key}_str`];
    if (strVal && /^\d+$/.test(String(strVal))) return String(strVal);
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*(\\d+)`));
    if (m) return m[1];
    if (data?.[key] !== undefined && /^\d+$/.test(String(data[key]))) return String(data[key]);
    return null;
  }

  unwrapText(raw) {
    if (typeof raw !== "string") return "";
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.text === "string") return parsed.text;
      if (typeof parsed.content === "string") return parsed.content;
    } catch {}
    return raw;
  }

  async reqJson(url, opts = {}, timeout = this.REQUEST_TIMEOUT) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeout);
    try {
      const res = await axios({
        url,
        method: opts.method || "GET",
        headers: opts.headers || {},
        data: opts.body,
        signal: ac.signal,
        transformResponse: [(d) => d],
        validateStatus: () => true
      });
      const raw = typeof res.data === "string" ? res.data : JSON.stringify(res.data || "");
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch {}
      if (res.status < 200 || res.status >= 300) {
        throw this.makeErr(`HTTP ${res.status}: ${raw.slice(0, 300)}`, res.status, data || raw);
      }
      if (!data) {
        throw this.makeErr("Invalid JSON response", res.status, raw);
      }
      return { status: res.status, data, raw };
    } catch (err) {
      if (ac.signal.aborted || err.name === "AbortError" || err.name === "CanceledError") {
        throw this.makeErr(`Request timeout (${timeout}ms)`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  buildQuery(dev) {
    return new URLSearchParams({
      aid: String(this.APP_ID),
      app_name: this.APP_NAME,
      version_code: String(this.VERSION_CODE),
      version_name: this.VERSION_NAME,
      manifest_version_code: String(this.VERSION_CODE),
      update_version_code: String(this.VERSION_CODE),
      device_platform: "android",
      os: "android",
      os_version: "14",
      os_api: "34",
      device_type: "Pixel 7",
      device_brand: "google",
      channel: "googleplay",
      region: "ID",
      language: "id",
      device_id: String(dev.device_id),
      install_id: String(dev.install_id),
      iid: String(dev.install_id),
      ssid: String(dev.ssid)
    }).toString().replace(/\+/g, "%20");
  }

  buildHeaders(isStream) {
    const h = {
      "Content-Type": isStream ? "application/json; encoding=utf-8" : "application/json",
      "User-Agent": this.USER_AGENT,
      "x-tt-appid": String(this.APP_ID),
      "x-tt-app-name": this.APP_NAME
    };
    if (isStream) h.Accept = "text/event-stream";
    return h;
  }

  async registerDevice() {
    this.log("registerDevice", "Mendaftarkan perangkat baru...");
    const openudid = this.randHex(16);
    const clientudid = crypto.randomUUID();
    const cdid = crypto.randomUUID();

    const payload = {
      header: {
        aid: this.APP_ID,
        app_name: this.APP_NAME,
        package: this.PACKAGE_NAME,
        app_version: this.VERSION_NAME,
        app_version_minor: "",
        version_code: this.VERSION_CODE,
        update_version_code: this.VERSION_CODE,
        manifest_version_code: this.VERSION_CODE,
        device_platform: "android",
        os: "android",
        os_version: "14",
        os_api: "34",
        device_type: "Pixel 7",
        device_brand: "google",
        device_model: "Pixel 7",
        device_manufacturer: "Google",
        channel: "googleplay",
        tweaked_channel: "",
        resolution: "1080x2400",
        dpi: 420,
        language: "id",
        region: "ID",
        app_language: "id",
        app_region: "ID",
        timezone: 7,
        access: "wifi",
        carrier: "",
        sim_region: "",
        device_category: "phone",
        openudid,
        clientudid,
        cdid,
        sig_hash: "",
        sdk_version: "4.1.0",
        sdk_target_version: 29,
        guest_mode: 1,
        is_guest: 1,
        not_request_sender: 1,
        release_build: "",
        user_agent: this.USER_AGENT,
        google_aid: "",
        gaid_limited: 0,
        custom: { real_package_name: this.PACKAGE_NAME }
      },
      magic_tag: "ss_app_log",
      _gen_time: Date.now()
    };

    const { data, raw } = await this.reqJson(this.DEVICE_REGISTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": this.USER_AGENT,
        "x-tt-request-tag": "t=0;n=0"
      },
      body: JSON.stringify(payload)
    });

    const deviceId = this.extractBigId(raw, data, "device_id");
    const installId = this.extractBigId(raw, data, "install_id");
    if (!deviceId || !installId || !data?.ssid) {
      throw this.makeErr("Gagal register device", data?.code, data);
    }

    const dev = {
      device_id: deviceId,
      install_id: installId,
      ssid: String(data.ssid),
      openudid,
      clientudid,
      cdid,
      created_at: Date.now()
    };
    this.log("registerDevice", `✓ device_id=${dev.device_id} install_id=${dev.install_id}`);
    return dev;
  }

  async fetchCore(dev) {
    const url = `${this.API_BASE}/alice/user/launch/core?${this.buildQuery(dev)}&source=local_main&has_cache=0`;
    const { data } = await this.reqJson(url, {
      method: "POST",
      headers: this.buildHeaders(false),
      body: JSON.stringify({
        is_first_cold_start: true,
        is_first_install_cold_start: true,
        cold_start_timestamp_ms: Date.now()
      })
    });
    if (!data || Number(data.code) !== 0 || !data.data) {
      throw this.makeErr(data?.msg || "Core launch gagal", data?.code, data);
    }
    return data.data;
  }

  async ensureDevice(opts = {}) {
    const force = Boolean(opts.force);
    if (!force && this.isDeviceValid(this.device)) {
      if (!this.botId) this.botId = this.DEFAULT_BOT_ID;
      this.init = true;
      return this.device;
    }

    this.log("ensureDevice", force ? "Rotasi & registrasi perangkat baru..." : "Registrasi perangkat...");
    this.device = await this.registerDevice();
    this.botId = null;
    this.secUserId = null;
    this.tourAbParam = null;
    this.conversation = null;
    this.replies = 0;

    try {
      const core = await this.fetchCore(this.device);
      this.botId = core.assistant_bot_id || null;
      this.secUserId = core.sec_user_id || null;
      this.tourAbParam = core.tour_ab_param || null;
      this.log("ensureDevice", `✓ Core launch berhasil, botId=${this.botId}`);
    } catch (err) {
      this.warn("ensureDevice", `Core warning: ${err.message}`);
    }

    if (!this.botId) this.botId = this.DEFAULT_BOT_ID;
    this.init = true;
    return this.device;
  }

  startNewConversation() {
    this.conversation = null;
  }

  createSseReader(onEvent) {
    let buf = "";
    const state = { done: false };

    function handleBlock(block) {
      let ev = "message";
      const lines = [];
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith("event:")) ev = line.slice(6).trim();
        else if (line.startsWith("data:")) lines.push(line.slice(5).trim());
      }
      if (ev === "done") {
        state.done = true;
        return;
      }
      if (lines.length) onEvent(ev, lines.join("\n"));
    }

    return {
      state,
      push(chunk) {
        buf += chunk;
        while (!state.done) {
          const m = buf.match(/\r?\n\r?\n/);
          if (!m || m.index === undefined) break;
          const block = buf.slice(0, m.index);
          buf = buf.slice(m.index + m[0].length);
          handleBlock(block);
        }
      },
      end() {
        if (buf.trim()) handleBlock(buf);
        buf = "";
      }
    };
  }

  async sendOnce(prompt, opts = {}) {
    const dev = this.device;
    if (!this.isDeviceValid(dev)) throw this.makeErr("Device belum siap");

    const locMsgId = this.makeId("loc");
    const locConvId = this.conversation?.local_id || this.makeId("lcid");
    const botId = String(opts.bot_id || this.botId || this.DEFAULT_BOT_ID);
    const convIdInput = opts.conv_id
      ? String(opts.conv_id)
      : (this.conversation?.id ? String(this.conversation.id) : "");

    const payload = {
      cmd: 100,
      sequence_id: locMsgId,
      uplink_body: {
        send_message_body: {
          conversation_id: convIdInput,
          conversation_type: 3,
          sender_id: "0",
          content_type: 1,
          content: prompt,
          local_message_id: locMsgId,
          local_conversation_id: locConvId,
          bot_id: botId,
          bot_type: 0,
          status: 0,
          create_time: Math.floor(Date.now() / 1000)
        }
      },
      channel: 3,
      version: "1"
    };

    const streamOut = Boolean(opts.stream);
    const timeout = Number(opts.timeout) || this.REQUEST_TIMEOUT;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeout);
    const url = `${this.API_BASE}/im/sse/send/message?flow_im_arch=v2&${this.buildQuery(dev)}`;

    this.log("sendOnce", `Membuka stream /im/sse/send/message (conv=${convIdInput || "new"})...`);

    let res;
    try {
      res = await axios.post(url, payload, {
        headers: this.buildHeaders(true),
        responseType: "stream",
        signal: ac.signal,
        validateStatus: () => true
      });
    } catch (err) {
      clearTimeout(timer);
      if (ac.signal.aborted || err.name === "AbortError" || err.name === "CanceledError") {
        throw this.makeErr(`Request timeout (${timeout}ms)`);
      }
      throw err;
    }

    if (res.status < 200 || res.status >= 300) {
      let raw = "";
      try {
        for await (const chunk of res.data) {
          raw += chunk.toString();
        }
      } catch {}
      clearTimeout(timer);
      throw this.makeErr(`HTTP ${res.status}: ${raw.slice(0, 300)}`, res.status, raw);
    }

    let text = "";
    let replyMsgId = null;
    let ack = null;
    let streamErr = null;
    let nextSeq = null;
    const pending = new Map();

    const writeOut = (val) => {
      if (!val) return;
      text += val;
      if (streamOut) process.stdout.write(val);
    };

    const flush = (all = false) => {
      if (nextSeq === null && pending.size) nextSeq = Math.min(...pending.keys());
      while (nextSeq !== null && pending.has(nextSeq)) {
        writeOut(pending.get(nextSeq));
        pending.delete(nextSeq);
        nextSeq += 1;
      }
      if (all && pending.size) {
        for (const k of [...pending.keys()].sort((a, b) => a - b)) {
          writeOut(pending.get(k));
        }
        pending.clear();
      }
    };

    const sse = this.createSseReader((ev, raw) => {
      if (ev !== "json" || streamErr) return;
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      const cmd = Number(msg.cmd);
      if (cmd === 100) {
        const a = msg.downlink_body?.send_message_ack_downlink_body;
        if (a) {
          ack = {
            conversation_id: a.conversation_id || null,
            message_id: a.message_id || null,
            last_section_id: a.last_section_id || null,
            message_index: a.message_index ?? null,
            local_message_id: a.local_message_id || null
          };
        }
        if (msg.status_code && Number(msg.status_code) !== 0) {
          streamErr = this.makeErr(msg.status_desc || `Dola error ${msg.status_code}`, msg.status_code, msg);
        }
      } else if (cmd === 200) {
        const item = msg.downlink_body?.new_message_notify?.message;
        if (item && Number(item.user_type) === 2 && Number(item.content_type) === 1) {
          replyMsgId = item.message_id || replyMsgId;
          writeOut(this.unwrapText(item.content));
        }
      } else if (cmd === 300) {
        const chunk = msg.downlink_body?.fetch_chunk_message_downlink_body;
        if (chunk) {
          replyMsgId = chunk.message_id || replyMsgId;
          const val = this.unwrapText(chunk.content);
          const seq = Number(chunk.seq_no);
          if (Number.isFinite(seq)) {
            if (nextSeq !== null && seq < nextSeq) return;
            pending.set(seq, val);
            flush();
          } else {
            writeOut(val);
          }
        }
      } else if (cmd === 50400) {
        const end = msg.downlink_body?.reply_end_downlink_body;
        if (end?.message_id) replyMsgId = end.message_id;
      }
    });

    try {
      if (!res.data) throw this.makeErr("Empty response body");
      const dec = new TextDecoder();
      for await (const chunk of res.data) {
        if (sse.state.done || streamErr) break;
        sse.push(dec.decode(chunk, { stream: true }));
      }
      if (!streamErr) {
        sse.push(dec.decode());
        sse.end();
        flush(true);
      }
      try {
        if (typeof res.data.destroy === "function") res.data.destroy();
      } catch {}
    } catch (err) {
      if (ac.signal.aborted || err.name === "AbortError" || err.name === "CanceledError") {
        throw this.makeErr(`Request timeout (${timeout}ms)`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    if (streamErr) {
      streamErr.partial = Boolean(text);
      throw streamErr;
    }
    if (!text.trim()) throw this.makeErr("Empty reply from Dola");

    const convId = ack?.conversation_id || convIdInput || this.conversation?.id || null;
    if (convId) {
      this.conversation = {
        id: String(convId),
        local_id: locConvId,
        last_section_id: ack?.last_section_id
          ? String(ack.last_section_id)
          : this.conversation?.last_section_id || null,
        message_index: ack?.message_index ?? this.conversation?.message_index ?? null,
        updated_at: Date.now()
      };
    }

    this.replies = (Number(this.replies) || 0) + 1;
    this.log("sendOnce", `✅ Stream selesai — teks=${text.length}c convId=${convId || "-"}`);

    return {
      text,
      conversation_id: convId ? String(convId) : null,
      message_id: replyMsgId,
      bot_id: botId,
      device_id: String(dev.device_id),
      replies: this.replies
    };
  }

  async sendPrompt(prompt, opts = {}) {
    await this.ensureDevice({ force: Boolean(opts.new_device) });
    let retried = false;
    while (true) {
      try {
        return await this.sendOnce(prompt, opts);
      } catch (err) {
        if (!retried && opts.autoReset !== false && !err.partial && this.LIMIT_CODES.has(Number(err.code))) {
          this.warn("sendPrompt", `Limit (${err.code}), rotating device...`);
          await this.ensureDevice({ force: true });
          retried = true;
          continue;
        }
        throw err;
      }
    }
  }

  loadState(b64) {
    try {
      const state = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      if (!state || typeof state !== "object") return false;
      this.device = state.device && typeof state.device === "object" ? state.device : null;
      this.botId = state.botId || null;
      this.secUserId = state.secUserId || null;
      this.tourAbParam = state.tourAbParam || null;
      this.conversation = state.conversation && typeof state.conversation === "object" ? state.conversation : null;
      this.replies = Number(state.replies) || 0;
      this.init = this.isDeviceValid(this.device);
      this.log("loadState", `✓ State dimuat (init=${this.init})`);
      return true;
    } catch (e) {
      this.err("loadState", e);
      return false;
    }
  }

  saveState() {
    try {
      return Buffer.from(JSON.stringify({
        device: this.device,
        botId: this.botId,
        secUserId: this.secUserId,
        tourAbParam: this.tourAbParam,
        conversation: this.conversation,
        replies: this.replies
      })).toString("base64");
    } catch (e) {
      this.err("saveState", e);
      return "";
    }
  }

  async generate({
    mode = "chat",
    prompt,
    state,
    ...rest
  } = {}) {
    mode = mode !== undefined ? mode : "chat";
    const self = this;

    function stateSnapshot() {
      return {
        state: self.saveState(),
        conv_id: self.conversation?.id || ""
      };
    }

    if (prompt === undefined || prompt === null) {
      return this.errRes("Parameter 'prompt' wajib disertakan", stateSnapshot());
    }
    if (typeof prompt !== "string") {
      return this.errRes("Parameter 'prompt' harus berupa string, diterima: " + typeof prompt, stateSnapshot());
    }
    if (prompt.trim().length === 0) {
      return this.errRes("Parameter 'prompt' tidak boleh kosong atau hanya spasi", stateSnapshot());
    }
    if (this.VALID_MODES.indexOf(mode) === -1) {
      return this.errRes(
        "Mode '" + mode + "' tidak valid. Mode yang tersedia: " + this.VALID_MODES.map((m) => "'" + m + "'").join(", "),
        stateSnapshot()
      );
    }

    try {
      this.log("generate", `Memulai (mode=${mode} prompt="${prompt.slice(0, 60)}")`);

      if (state) {
        this.log("generate", "Memuat state sebelumnya...");
        this.loadState(state);
      }

      const newDevice = rest.new_device === true || rest.new_device === "true" || rest.reset_device === true || rest.reset_device === "true";
      const newConv = rest.new_conv === true || rest.new_conv === "true" || rest.new === true || rest.new === "true";
      const autoReset = rest.auto_reset !== false && rest.auto_reset !== "false";
      const stream = rest.stream === true || rest.stream === "true";
      const timeout = rest.timeout ? Number(rest.timeout) : this.REQUEST_TIMEOUT;

      if (newConv) {
        this.startNewConversation();
      } else if (rest.conv_id !== undefined && rest.conv_id !== "") {
        this.conversation = {
          ...(this.conversation || {}),
          id: String(rest.conv_id),
          local_id: this.conversation?.local_id || this.makeId("lcid")
        };
      }

      const res = await this.sendPrompt(prompt, {
        new_device: newDevice,
        conv_id: !newConv && rest.conv_id ? String(rest.conv_id) : undefined,
        bot_id: rest.bot_id ? String(rest.bot_id) : undefined,
        autoReset,
        stream,
        timeout: Number.isFinite(timeout) && timeout > 0 ? timeout : this.REQUEST_TIMEOUT
      });

      const response = this.okRes({
        result: res.text,
        conversation_id: res.conversation_id,
        conv_id: res.conversation_id || "",
        message_id: res.message_id,
        bot_id: res.bot_id,
        device_id: res.device_id,
        replies: res.replies,
        state: this.saveState()
      });

      this.log("generate", `✅ Selesai (result=${res.text.length}c)`);
      return response;
    } catch (e) {
      this.err("generate", e);
      return this.errRes(e.message, stateSnapshot());
    }
  }
}

async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new DolaClient();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}

export default withApiLog(withRateLimit(handler));