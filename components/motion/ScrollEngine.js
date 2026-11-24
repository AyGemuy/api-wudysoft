import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useReducedMotion } from 'framer-motion';
import { useTheme } from '@/components/ThemeContext';
import { useFullscreen } from '@/src/lib/fullscreen';

/**
 * Mesin gulir modern (dipasang sekali di _app):
 *  • Lenis  — gulir halus berinersia, disinkronkan ke ticker GSAP
 *  • GSAP + ScrollTrigger — kartu `.kc` masuk bertahap saat terlihat (ikon → judul → isi → footer),
 *    parallax latar (blob) saat gulir
 * Semuanya mengikuti Theme Studio (Gulir halus / Animasi saat gulir) serta `prefers-reduced-motion`
 * dan saklar utama animasi. Pustaka dimuat dinamis → tidak membebani bundle awal.
 */

/** Elemen di dalam kontainer yang punya scroll sendiri (chat, modal, textarea, kode) tidak boleh dibajak Lenis. */
function shouldPrevent(node) {
  for (let el = node; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    if (el.hasAttribute && el.hasAttribute('data-lenis-prevent')) return true;
    const cs = getComputedStyle(el);
    if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) return true;
  }
  return false;
}

/** Apakah elemen ini ikut gulir jendela (bukan di dalam panel yang bisa digulir sendiri)? */
function inWindowScroll(el) {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1) return false;
    if (cs.position === 'fixed') return false;
  }
  return true;
}

