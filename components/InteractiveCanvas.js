import { useEffect, useRef, useState } from 'react';

export default function InteractiveCanvas({ particleType = 'rain', clickRipple = false }) {
  const canvasRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const particles = [];
    const count = particleType === 'rain' ? 60 : particleType === 'stars' ? 40 : 0;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: particleType === 'rain' ? 5 + Math.random() * 6 : 0.2 + Math.random() * 0.4,
        len: 12 + Math.random() * 12,
        alpha: Math.random() * 0.35 + 0.1,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (particleType === 'rain') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        particles.forEach((p) => {
          ctx.beginPath();
          ctx.globalAlpha = p.alpha;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 1, p.y + p.len);
          ctx.stroke();
          p.y += p.speed;
          if (p.y > height) {
            p.y = -p.len;
            p.x = Math.random() * width;
          }
        });
      } else if (particleType === 'stars') {
        ctx.fillStyle = '#6366f1';
        particles.forEach((p) => {
          ctx.beginPath();
          ctx.globalAlpha = p.alpha;
          ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
          p.y -= p.speed;
          if (p.y < 0) p.y = height;
        });
      }

      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
    };
  }, [mounted, particleType]);

  if (!mounted || particleType === 'off') return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}