/**
 * Generator kode request untuk banyak bahasa/klien HTTP.
 * Input: req dari buildRequest() → { method, url, headers, desc }, desc.kind ∈ none|json|raw|urlencoded|form.
 */
const q1 = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`; // shell
const js = (s) => JSON.stringify(String(s)); // string literal gaya JSON (JS/Go/Java/C#/Rust/Python/Ruby)
const dollar = (s) => s.replace(/\$/g, '\\$'); // Kotlin/Dart
const sq = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`; // PHP
const ps = (s) => `'${String(s).replace(/'/g, "''")}'`; // PowerShell
const rb = (s) => js(s).replace(/#\{/g, '\\#{').replace(/#\$/g, '\\#$').replace(/#@/g, '\\#@');
const pretty = (text, ind = '') => { try { return JSON.stringify(JSON.parse(text), null, 2).replace(/\n/g, `\n${ind}`); } catch { return null; } };
const pyLit = (o) => JSON.stringify(o, null, 2).replace(/\btrue\b/g, 'True').replace(/\bfalse\b/g, 'False').replace(/\bnull\b/g, 'None');
const hdrs = (req, skipCT) => Object.entries(req.headers || {}).filter(([k]) => !(skipCT && k.toLowerCase() === 'content-type'));
const ctOf = (req) => Object.entries(req.headers || {}).find(([k]) => k.toLowerCase() === 'content-type')?.[1];
const D = (req) => req.desc || { kind: 'none' };
const hasText = (d) => d.kind === 'json' || d.kind === 'raw' || d.kind === 'urlencoded';
const FORM_NOTE = 'multipart/form-data: tambahkan field & file sesuai request';

/* ---------------- shell ---------------- */
export function toCurl(req) {
  const parts = [`curl -X ${req.method} ${q1(req.url)}`];
  for (const [k, v] of hdrs(req)) parts.push(`-H ${q1(`${k}: ${v}`)}`);
  const d = D(req);
  if (hasText(d)) parts.push(`--data-raw ${q1(d.text)}`);
  if (d.kind === 'form') d.entries.forEach((e) => parts.push(`-F ${q1(e.file ? `${e.key}=@${e.file}` : `${e.key}=${e.value}`)}`));
  return parts.join(' \\\n  ');
}

export function toWget(req) {
  const parts = [`wget --quiet -O - --method=${req.method}`];
  for (const [k, v] of hdrs(req)) parts.push(`--header=${q1(`${k}: ${v}`)}`);
  const d = D(req);
  if (hasText(d)) parts.push(`--body-data=${q1(d.text)}`);
  parts.push(q1(req.url));
  return parts.join(' \\\n  ') + (d.kind === 'form' ? `\n# ${FORM_NOTE} (wget tidak mendukung multipart; pakai cURL)` : '');
}

export function toHttpie(req) {
  const d = D(req);
  const parts = [];
  const flags = ['--ignore-stdin'];
  if (d.kind === 'form') flags.push('--multipart');
  else if (d.kind === 'urlencoded') flags.push('--form');
  parts.push(`http ${flags.join(' ')} ${req.method} ${q1(req.url)}`);
  for (const [k, v] of hdrs(req, d.kind === 'json' || d.kind === 'form' || d.kind === 'urlencoded')) parts.push(q1(`${k}:${v}`));
  if (d.kind === 'json') parts.push(`--raw ${q1(d.text)}`, q1('Content-Type:application/json'));
  else if (d.kind === 'raw') parts.push(`--raw ${q1(d.text)}`);
  else if (d.kind === 'urlencoded') (d.entries || []).forEach(([k, v]) => parts.push(q1(`${k}=${v}`)));
  else if (d.kind === 'form') d.entries.forEach((e) => parts.push(q1(e.file ? `${e.key}@${e.file}` : `${e.key}=${e.value}`)));
  return parts.join(' \\\n  ');
}

export function toPowerShell(req) {
  const d = D(req);
  const ct = ctOf(req);
  const lines = [];
  const h = hdrs(req, true);
  if (h.length) lines.push('$headers = @{', ...h.map(([k, v]) => `  ${ps(k)} = ${ps(v)}`), '}');
  let args = `-Uri ${ps(req.url)} -Method ${req.method}`;
  if (h.length) args += ' -Headers $headers';
  if (hasText(d)) { lines.push(`$body = ${ps(d.text)}`); args += ' -Body $body'; if (ct) args += ` -ContentType ${ps(ct)}`; }
  else if (d.kind === 'form') {
    lines.push('$form = @{', ...d.entries.map((e) => `  ${ps(e.key)} = ${e.file ? `Get-Item ${ps(e.file)}` : ps(e.value)}`), '}');
    args += ' -Form $form';
  }
  lines.push(`$res = Invoke-RestMethod ${args}`, '$res | ConvertTo-Json -Depth 10');
  return lines.join('\n');
}

/* ---------------- JavaScript / TypeScript ---------------- */
function fetchBody(d) {
  if (d.kind === 'json') { const p = pretty(d.text, '  '); return p ? `  body: JSON.stringify(${p}),` : `  body: ${js(d.text)},`; }
  if (d.kind === 'raw' || d.kind === 'urlencoded') return `  body: ${js(d.text)},`;
  if (d.kind === 'form') return '  body: formData, // new FormData() dengan field sesuai request';
  return null;
}
export function toFetch(req, ts) {
  const d = D(req);
  const lines = [`const res${ts ? ': Response' : ''} = await fetch(${js(req.url)}, {`, `  method: ${js(req.method)},`];
  if (hdrs(req).length) lines.push(`  headers: ${JSON.stringify(req.headers, null, 2).replace(/\n/g, '\n  ')},`);
  const b = fetchBody(d);
  if (b) lines.push(b);
  lines.push('});', 'const text = await res.text();', 'let data = text;', 'try { data = JSON.parse(text); } catch {}', 'console.log(res.status, data);');
  return lines.join('\n');
}
export const toTypeScript = (req) => toFetch(req, true).replace('console.log(res.status, data);', 'console.log(res.status, data as unknown);').replace('let data = text;', 'let data: unknown = text;');

export function toAxios(req) {
  const d = D(req);
  const cfg = { method: req.method.toLowerCase(), url: req.url };
  if (hdrs(req).length) cfg.headers = req.headers;
  if (d.kind === 'json') { try { cfg.data = JSON.parse(d.text); } catch { cfg.data = d.text; } }
  else if (d.kind === 'raw' || d.kind === 'urlencoded') cfg.data = d.text;
  cfg.validateStatus = '__ALL__';
  const body = JSON.stringify(cfg, null, 2).replace('"__ALL__"', '() => true');
  return `import axios from 'axios';\n\nconst res = await axios(${body});\nconsole.log(res.status, res.data);` + (d.kind === 'form' ? '\n// ' + FORM_NOTE : '');
}

/* ---------------- Python ---------------- */
function pyLike(req, lib) {
  const d = D(req);
  const lines = [`import ${lib}`, '', `url = ${js(req.url)}`];
  const h = hdrs(req).length;
  if (h) lines.push(`headers = ${pyLit(req.headers)}`);
  let args = `${js(req.method)}, url`;
  if (h) args += ', headers=headers';
  if (d.kind === 'json') {
    try { lines.push(`payload = ${pyLit(JSON.parse(d.text))}`); args += ', json=payload'; }
    catch { lines.push(`payload = ${js(d.text)}`); args += ', data=payload' + (lib === 'httpx' ? '' : ''); }
  } else if (d.kind === 'raw' || d.kind === 'urlencoded') { lines.push(`payload = ${js(d.text)}`); args += ', data=payload'; }
  else if (d.kind === 'form') {
    const fields = d.entries.filter((e) => !e.file).map((e) => `${js(e.key)}: ${js(e.value)}`);
    const files = d.entries.filter((e) => e.file).map((e) => `${js(e.key)}: open(${js(e.file)}, "rb")`);
    lines.push(`data = {${fields.join(', ')}}`, `files = {${files.join(', ')}}`);
    args += ', data=data, files=files';
  }
  lines.push('', `res = ${lib}.request(${args})`, 'print(res.status_code, res.text)');
  return lines.join('\n');
}
export const toPython = (req) => pyLike(req, 'requests');
export const toHttpx = (req) => pyLike(req, 'httpx');

/* ---------------- PHP ---------------- */
export function toPhp(req) {
  const d = D(req);
  const lines = ['<?php', '$ch = curl_init();', 'curl_setopt_array($ch, [', `  CURLOPT_URL => ${sq(req.url)},`, `  CURLOPT_CUSTOMREQUEST => ${sq(req.method)},`, '  CURLOPT_RETURNTRANSFER => true,'];
  const h = d.kind === 'form' ? hdrs(req, true) : hdrs(req);
  if (h.length) lines.push('  CURLOPT_HTTPHEADER => [', ...h.map(([k, v]) => `    ${sq(`${k}: ${v}`)},`), '  ],');
  if (hasText(d)) lines.push(`  CURLOPT_POSTFIELDS => ${sq(d.text)},`);
  else if (d.kind === 'form') lines.push('  CURLOPT_POSTFIELDS => [', ...d.entries.map((e) => `    ${sq(e.key)} => ${e.file ? `new CURLFile(${sq(e.file)})` : sq(e.value)},`), '  ],');
  lines.push(']);', '$res = curl_exec($ch);', 'if ($res === false) { die(curl_error($ch)); }', 'echo curl_getinfo($ch, CURLINFO_HTTP_CODE) . "\\n" . $res . "\\n";', 'curl_close($ch);');
  return lines.join('\n');
}

/* ---------------- JVM / .NET ---------------- */
function javaBody(d) { return hasText(d) ? `HttpRequest.BodyPublishers.ofString(${js(d.text)})` : 'HttpRequest.BodyPublishers.noBody()'; }
export function toJava(req) {
  const d = D(req);
  const h = hdrs(req).filter(([k]) => !/^(host|content-length|connection)$/i.test(k));
  return [
    'import java.net.URI;', 'import java.net.http.HttpClient;', 'import java.net.http.HttpRequest;', 'import java.net.http.HttpResponse;', '',
    'public class Main {', '  public static void main(String[] args) throws Exception {', '    HttpClient client = HttpClient.newHttpClient();',
    '    HttpRequest request = HttpRequest.newBuilder()', `        .uri(URI.create(${js(req.url)}))`,
    ...h.map(([k, v]) => `        .header(${js(k)}, ${js(v)})`),
    `        .method(${js(req.method)}, ${javaBody(d)})`, '        .build();',
    ...(d.kind === 'form' ? [`    // ${FORM_NOTE}`] : []),
    '    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());',
    '    System.out.println(response.statusCode() + " " + response.body());', '  }', '}',
  ].join('\n');
}
export function toKotlin(req) {
  const d = D(req);
  const h = hdrs(req).filter(([k]) => !/^(host|content-length|connection)$/i.test(k));
  const kb = hasText(d) ? `HttpRequest.BodyPublishers.ofString("${dollar(js(d.text).slice(1, -1))}")` : 'HttpRequest.BodyPublishers.noBody()';
  const ks = (s) => `"${dollar(js(s).slice(1, -1))}"`;
  return [
    'import java.net.URI', 'import java.net.http.HttpClient', 'import java.net.http.HttpRequest', 'import java.net.http.HttpResponse', '',
    'fun main() {', '    val client = HttpClient.newHttpClient()', '    val request = HttpRequest.newBuilder()', `        .uri(URI.create(${ks(req.url)}))`,
    ...h.map(([k, v]) => `        .header(${ks(k)}, ${ks(v)})`),
    `        .method(${ks(req.method)}, ${kb})`, '        .build()',
    ...(d.kind === 'form' ? [`    // ${FORM_NOTE}`] : []),
    '    val response = client.send(request, HttpResponse.BodyHandlers.ofString())', '    println("${response.statusCode()} ${response.body()}")', '}',
  ].join('\n');
}
export function toCSharp(req) {
  const d = D(req);
  const ct = ctOf(req);
  const lines = ['using System;', 'using System.Net.Http;', 'using System.Text;', 'using System.Threading.Tasks;', '', 'using var client = new HttpClient();', `var request = new HttpRequestMessage(new HttpMethod(${js(req.method)}), ${js(req.url)});`];
  for (const [k, v] of hdrs(req, true)) lines.push(`request.Headers.TryAddWithoutValidation(${js(k)}, ${js(v)});`);
  if (hasText(d)) lines.push(`request.Content = new StringContent(${js(d.text)}, Encoding.UTF8, ${js((ct || 'text/plain').split(';')[0])});`);
  if (d.kind === 'form') lines.push(`// ${FORM_NOTE} (gunakan MultipartFormDataContent)`);
  lines.push('var response = await client.SendAsync(request);', 'var body = await response.Content.ReadAsStringAsync();', 'Console.WriteLine($"{(int)response.StatusCode} {body}");');
  return lines.join('\n');
}

/* ---------------- Go / Rust / Ruby ---------------- */
export function toGo(req) {
  const d = D(req);
  const body = hasText(d);
  const lines = ['package main', '', 'import (', '\t"fmt"', '\t"io"', '\t"net/http"', ...(body ? ['\t"strings"'] : []), ')', '', 'func main() {'];
  if (body) lines.push(`\tpayload := strings.NewReader(${js(d.text)})`);
  lines.push(`\treq, err := http.NewRequest(${js(req.method)}, ${js(req.url)}, ${body ? 'payload' : 'nil'})`, '\tif err != nil {', '\t\tpanic(err)', '\t}');
  for (const [k, v] of hdrs(req)) lines.push(`\treq.Header.Set(${js(k)}, ${js(v)})`);
  if (d.kind === 'form') lines.push(`\t// ${FORM_NOTE} (mime/multipart)`);
  lines.push('\tres, err := http.DefaultClient.Do(req)', '\tif err != nil {', '\t\tpanic(err)', '\t}', '\tdefer res.Body.Close()', '\tdata, _ := io.ReadAll(res.Body)', '\tfmt.Println(res.StatusCode, string(data))', '}');
  return lines.join('\n');
}
export function toRust(req) {
  const d = D(req);
  const lines = ['// Cargo.toml: reqwest = { version = "0.12", features = ["blocking"] }', 'use reqwest::blocking::Client;', '', 'fn main() -> Result<(), Box<dyn std::error::Error>> {', `    let res = Client::new()`, `        .request(reqwest::Method::from_bytes(b${js(req.method)})?, ${js(req.url)})`];
  for (const [k, v] of hdrs(req)) lines.push(`        .header(${js(k)}, ${js(v)})`);
  if (hasText(d)) lines.push(`        .body(${js(d.text)})`);
  if (d.kind === 'form') lines.push(`        // ${FORM_NOTE} (reqwest::blocking::multipart)`);
  lines.push('        .send()?;', '    println!("{} {}", res.status(), res.text()?);', '    Ok(())', '}');
  return lines.join('\n');
}
export function toRuby(req) {
  const d = D(req);
  const cls = { GET: 'Get', POST: 'Post', PUT: 'Put', PATCH: 'Patch', DELETE: 'Delete', HEAD: 'Head', OPTIONS: 'Options' }[req.method] || 'Get';
  const lines = ["require 'net/http'", "require 'uri'", '', `uri = URI(${rb(req.url)})`, 'http = Net::HTTP.new(uri.host, uri.port)', "http.use_ssl = uri.scheme == 'https'", '', `req = Net::HTTP::${cls}.new(uri.request_uri)`];
  for (const [k, v] of hdrs(req)) lines.push(`req[${rb(k)}] = ${rb(v)}`);
  if (hasText(d)) lines.push(`req.body = ${rb(d.text)}`);
  if (d.kind === 'form') lines.push(`# ${FORM_NOTE} (req.set_form)`);
  lines.push('', 'res = http.request(req)', 'puts "#{res.code} #{res.body}"');
  return lines.join('\n');
}

/* ---------------- Mobile ---------------- */
export function toSwift(req) {
  const d = D(req);
  const lines = ['import Foundation', '', `var request = URLRequest(url: URL(string: ${js(req.url)})!)`, `request.httpMethod = ${js(req.method)}`];
  for (const [k, v] of hdrs(req)) lines.push(`request.setValue(${js(v)}, forHTTPHeaderField: ${js(k)})`);
  if (hasText(d)) lines.push(`request.httpBody = ${js(d.text)}.data(using: .utf8)`);
  if (d.kind === 'form') lines.push(`// ${FORM_NOTE}`);
  lines.push('', 'let done = DispatchSemaphore(value: 0)', 'URLSession.shared.dataTask(with: request) { data, response, error in', '  if let http = response as? HTTPURLResponse, let data = data {', '    print(http.statusCode, String(data: data, encoding: .utf8) ?? "")', '  } else {', '    print(error?.localizedDescription ?? "error")', '  }', '  done.signal()', '}.resume()', 'done.wait()');
  return lines.join('\n');
}
export function toDart(req) {
  const d = D(req);
  const ds = (s) => dollar(js(s));
  const lines = ["import 'package:http/http.dart' as http;", '', 'Future<void> main() async {', `  final request = http.Request(${ds(req.method)}, Uri.parse(${ds(req.url)}));`];
  if (hdrs(req).length) lines.push('  request.headers.addAll({', ...hdrs(req).map(([k, v]) => `    ${ds(k)}: ${ds(v)},`), '  });');
  if (hasText(d)) lines.push(`  request.body = ${ds(d.text)};`);
  if (d.kind === 'form') lines.push(`  // ${FORM_NOTE} (http.MultipartRequest)`);
  lines.push('  final res = await http.Response.fromStream(await request.send());', "  print('${res.statusCode} ${res.body}');", '}');
  return lines.join('\n');
}

/**
 * run: runner yang bisa dipakai di Compiler (browser) → 'javascript' | 'typescript' | 'python';
 * lang: nama bahasa highlight.js; wb: id bahasa di Compiler untuk dibuka sebagai kode.
 */
export const SNIPPETS = [
  { id: 'curl', label: 'cURL', lang: 'bash', fn: toCurl, cl: 'bash' },
  { id: 'fetch', label: 'JS fetch', lang: 'javascript', fn: (r) => toFetch(r), run: 'javascript', cl: 'javascript' },
  { id: 'axios', label: 'JS axios', lang: 'javascript', fn: toAxios, cl: 'javascript' },
  { id: 'ts', label: 'TypeScript', lang: 'typescript', fn: toTypeScript, run: 'typescript', cl: 'typescript' },
  { id: 'python', label: 'Python requests', lang: 'python', fn: toPython, run: 'python', cl: 'python' },
  { id: 'httpx', label: 'Python httpx', lang: 'python', fn: toHttpx, cl: 'python' },
  { id: 'php', label: 'PHP cURL', lang: 'php', fn: toPhp, cl: 'php' },
  { id: 'java', label: 'Java', lang: 'java', fn: toJava, cl: 'java' },
  { id: 'kotlin', label: 'Kotlin', lang: 'kotlin', fn: toKotlin, cl: 'kotlin' },
  { id: 'csharp', label: 'C#', lang: 'csharp', fn: toCSharp, cl: 'csharp' },
  { id: 'go', label: 'Go', lang: 'go', fn: toGo, cl: 'go' },
  { id: 'rust', label: 'Rust', lang: 'rust', fn: toRust, cl: 'rust' },
  { id: 'ruby', label: 'Ruby', lang: 'ruby', fn: toRuby, cl: 'ruby' },
  { id: 'swift', label: 'Swift', lang: 'swift', fn: toSwift, cl: 'swift' },
  { id: 'dart', label: 'Dart', lang: 'dart', fn: toDart, cl: 'dart' },
  { id: 'powershell', label: 'PowerShell', lang: 'powershell', fn: toPowerShell, cl: 'powershell' },
  { id: 'wget', label: 'wget', lang: 'bash', fn: toWget, cl: 'bash' },
  { id: 'httpie', label: 'HTTPie', lang: 'bash', fn: toHttpie, cl: 'bash' },
];
