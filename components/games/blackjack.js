import { useEffect, useState } from 'react';
import { Spade, Plus, Hand, CirclePlus } from 'lucide-react';
import KCard from '@/components/Card';
import { PageHead, useToast, kit as s } from '@/components/PageKit';
import { http, qs } from '@/src/lib/http';

const KEY = 'wd_blackjack';
const api = (params) => http('GET', `/api/game/deck?${qs(params)}`);
const SUIT = { HEARTS: '♥', DIAMONDS: '♦', CLUBS: '♣', SPADES: '♠' };
const SHORT = { ACE: 'A', JACK: 'J', QUEEN: 'Q', KING: 'K' };
const RED = new Set(['HEARTS', 'DIAMONDS']);

function Card({ card, hidden }) {
  const base = { width: 54, height: 78, borderRadius: 8, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '1.05rem', border: '1px solid var(--border)' };
  if (hidden || !card) return <div style={{ ...base, background: 'linear-gradient(135deg, var(--a1), var(--a3))', color: 'var(--on-accent)' }} aria-label="Kartu tertutup">?</div>;
  return <div style={{ ...base, background: '#fff', color: RED.has(card.suit) ? '#c42b1c' : '#111' }} aria-label={`${card.value} ${card.suit}`}>{SHORT[card.value] || card.value}{SUIT[card.suit]}</div>;
}

export default function BlackjackPage() {
  const [g, setG] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, flash] = useToast();

  const info = async (gameId) => {
    const d = await api({ action: 'info', gameId });
    setG(d);
    try { localStorage.setItem(KEY, gameId); } catch {}
    return d;
  };
  useEffect(() => {
    let id = '';
    try { id = localStorage.getItem(KEY) || ''; } catch {}
    if (id) info(id).catch(() => { try { localStorage.removeItem(KEY); } catch {} });
  }, []);

  const run = async (fn) => { setBusy(true); try { await fn(); } catch (e) { flash(e.message, 'err'); } finally { setBusy(false); } };
  const create = () => run(async () => { const d = await api({ action: 'create' }); await info(d.gameId); });
  const act = (action) => run(async () => { await api({ action, gameId: g.gameId }); await info(g.gameId); });

  const active = g?.status === 'active';
  const dealer = g?.dealerHand || (g?.dealerVisibleCard ? [g.dealerVisibleCard] : []);

  return (
    <>
      {toast}
      <div className={s.page}>
        <PageHead Icon={Spade} badge="GAME" title="Blackjack" desc="Capai angka sedekat mungkin ke 21 tanpa melewatinya. Dealer membuka kartu kedua saat ronde selesai." />
        <KCard Icon={Spade} title="Blackjack" subtitle="Papan permainan" bodyClassName={s.game} footer={<span>Main sendiri melawan bandar</span>}>
          {!g ? (
            <button type="button" className="btn primary" onClick={create} disabled={busy}><Plus size={14} /> {busy ? 'Mengocok…' : 'Mulai game'}</button>
          ) : (
            <>
              <div style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
                <span className={s.muted}>Dealer {active ? '' : `· ${g.dealerScore ?? ''}`}</span>
                <div className={s.row} style={{ justifyContent: 'center' }}>
                  {dealer.map((c, i) => <Card key={i} card={c} />)}
                  {active && <Card hidden />}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
                <span className={s.muted}>Kamu · {g.playerScore}</span>
                <div className={s.row} style={{ justifyContent: 'center' }}>{g.playerHand.map((c, i) => <Card key={i} card={c} />)}</div>
              </div>
              <div className={s.status}>{g.message}</div>
              <div className={s.row}>
                {active && <button type="button" className="btn primary" onClick={() => act('hit')} disabled={busy}><CirclePlus size={14} /> Hit</button>}
                {active && <button type="button" className="btn" onClick={() => act('stand')} disabled={busy}><Hand size={14} /> Stand</button>}
                {!active && <button type="button" className="btn primary" onClick={create} disabled={busy}><Plus size={14} /> Ronde baru</button>}
              </div>
            </>
          )}
        </KCard>
      </div>
    </>
  );
}
