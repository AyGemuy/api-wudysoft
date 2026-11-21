import { ImageResponse } from "next/og";
import { DEFAULT_CONFIG, PRESETS, THEME_ALIASES, resolveColors, mix } from "@/src/lib/themes";

/**
 * Gambar preview (Open Graph 1200×630) yang dibuat otomatis dari isi konten.
 *   /api/og?title=...&desc=...&label=PASTE&meta=javascript · 2 jam lalu&theme=coral
 * `theme` = id preset tema (opsional) → warna gambar mengikuti tema; bawaan = tema default situs.
 * Dipakai oleh <Seo /> dan halaman preview crawler. Edge runtime → cepat & tanpa file statis.
 */
export const config = { runtime: "edge" };

const clip = (s, n) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** Palet gambar dari preset tema (gelap atau terang). */
function palette(id) {
  const rid = THEME_ALIASES[id] || id;
  const themeId = PRESETS.some((p) => p.id === rid) ? rid : DEFAULT_CONFIG.theme;
  const c = resolveColors({ ...DEFAULT_CONFIG, theme: themeId, custom: {} });
  const bg = mix(c.bg1, c.a1, c.light ? 0.1 : 0.22);
  return {
    bg,
    bar: c.a1,
    accent: c.light ? c.a1 : c.a2,
    accent2: c.a2,
    a3: c.a3,
    bg2: mix(c.bg2, c.a1, c.light ? 0.04 : 0.1),
    light: c.light,
    text: c.text,
    sub: mix(c.text, bg, 0.22),
    muted: c.muted,
  };
}

export default function handler(req) {
  const q = new URL(req.url).searchParams;
  const P = palette(q.get("theme"));
  const title = clip(q.get("title") || "Wudysoft", 90);
  const desc = clip(q.get("desc") || "API, Tools & Developer Platform", 180);
  const label = clip(q.get("label") || "WUDYSOFT", 24).toUpperCase();
  const meta = clip(q.get("meta") || "", 60);
  const big = title.length > 44 ? 58 : title.length > 26 ? 72 : 88;
  const ln = P.light ? "rgba(15,23,42,0.14)" : "rgba(255,255,255,0.24)";
  const glassBg = P.light ? "rgba(255,255,255,0.66)" : "rgba(255,255,255,0.09)";
  const chip = { display: "flex", alignItems: "center", padding: "8px 20px", borderRadius: 999, border: `2px solid ${ln}`, background: glassBg, fontSize: 24, fontWeight: 700 };
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1, 7), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  // Bentuk datar (bukan gradien halus) agar PNG kecil — WhatsApp menampilkan preview besar hanya bila gambar ringan.
  const blob = (x, y, size, color, a) => ({ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: 9999, background: rgba(color, a), display: "flex" });
  const shortDesc = clip(desc, 96);
  const bars = [46, 70, 54, 88, 64, 100, 76];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: P.bg, color: P.text, fontFamily: "sans-serif", overflow: "hidden" }}>
        <div style={blob(-220, -320, 820, P.bar, P.light ? 0.3 : 0.5)} />
        <div style={blob(-100, -200, 560, P.bar, P.light ? 0.25 : 0.4)} />
        <div style={blob(640, 230, 780, P.a3, P.light ? 0.28 : 0.42)} />
        <div style={blob(820, 330, 480, P.a3, P.light ? 0.22 : 0.35)} />
        <div style={blob(780, -320, 560, P.accent2, P.light ? 0.3 : 0.4)} />

        {/* kiri: judul besar, deskripsi singkat */}
        <div style={{ position: "absolute", left: 72, top: 64, bottom: 64, width: 650, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: P.bar, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800, color: "#fff", border: "2px solid rgba(255,255,255,0.5)" }}>W</div>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>Wudysoft</div>
            <div style={{ ...chip, color: P.accent, letterSpacing: 3, marginLeft: 10 }}>{label}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", fontSize: big, fontWeight: 800, lineHeight: 1.04, letterSpacing: -3 }}>{title}</div>
            <div style={{ display: "flex", fontSize: 28, lineHeight: 1.35, color: P.sub, maxWidth: 600 }}>{shortDesc}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ ...chip, gap: 12 }}>
              <div style={{ display: "flex", width: 12, height: 12, borderRadius: 9999, background: "#34d399" }} />
              api-wudysoft.netlify.app
            </div>
            {meta ? <div style={{ display: "flex", fontSize: 24, color: P.muted }}>{meta}</div> : null}
          </div>
        </div>

        {/* kanan: kartu kaca ala bento (dekoratif, mengikuti warna tema) */}
        <div style={{ position: "absolute", left: 760, top: 78, width: 360, height: 250, display: "flex", flexDirection: "column", padding: 24, borderRadius: 32, border: `2px solid ${ln}`, background: glassBg, transform: "rotate(3deg)" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ display: "flex", width: 14, height: 14, borderRadius: 9999, background: c }} />)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 26 }}>
            <div style={{ display: "flex", height: 16, width: "78%", borderRadius: 8, background: P.bar }} />
            <div style={{ display: "flex", height: 16, width: "56%", borderRadius: 8, background: P.accent2 }} />
            <div style={{ display: "flex", height: 16, width: "66%", borderRadius: 8, background: P.a3 }} />
            <div style={{ display: "flex", height: 16, width: "40%", borderRadius: 8, background: rgba(P.text, 0.25) }} />
          </div>
        </div>
        <div style={{ position: "absolute", left: 830, top: 330, width: 300, height: 220, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 24, borderRadius: 32, border: `2px solid ${ln}`, background: P.light ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.12)", transform: "rotate(-4deg)" }}>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: P.muted, marginBottom: 14, letterSpacing: 2 }}>REALTIME</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 100 }}>
            {bars.map((h, i) => <div key={i} style={{ display: "flex", flex: 1, height: `${h}%`, borderRadius: 8, background: i % 2 ? P.a3 : P.accent2 }} />)}
          </div>
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
