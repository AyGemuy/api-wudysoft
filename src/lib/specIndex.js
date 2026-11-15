/** Indeks endpoint dari /api/openapi untuk pencarian global (di-cache sekali per sesi tab). */
let cache = null;

export function loadSpecOps() {
  if (!cache) {
    cache = fetch('/api/openapi')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((spec) => {
        const ops = [];
        for (const [path, item] of Object.entries(spec.paths || {})) {
          for (const m of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']) {
            const op = item[m];
            if (!op) continue;
            ops.push({ key: `${m.toUpperCase()} ${path}`, method: m.toUpperCase(), path, summary: op.summary || '', tag: (op.tags && op.tags[0]) || 'default', secure: !!(op.security && op.security.length) });
          }
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
