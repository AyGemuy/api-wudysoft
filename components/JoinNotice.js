import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PartyPopper, Users, UsersRound, MessageCircle } from 'lucide-react';
import site from '@/configs/siteConfig';
import { toast } from '@/src/lib/toast';

const C = site.CONTACT;
const seenKey = (u) => `wd_join_seen:${u.isGuest ? 'guest' : u.id}`;
const read = (k) => { try { return localStorage.getItem(k); } catch { return '1'; } };
const write = (k) => { try { localStorage.setItem(k, String(Date.now())); } catch {} };

/**
 * Notifikasi sambutan saat user baru masuk/daftar (tampil sebagai toast bertema): sekali per akun per browser,
 * berisi ajakan gabung grup & komunitas WhatsApp serta kontak admin.
 * (Flag `isNewSignIn` di sesi NextAuth langsung kembali false pada pembacaan sesi berikutnya,
 *  jadi penanda "sudah pernah disambut" disimpan di localStorage.)
 */
export default function JoinNotice() {
  const { data: session, status } = useSession();
  const u = session?.user;

  useEffect(() => {
    if (status !== 'authenticated' || !u?.id) return undefined;
    if (read(seenKey(u))) return undefined;
    const done = () => write(seenKey(u));
    const t = setTimeout(() => {
      toast(`Gabung grup & komunitas WhatsApp untuk tanya jawab dan info update terbaru.`, 'info', {
        id: `keep-join-${u.id}`,
        title: `Selamat datang, ${u.name || 'Operator'}!`,
        icon: <PartyPopper size={17} />,
        duration: Infinity,
        onClose: done,
        actions: [
          { label: 'Grup WA', href: C.WA_GROUP_URL, primary: true, icon: <Users size={13} /> },
          { label: 'Komunitas', href: C.WA_COMMUNITY_URL, icon: <UsersRound size={13} /> },
          { label: 'Admin', href: C.WHATSAPP_URL, icon: <MessageCircle size={13} /> },
        ],
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [status, u?.id, u?.isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
