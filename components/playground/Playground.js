import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { AnimatePresence } from 'framer-motion';
import { Icons } from '@/components/Icons';
import { sound } from '@/src/lib/interactiveEffects';
import { parseSpec } from '@/src/lib/openapiClient';
import {
  row, uid, blankDraft, draftFromOperation, syncPathVars, buildRequest, sendRequest,
  validateResponse, loadState, saveState,
} from '@/src/lib/playgroundCore';
import Sidebar from './Sidebar';
import RequestPane from './RequestPane';
import ResponsePane from './ResponsePane';
import { EnvModal, ImportModal, CodeModal, RunnerModal } from './Modals';
import { MethodBadge, Empty, Portal, useMedia, cx } from './ui';
import s from '@/styles/playground.module.css';

const SPEC_KEY = 'nexus_pg_spec';
const MAX_TABS = 10;
const MAX_HISTORY = 40;
const DEFAULT_ENV = () => [{ id: 'local', name: 'Local', vars: [row({ key: 'baseUrl', value: '' })] }];

const scrub = (d) => ({
  ...d,
  auth: { ...d.auth, token: '', pass: '', keyValue: '' },
  headers: d.headers.filter((h) => !/^authorization$/i.test(h.key)),
});

export default function Playground() {
  const router = useRouter();
  const { data: session } = useSession();
  const sessionToken = session?.user?.apiToken || '';

  const [parsed, setParsed] = useState(null);
  const [specLabel, setSpecLabel] = useState('/api/openapi');
  const [specStatus, setSpecStatus] = useState('loading');
  const [specError, setSpecError] = useState('');

  const [tabs, setTabs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [out, setOut] = useState({}); // id → { res, sent }
  const [sending, setSending] = useState({});
  const [history, setHistory] = useState([]);
  const [envs, setEnvs] = useState(DEFAULT_ENV);
  const [envId, setEnvId] = useState('local');
  const [layout, setLayout] = useState('auto');
  const [mobileView, setMobileView] = useState('request');
  const [drawer, setDrawer] = useState(false);
  const [sideHidden, setSideHidden] = useState(false);
  const [modal, setModal] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const narrow = useMedia('(max-width: 1099px)');
  const openOpRef = useRef(null);
  const files = useRef({});
  const aborts = useRef({});

  /* ---------- muat state tersimpan ---------- */
  useEffect(() => {
    const st = loadState();
    if (st) {
      if (Array.isArray(st.tabs)) setTabs(st.tabs.slice(0, MAX_TABS));
      if (st.activeId) setActiveId(st.activeId);
      if (Array.isArray(st.envs) && st.envs.length) { setEnvs(st.envs); setEnvId(st.envId || st.envs[0].id); }
      if (Array.isArray(st.history)) setHistory(st.history.slice(0, MAX_HISTORY));
      if (st.layout) setLayout(st.layout);
      if (st.sideHidden) setSideHidden(true);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => saveState({ tabs, activeId, envs, envId, history, layout, sideHidden }), 400);
    return () => clearTimeout(t);
  }, [hydrated, tabs, activeId, envs, envId, history, layout, sideHidden]);

  /* ---------- muat spesifikasi ---------- */
  const loadSpec = useCallback(async () => {
    setSpecStatus('loading'); setSpecError('');
    try {
      let raw; let label = '/api/openapi';
      try {
        const saved = JSON.parse(localStorage.getItem(SPEC_KEY) || 'null');
        if (saved?.raw) { raw = saved.raw; label = saved.label || 'Impor'; }
      } catch {}
      if (!raw) {
        const r = await fetch('/api/openapi', { cache: 'no-store' });
        if (!r.ok) throw new Error(`GET /api/openapi → HTTP ${r.status}`);
        raw = await r.text();
      }
      setParsed(parseSpec(raw));
      setSpecLabel(label);
      setSpecStatus('ready');
    } catch (e) {
      setSpecError(e.message || 'Gagal memuat spesifikasi');
      setSpecStatus('error');
    }
  }, []);
  useEffect(() => { loadSpec(); }, [loadSpec]);

  // tab pertama otomatis
  useEffect(() => {
    if (!hydrated || !parsed || tabs.length) return;
    const first = parsed.operations.find((o) => /health/.test(o.path)) || parsed.operations[0];
    const d = first ? draftFromOperation(first, parsed) : blankDraft();
    setTabs([syncPathVars(d)]); setActiveId(d.id);
  }, [hydrated, parsed, tabs.length]);

  /* ---------- buka operasi dari ?op=METHOD /path (pencarian global) ---------- */
  const wantedOp = router.isReady ? router.query.op : null;
  useEffect(() => {
    if (!wantedOp || !parsed || !hydrated) return;
    const key = Array.isArray(wantedOp) ? wantedOp[0] : wantedOp;
    const o = parsed.operations.find((x) => x.key === key);
    if (o) openOpRef.current?.(o);
    router.replace('/playground', undefined, { shallow: true });
  }, [wantedOp, parsed, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- turunan ---------- */
  const active = tabs.find((t) => t.id === activeId) || tabs[0] || null;
  const op = useMemo(() => (parsed && active?.opKey ? parsed.operations.find((o) => o.key === active.opKey) : null), [parsed, active?.opKey]);
  const env = envs.find((e) => e.id === envId) || envs[0];
  const vars = useMemo(() => {
    const v = {};
    env.vars.forEach((x) => { if (x.on !== false && x.key) v[x.key] = x.value; });
    if (!v.baseUrl) v.baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    if (!v.token && sessionToken) v.token = sessionToken;
    return v;
  }, [env, sessionToken]);

  const update = useCallback((fn) => setTabs((ts) => ts.map((t) => (t.id === (activeId || ts[0]?.id) ? fn(t) : t))), [activeId]);

  /* ---------- tab ---------- */
  const addTab = (d) => {
    setTabs((ts) => {
      let next = [...ts, d];
      if (next.length > MAX_TABS) { const i = next.findIndex((t) => t.id !== activeId); next.splice(i, 1); }
      return next;
    });
    setActiveId(d.id); setMobileView('request'); setDrawer(false);
  };
  const openOp = (o) => {
    const ex = tabs.find((t) => t.opKey === o.key);
    if (ex) { setActiveId(ex.id); setMobileView('request'); setDrawer(false); return; }
    sound.playClick();
    addTab(syncPathVars(draftFromOperation(o, parsed)));
  };
  openOpRef.current = openOp;
  const closeTab = (id) => {
    setTabs((ts) => {
      const i = ts.findIndex((t) => t.id === id);
      const next = ts.filter((t) => t.id !== id);
      if (id === activeId) setActiveId((next[Math.max(0, i - 1)] || {}).id || null);
      if (!next.length) { const d = blankDraft(); setActiveId(d.id); return [d]; }
      return next;
    });
    setOut((o) => { const { [id]: _x, ...rest } = o; return rest; });
  };

  /* ---------- kirim ---------- */
  const send = useCallback(async () => {
    if (!active || sending[active.id]) return;
    const id = active.id;
    const draft = active;
    const req = buildRequest(draft, vars, files.current);
    const sent = { method: req.method, url: req.url, headers: req.headers, desc: req.desc };
    setMobileView('response');
    if (req.errors.length) {
      setOut((o) => ({ ...o, [id]: { res: { error: 'Request belum lengkap', detail: req.errors.join(' · ') }, sent } }));
      return;
    }
    sound.playClick();
    aborts.current[id]?.abort();
    const ctl = new AbortController();
    aborts.current[id] = ctl;
    setSending((m) => ({ ...m, [id]: true }));
    const res = await sendRequest(req, { signal: ctl.signal });
    setSending((m) => ({ ...m, [id]: false }));
    if (res.cancelled) return;
    const o = parsed && draft.opKey ? parsed.operations.find((x) => x.key === draft.opKey) : null;
    if (!res.error) res.validation = validateResponse(parsed, o, res);
    setOut((all) => ({ ...all, [id]: { res, sent } }));
    setHistory((h) => [{ id: uid(), ts: Date.now(), method: req.method, title: draft.title, status: res.status || 0, ms: res.ms, draft: scrub(draft) }, ...h].slice(0, MAX_HISTORY));
    if (!res.error) sound.playBeep();
  }, [active, sending, vars, parsed]);

  const cancel = () => active && aborts.current[active.id]?.abort();

  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); send(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [send]);

  /* ---------- impor ---------- */
  const importSpec = async (raw, label) => {
    const p = parseSpec(raw); // lempar error jika tidak valid
    setParsed(p); setSpecLabel(label); setSpecStatus('ready');
    try { if (raw.length < 2_500_000) localStorage.setItem(SPEC_KEY, JSON.stringify({ raw, label })); } catch {}
  };
  const resetSpec = () => { try { localStorage.removeItem(SPEC_KEY); } catch {} loadSpec(); };

  const cur = out[active?.id];
  const isSending = !!(active && sending[active.id]);
  const codeReq = modal === 'code' && active ? buildRequest(active, vars, files.current) : null;

  const SIDEBAR = parsed ? (
        <div className={cx(s.drawerWrap, drawer && s.drawerOpen)}>
          <Sidebar
            parsed={parsed}
            specLabel={specLabel}
            activeKey={active?.opKey}
            onOpen={openOp}
            onClose={() => setDrawer(false)}
            history={history}
            onOpenHistory={(h) => { addTab({ ...h.draft, id: uid(), body: { ...h.draft.body } }); }}
            onClearHistory={() => setHistory([])}
          />
          <div className={s.drawerBack} onClick={() => setDrawer(false)} />
        </div>
  ) : null;

  /* ---------- render ---------- */
  return (
    <div className={s.root} data-layout={layout} data-view={mobileView} data-side={sideHidden ? 'hidden' : 'shown'}>
      <div className={s.top}>
        <div className={s.topTitle}>
          <h2>API Playground</h2>
          <p>Endpoint terdeteksi otomatis dari OpenAPI. Jalankan seperti Postman, langsung di browser.</p>
        </div>
        <div className={s.topActions}>
          <button type="button" className={cx(s.tool, s.onlyDrawer)} onClick={() => setDrawer(true)} aria-label="Buka daftar endpoint"><Icons.Menu size={16} /><span>Endpoint</span></button>
          <button type="button" className={cx(s.tool, s.onlyDesk)} onClick={() => setSideHidden((v) => !v)} aria-label={sideHidden ? 'Tampilkan daftar endpoint' : 'Sembunyikan daftar endpoint'} title={sideHidden ? 'Tampilkan daftar endpoint' : 'Sembunyikan daftar endpoint'}><Icons.PanelLeft size={15} /></button>
          <div className={s.envPick}>
            <Icons.Globe size={14} />
            <select value={envId} onChange={(e) => setEnvId(e.target.value)} aria-label="Environment">
              {envs.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <button type="button" onClick={() => setModal('env')} aria-label="Edit environment"><Icons.Settings size={14} /></button>
          </div>
          <button type="button" className={s.tool} onClick={() => setModal('runner')} disabled={!parsed}><Icons.ListChecks size={15} /><span>Runner</span></button>
          <button type="button" className={s.tool} onClick={() => setModal('import')}><Icons.Upload size={15} /><span>Impor</span></button>
          <button type="button" className={cx(s.tool, s.onlyWide)} onClick={() => setLayout((l) => (l === 'stack' ? 'side' : 'stack'))} aria-label="Ganti tata letak">
            {layout === 'stack' ? <Icons.Columns2 size={15} /> : <Icons.Rows2 size={15} />}
          </button>
        </div>
      </div>

      {specStatus === 'loading' && (
        <div className={s.shell}>
          <div className={cx(s.sidebar, s.skelBox)}><div className={s.skel}><i /><i /><i /><i /><i /></div></div>
          <div className={s.workspace}><div className={cx(s.pane, s.skelBox)}><div className={s.skel}><i /><i /><i /></div></div></div>
        </div>
      )}

      {specStatus === 'error' && (
        <div className={s.errBox} role="alert">
          <Icons.AlertCircle size={24} />
          <strong>Spesifikasi OpenAPI tidak bisa dimuat</strong>
          <p>{specError}</p>
          <div className={s.paneActions}>
            <button type="button" className={s.primary} onClick={loadSpec}><Icons.Refresh size={14} /> Coba lagi</button>
            <button type="button" className={s.ghost} onClick={() => setModal('import')}>Impor manual</button>
          </div>
        </div>
      )}

      {specStatus === 'ready' && parsed && (
        <div className={s.shell}>
          {narrow ? <Portal>{SIDEBAR}</Portal> : SIDEBAR}

          <div className={s.workspace}>
            <div className={s.reqTabs} role="tablist" aria-label="Request terbuka">
              <div className={s.reqTabsScroll}>
                {tabs.map((t) => (
                  <div key={t.id} role="tab" aria-selected={t.id === active?.id} className={cx(s.reqTab, t.id === active?.id && s.reqTabOn)}>
                    <button type="button" className={s.reqTabMain} onClick={() => { setActiveId(t.id); setMobileView('request'); }}>
                      <MethodBadge m={t.method} tiny />
                      <span>{t.title}</span>
                      {sending[t.id] && <i className={s.dotBusy} />}
                    </button>
                    <button type="button" className={s.reqTabX} onClick={() => closeTab(t.id)} aria-label={`Tutup ${t.title}`}><Icons.Close size={12} /></button>
                  </div>
                ))}
              </div>
              <button type="button" className={s.iconBtn} onClick={() => addTab(blankDraft())} aria-label="Request baru"><Icons.Plus size={16} /></button>
            </div>

            <div className={s.viewSwitch}>
              <button type="button" className={cx(s.vsBtn, mobileView === 'request' && s.vsOn)} onClick={() => setMobileView('request')}><Icons.Send size={14} /> Request</button>
              <button type="button" className={cx(s.vsBtn, mobileView === 'response' && s.vsOn)} onClick={() => setMobileView('response')}>
                <Icons.Terminal size={14} /> Respons
                {cur?.res && !cur.res.error && <i className={cx(s.vsDot, cur.res.status >= 400 ? s.vsBad : s.vsGood)} />}
              </button>
            </div>

            {active ? (
              <div className={s.panes}>
                <div className={s.paneReq}>
                  <RequestPane
                    key={active.id}
                    draft={active}
                    op={op}
                    parsed={parsed}
                    update={update}
                    sending={isSending}
                    onSend={send}
                    onCancel={cancel}
                    files={files}
                    onCode={() => setModal('code')}
                    sessionToken={sessionToken}
                  />
                </div>
                <div className={s.paneRes}>
                  <ResponsePane
                    key={active.id}
                    res={cur?.res}
                    sent={cur?.sent}
                    sending={isSending}
                    onClear={() => setOut((o) => { const { [active.id]: _x, ...rest } = o; return rest; })}
                  />
                </div>
              </div>
            ) : (
              <Empty title="Belum ada request">Pilih endpoint dari daftar.</Empty>
            )}
          </div>
        </div>
      )}

      <Portal>
      <AnimatePresence>
        {modal === 'env' && <EnvModal key="env" envs={envs} envId={envId} setEnvs={setEnvs} setEnvId={setEnvId} servers={parsed?.servers} onClose={() => setModal(null)} />}
        {modal === 'import' && <ImportModal key="imp" onImport={importSpec} onReset={resetSpec} current={specLabel} onClose={() => setModal(null)} />}
        {modal === 'code' && <CodeModal key="code" req={codeReq} onClose={() => setModal(null)} />}
        {modal === 'runner' && parsed && <RunnerModal key="run" parsed={parsed} vars={vars} onClose={() => setModal(null)} onOpenOp={openOp} />}
      </AnimatePresence>
      </Portal>
    </div>
  );
}
