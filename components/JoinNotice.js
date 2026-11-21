import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, X, Users, UsersRound, MessageCircle } from 'lucide-react';
import site from '@/configs/siteConfig';

const C = site.CONTACT;
const seenKey = (u) => `wd_join_seen:${u.isGuest ? 'guest' : u.id}`;
const read = (k) => { try { return localStorage.getItem(k); } catch { return '1'; } };
const write = (k) => { try { localStorage.setItem(k, String(Date.now())); } catch {} };

/**
 * Notifikasi sambutan saat user baru masuk/daftar: sekali per akun per browser,
 * berisi ajakan gabung grup & komunitas WhatsApp serta kontak admin.
 * (Flag `isNewSignIn` di sesi NextAuth langsung kembali false pada pembacaan sesi berikutnya,
 *  jadi penanda "sudah pernah disambut" disimpan di localStorage.)
 */
export default function JoinNotice() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const u = session?.user;

  useEffect(() => {
    if (status !== 'authenticated' || !u?.id) return;
    if (read(seenKey(u))) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [status, u?.id, u?.isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    if (u?.id) write(seenKey(u));
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && u && (
        <motion.div
          className="jn glass"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <button type="button" className="jn-x" onClick={close} aria-label="Tutup"><X size={15} /></button>
          <div className="jn-head">
            <span className="jn-ico"><PartyPopper size={18} /></span>
            <div>
              <b>Selamat datang, {u.name || 'Operator'}!</b>
              <p>Gabung grup & komunitas WhatsApp untuk tanya jawab dan info update terbaru.</p>
            </div>
          </div>
          <div className="jn-act">
            <a className="btn primary" href={C.WA_GROUP_URL} target="_blank" rel="noopener noreferrer" onClick={close}><Users size={14} /> Grup WA</a>
            <a className="btn" href={C.WA_COMMUNITY_URL} target="_blank" rel="noopener noreferrer" onClick={close}><UsersRound size={14} /> Komunitas</a>
            <a className="btn" href={C.WHATSAPP_URL} target="_blank" rel="noopener noreferrer" onClick={close}><MessageCircle size={14} /> Admin</a>
          </div>
          <style jsx>{`
            .jn { position: fixed; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); z-index: 9998; width: min(360px, calc(100vw - 32px)); padding: 14px; display: grid; gap: 12px; border-radius: var(--r-m); box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35); border-color: color-mix(in srgb, var(--a2) 45%, var(--border)); }
            .jn-x { position: absolute; top: 8px; right: 8px; background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px; }
            .jn-head { display: flex; gap: 10px; align-items: flex-start; padding-right: 18px; }
            .jn-head p { margin: 2px 0 0; font-size: 0.78rem; color: var(--muted); }
            .jn-ico { flex: none; width: 34px; height: 34px; display: grid; place-items: center; border-radius: var(--r-s); color: var(--on-accent); background: linear-gradient(135deg, var(--a1), var(--a3)); }
            .jn-act { display: flex; gap: 6px; flex-wrap: wrap; }
            .jn-act :global(.btn) { display: inline-flex; align-items: center; gap: 5px; font-size: 0.76rem; }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
