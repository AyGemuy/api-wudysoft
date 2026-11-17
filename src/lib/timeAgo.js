/** "3 menit lalu", "2 hari lalu" — untuk daftar paste / kode. */
export function timeAgo(v) {
  const t = new Date(v).getTime();
  if (!t) return '';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return 'baru saja';
  const steps = [[60, 'detik'], [60, 'menit'], [24, 'jam'], [30, 'hari'], [12, 'bulan'], [Infinity, 'tahun']];
  let n = s, i = 0;
  while (i < steps.length - 1 && n >= steps[i][0]) { n = Math.floor(n / steps[i][0]); i++; }
  return `${n} ${steps[i][1]} lalu`;
}

export const fmtDateTime = (v) => (v ? new Date(v).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
