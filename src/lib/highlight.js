/** highlight.js versi ringan: hanya bahasa yang dipakai yang didaftarkan (bundle kecil). */
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import php from 'highlight.js/lib/languages/php';
import java from 'highlight.js/lib/languages/java';
import kotlin from 'highlight.js/lib/languages/kotlin';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import ruby from 'highlight.js/lib/languages/ruby';
import swift from 'highlight.js/lib/languages/swift';
import dart from 'highlight.js/lib/languages/dart';
import powershell from 'highlight.js/lib/languages/powershell';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import lua from 'highlight.js/lib/languages/lua';
import perl from 'highlight.js/lib/languages/perl';
import haskell from 'highlight.js/lib/languages/haskell';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import http from 'highlight.js/lib/languages/http';
import plaintext from 'highlight.js/lib/languages/plaintext';

const LANGS = { bash, javascript, typescript, python, php, java, kotlin, csharp, go, rust, ruby, swift, dart, powershell, json, xml, css, c, cpp, lua, perl, haskell, sql, yaml, http, plaintext };
for (const [name, def] of Object.entries(LANGS)) hljs.registerLanguage(name, def);

const ALIAS = { sh: 'bash', shell: 'bash', curl: 'bash', js: 'javascript', ts: 'typescript', py: 'python', cs: 'csharp', rs: 'rust', rb: 'ruby', html: 'xml', ps1: 'powershell', 'c++': 'cpp', text: 'plaintext', txt: 'plaintext', kt: 'kotlin', golang: 'go', yml: 'yaml' };

export const normalizeLang = (l) => { const k = String(l || '').toLowerCase(); const r = ALIAS[k] || k; return hljs.getLanguage(r) ? r : 'plaintext'; };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Kembalikan HTML ber-span .hljs-*; aman dari XSS (di-escape oleh highlight.js). */
export function highlight(code, lang) {
  const text = String(code ?? '');
  if (text.length > 300_000) return esc(text);
  try { return hljs.highlight(text, { language: normalizeLang(lang), ignoreIllegals: true }).value; } catch { return esc(text); }
}
