/** fetch JSON ke API internal. Melempar Error berisi pesan dari server bila status bukan 2xx. */
export async function http(method, url, body) {
  const r = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || d.error || `Gagal (${r.status})`);
  return d;
}

export const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== '' && v !== null)).toString();
