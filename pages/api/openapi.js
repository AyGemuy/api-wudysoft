import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import spec from "@/src/generated/openapi.json";
import apiConfig from "@/configs/apiConfig";

/**
 * GET /api/openapi → dokumen OpenAPI 3 (dibuat otomatis oleh scripts/openapi-gen.mjs
 * saat `dev`/`build`, tidak lagi bergantung pada request ke domain produksi).
 * Bisa diimpor langsung ke Postman, Insomnia, atau Swagger UI.
 */
function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const proto =
    String(req.headers["x-forwarded-proto"] || "").split(",")[0] ||
    (/^(localhost|127\.|192\.168\.)/.test(host) ? "http" : "https");

  const servers = [{ url: `${proto}://${host}`, description: "Origin saat ini" }];
  const prod = String(apiConfig.DOMAIN_URL || "").replace(/\/$/, "");
  if (prod) {
    const prodUrl = prod.startsWith("http") ? prod : `https://${prod}`;
    if (!servers.some((s) => s.url === prodUrl)) servers.push({ url: prodUrl, description: "Production" });
  }

  res.setHeader("Cache-Control", "public, max-age=60");
  return res.status(200).json({ ...spec, servers });
}

export default withApiLog(withRateLimit(handler));
