import crypto from "crypto";
import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import SpoofHead from "@/lib/spoof-head";
class EdgeOne {
  constructor() {
    this.jar = new CookieJar();
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://pages.edgeone.ai",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://pages.edgeone.ai/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-csrfcode": this.uuid(),
      ...SpoofHead()
    };
    this.req = wrapper(axios.create({
      baseURL: "https://api.edgeone.ai",
      jar: this.jar,
      withCredentials: true,
      headers: this.headers
    }));
  }
  async deploy({
    html,
    name,
    ...rest
  }) {
    const proj = name || `site-${crypto.randomUUID().split("-")[0]}`;
    console.log(`[1/6] Start: ${proj}`);
    let buf;
    try {
      buf = await this.procIn(html);
      console.log(`[2/6] Input: ${buf.length} bytes`);
    } catch (e) {
      console.error(`[2/6] procIn failed: ${e.message}`);
      throw e;
    }
    let initTkn;
    try {
      initTkn = await this.getInit();
      console.log(`[3/6] Init token OK`);
    } catch (e) {
      console.error(`[3/6] getInit failed: ${e.message}`);
      throw e;
    }
    let sessData;
    try {
      sessData = await this.getSess(initTkn, proj);
      console.log(`[4/6] Session OK (bucket: ${sessData.bucket})`);
    } catch (e) {
      console.error(`[4/6] getSess failed: ${e.message}`);
      throw e;
    }
    const {
      creds,
      sessTkn,
      exp,
      path,
      bucket
    } = sessData;
    const key = `${path}/index.html`;
    try {
      await this.upCOS(creds, bucket, key, buf);
      console.log(`[5/6] Upload OK`);
    } catch (e) {
      console.error(`[5/6] upCOS failed: ${e.message}`);
      throw e;
    }
    let deployIds;
    try {
      deployIds = await this.crtDpl(sessTkn, exp, proj, key);
      console.log(`[6/6] Deploy ID: ${deployIds.did}`);
    } catch (e) {
      console.error(`[6/6] crtDpl failed: ${e.message}`);
      throw e;
    }
    let result;
    try {
      result = await this.poll(sessTkn, exp, deployIds.pid, deployIds.did);
      console.log(`Done: ${result?.ProjectUrl}`);
    } catch (e) {
      console.error(`Poll failed: ${e.message}`);
      throw e;
    }
    return result;
  }
  async getInit() {
    try {
      const res = await this.req.post("/common/doc-assistant", {
        type: "en",
        platform: "pages"
      });
      if (res.data?.code !== 0) throw new Error(res.data?.message || "Init token failed");
      return res.data.data.Token;
    } catch (e) {
      throw new Error(`getInit: ${e.message}`);
    }
  }
  async getSess(tkn, proj) {
    try {
      const res = await this.req.post("/pages-public/describe_temp_token", {
        Token: tkn,
        ProjectName: proj
      });
      if (res.data?.code !== 0) throw new Error(res.data?.message || "Get session failed");
      const d = res.data.data;
      return {
        creds: d.Response.Credentials,
        path: d.Response.TargetPath,
        bucket: d.Response.Bucket,
        sessTkn: d.Token,
        exp: d.Expired
      };
    } catch (e) {
      throw new Error(`getSess: ${e.message}`);
    }
  }
  async upCOS(c, bkt, key, buf) {
    try {
      const host = `${bkt}.cos.accelerate.myqcloud.com`;
      const url = `https://${host}/${key}`;
      const now = Math.floor(Date.now() / 1e3);
      const exp = now + 1800;
      const kt = `${now};${exp}`;
      const signKey = crypto.createHmac("sha1", c.TmpSecretKey).update(kt).digest("hex");
      const httpStr = `put\n/${key}\n\ncontent-length=${buf.length}&host=${host}\n`;
      const strToSign = `sha1\n${kt}\n${crypto.createHash("sha1").update(httpStr).digest("hex")}\n`;
      const sig = crypto.createHmac("sha1", signKey).update(strToSign).digest("hex");
      const auth = `q-sign-algorithm=sha1&q-ak=${c.TmpSecretId}&q-sign-time=${kt}&q-key-time=${kt}&q-header-list=content-length;host&q-url-param-list=&q-signature=${sig}`;
      await axios.put(url, buf, {
        headers: {
          Authorization: auth,
          "x-cos-security-token": c.Token,
          "Content-Type": "text/html",
          "Content-Length": buf.length,
          Host: host,
          "User-Agent": this.headers["user-agent"],
          Origin: this.headers["origin"],
          Referer: this.headers["referer"]
        }
      });
    } catch (e) {
      throw new Error(`upCOS: ${e.message}`);
    }
  }
  async crtDpl(tkn, exp, proj, path) {
    try {
      const cookieVal = `anonymous_token=${tkn}; anonymous_token_expired=${exp}`;
      const res = await this.req.post("/pages-public/create_deployment", {
        ProjectName: proj,
        DistType: "File",
        Token: tkn,
        TempBucketPath: path
      }, {
        headers: {
          Cookie: cookieVal
        }
      });
      if (res.data?.code !== 0) throw new Error(res.data?.message || "Create deploy failed");
      return {
        pid: res.data.data.Response.ProjectId,
        did: res.data.data.Response.DeploymentId
      };
    } catch (e) {
      throw new Error(`crtDpl: ${e.message}`);
    }
  }
  async poll(tkn, exp, pid, did) {
    const cookieVal = `anonymous_token=${tkn}; anonymous_token_expired=${exp}`;
    for (let i = 0; i < 120; i++) {
      try {
        const res = await this.req.post("/pages-public/describe_deployment", {
          ProjectId: pid,
          DeploymentIds: [did],
          Token: tkn
        }, {
          headers: {
            Cookie: cookieVal
          }
        });
        const st = res.data?.data?.Response?.Deployment;
        if (st?.Status === "Success") return st;
        if (st?.Status === "Failed") throw new Error(st.Message || "Deployment failed");
      } catch (e) {
        if (e.message.startsWith("Deployment failed")) throw e;
        console.error(`Poll attempt ${i + 1} error: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 3e3));
    }
    throw new Error("Poll timeout");
  }
  async procIn(val) {
    try {
      if (Buffer.isBuffer(val)) return val;
      if (typeof val === "string" && val.startsWith("http")) {
        const res = await axios.get(val, {
          responseType: "arraybuffer"
        });
        return Buffer.from(res.data);
      }
      const b64Rgx = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
      if (typeof val === "string" && val.length > 100 && !val.trim().startsWith("<") && b64Rgx.test(val)) {
        return Buffer.from(val, "base64");
      }
      return Buffer.from(val, "utf-8");
    } catch (e) {
      throw new Error(`procIn: ${e.message}`);
    }
  }
  uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : r & 3 | 8).toString(16);
    });
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.html) {
    return res.status(400).json({
      error: "Parameter 'html' diperlukan"
    });
  }
  const api = new EdgeOne();
  try {
    const data = await api.deploy(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}