import axios from "axios";
import crypto from "crypto";
class DolaClient {
  constructor() {
    this.BASE_URL = "https://www.dola.com";
    this.UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36";
    this.VALID_MODES = ["chat", "image"];
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
  device() {
    return crypto.randomBytes(8).readBigUInt64BE().toString().slice(0, 19);
  }
  webIdGen() {
    return crypto.randomBytes(8).readBigUInt64BE().toString().slice(0, 19);
  }
  uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = crypto.randomBytes(1)[0] % 16;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
  msToken() {
    return crypto.randomBytes(16).toString("base64url");
  }
  aBogus() {
    return crypto.randomBytes(32).toString("base64url");
  }
  crc32(buffer) {
    try {
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
    } catch (e) {
      this.err("crc32", e);
      return "00000000";
    }
  }
  sign(opts) {
    try {
      function hex(s) {
        return crypto.createHash("sha256").update(s).digest("hex");
      }

      function hmac(k, s) {
        return crypto.createHmac("sha256", k).update(s).digest();
      }

      function hmacHex(k, s) {
        return crypto.createHmac("sha256", k).update(s).digest("hex");
      }
      const qStr = Object.keys(opts.query).sort().map(function(k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(opts.query[k]);
      }).join("&");
      const hStr = Object.keys(opts.headers).sort(function(a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
      }).map(function(k) {
        return k.toLowerCase() + ":" + opts.headers[k].trim();
      }).join("\n") + "\n";
      const sHeaders = Object.keys(opts.headers).map(function(k) {
        return k.toLowerCase();
      }).sort().join(";");
      const pHash = opts.method === "POST" ? hex(opts.body || "") : hex("");
      const reqStr = [opts.method, opts.path, qStr, hStr, sHeaders, pHash].join("\n");
      const scope = opts.dateStamp + "/" + opts.region + "/" + opts.service + "/aws4_request";
      const toSign = ["AWS4-HMAC-SHA256", opts.amzDate, scope, hex(reqStr)].join("\n");
      let k = hmac("AWS4" + opts.secretKey, opts.dateStamp);
      k = hmac(k, opts.region);
      k = hmac(k, opts.service);
      k = hmac(k, "aws4_request");
      return "AWS4-HMAC-SHA256 Credential=" + opts.accessKey + "/" + scope + ", SignedHeaders=" + sHeaders + ", Signature=" + hmacHex(k, toSign);
    } catch (e) {
      this.err("sign", e);
      return "";
    }
  }
  buildAxios() {
    try {
      const self = this;
      const client = axios.create({
        baseURL: self.BASE_URL,
        headers: {
          "User-Agent": self.UA,
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "sec-ch-ua-platform": '"Android"',
          origin: self.BASE_URL,
          referer: self.BASE_URL + "/chat/",
          "accept-language": "id,ms;q=0.9,en;q=0.8"
        }
      });
      client.interceptors.response.use(function(res) {
        if (res.headers["set-cookie"]) self.saveJar(res.headers);
        return res;
      }, function(e) {
        return Promise.reject(e);
      });
      client.interceptors.request.use(function(cfg) {
        if (self.cookies) cfg.headers["Cookie"] = self.cookies;
        return cfg;
      }, function(e) {
        return Promise.reject(e);
      });
      return client;
    } catch (e) {
      this.err("buildAxios", e);
      return null;
    }
  }
  saveJar(headers) {
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
      this.err("saveJar", e);
    }
  }
  buildParams(extra) {
    extra = extra || {};
    try {
      this.deviceId = extra.device_id || this.deviceId || this.device();
      this.webId = extra.web_id || this.webId || this.webIdGen();
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
        web_tab_id: this.uuid(),
        msToken: this.msToken(),
        a_bogus: this.aBogus()
      }, extra);
    } catch (e) {
      this.err("buildParams", e);
      return extra;
    }
  }
  async getAnonId() {
    try {
      this.log("getAnonId", "Mendapatkan web_anon_id...");
      const res = await this.http.post("/alice/user/get_web_anon_id", {}, {
        params: this.buildParams()
      });
      if (res.data.code !== 0) {
        const msg = "Server menolak get_web_anon_id: " + res.data.msg;
        this.err("getAnonId", msg);
        return {
          ok: false,
          error: msg
        };
      }
      this.uid = res.data.uid;
      this.webId = res.data.web_id;
      if (!this.deviceId) this.deviceId = this.webId;
      this.log("getAnonId", "✓ uid=" + this.uid + " web_id=" + this.webId);
      return {
        ok: true
      };
    } catch (e) {
      this.err("getAnonId", e);
      return {
        ok: false,
        error: e.message
      };
    }
  }
  async getTobid() {
    try {
      this.log("getTobid", "Mendapatkan tobid...");
      const res = await axios.post("https://mcs-sg.ciciai.com/tobid", {
        app_id: 495671,
        user_unique_id: this.uid || this.webId,
        web_id: this.webId
      }, {
        headers: {
          "User-Agent": this.UA,
          Origin: this.BASE_URL,
          Referer: this.BASE_URL + "/"
        }
      });
      if (res.data.e !== 0) {
        this.warn("getTobid", "Server menolak (" + res.data.e + "), lewati");
        return null;
      }
      this.tobid = res.data.tobid;
      this.log("getTobid", "✓ tobid=" + this.tobid);
      return this.tobid;
    } catch (e) {
      this.warn("getTobid", "Gagal, lewati. " + e.message);
      return null;
    }
  }
  async setup() {
    try {
      if (this.init && this.http) return {
        ok: true
      };
      this.log("setup", "Inisialisasi client...");
      this.http = this.buildAxios();
      if (!this.http) return {
        ok: false,
        error: "Gagal membuat axios instance"
      };
      this.log("setup", "Mengunjungi halaman utama...");
      await this.http.get("/");
      const anonRes = await this.getAnonId();
      if (!anonRes.ok) return {
        ok: false,
        error: anonRes.error
      };
      await this.getTobid();
      this.log("setup", "Launch request...");
      const launchRes = await this.http.post("/alice/user/launch", {}, {
        params: this.buildParams()
      });
      if (launchRes.data.code !== 0) {
        const msg = "Launch gagal: " + launchRes.data.msg;
        this.err("setup", msg);
        return {
          ok: false,
          error: msg
        };
      }
      this.botId = launchRes.data.data.assistant_bot_id;
      this.log("setup", "✓ Launch berhasil, botId=" + this.botId);
      if (!this.convId) {
        this.log("setup", "Membuat sesi percakapan baru...");
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
          sequence_id: this.uuid(),
          channel: 2,
          version: "1"
        }, {
          params: this.buildParams()
        });
        if (convRes.data.status_code !== 0) {
          const msg = "Gagal buat percakapan: " + convRes.data.status_desc;
          this.err("setup", msg);
          return {
            ok: false,
            error: msg
          };
        }
        this.convId = convRes.data.downlink_body.get_conv_info_downlink_body.conversation_info.conversation_id;
        this.log("setup", "✓ Percakapan dibuat, convId=" + this.convId);
      }
      this.init = true;
      this.log("setup", "✅ Setup selesai");
      return {
        ok: true
      };
    } catch (e) {
      this.err("setup", e);
      return {
        ok: false,
        error: e.message
      };
    }
  }
  async processFile(input) {
    try {
      let buffer, ext = ".jpg";
      if (Buffer.isBuffer(input)) {
        this.log("processFile", "Input berupa Buffer biner");
        buffer = input;
      } else if (typeof input === "string") {
        if (input.startsWith("http")) {
          this.log("processFile", "Mengunduh gambar dari URL...");
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          buffer = Buffer.from(res.data);
          const ct = res.headers["content-type"] || "";
          if (ct.includes("png")) ext = ".png";
          else if (ct.includes("gif")) ext = ".gif";
          else if (ct.includes("webp")) ext = ".webp";
          this.log("processFile", "✓ Unduh selesai, format=" + ext + " size=" + buffer.length + "B");
        } else if (input.startsWith("data:")) {
          this.log("processFile", "Parsing Data URL base64...");
          const match = input.match(/^data:image\/([^;]+);base64,(.+)$/);
          if (!match) {
            this.err("processFile", "Format Data URL tidak valid");
            return {
              ok: false,
              error: "Format Data URL tidak valid"
            };
          }
          ext = "." + match[1];
          buffer = Buffer.from(match[2], "base64");
          this.log("processFile", "✓ Data URL parsed, format=" + ext + " size=" + buffer.length + "B");
        } else {
          this.log("processFile", "Parsing string sebagai Base64 mentah...");
          buffer = Buffer.from(input, "base64");
          this.log("processFile", "✓ Base64 parsed, size=" + buffer.length + "B");
        }
      } else {
        this.err("processFile", "Tipe input tidak didukung");
        return {
          ok: false,
          error: "Format file tidak didukung (gunakan URL, Base64, atau Buffer)"
        };
      }
      return {
        ok: true,
        buffer: buffer,
        ext: ext
      };
    } catch (e) {
      this.err("processFile", e);
      return {
        ok: false,
        error: e.message
      };
    }
  }
  async upload(fileInput) {
    try {
      this.log("upload", "Memulai proses upload...");
      const fileRes = await this.processFile(fileInput);
      if (!fileRes.ok) return {
        ok: false,
        error: fileRes.error
      };
      const {
        buffer,
        ext
      } = fileRes;
      const crc = this.crc32(buffer);
      const name = this.uuid() + ext;
      this.log("upload", "File siap: name=" + name + " size=" + buffer.length + "B crc=" + crc);
      this.log("upload", "PrepareUpload...");
      const prep = await this.http.post("/alice/resource/prepare_upload", {
        tenant_id: "5",
        scene_id: "4",
        resource_type: 2
      }, {
        params: this.buildParams()
      });
      if (prep.data.code !== 0) {
        const msg = "PrepareUpload ditolak: " + prep.data.msg;
        this.err("upload", msg);
        return {
          ok: false,
          error: msg
        };
      }
      const tok = prep.data.data.upload_auth_token;
      const uploadHost = prep.data.data.upload_host;
      const serviceId = prep.data.data.service_id;
      this.log("upload", "✓ PrepareUpload: host=" + uploadHost + " serviceId=" + serviceId);
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
      const dStamp = amzDate.substr(0, 8);
      this.log("upload", "ApplyImageUpload...");
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
      aHeaders["Authorization"] = this.sign({
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
      const aRes = await axios.get("https://" + uploadHost + "/", {
        params: aQuery,
        headers: Object.assign({
          Origin: this.BASE_URL,
          Referer: this.BASE_URL + "/"
        }, aHeaders)
      });
      const aData = typeof aRes.data === "string" ? JSON.parse(aRes.data) : aRes.data;
      const info = aData.Result && aData.Result.UploadAddress && aData.Result.UploadAddress.StoreInfos && aData.Result.UploadAddress.StoreInfos[0];
      const host = aData.Result && aData.Result.UploadAddress && aData.Result.UploadAddress.UploadHosts && aData.Result.UploadAddress.UploadHosts[0];
      if (!info || !host) {
        const msg = "ApplyImageUpload: gagal memproses parameter TOS Volcengine";
        this.err("upload", msg);
        return {
          ok: false,
          error: msg
        };
      }
      this.log("upload", "✓ ApplyImageUpload: storeUri=" + info.StoreUri);
      this.log("upload", "Uploading biner ke TOS bucket...");
      await axios.put("https://" + host + "/" + info.StoreUri, buffer, {
        headers: {
          Authorization: info.Auth,
          "Content-Type": "application/octet-stream",
          "Content-CRC32": crc,
          "Content-Disposition": 'attachment; filename="' + name + '"'
        }
      });
      this.log("upload", "✓ PUT selesai");
      this.log("upload", "CommitImageUpload...");
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
      cHeaders["Authorization"] = this.sign({
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
      const cRes = await axios.post("https://" + uploadHost + "/", cBody, {
        params: cQuery,
        headers: Object.assign({
          Origin: this.BASE_URL,
          Referer: this.BASE_URL + "/"
        }, cHeaders)
      });
      const cData = typeof cRes.data === "string" ? JSON.parse(cRes.data) : cRes.data;
      const final = cData.Result && cData.Result.PluginResult && cData.Result.PluginResult[0];
      if (!final) {
        const msg = "CommitImageUpload: hasil tidak diterima dari server";
        this.err("upload", msg);
        return {
          ok: false,
          error: msg
        };
      }
      this.log("upload", "✅ Upload sukses: uri=" + final.ImageUri);
      return {
        ok: true,
        uri: final.ImageUri,
        name: final.FileName || name,
        width: final.ImageWidth || 800,
        height: final.ImageHeight || 600
      };
    } catch (e) {
      this.err("upload", e);
      return {
        ok: false,
        error: e.message
      };
    }
  }
  buildPayload(prompt, attachments, extra) {
    try {
      const isImage = extra.mode === "image";
      const content_block = [];
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          content_block.push({
            block_type: 10052,
            content: {
              attachment_block: {
                attachments: [{
                  type: 1,
                  identifier: this.uuid(),
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
            block_id: this.uuid(),
            parent_id: "",
            meta_info: [],
            append_fields: []
          });
        }
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
        block_id: this.uuid(),
        parent_id: "",
        meta_info: [],
        append_fields: []
      });
      const payload = {
        client_meta: {
          conversation_id: extra.conversation_id || this.convId,
          bot_id: extra.bot_id || this.botId,
          last_section_id: extra.last_section_id || "",
          last_message_index: extra.last_message_index !== undefined ? extra.last_message_index : 0
        },
        messages: [{
          local_message_id: this.uuid(),
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
          unique_key: this.uuid(),
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
          fp: "verify_" + this.uuid(),
          collection_id: extra.collection_id || "",
          commerce_credit_config_enable: extra.commerce_credit_config_enable || "0"
        }
      };
      if (isImage && (!attachments || attachments.length === 0)) {
        payload.chat_ability = {
          ability_type: 3,
          ability_param: JSON.stringify({
            ability_param: {},
            ability_type: 1
          })
        };
        payload.ext.input_skill = JSON.stringify({
          skill_id: "3",
          skill_type: 3,
          template_key: ""
        });
        this.log("buildPayload", "Mode T2I: chat_ability + input_skill ditambahkan");
      } else if (isImage && attachments && attachments.length > 0) {
        this.log("buildPayload", "Mode I2I: " + attachments.length + " attachment block sudah ada");
      }
      if (extra.option_overrides) Object.assign(payload.option, extra.option_overrides);
      if (extra.ext_overrides) Object.assign(payload.ext, extra.ext_overrides);
      return {
        ok: true,
        payload: payload
      };
    } catch (e) {
      this.err("buildPayload", e);
      return {
        ok: false,
        error: e.message
      };
    }
  }
  async send(prompt, attachments, extra) {
    extra = extra || {};
    const self = this;
    try {
      if (!this.init) {
        const setupRes = await this.setup();
        if (!setupRes.ok) return {
          ok: false,
          error: setupRes.error
        };
      }
      if (extra.conversation_id) this.convId = extra.conversation_id;
      const payloadRes = this.buildPayload(prompt, attachments, extra);
      if (!payloadRes.ok) return {
        ok: false,
        error: payloadRes.error
      };
      const payload = payloadRes.payload;
      this.log("send", "Membuka stream /chat/completion (mode=" + (extra.mode || "chat") + ")...");
      const res = await this.http.post("/chat/completion", payload, {
        params: this.buildParams({
          fp: payload.ext.fp
        }),
        responseType: "stream",
        headers: {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache"
        }
      });
      return new Promise(function(resolve) {
        let text = "",
          buf = "",
          ev = "",
          hasData = false;
        let images = [];
        const timeout = setTimeout(function() {
          if (!hasData) {
            self.warn("send", "Timeout 30 detik — tidak ada respons server");
            resolve({
              ok: false,
              error: "Timeout: tidak ada respons server dalam 30 detik"
            });
          }
        }, 3e4);

        function extractImages(creations) {
          try {
            const out = [];
            for (const c of creations) {
              const img = c.image;
              if (!img || img.status !== 2) continue;
              out.push({
                id: c.id,
                task_type: c.gen_detail && c.gen_detail.task_type !== undefined ? c.gen_detail.task_type : 1,
                url: img.image_ori && img.image_ori.url || img.image_preview && img.image_preview.url || img.image_thumb && img.image_thumb.url || "",
                thumb: img.image_thumb && img.image_thumb.url || "",
                preview: img.image_preview && img.image_preview.url || "",
                raw: img.image_ori_raw && img.image_ori_raw.url || "",
                width: img.image_ori && img.image_ori.width || img.placeholder && img.placeholder.width || 2048,
                height: img.image_ori && img.image_ori.height || img.placeholder && img.placeholder.height || 2048,
                prompt: img.gen_params && img.gen_params.prompt || prompt,
                ref_uri: img.gen_params && img.gen_params.img_uri || "",
                ref_uris: img.gen_params && img.gen_params.img_uris || [],
                ref_images: c.gen_detail && c.gen_detail.ref_images || [],
                model: img.placeholder && img.placeholder.description || ""
              });
            }
            return out;
          } catch (e) {
            self.err("extractImages", e);
            return [];
          }
        }

        function handleBlock(b) {
          try {
            if (b.block_type === 1e4 && b.content && b.content.text_block && b.content.text_block.text) {
              return b.content.text_block.text;
            }
            if (b.block_type === 2074) {
              const creations = b.content && b.content.creation_block && b.content.creation_block.creations || [];
              const found = extractImages(creations);
              if (found.length > 0) {
                images = found;
                self.log("send", "✓ " + found.length + " gambar diekstrak (task_type=" + found[0].task_type + ")");
              }
            }
          } catch (e) {
            self.err("handleBlock", e);
          }
          return "";
        }
        res.data.on("data", function(chunk) {
          try {
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
                    if (data.content && data.content.content_block) {
                      for (const b of data.content.content_block) {
                        add += handleBlock(b);
                      }
                    }
                    if (data.patch_op) {
                      for (const p of data.patch_op) {
                        if (p.patch_object === 1 && p.patch_value && p.patch_value.content_block) {
                          for (const b of p.patch_value.content_block) {
                            add += handleBlock(b);
                          }
                        }
                      }
                    }
                    if (add) {
                      text += add;
                      process.stdout.write(add);
                    }
                  } else if (ev === "SSE_REPLY_END" && data.end_type === 1) {
                    clearTimeout(timeout);
                    self.log("send", "✅ Stream selesai — teks=" + text.length + "c gambar=" + images.length);
                    resolve({
                      ok: true,
                      text: text,
                      images: images
                    });
                  }
                } catch (ignoreParseErr) {}
              } else if (line === "") {
                ev = "";
              }
            }
          } catch (e) {
            self.err("send:data", e);
          }
        });
        res.data.on("end", function() {
          clearTimeout(timeout);
          self.log("send", "Stream end");
          resolve({
            ok: true,
            text: text,
            images: images
          });
        });
        res.data.on("error", function(e) {
          clearTimeout(timeout);
          self.err("send:stream", e);
          resolve({
            ok: false,
            error: e.message
          });
        });
      });
    } catch (e) {
      this.err("send", e);
      return {
        ok: false,
        error: e.message
      };
    }
  }
  loadState(b64) {
    try {
      const state = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      Object.assign(this, state);
      this.init = !!(this.cookies && this.botId);
      if (this.init) this.http = this.buildAxios();
      this.log("loadState", "✓ State dimuat (init=" + this.init + ")");
      return true;
    } catch (e) {
      this.err("loadState", e);
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
      this.err("saveState", e);
      return "";
    }
  }
  async generate({
    mode,
    prompt,
    state,
    ...rest
  }) {
    mode = mode !== undefined ? mode : "chat";
    const self = this;

    function stateSnapshot() {
      return {
        state: self.saveState(),
        conv_id: self.convId || ""
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
      return this.errRes("Mode '" + mode + "' tidak valid. Mode yang tersedia: " + this.VALID_MODES.map(function(m) {
        return "'" + m + "'";
      }).join(", "), stateSnapshot());
    }
    try {
      this.log("generate", "Memulai (mode=" + mode + ' prompt="' + prompt.slice(0, 60) + '")');
      if (state) {
        this.log("generate", "Memuat state sebelumnya...");
        this.loadState(state);
      }
      if (rest.conv_id !== undefined) this.convId = rest.conv_id;
      if (!this.init) {
        const setupRes = await this.setup();
        if (!setupRes.ok) return this.errRes(setupRes.error, stateSnapshot());
      }
      const attachments = [];
      if (rest.file) {
        const files = Array.isArray(rest.file) ? rest.file : [rest.file];
        const label = mode === "image" ? "i2i" : "chat-attachment";
        this.log("generate", "Upload " + files.length + " file(s) (" + label + ")...");
        for (const f of files) {
          const upRes = await this.upload(f);
          if (!upRes.ok) return this.errRes(upRes.error, stateSnapshot());
          attachments.push(upRes);
          this.log("generate", "✓ File siap: uri=" + upRes.uri);
        }
      }
      const extra = {
        mode: mode,
        conversation_id: rest.conv_id || this.convId,
        bot_id: rest.bot_id || this.botId,
        last_section_id: rest.last_section_id,
        last_message_index: rest.last_message_index,
        collection_id: rest.collection_id,
        commerce_credit_config_enable: rest.commerce_credit_config_enable,
        option_overrides: rest.option_overrides,
        ext_overrides: rest.ext_overrides
      };
      const sendRes = await this.send(prompt, attachments, extra);
      if (!sendRes.ok) return this.errRes(sendRes.error, stateSnapshot());
      const response = this.okRes({
        result: sendRes.text,
        state: this.saveState(),
        conv_id: this.convId || ""
      });
      if (sendRes.images.length > 0) {
        response.images = sendRes.images;
        response.image_count = sendRes.images.length;
      }
      this.log("generate", "✅ Selesai (result=" + sendRes.text.length + "c images=" + sendRes.images.length + ")");
      return response;
    } catch (e) {
      this.err("generate", e);
      return this.errRes(e.message, stateSnapshot());
    }
  }
  async chat({
    prompt,
    state,
    ...rest
  }) {
    rest.mode = "chat";
    return this.generate(Object.assign({
      prompt: prompt,
      state: state,
      mode: "chat"
    }, rest));
  }
}
export default async function handler(req, res) {
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