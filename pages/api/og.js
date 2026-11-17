import { ImageResponse } from "next/og";

/**
 * Generator gambar pratinjau (Open Graph / Twitter card) 1200x630.
 * /api/og?title=...&desc=...&tag=PASTE&path=/paste/abc
 * Dipakai otomatis oleh <Seo /> dan oleh pratinjau link API, sehingga setiap
 * halaman / endpoint punya gambar pratinjau sesuai isi kontennya.
 */
export const config = { runtime: "edge" };

const clean = (v, max) => String(v || "")
  .replace(/\p{Extended_Pictographic}/gu, "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, max);

export default function handler(req) {
  const { searchParams } = new URL(req.url);
  const title = clean(searchParams.get("title"), 96) || "Wudysoft";
  const desc = clean(searchParams.get("desc"), 190);
  const tag = clean(searchParams.get("tag"), 28).toUpperCase() || "WUDYSOFT";
  const path = clean(searchParams.get("path"), 60);
  const host = clean(req.headers.get("host"), 60);

  const size = title.length <= 24 ? 88 : title.length <= 44 ? 70 : title.length <= 70 ? 56 : 46;

  const Square = ({ c }) => <div style={{ width: 30, height: 30, background: c, display: "flex" }} />;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "linear-gradient(135deg,#f3f3f3 0%,#ffffff 55%,#e6f1fb 100%)", color: "#1b1b1b", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex" }}><Square c="#f25022" /><div style={{ width: 4 }} /><Square c="#7fba00" /></div>
              <div style={{ height: 4 }} />
              <div style={{ display: "flex" }}><Square c="#00a4ef" /><div style={{ width: 4 }} /><Square c="#ffb900" /></div>
            </div>
            <div style={{ marginLeft: 22, fontSize: 44, fontWeight: 600, letterSpacing: -1, display: "flex" }}>Wudysoft</div>
          </div>
          <div style={{ display: "flex", padding: "10px 22px", background: "#0067b8", color: "#fff", fontSize: 26, fontWeight: 700, letterSpacing: 2 }}>{tag}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: size, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2, maxHeight: size * 1.08 * 3, overflow: "hidden" }}>{title}</div>
          {desc ? <div style={{ display: "flex", marginTop: 26, fontSize: 32, lineHeight: 1.35, color: "#5e5e5e", maxHeight: 32 * 1.35 * 3, overflow: "hidden" }}>{desc}</div> : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "3px solid #0078d4", paddingTop: 22, fontSize: 28, color: "#0067b8" }}>
          <div style={{ display: "flex" }}>{host}{path}</div>
          <div style={{ display: "flex", color: "#5e5e5e" }}>API · Tools · Komunitas</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
