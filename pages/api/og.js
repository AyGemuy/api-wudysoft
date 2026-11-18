import { ImageResponse } from "next/og";

/**
 * Gambar preview (Open Graph 1200×630) bergaya Glassmorphism.
 *   /api/og?title=...&desc=...&label=PASTE&meta=javascript · 2 jam lalu
 * Dipakai oleh <Seo /> dan halaman preview crawler. Edge runtime → cepat & tanpa file statis.
 */
export const config = { runtime: "edge" };

const clip = (s, n) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

const LABEL_ACCENTS = {
  PASTE: { primary: "#34d399", secondary: "#06b6d4", glow: "rgba(52, 211, 153, 0.35)" },
  CODE: { primary: "#a78bfa", secondary: "#38bdf8", glow: "rgba(167, 139, 250, 0.38)" },
  API: { primary: "#38bdf8", secondary: "#6366f1", glow: "rgba(56, 189, 248, 0.38)" },
  STATS: { primary: "#22d3ee", secondary: "#3b82f6", glow: "rgba(34, 211, 238, 0.35)" },
  DOCS: { primary: "#60a5fa", secondary: "#818cf8", glow: "rgba(96, 165, 250, 0.35)" },
  ERROR: { primary: "#fb7185", secondary: "#f59e0b", glow: "rgba(251, 113, 133, 0.35)" },
  DEFAULT: { primary: "#4cc2ff", secondary: "#8b5cf6", glow: "rgba(76, 194, 255, 0.38)" },
};

export default function handler(req) {
  const q = new URL(req.url).searchParams;
  const title = clip(q.get("title") || "Wudysoft", 90);
  const desc = clip(q.get("desc") || "API, Tools & Developer Platform", 170);
  const label = clip(q.get("label") || q.get("tag") || "WUDYSOFT", 24).toUpperCase();
  const meta = clip(q.get("meta") || "", 60);
  const host = clip(q.get("host") || "api-wudysoft.netlify.app", 40);

  const big = title.length > 52 ? 48 : title.length > 32 ? 58 : 70;
  const accent = LABEL_ACCENTS[label] || LABEL_ACCENTS.DEFAULT;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
          padding: 46,
          backgroundColor: "#060b18",
          backgroundImage:
            "linear-gradient(135deg, #060b18 0%, #0b162f 52%, #0e132b 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Subtle Cyber Grid Layer */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Ambient Glowing Orbs (memberi efek refraksi di balik kaca) */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -80,
            width: 520,
            height: 520,
            borderRadius: 999,
            display: "flex",
            backgroundImage: `radial-gradient(circle, ${accent.glow} 0%, rgba(56, 189, 248, 0.08) 45%, transparent 72%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -150,
            right: -60,
            width: 560,
            height: 560,
            borderRadius: 999,
            display: "flex",
            backgroundImage:
              "radial-gradient(circle, rgba(139, 92, 246, 0.34) 0%, rgba(59, 130, 246, 0.1) 48%, transparent 72%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 180,
            right: 260,
            width: 280,
            height: 280,
            borderRadius: 999,
            display: "flex",
            backgroundImage:
              "radial-gradient(circle, rgba(16, 185, 129, 0.16) 0%, transparent 70%)",
          }}
        />

        {/* Main Frosted Glass Card */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "46px 54px",
            borderRadius: 32,
            backgroundImage:
              "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 55%, rgba(255, 255, 255, 0.07) 100%)",
            border: "1.5px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 28px 80px rgba(0, 0, 0, 0.55)",
            overflow: "hidden",
          }}
        >
          {/* Top Specular Highlight Line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 64,
              right: 64,
              height: 2,
              display: "flex",
              backgroundImage: `linear-gradient(90deg, transparent, ${accent.primary}, rgba(255,255,255,0.65), ${accent.secondary}, transparent)`,
            }}
          />

          {/* Header Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 16,
                  backgroundImage: `linear-gradient(135deg, ${accent.primary}, ${accent.secondary})`,
                  border: "1.5px solid rgba(255, 255, 255, 0.4)",
                  boxShadow: `0 10px 30px ${accent.glow}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  fontWeight: 900,
                  color: "#ffffff",
                }}
              >
                W
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: 30,
                    fontWeight: 800,
                    letterSpacing: -0.5,
                    color: "#f8fafc",
                  }}
                >
                  Wudysoft
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 16,
                    fontWeight: 500,
                    color: "#94a3b8",
                    letterSpacing: 1.2,
                  }}
                >
                  NEXT.JS GLASSMORPHISM PLATFORM
                </div>
              </div>
            </div>

            {/* Translucent Label Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 22px",
                borderRadius: 999,
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: `1.5px solid ${accent.primary}`,
                boxShadow: `0 6px 24px ${accent.glow}`,
                color: "#f8fafc",
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: 2.5,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  display: "flex",
                  backgroundColor: accent.primary,
                }}
              />
              <div style={{ display: "flex" }}>{label}</div>
            </div>
          </div>

          {/* Main Hero Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              marginTop: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: big,
                fontWeight: 800,
                lineHeight: 1.12,
                letterSpacing: -1.5,
                color: "#ffffff",
              }}
            >
              {title}
            </div>

            <div
              style={{
                width: 96,
                height: 4,
                borderRadius: 999,
                display: "flex",
                backgroundImage: `linear-gradient(90deg, ${accent.primary}, ${accent.secondary})`,
              }}
            />

            <div
              style={{
                display: "flex",
                fontSize: 28,
                lineHeight: 1.4,
                color: "#cbd5e1",
                maxWidth: 960,
              }}
            >
              {desc}
            </div>
          </div>

          {/* Footer Glass Strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 22,
              borderTop: "1px solid rgba(255, 255, 255, 0.14)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {meta ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 18px",
                    borderRadius: 999,
                    backgroundColor: "rgba(15, 23, 42, 0.55)",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    fontSize: 21,
                    color: "#e2e8f0",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      display: "flex",
                      backgroundColor: accent.secondary,
                    }}
                  />
                  <div style={{ display: "flex" }}>{meta}</div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 21,
                    color: "#94a3b8",
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      display: "flex",
                      backgroundColor: "#10b981",
                    }}
                  />
                  <div style={{ display: "flex" }}>API • Tools • Realtime Stats</div>
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 18px",
                borderRadius: 999,
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                fontSize: 21,
                fontWeight: 600,
                color: "#cbd5e1",
              }}
            >
              <div style={{ display: "flex" }}>{host}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}