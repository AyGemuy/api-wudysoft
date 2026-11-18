import { ImageResponse } from "next/og";

/**
 * Gambar preview (Open Graph 1200×630) yang dibuat otomatis dari isi konten.
 *   /api/og?title=...&desc=...&label=PASTE&meta=javascript · 2 jam lalu
 * Dipakai oleh <Seo /> dan halaman preview crawler. Edge runtime → cepat & tanpa file statis.
 */
export const config = { runtime: "edge" };

const clip = (s, n) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

export default function handler(req) {
  const q = new URL(req.url).searchParams;
  const title = clip(q.get("title") || "Wudysoft", 90);
  const desc = clip(q.get("desc") || "API, Tools & Developer Platform", 180);
  const label = clip(q.get("label") || "WUDYSOFT", 24).toUpperCase();
  const meta = clip(q.get("meta") || "", 60);
  const big = title.length > 48 ? 54 : title.length > 28 ? 66 : 80;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#0c2a47",
          borderBottom: "14px solid #0078d4",
          color: "#f3f2f1",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "linear-gradient(135deg, #4cc2ff, #0078d4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              W
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 1 }}>Wudysoft</div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 20px",
              borderRadius: 999,
              border: "2px solid #4cc2ff",
              color: "#4cc2ff",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 3,
            }}
          >
            {label}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: big, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1 }}>{title}</div>
          <div style={{ display: "flex", fontSize: 32, lineHeight: 1.35, color: "#c8c6c4" }}>{desc}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#a19f9d" }}>
          <div style={{ display: "flex" }}>{meta}</div>
          <div style={{ display: "flex" }}>api-wudysoft.netlify.app</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
    }
  );
}
