import { useCallback } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { BookOpen, Gauge, Activity, Loader2 } from 'lucide-react';
import Seo from '@/components/Seo';
import Tabs from '@/components/Tabs';
import DocsPanel from '@/components/dev/DocsPanel';

const Loading = () => (
  <div className="glass" style={{ display: 'grid', placeItems: 'center', padding: 48, borderRadius: 'var(--radius)' }}><Loader2 size={22} className="spin" /></div>
);
const StatusPanel = dynamic(() => import('@/components/dev/StatusPanel'), { ssr: false, loading: Loading });
const StatsPanel = dynamic(() => import('@/components/dev/StatsPanel'), { ssr: false, loading: Loading });

const TABS = [
  { id: 'docs', label: 'Dokumentasi API', Icon: BookOpen },
  { id: 'status', label: 'Status', Icon: Gauge },
  { id: 'stats', label: 'Live Stats', Icon: Activity },
];
const SEO = {
  docs: { title: 'Dokumentasi API — referensi endpoint', label: 'API DOCS', description: 'Referensi API lengkap: parameter, contoh request cURL/JavaScript/Python, dan respons tiap endpoint Wudysoft.' },
  status: { title: 'Status — uptime & latensi API', label: 'STATUS', description: 'Pantau ketersediaan dan latensi endpoint API Wudysoft secara langsung: uptime, p95, dan riwayat gangguan.' },
  stats: { title: 'System & API Stats', label: 'LIVE STATS', description: 'Telemetri penggunaan API, log permintaan realtime, latensi, dan kesehatan sistem Wudysoft.' },
};

/** Pusat developer: dokumentasi, status layanan, dan statistik live dalam satu halaman bertab. */
export default function DeveloperHub() {
  const router = useRouter();
  const q = typeof router.query.tab === 'string' ? router.query.tab : 'docs';
  const tab = TABS.some((t) => t.id === q) ? q : 'docs';
  const pick = useCallback((id) => {
    if (id === tab) return;
    router.replace({ pathname: '/docs', query: id === 'docs' ? {} : { tab: id } }, undefined, { shallow: true, scroll: false });
  }, [router, tab]);

  return (
    <>
      <Seo {...SEO[tab]} path={tab === 'docs' ? '/docs' : `/docs?tab=${tab}`} />
      <div style={{ width: 'min(1100px, 100%)', margin: '0 auto', display: 'grid', gap: 14, justifyItems: 'start' }}>
        <Tabs tabs={TABS} value={tab} onChange={pick} label="Developer" />
        <div role="tabpanel" key={tab} style={{ width: '100%' }}>
          {tab === 'docs' && <DocsPanel />}
          {tab === 'status' && <StatusPanel />}
          {tab === 'stats' && <StatsPanel />}
        </div>
      </div>
    </>
  );
}
