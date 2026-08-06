import axios from "axios";
import crypto from "crypto";
import vm from "vm";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy untuk SaveFromNet:", proxy);
class SaveFromNet {
  constructor() {
    this.tsDef = 1784920538160;
    this.tscDef = 0;
    this.saltHex = "d3ed32bcc2bdb52ef772f727d6eb6fc3554c7e4dfc6933b493c784c02b433e3c";
    this.commonHeaders = {
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _sign(url, ts) {
    try {
      console.log("[PROSES] Menggenerate signature SHA-256 murni untuk SaveFromNet...");
      const strMentah = `${url}${ts}${this.saltHex}`;
      return crypto.createHash("sha256").update(strMentah).digest("hex");
    } catch (err) {
      console.error("[ERROR] Gagal generate signature SHA-256 SaveFromNet:", err.message);
      return null;
    }
  }
  async _msec() {
    try {
      console.log("[PROSES] Mengambil nilai msec SaveFromNet via Axios...");
      const response = await axios.get(`${proxy}https://en1.savefrom.net/msec`, {
        headers: {
          ...this.commonHeaders,
          accept: "*/*",
          referer: "https://en1.savefrom.net/savefrom.php",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      return response.data?.msec || null;
    } catch (err) {
      console.error("[ERROR] Gagal mengambil msec server SaveFromNet:", err.message);
      return null;
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log("[PROSES] Memulai alur download SaveFromNet untuk URL:", url);
      const msec = await this._msec();
      let ts;
      if (msec) {
        console.log(`[SUKSES] msec didapat: ${msec}`);
        ts = typeof msec === "number" && msec < 1e11 ? Math.floor(msec * 1e3) - 1584 : Math.floor(msec);
      } else {
        ts = Date.now();
        console.log(`[WARNING] msec gagal didapat, menggunakan timestamp lokal: ${ts}`);
      }
      const s = this._sign(url, ts);
      if (!s) {
        return {
          success: false,
          error: "Gagal membuat signature SHA-256 SaveFromNet"
        };
      }
      console.log(`[SUKSES] ts dihitung: ${ts}, _s: ${s}`);
      const defaultPayload = {
        sf_url: url,
        sf_submit: "",
        new: "2",
        lang: "en",
        app: "",
        country: "id",
        os: "Android",
        browser: "Chrome",
        channel: "main",
        "sf-nomad": "1",
        url: url,
        ts: ts.toString(),
        _ts: this.tsDef.toString(),
        _tsc: this.tscDef.toString(),
        _s: s,
        _x: "1"
      };
      const finalPayload = {
        ...defaultPayload,
        ...rest
      };
      const payload = new URLSearchParams(finalPayload);
      console.log("[PROSES] Mengirim payload Form-UrlEncoded ke endpoint worker SaveFromNet...");
      const response = await axios.post(`${proxy}https://worker.savefrom.net/savefrom.php`, payload.toString(), {
        headers: {
          ...this.commonHeaders,
          accept: "application/json, text/plain, */*",
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://en1.savefrom.net",
          referer: "https://en1.savefrom.net/",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      console.log("[SUKSES] Respons asli dari worker SaveFromNet berhasil didapatkan.");
      const jsResponse = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
      let resultData = null;
      let errorMessage = null;
      const sfMock = {
        videoResult: {
          show: res => {
            resultData = res;
          },
          showRows: res => {
            resultData = res;
          }
        },
        finishRequest: () => {},
        enableElement: () => {},
        result: {
          show: res => {
            if (res && res.success === false) {
              errorMessage = res.html || "Download links not found";
            } else {
              resultData = res;
            }
          },
          showEmptyResult: res => {
            errorMessage = res && res.html || "Download link not found";
          }
        }
      };
      const context = {
        window: null,
        location: {
          hostname: "en1.savefrom.net"
        },
        frameElement: {},
        atob: base64 => Buffer.from(base64, "base64").toString(),
        _decodeURIComponent: uri => decodeURIComponent(uri)
      };
      context.window = context;
      context.parent = {
        sf: sfMock,
        document: {
          location: {
            hostname: "en1.savefrom.net"
          },
          getElementById: () => ({
            innerHTML: "mock"
          }),
          body: {
            firstChild: null,
            removeChild: () => {}
          }
        }
      };
      context.document = context.parent.document;
      console.log("[PROSES] Mengeksekusi JS payload dalam VM sandbox...");
      vm.createContext(context);
      const script = new vm.Script(`decodeURIComponent=_decodeURIComponent;${jsResponse}`);
      script.runInContext(context);
      if (errorMessage) {
        return {
          success: false,
          error: errorMessage.replace(/<[^>]*>/g, "")
        };
      }
      if (!resultData) {
        return {
          success: false,
          error: "Gagal mengekstrak link download dari respons SaveFromNet"
        };
      }
      return resultData;
    } catch (err) {
      console.error("[FATAL ERROR] Terjadi kegagalan pada method download SaveFromNet:", err.message);
      return {
        success: false,
        error: err.message,
        output: err.response ? err.response.data : null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new SaveFromNet();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL SaveFromNet";
    return res.status(500).json({
      error: errorMessage
    });
  }
}