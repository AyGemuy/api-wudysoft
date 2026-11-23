import { createContext, forwardRef, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, animate } from 'framer-motion';
import { useTheme } from '@/components/ThemeContext';

/**
 * Library animasi Wudysoft — semua komponen otomatis:
 *  • mati bila "Semua animasi" off di Theme Studio atau perangkat meminta reduced-motion
 *  • mengikuti slider kecepatan (Theme Studio)
 */
export const EASE = [0.22, 1, 0.36, 1];
const SPRING = { type: 'spring', stiffness: 260, damping: 22, mass: 0.8 };

export function useMotionOk() {
  const { config } = useTheme();
  const reducedPref = useReducedMotion();
  // sebelum mount dianggap tidak reduced → HTML klien pertama sama dengan HTML server (tanpa error hidrasi)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const reduced = mounted && reducedPref;
  const ok = config.anim !== 'off' && !reduced;
  const speed = Math.max(0.5, config.speed || 1);
  return { ok, entrance: ok && config.animEntrance !== false, speed };
}

/** Kumpulan varian masuk. Nilai `hidden` / `show`. */
export const VARIANTS = {
  up: { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 } },
  down: { hidden: { opacity: 0, y: -28 }, show: { opacity: 1, y: 0 } },
  left: { hidden: { opacity: 0, x: -36 }, show: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: 36 }, show: { opacity: 1, x: 0 } },
  zoom: { hidden: { opacity: 0, scale: 0.88 }, show: { opacity: 1, scale: 1 } },
  blur: { hidden: { opacity: 0, filter: 'blur(14px)', y: 10 }, show: { opacity: 1, filter: 'blur(0px)', y: 0 } },
  flip: { hidden: { opacity: 0, rotateX: -70, y: 16, transformPerspective: 700 }, show: { opacity: 1, rotateX: 0, y: 0, transformPerspective: 700 } },
  rotate: { hidden: { opacity: 0, rotate: -6, scale: 0.92, y: 16 }, show: { opacity: 1, rotate: 0, scale: 1, y: 0 } },
  skew: { hidden: { opacity: 0, skewY: 5, y: 24 }, show: { opacity: 1, skewY: 0, y: 0 } },
  pop: { hidden: { opacity: 0, scale: 0.6 }, show: { opacity: 1, scale: 1, transition: SPRING } },
  clip: { hidden: { opacity: 0, clipPath: 'inset(0 0 100% 0 round 12px)' }, show: { opacity: 1, clipPath: 'inset(0 0 0% 0 round 12px)' } },
};
export const VARIANT_CYCLE = ['up', 'zoom', 'blur', 'left', 'flip', 'right', 'rotate', 'pop'];
/** Pilih varian berdasarkan indeks → daftar/kartu muncul dengan gaya berganti-ganti. */
export const cycleVariant = (i, list = VARIANT_CYCLE) => list[i % list.length];

/** Muncul saat masuk viewport. */
export const Reveal = forwardRef(function Reveal({ as = 'div', variant = 'up', delay = 0, duration = 0.65, once = true, amount = 0.15, className, style, children, ...rest }, ref) {
  const { entrance, speed } = useMotionOk();
  const Tag = motion[as] || motion.div;
  if (!entrance) return <Tag ref={ref} className={className} style={style} {...rest}>{children}</Tag>;
  const v = VARIANTS[variant] || VARIANTS.up;
  return (
    <Tag
      ref={ref}
      className={className}
      style={style}
      variants={v}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount, margin: '0px 0px -8% 0px' }}
      transition={{ duration: duration / speed, delay: delay / speed, ease: EASE }}
      {...rest}
    >
      {children}
    </Tag>
  );
});

const StaggerCtx = createContext({ variant: 'up' });

/**
 * Kontainer yang memunculkan anak `<Item>` bergantian. `cycle` = tiap anak beda varian.
 * Tiap Item memantau viewport-nya sendiri (bukan lewat varian induk), sehingga daftar dinamis —
 * kosong saat memuat lalu terisi, atau berganti isi saat pindah halaman — tetap muncul dengan benar.
 */
