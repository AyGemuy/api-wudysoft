import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import WebSocket from "ws";
const BASE = "https://gpt-solve-api.chatartpro.com";
const WSS = "wss://gpt-solve-ws.chatartpro.com";
const L = (t, ...a) => console.log(`[${t}]`, ...a);
const MODELS = ["gpt-4", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini", "deepseek-v3", "deepseek-r1", "gemini-1.5-pro", "gemini-pro", "claude-3-5-sonnet"];
const MDL_DEF = "gpt-4";
const MDL_FAST = "gpt-4o-mini";
const CONCAT_KEYS = new Set(["message", "reasoning_message"]);
class GptSolve {
  constructor() {
    this.ax = axios.create({
      baseURL: BASE
    });
  }
  uid() {
    try {
      const h = crypto.randomBytes(16).toString("hex").toUpperCase();
      const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
      L("uid", id);
      return id;
    } catch (e) {
      L("uid", "err:", e.message);
      throw e;
    }
  }
  mdl(model, fast) {
    try {
      const m = model || (fast ? MDL_FAST : MDL_DEF);
      if (!MODELS.includes(m)) throw new Error(`unknown model "${m}". valid: ${MODELS.join(" | ")}`);
      L("mdl", m);
      return m;
    } catch (e) {
      L("mdl", "err:", e.message);
      throw e;
    }
  }
  hdr(id, tok = "") {
    try {
      return {
        "User-Agent": "android",
        "Accept-Encoding": "gzip",
        language: "ID",
        version: "2.0.2.6",
        "app-type": "1",
        "identity-id": id,
        "app-market": "",
        "user-type": "android",
        token: tok
      };
    } catch (e) {
      L("hdr", "err:", e.message);
      throw e;
    }
  }
  enc(s) {
    try {
      const b = Buffer.from(JSON.stringify(s)).toString("base64");
      L("enc", "ok · uuid:", s?.uuid);
      return b;
    } catch (e) {
      L("enc", "err:", e.message);
      throw e;
    }
  }
  dec(b) {
    try {
      const s = JSON.parse(Buffer.from(b, "base64").toString());
      L("dec", "ok · uuid:", s?.uuid);
      return s;
    } catch (e) {
      L("dec", "err:", e.message);
      return null;
    }
  }
  mrg(acc, frame) {
    try {
      for (const [k, v] of Object.entries(frame)) {
        if (!(k in acc)) {
          acc[k] = v;
          continue;
        }
        if (CONCAT_KEYS.has(k) && typeof v === "string") acc[k] += v;
        else if (Array.isArray(v)) acc[k] = v.length ? v : acc[k];
        else if (v !== null && typeof v === "object") acc[k] = {
          ...acc[k],
          ...v
        };
        else acc[k] = v;
      }
      return acc;
    } catch (e) {
      L("mrg", "err:", e.message);
      throw e;
    }
  }
  async auth(deviceId) {
    try {
      deviceId = deviceId || this.uid();
      L("auth", "device:", deviceId);
      const body = new URLSearchParams({
        source_site: "google_play",
        identity_id: deviceId
      });
      const res = await this.ax.post("/v1/user/device_login", body.toString(), {
        headers: {
          ...this.hdr(deviceId),
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      const d = res.data?.data;
      if (!d?.token) throw new Error("no token returned");
      L("auth", "ok · uuid:", d.uuid, "· member:", d.member_id);
      return {
        deviceId: d.device_id || deviceId,
        token: d.token,
        uuid: d.uuid,
        memberId: d.member_id
      };
    } catch (e) {
      L("auth", "err:", e?.response?.data || e.message);
      throw e;
    }
  }
  async solv(item) {
    try {
      if (Buffer.isBuffer(item)) {
        L("solv", "buffer · bytes:", item.length);
        return item;
      }
      if (typeof item !== "string") throw new Error("unsupported media type");
      if (/^data:[^;]+;base64,/.test(item)) {
        L("solv", "dataURI");
        return Buffer.from(item.split(",")[1], "base64");
      }
      if (/^https?:\/\//.test(item)) {
        L("solv", "url fetch:", item);
        const r = await axios.get(item, {
          responseType: "arraybuffer"
        });
        L("solv", "fetched · bytes:", r.data.byteLength);
        return Buffer.from(r.data);
      }
      L("solv", "plain base64");
      return Buffer.from(item, "base64");
    } catch (e) {
      L("solv", "err:", e.message);
      throw e;
    }
  }
  async up(buf, deviceId, tok, name = `file_${Date.now()}.jpeg`) {
    try {
      L("up", "file:", name, "· bytes:", buf.length);
      const fd = new FormData();
      fd.append("type", "7", {
        header: {
          "content-transfer-encoding": "binary",
          "content-type": "application/json; charset=UTF-8"
        }
      });
      fd.append("file", buf, {
        filename: name,
        contentType: "multipart/form-data"
      });
      const res = await this.ax.post("/v1/chat_gpt/upload_file", fd, {
        headers: {
          ...this.hdr(deviceId, tok),
          ...fd.getHeaders(),
          "Content-Type": "application/multipart-formdata"
        }
      });
      const d = res.data?.data;
      if (!d?.url && !d?.url_id) throw new Error("no url in upload response");
      L("up", "ok · url:", d.url || d.url_id);
      return d.url || String(d.url_id);
    } catch (e) {
      L("up", "err:", e?.response?.data || e.message);
      throw e;
    }
  }
  async send(sess, {
    prompt,
    model,
    fast,
    search,
    think,
    urlIds,
    roomId
  }) {
    try {
      const gpt = this.mdl(model, fast);
      L("send", `model:${gpt} room:${roomId || "new"} search:${search ? 1 : 0} think:${think ? 1 : 0}`);
      const res = await this.ax.post("/v2/chat_gpt/chat", {
        ai_search: search ? 1 : 0,
        gpt_type: gpt,
        is_think: think ? 1 : 0,
        keyword: prompt,
        room_id: roomId || 0,
        url_ids: urlIds || []
      }, {
        headers: {
          ...this.hdr(sess.deviceId, sess.token),
          "Content-Type": "application/json"
        }
      });
      const d = res.data?.data;
      if (!d?.data?.[0]?.id) throw new Error("no streamId in response");
      L("send", "ok · streamId:", d.data[0].id, "· roomId:", d.room_id);
      return {
        streamId: d.data[0].id,
        roomId: d.room_id
      };
    } catch (e) {
      L("send", "err:", e?.response?.data || e.message);
      throw e;
    }
  }
  async strm(sess, streamId) {
    L("strm", "connect · streamId:", streamId);
    return new Promise((res, rej) => {
      try {
        const ws = new WebSocket(WSS, {
          headers: {
            token: sess.token,
            Language: "TW",
            Identity: sess.deviceId,
            "App-Type": "1",
            version: "1.3.0",
            "User-Type": "android",
            "User-Agent": "okhttp/4.12.0"
          }
        });
        let acc = {},
          done = false;
        const fin = () => {
          if (done) return;
          done = true;
          process.stdout.write("\n");
          L("strm", "done · keys:", Object.keys(acc).join(", "));
          L("strm", "chars:", acc.message?.length ?? 0);
          ws.close();
          res(acc);
        };
        ws.on("open", () => {
          try {
            L("strm", "open · subscribe streamId:", streamId);
            ws.send(JSON.stringify({
              chat_type: 1,
              identity_id: sess.deviceId,
              stream_id: streamId
            }));
          } catch (e) {
            L("strm", "send err:", e.message);
            rej(e);
          }
        });
        ws.on("message", raw => {
          try {
            const str = raw.toString();
            if (str === "链接成功") {
              L("strm", "confirmed");
              return;
            }
            const m = JSON.parse(str);
            if (m?.status === "end" || m?.message?.includes("[Txx-DONE]")) {
              fin();
              return;
            }
            if (m?.status === "running") {
              process.stdout.write(m?.message || "");
              this.mrg(acc, m);
            }
          } catch (e) {
            L("strm", "msg skip:", e.message);
          }
        });
        ws.on("error", e => {
          L("strm", "err:", e.message);
          rej(e);
        });
        ws.on("close", () => {
          if (!done) fin();
        });
      } catch (e) {
        L("strm", "init err:", e.message);
        rej(e);
      }
    });
  }
  async chat({
    state,
    prompt,
    model,
    fast,
    search,
    think,
    media,
    roomId,
    ...rest
  }) {
    L("chat", "start");
    try {
      let sess = state ? this.dec(state) : null;
      if (!sess?.token) {
        L("chat", "no valid session → auto login");
        sess = await this.auth();
      } else {
        L("chat", "reuse session · uuid:", sess?.uuid);
      }
      const rid = roomId ?? sess?.roomId ?? 0;
      L("chat", "roomId:", rid || "new");
      const urlIds = [];
      if (media) {
        const items = Array.isArray(media) ? media : [media];
        L("chat", "media items:", items.length);
        for (const item of items) {
          const buf = await this.solv(item);
          const url = await this.up(buf, sess.deviceId, sess.token);
          urlIds.push(url);
        }
      }
      const {
        streamId,
        roomId: newRoom
      } = await this.send(sess, {
        prompt: prompt,
        model: model,
        fast: fast,
        search: search,
        think: think,
        urlIds: urlIds,
        roomId: rid
      });
      const result = await this.strm(sess, streamId);
      sess.roomId = newRoom;
      L("chat", "ok · roomId:", newRoom);
      return {
        ...result,
        roomId: newRoom,
        state: this.enc(sess)
      };
    } catch (e) {
      L("chat", "err:", e.message);
      throw e;
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
  const api = new GptSolve();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}