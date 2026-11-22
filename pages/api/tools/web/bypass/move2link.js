import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";

class Move2LinkBypasser {
  constructor() {
    this.defaultApiKey = process.env.FGSI_API_KEY || "";
    this.fgsiApiBase = "https://fgsi.dpdns.org";
    this.m2lApiBase = "https://m2l-api.siendu.com/api/v1";
    this.csrfToken = "f62i45iojk53j53kjqnfa";
    this.minWaitEasy = 5.2;
    this.minWaitStep = 12.2;
    this.userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  decodeJwtPayload(token) {
    try {
      const part = token.split(".")[1];
      if (!part) return null;
      const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    } catch {
      return null;
    }
  }

  computeSignedImps(pid, lid) {
    const base = [5200, 7100, 12400];
    const n = base.length >= 3 ? 2 : base.length === 2 ? 1 : -1;

    const r = String(pid ?? "");
    const nStr = String(lid ?? "");

    const a = /^\d+$/.test(r) && /^\d+$/.test(nStr)
      ? 10 * Number(r.slice(-1)) + Number(nStr.slice(-1))
      : -1;

    if (n < 0 || a < 0) return base;

    const s = base[n];
    const res = [...base];
    res[n] = 100 * Math.floor(s / 100) + a;
    return res;
  }

  async fetchWafSession(url, apiKey, timeout = 30000, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const solverUrl = new URL("/api/tools/cfclearance/waf-session", this.fgsiApiBase);
        solverUrl.searchParams.set("apikey", apiKey);
        solverUrl.searchParams.set("url", url);

        console.log(`[WAF] Mengambil SESSION cookie (attempt ${attempt}/${retries})...`);
        const res = await fetch(solverUrl, {
          headers: {
            accept: "application/json"
          },
          signal: AbortSignal.timeout(timeout)
        });

        if (!res.ok) {
          throw new Error(`Solver API responded with HTTP ${res.status}`);
        }

        const json = await res.json();
        if (json.status && json.data?.cookies) {
          const sessionCookie = json.data.cookies.find((c) => c.name === "SESSION");
          if (sessionCookie?.value) {
            return sessionCookie.value;
          }
        }

        throw new Error(json.message || "No SESSION cookie returned by clearance API.");
      } catch (err) {
        if (attempt === retries) throw err;
        await this.sleep(1500);
      }
    }
  }

  async resolve({ url, link, short_url, shortUrl, apikey, api_key, apiKey, timeout = 45000 } = {}) {
    const startTime = Date.now();
    const targetUrl = url || link || short_url || shortUrl;
    const resolvedApiKey = apikey || api_key || apiKey || this.defaultApiKey;
    const timeoutMs = Number(timeout) > 0 ? Number(timeout) : 45000;

    if (!targetUrl || typeof targetUrl !== "string" || !/^https?:\/\//i.test(targetUrl.trim())) {
      return {
        status: false,
        result: {
          shortlink: targetUrl || null,
          error: "Invalid URL provided.",
          execution_time_ms: Date.now() - startTime
        }
      };
    }

    if (!resolvedApiKey) {
      return {
        status: false,
        result: {
          shortlink: targetUrl.trim(),
          error: "Parameter 'apikey' (atau env FGSI_API_KEY) wajib diisi.",
          execution_time_ms: Date.now() - startTime
        }
      };
    }

    const cleanUrl = targetUrl.trim();
    let slug;

    try {
      const parsedUrl = new URL(cleanUrl);
      slug = parsedUrl.pathname.replace(/^\/+|\/+$/g, "");

      // 1. Get WAF Session
      let token = await this.fetchWafSession(cleanUrl, resolvedApiKey, timeoutMs);
      let claims = this.decodeJwtPayload(token);

      if (!claims) {
        throw new Error("Unable to decode session JWT claims.");
      }

      const maxSteps = Number(claims.max_step || 1);
      const adLevel = Number(claims.adl || 1);
      const isEasy = adLevel === 4;
      let stepsTaken = 0;

      const baseHeaders = {
        "Content-Type": "application/json",
        "User-Agent": this.userAgent,
        Origin: "https://siendu.com",
        Referer: "https://siendu.com/"
      };

      // 2. Track Intermediate Steps
      while (Number(claims.step) < maxSteps - 1) {
        stepsTaken++;
        const imps = this.computeSignedImps(claims.pid, claims.lid);
        const elapsed = Math.floor(Date.now() / 1000) - Number(claims.sat || 0);
        const waitTime = Math.max(0, this.minWaitStep - elapsed);

        if (waitTime > 0) {
          console.log(`[STEP ${claims.step}] Menunggu ${waitTime.toFixed(1)}s...`);
          await this.sleep(Math.ceil(waitTime * 1000));
        }

        const trackRes = await fetch(`${this.m2lApiBase}/views/track`, {
          method: "PUT",
          headers: {
            ...baseHeaders,
            Cookie: `SESSION=${token}; IP_LOCALE=en; imps=${encodeURIComponent(JSON.stringify(imps))}`
          },
          body: JSON.stringify({
            token,
            csrf_token: this.csrfToken,
            imps
          }),
          signal: AbortSignal.timeout(timeoutMs)
        });

        const trackData = await trackRes.json().catch(() => null);
        if (!trackRes.ok || !trackData?.data?.token) {
          throw new Error(
            trackData?.status?.error ||
            `Step ${claims.step} advancement failed (HTTP ${trackRes.status}).`
          );
        }

        token = trackData.data.token;
        claims = this.decodeJwtPayload(token);
        if (!claims) {
          throw new Error("Unable to decode updated session JWT claims.");
        }
      }

      // 3. Finalize View
      stepsTaken++;
      const imps = this.computeSignedImps(claims.pid, claims.lid);
      const requiredWait = isEasy ? this.minWaitEasy : this.minWaitStep;
      const elapsed = Math.floor(Date.now() / 1000) - Number(claims.sat || 0);
      const waitTime = Math.max(0, requiredWait - elapsed);

      if (waitTime > 0) {
        console.log(`[FINALIZE] Menunggu ${waitTime.toFixed(1)}s...`);
        await this.sleep(Math.ceil(waitTime * 1000));
      }

      const finalRes = await fetch(`${this.m2lApiBase}/views/finalize`, {
        method: "POST",
        headers: {
          ...baseHeaders,
          Cookie: `SESSION=${token}; IP_LOCALE=en; imps=${encodeURIComponent(JSON.stringify(imps))}`
        },
        body: JSON.stringify({
          imps,
          token,
          csrf_token: this.csrfToken
        }),
        signal: AbortSignal.timeout(timeoutMs)
      });

      const finalData = await finalRes.json().catch(() => null);
      if (!finalRes.ok || !finalData?.data?.redirect_url) {
        throw new Error(
          finalData?.status?.error ||
          `Finalize failed with HTTP ${finalRes.status}.`
        );
      }

      const redirectUrl = String(finalData.data.redirect_url);

      return {
        status: true,
        result: {
          shortlink: cleanUrl,
          slug: slug || claims.shortlink_slug,
          tier: isEasy ? "easy" : `${maxSteps}_step`,
          ad_level: adLevel,
          max_steps: maxSteps,
          steps_taken: stepsTaken,
          original_url: redirectUrl,
          destination: redirectUrl,
          meta: {
            link_id: claims.lid,
            publisher_id: claims.pid,
            viewer_id: claims.vid,
            country_code: claims.country_code
          },
          execution_time_ms: Date.now() - startTime
        }
      };
    } catch (err) {
      return {
        status: false,
        result: {
          shortlink: cleanUrl,
          slug,
          error: err?.message || "failed_bypass_move2link",
          execution_time_ms: Date.now() - startTime
        }
      };
    }
  }
}

