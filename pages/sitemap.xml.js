import site from "@/configs/siteConfig";
import { SITE_PAGES } from "@/src/lib/siteMap";

/** /sitemap.xml — daftar halaman publik, dibuat otomatis dari src/lib/siteMap.js. */
const PRIORITY = { "/": "1.0" };

export async function getServerSideProps({ res }) {
  const now = new Date().toISOString();
  const urls = [...new Set(["/", ...SITE_PAGES.filter((p) => !p.external && !p.locked).map((p) => p.href)])]
    .filter((h) => h && h.startsWith("/") && !/^\/(auth|profile|playground|api)/.test(h));
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map((h) => `  <url><loc>${site.SITE_URL}${h === "/" ? "" : h}</loc><lastmod>${now}</lastmod><changefreq>${h === "/" ? "daily" : "weekly"}</changefreq><priority>${PRIORITY[h] || "0.7"}</priority></url>`)
      .join("\n") +
    `\n</urlset>\n`;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.write(xml);
  res.end();
  return { props: {} };
}

export default function Sitemap() {
  return null;
}
