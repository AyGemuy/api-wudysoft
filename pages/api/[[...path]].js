import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import { SITE_PAGES } from "@/src/lib/siteMap";

const DOC_IDS = new Set(["playground", "openapi", "health", "stats"]);

const navigablePages = SITE_PAGES.filter(
  (page) => page.href && !page.href.startsWith("#") && !page.action
);

const documentation = navigablePages
  .filter((page) => DOC_IDS.has(page.id))
  .map((page) => ({
    name: page.title,
    url: page.href,
    status: page.status,
    desc: page.desc,
    ...(page.locked ? { authRequired: true } : {}),
  }));

const tools = navigablePages
  .filter((page) => page.category === "tools")
  .map((page) => ({
    name: page.title,
    url: page.href,
    status: page.status,
  }));

const otherPages = navigablePages
  .filter((page) => !DOC_IDS.has(page.id) && page.category !== "tools")
  .map((page) => ({
    name: page.title,
    url: page.href,
    category: page.category,
  }));

const playgroundUrl =
  SITE_PAGES.find((p) => p.id === "playground")?.href || "/playground";
const openapiUrl =
  SITE_PAGES.find((p) => p.id === "openapi")?.href || "/api/openapi";
const healthUrl =
  SITE_PAGES.find((p) => p.id === "health")?.href || "/api/health";

async function handler(req, res) {
  const rawPath = req.query.path;
  const pathSegments = Array.isArray(rawPath)
    ? rawPath
    : rawPath
      ? [rawPath]
      : [];
  const requestedPath = pathSegments.join("/");
  const fullPath = requestedPath ? `/api/${requestedPath}` : "/api";

  try {
    res.setHeader("Content-Type", "application/json");
    return res.status(404).json({
      success: false,
      error: {
        status: 404,
        code: "ROUTE_NOT_FOUND",
        message: `Endpoint ${req.method} ${fullPath} tidak ditemukan.`,
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.url,
        documentation,
        tools,
        otherPages,
        suggestion: `Cek spesifikasi endpoint di ${openapiUrl}, pantau status di ${healthUrl}, atau coba langsung melalui ${playgroundUrl}.`,
      },
    });
  } catch (error) {
    console.error("Internal Server Error while processing 404:", error);
    return res.status(500).json({
      success: false,
      error: {
        status: 500,
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal error during 404 processing.",
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.url,
      },
    });
  }
}

export default withApiLog(withRateLimit(handler));