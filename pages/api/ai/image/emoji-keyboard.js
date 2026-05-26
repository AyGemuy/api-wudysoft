import axios from "axios";
import FormData from "form-data";
import {
  randomBytes,
  createHash
} from "crypto";
class EmojiKeyboardAI {
  constructor() {
    this.base = "https://chat.emoji-keyboard.com/api/v1";
    this.key = "03790257ca9d3ed1";
    this.pkg = "com.mlink.ai.chat.assistant.robot";
    this.ver = "212";
    this.ua = "aichat Android 212";
    this.uid = "";
    this.certString = "com.mlink.ai.chat.assistant.robot3082036930820251a00302010202040b08be3f300d06092a864886f70d01010b05003064310b3009060355040613023031310b3009060355040813024341310b3009060355040713024c4131143012060355040a130b414943686174205465616d31143012060355040b130b414943686174205465616d310f300d060355040313064149436861743020170d3233303431303132353735375a180f32313232303331373132353735375a3064310b3009060355040613023031310b3009060355040813024341310b3009060355040713024c4131143012060355040a130b414943686174205465616d31143012060355040b130b414943686174205465616d310f300d0603550403130641494368617430820122300d06092a864886f70d01010105000382010f003082010a0282010100c450b833e9af7e896442a58a418a4f7bd16c3181515511284e6c199cdb799f34647907e01424c3085acb64cba2ea7cac2433a86fee03aabde3917f701d3265d2bcda0ac8101333aa03281325030d6fdf579ad4d5599af8133c8f9818f43a9f84912e9e90790c112c6a998e4e45f468fa7ff075e4a5c46d4094031821021eabfbd21d414d72fd2407351bdb7972d24df32d0767e93aa2dbe163e5cd12b3f4d7a95cd570b849bc402b9ee6d6728e3263711f5f677ae6178e80bb6dfaa215f31c0e0be5e4be6606e8ce094c8ca37634d13fdb588b95292f56cb2b9ce5a31298b58ab68da0d2fa033ee7141fbb06ea764bb4c121948a76945d26ab1a0be00009548f0203010001a321301f301d0603551d0e04160414be147be7011daae3306f650af160d869b4a12a25300d06092a864886f70d01010b050003820101009eb8828f379ed6b1f637ccc6abbbbc908e6b015dbd4b79bc6f1be29c2274d712eaa66f6c3093c6eb3b2301d84075faf1bde04bf5cb6b6050d7439a52b54b40ac1069c668a88eb7397be6c09767d69a7d0e1fbb8eab53a6c4ef5849cefb81d9d7424de8c26a368c02ee180fcc2286d25e622b280198a263716660a13d23a22bb138718ee982c9f9dc6c5902e4c05c9627c34fcd322bc250bb14a863c204d29a43bebc384a18bb6870f78ff32c08e12bd3747ac369714bbb30ede34c242fdcabefa552c5bff08f4c6040a94884dffb0e09070593c25ed20da6273c84b2dbb70f78dbe1251e3d23aff83a7d185b32943805145aea6f29a19fa3c2089e42d6f8e4e8";
  }
  md5(str) {
    return createHash("md5").update(str, "utf8").digest("hex");
  }
  genUUIDv4() {
    const bytes = randomBytes(16);
    bytes[6] = bytes[6] & 15 | 64;
    bytes[8] = bytes[8] & 63 | 128;
    return bytes.toString("hex");
  }
  ts() {
    return Math.floor(Date.now() / 1e3);
  }
  wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  signH(timestamp) {
    const randkey = this.md5(`${timestamp}${this.uid}${this.key}`);
    const md5cipher = this.md5(this.certString + timestamp);
    return {
      "User-Agent": this.ua,
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
      Host: "chat.emoji-keyboard.com",
      "Content-Type": "application/json; charset=UTF-8",
      RANDKEY: randkey,
      TIMESTAMP: String(timestamp),
      "TIMESTAMP-Cipher": String(timestamp),
      UID: this.uid,
      "uid-Cipher": this.uid,
      "localeCountryCode-Cipher": "ID",
      "MD5-Cipher": md5cipher,
      "PACKAGE-Cipher": this.pkg,
      "simCountryCode-Cipher": "US",
      VERSION: this.ver,
      "version-Cipher": this.ver
    };
  }
  async reg() {
    try {
      this.uid = this.genUUIDv4();
      const bodyMd5 = this.md5(this.uid + this.key);
      const body = {
        md5: bodyMd5,
        uid: this.uid
      };
      const timestamp = this.ts();
      const headers = this.signH(timestamp);
      const res = await axios.post(`${this.base}/RegisterUser`, body, {
        headers: headers
      });
      console.log(`[REG] Success | UID: ${this.uid}`);
      return res.data;
    } catch (error) {
      console.error(`[REG] Error:`, error.response?.data || error.message);
      throw error;
    }
  }
  async submit({
    prompt,
    func = "logo",
    style = 40,
    proportion = "1:1",
    brand_name = "",
    ...rest
  } = {}) {
    try {
      const payloadData = {
        uid: this.uid,
        proportion: proportion,
        func: func,
        style: String(style),
        brand_name: brand_name,
        prompt: prompt,
        ...rest
      };
      const formMd5 = this.md5(`${payloadData.brand_name}${payloadData.func}${payloadData.prompt}${payloadData.proportion}${payloadData.style}${this.uid}${this.key}`);
      payloadData.md5 = formMd5;
      const timestamp = this.ts();
      const headers = this.signH(timestamp);
      const fd = new FormData();
      for (const [key, val] of Object.entries(payloadData)) {
        fd.append(key, val);
      }
      const res = await axios.post(`${this.base}/createJobLogo`, fd, {
        headers: {
          ...headers,
          ...fd.getHeaders()
        }
      });
      const reqId = res.data?.data?.request_id || "N/A";
      console.log(`[SUBMIT] Success | Request ID: ${reqId}`);
      return res.data;
    } catch (error) {
      console.error(`[SUBMIT] Error:`, error.response?.data || error.message);
      throw error;
    }
  }
  async pollStatus(requestId) {
    try {
      const queryMd5 = this.md5(`${requestId}${this.uid}${this.key}`);
      const timestamp = this.ts();
      const headers = this.signH(timestamp);
      delete headers["Content-Type"];
      const res = await axios.get(`${this.base}/GetAAGResult`, {
        headers: headers,
        params: {
          uid: this.uid,
          request_id: requestId,
          md5: queryMd5
        }
      });
      return res.data;
    } catch (error) {
      return null;
    }
  }
  async poll(requestId, interval = 3e3, max = 60) {
    for (let i = 1; i <= max; i++) {
      const r = await this.pollStatus(requestId);
      if (!r) {
        console.log(`[POLL #${i}/${max}] Network Error / No Response`);
        if (i < max) await this.wait(interval);
        continue;
      }
      const d = r?.data ?? {};
      const s = d?.status;
      const err = d?.err_code ?? 0;
      console.log(`[POLL #${i}/${max}] Status: ${s} | ErrCode: ${err}`);
      if (s === 1 && err === 0) {
        return {
          ok: true,
          url: d.image_url,
          urls: d.image_url_list ?? [d.image_url],
          data: r
        };
      }
      if (err !== 0 && s !== 0) {
        return {
          ok: false,
          s: "ERROR_CODE_RETURNED",
          err: err,
          data: r
        };
      }
      if (i < max) await this.wait(interval);
    }
    return {
      ok: false,
      s: "TIMEOUT_POLLING",
      data: null
    };
  }
  async generate(options = {}) {
    await this.reg();
    await this.wait(1500);
    const job = await this.submit(options);
    const requestId = job?.data?.request_id;
    if (!requestId) throw new Error("Gagal mendapatkan request_id asli: " + JSON.stringify(job));
    const result = await this.poll(requestId, 3e3, 60);
    return {
      uid: this.uid,
      requestId: requestId,
      job: job,
      result: result
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new EmojiKeyboardAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}