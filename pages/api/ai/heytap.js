import axios from "axios";
import {
  randomUUID,
  randomBytes
} from "crypto";
class HeyTap {
  constructor() {
    this.base = "https://browser-ai-id.heytapmobile.com/v1/chat/completions";
    this.ua = "Mozilla/5.0 (Linux; U; Android 15; id-id; RMX3890 Build/AQ3A.240812.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.72 Mobile Safari/537.36 HeyTapBrowser/45.13.8.1";
    this.gaid = randomUUID();
    this.openid = `/${this.gaid}//${randomBytes(32).toString("hex").toUpperCase()}`;
    this.sid = `s_${Date.now()}_${randomBytes(5).toString("hex")}`;
    this.model = "modelMarket";
    this.http = axios.create({
      baseURL: this.base,
      headers: {
        "User-Agent": this.ua,
        Accept: "text/event-stream",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Content-Type": "application/json",
        "app-pkg": "com.heytap.browser",
        "sec-ch-ua": '"Android WebView";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        nt: "4G",
        ov: "15",
        r: "ID",
        versionname: "45.13.8.1",
        bc: "realme",
        dv: "RMX3890",
        cov: "unknown",
        enterid: "browser",
        entermod: "bottomBar",
        sl: "id-ID",
        "app-version": "1381000",
        origin: "https://actimg.heytapimg.com",
        referer: "https://actimg.heytapimg.com/",
        "x-requested-with": "com.heytap.browser",
        "sec-fetch-site": "cross-site",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        priority: "u=1, i"
      }
    });
  }
  async resolve(media) {
    try {
      console.log("[heytap] resolving media...");
      let buf, mime, name;
      if (typeof media === "string" && media.startsWith("http")) {
        console.log("[heytap] fetch url:", media);
        const r = await axios.get(media, {
          responseType: "arraybuffer"
        });
        buf = Buffer.from(r.data);
        mime = r.headers["content-type"] || "image/jpeg";
        name = media.split("/").pop().split("?")[0] || "file.jpg";
      } else if (typeof media === "string") {
        const m = media.match(/^data:([^;]+);base64,(.+)/);
        mime = m?.[1] || "image/jpeg";
        buf = Buffer.from(m?.[2] || media, "base64");
        name = "upload." + (mime.split("/")[1] || "jpg");
      } else {
        buf = media;
        mime = "image/jpeg";
        name = "upload.jpg";
      }
      console.log("[heytap] resolved:", name, mime, buf.length, "bytes");
      return {
        buf: buf,
        mime: mime,
        name: name
      };
    } catch (e) {
      console.error("[heytap] resolve error:", e.message);
      throw e;
    }
  }
  async upload(media) {
    try {
      const {
        buf,
        mime,
        name
      } = await this.resolve(media);
      const form = new FormData();
      form.append("file", new Blob([buf], {
        type: mime
      }), name);
      console.log("[heytap] uploading:", name);
      const res = await axios.post(`${this.base}/fileUpload`, form, {
        headers: {
          "User-Agent": this.ua,
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "sec-ch-ua": '"Android WebView";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          openid: this.openid,
          r: "ID",
          clientreqid: String(Date.now()),
          origin: "https://actimg.heytapimg.com",
          referer: "https://actimg.heytapimg.com/",
          "x-requested-with": "com.heytap.browser",
          "sec-fetch-site": "cross-site",
          "sec-fetch-mode": "cors",
          "sec-fetch-dest": "empty",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          priority: "u=1, i"
        }
      });
      const url = res.data?.data?.url;
      console.log("[heytap] upload ok:", url);
      return {
        url: url,
        mime: mime,
        name: name
      };
    } catch (e) {
      console.error("[heytap] upload error:", e.message);
      throw e;
    }
  }
  parse(raw) {
    try {
      let result = "";
      let info = {};
      for (const line of (raw || "").split("\n")) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        try {
          const j = JSON.parse(t.slice(5));
          const delta = j.choices?.[0]?.delta;
          if (delta?.content) result += delta.content;
          if (j.choices?.[0]?.finish_reason === "stop") {
            info = {
              id: j.id,
              conversationId: j.conversationId,
              usage: j.usage || null,
              model: j.usage?.model || null,
              serverTransparent: j.serverTransparent ? JSON.parse(j.serverTransparent) : null
            };
          }
        } catch {}
      }
      return {
        result: result,
        info: info
      };
    } catch (e) {
      console.error("[heytap] parse error:", e.message);
      throw e;
    }
  }
  async chat({
    prompt,
    media,
    messages,
    ...rest
  }) {
    try {
      const history = messages ? [...messages] : [];
      const otherInfo = {};
      if (media) {
        const files = Array.isArray(media) ? media : [media];
        const fileInfos = [];
        for (const m of files) {
          const {
            url,
            mime,
            name
          } = await this.upload(m);
          fileInfos.push({
            url: url,
            mime: mime,
            name: name,
            size: "unknown"
          });
        }
        otherInfo.chatType = 1;
        otherInfo.fileInfos = fileInfos;
      }
      history.push({
        role: "user",
        content: prompt,
        ...Object.keys(otherInfo).length ? {
          otherInfo: otherInfo
        } : {}
      });
      const payload = {
        model: rest.model || this.model,
        agent: rest.agent || "",
        messages: history,
        stream: true
      };
      console.log("[heytap] chat send, msgs:", history.length);
      const res = await this.http.post("", payload, {
        headers: {
          openid: this.openid,
          gaid: this.gaid,
          sessionid: this.sid,
          clientreqid: String(Date.now())
        },
        responseType: "text"
      });
      const {
        result,
        info
      } = this.parse(res.data);
      history.push({
        role: "model",
        content: result
      });
      console.log("[heytap] chat done, tokens:", info.usage?.totalTokens);
      return {
        result: result,
        history: history,
        ...info
      };
    } catch (e) {
      console.error("[heytap] chat error:", e.message);
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
  const api = new HeyTap();
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