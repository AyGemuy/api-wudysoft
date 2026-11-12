import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from 'framer-motion';
import fs from 'fs';
import path from 'path';
import Seo from '@/components/Seo';
import { Icons } from '@/components/Icons';
import { sound } from '@/src/lib/interactiveEffects';

// Helper scanner file system
function scanDirectoryToTree(dirPath, baseRoute = '/api') {
  const result = [];
  try {
    if (!fs.existsSync(dirPath)) return result;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    entries.sort((a, b) => (b.isDirectory() ? 1 : 0) - (a.isDirectory() ? 1 : 0));
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const sub = scanDirectoryToTree(fullPath, `${baseRoute}/${entry.name}`);
        if (sub.length > 0) result.push({ type: 'folder', name: entry.name, children: sub });
      } else if (entry.isFile() && /\.(js|ts|jsx|tsx)$/.test(entry.name)) {
        if (entry.name.includes('[...') || entry.name.startsWith('_')) continue;
        const cleanName = entry.name.replace(/\.(js|ts|jsx|tsx)$/, '');
        const routePath = cleanName === 'index' ? baseRoute : `${baseRoute}/${cleanName}`;
        result.push({ type: 'file', name: entry.name, path: routePath });
      }
    }
  } catch {}
  return result;
}

export async function getServerSideProps(context) {
  let session = null;
  try {
    session = await getServerSession(context.req, context.res, authOptions);
  } catch {}

  const cookies = context.req.cookies || {};
  const hasSessionCookie =
    Boolean(cookies['__Secure-next-auth.session-token']) ||
    Boolean(cookies['next-auth.session-token']) ||
    Boolean(cookies['sid']);

  if (!session?.user && !hasSessionCookie) {
    return {
      redirect: {
        destination: '/auth?next=/playground',
        permanent: false,
      },
    };
  }

  let dynamicTree = [];
  try {
    const apiDirPath = path.join(process.cwd(), 'pages', 'api');
    const apiTree = scanDirectoryToTree(apiDirPath, '/api');
    if (apiTree && apiTree.length > 0) {
      dynamicTree.push({ type: 'folder', name: 'api', children: apiTree });
    }
  } catch {}

  return {
    props: {
      name: session?.user?.name || 'Operative',
      provider: session?.user?.isGuest ? 'Guest' : (session?.user?.provider || 'Credentials'),
      fileTree: dynamicTree.length > 0 ? dynamicTree : [
        {
          type: 'folder',
          name: 'api',
          children: [
            { type: 'file', name: 'health.js', path: '/api/health' },
            { type: 'file', name: 'echo.js', path: '/api/playground/echo' },
            { type: 'file', name: 'endpoints.js', path: '/api/playground/endpoints' },
            { type: 'file', name: 'me.js', path: '/api/auth/me' },
            { type: 'file', name: 'stats.js', path: '/stats' },
          ],
        },
      ],
    },
  };
}

