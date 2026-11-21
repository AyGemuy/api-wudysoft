import { useEffect } from 'react';
import { sound } from '@/src/lib/interactiveEffects';

const INTERACTIVE = 'button, a[href], [role="button"], [role="tab"], [role="switch"], [role="menuitem"], [role="option"], summary, select, label, input[type="checkbox"], input[type="radio"], input[type="range"], [data-sound]';
const TAB_RE = /(^|\s)(seg-btn|au-tab|tab|chip|pill|tabs?-btn|filter)(\s|$|-)/i;
const CLOSE_RE = /(tutup|close|batal|cancel|dismiss|kembali|back)/i;

/**
 * Suara interaksi GLOBAL lewat delegasi event — semua tombol/tautan/saklar/tab/panel otomatis
 * berbunyi tanpa perlu menambah kode di tiap komponen.
 * Opt-out per elemen: data-sound="off". Paksa jenis tertentu: data-sound="click|tab|toggle|open|close|done|error|delete|copy".
 */
export default function GlobalSounds() {
  useEffect(() => {
    const target = (e) => (e.target instanceof Element ? e.target.closest(INTERACTIVE) : null);
    const off = (el) => !el || el.closest('[data-sound="off"]') || el.disabled || el.getAttribute('aria-disabled') === 'true';

    const onDown = (e) => {
      if (e.button > 0) return;
      const el = target(e);
      if (off(el)) return;
      sound.downAt = performance.now();
      const force = el.closest('[data-sound]')?.getAttribute('data-sound');
      if (force && force !== 'off') return void sound.fx(force);
      if (el.matches('input[type="range"], input[type="checkbox"], input[type="radio"], [role="switch"]')) return; // ditangani saat change/click
      if (el.tagName === 'LABEL' && el.querySelector('input[type="checkbox"], input[type="radio"]')) return;
      if (el.hasAttribute('aria-expanded')) {
        const was = el.getAttribute('aria-expanded') === 'true';
        return void sound.fx(was ? 'close' : 'open');
      }
      const label = `${el.getAttribute('aria-label') || ''} ${el.title || ''}`;
      if (el.getAttribute('role') === 'tab' || TAB_RE.test(el.className?.toString?.() || '')) return void sound.fx('tab');
      if (CLOSE_RE.test(label) && !el.textContent?.trim()) return void sound.fx('close');
      sound.fx('click');
    };

    const onClickSwitch = (e) => {
      const el = e.target instanceof Element ? e.target.closest('[role="switch"], [aria-pressed]') : null;
      if (off(el)) return;
      setTimeout(() => {
        const on = el.getAttribute('aria-checked') ?? el.getAttribute('aria-pressed');
        if (on === 'true') sound.fx('toggleOn'); else if (on === 'false') sound.fx('toggleOff');
      }, 0);
    };
    const onChange = (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement) || off(el)) return;
      if (el.type === 'checkbox' || el.type === 'radio') sound.fx(el.checked ? 'toggleOn' : 'toggleOff');
      else if (el.type === 'range') sound.fx('tab');
    };
    let lastHover = null;
    const onOver = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const el = target(e);
      if (off(el) || el === lastHover) return;
      lastHover = el;
      sound.fx('hover');
    };
    const onFocus = (e) => {
      const el = e.target;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) if (!el.closest('[data-sound="off"]') && el.type !== 'range' && el.type !== 'checkbox') sound.fx('focus');
    };
    const onKey = (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el?.isContentEditable)) return;
      if (el.closest?.('[data-sound="off"]') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length === 1 || e.key === 'Backspace') sound.fx('key');
    };
    const onCopy = () => sound.fx('copy');

    // Navigasi Clipboard API (tombol "Salin") → suara copy
    let origWrite = null;
    try {
      if (navigator.clipboard?.writeText) {
        origWrite = navigator.clipboard.writeText.bind(navigator.clipboard);
        navigator.clipboard.writeText = (t) => origWrite(t).then((r) => { sound.fx('copy'); return r; });
      }
    } catch {}

    // Toast / notifikasi yang muncul di halaman mana pun → suara sukses / gagal / peringatan
    const seen = new WeakSet();
    const mo = new MutationObserver((muts) => {
      for (const m of muts) for (const n of m.addedNodes) {
        if (!(n instanceof Element) || seen.has(n)) continue;
        const el = /toast|snack|notif/i.test(n.className?.toString?.() || '') ? n : n.querySelector?.('[class*="toast"], [role="alert"]');
        if (!el || seen.has(el) || el.closest('[data-sound="off"]')) continue;
        seen.add(el); seen.add(n);
        const c = `${el.className} ${el.getAttribute('data-type') || ''}`;
        sound.fx(/err|fail|danger|gagal/i.test(c) ? 'error' : /warn|info/i.test(c) ? 'notify' : 'done');
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('click', onClickSwitch, true);
    document.addEventListener('change', onChange, true);
    document.addEventListener('pointerover', onOver, true);
    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('copy', onCopy, true);
    return () => {
      mo.disconnect();
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('click', onClickSwitch, true);
      document.removeEventListener('change', onChange, true);
      document.removeEventListener('pointerover', onOver, true);
      document.removeEventListener('focusin', onFocus, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('copy', onCopy, true);
      try { if (origWrite) navigator.clipboard.writeText = origWrite; } catch {}
    };
  }, []);
  return null;
}
