import cloudscraper from "cloudscraper";
const BASE = "https://web2.temp-mail.org";
const MAILBOX = "/mailbox";
const MESSAGES = "/messages";
class TempMail {
  constructor() {
    this.maxRetry = 5;
  }
  async req(opts) {
    for (let i = 0; i < this.maxRetry; i++) {
      try {
        console.log(`[req] ${opts.method} ${opts.uri}`);
        const res = await cloudscraper({
          ...opts,
          cloudflareTimeout: 7e3,
          followAllRedirects: true,
          json: false
        });
        return typeof res === "string" ? JSON.parse(res) : res;
      } catch (err) {
        const msg = err?.error || err?.message || "Unknown error";
        if (i === this.maxRetry - 1) throw new Error(msg);
        const delay = Math.pow(2, i) * 1e3;
        console.log(`[req] retry ${i + 1} in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  authHdr(token) {
    return {
      Authorization: `Bearer ${token}`
    };
  }
  async create({
    ...rest
  }) {
    console.log("[create] generating email...");
    try {
      const res = await this.req({
        uri: BASE + MAILBOX,
        method: "POST",
        body: JSON.stringify({
          ...rest
        }),
        headers: {
          "Content-Type": "application/json"
        }
      });
      const token = res?.token;
      const email = res?.mailbox;
      if (!token || !email) throw new Error("Gagal generate email dari server");
      console.log("[create] email:", email);
      return {
        success: true,
        result: {
          token: token,
          email: email
        }
      };
    } catch (err) {
      console.error("[create] error:", err?.message);
      return {
        success: false,
        result: err?.message
      };
    }
  }
  async msgDetail(id, token) {
    console.log("[msgDetail] id:", id);
    try {
      const d = await this.req({
        uri: `${BASE}${MESSAGES}/${id}`,
        method: "GET",
        headers: this.authHdr(token)
      });
      return {
        id: d?._id,
        receivedAt: d?.receivedAt,
        from: d?.from,
        subject: d?.subject,
        bodyPreview: d?.bodyPreview,
        bodyHtml: d?.bodyHtml ?? null,
        attachmentsCount: d?.attachmentsCount || 0,
        attachments: d?.attachments || [],
        createdAt: d?.createdAt ?? null
      };
    } catch (err) {
      console.error("[msgDetail] error:", err?.message);
      return null;
    }
  }
  async message({
    token,
    ...rest
  }) {
    if (!token) return {
      success: false,
      result: "Token tidak boleh kosong"
    };
    console.log("[message] fetching inbox...");
    try {
      const res = await this.req({
        uri: BASE + MESSAGES,
        method: "GET",
        headers: this.authHdr(token),
        qs: {
          ...rest
        }
      });
      const email = res?.mailbox;
      const raw = res?.messages || [];
      console.log("[message] total:", raw.length);
      if (!raw.length) return {
        success: true,
        result: {
          email: email,
          messages: []
        }
      };
      const messages = await Promise.all(raw.map(async m => {
        const detail = await this.msgDetail(m?._id, token);
        return detail ?? {
          id: m?._id,
          receivedAt: m?.receivedAt,
          from: m?.from,
          subject: m?.subject,
          bodyPreview: m?.bodyPreview,
          bodyHtml: null,
          attachmentsCount: m?.attachmentsCount || 0,
          attachments: [],
          createdAt: null,
          error: "Gagal mengambil detail pesan"
        };
      }));
      return {
        success: true,
        result: {
          email: email,
          messages: messages
        }
      };
    } catch (err) {
      console.error("[message] error:", err?.message);
      return {
        success: false,
        result: err?.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["create", "message"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=create"
      }
    });
  }
  const api = new TempMail();
  try {
    let response;
    switch (action) {
      case "create":
        response = await api.create(params);
        break;
      case "message":
        if (!params.token) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'token' wajib diisi untuk action 'message'."
          });
        }
        response = await api.message(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      action: action,
      status: true,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}