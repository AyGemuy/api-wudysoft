import axios from "axios";
import {
  webcrypto as crypto
} from "crypto";
class Yuumari {
  constructor() {
    this.api = axios.create({
      baseURL: "https://api.yuumari.com",
      headers: {
        "X-Meow": "miáu",
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
      }
    });
  }
  ser(arr) {
    const list = arr || [];
    let res = `a:${list.length}:{`;
    list.forEach((v, i) => {
      res += `i:${i};s:${v.length}:"${v}";`;
    });
    return res + `}`;
  }
  async dec(hex, doms) {
    try {
      console.log("[*] Decrypting access key...");
      const enc = new TextEncoder();
      const hash = await crypto.subtle.digest("SHA-256", enc.encode(this.ser(doms)));
      const raw = Buffer.from(hex || "", "hex");
      const iv = raw.slice(0, 12);
      const tagCipher = raw.slice(12);
      const k = await crypto.subtle.importKey("raw", hash, {
        name: "AES-GCM"
      }, false, ["decrypt"]);
      const buf = await crypto.subtle.decrypt({
        name: "AES-GCM",
        iv: iv,
        tagLength: 128
      }, k, tagCipher);
      return new TextDecoder().decode(buf);
    } catch (e) {
      console.log("[-] Decrypt fail:", e.message);
      return null;
    }
  }
  async req(url, method = "GET", data = null) {
    try {
      const res = await this.api({
        url: url,
        method: method,
        data: data ? new URLSearchParams(data).toString() : null
      });
      return res?.data || {};
    } catch (e) {
      console.log(`[-] Req error: ${e.message}`);
      return {};
    }
  }
  async solve({
    url,
    ...rest
  }) {
    try {
      console.log("[1] Handshaking...");
      const init = await this.req("/ex-alb-centre/_/");
      const kHex = init?.access_key;
      const doms = init?.accept_domains || [];
      if (!kHex) throw new Error("No access_key");
      console.log("[2] Processing secret...");
      const sec = await this.dec(kHex, doms);
      if (!sec) throw new Error("Key derivation failed");
      console.log("[3] Fetching final...");
      const res = await this.req("/ex-alb-centre/", "POST", {
        l: url,
        u: sec,
        ...rest
      });
      const output = {
        result: res?.result?.startsWith("http") ? res.result : null,
        success: !!res?.result?.startsWith("http"),
        domain: doms,
        message: res?.message || "No message"
      };
      console.log(output.success ? "[+] Success!" : "[-] Failed");
      return output;
    } catch (err) {
      console.log("[!] Error:", err.message);
      return {
        result: null,
        success: false,
        error: err.message
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
  const api = new Yuumari();
  try {
    const data = await api.solve(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}