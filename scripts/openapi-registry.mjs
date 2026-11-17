/**
 * Detail OpenAPI yang tidak bisa ditebak dari kode (contoh body, skema respons, deskripsi).
 * Kunci: "METHOD /path". Nilai digabung (deep-merge) ke hasil auto-detect; `parameters`
 * menimpa parameter hasil deteksi dengan nama + lokasi yang sama.
 */
const json = (schema, example) => ({ 'application/json': { schema, ...(example !== undefined ? { example } : {}) } });
const obj = (properties, required = []) => ({ type: 'object', properties, ...(required.length ? { required } : {}) });
const str = (extra = {}) => ({ type: 'string', ...extra });

const sessionUser = obj({
  id: str({ example: '65f1a2b3c4d5e6f7a8b9c0d1' }),
  name: str({ example: 'Rina' }),
  email: { type: 'string', nullable: true, example: 'rina@mail.com' },
  image: { type: 'string', nullable: true },
  role: str({ enum: ['user', 'guest', 'admin'] }),
  isGuest: { type: 'boolean' },
  provider: str({ enum: ['credentials', 'github', 'google', 'guest'] }),
});

const echoBody = json(
  { type: 'object', additionalProperties: true },
  { hello: 'wudysoft', items: [1, 2, 3] }
);

