/**
 * Mengunci zoom pada layar sentuh & trackpad:
 * - iOS Safari mengabaikan user-scalable=no, jadi gesture* diblok manual
 * - Pinch dua jari (touchmove > 1 jari) diblok
 * - Double-tap zoom diblok
 * - Ctrl + scroll / pinch trackpad di desktop diblok
 * Mengembalikan fungsi cleanup.
 */
export function lockZoom() {
  if (typeof window === "undefined") return () => {};

  const stop = (e) => e.preventDefault();
  const onTouchMove = (e) => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  };
  let lastTouchEnd = 0;
  const onTouchEnd = (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  };
  const onWheel = (e) => {
    if (e.ctrlKey) e.preventDefault();
  };

  const opts = { passive: false };
  document.addEventListener("gesturestart", stop, opts);
  document.addEventListener("gesturechange", stop, opts);
  document.addEventListener("gestureend", stop, opts);
  document.addEventListener("touchmove", onTouchMove, opts);
  document.addEventListener("touchend", onTouchEnd, opts);
  window.addEventListener("wheel", onWheel, opts);

  return () => {
    document.removeEventListener("gesturestart", stop);
    document.removeEventListener("gesturechange", stop);
    document.removeEventListener("gestureend", stop);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("wheel", onWheel);
  };
}

export default lockZoom;
