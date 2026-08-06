import axios from "axios";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class PixaryClient {
  constructor() {
    this.baseURL = `${proxy}https://api.pixaryai.com`;
    this.imgModels = ["ai-art-generator", "ai-image-generator", "grok-ai-image-generator", "pixaryai-2-5-image-generator", "pixaryai-2-6-image-generator", "pixaryai-2-7-image-generator", "pixaryai-2-7-pro-image-generator", "wan-2-6-image-generator", "wan-2-5-image-generator", "wan-2-7-image-generator", "wan-2-7-pro-image-generator", "qwen-ai-image-generator"];
    this.vidModels = ["wan-2-5", "wan-2-6", "wan-2-5-unlimited", "ai-baby-dance-generator", "grok-ai-video-generator", "seedance-2", "pixaryai-2-5-pro-video-generator", "pixaryai-2-6-video-generator", "pixaryai-2-7-video-generator", "wan-2-6-flash-video-generator", "wan-2-7-video-generator", "seedance-1-5-pro-video-generator", "uncensored-video-extender"];
    this.effectModels = ["ai-dress-removal", "ai-dress-changer", "ai-photo-eraser"];
    this.defHeaders = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID,en;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
      language: "en",
      origin: "https://www.pixaryai.com",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://www.pixaryai.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-fbp": `fb.1.${Date.now()}.${Math.floor(1e9 + Math.random() * 9e9)}`
    };
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: this.defHeaders
    });
  }
  async req(cfg = {}) {
    try {
      console.log(`[Pixary] Requesting: ${cfg.method || "GET"} -> ${cfg.url}`);
      const res = await this.client(cfg);
      return res?.data || null;
    } catch (err) {
      console.error(`[Pixary] Request failed: ${cfg.url}`, err?.response?.data || err?.message);
      return null;
    }
  }
  genDev() {
    return `${crypto.randomBytes(6).toString("hex")}-${crypto.randomBytes(7).toString("hex")}-${crypto.randomBytes(4).toString("hex")}-${crypto.randomBytes(3).toString("hex")}-${crypto.randomBytes(7).toString("hex")}`;
  }
  async readImg({
    image
  } = {}) {
    try {
      if (Buffer.isBuffer(image)) return image;
      if (typeof image === "string") {
        if (image.startsWith("http://") || image.startsWith("https://")) {
          const res = await axios.get(image, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (image.startsWith("data:image")) {
          return Buffer.from(image.split(";base64,").pop(), "base64");
        }
        return Buffer.from(image, "base64");
      }
    } catch (err) {
      console.error("[Pixary] Gagal mengonversi sumber gambar:", err?.message);
    }
    return null;
  }
  async ensure({
    state
  } = {}) {
    try {
      if (state) {
        console.log("[Pixary] Mendekode state untuk penggunaan ulang...");
        const decoded = Buffer.from(state, "base64").toString("utf-8");
        const [email, password] = decoded.split(":");
        if (email && password) {
          const auth = await this.login({
            email: email,
            password: password
          });
          if (auth?.userToken) {
            console.log("[Pixary] State berhasil dipulihkan.");
            return {
              token: auth.userToken,
              state: state
            };
          }
        }
      }
    } catch (err) {
      console.warn("[Pixary] State lama tidak valid/kadaluarsa:", err?.message);
    }
    return await this.register({});
  }
  async register({} = {}) {
    try {
      console.log("[Pixary] Meminta alamat email sementara baru...");
      const mailRes = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      const email = mailRes?.data?.email || null;
      if (!email) return {
        status: "error",
        error: "Pembuatan email sementara gagal"
      };
      const rawPass = crypto.randomBytes(12).toString("hex");
      const b64Pass = Buffer.from(rawPass).toString("base64");
      const deviceId = this.genDev();
      console.log(`[Pixary] Mendaftarkan email: ${email}`);
      const regRes = await this.req({
        method: "POST",
        url: "/api/user/v1/user/register",
        headers: {
          device: deviceId
        },
        data: {
          userEmail: email,
          userPassword: b64Pass,
          userTenantId: 1
        }
      });
      const userId = regRes?.data?.userId;
      const codeId = regRes?.data?.codeId;
      const regTime = regRes?.data?.time || new Date().toISOString();
      if (!userId || !codeId) return {
        status: "error",
        error: "Pendaftaran ditolak oleh server (ID kosong)"
      };
      console.log("[Pixary] Menunggu OTP dikirim...");
      let otp = null;
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 3e3));
        const check = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        const messages = check?.data?.data || [];
        if (messages.length > 0) {
          const body = messages[0]?.text_content || "";
          const match = body.match(/\b\d{6}\b/);
          if (match) {
            otp = match[0];
            break;
          }
        }
      }
      if (!otp) return {
        status: "error",
        error: "Timeout saat menunggu kode verifikasi OTP"
      };
      console.log(`[Pixary] Memverifikasi pendaftaran dengan OTP: ${otp}`);
      const actRes = await this.req({
        method: "POST",
        url: "/api/user/v1/user/register/active",
        data: {
          userId: userId,
          codeId: codeId,
          time: regTime,
          userEmail: email,
          verificationCode: otp
        }
      });
      if (!actRes || actRes.code !== 200) {
        return {
          status: "error",
          error: `Gagal mengaktifkan akun: ${actRes?.msg || "Respon tidak valid"}`
        };
      }
      const loginData = await this.login({
        email: email,
        password: b64Pass
      });
      const token = loginData?.userToken;
      if (!token) return {
        status: "error",
        error: "Gagal login setelah akun diaktifkan"
      };
      const claimResult = await this.claim({
        state: null,
        _token: token
      });
      console.log("[Pixary] Hasil klaim kredit:", claimResult);
      const state = Buffer.from(`${email}:${b64Pass}`).toString("base64");
      return {
        status: "success",
        token: token,
        state: state,
        claim: claimResult?.data
      };
    } catch (error) {
      console.error("[Pixary] Proses registrasi terhambat:", error?.message);
      return {
        status: "error",
        error: error?.message
      };
    }
  }
  async login({
    email,
    password
  } = {}) {
    try {
      console.log(`[Pixary] Melakukan login untuk ${email}...`);
      const auth = await this.req({
        method: "POST",
        url: "/api/user/v1/user/login",
        data: {
          userEmail: email,
          userPassword: password
        }
      });
      return auth?.data || null;
    } catch (error) {
      console.error("[Pixary] Proses autentikasi gagal:", error?.message);
      return null;
    }
  }
  async userinfo({
    state,
    _token
  } = {}) {
    const ses = _token ? {
      token: _token,
      state: state
    } : await this.ensure({
      state: state
    });
    if (!ses?.token) return {
      status: "error",
      error: "Gagal memvalidasi sesi."
    };
    try {
      console.log("[Pixary] Mengambil info user...");
      const res = await this.req({
        method: "POST",
        url: "/api/user/v1/user/info",
        headers: {
          "pixaryai-token": ses.token
        },
        data: {}
      });
      if (!res?.data) return {
        status: "error",
        error: "Gagal mengambil info user.",
        state: ses.state
      };
      return {
        status: "success",
        state: ses.state,
        data: res.data
      };
    } catch (err) {
      return {
        status: "error",
        error: err?.message,
        state: ses.state
      };
    }
  }
  async claim({
    state,
    _token
  } = {}) {
    const ses = _token ? {
      token: _token,
      state: state
    } : await this.ensure({
      state: state
    });
    if (!ses?.token) return {
      status: "error",
      error: "Gagal memvalidasi sesi."
    };
    console.log("[Pixary] Menjalankan alur penuh klaim kredit...");
    const headers = {
      "pixaryai-token": ses.token
    };
    const resDesktop = await this.req({
      method: "POST",
      url: "/api/user/v2/userShare/save",
      headers: headers,
      data: {
        shareChannel: "add-to-desktop"
      }
    });
    const resSignIn = await this.req({
      method: "POST",
      url: "/api/user/v2/userShare/save",
      headers: headers,
      data: {
        shareChannel: "sign-in"
      }
    });
    return {
      status: "success",
      state: ses.state,
      data: {
        desktop: resDesktop?.msg || "Failed",
        signIn: resSignIn?.msg || "Failed"
      }
    };
  }
  async enhance({
    state,
    prompt
  } = {}) {
    const ses = await this.ensure({
      state: state
    });
    if (!ses?.token) return {
      status: "error",
      error: "Gagal memvalidasi sesi."
    };
    try {
      console.log(`[Pixary] Enhancing prompt: "${prompt}"...`);
      const res = await this.req({
        method: "POST",
        url: "/api/user/v2/aiEffect/promptEnhance",
        headers: {
          "pixaryai-token": ses.token
        },
        data: {
          prompt: prompt
        }
      });
      if (!res?.data) return {
        status: "error",
        error: "Gagal enhance prompt.",
        state: ses.state
      };
      return {
        status: "success",
        state: ses.state,
        data: res.data
      };
    } catch (err) {
      return {
        status: "error",
        error: err?.message,
        state: ses.state
      };
    }
  }
  async upload({
    state,
    image,
    dir = "pixaryai/undress",
    _token
  } = {}) {
    const ses = _token ? {
      token: _token,
      state: state
    } : await this.ensure({
      state: state
    });
    if (!ses?.token) return {
      status: "error",
      error: "Gagal memvalidasi sesi."
    };
    try {
      const buffer = await this.readImg({
        image: image
      });
      if (!buffer) return {
        status: "error",
        error: "Gagal membaca sumber gambar.",
        state: ses.state
      };
      const fileName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.jpg`;
      console.log(`[Pixary] Menyiapkan presigned URL untuk file: ${fileName}`);
      const s3UrlRes = await this.req({
        method: "POST",
        url: "/api/user/v1/s3/presigned/url",
        headers: {
          "pixaryai-token": ses.token
        },
        data: {
          fileDirectoryUrl: dir,
          fileName: fileName,
          isSaveOriginalName: false
        }
      });
      const putUrl = s3UrlRes?.data?.s3PresignedUrl;
      const s3CloudUrl = s3UrlRes?.data?.s3CloudUrl;
      if (!putUrl || !s3CloudUrl) return {
        status: "error",
        error: "Gagal mendapatkan presigned URL.",
        state: ses.state
      };
      console.log("[Pixary] Mengunggah payload gambar ke S3...");
      await axios.put(putUrl, buffer, {
        headers: {
          "Content-Type": "image/jpeg"
        }
      });
      console.log("[Pixary] Melakukan finalisasi unggahan file...");
      const saveRes = await this.req({
        method: "POST",
        url: "/api/user/v1/s3/saveFile",
        headers: {
          "pixaryai-token": ses.token
        },
        data: {
          fileName: fileName,
          s3CloudUrl: s3CloudUrl
        }
      });
      if (!saveRes?.data) return {
        status: "error",
        error: "Gagal menyimpan file di server.",
        state: ses.state
      };
      return {
        status: "success",
        state: ses.state,
        data: saveRes.data
      };
    } catch (err) {
      return {
        status: "error",
        error: err?.message,
        state: ses.state
      };
    }
  }
  async generate({
    state,
    mode,
    prompt,
    image,
    ...rest
  } = {}) {
    const validModes = ["effect", "undress", "image", "video"];
    const targetMode = (mode || "").toLowerCase();
    if (!validModes.includes(targetMode)) {
      return {
        status: "error",
        error: `Mode tidak valid: "${mode}".`,
        validModes: validModes
      };
    }
    const ses = await this.ensure({
      state: state
    });
    if (!ses?.token) {
      return {
        status: "error",
        error: `Gagal memvalidasi sesi: ${ses?.error || "Unknown Error"}`,
        state: state
      };
    }
    const token = ses.token;
    let uploadInfo = null;
    let resData = null;
    switch (targetMode) {
      case "effect":
      case "undress": {
        const slug = rest?.slug || rest?.agentRoute || "ai-dress-removal";
        console.log(`[Pixary] Mode: Effect/Undress - Slug: ${slug}`);
        if (image) {
          const up = await this.upload({
            state: ses.state,
            image: image,
            dir: "pixaryai/undress",
            _token: token
          });
          if (up?.status !== "success") return {
            status: "error",
            error: "Proses unggah gambar gagal.",
            state: ses.state
          };
          uploadInfo = up.data;
        }
        const param = {
          imgurl: uploadInfo?.fileS3CloudUrlFull || rest?.imgurl,
          bodyshape: rest?.bodyshape || "mid",
          fileId: uploadInfo?.fileId || rest?.fileId
        };
        resData = await this.req({
          method: "POST",
          url: "/api/user/v2/aiEffect/image",
          headers: {
            "pixaryai-token": token
          },
          data: {
            agentRoute: slug,
            param: param,
            edit: JSON.stringify(param),
            type: rest?.type || "4"
          }
        });
        break;
      }
      case "image": {
        const slug = rest?.slug || rest?.agentRoute || "pixaryai-2-7-image-generator";
        const scene = image ? "i2i" : "t2i";
        console.log(`[Pixary] Mode: Image (${scene}) - Slug: ${slug}`);
        if (image) {
          const up = await this.upload({
            state: ses.state,
            image: image,
            dir: "pixaryai/nsfw",
            _token: token
          });
          if (up?.status !== "success") return {
            status: "error",
            error: "Proses unggah gambar gagal.",
            state: ses.state
          };
          uploadInfo = up.data;
        }
        const imgUrl = uploadInfo?.fileS3CloudUrlFull;
        const finalPrompt = prompt || "Car";
        const resolution = rest?.resolution || "1280*720";
        const editPayload = {
          prompt: finalPrompt,
          resolution: resolution,
          scene: scene,
          totalImages: "1",
          ...imgUrl ? {
            imageUrls: [imgUrl]
          } : {}
        };
        resData = await this.req({
          method: "POST",
          url: "/api/user/v5/aiHub/saveTask",
          headers: {
            "pixaryai-token": token
          },
          data: {
            agentRoute: slug,
            prompt: finalPrompt,
            resolution: resolution,
            scene: scene,
            edit: JSON.stringify(editPayload),
            number: 1,
            type: slug === "ai-image-generator" ? "6" : slug,
            totalImages: "1",
            ...imgUrl ? {
              imageUrls: [imgUrl]
            } : {},
            ...rest
          }
        });
        break;
      }
      case "video": {
        const slug = rest?.slug || rest?.agentRoute || "seedance-1-5-pro-video-generator";
        const scene = image ? "i2v" : "t2v";
        console.log(`[Pixary] Mode: Video (${scene}) - Slug: ${slug}`);
        if (image) {
          const up = await this.upload({
            state: ses.state,
            image: image,
            dir: "pixaryai/nsfw",
            _token: token
          });
          if (up?.status !== "success") return {
            status: "error",
            error: "Proses unggah gambar gagal.",
            state: ses.state
          };
          uploadInfo = up.data;
        }
        const imgUrl = uploadInfo?.fileS3CloudUrlFull;
        const finalPrompt = prompt || "Add hat";
        const resolution = rest?.resolution || "480p";
        const editPayload = {
          prompt: finalPrompt,
          resolution: resolution,
          seconds: rest?.seconds || 5,
          imageUrl: imgUrl,
          aspectRatio: rest?.aspectRatio || "16:9",
          modeType: rest?.modeType || (image ? 2 : 1),
          scene: scene,
          generateAudio: rest?.generateAudio || false
        };
        resData = await this.req({
          method: "POST",
          url: "/api/user/v5/aiHub/saveTask",
          headers: {
            "pixaryai-token": token
          },
          data: {
            agentRoute: slug,
            prompt: finalPrompt,
            resolution: resolution,
            seconds: rest?.seconds || 5,
            imageUrl: imgUrl,
            aspectRatio: rest?.aspectRatio || "16:9",
            modeType: rest?.modeType || (image ? 2 : 1),
            scene: scene,
            generateAudio: rest?.generateAudio || false,
            edit: JSON.stringify(editPayload),
            type: slug,
            ...rest
          }
        });
        break;
      }
    }
    return {
      status: resData ? "success" : "error",
      result: resData || "Gagal memproses tugas AI",
      state: ses.state
    };
  }
  async status({
    state,
    mode,
    ...rest
  } = {}) {
    const ses = await this.ensure({
      state: state
    });
    if (!ses?.token) {
      return {
        status: "error",
        error: `Gagal memvalidasi sesi: ${ses?.error || "Unknown Error"}`,
        state: state
      };
    }
    const token = ses.token;
    const targetMode = (mode || "").toLowerCase();
    const slug = rest?.slug || rest?.agentRoute || (targetMode === "video" ? "seedance-1-5-pro-video-generator" : "pixaryai-2-7-image-generator");
    const isEffect = targetMode === "effect" || targetMode === "undress" || this.effectModels.includes(slug);
    const defaultType = isEffect ? "4" : slug === "ai-image-generator" ? "6" : slug;
    const endpoint = isEffect ? "/api/user/v2/aiEffect/list" : "/api/user/v5/aiHub/list";
    console.log(`[Pixary] Menilai status untuk slug: ${slug} (Endpoint: ${endpoint})`);
    const resList = await this.req({
      method: "POST",
      url: endpoint,
      headers: {
        "pixaryai-token": token
      },
      data: {
        agentRoute: slug,
        current: rest?.current || 1,
        size: rest?.size || 10,
        types: rest?.types || [defaultType]
      }
    });
    return {
      status: resList ? "success" : "error",
      result: resList?.data || "Gagal memuat status",
      state: ses.state
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const {
    action,
    ...rest
  } = params;
  const validActions = ["register", "login", "userinfo", "claim", "enhance", "upload", "generate", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          register: "/?action=register",
          login: "/?action=login&email=user@mail.com&password=<base64>",
          userinfo: "/?action=userinfo&state=<base64_state>",
          claim: "/?action=claim&state=<base64_state>",
          enhance: "/?action=enhance&state=<base64_state>&prompt=Car",
          upload: "/?action=upload&state=<base64_state>&image=<url_or_base64>&dir=pixaryai/undress",
          generate: "/?action=generate&state=<base64_state>&mode=image&prompt=A+beautiful+sunset",
          status: "/?action=status&state=<base64_state>&mode=image&slug=pixaryai-2-7-image-generator"
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const requiredMap = {
    login: ["email", "password"],
    userinfo: ["state"],
    claim: ["state"],
    enhance: ["state", "prompt"],
    upload: ["state", "image"],
    generate: ["mode"],
    status: ["mode"]
  };
  const missing = (requiredMap[action] || []).filter(k => !rest[k]);
  if (missing.length > 0) {
    return res.status(400).json({
      status: false,
      error: `Parameter wajib tidak lengkap untuk action '${action}': ${missing.join(", ")}.`
    });
  }
  const api = new PixaryClient();
  try {
    const response = await api[action](rest);
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari sistem target. Silakan coba kembali nanti."
      });
    }
    return res.status(200).json({
      status: response.status === "success",
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}