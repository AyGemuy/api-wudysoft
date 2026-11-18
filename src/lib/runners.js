/** Runner kode di browser: JS (Web Worker), TypeScript (transpile), Python (Pyodide), HTML (iframe sandbox). */
export const TS_URL = 'https://cdn.jsdelivr.net/npm/typescript@5.6.3/lib/typescript.js';
export const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

const JS_WORKER = `
const send = (t, v) => postMessage({ t, v });
const fmt = (a) => { try { return typeof a === 'string' ? a : (a instanceof Error ? a.stack || String(a) : (() => { const s = JSON.stringify(a); return s === undefined ? String(a) : s.length <= 80 ? s : JSON.stringify(a, null, 2); })()); } catch { return String(a); } };
for (const k of ['log','info','warn','error','debug']) console[k] = (...a) => send(k === 'log' || k === 'info' || k === 'debug' ? 'out' : 'err', a.map(fmt).join(' '));
const _fetch = self.fetch.bind(self);
onmessage = async (e) => {
  const origin = e.data.origin;
  self.fetch = (u, o) => _fetch(typeof u === 'string' && u.startsWith('/') ? origin + u : u, o);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  try { const r = await new AsyncFunction(e.data.code)(); if (r !== undefined) send('out', '← ' + fmt(r)); send('done'); }
  catch (err) { send('err', fmt(err)); send('done'); }
};`;

const PY_WORKER = (base) => `
importScripts(${JSON.stringify(base + 'pyodide.js')});
const send = (t, v) => postMessage({ t, v });
let py;
onmessage = async (e) => {
  try {
    if (!py) { send('sys', 'Memuat Python (Pyodide)…'); py = await loadPyodide({ indexURL: ${JSON.stringify(base)} }); }
    py.setStdout({ batched: (s) => send('out', s) });
    py.setStderr({ batched: (s) => send('err', s) });
    const code = e.data.code;
    if (/^\\s*(import|from)\\s+(requests|httpx)/m.test(code)) {
      send('sys', 'Menyiapkan requests (micropip)…');
      await py.loadPackage(['micropip']);
      await py.runPythonAsync("import micropip\\nawait micropip.install(['requests','pyodide-http'])\\nimport pyodide_http\\npyodide_http.patch_all()");
    }
    await py.loadPackagesFromImports(code);
    const r = await py.runPythonAsync(code);
    if (r !== undefined && r !== null) send('out', '← ' + String(r));
    send('done');
  } catch (err) { send('err', String(err && err.message || err)); send('done'); }
};`;

const spawn = (src) => new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));

/** Jalankan di Worker; onLine(kind, text) dipanggil untuk tiap keluaran. Kembalikan { stop, done }. */
function runWorker(src, code, onLine, timeoutMs) {
  const w = spawn(src);
  let finished = false;
  let timer;
  const done = new Promise((resolve) => {
    const end = (reason) => { if (finished) return; finished = true; clearTimeout(timer); w.terminate(); resolve(reason); };
    w.onmessage = (e) => { const { t, v } = e.data; if (t === 'done') end('ok'); else onLine(t, v); };
    w.onerror = (e) => { onLine('err', e.message || 'Worker error'); end('error'); };
    timer = setTimeout(() => { onLine('err', `Dihentikan: melebihi batas waktu ${Math.round(timeoutMs / 1000)} detik`); end('timeout'); }, timeoutMs);
    w.postMessage({ code, origin: typeof location !== 'undefined' ? location.origin : '' });
    w.__end = end;
  });
  return { done, stop: () => { onLine('sys', 'Dihentikan oleh pengguna'); w.__end?.('stopped'); } };
}

let tsPromise;
function loadTs() {
  if (typeof window !== 'undefined' && window.ts) return Promise.resolve(window.ts);
  if (!tsPromise) {
    tsPromise = new Promise((res, rej) => {
      const el = document.createElement('script');
      el.src = TS_URL; el.async = true;
      el.onload = () => res(window.ts);
      el.onerror = () => { tsPromise = null; rej(new Error('Gagal memuat compiler TypeScript dari CDN (cek koneksi internet)')); };
      document.head.appendChild(el);
    });
  }
  return tsPromise;
}

export async function transpileTs(code) {
  const ts = await loadTs();
  const out = ts.transpileModule(code, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, isolatedModules: true } });
  const errs = (out.diagnostics || []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
  return { js: out.outputText, errs };
}

export const stripModuleSyntax = (js) => js.replace(/^\s*export\s+(?=(async\s+)?(function|const|let|class))/gm, '').replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');

/** run: 'javascript' | 'typescript' | 'python'. Hasil: { stop, done } */
export function runBrowser(kind, code, onLine) {
  if (kind === 'javascript') {
    if (/^\s*import\s/m.test(code)) { onLine('err', 'import dari paket tidak didukung di runner browser. Gunakan fetch(), atau jalankan lewat server/Node.'); return { stop() {}, done: Promise.resolve('error') }; }
    return runWorker(JS_WORKER, stripModuleSyntax(code), onLine, 15000);
  }
  if (kind === 'typescript') {
    let inner; let stopped = false;
    const done = (async () => {
      try {
        onLine('sys', 'Transpile TypeScript…');
        const { js, errs } = await transpileTs(code);
        errs.forEach((m) => onLine('err', m));
        if (stopped) return 'stopped';
        inner = runBrowser('javascript', js, onLine);
        return inner.done;
      } catch (e) { onLine('err', e.message); return 'error'; }
    })();
    return { done, stop: () => { stopped = true; inner?.stop(); } };
  }
  if (kind === 'python') return runWorker(PY_WORKER(PYODIDE_URL), code, onLine, 90000);
  onLine('err', `Runner browser untuk "${kind}" tidak ada`);
  return { stop() {}, done: Promise.resolve('error') };
}

