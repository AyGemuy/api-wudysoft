/**
 * Parser & utilitas OpenAPI untuk Playground (jalan di browser).
 * Mendukung OpenAPI 3.x dan Swagger 2.0 (dikonversi), $ref lokal, allOf/oneOf/anyOf.
 */

export const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
const MAX_DEPTH = 6;

/* ---------- $ref ---------- */
export function resolveRef(spec, ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return null;
  return ref
    .slice(2)
    .split('/')
    .map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((acc, key) => (acc == null ? acc : acc[key]), spec);
}

export function deref(spec, node, seen = new Set()) {
  let cur = node;
  let guard = 0;
  while (cur && cur.$ref && guard++ < 12) {
    if (seen.has(cur.$ref)) return {};
    seen.add(cur.$ref);
    const target = resolveRef(spec, cur.$ref);
    const { $ref, ...siblings } = cur;
    cur = target ? { ...target, ...siblings } : siblings;
  }
  return cur || {};
}

/* ---------- Swagger 2 → OpenAPI 3 (versi ringkas) ---------- */
function fromSwagger2(sw) {
  const spec = {
    openapi: '3.0.3',
    info: sw.info || { title: 'API', version: '1.0.0' },
    servers: sw.host ? [{ url: `${(sw.schemes && sw.schemes[0]) || 'https'}://${sw.host}${sw.basePath || ''}` }] : [{ url: sw.basePath || '/' }],
    tags: sw.tags || [],
    paths: {},
    components: { schemas: sw.definitions || {}, securitySchemes: {} },
  };
  const fixRefs = (o) => JSON.parse(JSON.stringify(o).replace(/#\/definitions\//g, '#/components/schemas/'));
  spec.components.schemas = fixRefs(spec.components.schemas);
  Object.entries(sw.securityDefinitions || {}).forEach(([k, v]) => {
    spec.components.securitySchemes[k] =
      v.type === 'basic' ? { type: 'http', scheme: 'basic' } : v.type === 'apiKey' ? { type: 'apiKey', in: v.in, name: v.name } : { type: 'oauth2' };
  });
  for (const [p, item] of Object.entries(sw.paths || {})) {
    spec.paths[p] = {};
    const shared = item.parameters || [];
    for (const m of METHODS) {
      const op = item[m];
      if (!op) continue;
      const params = [...shared, ...(op.parameters || [])];
      const out = { ...op, parameters: [] };
      const consumes = op.consumes || sw.consumes || ['application/json'];
      for (const prm of params) {
        if (prm.in === 'body') {
          out.requestBody = { required: !!prm.required, content: { [consumes[0]]: { schema: fixRefs(prm.schema || {}) } } };
        } else if (prm.in === 'formData') {
          const mime = consumes.find((c) => /form/.test(c)) || 'application/x-www-form-urlencoded';
          out.requestBody ||= { content: { [mime]: { schema: { type: 'object', properties: {} } } } };
          out.requestBody.content[mime].schema.properties[prm.name] = prm.type === 'file' ? { type: 'string', format: 'binary' } : { type: prm.type || 'string' };
        } else {
          const { type, items, enum: en, default: def, format, ...rest } = prm;
          out.parameters.push({ ...rest, schema: { type, items, enum: en, default: def, format } });
        }
      }
      const produces = op.produces || sw.produces || ['application/json'];
      out.responses = {};
      for (const [code, r] of Object.entries(op.responses || {})) {
        out.responses[code] = { description: r.description, ...(r.schema ? { content: { [produces[0]]: { schema: fixRefs(r.schema) } } } : {}) };
      }
      spec.paths[p][m] = out;
    }
  }
  return spec;
}

/* ---------- contoh dari skema ---------- */
export function exampleFromSchema(spec, schemaIn, depth = 0, seen = new Set()) {
  const schema = deref(spec, schemaIn, new Set(seen));
  if (depth > MAX_DEPTH) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.allOf?.length) {
    return schema.allOf.reduce((acc, s) => {
      const v = exampleFromSchema(spec, s, depth + 1, seen);
      return v && typeof v === 'object' && !Array.isArray(v) ? { ...acc, ...v } : acc;
    }, {});
  }
  const alt = schema.oneOf || schema.anyOf;
  if (alt?.length) return exampleFromSchema(spec, alt[0], depth + 1, seen);

  const type = schema.type || (schema.properties ? 'object' : schema.items ? 'array' : undefined);
  switch (type) {
    case 'object': {
      const out = {};
      for (const [k, v] of Object.entries(schema.properties || {})) out[k] = exampleFromSchema(spec, v, depth + 1, seen);
      return out;
    }
    case 'array':
      return [exampleFromSchema(spec, schema.items || {}, depth + 1, seen)];
    case 'integer':
      return schema.minimum ?? 0;
    case 'number':
      return schema.minimum ?? 0;
    case 'boolean':
      return true;
    case 'string':
    default:
      switch (schema.format) {
        case 'date-time': return new Date().toISOString();
        case 'date': return new Date().toISOString().slice(0, 10);
        case 'email': return 'user@example.com';
        case 'uri': case 'url': return 'https://example.com';
        case 'uuid': return '3fa85f64-5717-4562-b3fc-2c963f66afa6';
        case 'password': return 'rahasia123';
        case 'binary': return '';
        default: return type === 'string' ? 'string' : null;
      }
  }
}

/* ---------- validasi respons terhadap skema (ringan) ---------- */
export function validateAgainstSchema(spec, schemaIn, value, path = '$', issues = [], depth = 0) {
  const schema = deref(spec, schemaIn);
  if (depth > 8 || !schema || !Object.keys(schema).length) return issues;
  if (schema.nullable && value === null) return issues;
  if (schema.allOf) schema.allOf.forEach((s) => validateAgainstSchema(spec, s, value, path, issues, depth + 1));
  const alt = schema.oneOf || schema.anyOf;
  if (alt?.length) {
    const ok = alt.some((s) => validateAgainstSchema(spec, s, value, path, [], depth + 1).length === 0);
    if (!ok) issues.push(`${path}: tidak cocok dengan salah satu skema (oneOf/anyOf)`);
    return issues;
  }
  const type = schema.type || (schema.properties ? 'object' : schema.items ? 'array' : undefined);
  const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  const okType =
    !type ||
    (type === 'integer' ? Number.isInteger(value) : type === 'number' ? typeof value === 'number' : type === actual);
  if (!okType) {
    issues.push(`${path}: seharusnya ${type}, diterima ${actual}`);
    return issues;
  }
  if (schema.enum && !schema.enum.includes(value)) issues.push(`${path}: nilai di luar enum (${schema.enum.join(', ')})`);
  if (type === 'object' && value && typeof value === 'object') {
    (schema.required || []).forEach((k) => {
      if (!(k in value)) issues.push(`${path}.${k}: wajib ada tetapi tidak ditemukan`);
    });
    for (const [k, s] of Object.entries(schema.properties || {})) {
      if (k in value) validateAgainstSchema(spec, s, value[k], `${path}.${k}`, issues, depth + 1);
    }
  }
  if (type === 'array' && Array.isArray(value) && schema.items) {
    value.slice(0, 5).forEach((v, i) => validateAgainstSchema(spec, schema.items, v, `${path}[${i}]`, issues, depth + 1));
  }
  return issues;
}

/* ---------- parse spesifikasi ---------- */
export function parseSpec(raw) {
  let spec = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!spec || typeof spec !== 'object') throw new Error('Dokumen bukan JSON object');
  if (spec.swagger && String(spec.swagger).startsWith('2')) spec = fromSwagger2(spec);
  if (!spec.openapi) throw new Error('Bukan dokumen OpenAPI/Swagger yang valid (field "openapi" tidak ada)');
  if (!spec.paths || typeof spec.paths !== 'object') throw new Error('Dokumen tidak memiliki "paths"');

  const operations = [];
  for (const [path, itemRaw] of Object.entries(spec.paths)) {
    const item = deref(spec, itemRaw);
    for (const method of METHODS) {
      const opRaw = item[method];
      if (!opRaw) continue;
      const op = deref(spec, opRaw);

      // gabungkan parameter level-path + level-operasi (operasi menimpa)
      const map = new Map();
      [...(item.parameters || []), ...(op.parameters || [])].forEach((p) => {
        const prm = deref(spec, p);
        if (prm.name && prm.in) map.set(`${prm.in}:${prm.name}`, prm);
      });
      const parameters = [...map.values()].map((prm) => {
        const schema = deref(spec, prm.schema || {});
        return {
          name: prm.name,
          in: prm.in,
          required: !!prm.required || prm.in === 'path',
          description: prm.description || '',
          deprecated: !!prm.deprecated,
          schema,
          enum: schema.enum || (schema.items && deref(spec, schema.items).enum) || null,
          example:
            prm.example !== undefined ? prm.example : schema.example !== undefined ? schema.example : schema.default !== undefined ? schema.default : undefined,
        };
      });

      let body = null;
      if (op.requestBody) {
        const rb = deref(spec, op.requestBody);
        const contents = {};
        for (const [mime, c] of Object.entries(rb.content || {})) {
          const schema = deref(spec, c.schema || {});
          let example = c.example;
          const examples = Object.entries(c.examples || {}).map(([name, e]) => ({ name, summary: deref(spec, e).summary || name, value: deref(spec, e).value }));
          if (example === undefined && examples.length) example = examples[0].value;
          if (example === undefined) example = exampleFromSchema(spec, schema);
          contents[mime] = { schema, example, examples };
        }
        body = { required: !!rb.required, description: rb.description || '', contents };
      }

      const responses = Object.entries(op.responses || {}).map(([code, rRaw]) => {
        const r = deref(spec, rRaw);
        const mime = Object.keys(r.content || {})[0];
        const c = mime ? r.content[mime] : null;
        const schema = c?.schema ? deref(spec, c.schema) : null;
        return {
          code,
          description: r.description || '',
          mime: mime || null,
          schema,
          example: c ? (c.example !== undefined ? c.example : schema ? exampleFromSchema(spec, schema) : undefined) : undefined,
        };
      });

      const security = op.security !== undefined ? op.security : spec.security || [];
      const secNames = security.flatMap((s) => Object.keys(s || {}));
      const tags = op.tags?.length ? op.tags : ['default'];

      operations.push({
        key: `${method.toUpperCase()} ${path}`,
        id: op.operationId || `${method}_${path}`,
        method: method.toUpperCase(),
        path,
        summary: op.summary || '',
        description: op.description || '',
        tags,
        deprecated: !!op.deprecated,
        parameters,
        body,
        responses,
        security: secNames,
        secure: secNames.length > 0,
      });
    }
  }

  const tagMeta = new Map((spec.tags || []).map((t) => [t.name, t]));
  const tagNames = [...new Set(operations.flatMap((o) => o.tags))];
  const tags = tagNames.map((name) => ({ name, description: tagMeta.get(name)?.description || '', count: operations.filter((o) => o.tags.includes(name)).length }));

  return {
    spec,
    info: spec.info || {},
    servers: (spec.servers?.length ? spec.servers : [{ url: '/' }]).map((s) => ({ url: s.url, description: s.description || '' })),
    securitySchemes: spec.components?.securitySchemes || {},
    tags,
    operations,
  };
}
