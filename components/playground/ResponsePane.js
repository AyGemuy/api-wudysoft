import { useMemo, useState } from 'react';
import { Icons } from '@/components/Icons';
import { Tabs, Seg, CopyBtn, CodeView, Empty, cx } from './ui';
import { formatBytes, statusTone } from '@/src/lib/playgroundCore';
import s from '@/styles/playground.module.css';

function download(res, pretty) {
  const ext = res.kind === 'image' ? (res.contentType.split('/')[1] || 'img').split(';')[0] : res.kind === 'html' ? 'html' : res.isJson ? 'json' : res.kind === 'pdf' ? 'pdf' : res.kind === 'binary' ? 'bin' : 'txt';
  const a = document.createElement('a');
  a.href = res.blobUrl || URL.createObjectURL(new Blob([pretty], { type: res.contentType || 'text/plain' }));
  a.download = `response.${ext}`;
  a.click();
}

export default function ResponsePane({ res, sending, sent, onClear }) {
  const [tab, setTab] = useState('body');
  const [view, setView] = useState('pretty');
  const [wrap, setWrap] = useState(true);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const pretty = useMemo(() => (res && !res.error ? (res.isJson ? JSON.stringify(res.json, null, 2) : res.text || '') : ''), [res]);
  const canPreview = res && !res.error && (res.kind === 'html' || res.kind === 'image' || res.kind === 'pdf');

  let content;
  if (sending) {
    content = (
      <div className={s.loading} role="status">
        <span className={s.spin} />
        <strong>Menunggu respons…</strong>
        <small>Tekan “Batal” untuk menghentikan.</small>
        <div className={s.skel}><i /><i /><i /></div>
      </div>
    );
  } else if (!res) {
    content = <Empty icon={Icons.Send} title="Belum ada respons">Pilih endpoint lalu tekan <b>Kirim</b> atau <kbd>Ctrl</kbd>+<kbd>Enter</kbd>.</Empty>;
  } else if (res.error) {
    content = (
      <div className={s.errBox} role="alert">
        <Icons.AlertCircle size={22} />
        <strong>{res.error}</strong>
        {res.detail && <p>{res.detail}</p>}
        {sent && <div className={s.sentUrl}><span>{sent.method}</span> {sent.url}</div>}
      </div>
    );
  }

  const v = res?.validation;
  const tabs = [
    { id: 'body', label: 'Body' },
    { id: 'headers', label: 'Headers', badge: res && !res.error ? res.headers.length : '' },
    { id: 'spec', label: 'Spec', badge: v?.state === 'ok' ? '✓' : v ? '!' : '' },
    { id: 'request', label: 'Request' },
  ];

  const showResult = res && !res.error && !sending;

  return (
    <section className={s.pane} aria-label="Respons">
      <div className={s.paneHead}>
        <div className={s.statusRow}>
          {showResult ? (
            <>
              <span className={cx(s.status, s[`t_${statusTone(res.status)}`])}>{res.status} {res.statusText}</span>
              <span className={s.metric}><Icons.Clock size={12} />{res.ms} ms</span>
              <span className={s.metric}><Icons.Layers size={12} />{formatBytes(res.size)}</span>
              {v && <span className={cx(s.valChip, s[`v_${v.state}`])} title={v.title}>{v.state === 'ok' ? <Icons.CheckCircle2 size={12} /> : <Icons.AlertCircle size={12} />}{v.short}</span>}
            </>
          ) : (
            <span className={s.metric}>Respons</span>
          )}
        </div>
        {res && !sending && <button type="button" className={cx(s.ghost, s.iconOnly)} onClick={onClear} title="Bersihkan respons" aria-label="Bersihkan respons"><Icons.Trash2 size={14} /></button>}
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      <div className={s.paneBody}>
        {content ? content : (
          <>
            {tab === 'body' && showResult && (
              <>
                <div className={s.editorTools}>
                  <Seg small value={view} onChange={setView} options={[{ id: 'pretty', label: 'Pretty' }, { id: 'raw', label: 'Raw' }, ...(canPreview ? [{ id: 'preview', label: 'Preview' }] : [])]} />
                  <span className={s.grow} />
                  <button type="button" className={cx(s.ghost, s.iconOnly, showSearch && s.ghostOn)} onClick={() => { setShowSearch((x) => !x); setSearch(''); }} aria-label="Cari"><Icons.Search size={13} /></button>
                  <button type="button" className={cx(s.ghost, wrap && s.ghostOn)} onClick={() => setWrap((w) => !w)} title="Bungkus baris">Wrap</button>
                  {res.kind !== 'image' && res.kind !== 'pdf' && res.kind !== 'binary' && <CopyBtn text={pretty} compact />}
                  <button type="button" className={cx(s.ghost, s.iconOnly)} onClick={() => download(res, pretty)} aria-label="Unduh" title="Unduh"><Icons.Download size={13} /></button>
                </div>
                {showSearch && (
                  <label className={s.search}>
                    <Icons.Search size={14} />
                    <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari di respons…" />
                    {search && <small>{(pretty.match(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length}</small>}
                  </label>
                )}

                {res.kind === 'image' && <div className={s.previewImg}><img src={res.blobUrl} alt="Respons gambar" /></div>}
                {res.kind === 'pdf' && <iframe className={s.previewFrame} src={res.blobUrl} title="PDF" />}
                {res.kind === 'binary' && <Empty icon={Icons.FileArchive} title="Respons biner">{res.contentType || 'application/octet-stream'} · {formatBytes(res.size)}. Gunakan tombol unduh.</Empty>}
                {res.kind === 'html' && view === 'preview' && <iframe className={s.previewFrame} sandbox="" srcDoc={res.text} title="Preview HTML" />}
                {['text', 'html'].includes(res.kind) && view !== 'preview' && (
                  <CodeView text={view === 'raw' ? res.text : pretty} json={res.isJson && view === 'pretty'} search={search} wrap={wrap} />
                )}
                {res.kind === 'text' && !res.text && <Empty icon={Icons.FileText} title="Body kosong">Server mengembalikan respons tanpa isi.</Empty>}
              </>
            )}

            {tab === 'headers' && showResult && (
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <tbody>{res.headers.map(([k, val]) => <tr key={k}><td><code>{k}</code></td><td className={s.breakAll}>{val}</td></tr>)}</tbody>
                </table>
                {res.redirected && <p className={s.hint}>Diarahkan ke: {res.finalUrl}</p>}
                <p className={s.hint}>Browser menyembunyikan header tertentu (mis. Set-Cookie) dan, untuk origin lain, header yang tidak di-expose CORS.</p>
              </div>
            )}

            {tab === 'spec' && (
              v ? (
                <div className={s.block}>
                  <div className={cx(s.specBanner, s[`v_${v.state}`])}>
                    {v.state === 'ok' ? <Icons.CheckCircle2 size={18} /> : <Icons.AlertCircle size={18} />}
                    <div><strong>{v.title}</strong>{v.expected?.length ? <small>Status terdokumentasi: {v.expected.join(', ')}</small> : null}</div>
                  </div>
                  {v.issues.length > 0 && (
                    <>
                      <h4>Ketidaksesuaian skema</h4>
                      <ul className={s.issues}>{v.issues.slice(0, 40).map((i, n) => <li key={n}><code>{i}</code></li>)}</ul>
                    </>
                  )}
                </div>
              ) : <Empty icon={Icons.BookOpen} title="Tidak ada pembanding">Request ini tidak terhubung ke operasi OpenAPI atau belum ada respons.</Empty>
            )}

            {tab === 'request' && (
              sent ? (
                <div className={s.block}>
                  <div className={s.sentUrl}><span>{sent.method}</span> {sent.url}</div>
                  <CopyBtn text={sent.url} label="Salin URL" />
                  <h4>Headers terkirim</h4>
                  {Object.keys(sent.headers).length ? (
                    <div className={s.tableWrap}><table className={s.table}><tbody>{Object.entries(sent.headers).map(([k, val]) => <tr key={k}><td><code>{k}</code></td><td className={s.breakAll}>{/^authorization$/i.test(k) ? String(val).replace(/(Bearer |Basic ).+/, '$1••••••') : val}</td></tr>)}</tbody></table></div>
                  ) : <p className={s.hint}>Tidak ada header kustom. (Cookie sesi dikirim browser secara otomatis untuk origin yang sama.)</p>}
                  {sent.desc?.kind && sent.desc.kind !== 'none' && (
                    <>
                      <h4>Body terkirim ({sent.desc.kind})</h4>
                      <CodeView wrap text={sent.desc.text ?? JSON.stringify(sent.desc.entries, null, 2)} />
                    </>
                  )}
                </div>
              ) : <Empty icon={Icons.Send} title="Belum ada request terkirim" />
            )}

            {tab !== 'body' && !showResult && tab !== 'request' && tab !== 'spec' && null}
          </>
        )}
      </div>
    </section>
  );
}
