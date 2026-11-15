import { useMemo, useState } from 'react';
import { Modal, Tabs, CodeView, CopyBtn, MethodBadge, cx } from '@/components/playground/ui';
import { formatBytes, statusTone } from '@/src/lib/playgroundCore';
import ps from '@/styles/playground.module.css';
import s from '@/styles/stats.module.css';

const pretty = (text) => {
  if (!text) return { text: '', json: false };
  try { return { text: JSON.stringify(JSON.parse(text), null, 2), json: true }; } catch { return { text, json: false }; }
};

function Headers({ headers }) {
  const rows = Object.entries(headers || {});
  if (!rows.length) return <p className={ps.hint}>Header tidak tersedia (riwayat dari database tidak menyimpan header).</p>;
  return (
    <div className={ps.tableWrap}>
      <table className={ps.table}>
        <tbody>{rows.map(([k, v]) => <tr key={k}><td><code>{k}</code></td><td className={ps.breakAll}>{v}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function Body({ body, truncated }) {
  const b = useMemo(() => pretty(body), [body]);
  if (!b.text) return <p className={ps.hint}>(kosong)</p>;
  return (
    <>
      <CopyBtn text={b.text} />
      <CodeView wrap json={b.json} text={b.text} />
      {truncated && <p className={ps.hint}>Pratinjau dipotong (maks. 2 KB).</p>}
    </>
  );
}

export default function LogDetail({ ev, onClose }) {
  const [tab, setTab] = useState('summary');
  const query = JSON.stringify(ev.query || {}, null, 2);
  const hasQuery = ev.query && Object.keys(ev.query).length > 0;
  return (
    <Modal title="Detail request" onClose={onClose} wide>
      <div className={s.detailHead}>
        <MethodBadge m={ev.method} />
        <code className={s.detailPath}>{ev.path}</code>
        <span className={cx(ps.status, ps[`t_${statusTone(ev.status)}`])}>{ev.status}</span>
        <span className={s.detailMeta}>{ev.ms} ms · {new Date(ev.ts).toLocaleTimeString()}</span>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'summary', label: 'Ringkasan' }, { id: 'request', label: 'Request' }, { id: 'response', label: 'Response' }]} />

      {tab === 'summary' && (
        <div className={ps.tableWrap}>
          <table className={ps.table}>
            <tbody>
              <tr><td>URL</td><td className={ps.breakAll}><code>{ev.method} {ev.path}</code></td></tr>
              <tr><td>Status</td><td>{ev.status}</td></tr>
              <tr><td>Durasi</td><td>{ev.ms} ms</td></tr>
              <tr><td>Waktu</td><td>{new Date(ev.ts).toLocaleString()}</td></tr>
              <tr><td>IP klien</td><td>{ev.ip}</td></tr>
              <tr><td>User-Agent</td><td className={ps.breakAll}>{ev.ua || '—'}</td></tr>
              <tr><td>Ukuran request</td><td>{formatBytes(ev.req?.bytes)}</td></tr>
              <tr><td>Ukuran respons</td><td>{formatBytes(ev.res?.bytes)} {ev.res?.contentType ? `· ${ev.res.contentType}` : ''}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {tab === 'request' && (
        <>
          {hasQuery && (<><h4 className={s.h4}>Query</h4><CodeView wrap json text={query} /></>)}
          <h4 className={s.h4}>Header</h4>
          <Headers headers={ev.req?.headers} />
          <h4 className={s.h4}>Body</h4>
          <Body body={ev.req?.body} />
        </>
      )}

      {tab === 'response' && (
        <>
          <h4 className={s.h4}>Header</h4>
          <Headers headers={ev.res?.headers} />
          <h4 className={s.h4}>Body</h4>
          <Body body={ev.res?.body} truncated={ev.res?.truncated} />
        </>
      )}
    </Modal>
  );
}
