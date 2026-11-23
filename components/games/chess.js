import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Chess } from 'chess.js';
import { Crown, Plus, Copy, Check, FlipVertical2 } from 'lucide-react';
import Card from '@/components/Card';
import { PageHead, useToast, kit as s } from '@/components/PageKit';
import { http, qs } from '@/src/lib/http';
import { copyText } from '@/src/lib/timeAgo';

const PIECE = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const FILES = 'abcdefgh';

/** FEN → daftar 64 petak [{ sq, piece }] dari a8 ke h1. */
function squaresOf(fen) {
  const out = [];
  fen.split(' ')[0].split('/').forEach((row, r) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { for (let k = 0; k < +ch; k++) out.push({ sq: `${FILES[f++]}${8 - r}`, piece: '' }); } else out.push({ sq: `${FILES[f++]}${8 - r}`, piece: ch });
    }
  });
  return out;
}

export default function ChessPage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  const [game, setGame] = useState(null); // { fen, turn, over, checkmate, stalemate }
  const [sel, setSel] = useState('');
  const [flip, setFlip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, flash] = useToast();

  const fetchGame = useCallback(async () => {
    if (!id) return;
    try {
      const d = await http('GET', `/api/game/chess?${qs({ action: 'details', id })}`);
      setGame({ fen: d.boardConfiguration, turn: d.currentTurn, over: d.isGameOver, checkmate: d.isCheckmate, stalemate: d.isStalemate });
    } catch (e) { setGame(null); flash(e.message, 'err'); }
  }, [id, flash]);
  useEffect(() => { fetchGame(); }, [fetchGame]);
  useEffect(() => {
    if (!id || game?.over) return;
    const t = setInterval(fetchGame, 4000);
    return () => clearInterval(t);
  }, [id, game?.over, fetchGame]);

  const create = async () => {
    setBusy(true);
    try { const d = await http('POST', '/api/game/chess', { action: 'create' }); router.replace({ pathname: '/games', query: { g: 'chess', id: d.gameId } }, undefined, { shallow: true }); setSel(''); }
    catch (e) { flash(e.message, 'err'); } finally { setBusy(false); }
  };

  const engine = useMemo(() => { try { return game ? new Chess(game.fen) : null; } catch { return null; } }, [game]);
  const targets = useMemo(() => new Set(sel && engine ? engine.moves({ square: sel, verbose: true }).map((m) => m.to) : []), [sel, engine]);
  const turnColor = game?.turn === 'white' ? 'w' : 'b';

  const click = async ({ sq, piece }) => {
    if (busy || !game || game.over) return;
    const mine = piece && (piece === piece.toUpperCase() ? 'w' : 'b') === turnColor;
    if (!sel) { if (mine) setSel(sq); return; }
    if (sq === sel) return setSel('');
    if (mine) return setSel(sq);
    if (!targets.has(sq)) return setSel('');
    setBusy(true);
    try { await http('POST', '/api/game/chess', { action: 'move', id, from: sel, to: sq }); setSel(''); await fetchGame(); }
    catch (e) { flash(e.message, 'err'); } finally { setBusy(false); }
  };
  const share = async () => { await copyText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const squares = game ? squaresOf(game.fen) : [];
  const shown = flip ? [...squares].reverse() : squares;
  const status = !game ? '' : game.checkmate ? `Skakmat! ${game.turn === 'white' ? 'Hitam' : 'Putih'} menang 🎉` : game.stalemate ? 'Remis (stalemate)' : game.over ? 'Permainan selesai (remis)' : `Giliran: ${game.turn === 'white' ? 'Putih' : 'Hitam'}${engine?.inCheck() ? ' — skak!' : ''}`;

  return (
    <>
      {toast}
      <div className={s.page}>
        <PageHead Icon={Crown} badge="GAME" title="Catur" desc="Klik bidak lalu petak tujuan (petak sah ditandai titik). Bagikan tautan agar lawan bermain dari perangkat lain. Promosi pion otomatis menjadi Ratu." />
        <Card Icon={Crown} title="Catur" subtitle="Papan permainan" bodyClassName={s.game} footer={<span>Bagikan tautan agar bisa dimainkan bersama</span>}>
          {!id || !game ? (
            <button type="button" className="btn primary" onClick={create} disabled={busy}><Plus size={14} /> {busy ? 'Membuat…' : 'Game baru'}</button>
          ) : (
            <>
              <div className={s.status}>{status}</div>
              <div role="grid" aria-label="Papan catur" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', width: 'min(440px, 100%)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {shown.map((c) => {
                  const light = (FILES.indexOf(c.sq[0]) + +c.sq[1]) % 2 === 1;
                  const isSel = sel === c.sq;
                  const isTarget = targets.has(c.sq);
                  return (
                    <button key={c.sq} type="button" role="gridcell" onClick={() => click(c)} aria-label={`${c.sq}${c.piece ? ` ${c.piece}` : ''}`}
                      style={{ aspectRatio: '1', display: 'grid', placeItems: 'center', fontSize: 'clamp(1.4rem, 6vw, 2.2rem)', lineHeight: 1, border: 'none', padding: 0, cursor: game.over ? 'default' : 'pointer', position: 'relative',
                        color: c.piece && c.piece === c.piece.toUpperCase() ? '#fff' : '#111', textShadow: c.piece === c.piece?.toUpperCase() ? '0 0 2px #000, 0 0 2px #000' : 'none',
                        background: isSel ? 'color-mix(in srgb, var(--a2) 65%, #fff)' : light ? 'color-mix(in srgb, var(--a2) 18%, #f0e6d2)' : 'color-mix(in srgb, var(--a3) 45%, #5b4a3a)' }}>
                      {PIECE[c.piece] || ''}
                      {isTarget && <span style={{ position: 'absolute', width: '28%', height: '28%', borderRadius: '50%', background: 'rgba(0,0,0,0.28)' }} />}
                    </button>
                  );
                })}
              </div>
              <div className={s.row}>
                <button type="button" className="btn" onClick={() => setFlip((v) => !v)}><FlipVertical2 size={14} /> Balik papan</button>
                <button type="button" className="btn" onClick={create} disabled={busy}><Plus size={14} /> Game baru</button>
                <button type="button" className="btn" onClick={share}>{copied ? <Check size={14} /> : <Copy size={14} />} Salin tautan</button>
              </div>
              <span className={s.muted}>ID game: <span className={s.mono}>{id}</span></span>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
