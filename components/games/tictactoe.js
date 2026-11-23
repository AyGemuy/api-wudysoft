import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Grid3x3, RotateCcw, Plus, Copy, Check } from 'lucide-react';
import Card from '@/components/Card';
import { PageHead, useToast, kit as s } from '@/components/PageKit';
import { http, qs } from '@/src/lib/http';
import { copyText } from '@/src/lib/timeAgo';

const api = (params) => http('GET', `/api/game/tictactoe?${qs(params)}`);

export default function TicTacToePage() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : '';
  const [game, setGame] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, flash] = useToast();

  const fetchGame = useCallback(async () => {
    if (!id) return;
    try { setGame((await api({ action: 'get', gameId: id })).game); } catch (e) { setGame(null); flash(e.message, 'err'); }
  }, [id, flash]);
  useEffect(() => { fetchGame(); }, [fetchGame]);
  // polling ringan agar pemain di perangkat lain terlihat
  useEffect(() => {
    if (!id || game?.winner) return;
    const t = setInterval(fetchGame, 3000);
    return () => clearInterval(t);
  }, [id, game?.winner, fetchGame]);

  const create = async () => {
    setBusy(true);
    try { const d = await api({ action: 'create' }); router.replace({ pathname: '/games', query: { g: 'tictactoe', id: d.game.gameId } }, undefined, { shallow: true }); setGame(d.game); }
    catch (e) { flash(e.message, 'err'); } finally { setBusy(false); }
  };
  const move = async (i) => {
    if (busy || !game || game.winner || game.board[Math.floor(i / 3)][i % 3]) return;
    setBusy(true);
    try { setGame((await api({ action: 'move', gameId: id, box: i + 1 })).game); } catch (e) { flash(e.message, 'err'); fetchGame(); } finally { setBusy(false); }
  };
  const reset = async () => { try { setGame((await api({ action: 'reset', gameId: id })).game); } catch (e) { flash(e.message, 'err'); } };
  const share = async () => { await copyText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const status = !game ? '' : game.winner === 'draw' ? 'Seri!' : game.winner ? `Pemenang: ${game.winner} 🎉` : `Giliran: ${game.currentPlayer}`;

  return (
    <>
      {toast}
      <div className={s.page}>
        <PageHead Icon={Grid3x3} badge="GAME" title="Tic-Tac-Toe" desc="Bagikan tautan halaman ini agar lawan bisa bermain dari perangkat lain." />
        <Card Icon={Grid3x3} title="Tic-Tac-Toe" subtitle="Papan permainan" bodyClassName={s.game} footer={<span>Bagikan tautan agar bisa dimainkan bersama</span>}>
          {!id || !game ? (
            <button type="button" className="btn primary" onClick={create} disabled={busy}><Plus size={14} /> {busy ? 'Membuat…' : 'Game baru'}</button>
          ) : (
            <>
              <div className={s.status}>{status}</div>
              <div role="grid" aria-label="Papan Tic-Tac-Toe" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 84px)', gap: 8 }}>
                {game.board.flat().map((c, i) => (
                  <button key={i} type="button" role="gridcell" onClick={() => move(i)} disabled={!!c || !!game.winner || busy} aria-label={`Petak ${i + 1}${c ? `: ${c}` : ''}`}
                    style={{ width: 84, height: 84, fontSize: '2rem', fontWeight: 700, borderRadius: 'var(--r-m)', border: '1px solid var(--border)', background: 'color-mix(in srgb, var(--text) 6%, transparent)', color: c === 'X' ? 'var(--a2)' : 'var(--a3)', cursor: c || game.winner ? 'default' : 'pointer' }}>
                    {c}
                  </button>
                ))}
              </div>
              <div className={s.row}>
                <button type="button" className="btn" onClick={reset}><RotateCcw size={14} /> Ulang</button>
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
