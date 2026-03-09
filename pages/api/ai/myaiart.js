import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class MyAIArt {
  constructor() {
    this.cfg = {
      ratios: ["16:9", "9:16", "4:3", "3:4", "1:1"],
      api: "https://api.myaiart.io/api/aiart",
      mail: `https://${apiConfig.DOMAIN_URL}/api/mails/v9`
    };
    this.jar = new CookieJar();
    this.api = wrapper(axios.create({
      jar: this.jar,
      baseURL: this.cfg.api,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "content-type": "application/json",
        origin: "https://www.myaiart.io",
        referer: "https://www.myaiart.io/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-app-os": "os",
        "x-app-version": "1.0",
        "x-locale": "en",
        "x-source": "WEB"
      }
    }));
    this.mail = axios.create({
      baseURL: this.cfg.mail
    });
    this.token = null;
    this.user = null;
  }
  async newMail() {
    try {
      console.log("[Process] Creating email...");
      const {
        data
      } = await this.mail.get("?action=create");
      const email = data?.email;
      if (!email) throw new Error("No email");
      console.log("[Success] Email:", email);
      return email;
    } catch (err) {
      console.error("[Error] Create email:", err?.message);
      throw err;
    }
  }
  async getOtp(email) {
    try {
      console.log("[Process] Getting OTP...");
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const {
          data
        } = await this.mail.get(`?action=message&email=${email}`);
        const msg = data?.data?.[0]?.text_content || "";
        const code = msg.match(/(\d{6})/)?.[1];
        if (code) {
          console.log("[Success] OTP:", code);
          return code;
        }
        console.log(`[Info] Wait OTP [${i + 1}/60]`);
      }
      throw new Error("OTP timeout");
    } catch (err) {
      console.error("[Error] Get OTP:", err?.message);
      throw err;
    }
  }
  async send(email) {
    try {
      console.log("[Process] Sending code...");
      const {
        data
      } = await this.api.post("/user/sendVerifyCode", {
        codeType: 2,
        email: email
      });
      if (data?.code !== 0) throw new Error(data?.msg || "Send failed");
      console.log("[Success] Code sent");
    } catch (err) {
      console.error("[Error] Send code:", err?.response?.data || err?.message);
      throw err;
    }
  }
  async login(email, code) {
    try {
      console.log("[Process] Login...");
      const {
        data
      } = await this.api.post("/user/login", {
        loginType: 2,
        username: email,
        verificationCode: code
      });
      if (data?.code !== 0) throw new Error(data?.msg || "Login failed");
      this.token = data?.data?.accessToken;
      if (!this.token) throw new Error("No token");
      this.api.defaults.headers["authorization"] = this.token;
      this.api.defaults.headers["x-access-token"] = this.token;
      console.log("[Success] Token:", this.token.substring(0, 20) + "...");
      return this.token;
    } catch (err) {
      console.error("[Error] Login:", err?.response?.data || err?.message);
      throw err;
    }
  }
  async credit() {
    try {
      console.log("[Process] Getting credit...");
      const {
        data
      } = await this.api.get("/user/getCredit");
      if (data?.code !== 0) throw new Error(data?.msg || "Get credit failed");
      const credit = data?.data?.totalAmount || 0;
      console.log("[Success] Credit:", credit);
      return credit;
    } catch (err) {
      console.error("[Error] Get credit:", err?.response?.data || err?.message);
      throw err;
    }
  }
  async info() {
    try {
      console.log("[Process] Getting user info...");
      const {
        data
      } = await this.api.get("/user/getUserInfo");
      if (data?.code !== 0) throw new Error(data?.msg || "Get info failed");
      this.user = data?.data || {};
      console.log("[Success] User:", this.user?.userId || "unknown");
      console.log("[Info] Email:", this.user?.email || "-");
      console.log("[Info] Credit:", this.user?.totalAmount || 0);
      return this.user;
    } catch (err) {
      console.error("[Error] Get info:", err?.response?.data || err?.message);
      throw err;
    }
  }
  async auth() {
    try {
      console.log("[Process] Auth...");
      const email = await this.newMail();
      await this.send(email);
      const otp = await this.getOtp(email);
      await this.login(email, otp);
      await this.credit();
      await this.info();
      console.log("[Success] Auth done");
    } catch (err) {
      console.error("[Error] Auth:", err?.message);
      throw err;
    }
  }
  async toBuf(img) {
    try {
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          console.log("[Process] Download image...");
          const {
            data
          } = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return Buffer.from(data);
        }
        if (img.startsWith("data:")) {
          return Buffer.from(img.split(",")[1], "base64");
        }
        return Buffer.from(img, "base64");
      }
      throw new Error("Invalid image");
    } catch (err) {
      console.error("[Error] To buffer:", err?.message);
      throw err;
    }
  }
  async sign(name) {
    try {
      console.log("[Process] Get presign:", name);
      const {
        data
      } = await this.api.post("/file/getUploadSign", {
        fileName: name
      });
      if (data?.code !== 0) throw new Error(data?.msg || "Presign failed");
      const url = data?.data?.sign;
      const biz = data?.data?.bizUrl;
      if (!url || !biz) throw new Error("Invalid presign");
      console.log("[Success] Presign OK");
      return {
        url: url,
        biz: biz
      };
    } catch (err) {
      console.error("[Error] Presign:", err?.response?.data || err?.message);
      throw err;
    }
  }
  async put(url, buf) {
    try {
      console.log("[Process] Upload...");
      await axios.put(url, buf, {
        headers: {
          "Content-Type": "image/jpeg"
        },
        timeout: 6e4
      });
      console.log("[Success] Uploaded");
    } catch (err) {
      console.error("[Error] Upload:", err?.message);
      throw err;
    }
  }
  async upload(imgs) {
    try {
      const arr = Array.isArray(imgs) ? imgs : [imgs];
      const res = [];
      console.log(`[Process] Upload ${arr.length} img(s)...`);
      for (const img of arr) {
        const buf = await this.toBuf(img);
        const name = `${crypto.randomBytes(8).toString("hex")}.jpg`;
        const {
          url,
          biz
        } = await this.sign(name);
        await this.put(url, buf);
        res.push({
          bizUrl: biz
        });
      }
      console.log("[Success] All uploaded");
      return res;
    } catch (err) {
      console.error("[Error] Upload imgs:", err?.message);
      throw err;
    }
  }
  async create(params) {
    try {
      console.log("[Process] Create task...");
      const {
        data
      } = await this.api.post("/task/createTask", {
        taskType: "OpenImageGenerate",
        params: params
      });
      if (data?.code !== 0) throw new Error(data?.msg || "Create failed");
      const taskNo = data?.data?.taskNo;
      if (!taskNo) throw new Error("No taskNo");
      console.log("[Success] Task:", taskNo);
      return taskNo;
    } catch (err) {
      console.error("[Error] Create:", err?.response?.data || err?.message);
      throw err;
    }
  }
  async poll(taskNo) {
    try {
      console.log("[Process] Polling...");
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3e3));
        const {
          data
        } = await this.api.get(`/task/getTaskStatus?taskNo=${taskNo}`);
        if (data?.code !== 0) continue;
        const status = data?.data?.taskStatus;
        console.log(`[Info] [${i + 1}/60] ${status || "UNKNOWN"}`);
        if (status === "SUCCESS") {
          console.log("[Success] Done");
          return true;
        }
        if (status === "FAILED") {
          console.error("[Error] Failed");
          return false;
        }
      }
      throw new Error("Timeout");
    } catch (err) {
      console.error("[Error] Poll:", err?.message);
      throw err;
    }
  }
  async result(taskNo) {
    try {
      console.log("[Process] Get result...");
      const {
        data
      } = await this.api.get("/task/getTopTasks?taskType=OpenImageGenerate");
      if (data?.code !== 0) throw new Error(data?.msg || "Get failed");
      const task = data?.data?.find(t => t?.taskNo === taskNo);
      if (!task) throw new Error("Task not found");
      const imgs = task?.result?.images || [];
      console.log("[Success] Images:", imgs.length);
      return {
        result: imgs,
        taskNo: taskNo,
        prompt: task?.params?.prompt,
        status: task?.taskStatus,
        createAt: task?.createAt,
        completedAt: task?.completedAt
      };
    } catch (err) {
      console.error("[Error] Result:", err?.message);
      throw err;
    }
  }
  async generate({
    prompt,
    image,
    ratio = "3:4",
    ...rest
  }) {
    try {
      console.log("[Process] Generate...");
      if (!this.token) {
        console.log("[Info] No token, auth...");
        await this.auth();
      }
      const validRatio = this.cfg.ratios.includes(ratio) ? ratio : "3:4";
      console.log("[Info] Ratio:", validRatio);
      const params = {
        prompt: prompt,
        aspectRatio: {
          value: validRatio
        },
        ...rest
      };
      if (image) {
        console.log("[Info] Process image...");
        const uploaded = await this.upload(image);
        params.images = uploaded;
      }
      const taskNo = await this.create(params);
      const ok = await this.poll(taskNo);
      if (!ok) throw new Error("Generate failed");
      const res = await this.result(taskNo);
      console.log("[Success] Generate done");
      return res;
    } catch (err) {
      console.error("[Error] Generate:", err?.message);
      throw err;
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
  const api = new MyAIArt();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}