export function Stagger({ as = 'div', gap = 0.07, delay = 0, variant = 'up', cycle = false, once = true, amount = 0.1, className, style, children, ...rest }) {
  const { entrance } = useMotionOk();
  const ctx = useMemo(() => ({ variant, cycle, entrance, gap, delay, once, amount }), [variant, cycle, entrance, gap, delay, once, amount]);
  const Tag = as;
  return (
    <StaggerCtx.Provider value={ctx}>
      <Tag className={className} style={style} {...rest}>{children}</Tag>
    </StaggerCtx.Provider>
  );
}

export function Item({ as = 'div', index = 0, variant, duration = 0.55, className, style, children, ...rest }) {
  const { variant: base, cycle, entrance, gap = 0.07, delay = 0, once = true, amount = 0.1 } = useContext(StaggerCtx);
  const { speed } = useMotionOk();
  const Tag = motion[as] || motion.div;
  if (!entrance) return <Tag className={className} style={style} {...rest}>{children}</Tag>;
  const name = variant || (cycle ? cycleVariant(index) : base);
  return (
    <Tag
      className={className}
      style={style}
      variants={VARIANTS[name] || VARIANTS.up}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount: Math.min(amount, 0.1), margin: '0px 0px -4% 0px' }}
      transition={{ duration: duration / speed, ease: EASE, delay: (delay + (index % 8) * gap) / speed }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Teks muncul per kata / huruf. */
export function TextReveal({ text, as = 'span', by = 'word', delay = 0, stagger = 0.045, className, style }) {
  const { entrance, speed } = useMotionOk();
  const Tag = motion[as] || motion.span;
  const parts = by === 'char' ? Array.from(text) : String(text).split(' ');
  if (!entrance) return <Tag className={className} style={style}>{text}</Tag>;
  return (
    <Tag
      className={className}
      style={style}
      aria-label={text}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.6 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger / speed, delayChildren: delay / speed } } }}
    >
      {parts.map((w, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
          variants={{ hidden: { opacity: 0, y: '0.6em', filter: 'blur(8px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)' } }}
          transition={{ duration: 0.6 / speed, ease: EASE }}
        >
          {w}{by === 'word' && i < parts.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </Tag>
  );
}

/** Angka naik dari 0 saat terlihat. */
export function CountUp({ to = 0, from = 0, duration = 1.4, format = (n) => Math.round(n).toLocaleString('id-ID'), className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const { ok, speed } = useMotionOk();
  const [val, setVal] = useState(ok ? from : to);
  useEffect(() => {
    if (!ok) return setVal(to);
    if (!inView) return;
    const c = animate(from, to, { duration: duration / speed, ease: EASE, onUpdate: setVal });
    return () => c.stop();
  }, [inView, to, from, duration, ok, speed]);
  return <span ref={ref} className={className}>{format(val)}</span>;
}

/** Tombol / elemen yang sedikit "tertarik" ke kursor (hanya pointer halus, mis. desktop). */
export function Magnetic({ strength = 0.25, className, style, children }) {
  const { ok } = useMotionOk();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18 });
  const sy = useSpring(y, { stiffness: 220, damping: 18 });
  const ref = useRef(null);
  if (!ok) return <div className={className} style={style}>{children}</div>;
  const move = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const leave = () => { x.set(0); y.set(0); };
  return (
    <motion.div ref={ref} className={className} style={{ display: 'inline-flex', ...style, x: sx, y: sy }} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </motion.div>
  );
}

/** Bilah progres gulir di tepi atas layar. */
export function ScrollProgress() {
  const { ok } = useMotionOk();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 });
  if (!ok) return null;
  return <motion.div className="mo-scroll-progress" style={{ scaleX }} aria-hidden="true" />;
}

/** Geser lembut mengikuti gulir (parallax). */
export function Parallax({ offset = 40, className, style, children }) {
  const { ok } = useMotionOk();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  if (!ok) return <div className={className} style={style}>{children}</div>;
  return <motion.div ref={ref} className={className} style={{ ...style, y }}>{children}</motion.div>;
}

/** Props siap pakai untuk elemen interaktif: sedikit membesar saat hover, mengecil saat ditekan. */
export function tapProps(ok = true) {
  return ok ? { whileHover: { y: -2, transition: SPRING }, whileTap: { scale: 0.97 } } : {};
}
