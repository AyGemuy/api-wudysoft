import apiConfig from "@/configs/apiConfig";
import site from "@/configs/siteConfig";

const maskEmail = (e) => {
  const [u, d] = String(e || "").split("@");
  if (!d) return "-";
  return `${u.slice(0, 2)}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
};

/**
 * Kirim notifikasi "user baru bergabung" ke admin lewat webhook (apiConfig.JOIN_WEBHOOK_URL).
 * Fire-and-forget: tidak pernah melempar error dan tidak menahan proses daftar/masuk.
 * Email disamarkan; bila webhook kosong, fungsi ini tidak melakukan apa-apa.
 */
export function notifyJoin({ name, email, provider = "credentials" }) {
  const url = apiConfig.JOIN_WEBHOOK_URL;
  if (!url) return;
  const text = `🎉 User baru bergabung di ${site.APP_NAME}\nNama: ${name || "-"}\nEmail: ${maskEmail(email)}\nMetode: ${provider}\nWaktu: ${new Date().toISOString()}`;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 5000);
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text, text }),
    signal: ctl.signal,
  })
    .catch((e) => console.error("[NOTIFY] webhook gagal:", e?.message))
    .finally(() => clearTimeout(t));
}
