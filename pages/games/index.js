import { useCallback } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { Gamepad2, Grid3x3, Crown, Spade, Sparkles, Dices, ImageIcon, Loader2 } from 'lucide-react';
import Seo from '@/components/Seo';
import Tabs from '@/components/Tabs';
import { kit as s } from '@/components/PageKit';

// Tiap game dimuat hanya saat tab-nya dibuka → halaman awal tetap ringan.
const Loading = () => (
  <div className="glass" style={{ display: 'grid', placeItems: 'center', padding: 48, borderRadius: 'var(--radius)' }}>
    <Loader2 size={22} className="spin" />
  </div>
);
const load = (fn) => dynamic(fn, { ssr: false, loading: Loading });

const GAMES = [
  { id: 'tictactoe', label: 'Tic-Tac-Toe', Icon: Grid3x3, Comp: load(() => import('@/components/games/tictactoe')) },
  { id: 'chess', label: 'Catur', Icon: Crown, Comp: load(() => import('@/components/games/chess')) },
  { id: 'blackjack', label: 'Blackjack', Icon: Spade, Comp: load(() => import('@/components/games/blackjack')) },
  { id: 'akinator', label: 'Akinator', Icon: Sparkles, Comp: load(() => import('@/components/games/akinator')) },
  { id: 'ludo', label: 'Ludo', Icon: Dices, Comp: load(() => import('@/components/games/ludo')) },
  { id: 'tebak-gambar', label: 'Tebak Gambar', Icon: ImageIcon, Comp: load(() => import('@/components/games/tebak-gambar')) },
];
const TABS = GAMES.map(({ id, label, Icon }) => ({ id, label, Icon }));

export default function GamesPage() {
  const router = useRouter();
  const g = typeof router.query.g === 'string' ? router.query.g : '';
  const active = GAMES.find((x) => x.id === g) || GAMES[0];

  const pick = useCallback((id) => {
    if (id === active.id) return;
    router.replace({ pathname: '/games', query: { g: id } }, undefined, { shallow: true, scroll: false });
  }, [router, active.id]);

  const Game = active.Comp;
  return (
    <>
      <Seo
        title={`Arena Game · ${active.label}`}
        path="/games"
        label="GAMES"
        description="Mainkan Tic-Tac-Toe, Catur, Blackjack, Akinator, Ludo, dan Tebak Gambar langsung di browser — semua dalam satu halaman."
      />
      <div className={s.page}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Gamepad2 size={20} color="var(--a2)" />
          <h1 style={{ fontSize: '1.15rem' }}>Arena Game</h1>
          <span className="badge">24 JAM SESI</span>
        </div>
        <Tabs tabs={TABS} value={active.id} onChange={pick} label="Pilih game" />
        <div key={active.id} role="tabpanel">
          <Game />
        </div>
      </div>
    </>
  );
}
