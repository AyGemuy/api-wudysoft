import { useEffect, useRef, useState } from 'react';

const GLYPHS = 'アイウエオカキクケコサシスセソ0123456789ABCDEF<>/{}';

/**
 * Partikel latar: rain, stars, snow, fireflies, matrix.
 * Warna mengikuti tema (prop color / color2), bisa di-pause saat animasi dimatikan.
 */
export default function InteractiveCanvas({
  particleType = 'rain',
  color = '#38bdf8',
  color2 = '#6366f1',
  paused = false,
  speed = 1,
}) {
  const canvasRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const live = useRef({ color, color2, paused, speed });
  live.current = { color, color2, paused, speed };

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || particleType === 'off') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let animId;
    let frame = 0;
    let particles = [];
    let cols = [];

    const build = () => {
      const small = width < 640;
      const k = small ? 0.6 : 1;
      particles = [];
      cols = [];
      if (particleType === 'matrix') {
        const n = Math.ceil(width / 18);
        for (let i = 0; i < n; i++) cols.push({ y: Math.random() * height, v: 1.2 + Math.random() * 2.2, len: 6 + ((Math.random() * 10) | 0) });
        return;
      }
      const count = Math.round({ rain: 60, stars: 45, snow: 70, fireflies: 28 }[particleType] * k);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: Math.random() - 0.5,
          speed: particleType === 'rain' ? 5 + Math.random() * 6 : particleType === 'snow' ? 0.5 + Math.random() * 1.1 : 0.2 + Math.random() * 0.4,
          len: 12 + Math.random() * 12,
          r: particleType === 'snow' ? 1.2 + Math.random() * 2.2 : 1 + Math.random() * 1.6,
          alpha: Math.random() * 0.35 + 0.1,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      animId = requestAnimationFrame(render);
      const { color: c1, color2: c2, paused: p, speed: sp } = live.current;
      ctx.clearRect(0, 0, width, height);
      if (p || document.hidden) return;
      frame++;
      const s = Math.min(sp, 3);

      if (particleType === 'rain') {
        ctx.strokeStyle = c1;
        ctx.lineWidth = 1.2;
        particles.forEach((q) => {
          ctx.globalAlpha = q.alpha;
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(q.x - 1, q.y + q.len);
          ctx.stroke();
          q.y += q.speed * s;
          if (q.y > height) {
            q.y = -q.len;
            q.x = Math.random() * width;
          }
        });
      } else if (particleType === 'stars') {
        ctx.fillStyle = c2;
        particles.forEach((q) => {
          ctx.globalAlpha = q.alpha * (0.6 + 0.4 * Math.sin(frame * 0.03 + q.phase));
          ctx.beginPath();
          ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
          ctx.fill();
          q.y -= q.speed * s;
          if (q.y < 0) q.y = height;
        });
      } else if (particleType === 'snow') {
        ctx.fillStyle = c1;
        particles.forEach((q) => {
          ctx.globalAlpha = q.alpha + 0.2;
          ctx.beginPath();
          ctx.arc(q.x + Math.sin(frame * 0.012 + q.phase) * 14, q.y, q.r, 0, Math.PI * 2);
          ctx.fill();
          q.y += q.speed * s;
          if (q.y > height + 4) {
            q.y = -4;
            q.x = Math.random() * width;
          }
        });
      } else if (particleType === 'fireflies') {
        particles.forEach((q) => {
          q.x += q.vx * s;
          q.y += q.vy * s;
          q.vx += (Math.random() - 0.5) * 0.06;
          q.vy += (Math.random() - 0.5) * 0.06;
          q.vx = Math.max(-0.7, Math.min(0.7, q.vx));
          q.vy = Math.max(-0.7, Math.min(0.7, q.vy));
          if (q.x < 0) q.x = width;
          if (q.x > width) q.x = 0;
          if (q.y < 0) q.y = height;
          if (q.y > height) q.y = 0;
          const glow = 0.5 + 0.5 * Math.sin(frame * 0.04 + q.phase);
          const rad = q.r * 5;
          const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, rad);
          g.addColorStop(0, c1);
          g.addColorStop(1, 'transparent');
          ctx.globalAlpha = 0.15 + glow * 0.55;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(q.x, q.y, rad, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (particleType === 'matrix') {
        ctx.font = '14px ui-monospace, monospace';
        cols.forEach((col, i) => {
          col.y += col.v * s;
          if (col.y - col.len * 16 > height) col.y = -Math.random() * 200;
          for (let j = 0; j < col.len; j++) {
            const ch = GLYPHS[(i * 7 + j * 13 + (frame >> 3)) % GLYPHS.length];
            ctx.globalAlpha = (1 - j / col.len) * (j === 0 ? 0.9 : 0.4);
            ctx.fillStyle = j === 0 ? '#ffffff' : c1;
            ctx.fillText(ch, i * 18, col.y - j * 16);
          }
        });
      }
      ctx.globalAlpha = 1;
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [mounted, particleType]);

  if (!mounted || particleType === 'off') return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}
    />
  );
}
