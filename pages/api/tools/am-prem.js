import axios from "axios";
import crypto from "crypto";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class AlightPremium {
  constructor() {
    this.anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtram9uYXhucGx1cmhic3BscXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MjYzMzIsImV4cCI6MjEwMDUwMjMzMn0.ultx8BX_-ZtIWeLfkCHVPND-u58oxK4e36hOjRmy72s";
    this.std_hd = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.sb_cli = axios.create({
      baseURL: "https://kkjonaxnplurhbsplqrs.supabase.co",
      headers: {
        ...this.std_hd,
        apikey: this.anon_key,
        "x-client-info": "supabase-js/2.110.8; runtime=web"
      }
    });
    this.am_cli = axios.create({
      baseURL: "https://diyymotion.vercel.app",
      headers: {
        ...this.std_hd,
        "content-type": "application/json",
        origin: "https://diyymotion.vercel.app",
        referer: "https://diyymotion.vercel.app/dashboard/alightmotion"
      }
    });
    this.ml_cli = axios.create({
      baseURL: `https://${apiConfig.DOMAIN_URL}`,
      headers: {
        ...this.std_hd
      }
    });
    this._itcp(this.sb_cli, "SUPABASE");
    this._itcp(this.am_cli, "ALIGHT-API");
    this._itcp(this.ml_cli, "MAIL-API");
  }
  _itcp(client, name) {
    client.interceptors.request.use(config => {
      console.log(`[REQ] [${name}] ${config.method?.toUpperCase()} -> ${config.url}`);
      return config;
    }, error => {
      console.log(`[REQ-ERROR] [${name}] Gagal mengirim request:`, error?.message);
      return {
        data: null,
        success: false,
        error: error?.message
      };
    });
    client.interceptors.response.use(response => {
      console.log(`[RES] [${name}] ${response.status} <- ${response.config?.url}`);
      return response;
    }, error => {
      console.log(`[RES-ERROR] [${name}] ${error.response?.status || "NET_ERR"} <- ${error.config?.url}:`, error.response?.data || error.message);
      return {
        data: null,
        success: false,
        error: error?.message || "network_error"
      };
    });
  }
  async _slp(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  _gPw() {
    return crypto.randomBytes(12).toString("hex");
  }
  _gEm() {
    return `${crypto.randomBytes(10).toString("hex")}@emailhook.site`;
  }
  async _cMl() {
    try {
      const res = await this.ml_cli.get("/api/mails/v9?action=create");
      return res?.data?.email || null;
    } catch (err) {
      console.log("[ERROR] Gagal eksekusi _cMl:", err?.message);
      return null;
    }
  }
  async _chM(em) {
    try {
      const res = await this.ml_cli.get(`/api/mails/v9?action=message&email=${encodeURIComponent(em)}`);
      const data = res?.data?.data || [];
      for (const msg of data) {
        const html = msg?.html_content || "";
        if (html) {
          const $ = cheerio.load(html);
          const link = $('a[href*="alight-creative.firebaseapp.com/__/auth/links"]').attr("href");
          if (link) return link;
        }
      }
      return null;
    } catch (err) {
      console.log("[ERROR] Gagal eksekusi _chM:", err?.message);
      return null;
    }
  }
  async _sbS(em, pw) {
    try {
      const res = await this.sb_cli.post("/auth/v1/signup", {
        email: em,
        password: pw,
        data: {
          username: em
        },
        gotrue_meta_security: {},
        code_challenge: null,
        code_challenge_method: null
      }, {
        headers: {
          authorization: `Bearer ${this.anon_key}`,
          origin: "https://diyymotion.vercel.app",
          referer: "https://diyymotion.vercel.app/",
          "sec-fetch-site": "cross-site",
          "x-supabase-api-version": "2024-01-01"
        }
      });
      return res?.data || null;
    } catch (err) {
      console.log("[ERROR] Gagal eksekusi _sbS:", err?.message);
      return null;
    }
  }
  async _sbP(id, tk) {
    try {
      const res = await this.sb_cli.get(`/rest/v1/profiles?select=*&id=eq.${id}`, {
        headers: {
          "accept-profile": "public",
          authorization: `Bearer ${tk}`,
          origin: "https://diyymotion.vercel.app",
          referer: "https://diyymotion.vercel.app/",
          "sec-fetch-site": "cross-site"
        }
      });
      return res?.data?.[0] || null;
    } catch (err) {
      console.log("[ERROR] Gagal eksekusi _sbP:", err?.message);
      return null;
    }
  }
  async _amS(ak, em) {
    try {
      const res = await this.am_cli.post("/api/am-api", {
        action: "send",
        email: em
      }, {
        headers: {
          "sec-fetch-site": "same-origin",
          "x-api-key": ak
        }
      });
      return res?.data || null;
    } catch (err) {
      console.log("[ERROR] Gagal eksekusi _amS:", err?.message);
      return null;
    }
  }
  async _amV(ak, em, lk) {
    try {
      const res = await this.am_cli.post("/api/am-api", {
        action: "verify",
        email: em,
        link: lk
      }, {
        headers: {
          "sec-fetch-site": "same-origin",
          "x-api-key": ak
        }
      });
      return res?.data || null;
    } catch (err) {
      console.log("[ERROR] Gagal eksekusi _amV:", err?.message);
      return null;
    }
  }
  async generate({
    key,
    password,
    count = 1,
    ...rest
  }) {
    console.log(`[MULAI] Memulai proses generasi premium | Target: ${count} akun`);
    const final_results = [];
    let active_key = key || null;
    try {
      if (!active_key) {
        console.log("[PROSES] API Key kosong. Melakukan registrasi Supabase dengan email acak...");
        const auth_email = this._gEm();
        const auth_pass = password || this._gPw();
        const sign_up = await this._sbS(auth_email, auth_pass);
        const access_tok = sign_up?.access_token || null;
        const user_id = sign_up?.user?.id || null;
        if (access_tok && user_id) {
          const profile_data = await this._sbP(user_id, access_tok);
          active_key = profile_data?.api_key || null;
        }
        if (!active_key) {
          console.log("[ERROR] Alur autentikasi Supabase gagal memperoleh API Key.");
          return {
            status: "failed",
            result: [],
            count: count,
            key: null
          };
        }
        console.log(`[SUKSES] API Key didapatkan: ${active_key}`);
      } else {
        console.log(`[PROSES] Menggunakan API Key yang disediakan: ${active_key}`);
      }
      for (let i = 0; i < count; i++) {
        console.log(`\n--- MEMPROSES ALIGHT MOTION PREMIUM KE-${i + 1} DARI ${count} ---`);
        let single_res = {
          index: i + 1,
          email: null,
          password: password || this._gPw(),
          api_key: active_key,
          verification_status: "failed",
          error: null,
          ...rest
        };
        const generated_email = await this._cMl();
        if (!generated_email) {
          single_res.error = "gagal_buat_email_am";
          final_results.push(single_res);
          continue;
        }
        single_res.email = generated_email;
        const send_status = await this._amS(active_key, single_res.email);
        if (!send_status?.success) {
          single_res.error = send_status?.message || "gagal_kirim_verifikasi_am";
          final_results.push(single_res);
          continue;
        }
        console.log("[PROSES] Melakukan polling inbox mencari link verifikasi...");
        let verified_link = null;
        for (let poll = 1; poll <= 60; poll++) {
          await this._slp(3e3);
          console.log(`[POLLING] Mencari pesan ke-${poll}/60...`);
          const link = await this._chM(single_res.email);
          if (link) {
            verified_link = link;
            console.log("[PROSES] Link verifikasi ditemukan!");
            break;
          }
        }
        if (!verified_link) {
          single_res.error = "timeout_email_verifikasi";
          final_results.push(single_res);
          continue;
        }
        const execution_result = await this._amV(active_key, single_res.email, verified_link);
        if (execution_result?.success) {
          single_res.verification_status = "success";
          single_res = {
            ...single_res,
            ...execution_result?.data
          };
          console.log("[SUKSES] Akun premium berhasil diaktifkan.");
        } else {
          single_res.error = execution_result?.message || "gagal_eksekusi_aktivasi";
        }
        final_results.push(single_res);
      }
    } catch (global_err) {
      console.log("[FATAL] Terjadi kesalahan global pada loop eksekusi:", global_err?.message || global_err);
    }
    const has_success = final_results.some(r => r.verification_status === "success");
    return {
      status: has_success ? "success" : "failed",
      result: final_results.map(item => ({
        ...item
      })),
      count: count,
      key: active_key
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new AlightPremium();
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