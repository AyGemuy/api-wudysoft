/** Indeks endpoint dari /api/openapi untuk pencarian global (di-cache sekali per sesi tab). */
let cache = null;

export function loadSpecOps() {
  if (!cache) {
    cache = fetch('/api/openapi')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((spec) => {
        // satu entri per path; semua metode digabung (metode dipilih di request builder)
        const ops = [];
        for (const [path, item] of Object.entries(spec.paths || {})) {
          const methods = [];
          let first = null;
          for (const m of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']) {
            const op = item[m];
            if (!op) continue;
            methods.push(m.toUpperCase());
            if (!first) first = { key: `${m.toUpperCase()} ${path}`, summary: (op.summary || '').replace(/^(Ambil|Kirim)\s+/i, ''), tag: (op.tags && op.tags[0]) || 'default' };
            if (op.security && op.security.length) first.secure = true;
          }
          if (first) ops.push({ key: first.key, method: methods[0], methods, path, summary: first.summary, tag: first.tag, secure: !!first.secure });
        }
        return ops;
      })
      .catch(() => {
        cache = null;
        return [];
      });
  }
  return cache;
}
