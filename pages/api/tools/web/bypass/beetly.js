import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  set(url, headers) {
    const host = new URL(url).hostname;
    const setCookies = typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : (headers.get("set-cookie") ? [headers.get("set-cookie")] : []);

    for (const cookie of setCookies) {
      const [pair] = cookie.split(";");
      const index = pair.indexOf("=");
      if (index < 1) continue;

      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (!name) continue;

      this.cookies.set(`${host}:${name}`, {
        name,
        value,
        host
      });
    }
  }

  get(url) {
    const host = new URL(url).hostname;
    const result = [];

    for (const cookie of this.cookies.values()) {
      if (host === cookie.host || host.endsWith(`.${cookie.host}`)) {
        result.push(`${cookie.name}=${cookie.value}`);
      }
    }

    return result.join("; ");
  }
}

class BeetlyBypasser {
  constructor() {
    this.defaultUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    this.maxRedirects = 6;
    this.requestTimeoutMs = 25000;
    this.maxCounterWaitMs = 90000;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  parseAttrs(source) {
    const attrs = {};
    const regex = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let match;

    while ((match = regex.exec(source))) {
      attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    }

    return attrs;
  }

  findForm(html, marker = "go-link") {
    const forms = html.match(/<form\b[\s\S]*?<\/form>/gi) || [];
    for (const form of forms) {
      if (form.includes(marker)) return form;
    }
    return null;
  }

  formFields(form) {
    const fields = new URLSearchParams();
    const inputs = form.match(/<input\b[^>]*>/gi) || [];

    for (const input of inputs) {
      const match = input.match(/<input\b([^>]*)>/i);
      if (!match) continue;

      const attrs = this.parseAttrs(match[1]);
      if (!attrs.name) continue;
      if (["submit", "button", "image", "file"].includes(attrs.type)) continue;

      fields.append(attrs.name, attrs.value || "");
    }

    return fields;
  }

  extractAppVars(html) {
    const patterns = [
      /(?:var|let|const)\s+app_vars\s*=\s*(\{[\s\S]*?\})\s*;/i,
      /app_vars\s*=\s*(\{[\s\S]*?\})\s*;/i,
      /window\.app_vars\s*=\s*(\{[\s\S]*?\})\s*;/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (!match) continue;
      try {
        return JSON.parse(match[1]);
      } catch {}
    }

    return null;
  }

  extractAdType(html) {
    const patterns = [
      /name=["']ad_type["'][^>]*value=["']([^"']+)/i,
      /["']ad_type["']\s*:\s*["']([^"']+)/i,
      /ad_type\s*=\s*["']([^"']+)/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  hasCaptchaField(html) {
    return /captcha|g-recaptcha|h-captcha|cf-turnstile/i.test(html);
  }

  safeDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  failure(message, extra = {}) {
    return {
      status: false,
      result: {
        error: message,
        ...extra
      }
    };
  }

  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async resolve({ url, link, short_url, shortUrl, wait = true } = {}) {
    const targetUrl = url || link || short_url || shortUrl;
    if (!targetUrl || typeof targetUrl !== "string") {
      return this.failure("Parameter 'url' wajib diisi.");
    }

    let currentUrl;
    try {
      currentUrl = new URL(targetUrl.trim());
    } catch {
      return this.failure("Invalid URL");
    }

    if (!["http:", "https:"].includes(currentUrl.protocol)) {
      return this.failure("Invalid URL protocol");
    }

    const jar = new CookieJar();
    const trace = [];
    const headers = {
      "User-Agent": this.defaultUa,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Upgrade-Insecure-Requests": "1"
    };

    try {
      // 1. Get WAF Session
      let html = "";
      let response;

      for (let i = 0; i <= this.maxRedirects; i++) {
        trace.push({
          step: "GET",
          url: currentUrl.href
        });

        response = await this.fetchWithTimeout(currentUrl.href, {
          method: "GET",
          headers: {
            ...headers,
            ...(jar.get(currentUrl.href) ? { Cookie: jar.get(currentUrl.href) } : {})
          },
          redirect: "manual"
        });

        jar.set(currentUrl.href, response.headers);

        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get("location");
          if (!location) {
            return this.failure("Redirect location missing", { trace });
          }

          const nextUrl = new URL(location, currentUrl);
          if (nextUrl.hostname !== currentUrl.hostname) {
            return {
              status: true,
              result: {
                destination: nextUrl.href,
                externalRedirect: true,
                trace
              }
            };
          }

          currentUrl = nextUrl;
          continue;
        }

        html = await response.text();
        break;
      }

      if (!html) {
        return this.failure("Unable to load Beetly page", { trace });
      }

      // 2. Track Intermediate Steps
      const form = this.findForm(html);
      if (!form) {
        return this.failure("Beetly form not found", {
          http_status: response.status,
          url: currentUrl.href,
          trace
        });
      }

      if (this.hasCaptchaField(html)) {
        return this.failure("CAPTCHA detected", {
          url: currentUrl.href,
          trace
        });
      }

      const formMatch = form.match(/<form\b([^>]*)>/i);
      const formAttrs = formMatch ? this.parseAttrs(formMatch[1]) : {};
      const fields = this.formFields(form);
      const appVars = this.extractAppVars(html);
      const adType = this.extractAdType(html);
      const counterValue = Number(appVars?.counter_value ?? appVars?.counter ?? 0);

      trace.push({
        step: "FORM",
        action: formAttrs.action || "",
        fields: [...fields.keys()],
        counter: counterValue,
        adType
      });

      // 3. Wait Counter
      const shouldWait = wait !== false && wait !== "false";
      if (shouldWait && counterValue > 0) {
        const waitTime = Math.min(counterValue * 1000, this.maxCounterWaitMs);
        console.log(`[BEETLY] Menunggu counter ${waitTime}ms...`);
        await this.sleep(waitTime);
      }

      // 4. Submit Beetly Form
      const actionUrl = new URL(formAttrs.action || currentUrl.href, currentUrl);
      const postHeaders = {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: currentUrl.origin,
        Referer: currentUrl.href,
        "X-Requested-With": "XMLHttpRequest"
      };

      const cookie = jar.get(actionUrl.href);
      if (cookie) {
        postHeaders.Cookie = cookie;
      }

      trace.push({
        step: "POST",
        url: actionUrl.href
      });

      const postResponse = await this.fetchWithTimeout(actionUrl.href, {
        method: "POST",
        headers: postHeaders,
        body: fields.toString(),
        redirect: "manual"
      });

      jar.set(actionUrl.href, postResponse.headers);

      // 5. Process Response
      if ([301, 302, 303, 307, 308].includes(postResponse.status)) {
        const location = postResponse.headers.get("location");
        if (location) {
          const destination = new URL(location, actionUrl).href;
          return {
            status: true,
            result: {
              destination,
              trace
            }
          };
        }
      }

      const responseText = await postResponse.text();
      let data = null;
      try {
        data = JSON.parse(responseText);
      } catch {}

      if (!data) {
        const redirectMatch = responseText.match(
          /(?:window\.location(?:\.href)?|location\.href)\s*=\s*["']([^"']+)["']/i
        );

        if (redirectMatch) {
          return {
            status: true,
            result: {
              destination: new URL(this.safeDecode(redirectMatch[1]), actionUrl).href,
              trace
            }
          };
        }

        return this.failure("Unable to parse Beetly response", {
          http_status: postResponse.status,
          response: responseText.slice(0, 1000),
          trace
        });
      }

      const destination =
        data.url ||
        data.destination ||
        data.link ||
        data.href ||
        data.data?.url ||
        data.data?.destination ||
        data.data?.link;

      if (!destination) {
        return this.failure(data.message || data.error || "Destination not found", {
          response: data,
          trace
        });
      }

      return {
        status: true,
        result: {
          destination: new URL(destination, actionUrl).href,
          trace
        }
      };
    } catch (e) {
      if (e?.name === "AbortError") {
        return this.failure(`Request timeout (${this.requestTimeoutMs}ms)`, { trace });
      }
      return this.failure(e?.message || "failed_bypass_beetly", { trace });
    }
  }
}

async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};

  const valid_actions = ["bypass", "resolve"];
  const targetAction = action || (params.url || params.link || params.short_url || params.shortUrl ? "bypass" : "");

  if (!targetAction) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'url' (atau 'action') wajib diisi.",
      available_actions: valid_actions,
      usage: {
        method: "GET / POST",
        examples: {
          direct: "/?url=https://beetly.link/xxxx",
          with_action: "/?action=bypass&url=https://beetly.link/xxxx&wait=true"
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

  const targetUrl = params.url || params.link || params.short_url || params.shortUrl;
  if (!targetUrl) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'url' (atau 'link'/'short_url') wajib diisi."
    });
  }

  const api = new BeetlyBypasser();
  try {
    const response = await api.resolve(params);

    if (!response || response.status === false) {
      return res.status(502).json({
        status: false,
        action: targetAction,
        error: response?.result?.error || "Gagal memproses bypass URL Beetly.",
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