export default function ScrollEngine() {
  const router = useRouter();
  const { config } = useTheme();
  const reduced = useReducedMotion();
  // Saat layar penuh, <html> menjadi wadah gulir sendiri (bukan window) → Lenis/ScrollTrigger dimatikan
  // dan gulir native browser dipakai, jadi roda mouse, sentuhan, dan keyboard bekerja seperti biasa.
  const { active: fsActive } = useFullscreen();
  const animOn = config.anim !== 'off' && !reduced && !fsActive;
  const smooth = animOn && config.smoothScroll !== false;
  const fx = animOn ? config.scrollFx || 'full' : 'off';
  const speed = Math.max(0.5, config.speed || 1);

  // ---------- 1. Lenis: gulir halus ----------
  useEffect(() => {
    if (!smooth) return undefined;
    let lenis; let gsap; let off = false; let rafId = 0;
    const cleanups = [];

    (async () => {
      const [{ default: Lenis }, gsapMod, stMod] = await Promise.all([
        import('lenis'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (off) return;
      gsap = gsapMod.gsap || gsapMod.default;
      const ScrollTrigger = stMod.ScrollTrigger || stMod.default;
      gsap.registerPlugin(ScrollTrigger);

      lenis = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
        syncTouch: false, // sentuhan memakai gulir native agar tetap responsif di HP
        wheelMultiplier: 1,
        anchors: true,
        prevent: shouldPrevent,
      });
      window.__lenis = lenis;
      document.documentElement.setAttribute('data-lenis', 'on');

      lenis.on('scroll', ScrollTrigger.update);
      const tick = (t) => lenis.raf(t * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      cleanups.push(() => gsap.ticker.remove(tick));

      const onRoute = () => {
        lenis.scrollTo(0, { immediate: true, force: true });
        setTimeout(() => { lenis.resize(); ScrollTrigger.refresh(); }, 350);
      };
      router.events.on('routeChangeComplete', onRoute);
      cleanups.push(() => router.events.off('routeChangeComplete', onRoute));

      // tinggi dokumen berubah saat konten dimuat → hitung ulang
      const ro = new ResizeObserver(() => lenis.resize());
      ro.observe(document.body);
      cleanups.push(() => ro.disconnect());
    })();

    return () => {
      off = true;
      cancelAnimationFrame(rafId);
      cleanups.forEach((f) => f());
      if (lenis) lenis.destroy();
      if (window.__lenis === lenis) delete window.__lenis;
      document.documentElement.removeAttribute('data-lenis');
    };
  }, [smooth, router]);

  // ---------- 2. GSAP ScrollTrigger: kartu masuk bertahap + parallax latar ----------
  useEffect(() => {
    if (fx === 'off') return undefined;
    let off = false; let gsap; let ScrollTrigger; let mo; let debounce = 0;
    const seen = new WeakSet();
    const triggers = [];
    const timers = [];
    const full = fx === 'full';

    const prep = (card) => {
      if (seen.has(card) || card.closest('[data-no-fx]')) return;
      if (!inWindowScroll(card)) return;
      if (card.offsetParent === null) return; // belum terlihat (tab tersembunyi) → dicoba lagi pada scan berikutnya
      seen.add(card);

      const head = card.querySelector(':scope > .kc-head');
      const ico = head && head.querySelector('.kc-ico');
      const titles = head ? [...head.querySelectorAll('.kc-titles > *')] : [];
      const extras = head ? [...head.querySelectorAll('.kc-badge, .kc-actions')] : [];
      const body = card.querySelector(':scope > .kc-body');
      const kids = body ? [...body.children].slice(0, 14) : [];
      const foot = card.querySelector(':scope > .kc-foot');
      const parts = [ico, ...titles, ...extras, ...kids, foot].filter(Boolean);
      if (!parts.length) return;

      const dist = full ? 26 : 14;
      gsap.set(parts, { opacity: 0, y: dist });
      if (ico && full) gsap.set(ico, { scale: 0.4, rotate: -80 });

      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: 'power3.out', overwrite: 'auto' },
        onComplete: () => gsap.set(parts, { clearProps: 'opacity,transform,visibility' }),
      });
      if (ico) tl.to(ico, { opacity: 1, y: 0, ...(full ? { scale: 1, rotate: 0, ease: 'back.out(2)' } : {}), duration: 0.55 / speed }, 0);
      if (titles.length) tl.to(titles, { opacity: 1, y: 0, duration: 0.5 / speed, stagger: 0.06 }, 0.06);
      if (extras.length) tl.to(extras, { opacity: 1, y: 0, duration: 0.45 / speed, stagger: 0.05 }, 0.14);
      if (kids.length) tl.to(kids, { opacity: 1, y: 0, duration: 0.6 / speed, stagger: full ? 0.07 : 0.04 }, 0.16);
      if (foot) tl.to(foot, { opacity: 1, y: 0, duration: 0.5 / speed }, '>-0.25');

      const play = () => { if (tl.progress() === 0 && !tl.isActive()) tl.play(); };
      const st = ScrollTrigger.create({ trigger: card, start: 'top 94%', once: true, onEnter: play });
      triggers.push(st);
      // pengaman: jangan pernah biarkan konten tersembunyi bila trigger tidak menyala
      timers.push(setTimeout(play, 2600));
    };

    const scan = () => {
      if (off) return;
      document.querySelectorAll('.kc').forEach(prep);
    };
    const scanSoon = () => { clearTimeout(debounce); debounce = setTimeout(scan, 120); };

    (async () => {
      const [gsapMod, stMod] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
      if (off) return;
      gsap = gsapMod.gsap || gsapMod.default;
      ScrollTrigger = stMod.ScrollTrigger || stMod.default;
      gsap.registerPlugin(ScrollTrigger);

      scan();
      timers.push(setTimeout(scan, 450), setTimeout(scan, 1200)); // setelah transisi halaman & data awal
      mo = new MutationObserver(scanSoon);
      mo.observe(document.body, { childList: true, subtree: true });

      // parallax latar: blob bergerak berbeda kecepatan terhadap gulir (properti `translate` agar tak bentrok dengan keyframe CSS)
      if (full && document.documentElement.dataset.animBlobs !== 'off') {
        const dirs = { '.blob.b1': -160, '.blob.b2': 200, '.blob.b3': -100 };
        Object.entries(dirs).forEach(([sel, y]) => {
          const el = document.querySelector(sel);
          if (!el) return;
          const t = gsap.fromTo(el, { translate: '0px 0px' }, {
            translate: `0px ${y}px`,
            ease: 'none',
            scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.8 },
          });
          triggers.push(t.scrollTrigger);
        });
      }
    })();

    return () => {
      off = true;
      clearTimeout(debounce);
      timers.forEach(clearTimeout);
      if (mo) mo.disconnect();
      triggers.forEach((t) => t && t.kill());
      if (gsap) {
        // kembalikan kartu yang sempat disembunyikan
        document.querySelectorAll('.kc-head *, .kc-body > *, .kc-foot').forEach((n) => gsap.set(n, { clearProps: 'opacity,transform,visibility' }));
        gsap.set('.blob', { clearProps: 'translate' });
      }
    };
  }, [fx, speed, router.asPath]);

  return null;
}