async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};

  const valid_actions = ["bypass", "resolve"];
  const targetUrl = params.url || params.link || params.short_url || params.shortUrl;
  const targetAction = action || (targetUrl ? "bypass" : "");

  if (!targetAction) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'url' (atau 'action') wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          direct: "/?url=https://move2link.co/xxxx&apikey=FGSI_API_KEY",
          with_action: "/?action=bypass&url=https://move2link.co/xxxx&apikey=FGSI_API_KEY"
        }
      }
    });
  }

  if (!valid_actions.includes(targetAction)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${targetAction}'.`,
      valid_actions
    });
  }

  if (!targetUrl) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'url' (atau 'link'/'short_url') wajib diisi."
    });
  }

  const api = new Move2LinkBypasser();
  try {
    const response = await api.resolve(params);

    if (!response || response.status === false) {
      return res.status(502).json({
        status: false,
        action: targetAction,
        error: response?.result?.error || "Gagal memproses bypass URL Move2Link.",
        result: response?.result || null
      });
    }

    return res.status(200).json({
      action: targetAction,
      ...response
    });
  } catch (error) {
    console.error(`[API HANDLER ERROR] Exception on '${targetAction}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada Serverless Handler.",
      error: error?.message || "Unknown Error"
    });
  }
}

export default withApiLog(withRateLimit(handler));