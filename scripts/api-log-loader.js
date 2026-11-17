/**
 * Webpack loader (build-time): membungkus `export default` di pages/api/** dengan withApiLog
 * secara otomatis, sehingga route cukup ditulis polos:
 *
 *     export default async function handler(req, res) { ... }
 *
 * Bentuk yang didukung: `export default [async] function [nama](...) {}`, `export default nama;`,
 * dan `export default <ekspresi>;`. File yang sudah memakai withApiLog tidak dibungkus dua kali.
 */
const path = require("path");

module.exports = function apiLogLoader(source) {
  if (/withApiLog/.test(source) || !/export\s+default\s/.test(source)) return source;

  const logger = path.join(this.rootContext, "lib", "apiLogger.cjs").replace(/\\/g, "/");
  const out = source.replace(/export\s+default\s+/, "const __wudysoftHandler = ");

  return (
    `import { withApiLog as __wudysoftWithLog } from ${JSON.stringify(logger)};\n` +
    `${out}\n;export default __wudysoftWithLog(__wudysoftHandler);\n`
  );
};