/** Dokumen HTML untuk iframe sandbox; console dilaporkan ke parent lewat postMessage. */
export function htmlDoc(code, token) {
  const hook = `<script>(function(){var s=function(k,a){try{parent.postMessage({__run:${JSON.stringify(token)},k:k,v:Array.prototype.map.call(a,function(x){try{return typeof x==='string'?x:JSON.stringify(x)}catch(e){return String(x)}}).join(' ')},'*')}catch(e){}};['log','info','warn','error'].forEach(function(k){var o=console[k];console[k]=function(){s(k==='warn'||k==='error'?'err':'out',arguments);o.apply(console,arguments)}});window.addEventListener('error',function(e){s('err',[e.message])});})();<\/script>`;
  return /<head[^>]*>/i.test(code) ? code.replace(/<head[^>]*>/i, (m) => m + hook) : hook + code;
}

/* ---------------- bahasa yang tersedia di Compiler ---------------- */
export const RUN_LANGS = [
  { id: 'javascript', label: 'JavaScript', hl: 'javascript', where: 'browser', ext: 'js', sample: `// JavaScript berjalan di browser (Web Worker)\nconst nums = [1, 2, 3, 4, 5];\nconsole.log('Kuadrat:', nums.map((n) => n * n));\n\nconst res = await fetch('/api/health');\nconsole.log(res.status, await res.text());\n` },
  { id: 'typescript', label: 'TypeScript', hl: 'typescript', where: 'browser', ext: 'ts', sample: `interface User { id: number; name: string }\nconst u: User = { id: 1, name: 'Wudy' };\nconsole.log(\`Halo \${u.name} (#\${u.id})\`);\n` },
  { id: 'python', label: 'Python', hl: 'python', where: 'browser', ext: 'py', sample: `# Python (Pyodide) berjalan di browser\nfrom math import sqrt\nprint('Akar 2 =', sqrt(2))\nprint([x * x for x in range(1, 6)])\n` },
  { id: 'html', label: 'HTML/CSS/JS', hl: 'xml', where: 'browser', ext: 'html', sample: `<!doctype html>\n<html>\n<body style="font-family:sans-serif;text-align:center;padding:2rem">\n  <h1>Halo Wudysoft 👋</h1>\n  <button onclick="this.textContent = 'Diklik ' + (++n) + '×'">Klik</button>\n  <script>let n = 0; console.log('siap');</script>\n</body>\n</html>\n` },
  { id: 'c', label: 'C', hl: 'c', where: 'server', ext: 'c', sample: `#include <stdio.h>\nint main(void) {\n  printf("Halo dari C\\n");\n  return 0;\n}\n` },
  { id: 'cpp', label: 'C++', hl: 'cpp', where: 'server', ext: 'cpp', sample: `#include <iostream>\nint main() {\n  std::cout << "Halo dari C++" << std::endl;\n}\n` },
  { id: 'java', label: 'Java', hl: 'java', where: 'server', ext: 'java', sample: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Halo dari Java");\n  }\n}\n` },
  { id: 'csharp', label: 'C#', hl: 'csharp', where: 'server', ext: 'cs', sample: `using System;\nclass P { static void Main() { Console.WriteLine("Halo dari C#"); } }\n` },
  { id: 'go', label: 'Go', hl: 'go', where: 'server', ext: 'go', sample: `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Halo dari Go")\n}\n` },
  { id: 'rust', label: 'Rust', hl: 'rust', where: 'server', ext: 'rs', sample: `fn main() {\n    println!("Halo dari Rust");\n}\n` },
  { id: 'php', label: 'PHP', hl: 'php', where: 'server', ext: 'php', sample: `<?php\necho "Halo dari PHP\\n";\n` },
  { id: 'ruby', label: 'Ruby', hl: 'ruby', where: 'server', ext: 'rb', sample: `puts "Halo dari Ruby"\n` },
  { id: 'swift', label: 'Swift', hl: 'swift', where: 'server', ext: 'swift', sample: `print("Halo dari Swift")\n` },
  { id: 'lua', label: 'Lua', hl: 'lua', where: 'server', ext: 'lua', sample: `print("Halo dari Lua")\n` },
  { id: 'perl', label: 'Perl', hl: 'perl', where: 'server', ext: 'pl', sample: `print "Halo dari Perl\\n";\n` },
  { id: 'bash', label: 'Bash', hl: 'bash', where: 'server', ext: 'sh', sample: `echo "Halo dari Bash"\n` },
  { id: 'haskell', label: 'Haskell', hl: 'haskell', where: 'server', ext: 'hs', sample: `main :: IO ()\nmain = putStrLn "Halo dari Haskell"\n` },
];
