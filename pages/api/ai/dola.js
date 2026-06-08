import axios from "axios";
import crypto from "crypto";
const BASE_URL = "https://www.dola.com";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36";
class DolaClient {
  constructor() {
    this.cookies = "";
    this.deviceId = null;
    this.webId = null;
    this.botId = null;
    this.convId = null;
    this.http = null;
    this.init = false;
    this.uid = null;
    this.tobid = null;
  }
  _device() {
    return crypto.randomBytes(8).readBigUInt64BE().toString().slice(0, 19);
  }
  _webId() {
    return crypto.randomBytes(8).readBigUInt64BE().toString().slice(0, 19);
  }
  _uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = crypto.randomBytes(1)[0] % 16;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  _msToken() {
    return crypto.randomBytes(16).toString("base64url");
  }
  _aBogus() {
    return crypto.randomBytes(32).toString("base64url");
  }
  _crc32(buffer) {
    const table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
      }
      table[i] = c;
    }
    let crc = -1;
    for (let i = 0; i < buffer.length; i++) {
      crc = crc >>> 8 ^ table[(crc ^ buffer[i]) & 255];
    }
    return ((crc ^ -1) >>> 0).toString(16).padStart(8, "0");
  }
  _sign(opts) {
    const hex = function(str) {
      return crypto.createHash("sha256").update(str).digest("hex");
    };
    const hmac = function(key, str) {
      return crypto.createHmac("sha256", key).update(str).digest();
    };
    const hmacHex = function(key, str) {
      return crypto.createHmac("sha256", key).update(str).digest("hex");
    };
    const qStr = Object.keys(opts.query).sort().map(function(k) {
      return `${encodeURIComponent(k)}=${encodeURIComponent(opts.query[k])}`;
    }).join("&");
    const hStr = Object.keys(opts.headers).sort(function(a, b) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    }).map(function(k) {
      return `${k.toLowerCase()}:${opts.headers[k].trim()}`;
    }).join("\n") + "\n";
    const sHeaders = Object.keys(opts.headers).map(function(k) {
      return k.toLowerCase();
    }).sort().join(";");
    const pHash = opts.method === "POST" ? hex(opts.body || "") : hex("");
    const reqStr = [opts.method, opts.path, qStr, hStr, sHeaders, pHash].join("\n");
    const scope = `${opts.dateStamp}/${opts.region}/${opts.service}/aws4_request`;
    const toSign = ["AWS4-HMAC-SHA256", opts.amzDate, scope, hex(reqStr)].join("\n");
    let k = hmac("AWS4" + opts.secretKey, opts.dateStamp);
    k = hmac(k, opts.region);
    k = hmac(k, opts.service);
    k = hmac(k, "aws4_request");
    return `AWS4-HMAC-SHA256 Credential=${opts.accessKey}/${scope}, SignedHeaders=${sHeaders}, Signature=${hmacHex(k, toSign)}`;
  }
  _axios() {
    const self = this;
    const client = axios.create({
      baseURL: BASE_URL,
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "sec-ch-ua-platform": '"Android"',
        origin: BASE_URL,
        referer: `${BASE_URL}/chat/`,
        "accept-language": "id,ms;q=0.9,en;q=0.8"
      }
    });
    client.interceptors.response.use(function(res) {
      if (res.headers["set-cookie"]) self._saveJar(res.headers);
      return res;
    }, function(err) {
      return Promise.reject(err);
    });
    client.interceptors.request.use(function(cfg) {
      if (self.cookies) cfg.headers["Cookie"] = self.cookies;
      return cfg;
    }, function(err) {
      return Promise.reject(err);
    });
    return client;
  }
  _saveJar(headers) {
    try {
      const setCookie = headers["set-cookie"];
      if (!setCookie) return;
      const map = new Map();
      if (this.cookies) {
        this.cookies.split("; ").forEach(function(c) {
          if (c) map.set(c.split("=")[0], c);
        });
      }
      const items = Array.isArray(setCookie) ? setCookie : [setCookie];
      items.forEach(function(c) {
        const part = c.split(";")[0];
        map.set(part.split("=")[0], part);
      });
      this.cookies = Array.from(map.values()).join("; ");
    } catch (e) {
      console.error("❌ [CookieJar Error]:", e.message);
    }
  }
  _params(extra = {}) {
    this.deviceId = extra.device_id || this.deviceId || this._device();
    this.webId = extra.web_id || this.webId || this._webId();
    return Object.assign({
      version_code: "20800",
      language: "id",
      device_platform: "web",
      aid: "495671",
      real_aid: "495671",
      device_id: this.deviceId,
      web_id: this.webId,
      tea_uuid: this.webId,
      region: "ID",
      samantha_web: "1",
      web_platform: "browser",
      web_tab_id: this._uuid(),
      msToken: this._msToken(),
      a_bogus: this._aBogus()
    }, extra);
  }
  async _anonId() {
    try {
      console.log("🔑 Mendapatkan web_anon_id...");
      const res = await this.http.post("/alice/user/get_web_anon_id", {}, {
        params: this._params()
      });
      if (res.data.code !== 0) throw new Error(`get_web_anon_id server menolak: ${res.data.msg}`);
      this.uid = res.data.uid;
      this.webId = res.data.web_id;
      if (!this.deviceId) this.deviceId = this.webId;
      console.log(`✓ get_web_anon_id: uid=${this.uid}, web_id=${this.webId}`);
      return res.data;
    } catch (e) {
      console.error("❌ [Error AnonID]:", e.message);
      throw e;
    }
  }
  async _tobid() {
    try {
      console.log("🔑 Mendapatkan tobid...");
      const res = await axios.post("https://mcs-sg.ciciai.com/tobid", {
        app_id: 495671,
        user_unique_id: this.uid || this.webId,
        web_id: this.webId
      }, {
        headers: {
          "User-Agent": UA,
          Origin: BASE_URL,
          Referer: BASE_URL + "/"
        }
      });
      if (res.data.e !== 0) throw new Error(`tobid server menolak: ${res.data.e}`);
      this.tobid = res.data.tobid;
      console.log(`✓ tobid: ${this.tobid}`);
      return this.tobid;
    } catch (e) {
      console.warn("⚠️ [Warning Tobid]: Gagal mendapatkan token tracking tobid, lewati.", e.message);
      return null;
    }
  }
  async _setup() {
    try {
      if (this.init && this.http) return true;
      this.http = this._axios();
      console.log("📡 Mengunjungi halaman utama...");
      await this.http.get("/");
      await this._anonId();
      await this._tobid();
      console.log("🚀 Launch request ke server...");
      const launchRes = await this.http.post("/alice/user/launch", {}, {
        params: this._params()
      });
      if (launchRes.data.code !== 0) throw new Error(`Launch gagal: ${launchRes.data.msg}`);
      this.botId = launchRes.data.data.assistant_bot_id;
      console.log("✅ Launch berhasil, bot ID:", this.botId);
      if (!this.convId) {
        console.log("💬 Membuat sesi percakapan baru...");
        const convRes = await this.http.post("/im/conversation/info", {
          cmd: 1110,
          uplink_body: {
            get_conv_info_uplink_body: {
              conversation_id: "",
              ext: {
                cold_start: "true"
              },
              bot_id: this.botId,
              conversation_type: 3,
              option: {
                need_bot_info: true
              }
            }
          },
          sequence_id: this._uuid(),
          channel: 2,
          version: "1"
        }, {
          params: this._params()
        });
        if (convRes.data.status_code !== 0) throw new Error("Gagal buat percakapan: " + convRes.data.status_desc);
        this.convId = convRes.data.downlink_body.get_conv_info_downlink_body.conversation_info.conversation_id;
        console.log("✅ Sesi percakapan dibuat, ID:", this.convId);
      }
      this.init = true;
      return true;
    } catch (e) {
      console.error("❌ [Setup Client Fatal Error]:", e.message);
      throw e;
    }
  }
  async _file(input) {
    try {
      let buffer, ext = ".jpg";
      if (Buffer.isBuffer(input)) {
        buffer = input;
      } else if (typeof input === "string") {
        if (input.startsWith("http")) {
          console.log("🌐 Mengunduh lampiran gambar dari URL...");
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(res.data);
          const ct = res.headers["content-type"];
          if (ct?.includes("png")) ext = ".png";
          else if (ct?.includes("gif")) ext = ".gif";
          else if (ct?.includes("webp")) ext = ".webp";
        } else if (input.startsWith("data:")) {
          console.log("📦 Parsing lampiran gambar berbasis Data URL...");
          const match = input.match(/^data:image\/([^;]+);base64,(.+)$/);
          if (!match) throw new Error("Format skema Data URL rusak");
          ext = `.${match[1]}`;
          buffer = Buffer.from(match[2], "base64");
        } else {
          console.log("📦 Mengonversi string Base64 ke buffer biner...");
          buffer = Buffer.from(input, "base64");
        }
      } else {
        throw new Error("Format masukan file tidak didukung (Gunakan URL, Base64 String, atau Buffer)");
      }
      return {
        buffer: buffer,
        ext: ext
      };
    } catch (e) {
      console.error("❌ [Error Resolve File]:", e.message);
      throw e;
    }
  }
  async _upload(fileInput) {
    try {
      const fileData = await this._file(fileInput);
      const buffer = fileData.buffer;
      const ext = fileData.ext;
      const crc = this._crc32(buffer);
      const name = `${this._uuid()}${ext}`;
      console.log("📦 Menyiapkan alokasi penyimpanan awan (PrepareUpload)...");
      const prep = await this.http.post("/alice/resource/prepare_upload", {
        tenant_id: "5",
        scene_id: "4",
        resource_type: 2
      }, {
        params: this._params()
      });
      if (prep.data.code !== 0) throw new Error("Prepare upload ditolak oleh server");
      const tok = prep.data.data.upload_auth_token;
      const uploadHost = prep.data.data.upload_host;
      const serviceId = prep.data.data.service_id;
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
      const dStamp = amzDate.substr(0, 8);
      console.log("🔄 Menerapkan otentikasi lisensi unggah (ApplyImageUpload)...");
      const aQuery = {
        Action: "ApplyImageUpload",
        Version: "2018-08-01",
        ServiceId: serviceId,
        FileSize: buffer.length.toString(),
        FileExtension: ext,
        s: Math.random().toString(36).substr(2, 10)
      };
      const aHeaders = {
        "x-amz-date": amzDate,
        "x-amz-security-token": tok.session_token
      };
      aHeaders["Authorization"] = this._sign({
        method: "GET",
        path: "/",
        query: aQuery,
        headers: aHeaders,
        accessKey: tok.access_key,
        secretKey: tok.secret_key,
        service: "imagex",
        region: "us-east-1",
        amzDate: amzDate,
        dateStamp: dStamp
      });
      const aRes = await axios.get(`https://${uploadHost}/`, {
        params: aQuery,
        headers: Object.assign({
          Origin: BASE_URL,
          Referer: BASE_URL + "/"
        }, aHeaders)
      });
      const aData = typeof aRes.data === "string" ? JSON.parse(aRes.data) : aRes.data;
      const info = aData.Result?.UploadAddress?.StoreInfos?.[0];
      const host = aData.Result?.UploadAddress?.UploadHosts?.[0];
      if (!info || !host) {
        console.error("❌ Dump Tanggapan Kegagalan Apply:", JSON.stringify(aData));
        throw new Error("Gagal memproses parameter target penyimpanan TOS Volcengine");
      }
      console.log("📤 Mentransfer biner data langsung ke server bucket TOS...");
      await axios.put(`https://${host}/${info.StoreUri}`, buffer, {
        headers: {
          Authorization: info.Auth,
          "Content-Type": "application/octet-stream",
          "Content-CRC32": crc,
          "Content-Disposition": `attachment; filename="${name}"`
        }
      });
      console.log("📌 Memvalidasi dan melakukan komit data gambar (CommitImageUpload)...");
      const cQuery = {
        Action: "CommitImageUpload",
        Version: "2018-08-01",
        ServiceId: serviceId
      };
      const cBody = JSON.stringify({
        SessionKey: aData.Result.UploadAddress.SessionKey,
        SuccessOids: [info.StoreUri]
      });
      const cHeaders = {
        "x-amz-date": amzDate,
        "x-amz-security-token": tok.session_token,
        "x-amz-content-sha256": crypto.createHash("sha256").update(cBody).digest("hex"),
        "Content-Type": "application/json"
      };
      cHeaders["Authorization"] = this._sign({
        method: "POST",
        path: "/",
        query: cQuery,
        headers: cHeaders,
        body: cBody,
        accessKey: tok.access_key,
        secretKey: tok.secret_key,
        service: "imagex",
        region: "us-east-1",
        amzDate: amzDate,
        dateStamp: dStamp
      });
      const cRes = await axios.post(`https://${uploadHost}/`, cBody, {
        params: cQuery,
        headers: Object.assign({
          Origin: BASE_URL,
          Referer: BASE_URL + "/"
        }, cHeaders)
      });
      const cData = typeof cRes.data === "string" ? JSON.parse(cRes.data) : cRes.data;
      const final = cData.Result?.PluginResult?.[0];
      if (!final) throw new Error("Proses konfirmasi komit ditolak oleh infrastruktur pemroses gambar");
      console.log("✅ File lampiran sukses terpasang:", final.ImageUri);
      return {
        uri: final.ImageUri,
        name: final.FileName || name,
        width: final.ImageWidth || 800,
        height: final.ImageHeight || 600
      };
    } catch (e) {
      console.error("❌ [Error Upload File Execution]:", e.message);
      throw e;
    }
  }
  _buildPayload(prompt, attachment, extra) {
    const content_block = [];
    if (attachment) {
      content_block.push({
        block_type: 10052,
        content: {
          attachment_block: {
            attachments: [{
              type: 1,
              identifier: this._uuid(),
              image: {
                name: attachment.name,
                uri: attachment.uri,
                image_ori: {
                  url: "",
                  width: attachment.width,
                  height: attachment.height,
                  format: "",
                  url_formats: {}
                }
              },
              parse_state: 0,
              review_state: 1,
              upload_status: 1,
              progress: 100,
              src: ""
            }]
          },
          pc_event_block: ""
        },
        block_id: this._uuid(),
        parent_id: "",
        meta_info: [],
        append_fields: []
      });
    }
    content_block.push({
      block_type: 1e4,
      content: {
        text_block: {
          text: prompt,
          icon_url: "",
          icon_url_dark: "",
          summary: ""
        },
        pc_event_block: ""
      },
      block_id: this._uuid(),
      parent_id: "",
      meta_info: [],
      append_fields: []
    });
    const conversation_id = extra.conversation_id || this.convId;
    const bot_id = extra.bot_id || this.botId;
    const last_section_id = extra.last_section_id || "";
    const last_message_index = extra.last_message_index !== undefined ? extra.last_message_index : 0;
    const payload = {
      client_meta: {
        conversation_id: conversation_id,
        bot_id: bot_id,
        last_section_id: last_section_id,
        last_message_index: last_message_index
      },
      messages: [{
        local_message_id: this._uuid(),
        content_block: content_block,
        message_status: 0
      }],
      option: {
        send_message_scene: "",
        create_time_ms: Date.now(),
        collect_id: "",
        is_audio: false,
        answer_with_suggest: false,
        tts_switch: false,
        need_deep_think: 0,
        click_clear_context: false,
        from_suggest: false,
        is_regen: false,
        is_replace: false,
        is_from_click_option: false,
        disable_sse_cache: false,
        select_text_action: "",
        is_select_text: false,
        resend_for_regen: false,
        scene_type: 0,
        unique_key: this._uuid(),
        start_seq: 0,
        need_create_conversation: false,
        regen_query_id: [],
        edit_query_id: [],
        regen_instruction: "",
        no_replace_for_regen: false,
        message_from: 0,
        shared_app_name: "",
        shared_app_id: "",
        sse_recv_event_options: {
          support_chunk_delta: true
        },
        is_ai_playground: false,
        is_old_user: false,
        recovery_option: {
          is_recovery: false,
          req_create_time_sec: Math.floor(Date.now() / 1e3),
          append_sse_event_scene: 0
        },
        message_storage_type: 0
      },
      ext: {
        fp: `verify_${this._uuid()}`,
        collection_id: extra.collection_id || "",
        commerce_credit_config_enable: extra.commerce_credit_config_enable || "0"
      }
    };
    if (extra.option_overrides) Object.assign(payload.option, extra.option_overrides);
    if (extra.ext_overrides) Object.assign(payload.ext, extra.ext_overrides);
    return payload;
  }
  async _send(prompt, attachment, extra = {}) {
    try {
      if (!this.init) await this._setup();
      if (extra.conversation_id) this.convId = extra.conversation_id;
      const payload = this._buildPayload(prompt, attachment, extra);
      console.log("📨 Membuka koneksi stream data ke /chat/completion...");
      const res = await this.http.post("/chat/completion", payload, {
        params: this._params({
          fp: payload.ext.fp
        }),
        responseType: "stream",
        headers: {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache"
        }
      });
      const self = this;
      return new Promise(function(resolve, reject) {
        let text = "",
          buf = "",
          ev = "",
          hasData = false;
        const timeout = setTimeout(function() {
          if (!hasData) reject(new Error("Batas waktu tunggu server (30 detik) terpenuhi. Tidak ada respon."));
        }, 3e4);
        res.data.on("data", function(chunk) {
          clearTimeout(timeout);
          hasData = true;
          buf += chunk.toString();
          const lines = buf.split("\n");
          buf = lines.pop();
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              ev = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const str = line.slice(6).trim();
              if (!str) continue;
              try {
                const data = JSON.parse(str);
                if (ev === "STREAM_MSG_NOTIFY" || ev === "STREAM_CHUNK") {
                  let add = "";
                  if (data.content?.content_block) {
                    data.content.content_block.forEach(function(b) {
                      if (b.block_type === 1e4 && b.content?.text_block?.text) add += b.content.text_block.text;
                    });
                  }
                  if (data.patch_op) {
                    data.patch_op.forEach(function(p) {
                      if (p.patch_object === 1 && p.patch_value?.content_block) {
                        p.patch_value.content_block.forEach(function(b) {
                          if (b.block_type === 1e4 && b.content?.text_block?.text) add += b.content.text_block.text;
                        });
                      }
                    });
                  }
                  if (add) {
                    text += add;
                    process.stdout.write(add);
                  }
                } else if (ev === "SSE_REPLY_END" && data.end_type === 1) {
                  resolve({
                    text: text
                  });
                }
              } catch (errJson) {}
            } else if (line === "") {
              ev = "";
            }
          }
        });
        res.data.on("end", function() {
          clearTimeout(timeout);
          resolve({
            text: text
          });
        });
        res.data.on("error", function(eStream) {
          clearTimeout(timeout);
          reject(eStream);
        });
      });
    } catch (e) {
      console.error("❌ [Error Chat Stream Processing]:", e.message);
      throw e;
    }
  }
  loadState(b64) {
    try {
      const state = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      Object.assign(this, state);
      this.initialized = !!this.cookies && !!this.botId;
      if (this.initialized) this.http = this._axios();
      return true;
    } catch (e) {
      console.error("❌ [Error Load State]:", e.message);
      return false;
    }
  }
  saveState() {
    try {
      return Buffer.from(JSON.stringify({
        cookies: this.cookies,
        deviceId: this.deviceId,
        webId: this.webId,
        botId: this.botId,
        convId: this.convId,
        uid: this.uid,
        tobid: this.tobid
      })).toString("base64");
    } catch (e) {
      console.error("❌ [Error Save State]:", e.message);
      return "";
    }
  }
  async chat({
    state,
    prompt,
    ...rest
  }) {
    try {
      if (state) this.loadState(state);
      if (rest.conv_id !== undefined) this.convId = rest.conv_id;
      if (!this.init) await this._setup();
      let attachment = null;
      if (rest.file) {
        attachment = await this._upload(rest.file);
      }
      const extra = {
        conversation_id: rest.conv_id || this.convId,
        bot_id: rest.bot_id || this.botId,
        last_section_id: rest.last_section_id,
        last_message_index: rest.last_message_index,
        collection_id: rest.collection_id,
        commerce_credit_config_enable: rest.commerce_credit_config_enable,
        option_overrides: rest.option_overrides,
        ext_overrides: rest.ext_overrides
      };
      const resData = await this._send(prompt, attachment, extra);
      return {
        result: resData.text,
        state: this.saveState(),
        conv_id: this.convId
      };
    } catch (e) {
      console.error("❌ [Error Main Chat Method]:", e.message);
      return {
        result: `Error: ${e.message}`,
        state: this.saveState(),
        conv_id: this.convId
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
  const api = new DolaClient();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}