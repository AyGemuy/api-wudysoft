import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import crypto from "crypto";
class PalumaClient {
  constructor() {
    this.base_api = "https://api.palumachat.com/api";
    this.base_mail = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.app_ver = "9";
    this.ua = "okhttp/4.12.0";
    this.tz = "Asia/Makassar";
    this.dob = "2001-01-12";
    this.pass_prefix = "Paluma!";
    this.poll_ms = 3e3;
    this.otp_regex = /\b(\d{6})\b/;
    this.uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    this.active_token = "";
    this.api = axios.create({
      baseURL: this.base_api,
      headers: {
        "User-Agent": this.ua,
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "x-paluma-app-version": this.app_ver
      }
    });
    this.mail_client = axios.create({
      baseURL: this.base_mail,
      headers: {
        "User-Agent": this.ua,
        "Accept-Encoding": "gzip"
      }
    });
    this.raw = axios.create({
      headers: {
        "User-Agent": this.ua
      }
    });
    this.api.interceptors.request.use(cfg => {
      if (this.active_token && !cfg?.headers?.authorization) {
        cfg.headers = cfg.headers || {};
        cfg.headers.authorization = `Bearer ${this.active_token}`;
      }
      this.log("api_req", `${(cfg?.method || "GET").toUpperCase()} ${cfg?.url || ""}`);
      return cfg;
    }, err => {
      this.log("api_req_err", err?.message || "request_error");
      return Promise.reject(err);
    });
    this.api.interceptors.response.use(res => {
      this.log("api_res", `${res?.status || 0} ${res?.config?.url || ""}`);
      return res;
    }, err => {
      this.log("api_res_err", `${err?.response?.status || 0} ${err?.config?.url || ""} -> ${err?.response?.data?.message || err?.response?.data?.error || err?.message || "unknown_error"}`);
      return Promise.reject(err);
    });
    this.mail_client.interceptors.request.use(cfg => {
      this.log("mail_req", `${(cfg?.method || "GET").toUpperCase()} ${cfg?.url || ""}`);
      return cfg;
    }, err => Promise.reject(err));
    this.mail_client.interceptors.response.use(res => {
      this.log("mail_res", `${res?.status || 0} ${res?.config?.url || ""}`);
      return res;
    }, err => Promise.reject(err));
  }
  log(tag, msg, extra) {
    const ts = new Date().toISOString();
    if (extra !== undefined) {
      console.log(`[${ts}] [${tag}] ${msg}`, extra);
    } else {
      console.log(`[${ts}] [${tag}] ${msg}`);
    }
  }
  slp(ms) {
    return new Promise(resolve => setTimeout(resolve, ms || this.poll_ms));
  }
  enc(obj) {
    try {
      const json = JSON.stringify(obj || {});
      return Buffer.from(json, "utf8").toString("base64");
    } catch (err) {
      this.log("enc_err", err?.message || "encode_failed");
      return "";
    }
  }
  dec(input) {
    try {
      if (!input) return {};
      if (typeof input === "object") return {
        ...input
      };
      const raw = Buffer.from(String(input), "base64").toString("utf8");
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      this.log("dec_err", err?.message || "decode_failed");
      return {};
    }
  }
  out(ok, res, st) {
    return {
      status: ok ? true : false,
      result: res !== undefined ? res : null,
      state: typeof st === "string" ? st : this.enc(st || {})
    };
  }
  async mail() {
    try {
      this.log("auth", "creating temporary email...");
      const res = await this.mail_client.get("", {
        params: {
          action: "create"
        }
      });
      const email = res?.data?.email || res?.data?.data?.email || "";
      if (!email) {
        return {
          ok: false,
          error_message: "failed_to_create_temp_email"
        };
      }
      this.log("auth", `temp email created: ${email}`);
      return {
        ok: true,
        email: email
      };
    } catch (err) {
      this.log("mail_err", err?.message || "create_mail_failed");
      return {
        ok: false,
        error_message: err?.message || "create_mail_failed",
        error_detail: err?.response?.data || null
      };
    }
  }
  async otp(email) {
    try {
      if (!email) {
        return {
          ok: false,
          error_message: "email_is_required_for_otp"
        };
      }
      this.log("auth", `polling otp for ${email}...`);
      while (true) {
        const res = await this.mail_client.get("", {
          params: {
            action: "message",
            email: email
          }
        });
        const list = Array.isArray(res?.data?.data) ? res.data.data : [];
        for (const msg of list) {
          const body = msg?.text_content || msg?.html_content || msg?.subject || "";
          const match = String(body).match(this.otp_regex);
          if (match?.[1]) {
            this.log("auth", `otp received: ${match[1]}`);
            return {
              ok: true,
              code: match[1]
            };
          }
        }
        await this.slp(this.poll_ms);
      }
    } catch (err) {
      this.log("otp_err", err?.message || "otp_poll_failed");
      return {
        ok: false,
        error_message: err?.message || "otp_poll_failed",
        error_detail: err?.response?.data || null
      };
    }
  }
  async syn(st) {
    try {
      this.log("auth", "syncing profile, conversations, and achievements...");
      const [prof_res, conv_res, ach_res] = await Promise.allSettled([this.api.get("/profile/me"), this.api.get("/conversations"), this.api.get("/achievements/me")]);
      return {
        ok: true,
        profile: prof_res?.status === "fulfilled" ? prof_res.value?.data?.profile || null : null,
        conversations: conv_res?.status === "fulfilled" ? conv_res.value?.data?.conversations || [] : [],
        achievements: ach_res?.status === "fulfilled" ? ach_res.value?.data || null : null,
        username: prof_res?.status === "fulfilled" ? prof_res.value?.data?.profile?.username || st?.username || "" : st?.username || ""
      };
    } catch (err) {
      this.log("syn_warn", err?.message || "session_sync_warning");
      return {
        ok: false
      };
    }
  }
  async reg(email, password) {
    try {
      if (!email || !password) {
        return {
          ok: false,
          error_message: "email_and_password_are_required"
        };
      }
      this.log("auth", `signing up ${email}...`);
      const sign_res = await this.api.post("/auth/signup", {
        email: email,
        password: password,
        date_of_birth: this.dob
      });
      const sign_data = sign_res?.data || {};
      this.log("auth", `signup verification_required=${Boolean(sign_data?.verification_required)}`);
      const otp_res = await this.otp(email);
      if (!otp_res?.ok || !otp_res?.code) {
        return {
          ok: false,
          error_message: otp_res?.error_message || "otp_verification_failed",
          error_detail: otp_res?.error_detail || null
        };
      }
      this.log("auth", `confirming otp for ${email}...`);
      const ver_res = await this.api.post("/auth/verify/confirm", {
        email: email,
        code: otp_res.code
      });
      const ver_data = ver_res?.data || {};
      const token = ver_data?.session?.access_token || "";
      if (!token) {
        return {
          ok: false,
          error_message: "missing_access_token_after_verify",
          error_detail: ver_data
        };
      }
      this.active_token = token;
      try {
        await this.api.post("/waitlist/link-install", {
          anonymous_id: crypto.randomUUID()
        });
        this.log("auth", "waitlist link-install recorded");
      } catch (link_err) {
        this.log("auth_warn", `link-install skipped: ${link_err?.message || "error"}`);
      }
      const synced = await this.syn({
        email: email
      });
      return {
        ok: true,
        data: {
          email: email,
          password: password,
          user_id: ver_data?.user?.id || sign_data?.user?.id || "",
          username: synced?.username || "",
          access_token: token,
          refresh_token: ver_data?.session?.refresh_token || "",
          expires_at: ver_data?.session?.expires_at || 0,
          synced: true
        }
      };
    } catch (err) {
      this.log("reg_err", err?.response?.data?.message || err?.message || "signup_failed");
      return {
        ok: false,
        error_message: err?.response?.data?.message || err?.message || "signup_failed",
        error_detail: err?.response?.data || null
      };
    }
  }
  async lgn(email, password) {
    try {
      if (!email || !password) {
        return {
          ok: false,
          error_message: "email_and_password_are_required_for_login"
        };
      }
      this.log("auth", `logging in with existing state email: ${email}...`);
      const res = await this.api.post("/auth/login", {
        email: email,
        password: password
      });
      const data = res?.data || {};
      const token = data?.session?.access_token || "";
      if (!token) {
        return {
          ok: false,
          error_message: "missing_access_token_after_login",
          error_detail: data
        };
      }
      this.active_token = token;
      const synced = await this.syn({
        email: email
      });
      return {
        ok: true,
        data: {
          email: email,
          password: password,
          user_id: data?.user?.id || "",
          username: synced?.username || "",
          access_token: token,
          refresh_token: data?.session?.refresh_token || "",
          expires_at: data?.session?.expires_at || 0,
          synced: true
        }
      };
    } catch (err) {
      this.log("lgn_err", err?.response?.data?.message || err?.message || "login_failed");
      return {
        ok: false,
        error_message: err?.response?.data?.message || err?.message || "login_failed",
        error_detail: err?.response?.data || null
      };
    }
  }
  async mk(state) {
    try {
      const st = this.dec(state);
      const now_sec = Math.floor(Date.now() / 1e3);
      const valid_token = st?.access_token && (!st?.expires_at || st.expires_at > now_sec + 60);
      if (valid_token) {
        this.active_token = st.access_token;
        this.log("state", `reusing active session for ${st?.email || "unknown_user"}`);
        if (!st?.synced) {
          const synced = await this.syn(st);
          st.username = synced?.username || st?.username || "";
          st.synced = true;
        }
        return {
          ok: true,
          state: st
        };
      }
      if (st?.email && st?.password) {
        const logged = await this.lgn(st.email, st.password);
        if (!logged?.ok) {
          return {
            ok: false,
            error_message: logged?.error_message || "login_failed",
            error_detail: logged?.error_detail || null,
            state: st
          };
        }
        return {
          ok: true,
          state: {
            ...st,
            ...logged.data
          }
        };
      }
      const mail_res = await this.mail();
      if (!mail_res?.ok || !mail_res?.email) {
        return {
          ok: false,
          error_message: mail_res?.error_message || "create_mail_failed",
          error_detail: mail_res?.error_detail || null,
          state: st
        };
      }
      const password = `${this.pass_prefix}${crypto.randomBytes(4).toString("hex")}`;
      const reg_res = await this.reg(mail_res.email, password);
      if (!reg_res?.ok) {
        return {
          ok: false,
          error_message: reg_res?.error_message || "signup_failed",
          error_detail: reg_res?.error_detail || null,
          state: {
            ...st,
            email: mail_res.email,
            password: password
          }
        };
      }
      return {
        ok: true,
        state: {
          ...st,
          ...reg_res.data
        }
      };
    } catch (err) {
      this.log("mk_err", err?.message || "session_init_failed");
      return {
        ok: false,
        error_message: err?.message || "session_init_failed",
        state: this.dec(state)
      };
    }
  }
  async chr(target, st) {
    try {
      if (target) {
        const clean_target = String(target).trim();
        if (this.uuid_regex.test(clean_target)) {
          return {
            ok: true,
            character_id: clean_target
          };
        }
        this.log("char", `resolving character slug: ${clean_target}`);
        const res = await this.api.get(`/characters/${encodeURIComponent(clean_target)}`);
        const char_obj = res?.data?.character || null;
        if (!char_obj?.id) {
          return {
            ok: false,
            error_message: `character_not_found: ${clean_target}`,
            error_detail: res?.data || null
          };
        }
        return {
          ok: true,
          character_id: char_obj.id,
          character: char_obj
        };
      }
      if (st?.character_id) {
        return {
          ok: true,
          character_id: st.character_id
        };
      }
      this.log("char", "no character specified, picking first character from feed...");
      const feed_res = await this.api.get("/discover/feed", {
        params: {
          mode: "all",
          gender: "all",
          limit: 1
        }
      });
      const first_char = feed_res?.data?.feed?.characters?.[0] || null;
      if (!first_char?.id) {
        return {
          ok: false,
          error_message: "no_character_found_in_feed",
          error_detail: feed_res?.data || null
        };
      }
      return {
        ok: true,
        character_id: first_char.id,
        character: first_char
      };
    } catch (err) {
      this.log("chr_err", err?.response?.data?.message || err?.message || "character_resolve_failed");
      return {
        ok: false,
        error_message: err?.response?.data?.message || err?.message || "character_resolve_failed",
        error_detail: err?.response?.data || null
      };
    }
  }
  async cnv(character_id, st, explicit_conv_id) {
    try {
      let conv_id = explicit_conv_id || "";
      let resolved_char_id = character_id || st?.character_id || "";
      let conv_payload = null;
      if (!conv_id && st?.conversation_id && (!resolved_char_id || st?.character_id === resolved_char_id)) {
        conv_id = st.conversation_id;
        this.log("conv", `reusing conversation_id: ${conv_id}`);
      } else if (!conv_id) {
        if (!resolved_char_id) {
          return {
            ok: false,
            error_message: "character_id_is_required_for_conversation"
          };
        }
        this.log("conv", `fetching/opening conversation for character ${resolved_char_id}...`);
        const res = await this.api.get(`/characters/${resolved_char_id}/conversation`);
        conv_payload = res?.data || {};
        conv_id = conv_payload?.conversation?.id || "";
        resolved_char_id = conv_payload?.character?.id || resolved_char_id;
      }
      if (!conv_id) {
        return {
          ok: false,
          error_message: "failed_to_get_conversation",
          error_detail: conv_payload
        };
      }
      const [list_res, hist_res, ctx_res, read_res] = await Promise.allSettled([this.api.get("/conversations", {
        params: {
          include_archived: true
        }
      }), this.api.get(`/conversations/${conv_id}/history`), this.api.get(`/conversations/${conv_id}/context`), this.api.post(`/conversations/${conv_id}/read`)]);
      return {
        ok: true,
        conversation_id: conv_id,
        character_id: resolved_char_id,
        conversation_data: conv_payload,
        conversations_list: list_res?.status === "fulfilled" ? list_res.value?.data?.conversations || [] : [],
        history_messages: hist_res?.status === "fulfilled" ? hist_res.value?.data?.messages || [] : [],
        context_data: ctx_res?.status === "fulfilled" ? ctx_res.value?.data || null : null,
        read_data: read_res?.status === "fulfilled" ? read_res.value?.data || null : null
      };
    } catch (err) {
      this.log("cnv_err", err?.response?.data?.message || err?.message || "conversation_init_failed");
      return {
        ok: false,
        error_message: err?.response?.data?.message || err?.message || "conversation_init_failed",
        error_detail: err?.response?.data || null
      };
    }
  }
  async med(item) {
    try {
      if (!item) return null;
      if (Buffer.isBuffer(item)) {
        return {
          source_type: "buffer",
          mime_type: "application/octet-stream",
          byte_length: item.length,
          base64_data: item.toString("base64")
        };
      }
      if (typeof item === "object") {
        const src = item?.buffer || item?.url || item?.base64 || item?.data || "";
        const solved = await this.med(src);
        return solved ? {
          ...solved,
          mime_type: item?.mime_type || item?.mime || solved.mime_type
        } : null;
      }
      const str = String(item).trim();
      if (!str) return null;
      if (/^https?:\/\//i.test(str)) {
        this.log("media", `downloading media url: ${str}`);
        const res = await this.raw.get(str, {
          responseType: "arraybuffer"
        });
        const buf = Buffer.from(res?.data || []);
        return {
          source_type: "url",
          source_url: str,
          mime_type: res?.headers?.["content-type"] || "application/octet-stream",
          byte_length: buf.length,
          base64_data: buf.toString("base64")
        };
      }
      const data_match = str.match(/^data:([^;]+);base64,(.+)$/i);
      if (data_match) {
        const buf = Buffer.from(data_match[2], "base64");
        return {
          source_type: "base64_uri",
          mime_type: data_match[1] || "application/octet-stream",
          byte_length: buf.length,
          base64_data: data_match[2]
        };
      }
      const clean_b64 = str.replace(/\s+/g, "");
      const buf = Buffer.from(clean_b64, "base64");
      return {
        source_type: "base64",
        mime_type: "application/octet-stream",
        byte_length: buf.length,
        base64_data: clean_b64
      };
    } catch (err) {
      this.log("med_err", err?.message || "media_solve_failed");
      return {
        source_type: "unresolved",
        error_message: err?.message || "media_solve_failed"
      };
    }
  }
  sse(raw_text) {
    try {
      const text = typeof raw_text === "string" ? raw_text : JSON.stringify(raw_text || {});
      const lines = text.split(/\r?\n/);
      let current_event = "";
      let done_payload = null;
      let last_revise = null;
      const chunks = [];
      for (const line of lines) {
        if (line.startsWith("event:")) {
          current_event = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          const raw_json = line.slice(5).trim();
          if (!raw_json) continue;
          try {
            const parsed = JSON.parse(raw_json);
            if (current_event === "done") {
              chunks.push({
                event: current_event,
                data: parsed
              });
              done_payload = parsed;
            } else if (current_event === "revise") {
              chunks.push({
                event: current_event,
                data: parsed
              });
              last_revise = parsed;
            } else {
              chunks.push({
                event: current_event || "message",
                data: parsed
              });
            }
          } catch (_) {}
        }
      }
      const final_payload = done_payload || last_revise || (typeof raw_text === "object" ? raw_text : {
        raw_stream: text
      });
      return {
        ...final_payload,
        chunks: chunks
      };
    } catch (err) {
      this.log("sse_err", err?.message || "sse_parse_failed");
      return {
        raw_stream: raw_text,
        chunks: []
      };
    }
  }
  async search({
    state,
    query,
    ...rest
  } = {}) {
    let st = this.dec(state);
    try {
      const q = String(query ?? rest?.q ?? "").trim();
      if (!q) {
        this.log("search_val", "validation failed: query is required");
        return this.out(false, {
          error_message: "query is required"
        }, st);
      }
      this.log("search", `starting search query="${q}"`);
      const sess = await this.mk(st);
      st = sess?.state || st;
      if (!sess?.ok) {
        return this.out(false, {
          error_message: sess?.error_message || "auth_failed",
          error_detail: sess?.error_detail || null
        }, st);
      }
      const params = {
        ...rest,
        q: q,
        type: rest?.type || "all",
        page: Number(rest?.page) > 0 ? Number(rest.page) : 1,
        per_page: Number(rest?.per_page) > 0 ? Number(rest.per_page) : 20,
        sort: rest?.sort || "trending"
      };
      const res = await this.api.get("/search", {
        params: params
      });
      const data = res?.data || {};
      this.log("search", `found ${data?.total_found ?? data?.results?.length ?? 0} results`);
      return this.out(true, data, st);
    } catch (err) {
      this.log("search_err", err?.response?.data?.message || err?.message || "search_failed");
      return this.out(false, {
        error_message: err?.response?.data?.message || err?.message || "search_failed",
        error_detail: err?.response?.data || null
      }, st);
    }
  }
  async feed({
    state,
    ...rest
  } = {}) {
    let st = this.dec(state);
    try {
      if (rest?.limit !== undefined && (Number.isNaN(Number(rest.limit)) || Number(rest.limit) < 1)) {
        this.log("feed_val", "validation failed: limit must be >= 1");
        return this.out(false, {
          error_message: "limit must be a positive number >= 1"
        }, st);
      }
      this.log("feed", "fetching discover feed...");
      const sess = await this.mk(st);
      st = sess?.state || st;
      if (!sess?.ok) {
        return this.out(false, {
          error_message: sess?.error_message || "auth_failed",
          error_detail: sess?.error_detail || null
        }, st);
      }
      const params = {
        ...rest,
        mode: rest?.mode || "all",
        gender: rest?.gender || "all",
        limit: Number(rest?.limit) > 0 ? Number(rest.limit) : 20
      };
      const res = await this.api.get("/discover/feed", {
        params: params
      });
      const data = res?.data || {};
      this.log("feed", `fetched ${data?.feed?.characters?.length || 0} characters`);
      return this.out(true, data, st);
    } catch (err) {
      this.log("feed_err", err?.response?.data?.message || err?.message || "feed_failed");
      return this.out(false, {
        error_message: err?.response?.data?.message || err?.message || "feed_failed",
        error_detail: err?.response?.data || null
      }, st);
    }
  }
  async chat({
    state,
    prompt,
    messages,
    media,
    ...rest
  } = {}) {
    let st = this.dec(state);
    try {
      const msg_list = [];
      const media_list = [];
      const input_msgs = Array.isArray(messages) ? messages : messages ? [messages] : [];
      const input_media = Array.isArray(media) ? media : media ? [media] : [];
      for (const m of input_msgs) {
        const text_val = typeof m === "string" ? m : m?.content || m?.text || "";
        if (String(text_val).trim()) {
          msg_list.push({
            role: m?.role || "user",
            content: String(text_val).trim()
          });
        }
      }
      if (prompt !== undefined && prompt !== null && String(prompt).trim()) {
        msg_list.push({
          role: "user",
          content: String(prompt).trim()
        });
      }
      if (msg_list.length === 0 && input_media.length === 0) {
        this.log("chat_val", "validation failed: prompt, messages, or media is required");
        return this.out(false, {
          error_message: "prompt, messages, or media is required"
        }, st);
      }
      this.log("chat", "initializing chat session...");
      const sess = await this.mk(st);
      st = sess?.state || st;
      if (!sess?.ok) {
        return this.out(false, {
          error_message: sess?.error_message || "auth_failed",
          error_detail: sess?.error_detail || null
        }, st);
      }
      for (const item of input_media) {
        const solved = await this.med(item);
        if (solved) {
          media_list.push(solved);
        }
      }
      let char_id = st?.character_id || "";
      if (!rest?.conversation_id) {
        const target_char = rest?.character_id || rest?.slug || st?.character_id || "";
        const char_res = await this.chr(target_char, st);
        if (!char_res?.ok || !char_res?.character_id) {
          return this.out(false, {
            error_message: char_res?.error_message || "character_resolve_failed",
            error_detail: char_res?.error_detail || null
          }, st);
        }
        char_id = char_res.character_id;
      }
      const conv_res = await this.cnv(char_id, st, rest?.conversation_id);
      if (!conv_res?.ok || !conv_res?.conversation_id) {
        return this.out(false, {
          error_message: conv_res?.error_message || "conversation_init_failed",
          error_detail: conv_res?.error_detail || null
        }, st);
      }
      st.character_id = conv_res.character_id || char_id;
      st.conversation_id = conv_res.conversation_id;
      const content_parts = [];
      for (const entry of msg_list) {
        const prefix = entry.role === "assistant" || entry.role === "character" ? "Character: " : "";
        content_parts.push(`${prefix}${entry.content}`);
      }
      for (const md of media_list) {
        content_parts.push(`[attached_${md.source_type}:${md.mime_type}:${md.byte_length || 0}_bytes]`);
      }
      const final_content = content_parts.join("\n").trim();
      if (!final_content) {
        return this.out(false, {
          error_message: "resolved_content_is_empty"
        }, st);
      }
      this.log("chat", `streaming message to conversation ${st.conversation_id}...`);
      const payload = {
        content: final_content,
        client_request_id: rest?.client_request_id || crypto.randomUUID(),
        client_timezone: rest?.client_timezone || this.tz,
        supports_policy_retraction: typeof rest?.supports_policy_retraction === "boolean" ? rest.supports_policy_retraction : true,
        supports_premium_block: typeof rest?.supports_premium_block === "boolean" ? rest.supports_premium_block : true
      };
      if (rest?.model_lane) {
        payload.model_lane = rest.model_lane;
      }
      const stream_res = await this.api.post(`/conversations/${st.conversation_id}/messages/stream`, payload, {
        responseType: "text"
      });
      const parsed_done = this.sse(stream_res?.data);
      const reply_content = parsed_done?.character_message?.content || parsed_done?.content || "";
      this.log("chat", `reply received (${reply_content.length} chars, ${parsed_done?.chunks?.length || 0} chunks)`);
      return this.out(true, {
        conversation_id: st.conversation_id,
        character_id: st.character_id,
        reply_text: reply_content,
        resolved_media: media_list,
        pushed_messages: msg_list,
        chunks: parsed_done?.chunks || [],
        ...parsed_done
      }, st);
    } catch (err) {
      this.log("chat_err", err?.response?.data?.message || err?.message || "chat_failed");
      return this.out(false, {
        error_message: err?.response?.data?.message || err?.message || "chat_failed",
        error_detail: err?.response?.data || null
      }, st);
    }
  }
  async glimp({
    state,
    ...rest
  } = {}) {
    let st = this.dec(state);
    try {
      const has_target = Boolean(rest?.conversation_id || rest?.character_id || rest?.slug || st?.conversation_id || st?.character_id);
      if (!has_target) {
        this.log("glimp_val", "validation failed: conversation_id, character_id, or slug is required");
        return this.out(false, {
          error_message: "conversation_id, character_id, or slug is required"
        }, st);
      }
      if (rest?.width !== undefined && (Number.isNaN(Number(rest.width)) || Number(rest.width) < 1)) {
        this.log("glimp_val", "validation failed: width must be >= 1");
        return this.out(false, {
          error_message: "width must be a positive number >= 1"
        }, st);
      }
      this.log("glimp", "starting glimpse generation...");
      const sess = await this.mk(st);
      st = sess?.state || st;
      if (!sess?.ok) {
        return this.out(false, {
          error_message: sess?.error_message || "auth_failed",
          error_detail: sess?.error_detail || null
        }, st);
      }
      let char_id = st?.character_id || "";
      if (!rest?.conversation_id && !st?.conversation_id) {
        const char_res = await this.chr(rest?.character_id || rest?.slug || "", st);
        if (!char_res?.ok || !char_res?.character_id) {
          return this.out(false, {
            error_message: char_res?.error_message || "character_resolve_failed",
            error_detail: char_res?.error_detail || null
          }, st);
        }
        char_id = char_res.character_id;
      }
      const conv_res = await this.cnv(char_id, st, rest?.conversation_id);
      if (!conv_res?.ok || !conv_res?.conversation_id) {
        return this.out(false, {
          error_message: conv_res?.error_message || "conversation_init_failed",
          error_detail: conv_res?.error_detail || null
        }, st);
      }
      const conv_id = conv_res.conversation_id;
      st.character_id = conv_res.character_id || char_id;
      st.conversation_id = conv_id;
      const start_res = await this.api.post(`/conversations/${conv_id}/glimpse`, {
        client_timezone: rest?.client_timezone || this.tz
      });
      const start_data = start_res?.data || {};
      const job_id = start_data?.job_id || "";
      const asset_id = start_data?.asset_id || "";
      if (!job_id) {
        return this.out(false, {
          error_message: "missing_glimpse_job_id",
          error_detail: start_data
        }, st);
      }
      this.log("glimp", `glimpse job started: ${job_id}`);
      let job_data = {};
      while (true) {
        const job_res = await this.api.get(`/media/jobs/${job_id}`);
        job_data = job_res?.data || {};
        this.log("glimp", `job ${job_id} status=${job_data?.status || "unknown"}`);
        if (job_data?.status === "succeeded" || job_data?.status === "failed") {
          break;
        }
        await this.slp(this.poll_ms);
      }
      let access_data = {};
      const final_asset_id = job_data?.asset_id || asset_id;
      if (job_data?.status === "succeeded" && final_asset_id) {
        try {
          const width = Number(rest?.width) > 0 ? Number(rest.width) : 512;
          const acc_res = await this.api.get(`/media/private/${final_asset_id}/access`, {
            params: {
              w: width
            }
          });
          access_data = acc_res?.data || {};
        } catch (acc_err) {
          this.log("glimp_warn", `access url fetch skipped: ${acc_err?.message || "error"}`);
        }
      }
      return this.out(job_data?.status === "succeeded", {
        conversation_id: conv_id,
        job_id: job_id,
        asset_id: final_asset_id,
        message_id: start_data?.message_id || "",
        job_status: job_data?.status || "",
        variant_url: access_data?.url || "",
        variant_expires_at: access_data?.expires_at || "",
        ...job_data
      }, st);
    } catch (err) {
      this.log("glimp_err", err?.response?.data?.message || err?.message || "glimp_failed");
      return this.out(false, {
        error_message: err?.response?.data?.message || err?.message || "glimp_failed",
        error_detail: err?.response?.data || null
      }, st);
    }
  }
}
async function handler(req, res) {
  const raw_input = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};
  const {
    action,
    ...params
  } = raw_input || {};
  const valid_actions = ["feed", "search", "chat", "glimp", "init"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          init: "/?action=init (Inisialisasi akun & state baru)",
          feed: "/?action=feed&mode=all&gender=all&limit=20",
          search: "/?action=search&query=luca&page=1&per_page=20",
          chat: "/?action=chat&slug=luca&prompt=Halo (POST: { prompt, messages, media, slug, state })",
          glimp: "/?action=glimp&slug=luca&width=512 (POST: { conversation_id, character_id, slug, width, state })"
        }
      }
    });
  }
  if (!valid_actions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: valid_actions
    });
  }
  const api = new PalumaClient();
  try {
    let response;
    switch (action) {
      case "init": {
        const sess = await api.mk(params?.state);
        if (!sess?.ok) {
          return res.status(502).json({
            status: false,
            action: action,
            error: sess?.error_message || "Gagal menginisialisasi sesi Paluma.",
            result: {
              error_message: sess?.error_message || "init_failed",
              error_detail: sess?.error_detail || null
            },
            state: api.enc(sess?.state || {})
          });
        }
        response = {
          status: true,
          result: {
            user_id: sess?.state?.user_id || "",
            username: sess?.state?.username || "",
            email: sess?.state?.email || "",
            expires_at: sess?.state?.expires_at || 0,
            message: "Sesi berhasil diinisialisasi."
          },
          state: api.enc(sess?.state || {})
        };
        break;
      }
      case "feed": {
        if (params?.limit !== undefined && (Number.isNaN(Number(params.limit)) || Number(params.limit) < 1)) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'limit' harus berupa angka >= 1."
          });
        }
        response = await api.feed({
          state: params?.state,
          ...params
        });
        break;
      }
      case "search": {
        const query_val = String(params?.query ?? params?.q ?? "").trim();
        if (!query_val) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi string non-kosong."
          });
        }
        response = await api.search({
          state: params?.state,
          query: query_val,
          ...params
        });
        break;
      }
      case "chat": {
        let parsed_messages = params?.messages;
        if (typeof parsed_messages === "string" && parsed_messages.trim().startsWith("[")) {
          try {
            parsed_messages = JSON.parse(parsed_messages);
          } catch (_) {}
        }
        let parsed_media = params?.media;
        if (typeof parsed_media === "string" && parsed_media.trim().startsWith("[")) {
          try {
            parsed_media = JSON.parse(parsed_media);
          } catch (_) {}
        }
        const has_prompt = typeof params?.prompt === "string" && params.prompt.trim() !== "";
        const has_messages = Array.isArray(parsed_messages) ? parsed_messages.length > 0 : Boolean(parsed_messages && String(parsed_messages).trim() !== "");
        const has_media = Array.isArray(parsed_media) ? parsed_media.length > 0 : Boolean(parsed_media);
        if (!has_prompt && !has_messages && !has_media) {
          return res.status(400).json({
            status: false,
            error: "Minimal salah satu dari 'prompt', 'messages', atau 'media' wajib diisi."
          });
        }
        response = await api.chat({
          ...params,
          state: params?.state,
          prompt: params?.prompt,
          messages: parsed_messages,
          media: parsed_media
        });
        break;
      }
      case "glimp": {
        const decoded_state = api.dec(params?.state);
        const has_target = Boolean(params?.conversation_id || params?.character_id || params?.slug || decoded_state?.conversation_id || decoded_state?.character_id);
        if (!has_target) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'conversation_id', 'character_id', 'slug', atau 'state' dengan conversation/character aktif wajib diisi."
          });
        }
        if (params?.width !== undefined && (Number.isNaN(Number(params.width)) || Number(params.width) < 1)) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'width' harus berupa angka >= 1."
          });
        }
        response = await api.glimp({
          state: params?.state,
          ...params
        });
        break;
      }
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response || !response.status) {
      return res.status(502).json({
        status: false,
        action: action,
        error: response?.result?.error_message || response?.result?.error || "Gagal memproses permintaan ke server target.",
        result: response?.result || null,
        state: response?.state || null
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error?.message || "Unknown Error"
    });
  }
}
export default withApiLog(withRateLimit(handler));