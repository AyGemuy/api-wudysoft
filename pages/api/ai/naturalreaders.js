import axios from "axios";
import crypto from "crypto";

class NaturalReadersGemini {
  constructor() {
    this.base_url = "https://www.naturalreaders.com";
    this.gemini_url = "https://9bbd39rthl.execute-api.us-east-1.amazonaws.com/dev/ask-gemini";
    this.region = "us-east-1";
    this.service = "execute-api";
    this.jar = {};
    this.cache = {};

    this.models = [
      { id: "38flash", name: "Gemini 1.5 Flash (Default)", is_default: true },
      { id: "25flash-default", name: "Gemini 2.5 Flash", is_default: false },
      { id: "25lite", name: "Gemini 2.5 Lite", is_default: false },
      { id: "25native", name: "Gemini 2.5 Native", is_default: false }
    ];

    this.client = axios.create({
      baseURL: this.base_url,
      timeout: 45e3,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    this.client.interceptors.request.use(
      req => {
        console.log(`[PROSES] HTTP Request: ${req?.method?.toUpperCase()} ${req?.url}`);
        const ck = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
        if (ck) req.headers["Cookie"] = ck;
        return req;
      },
      err => {
        console.log(`[ERROR] Request Interceptor: ${err?.message}`);
        return Promise.reject(err);
      }
    );

    this.client.interceptors.response.use(
      res => {
        console.log(`[PROSES] HTTP Response: ${res?.status} dari ${res?.config?.url}`);
        const raw = res.headers?.["set-cookie"] || [];
        (Array.isArray(raw) ? raw : [raw]).forEach(c => {
          if (!c) return;
          const [pair] = c.split(";");
          const [k, ...v] = pair.split("=");
          if (k?.trim()) this.jar[k.trim()] = v.join("=").trim();
        });
        return res;
      },
      err => {
        console.log(`[ERROR] Response Interceptor: ${err?.response?.status || err?.message}`);
        return Promise.reject(err);
      }
    );
  }

  hd(ref = "") {
    try {
      return {
        Referer: ref ? (ref.startsWith("http") ? ref : `${this.base_url}${ref}`) : `${this.base_url}/`,
        Origin: this.base_url,
        Accept: "*/*"
      };
    } catch (err) {
      console.log(`[ERROR] hd: ${err?.message}`);
      return {};
    }
  }

  h(k, d) {
    try {
      return crypto.createHmac("sha256", k).update(d).digest();
    } catch (err) {
      console.log(`[ERROR] h: ${err?.message}`);
      throw err;
    }
  }

  sha(d) {
    try {
      return crypto.createHash("sha256").update(d, "utf8").digest("hex");
    } catch (err) {
      console.log(`[ERROR] sha: ${err?.message}`);
      throw err;
    }
  }

  sig(k, d, r, s) {
    try {
      return this.h(this.h(this.h(this.h("AWS4" + k, d), r), s), "aws4_request");
    } catch (err) {
      console.log(`[ERROR] sig: ${err?.message}`);
      throw err;
    }
  }

  q_str(p) {
    try {
      return Object.keys(p || {})
        .sort()
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(p[k])}`)
        .join("&");
    } catch (err) {
      console.log(`[ERROR] q_str: ${err?.message}`);
      return "";
    }
  }

  val_str(v, name, req = !0) {
    try {
      const clean = v !== undefined && v !== null ? String(v).trim() : "";
      if (req && !clean) throw new Error(`Parameter "${name}" wajib diisi dan tidak boleh kosong.`);
      return clean;
    } catch (err) {
      console.log(`[ERROR] val_str: ${err?.message}`);
      throw err;
    }
  }

  async ini() {
    try {
      if (this.cache["session"]) return this.cache["session"];
      console.log("[PROSES] Mengambil token sesi AWS Cognito...");
      const id_res = await axios.post(
        "https://cognito-identity.us-east-1.amazonaws.com/",
        { IdentityPoolId: "us-east-1:bae5c41f-cb27-4ac6-9ac1-05977f7812d0" },
        {
          headers: {
            "Content-Type": "application/x-amz-json-1.1",
            "X-Amz-Target": "AWSCognitoIdentityService.GetId"
          },
          timeout: 15e3
        }
      );

      const id = id_res?.data?.IdentityId || "";
      if (!id) throw new Error("Gagal memperoleh Cognito Identity ID");

      const cred_res = await axios.post(
        "https://cognito-identity.us-east-1.amazonaws.com/",
        { IdentityId: id },
        {
          headers: {
            "Content-Type": "application/x-amz-json-1.1",
            "X-Amz-Target": "AWSCognitoIdentityService.GetCredentialsForIdentity"
          },
          timeout: 15e3
        }
      );

      const creds = cred_res?.data?.Credentials || {};
      if (!creds?.AccessKeyId || !creds?.SecretKey) {
        throw new Error("Gagal mengekstrak kredensial AWS dari Cognito Identity");
      }

      this.cache["session"] = {
        ak: creds.AccessKeyId,
        sk: creds.SecretKey,
        tok: creds.SessionToken || ""
      };

      console.log(`[PROSES] Kredensial aktif. Key ID: ${creds.AccessKeyId}`);
      return this.cache["session"];
    } catch (err) {
      console.log(`[ERROR] Inisialisasi sesi gagal: ${err?.message || err}`);
      throw new Error(`Inisialisasi sesi gagal: ${err?.message || err}`);
    }
  }

  b_auth({ m, p, q, d, dt, hd, ak, sk }) {
    try {
      console.log("[PROSES] Menghitung Signature AWS SigV4");
      const pl_h = this.sha(d || "");
      const d_str = dt.toISOString().slice(0, 10).replace(/-/g, "");
      const amz_dt = dt.toISOString().replace(/[:-]|\.\d{3}/g, "");
      const scp = `${d_str}/${this.region}/${this.service}/aws4_request`;

      const l_hd = {};
      Object.keys(hd || {}).forEach(k => {
        l_hd[k.toLowerCase()] = String(hd[k]).trim();
      });

      const s_hds = Object.keys(l_hd).sort().join(";");
      const c_hds = Object.keys(l_hd).sort().map(k => `${k}:${l_hd[k]}\n`).join("");
      const cr = `${m}\n${p}\n${this.q_str(q)}\n${c_hds}\n${s_hds}\n${pl_h}`;
      const s2s = `AWS4-HMAC-SHA256\n${amz_dt}\n${scp}\n${this.sha(cr)}`;
      const k_sig = this.sig(sk, d_str, this.region, this.service);
      const sg = crypto.createHmac("sha256", k_sig).update(s2s).digest("hex");

      return {
        auth: `AWS4-HMAC-SHA256 Credential=${ak}/${scp}, SignedHeaders=${s_hds}, Signature=${sg}`,
        amz_date: amz_dt
      };
    } catch (err) {
      console.log(`[ERROR] b_auth: ${err?.message}`);
      throw err;
    }
  }

  async model_list({ ...rest } = {}) {
    try {
      console.log("[PROSES] Mengambil model_list Ask Gemini...");
      return {
        status: true,
        result: {
          total_models: this.models.length,
          default_model: "38flash",
          models: this.models
        }
      };
    } catch (err) {
      console.log(`[ERROR] model_list: ${err?.message || err}`);
      return {
        status: false,
        result: {
          message: err?.message || "Gagal mengambil daftar model"
        }
      };
    }
  }

  async ask({
    prompt,
    text,
    model = "38flash",
    context = "",
    history = [],
    temperature = 0.7,
    ...rest
  } = {}) {
    try {
      const user_prompt = this.val_str(prompt || text, "prompt/text", !0);
      const req_model = this.val_str(model, "model", !1) || "38flash";
      const valid_model = this.models.some(m => m.id === req_model.toLowerCase());

      if (!valid_model) {
        const avail = this.models.map(m => m.id).join(", ");
        throw new Error(`Model "${req_model}" tidak valid. Pilihan tersedia: ${avail}`);
      }

      const chosen_model = req_model.toLowerCase();
      const creds = await this.ini();

      console.log(`[PROSES] Mengirim permintaan Gemini (${chosen_model}): "${user_prompt.slice(0, 35)}..."`);

      const payload = {
        prompt: user_prompt,
        model: chosen_model,
        context: String(context || "").trim(),
        history: Array.isArray(history) ? history : [],
        temperature: typeof temperature === "number" ? temperature : 0.7,
        vn: rest?.version || "10.8.61",
        app: rest?.app || "pw"
      };

      const b = JSON.stringify(payload);
      const dt = new Date();
      const u = new URL(this.gemini_url);

      const h_in = {
        "content-type": "application/json; charset=UTF-8",
        host: u.host,
        "x-amz-date": dt.toISOString().replace(/[:-]|\.\d{3}/g, ""),
        ...(creds?.tok ? { "x-amz-security-token": creds.tok } : {})
      };

      const { auth, amz_date } = this.b_auth({
        m: "POST",
        p: u.pathname,
        q: {},
        d: b,
        dt,
        hd: h_in,
        ak: creds.ak,
        sk: creds.sk
      });

      const hd = {
        ...this.hd(),
        Accept: "application/json, text/plain, */*",
        Authorization: auth,
        "Content-Type": "application/json; charset=UTF-8",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "x-amz-date": amz_date,
        ...(creds?.tok ? { "x-amz-security-token": creds.tok } : {})
      };

      const res = await axios.post(this.gemini_url, b, {
        headers: hd,
        timeout: 45e3
      });

      const res_data = res?.data || {};
      const answer = res_data?.answer || res_data?.text || res_data?.response || res_data?.message || res_data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!answer && typeof res_data !== "string") {
        throw new Error(res_data?.error || "Gagal mendapatkan respon jawaban dari Gemini");
      }

      console.log("[PROSES] Jawaban Gemini diterima.");

      return {
        status: true,
        result: {
          model: chosen_model,
          prompt: user_prompt,
          reply: typeof res_data === "string" ? res_data : answer,
          tokens: {
            prompt_token: res_data?.promptToken ?? null,
            candidate_token: res_data?.candidateToken ?? null,
            total_token: res_data?.totalToken ?? null
          },
          raw_response: res_data
        }
      };
    } catch (err) {
      console.log(`[ERROR] Ask Gemini: ${err?.message || err}`);
      return {
        status: false,
        result: {
          message: err?.response?.data?.message || err?.response?.data || err?.message || "Gagal memproses request ke Gemini"
        }
      };
    }
  }
}

export default async function handler(req, res) {
  try {
    const {
      action,
      ...params
    } = req.method === "GET" ? req.query : req.body;
    const validActions = ["ask", "chat", "models", "model_list"];

    if (!action) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'action' wajib diisi.",
        available_actions: validActions,
        usage: {
          method: "GET / POST",
          examples: [
            "/?action=ask&prompt=Jelaskan+tentang+lubang+hitam&model=38flash",
            "/?action=ask&prompt=Ringkas+teks+ini&context=Isi+artikel+panjang...&model=25flash-default",
            "/?action=model_list"
          ]
        }
      });
    }

    if (!validActions.includes(action)) {
      return res.status(400).json({
        status: false,
        error: `Action tidak valid: "${action}".`,
        valid_actions: validActions
      });
    }

    const api = new NaturalReadersGemini();
    let response;

    switch (action) {
      case "ask":
      case "chat": {
        const text_input = params.prompt || params.text || "";
        if (!text_input || !String(text_input).trim()) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' atau 'text' wajib diisi untuk action 'ask'."
          });
        }
        response = await api.ask({
          prompt: text_input,
          model: params.model || "38flash",
          context: params.context || "",
          history: params.history || [],
          temperature: params.temperature ? Number(params.temperature) : 0.7,
          ...params
        });
        break;
      }
      case "models":
      case "model_list": {
        response = await api.model_list({ ...params });
        break;
      }
    }

    if (response && response.status) {
      return res.status(200).json({
        status: true,
        action: action,
        result: response.result
      });
    } else {
      return res.status(400).json({
        status: false,
        action: action,
        error: response?.result?.message || "Gagal memproses request ke Gemini."
      });
    }
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada handler Gemini:`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error?.message || "Unknown Error"
    });
  }
}