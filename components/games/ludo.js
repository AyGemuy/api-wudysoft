import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { Dices, Plus, RotateCcw, Copy, Check, Users, Trophy, Wifi, MonitorSmartphone } from 'lucide-react';
import { PageHead, kit as s } from '@/components/PageKit';
import { http } from '@/src/lib/http';
import { copyText } from '@/src/lib/timeAgo';
import { sound } from '@/src/lib/interactiveEffects';
import { toast, confirmToast } from '@/src/lib/toast';
import { SEATS, TRACK, SAFE_TRACK, PIECES, FINISH, seatOf, newState, cellCenter, legalMoves, applyMove, nextTurn, isFinished } from '@/src/lib/ludoEngine';

const API = '/api/game/ludo';
const call = (method, params, body) => (body ? http(method, API, { noimg: '1', ...params, ...body }) : http(method, `${API}?${new URLSearchParams({ noimg: '1', ...params })}`));

const fromServer = (g) => ({
  total: g.totalPlayers,
  state: g.state,
  rev: g.meta?.rev || 0,
  turn: g.meta?.turn || 1,
  dice: g.meta?.dice || 0,
  rolled: !!g.meta?.rolled,
  winners: g.meta?.winners || [],
  log: g.meta?.log || '',
});
const freshView = (total) => ({ total, state: newState(total), rev: 0, turn: 1, dice: 0, rolled: false, winners: [], log: 'Giliran pertama — lempar dadu!' });

const PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };
function Die({ value, rolling, color, onClick, disabled }) {
  return (
    <motion.button type="button" className="ld-die" onClick={onClick} disabled={disabled} aria-label={value ? `Dadu: ${value}` : 'Lempar dadu'}
      animate={rolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.15, 1] } : { rotate: 0, scale: 1 }} transition={{ duration: 0.5, repeat: rolling ? Infinity : 0 }}
      whileHover={disabled ? {} : { scale: 1.06 }} whileTap={disabled ? {} : { scale: 0.94 }} style={{ '--dc': color }}>
      {value ? (
        <svg viewBox="0 0 3 3" aria-hidden="true">{PIPS[value].map(([x, y], i) => <circle key={i} cx={x + 0.5} cy={y + 0.5} r="0.26" />)}</svg>
      ) : <Dices size={30} />}
    </motion.button>
  );
}

