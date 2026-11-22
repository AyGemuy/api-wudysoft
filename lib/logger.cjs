'use strict';
/**
 * Logger terminal modern untuk server kustom: warna 24-bit, lencana status/metode,
 * durasi berwarna (hijau → merah), dan banner ringkas. Hormati NO_COLOR & non-TTY.
 */
const useColor = !process.env.NO_COLOR && (process.stdout.isTTY || process.env.FORCE_COLOR);
const rgb = (r, g, b) => (t) => (useColor ? `\x1b[38;2;${r};${g};${b}m${t}\x1b[39m` : String(t));
const bg = (r, g, b, fg = [10, 12, 20]) => (t) => (useColor ? `\x1b[48;2;${r};${g};${b}m\x1b[38;2;${fg[0]};${fg[1]};${fg[2]}m${t}\x1b[0m` : `[${t.trim()}]`);
const sty = (c) => (t) => (useColor ? `\x1b[${c}m${t}\x1b[0m` : String(t));

const c = {
  dim: rgb(120, 128, 150), text: rgb(214, 220, 236), violet: rgb(167, 139, 250), cyan: rgb(103, 232, 249),
  green: rgb(74, 222, 128), yellow: rgb(250, 204, 21), red: rgb(248, 113, 113), pink: rgb(244, 114, 182),
  bold: sty('1'), under: sty('4'),
};

const METHOD = {
  GET: bg(103, 232, 249), POST: bg(74, 222, 128), PUT: bg(250, 204, 21), PATCH: bg(251, 146, 60),
  DELETE: bg(248, 113, 113), HEAD: bg(167, 139, 250), OPTIONS: bg(148, 163, 184),
};
const method = (m) => (METHOD[m] || bg(148, 163, 184))(` ${m.padEnd(6)} `);
const status = (n) => {
  const [r, g, b] = n >= 500 ? [248, 113, 113] : n >= 400 ? [250, 204, 21] : n >= 300 ? [103, 232, 249] : [74, 222, 128];
  return rgb(r, g, b)(`● ${n}`);
};
const dur = (ms) => {
  const t = ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
  return (ms >= 1000 ? c.red : ms >= 300 ? c.yellow : c.dim)(t.padStart(7));
};
const clock = () => c.dim(new Date().toLocaleTimeString('id-ID', { hour12: false }).replace(/\./g, ':'));

function request(req, res, ms) {
  const url = req.url.length > 90 ? `${req.url.slice(0, 89)}…` : req.url;
  const loc = res.statusCode >= 300 && res.statusCode < 400 && res.getHeader('location') ? c.dim(` → ${res.getHeader('location')}`) : '';
  console.log(`${clock()} ${method(req.method)} ${status(res.statusCode)} ${dur(ms)}  ${url.startsWith('/api/') ? c.violet(url) : c.text(url)}${loc}`);
}

const tag = (label, color) => `${clock()} ${color(c.bold(label.padEnd(5)))}`;
const info = (...a) => console.log(tag('INFO', c.cyan), ...a);
const ok = (...a) => console.log(tag('OK', c.green), ...a);
const warn = (...a) => console.log(tag('WARN', c.yellow), ...a);
const error = (...a) => console.log(tag('ERR', c.red), ...a);

function banner({ port, dev, ips = [], config = [], bootMs }) {
  const line = c.dim('─'.repeat(54));
  const row = (k, v) => `  ${c.dim(k.padEnd(14))} ${v}`;
  const out = [
    '',
    `  ${c.bold(c.violet('◆ Wudysoft'))} ${c.dim('·')} ${c.text('Cyber Glass Platform')}  ${(dev ? bg(250, 204, 21) : bg(74, 222, 128))(dev ? ' DEV ' : ' PROD ')}${bootMs ? c.dim(`  siap dalam ${bootMs}ms`) : ''}`,
    `  ${line}`,
    row('Local', c.under(c.cyan(`http://localhost:${port}`))),
    ...ips.map((ip, i) => row(i ? '' : 'Network', c.under(c.cyan(`http://${ip}:${port}`)))),
    `  ${line}`,
    ...config.map(([k, v, good]) => row(k, good === null ? c.dim(`○ ${v}`) : good ? c.green(`✔ ${v}`) : c.red(`✖ ${v}`))),
    '',
  ];
  console.log(out.join('\n'));
}

module.exports = { c, request, info, ok, warn, error, banner };
