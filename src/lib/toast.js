/**
 * API toast global — dipakai semua halaman & komponen (pengganti alert/confirm bawaan browser).
 * Dirender oleh <ToastHost /> (components/ToastHost.js) sehingga warna, radius, blur & animasi
 * otomatis mengikuti tema aktif.
 *
 *   import { toast, confirmToast } from '@/src/lib/toast';
 *   toast('Tersimpan');                 // sukses
 *   toast.err('Gagal menyimpan');       // error
 *   toast.info('Tema diterapkan');      // info
 *   toast.warn('Hati-hati');            // peringatan
 *   toast('Halo', 'info', { title: 'Judul', duration: 6000, actions: [{ label: 'Buka', onClick }] });
 *   if (await confirmToast('Hapus pesan ini?', { danger: true, okLabel: 'Hapus' })) { … }
 */
export const TOAST_EVENT = 'wudysoft:toast';
export const CONFIRM_EVENT = 'wudysoft:confirm';

const ALIAS = { success: 'ok', error: 'err', danger: 'err', warning: 'warn', '': 'ok' };
const norm = (t) => ALIAS[t] ?? (['ok', 'err', 'warn', 'info'].includes(t) ? t : 'ok');

export function toast(message, type = 'ok', opts = {}) {
  if (typeof window === 'undefined' || !message) return null;
  const id = opts.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { ...opts, id, message: String(message), type: norm(type) } }));
  return id;
}
toast.ok = (m, o) => toast(m, 'ok', o);
toast.err = (m, o) => toast(m, 'err', o);
toast.warn = (m, o) => toast(m, 'warn', o);
toast.info = (m, o) => toast(m, 'info', o);
toast.dismiss = (id) => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { id, dismiss: true } })); };

/** Dialog konfirmasi bertema (pengganti window.confirm). Mengembalikan Promise<boolean>. */
export function confirmToast(message, opts = {}) {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (!window.__wdToastHost) return Promise.resolve(window.confirm(String(message)));
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent(CONFIRM_EVENT, { detail: { ...opts, message: String(message), resolve } }));
  });
}