function Board({ view, legal, onPick }) {
  const { total, state } = view;
  // kelompokkan bidak per petak agar yang menumpuk digeser sedikit
  const placed = [];
  const seen = {};
  for (let p = 1; p <= total; p++) {
    PIECES.forEach((k) => {
      const rel = state[`p${p}`][k];
      const [cx, cy] = cellCenter(p, total, k, rel);
      const key = rel === 0 ? `b${p}${k}` : `${cx},${cy}`;
      const n = (seen[key] = (seen[key] || 0) + 1) - 1;
      placed.push({ p, k, rel, cx, cy, n, key });
    });
  }
  const groupSize = (key) => seen[key];
  return (
    <svg className="ld-board" viewBox="0 0 15 15" role="img" aria-label="Papan Ludo">
      <rect x="0" y="0" width="15" height="15" rx="0.5" className="ld-bg" />
      {SEATS.map((seat) => (
        <g key={seat.id}>
          <rect x={seat.quad[0]} y={seat.quad[1]} width="6" height="6" fill={seat.color} opacity="0.92" />
          <rect x={seat.quad[0] + 1} y={seat.quad[1] + 1} width="4" height="4" rx="0.6" className="ld-yard" />
          {[[2, 2], [4, 2], [2, 4], [4, 4]].map(([dx, dy], i) => <circle key={i} cx={seat.quad[0] + dx} cy={seat.quad[1] + dy} r="0.5" fill={seat.color} opacity="0.35" />)}
        </g>
      ))}
      {TRACK.map(([x, y], i) => {
        const seat = SEATS.find((st) => st.start === i);
        return (
          <g key={i}>
            <rect x={x} y={y} width="1" height="1" className="ld-cell" style={seat ? { fill: seat.color } : undefined} />
            {SAFE_TRACK.has(i) && !seat && <text x={x + 0.5} y={y + 0.72} className="ld-star" textAnchor="middle">★</text>}
            {seat && <text x={x + 0.5} y={y + 0.72} className="ld-star on" textAnchor="middle">★</text>}
          </g>
        );
      })}
      {SEATS.map((seat) => seat.home.slice(0, 5).map(([x, y], i) => <rect key={`${seat.id}${i}`} x={x} y={y} width="1" height="1" className="ld-cell" style={{ fill: seat.color }} opacity="0.85" />))}
      {/* pusat: 4 segitiga */}
      <polygon points="6,6 9,6 7.5,7.5" fill={SEATS[1].color} /><polygon points="9,6 9,9 7.5,7.5" fill={SEATS[2].color} />
      <polygon points="9,9 6,9 7.5,7.5" fill={SEATS[3].color} /><polygon points="6,9 6,6 7.5,7.5" fill={SEATS[0].color} />
      <g className="ld-grid">{Array.from({ length: 16 }, (_, i) => <g key={i}><line x1={i} y1="0" x2={i} y2="15" /><line x1="0" y1={i} x2="15" y2={i} /></g>)}</g>

      {placed.map(({ p, k, rel, cx, cy, n, key }) => {
        const seat = seatOf(p, total);
        const g = groupSize(key);
        const off = g > 1 && rel !== 0 ? (n - (g - 1) / 2) * 0.22 : 0;
        const can = legal.some((m) => m.p === p && m.k === k);
        return (
          <motion.g key={`${p}${k}`} initial={false} animate={{ x: cx + off, y: cy + off }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className={`ld-piece ${can ? 'can' : ''}`} onClick={can ? () => onPick(p, k) : undefined} role={can ? 'button' : undefined} tabIndex={can ? 0 : undefined}
            aria-label={can ? `Jalankan bidak ${seat.name} ${k.toUpperCase()}` : undefined} onKeyDown={can ? (e) => (e.key === 'Enter' || e.key === ' ') && onPick(p, k) : undefined}>
            {can && <motion.circle r="0.62" fill="none" stroke="var(--a2)" strokeWidth="0.1" animate={{ opacity: [1, 0.2, 1], scale: [1, 1.15, 1] }} transition={{ duration: 1.1, repeat: Infinity }} />}
            <circle r="0.38" fill={seat.color} stroke="#fff" strokeWidth="0.08" />
            <circle r="0.2" fill={seat.dark} opacity="0.55" />
            <text y="0.13" textAnchor="middle" className="ld-pn">{PIECES.indexOf(k) + 1}</text>
          </motion.g>
        );
      })}
    </svg>
  );
}

export default function LudoPage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  const online = !!id;
  const [view, setView] = useState(null);
  const [players, setPlayers] = useState(4);
  const [local, setLocal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mine, setMine] = useState([1, 2, 3, 4]); // kursi yang dikendalikan perangkat ini (mode online)
  const pushing = useRef(false);

  // ---------- Sinkron ke server (antrean: satu permintaan sekaligus, selalu pakai rev terbaru) ----------
  const revRef = useRef(0);
  const q = useRef({ busy: false, next: null });
  const adopt = useCallback((g) => { const v = fromServer(g); revRef.current = v.rev; setView(v); }, []);

  const push = useCallback(async (v) => {
    if (!online) return;
    if (q.current.busy) { q.current.next = v; return; }
    q.current.busy = true;
    pushing.current = true;
    let cur = v;
    try {
      while (cur) {
        q.current.next = null;
        try {
          const d = await call('POST', { action: 'sync', id }, { rev: revRef.current, state: cur.state, meta: { turn: cur.turn, dice: cur.dice, rolled: cur.rolled, winners: cur.winners, log: cur.log } });
          revRef.current = d.game.meta.rev;
          setView((c) => (c ? { ...c, rev: revRef.current } : c));
        } catch (e) {
          q.current.next = null;
          if (/berubah/i.test(e.message)) {
            try { adopt((await call('GET', { action: 'state', id })).game); toast.info('Papan diperbarui dari perangkat lain.'); } catch {}
          } else toast.err(e.message);
          break;
        }
        cur = q.current.next;
      }
    } finally { q.current.busy = false; pushing.current = false; }
  }, [online, id, adopt]);

  const commit = useCallback((v) => { setView(v); push(v); }, [push]);

  // ---------- Muat & polling ----------
  const load = useCallback(async () => {
    if (!id) return;
    try { adopt((await call('GET', { action: 'state', id })).game); } catch (e) { setView(null); toast.err(e.message); }
  }, [id, adopt]);
  useEffect(() => { if (router.isReady && id) load(); }, [router.isReady, id, load]);
  useEffect(() => {
    if (!online) return undefined;
    const t = setInterval(async () => {
      if (pushing.current || busy || rolling) return;
      try {
        const g = (await call('GET', { action: 'state', id })).game;
        if ((g.meta?.rev || 0) > revRef.current) adopt(g);
      } catch {}
    }, 2500);
    return () => clearInterval(t);
  }, [online, id, busy, rolling, adopt]);

  // ---------- Buat game ----------
  const createOnline = async () => {
    setBusy(true);
    try {
      const d = await call('GET', { action: 'create', total: String(players), bg: 'local' });
      router.replace({ pathname: '/games', query: { g: 'ludo', id: d.game.id } }, undefined, { shallow: true });
      adopt(d.game); setMine([1, 2, 3, 4]);
    } catch (e) { toast.err(`${e.message} — coba "Main lokal".`); } finally { setBusy(false); }
  };
  const startLocal = () => { setLocal(true); setView(freshView(players)); };
  const backToMenu = async () => {
    if (view && !view.winners.length && !(await confirmToast('Tinggalkan permainan ini dan mulai game baru?', { okLabel: 'Game baru' }))) return;
    setView(null); setLocal(false);
    router.replace({ pathname: '/games', query: { g: 'ludo' } }, undefined, { shallow: true });
  };
  const reset = async () => {
    if (!(await confirmToast('Ulangi permainan dari awal?', { okLabel: 'Ulangi', danger: true }))) return;
    if (online) {
      try { await call('GET', { action: 'reset', id }); await load(); toast.ok('Papan direset.'); } catch (e) { toast.err(e.message); }
    } else setView(freshView(view.total));
  };

  // ---------- Aturan main ----------
  const total = view?.total || 0;
  const turn = view?.turn || 1;
  const over = !!view && view.winners.length >= total - 1;
  const canAct = !!view && !over && !busy && !rolling && (!online || mine.includes(turn));
  const legal = useMemo(() => {
    if (!view || !view.rolled || over) return [];
    return legalMoves(view.state, view.turn, view.dice).map((k) => ({ p: view.turn, k }));
  }, [view, over]);

  const finishTurn = (v, extra, log) => {
    const winners = [...v.winners];
    for (let p = 1; p <= v.total; p++) if (isFinished(v.state, p) && !winners.includes(p)) winners.push(p);
    const done = winners.length >= v.total - 1;
    if (done) for (let p = 1; p <= v.total; p++) if (!winners.includes(p)) winners.push(p);
    const keep = extra && !isFinished(v.state, v.turn);
    commit({ ...v, winners, rolled: false, turn: keep ? v.turn : nextTurn(v.state, v.turn, v.total), log: done ? 'Permainan selesai!' : log });
  };

  const roll = () => {
    if (!canAct || view.rolled) return;
    sound.playClick();
    setRolling(true);
    const dice = 1 + Math.floor(Math.random() * 6);
    setTimeout(() => {
      setRolling(false);
      const v = { ...view, dice, rolled: true, log: `${seatOf(view.turn, total).name} melempar ${dice}` };
      const moves = legalMoves(v.state, v.turn, dice);
      if (!moves.length) {
        setView(v); setBusy(true);
        commit(v);
        setTimeout(() => { finishTurn({ ...v }, false, `${seatOf(v.turn, total).name} tidak bisa jalan (dadu ${dice}).`); setBusy(false); }, 1100);
      } else commit(v);
    }, 650);
  };

  const pick = (p, k) => {
    const v = view;
    if (!v || !v.rolled || p !== v.turn) return;
    sound.playClick();
    const r = applyMove(v.state, p, k, v.dice, v.total);
    const me = seatOf(p, v.total).name;
    let log = `${me} jalan ${v.dice} petak`;
    if (r.captured.length) { log = `${me} memakan ${r.captured.map((c) => seatOf(c.p, v.total).name).join(', ')}! 💥`; sound.playBeep?.(); }
    else if (r.reachedHome) log = `${me} memasukkan satu bidak ke rumah 🏠`;
    else if (v.dice === 6) log = `${me} dapat 6 — lempar lagi!`;
    finishTurn({ ...v, state: r.state }, r.extra, log);
  };

  // jalan otomatis bila hanya ada satu pilihan unik
  useEffect(() => {
    if (!canAct || !legal.length) return undefined;
    const rels = new Set(legal.map((m) => view.state[`p${m.p}`][m.k]));
    if (rels.size !== 1) return undefined;
    const t = setTimeout(() => pick(legal[0].p, legal[0].k), 650);
    return () => clearTimeout(t);
  }, [legal, canAct]); // eslint-disable-line react-hooks/exhaustive-deps

  const share = async () => { await copyText(window.location.href); setCopied(true); toast.ok('Tautan disalin — kirim ke temanmu.'); setTimeout(() => setCopied(false), 1500); };
  const seat = view ? seatOf(turn, total) : null;
  const toggleMine = (p) => setMine((m) => (m.includes(p) ? (m.length > 1 ? m.filter((x) => x !== p) : m) : [...m, p]));

  return (
    <>
      <div className={s.page}>
        <PageHead Icon={Dices} badge="GAME" title="Ludo" desc="Lempar dadu, keluarkan bidak dengan angka 6, makan bidak lawan, dan bawa keempat bidakmu pulang. Papan digambar langsung di browser." />
        <section className={`glass card ${s.game}`}>
          {!view ? (
            <div className="ld-menu">
              <b>Jumlah pemain</b>
              <div className="ld-seg" role="group" aria-label="Jumlah pemain">
                {[2, 3, 4].map((n) => <button key={n} type="button" className={players === n ? 'on' : ''} onClick={() => setPlayers(n)}><Users size={14} /> {n}</button>)}
              </div>
              <div className={s.row}>
                <button type="button" className="btn primary" onClick={createOnline} disabled={busy}><Wifi size={14} /> {busy ? 'Membuat…' : 'Game online (bagikan tautan)'}</button>
                <button type="button" className="btn" onClick={startLocal}><MonitorSmartphone size={14} /> Main lokal (1 perangkat)</button>
              </div>
              <span className={s.muted}>Game online tersimpan 24 jam dan tersinkron antar perangkat. Mode lokal tidak memerlukan server.</span>
            </div>
          ) : (
            <div className="ld-wrap">
              <div className="ld-side-top">
                {Array.from({ length: total }, (_, i) => i + 1).map((p) => {
                  const st = seatOf(p, total);
                  const home = PIECES.filter((k) => view.state[`p${p}`][k] === FINISH).length;
                  const rank = view.winners.indexOf(p);
                  return (
                    <div key={p} className={`ld-pl ${turn === p && !over ? 'turn' : ''}`} style={{ '--pc': st.color }}>
                      <i /> <b>{st.name}</b> <span>{home}/4</span>
                      {rank >= 0 && <span className="ld-rank"><Trophy size={11} /> #{rank + 1}</span>}
                      {online && <button type="button" className={`ld-mine ${mine.includes(p) ? 'on' : ''}`} onClick={() => toggleMine(p)} aria-pressed={mine.includes(p)} title="Kendalikan kursi ini dari perangkat ini">{mine.includes(p) ? 'saya' : '—'}</button>}
                    </div>
                  );
                })}
              </div>

              <Board view={view} legal={canAct ? legal : []} onPick={pick} />

              <div className="ld-ctl">
                <Die value={rolling ? 1 + Math.floor(Math.random() * 6) : view.dice} rolling={rolling} color={seat?.color} onClick={roll} disabled={!canAct || view.rolled} />
                <div className="ld-msg" aria-live="polite">
                  <AnimatePresence mode="wait">
                    <motion.div key={view.log + view.turn} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      {over ? (
                        <><b><Trophy size={14} /> {view.winners.map((p, i) => `${i + 1}. ${seatOf(p, total).name}`).join('  ·  ')}</b></>
                      ) : (
                        <><b style={{ color: seat?.color }}>Giliran {seat?.name}</b><span>{online && !mine.includes(turn) ? 'Menunggu pemain lain…' : view.rolled ? (legal.length ? 'Pilih bidak yang berkedip' : '') : 'Lempar dadu'}</span></>
                      )}
                      <small>{view.log}</small>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className={s.row}>
                <button type="button" className="btn" onClick={reset}><RotateCcw size={14} /> Ulang</button>
                <button type="button" className="btn" onClick={backToMenu}><Plus size={14} /> Game baru</button>
                {online && <button type="button" className="btn" onClick={share}>{copied ? <Check size={14} /> : <Copy size={14} />} Salin tautan</button>}
              </div>
              {online && <span className={s.muted}>ID game: <span className={s.mono}>{id}</span> · aktifkan “saya” hanya pada kursimu agar tidak bisa dimainkan orang lain dari perangkatmu.</span>}
            </div>
          )}
        </section>
      </div>

      <style jsx global>{`
        .ld-menu { display: grid; gap: 14px; justify-items: center; text-align: center; }
        .ld-seg { display: inline-flex; gap: 6px; }
        .ld-seg button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--r-btn, 10px); border: 1px solid var(--border); background: transparent; color: var(--muted); font: inherit; font-weight: 700; cursor: pointer; }
        .ld-seg button.on { color: var(--on-accent); border-color: transparent; background: linear-gradient(135deg, var(--a1), var(--a3)); }
        .ld-wrap { display: grid; gap: 14px; justify-items: center; width: 100%; }
        .ld-side-top { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
        .ld-pl { display: inline-flex; align-items: center; gap: 7px; padding: 5px 11px; border-radius: var(--r-l, 999px); border: 1px solid var(--border); font-size: .78rem; transition: border-color .2s, box-shadow .2s, transform .2s; }
        .ld-pl i { width: 11px; height: 11px; border-radius: 50%; background: var(--pc); box-shadow: 0 0 0 2px color-mix(in srgb, var(--pc) 30%, transparent); }
        .ld-pl span { color: var(--muted); font-family: var(--font-mono); font-size: .7rem; }
        .ld-pl.turn { border-color: var(--pc); box-shadow: 0 0 0 3px color-mix(in srgb, var(--pc) 25%, transparent); transform: translateY(-1px); }
        .ld-rank { display: inline-flex; align-items: center; gap: 3px; color: var(--a2) !important; }
        .ld-mine { border: 1px solid var(--border); background: transparent; color: var(--muted); border-radius: 6px; font: inherit; font-size: .64rem; padding: 1px 6px; cursor: pointer; }
        .ld-mine.on { color: var(--a2); border-color: var(--a2); }
        .ld-board { width: min(520px, 100%); height: auto; aspect-ratio: 1; border-radius: var(--r-m); border: 1px solid var(--border); box-shadow: 0 18px 40px -22px rgba(0,0,0,.6); touch-action: manipulation; }
        .ld-bg { fill: var(--surface); }
        .ld-yard { fill: color-mix(in srgb, var(--bg1, #fff) 70%, #fff); opacity: .92; }
        .ld-cell { fill: color-mix(in srgb, var(--text) 9%, var(--surface)); }
        .ld-grid line { stroke: color-mix(in srgb, var(--text) 22%, transparent); stroke-width: .03; }
        .ld-star { font-size: .62px; font-size: 0.62px; fill: color-mix(in srgb, var(--text) 38%, transparent); pointer-events: none; }
        .ld-star.on { fill: rgba(255,255,255,.85); }
        .ld-pn { font-size: .34px; font-size: 0.34px; font-weight: 800; fill: #fff; pointer-events: none; }
        .ld-piece { filter: drop-shadow(0 .06px .08px rgba(0,0,0,.5)); }
        .ld-piece.can { cursor: pointer; }
        .ld-ctl { display: flex; align-items: center; gap: 16px; width: min(520px, 100%); }
        .ld-die { flex: none; width: 74px; height: 74px; display: grid; place-items: center; padding: 8px; border-radius: 18px; border: 2px solid var(--dc, var(--a2)); background: linear-gradient(145deg, #fff, #e7e7ee); color: #333; cursor: pointer; box-shadow: 0 10px 24px -10px var(--dc, var(--a2)); }
        .ld-die:disabled { cursor: default; opacity: .8; }
        .ld-die svg { width: 100%; height: 100%; fill: #1f2937; }
        .ld-msg { flex: 1; min-width: 0; }
        .ld-msg > div { display: grid; gap: 2px; }
        .ld-msg b { display: inline-flex; align-items: center; gap: 6px; font-size: .95rem; }
        .ld-msg span { font-size: .8rem; }
        .ld-msg small { color: var(--muted); font-size: .72rem; }
      `}</style>
    </>
  );
}
