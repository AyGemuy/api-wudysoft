import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import spec from "@/src/generated/openapi.json";
import site from "@/configs/siteConfig";

/**
 * Preview link untuk ROUTE API. Middleware mengalihkan request GET /api/* dari crawler link-preview
 * (WhatsApp, Telegram, Discord, Slack, Facebook, X, LinkedIn, dll.) ke sini. Kita menjalankan endpoint
 * aslinya satu kali, meringkas isi JSON-nya, lalu mengembalikan halaman HTML kecil berisi meta
 * Open Graph + gambar /api/og — sehingga tautan API menampilkan kartu preview sesuai isi responsnya.
 * Aksi yang mengubah data (create/update/delete/clear) TIDAK dijalankan untuk preview.
 */
const UNSAFE = /(^|[&?])action=(create|update|delete|clear)\b/i;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clip = (s, n) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

function specInfo(pathname) {
  const ops = spec?.paths?.[pathname];
  const get = ops?.get || Object.values(ops || {})[0];
  return get ? { summary: get.summary, description: get.description } : null;
}

/** Ringkas JSON respons menjadi {title, desc, label}. */
function summarize(pathname, data, status) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    if (data.title && data.content !== undefined) {
      return { title: data.title, desc: data.content, label: `PASTE · ${data.syntax || "text"}` };
    }
    if (data.fileName && data.code !== undefined) {
      return { title: data.fileName, desc: data.code, label: `CODE · ${data.tag || "share"}` };
    }
    if (data.error || data.message) {
      return { title: status >= 400 ? `Error ${status}` : "Respons API", desc: data.error || data.message, label: `HTTP ${status}` };
    }
    const pairs = Object.entries(data)
      .filter(([, v]) => v === null || ["string", "number", "boolean"].includes(typeof v))
      .slice(0, 6)
      .map(([k, v]) => `${k}: ${v}`);
    if (pairs.length) return { title: `GET ${pathname}`, desc: pairs.join(" · "), label: `HTTP ${status}` };
  }
  if (Array.isArray(data)) {
    const first = data[0]?.title || data[0]?.fileName || "";
    return { title: `GET ${pathname}`, desc: `${data.length} item${first ? ` · terbaru: ${first}` : ""}`, label: `HTTP ${status}` };
  }
  return null;
}

async function handler(req, res) {
  const origin = (() => {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0] || (/^(localhost|127\.)/.test(host || "") ? "http" : "https");
    return host ? `${proto}://${host}` : site.SITE_URL;
  })();

  const target = String(req.query.p || "");
  if (!target.startsWith("/api/") || target.startsWith("//") || /^\/api\/(preview|auth|avatar)/.test(target)) {
    return res.status(400).send("Bad request");
  }
  const pathname = target.split("?")[0];
  const info = specInfo(pathname);

  let title = `GET ${pathname}`;
  let desc = info?.description || info?.summary || "Endpoint API Wudysoft.";
  let label = "API";

  if (!UNSAFE.test(target)) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch(`${origin}${target}`, { headers: { "user-agent": "WudysoftPreview/1.0", accept: "application/json" }, signal: ctl.signal });
      clearTimeout(t);
      const ct = r.headers.get("content-type") || "";
      const text = (await r.text()).slice(0, 200_000);
      const sum = ct.includes("json") ? summarize(pathname, JSON.parse(text), r.status) : { title, desc: text, label: `HTTP ${r.status}` };
      if (sum) ({ title, desc, label } = sum);
    } catch {
      /* gagal menjalankan endpoint: pakai info dari OpenAPI */
    }
  } else {
    desc = `${info?.summary || "Endpoint API"} — aksi ini mengubah data, jadi tidak dijalankan untuk preview.`;
  }

  title = clip(title, 90);
  desc = clip(desc, 200);
  const img = `${site.SITE_URL}/api/og?${new URLSearchParams({ title, desc, label, meta: pathname })}`;
  const full = `${title} · ${site.APP_NAME}`;
  const url = `${site.SITE_URL}${target}`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
  return res.status(200).send(`<!doctype html><html lang="id"><head><meta charset="utf-8">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(site.APP_NAME)}">
<meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(img)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(full)}">
<meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(img)}">
</head><body><h1>${esc(title)}</h1><p>${esc(desc)}</p></body></html>`);
}

export default withApiLog(withRateLimit(handler));
