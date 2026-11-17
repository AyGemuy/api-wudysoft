import site from "@/configs/siteConfig";

/** /robots.txt — dibuat dari konfigurasi situs. */
export async function getServerSideProps({ res }) {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Allow: /api/og",
    "Disallow: /api/",
    "Disallow: /auth",
    "Disallow: /profile",
    "Disallow: /playground",
    "Disallow: /tools/pastes/",
    "Disallow: /tools/code-share/",
    "",
    `Sitemap: ${site.SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  res.write(body);
  res.end();
  return { props: {} };
}

export default function Robots() {
  return null;
}
