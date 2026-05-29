"use client";

import { useEffect, useRef } from "react";

export type VoiceState = "idle" | "listening" | "transcribing" | "thinking" | "speaking";

type RGB = [number, number, number];
const THEMES: Record<VoiceState, { primary: RGB; secondary: RGB }> = {
  idle: { primary: [180, 210, 255], secondary: [90, 140, 255] }, // soft white-blue
  listening: { primary: [200, 180, 255], secondary: [160, 120, 255] }, // violet
  transcribing: { primary: [255, 220, 150], secondary: [255, 170, 80] }, // amber
  thinking: { primary: [160, 200, 255], secondary: [110, 150, 255] }, // blue
  speaking: { primary: [150, 255, 220], secondary: [80, 220, 200] }, // teal
};

// Each particle streams outward from the center, fades, then respawns — a
// perpetual starburst like the reference. z gives a parallax/depth feel.
type Particle = {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  z: number;
  seed: number;
};

const COUNT = 520;

/**
 * Cinematic particle-burst voice visualizer. Hundreds of points radiate from a
 * glowing core, reacting in real time to the mic analyser while listening and
 * pulsing procedurally in the other states.
 */
export function VoiceOrb({ state, analyser }: { state: VoiceState; analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const analyserRef = useRef(analyser);
  stateRef.current = state;
  analyserRef.current = analyser;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const mk = (full: boolean): Particle => ({
      angle: Math.random() * Math.PI * 2,
      radius: full ? Math.random() : rand(0, 0.06),
      speed: rand(0.0016, 0.006),
      size: rand(0.6, 2.4),
      z: Math.random(),
      seed: Math.random() * Math.PI * 2,
    });
    const particles: Particle[] = Array.from({ length: COUNT }, () => mk(true));

    const freq = new Uint8Array(128);
    let smoothAmp = 0;
    const lerp = (a: number, b: number, n: number) => a + (b - a) * n;
    const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    const draw = () => {
      t += 1;
      const st = stateRef.current;
      const an = analyserRef.current;
      const theme = THEMES[st];
      const cx = w / 2, cy = h / 2;
      const maxR = Math.min(w, h) * 0.52;

      // ---- amplitude ----
      let amp = 0;
      if (an && st === "listening") {
        an.getByteFrequencyData(freq);
        let sum = 0;
        for (let i = 0; i < 64; i++) sum += freq[i];
        amp = sum / 64 / 255;
      } else {
        amp =
          st === "speaking" ? 0.55 + Math.sin(t * 0.16) * 0.22 + Math.sin(t * 0.05) * 0.12 :
          st === "thinking" || st === "transcribing" ? 0.34 + Math.sin(t * 0.1) * 0.1 :
          0.16 + Math.sin(t * 0.035) * 0.06; // idle breathing
      }
      smoothAmp = lerp(smoothAmp, Math.max(0, amp), 0.16);
      const drive = 0.5 + smoothAmp * 2.2; // outward velocity multiplier

      // fade trails for motion blur instead of hard clear
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(3,4,10,0.32)";
      ctx.fillRect(0, 0, w, h);

      // ---- particle burst (additive) ----
      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) {
        p.radius += p.speed * drive * (0.4 + p.z);
        p.angle += (p.seed > Math.PI ? 1 : -1) * 0.0006 * (1 + smoothAmp); // gentle swirl
        if (p.radius >= 1) Object.assign(p, mk(false));

        const r = p.radius * maxR;
        const x = cx + Math.cos(p.angle) * r;
        const y = cy + Math.sin(p.angle) * r;

        // brightness: fade in from core, fade out at edge; twinkle
        const edge = 1 - p.radius;
        const core = Math.min(1, p.radius * 6);
        const twinkle = 0.7 + Math.sin(t * 0.08 + p.seed) * 0.3;
        const a = Math.max(0, edge * core * twinkle * (0.5 + p.z * 0.7) * (0.6 + smoothAmp * 0.8));
        const size = p.size * (0.6 + p.z) * (1 + smoothAmp * 0.5);

        const mix = p.z;
        const c: RGB = [
          Math.round(lerp(theme.secondary[0], theme.primary[0], mix)),
          Math.round(lerp(theme.secondary[1], theme.primary[1], mix)),
          Math.round(lerp(theme.secondary[2], theme.primary[2], mix)),
        ];
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
      }

      // ---- glowing core ----
      const pulse = 1 + smoothAmp * 0.6;
      const coreR = maxR * 0.17 * pulse;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.4);
      g.addColorStop(0, rgba([255, 255, 255], 0.95));
      g.addColorStop(0.22, rgba(theme.primary, 0.7));
      g.addColorStop(0.55, rgba(theme.secondary, 0.22));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 2.4, 0, Math.PI * 2);
      ctx.fill();

      // bright center
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = rgba([255, 255, 255], 0.92);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
