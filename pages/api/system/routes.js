import fs from 'fs';
import path from 'path';

function scanDirectory(dir, baseRoute = '') {
  let results = [];
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith('_')) continue; // Lewati _app, _document, _error

      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        results = results.concat(scanDirectory(fullPath, `${baseRoute}/${item.name}`));
      } else if (item.isFile() && /\.(js|jsx|ts|tsx)$/.test(item.name)) {
        let cleanName = item.name.replace(/\.(js|jsx|ts|tsx)$/, '');
        if (cleanName === 'index') {
          results.push(baseRoute === '' ? '/' : baseRoute);
        } else {
          results.push(`${baseRoute}/${cleanName}`);
        }
      }
    }
  } catch (error) {
    console.error('[Route-Scanner-Error]:', error.message);
  }
  return results;
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  try {
    const pagesDir = path.join(process.cwd(), 'pages');
    const allRoutes = scanDirectory(pagesDir);

    const uiPages = allRoutes.filter((r) => !r.startsWith('/api')).sort();
    const apiEndpoints = allRoutes.filter((r) => r.startsWith('/api')).sort();

    return res.status(200).json({
      status: 'success',
      timestamp: new Date().toISOString(),
      stats: {
        total: allRoutes.length,
        pagesCount: uiPages.length,
        apisCount: apiEndpoints.length,
      },
      routes: {
        pages: uiPages,
        apis: apiEndpoints,
      },
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}