"use client";

import { useEffect, useRef } from "react";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Ensure a clean body class after hydration
  useEffect(() => {
    document.body.className = "antialiased";
  }, []);

  // Flaming sparks overlay canvas
  useEffect(() => {
    // Respect reduced motion preferences
    const prefersReduced =
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const setSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const w = Math.floor(width * DPR);
      const h = Math.floor(height * DPR);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    setSize();

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      hue: number;
    };

    const particles: Particle[] = [];
    const maxParticles = Math.max(80, Math.min(180, Math.floor(width / 8)));

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const spawn = (n: number) => {
      for (let i = 0; i < n; i++) {
        if (particles.length >= maxParticles) break;
        const spread = Math.max(80, width * 0.9);
        const x = rand((width - spread) / 2, (width + spread) / 2);
        const y = height + rand(0, 40);
        const size = rand(0.8, 2.2);
        const hue = rand(0, 8); // red range
        particles.push({
          x,
          y,
          vx: rand(-0.25, 0.25),
          vy: rand(-1.9, -0.9),
          life: 0,
          maxLife: rand(50, 130),
          size,
          hue,
        });
      }
    };

    let raf = 0;
    let lastT = performance.now();

    const draw = () => {
      const now = performance.now();
      const dt = Math.max(0.016, Math.min(0.048, (now - lastT) / 1000));
      lastT = now;

      // Fade previous frame for trails
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(20, 0, 0, 0.06)"; // red-tinted trails
      ctx.fillRect(0, 0, width, height);

      // Spawn new sparks
      const spawnBase = width < 768 ? 1 : 2;
      const spawnCount = Math.random() < 0.6 ? spawnBase : spawnBase * 2;
      spawn(spawnCount);

      // Draw particles with additive glow
      ctx.globalCompositeOperation = "lighter";

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.006; // buoyancy
        p.vx *= 0.997; // drag
        p.life += dt * 60;

        const t = p.life / p.maxLife;
        if (t >= 1 || p.y < -20) {
          particles.splice(i, 1);
          continue;
        }

        const alpha = Math.max(0, 0.9 - t * 0.9);
        const r = p.size * (1 + (1 - t) * 0.6);
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
        grd.addColorStop(0, `hsla(${p.hue}, 100%, 55%, ${alpha})`);
        grd.addColorStop(0.4, `hsla(${Math.min(p.hue + 6, 15)}, 100%, 62%, ${alpha * 0.7})`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    const onResize = () => setSize();
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(draw);

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        cancelAnimationFrame(raf);
      } else {
        lastT = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, width, height);
    };
  }, []);

  return (
    <div className="antialiased">
      {/* Flaming sparks canvas overlay; pointer-events disabled so UI stays interactive */}
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[3]" aria-hidden="true" />
      {children}
    </div>
  );
}