function DirectoryNode({ item, onSelect, selectedUrl }) {
  const [open, setOpen] = useState(true);

  if (item.type === 'folder') {
    return (
      <div className="dir-folder">
        <div className="folder-head" onClick={() => { sound.playClick(); setOpen(!open); }}>
          {open ? <Icons.FolderOpen size={15} color="var(--a2)" /> : <Icons.Folder size={15} color="var(--a2)" />}
          <span className="folder-name">{item.name}</span>
          <span style={{ marginLeft: 'auto' }}>
            {open ? <Icons.ChevronDown size={13} /> : <Icons.ChevronRight size={13} />}
          </span>
        </div>
        {open && item.children && (
          <div className="folder-children">
            {item.children.map((child, i) => (
              <DirectoryNode key={i} item={child} onSelect={onSelect} selectedUrl={selectedUrl} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedUrl === item.path;
  return (
    <motion.div
      className={`file-item ${isSelected ? 'active' : ''}`}
      onClick={() => { sound.playBeep(); onSelect(item.path); }}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.96 }}
    >
      <Icons.FileCode size={14} color={isSelected ? 'var(--a2)' : 'var(--muted)'} />
      <span>{item.name}</span>
    </motion.div>
  );
}

export default function Playground({ name, provider, fileTree = [] }) {
  const router = useRouter();
  const { data: clientSession } = useSession();

  // Request State
  const [url, setUrl] = useState('/api/health');
  const [method, setMethod] = useState('GET');
  const [requestTab, setRequestTab] = useState('body'); // 'body' | 'params' | 'headers' | 'files'
  const [bodyType, setBodyType] = useState('json'); // 'json' | 'formdata'
  const [rawBody, setRawBody] = useState('{\n  "client": "NEXUS_CORE",\n  "test": true\n}');
  const [headersList, setHeadersList] = useState([{ key: 'Accept', value: 'application/json' }]);
  const [paramsList, setParamsList] = useState([{ key: '', value: '' }]);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Response State
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [responseTab, setResponseTab] = useState('preview'); // 'preview' | 'headers' | 'snippets' | 'compiler'

  // Code Snippet & Compiler State
  const [snippetLang, setSnippetLang] = useState('curl'); // 'curl' | 'js' | 'python'
  const [runCode, setRunCode] = useState('');
  const [compilerOutput, setCompilerOutput] = useState('');
  const [compiling, setCompiling] = useState(false);

  const fileInputRef = useRef(null);

  const displayName = clientSession?.user?.name || name;
  const displayProvider = clientSession?.user?.isGuest ? 'Guest' : provider;

  useEffect(() => {
    if (router.query.endpoint) {
      const ep = decodeURIComponent(router.query.endpoint);
      setUrl(ep);
      setMethod(ep.includes('echo') ? 'POST' : 'GET');
    }
  }, [router.query]);

  // Handle URL Param Builder
  const handleAddParam = () => setParamsList([...paramsList, { key: '', value: '' }]);
  const handleAddHeader = () => setHeadersList([...headersList, { key: '', value: '' }]);

  // Generate URL dengan query params
  const constructUrlWithParams = () => {
    const validParams = paramsList.filter((p) => p.key.trim() !== '');
    if (validParams.length === 0) return url;
    const queryString = validParams
      .map((p) => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value.trim())}`)
      .join('&');
    return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
  };

  // Kirim Request API
  const sendRequest = async () => {
    sound.playClick();
    setBusy(true);
    const start = performance.now();
    const finalUrl = constructUrlWithParams();

    try {
      const headers = {};
      headersList.forEach((h) => {
        if (h.key.trim()) headers[h.key.trim()] = h.value.trim();
      });

      const opt = { method, headers };

      if (method !== 'GET') {
        if (bodyType === 'json') {
          headers['Content-Type'] = 'application/json';
          opt.body = rawBody;
        } else if (bodyType === 'formdata') {
          const fd = new FormData();
          if (uploadedFile) fd.append('file', uploadedFile);
          opt.body = fd;
        }
      }

      const r = await fetch(finalUrl, opt);
      const contentType = r.headers.get('content-type') || '';
      const headersMap = {};
      r.headers.forEach((v, k) => { headersMap[k] = v; });

      let out = '';
      let isMedia = false;
      let mediaType = null;
      let mediaBlobUrl = null;

      if (contentType.includes('image/')) {
        isMedia = true;
        mediaType = 'image';
        const blob = await r.blob();
        mediaBlobUrl = URL.createObjectURL(blob);
        out = `[Binary Image Data: ${contentType}]`;
      } else if (contentType.includes('audio/')) {
        isMedia = true;
        mediaType = 'audio';
        const blob = await r.blob();
        mediaBlobUrl = URL.createObjectURL(blob);
        out = `[Binary Audio Stream: ${contentType}]`;
      } else {
        const text = await r.text();
        out = text;
        try {
          out = JSON.stringify(JSON.parse(text), null, 2);
        } catch {}
      }

      setRes({
        status: r.status,
        ok: r.ok,
        ms: Math.round(performance.now() - start),
        out,
        headers: headersMap,
        contentType,
        isMedia,
        mediaType,
        mediaBlobUrl,
        size: new Blob([out]).size,
        remaining: r.headers.get('x-ratelimit-remaining') || '30',
        timestamp: new Date().toLocaleTimeString(),
      });

      sound.playBeep();
    } catch (e) {
      setRes({
        status: 0,
        ok: false,
        ms: Math.round(performance.now() - start),
        out: JSON.stringify({ error: String(e.message || e) }, null, 2),
        headers: {},
        size: 0,
        isMedia: false,
        remaining: '0',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setBusy(false);
    }
  };

  // Generate Code Snippets (cURL / JS / Python)
  const generateSnippet = () => {
    const fullUrl = constructUrlWithParams();
    if (snippetLang === 'curl') {
      let cmd = `curl -X ${method} "${fullUrl}"`;
      headersList.forEach((h) => {
        if (h.key) cmd += ` \\\n  -H "${h.key}: ${h.value}"`;
      });
      if (method !== 'GET' && bodyType === 'json') {
        cmd += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${rawBody.replace(/\n/g, '')}'`;
      }
      return cmd;
    }
    if (snippetLang === 'js') {
      return `// JavaScript (Fetch API)\nconst res = await fetch("${fullUrl}", {\n  method: "${method}",\n  headers: ${JSON.stringify(
        headersList.reduce((acc, h) => (h.key ? { ...acc, [h.key]: h.value } : acc), {
          'Content-Type': 'application/json',
        }),
        null,
        2
      )},\n${method !== 'GET' ? `  body: JSON.stringify(${rawBody})\n` : ''}});\nconst data = await res.json();\nconsole.log(data);`;
    }
    if (snippetLang === 'python') {
      return `# Python (Requests Module)\nimport requests\n\nurl = "${fullUrl}"\nheaders = ${JSON.stringify(
        headersList.reduce((acc, h) => (h.key ? { ...acc, [h.key]: h.value } : acc), {}),
        null,
        2
      )}\n${method !== 'GET' ? `data = ${rawBody}\n\nresponse = requests.${method.toLowerCase()}(url, headers=headers, json=data)` : `response = requests.get(url, headers=headers)`}\n\nprint(response.status_code)\nprint(response.json())`;
    }
  };

  // In-Browser Code Compiler / Runner
  useEffect(() => {
    setRunCode(generateSnippet());
  }, [snippetLang, url, method, rawBody, headersList]);

  const executeCodeSandbox = async () => {
    sound.playClick();
    setCompiling(true);
    setCompilerOutput('// [NEXUS COMPILER] Compiling Sandbox Engine...\n');

    const logs = [];
    const customConsole = {
      log: (...args) => logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : a)).join(' ')),
      error: (...args) => logs.push('[ERROR] ' + args.join(' ')),
      warn: (...args) => logs.push('[WARN] ' + args.join(' ')),
    };

    try {
      // Jalankan script JavaScript di runtime browser terisolasi
      const sandboxFn = new Function('console', 'fetch', `return (async () => { ${runCode} })();`);
      await sandboxFn(customConsole, window.fetch.bind(window));
      setCompilerOutput(logs.length > 0 ? logs.join('\n') : '// Execution finished with zero stdout output.');
      sound.playBeep();
    } catch (err) {
      setCompilerOutput(`// Runtime Error: ${err.message}`);
    } finally {
      setCompiling(false);
    }
  };

  const copyText = (txt) => {
    sound.playBeep();
    navigator.clipboard.writeText(txt);
  };

  return (
    <>
      <Seo title="API Terminal Playground & Compiler" path="/playground" noindex />

      <div className="pg-layout">
        {/* PANEL 1: EXPLORER TREE */}
        <aside className="glass explorer-panel">
          <div className="panel-hud-header">
            <Icons.Folder size={15} color="var(--a2)" />
            <span>PROJECT EXPLORER</span>
          </div>
          <div className="tree-content scroll-animated">
            {fileTree.map((node, i) => (
              <DirectoryNode key={i} item={node} onSelect={setUrl} selectedUrl={url} />
            ))}
          </div>
        </aside>

        {/* PANEL 2: REQUEST BUILDER (3D TILT ANIMATED) */}
        <motion.section
          className="glass tilt-card"
          whileHover={{ rotateY: -1, rotateX: 1 }}
          whileTap={{ scale: 0.985, rotateX: -2, rotateY: 2 }}
          transition={{ type: 'spring', damping: 20, stiffness: 240 }}
        >
          {/* Header */}
          <div className="card-hud-bar">
            <div className="hud-badge-group">
              <span className="live-dot" />
              <strong>REQUEST ARCHITECT</strong>
            </div>
            <span className="hud-meta">OPERATOR: {displayName.toUpperCase()}</span>
          </div>

          {/* URL & Method Selector */}
          <div className="req-url-box">
            <select
              value={method}
              onChange={(e) => { sound.playClick(); setMethod(e.target.value); }}
              className="method-select"
            >
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              className="url-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/api/..."
            />
          </div>

          {/* Sub-tabs: Params, Headers, Body, Files */}
          <div className="req-tabs-bar">
            {['body', 'params', 'headers', 'files'].map((t) => (
              <button
                key={t}
                className={`tab-sub-btn ${requestTab === t ? 'active' : ''}`}
                onClick={() => { sound.playClick(); setRequestTab(t); }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Tab Content Viewport */}
          <div className="card-content-body scroll-animated">
            {/* BODY TAB */}
            {requestTab === 'body' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`btn-m ${bodyType === 'json' ? 'active' : ''}`}
                    onClick={() => setBodyType('json')}
                  >
                    JSON RAW
                  </button>
                  <button
                    className={`btn-m ${bodyType === 'formdata' ? 'active' : ''}`}
                    onClick={() => setBodyType('formdata')}
                  >
                    MULTIPART FORM-DATA
                  </button>
                </div>
                {bodyType === 'json' ? (
                  <textarea
                    rows={8}
                    className="input font-mono"
                    value={rawBody}
                    onChange={(e) => setRawBody(e.target.value)}
                  />
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '24px',
                      border: '2px dashed var(--border)',
                      borderRadius: '14px',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={(e) => setUploadedFile(e.target.files?.[0])}
                    />
                    <Icons.UploadCloud size={28} color="var(--a2)" style={{ margin: '0 auto 6px' }} />
                    <span style={{ fontSize: '0.8rem', display: 'block' }}>
                      {uploadedFile ? uploadedFile.name : 'Drop file atau klik untuk unggah'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* PARAMS BUILDER */}
            {requestTab === 'params' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {paramsList.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px' }}>
                    <input
                      className="input"
                      placeholder="Param Key"
                      value={p.key}
                      onChange={(e) => {
                        const copy = [...paramsList];
                        copy[i].key = e.target.value;
                        setParamsList(copy);
                      }}
                    />
                    <input
                      className="input"
                      placeholder="Value"
                      value={p.value}
                      onChange={(e) => {
                        const copy = [...paramsList];
                        copy[i].value = e.target.value;
                        setParamsList(copy);
                      }}
                    />
                  </div>
                ))}
                <button className="btn" onClick={handleAddParam} style={{ fontSize: '0.72rem', alignSelf: 'flex-start' }}>
                  + Add Query Param
                </button>
              </div>
            )}

            {/* HEADERS BUILDER */}
            {requestTab === 'headers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {headersList.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px' }}>
                    <input
                      className="input"
                      placeholder="Header Name"
                      value={h.key}
                      onChange={(e) => {
                        const copy = [...headersList];
                        copy[i].key = e.target.value;
                        setHeadersList(copy);
                      }}
                    />
                    <input
                      className="input"
                      placeholder="Value"
                      value={h.value}
                      onChange={(e) => {
                        const copy = [...headersList];
                        copy[i].value = e.target.value;
                        setHeadersList(copy);
                      }}
                    />
                  </div>
                ))}
                <button className="btn" onClick={handleAddHeader} style={{ fontSize: '0.72rem', alignSelf: 'flex-start' }}>
                  + Add Header Key
                </button>
              </div>
            )}

            {/* FILES DROP VIEW */}
            {requestTab === 'files' && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Icons.FileArchive size={36} color="var(--a2)" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '0.8rem' }}>Mendukung pengujian binary data & stream payload.</p>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="card-hud-footer">
            <motion.button
              className="btn primary full"
              onClick={sendRequest}
              disabled={busy}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {busy ? 'Mengirim Transmisi…' : 'Kirim Transmisi Request ⚡'}
            </motion.button>
          </div>
        </motion.section>

        {/* PANEL 3: RESPONSE MONITOR, SNIPPETS & COMPILER (3D TILT ANIMATED) */}
        <motion.section
          className="glass tilt-card"
          whileHover={{ rotateY: 1, rotateX: 1 }}
          whileTap={{ scale: 0.985, rotateX: -2, rotateY: -2 }}
          transition={{ type: 'spring', damping: 20, stiffness: 240 }}
        >
          {/* Header Subtabs */}
          <div className="card-hud-bar">
            <div className="tab-pill-box" style={{ background: 'rgba(0,0,0,0.3)', padding: '3px' }}>
              {['preview', 'headers', 'snippets', 'compiler'].map((tab) => (
                <button
                  key={tab}
                  className={`tab-switch-mini ${responseTab === tab ? 'active' : ''}`}
                  onClick={() => { sound.playClick(); setResponseTab(tab); }}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            {res && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <span className={`badge ${res.ok ? 'ok' : 'err'}`}>HTTP {res.status}</span>
                <span className="badge">{res.ms}ms</span>
              </div>
            )}
          </div>

          {/* Content Body */}
          <div className="card-content-body scroll-animated">
            <AnimatePresence mode="wait">
              {/* 1. PREVIEW MONITOR */}
              {responseTab === 'preview' && (
                <motion.div key="pv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {res?.isMedia && res.mediaType === 'image' && (
                    <div style={{ textAlign: 'center', padding: '10px' }}>
                      <img src={res.mediaBlobUrl} alt="Response Media" style={{ maxWidth: '100%', borderRadius: '12px' }} />
                    </div>
                  )}
                  {res?.isMedia && res.mediaType === 'audio' && (
                    <audio controls src={res.mediaBlobUrl} style={{ width: '100%', margin: '14px 0' }} />
                  )}
                  <pre className="code-output">
                    {res ? res.out : '// Standby... Siap menerima response dari server.'}
                  </pre>
                </motion.div>
              )}

              {/* 2. HEADERS MONITOR */}
              {responseTab === 'headers' && (
                <motion.div key="hd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {res && Object.keys(res.headers).length > 0 ? (
                    Object.entries(res.headers).map(([k, v]) => (
                      <div key={k} className="header-row">
                        <strong className="header-key">{k}:</strong>
                        <span className="header-val">{v}</span>
                      </div>
                    ))
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Belum ada header yang ditangkap.</span>
                  )}
                </motion.div>
              )}

              {/* 3. CODE SNIPPETS (CURL / JS / PYTHON) */}
              {responseTab === 'snippets' && (
                <motion.div key="sn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    {['curl', 'js', 'python'].map((lang) => (
                      <button
                        key={lang}
                        className={`tab-switch-mini ${snippetLang === lang ? 'active' : ''}`}
                        onClick={() => setSnippetLang(lang)}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                    <button
                      className="btn"
                      onClick={() => copyText(generateSnippet())}
                      style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: '0.7rem' }}
                    >
                      <Icons.Copy size={12} /> Copy
                    </button>
                  </div>
                  <pre className="code-output">{generateSnippet()}</pre>
                </motion.div>
              )}

              {/* 4. IN-BROWSER CODE COMPILER / RUNNER */}
              {responseTab === 'compiler' && (
                <motion.div key="cp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                      RUN JAVASCRIPT SANDBOX
                    </span>
                    <button
                      className="btn primary"
                      disabled={compiling}
                      onClick={executeCodeSandbox}
                      style={{ padding: '4px 12px', fontSize: '0.72rem' }}
                    >
                      <Icons.Play size={12} /> {compiling ? 'Executing…' : 'Run Script'}
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    className="input font-mono"
                    value={runCode}
                    onChange={(e) => setRunCode(e.target.value)}
                    style={{ marginBottom: '10px' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--a2)', fontFamily: 'var(--font-mono)' }}>STDOUT / TERMINAL:</span>
                  <pre className="code-output" style={{ background: 'rgba(0,0,0,0.6)', padding: '10px', marginTop: '4px' }}>
                    {compilerOutput || '// Output eksekusi akan tampil di sini.'}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Action */}
          <div className="card-hud-footer" style={{ justifyContent: 'space-between' }}>
            <div className="footer-meta">
              <span>SIZE: {res ? `${res.size} B` : '0 B'}</span>
              <span>TIME: {res ? res.timestamp : '--:--'}</span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {res && (
                <button
                  className="btn"
                  onClick={() => copyText(res.out)}
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                >
                  <Icons.Copy size={13} />
                  <span>Copy Response</span>
                </button>
              )}
              <button
                className="btn"
                onClick={() => setRes(null)}
                style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#f87171' }}
              >
                Clear
              </button>
            </div>
          </div>
        </motion.section>
      </div>

      <style jsx>{`
        .pg-layout {
          display: grid;
          grid-template-columns: 230px 1.15fr 1.35fr;
          gap: 16px;
          padding: 4px 0 60px;
          min-height: 600px;
        }

        .explorer-panel {
          padding: 14px 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 620px;
        }
        .panel-hud-header {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--muted);
          letter-spacing: 0.08em;
        }

        .tilt-card {
          display: flex;
          flex-direction: column;
          border-radius: var(--radius);
          overflow: hidden;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(28px);
          border: 1px solid var(--border);
          box-shadow: 0 16px 38px rgba(0, 0, 0, 0.6);
          transform-style: preserve-3d;
          transition: border-color 0.25s ease;
        }
        .tilt-card:hover {
          border-color: rgba(56, 189, 248, 0.4);
        }

        .card-hud-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: rgba(0, 0, 0, 0.25);
        }
        .hud-badge-group {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 0.76rem;
          color: var(--a2);
        }
        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--a2);
          box-shadow: 0 0 10px var(--a2);
        }
        .hud-meta {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: var(--muted);
        }

        .req-url-box {
          display: flex;
          padding: 12px 16px 0;
          gap: 8px;
        }
        .method-select {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border);
          color: var(--a2);
          padding: 8px 12px;
          border-radius: 12px;
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 0.8rem;
          outline: none;
        }
        .url-input {
          flex: 1;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border);
          color: #fff;
          padding: 8px 14px;
          border-radius: 12px;
          font-family: var(--font-mono);
          font-size: 0.82rem;
          outline: none;
        }

        .req-tabs-bar {
          display: flex;
          gap: 4px;
          padding: 10px 16px 0;
          border-bottom: 1px solid var(--border);
        }
        .tab-sub-btn {
          background: transparent;
          border: none;
          color: var(--muted);
          font-family: var(--font-mono);
          font-size: 0.72rem;
          padding: 6px 12px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
        }
        .tab-sub-btn.active {
          color: var(--a2);
          border-bottom-color: var(--a2);
        }

        .card-content-body {
          flex: 1;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
          max-height: 440px;
        }

        .code-output {
          margin: 0;
          font-family: var(--font-mono);
          font-size: 0.78rem;
          color: #e2e8f0;
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.5;
        }
        .header-row {
          display: flex;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          background: rgba(255, 255, 255, 0.03);
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .header-key {
          color: var(--a2);
          white-space: nowrap;
        }
        .header-val {
          color: var(--muted);
          word-break: break-all;
        }

        .card-hud-footer {
          display: flex;
          align-items: center;
          padding: 10px 16px;
          border-top: 1px solid var(--border);
          background: rgba(0, 0, 0, 0.25);
        }
        .footer-meta {
          display: flex;
          gap: 12px;
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: var(--muted);
        }

        .tab-switch-mini {
          background: transparent;
          border: none;
          color: var(--muted);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          padding: 4px 8px;
          border-radius: 10px;
          cursor: pointer;
        }
        .tab-switch-mini.active {
          background: var(--a1);
          color: #fff;
        }

        .scroll-animated::-webkit-scrollbar {
          width: 5px;
        }
        .scroll-animated::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .scroll-animated::-webkit-scrollbar-thumb {
          background: rgba(56, 189, 248, 0.35);
          border-radius: 10px;
        }

        .btn-m {
          flex: 1;
          padding: 6px 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border);
          color: var(--muted);
          font-family: var(--font-mono);
          font-size: 0.72rem;
          cursor: pointer;
        }
        .btn-m.active {
          background: var(--a1);
          color: #fff;
          border-color: var(--a2);
        }

        .tree-content {
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        :global(.dir-folder) {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        :global(.folder-head) {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 8px;
          border-radius: 8px;
          cursor: pointer;
          font-family: var(--font-mono);
          font-size: 0.76rem;
          color: var(--text);
        }
        :global(.folder-head:hover) {
          background: rgba(255, 255, 255, 0.05);
        }
        :global(.folder-children) {
          padding-left: 12px;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          margin-left: 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        :global(.file-item) {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 8px;
          border-radius: 8px;
          cursor: pointer;
          font-family: var(--font-mono);
          font-size: 0.74rem;
          color: var(--muted);
        }
        :global(.file-item.active) {
          color: var(--a2);
          background: rgba(56, 189, 248, 0.14);
        }

        @media (max-width: 960px) {
          .pg-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}