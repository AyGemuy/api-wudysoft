import axios from "axios";
class NowSearch {
  constructor() {
    this.http = axios.create({
      baseURL: "https://android.nowsearch.net",
      headers: {
        "User-Agent": "okhttp/5.1.0",
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    });
  }
  async tok() {
    console.log("[Process] Fetching session token...");
    try {
      const fb = await axios.post("https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=AIzaSyDe4bvj4g-hWhpFtPVQMNCpg721j8yxZls", {
        clientType: "CLIENT_TYPE_ANDROID"
      }, {
        headers: {
          "User-Agent": "okhttp/5.1.0"
        }
      });
      const id = fb?.data?.idToken || null;
      if (!id) return null;
      const api = await this.http.post("/auth/firebase", {
        idToken: id
      });
      return api?.data?.accessToken || null;
    } catch (err) {
      console.log("[Error] Token generation failed:", err?.message || err);
      return null;
    }
  }
  async pol(id, tk) {
    let c = 0;
    console.log(`[Process] Polling started for Job: ${id}`);
    while (c < 60) {
      try {
        c++;
        console.log(`[Process] Checking task progress (${c}/60)...`);
        const res = await this.http.get(`/search/status/${id}`, {
          headers: {
            Authorization: `Bearer ${tk}`
          }
        });
        const st = res?.data?.status || "queued";
        if (st === "completed" || st === "failed") {
          console.log(`[Process] Task finalized with status: ${st}`);
          return res?.data || {};
        }
        await new Promise(r => setTimeout(r, 3e3));
      } catch (err) {
        console.log("[Error] Polling fetch error:", err?.message || err);
        await new Promise(r => setTimeout(r, 3e3));
      }
    }
    return {
      error: "Polling timeout exceeded"
    };
  }
  async search({
    token,
    prompt,
    ...rest
  }) {
    console.log("[Process] Verifying required fields...");
    const p = prompt || "";
    if (!p) {
      return {
        error: 'Missing required field: "prompt" is strictly required.'
      };
    }
    try {
      const tk = token || await this.tok();
      if (!tk) return {
        error: "Authorization failed: No token available."
      };
      const payload = {
        prompt: p,
        additionalInfo: null,
        mode: "fast",
        username: null,
        faceImageUrl: null,
        image: null,
        ...rest
      };
      console.log("[Process] Submitting search payload...");
      const res = await this.http.post("/search", payload, {
        headers: {
          Authorization: `Bearer ${tk}`
        }
      });
      const data = res?.data || {};
      const job = data?.jobId || null;
      if (job) {
        const result = await this.pol(job, tk);
        return {
          ...result,
          token: tk
        };
      }
      return {
        ...data,
        token: tk
      };
    } catch (err) {
      console.log("[Error] Request failed:", err?.message || err);
      return {
        error: err?.message || "Internal transmission failure",
        detail: err?.response?.data || null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new NowSearch();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}