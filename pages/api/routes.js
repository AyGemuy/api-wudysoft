export default function handler(req, res) {
  try {
    // Fitur bawaan Webpack di Next.js untuk membaca folder saat ini secara rekursif
    const apiContext = require.context('./', true, /\.(js|ts)$/);

    const routes = apiContext
      .keys()
      .filter((filePath) => {
        const fileName = filePath.split('/').pop();
        // Abaikan file ini sendiri (routes.js) dan file internal (diawali _)
        return !filePath.includes('routes.js') && !fileName.startsWith('_');
      })
      .map((filePath) => {
        // Hilangkan './' di depan dan ekstensi (.js / .ts)
        let cleanRoute = filePath.replace(/^\.\//, '').replace(/\.(js|ts)$/, '');

        // Pisahkan segmen path
        const segments = cleanRoute.split('/');
        let rawName = segments[segments.length - 1];

        // Jika file adalah index (misal: /user/index.js -> ambil 'user')
        if (rawName === 'index') {
          cleanRoute = cleanRoute.replace(/\/index$/, '').replace(/^index$/, '');
          rawName = segments.length > 1 ? segments[segments.length - 2] : 'Api';
        }

        // Format huruf kapital pada name (v1 -> V1, chat -> Chat)
        const name =
          rawName.startsWith('[') && rawName.endsWith(']')
            ? rawName
            : rawName.charAt(0).toUpperCase() + rawName.slice(1);

        const routePath = `/api${cleanRoute ? '/' + cleanRoute : ''}`;

        return {
          path: routePath,
          name: name,
          params: [{ name: 'prompt', in: 'query', required: false }],
        };
      });

    // Urutkan rute secara alfabetis (A-Z)
    routes.sort((a, b) => a.path.localeCompare(b.path));

    res.status(200).json(routes);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mendeteksi rute', details: error.message });
  }
}