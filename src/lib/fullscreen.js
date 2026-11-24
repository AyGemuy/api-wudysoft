import { useCallback, useEffect, useState } from 'react';

/**
 * Layar penuh: memakai Fullscreen API bila ada (Chrome, Firefox, Edge, Safari desktop, Android).
 * iPhone Safari tidak mendukungnya untuk halaman web → mode "imersif" (menyembunyikan navigasi) tetap jalan lewat CSS.
 */
const root = () => (typeof document === 'undefined' ? null : document.documentElement);
export const fsElement = () => (typeof document === 'undefined' ? null : document.fullscreenElement || document.webkitFullscreenElement || null);
export const fsSupported = () => { const el = root(); return !!(el && (el.requestFullscreen || el.webkitRequestFullscreen)); };

export async function enterFs(el = root()) {
  try {
    if (el?.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else return false;
    return true;
  } catch { return false; }
}
export async function exitFs() {
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  } catch {}
}

/** { active, supported, toggle } — `active` mengikuti perubahan (termasuk keluar lewat Esc). */
export function useFullscreen() {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(fsSupported());
    const on = () => setActive(!!fsElement());
    on();
    document.addEventListener('fullscreenchange', on);
    document.addEventListener('webkitfullscreenchange', on);
    return () => { document.removeEventListener('fullscreenchange', on); document.removeEventListener('webkitfullscreenchange', on); };
  }, []);
  const toggle = useCallback(() => (fsElement() ? exitFs() : enterFs()), []);
  return { active, supported, toggle };
}

/** Mode imersif room: atribut di <html> (CSS di styles/modern.css) + layar penuh native bila bisa. */
export function setRoomFull(on) {
  const el = root();
  if (!el) return;
  if (on) { el.setAttribute('data-room-full', 'on'); enterFs(); }
  else { el.removeAttribute('data-room-full'); if (fsElement()) exitFs(); }
}
