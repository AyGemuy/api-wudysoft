import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import fs from 'fs';
import path from 'path';

function scanApiDirectory(dir, currentRoute = '/api') {
  let routes = [];
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        routes = routes.concat(scanApiDirectory(fullPath, `${currentRoute}/${file.name}`));
      } else if (file.isFile() && /\.(js|ts)$/.test(file.name)) {
        const cleanName = file.name.replace(/\.(js|ts)$/, '');
        if (cleanName === 'index') {
          routes.push(currentRoute);
        } else {
          routes.push(`${currentRoute}/${cleanName}`);
        }
      }
    }
  } catch (err) {}
  return routes;
}

function handler(req, res) {
  const apiDirectory = path.join(process.cwd(), 'pages', 'api');
  let list = scanApiDirectory(apiDirectory);

  if (!list || list.length === 0) {
    list = ['/api/health', '/api/auth/me', '/api/playground/echo', '/api/auth/providers'];
  }

  const cleanList = [...new Set(list)].filter((ep) => ep !== '/api/playground/endpoints');

  res.status(200).json({
    ok: true,
    count: cleanList.length,
    endpoints: cleanList,
  });
}

export default withApiLog(withRateLimit(handler));
