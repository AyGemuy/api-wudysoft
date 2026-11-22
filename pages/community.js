import { useCallback } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { MessageSquareText, Newspaper, Loader2 } from 'lucide-react';
import Seo from '@/components/Seo';
import Tabs from '@/components/Tabs';

const Loading = () => (
  <div className="glass" style={{ display: 'grid', placeItems: 'center', padding: 48, borderRadius: 'var(--radius)' }}><Loader2 size={22} className="spin" /></div>
);
const CommentsPanel = dynamic(() => import('@/components/community/CommentsPanel'), { ssr: false, loading: Loading });
const PostsPanel = dynamic(() => import('@/components/community/PostsPanel'), { ssr: false, loading: Loading });

const TABS = [
  { id: 'komentar', label: 'Komentar', Icon: MessageSquareText },
  { id: 'posts', label: 'Posts', Icon: Newspaper },
];
const SEO = {
  komentar: { title: 'Komentar — buku tamu', label: 'KOMENTAR', description: 'Tinggalkan komentar dan balas komentar pengunjung lain.' },
  posts: { title: 'Posts — tulisan & pengumuman', label: 'POSTS', description: 'Baca dan tulis post: judul, isi, dan penulis, dengan pencarian dan pengurutan.' },
};

/** Komunitas: buku tamu (komentar) dan posts dalam satu halaman bertab. */
export default function CommunityPage() {
  const router = useRouter();
  const tab = router.query.tab === 'posts' ? 'posts' : 'komentar';
  const pick = useCallback((id) => {
    if (id === tab) return;
    router.replace({ pathname: '/community', query: id === 'komentar' ? {} : { tab: id } }, undefined, { shallow: true, scroll: false });
  }, [router, tab]);

  return (
    <>
      <Seo {...SEO[tab]} path={tab === 'komentar' ? '/community' : '/community?tab=posts'} />
      <div style={{ width: 'min(960px, 100%)', margin: '0 auto', display: 'grid', gap: 14, justifyItems: 'start' }}>
        <Tabs tabs={TABS} value={tab} onChange={pick} label="Komunitas" />
        <div role="tabpanel" key={tab} style={{ width: '100%' }}>
          {tab === 'komentar' ? <CommentsPanel /> : <PostsPanel />}
        </div>
      </div>
    </>
  );
}