export const REGISTRY = {
  'GET /api/tools/paste/v1': {
    summary: 'Paste: ambil / daftar',
    description: 'action=get (key atau title), action=list (search, limit, summary=true). output=json|text|html atau raw=true. Crawler pratinjau link otomatis menerima halaman OG.',
    tags: ['Pastes'],
  },
  'POST /api/tools/paste/v1': {
    summary: 'Paste: buat / ubah / hapus',
    description: 'Body JSON dengan action: create (title, content, syntax, key, expireIn detik) · update (key + field yang diubah) · delete (key) · get · list.',
    tags: ['Pastes'],
    requestBody: {
      required: true,
      content: json(
        obj({
          action: str({ enum: ['create', 'get', 'update', 'delete', 'list', 'clear'], example: 'create' }),
          key: str({ example: 'abc123' }),
          title: str({ example: 'Catatan saya' }),
          content: str({ example: 'console.log(1)' }),
          syntax: str({ example: 'javascript' }),
          expireIn: { type: 'integer', description: 'Detik; 0 = tidak pernah kedaluwarsa', example: 3600 },
        }, ['action'])
      ),
    },
  },
  'GET /api/health': {
    summary: 'Health check',
    description: 'Cek apakah API hidup dan konfigurasi dasar termuat.',
    tags: ['System'],
    responses: {
      200: {
        description: 'Layanan online',
        content: json(
          obj({
            status: str({ example: 'online' }),
            timestamp: str({ format: 'date-time' }),
            environment: str({ example: 'production' }),
            configLoaded: { type: 'object', additionalProperties: true },
          })
        ),
      },
    },
  },

  'GET /api/auth': {
    summary: 'Status layanan auth',
    description: 'Mengembalikan status dan sesi NextAuth saat ini (tanpa apiToken).',
    tags: ['Auth'],
    security: [],
  },
  'POST /api/auth': {
    summary: 'Login / daftar untuk token API',
    description:
      'Endpoint untuk klien non-browser. `mode: "login"` memverifikasi email & password; `mode: "register"` membuat akun baru. Mengembalikan JWT 7 hari untuk header `Authorization: Bearer`.',
    tags: ['Auth'],
    security: [],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: obj(
            {
              mode: str({ enum: ['login', 'register'], default: 'login' }),
              name: str({ description: 'Nama tampilan (opsional, hanya untuk register)', maxLength: 32 }),
              email: str({ format: 'email' }),
              password: str({ format: 'password', minLength: 8, maxLength: 72 }),
            },
            ['email', 'password']
          ),
          examples: {
            login: { summary: 'Login', value: { mode: 'login', email: 'user@example.com', password: 'rahasia123' } },
            register: { summary: 'Daftar', value: { mode: 'register', name: 'Rina', email: 'rina@example.com', password: 'rahasia123' } },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Berhasil',
        content: json(obj({ message: str(), user: sessionUser, token: str({ description: 'JWT untuk Authorization: Bearer' }) })),
      },
      401: { description: 'Email atau password salah' },
      409: { description: 'Email sudah terdaftar' },
      429: { description: 'Akun terkunci sementara / rate limit' },
    },
  },

  'GET /api/auth/me': {
    summary: 'Pengguna saat ini',
    description: 'Mengembalikan sesi yang sedang aktif. `authenticated: false` jika belum login.',
    tags: ['Auth'],
    security: [],
    responses: {
      200: { description: 'OK', content: json(obj({ authenticated: { type: 'boolean' }, user: { ...sessionUser, nullable: true } })) },
    },
  },

  // --- endpoint bawaan NextAuth (tidak ada di pages/api sebagai file terpisah) ---
  'GET /api/auth/session': {
    summary: 'Sesi NextAuth',
    description: 'Objek sesi (termasuk `apiToken`) untuk browser yang sudah login. Kosong `{}` jika belum login.',
    tags: ['Auth'],
    security: [],
    responses: { 200: { description: 'OK', content: json(obj({ user: sessionUser, expires: str({ format: 'date-time' }) })) } },
  },
  'GET /api/auth/providers': {
    summary: 'Daftar provider login',
    description: 'Provider yang aktif di server: credentials, signup, guest, serta OAuth (github/google) bila dikonfigurasi.',
    tags: ['Auth'],
    security: [],
    responses: { 200: { description: 'OK', content: json({ type: 'object', additionalProperties: obj({ id: str(), name: str(), type: str(), signinUrl: str(), callbackUrl: str() }) }) } },
  },
  'GET /api/auth/csrf': {
    summary: 'CSRF token',
    description: 'Dibutuhkan untuk POST ke `/api/auth/callback/*` dan `/api/auth/signout`.',
    tags: ['Auth'],
    security: [],
    responses: { 200: { description: 'OK', content: json(obj({ csrfToken: str() })) } },
  },

  'GET /api/cache': {
    tags: ['System'],
    summary: 'Operasi cache (GET)',
    description: 'Gunakan `action`: `clear`, `list`, `log`, atau `total`.',
    parameters: [{ name: 'action', in: 'query', required: true, schema: str({ enum: ['clear', 'list', 'log', 'total'], default: 'total' }) }],
  },
  'POST /api/cache': {
    tags: ['System'],
    summary: 'Operasi cache (POST)',
    requestBody: {
      required: true,
      content: json(obj({ action: str({ enum: ['clear', 'list', 'log', 'total'] }) }, ['action']), { action: 'total' }),
    },
  },

  'GET /api/openapi': {
    summary: 'Spesifikasi OpenAPI',
    description: 'Dokumen OpenAPI 3 untuk seluruh API ini. Bisa diimpor langsung ke Postman / Swagger.',
    tags: ['System'],
    security: [],
  },
};

// /api/playground/echo menerima semua method
for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
  REGISTRY[`${m} /api/playground/echo`] = {
    summary: `Echo (${m})`,
    description: 'Memantulkan method, query, dan body. Butuh login. Cocok untuk menguji header, body, dan auth.',
    tags: ['Playground'],
    security: [{ cookieAuth: [] }],
    parameters: [{ name: 'q', in: 'query', required: false, schema: str({ example: 'halo' }) }],
    ...(m === 'GET' || m === 'DELETE' ? {} : { requestBody: { required: false, content: echoBody } }),
    responses: {
      200: {
        description: 'Echo',
        content: json(obj({ method: str(), user: str(), provider: str(), query: { type: 'object' }, body: { nullable: true }, receivedAt: str({ format: 'date-time' }) })),
      },
      401: { description: 'Belum login' },
    },
  };
}
